import React, { useState, useEffect } from 'react';
import { ArrowLeft, Wallet as WalletIcon, ArrowRight, CheckCircle2, XCircle } from 'lucide-react';
import { Link } from 'wouter';
import { useAuth } from '@/context/AuthContext';
import { getDB } from '@/lib/supabase';
import { collection, query, where, onSnapshot, doc } from '@/lib/supabaseStore';
import { WalletTransaction } from '@/lib/user';
import { motion, AnimatePresence } from 'framer-motion';

const getDate = (val: any): Date => {
  if (!val) return new Date();
  if (typeof val.toDate === 'function') return val.toDate();
  if (val instanceof Date) return val;
  if (typeof val === 'number') return new Date(val);
  if (typeof val === 'string') return new Date(val);
  if (val.seconds) return new Date(val.seconds * 1000);
  return new Date();
};

export default function Wallet() {
  const { user } = useAuth();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'All' | 'Added' | 'Deducted'>('All');
  const [usagePercent, setUsagePercent] = useState(50);

  useEffect(() => {
    if (!user) return;
    const db = getDB();

    // Fetch user profile for balance and usage percent
    const unsubUser = onSnapshot(doc(db, 'users', user.uid), (docSnap: any) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setBalance(data.totalSavings || 0);
        setUsagePercent(data.walletUsagePercent || 50);
      }
    });

    // Fetch transactions
    const q = query(collection(db, 'wallet_transactions'), where('userId', '==', user.uid));
    const unsubTx = onSnapshot(q, (snap) => {
      const txs = snap.docs.map(d => ({ id: d.id, ...d.data() } as WalletTransaction));
      txs.sort((a, b) => {
        const dateA = getDate(a.createdAt).getTime();
        const dateB = getDate(b.createdAt).getTime();
        return dateB - dateA;
      });
      setTransactions(txs);
      setLoading(false);
    });

    return () => {
      unsubUser();
      unsubTx();
    };
  }, [user]);

  const filteredTx = transactions.filter(tx => {
    if (activeTab === 'All') return true;
    if (activeTab === 'Added') return tx.type === 'added';
    if (activeTab === 'Deducted') return tx.type === 'deducted';
    return true;
  });

  // Group by year
  const groupedByYear = filteredTx.reduce((acc, tx) => {
    const year = getDate(tx.createdAt).getFullYear();
    if (!acc[year]) acc[year] = [];
    acc[year].push(tx);
    return acc;
  }, {} as Record<number, WalletTransaction[]>);

  const years = Object.keys(groupedByYear).map(Number).sort((a, b) => b - a);

  // Get nearest expiry amount
  const addedTx = transactions.filter(t => t.type === 'added' && t.expiresAt);
  const nearestExpiry = addedTx.length > 0 ? addedTx.sort((a, b) => {
    const da = getDate(a.expiresAt).getTime();
    const db = getDate(b.expiresAt).getTime();
    return da - db;
  })[0] : null;

  return (
    <div className="min-h-screen bg-[#F7F1EE] flex flex-col font-sans pb-24 md:pb-0">
      <div className="bg-[#F7F1EE] w-full sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 py-4 max-w-3xl mx-auto w-full">
          <div className="flex items-center gap-4">
            <Link href="/profile">
              <button className="p-1 hover:bg-[#E8D8D1]/50 rounded-full transition-colors -ml-1">
                <ArrowLeft className="w-6 h-6 text-[#2C1E16]" />
              </button>
            </Link>
            <h1 className="text-[19px] font-bold text-[#2C1E16] tracking-tight">Eclat wallet</h1>
          </div>
          <Link href="/faq">
            <span className="text-[#102B99] font-bold text-sm cursor-pointer hover:underline uppercase decoration-2 underline-offset-2">FAQ</span>
          </Link>
        </div>
      </div>

      <div className="max-w-3xl mx-auto w-full px-4 flex-1">
        {/* Wallet Card */}
        <div className="bg-white rounded-[20px] shadow-[0_2px_12px_rgba(0,0,0,0.06)] border border-[#E8D8D1]/40 relative overflow-hidden mt-2 flex flex-col">
          {/* Logo Tab Top Right */}
          <div className="absolute top-0 right-4 w-12 h-16 bg-[#2C1E16] rounded-b-[20px] flex items-center justify-center shadow-md z-10 overflow-hidden">
             <div className="font-serif italic font-bold text-white text-[10px] transform -rotate-90 origin-center whitespace-nowrap opacity-90 tracking-widest uppercase mt-4">
               Thealankar
             </div>
             <div className="absolute bottom-2 w-4 h-4 bg-white/10 rounded-full"></div>
          </div>

          <div className="p-6 md:p-8 pt-7">
            <div className="flex flex-col">
              <span className="text-[34px] font-bold text-[#2C1E16] tracking-tight leading-none mb-1">₹{balance.toFixed(2)}</span>
              <span className="text-[#8E5E4F]/70 text-[15px] font-medium">Wallet balance</span>
            </div>
          </div>

          <div className="px-6 md:px-8 py-4 border-t border-[#E8D8D1]/40 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors">
             <span className="text-[#8E5E4F]/90 text-[15px] font-medium">Offer cash: ₹{balance.toFixed(2)}</span>
             <ArrowRight className="w-4 h-4 text-[#8E5E4F]/50" />
          </div>

          {nearestExpiry && (
            <div className="bg-[#B47A67] px-6 py-3 text-center w-full mt-auto">
              <span className="text-white text-[13px] font-semibold tracking-wide">
                ₹{nearestExpiry.amount.toFixed(2)} expires by {nearestExpiry.expiresAt ? getDate(nearestExpiry.expiresAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'soon'}
              </span>
            </div>
          )}
          {!nearestExpiry && balance > 0 && (
             <div className="bg-[#B47A67] px-6 py-3 text-center w-full mt-auto">
              <span className="text-white text-[13px] font-semibold tracking-wide">
                You can apply up to {usagePercent}% of this on your next order
              </span>
            </div>
          )}
          {balance === 0 && (
             <div className="bg-[#B47A67] px-6 py-3 text-center w-full mt-auto">
              <span className="text-white text-[13px] font-semibold tracking-wide">
                Refer friends to earn wallet balance!
              </span>
            </div>
          )}
        </div>

        {/* Refer and Earn Banner */}
        <Link href="/referrals">
          <div className="mt-6 bg-[#FEF6F5] rounded-[20px] p-5 flex items-center justify-between cursor-pointer hover:shadow-md transition-shadow relative overflow-hidden border border-[#FBE9E7]">
            <div className="flex flex-col gap-1.5 max-w-[60%] z-10 relative">
              <h3 className="text-lg font-bold text-[#2C1E16] tracking-tight">Refer and earn</h3>
              <p className="text-[14px] text-[#8E5E4F]/80 leading-snug mb-2">
                Invite your friends to Eclat and earn wallet money
              </p>
              <button className="bg-[#FBE9E7] text-[#B47A67] text-[13px] font-bold px-5 py-2 rounded-full w-fit hover:bg-[#F8DED9] transition-colors">
                Refer now
              </button>
            </div>
            
            {/* Banner Illustration */}
            <div className="absolute right-0 bottom-0 top-0 w-[45%] flex items-end justify-end opacity-90">
               <img src="/referral_banner.png" alt="Refer" className="h-[120%] object-cover object-right-bottom mix-blend-multiply" />
            </div>
          </div>
        </Link>

        {/* Recent Activity Section */}
        <div className="mt-8 mb-6">
          <h2 className="text-[22px] font-bold text-[#2C1E16] mb-5 tracking-tight">Recent activity</h2>

          {/* Tabs */}
          <div className="flex items-center gap-3 mb-6">
            {(['All', 'Added', 'Deducted'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-2 rounded-full text-[14px] font-medium transition-colors border ${
                  activeTab === tab 
                    ? 'bg-[#FBE9E7] text-[#B47A67] border-[#FBE9E7]' 
                    : 'bg-white text-[#8E5E4F] border-[#E8D8D1]/70 hover:border-[#8E5E4F]/40'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Transactions List */}
          {loading ? (
            <div className="py-12 flex justify-center"><div className="w-8 h-8 border-2 border-[#E8D8D1] border-t-[#B47A67] rounded-full animate-spin" /></div>
          ) : filteredTx.length === 0 ? (
            <div className="py-12 text-center text-[#8E5E4F]/60 text-[15px]">No activity found.</div>
          ) : (
            <div className="flex flex-col gap-8 pb-12">
              {years.map(year => (
                <div key={year} className="flex flex-col gap-5">
                  <h3 className="text-lg font-bold text-[#8E5E4F]/80">{year}</h3>
                  <div className="flex flex-col gap-6">
                    {groupedByYear[year].map(tx => (
                      <div key={tx.id} className="flex items-start justify-between relative group">
                        <div className="flex items-start gap-4">
                          <div className="mt-1">
                            {tx.type === 'added' ? (
                              <div className="w-10 h-10 rounded-full bg-[#E8F5E9] flex items-center justify-center">
                                <WalletIcon className="w-5 h-5 text-[#2E7D32]" />
                                <div className="absolute ml-5 mt-5 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-sm">
                                  <div className="w-3 h-3 bg-[#2E7D32] rounded-full flex items-center justify-center">
                                    <span className="text-white text-[10px] leading-none">+</span>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                                <WalletIcon className="w-5 h-5 text-gray-500" />
                                <div className="absolute ml-5 mt-5 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-sm">
                                  <div className="w-3 h-3 bg-gray-500 rounded-full flex items-center justify-center">
                                    <span className="text-white text-[10px] leading-none">-</span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex flex-col gap-1">
                            {tx.expiresAt && tx.type === 'added' && (
                              <div className="text-[12px] text-[#8E5E4F]/90 font-medium">
                                Expiration Date: {tx.expiresAt ? getDate(tx.expiresAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-') : 'Unknown'}
                              </div>
                            )}
                            <div className={`text-[17px] font-bold ${tx.type === 'added' ? 'text-[#2E7D32]' : 'text-[#8E5E4F]'}`}>
                              {tx.type === 'added' ? '+' : '-'}₹{tx.amount.toFixed(2)}
                            </div>
                            <div className="text-[14px] text-[#8E5E4F]/80">
                              {tx.description}
                            </div>
                          </div>
                        </div>

                        <div className="text-[13px] text-[#8E5E4F]/70 font-medium mt-1">
                          {getDate(tx.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
