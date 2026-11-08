"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Star,
  MapPin,
  BadgeCheck,
  Heart,
  Share2,
  Phone,
  MessageCircle,
  ShieldCheck,
  Award,
  ChefHat,
  Mail,
  Instagram,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MenuCard from "@/components/chef/MenuCard";
import ReviewCard from "@/components/chef/ReviewCard";
import {
  MarketplaceChef,
  MarketplaceReview,
  chefAvatar,
  chefCover,
  chefTelUrl,
  chefWhatsAppUrl,
  formatPhone,
  reviewCount,
} from "@/utils/marketplace";
import { createClient } from "@/utils/supabase/client";

interface ChefProfileClientProps {
  chef: MarketplaceChef;
  reviews: MarketplaceReview[];
}

/**
 * Public chef profile — a directory listing, not a booking page.
 *
 * Customers see who the chef is, what they cook, and how to reach them
 * directly. There is no booking form, no availability calendar, and no
 * payment flow: the phone number and WhatsApp button are the call to action.
 */
export default function ChefProfileClient({
  chef,
  reviews,
}: ChefProfileClientProps) {
  const router = useRouter();
  const supabase = createClient();
  const [isFavorite, setIsFavorite] = useState(false);
  const [isFavLoading, setIsFavLoading] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  // Check favourite state.
  useEffect(() => {
    async function checkFav() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("chef_favorites")
        .select("id")
        .eq("client_id", user.id)
        .eq("chef_id", chef.id)
        .maybeSingle();

      setIsFavorite(!!data);
    }
    checkFav();
  }, [chef.id, supabase]);

  const toggleFavorite = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push(`/login?redirect=/chefs/${chef.slug}`);
      return;
    }

    setIsFavLoading(true);
    setIsFavorite((prev) => !prev);

    try {
      await fetch(`/api/chefs/${chef.slug}/favorite`, { method: "POST" });
    } catch {
      setIsFavorite((prev) => !prev);
    } finally {
      setIsFavLoading(false);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      // Clipboard API unavailable — no-op.
    }
  };

  const cover = chefCover(chef);
  const avatar = chefAvatar(chef);
  const gallery = (chef.gallery_images || []).filter(Boolean);
  const actualReviews = reviewCount(reviews, chef.reviews_count);
  const whatsappUrl = chefWhatsAppUrl(chef.phone, chef.name);
  const telUrl = chefTelUrl(chef.phone);

  return (
    <div className="min-h-screen bg-cream-50 text-forest-950 font-sans">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        {/* ── COVER ── */}
        <div className="relative aspect-[21/9] rounded-2xl overflow-hidden bg-forest-950 mb-6">
          <Image
            src={cover}
            alt={chef.name}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 1024px"
            className="object-cover"
          />
          <div
            className="absolute inset-0 bg-gradient-to-t from-forest-950/50 via-transparent to-transparent"
            aria-hidden="true"
          />
        </div>

        {/* ── HEADER CARD ── */}
        <div className="bg-white rounded-2xl border border-forest-100 p-6 sm:p-8 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start gap-5">
            {/* Avatar */}
            <div className="relative w-24 h-24 rounded-2xl overflow-hidden border-2 border-white shadow-lg shrink-0 -mt-16 sm:-mt-12 bg-forest-950 flex items-center justify-center">
              <Image
                src={avatar}
                alt={chef.name}
                fill
                sizes="96px"
                className="object-cover"
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-bold text-forest-950 tracking-tight">
                  {chef.name}
                </h1>
                {chef.verified && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold">
                    <BadgeCheck className="h-3.5 w-3.5" />
                    Verified
                  </span>
                )}
              </div>
              {chef.brand_name && (
                <p className="text-sm text-forest-500 mt-0.5">
                  {chef.brand_name}
                </p>
              )}
              {chef.tagline && (
                <p className="text-base text-forest-700 mt-2">{chef.tagline}</p>
              )}

              {/* Stats row */}
              <div className="flex flex-wrap items-center gap-4 mt-4 text-sm">
                <span className="flex items-center gap-1.5">
                  <Star className="h-4 w-4 text-champagne-500 fill-current" />
                  <span className="font-bold text-forest-950">
                    {Number(chef.rating || 0).toFixed(1)}
                  </span>
                  {actualReviews > 0 && (
                    <span className="text-forest-400">
                      ({actualReviews} review
                      {actualReviews === 1 ? "" : "s"})
                    </span>
                  )}
                </span>
                <span className="flex items-center gap-1.5 text-forest-600">
                  <MapPin className="h-4 w-4" />
                  {chef.city}
                </span>
                {chef.experience_years > 0 && (
                  <span className="flex items-center gap-1.5 text-forest-600">
                    <Award className="h-4 w-4" />
                    {chef.experience_years}+ years
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleShare}
                className="w-10 h-10 rounded-full border border-forest-200 flex items-center justify-center text-forest-600 hover:bg-cream-50 transition-colors"
                aria-label="Share profile"
              >
                <Share2 className="h-4 w-4" />
              </button>
              <button
                onClick={toggleFavorite}
                disabled={isFavLoading}
                className="w-10 h-10 rounded-full border border-forest-200 flex items-center justify-center text-forest-600 hover:bg-cream-50 transition-colors disabled:opacity-50"
                aria-label="Save chef"
              >
                <Heart
                  className={`h-4 w-4 ${
                    isFavorite ? "fill-red-500 text-red-500" : ""
                  }`}
                />
              </button>
            </div>
          </div>

          {shareCopied && (
            <p className="mt-3 text-xs text-emerald-700 font-medium">
              Link copied to clipboard
            </p>
          )}
        </div>

        {/* ── CONTACT ── */}
        <section className="bg-forest-950 rounded-2xl p-6 sm:p-8 mb-6 text-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-champagne-400 mb-1">
                Contact {chef.name.split(" ")[0]}
              </p>
              {chef.phone ? (
                <>
                  <a
                    href={telUrl || undefined}
                    className="text-2xl sm:text-3xl font-bold tracking-tight hover:text-champagne-300 transition-colors"
                  >
                    {formatPhone(chef.phone)}
                  </a>
                  <p className="text-xs text-cream-200/60 mt-1">
                    Call or WhatsApp — replies usually within the hour.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-xl font-bold">Contact via our concierge</p>
                  <p className="text-xs text-cream-200/60 mt-1">
                    This chef has not published a direct number yet. Message us
                    and we will connect you.
                  </p>
                </>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-2 shrink-0">
              {chef.phone && telUrl && (
                <a
                  href={telUrl}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white text-forest-950 font-bold text-sm transition-all active:scale-95"
                >
                  <Phone className="h-4 w-4" />
                  Call now
                </a>
              )}
              {whatsappUrl ? (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-champagne-400 hover:bg-champagne-300 text-forest-950 font-bold text-sm transition-all active:scale-95 shadow-lg"
                >
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </a>
              ) : (
                <a
                  href={`https://wa.me/254786530713?text=${encodeURIComponent(
                    `Hi Book A Chef, I'd like to contact ${chef.name}.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-champagne-400 hover:bg-champagne-300 text-forest-950 font-bold text-sm transition-all active:scale-95 shadow-lg"
                >
                  <MessageCircle className="h-4 w-4" />
                  Message concierge
                </a>
              )}
            </div>
          </div>

          {/* Other channels */}
          {(chef.email || chef.instagram_handle) && (
            <div className="flex flex-wrap gap-4 mt-5 pt-5 border-t border-white/10 text-sm">
              {chef.email && (
                <a
                  href={`mailto:${chef.email}`}
                  className="inline-flex items-center gap-2 text-cream-200/80 hover:text-white transition-colors"
                >
                  <Mail className="h-4 w-4" />
                  {chef.email}
                </a>
              )}
              {chef.instagram_handle && (
                <a
                  href={`https://instagram.com/${chef.instagram_handle.replace(
                    /^@/,
                    ""
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-cream-200/80 hover:text-white transition-colors"
                >
                  <Instagram className="h-4 w-4" />
                  @{chef.instagram_handle.replace(/^@/, "")}
                </a>
              )}
            </div>
          )}
        </section>

        {/* ── ABOUT ── */}
        <section className="bg-white rounded-2xl border border-forest-100 p-6 sm:p-8 mb-6">
          <h2 className="text-lg font-bold text-forest-950 mb-3">About</h2>
          <p className="text-sm text-forest-700 leading-relaxed whitespace-pre-line">
            {chef.bio || "This chef has not added a bio yet."}
          </p>
          {chef.culinary_philosophy && (
            <blockquote className="mt-4 pl-4 border-l-2 border-champagne-400 text-sm text-forest-600 italic">
              &ldquo;{chef.culinary_philosophy}&rdquo;
            </blockquote>
          )}
        </section>

        {/* ── DETAILS ── */}
        <section className="bg-white rounded-2xl border border-forest-100 p-6 sm:p-8 mb-6">
          <h2 className="text-lg font-bold text-forest-950 mb-4">Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-forest-400 mb-2">
                Cuisines
              </p>
              <div className="flex flex-wrap gap-1.5">
                {chef.cuisines?.length ? (
                  chef.cuisines.map((c) => (
                    <span
                      key={c}
                      className="px-2.5 py-1 rounded-full bg-cream-100 text-forest-700 text-xs font-medium"
                    >
                      {c}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-forest-500">Not listed</span>
                )}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-forest-400 mb-2">
                Dietary
              </p>
              <div className="flex flex-wrap gap-1.5">
                {chef.dietary_specialties?.length ? (
                  chef.dietary_specialties.map((d) => (
                    <span
                      key={d}
                      className="px-2.5 py-1 rounded-full bg-forest-50 text-forest-800 text-xs font-medium"
                    >
                      {d}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-forest-500">Not listed</span>
                )}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-forest-400 mb-2">
                Service areas
              </p>
              <p className="text-sm text-forest-700">
                {chef.service_areas?.length
                  ? `${chef.service_areas.slice(0, 5).join(", ")}${
                      chef.service_areas.length > 5 ? "…" : ""
                    }`
                  : chef.city}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-forest-400 mb-2">
                Experience
              </p>
              <p className="text-sm text-forest-700">
                {chef.experience_years > 0
                  ? `${chef.experience_years}+ years`
                  : "Not listed"}
              </p>
            </div>
          </div>
        </section>

        {/* ── GALLERY ── */}
        {gallery.length > 0 && (
          <section className="bg-white rounded-2xl border border-forest-100 p-6 sm:p-8 mb-6">
            <h2 className="text-lg font-bold text-forest-950 mb-4">
              Gallery
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {gallery.map((src, i) => (
                <div
                  key={i}
                  className="relative aspect-square rounded-xl overflow-hidden bg-cream-100"
                >
                  <Image
                    src={src}
                    alt={`${chef.name} dish ${i + 1}`}
                    fill
                    sizes="(max-width: 640px) 50vw, 25vw"
                    className="object-cover hover:scale-105 transition-transform duration-300"
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── MENUS ── */}
        {chef.menus?.length > 0 && (
          <section className="mb-6">
            <h2 className="text-lg font-bold text-forest-950 mb-4">
              What they cook
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {chef.menus.map((menu) => (
                <MenuCard key={menu.id} menu={menu} />
              ))}
            </div>
          </section>
        )}

        {/* ── REVIEWS ── */}
        {reviews.length > 0 && (
          <section className="mb-6">
            <h2 className="text-lg font-bold text-forest-950 mb-4">
              Reviews{" "}
              <span className="text-sm font-normal text-forest-400">
                ({reviews.length})
              </span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reviews.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </div>
          </section>
        )}

        {/* ── VERIFICATION ── */}
        <section className="bg-forest-50 rounded-2xl border border-forest-100 p-6 sm:p-8 mb-6">
          <h2 className="text-sm font-bold text-forest-950 mb-4">
            How verification works
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                icon: ShieldCheck,
                title: "ID verified",
                desc: "Every chef submits a national ID or passport before their profile goes live.",
              },
              {
                icon: ChefHat,
                title: "Vetted by our team",
                desc: "We review each application, confirm credentials, and may arrange a kitchen tasting.",
              },
              {
                icon: BadgeCheck,
                title: "Verified badge",
                desc: "The badge on this profile means Book A Chef has confirmed this chef's identity.",
              },
            ].map((item) => (
              <div key={item.title} className="flex gap-3">
                <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center shrink-0 border border-forest-100">
                  <item.icon className="h-4 w-4 text-forest-700" />
                </div>
                <div>
                  <p className="text-xs font-bold text-forest-950">
                    {item.title}
                  </p>
                  <p className="text-xs text-forest-600 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── STICKY CTA (mobile) ── */}
        {chef.phone && (
          <div className="fixed bottom-0 left-0 right-0 sm:hidden bg-white border-t border-forest-100 p-4 z-40">
            <div className="flex gap-2">
              {telUrl && (
                <a
                  href={telUrl}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-3.5 rounded-xl border border-forest-200 text-forest-950 font-bold text-sm"
                >
                  <Phone className="h-4 w-4" />
                  Call
                </a>
              )}
              {whatsappUrl && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-2 py-3.5 rounded-xl bg-forest-950 text-white font-bold text-sm"
                >
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </a>
              )}
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
