import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Check, GripVertical, Eye, Trash2 } from "lucide-react";
import { collection, doc, addDoc, updateDoc, deleteDoc, serverTimestamp, getDocs, writeBatch, query } from "@/lib/supabaseStore";
import { getDB } from "@/lib/supabase";
import useStoreAnnouncements from "@/hooks/useStoreAnnouncements";
import { ConfirmDeleteModal } from "@/components/admin/ConfirmDeleteModal";

export function AnnouncementsSection() {
  const { announcements, loading } = useStoreAnnouncements();
  const [text, setText] = useState("");
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const add = async () => { if (!text.trim()) return; setSaving(true); try { await addDoc(collection(getDB(), "announcements"), { text: text.trim().toUpperCase(), active: true, order: announcements.length, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }); setText(""); } catch (err) { console.error(err); } setSaving(false); };
  const toggle = async (id: string, active: boolean) => { try { await updateDoc(doc(getDB(), "announcements", id), { active, updatedAt: serverTimestamp() }); } catch (err) { console.error(err); } };
  const remove = async (id: string) => { try { await deleteDoc(doc(getDB(), "announcements", id)); } catch (err) { console.error(err); } };

  const handleDeleteAll = async () => {
    setIsDeleting(true);
    try {
      const db = getDB();
      const snap = await getDocs(query(collection(db, "announcements")));
      if (!snap.empty) {
        const batch = writeBatch(db);
        snap.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();
      }
    } catch (e) { console.error(e); }
    finally { setIsDeleting(false); setBulkDeleteOpen(false); }
  };

  const active = announcements.filter((a: any) => a.active);
  if (loading) return <div className="space-y-4">{[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-[#E8D8D1] rounded-xl animate-pulse" />)}</div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="font-serif text-2xl text-[#8E5E4F]">Announcements</h2>
          <p className="text-xs text-[#8E5E4F]/50 mt-0.5">Manage the scrolling banner on the homepage</p>
        </div>
        <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-2">
          {announcements.length > 0 && (
            <button onClick={() => setBulkDeleteOpen(true)} className="w-full sm:w-auto justify-center flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors font-medium text-sm border border-red-100"><Trash2 className="w-4 h-4" />Clear All</button>
          )}
          <button onClick={() => setPreview(!preview)} className="w-full sm:w-auto justify-center flex items-center gap-2 px-4 py-2.5 border border-[#E8D8D1] text-[#8E5E4F]/60 rounded-xl text-sm hover:border-[#B47A67] hover:text-[#B47A67] transition-all"><Eye className="h-4 w-4" /> {preview ? 'Hide Preview' : 'Preview Banner'}</button>
        </div>
      </div>

      <AnimatePresence>{preview && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-6 overflow-hidden">
          <div className="bg-[#B47A67] text-white text-xs py-3 rounded-xl overflow-hidden"><div className="flex whitespace-nowrap animate-marquee">{[...Array(2)].map((_, i) => <span key={i} className="flex items-center gap-8 pr-8">{active.map((a: any, j: number) => <span key={j} className="flex items-center gap-8"><span>{a.text}</span><span className="opacity-50">·</span></span>)}</span>)}</div></div>
          <p className="text-[10px] text-[#8E5E4F]/40 mt-2 text-center">Preview of live announcement bar</p>
        </motion.div>
      )}</AnimatePresence>

      <div className="bg-white border border-[#E8D8D1] rounded-2xl p-5 mb-5">
        <label className="block text-xs tracking-wider uppercase text-[#8E5E4F]/50 mb-3">Add New Announcement</label>
        <div className="flex flex-col sm:flex-row gap-3">
          <input type="text" value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === "Enter" && add()} placeholder="e.g. FREE SHIPPING ON ALL ORDERS THIS WEEKEND" className="flex-1 px-4 py-3 bg-[#F7F1EE] border border-[#E8D8D1] rounded-xl text-sm text-[#8E5E4F] placeholder-[#8E5E4F]/30 outline-none focus:border-[#B47A67] transition-colors uppercase" />
          <button onClick={add} disabled={saving} className="w-full sm:w-auto justify-center flex items-center gap-2 px-5 py-3 bg-[#B47A67] text-white rounded-xl text-sm font-medium hover:bg-[#A86F5C] transition-all disabled:opacity-60"><Plus className="h-4 w-4" /> Add</button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between px-1"><span className="text-xs tracking-wider uppercase text-[#8E5E4F]/50">All Announcements</span><span className="text-xs text-[#8E5E4F]/40">{active.length} active</span></div>
        <AnimatePresence>{announcements.map((ann: any, i: number) => (
          <motion.div key={ann.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ delay: i * 0.05 }} className={`bg-white border rounded-xl p-4 flex items-center gap-4 transition-all ${ann.active ? "border-[#E8D8D1]" : "border-[#E8D8D1] opacity-50"}`}>
            <GripVertical className="h-4 w-4 text-[#E8D8D1] cursor-grab flex-shrink-0" />
            <span className={`flex-1 text-sm font-medium tracking-wide ${ann.active ? "text-[#8E5E4F]" : "text-[#8E5E4F]/40 line-through"}`}>{ann.text}</span>
            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0"><input type="checkbox" checked={ann.active} onChange={e => toggle(ann.id, e.target.checked)} className="sr-only" /><div className={`w-9 h-5 rounded-full transition-colors ${ann.active ? "bg-[#B47A67]" : "bg-[#E8D8D1]"}`}><div className={`h-5 w-5 bg-white rounded-full shadow transition-transform ${ann.active ? "translate-x-4" : "translate-x-0"} border border-black/10`} /></div></label>
            <button onClick={() => remove(ann.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-[#8E5E4F]/40 hover:text-red-500 flex-shrink-0"><X className="h-4 w-4" /></button>
          </motion.div>
        ))}</AnimatePresence>
      </div>
      
      <ConfirmDeleteModal
        isOpen={bulkDeleteOpen}
        onClose={() => setBulkDeleteOpen(false)}
        onConfirm={handleDeleteAll}
        title="Clear All Announcements"
        message="Are you absolutely sure you want to delete ALL announcements? The scrolling banner will become empty. This action cannot be undone."
        isBulk={true}
        isDeleting={isDeleting}
      />
    </div>
  );
}
