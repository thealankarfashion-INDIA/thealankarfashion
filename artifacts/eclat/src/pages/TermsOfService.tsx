import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import SEO from '@/components/seo/SEO';

export default function TermsOfService() {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <SEO title="Terms & Conditions" description="Read our terms and conditions regarding product purchases, returns, refunds, and website usage." />
      <Navbar />
      <main className="flex-1 pt-40 md:pt-48 pb-24">
        <div className="container mx-auto px-4 md:px-8 max-w-4xl">
          <div className="mb-16">
            <h1 className="font-serif text-4xl md:text-5xl mb-6 text-primary">Terms & Conditions</h1>
            <p className="text-muted-foreground text-lg leading-relaxed">
              By accessing, browsing, or purchasing products through this website, customers acknowledge that they have read, understood, and agreed to be legally bound by the following Terms and Conditions.
            </p>
          </div>

          <div className="space-y-6 text-foreground/80 leading-relaxed">
            <div className="p-6 bg-secondary/20 rounded-2xl border border-border/50">
              <ol className="list-decimal pl-5 space-y-4">
                <li>All jewellery products displayed on the website are subject to availability and may be discontinued without prior notice.</li>
                <li>Product images are provided for illustrative purposes only. Minor variations in colour, size, texture, finish, or appearance may occur due to lighting conditions, photography, display settings, and manufacturing processes.</li>
                <li>The Company reserves the right to modify, update, suspend, or discontinue any product, service, offer, pricing structure, or policy at its sole discretion without prior notification.</li>
                <li>Customers are responsible for providing accurate billing, shipping, and contact information while placing orders. The Company shall not be held liable for losses resulting from incorrect information provided by customers.</li>
                <li>Orders may be cancelled, delayed, or refused due to stock unavailability, pricing discrepancies, technical errors, payment issues, suspected fraudulent activity, or other unforeseen circumstances.</li>
                <li>Once an order has been confirmed and dispatched, cancellation requests may not be accepted.</li>
                <li>Delivery timelines are estimates only and shall not constitute a guarantee of delivery within a specific period.</li>
                <li>The Company shall not be responsible for delays caused by courier services, transportation issues, customs clearance, governmental actions, natural disasters, strikes, pandemics, force majeure events, or any circumstances beyond its reasonable control.</li>
                <li>Customers are advised to inspect the package immediately upon delivery and report any visible damage within twenty-four (24) hours.</li>
                <li>Any request for return, replacement, or refund must be supported by a continuous, clear, and unedited parcel opening video recorded from the moment the sealed package is opened until the product is fully visible.</li>
                <li>Claims submitted without valid video evidence shall be automatically rejected and deemed inadmissible.</li>
                <li>Return requests must be initiated within seven (7) calendar days from the date of delivery.</li>
                <li>Returned products must be received by the Company within the specified return period.</li>
                <li>Products returned after seven (7) days shall not be eligible for replacement, exchange, or refund under any circumstances.</li>
                <li>Returned items must be unused, unworn, undamaged, unaltered, and in their original condition with all tags, labels, certificates, invoices, packaging materials, and accessories intact.</li>
                <li>Products showing signs of usage, mishandling, modification, repair, tampering, or negligence shall be disqualified from return or refund eligibility.</li>
                <li>Refunds shall be processed only after successful inspection, verification, and approval by the Company's quality control team.</li>
                <li>Shipping, handling, packaging, transaction processing fees, and convenience charges are non-refundable unless the error originated from the Company.</li>
                <li>Refund processing timelines may vary depending on payment providers, banks, and financial institutions.</li>
                <li>Customers are solely responsible for safeguarding their account credentials, passwords, and payment information.</li>
                <li>The Company shall not be liable for unauthorized access resulting from customer negligence or security breaches beyond its control.</li>
                <li>Any attempt to engage in fraudulent transactions, chargeback abuse, false claims, misuse of promotional offers, or unlawful activities may result in immediate order cancellation, account suspension, and legal action.</li>
                <li>All content available on this website, including but not limited to logos, trademarks, product images, photographs, graphics, designs, text, videos, and intellectual property, remains the exclusive property of the Company.</li>
                <li>Unauthorized copying, reproduction, distribution, modification, republication, or commercial use of website content is strictly prohibited.</li>
                <li>The Company reserves the right to limit quantities purchased per customer, household, address, or transaction.</li>
                <li>Prices displayed on the website are subject to correction in the event of typographical, technical, or system-generated errors.</li>
                <li>The Company shall not be obligated to honor orders placed at incorrect prices due to technical malfunctions or human error.</li>
                <li>Customers agree to receive order confirmations, shipment updates, promotional communications, service announcements, and transactional notifications through email, SMS, WhatsApp, or other communication channels.</li>
                <li>The Company makes no warranties, representations, or guarantees regarding uninterrupted website operation, error-free functionality, or continuous availability.</li>
                <li>To the fullest extent permitted by applicable law, the Company shall not be liable for any indirect, incidental, consequential, special, punitive, or exemplary damages arising from the use of this website or its products.</li>
                <li>The Company's total liability, if any, shall not exceed the amount paid by the customer for the specific product involved in the claim.</li>
                <li>These Terms and Conditions shall be governed and interpreted in accordance with the laws of India.</li>
                <li>Any dispute arising out of or relating to the use of this website, products, services, or transactions shall be subject to the exclusive jurisdiction of the competent courts of India.</li>
                <li>The Company's decision regarding returns, refunds, exchanges, disputes, complaints, and policy interpretations shall be final and binding, subject to applicable law.</li>
                <li>By placing an order through this website, customers expressly acknowledge and agree to all Terms and Conditions stated herein.</li>
              </ol>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
