"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChefHat,
  Loader2,
  Phone,
  Home,
  Truck,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  AlertCircle,
  ExternalLink,
  Lock,
  X,
  Image as ImageIcon,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Menu } from "@/utils/data";
import { createClient } from "@/utils/supabase/client";
import {
  calculateProfileReadiness,
  ProfileReadinessResult,
} from "@/utils/profileReadiness";
import {
  ApplicationMeta,
  DEFAULT_CHEF_AVATAR,
} from "@/utils/chefApplication";
import { chefAvatar } from "@/utils/marketplace";

type PortalState = "loading" | "chef" | "applicant" | "none";

interface ApplicationSummary {
  id: string;
  status: string;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  brand_name?: string | null;
  email?: string | null;
  phone?: string | null;
  phone_number?: string | null;
  city?: string | null;
  neighborhood?: string | null;
  cuisines?: string[] | null;
  dietary?: string[] | null;
  dietary_specialties?: string[] | null;
  starting_price?: number | string | null;
  specialty_dish?: string | null;
  bio?: string | null;
  experience_years?: string | null;
  portfolio_links?: string | null;
  created_at?: string;
}

const CUISINES = [
  "Swahili",
  "Seafood",
  "Nyama Choma",
  "BBQ",
  "Kenyan Traditional",
  "Continental",
  "Italian",
  "Fine Dining",
  "Indian",
  "Pan-Asian",
  "Pastry & Baking",
  "Vegan / Plant-Based",
  "French",
  "Mediterranean",
];

const DIETARY = [
  "Halal",
  "Vegetarian",
  "Vegan",
  "Gluten-Free",
  "Keto",
  "Pescatarian",
  "Dairy-Free",
  "Nut-Free",
];

function mapMenu(row: any): Menu {
  return {
    id: row.id,
    title: row.title || "Signature menu",
    tag: row.tag || "Signature",
    description: row.description || "",
    pricePerGuest: Number(row.price_per_guest || 0),
    courses: row.courses || { main: { name: "Chef's selection" } },
  };
}

const inputClass =
  "w-full px-4 py-3 rounded-xl bg-white border border-forest-200 text-sm font-medium text-forest-950 placeholder-forest-400 outline-none focus:border-forest-950 focus:ring-1 focus:ring-forest-950 transition-colors";

/**
 * Chef portal.
 *
 * This is where a chef manages their directory listing: identity, cuisines,
 * menus, and contact details. There are no booking requests here — customers
 * contact the chef directly via the phone number on their public profile.
 */
