"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Clock,
  ChefHat,
  Loader2,
  Phone,
  Home,
  Truck,
  CheckCircle2,
  ShieldCheck,
  Lock,
  ArrowRight,
  AlertCircle,
  FileText,
  ExternalLink,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import StatusStepper from "@/components/booking/StatusStepper";
import { Booking, Menu } from "@/utils/data";
import {
  resolveCommission,
  LEGACY_CHEF_PAYOUT_RATE,
  CommissionResolution,
} from "@/utils/commission";
import { createClient } from "@/utils/supabase/client";
import {
  calculateProfileReadiness,
  ProfileReadinessResult,
} from "@/utils/profileReadiness";
import {
  ApplicationMeta,
  DEFAULT_CHEF_AVATAR,
} from "@/utils/chefApplication";

/**
 * A job offer addressed to this chef by the dispatch engine.
 *
 * Intentionally carries NO customer PII. The chef decides whether to take the
 * job from the occasion, date, area and budget alone; client name, phone, email
 * and the full street address are released only after acceptance, via the RLS
 * path that applies once the booking is genuinely theirs.
 */
type JobOffer = {
  id: string;
  bookingDate: string;
  bookingTime: string;
  guestsCount: number;
  totalPrice: number;
  locationArea: string;
  cuisineType: string;
  serviceFormat: string;
  specialRequests?: string;
};

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

