import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export default function SizeGuide() {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 pt-40 md:pt-48 pb-24">
        <div className="container mx-auto px-4 md:px-8 max-w-4xl">
          <div className="text-center mb-16">
            <h1 className="font-serif text-4xl md:text-5xl mb-6">Size Guide</h1>
            <p className="text-muted-foreground">Find your perfect fit. Our garments are designed to offer a balance of tailored structure and effortless drape.</p>
          </div>

          <div className="bg-card p-8 md:p-12 rounded-sm border border-border">
            <h2 className="font-serif text-2xl mb-8 text-center">Body Measurements</h2>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-border">
                    <th className="py-4 font-medium tracking-widest uppercase text-muted-foreground">Size</th>
                    <th className="py-4 font-medium tracking-widest uppercase text-muted-foreground">US</th>
                    <th className="py-4 font-medium tracking-widest uppercase text-muted-foreground">UK</th>
                    <th className="py-4 font-medium tracking-widest uppercase text-muted-foreground">Bust (in)</th>
                    <th className="py-4 font-medium tracking-widest uppercase text-muted-foreground">Waist (in)</th>
                    <th className="py-4 font-medium tracking-widest uppercase text-muted-foreground">Hip (in)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border/50">
                    <td className="py-4 font-medium">XS</td>
                    <td className="py-4">0-2</td>
                    <td className="py-4">4-6</td>
                    <td className="py-4">32-33</td>
                    <td className="py-4">24-25</td>
                    <td className="py-4">34.5-35.5</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-4 font-medium">S</td>
                    <td className="py-4">4-6</td>
                    <td className="py-4">8-10</td>
                    <td className="py-4">34-35</td>
                    <td className="py-4">26-27</td>
                    <td className="py-4">36.5-37.5</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-4 font-medium">M</td>
                    <td className="py-4">8-10</td>
                    <td className="py-4">12-14</td>
                    <td className="py-4">36-37.5</td>
                    <td className="py-4">28-29.5</td>
                    <td className="py-4">38.5-40</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-4 font-medium">L</td>
                    <td className="py-4">12-14</td>
                    <td className="py-4">16-18</td>
                    <td className="py-4">39-40.5</td>
                    <td className="py-4">31-32.5</td>
                    <td className="py-4">41.5-43</td>
                  </tr>
                  <tr>
                    <td className="py-4 font-medium">XL</td>
                    <td className="py-4">16</td>
                    <td className="py-4">20</td>
                    <td className="py-4">42-44</td>
                    <td className="py-4">34-36</td>
                    <td className="py-4">44.5-46.5</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
            <div className="text-center">
              <h3 className="font-serif text-xl mb-3 text-primary">Bust</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">Measure around the fullest part of your chest, keeping the measuring tape horizontal.</p>
            </div>
            <div className="text-center">
              <h3 className="font-serif text-xl mb-3 text-primary">Waist</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">Measure around the narrowest part of your natural waist, allowing for breathing room.</p>
            </div>
            <div className="text-center">
              <h3 className="font-serif text-xl mb-3 text-primary">Hip</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">Measure around the fullest part of your hips, approximately 8" below your waist.</p>
            </div>
          </div>
          
          <div className="mt-16 text-center">
            <p className="text-sm text-muted-foreground">Still need help finding your size?</p>
            <a href="/contact" className="inline-block mt-4 text-sm tracking-widest uppercase border-b border-foreground pb-1 hover:text-primary hover:border-primary transition-colors">Contact Client Services</a>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
