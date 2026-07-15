import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Edit2, Trash2, X, Check, Grid } from "lucide-react";
import { collection, doc, addDoc, updateDoc, deleteDoc, serverTimestamp, getDocs, writeBatch, query } from "@/lib/supabaseStore";
import { getDB } from "@/lib/supabase";
import useStoreCategories from "@/hooks/useStoreCategories";
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

export function CategoriesSection() {
  const { categories, loading, retry } = useStoreCategories();
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", slug: "", image: "", displayOrder: 0 });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const openAdd = () => { setForm({ name: "", slug: "", image: "", displayOrder: 0 }); setEditId(null); setImageFile(null); setModalOpen(true); };
  const openEdit = (c: any) => { setForm({ name: c.name, slug: c.slug || "", image: c.image || "", displayOrder: c.displayOrder || 0 }); setEditId(c.id); setImageFile(null); setModalOpen(true); };

  const save = async () => {
    if (!form.name) return; setSaving(true);
    try {
      const db = getDB(); let imageUrl = form.image;
      if (imageFile) {
        imageUrl = await resizeImage(imageFile);
      }
      const data: any = { name: form.name, slug: form.slug, image: imageUrl, displayOrder: Number(form.displayOrder), updatedAt: serverTimestamp() };
      if (editId) { await updateDoc(doc(db, "categories", editId), data); } else { data.createdAt = serverTimestamp(); data.count = 0; await addDoc(collection(db, "categories"), data); }
      setModalOpen(false);
      retry();
    } catch (err) { console.error("Failed to save category:", err); alert("Failed to save."); }
    setSaving(false);
  };

  const remove = async (id: string) => { try { await deleteDoc(doc(getDB(), "categories", id)); retry(); } catch (err) { console.error(err); } setDeleteId(null); };

  const handleDeleteAll = async () => {
    setIsBulkDeleting(true);
    try {
      const db = getDB();
      const snap = await getDocs(query(collection(db, "categories")));
      if (!snap.empty) {
        const batch = writeBatch(db);
        snap.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();
        retry();
      }
    } catch (e) { console.error(e); }
    finally { setIsBulkDeleting(false); setBulkDeleteOpen(false); }
  };

  if (loading) return <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-40 bg-[#E8D8D1] rounded-xl animate-pulse" />)}</div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6"><div><h2 className="font-serif text-2xl text-[#8E5E4F]">Categories</h2><p className="text-xs text-[#8E5E4F]/50 mt-0.5">{categories.length} categories</p></div>
        <div className="flex flex-col w-full sm:w-auto sm:flex-row gap-2 sm:gap-3">
          {categories.length > 0 && (
            <button onClick={() => setBulkDeleteOpen(true)} className="w-full sm:w-auto justify-center flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors font-medium text-sm border border-red-100"><Trash2 className="w-4 h-4" />Clear All</button>
          )}
          <button onClick={openAdd} className="w-full sm:w-auto justify-center flex items-center gap-2 px-5 py-2.5 bg-[#B47A67] text-white rounded-xl text-sm font-medium hover:bg-[#A86F5C] transition-all"><Plus className="h-4 w-4" /> Add Category</button>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"><AnimatePresence>
        {categories.map((cat, i) => (
          <motion.div key={cat.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: i * 0.07 }} className="bg-white border border-[#E8D8D1] rounded-2xl overflow-hidden group hover:shadow-md transition-shadow">
            <div className="aspect-video relative overflow-hidden">{cat.image ? <img src={cat.image} alt={cat.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /> : <div className="w-full h-full bg-[#F7F1EE] flex items-center justify-center"><Grid className="h-8 w-8 text-[#E8D8D1]" /></div>}</div>
            <div className="p-5">
              <div className="flex items-start justify-between mb-4"><h3 className="font-serif text-lg text-[#8E5E4F]">{cat.name}</h3><span className="text-[10px] tracking-wider uppercase text-[#8E5E4F]/40 border border-[#E8D8D1] px-2 py-0.5 rounded-md">Order: {cat.displayOrder || 0}</span></div>
              <div className="flex gap-2">
                <button onClick={() => openEdit(cat)} className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-[#E8D8D1] rounded-xl text-xs text-[#8E5E4F]/60 hover:border-[#B47A67] hover:text-[#B47A67] transition-colors"><Edit2 className="h-3 w-3" /> Edit</button>
                <button onClick={() => setDeleteId(cat.id)} className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-[#E8D8D1] rounded-xl text-xs text-[#8E5E4F]/60 hover:border-red-300 hover:text-red-500 transition-colors"><Trash2 className="h-3 w-3" /> Delete</button>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence></div>

      <AnimatePresence>{modalOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-[#E8D8D1]"><h3 className="font-serif text-xl text-[#8E5E4F]">{editId ? "Edit Category" : "Add Category"}</h3><button onClick={() => setModalOpen(false)} className="p-2 hover:bg-[#F7F1EE] rounded-lg transition-colors"><X className="h-4 w-4 text-[#8E5E4F]/50" /></button></div>
            <div className="p-6 space-y-4">
              <div><label className="block text-xs tracking-wider uppercase text-[#8E5E4F]/50 mb-2">Category Name</label><input type="text" value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value, slug: prev.slug || e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-') }))} className="w-full px-4 py-3 bg-[#F7F1EE] border border-[#E8D8D1] rounded-xl text-sm text-[#8E5E4F] outline-none focus:border-[#B47A67] transition-colors" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs tracking-wider uppercase text-[#8E5E4F]/50 mb-2">Slug</label><input type="text" value={form.slug} onChange={e => setForm(prev => ({ ...prev, slug: e.target.value }))} className="w-full px-4 py-3 bg-[#F7F1EE] border border-[#E8D8D1] rounded-xl text-sm text-[#8E5E4F] outline-none focus:border-[#B47A67] transition-colors" /></div>
                <div><label className="block text-xs tracking-wider uppercase text-[#8E5E4F]/50 mb-2">Display Order</label><input type="number" value={form.displayOrder} onChange={e => setForm(prev => ({ ...prev, displayOrder: +e.target.value }))} className="w-full px-4 py-3 bg-[#F7F1EE] border border-[#E8D8D1] rounded-xl text-sm text-[#8E5E4F] outline-none focus:border-[#B47A67] transition-colors" /></div>
              </div>
              <div><label className="block text-xs tracking-wider uppercase text-[#8E5E4F]/50 mb-2">Image</label><input type="file" accept="image/*" onChange={e => setImageFile(e.target.files?.[0] || null)} className="text-sm text-[#8E5E4F]/50 mb-2" /><input type="text" value={form.image} onChange={e => setForm(prev => ({ ...prev, image: e.target.value }))} placeholder="Or paste image URL" className="w-full px-4 py-3 bg-[#F7F1EE] border border-[#E8D8D1] rounded-xl text-sm text-[#8E5E4F] outline-none focus:border-[#B47A67] transition-colors" /></div>
            </div>
            <div className="flex gap-3 p-6 border-t border-[#E8D8D1]">
              <button onClick={() => setModalOpen(false)} className="flex-1 py-3 border border-[#E8D8D1] text-[#8E5E4F]/60 rounded-xl text-sm hover:border-[#B47A67] transition-colors">Cancel</button>
              <button onClick={save} disabled={saving} className="flex-1 py-3 bg-[#B47A67] text-white rounded-xl text-sm font-medium hover:bg-[#A86F5C] transition-colors flex items-center justify-center gap-2 disabled:opacity-60">{saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Check className="h-4 w-4" /> {editId ? "Save" : "Add"}</>}</button>
            </div>
          </motion.div>
        </motion.div>
      )}</AnimatePresence>

      <AnimatePresence>{deleteId && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center">
            <div className="h-14 w-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4"><Trash2 className="h-6 w-6 text-red-500" /></div>
            <h3 className="font-serif text-xl text-[#8E5E4F] mb-2">Delete Category</h3><p className="text-sm text-[#8E5E4F]/50 mb-6">This action cannot be undone.</p>
            <div className="flex gap-3"><button onClick={() => setDeleteId(null)} className="flex-1 py-3 border border-[#E8D8D1] rounded-xl text-sm text-[#8E5E4F]/60">Cancel</button><button onClick={() => remove(deleteId!)} className="flex-1 py-3 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 transition-colors">Delete</button></div>
          </motion.div>
        </motion.div>
      )}</AnimatePresence>

      <ConfirmDeleteModal
        isOpen={bulkDeleteOpen}
        onClose={() => setBulkDeleteOpen(false)}
        onConfirm={handleDeleteAll}
        title="Delete All Categories"
        message="Are you absolutely sure you want to delete ALL categories? Products linked to these categories may be affected. This action cannot be undone."
        isBulk={true}
        isDeleting={isBulkDeleting}
      />
    </div>
  );
}
