import { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot, query, doc, updateDoc, increment, serverTimestamp, getDoc, addDoc, deleteDoc, writeBatch, getDocs } from '@/lib/supabaseStore';
import { getDB } from '@/lib/supabase';
import { CheckCircle2, Clock, Users, Gift, Search, AlertCircle, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ConfirmDeleteModal } from '@/components/admin/ConfirmDeleteModal';

interface Referral {
  id: string;
  referrerId: string;
  referredUserId: string;
  referredUserEmail: string;
  referrerEmail?: string;
  referrerName?: string;
  status: 'pending' | 'completed';
  rewardAmount: number;
  createdAt: any;
  completedAt?: any;
}

export function ReferralsSection() {
  const referrerCache = useRef(new Map<string, { email: string; name: string }>());
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [approving, setApproving] = useState<string | null>(null);
  const [editAmounts, setEditAmounts] = useState<Record<string, number>>({});
  const [editUsage, setEditUsage] = useState<Record<string, number>>({});
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const db = getDB();
    const q = query(collection(db, 'referrals'));
    const unsub = onSnapshot(q, async (snap) => {
      const raw = snap.docs.map(d => ({ id: d.id, ...d.data() } as Referral));
      raw.sort((a, b) => {
        const dateA = a.createdAt?.toMillis?.() || Date.now();
        const dateB = b.createdAt?.toMillis?.() || Date.now();
        return dateB - dateA;
      });
      // Enrich with referrer info
      const enriched = await Promise.all(raw.map(async (r) => {
        if (r.referrerEmail || r.referrerName) return r;
        const cached = referrerCache.current.get(r.referrerId);
        if (cached) {
          return { ...r, referrerEmail: cached.email, referrerName: cached.name };
        }
        try {
          const uSnap = await getDoc(doc(db, 'users', r.referrerId));
          if (uSnap.exists()) {
            const u = uSnap.data() as any;
            const info = { email: u.email || '', name: u.displayName || '' };
            referrerCache.current.set(r.referrerId, info);
            return { ...r, referrerEmail: info.email, referrerName: info.name };
          }
        } catch { /* ignore */ }
        return r;
      }));
      setReferrals(enriched);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleApprove = async (referral: Referral) => {
    if (approving) return;
    setApproving(referral.id);
    const finalAmount = editAmounts[referral.id] !== undefined ? editAmounts[referral.id] : referral.rewardAmount;
    const finalUsage = editUsage[referral.id] !== undefined ? editUsage[referral.id] : 50;

    try {
      const db = getDB();
      const expiresDate = new Date();
      expiresDate.setFullYear(expiresDate.getFullYear() + 1);

      // 1. Update the referral status and the custom reward amount
      await updateDoc(doc(db, 'referrals', referral.id), {
        status: 'completed',
        completedAt: serverTimestamp(),
        rewardAmount: finalAmount,
      });
      
      // 2. Add reward to referrer's totalSavings and update their wallet usage percentage
      await updateDoc(doc(db, 'users', referral.referrerId), {
        totalSavings: increment(finalAmount),
        walletUsagePercent: finalUsage,
        updatedAt: serverTimestamp(),
      });

      // 3. Create a wallet transaction record
      await addDoc(collection(db, 'wallet_transactions'), {
        userId: referral.referrerId,
        type: 'added',
        amount: finalAmount,
        description: 'Offer cash • Added to Wallet',
        source: 'referral',
        createdAt: serverTimestamp(),
        expiresAt: expiresDate
      });

      showToast(`Approved! ₹${finalAmount} reward added to ${referral.referrerName || referral.referrerId}.`, 'success');
      
      // Clear the edit state for this referral
      setEditAmounts(prev => {
        const next = { ...prev };
        delete next[referral.id];
        return next;
      });
      setEditUsage(prev => {
        const next = { ...prev };
        delete next[referral.id];
        return next;
      });
    } catch (e) {
      console.error(e);
      showToast('Failed to approve referral. Please try again.', 'error');
    } finally {
      setApproving(null);
    }
  };

  const handleDeleteSingle = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      const db = getDB();
      await deleteDoc(doc(db, 'referrals', itemToDelete));
      showToast('Referral deleted successfully', 'success');
    } catch (e) {
      console.error(e);
      showToast('Failed to delete referral', 'error');
    } finally {
      setIsDeleting(false);
      setDeleteModalOpen(false);
      setItemToDelete(null);
    }
  };

  const handleDeleteAll = async () => {
    setIsDeleting(true);
    try {
      const db = getDB();
      const q = query(collection(db, 'referrals'));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const batch = writeBatch(db);
        snap.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();
        showToast('All referrals deleted successfully', 'success');
      }
    } catch (e) {
      console.error(e);
      showToast('Failed to delete all referrals', 'error');
    } finally {
      setIsDeleting(false);
      setBulkDeleteOpen(false);
    }
  };

  const filtered = referrals
    .filter(r => filter === 'all' || r.status === filter)
    .filter(r => {
      const s = search.toLowerCase();
      return !s || r.referredUserEmail.toLowerCase().includes(s) || (r.referrerEmail || '').toLowerCase().includes(s) || (r.referrerName || '').toLowerCase().includes(s);
    });

  const pending = referrals.filter(r => r.status === 'pending').length;
  const completed = referrals.filter(r => r.status === 'completed').length;
  const totalRewarded = referrals.filter(r => r.status === 'completed').reduce((s, r) => s + r.rewardAmount, 0);

  return (
    <div>
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 right-6 z-[200] flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-lg text-white text-sm font-medium ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}
          >
            {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <div className="text-[10px] tracking-[0.25em] uppercase text-[#8E5E4F]/50 mb-1">Manage</div>
          <h2 className="font-serif text-3xl text-[#8E5E4F]">Referrals</h2>
        </div>
        {referrals.length > 0 && (
          <button 
            onClick={() => setBulkDeleteOpen(true)}
            className="w-full sm:w-auto justify-center flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors font-medium text-sm border border-red-100"
          >
            <Trash2 className="w-4 h-4" />
            Clear All Referrals
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Pending', value: pending, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50' },
          { label: 'Approved', value: completed, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Total Rewarded', value: `₹${totalRewarded.toLocaleString()}`, icon: Gift, color: 'text-[#B47A67]', bg: 'bg-[#F7F1EE]' },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
              className="bg-white border border-[#E8D8D1] rounded-2xl p-4 sm:p-5 flex items-center gap-4">
              <div className={`w-11 h-11 rounded-xl ${s.bg} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div>
                <div className={`font-serif text-2xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-[#8E5E4F]/50 mt-0.5">{s.label}</div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8E5E4F]/40" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-[#E8D8D1] rounded-xl text-sm text-[#2C1E16] placeholder-[#8E5E4F]/40 outline-none focus:border-[#B47A67] transition-colors"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'pending', 'completed'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-sm font-medium capitalize transition-colors border ${filter === f ? 'bg-[#B47A67] text-white border-[#B47A67]' : 'bg-white text-[#8E5E4F] border-[#E8D8D1] hover:border-[#B47A67]'}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Cards on mobile, table on desktop */}
      <div className="bg-white border border-[#E8D8D1] rounded-2xl overflow-hidden">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-2 border-[#E8D8D1] border-t-[#B47A67] rounded-full animate-spin" />
            <span className="text-sm text-[#8E5E4F]/60">Loading referrals...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3">
            <Users className="w-10 h-10 text-[#E8D8D1]" />
            <p className="text-sm text-[#8E5E4F]/60">{search || filter !== 'all' ? 'No matching referrals found.' : 'No referrals yet.'}</p>
          </div>
        ) : (
          <>
            {/* Mobile: Card layout */}
            <div className="md:hidden divide-y divide-[#E8D8D1]">
              {filtered.map((r, i) => {
                const date = r.createdAt?.toDate ? r.createdAt.toDate().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
                return (
                  <motion.div key={r.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                    className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-[#2C1E16] text-sm">{r.referrerName || '—'}</div>
                        <div className="text-xs text-[#8E5E4F]/60 truncate">{r.referrerEmail || r.referrerId}</div>
                        <div className="text-xs text-[#8E5E4F]/40 mt-0.5">{date}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {r.status === 'completed' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700">
                            <CheckCircle2 className="w-3 h-3" /> Done
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-600">
                            <Clock className="w-3 h-3" /> Pending
                          </span>
                        )}
                        <button onClick={() => { setItemToDelete(r.id); setDeleteModalOpen(true); }}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="bg-[#F7F1EE] rounded-xl p-3 space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-[#8E5E4F]/60">Referred User</span>
                        <span className="text-[#2C1E16] font-medium truncate max-w-[60%]">{r.referredUserEmail}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-[#8E5E4F]/60">Reward</span>
                        {r.status === 'pending' ? (
                          <div className="flex items-center gap-1">
                            <span className="text-[#8E5E4F]/70">₹</span>
                            <input type="number" min="0"
                              value={editAmounts[r.id] !== undefined ? editAmounts[r.id] : r.rewardAmount}
                              onChange={(e) => setEditAmounts(prev => ({ ...prev, [r.id]: Number(e.target.value) }))}
                              className="w-16 px-2 py-0.5 text-sm border border-[#E8D8D1] rounded bg-white text-[#2C1E16] outline-none font-semibold"
                            />
                          </div>
                        ) : (
                          <span className="font-semibold text-[#B47A67]">₹{r.rewardAmount}</span>
                        )}
                      </div>
                    </div>
                    {r.status === 'pending' && (
                      <button
                        onClick={() => handleApprove(r)}
                        disabled={approving === r.id}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold bg-[#B47A67] text-white hover:bg-[#8E5E4F] transition-colors disabled:opacity-60"
                      >
                        {approving === r.id ? (
                          <div className="w-3.5 h-3.5 border border-white/40 border-t-white rounded-full animate-spin" />
                        ) : (
                          <Gift className="w-3.5 h-3.5" />
                        )}
                        Approve & Reward
                      </button>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* Desktop: Table layout */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E8D8D1] bg-[#F7F1EE]">
                    <th className="text-left px-5 py-3.5 text-[11px] uppercase tracking-wider text-[#8E5E4F]/60 font-semibold">Date</th>
                    <th className="text-left px-5 py-3.5 text-[11px] uppercase tracking-wider text-[#8E5E4F]/60 font-semibold">Referrer</th>
                    <th className="text-left px-5 py-3.5 text-[11px] uppercase tracking-wider text-[#8E5E4F]/60 font-semibold">New User</th>
                    <th className="text-left px-5 py-3.5 text-[11px] uppercase tracking-wider text-[#8E5E4F]/60 font-semibold">Reward</th>
                    <th className="text-left px-5 py-3.5 text-[11px] uppercase tracking-wider text-[#8E5E4F]/60 font-semibold">Usage %</th>
                    <th className="text-left px-5 py-3.5 text-[11px] uppercase tracking-wider text-[#8E5E4F]/60 font-semibold">Status</th>
                    <th className="text-right px-5 py-3.5 text-[11px] uppercase tracking-wider text-[#8E5E4F]/60 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8D8D1]">
                  {filtered.map((r, i) => {
                    const date = r.createdAt?.toDate ? r.createdAt.toDate().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
                    return (
                      <motion.tr key={r.id}
                        initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                        className="hover:bg-[#F7F1EE]/60 transition-colors">
                        <td className="px-5 py-4 text-[#8E5E4F]/70 whitespace-nowrap">{date}</td>
                        <td className="px-5 py-4">
                          <div className="font-medium text-[#2C1E16]">{r.referrerName || '—'}</div>
                          <div className="text-xs text-[#8E5E4F]/60">{r.referrerEmail || r.referrerId}</div>
                        </td>
                        <td className="px-5 py-4 text-[#2C1E16]">{r.referredUserEmail}</td>
                        <td className="px-5 py-4 font-semibold text-[#B47A67]">
                          {r.status === 'pending' ? (
                            <div className="flex items-center gap-1">
                              <span className="text-[#8E5E4F]/70 text-xs">₹</span>
                              <input type="number" min="0"
                                value={editAmounts[r.id] !== undefined ? editAmounts[r.id] : r.rewardAmount}
                                onChange={(e) => setEditAmounts(prev => ({ ...prev, [r.id]: Number(e.target.value) }))}
                                className="w-16 px-2 py-1 text-sm border border-[#E8D8D1] rounded bg-white text-[#2C1E16] outline-none focus:border-[#B47A67] transition-colors font-semibold"
                              />
                            </div>
                          ) : (
                            `₹${r.rewardAmount}`
                          )}
                        </td>
                        <td className="px-5 py-4 text-[#2C1E16]">
                          {r.status === 'pending' ? (
                            <div className="flex items-center gap-1">
                              <input type="number" min="1" max="100"
                                value={editUsage[r.id] !== undefined ? editUsage[r.id] : 50}
                                onChange={(e) => setEditUsage(prev => ({ ...prev, [r.id]: Number(e.target.value) }))}
                                className="w-14 px-2 py-1 text-sm border border-[#E8D8D1] rounded bg-white text-[#2C1E16] outline-none focus:border-[#B47A67] transition-colors font-semibold"
                              />
                              <span className="text-[#8E5E4F]/70 text-xs">%</span>
                            </div>
                          ) : (
                            <span className="text-xs text-[#8E5E4F]/50">—</span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          {r.status === 'completed' ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-600">
                              <Clock className="w-3.5 h-3.5" /> Pending
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {r.status === 'pending' ? (
                              <button
                                onClick={() => handleApprove(r)}
                                disabled={approving === r.id}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#B47A67] text-white hover:bg-[#8E5E4F] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                              >
                                {approving === r.id ? (
                                  <div className="w-3.5 h-3.5 border border-white/40 border-t-white rounded-full animate-spin" />
                                ) : (
                                  <Gift className="w-3.5 h-3.5" />
                                )}
                                Approve & Reward
                              </button>
                            ) : (
                              <span className="text-xs text-[#8E5E4F]/40 px-2">Rewarded</span>
                            )}
                            <button 
                              onClick={() => { setItemToDelete(r.id); setDeleteModalOpen(true); }}
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete Referral"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <ConfirmDeleteModal
        isOpen={deleteModalOpen}
        onClose={() => { setDeleteModalOpen(false); setItemToDelete(null); }}
        onConfirm={handleDeleteSingle}
        title="Delete Referral"
        message="Are you sure you want to delete this referral record? This action cannot be undone."
        isDeleting={isDeleting}
      />

      <ConfirmDeleteModal
        isOpen={bulkDeleteOpen}
        onClose={() => setBulkDeleteOpen(false)}
        onConfirm={handleDeleteAll}
        title="Delete All Referrals"
        message="Are you absolutely sure you want to delete ALL referrals? This will permanently wipe all referral history from the database and free up storage space. This action cannot be undone."
        isBulk={true}
        isDeleting={isDeleting}
      />
    </div>
  );
}
