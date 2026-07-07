import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Trash2, Loader2, Check, Save, Smartphone, Mail, CreditCard, ShoppingBag } from "lucide-react";
import { getDB } from "@/lib/supabase";
import { collection, getDocs, deleteDoc, doc, getDoc, setDoc, serverTimestamp } from "@/lib/supabaseStore";

interface StoreSettings { storeName: string; storePhone: string; storeEmail: string; storeWhatsApp: string; upiId: string; upiPayeeName: string; minOrderAmount: number; }
const defaultSettings: StoreSettings = { storeName: "Thealankar", storePhone: "+91 63825 19502", storeEmail: "thealankar@gmail.com", storeWhatsApp: "+91 63825 19502", upiId: "", upiPayeeName: "", minOrderAmount: 500 };

export function SettingsSection() {
  const [settings, setSettings] = useState<StoreSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteAllConfirmText, setDeleteAllConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    (async () => { try { const snap = await getDoc(doc(getDB(), "settings", "storeSettings")); if (snap.exists()) setSettings({ ...defaultSettings, ...snap.data() }); } catch (err) { console.error(err); } finally { setLoading(false); } })();
  }, []);

  const handleSave = async () => { setSaving(true); try { await setDoc(doc(getDB(), "settings", "storeSettings"), { ...settings, updatedAt: serverTimestamp() }); setSuccessMsg("Settings updated successfully."); setTimeout(() => setSuccessMsg(""), 3000); } catch (err) { console.error(err); alert("Failed to save."); } finally { setSaving(false); } };

  const handleDeleteAll = async () => {
    if (deleteAllConfirmText !== "DELETE ALL") { alert('Type "DELETE ALL" to confirm.'); return; }
    setDeleting(true);
    try {
      const colls = ["products", "categories", "brands", "offers", "announcements", "orders", "invoices", "ratings", "coupons", "testingVideos", "referrals"]; let total = 0;
      for (const c of colls) { const snap = await getDocs(collection(getDB(), c)); await Promise.all(snap.docs.map(d => deleteDoc(doc(getDB(), c, d.id)))); total += snap.size; }
      setSuccessMsg(`System reset done. ${total} documents deleted.`); setTimeout(() => setSuccessMsg(""), 5000); setShowDeleteModal(false); setDeleteAllConfirmText("");
    } catch (err) { console.error(err); alert("Failed to delete data."); } finally { setDeleting(false); }
  };

  if (loading) return <div className="flex items-center justify-center p-20"><Loader2 className="h-8 w-8 animate-spin text-[#B47A67]" /></div>;

  return (
    <div className="pb-10">
      <div className="flex items-center justify-between mb-8"><div><h2 className="font-serif text-2xl text-[#8E5E4F]">Settings</h2><p className="text-xs text-[#8E5E4F]/50 mt-0.5">Manage store configuration and security</p></div>
        <button onClick={handleSave} disabled={saving} className="w-full sm:w-auto justify-center flex items-center gap-2 px-6 py-2.5 bg-[#B47A67] text-white rounded-xl text-sm font-medium hover:bg-[#A86F5C] transition-all">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Configuration</button></div>

      {successMsg && <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 bg-green-50 text-green-700 border border-green-200 px-5 py-4 rounded-xl flex items-center gap-3"><Check className="h-5 w-5 text-green-500" /><span className="text-sm font-medium">{successMsg}</span></motion.div>}

      <div className="space-y-6">
        <div className="bg-white border border-[#E8D8D1] rounded-2xl overflow-hidden">
          <div className="px-6 py-4 bg-[#F7F1EE] border-b border-[#E8D8D1]"><h3 className="text-sm font-semibold text-[#8E5E4F] flex items-center gap-2"><ShoppingBag className="h-4 w-4 text-[#B47A67]" /> Store Profile</h3></div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
            {[["Store Name", "storeName", "text", null], ["Support Phone", "storePhone", "text", Smartphone], ["Support Email", "storeEmail", "email", Mail], ["WhatsApp", "storeWhatsApp", "text", Smartphone]].map(([label, key, type, Icon]: any) => (
              <div key={key}><label className="block text-[10px] tracking-widest uppercase text-[#8E5E4F]/40 mb-2">{label}</label>
                <div className="relative">{Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8E5E4F]/30" />}<input type={type} value={(settings as any)[key]} onChange={e => setSettings({ ...settings, [key]: e.target.value })} className={`w-full ${Icon ? "pl-11" : "px-4"} pr-4 py-3 bg-[#F7F1EE] border border-[#E8D8D1] rounded-xl text-sm text-[#8E5E4F] outline-none focus:border-[#B47A67] transition-all`} /></div></div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-[#E8D8D1] rounded-2xl overflow-hidden">
          <div className="px-6 py-4 bg-[#F7F1EE] border-b border-[#E8D8D1]"><h3 className="text-sm font-semibold text-[#8E5E4F] flex items-center gap-2"><CreditCard className="h-4 w-4 text-[#B47A67]" /> Payment & Checkout</h3></div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
            <div><label className="block text-[10px] tracking-widest uppercase text-[#8E5E4F]/40 mb-2">UPI ID (VPA)</label><input type="text" value={settings.upiId} onChange={e => setSettings({ ...settings, upiId: e.target.value })} placeholder="username@bank" className="w-full px-4 py-3 bg-[#F7F1EE] border border-[#E8D8D1] rounded-xl text-sm text-[#8E5E4F] font-mono outline-none focus:border-[#B47A67] transition-all" /></div>
            <div><label className="block text-[10px] tracking-widest uppercase text-[#8E5E4F]/40 mb-2">UPI Payee Name</label><input type="text" value={settings.upiPayeeName} onChange={e => setSettings({ ...settings, upiPayeeName: e.target.value })} className="w-full px-4 py-3 bg-[#F7F1EE] border border-[#E8D8D1] rounded-xl text-sm text-[#8E5E4F] outline-none focus:border-[#B47A67] transition-all" /></div>
            <div className="md:col-span-2"><label className="block text-[10px] tracking-widest uppercase text-[#8E5E4F]/40 mb-2">Min Order Amount (₹)</label><div className="flex items-center gap-4"><input type="number" value={settings.minOrderAmount} onChange={e => setSettings({ ...settings, minOrderAmount: Number(e.target.value) })} className="w-40 px-4 py-3 bg-[#F7F1EE] border border-[#E8D8D1] rounded-xl text-sm text-[#8E5E4F] outline-none focus:border-[#B47A67] transition-all" /><p className="text-xs text-[#8E5E4F]/40">Cart total must be at least this amount.</p></div></div>
          </div>
        </div>

        <div className="bg-red-50/30 border border-red-100 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4 text-red-600"><AlertTriangle className="h-5 w-5" /><h3 className="font-serif text-xl">Danger Zone</h3></div>
          <p className="text-sm text-red-800/70 mb-6 max-w-2xl">Permanently wipe all database collections. This action cannot be undone.</p>
          <button onClick={() => setShowDeleteModal(true)} className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-all"><Trash2 className="h-4 w-4" /> Trigger System Reset</button>
        </div>
      </div>

      <AnimatePresence>{showDeleteModal && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-red-50 px-6 py-8 text-center border-b border-red-100"><div className="h-14 w-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4"><AlertTriangle className="h-6 w-6 text-red-600" /></div><h3 className="font-serif text-xl text-red-900 mb-2">Hard Reset System</h3><p className="text-xs text-red-700 max-w-sm mx-auto">Type <strong>DELETE ALL</strong> and enter your admin password to proceed.</p></div>
            <div className="p-6 space-y-5">
              <div><label className="block text-xs font-semibold tracking-wider uppercase text-[#8E5E4F]/50 mb-2">Confirmation</label><input type="text" placeholder='Type DELETE ALL' value={deleteAllConfirmText} onChange={e => setDeleteAllConfirmText(e.target.value)} className="w-full px-4 py-3 bg-[#F7F1EE] border border-[#E8D8D1] rounded-xl text-sm outline-none focus:border-red-400 transition-all font-mono" /></div>
            </div>
            <div className="flex gap-3 p-6 pt-2"><button onClick={() => setShowDeleteModal(false)} className="flex-1 py-3 border border-[#E8D8D1] text-[#8E5E4F]/60 rounded-xl text-sm">Cancel</button><button onClick={handleDeleteAll} disabled={deleting || deleteAllConfirmText !== "DELETE ALL"} className="flex-1 py-3 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">{deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Reset"}</button></div>
          </motion.div>
        </motion.div>
      )}</AnimatePresence>
    </div>
  );
}
