import React from 'react';

// Base shimmer animation class — use with `animate-shimmer`
// Add this to your global CSS or index.css:
// @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
// .animate-shimmer { animation: shimmer 1.6s linear infinite; background: linear-gradient(90deg,#f0ebe8 25%,#e8ddd9 50%,#f0ebe8 75%); background-size: 200% 100%; }

export const SkeletonPulse = ({ className }: { className?: string }) => (
  <div className={`skeleton-shimmer rounded ${className || ''}`} />
);


export const ProductCardSkeleton = () => {
  return (
    <div className="bg-[#FBF6F3] rounded-xl border border-[#E8D8D1] overflow-hidden">
      {/* Image Skeleton */}
      <div className="w-full h-[240px] sm:h-[240px] md:h-[320px] lg:h-[260px] bg-white border-b border-[#E8D8D1] p-4 flex items-center justify-center">
        <SkeletonPulse className="w-full h-full bg-gray-100" />
      </div>
      
      {/* Content Skeleton */}
      <div className="p-4 bg-white flex flex-col justify-between" style={{ minHeight: '140px' }}>
        <div>
          <div className="flex items-center justify-between mb-2">
            <SkeletonPulse className="w-16 h-3" />
            <SkeletonPulse className="w-12 h-3" />
          </div>
          <SkeletonPulse className="w-3/4 h-5 mb-2" />
          <SkeletonPulse className="w-1/2 h-5 mb-3" />
        </div>
        
        <div className="flex items-end justify-between mt-auto pt-2 border-t border-[#E8D8D1]/50">
          <SkeletonPulse className="w-16 h-6" />
          <SkeletonPulse className="w-20 h-8 rounded-full" />
        </div>
      </div>
    </div>
  );
};

export const CategoryBrandSkeleton = () => {
  return (
    <div className="flex-none w-[70vw] sm:w-[260px] md:w-[280px] scroll-snap-start bg-white rounded-[20px] shadow-md border border-[#E8D8D1] overflow-hidden flex flex-col">
      {/* Image Skeleton */}
      <div className="h-[220px] w-full bg-[#F7F1EE] border-b border-[#E8D8D1]/50 p-4">
        <SkeletonPulse className="w-full h-full bg-gray-100 rounded-xl" />
      </div>
      
      {/* Content Skeleton */}
      <div className="p-4 md:p-5 flex flex-col flex-grow bg-white">
        <SkeletonPulse className="w-2/3 h-6 mb-3" />
        <SkeletonPulse className="w-full h-4 mb-2" />
        <SkeletonPulse className="w-4/5 h-4 mb-4" />
        
        <div className="mt-auto pt-2">
          <SkeletonPulse className="w-full h-10 rounded-[12px]" />
        </div>
      </div>
    </div>
  );
};

// ─── Home Page Skeletons ───────────────────────────────────────────────────────

export const HeroBannerSkeleton = () => (
  <div className="w-full h-[200px] md:h-[420px] rounded-2xl overflow-hidden mx-3 md:mx-0" style={{width: 'calc(100% - 24px)'}}>
    <SkeletonPulse className="w-full h-full rounded-2xl" />
  </div>
);

export const CategoryStripSkeleton = () => (
  <div className="flex gap-3 overflow-x-hidden px-3 md:px-0">
    {[...Array(7)].map((_, i) => (
      <div key={i} className="flex-none flex flex-col items-center gap-2">
        <SkeletonPulse className="w-14 h-14 md:w-16 md:h-16 rounded-full" />
        <SkeletonPulse className="w-12 h-2.5 rounded" />
      </div>
    ))}
  </div>
);

export const SectionTitleSkeleton = () => (
  <div className="flex items-center justify-between mb-4 px-3 md:px-0">
    <SkeletonPulse className="w-40 h-5 rounded-lg" />
    <SkeletonPulse className="w-16 h-3.5 rounded" />
  </div>
);

