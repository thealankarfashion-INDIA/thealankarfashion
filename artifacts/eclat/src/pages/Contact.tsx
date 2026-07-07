import { useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Mail, Phone, MapPin, CheckCircle2, Loader2 } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from '@/lib/supabaseStore';
import { getDB } from '@/lib/supabase';
import SEO from '@/components/seo/SEO';

export default function Contact() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    orderNumber: '',
    message: ''
  });
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.email || !formData.message) return;
    
    setStatus('submitting');
    try {
      const db = getDB();
      await addDoc(collection(db, 'supportMessages'), {
        ...formData,
        status: 'new', // new, read, resolved
        createdAt: serverTimestamp()
      });
      setStatus('success');
      setFormData({ firstName: '', lastName: '', email: '', phoneNumber: '', orderNumber: '', message: '' });
    } catch (error) {
      console.error("Error submitting form: ", error);
      setStatus('error');
    }
  };

  const contactSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "ContactPage",
    "name": "Contact The Alankar",
    "description": "Get in touch with The Alankar for orders, returns, or styling advice. Reach us via WhatsApp (+91 94887 92660), email (thealankar.fashion@gmail.com), or Instagram.",
    "url": "https://thealankar.in/contact",
    "mainEntity": {
      "@type": "Organization",
      "contactPoint": {
        "@type": "ContactPoint",
        "telephone": "+91-94887-92660",
        "contactType": "customer support",
        "email": "thealankar.fashion@gmail.com"
      }
    }
  });

  return (
    <>
      <SEO 
        title="Contact The Alankar — Customer Support, WhatsApp & Email"
        description="Get in touch with The Alankar for orders, returns, or styling advice. Reach us via WhatsApp (+91 94887 92660), email (thealankar.fashion@gmail.com), or Instagram."
        keywords="contact the alankar, the alankar customer support, jewellery store contact, the alankar phone number, the alankar whatsapp"
        url="https://thealankar.in/contact"
        schema={contactSchema}
      />
      <div className="min-h-[100dvh] flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 pt-40 md:pt-48 pb-24">
        <div className="container mx-auto px-4 md:px-8 max-w-5xl">
          <div className="text-center mb-16">
            <h1 className="font-serif text-4xl md:text-5xl mb-6">Contact Us</h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              We are here to assist you. Please reach out with any inquiries regarding our collections, sizing, or your order.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            <div>
              <h2 className="font-serif text-2xl mb-8">Send a Message</h2>
              {status === 'success' ? (
                <div className="bg-[#F7F1EE] border border-[#E8D8D1] rounded-xl p-8 text-center">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                    <CheckCircle2 className="w-8 h-8 text-[#B47A67]" />
                  </div>
                  <h3 className="font-serif text-2xl text-[#2C1E16] mb-2">Message Sent</h3>
                  <p className="text-[#8E5E4F] text-sm">
                    Thank you for reaching out. Our client services team will get back to you within 24 hours.
                  </p>
                  <button 
                    onClick={() => setStatus('idle')}
                    className="mt-6 text-sm text-[#B47A67] font-medium hover:text-[#8E5E4F] transition-colors"
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <form className="space-y-6" onSubmit={handleSubmit}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs tracking-widest uppercase text-muted-foreground">First Name *</label>
                      <input 
                        type="text" 
                        required
                        value={formData.firstName}
                        onChange={e => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                        className="w-full bg-transparent border-b border-border py-2 focus:outline-none focus:border-[#B47A67] transition-colors" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs tracking-widest uppercase text-muted-foreground">Last Name</label>
                      <input 
                        type="text" 
                        value={formData.lastName}
                        onChange={e => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                        className="w-full bg-transparent border-b border-border py-2 focus:outline-none focus:border-[#B47A67] transition-colors" 
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs tracking-widest uppercase text-muted-foreground">Email *</label>
                      <input 
                        type="email" 
                        required
                        value={formData.email}
                        onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full bg-transparent border-b border-border py-2 focus:outline-none focus:border-[#B47A67] transition-colors" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs tracking-widest uppercase text-muted-foreground">Phone Number (WhatsApp)</label>
                      <input 
                        type="tel" 
                        value={formData.phoneNumber}
                        onChange={e => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                        className="w-full bg-transparent border-b border-border py-2 focus:outline-none focus:border-[#B47A67] transition-colors" 
                        placeholder="+91..."
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs tracking-widest uppercase text-muted-foreground">Order Number (Optional)</label>
                    <input 
                      type="text" 
                      value={formData.orderNumber}
                      onChange={e => setFormData(prev => ({ ...prev, orderNumber: e.target.value }))}
                      className="w-full bg-transparent border-b border-border py-2 focus:outline-none focus:border-[#B47A67] transition-colors" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs tracking-widest uppercase text-muted-foreground">Message *</label>
                    <textarea 
                      rows={5} 
                      required
                      value={formData.message}
                      onChange={e => setFormData(prev => ({ ...prev, message: e.target.value }))}
                      className="w-full bg-transparent border-b border-border py-2 focus:outline-none focus:border-[#B47A67] transition-colors resize-none"
                    ></textarea>
                  </div>
                  
                  {status === 'error' && (
                    <p className="text-red-500 text-sm">There was an error sending your message. Please try again.</p>
                  )}

                  <button 
                    type="submit" 
                    disabled={status === 'submitting'}
                    className="bg-[#2C1E16] text-white w-full py-4 text-sm tracking-widest uppercase hover:bg-[#8E5E4F] transition-colors disabled:opacity-70 flex justify-center items-center gap-2"
                  >
                    {status === 'submitting' ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
                    ) : (
                      'Submit Inquiry'
                    )}
                  </button>
                </form>
              )}
            </div>

            <div>
              <h2 className="font-serif text-2xl mb-8">Get in Touch</h2>
              
              <div className="space-y-8">
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-card rounded-full flex items-center justify-center flex-shrink-0 text-primary">
                    <Mail className="w-5 h-5 text-[#B47A67]" />
                  </div>
                  <div>
                    <h3 className="font-medium mb-1">Client Services</h3>
                    <p className="text-muted-foreground text-sm mb-1">For general inquiries and styling advice.</p>
                    <a href="mailto:thealankar.fashion@gmail.com" className="text-foreground hover:text-[#B47A67] transition-colors text-sm break-all">thealankar.fashion@gmail.com</a>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-card rounded-full flex items-center justify-center flex-shrink-0 text-primary">
                    <Phone className="w-5 h-5 text-[#B47A67]" />
                  </div>
                  <div>
                    <h3 className="font-medium mb-1">Call Us</h3>
                    <a href="tel:+919488792660" className="text-foreground hover:text-[#B47A67] transition-colors text-sm block mb-1">9488792660</a>
                    <a href="tel:+916282114781" className="text-foreground hover:text-[#B47A67] transition-colors text-sm block">6282114781</a>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-card rounded-full flex items-center justify-center flex-shrink-0 text-primary">
                    <MapPin className="w-5 h-5 text-[#B47A67]" />
                  </div>
                  <div>
                    <h3 className="font-medium mb-1">Store Location</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      Malumichampatti/Ottakkalmandapam,<br />
                      Coimbatore, Tamil Nadu<br />
                      641032
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-12 p-8 bg-[#F7F1EE] rounded-sm">
                <h3 className="font-serif text-xl mb-4 text-[#2C1E16]">Press & Wholesale</h3>
                <p className="text-sm text-[#8E5E4F] mb-4 leading-relaxed">
                  For press inquiries, please contact <a href="mailto:thealankar.fashion@gmail.com" className="text-[#2C1E16] border-b border-[#2C1E16] hover:text-[#B47A67] hover:border-[#B47A67] transition-colors break-all">thealankar.fashion@gmail.com</a>
                </p>
                <p className="text-sm text-[#8E5E4F] leading-relaxed">
                  For wholesale inquiries, please contact <a href="mailto:thealankar.fashion@gmail.com" className="text-[#2C1E16] border-b border-[#2C1E16] hover:text-[#B47A67] hover:border-[#B47A67] transition-colors break-all">thealankar.fashion@gmail.com</a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
    </>
  );
}
