import React from 'react';
import { Link, useLocation } from 'wouter';
import { Home, Search, Grid3X3, User, ShoppingBag } from 'lucide-react';
import { motion } from 'framer-motion';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';

const navItems = [
  { href: '/', icon: Home, label: 'Home' },
  { href: '/shop', icon: Search, label: 'Search' },
  { href: '/collections', icon: Grid3X3, label: 'Collections' },
  { href: '/profile', icon: User, label: 'Profile', isProfile: true },
  { href: '/cart', icon: ShoppingBag, label: 'Cart' },
];

export default function BottomNav() {
  const [location] = useLocation();
  const { cartCount } = useCart();
  const { user } = useAuth();
  const isHiddenPage = location === '/cart' || location === '/checkout' || location === '/referrals' || location.startsWith('/invite');
  const isProductPage = location.startsWith('/product');

  if (isHiddenPage || isProductPage) return null;

  return (
    <nav
      data-bottom-nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-[60]"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        transform: 'translateZ(0)',
        willChange: 'transform',
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
        isolation: 'isolate',
        contain: 'layout style',
        bottom: 0,
      }}
    >
      {/* Frosted glass bar */}
      <div className="bg-[#FBF6F3]/90 backdrop-blur-xl border-t border-[#E8D8D1] shadow-[0_-4px_24px_rgba(142,94,79,0.08)]">
        <div className="flex items-stretch justify-around h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              (item.href === '/'
                ? location === '/'
                : location.startsWith(item.href));

            if (item.isProfile) {
              return (
                <Link key="profile" href={item.href} className="flex-1 flex flex-col items-center justify-center gap-1 group">
                  <motion.div
                    whileTap={{ scale: 0.88 }}
                    className="relative flex flex-col items-center gap-1"
                  >
                    <div className="relative">
                      {user?.photoURL ? (
                        <img
                          src={user.photoURL}
                          alt="Profile"
                          className={`w-[22px] h-[22px] rounded-full object-cover transition-all ${isActive ? 'ring-2 ring-[#B47A67] ring-offset-1' : ''
                            }`}
                        />
                      ) : (
                        <User
                          className={`w-[22px] h-[22px] transition-colors ${isActive ? 'text-[#B47A67]' : 'text-[#8E5E4F]/60 group-active:text-[#B47A67]'
                            }`}
                        />
                      )}
                      {user && !user.photoURL && (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border border-white"
                        />
                      )}
                    </div>
                    <span className={`text-[10px] tracking-wider uppercase font-medium transition-colors ${isActive ? 'text-[#B47A67]' : 'text-[#8E5E4F]/70'
                      }`}>
                      Profile
                    </span>
                  </motion.div>
                </Link>
              );
            }

            return (
              <Link
                key={item.href + item.label}
                href={item.href}
                data-testid={`bottom-nav-${item.label.toLowerCase()}`}
                className="flex-1 flex flex-col items-center justify-center group"
              >
                <motion.div
                  whileTap={{ scale: 0.88 }}
                  className="flex flex-col items-center gap-1"
                >
                  <div className="relative">
                    <Icon
                      className={`w-[22px] h-[22px] transition-colors duration-200 ${isActive ? 'text-[#B47A67]' : 'text-[#8E5E4F]/60 group-active:text-[#B47A67]'
                        }`}
                    />
                    {item.label === 'Cart' && cartCount > 0 && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-2 -right-2 w-[18px] h-[18px] bg-[#B47A67] text-white text-[10px] font-medium flex items-center justify-center rounded-full leading-none"
                      >
                        {cartCount > 9 ? '9+' : cartCount}
                      </motion.span>
                    )}
                    {isActive && (
                      <motion.span
                        layoutId="bottom-nav-dot"
                        className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#B47A67]"
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
                  </div>
                  <span className={`text-[10px] tracking-wider uppercase font-medium transition-colors duration-200 ${isActive ? 'text-[#B47A67]' : 'text-[#8E5E4F]/70'
                    }`}>
                    {item.label}
                  </span>
                </motion.div>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