export const HomePageSkeleton = () => (
  <div className="min-h-screen bg-[#F7F1EE] flex flex-col">

    {/* ── MOBILE: App Header ── */}
    <div className="md:hidden bg-[#F7F1EE] px-3 pt-4 pb-3 sticky top-0 z-40 space-y-2.5 shadow-sm">
      {/* Top row: brand + discover */}
      <div className="flex gap-2">
        <SkeletonPulse className="flex-1 h-10 rounded-xl" />
        <SkeletonPulse className="flex-1 h-10 rounded-xl" />
      </div>
      {/* Address bar */}
      <SkeletonPulse className="w-full h-9 rounded-lg" />
      {/* Search bar */}
      <SkeletonPulse className="w-full h-11 rounded-xl" />
    </div>

    {/* ── DESKTOP: Navbar ── */}
    <div className="hidden md:block h-[80px] bg-white shadow-sm border-b border-[#E8D8D1]/40 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-8 h-full flex items-center justify-between">
        <SkeletonPulse className="w-36 h-8 rounded" />
        <div className="flex gap-8">
          {[...Array(5)].map((_, i) => <SkeletonPulse key={i} className="w-16 h-4 rounded" />)}
        </div>
        <div className="flex gap-4 items-center">
          <SkeletonPulse className="w-56 h-9 rounded-full" />
          {[...Array(3)].map((_, i) => <SkeletonPulse key={i} className="w-8 h-8 rounded-full" />)}
        </div>
      </div>
    </div>

    {/* ── Main content ── */}
    <div className="flex-1 bg-white">

      {/* Category Strip */}
      <div className="py-3 md:pt-8 md:pb-4 md:max-w-7xl md:mx-auto md:px-8">
        <CategoryStripSkeleton />
      </div>

      {/* Divider mobile */}
      <div className="w-full h-2 bg-[#F7F1EE] md:hidden" />

      {/* Hero Banner */}
      <div className="py-3 md:py-0 md:max-w-7xl md:mx-auto md:px-8 md:pb-6">
        <SkeletonPulse className="mx-3 md:mx-0 h-[200px] md:h-[400px] rounded-2xl" />
      </div>

      {/* Divider mobile */}
      <div className="w-full h-2 bg-[#F7F1EE] md:hidden" />

      {/* SubCategory Grid — 2 rows of 4 pills on mobile */}
      <div className="px-3 py-4 md:max-w-7xl md:mx-auto md:px-8">
        <SectionTitleSkeleton />
        <div className="grid grid-cols-4 gap-2 md:gap-4">
          {[...Array(8)].map((_, i) => (
            <SkeletonPulse key={i} className="h-16 md:h-24 rounded-xl md:rounded-2xl" />
          ))}
        </div>
      </div>

      {/* Divider mobile */}
      <div className="w-full h-2 bg-[#F7F1EE] md:hidden" />

      {/* Loved Ones / Products horizontal scroll */}
      <div className="py-4 md:py-8 md:max-w-7xl md:mx-auto md:px-8">
        <SectionTitleSkeleton />
        <div className="flex gap-3 overflow-x-hidden px-3 md:px-0">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex-none w-[140px] md:w-[220px]">
              <SkeletonPulse className="h-[200px] md:h-[280px] rounded-xl md:rounded-2xl" />
            </div>
          ))}
        </div>
      </div>

      {/* Divider mobile */}
      <div className="w-full h-2 bg-[#F7F1EE] md:hidden" />

      {/* Shop by Category */}
      <div className="py-4 md:py-8 md:max-w-7xl md:mx-auto md:px-8">
        <SectionTitleSkeleton />
        <div className="flex gap-3 overflow-x-hidden px-3 md:px-0">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex-none w-[70vw] md:w-[280px]">
              <SkeletonPulse className="h-[220px] md:h-[260px] rounded-[20px]" />
              <div className="mt-2 px-1 space-y-2">
                <SkeletonPulse className="w-2/3 h-5 rounded" />
                <SkeletonPulse className="w-full h-3 rounded" />
                <SkeletonPulse className="w-4/5 h-3 rounded" />
                <SkeletonPulse className="w-full h-9 rounded-xl mt-2" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Divider mobile */}
      <div className="w-full h-2 bg-[#F7F1EE] md:hidden" />

      {/* Shop by Brand */}
      <div className="py-4 md:py-8 md:max-w-7xl md:mx-auto md:px-8">
        <SectionTitleSkeleton />
        <div className="flex gap-3 overflow-x-hidden px-3 md:px-0">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex-none w-[70vw] md:w-[280px]">
              <SkeletonPulse className="h-[220px] md:h-[260px] rounded-[20px]" />
              <div className="mt-2 px-1 space-y-2">
                <SkeletonPulse className="w-1/2 h-5 rounded" />
                <SkeletonPulse className="w-full h-3 rounded" />
                <SkeletonPulse className="w-full h-9 rounded-xl mt-2" />
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>

    {/* ── MOBILE: Bottom Nav ── */}
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#E8D8D1] flex justify-around items-center py-3 z-50">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex flex-col items-center gap-1.5">
          <SkeletonPulse className="w-6 h-6 rounded-md" />
          <SkeletonPulse className="w-8 h-2 rounded" />
        </div>
      ))}
    </div>

  </div>
);


