import React from 'react';
import { ArrowLeft, Gift, Gem, Sparkles, Crown } from 'lucide-react';
import { Link, useLocation } from 'wouter';

export default function InviteLanding({ params }: { params: { code: string } }) {
  const [, setLocation] = useLocation();
  
  // Clean up the code in case the user pasted the entire share text into the URL
  let code = params?.code || 'WELCOME';
  try {
    code = decodeURIComponent(code).split(' ')[0].trim();
  } catch (e) {
    code = code.split(' ')[0].trim();
  }

  const handleAccept = () => {
    // Save the code so it can be used during signup
    localStorage.setItem('referred_by_code', code);
    // Redirect to profile/auth page
    setLocation('/profile');
  };

  return (
    <div className="min-h-screen bg-[#F7F1EE] flex flex-col font-sans pb-24 md:pb-0">
      <div className="bg-white w-full">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 max-w-3xl mx-auto w-full">
          <div className="flex items-center gap-3">
            <Link href="/">
              <button className="p-1 hover:bg-[#E8D8D1]/50 rounded-full transition-colors">
                <ArrowLeft className="w-6 h-6 text-[#2C1E16]" />
              </button>
            </Link>
            <h1 className="text-[19px] font-semibold text-[#2C1E16] tracking-tight">You're Invited!</h1>
          </div>
        </div>

        {/* Banner Section */}
        <div className="bg-[#8E5E4F] w-full relative overflow-hidden h-[200px] md:h-[240px]">
          <div className="max-w-3xl mx-auto w-full h-full flex relative px-5">
            <div className="flex-1 flex flex-col justify-center z-10 w-2/3">
              <span className="text-[#D4AF37] font-semibold tracking-wider text-sm uppercase mb-1 drop-shadow-sm">Special Offer</span>
              <h2 className="text-white text-2xl md:text-3xl font-bold leading-tight max-w-[200px] md:max-w-[300px]">
                You've been invited to join Eclat!
              </h2>
            </div>
            <div className="absolute right-0 bottom-0 h-[100%] w-1/2 md:w-1/3 flex items-end justify-end">
              <img 
                src="/referral_banner.png" 
                alt="Invite Banner" 
                className="h-[120%] object-cover object-right-bottom max-w-none transform translate-x-4 md:translate-x-0"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto w-full px-4 -mt-8 z-20 relative flex-1 flex flex-col">
        {/* Invite Code Card */}
        <div className="bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] border border-[#E8D8D1]/50 p-1 relative overflow-hidden">
          {/* Semicircle cutouts */}
          <div className="absolute left-[-10px] top-1/2 -translate-y-1/2 w-5 h-5 bg-[#F7F1EE] rounded-full z-10 border-r border-[#E8D8D1]"></div>
          <div className="absolute right-[-10px] top-1/2 -translate-y-1/2 w-5 h-5 bg-[#F7F1EE] rounded-full z-10 border-l border-[#E8D8D1]"></div>
          
          <div className="flex flex-col items-center py-8 px-6 md:px-8 text-center">
            <div className="w-14 h-14 bg-[#F7F1EE] rounded-full flex items-center justify-center mb-4 border border-[#E8D8D1]">
              <Gift className="w-7 h-7 text-[#B47A67]" />
            </div>
            <h3 className="text-xl font-bold text-[#2C1E16] mb-2 tracking-tight">Your friend sent you a gift!</h3>
            <p className="text-[#8E5E4F]/80 text-[15px] mb-6 max-w-sm">
              Sign up with the referral code below to claim exclusive rewards on your first purchase.
            </p>
            
            <div className="bg-[#E8D8D1]/20 border border-dashed border-[#B47A67] px-6 py-3 rounded-lg inline-block">
              <span className="text-[#2C1E16] font-bold text-xl tracking-widest">{code}</span>
            </div>
          </div>
        </div>
        
        {/* Why Join Section */}
        <div className="mt-8 px-2 md:px-6">
          <h4 className="text-[15px] font-bold text-[#2C1E16] mb-4 uppercase tracking-widest text-center">Why join Eclat?</h4>
          <div className="space-y-4">
            <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-[#E8D8D1]/50 shadow-sm group hover:border-[#B47A67] transition-colors">
              <div className="w-10 h-10 bg-[#F7F1EE] rounded-full flex items-center justify-center group-hover:bg-[#E8D8D1]/50 transition-colors">
                <Gem className="w-5 h-5 text-[#B47A67]" />
              </div>
              <p className="text-[15px] text-[#2C1E16] font-medium">Access to premium luxury fashion</p>
            </div>
            <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-[#E8D8D1]/50 shadow-sm group hover:border-[#B47A67] transition-colors">
              <div className="w-10 h-10 bg-[#F7F1EE] rounded-full flex items-center justify-center group-hover:bg-[#E8D8D1]/50 transition-colors">
                <Sparkles className="w-5 h-5 text-[#B47A67]" />
              </div>
              <p className="text-[15px] text-[#2C1E16] font-medium">Personalized Virtual Stylist</p>
            </div>
            <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-[#E8D8D1]/50 shadow-sm group hover:border-[#B47A67] transition-colors">
              <div className="w-10 h-10 bg-[#F7F1EE] rounded-full flex items-center justify-center group-hover:bg-[#E8D8D1]/50 transition-colors">
                <Crown className="w-5 h-5 text-[#B47A67]" />
              </div>
              <p className="text-[15px] text-[#2C1E16] font-medium">Exclusive members-only deals</p>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Bottom Action */}
      <div 
        className="fixed bottom-0 left-0 right-0 bg-white p-4 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] md:sticky md:mt-auto md:bg-transparent md:shadow-none z-50 border-t border-[#E8D8D1] md:border-none"
        style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
      >
        <div className="max-w-3xl mx-auto w-full">
          <button 
            className="w-full bg-[#B47A67] hover:bg-[#8E5E4F] text-white text-[17px] font-semibold py-3.5 rounded-xl transition-colors shadow-sm active:scale-[0.98]"
            onClick={handleAccept}
          >
            Accept Invite & Sign Up
          </button>
        </div>
      </div>
    </div>
  );
}
