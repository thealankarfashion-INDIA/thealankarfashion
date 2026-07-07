import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Edit2, Trash2, X, Check, Play, Calendar } from "lucide-react";
import { collection, doc, addDoc, updateDoc, deleteDoc, serverTimestamp, getDocs, writeBatch, query } from "@/lib/supabaseStore";
import { getDB } from "@/lib/supabase";
import useStoreVideos from "@/hooks/useStoreVideos";
import { ConfirmDeleteModal } from "@/components/admin/ConfirmDeleteModal";

export function VideosSection() {
  const { videos, loading } = useStoreVideos();
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", youtubeUrl: "", youtubeVideoId: "", thumbnail: "", duration: "", badgeText: "", highlightText: "", displayOrder: 0, isActive: true, startDate: "", endDate: "" });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const openAdd = () => { setForm({ title: "", youtubeUrl: "", youtubeVideoId: "", thumbnail: "", duration: "", badgeText: "", highlightText: "", displayOrder: 0, isActive: true, startDate: "", endDate: "" }); setEditId(null); setModalOpen(true); };
  const openEdit = (v: any) => { setForm({ title: v.title || "", youtubeUrl: v.youtubeUrl || "", youtubeVideoId: v.youtubeVideoId || v.videoId || "", thumbnail: v.thumbnailUrl || v.thumbnail || "", duration: v.duration || "", badgeText: v.badgeText || "", highlightText: v.highlightText || "", displayOrder: v.displayOrder || 0, isActive: v.isActive !== false, startDate: v.startDate || "", endDate: v.endDate || "" }); setEditId(v.id); setModalOpen(true); };

  const save = async () => {
    if (!form.title) return; setSaving(true);
    try {
      const db = getDB();
      const data: any = { title: form.title, youtubeUrl: form.youtubeUrl, youtubeVideoId: form.youtubeVideoId, videoId: form.youtubeVideoId, thumbnailUrl: form.thumbnail, thumbnail: form.thumbnail, duration: form.duration, badgeText: form.badgeText, highlightText: form.highlightText, displayOrder: Number(form.displayOrder), isActive: form.isActive, startDate: form.startDate || null, endDate: form.endDate || null, updatedAt: serverTimestamp() };
      if (editId) { await updateDoc(doc(db, "testingVideos", editId), data); } else { data.createdAt = serverTimestamp(); await addDoc(collection(db, "testingVideos"), data); }
      setModalOpen(false);
    } catch (err) { console.error(err); alert("Failed to save video."); }
    setSaving(false);
  };

  const remove = async (id: string) => { try { await deleteDoc(doc(getDB(), "testingVideos", id)); } catch (err) { console.error(err); } setDeleteId(null); };

  const handleDeleteAll = async () => {
    setIsBulkDeleting(true);
    try {
      const db = getDB();
      const snap = await getDocs(query(collection(db, "testingVideos")));
      if (!snap.empty) {
        const batch = writeBatch(db);
        snap.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();
      }
    } catch (e) { console.error(e); }
    finally { setIsBulkDeleting(false); setBulkDeleteOpen(false); }
  };

  if (loading) return <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-40 bg-[#E8D8D1] rounded-xl animate-pulse" />)}</div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6"><div><h2 className="font-serif text-2xl text-[#8E5E4F]">Demo Videos</h2><p className="text-xs text-[#8E5E4F]/50 mt-0.5">{videos.length} videos</p></div>
        <div className="flex flex-col w-full sm:w-auto sm:flex-row gap-2 sm:gap-3">
          {videos.length > 0 && (
            <button onClick={() => setBulkDeleteOpen(true)} className="w-full sm:w-auto justify-center flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors font-medium text-sm border border-red-100"><Trash2 className="w-4 h-4" />Clear All</button>
          )}
          <button onClick={openAdd} className="w-full sm:w-auto justify-center flex items-center gap-2 px-5 py-2.5 bg-[#B47A67] text-white rounded-xl text-sm font-medium hover:bg-[#A86F5C] transition-all"><Plus className="h-4 w-4" /> Add Video</button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"><AnimatePresence>
        {videos.map((v, i) => (
          <motion.div key={v.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: i * 0.07 }} className={`bg-white border border-[#E8D8D1] rounded-2xl overflow-hidden group hover:shadow-md transition-shadow ${!v.isActive ? 'opacity-50' : ''}`}>
            <div className="aspect-video relative overflow-hidden bg-[#F7F1EE]">
              {v.thumbnailUrl || v.thumbnail ? <img src={v.thumbnailUrl || v.thumbnail} alt={v.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /> : <div className="w-full h-full flex items-center justify-center"><Play className="h-10 w-10 text-[#E8D8D1]" /></div>}
              {v.duration && <span className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded">{v.duration}</span>}
              {v.badgeText && <span className="absolute top-2 left-2 bg-[#B47A67] text-white text-[10px] px-2 py-0.5 rounded">{v.badgeText}</span>}
            </div>
            <div className="p-4">
              <h3 className="text-sm font-medium text-[#8E5E4F] mb-1 truncate">{v.title}</h3>
              {(v.startDate || v.endDate) && (
                <div className="flex items-center gap-1.5 text-[10px] text-[#8E5E4F]/40 mb-2">
                  <Calendar className="h-3 w-3" />
                  {v.startDate && <span>{new Date(v.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>}
                  {v.startDate && v.endDate && <span>→</span>}
                  {v.endDate && <span>{new Date(v.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>}
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={() => openEdit(v)} className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-[#E8D8D1] rounded-xl text-xs text-[#8E5E4F]/60 hover:border-[#B47A67] hover:text-[#B47A67] transition-colors"><Edit2 className="h-3 w-3" /> Edit</button>
                <button onClick={() => setDeleteId(v.id)} className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-[#E8D8D1] rounded-xl text-xs text-[#8E5E4F]/60 hover:border-red-300 hover:text-red-500 transition-colors"><Trash2 className="h-3 w-3" /> Delete</button>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence></div>

      <AnimatePresence>{modalOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-[#E8D8D1]"><h3 className="font-serif text-xl text-[#8E5E4F]">{editId ? "Edit Video" : "Add Video"}</h3><button onClick={() => setModalOpen(false)} className="p-2 hover:bg-[#F7F1EE] rounded-lg"><X className="h-4 w-4 text-[#8E5E4F]/50" /></button></div>
            <div className="p-6 space-y-4">
              {[["Title", "title"], ["YouTube URL", "youtubeUrl"], ["Video ID", "youtubeVideoId"], ["Thumbnail URL", "thumbnail"], ["Duration", "duration"], ["Badge Text", "badgeText"], ["Highlight Text", "highlightText"]].map(([label, key]) => (
                <div key={key}><label className="block text-xs tracking-wider uppercase text-[#8E5E4F]/50 mb-2">{label}</label><input type="text" value={(form as any)[key]} onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))} className="w-full px-4 py-3 bg-[#F7F1EE] border border-[#E8D8D1] rounded-xl text-sm text-[#8E5E4F] outline-none focus:border-[#B47A67] transition-colors" /></div>
              ))}
              <div className="bg-[#F7F1EE] p-4 rounded-xl border border-[#E8D8D1] space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#8E5E4F]/60"><Calendar className="h-3.5 w-3.5" /> Campaign Dates</div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-[10px] uppercase tracking-wider text-[#8E5E4F]/50 mb-1">Start Date</label><input type="date" value={form.startDate} onChange={e => setForm(prev => ({ ...prev, startDate: e.target.value }))} className="w-full px-4 py-3 bg-white border border-[#E8D8D1] rounded-xl text-sm text-[#8E5E4F] outline-none focus:border-[#B47A67] transition-colors" /></div>
                  <div><label className="block text-[10px] uppercase tracking-wider text-[#8E5E4F]/50 mb-1">End Date</label><input type="date" value={form.endDate} onChange={e => setForm(prev => ({ ...prev, endDate: e.target.value }))} className="w-full px-4 py-3 bg-white border border-[#E8D8D1] rounded-xl text-sm text-[#8E5E4F] outline-none focus:border-[#B47A67] transition-colors" /></div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs tracking-wider uppercase text-[#8E5E4F]/50 mb-2">Display Order</label><input type="number" value={form.displayOrder} onChange={e => setForm(prev => ({ ...prev, displayOrder: +e.target.value }))} className="w-full px-4 py-3 bg-[#F7F1EE] border border-[#E8D8D1] rounded-xl text-sm text-[#8E5E4F] outline-none focus:border-[#B47A67] transition-colors" /></div>
                <div className="flex items-end pb-1"><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.isActive} onChange={e => setForm(prev => ({ ...prev, isActive: e.target.checked }))} className="accent-[#B47A67]" /><span className="text-sm text-[#8E5E4F]">Active</span></label></div>
              </div>
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
            <h3 className="font-serif text-xl text-[#8E5E4F] mb-2">Delete Video</h3><p className="text-sm text-[#8E5E4F]/50 mb-6">This action cannot be undone.</p>
            <div className="flex gap-3"><button onClick={() => setDeleteId(null)} className="flex-1 py-3 border border-[#E8D8D1] rounded-xl text-sm text-[#8E5E4F]/60">Cancel</button><button onClick={() => remove(deleteId!)} className="flex-1 py-3 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 transition-colors">Delete</button></div>
          </motion.div>
        </motion.div>
      )}</AnimatePresence>

      <ConfirmDeleteModal
        isOpen={bulkDeleteOpen}
        onClose={() => setBulkDeleteOpen(false)}
        onConfirm={handleDeleteAll}
        title="Delete All Videos"
        message="Are you absolutely sure you want to delete ALL demo videos? This action cannot be undone."
        isBulk={true}
        isDeleting={isBulkDeleting}
      />
    </div>
  );
}
