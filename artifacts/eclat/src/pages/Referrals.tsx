import React, { useState, useEffect } from 'react';
import { ArrowLeft, Check, Clock, CheckCircle2, Share2 } from 'lucide-react';
import { Link } from 'wouter';
import { useAuth } from '@/context/AuthContext';
import { getUserProfile } from '@/lib/user';
import { getDB } from '@/lib/supabase';
import { collection, query, where, onSnapshot } from '@/lib/supabaseStore';

interface ReferralEntry {
  id: string;
  referredUserEmail: string;
  status: 'pending' | 'completed';
  rewardAmount: number;
  createdAt: any;
}

function maskEmail(email: string) {
  const [user, domain] = email.split('@');
  if (!user || !domain) return email;
  return `${user[0]}***@${domain}`;
}

export default function Referrals() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'earn' | 'history'>('earn');
  const [copied, setCopied] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [referrals, setReferrals] = useState<ReferralEntry[]>([]);
  const [loadingCode, setLoadingCode] = useState(true);

  // Load actual referral code from Firestore
  useEffect(() => {
    if (!user) return;
    getUserProfile(user.uid, user.email || '', user.displayName || '')
      .then(profile => {
        if (profile.referralCode) setReferralCode(profile.referralCode);
      })
      .catch(console.error)
      .finally(() => setLoadingCode(false));
  }, [user]);

  // Subscribe to real-time referral history
  useEffect(() => {
    if (!user) return;
    const db = getDB();
    const referralsRef = collection(db, 'referrals');
    const q = query(referralsRef, where('referrerId', '==', user.uid));
    const unsub = onSnapshot(q, (snap) => {
      const fetchedReferrals = snap.docs.map(d => ({ id: d.id, ...d.data() } as ReferralEntry));
      fetchedReferrals.sort((a, b) => {
        const dateA = a.createdAt?.toMillis?.() || 0;
        const dateB = b.createdAt?.toMillis?.() || 0;
        return dateB - dateA;
      });
      setReferrals(fetchedReferrals);
    });
    return () => unsub();
  }, [user]);

  const handleCopy = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const totalRewards = referrals
    .filter(r => r.status === 'completed')
    .reduce((sum, r) => sum + (r.rewardAmount || 0), 0);

  const shareLink = `${window.location.origin}/invite/${referralCode}`;

  return (
    <div className="min-h-screen bg-[#F7F1EE] flex flex-col font-sans pb-24 md:pb-0">
      <div className="bg-white w-full">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 max-w-3xl mx-auto w-full">
          <div className="flex items-center gap-3">
            <Link href="/profile">
              <button className="p-1 hover:bg-[#E8D8D1]/50 rounded-full transition-colors">
                <ArrowLeft className="w-6 h-6 text-[#2C1E16]" />
              </button>
            </Link>
            <h1 className="text-[19px] font-semibold text-[#2C1E16] tracking-tight">Referrals</h1>
          </div>
          <Link href="/faq">
            <span className="text-[#B47A67] font-bold text-sm cursor-pointer hover:underline uppercase underline underline-offset-2 decoration-2">FAQ</span>
          </Link>
        </div>

        {/* Banner Section */}
        <div className="bg-[#8E5E4F] w-full relative overflow-hidden h-[180px] md:h-[220px]">
          <div className="max-w-3xl mx-auto w-full h-full flex relative px-5">
            <div className="flex-1 flex flex-col justify-center z-10 w-2/3">
              <h2 className="text-white text-2xl md:text-3xl font-bold leading-tight max-w-[200px] md:max-w-[300px]">
                Earn upto Rs 1000 by referring friends!
              </h2>
            </div>
            <div className="absolute right-0 bottom-0 h-[100%] w-1/2 md:w-1/3 flex items-end justify-end">
              <img 
                src="/referral_banner.png" 
                alt="Refer and Earn" 
                className="h-[120%] object-cover object-right-bottom max-w-none transform translate-x-4 md:translate-x-0"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto w-full px-4 -mt-6 z-20 relative">
        {/* Referral Code Card */}
        <div className="bg-white rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.06)] border border-[#E8D8D1]/50 p-1 relative overflow-hidden">
          <div className="absolute left-[-10px] top-1/2 -translate-y-1/2 w-5 h-5 bg-[#F7F1EE] rounded-full z-10 border-r border-[#E8D8D1]"></div>
          <div className="absolute right-[-10px] top-1/2 -translate-y-1/2 w-5 h-5 bg-[#F7F1EE] rounded-full z-10 border-l border-[#E8D8D1]"></div>
          
          <div className="flex items-center justify-between py-4 px-6 md:px-8">
            <div className="flex flex-col gap-1.5">
              <div className="bg-[#E8D8D1]/20 border border-dashed border-[#B47A67] px-3 py-1.5 rounded-md inline-block w-fit min-w-[120px]">
                {loadingCode ? (
                  <div className="h-6 w-24 bg-[#E8D8D1] rounded animate-pulse" />
                ) : (
                  <span className="text-[#2C1E16] font-medium text-lg tracking-wide">{referralCode}</span>
                )}
              </div>
              <span className="text-[#8E5E4F]/80 text-[15px]">Your referral code</span>
            </div>
            <button 
              onClick={handleCopy}
              disabled={loadingCode}
              className="bg-[#E8D8D1]/50 hover:bg-[#E8D8D1]/80 text-[#2C1E16] font-semibold px-6 py-2.5 rounded-full transition-colors flex items-center gap-1 shadow-sm disabled:opacity-50"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-green-600" />
                  <span>Copied</span>
                </>
              ) : (
                'Copy'
              )}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex w-full mt-6 bg-[#F7F1EE] border-b border-[#E8D8D1]">
          <button 
            className={`flex-1 text-center py-3 text-[15px] font-medium transition-colors relative ${activeTab === 'earn' ? 'text-[#2C1E16]' : 'text-[#8E5E4F]/70 hover:text-[#8E5E4F]'}`}
            onClick={() => setActiveTab('earn')}
          >
            Refer and earn
            {activeTab === 'earn' && (
              <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#B47A67] rounded-t-sm"></div>
            )}
          </button>
          <button 
            className={`flex-1 text-center py-3 text-[15px] font-medium transition-colors relative ${activeTab === 'history' ? 'text-[#2C1E16]' : 'text-[#8E5E4F]/70 hover:text-[#8E5E4F]'}`}
            onClick={() => setActiveTab('history')}
          >
            Referral history
            {activeTab === 'history' && (
              <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#B47A67] rounded-t-sm"></div>
            )}
          </button>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-b-xl shadow-sm md:shadow-none md:bg-transparent min-h-[350px]">
          {activeTab === 'earn' && (
            <div className="p-5 md:p-6 bg-white pb-28 md:pb-6">
              <h3 className="text-2xl font-bold text-[#2C1E16] mb-6 tracking-tight">How it works?</h3>
              
              <div className="flex flex-col gap-6">
                <div className="flex gap-4 items-start">
                  <span className="text-4xl font-bold text-[#D4AF37] mt-[-4px]">1</span>
                  <div className="flex flex-col">
                    <h4 className="text-[17px] font-bold text-[#2C1E16] mb-1">Share your code</h4>
                    <p className="text-[#8E5E4F]/70 text-[15px] leading-snug">
                      Share your unique referral code with your friends.
                    </p>
                  </div>
                </div>
                <div className="ml-10 w-full h-[1px] bg-[#E8D8D1]/50"></div>
                
                <div className="flex gap-4 items-start">
                  <span className="text-4xl font-bold text-[#D4AF37] mt-[-4px]">2</span>
                  <div className="flex flex-col">
                    <h4 className="text-[17px] font-bold text-[#2C1E16] mb-1">Ask friend to download app</h4>
                    <p className="text-[#8E5E4F]/70 text-[15px] leading-snug">
                      Ask your friends to download the Eclat app.
                    </p>
                  </div>
                </div>
                <div className="ml-10 w-full h-[1px] bg-[#E8D8D1]/50"></div>

                <div className="flex gap-4 items-start">
                  <span className="text-4xl font-bold text-[#D4AF37] mt-[-4px]">3</span>
                  <div className="flex flex-col">
                    <h4 className="text-[17px] font-bold text-[#2C1E16] mb-1">Get rewarded</h4>
                    <p className="text-[#8E5E4F]/70 text-[15px] leading-snug">
                      Earn ₹500 cash back when your friends register with Eclat.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="p-5 md:p-6 pt-6 pb-28 md:pb-6">
              {/* Total rewards card */}
              <div className="bg-white rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.06)] border border-[#E8D8D1]/50 p-5 flex items-center justify-between mb-6">
                <div className="flex flex-col gap-1">
                  <span className="text-2xl font-bold text-[#2C1E16] tracking-tight">₹{totalRewards.toFixed(2)}</span>
                  <span className="text-[#8E5E4F]/70 text-[15px]">Total rewards</span>
                </div>
                <div className="w-16 h-16 bg-[#F7F1EE] rounded-full flex items-center justify-center border border-[#E8D8D1]">
                  <Share2 className="w-8 h-8 text-[#B47A67]" />
                </div>
              </div>

              {/* Referral list */}
              {referrals.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center mt-12 gap-1">
                  <h4 className="text-lg font-bold text-[#2C1E16]">No referrals yet!</h4>
                  <p className="text-[#8E5E4F]/70 text-[15px]">Start referring your friends and earn rewards</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <h4 className="text-[13px] font-bold text-[#8E5E4F] uppercase tracking-widest mb-1">Your referrals</h4>
                  {referrals.map(r => (
                    <div key={r.id} className="bg-white border border-[#E8D8D1]/50 rounded-xl p-4 flex items-center justify-between shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center ${r.status === 'completed' ? 'bg-green-50' : 'bg-amber-50'}`}>
                          {r.status === 'completed'
                            ? <CheckCircle2 className="w-5 h-5 text-green-600" />
                            : <Clock className="w-5 h-5 text-amber-500" />
                          }
                        </div>
                        <div>
                          <p className="text-[14px] font-semibold text-[#2C1E16]">{maskEmail(r.referredUserEmail)}</p>
                          <p className="text-[12px] text-[#8E5E4F]/60">
                            {r.createdAt?.toDate ? r.createdAt.toDate().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recently joined'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-[14px] font-bold ${r.status === 'completed' ? 'text-green-600' : 'text-amber-500'}`}>
                          {r.status === 'completed' ? `+₹${r.rewardAmount}` : 'Pending'}
                        </p>
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${r.status === 'completed' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-600'}`}>
                          {r.status === 'completed' ? 'Rewarded' : 'Awaiting approval'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Fixed Bottom Action */}
      <div 
        className="fixed bottom-0 left-0 right-0 bg-white p-4 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] md:sticky md:mt-auto md:bg-transparent md:shadow-none z-50 border-t border-[#E8D8D1] md:border-none"
        style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
      >
        <div className="max-w-3xl mx-auto w-full">
          <button 
            className="w-full bg-[#B47A67] hover:bg-[#8E5E4F] text-white text-[17px] font-semibold py-3.5 rounded-xl transition-colors shadow-sm active:scale-[0.98] disabled:opacity-60"
            disabled={!referralCode}
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: 'Join Eclat with my code!',
                  text: `Use my referral code ${referralCode} and earn rewards!`,
                  url: shareLink,
                }).catch(console.error);
              } else {
                navigator.clipboard.writeText(shareLink);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }
            }}
          >
            Refer now
          </button>
        </div>
      </div>
    </div>
  );
}
