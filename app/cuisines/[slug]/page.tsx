import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { CUISINES, CUISINE_LIST } from "./cuisines";
import { chefAvatar, chefCover, chefTelUrl, formatPhone } from "@/utils/marketplace";
import {
  BadgeCheck,
  Star,
  MapPin,
  Phone,
  ArrowRight,
  CheckCircle2,
  ChefHat,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const dynamic = "force-dynamic";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://bookachef.co.ke";

/**
 * SEO metadata for each cuisine landing page.
 *
 * Every cuisine gets a unique title, description, keyword set, Open Graph
 * image, and canonical URL so Google can index and rank each page on its own.
 */
export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const cuisine = CUISINES[params.slug];
  if (!cuisine) return {};

  const canonical = `${SITE_URL}/cuisines/${cuisine.slug}`;

  return {
    title: cuisine.title,
    description: cuisine.description,
    keywords: cuisine.keywords,
    alternates: { canonical },
    openGraph: {
      title: cuisine.title,
      description: cuisine.description,
      url: canonical,
      siteName: "Book A Chef Kenya",
      images: [
        {
          url: cuisine.heroImage,
          width: 1200,
          height: 630,
          alt: cuisine.name,
        },
      ],
      locale: "en_KE",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: cuisine.title,
      description: cuisine.description,
      images: [cuisine.heroImage],
    },
  };
}

