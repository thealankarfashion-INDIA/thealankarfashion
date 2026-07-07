import { lazy, Suspense, useCallback, useRef, useState } from 'react';
import { Search } from 'lucide-react';

interface SearchBarProps {
  placeholder?: string;
  className?: string;
  variant?: 'home' | 'shop';
}

const SearchOverlay = lazy(() => import('./SearchOverlay'));

export default function SearchBar({ placeholder = 'Search jewellery...', className = '', variant = 'home' }: SearchBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleOpen = useCallback(() => {
    setIsOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  const overlay = isOpen ? (
    <Suspense fallback={null}>
      <SearchOverlay
        isOpen={isOpen}
        onClose={handleClose}
        inputRef={inputRef}
      />
    </Suspense>
  ) : null;

  if (variant === 'home') {
    return (
      <>
        <button
          onClick={handleOpen}
          className={`relative flex items-center gap-2 border border-[#C59B62]/50 rounded-full px-3 py-1.5 bg-transparent hover:bg-white/30 transition-colors text-left ${className}`}
        >
          <Search className="w-3.5 h-3.5 text-[#333333] shrink-0" strokeWidth={1.5} />
          <span className="text-[11px] text-[#333333]/60 truncate">{placeholder}</span>
        </button>

        {overlay}
      </>
    );
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className={`w-full flex items-center gap-3 bg-[#F7F1EE] border border-[#E8D8D1] rounded-xl px-4 py-3 text-left hover:border-[#B47A67] transition-colors group ${className}`}
      >
        <Search className="w-4 h-4 text-[#8E5E4F]/50 shrink-0 group-hover:text-[#B47A67] transition-colors" />
        <span className="text-sm text-[#8E5E4F]/50 flex-1">{placeholder}</span>
      </button>

      {overlay}
    </>
  );
}
