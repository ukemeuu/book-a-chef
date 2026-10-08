import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Privacy & Data Protection Policy | Book A Chef Kenya",
  description: "How Book A Chef Kenya collects, processes, and protects your personal data under the Kenya Data Protection Act 2019.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-cream-50 text-forest-950 font-sans flex flex-col">
      <Navbar />

      <main className="max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-32 pb-24 text-left flex-1 space-y-8">
        <div className="space-y-2 border-b border-forest-200 pb-6">
          <span className="text-[10px] font-black uppercase tracking-widest text-champagne-700">
            Kenya Data Protection Act 2019
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-forest-950">
            Privacy Policy
          </h1>
          <p className="text-xs text-forest-500">Last updated: August 2026</p>
        </div>

        <div className="space-y-6 text-xs sm:text-sm text-forest-800 leading-relaxed">
          <section className="space-y-2">
            <h2 className="font-serif text-lg font-bold text-forest-950">1. Data Controller Information</h2>
            <p>
              Book A Chef Kenya operates as a registered data controller under the Kenya Data Protection Act, 2019. We respect your privacy and are committed to safeguarding personal information collected from clients and chef partners.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-serif text-lg font-bold text-forest-950">2. Personal Data We Collect</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Contact Data:</strong> Full legal name, email address, phone number for M-Pesa billing and booking notifications.</li>
              <li><strong>Booking Details:</strong> Physical delivery / kitchen service address, guest count, dietary allergies, and event date.</li>
              <li><strong>Chef Credentials:</strong> Government ID details, Food Handler Medical Certificates, and culinary portfolios.</li>
              <li><strong>Transaction Data:</strong> M-Pesa transaction identifiers, receipts, and payment status history (we do not store M-Pesa PINs).</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="font-serif text-lg font-bold text-forest-950">3. How Your Data Is Used</h2>
            <p>
              We process personal data solely to coordinate in-home dining services, communicate booking confirmations, process M-Pesa escrow payments, prevent double-bookings, and comply with statutory tax and regulatory obligations.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-serif text-lg font-bold text-forest-950">4. Data Sharing & Security</h2>
            <p>
              Your physical address and dietary restrictions are shared exclusively with your assigned chef for the purpose of fulfilling your private dinner. We never sell, rent, or trade customer data to third-party advertisers. All data is encrypted in transit and at rest.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-serif text-lg font-bold text-forest-950">5. Your Data Rights</h2>
            <p>
              Under the Kenya Data Protection Act, you have the right to request access to your personal data, request correction of inaccurate records, or request complete deletion of your profile. To exercise these rights, email our data team at <strong>privacy@bookachef.co.ke</strong>.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