export default function ChefDashboardPage() {
  const router = useRouter();
  const supabase = createClient();

  const [portalState, setPortalState] = useState<PortalState>("loading");
  const [chef, setChef] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"menus" | "settings">("menus");
  const [menus, setMenus] = useState<Menu[]>([]);

  const [application, setApplication] = useState<ApplicationSummary | null>(null);
  const [appMeta, setAppMeta] = useState<ApplicationMeta>({ v: 1 });
  const [appCompleteness, setAppCompleteness] = useState<{
    percentage: number;
    missing: string[];
  }>({ percentage: 0, missing: [] });

  const [nationalIdNumber, setNationalIdNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [allowInHome, setAllowInHome] = useState(true);
  const [allowDelivery, setAllowDelivery] = useState(true);
  const [bio, setBio] = useState("");
  const [tagline, setTagline] = useState("");
  const [startingPrice, setStartingPrice] = useState(4500);
  const [minGuests, setMinGuests] = useState(2);
  const [maxGuests, setMaxGuests] = useState(30);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Photos — uploaded to Supabase Storage, then saved on the profile.
  const [avatarUrl, setAvatarUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState<string | null>(null);

  const loadApplication = useCallback(async () => {
    const response = await fetch("/api/chef/application", { cache: "no-store" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.application) {
      setApplication(null);
      return false;
    }
    setApplication(payload.application);
    setAppMeta(payload.meta || { v: 1 });
    setAppCompleteness(
      payload.completeness || { percentage: 0, missing: [] }
    );
    return true;
  }, []);

  useEffect(() => {
    let active = true;

    async function initChefPortal() {
      setPortalState("loading");
      try {
        const {
          data: { user },
          error: authErr,
        } = await supabase.auth.getUser();

        if (authErr || !user) {
          router.push("/login?redirect=%2Fchef-dashboard");
          return;
        }
        if (!active) return;

        let chefRecord: any = null;
        const { data: byUser } = await supabase
          .from("chefs")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();
        chefRecord = byUser || null;

        if (!chefRecord && user.email) {
          const { data: byEmail } = await supabase
            .from("chefs")
            .select("*")
            .eq("email", user.email)
            .maybeSingle();
          chefRecord = byEmail || null;
        }

        if (!active) return;

        if (!chefRecord) {
          const hasApplication = await loadApplication();
          if (!active) return;
          setPortalState(hasApplication ? "applicant" : "none");
          return;
        }

        setChef(chefRecord);
        setNationalIdNumber(chefRecord.national_id_number || "");
        setPhone(chefRecord.phone || "");
        setAvatarUrl(chefRecord.avatar_url || "");
        setCoverUrl(chefRecord.cover_image_url || "");
        setGalleryUrls(chefRecord.gallery_images || []);
        setAllowInHome(chefRecord.allow_in_home ?? true);
        setAllowDelivery(chefRecord.allow_delivery ?? true);
        setBio(chefRecord.bio || "");
        setTagline(chefRecord.tagline || "");
        setStartingPrice(Number(chefRecord.price_per_guest) || 4500);
        setMinGuests(chefRecord.min_guests || 2);
        setMaxGuests(chefRecord.max_guests || 30);

        const { data: menuRows } = await supabase
          .from("menus")
          .select("*")
          .eq("chef_id", chefRecord.id)
          .order("created_at", { ascending: true });
        if (!active) return;
        setMenus(((menuRows as any[]) || []).map(mapMenu));

        const response = await fetch("/api/chef/application", {
          cache: "no-store",
        });
        const payload = await response.json().catch(() => ({}));
        if (!active) return;
        if (response.ok && payload.application) {
          setApplication(payload.application);
          setAppMeta(payload.meta || { v: 1 });
          setAppCompleteness(
            payload.completeness || { percentage: 0, missing: [] }
          );
          if (!chefRecord.national_id_number && payload.meta?.national_id_number) {
            setNationalIdNumber(payload.meta.national_id_number);
          }
        }

        setPortalState("chef");
      } catch (err) {
        console.error("Chef portal init error:", err);
        if (active) setPortalState("none");
      }
    }

    initChefPortal();
    return () => {
      active = false;
    };
  }, [router, supabase, loadApplication]);

  const readiness: ProfileReadinessResult = calculateProfileReadiness({
    name: chef?.name,
    phone: phone || chef?.phone || application?.phone,
    nationalIdNumber:
      nationalIdNumber || appMeta.national_id_number || undefined,
    avatar: chef?.avatar_url || chef?.avatar,
    coverImage: chef?.cover_image_url || chef?.coverImage,
    gallery: chef?.gallery_images || chef?.gallery,
    brand: chef?.brand_name || chef?.brand,
    tagline,
    partnerType: "independent",
    serviceFormats: [
      ...(allowInHome ? (["in_home"] as const) : []),
      ...(allowDelivery ? (["delivery"] as const) : []),
    ],
    city: chef?.city || "Nairobi",
    serviceAreas: chef?.service_areas || ["Kilimani", "Karen", "Westlands"],
    bio,
    cuisines: chef?.cuisines || ["Swahili", "Fine Dining"],
    culinaryPhilosophy: chef?.culinary_philosophy || chef?.culinaryPhilosophy,
    dietary: chef?.dietary_specialties || chef?.dietary || ["Halal"],
    startingPrice,
    minGuests,
    maxGuests,
    menus,
  });

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setSaveError(null);
    setSaveSuccess(null);
    try {
      const res = await fetch("/api/chef/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chef_id: chef.id,
          phone,
          national_id_number: nationalIdNumber,
          allow_in_home: allowInHome,
          allow_delivery: allowDelivery,
          bio,
          tagline,
          price_per_guest: startingPrice,
          min_guests: minGuests,
          max_guests: maxGuests,
          avatar_url: avatarUrl || null,
          cover_image_url: coverUrl || null,
          gallery_images: galleryUrls,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      setSaveSuccess("Profile saved.");
    } catch (err: any) {
      setSaveError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  /**
   * Upload a photo through the server, which writes to the chef-photos bucket
   * with the service role (the bucket's RLS policy only allows admins to write
   * directly). The chef still chooses the file; the path is scoped to them.
   */
  const uploadPhoto = async (
    file: File,
    label: string,
    apply: (url: string) => void
  ) => {
    setUploadingPhoto(label);
    setSaveError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("label", label);
      const res = await fetch("/api/chef/upload-photo", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Upload failed.");
      apply(data.url);
      setSaveSuccess("Photo uploaded. Remember to save your changes.");
    } catch (err: any) {
      setSaveError(
        "Photo upload failed: " + (err?.message || "please try again.") +
        " — you can also paste an image URL instead."
      );
    } finally {
      setUploadingPhoto(null);
    }
  };

  const removeGalleryImage = (url: string) =>
    setGalleryUrls((prev) => prev.filter((u) => u !== url));

  if (portalState === "loading") {
    return (
      <div className="min-h-screen bg-cream-50 flex items-center justify-center">
        <Loader2 className="h-6 w-6 text-forest-950 animate-spin" />
      </div>
    );
  }

  if (portalState === "applicant") {
    return (
      <ApplicantWorkspace
        application={application}
        meta={appMeta}
        completeness={appCompleteness}
        onSaved={async () => {
          await loadApplication();
        }}
      />
    );
  }

  if (portalState === "none") {
    return (
      <div className="min-h-screen bg-cream-50 text-forest-950 font-sans flex flex-col">
        <Navbar />
        <main className="max-w-xl mx-auto w-full px-4 pt-32 pb-20 flex-1">
          <div className="bg-white rounded-2xl border border-forest-100 p-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-cream-100 flex items-center justify-center mx-auto mb-4">
              <ChefHat className="h-6 w-6 text-forest-500" />
            </div>
            <h1 className="text-2xl font-bold text-forest-950 mb-2">
              No chef profile yet
            </h1>
            <p className="text-sm text-forest-500 mb-6">
              This account is not linked to a chef listing or an application. If
              you applied with a different email, sign in with that address or
              send us a message and we will connect the two.
            </p>
            <div className="flex flex-col gap-2">
              <Link
                href="/apply"
                className="w-full inline-flex items-center justify-center gap-2 bg-forest-950 text-white py-3.5 rounded-xl font-bold text-sm hover:bg-forest-800 transition-colors"
              >
                Apply to join the directory
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="mailto:info@bookachef.co.ke?subject=My%20account%20is%20not%20linked%20to%20my%20application"
                className="w-full py-3 rounded-xl border border-forest-200 text-forest-800 font-medium text-sm hover:bg-cream-50 transition-colors text-center"
              >
                Message the onboarding team
              </a>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream-50 text-forest-950 font-sans flex flex-col">
      <Navbar />

      <main className="max-w-5xl mx-auto w-full px-4 pt-24 pb-16 flex-1">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-forest-950 shrink-0 flex items-center justify-center">
              <Image
                src={chefAvatar(chef)}
                alt={chef?.name || "Chef"}
                fill
                className="object-cover"
              />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-forest-950 tracking-tight">
                {chef?.name || "Chef"}
              </h1>
              <p className="text-sm text-forest-500">
                {tagline || chef?.brand_name || "Private chef"}
              </p>
              {chef?.slug && (
                <Link
                  href={`/chefs/${chef.slug}`}
                  className="inline-flex items-center gap-1 mt-1 text-xs font-medium text-forest-600 hover:text-forest-950 transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />
                  View public profile
                </Link>
              )}
            </div>
          </div>

          <div
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold ${
              chef?.verified
                ? "bg-emerald-50 text-emerald-700"
                : "bg-amber-50 text-amber-700"
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            {chef?.verified ? "Verified" : "Verification pending"}
          </div>
        </div>

        {/* Readiness bar */}
        <div className="bg-white rounded-2xl border border-forest-100 p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-medium text-forest-950">
                Profile readiness
              </p>
              <p className="text-xs text-forest-500">
                {readiness.completedCount} of {readiness.totalCount} criteria
                complete
              </p>
            </div>
            <span
              className={`text-sm font-bold ${
                readiness.canGoLive ? "text-emerald-600" : "text-amber-600"
              }`}
            >
              {readiness.percentage}%
            </span>
          </div>
          <div className="h-2 bg-cream-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                readiness.canGoLive ? "bg-emerald-500" : "bg-amber-500"
              }`}
              style={{ width: `${readiness.percentage}%` }}
            />
          </div>
          {!readiness.canGoLive && readiness.missingItems.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {readiness.missingItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab("settings")}
                  className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium hover:bg-amber-100 transition-colors"
                >
                  + {item.label}
                </button>
              ))}
            </div>
          )}
          {readiness.canGoLive && (
            <p className="mt-3 text-xs text-emerald-700 font-medium flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Your profile is complete and visible in the directory.
            </p>
          )}
        </div>

        {saveSuccess && (
          <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium">
            {saveSuccess}
          </div>
        )}
        {saveError && (
          <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
            {saveError}
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-forest-100 mb-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab("menus")}
            className={`px-1 py-3 mr-6 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              activeTab === "menus"
                ? "border-forest-950 text-forest-950"
                : "border-transparent text-forest-500 hover:text-forest-800"
            }`}
          >
            Menus ({menus.length})
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`px-1 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === "settings"
                ? "border-forest-950 text-forest-950"
                : "border-transparent text-forest-500 hover:text-forest-800"
            }`}
          >
            Profile
            {!readiness.canGoLive && (
              <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                {readiness.percentage}%
              </span>
            )}
          </button>
        </div>

        {/* MENUS TAB */}
        {activeTab === "menus" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {menus.map((m) => (
              <div
                key={m.id}
                className="bg-white rounded-2xl border border-forest-100 p-5"
              >
                <div className="flex justify-between items-start gap-3 mb-2">
                  <div>
                    <p className="text-xs font-medium text-forest-500 mb-1">
                      {m.tag || "Signature"}
                    </p>
                    <h3 className="font-bold text-forest-950">{m.title}</h3>
                  </div>
                  <p className="text-sm font-bold text-forest-950 shrink-0">
                    KES {m.pricePerGuest.toLocaleString()}
                  </p>
                </div>
                <p className="text-xs text-forest-500">{m.description}</p>
              </div>
            ))}
            {menus.length === 0 && (
              <div className="col-span-full bg-white rounded-2xl border border-forest-100 p-10 text-center">
                <p className="text-sm font-medium text-forest-950 mb-1">
                  No menus yet
                </p>
                <p className="text-xs text-forest-500 max-w-sm mx-auto">
                  A menu is part of the profile checklist. Our team creates your
                  first signature menu when your application is approved; you can
                  edit it here afterwards.
                </p>
              </div>
            )}
          </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === "settings" && (
          <form onSubmit={handleSaveProfile} className="space-y-6">
            {appCompleteness.missing.length > 0 && (
              <section className="bg-white rounded-2xl border border-amber-200 p-6">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <h2 className="text-sm font-bold text-forest-950">
                    From your application
                  </h2>
                </div>
                <p className="text-xs text-forest-500 mb-3">
                  These are still missing from your onboarding profile. Update
                  them in the application form below.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {appCompleteness.missing.map((item) => (
                    <span
                      key={item}
                      className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </section>
            )}

            <section className="bg-white rounded-2xl border border-forest-100 p-6">
              <div className="flex items-center gap-2 mb-1">
                <Phone className="h-4 w-4 text-forest-700" />
                <h2 className="text-lg font-bold text-forest-950">
                  Contact number
                </h2>
              </div>
              <p className="text-sm text-forest-500 mb-5">
                This is the number customers see on your public profile. Use a
                WhatsApp-capable Kenyan number.
              </p>
              <label className="block text-sm font-medium text-forest-950 mb-1.5">
                Phone / WhatsApp
              </label>
              <input
                type="tel"
                required
                placeholder="0712 345 678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={inputClass + " max-w-sm"}
              />
              <p className="text-xs text-forest-400 mt-1.5">
                Shown on your profile so customers can call or message you
                directly.
              </p>
            </section>

            <section className="bg-white rounded-2xl border border-forest-100 p-6">
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck className="h-4 w-4 text-forest-700" />
                <h2 className="text-lg font-bold text-forest-950">
                  Identity verification
                </h2>
              </div>
              <p className="text-sm text-forest-500 mb-5">
                Required for chef vetting and client trust. Never shown publicly.
              </p>
              <label className="block text-sm font-medium text-forest-950 mb-1.5">
                National ID or passport number
              </label>
              <input
                type="text"
                required
                placeholder="28941052"
                value={nationalIdNumber}
                onChange={(e) => setNationalIdNumber(e.target.value)}
                className={inputClass + " max-w-sm"}
              />
            </section>

            <section className="bg-white rounded-2xl border border-forest-100 p-6">
              <h2 className="text-lg font-bold text-forest-950 mb-1">
                Service formats
              </h2>
              <p className="text-sm text-forest-500 mb-5">
                Choose what you want to offer.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (!allowInHome && allowDelivery) return;
                    setAllowInHome(!allowInHome);
                  }}
                  className={`p-4 rounded-xl border text-left transition-colors ${
                    allowInHome
                      ? "border-forest-950 bg-forest-50"
                      : "border-forest-200 hover:border-forest-400"
                  }`}
                >
                  <Home
                    className={`h-5 w-5 mb-2 ${
                      allowInHome ? "text-forest-800" : "text-forest-400"
                    }`}
                  />
                  <span className="block text-sm font-bold text-forest-950">
                    In-home dining
                  </span>
                  <span className="text-xs text-forest-500">
                    Cook in the client&apos;s kitchen
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!allowDelivery && allowInHome) return;
                    setAllowDelivery(!allowDelivery);
                  }}
                  className={`p-4 rounded-xl border text-left transition-colors ${
                    allowDelivery
                      ? "border-forest-950 bg-forest-50"
                      : "border-forest-200 hover:border-forest-400"
                  }`}
                >
                  <Truck
                    className={`h-5 w-5 mb-2 ${
                      allowDelivery ? "text-forest-800" : "text-forest-400"
                    }`}
                  />
                  <span className="block text-sm font-bold text-forest-950">
                    Cooked &amp; delivered
                  </span>
                  <span className="text-xs text-forest-500">Hot delivery</span>
                </button>
              </div>
            </section>

            <section className="bg-white rounded-2xl border border-forest-100 p-6">
              <h2 className="text-lg font-bold text-forest-950 mb-1">Photos</h2>
              <p className="text-sm text-forest-500 mb-5">
                Customers book chefs they can see. Add a clear portrait, a cover
                photo, and a few dish photos.
              </p>

              {/* Avatar */}
              <div className="mb-5">
                <span className="block text-sm font-medium text-forest-950 mb-2">
                  Profile photo
                </span>
                <div className="flex items-center gap-3">
                  <div className="relative h-16 w-16 rounded-xl overflow-hidden border border-forest-200 bg-forest-950 shrink-0">
                    {avatarUrl ? (
                      <Image src={avatarUrl} alt="Profile" fill className="object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-xs text-cream-100 text-center px-1">
                        Logo
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-forest-200 bg-cream-50 hover:bg-cream-100 text-xs font-bold text-forest-700 transition-all">
                      {uploadingPhoto === "avatar" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ImageIcon className="h-4 w-4" />
                      )}
                      {uploadingPhoto === "avatar" ? "Uploading…" : "Upload photo"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) uploadPhoto(f, "avatar", setAvatarUrl);
                        }}
                      />
                    </label>
                    <input
                      type="url"
                      placeholder="Or paste an image URL"
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      className={inputClass + " mt-2"}
                    />
                  </div>
                </div>
              </div>

              {/* Cover */}
              <div className="mb-5">
                <span className="block text-sm font-medium text-forest-950 mb-2">
                  Cover photo
                </span>
                <div className="flex items-center gap-3">
                  <div className="relative h-16 w-24 rounded-xl overflow-hidden border border-forest-200 bg-forest-950 shrink-0">
                    {coverUrl ? (
                      <Image src={coverUrl} alt="Cover" fill className="object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-xs text-cream-100 text-center px-1">
                        Logo
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-forest-200 bg-cream-50 hover:bg-cream-100 text-xs font-bold text-forest-700 transition-all">
                      {uploadingPhoto === "cover" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ImageIcon className="h-4 w-4" />
                      )}
                      {uploadingPhoto === "cover" ? "Uploading…" : "Upload photo"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) uploadPhoto(f, "cover", setCoverUrl);
                        }}
                      />
                    </label>
                    <input
                      type="url"
                      placeholder="Or paste an image URL"
                      value={coverUrl}
                      onChange={(e) => setCoverUrl(e.target.value)}
                      className={inputClass + " mt-2"}
                    />
                  </div>
                </div>
              </div>

              {/* Gallery */}
              <div>
                <span className="block text-sm font-medium text-forest-950 mb-2">
                  Dish photos
                </span>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-3">
                  {galleryUrls.map((url) => (
                    <div key={url} className="relative aspect-square rounded-xl overflow-hidden border border-forest-100 group">
                      <Image src={url} alt="Dish" fill className="object-cover" />
                      <button
                        type="button"
                        onClick={() => removeGalleryImage(url)}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-white/90 text-forest-700 hover:text-red-600 flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Remove photo"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  <label className="cursor-pointer aspect-square rounded-xl border-2 border-dashed border-forest-200 bg-cream-50 hover:bg-cream-100 flex flex-col items-center justify-center text-forest-500 transition-all">
                    {uploadingPhoto === "gallery" ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <ImageIcon className="h-5 w-5" />
                    )}
                    <span className="text-[10px] font-bold mt-1">
                      {uploadingPhoto === "gallery" ? "Uploading" : "Add"}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) uploadPhoto(f, "gallery", (u) => setGalleryUrls((p) => [...p, u]));
                      }}
                    />
                  </label>
                </div>
                <p className="text-[11px] text-forest-400">
                  Upload at least two dish photos — they are part of the profile
                  completeness checklist.
                </p>
              </div>
            </section>

            <section className="bg-white rounded-2xl border border-forest-100 p-6">
              <h2 className="text-lg font-bold text-forest-950 mb-5">Profile</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-forest-950 mb-1.5">
                    Tagline
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Royal Swahili & Ocean-Fresh Seafood"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-forest-950 mb-1.5">
                    Bio
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Describe your culinary training and experience…"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className={inputClass + " resize-none"}
                  />
                  <p className="text-xs text-forest-400 mt-1">
                    {bio.length} characters (50 minimum)
                  </p>
                </div>
              </div>
            </section>

            <section className="bg-white rounded-2xl border border-forest-100 p-6">
              <h2 className="text-lg font-bold text-forest-950 mb-5">
                Rates &amp; capacity
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-forest-950 mb-1.5">
                    Rate per guest (KES)
                  </label>
                  <input
                    type="number"
                    min={1500}
                    step={100}
                    value={startingPrice}
                    onChange={(e) => setStartingPrice(Number(e.target.value))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-forest-950 mb-1.5">
                    Min guests
                  </label>
                  <input
                    type="number"
                    min={2}
                    value={minGuests}
                    onChange={(e) => setMinGuests(Number(e.target.value))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-forest-950 mb-1.5">
                    Max guests
                  </label>
                  <input
                    type="number"
                    min={minGuests}
                    value={maxGuests}
                    onChange={(e) => setMaxGuests(Number(e.target.value))}
                    className={inputClass}
                  />
                </div>
              </div>
            </section>

            <button
              type="submit"
              disabled={actionLoading}
              className="w-full py-3.5 rounded-xl bg-forest-950 text-white text-sm font-medium hover:bg-forest-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Save changes"
              )}
            </button>
          </form>
        )}
      </main>

      <Footer />
    </div>
  );
}

/* ------------------------------------------------------------------------- */
/* Applicant workspace                                                        */
/* ------------------------------------------------------------------------- */

function ApplicantWorkspace({
  application,
  meta,
  completeness,
  onSaved,
}: {
  application: ApplicationSummary | null;
  meta: ApplicationMeta;
  completeness: { percentage: number; missing: string[] };
  onSaved: () => Promise<void>;
}) {
  const [form, setForm] = useState({
    fullName: application?.full_name || "",
    brandName: application?.brand_name || "",
    phone: application?.phone || application?.phone_number || "",
    city: application?.city || "Nairobi",
    neighborhood: application?.neighborhood || "Kilimani",
    cuisines: application?.cuisines || [],
    dietary: application?.dietary || [],
    startingPrice: String(application?.starting_price || 4500),
    specialtyDish: application?.specialty_dish || "",
    bio: application?.bio || "",
    experienceYears: application?.experience_years || "5-8 years",
    nationalIdNumber: meta.national_id_number || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const status = application?.status || "pending";
  const isRejected = status === "rejected";

  const toggle = (key: "cuisines" | "dietary", value: string) =>
    setForm((prev) => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter((item) => item !== value)
        : [...prev[key], value],
    }));

  const save = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const response = await fetch("/api/chef/application", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.fullName,
          brandName: form.brandName,
          phone: form.phone,
          city: form.city,
          neighborhood: form.neighborhood,
          cuisines: form.cuisines,
          dietary: form.dietary,
          startingPrice: Number(form.startingPrice),
          specialtyDish: form.specialtyDish,
          bio: form.bio,
          experienceYears: form.experienceYears,
          meta: { national_id_number: form.nationalIdNumber },
          resubmit: isRejected,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(payload.error || "Could not save your profile.");
        return;
      }
      setSaved(true);
      await onSaved();
    } catch (err: any) {
      setError(err?.message || "Network error. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const statusCopy =
    status === "approved"
      ? {
          title: "You're approved",
          body: "Your listing is being prepared. Refresh in a moment — if it still does not appear, message the onboarding team.",
          tone: "emerald",
        }
      : isRejected
      ? {
          title: "Application needs changes",
          body: "Update the details below and resubmit. We will review it again.",
          tone: "red",
        }
      : status === "under_review"
      ? {
          title: "Application under review",
          body: "Our team is checking your certificates and schedule. You will hear from us on WhatsApp.",
          tone: "amber",
        }
      : {
          title: "Application received",
          body: "We review applications within 24 hours. Finish the details below while you wait — a complete profile gets approved faster.",
          tone: "amber",
        };

  return (
    <div className="min-h-screen bg-cream-50 text-forest-950 font-sans flex flex-col">
      <Navbar />
      <main className="max-w-3xl mx-auto w-full px-4 pt-24 pb-16 flex-1 space-y-5">
        <div>
          <p className="text-xs font-medium text-forest-500 mb-1">
            Chef onboarding
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-forest-950">
            Welcome, {form.fullName || "Chef"}
          </h1>
          <p className="text-sm text-forest-500 mt-1">
            Your account is active. Finish your profile and we will take it live.
          </p>
        </div>

        <section
          className={`rounded-2xl border p-5 ${
            statusCopy.tone === "emerald"
              ? "bg-emerald-50 border-emerald-200"
              : statusCopy.tone === "red"
              ? "bg-red-50 border-red-200"
              : "bg-amber-50 border-amber-200"
          }`}
        >
          <div className="flex items-start gap-3">
            {statusCopy.tone === "emerald" ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-700 shrink-0 mt-0.5" />
            ) : (
              <Lock className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="text-sm font-bold text-forest-950">
                {statusCopy.title}
              </p>
              <p className="text-xs text-forest-600 mt-0.5 leading-relaxed">
                {statusCopy.body}
              </p>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-forest-100 p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-bold text-forest-950">
              Application completeness
            </p>
            <span className="text-sm font-bold text-forest-950">
              {completeness.percentage}%
            </span>
          </div>
          <div className="h-2 bg-cream-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-forest-950 rounded-full transition-all"
              style={{ width: `${completeness.percentage}%` }}
            />
          </div>
          {completeness.missing.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {completeness.missing.map((item) => (
                <span
                  key={item}
                  className="px-2.5 py-1 rounded-lg bg-cream-50 border border-forest-100 text-forest-700 text-xs font-medium"
                >
                  {item}
                </span>
              ))}
            </div>
          )}
        </section>

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}
        {saved && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm font-medium text-emerald-800">
            Profile saved.
          </div>
        )}

        <section className="bg-white rounded-2xl border border-forest-100 p-6 space-y-5">
          <div>
            <h2 className="text-lg font-bold text-forest-950">Your details</h2>
            <p className="text-xs text-forest-500 mt-1">
              You can update everything here. Changes appear on your listing once
              it goes live.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-forest-950 mb-1.5">
                Full name
              </label>
              <input
                className={inputClass}
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-forest-950 mb-1.5">
                Brand name (optional)
              </label>
              <input
                className={inputClass}
                value={form.brandName}
                onChange={(e) => setForm({ ...form, brandName: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-forest-950 mb-1.5">
                Phone / WhatsApp
              </label>
              <input
                className={inputClass}
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
              <p className="text-[11px] text-forest-400 mt-1">
                This is the number customers see on your public profile.
              </p>
            </div>
            <div>
              <label className="block text-xs font-bold text-forest-950 mb-1.5">
                National ID or passport
              </label>
              <input
                className={inputClass}
                value={form.nationalIdNumber}
                onChange={(e) =>
                  setForm({ ...form, nationalIdNumber: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-forest-950 mb-1.5">
                City
              </label>
              <input
                className={inputClass}
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-forest-950 mb-1.5">
                Neighbourhood
              </label>
              <input
                className={inputClass}
                value={form.neighborhood}
                onChange={(e) =>
                  setForm({ ...form, neighborhood: e.target.value })
                }
              />
            </div>
          </div>

          <div>
            <span className="block text-xs font-bold text-forest-950 mb-1.5">
              Cuisines
            </span>
            <div className="flex flex-wrap gap-2">
              {CUISINES.map((cuisine) => {
                const selected = form.cuisines.includes(cuisine);
                return (
                  <button
                    key={cuisine}
                    type="button"
                    onClick={() => toggle("cuisines", cuisine)}
                    aria-pressed={selected}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                      selected
                        ? "bg-forest-950 text-white border-forest-950"
                        : "bg-white text-forest-700 border-forest-200 hover:border-forest-400"
                    }`}
                  >
                    {cuisine}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <span className="block text-xs font-bold text-forest-950 mb-1.5">
              Dietary specialties
            </span>
            <div className="flex flex-wrap gap-2">
              {DIETARY.map((item) => {
                const selected = form.dietary.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => toggle("dietary", item)}
                    aria-pressed={selected}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                      selected
                        ? "bg-forest-950 text-white border-forest-950"
                        : "bg-white text-forest-700 border-forest-200 hover:border-forest-400"
                    }`}
                  >
                    {item}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-forest-950 mb-1.5">
                Rate per guest (KES)
              </label>
              <input
                type="number"
                min={1000}
                step={100}
                className={inputClass}
                value={form.startingPrice}
                onChange={(e) =>
                  setForm({ ...form, startingPrice: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-forest-950 mb-1.5">
                Experience
              </label>
              <select
                className={inputClass}
                value={form.experienceYears}
                onChange={(e) =>
                  setForm({ ...form, experienceYears: e.target.value })
                }
              >
                <option value="2-4 years">2–4 years</option>
                <option value="5-8 years">5–8 years</option>
                <option value="8+ years">8+ years</option>
                <option value="Executive Chef / 15+ yrs">
                  Executive chef, 15+ years
                </option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-forest-950 mb-1.5">
              Signature dish
            </label>
            <input
              className={inputClass}
              value={form.specialtyDish}
              onChange={(e) =>
                setForm({ ...form, specialtyDish: e.target.value })
              }
              placeholder="e.g. Tamarind lobster with saffron coconut rice"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-forest-950 mb-1.5">
              Bio
            </label>
            <textarea
              rows={5}
              className={inputClass + " resize-y"}
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              placeholder="Where you trained, kitchens you have run, the food you are known for…"
            />
            <p className="text-xs text-forest-400 mt-1">
              {form.bio.trim().length}/50 characters minimum
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="flex-1 inline-flex items-center justify-center gap-2 bg-forest-950 text-white py-3.5 rounded-xl font-bold text-sm hover:bg-forest-800 transition-colors disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : isRejected ? (
                "Save and resubmit"
              ) : (
                "Save profile"
              )}
            </button>
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-forest-100 p-5 space-y-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-forest-700" />
            <p className="text-sm font-bold text-forest-950">
              What we check before approval
            </p>
          </div>
          <ul className="text-xs text-forest-600 space-y-1.5 list-disc list-inside">
            <li>Certificate of good conduct and food handler certificate</li>
            <li>National ID or passport matches the name on your account</li>
            <li>A tasting session at the Nairobi test kitchen</li>
            <li>At least one signature menu and clear per-guest pricing</li>
          </ul>
        </section>

        <div className="flex flex-col sm:flex-row gap-2">
          <a
            href={`mailto:info@bookachef.co.ke?subject=${encodeURIComponent(
              `Question about my chef application — ${form.fullName || "applicant"}`
            )}`}
            className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-xl border border-forest-200 text-forest-800 font-medium text-sm hover:bg-white transition-colors"
          >
            <Phone className="h-4 w-4" />
            Message onboarding
          </a>
          <Link
            href="/"
            className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-xl border border-forest-200 text-forest-800 font-medium text-sm hover:bg-white transition-colors"
          >
            Back to site
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