function jsonLd(data: Record<string, unknown>) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export default async function CuisineLandingPage({
  params,
}: {
  params: { slug: string };
}) {
  const cuisine = CUISINES[params.slug];
  if (!cuisine) notFound();

  const supabase = createClient();
  const { data: chefs } = await supabase
    .from("chefs")
    .select("*")
    .eq("verified", true)
    .contains("cuisines", [cuisine.cuisineKey])
    .order("rating", { ascending: false });

  const chefList = chefs || [];
  const topChef = chefList[0];
  const canonical = `${SITE_URL}/cuisines/${cuisine.slug}`;

  // ── Structured data ──────────────────────────────────────────────────────
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Cuisines", item: `${SITE_URL}/cuisines` },
      {
        "@type": "ListItem",
        position: 3,
        name: cuisine.name,
        item: canonical,
      },
    ],
  };

  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${cuisine.name} private chefs in Kenya`,
    description: cuisine.description,
    itemListElement: chefList.map((chef, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "LocalBusiness",
        name: chef.name,
        description: chef.bio?.slice(0, 200),
        url: `${SITE_URL}/chefs/${chef.slug}`,
        image: chef.avatar_url,
        address: {
          "@type": "PostalAddress",
          addressLocality: chef.city,
          addressCountry: "KE",
        },
        telephone: chef.phone,
        aggregateRating: chef.rating
          ? {
              "@type": "AggregateRating",
              ratingValue: chef.rating,
              reviewCount: chef.reviews_count || 0,
            }
          : undefined,
      },
    })),
  };

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: cuisine.faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: { "@type": "Answer", text: faq.a },
    })),
  };

  const webPageLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: cuisine.title,
    description: cuisine.description,
    url: canonical,
    isPartOf: { "@type": "WebSite", name: "Book A Chef Kenya", url: SITE_URL },
    inLanguage: "en-KE",
  };

  return (
    <div className="min-h-screen bg-white text-forest-950 font-sans">
      {jsonLd(webPageLd)}
      {jsonLd(breadcrumbLd)}
      {jsonLd(itemListLd)}
      {jsonLd(faqLd)}

      <Navbar />

      {/* ── BREADCRUMB ── */}
      <nav aria-label="Breadcrumb" className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-24">
        <ol className="flex items-center gap-2 text-xs text-forest-500">
          <li>
            <Link href="/" className="hover:text-forest-950 transition-colors">
              Home
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href="/cuisines" className="hover:text-forest-950 transition-colors">
              Cuisines
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-forest-950 font-medium">{cuisine.name}</li>
        </ol>
      </nav>

      {/* ── HERO ── */}
      <section className="relative bg-forest-950 mt-4">
        <div className="absolute inset-0 overflow-hidden">
          <Image
            src={cuisine.heroImage}
            alt={`${cuisine.name} private chef in Kenya`}
            fill
            priority
            className="object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-forest-950/70 via-forest-950/85 to-forest-950" />
        </div>
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-champagne-400 mb-3">
            {cuisine.name} · Private Chefs in Kenya
          </p>
          <h1 className="font-sans text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight tracking-tight">
            {cuisine.name} chefs, <br className="hidden sm:block" />
            <span className="text-champagne-400">in your home.</span>
          </h1>
          <p className="mt-4 text-base sm:text-lg text-cream-200/80 max-w-xl mx-auto leading-relaxed">
            {cuisine.description}
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="#chefs"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-champagne-400 hover:bg-champagne-300 text-forest-950 font-bold text-sm transition-all active:scale-95"
            >
              See {cuisine.name} chefs
              <ArrowRight className="h-4 w-4" />
            </a>
            <Link
              href="/chefs"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl border border-white/25 text-white font-bold text-sm hover:bg-white/10 transition-all"
            >
              Browse all chefs
            </Link>
          </div>
        </div>
      </section>

      {/* ── INTRO ── */}
      <section className="py-14 sm:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-sans text-3xl sm:text-4xl font-bold text-forest-950 tracking-tight">
            What is {cuisine.name.toLowerCase()}?
          </h2>
          <p className="mt-4 text-forest-600 leading-relaxed text-base sm:text-lg">
            {cuisine.intro}
          </p>
        </div>
      </section>

      {/* ── SIGNATURE DISHES ── */}
      <section className="py-14 sm:py-20 bg-cream-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-10">
            <p className="text-xs font-bold uppercase tracking-widest text-champagne-600 mb-2">
              On the menu
            </p>
            <h2 className="font-sans text-3xl sm:text-4xl font-bold text-forest-950 tracking-tight">
              Signature {cuisine.shortName.toLowerCase()} dishes
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {cuisine.dishes.map((dish) => (
              <div
                key={dish.name}
                className="bg-white rounded-2xl border border-forest-100/70 p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
              >
                <div className="w-10 h-10 rounded-xl bg-cream-100 flex items-center justify-center text-forest-700 mb-4">
                  <ChefHat className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-forest-950">{dish.name}</h3>
                <p className="text-sm text-forest-600 mt-1.5 leading-relaxed">
                  {dish.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── THE EXPERIENCE ── */}
      <section className="py-14 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-10">
            <p className="text-xs font-bold uppercase tracking-widest text-champagne-600 mb-2">
              The experience
            </p>
            <h2 className="font-sans text-3xl sm:text-4xl font-bold text-forest-950 tracking-tight">
              What it&apos;s like to book a {cuisine.shortName.toLowerCase()} chef
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {cuisine.experience.map((item, i) => (
              <div
                key={item.title}
                className="bg-white rounded-2xl border border-forest-100/70 p-6"
              >
                <span className="font-sans text-2xl font-bold text-champagne-500/50">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="font-bold text-forest-950 mt-3 mb-1.5">{item.title}</h3>
                <p className="text-sm text-forest-600 leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CHEFS ── */}
      <section id="chefs" className="py-14 sm:py-20 bg-cream-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-champagne-600 mb-2">
                Verified chefs
              </p>
              <h2 className="font-sans text-3xl sm:text-4xl font-bold text-forest-950 tracking-tight">
                {cuisine.name} chefs available now
              </h2>
            </div>
            <Link
              href="/chefs"
              className="hidden sm:inline-flex items-center gap-1.5 text-sm font-medium text-forest-950 hover:text-forest-700 transition-colors shrink-0"
            >
              All chefs
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {chefList.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {chefList.map((chef) => {
                const telUrl = chefTelUrl(chef.phone);
                return (
                  <div
                    key={chef.id}
                    className="group bg-white rounded-2xl border border-forest-100/70 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                  >
                    <Link href={`/chefs/${chef.slug}`} className="relative block aspect-[16/9] overflow-hidden bg-forest-950">
                      <Image
                        src={chefCover(chef)}
                        alt={`${chef.name} — ${cuisine.name} chef in ${chef.city}`}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-forest-950/45 via-transparent to-transparent" />
                      {chef.verified && (
                        <span className="absolute top-3 left-3 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/90 text-forest-900 text-[10px] font-bold shadow-sm">
                          <BadgeCheck className="h-3 w-3 text-emerald-600" />
                          Verified
                        </span>
                      )}
                    </Link>
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <Link href={`/chefs/${chef.slug}`} className="min-w-0">
                          <h3 className="font-bold text-forest-950 truncate group-hover:text-forest-700 transition-colors">
                            {chef.name}
                          </h3>
                          {chef.brand_name && (
                            <p className="text-xs text-forest-500 truncate">{chef.brand_name}</p>
                          )}
                        </Link>
                        <div className="flex items-center gap-1 shrink-0">
                          <Star className="h-3.5 w-3.5 text-champagne-500 fill-current" />
                          <span className="text-sm font-semibold text-forest-950">
                            {Number(chef.rating || 0).toFixed(1)}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-forest-500 flex items-center gap-1 mt-2">
                        <MapPin className="h-3 w-3" />
                        {chef.city}
                      </p>
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-forest-100">
                        <Link
                          href={`/chefs/${chef.slug}`}
                          className="text-xs font-medium text-forest-600 hover:text-forest-950 transition-colors"
                        >
                          View profile
                        </Link>
                        {chef.phone && telUrl ? (
                          <a
                            href={telUrl}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-forest-950 text-white text-[11px] font-bold hover:bg-forest-800 transition-colors"
                          >
                            <Phone className="h-3 w-3" />
                            {formatPhone(chef.phone)}
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-forest-100 p-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-cream-100 flex items-center justify-center mx-auto mb-4">
                <ChefHat className="h-6 w-6 text-forest-400" />
              </div>
              <h3 className="text-lg font-bold text-forest-950 mb-1">
                New {cuisine.shortName.toLowerCase()} chefs joining soon
              </h3>
              <p className="text-sm text-forest-500 mb-6 max-w-sm mx-auto">
                We&apos;re onboarding verified {cuisine.name.toLowerCase()} chefs right
                now. In the meantime, browse the full directory.
              </p>
              <Link
                href="/chefs"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-forest-950 text-white text-sm font-medium hover:bg-forest-800 transition-colors"
              >
                Browse all chefs
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-14 sm:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <p className="text-xs font-bold uppercase tracking-widest text-champagne-600 mb-2">
              Questions
            </p>
            <h2 className="font-sans text-3xl sm:text-4xl font-bold text-forest-950 tracking-tight">
              {cuisine.name} chef FAQs
            </h2>
          </div>

          <div className="space-y-4">
            {cuisine.faqs.map((faq) => (
              <details
                key={faq.q}
                className="group bg-white rounded-2xl border border-forest-100/70 px-6 py-5 open:shadow-sm"
              >
                <summary className="flex items-center justify-between gap-4 cursor-pointer list-none">
                  <h3 className="font-bold text-forest-950">{faq.q}</h3>
                  <span className="w-7 h-7 shrink-0 rounded-full bg-cream-100 flex items-center justify-center text-forest-600 transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm text-forest-600 leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── OTHER CUISINES ── */}
      <section className="py-14 sm:py-20 bg-cream-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-8">
            <p className="text-xs font-bold uppercase tracking-widest text-champagne-600 mb-2">
              Explore more
            </p>
            <h2 className="font-sans text-3xl sm:text-4xl font-bold text-forest-950 tracking-tight">
              Browse other cuisines
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {CUISINE_LIST.filter((c) => c.slug !== cuisine.slug).map((other) => (
              <Link
                key={other.slug}
                href={`/cuisines/${other.slug}`}
                className="group relative aspect-[4/3] rounded-2xl overflow-hidden bg-forest-950"
              >
                <Image
                  src={other.heroImage}
                  alt={other.name}
                  fill
                  sizes="(max-width: 640px) 100vw, 25vw"
                  className="object-cover opacity-60 transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-forest-950/80 via-forest-950/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <h3 className="font-bold text-white text-lg">{other.name}</h3>
                  <span className="inline-flex items-center gap-1 text-xs text-champagne-400 font-medium mt-1">
                    Explore chefs
                    <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-16 sm:py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-3xl overflow-hidden bg-forest-950 px-6 py-16 sm:px-12 sm:py-20 text-center">
            <div className="absolute -top-24 -right-24 w-72 h-72 bg-champagne-500/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl" />
            <div className="relative max-w-2xl mx-auto">
              <h2 className="font-sans text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight leading-tight">
                Ready to book a {cuisine.shortName.toLowerCase()} chef?
              </h2>
              <p className="mt-4 text-cream-200/70 text-base sm:text-lg leading-relaxed">
                Browse the directory, find your chef, and call them directly.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href="/chefs"
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-champagne-500 hover:bg-champagne-600 text-white font-bold text-sm uppercase tracking-wider shadow-xl transition-all hover:scale-105 active:scale-95"
                >
                  <ChefHat className="h-5 w-5" />
                  Browse all chefs
                </Link>
              </div>
              <div className="mt-8 flex items-center justify-center gap-6 text-cream-200/60 text-xs font-medium">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-champagne-400" />
                  ID-verified
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-champagne-400" />
                  Vetted by our team
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-champagne-400" />
                  Direct contact
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
