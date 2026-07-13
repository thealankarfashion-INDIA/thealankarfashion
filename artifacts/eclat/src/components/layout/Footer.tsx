import { Link } from 'wouter';
import { Instagram } from 'lucide-react';
import { SiWhatsapp, SiGmail } from 'react-icons/si';

export default function Footer() {
  return (
    <footer className="bg-foreground text-background pt-20 pb-10">
      <div className="container mx-auto px-4 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="md:col-span-1">
            <Link href="/" className="font-serif text-2xl tracking-widest uppercase mb-6 inline-block">
              Thealankar
            </Link>
            <p className="text-background/70 text-sm leading-relaxed max-w-xs mb-8">
              Born from a desire for grace in every detail, crafting pieces for the woman who moves through the world with quiet confidence.
            </p>
            <div className="flex gap-4">
              <a href="https://www.instagram.com/thealankar_jewellery?igsh=dDJnb2lteDNhcGc5" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full border border-background/20 flex items-center justify-center hover:bg-background hover:text-foreground transition-colors">
                <Instagram className="w-4 h-4" />
              </a>
              <a href="https://wa.me/919488792660" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full border border-background/20 flex items-center justify-center hover:bg-background hover:text-foreground transition-colors">
                <SiWhatsapp className="w-4 h-4" />
              </a>
              <a href="mailto:thealankar.fashion@gmail.com" className="w-10 h-10 rounded-full border border-background/20 flex items-center justify-center hover:bg-background hover:text-foreground transition-colors">
                <SiGmail className="w-4 h-4" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-serif text-lg mb-6">Shop</h4>
            <ul className="space-y-4">
              <li><Link href="/new-arrivals" className="text-background/70 hover:text-background transition-colors text-sm">New Arrivals</Link></li>
              <li><Link href="/shop" className="text-background/70 hover:text-background transition-colors text-sm">All Products</Link></li>
              <li><Link href="/collections" className="text-background/70 hover:text-background transition-colors text-sm">Collections</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-serif text-lg mb-6">Support</h4>
            <ul className="space-y-4">
              <li><Link href="/faq" className="text-background/70 hover:text-background transition-colors text-sm">FAQ</Link></li>
              <li><Link href="/size-guide" className="text-background/70 hover:text-background transition-colors text-sm">Size Guide</Link></li>
              <li><Link href="/contact" className="text-background/70 hover:text-background transition-colors text-sm">Shipping & Returns</Link></li>
              <li><Link href="/contact" className="text-background/70 hover:text-background transition-colors text-sm">Contact Us</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-serif text-lg mb-6">Newsletter</h4>
            <p className="text-background/70 text-sm mb-4">Subscribe to receive updates, access to exclusive deals, and more.</p>
            <form className="flex" onSubmit={e => e.preventDefault()}>
              <input
                type="email"
                placeholder="Enter your email"
                className="bg-transparent border-b border-background/30 px-0 py-2 w-full text-sm focus:outline-none focus:border-background transition-colors placeholder:text-background/30"
              />
              <button type="submit" className="border-b border-background/30 py-2 px-2 text-sm tracking-widest uppercase hover:text-primary transition-colors">
                Join
              </button>
            </form>
          </div>
        </div>

        <div className="border-t border-background/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-background/50">
          <p>&copy; {new Date().getFullYear()} The Alankar. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-background transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-background transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
