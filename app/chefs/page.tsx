import { Suspense } from "react";
import { ChefHat } from "lucide-react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ChefGrid from "@/components/chef/ChefGrid";

export const metadata = {
  title: "Browse Chefs | Book A Chef Kenya",
  description:
    "Browse verified private chefs across Kenya. See what they cook and contact them directly by phone or WhatsApp.",
  openGraph: {
    title: "Browse Chefs | Book A Chef Kenya",
    description:
      "Discover verified private chefs across Kenya. View their menus and contact them directly.",
  },
};

function ChefsContent({
  searchParams,
}: {
  searchParams: { cuisine?: string; location?: string; search?: string };
}) {
  return (
    <div className="min-h-screen bg-cream-50 text-forest-950 font-sans">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        {/* Header */}
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-widest text-champagne-600 mb-2">
            Directory
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-forest-950 tracking-tight">
            Browse chefs
          </h1>
          <p className="mt-2 text-forest-500 max-w-xl">
            Discover verified private chefs across Kenya. See what they cook,
            then call or WhatsApp them directly.
          </p>
        </div>

        <ChefGrid
          initialFilters={{
            cuisine: searchParams.cuisine || "",
            location: searchParams.location || "",
            search: searchParams.search || "",
          }}
        />

        {/* Bottom CTA */}
        <div className="mt-16 bg-forest-950 rounded-2xl p-8 sm:p-12 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-2">
            Are you a private chef?
          </h2>
          <p className="text-cream-200/70 text-sm sm:text-base mb-6 max-w-lg mx-auto">
            Join the directory and let customers reach you directly. Apply once
            — our team verifies your profile before it goes live.
          </p>
          <Link
            href="/apply"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-champagne-400 hover:bg-champagne-300 text-forest-950 font-bold text-sm transition-all active:scale-95"
          >
            <ChefHat className="h-4 w-4" />
            Apply to join
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function ChefsPage({
  searchParams,
}: {
  searchParams: { cuisine?: string; location?: string; search?: string };
}) {
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
      <ChefsContent searchParams={searchParams} />
    </Suspense>
  );
}
