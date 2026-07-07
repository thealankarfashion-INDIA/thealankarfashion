import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Edit2, Trash2, X, Check, Award } from "lucide-react";
import { collection, doc, addDoc, updateDoc, deleteDoc, serverTimestamp, getDocs, writeBatch, query } from "@/lib/supabaseStore";
import { getDB } from "@/lib/supabase";
import useStoreBrands from "@/hooks/useStoreBrands";
import { ConfirmDeleteModal } from "@/components/admin/ConfirmDeleteModal";

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

export function BrandsSection() {
  const { brands, loading } = useStoreBrands();
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", slug: "", tagline: "", image: "", bg: "#F7F1EE", displayOrder: 0 });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const openAdd = () => { setForm({ name: "", slug: "", tagline: "", image: "", bg: "#F7F1EE", displayOrder: 0 }); setEditId(null); setImageFile(null); setModalOpen(true); };
  const openEdit = (b: any) => { setForm({ name: b.name || "", slug: b.slug || "", tagline: b.tagline || "", image: b.image || "", bg: b.bg || "#F7F1EE", displayOrder: b.displayOrder || 0 }); setEditId(b.id); setImageFile(null); setModalOpen(true); };

  const save = async () => {
    if (!form.name) return; setSaving(true);
    try {
      const db = getDB(); let imageUrl = form.image;
      if (imageFile) {
        imageUrl = await resizeImage(imageFile);
      }
      const data: any = { name: form.name, slug: form.slug || form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), tagline: form.tagline, image: imageUrl, bg: form.bg, displayOrder: Number(form.displayOrder), updatedAt: serverTimestamp() };
      if (editId) { await updateDoc(doc(db, "brands", editId), data); } else { data.createdAt = serverTimestamp(); await addDoc(collection(db, "brands"), data); }
      setModalOpen(false);
    } catch (err) { console.error(err); alert("Failed to save."); }
    setSaving(false);
  };

  const remove = async (id: string) => { try { await deleteDoc(doc(getDB(), "brands", id)); } catch (err) { console.error(err); } setDeleteId(null); };

  const handleDeleteAll = async () => {
    setIsBulkDeleting(true);
    try {
      const db = getDB();
      const snap = await getDocs(query(collection(db, "brands")));
      if (!snap.empty) {
        const batch = writeBatch(db);
        snap.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();
      }
    } catch (e) { console.error(e); }
    finally { setIsBulkDeleting(false); setBulkDeleteOpen(false); }
  };

  if (loading) return <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-28 bg-[#E8D8D1] rounded-xl animate-pulse" />)}</div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6"><div><h2 className="font-serif text-2xl text-[#8E5E4F]">Brands</h2><p className="text-xs text-[#8E5E4F]/50 mt-0.5">{brands.length} brands</p></div>
        <div className="flex flex-col w-full sm:w-auto sm:flex-row gap-2 sm:gap-3">
          {brands.length > 0 && (
            <button onClick={() => setBulkDeleteOpen(true)} className="w-full sm:w-auto justify-center flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors font-medium text-sm border border-red-100"><Trash2 className="w-4 h-4" />Clear All</button>
          )}
          <button onClick={openAdd} className="w-full sm:w-auto justify-center flex items-center gap-2 px-5 py-2.5 bg-[#B47A67] text-white rounded-xl text-sm font-medium hover:bg-[#A86F5C] transition-all"><Plus className="h-4 w-4" /> Add Brand</button>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"><AnimatePresence>
        {brands.map((brand, i) => (
          <motion.div key={brand.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: i * 0.07 }} className="bg-white border border-[#E8D8D1] rounded-2xl overflow-hidden hover:shadow-md transition-shadow" style={{ borderLeftColor: brand.bg || '#B47A67', borderLeftWidth: 4 }}>
            <div className="p-5 flex items-start gap-4">
              <div className="h-14 w-14 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden" style={{ backgroundColor: brand.bg || '#F7F1EE' }}>
                {brand.image ? <img src={brand.image} alt={brand.name} className="w-full h-full object-cover" /> : <Award className="h-6 w-6 text-[#8E5E4F]/40" />}
              </div>
              <div className="flex-1 min-w-0"><h3 className="font-serif text-base text-[#8E5E4F]">{brand.name}</h3>{brand.tagline && <p className="text-xs text-[#8E5E4F]/50 mt-0.5 truncate">{brand.tagline}</p>}</div>
            </div>
            <div className="px-5 pb-4 flex gap-2">
              <button onClick={() => openEdit(brand)} className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-[#E8D8D1] rounded-xl text-xs text-[#8E5E4F]/60 hover:border-[#B47A67] hover:text-[#B47A67] transition-colors"><Edit2 className="h-3 w-3" /> Edit</button>
              <button onClick={() => setDeleteId(brand.id)} className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-[#E8D8D1] rounded-xl text-xs text-[#8E5E4F]/60 hover:border-red-300 hover:text-red-500 transition-colors"><Trash2 className="h-3 w-3" /> Delete</button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence></div>

      <AnimatePresence>{modalOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-[#E8D8D1]"><h3 className="font-serif text-xl text-[#8E5E4F]">{editId ? "Edit Brand" : "Add Brand"}</h3><button onClick={() => setModalOpen(false)} className="p-2 hover:bg-[#F7F1EE] rounded-lg"><X className="h-4 w-4 text-[#8E5E4F]/50" /></button></div>
            <div className="p-6 space-y-4">
              {[["Brand Name", "name"], ["Slug", "slug"], ["Tagline", "tagline"], ["Background Color", "bg"]].map(([label, key]) => (
                <div key={key}><label className="block text-xs tracking-wider uppercase text-[#8E5E4F]/50 mb-2">{label}</label><input type={key === "bg" ? "color" : "text"} value={(form as any)[key]} onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))} className="w-full px-4 py-3 bg-[#F7F1EE] border border-[#E8D8D1] rounded-xl text-sm text-[#8E5E4F] outline-none focus:border-[#B47A67] transition-colors" /></div>
              ))}
              <div><label className="block text-xs tracking-wider uppercase text-[#8E5E4F]/50 mb-2">Display Order</label><input type="number" value={form.displayOrder} onChange={e => setForm(prev => ({ ...prev, displayOrder: +e.target.value }))} className="w-full px-4 py-3 bg-[#F7F1EE] border border-[#E8D8D1] rounded-xl text-sm text-[#8E5E4F] outline-none focus:border-[#B47A67] transition-colors" /></div>
              <div><label className="block text-xs tracking-wider uppercase text-[#8E5E4F]/50 mb-2">Image</label><input type="file" accept="image/*" onChange={e => setImageFile(e.target.files?.[0] || null)} className="text-sm text-[#8E5E4F]/50 mb-2" /><input type="text" value={form.image} onChange={e => setForm(prev => ({ ...prev, image: e.target.value }))} placeholder="Or paste image URL" className="w-full px-4 py-3 bg-[#F7F1EE] border border-[#E8D8D1] rounded-xl text-sm text-[#8E5E4F] outline-none focus:border-[#B47A67] transition-colors" /></div>
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
            <h3 className="font-serif text-xl text-[#8E5E4F] mb-2">Delete Brand</h3><p className="text-sm text-[#8E5E4F]/50 mb-6">This action cannot be undone.</p>
            <div className="flex gap-3"><button onClick={() => setDeleteId(null)} className="flex-1 py-3 border border-[#E8D8D1] rounded-xl text-sm text-[#8E5E4F]/60">Cancel</button><button onClick={() => remove(deleteId!)} className="flex-1 py-3 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 transition-colors">Delete</button></div>
          </motion.div>
        </motion.div>
      )}</AnimatePresence>

      <ConfirmDeleteModal
        isOpen={bulkDeleteOpen}
        onClose={() => setBulkDeleteOpen(false)}
        onConfirm={handleDeleteAll}
        title="Delete All Brands"
        message="Are you absolutely sure you want to delete ALL brands? This action cannot be undone."
        isBulk={true}
        isDeleting={isBulkDeleting}
      />
    </div>
  );
}
