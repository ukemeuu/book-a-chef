import { Suspense } from "react";
import { ChefHat, ArrowRight } from "lucide-react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ChefGrid from "@/components/chef/ChefGrid";

export const metadata = {
  title: "Browse Chefs | Book A Chef Kenya",
  description:
    "Browse verified private chefs across Kenya. Filter by cuisine, location, price, and availability — then book directly.",
  openGraph: {
    title: "Browse Chefs | Book A Chef Kenya",
    description:
      "Discover verified private chefs across Kenya. View menus, reviews, and availability — then book directly.",
  },
};

function ChefsContent() {
  return (
    <div className="min-h-screen bg-cream-50 text-forest-950 font-sans">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        {/* Header */}
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-widest text-champagne-600 mb-2">
            Marketplace
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-forest-950 tracking-tight">
            Browse chefs
          </h1>
          <p className="mt-2 text-forest-500 max-w-xl">
            Discover verified private chefs across Kenya. Filter by cuisine,
            location, and price — then book directly.
          </p>
        </div>

        <ChefGrid />

        {/* Bottom CTA */}
        <div className="mt-16 bg-forest-950 rounded-2xl p-8 sm:p-12 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-2">
            Can&apos;t find the right chef?
          </h2>
          <p className="text-cream-200/70 text-sm sm:text-base mb-6 max-w-lg mx-auto">
            Tell us what you need and we&apos;ll match you with a chef who fits
            your event.
          </p>
          <Link
            href="/request"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-champagne-400 hover:bg-champagne-300 text-forest-950 font-bold text-sm transition-all active:scale-95"
          >
            <ChefHat className="h-4 w-4" />
            Request a chef
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function ChefsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-cream-50 flex items-center justify-center">
          <div className="text-center">
            <ChefHat className="h-8 w-8 text-forest-950 animate-pulse mx-auto mb-2" />
            <p className="text-sm text-forest-500">Loading chefs…</p>
          </div>
        </div>
      }
    >
      <ChefsContent />
    </Suspense>
  );
}
