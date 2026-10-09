import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Cancellation & Refund Policy | Book A Chef Kenya",
  description: "Transparent cancellation deadlines and deposit refund guidelines for diners and private chefs.",
};

export default function CancellationPolicyPage() {
  return (
    <div className="min-h-screen bg-cream-50 text-forest-950 font-sans flex flex-col">
      <Navbar />

      <main className="max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-32 pb-24 text-left flex-1 space-y-8">
        <div className="space-y-2 border-b border-forest-200 pb-6">
          <span className="text-[10px] uppercase tracking-widest text-champagne-700">
            Fair Marketplace Standards
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold text-forest-950">
            Cancellation & Refund Policy
          </h1>
          <p className="text-xs text-forest-500">Transparent guidelines for diners and culinary partners</p>
        </div>

        <div className="space-y-6 text-xs sm:text-sm text-forest-800 leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-lg font-bold text-forest-950">1. Client Cancellation Guidelines</h2>
            <p>
              Because private chefs reserve their calendar exclusively for your dinner and begin dry-aging, prepping, and sourcing fresh market ingredients well in advance, refunds are tiered based on notice:
            </p>
            <div className="bg-white rounded-2xl p-4 border border-forest-100 space-y-3 mt-2">
              <div className="flex justify-between items-center py-1 border-b border-forest-100">
                <span className="font-bold text-forest-950">More than 72 hours notice</span>
                <span className="font-bold text-emerald-700">95% Deposit Refund (5% handling fee)</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-forest-100">
                <span className="font-bold text-forest-950">24 to 72 hours notice</span>
                <span className="font-bold text-amber-700">50% Deposit Refund (50% chef prep compensation)</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="font-bold text-forest-950">Less than 24 hours notice</span>
                <span className="font-bold text-red-700">Non-Refundable (Perishable market items purchased)</span>
              </div>
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-forest-950">2. Chef Cancellations</h2>
            <p>
              In the rare event that an emergency prevents your assigned chef from fulfilling the reservation, you are immediately entitled to a <strong>100% full refund</strong> of your deposit, or our concierge team will prioritize assigning an equivalent or upgraded master chef at no extra cost.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-forest-950">3. How Refunds Are Processed</h2>
            <p>
              Approved refunds are credited directly back to the original M-Pesa phone number used during checkout within 1 to 2 business days.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
