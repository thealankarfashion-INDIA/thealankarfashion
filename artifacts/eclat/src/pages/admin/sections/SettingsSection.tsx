import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Trash2, Loader2, Check, Save, Smartphone, Mail, CreditCard, ShoppingBag, KeyRound, Eye, EyeOff, Send } from "lucide-react";
import { getAdminResetRedirectUrl, getDB, markAdminRecoveryRequested, supabase } from "@/lib/supabase";
import { collection, getDocs, deleteDoc, doc, getDoc, setDoc, serverTimestamp } from "@/lib/supabaseStore";

interface StoreSettings { storeName: string; storePhone: string; storeEmail: string; storeWhatsApp: string; upiId: string; upiPayeeName: string; minOrderAmount: number; }
const ADMIN_EMAIL = "thealankar.fashion@gmail.com";
const defaultSettings: StoreSettings = { storeName: "Thealankar", storePhone: "+91 63825 19502", storeEmail: "thealankar@gmail.com", storeWhatsApp: "+91 63825 19502", upiId: "", upiPayeeName: "", minOrderAmount: 500 };

export function SettingsSection() {
  const [settings, setSettings] = useState<StoreSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteAllConfirmText, setDeleteAllConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [confirmAdminPassword, setConfirmAdminPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [sendingResetEmail, setSendingResetEmail] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewAdminPassword, setShowNewAdminPassword] = useState(false);
  const [showConfirmAdminPassword, setShowConfirmAdminPassword] = useState(false);

  useEffect(() => {
    (async () => { try { const snap = await getDoc(doc(getDB(), "settings", "storeSettings")); if (snap.exists()) setSettings({ ...defaultSettings, ...snap.data() }); } catch (err) { console.error(err); } finally { setLoading(false); } })();
  }, []);

  const handleSave = async () => { setSaving(true); try { await setDoc(doc(getDB(), "settings", "storeSettings"), { ...settings, updatedAt: serverTimestamp() }); setSuccessMsg("Settings updated successfully."); setTimeout(() => setSuccessMsg(""), 3000); } catch (err) { console.error(err); alert("Failed to save."); } finally { setSaving(false); } };

  const clearPasswordMessages = () => { setPasswordError(""); setPasswordSuccess(""); };

  const handleSendAdminResetEmail = async () => {
    clearPasswordMessages();
    setSendingResetEmail(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(ADMIN_EMAIL, { redirectTo: getAdminResetRedirectUrl() });
      if (error) throw error;
      markAdminRecoveryRequested();
      setPasswordSuccess(`Reset email sent to ${ADMIN_EMAIL}. Open the newest email and choose a new password.`);
    } catch (err) {
      console.error("Failed to send admin reset email:", err);
      setPasswordError("Could not send reset email. Check Supabase email settings and try again.");
    } finally {
      setSendingResetEmail(false);
    }
  };

  const handleChangeAdminPassword = async () => {
    clearPasswordMessages();
    if (!currentPassword.trim()) { setPasswordError("Enter the current admin password first."); return; }
    if (newAdminPassword.length < 8) { setPasswordError("New password must be at least 8 characters."); return; }
    if (newAdminPassword !== confirmAdminPassword) { setPasswordError("New password and confirmation do not match."); return; }
    if (currentPassword === newAdminPassword) { setPasswordError("New password must be different from the current password."); return; }

    setChangingPassword(true);
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      const email = userData.user?.email?.toLowerCase();
      if (email !== ADMIN_EMAIL) {
        setPasswordError("Only the registered admin account can change this password.");
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({ email: ADMIN_EMAIL, password: currentPassword });
      if (signInError) {
        setPasswordError("Current admin password is incorrect.");
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({ password: newAdminPassword });
      if (updateError) throw updateError;

      setCurrentPassword("");
      setNewAdminPassword("");
      setConfirmAdminPassword("");
      setPasswordSuccess("Admin password changed successfully. Use the new password for the next login.");
    } catch (err) {
      console.error("Failed to change admin password:", err);
      setPasswordError("Could not change admin password. Please try again.");
    } finally {
      setChangingPassword(false);
    }
  };

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

        <div className="bg-white border border-[#E8D8D1] rounded-2xl overflow-hidden">
          <div className="px-6 py-4 bg-[#F7F1EE] border-b border-[#E8D8D1]"><h3 className="text-sm font-semibold text-[#8E5E4F] flex items-center gap-2"><KeyRound className="h-4 w-4 text-[#B47A67]" /> Admin Account</h3></div>
          <div className="p-6 space-y-5">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 rounded-xl bg-[#F7F1EE] border border-[#E8D8D1] px-4 py-3">
              <div><p className="text-[10px] tracking-widest uppercase text-[#8E5E4F]/40 mb-1">Admin Email</p><p className="text-sm font-semibold text-[#8E5E4F]">{ADMIN_EMAIL}</p></div>
              <button type="button" onClick={handleSendAdminResetEmail} disabled={sendingResetEmail || changingPassword} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-[#E8D8D1] rounded-xl text-sm font-semibold text-[#8E5E4F] hover:border-[#B47A67] hover:text-[#B47A67] transition-all disabled:opacity-50">
                {sendingResetEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send Reset Email
              </button>
            </div>

            {passwordError && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{passwordError}</div>}
            {passwordSuccess && <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">{passwordSuccess}</div>}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div><label className="block text-[10px] tracking-widest uppercase text-[#8E5E4F]/40 mb-2">Current Password</label><div className="relative"><input type={showCurrentPassword ? "text" : "password"} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} autoComplete="current-password" className="w-full px-4 pr-11 py-3 bg-[#F7F1EE] border border-[#E8D8D1] rounded-xl text-sm text-[#8E5E4F] outline-none focus:border-[#B47A67] transition-all" /><button type="button" onClick={() => setShowCurrentPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8E5E4F]/50 hover:text-[#8E5E4F]">{showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></div>
              <div><label className="block text-[10px] tracking-widest uppercase text-[#8E5E4F]/40 mb-2">New Password</label><div className="relative"><input type={showNewAdminPassword ? "text" : "password"} value={newAdminPassword} onChange={e => setNewAdminPassword(e.target.value)} autoComplete="new-password" className="w-full px-4 pr-11 py-3 bg-[#F7F1EE] border border-[#E8D8D1] rounded-xl text-sm text-[#8E5E4F] outline-none focus:border-[#B47A67] transition-all" /><button type="button" onClick={() => setShowNewAdminPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8E5E4F]/50 hover:text-[#8E5E4F]">{showNewAdminPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></div>
              <div><label className="block text-[10px] tracking-widest uppercase text-[#8E5E4F]/40 mb-2">Confirm New Password</label><div className="relative"><input type={showConfirmAdminPassword ? "text" : "password"} value={confirmAdminPassword} onChange={e => setConfirmAdminPassword(e.target.value)} autoComplete="new-password" className="w-full px-4 pr-11 py-3 bg-[#F7F1EE] border border-[#E8D8D1] rounded-xl text-sm text-[#8E5E4F] outline-none focus:border-[#B47A67] transition-all" /><button type="button" onClick={() => setShowConfirmAdminPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8E5E4F]/50 hover:text-[#8E5E4F]">{showConfirmAdminPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <button type="button" onClick={handleChangeAdminPassword} disabled={changingPassword || sendingResetEmail} className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#B47A67] text-white rounded-xl text-sm font-semibold hover:bg-[#A86F5C] transition-all disabled:opacity-50">
                {changingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />} Change Admin Password
              </button>
              <p className="text-xs text-[#8E5E4F]/50">Use this only from the secure admin portal. Reset emails open the admin password reset page.</p>
            </div>
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