export default function ChefDashboardPage() {
  const router = useRouter();
  const supabase = createClient();

  const [portalState, setPortalState] = useState<PortalState>("loading");
  const [chef, setChef] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"bookings" | "menus" | "settings">(
    "bookings"
  );
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [jobOffers, setJobOffers] = useState<JobOffer[]>([]);
  const [menus, setMenus] = useState<Menu[]>([]);

  const [application, setApplication] = useState<ApplicationSummary | null>(null);
  const [appMeta, setAppMeta] = useState<ApplicationMeta>({ v: 1 });
  const [appCompleteness, setAppCompleteness] = useState<{
    percentage: number;
    missing: string[];
  }>({ percentage: 0, missing: [] });

  const [nationalIdNumber, setNationalIdNumber] = useState("");
  const [allowInHome, setAllowInHome] = useState(true);
  const [allowDelivery, setAllowDelivery] = useState(true);
  const [bio, setBio] = useState("");
  const [tagline, setTagline] = useState("");
  const [startingPrice, setStartingPrice] = useState(4500);
  const [minGuests, setMinGuests] = useState(2);
  const [maxGuests, setMaxGuests] = useState(30);
  const [isLive, setIsLive] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [commission, setCommission] = useState<CommissionResolution>({
    chefPayoutRate: LEGACY_CHEF_PAYOUT_RATE,
    platformRate: 1 - LEGACY_CHEF_PAYOUT_RATE,
    source: "legacy",
    isIndicative: true,
  });
  const [decliningBookingId, setDecliningBookingId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const loadWorkForChef = useCallback(
    async (chefId: string) => {
      const { data: dbBookings } = await supabase
        .from("bookings")
        .select("*")
        .eq("chef_id", chefId)
        .order("created_at", { ascending: false });

      setBookings(
        ((dbBookings as any[]) || []).map((b) => ({
          id: b.id,
          chefId: b.chef_id,
          chefName: chef?.name || "Me",
          clientName: b.client_name,
          clientEmail: b.client_email,
          clientPhone: b.client_phone,
          menuTitle: b.special_requests || "Signature menu",
          bookingDate: b.booking_date,
          bookingTime: b.booking_time,
          guestsCount: b.guests_count,
          totalPrice: Number(b.total_price),
          depositAmount: Number(b.deposit_amount),
          status: b.status,
          address: b.location_address,
          city: b.location_city || "Nairobi",
          specialRequests: b.special_requests,
          serviceFormat: b.service_format || "in_home",
          sourcingPreference: b.sourcing_preference || "chef_sourced",
          preferredStores: b.preferred_stores || undefined,
          receiptVerified: b.receipt_verified ?? false,
          createdAt: b.created_at,
        }))
      );

      // Dispatch is a push model: matchChefToBooking() assigns exactly one
      // eligible chef at a time and sets status = 'assigned'. There is no open
      // job board, so offers are filtered to chef_id = this chef only.
      // Explicit columns keep client contact and the street address off the
      // wire until the chef accepts.
      const { data: offered } = await supabase
        .from("bookings")
        .select(
          "id, booking_date, booking_time, guests_count, total_price, " +
            "budget_per_person, location_address, location_city, " +
            "cuisine_type, service_format, special_requests"
        )
        .eq("chef_id", chefId)
        .eq("status", "assigned")
        .order("booking_date", { ascending: true })
        .limit(20);

      setJobOffers(
        ((offered as any[]) || []).map((b) => ({
          id: b.id,
          bookingDate: b.booking_date,
          bookingTime: b.booking_time,
          guestsCount: Number(b.guests_count || 0),
          totalPrice:
            Number(b.total_price) ||
            Number(b.budget_per_person || 0) * Number(b.guests_count || 0),
          locationArea:
            b.location_city || String(b.location_address || "").split(",")[0],
          cuisineType: b.cuisine_type || "",
          serviceFormat: b.service_format || "in_home",
          specialRequests: b.special_requests || "",
        }))
      );
    },
    // `chef` is only used for the display name on bookings, which is already
    // available from state at render time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [supabase]
  );

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
        setCommission(await resolveCommission(supabase as any));

        const {
          data: { user },
          error: authErr,
        } = await supabase.auth.getUser();

        if (authErr || !user) {
          router.push("/login?redirect=%2Fchef-dashboard");
          return;
        }
        if (!active) return;

        // Look up the listing by user_id first. Email is only a fallback for
        // legacy rows an admin has linked by hand — never the primary key.
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
          // No listing yet. An applicant should still be able to work on their
          // profile here instead of hitting a dead end — this is exactly where
          // chefs used to be stranded.
          const hasApplication = await loadApplication();
          if (!active) return;
          setPortalState(hasApplication ? "applicant" : "none");
          return;
        }

        setChef(chefRecord);
        setNationalIdNumber(chefRecord.national_id_number || "");
        setAllowInHome(chefRecord.allow_in_home ?? true);
        setAllowDelivery(chefRecord.allow_delivery ?? true);
        setBio(chefRecord.bio || "");
        setTagline(chefRecord.tagline || "");
        setStartingPrice(Number(chefRecord.price_per_guest) || 4500);
        setMinGuests(chefRecord.min_guests || 2);
        setMaxGuests(chefRecord.max_guests || 30);
        setIsLive(chefRecord.is_available ?? false);

        const { data: menuRows } = await supabase
          .from("menus")
          .select("*")
          .eq("chef_id", chefRecord.id)
          .order("created_at", { ascending: true });
        if (!active) return;
        setMenus(((menuRows as any[]) || []).map(mapMenu));

        // Load the originating application so identity data captured at
        // onboarding survives approval. Without this the readiness gate could
        // never reach 97%: the National ID lives on the application, not the
        // chefs row.
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

        await loadWorkForChef(chefRecord.id);
        if (!active) return;
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
  }, [router, supabase, loadApplication, loadWorkForChef]);

  const handleAcceptBooking = async (bookingId: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/accept`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        // The offer becomes an accepted job with client contact visible, so
        // reload instead of guessing the new shape in local state.
        if (chef?.id) await loadWorkForChef(chef.id);
      } else {
        setSaveError(data.error || "Failed to accept booking.");
      }
    } catch (e: any) {
      setSaveError("Error: " + e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeclineBooking = async () => {
    if (!decliningBookingId) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/bookings/${decliningBookingId}/decline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: declineReason }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (chef?.id) {
          await loadWorkForChef(chef.id);
        } else {
          setJobOffers((prev) =>
            prev.filter((o) => o.id !== decliningBookingId)
          );
        }
        setDecliningBookingId(null);
        setDeclineReason("");
      } else {
        setSaveError(data.error || "Failed to decline booking.");
      }
    } catch (e: any) {
      setSaveError("Error: " + e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkCompleted = async (bookingId: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/complete`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        setSaveError(data.error || "Could not mark this job as completed.");
        return;
      }

      if (chef?.id) {
        await loadWorkForChef(chef.id);
      } else {
        setBookings((prev) =>
          prev.map((b) => (b.id === bookingId ? { ...b, status: "completed" } : b))
        );
      }
    } catch (e: any) {
      setSaveError("Error: " + e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const readiness: ProfileReadinessResult = calculateProfileReadiness({
    name: chef?.name,
    phone: chef?.phone || application?.phone,
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

  const handleToggleLiveStatus = async () => {
    if (!readiness.canGoLive && !isLive) {
      setSaveError(
        `Cannot go online: your profile is ${readiness.percentage}% complete. 97% is required.`
      );
      return;
    }
    setActionLoading(true);
    setSaveError(null);
    setSaveSuccess(null);
    try {
      const nextLive = !isLive;
      const res = await fetch("/api/chef/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chef_id: chef.id,
          requested_live_status: nextLive,
          national_id_number: nationalIdNumber,
          allow_in_home: allowInHome,
          allow_delivery: allowDelivery,
          bio,
          tagline,
          price_per_guest: startingPrice,
          min_guests: minGuests,
          max_guests: maxGuests,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update");
      setIsLive(nextLive);
      setSaveSuccess(
        nextLive
          ? "You're online and receiving dispatch requests."
          : "You're offline. No new jobs will be sent to you."
      );
    } catch (err: any) {
      setSaveError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

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
          national_id_number: nationalIdNumber,
          allow_in_home: allowInHome,
          allow_delivery: allowDelivery,
          bio,
          tagline,
          price_per_guest: startingPrice,
          min_guests: minGuests,
          max_guests: maxGuests,
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
                Apply to cook with us
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="https://wa.me/254786530713?text=Hi%20Book%20A%20Chef%2C%20my%20account%20is%20not%20linked%20to%20my%20application"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 rounded-xl border border-forest-200 text-forest-800 font-medium text-sm hover:bg-cream-50 transition-colors"
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

  // "assigned" rows are offers awaiting this chef's response and are rendered
  // from `jobOffers` above, so they are excluded here to avoid double-listing.
  const activeBookings = bookings.filter(
    (b) => b.status !== "pending_assignment" && b.status !== "assigned"
  );
  const completedBookings = bookings.filter(
    (b) => b.status === "confirmed" || b.status === "completed"
  );
  const totalEarned = completedBookings.reduce(
    (sum, b) => sum + b.totalPrice * commission.chefPayoutRate,
    0
  );

  const statusBadge = (status: string) => {
    if (status === "confirmed") return "bg-emerald-100 text-emerald-800";
    if (status === "chef_accepted") return "bg-blue-100 text-blue-800";
    if (status === "completed") return "bg-cream-100 text-forest-700";
    if (status === "declined" || status.includes("cancelled"))
      return "bg-red-100 text-red-800";
    if (status === "pending_assignment") return "bg-amber-100 text-amber-800";
    return "bg-cream-100 text-forest-700";
  };

  const statusLabel = (status: string) => {
    const map: Record<string, string> = {
      pending_assignment: "Open request",
      assigned: "Offered to you",
      chef_accepted: "Accepted",
      confirmed: "Confirmed",
      completed: "Completed",
      declined: "Declined",
      cancelled_by_customer: "Cancelled",
      cancelled_by_chef: "Cancelled",
    };
    return map[status] || status.replace(/_/g, " ");
  };

  return (
    <div className="min-h-screen bg-cream-50 text-forest-950 font-sans flex flex-col">
      <Navbar />

      <main className="max-w-5xl mx-auto w-full px-4 pt-24 pb-16 flex-1">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-cream-100 shrink-0">
              <Image
                src={chef?.avatar_url || DEFAULT_CHEF_AVATAR}
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

          {/* Live toggle */}
          <button
            onClick={handleToggleLiveStatus}
            disabled={!readiness.canGoLive || actionLoading}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shrink-0 ${
              !readiness.canGoLive
                ? "bg-cream-100 text-forest-500 cursor-not-allowed border border-forest-200"
                : isLive
                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                : "bg-forest-950 text-white hover:bg-forest-800"
            }`}
          >
            {!readiness.canGoLive ? (
              <>
                <Lock className="h-4 w-4" />
                {readiness.percentage}% — locked
              </>
            ) : isLive ? (
              <>
                <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                Online
              </>
            ) : (
              <>
                <span className="h-2 w-2 rounded-full bg-cream-300" />
                Offline
              </>
            )}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-2xl border border-forest-100 p-4">
            <p className="text-[10px] font-medium text-forest-400 uppercase mb-1">
              Earnings
            </p>
            <p className="text-lg sm:text-xl font-bold text-forest-950">
              {commission.isIndicative ? "~KES " : "KES "}
              {Math.round(totalEarned).toLocaleString()}
            </p>
            {commission.isIndicative && (
              <p className="text-[10px] text-forest-400 mt-0.5">
                Estimate — rate pending
              </p>
            )}
          </div>
          <div className="bg-white rounded-2xl border border-forest-100 p-4">
            <p className="text-[10px] font-medium text-forest-400 uppercase mb-1">
              Active
            </p>
            <p className="text-lg sm:text-xl font-bold text-forest-950">
              {
                bookings.filter(
                  (b) => b.status === "confirmed" || b.status === "chef_accepted"
                ).length
              }
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-forest-100 p-4">
            <p className="text-[10px] font-medium text-forest-400 uppercase mb-1">
              Awaiting response
            </p>
            <p className="text-lg sm:text-xl font-bold text-amber-600">
              {jobOffers.length}
            </p>
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
            onClick={() => setActiveTab("bookings")}
            className={`px-1 py-3 mr-6 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              activeTab === "bookings"
                ? "border-forest-950 text-forest-950"
                : "border-transparent text-forest-500 hover:text-forest-800"
            }`}
          >
            Requests ({jobOffers.length + activeBookings.length})
          </button>
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

        {/* REQUESTS TAB */}
        {activeTab === "bookings" && (
          <div className="space-y-6">
            {jobOffers.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="text-sm font-bold text-forest-950">
                    Offered to you
                  </h2>
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-medium">
                    {jobOffers.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {jobOffers.map((offer) => (
                    <div
                      key={offer.id}
                      className="bg-white rounded-2xl border border-amber-200 p-5"
                    >
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div>
                          <p className="font-bold text-forest-950">
                            {offer.cuisineType
                              ? `${offer.cuisineType} private dining`
                              : "Private dining request"}
                          </p>
                          <p className="text-xs text-forest-500">
                            {offer.bookingDate} at {offer.bookingTime} •{" "}
                            {offer.guestsCount} guests
                          </p>
                        </div>
                        <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[11px] font-medium shrink-0">
                          Awaiting your response
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
                        <div>
                          <p className="text-[10px] font-medium text-forest-400 uppercase mb-1">
                            Area
                          </p>
                          <p className="text-sm font-medium text-forest-950 truncate">
                            {offer.locationArea}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-medium text-forest-400 uppercase mb-1">
                            Format
                          </p>
                          <p className="text-sm font-medium text-forest-950">
                            {offer.serviceFormat === "delivery"
                              ? "Delivery"
                              : "In-home"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-medium text-forest-400 uppercase mb-1">
                            Your earnings
                          </p>
                          <p className="text-sm font-bold text-forest-950">
                            {commission.isIndicative ? "~KES " : "KES "}
                            {Math.round(
                              offer.totalPrice * commission.chefPayoutRate
                            ).toLocaleString()}
                          </p>
                          {commission.isIndicative && (
                            <p className="text-[10px] text-forest-400 mt-0.5">
                              Estimate — rate pending approval
                            </p>
                          )}
                        </div>
                      </div>

                      {offer.specialRequests && (
                        <div className="mb-4 p-3 rounded-xl bg-cream-50 border border-forest-100">
                          <p className="text-xs text-forest-700">
                            {offer.specialRequests}
                          </p>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <button
                          onClick={() => setDecliningBookingId(offer.id)}
                          className="px-4 py-2.5 rounded-xl border border-forest-200 text-sm font-medium text-forest-700 hover:bg-cream-50 transition-colors"
                        >
                          Decline
                        </button>
                        <button
                          disabled={actionLoading}
                          onClick={() => handleAcceptBooking(offer.id)}
                          className="flex-1 px-4 py-2.5 rounded-xl bg-forest-950 text-white text-sm font-medium hover:bg-forest-800 transition-colors disabled:opacity-50 flex items-center justify-center"
                        >
                          {actionLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Accept job"
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {activeBookings.length > 0 && (
              <section>
                <h2 className="text-sm font-bold text-forest-950 mb-3">
                  Your bookings
                </h2>
                <div className="space-y-3">
                  {activeBookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="bg-white rounded-2xl border border-forest-100 p-5"
                    >
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div>
                          <p className="font-bold text-forest-950">
                            {booking.clientName}
                          </p>
                          <p className="text-xs text-forest-500">
                            {booking.bookingDate} at {booking.bookingTime} •{" "}
                            {booking.guestsCount} guests
                          </p>
                        </div>
                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-medium shrink-0 ${statusBadge(
                            booking.status
                          )}`}
                        >
                          {statusLabel(booking.status)}
                        </span>
                      </div>

                      <div className="mb-4">
                        <StatusStepper status={booking.status} />
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
                        <div>
                          <p className="text-[10px] font-medium text-forest-400 uppercase mb-1">
                            Client
                          </p>
                          <p className="text-sm font-medium text-forest-950">
                            {booking.clientPhone}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-medium text-forest-400 uppercase mb-1">
                            Address
                          </p>
                          <p className="text-sm font-medium text-forest-950 truncate">
                            {booking.address}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-medium text-forest-400 uppercase mb-1">
                            Earnings
                          </p>
                          <p className="text-sm font-bold text-forest-950">
                            {commission.isIndicative ? "~KES " : "KES "}
                            {Math.round(
                              booking.totalPrice * commission.chefPayoutRate
                            ).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-4 border-t border-forest-100">
                        <a
                          href={`https://wa.me/${
                            booking.clientPhone?.replace(/[^0-9]/g, "") || ""
                          }?text=${encodeURIComponent(
                            `Hi ${booking.clientName}, this is your chef for booking #${booking.id
                              .slice(0, 8)
                              .toUpperCase()} on ${booking.bookingDate}.`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors flex items-center gap-2"
                        >
                          <Phone className="h-4 w-4" />
                          WhatsApp client
                        </a>

                        {booking.status === "confirmed" && (
                          <button
                            onClick={() => handleMarkCompleted(booking.id)}
                            disabled={actionLoading}
                            className="px-4 py-2.5 rounded-xl bg-forest-950 text-white text-sm font-medium hover:bg-forest-800 transition-colors disabled:opacity-50"
                          >
                            Mark completed
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {bookings.length === 0 && jobOffers.length === 0 && (
              <div className="bg-white rounded-2xl border border-forest-100 p-12 text-center">
                <div className="w-14 h-14 rounded-2xl bg-cream-100 flex items-center justify-center mx-auto mb-4">
                  <ChefHat className="h-6 w-6 text-forest-400" />
                </div>
                <h3 className="text-lg font-bold text-forest-950 mb-1">
                  No requests yet
                </h3>
                <p className="text-sm text-forest-500 max-w-sm mx-auto">
                  {isLive
                    ? "You're online. Requests that match your cuisines, area and rate will appear here — usually within a few days."
                    : "Go online when you're ready to take work. Dispatch only sends jobs to chefs who are online and have a complete profile."}
                </p>
                {!isLive && readiness.canGoLive && (
                  <button
                    onClick={handleToggleLiveStatus}
                    disabled={actionLoading}
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-forest-950 text-white text-sm font-medium hover:bg-forest-800 disabled:opacity-50"
                  >
                    Go online
                  </button>
                )}
              </div>
            )}
          </div>
        )}

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
                  A menu is part of the 97% go-live checklist. Our team creates
                  your first signature menu when your application is approved; you
                  can edit it here afterwards.
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

      {/* DECLINE MODAL */}
      {decliningBookingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-forest-950/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-forest-950 mb-2">
              Pass on this request?
            </h3>
            <p className="text-sm text-forest-500 mb-5">
              We&apos;ll offer it to another available chef.
            </p>
            <div className="mb-5">
              <label className="block text-sm font-medium text-forest-950 mb-1.5">
                Reason (optional)
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Booked that evening…"
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                className={inputClass + " resize-none"}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setDecliningBookingId(null)}
                className="flex-1 py-3 rounded-xl border border-forest-200 text-sm font-medium text-forest-700 hover:bg-cream-50 transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={actionLoading}
                onClick={handleDeclineBooking}
                className="flex-1 py-3 rounded-xl bg-forest-950 text-white text-sm font-medium hover:bg-forest-800 transition-colors disabled:opacity-50"
              >
                {actionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Pass"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

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
          body: "Your partner listing is being prepared. Refresh in a moment — if it still does not appear, message the onboarding team.",
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
          body: "Our culinary team is checking your certificates and schedule. You will hear from us on WhatsApp.",
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
              <Clock className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
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
                Phone / M-Pesa
              </label>
              <input
                className={inputClass}
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
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
            <FileText className="h-4 w-4 text-forest-700" />
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
            href={`https://wa.me/254786530713?text=${encodeURIComponent(
              `Hi Book A Chef, this is ${form.fullName || "a chef applicant"}. I have a question about my application.`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
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
