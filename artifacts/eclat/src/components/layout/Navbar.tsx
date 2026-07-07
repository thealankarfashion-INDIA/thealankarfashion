import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { Heart, ShoppingBag, User, MapPin, ArrowLeft } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { useAuth } from '@/context/AuthContext';
import useStoreCategories from '@/hooks/useStoreCategories';
import { motion, AnimatePresence } from 'framer-motion';
import CartDrawer from './CartDrawer';
import AnnouncementBar from '../home/AnnouncementBar';
import SearchBar from '@/components/search/SearchBar';

const navLinks = [
  { name: 'NEW ARRIVALS', href: '/new-arrivals' },
  { name: 'SHOP ALL', href: '/shop' },
  { name: 'COLLECTIONS', href: '/collections', hasDropdown: true },
  { name: 'MAISON', href: '/about' }
];

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMegaMenuOpen, setIsMegaMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { cartCount, setIsCartOpen } = useCart();
  const { items: wishlistItems } = useWishlist();
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const { categories } = useStoreCategories();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <div className="fixed top-0 left-0 w-full z-50 flex flex-col">
        <AnnouncementBar />

        <header className={`w-full transition-all duration-500 ${(isScrolled || location !== '/')
            ? 'bg-[#F2EBE7] border-b border-[#DCD0C0]/50 shadow-[0_2px_10px_rgba(142,94,79,0.08)]'
            : 'bg-transparent border-b border-transparent'
          }`}>

          {/* Desktop View */}
          <div className="hidden md:block w-full">
            {/* Top Row */}
            <div className="px-6 lg:px-10 py-5 flex items-center justify-between">

              {/* Left: Store Locator */}
              <div className="flex-1 flex items-center gap-2 text-[#333333]">
                <MapPin className="w-4 h-4" strokeWidth={1.5} />
                <span className="text-xs font-medium tracking-wide">Store Locator (1)</span>
              </div>

              {/* Center: Logo */}
              <div className="flex-none text-center">
                <Link href="/">
                  <span className="font-serif text-4xl italic tracking-wider text-[#C59B62]">
                    Thealankar
                  </span>
                </Link>
              </div>

              {/* Right: Icons & Search */}
              <div className="flex-1 flex items-center justify-end gap-5">
                {/* Search Bar */}
                <SearchBar
                  variant="home"
                  placeholder="Search earrings, necklaces…"
                  className="w-[260px]"
                />

                <Link href="/profile?tab=wishlist" className="relative hover:opacity-80 transition-opacity">
                  <Heart className="w-[22px] h-[22px] text-[#333333]" strokeWidth={1.5} />
                  {wishlistItems.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#CF6B8D] rounded-full border border-[#FDF9F3]" />
                  )}
                </Link>

                <button onClick={() => setIsCartOpen(true)} className="relative hover:opacity-80 transition-opacity">
                  <ShoppingBag className="w-[22px] h-[22px] text-[#333333]" strokeWidth={1.5} />
                  {cartCount >= 0 && (
                    <span className="absolute -top-1.5 -right-2 bg-[#CF6B8D] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                      {cartCount}
                    </span>
                  )}
                </button>

                <Link href="/profile" className="hover:opacity-80 transition-opacity">
                  {user?.photoURL ? (
                    <img src={user.photoURL} alt="Profile" className="w-[22px] h-[22px] rounded-full object-cover border border-[#E8D8D1]" />
                  ) : (
                    <User className="w-[22px] h-[22px] text-[#333333]" strokeWidth={1.5} />
                  )}
                </Link>
              </div>
            </div>

            {/* Bottom Row: Nav Links */}
            <div className="pb-5 flex justify-center">
              <nav className="flex items-center gap-12">
                {navLinks.map((link) => (
                  <div key={link.name} className="relative group"
                    onMouseEnter={() => link.hasDropdown && setIsMegaMenuOpen(true)}
                    onMouseLeave={() => link.hasDropdown && setIsMegaMenuOpen(false)}
                  >
                    <Link href={link.href} className="text-[11px] font-bold tracking-[0.12em] uppercase text-[#333333] hover:text-[#C59B62] transition-colors">
                      {link.name}
                    </Link>

                    {/* Mega Menu Dropdown */}
                    {link.hasDropdown && (
                      <AnimatePresence>
                        {isMegaMenuOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            transition={{ duration: 0.2 }}
                            className="absolute top-full left-1/2 -translate-x-1/2 mt-4 w-[600px] bg-[#FDF9F3] border border-[#E8D8D1] shadow-xl rounded-sm overflow-hidden z-50"
                          >
                            <div className="p-8 grid grid-cols-2 gap-8 text-left">
                              <div>
                                <h3 className="font-serif text-lg mb-4 text-[#C59B62]">Featured Collections</h3>
                                <ul className="space-y-3 max-h-[250px] overflow-y-auto pr-2">
                                  {categories.map(c => (
                                    <li key={c.id}>
                                      <Link href={`/collections?cat=${c.id}`} className="text-[#333333]/80 hover:text-[#C59B62] transition-colors text-sm">
                                        {c.name}
                                      </Link>
                                    </li>
                                  ))}
                                </ul>
                                <div className="mt-6 pt-6 border-t border-[#E8D8D1]">
                                  <Link href="/collections" className="text-sm uppercase tracking-widest text-[#C59B62] hover:opacity-80 transition-opacity">
                                    View All Collections →
                                  </Link>
                                </div>
                              </div>
                              <div className="relative h-full min-h-[200px] bg-[#F7F1EE] overflow-hidden rounded-sm">
                                {categories[0]?.image ? (
                                  <img
                                    src={categories[0].image}
                                    alt="Featured collection"
                                    className="absolute inset-0 w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="absolute inset-0 bg-[#E8D8D1]" />
                                )}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    )}
                  </div>
                ))}
              </nav>
            </div>
          </div>

          {/* Mobile View */}
          <div className="md:hidden w-full bg-white border-b border-[#DCD0C0]/50 shadow-sm">
            {location === '/' ? (
              <div className="px-4 py-3 flex flex-col gap-3">
                <div className="relative flex items-center justify-between h-[44px]">
                  {/* Left: Hamburger & Menu Text */}
                  <div className="flex items-center gap-2 relative z-10">
                    <button
                      className="flex items-center gap-2 text-[#333333]"
                      onClick={() => setIsMobileMenuOpen(true)}
                    >
                      <div className="flex flex-col gap-1.5">
                        <span className="w-5 h-[1px] bg-[#333333]"></span>
                        <span className="w-5 h-[1px] bg-[#333333]"></span>
                      </div>
                      <span className="text-[10px] font-medium tracking-widest uppercase mt-0.5">Menu</span>
                    </button>
                  </div>

                  {/* Center: Logo */}
                  <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center w-full max-w-[150px]">
                    <Link href="/">
                      <span className="font-serif text-[28px] italic tracking-wider text-[#C59B62] truncate">
                        Thealankar
                      </span>
                    </Link>
                  </div>

                  {/* Right: Icons */}
                  <div className="flex items-center gap-4 relative z-10">
                    <Link href="/profile?tab=wishlist" className="hover:opacity-80 transition-opacity">
                      <Heart className="w-[22px] h-[22px] text-[#333333]" strokeWidth={1.5} />
                    </Link>
                    <button onClick={() => setIsCartOpen(true)} className="relative hover:opacity-80 transition-opacity">
                      <ShoppingBag className="w-[22px] h-[22px] text-[#333333]" strokeWidth={1.5} />
                      {cartCount > 0 && (
                        <span className="absolute -top-1.5 -right-2 bg-[#CF6B8D] text-white text-[9px] font-bold w-[16px] h-[16px] rounded-full flex items-center justify-center">
                          {cartCount}
                        </span>
                      )}
                    </button>
                  </div>
                </div>

                {/* Mobile Search & Store Locator */}
                <div className="flex items-center gap-3 mt-1">
                  <div className="flex items-center gap-1 text-[#333333] text-[10px] shrink-0">
                    <MapPin className="w-3 h-3" strokeWidth={1.5} />
                    <span>Store Locator (1)</span>
                  </div>
                  <div className="flex-1">
                    <SearchBar variant="home" placeholder="Search earrings…" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between px-4 py-3">
                <button onClick={() => window.history.back()} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-50 text-[#333]">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <Link href="/">
                  <span className="font-serif text-xl italic tracking-wider text-[#C59B62]">Thealankar</span>
                </Link>
                <div className="flex items-center gap-3">
                  <Link href="/profile?tab=wishlist" className="relative hover:opacity-80 transition-opacity">
                    <Heart className="w-[22px] h-[22px] text-[#333]" strokeWidth={1.5} />
                    {wishlistItems.length > 0 && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#CF6B8D] rounded-full border border-[#FDF9F3]" />
                    )}
                  </Link>
                  <button onClick={() => setIsCartOpen(true)} className="relative hover:opacity-80 transition-opacity">
                    <ShoppingBag className="w-[22px] h-[22px] text-[#333]" strokeWidth={1.5} />
                    {cartCount > 0 && (
                      <span className="absolute -top-1.5 -right-2 bg-[#CF6B8D] text-white text-[10px] font-bold w-[16px] h-[16px] rounded-full flex items-center justify-center">
                        {cartCount}
                      </span>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Mobile Drawer Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMobileMenuOpen(false)}
                className="fixed inset-0 bg-black/40 z-[100] md:hidden"
              />

              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'tween', duration: 0.3 }}
                className="fixed top-0 left-0 bottom-0 w-[85%] max-w-[320px] bg-[#FDF9F3] z-[110] flex flex-col shadow-2xl md:hidden"
              >
                <div className="flex items-center justify-between p-5 border-b border-[#E8D8D1]">
                  <span className="font-serif text-2xl italic tracking-wider text-[#C59B62]">
                    Thealankar
                  </span>
                  <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-[#333333] hover:opacity-70">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto py-2">
                  <div className="flex flex-col">
                    {navLinks.map((link) => (
                      <Link
                        key={link.name}
                        href={link.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center justify-between px-6 py-4 text-xs font-bold tracking-[0.15em] uppercase text-[#333333] border-b border-[#E8D8D1]/40 hover:bg-white transition-colors"
                      >
                        {link.name}
                      </Link>
                    ))}
                  </div>

                  <div className="px-6 py-8 mt-4 bg-[#F7EFE5]/50 border-t border-[#E8D8D1]">
                    <Link href="/profile" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 text-sm font-semibold tracking-wide text-[#8E5E4F] mb-6">
                      <User className="w-5 h-5" strokeWidth={1.5} />
                      My Account
                    </Link>
                    <Link href="/profile?tab=orders" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 text-sm font-semibold tracking-wide text-[#8E5E4F]">
                      <ShoppingBag className="w-5 h-5" strokeWidth={1.5} />
                      My Orders
                    </Link>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      <CartDrawer />
    </>
  );
}
