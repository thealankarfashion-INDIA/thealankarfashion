import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import SEO from '@/components/seo/SEO';

export default function FAQ() {
  const faqSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "Does The Alankar offer free shipping?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes, The Alankar offers free shipping on all orders above ₹999 across India. Standard delivery takes 4-6 business days. Express delivery takes 3-4 business days"
        }
      }
    ]
  });

  return (
    <>
      <SEO
        title="FAQ — Shipping, Returns, Orders & More | The Alankar"
        description="Find answers to common questions about The Alankar — shipping policy, return process, payment methods, order tracking, product care & more."
        keywords="the alankar FAQ, jewellery shipping policy, return fashion jewellery, order tracking help"
        url="https://thealankar.in/faq"
        schema={faqSchema}
      />
      <div className="min-h-[100dvh] flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 pt-40 md:pt-48 pb-24">
          <div className="container mx-auto px-4 md:px-8 max-w-3xl">
            <div className="text-center mb-16">
              <h1 className="font-serif text-4xl md:text-5xl mb-6">Frequently Asked Questions</h1>
              <p className="text-muted-foreground">Find answers to common questions about our products, shipping, and returns.</p>
            </div>

            <div className="space-y-12">
              <div>
                <h2 className="text-xl font-serif mb-6 pb-2 border-b border-border text-primary">Orders & Shipping</h2>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="item-1">
                    <AccordionTrigger className="text-left font-medium">Do you ship internationally?</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground leading-relaxed">
                      Yes, we ship globally via DHL Express. International orders typically arrive within 3-5 business days. Please note that customs duties and taxes are calculated at checkout and vary by destination country.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-2">
                    <AccordionTrigger className="text-left font-medium">When will my order ship?</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground leading-relaxed">
                      Orders placed before 2PM EST Monday through Friday are processed and shipped the same day. Orders placed after 2PM EST or on weekends will be processed the following business day.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-3">
                    <AccordionTrigger className="text-left font-medium">Can I modify or cancel my order?</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground leading-relaxed">
                      We process orders quickly to ensure rapid delivery. If you need to modify or cancel an order, please contact our Client Services team within 1 hour of placing it. Once an order has been shipped, we cannot make any changes.
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>

              <div>
                <h2 className="text-xl font-serif mb-6 pb-2 border-b border-border text-primary">Returns & Exchanges</h2>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="item-4">
                    <AccordionTrigger className="text-left font-medium">What is your return policy?</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground leading-relaxed">
                      We accept returns within 14 days of delivery for a full refund. Items must be unworn, unwashed, and have all original tags attached. Evening gowns and tailored pieces must have the security ribbon intact.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-5">
                    <AccordionTrigger className="text-left font-medium">How do I initiate a return?</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground leading-relaxed">
                      To initiate a return, visit our Returns Portal and enter your order number and email address. A prepaid return shipping label will be generated for you. A flat fee of $15 will be deducted from your refund to cover return shipping costs.
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>

              <div>
                <h2 className="text-xl font-serif mb-6 pb-2 border-b border-border text-primary">Product & Sizing</h2>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="item-6">
                    <AccordionTrigger className="text-left font-medium">How do I find my correct size?</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground leading-relaxed">
                      Our garments are designed to fit true to size according to standard US sizing. We recommend consulting our comprehensive Size Guide on each product page, which includes exact garment measurements. If you are between sizes, we generally recommend sizing up for a more relaxed fit.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-7">
                    <AccordionTrigger className="text-left font-medium">How should I care for my silk garments?</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground leading-relaxed">
                      We recommend professional dry cleaning for all our silk pieces to maintain their luster and drape. If hand washing is necessary, use a specialized silk detergent in cold water, do not wring or twist, and lay flat to dry away from direct sunlight.
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
}
