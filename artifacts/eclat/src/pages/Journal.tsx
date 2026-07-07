import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import SEO from '@/components/seo/SEO';

export default function Journal() {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <SEO title="Journal & Styling Tips" description="Read styling tips, trend guides & jewellery care advice from The Alankar." url="https://thealankar.in/journal" />
      <Navbar />
      <main className="flex-1 pt-40 md:pt-48 pb-24">
        <div className="container mx-auto px-4 md:px-8 text-center max-w-2xl mb-16">
          <h1 className="font-serif text-4xl md:text-5xl mb-6">Le Journal</h1>
          <p className="text-muted-foreground">Stories of style, inspiration, and the art of living beautifully.</p>
        </div>

        <div className="container mx-auto px-4 md:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                title: "The Art of the Capsule Wardrobe",
                category: "Style Guide",
                image: "/images/collection-daily.png",
                date: "Oct 12, 2023"
              },
              {
                title: "Behind the Seams: The Camille Blazer",
                category: "Atelier",
                image: "/images/product-4.png",
                date: "Sep 28, 2023"
              },
              {
                title: "A Weekend in Paris",
                category: "Lifestyle",
                image: "/images/lookbook-hero.png",
                date: "Sep 15, 2023"
              },
              {
                title: "Dressing for the Evening: A Modern Approach",
                category: "Style Guide",
                image: "/images/collection-evening.png",
                date: "Aug 30, 2023"
              },
              {
                title: "The Allure of Cashmere",
                category: "Materials",
                image: "/images/product-5.png",
                date: "Aug 14, 2023"
              },
              {
                title: "Conversations with our Founder",
                category: "Interviews",
                image: "/images/product-8.png",
                date: "Jul 22, 2023"
              }
            ].map((post, i) => (
              <div key={i} className="group cursor-pointer">
                <div className="aspect-[4/3] bg-muted mb-6 overflow-hidden rounded-sm">
                  <img src={post.image} alt={post.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                </div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-medium tracking-widest uppercase text-primary">{post.category}</span>
                  <span className="text-xs text-muted-foreground">{post.date}</span>
                </div>
                <h3 className="font-serif text-2xl group-hover:text-primary transition-colors">{post.title}</h3>
              </div>
            ))}
          </div>
          
          <div className="text-center mt-16">
            <button className="border border-foreground px-8 py-3 text-sm tracking-widest uppercase hover:bg-foreground hover:text-background transition-colors">
              Load More
            </button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
