import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Edit2, Trash2, X, Check, Image as ImageIcon, Upload } from "lucide-react";
import { collection, doc, addDoc, updateDoc, deleteDoc, serverTimestamp, getDocs, writeBatch, query } from "@/lib/supabaseStore";
import { getDB } from "@/lib/supabase";
import useStoreMainBanners from "@/hooks/useStoreMainBanners";
import { ConfirmDeleteModal } from "@/components/admin/ConfirmDeleteModal";

async function resizeImage(file: File, maxWidth = 1200, quality = 0.8): Promise<string> {
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

export function MainBannersSection() {
  const { mainBanners, loading } = useStoreMainBanners();
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ desktopImage: "", mobileImage: "", link: "", order: 0, active: true });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const openAdd = () => { setForm({ desktopImage: "", mobileImage: "", link: "", order: 0, active: true }); setEditId(null); setModalOpen(true); };
  const openEdit = (b: any) => { setForm({ desktopImage: b.desktopImage || "", mobileImage: b.mobileImage || "", link: b.link || "", order: b.order || 0, active: b.active !== false }); setEditId(b.id); setModalOpen(true); };

  const save = async () => {
    if (!form.desktopImage || !form.mobileImage) return alert("Both Desktop and Mobile images are required.");
    setSaving(true);
    try {
      const db = getDB();
      const data: any = { desktopImage: form.desktopImage, mobileImage: form.mobileImage, link: form.link, order: Number(form.order), active: form.active, updatedAt: serverTimestamp() };
      if (editId) { await updateDoc(doc(db, "mainBanners", editId), data); } else { data.createdAt = serverTimestamp(); await addDoc(collection(db, "mainBanners"), data); }
      setModalOpen(false);
    } catch (err) { console.error(err); alert("Failed to save banner."); }
    setSaving(false);
  };

  const remove = async (id: string) => { try { await deleteDoc(doc(getDB(), "mainBanners", id)); } catch (err) { console.error(err); } setDeleteId(null); };

  const handleDeleteAll = async () => {
    setIsBulkDeleting(true);
    try {
      const db = getDB();
      const snap = await getDocs(query(collection(db, "mainBanners")));
      if (!snap.empty) {
        const batch = writeBatch(db);
        snap.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();
      }
    } catch (e) { console.error(e); }
    finally { setIsBulkDeleting(false); setBulkDeleteOpen(false); }
  };

  if (loading) return <div className="space-y-4">{[...Array(2)].map((_, i) => <div key={i} className="h-32 bg-[#E8D8D1] rounded-xl animate-pulse" />)}</div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div><h2 className="font-serif text-2xl text-[#8E5E4F]">Main Banners</h2><p className="text-xs text-[#8E5E4F]/50 mt-0.5">{mainBanners.length} banners</p></div>
        <div className="flex flex-col w-full sm:w-auto sm:flex-row gap-2 sm:gap-3">
          {mainBanners.length > 0 && (
            <button onClick={() => setBulkDeleteOpen(true)} className="w-full sm:w-auto justify-center flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors font-medium text-sm border border-red-100"><Trash2 className="w-4 h-4" />Clear All</button>
          )}
          <button onClick={openAdd} className="w-full sm:w-auto justify-center flex items-center gap-2 px-5 py-2.5 bg-[#B47A67] text-white rounded-xl text-sm font-medium hover:bg-[#A86F5C] transition-all"><Plus className="h-4 w-4" /> Add Banner</button>
        </div>
      </div>

      <div className="space-y-4"><AnimatePresence>
        {mainBanners.map((banner: any, i: number) => (
          <motion.div key={banner.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ delay: i * 0.05 }} className={`bg-white border border-[#E8D8D1] rounded-2xl p-5 flex items-center gap-5 ${!banner.active ? 'opacity-50' : ''}`}>
            <div className="h-20 w-32 rounded-xl bg-[#F7F1EE] flex items-center justify-center flex-shrink-0 overflow-hidden border border-[#E8D8D1]/50">
              {banner.desktopImage ? <img src={banner.desktopImage} alt="Desktop View" className="w-full h-full object-cover" /> : <ImageIcon className="h-5 w-5 text-[#8E5E4F]/30" />}
            </div>
            <div className="h-20 w-12 rounded-xl bg-[#F7F1EE] flex items-center justify-center flex-shrink-0 overflow-hidden border border-[#E8D8D1]/50">
              {banner.mobileImage ? <img src={banner.mobileImage} alt="Mobile View" className="w-full h-full object-cover" /> : <ImageIcon className="h-4 w-4 text-[#8E5E4F]/30" />}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm text-[#8E5E4F]">Banner {banner.order}</h3>
              <div className="flex items-center gap-3 mt-1">
                {banner.link && <span className="text-xs text-[#8E5E4F]/50 max-w-[200px] truncate">Link: {banner.link}</span>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => openEdit(banner)} className="p-2 hover:bg-[#B47A67]/10 rounded-lg transition-colors text-[#8E5E4F]/40 hover:text-[#B47A67]"><Edit2 className="h-4 w-4" /></button>
              <button onClick={() => setDeleteId(banner.id)} className="p-2 hover:bg-red-50 rounded-lg transition-colors text-[#8E5E4F]/40 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence></div>

      <AnimatePresence>{modalOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-[#E8D8D1]"><h3 className="font-serif text-xl text-[#8E5E4F]">{editId ? "Edit Banner" : "Add Banner"}</h3><button onClick={() => setModalOpen(false)} className="p-2 hover:bg-[#F7F1EE] rounded-lg"><X className="h-4 w-4 text-[#8E5E4F]/50" /></button></div>
            <div className="p-6 space-y-5">
              
              {/* Desktop Image Upload */}
              <div>
                <label className="block text-xs tracking-wider uppercase text-[#8E5E4F]/50 mb-2">Desktop Image (Landscape)</label>
                <div className="flex flex-col gap-3">
                  <div className="h-28 w-full bg-[#F7F1EE] border border-[#E8D8D1] rounded-xl flex items-center justify-center overflow-hidden">
                    {form.desktopImage ? <img src={form.desktopImage} alt="" className="w-full h-full object-cover" /> : <ImageIcon className="h-6 w-6 text-[#8E5E4F]/30" />}
                  </div>
                  <label className="cursor-pointer">
                    <input type="file" className="hidden" accept="image/*" onChange={async e => { const file = e.target.files?.[0]; if (file) { const base64 = await resizeImage(file, 1600); setForm(prev => ({ ...prev, desktopImage: base64 })); } }} />
                    <div className="flex items-center justify-center gap-2 px-4 py-2 bg-[#F7F1EE] border border-dashed border-[#B47A67] text-[#B47A67] rounded-xl hover:bg-[#B47A67]/5 transition-colors text-sm font-medium"><Upload className="h-4 w-4" /> Upload Desktop Image</div>
                  </label>
                </div>
              </div>

              {/* Mobile Image Upload */}
              <div>
                <label className="block text-xs tracking-wider uppercase text-[#8E5E4F]/50 mb-2">Mobile Image (Portrait)</label>
                <div className="flex flex-col gap-3">
                  <div className="h-40 w-24 bg-[#F7F1EE] border border-[#E8D8D1] rounded-xl flex items-center justify-center overflow-hidden mx-auto">
                    {form.mobileImage ? <img src={form.mobileImage} alt="" className="w-full h-full object-cover" /> : <ImageIcon className="h-6 w-6 text-[#8E5E4F]/30" />}
                  </div>
                  <label className="cursor-pointer">
                    <input type="file" className="hidden" accept="image/*" onChange={async e => { const file = e.target.files?.[0]; if (file) { const base64 = await resizeImage(file, 800); setForm(prev => ({ ...prev, mobileImage: base64 })); } }} />
                    <div className="flex items-center justify-center gap-2 px-4 py-2 bg-[#F7F1EE] border border-dashed border-[#B47A67] text-[#B47A67] rounded-xl hover:bg-[#B47A67]/5 transition-colors text-sm font-medium"><Upload className="h-4 w-4" /> Upload Mobile Image</div>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs tracking-wider uppercase text-[#8E5E4F]/50 mb-2">Target Link (Optional)</label>
                <input type="text" value={form.link} onChange={e => setForm(prev => ({ ...prev, link: e.target.value }))} placeholder="/shop or /category/rings" className="w-full px-4 py-3 bg-[#F7F1EE] border border-[#E8D8D1] rounded-xl text-sm text-[#8E5E4F] outline-none focus:border-[#B47A67] transition-colors" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs tracking-wider uppercase text-[#8E5E4F]/50 mb-2">Display Order</label><input type="number" value={form.order} onChange={e => setForm(prev => ({ ...prev, order: +e.target.value }))} className="w-full px-4 py-3 bg-[#F7F1EE] border border-[#E8D8D1] rounded-xl text-sm text-[#8E5E4F] outline-none focus:border-[#B47A67] transition-colors" /></div>
                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.active} onChange={e => setForm(prev => ({ ...prev, active: e.target.checked }))} className="accent-[#B47A67] w-4 h-4" /><span className="text-sm text-[#8E5E4F] font-medium">Active</span></label>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 p-6 border-t border-[#E8D8D1]">
              <button onClick={() => setModalOpen(false)} className="flex-1 py-3 border border-[#E8D8D1] text-[#8E5E4F]/60 rounded-xl text-sm font-medium">Cancel</button>
              <button onClick={save} disabled={saving} className="flex-1 py-3 bg-[#B47A67] text-white rounded-xl text-sm font-medium hover:bg-[#A86F5C] transition-colors flex items-center justify-center gap-2 disabled:opacity-60">{saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Check className="h-4 w-4" /> {editId ? "Save Banner" : "Add Banner"}</>}</button>
            </div>
          </motion.div>
        </motion.div>
      )}</AnimatePresence>

      <AnimatePresence>{deleteId && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center">
            <div className="h-14 w-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4"><Trash2 className="h-6 w-6 text-red-500" /></div>
            <h3 className="font-serif text-xl text-[#8E5E4F] mb-2">Delete Banner</h3><p className="text-sm text-[#8E5E4F]/50 mb-6">This action cannot be undone.</p>
            <div className="flex gap-3"><button onClick={() => setDeleteId(null)} className="flex-1 py-3 border border-[#E8D8D1] rounded-xl text-sm text-[#8E5E4F]/60 font-medium">Cancel</button><button onClick={() => remove(deleteId!)} className="flex-1 py-3 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 transition-colors">Delete</button></div>
          </motion.div>
        </motion.div>
      )}</AnimatePresence>

      <ConfirmDeleteModal
        isOpen={bulkDeleteOpen}
        onClose={() => setBulkDeleteOpen(false)}
        onConfirm={handleDeleteAll}
        title="Delete All Banners"
        message="Are you absolutely sure you want to delete ALL main banners? The homepage hero section will be empty. This action cannot be undone."
        isBulk={true}
        isDeleting={isBulkDeleting}
      />
    </div>
  );
}
