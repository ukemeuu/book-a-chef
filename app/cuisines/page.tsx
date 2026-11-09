import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChefHat } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { CUISINE_LIST } from "./[slug]/cuisines";

export const metadata: Metadata = {
  title: "Cuisines | Private Chefs in Kenya | Book A Chef",
  description:
    "Browse private chefs in Kenya by cuisine. Swahili & seafood, nyama choma & BBQ, Italian & pasta, and fine dining — all verified and available to cook in your home.",
  keywords: [
    "private chef Kenya",
    "Swahili chef Kenya",
    "nyama choma chef Kenya",
    "Italian chef Kenya",
    "fine dining chef Kenya",
    "catering Kenya",
    "chef directory Kenya",
  ],
  alternates: { canonical: "https://bookachef.co.ke/cuisines" },
  openGraph: {
    title: "Cuisines | Book A Chef Kenya",
    description:
      "Browse verified private chefs in Kenya by cuisine — Swahili, BBQ, Italian, fine dining and more.",
    url: "https://bookachef.co.ke/cuisines",
    siteName: "Book A Chef Kenya",
    locale: "en_KE",
    type: "website",
  },
};

export default function CuisinesIndexPage() {
  return (
    <div className="min-h-screen bg-white text-forest-950 font-sans">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-20">
        <header className="max-w-2xl mb-12">
          <p className="text-xs font-bold uppercase tracking-widest text-champagne-600 mb-2">
            Cuisines
          </p>
          <h1 className="font-sans text-4xl sm:text-5xl font-bold text-forest-950 tracking-tight">
            What are you craving?
          </h1>
          <p className="mt-4 text-forest-500 leading-relaxed">
            Browse verified private chefs by the food they love to cook. Each
            cuisine page lists the chefs who specialise in it, with menus,
            reviews, and direct contact.
          </p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {CUISINE_LIST.map((cuisine) => (
            <Link
              key={cuisine.slug}
              href={`/cuisines/${cuisine.slug}`}
              className="group relative aspect-[16/10] rounded-2xl overflow-hidden bg-forest-950 focus-visible:ring-2 focus-visible:ring-forest-950 focus-visible:ring-offset-2 transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
            >
              <Image
                src={cuisine.heroImage}
                alt={`${cuisine.name} private chefs in Kenya`}
                fill
                sizes="(max-width: 640px) 100vw, 50vw"
                className="object-cover opacity-60 transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-forest-950/85 via-forest-950/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <h2 className="font-bold text-white text-2xl">{cuisine.name}</h2>
                <p className="text-sm text-cream-200/80 mt-1 line-clamp-2">
                  {cuisine.description}
                </p>
                <span className="inline-flex items-center gap-1.5 text-sm font-bold text-champagne-400 mt-3">
                  View {cuisine.name} chefs
                  <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-16 bg-cream-50 rounded-2xl border border-forest-100 p-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center mx-auto mb-4">
            <ChefHat className="h-6 w-6 text-forest-700" />
          </div>
          <h2 className="font-sans text-2xl font-bold text-forest-950 mb-2">
            Can&apos;t decide?
          </h2>
          <p className="text-sm text-forest-500 mb-6 max-w-md mx-auto">
            Browse the full directory and filter by cuisine, location, and price
            — then call the chef directly.
          </p>
          <Link
            href="/chefs"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-forest-950 text-white text-sm font-medium hover:bg-forest-800 transition-colors"
          >
            Browse all chefs
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
