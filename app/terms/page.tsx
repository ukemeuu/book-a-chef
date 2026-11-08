import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Terms of Service | Book A Chef Kenya",
  description:
    "Terms and conditions governing the Book A Chef Kenya chef directory and the use of chef profiles.",
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
          <p className="text-sm text-forest-500">Last updated: November 2026</p>
        </div>

        <div className="space-y-6 text-xs sm:text-sm text-forest-800 leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-lg font-bold text-forest-950">1. Introduction & Directory Scope</h2>
            <p>
              Book A Chef Kenya (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;)
              operates a directory of verified private chefs across Kenya.
              Customers browse chef profiles, view the food they cook, and
              contact them directly by phone or WhatsApp. Book A Chef is a
              directory and introduction platform — we do not take bookings,
              process payments, or act as a party to any agreement between a
              customer and a chef. By accessing or using bookachef.co.ke, you
              agree to comply with and be bound by these Terms of Service.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-forest-950">2. Chef Profiles & Verification</h2>
            <p>
              Chefs apply to join the directory and provide their name, contact
              details, cuisines, menus, and a national ID or passport number.
              Our team reviews each application and verifies the chef&apos;s
              identity before their profile is published. A &ldquo;Verified&rdquo;
              badge indicates that we have confirmed the chef&apos;s identity; it
              is not a guarantee of the quality of their services. Chefs are
              responsible for keeping their profile information accurate and up
              to date.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-forest-950">3. Direct Engagement</h2>
            <p>
              Any dining service, booking, price, and arrangement is agreed
              directly between the customer and the chef. Book A Chef does not
              employ chefs, does not set their prices, and is not responsible
              for the conduct, food safety, or performance of any chef. We
              encourage customers to agree on the scope, price, and
              responsibilities in writing before any service takes place.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-forest-950">4. Intellectual Property</h2>
            <p>
              Chefs retain ownership of the photos, menus, and text they submit
              to the directory. By submitting content, a chef grants Book A Chef
              a non-exclusive licence to display that content on the platform
              and in related marketing.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-forest-950">5. Limitation of Liability</h2>
            <p>
              Book A Chef provides the directory &ldquo;as is&rdquo; and makes no
              representations or warranties about the accuracy, completeness, or
              reliability of any profile. To the fullest extent permitted by
              law, we exclude all liability for any loss or damage arising from
              your use of the directory or your dealings with any chef.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-forest-950">6. Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with
              the laws of the Republic of Kenya. Any disputes shall be subject to
              the exclusive jurisdiction of the courts of Kenya.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
