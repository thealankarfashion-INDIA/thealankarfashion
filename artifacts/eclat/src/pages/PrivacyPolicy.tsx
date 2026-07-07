import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import SEO from '@/components/seo/SEO';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <SEO title="Privacy Policy" description="Privacy Policy for The Alankar." url="https://thealankar.in/privacy" />
      <Navbar />
      <main className="flex-1 pt-40 md:pt-48 pb-24">
        <div className="container mx-auto px-4 md:px-8 max-w-4xl">
          <div className="mb-16">
            <h1 className="font-serif text-4xl md:text-5xl mb-6 text-primary">Privacy Policy</h1>
            <p className="text-muted-foreground text-lg leading-relaxed">
              We value your privacy and are committed to protecting your personal data. This Privacy Policy explains how we collect, use, and safeguard your information when you visit our website or make a purchase.
            </p>
          </div>

          <div className="space-y-12 text-foreground/80 leading-relaxed">
            <section className="p-8 bg-secondary/20 rounded-2xl border border-border/50">
              <h2 className="font-serif text-2xl mb-4 text-primary">1. Information We Collect</h2>
              <p className="mb-4">
                We may collect personal identification information from Users in a variety of ways, including, but not limited to, when Users visit our site, register on the site, place an order, subscribe to the newsletter, respond to a survey, fill out a form, and in connection with other activities, services, features or resources we make available on our Site.
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Name and contact information including email address</li>
                <li>Billing and shipping address</li>
                <li>Payment details (processed securely by our payment partners)</li>
                <li>Demographic information such as postcode, preferences and interests</li>
              </ul>
            </section>

            <section className="p-8 bg-secondary/20 rounded-2xl border border-border/50">
              <h2 className="font-serif text-2xl mb-4 text-primary">2. How We Use Collected Information</h2>
              <p className="mb-4">
                The Company may collect and use Users personal information for the following purposes:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>To improve customer service:</strong> Information you provide helps us respond to your customer service requests and support needs more efficiently.</li>
                <li><strong>To process payments:</strong> We may use the information Users provide about themselves when placing an order only to provide service to that order. We do not share this information with outside parties except to the extent necessary to provide the service.</li>
                <li><strong>To send periodic emails:</strong> We may use the email address to send User information and updates pertaining to their order. It may also be used to respond to their inquiries, questions, and/or other requests.</li>
              </ul>
            </section>

            <section className="p-8 bg-secondary/20 rounded-2xl border border-border/50">
              <h2 className="font-serif text-2xl mb-4 text-primary">3. How We Protect Your Information</h2>
              <p>
                We adopt appropriate data collection, storage and processing practices and security measures to protect against unauthorized access, alteration, disclosure or destruction of your personal information, username, password, transaction information and data stored on our Site. Sensitive and private data exchange between the Site and its Users happens over a SSL secured communication channel and is encrypted and protected with digital signatures.
              </p>
            </section>

            <section className="p-8 bg-secondary/20 rounded-2xl border border-border/50">
              <h2 className="font-serif text-2xl mb-4 text-primary">4. Sharing Your Personal Information</h2>
              <p>
                We do not sell, trade, or rent Users personal identification information to others. We may share generic aggregated demographic information not linked to any personal identification information regarding visitors and users with our business partners, trusted affiliates and advertisers for the purposes outlined above.
              </p>
            </section>

            <section className="p-8 bg-secondary/20 rounded-2xl border border-border/50">
              <h2 className="font-serif text-2xl mb-4 text-primary">5. Changes to This Privacy Policy</h2>
              <p>
                The Company has the discretion to update this privacy policy at any time. When we do, we will revise the updated date at the bottom of this page. We encourage Users to frequently check this page for any changes to stay informed about how we are helping to protect the personal information we collect. You acknowledge and agree that it is your responsibility to review this privacy policy periodically and become aware of modifications.
              </p>
            </section>
            
            <p className="text-sm text-muted-foreground mt-8">Last Updated: {new Date().toLocaleDateString()}</p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
