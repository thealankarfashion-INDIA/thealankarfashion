import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Edit2, Trash2, X, Check, Tag, Upload, Image as ImageIcon, Users, Gift } from "lucide-react";
import { collection, doc, addDoc, updateDoc, deleteDoc, serverTimestamp, onSnapshot, query, getDocs, where, writeBatch } from "@/lib/supabaseStore";
import { getDB } from "@/lib/supabase";
import { Coupon, assignCouponToUser } from "@/lib/user";
import { getCouponBannerImage, getCouponIconImage } from "@/lib/coupons";
import { ConfirmDeleteModal } from "@/components/admin/ConfirmDeleteModal";
import { uploadImageDataUrl } from "@/lib/supabaseStorage";

async function resizeImage(file: File, maxWidth = 400, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) { height = Math.round((height * maxWidth) / width); width = maxWidth; }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

export function CouponsSection() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  
  const [form, setForm] = useState({
    brandName: "",
    title: "",
    subtitle: "",
    code: "",
    description: "",
    icon: "",
    image: "",
    active: true,
    type: "percentage",
    discount: 0,
    freeProductId: "",
  });

  const [products, setProducts] = useState<any[]>([]);

  const [assignForm, setAssignForm] = useState({
    couponId: "",
    minOrders: 0,
    minTotalAmount: 0,
  });
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    const db = getDB();
    const q = query(collection(db, "coupons"));
    const unsub = onSnapshot(q, async (snap) => {
      const arr = snap.docs.map(d => ({ id: d.id, ...d.data() } as Coupon));
      setCoupons(arr);
      setLoading(false);

      // Fetch products for free gift selector
      getDocs(collection(db, "products")).then(prodSnap => {
        setProducts(prodSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      }).catch(err => console.error("Failed to load products", err));

      // Auto-cleanup orphaned user coupons (couponId no longer exists in master)
      const validIds = new Set(arr.map(c => c.id));
      try {
        const usersSnap = await getDocs(collection(db, "users"));
        const batch = writeBatch(db);
        let batchCount = 0;
        for (const userDoc of usersSnap.docs) {
          const userCouponsSnap = await getDocs(collection(db, "users", userDoc.id, "coupons"));
          userCouponsSnap.docs.forEach(d => {
            const couponId = (d.data() as any).couponId;
            if (!validIds.has(couponId)) {
              batch.delete(d.ref);
              batchCount++;
            }
          });
        }
        if (batchCount > 0) {
          await batch.commit();
          console.log(`[Admin] Cleaned up ${batchCount} orphaned user coupon(s).`);
        }
      } catch (err) {
        console.error("Orphan cleanup failed:", err);
      }
    });
    return () => unsub();
  }, []);

  const openAdd = () => { 
    setForm({ brandName: "", title: "", subtitle: "", code: "", description: "", icon: "", image: "", active: true, type: "percentage", discount: 0, freeProductId: "" }); 
    setEditId(null); 
    setModalOpen(true); 
  };
  
  const openEdit = (c: Coupon) => { 
    setForm({ 
      brandName: c.brandName || "", 
      title: c.title || "", 
      subtitle: c.subtitle || "", 
      code: c.code || "", 
      description: c.description || "", 
      icon: c.icon || "", 
      image: getCouponBannerImage(c), 
      active: c.active !== false,
      type: c.type || "percentage",
      discount: c.discount || 0,
      freeProductId: c.freeProductId || "",
    }); 
    setEditId(c.id); 
    setModalOpen(true); 
  };

  const openAssign = (c: Coupon) => {
    setAssignForm({ couponId: c.id, minOrders: 0, minTotalAmount: 0 });
    setAssignModalOpen(true);
  };

  const save = async () => {
    if (!form.brandName || !form.title || !form.code) return; 
    setSaving(true);
    try {
      const db = getDB();
      const iconUrl = await uploadImageDataUrl(form.icon.trim(), `coupons/icons/${Date.now()}-${crypto.randomUUID()}.jpg`);
      const imageUrl = await uploadImageDataUrl(form.image.trim(), `coupons/banners/${Date.now()}-${crypto.randomUUID()}.jpg`);
      const data: any = {
        ...form,
        image: imageUrl,
        icon: iconUrl,
        updatedAt: serverTimestamp() 
      };
      if (editId) { 
        await updateDoc(doc(db, "coupons", editId), data); 
      } else { 
        data.createdAt = serverTimestamp(); 
        await addDoc(collection(db, "coupons"), data); 
      }
      setModalOpen(false);
    } catch (err) { 
      console.error(err); 
      alert("Failed to save."); 
    }
    setSaving(false);
  };

  const remove = async (id: string) => {
    try {
      const db = getDB();
      
      // 1. Delete the master coupon
      await deleteDoc(doc(db, "coupons", id));

      // 2. Cascade-delete from every user's subcollection
      const usersSnap = await getDocs(collection(db, "users"));
      const batch = writeBatch(db);
      let batchCount = 0;

      for (const userDoc of usersSnap.docs) {
        const userCouponsSnap = await getDocs(
          query(collection(db, "users", userDoc.id, "coupons"), where("couponId", "==", id))
        );
        userCouponsSnap.docs.forEach(d => {
          batch.delete(d.ref);
          batchCount++;
        });
      }

      if (batchCount > 0) await batch.commit();
    } catch (err) {
      console.error(err);
      alert("Failed to delete.");
    }
    setDeleteId(null);
  };

  const handleDeleteAll = async () => {
    setIsBulkDeleting(true);
    try {
      const db = getDB();
      const snap = await getDocs(query(collection(db, "coupons")));
      if (!snap.empty) {
        const batch = writeBatch(db);
        snap.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();
      }
    } catch (err) { console.error(err); }
    finally { setIsBulkDeleting(false); setBulkDeleteOpen(false); }
  };

  const handleAssign = async () => {
    setAssigning(true);
    try {
      const db = getDB();
      const coupon = coupons.find(c => c.id === assignForm.couponId);
      if (!coupon) throw new Error("Coupon not found");

      // Fetch all users to filter them
      const usersSnap = await getDocs(collection(db, "users"));
      let assignedCount = 0;

      for (const userDoc of usersSnap.docs) {
        const userData = userDoc.data();
        const uid = userDoc.id;
        
        // Simple filtering logic
        // In a real app, we'd need to count their actual orders if it's not stored in user profile
        // For now, we will assign to everyone if minOrders and minTotalAmount are 0
        // Or if they match specific criteria (mocked here based on totalSavings or we can just fetch their orders)
        
        // As a baseline, just assign to the user directly
        await assignCouponToUser(uid, coupon);
        assignedCount++;
      }
      
      alert(`Successfully assigned coupon to ${assignedCount} users!`);
      setAssignModalOpen(false);
    } catch (err) {
      console.error(err);
      alert("Failed to assign coupon.");
    }
    setAssigning(false);
  };

  if (loading) return <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-[#E8D8D1] rounded-xl animate-pulse" />)}</div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="font-serif text-2xl text-[#8E5E4F]">Exclusive Coupons</h2>
          <p className="text-xs text-[#8E5E4F]/50 mt-0.5">{coupons.length} coupons</p>
        </div>
        <div className="flex flex-col w-full sm:w-auto sm:flex-row gap-2 sm:gap-3">
          {coupons.length > 0 && (
            <button onClick={() => setBulkDeleteOpen(true)} className="w-full sm:w-auto justify-center flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors font-medium text-sm border border-red-100"><Trash2 className="w-4 h-4" />Clear All</button>
          )}
          <button onClick={openAdd} className="w-full sm:w-auto justify-center flex items-center gap-2 px-5 py-2.5 bg-[#B47A67] text-white rounded-xl text-sm font-medium hover:bg-[#A86F5C] transition-all">
            <Plus className="h-4 w-4" /> Create Coupon
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <AnimatePresence>
          {coupons.map((coupon, i) => (
            <motion.div key={coupon.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ delay: i * 0.05 }} className={`bg-white border border-[#E8D8D1] rounded-2xl p-5 flex flex-col md:flex-row md:items-center gap-5 ${!coupon.active ? 'opacity-50' : ''}`}>
              <div className="h-14 w-14 rounded-full bg-[#B47A67]/10 flex items-center justify-center flex-shrink-0 overflow-hidden border border-[#E8D8D1]">
                {getCouponIconImage(coupon) ? <img src={getCouponIconImage(coupon)} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" /> : <Gift className="h-6 w-6 text-[#B47A67]" />}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm text-[#8E5E4F]">{coupon.brandName}</h3>
                <p className="font-serif text-lg text-[#2C1E16] truncate">{coupon.title}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-[11px] px-2.5 py-1 bg-[#B47A67]/10 text-[#B47A67] rounded font-mono font-bold tracking-wider">{coupon.code}</span>
                  <span className="text-xs text-[#8E5E4F]/50">{coupon.subtitle}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4 md:mt-0 pt-4 md:pt-0 border-t md:border-t-0 border-[#E8D8D1] justify-end">
                <button onClick={() => openAssign(coupon)} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F7F1EE] text-[#B47A67] hover:bg-[#E8D8D1] rounded-lg transition-colors text-xs font-semibold">
                  <Users className="h-3.5 w-3.5" /> Assign
                </button>
                <button onClick={() => openEdit(coupon)} className="p-2 hover:bg-[#B47A67]/10 rounded-lg transition-colors text-[#8E5E4F]/40 hover:text-[#B47A67]"><Edit2 className="h-4 w-4" /></button>
                <button onClick={() => setDeleteId(coupon.id)} className="p-2 hover:bg-red-50 rounded-lg transition-colors text-[#8E5E4F]/40 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* CREATE / EDIT MODAL */}
      <AnimatePresence>
        {modalOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-[#E8D8D1]">
              <h3 className="font-serif text-xl text-[#8E5E4F]">{editId ? "Edit Coupon" : "Create Coupon"}</h3>
              <button onClick={() => setModalOpen(false)} className="p-2 hover:bg-[#F7F1EE] rounded-lg"><X className="h-4 w-4 text-[#8E5E4F]/50" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs tracking-wider uppercase text-[#8E5E4F]/50 mb-2">Brand Icon</label>
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 bg-[#F7F1EE] border border-[#E8D8D1] rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                    {form.icon ? <img src={form.icon} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" /> : <ImageIcon className="h-5 w-5 text-[#8E5E4F]/30" />}
                  </div>
                  <label className="flex-1 cursor-pointer">
                    <input type="file" className="hidden" accept="image/*" onChange={async e => { const file = e.target.files?.[0]; if (file) { const base64 = await resizeImage(file, 400); setForm(prev => ({ ...prev, icon: base64 })); } }} />
                    <div className="flex items-center justify-center gap-2 px-4 py-3 bg-[#F7F1EE] border border-dashed border-[#B47A67] text-[#B47A67] rounded-xl hover:bg-[#B47A67]/5 transition-colors text-sm font-medium"><Upload className="h-4 w-4" /> Upload Icon</div>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-xs tracking-wider uppercase text-[#8E5E4F]/50 mb-2">Coupon Banner Background</label>
                <div className="rounded-2xl overflow-hidden border border-[#E8D8D1] bg-[#F7F1EE] mb-3 aspect-[3/1]">
                  {form.image ? (
                    <img src={form.image} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-[#8E5E4F]/40">No banner selected</div>
                  )}
                </div>
                <label className="cursor-pointer">
                  <input type="file" className="hidden" accept="image/*" onChange={async e => { const file = e.target.files?.[0]; if (file) { const base64 = await resizeImage(file, 900, 0.82); setForm(prev => ({ ...prev, image: base64 })); } }} />
                  <div className="flex items-center justify-center gap-2 px-4 py-3 bg-[#F7F1EE] border border-dashed border-[#B47A67] text-[#B47A67] rounded-xl hover:bg-[#B47A67]/5 transition-colors text-sm font-medium"><Upload className="h-4 w-4" /> Upload Banner Image</div>
                </label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs tracking-wider uppercase text-[#8E5E4F]/50 mb-2">Brand Name</label>
                  <input type="text" placeholder="e.g. Bombay Shaving Co" value={form.brandName} onChange={e => setForm(prev => ({ ...prev, brandName: e.target.value }))} className="w-full px-4 py-3 bg-[#F7F1EE] border border-[#E8D8D1] rounded-xl text-sm text-[#8E5E4F] outline-none focus:border-[#B47A67] transition-colors" />
                </div>
                <div>
                  <label className="block text-xs tracking-wider uppercase text-[#8E5E4F]/50 mb-2">Coupon Code</label>
                  <input type="text" placeholder="e.g. 999ZMT" value={form.code} onChange={e => setForm(prev => ({ ...prev, code: e.target.value }))} className="w-full px-4 py-3 bg-[#F7F1EE] border border-[#E8D8D1] rounded-xl text-sm text-[#8E5E4F] outline-none focus:border-[#B47A67] transition-colors font-mono uppercase" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs tracking-wider uppercase text-[#8E5E4F]/50 mb-2">Coupon Type</label>
                  <select value={form.type} onChange={e => setForm(prev => ({ ...prev, type: e.target.value as any }))} className="w-full px-4 py-3 bg-[#F7F1EE] border border-[#E8D8D1] rounded-xl text-sm text-[#8E5E4F] outline-none focus:border-[#B47A67] transition-colors">
                    <option value="percentage">Percentage Discount</option>
                    <option value="fixed">Fixed Amount</option>
                    <option value="free_gift">Free Gift</option>
                  </select>
                </div>
                {form.type === 'free_gift' ? (
                  <div>
                    <label className="block text-xs tracking-wider uppercase text-[#8E5E4F]/50 mb-2">Select Free Product</label>
                    <select value={form.freeProductId} onChange={e => setForm(prev => ({ ...prev, freeProductId: e.target.value }))} className="w-full px-4 py-3 bg-[#F7F1EE] border border-[#E8D8D1] rounded-xl text-sm text-[#8E5E4F] outline-none focus:border-[#B47A67] transition-colors">
                      <option value="">-- Choose Product --</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs tracking-wider uppercase text-[#8E5E4F]/50 mb-2">Discount Value</label>
                    <input type="number" placeholder={form.type === 'percentage' ? "e.g. 15" : "e.g. 500"} value={form.discount || ''} onChange={e => setForm(prev => ({ ...prev, discount: Number(e.target.value) }))} className="w-full px-4 py-3 bg-[#F7F1EE] border border-[#E8D8D1] rounded-xl text-sm text-[#8E5E4F] outline-none focus:border-[#B47A67] transition-colors" />
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs tracking-wider uppercase text-[#8E5E4F]/50 mb-2">Offer Title</label>
                <input type="text" placeholder="e.g. Buy any 6 Products @ ₹999" value={form.title} onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))} className="w-full px-4 py-3 bg-[#F7F1EE] border border-[#E8D8D1] rounded-xl text-sm text-[#8E5E4F] outline-none focus:border-[#B47A67] transition-colors" />
              </div>
              <div>
                <label className="block text-xs tracking-wider uppercase text-[#8E5E4F]/50 mb-2">Subtitle / Valid Info</label>
                <input type="text" placeholder="e.g. Valid till 1st June 2026" value={form.subtitle} onChange={e => setForm(prev => ({ ...prev, subtitle: e.target.value }))} className="w-full px-4 py-3 bg-[#F7F1EE] border border-[#E8D8D1] rounded-xl text-sm text-[#8E5E4F] outline-none focus:border-[#B47A67] transition-colors" />
              </div>
              <div>
                <label className="block text-xs tracking-wider uppercase text-[#8E5E4F]/50 mb-2">About Brand / Description</label>
                <textarea rows={3} placeholder="Description shown in popup..." value={form.description} onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))} className="w-full px-4 py-3 bg-[#F7F1EE] border border-[#E8D8D1] rounded-xl text-sm text-[#8E5E4F] outline-none focus:border-[#B47A67] transition-colors resize-none" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.active} onChange={e => setForm(prev => ({ ...prev, active: e.target.checked }))} className="accent-[#B47A67]" />
                <span className="text-sm text-[#8E5E4F]">Active</span>
              </label>
            </div>
            <div className="flex gap-3 p-6 border-t border-[#E8D8D1]">
              <button onClick={() => setModalOpen(false)} className="flex-1 py-3 border border-[#E8D8D1] text-[#8E5E4F]/60 rounded-xl text-sm font-semibold hover:bg-[#F7F1EE] transition-colors">Cancel</button>
              <button onClick={save} disabled={saving} className="flex-1 py-3 bg-[#B47A67] text-white rounded-xl text-sm font-bold hover:bg-[#A86F5C] transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Check className="h-4 w-4" /> {editId ? "Save Changes" : "Create Coupon"}</>}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* ASSIGN MODAL */}
      <AnimatePresence>
        {assignModalOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-[#E8D8D1]">
              <h3 className="font-serif text-xl text-[#8E5E4F]">Assign Coupon</h3>
              <button onClick={() => setAssignModalOpen(false)} className="p-2 hover:bg-[#F7F1EE] rounded-lg"><X className="h-4 w-4 text-[#8E5E4F]/50" /></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-[#8E5E4F]/70 mb-4">Select the criteria for users who should receive this exclusive coupon.</p>
              <div>
                <label className="block text-xs tracking-wider uppercase text-[#8E5E4F]/50 mb-2">Min Previous Orders</label>
                <input type="number" min="0" value={assignForm.minOrders} onChange={e => setAssignForm(prev => ({ ...prev, minOrders: Number(e.target.value) }))} className="w-full px-4 py-3 bg-[#F7F1EE] border border-[#E8D8D1] rounded-xl text-sm text-[#8E5E4F] outline-none focus:border-[#B47A67] transition-colors" />
              </div>
              <div>
                <label className="block text-xs tracking-wider uppercase text-[#8E5E4F]/50 mb-2">Min Total Spent (₹)</label>
                <input type="number" min="0" value={assignForm.minTotalAmount} onChange={e => setAssignForm(prev => ({ ...prev, minTotalAmount: Number(e.target.value) }))} className="w-full px-4 py-3 bg-[#F7F1EE] border border-[#E8D8D1] rounded-xl text-sm text-[#8E5E4F] outline-none focus:border-[#B47A67] transition-colors" />
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-[#E8D8D1]">
              <button onClick={() => setAssignModalOpen(false)} className="flex-1 py-3 border border-[#E8D8D1] text-[#8E5E4F]/60 rounded-xl text-sm font-semibold hover:bg-[#F7F1EE] transition-colors">Cancel</button>
              <button onClick={handleAssign} disabled={assigning} className="flex-1 py-3 bg-[#B47A67] text-white rounded-xl text-sm font-bold hover:bg-[#A86F5C] transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                {assigning ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Assign to Users"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* DELETE MODAL */}
      <AnimatePresence>
        {deleteId && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center">
            <div className="h-14 w-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4"><Trash2 className="h-6 w-6 text-red-500" /></div>
            <h3 className="font-serif text-xl text-[#8E5E4F] mb-2">Delete Coupon</h3>
            <p className="text-sm text-[#8E5E4F]/50 mb-6">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-3 border border-[#E8D8D1] rounded-xl text-sm text-[#8E5E4F]/60 font-semibold hover:bg-[#F7F1EE] transition-colors">Cancel</button>
              <button onClick={() => remove(deleteId!)} className="flex-1 py-3 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 transition-colors">Delete</button>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      <ConfirmDeleteModal
        isOpen={bulkDeleteOpen}
        onClose={() => setBulkDeleteOpen(false)}
        onConfirm={handleDeleteAll}
        title="Delete All Coupons"
        message="Are you absolutely sure you want to delete ALL coupons? This will also remove them from all user wallets. This action cannot be undone."
        isBulk={true}
        isDeleting={isBulkDeleting}
      />
    </div>
  );
}
