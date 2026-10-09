import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Terms of Service | Book A Chef Kenya",
  description: "Terms and conditions governing diner bookings, private chef services, and payments on Book A Chef Kenya.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-cream-50 text-forest-950 font-sans flex flex-col">
      <Navbar />

      <main className="max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-32 pb-24 text-left flex-1 space-y-8">
        <div className="space-y-2 border-b border-forest-200 pb-6">
          <span className="text-[10px] uppercase tracking-widest text-champagne-700">
            Legal & Compliance
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold text-forest-950">
            Terms of Service
          </h1>
          <p className="text-sm text-forest-500">Last updated: August 2026</p>
        </div>

        <div className="space-y-6 text-xs sm:text-sm text-forest-800 leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-lg font-bold text-forest-950">1. Introduction & Concierge Service Scope</h2>
            <p>
              Book A Chef Kenya (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;) operates a managed private culinary concierge service providing bespoke in-home and villa dining experiences across Kenya. Clients request dining experiences through our platform concierge, and we curate certified executive culinary talent, coordinate bespoke menu execution, and oversee culinary service delivery. By accessing or using bookachef.co.ke, you agree to comply with and be bound by these Terms of Service.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-forest-950">2. Inquiries, Proposals & Payment Structure</h2>
            <p>
              Dining requests are received by our concierge team who confirm culinary availability and assemble a bespoke menu proposal. Upon client agreement, the culinary fee (covering menu preparation, live cooking, plating, and spotless kitchen cleanup) is billed and collected by Book A Chef as the service provider. The culinary labor fee is separate from ingredient costs. Ingredients are either sourced fresh on the event day by the chef on the client&apos;s behalf (with 0% markup), or provided directly by the client.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-forest-950">3. Chef Engagement & Quality Standards</h2>
            <p>
              Chefs affiliated with Book A Chef are contracted culinary partners who have undergone rigorous background identity vetting, professional hygiene evaluations, and private test kitchen tasting assessments. Chefs adhere strictly to Book A Chef&apos;s operational standard operating procedures (SOPs) and professional sanitation standards.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-forest-950">4. Client Kitchen & Facility Access</h2>
            <p>
              For in-home private dining services, the Client agrees to provide a clean, functional kitchen environment with working cooking appliances (stove, oven, refrigeration, and running water). The Client must disclose all dietary allergies and restrictions during the inquiry process.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-forest-950">5. Cancellation & Rescheduling</h2>
            <p>
              Cancellations and date reschedules are managed through our concierge. Notice provided at least 72 hours prior to scheduled dining qualifies for a deposit refund or flexible date transfer. Cancellations within 24 hours of service may incur a cancellation fee due to pre-allocated culinary scheduling.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-forest-950">6. Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of the Republic of Kenya. Any disputes shall be subject to the exclusive jurisdiction of the courts of Kenya.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
