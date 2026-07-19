import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Edit2, Trash2, X, Check, Tag, Upload, Image as ImageIcon } from "lucide-react";
import { collection, doc, addDoc, updateDoc, deleteDoc, serverTimestamp, getDocs, writeBatch, query } from "@/lib/supabaseStore";
import { getDB } from "@/lib/supabase";
import useStoreOffers from "@/hooks/useStoreOffers";
import { getOfferImage } from "@/lib/offers";
import { ConfirmDeleteModal } from "@/components/admin/ConfirmDeleteModal";
import { uploadImageDataUrl } from "@/lib/supabaseStorage";

async function resizeImage(file: File, maxWidth = 800, quality = 0.72): Promise<string> {
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

export function OffersSection() {
  const { offers, loading } = useStoreOffers();
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", subtitle: "", code: "", discount: 0, type: "percentage" as "percentage" | "fixed", minOrderAmount: 0, badge: "", order: 0, active: true, image: "", cta: "" });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const openAdd = () => { setForm({ title: "", subtitle: "", code: "", discount: 0, type: "percentage", minOrderAmount: 0, badge: "", order: 0, active: true, image: "", cta: "" }); setEditId(null); setModalOpen(true); };
  const openEdit = (o: any) => { setForm({ title: o.title || "", subtitle: o.subtitle || "", code: o.code || "", discount: o.discount || 0, type: o.type || "percentage", minOrderAmount: o.minOrderAmount || 0, badge: o.badge || "", order: o.order || 0, active: o.active !== false, image: getOfferImage(o), cta: o.cta || "" }); setEditId(o.id); setModalOpen(true); };

  const save = async () => {
    if (!form.title) return; setSaving(true);
    try {
      const db = getDB();
      const imageUrl = await uploadImageDataUrl(form.image, `offers/${Date.now()}-${crypto.randomUUID()}.jpg`);
      const data: any = { title: form.title, subtitle: form.subtitle, code: form.code.toUpperCase(), discount: Number(form.discount), type: form.type, minOrderAmount: Number(form.minOrderAmount), badge: form.badge, order: Number(form.order), active: form.active, image: imageUrl, cta: form.cta, updatedAt: serverTimestamp() };
      if (editId) { await updateDoc(doc(db, "offers", editId), data); } else { data.createdAt = serverTimestamp(); await addDoc(collection(db, "offers"), data); }
      setModalOpen(false);
    } catch (err) { console.error(err); alert("Failed to save."); }
    setSaving(false);
  };

  const remove = async (id: string) => { try { await deleteDoc(doc(getDB(), "offers", id)); } catch (err) { console.error(err); } setDeleteId(null); };

  const handleDeleteAll = async () => {
    setIsBulkDeleting(true);
    try {
      const db = getDB();
      const snap = await getDocs(query(collection(db, "offers")));
      if (!snap.empty) {
        const batch = writeBatch(db);
        snap.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();
      }
    } catch (e) { console.error(e); }
    finally { setIsBulkDeleting(false); setBulkDeleteOpen(false); }
  };

  if (loading) return <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-[#E8D8D1] rounded-xl animate-pulse" />)}</div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6"><div><h2 className="font-serif text-2xl text-[#8E5E4F]">Offers & Promotions</h2><p className="text-xs text-[#8E5E4F]/50 mt-0.5">{offers.length} promotions</p></div>
        <div className="flex flex-col w-full sm:w-auto sm:flex-row gap-2 sm:gap-3">
          {offers.length > 0 && (
            <button onClick={() => setBulkDeleteOpen(true)} className="w-full sm:w-auto justify-center flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors font-medium text-sm border border-red-100"><Trash2 className="w-4 h-4" />Clear All</button>
          )}
          <button onClick={openAdd} className="w-full sm:w-auto justify-center flex items-center gap-2 px-5 py-2.5 bg-[#B47A67] text-white rounded-xl text-sm font-medium hover:bg-[#A86F5C] transition-all"><Plus className="h-4 w-4" /> Add Offer</button>
        </div>
      </div>

      <div className="space-y-4"><AnimatePresence>
        {offers.map((offer: any, i: number) => (
          <motion.div key={offer.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ delay: i * 0.05 }} className={`bg-white border border-[#E8D8D1] rounded-2xl p-5 flex items-center gap-5 ${!offer.active ? 'opacity-50' : ''}`}>
            <div className="h-12 w-12 rounded-xl bg-[#B47A67]/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {getOfferImage(offer) ? <img src={getOfferImage(offer)} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" /> : <Tag className="h-5 w-5 text-[#B47A67]" />}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm text-[#8E5E4F]">{offer.title}</h3>
              <div className="flex items-center gap-3 mt-1">
                {offer.code && <span className="text-[10px] px-2 py-0.5 bg-[#B47A67]/10 text-[#B47A67] rounded font-mono font-medium">{offer.code}</span>}
                <span className="text-xs text-[#8E5E4F]/50">{offer.discount}{offer.type === 'percentage' ? '%' : '₹'} off</span>
                {offer.minOrderAmount > 0 && <span className="text-xs text-[#8E5E4F]/40">Min: ₹{offer.minOrderAmount}</span>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => openEdit(offer)} className="p-2 hover:bg-[#B47A67]/10 rounded-lg transition-colors text-[#8E5E4F]/40 hover:text-[#B47A67]"><Edit2 className="h-4 w-4" /></button>
              <button onClick={() => setDeleteId(offer.id)} className="p-2 hover:bg-red-50 rounded-lg transition-colors text-[#8E5E4F]/40 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence></div>

      <AnimatePresence>{modalOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-[#E8D8D1]"><h3 className="font-serif text-xl text-[#8E5E4F]">{editId ? "Edit Offer" : "Add Offer"}</h3><button onClick={() => setModalOpen(false)} className="p-2 hover:bg-[#F7F1EE] rounded-lg"><X className="h-4 w-4 text-[#8E5E4F]/50" /></button></div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs tracking-wider uppercase text-[#8E5E4F]/50 mb-2">Offer Image</label>
                <div className="flex items-center gap-4">
                  <div className="h-16 w-24 bg-[#F7F1EE] border border-[#E8D8D1] rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0">
                    {form.image ? <img src={form.image} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" /> : <ImageIcon className="h-5 w-5 text-[#8E5E4F]/30" />}
                  </div>
                  <label className="flex-1 cursor-pointer">
                    <input type="file" className="hidden" accept="image/*" onChange={async e => { const file = e.target.files?.[0]; if (file) { const base64 = await resizeImage(file, 800); setForm(prev => ({ ...prev, image: base64 })); } }} />
                    <div className="flex items-center justify-center gap-2 px-4 py-3 bg-[#F7F1EE] border border-dashed border-[#B47A67] text-[#B47A67] rounded-xl hover:bg-[#B47A67]/5 transition-colors text-sm font-medium"><Upload className="h-4 w-4" /> Upload Image</div>
                  </label>
                </div>
              </div>
              {[["Title", "title"], ["Subtitle", "subtitle"], ["Promo Code", "code"], ["Badge Text", "badge"], ["CTA Button Text", "cta"]].map(([label, key]) => (
                <div key={key}><label className="block text-xs tracking-wider uppercase text-[#8E5E4F]/50 mb-2">{label}</label><input type="text" value={(form as any)[key]} onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))} className="w-full px-4 py-3 bg-[#F7F1EE] border border-[#E8D8D1] rounded-xl text-sm text-[#8E5E4F] outline-none focus:border-[#B47A67] transition-colors" /></div>
              ))}
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs tracking-wider uppercase text-[#8E5E4F]/50 mb-2">Discount</label><input type="number" value={form.discount} onChange={e => setForm(prev => ({ ...prev, discount: +e.target.value }))} className="w-full px-4 py-3 bg-[#F7F1EE] border border-[#E8D8D1] rounded-xl text-sm text-[#8E5E4F] outline-none focus:border-[#B47A67] transition-colors" /></div>
                <div><label className="block text-xs tracking-wider uppercase text-[#8E5E4F]/50 mb-2">Type</label><select value={form.type} onChange={e => setForm(prev => ({ ...prev, type: e.target.value as any }))} className="w-full px-4 py-3 bg-[#F7F1EE] border border-[#E8D8D1] rounded-xl text-sm text-[#8E5E4F] outline-none focus:border-[#B47A67] transition-colors"><option value="percentage">Percentage (%)</option><option value="fixed">Fixed (₹)</option></select></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs tracking-wider uppercase text-[#8E5E4F]/50 mb-2">Min Order (₹)</label><input type="number" value={form.minOrderAmount} onChange={e => setForm(prev => ({ ...prev, minOrderAmount: +e.target.value }))} className="w-full px-4 py-3 bg-[#F7F1EE] border border-[#E8D8D1] rounded-xl text-sm text-[#8E5E4F] outline-none focus:border-[#B47A67] transition-colors" /></div>
                <div><label className="block text-xs tracking-wider uppercase text-[#8E5E4F]/50 mb-2">Display Order</label><input type="number" value={form.order} onChange={e => setForm(prev => ({ ...prev, order: +e.target.value }))} className="w-full px-4 py-3 bg-[#F7F1EE] border border-[#E8D8D1] rounded-xl text-sm text-[#8E5E4F] outline-none focus:border-[#B47A67] transition-colors" /></div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.active} onChange={e => setForm(prev => ({ ...prev, active: e.target.checked }))} className="accent-[#B47A67]" /><span className="text-sm text-[#8E5E4F]">Active</span></label>
            </div>
            <div className="flex gap-3 p-6 border-t border-[#E8D8D1]">
              <button onClick={() => setModalOpen(false)} className="flex-1 py-3 border border-[#E8D8D1] text-[#8E5E4F]/60 rounded-xl text-sm">Cancel</button>
              <button onClick={save} disabled={saving} className="flex-1 py-3 bg-[#B47A67] text-white rounded-xl text-sm font-medium hover:bg-[#A86F5C] transition-colors flex items-center justify-center gap-2 disabled:opacity-60">{saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Check className="h-4 w-4" /> {editId ? "Save" : "Add"}</>}</button>
            </div>
          </motion.div>
        </motion.div>
      )}</AnimatePresence>

      <AnimatePresence>{deleteId && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center">
            <div className="h-14 w-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4"><Trash2 className="h-6 w-6 text-red-500" /></div>
            <h3 className="font-serif text-xl text-[#8E5E4F] mb-2">Delete Offer</h3><p className="text-sm text-[#8E5E4F]/50 mb-6">This action cannot be undone.</p>
            <div className="flex gap-3"><button onClick={() => setDeleteId(null)} className="flex-1 py-3 border border-[#E8D8D1] rounded-xl text-sm text-[#8E5E4F]/60">Cancel</button><button onClick={() => remove(deleteId!)} className="flex-1 py-3 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 transition-colors">Delete</button></div>
          </motion.div>
        </motion.div>
      )}</AnimatePresence>

      <ConfirmDeleteModal
        isOpen={bulkDeleteOpen}
        onClose={() => setBulkDeleteOpen(false)}
        onConfirm={handleDeleteAll}
        title="Delete All Offers"
        message="Are you absolutely sure you want to delete ALL offers and promotions? This action cannot be undone."
        isBulk={true}
        isDeleting={isBulkDeleting}
      />
    </div>
  );
}