// ─── Profile Page Skeletons ────────────────────────────────────────────────────

export const ProfileDashboardSkeleton = () => (
  <div className="min-h-screen bg-[#F7F1EE]">
    {/* Navbar + Announcement Bar placeholder */}
    <div className="bg-white shadow-sm sticky top-0 z-50">
      <SkeletonPulse className="w-full h-10 rounded-none border-b border-[#E8D8D1]/20" />
      <div className="h-[70px] flex items-center justify-between px-4 md:px-8">
        <SkeletonPulse className="w-32 h-6 rounded" />
        <div className="flex gap-4">
          <SkeletonPulse className="w-8 h-8 rounded-full" />
          <SkeletonPulse className="w-8 h-8 rounded-full" />
        </div>
      </div>
    </div>
    <div className="max-w-7xl mx-auto px-4 md:px-8 pt-6 md:pt-12">

      <div className="md:flex md:gap-8">
        {/* Desktop Sidebar */}
        <div className="hidden md:flex flex-col gap-3 w-64 shrink-0">
          <SkeletonPulse className="w-full h-32 rounded-2xl" />
          <SkeletonPulse className="w-full h-40 rounded-2xl" />
          <SkeletonPulse className="w-full h-28 rounded-2xl" />
        </div>
        {/* Content */}
        <div className="flex-1 space-y-4">
          <SkeletonPulse className="w-full h-28 rounded-2xl" />
          <div className="grid grid-cols-2 gap-3">
            <SkeletonPulse className="h-20 rounded-2xl" />
            <SkeletonPulse className="h-20 rounded-2xl" />
          </div>
          <SkeletonPulse className="w-full h-40 rounded-2xl" />
          <SkeletonPulse className="w-full h-40 rounded-2xl" />
        </div>
      </div>
    </div>
  </div>
);

// ─── Login Page Skeleton ───────────────────────────────────────────────────────

export const LoginPageSkeleton = () => (
  <>
    {/* Mobile */}
    <div className="md:hidden min-h-screen bg-[#111111] flex flex-col">
      <div className="flex-1 flex flex-col">
        <div className="pt-10 pb-6 px-6 flex flex-col items-center gap-4">
          <SkeletonPulse className="w-48 h-8 rounded-lg opacity-30" />
          <SkeletonPulse className="w-28 h-9 rounded-lg opacity-30" />
        </div>
        <div className="flex-1 bg-[#1a1a1a]" />
        <div className="bg-white rounded-t-[24px] px-6 pt-6 pb-8 space-y-4">
          <SkeletonPulse className="w-10 h-1 mx-auto rounded-full" />
          <SkeletonPulse className="w-48 h-6 mx-auto rounded" />
          <SkeletonPulse className="w-full h-14 rounded-xl" />
          <SkeletonPulse className="w-full h-12 rounded-xl" />
          <div className="flex gap-3 justify-center pt-2">
            <SkeletonPulse className="w-12 h-12 rounded-full" />
            <SkeletonPulse className="w-12 h-12 rounded-full" />
          </div>
        </div>
      </div>
    </div>
    {/* Desktop */}
    <div className="hidden md:flex min-h-screen">
      <SkeletonPulse className="w-[55%] h-full" />
      <div className="w-[45%] flex items-center justify-center p-12">
        <div className="w-full max-w-[420px] space-y-6">
          <div className="space-y-2">
            <SkeletonPulse className="w-44 h-9 rounded-lg" />
            <SkeletonPulse className="w-64 h-4 rounded" />
          </div>
          <div className="bg-white rounded-2xl p-8 space-y-4 shadow-sm border border-[#E8D8D1]">
            <SkeletonPulse className="w-48 h-6 mx-auto rounded" />
            <SkeletonPulse className="w-full h-14 rounded-xl" />
            <SkeletonPulse className="w-full h-12 rounded-xl" />
            <SkeletonPulse className="w-full h-12 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  </>
);

