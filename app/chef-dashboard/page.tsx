"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChefHat,
  Calendar,
  Clock,
  DollarSign,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Award,
  Users,
  Settings,
  Sparkles,
  Search,
  Filter,
  Plus,
  Eye,
  Phone,
  Mail,
  MapPin,
  Loader2,
  AlertCircle,
  Home,
  Truck,
  Receipt,
  ShieldCheck,
  Lock,
  Shield,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import StatusStepper from "@/components/booking/StatusStepper";
import { Booking, Menu, INITIAL_CHEFS } from "@/utils/data";
import { createClient } from "@/utils/supabase/client";
import { calculateProfileReadiness, ProfileReadinessResult } from "@/utils/profileReadiness";

export default function ChefDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [chef, setChef] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"bookings" | "menus" | "settings">("bookings");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [underReview, setUnderReview] = useState(false);

  // Profile Readiness & Service Configuration State
  const [nationalIdNumber, setNationalIdNumber] = useState("");
  const [allowInHome, setAllowInHome] = useState(true);
  const [allowDelivery, setAllowDelivery] = useState(true);
  const [partnerType, setPartnerType] = useState<"independent" | "restaurant">("independent");
  const [restaurantName, setRestaurantName] = useState("");
  const [bio, setBio] = useState("");
  const [tagline, setTagline] = useState("");
  const [startingPrice, setStartingPrice] = useState(4500);
  const [minGuests, setMinGuests] = useState(2);
  const [maxGuests, setMaxGuests] = useState(30);
  const [isLive, setIsLive] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Decline modal
  const [decliningBookingId, setDecliningBookingId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    async function initChefPortal() {
      setLoading(true);
      try {
        const {
          data: { user },
          error: authErr,
        } = await supabase.auth.getUser();

        if (authErr || !user) {
          router.push("/login?role=chef&message=Please sign in to access your Chef Kitchen Portal.");
          return;
        }

        // Fetch chef record matching user_id or email
        const { data: chefRecord, error: cErr } = await supabase
          .from("chefs")
          .select("*, menus(*)")
          .or(`user_id.eq.${user.id},email.eq.${user.email}`)
          .single();

        if (cErr || !chefRecord) {
          // Check if there is a pending chef application
          const { data: appRecord } = await supabase
            .from("chef_applications")
            .select("status, full_name, brand_name, created_at")
            .eq("email", user.email)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          if (appRecord && appRecord.status === "pending") {
            setUnderReview(true);
            setChef({ name: appRecord.full_name, brand: appRecord.brand_name });
            setLoading(false);
            return;
          }

          const activeChef = chefRecord || INITIAL_CHEFS[0];
          if (activeChef) {
            setChef(activeChef);
            setMenus(activeChef.menus || []);
            setNationalIdNumber(activeChef.national_id_number || activeChef.nationalIdNumber || "");
            setAllowInHome(activeChef.allow_in_home ?? (activeChef.service_formats ? activeChef.service_formats.includes("in_home") : true));
            setAllowDelivery(activeChef.allow_delivery ?? (activeChef.service_formats ? activeChef.service_formats.includes("delivery") : true));
            setPartnerType(activeChef.partner_type || "independent");
            setRestaurantName(activeChef.restaurant_name || "");
            setBio(activeChef.bio || "");
            setTagline(activeChef.tagline || "");
            setStartingPrice(Number(activeChef.price_per_guest) || 4500);
            setMinGuests(activeChef.min_guests || 2);
            setMaxGuests(activeChef.max_guests || 30);
            setIsLive(activeChef.is_available ?? false);
          }
        } else {
          setChef(chefRecord);
          setMenus(chefRecord.menus || []);
          setNationalIdNumber(chefRecord.national_id_number || chefRecord.nationalIdNumber || "");
          setAllowInHome(chefRecord.allow_in_home ?? (chefRecord.service_formats ? chefRecord.service_formats.includes("in_home") : true));
          setAllowDelivery(chefRecord.allow_delivery ?? (chefRecord.service_formats ? chefRecord.service_formats.includes("delivery") : true));
          setPartnerType(chefRecord.partner_type || "independent");
          setRestaurantName(chefRecord.restaurant_name || "");
          setBio(chefRecord.bio || "");
          setTagline(chefRecord.tagline || "");
          setStartingPrice(Number(chefRecord.price_per_guest) || 4500);
          setMinGuests(chefRecord.min_guests || 2);
          setMaxGuests(chefRecord.max_guests || 30);
          setIsLive(chefRecord.is_available ?? false);
        }

        // Fetch bookings for this chef
        const chefId = chefRecord?.id || "c_1";
        const { data: dbBookings } = await supabase
          .from("bookings")
          .select("*")
          .eq("chef_id", chefId)
          .order("created_at", { ascending: false });

        if (dbBookings && dbBookings.length > 0) {
          setBookings(
            dbBookings.map((b: any) => ({
              id: b.id,
              chefId: b.chef_id,
              chefName: chefRecord?.name || "Me",
              clientName: b.client_name,
              clientEmail: b.client_email,
              clientPhone: b.client_phone,
              menuTitle: b.special_requests || "Signature Degustation",
              bookingDate: b.booking_date,
              bookingTime: b.booking_time,
              guestsCount: b.guests_count,
              totalPrice: Number(b.total_price),
              depositAmount: Number(b.deposit_amount),
              status: b.status,
              address: b.location_address,
              city: b.location_city || "Nairobi",
              specialRequests: b.special_requests,
              serviceFormat: b.service_format || (b.special_requests?.includes("[Service: Cooked & Delivered]") ? "delivery" : "in_home"),
              sourcingPreference: b.sourcing_preference || (b.special_requests?.includes("[Sourcing: Client Store:") ? "client_specified" : "chef_sourced"),
              preferredStores: b.preferred_stores || (b.special_requests?.match(/\[Sourcing: Client Store: ([^\]]+)\]/)?.[1] || undefined),
              receiptVerified: b.receipt_verified ?? false,
              createdAt: b.created_at,
            }))
          );
        }
      } catch (err) {
        console.error("Chef portal init error:", err);
      } finally {
        setLoading(false);
      }
    }

    initChefPortal();
  }, [supabase, router]);

  const handleAcceptBooking = async (bookingId: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/accept`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setBookings((prev) =>
          prev.map((b) => (b.id === bookingId ? { ...b, status: "chef_accepted" } : b))
        );
        alert("Booking accepted! Client has been notified to complete the M-Pesa deposit.");
      } else {
        alert(data.error || "Failed to accept booking.");
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeclineBooking = async (e: React.FormEvent) => {
    e.preventDefault();
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
        setBookings((prev) =>
          prev.map((b) => (b.id === decliningBookingId ? { ...b, status: "declined" } : b))
        );
        setDecliningBookingId(null);
        setDeclineReason("");
      } else {
        alert(data.error || "Failed to decline booking.");
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkCompleted = async (bookingId: string) => {
    try {
      await supabase
        .from("bookings")
        .update({ status: "completed", completed_at: new Date().toISOString(), review_eligible: true })
        .eq("id", bookingId);

      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status: "completed" } : b))
      );
      alert("Dinner service marked as completed! Client is now invited to leave a verified review.");
    } catch (e: any) {
      alert("Error: " + e.message);
    }
  };

  // Authoritative Profile Readiness Calculation (97% Gate to Go Live)
  const readiness = calculateProfileReadiness({
    name: chef?.name,
    phone: chef?.phone,
    nationalIdNumber,
    avatar: chef?.avatar_url || chef?.avatar,
    coverImage: chef?.cover_image_url || chef?.coverImage,
    gallery: chef?.gallery_images || chef?.gallery,
    brand: chef?.brand_name || chef?.brand,
    tagline,
    partnerType,
    serviceFormats: [
      ...(allowInHome ? ["in_home" as const] : []),
      ...(allowDelivery ? ["delivery" as const] : []),
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
      setSaveError(`Cannot go live: Profile is ${readiness.percentage}% complete. Book A Chef requires at least 97% completion before going live.`);
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
          partner_type: partnerType,
          restaurant_name: restaurantName,
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
      if (!res.ok) {
        throw new Error(data.error || "Failed to update live status");
      }
      setIsLive(nextLive);
      setSaveSuccess(nextLive ? "🎉 Profile is now LIVE on Book A Chef!" : "Profile is now paused (offline).");
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
          partner_type: partnerType,
          restaurant_name: restaurantName,
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
      if (!res.ok) {
        throw new Error(data.error || "Failed to save profile");
      }
      setSaveSuccess("Profile and readiness settings saved successfully.");
    } catch (err: any) {
      setSaveError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-cream-50 flex flex-col justify-center items-center">
        <Loader2 className="h-10 w-10 text-forest-900 animate-spin mb-3" />
        <p className="text-xs font-bold uppercase tracking-widest text-forest-600">
          Loading Chef Portal...
        </p>
      </div>
    );
  }

  // UNDER REVIEW SCREEN
  if (underReview) {
    return (
      <div className="min-h-screen bg-cream-50 text-forest-950 font-sans flex flex-col">
        <Navbar />
        <main className="max-w-xl mx-auto w-full px-4 pt-36 pb-20 flex-1 text-center space-y-6">
          <div className="bg-white rounded-[36px] p-8 sm:p-12 border border-forest-100 shadow-xl space-y-4">
            <div className="h-16 w-16 bg-amber-100 rounded-3xl flex items-center justify-center mx-auto text-amber-700">
              <Clock className="h-8 w-8" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-700 bg-amber-50 px-3 py-1 rounded-full">
              Application Under Review
            </span>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-forest-950">
              Welcome, {chef?.name || "Chef Partner"}
            </h1>
            <p className="text-xs sm:text-sm text-forest-600 leading-relaxed">
              Your application is currently being reviewed by the Book A Chef tasting and verification panel. Once approved, your master uniform and marketplace profile will be activated.
            </p>
            <div className="pt-4 border-t border-forest-100">
              <Link
                href="/"
                className="inline-block px-6 py-3 rounded-2xl bg-forest-900 text-white font-bold text-xs"
              >
                Return to Marketplace
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const confirmedBookings = bookings.filter((b) => b.status === "confirmed" || b.status === "completed");
  const totalEarned = confirmedBookings.reduce((sum, b) => sum + b.totalPrice * 0.85, 0);

  return (
    <div className="min-h-screen bg-cream-50 text-forest-950 font-sans flex flex-col">
      <Navbar />

      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-28 pb-20 flex-1">
        {/* Header Banner */}
        <div className="bg-forest-950 text-cream-100 rounded-[36px] p-6 sm:p-10 shadow-xl mb-10 border border-forest-900 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-1 text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-forest-900 text-[10px] font-black uppercase tracking-widest text-champagne-400 border border-forest-800">
              <Award className="h-3.5 w-3.5" /> Book A Chef Certified Kitchen Partner
            </div>
            <h1 className="font-serif text-2xl sm:text-4xl font-bold text-white tracking-tight">
              {chef?.name || "Chef Portal"}
            </h1>
            <p className="text-xs text-forest-300">
              {chef?.brand_name || "Private Culinary Studio"} • Live Marketplace Portal
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={`/chef/${chef?.id || "c_1"}`}
              className="px-5 py-3 rounded-2xl bg-forest-900 hover:bg-forest-800 text-champagne-300 border border-forest-800 text-xs font-bold transition-colors"
            >
              View My Public Profile →
            </Link>
          </div>
        </div>

        {/* Chef KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10 text-left">
          <div className="bg-white p-6 rounded-3xl border border-forest-100 shadow-sm space-y-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-forest-500">
              Net Completed Payouts
            </span>
            <p className="text-2xl sm:text-3xl font-serif font-black text-forest-950">
              KES {Math.round(totalEarned).toLocaleString()}
            </p>
            <p className="text-[11px] text-forest-500 font-medium">85% net chef earnings</p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-forest-100 shadow-sm space-y-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-forest-500">
              Active Reservations
            </span>
            <p className="text-2xl sm:text-3xl font-serif font-black text-emerald-700">
              {bookings.filter((b) => b.status === "confirmed" || b.status === "chef_accepted").length}
            </p>
            <p className="text-[11px] text-forest-500 font-medium">Confirmed / in preparation</p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-forest-100 shadow-sm space-y-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-forest-500">
              New Pending Requests
            </span>
            <p className="text-2xl sm:text-3xl font-serif font-black text-amber-600">
              {bookings.filter((b) => b.status === "pending").length} Awaiting Action
            </p>
            <p className="text-[11px] text-forest-500 font-medium">Respond within 24 hours</p>
          </div>
        </div>

        {/* MARKETPLACE GO-LIVE GATE (97% THRESHOLD) */}
        <div className="bg-white rounded-[32px] p-6 sm:p-8 border border-forest-100 shadow-sm space-y-5 mb-8 text-left">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${isLive && readiness.canGoLive ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
                <span className="text-[10px] font-black uppercase tracking-widest text-forest-500">
                  Marketplace Status & Visibility
                </span>
                {isLive && readiness.canGoLive ? (
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    🟢 Live & Accepting Diners
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-200">
                    🔴 Offline / Draft ({readiness.percentage}% Complete)
                  </span>
                )}
              </div>

              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-forest-950">
                Profile Readiness: {readiness.percentage}%
              </h2>

              <p className="text-xs text-forest-600 max-w-xl leading-relaxed">
                {readiness.canGoLive
                  ? "Your profile is verified and exceeds the 97% readiness threshold. You can toggle live status anytime to start receiving VIP bookings."
                  : `Chefs must achieve at least 97% profile completeness before going live. National ID or Passport Number is verified for client safety.`}
              </p>
            </div>

            {/* Go-Live Action Button / Toggle */}
            <div className="flex flex-col sm:items-end gap-1.5 shrink-0">
              <button
                type="button"
                disabled={!readiness.canGoLive || actionLoading}
                onClick={handleToggleLiveStatus}
                className={`px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 shadow-md ${
                  !readiness.canGoLive
                    ? "bg-forest-100 text-forest-400 cursor-not-allowed border border-forest-200"
                    : isLive
                    ? "bg-emerald-700 hover:bg-emerald-800 text-white"
                    : "bg-forest-900 hover:bg-forest-800 text-cream-50"
                }`}
              >
                {!readiness.canGoLive ? (
                  <>
                    <Lock className="h-4 w-4 text-forest-400" />
                    <span>Go Live Locked ({readiness.percentage}% / 97%)</span>
                  </>
                ) : isLive ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-white" />
                    <span>Live on Marketplace (Click to Pause)</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 text-champagne-400" />
                    <span>Publish & Go Live Now →</span>
                  </>
                )}
              </button>
              <span className="text-[10px] text-forest-500 italic">
                {readiness.canGoLive
                  ? "Click to switch between Online and Offline"
                  : `Need +${97 - readiness.percentage}% more to unlock live marketplace status`}
              </span>
            </div>
          </div>

          {/* Progress Bar & Counter */}
          <div className="space-y-1.5 pt-3 border-t border-forest-100">
            <div className="flex justify-between text-[11px] font-bold">
              <span className="text-forest-700">
                Completed {readiness.completedCount} of {readiness.totalCount} verification criteria
              </span>
              <span className={readiness.percentage >= 97 ? "text-emerald-700 font-black" : "text-amber-700 font-black"}>
                {readiness.percentage}% / 97% Minimum Target
              </span>
            </div>
            <div className="w-full h-3 bg-forest-100 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  readiness.percentage >= 97 ? "bg-emerald-500" : "bg-gradient-to-r from-amber-500 to-champagne-500"
                }`}
                style={{ width: `${readiness.percentage}%` }}
              />
            </div>
          </div>

          {/* Missing Items Chips */}
          {!readiness.canGoLive && readiness.missingItems.length > 0 && (
            <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-200/80 text-xs text-amber-950 space-y-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-700 shrink-0" />
                <span className="font-bold">What you need to complete to reach 97% and go live:</span>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {readiness.missingItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab("settings")}
                    className="px-3 py-1.5 rounded-xl bg-white border border-amber-300 text-amber-900 font-bold text-[11px] hover:bg-amber-100 transition-colors flex items-center gap-1.5 shadow-xs"
                  >
                    <span>+ {item.label}</span>
                    <span className="text-[10px] text-amber-700 font-normal">(+{item.weight}%)</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {saveSuccess && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
              <span>{saveSuccess}</span>
            </div>
          )}

          {saveError && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
              <span>{saveError}</span>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-forest-100 pb-3 mb-8 overflow-x-auto">
          <button
            onClick={() => setActiveTab("bookings")}
            className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 ${
              activeTab === "bookings"
                ? "bg-forest-900 text-white shadow-sm"
                : "bg-white text-forest-700 hover:bg-forest-50 border border-forest-100"
            }`}
          >
            Reservation Requests ({bookings.length})
          </button>
          <button
            onClick={() => setActiveTab("menus")}
            className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 ${
              activeTab === "menus"
                ? "bg-forest-900 text-white shadow-sm"
                : "bg-white text-forest-700 hover:bg-forest-50 border border-forest-100"
            }`}
          >
            My Degustation Menus ({menus.length})
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              activeTab === "settings"
                ? "bg-forest-900 text-white shadow-sm"
                : "bg-white text-forest-700 hover:bg-forest-50 border border-forest-100"
            }`}
          >
            <Settings className="h-3.5 w-3.5" />
            <span>Profile & Kitchen Privacy</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              readiness.percentage >= 97 ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"
            }`}>
              {readiness.percentage}%
            </span>
          </button>
        </div>

        {/* TAB 1: BOOKING REQUESTS */}
        {activeTab === "bookings" && (
          <div className="space-y-6 text-left">
            {bookings.length > 0 ? (
              <div className="grid grid-cols-1 gap-6">
                {bookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="bg-white rounded-[32px] p-6 sm:p-8 border border-forest-100 shadow-sm space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-forest-100">
                      <div>
                        <h4 className="font-serif text-xl font-bold text-forest-950">
                          {booking.clientName}
                        </h4>
                        <p className="text-xs text-forest-600 font-medium">
                          {booking.bookingDate} at {booking.bookingTime} • {booking.guestsCount} Guests
                        </p>
                      </div>

                      <span
                        className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${
                          booking.status === "confirmed"
                            ? "bg-emerald-100 text-emerald-800"
                            : booking.status === "chef_accepted"
                            ? "bg-blue-100 text-blue-800"
                            : booking.status === "completed"
                            ? "bg-forest-100 text-forest-800"
                            : booking.status === "declined" || booking.status.includes("cancelled")
                            ? "bg-red-100 text-red-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        ● {booking.status.replace(/_/g, " ")}
                      </span>
                    </div>

                    {/* Booking Lifecycle Stepper */}
                    <div className="py-2 border-b border-forest-100/70">
                      <StatusStepper status={booking.status} />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                      <div>
                        <span className="text-forest-400">Client Contact</span>
                        <p className="font-bold text-forest-950">{booking.clientPhone}</p>
                        <p className="text-forest-600">{booking.clientEmail}</p>
                      </div>
                      <div>
                        <span className="text-forest-400">Kitchen Address</span>
                        <p className="font-bold text-forest-950">{booking.address}</p>
                      </div>
                      <div>
                        <span className="text-forest-400">Your Net Earnings (85%)</span>
                        <p className="font-black text-forest-950 text-sm">
                          KES {Math.round(booking.totalPrice * 0.85).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Service Format & Ingredient Sourcing Instructions */}
                    <div className="p-3.5 rounded-2xl bg-cream-50/70 border border-forest-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs">
                      <div className="flex items-center gap-2.5">
                        <div className={`p-2 rounded-xl ${booking.serviceFormat === "delivery" ? "bg-amber-100 text-amber-900" : "bg-forest-100 text-forest-800"}`}>
                          {booking.serviceFormat === "delivery" ? <Truck className="h-4 w-4" /> : <Home className="h-4 w-4" />}
                        </div>
                        <div>
                          <span className="font-bold text-forest-950 block">
                            Format: {booking.serviceFormat === "delivery" ? "Cooked & Delivered Feast" : "In-Home Dining"}
                          </span>
                          <span className="text-[11px] text-forest-500">
                            {booking.serviceFormat === "delivery"
                              ? "Prepare in your certified kitchen, deliver hot in presentation platters"
                              : "Cook live in client's kitchen, plate courses, leave kitchen spotless"}
                          </span>
                        </div>
                      </div>

                      {booking.sourcingPreference === "client_specified" ? (
                        <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 flex items-start gap-2">
                          <Receipt className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-black text-[11px] block">
                              🛒 Client Supermarket Till: {booking.preferredStores || "Client Stores"}
                            </span>
                            <span className="text-[10px] text-amber-800 leading-snug">
                              Shop at the client&apos;s chosen supermarket on event day and share the store Till number for them to pay directly.
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex items-start gap-2">
                          <Receipt className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-black text-[11px] block">
                              🛒 Carrefour Sourcing & Till
                            </span>
                            <span className="text-[10px] text-emerald-800 leading-snug">
                              Source ingredients from Carrefour on event day and send the Till number for direct client payment.
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="pt-3 border-t border-forest-100 flex flex-wrap justify-between items-center gap-3">
                      <div className="text-xs text-forest-500">
                        {booking.status === "pending" && "Please accept or decline this reservation."}
                        {booking.status === "chef_accepted" && "Accepted — awaiting diner's full culinary fee payment in escrow."}
                        {booking.status === "confirmed" && "Paid in full in escrow. On event day, share supermarket Till with client for ingredients."}
                      </div>

                      <div className="flex gap-2">
                        {booking.status === "pending" && (
                          <>
                            <button
                              disabled={actionLoading}
                              onClick={() => setDecliningBookingId(booking.id)}
                              className="px-4 py-2 rounded-xl border border-red-200 text-red-700 hover:bg-red-50 text-xs font-bold"
                            >
                              Decline
                            </button>
                            <button
                              disabled={actionLoading}
                              onClick={() => handleAcceptBooking(booking.id)}
                              className="px-5 py-2 rounded-xl bg-forest-900 hover:bg-forest-800 text-white text-xs font-bold uppercase tracking-wider shadow-md"
                            >
                              Accept Booking ✓
                            </button>
                          </>
                        )}

                        {booking.status === "confirmed" && (
                          <button
                            onClick={() => handleMarkCompleted(booking.id)}
                            className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold"
                          >
                            Mark Service Completed ✓
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-12 text-center border border-forest-100 space-y-2">
                <ChefHat className="h-10 w-10 text-forest-400 mx-auto" />
                <h3 className="font-serif text-lg font-bold text-forest-950">No Bookings Yet</h3>
                <p className="text-xs text-forest-500">
                  New dinner requests from clients will appear here for your review and acceptance.
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: MENUS */}
        {activeTab === "menus" && (
          <div className="space-y-6 text-left">
            <h3 className="font-serif text-2xl font-bold text-forest-950">My Degustation Menus</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {menus.map((m) => (
                <div
                  key={m.id}
                  className="bg-white rounded-3xl p-6 border border-forest-100 shadow-sm space-y-3"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-bold text-champagne-700 bg-cream-100 px-2.5 py-0.5 rounded-full">
                        {m.tag || "Signature"}
                      </span>
                      <h4 className="font-serif text-xl font-bold text-forest-950 mt-1">{m.title}</h4>
                    </div>
                    <span className="font-black text-forest-950 text-sm">
                      KES {m.pricePerGuest.toLocaleString()} / guest
                    </span>
                  </div>
                  <p className="text-xs text-forest-600 leading-relaxed">{m.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: PROFILE, READINESS & KITCHEN PRIVACY */}
        {activeTab === "settings" && (
          <form onSubmit={handleSaveProfile} className="space-y-8 text-left">
            {/* Tab Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-forest-100">
              <div>
                <h3 className="font-serif text-2xl font-bold text-forest-950">
                  Profile Readiness & Service Settings
                </h3>
                <p className="text-xs text-forest-600 mt-1">
                  Manage your verification criteria, service format privacy, and marketplace go-live readiness.
                </p>
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="px-6 py-3 rounded-2xl bg-forest-900 hover:bg-forest-800 text-cream-50 font-black text-xs uppercase tracking-widest transition-all shadow-md flex items-center gap-2 self-start sm:self-auto disabled:opacity-50"
              >
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-champagne-400" />}
                <span>Save Profile Changes</span>
              </button>
            </div>

            {/* 1. PROFILE READINESS DETAILED CHECKLIST (13 CRITERIA) */}
            <div className="bg-white rounded-[32px] p-6 sm:p-8 border border-forest-100 shadow-sm space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-forest-500 block">
                    Readiness Audit Checklist
                  </span>
                  <h4 className="font-serif text-xl font-bold text-forest-950">
                    {readiness.percentage}% Profile Complete ({readiness.completedCount} / {readiness.totalCount} Done)
                  </h4>
                </div>
                <span className={`text-xs font-black px-3 py-1 rounded-full ${
                  readiness.canGoLive ? "bg-emerald-100 text-emerald-800 border border-emerald-200" : "bg-amber-100 text-amber-900 border border-amber-200"
                }`}>
                  {readiness.canGoLive ? "✓ Ready to Go Live" : `Needs +${97 - readiness.percentage}% to Go Live`}
                </span>
              </div>

              <p className="text-xs text-forest-600 leading-relaxed">
                Book A Chef mandates a strict 97% completion rate before chefs can publish live on the public directory. This protects dining standards, guarantees verified identity, and ensures clients see complete degustation menus.
              </p>

              {/* Checklist Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                {readiness.items.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3.5 rounded-2xl border flex items-start gap-3 transition-colors ${
                      item.completed
                        ? "bg-emerald-50/40 border-emerald-200/60 text-forest-950"
                        : "bg-amber-50/50 border-amber-200/80 text-amber-950"
                    }`}
                  >
                    <div className="mt-0.5">
                      {item.completed ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-amber-600" />
                      )}
                    </div>
                    <div className="space-y-0.5 flex-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold">{item.label}</span>
                        <span className={`text-[10px] font-black px-2 py-0.2 rounded-full ${
                          item.completed ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                        }`}>
                          +{item.weight}%
                        </span>
                      </div>
                      {!item.completed && (
                        <p className="text-[11px] text-amber-800 font-medium leading-snug">
                          {item.missingHint}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. KITCHEN PRIVACY & SERVICE FORMAT SELECTION */}
            <div className="bg-white rounded-[32px] p-6 sm:p-8 border border-forest-100 shadow-sm space-y-6">
              <div>
                <div className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-forest-500 mb-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-forest-700" />
                  Service Formats & Privacy Protection
                </div>
                <h4 className="font-serif text-xl font-bold text-forest-950">
                  Choose How Clients Experience Your Food
                </h4>
                <p className="text-xs text-forest-600 mt-1">
                  Restaurants and culinary teams often turn off In-Home Dining to maintain staff privacy and commercial kitchen operations.
                </p>
              </div>

              {/* Partner Type Selector */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-forest-500 block">
                  Partner Classification
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPartnerType("independent")}
                    className={`p-4 rounded-2xl border text-left transition-all ${
                      partnerType === "independent"
                        ? "border-forest-900 bg-forest-50/80 ring-2 ring-forest-900/20"
                        : "border-forest-100 hover:border-forest-200 bg-white"
                    }`}
                  >
                    <span className="font-bold text-xs text-forest-950 block">👨‍🍳 Independent Private Chef</span>
                    <span className="text-[11px] text-forest-500">Freelance culinary artisan or personal chef</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPartnerType("restaurant")}
                    className={`p-4 rounded-2xl border text-left transition-all ${
                      partnerType === "restaurant"
                        ? "border-forest-900 bg-forest-50/80 ring-2 ring-forest-900/20"
                        : "border-forest-100 hover:border-forest-200 bg-white"
                    }`}
                  >
                    <span className="font-bold text-xs text-forest-950 block">🏢 Restaurant / Kitchen Group</span>
                    <span className="text-[11px] text-forest-500">Listing commercial kitchen executive chefs</span>
                  </button>
                </div>
              </div>

              {partnerType === "restaurant" && (
                <div className="space-y-1 bg-cream-50 p-4 rounded-2xl border border-champagne-400/40">
                  <label className="text-[10px] font-black uppercase tracking-widest text-forest-500">
                    Restaurant / Establishment Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Talisman Karen, Seven Seafood, About Thyme"
                    value={restaurantName}
                    onChange={(e) => setRestaurantName(e.target.value)}
                    className="w-full bg-white border border-forest-100 rounded-xl px-4 py-2.5 font-bold text-forest-950 text-xs outline-none focus:ring-2 focus:ring-forest-900"
                  />
                </div>
              )}

              {/* Service Format Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {/* IN-HOME DINING TOGGLE */}
                <div className={`p-5 rounded-3xl border transition-all ${
                  allowInHome ? "border-forest-900/30 bg-forest-50/40" : "border-forest-100 bg-forest-50/20"
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-xl ${allowInHome ? "bg-forest-900 text-white" : "bg-forest-200 text-forest-600"}`}>
                        <Home className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="font-bold text-sm text-forest-950 block">In-Home Dining</span>
                        <span className="text-[10px] text-forest-500">Live cooking in client residence</span>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allowInHome}
                        onChange={(e) => {
                          if (!e.target.checked && !allowDelivery) {
                            alert("You must offer at least one service format (Fresh Delivery or In-Home).");
                            return;
                          }
                          setAllowInHome(e.target.checked);
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-forest-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-forest-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-forest-900"></div>
                    </label>
                  </div>
                  <p className="text-xs text-forest-600 leading-relaxed">
                    {allowInHome
                      ? "Enabled: Clients can book you to travel to their home or villa with full equipment and kitchen cleanup."
                      : "Disabled for Privacy: Chefs will NOT travel to client homes. Ideal for restaurant kitchens preserving chef privacy."}
                  </p>
                  {!allowInHome && (
                    <span className="inline-block mt-3 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                      🔒 In-Home Visits Disabled
                    </span>
                  )}
                </div>

                {/* COOKED & DELIVERED TOGGLE */}
                <div className={`p-5 rounded-3xl border transition-all ${
                  allowDelivery ? "border-forest-900/30 bg-forest-50/40" : "border-forest-100 bg-forest-50/20"
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-xl ${allowDelivery ? "bg-amber-600 text-white" : "bg-forest-200 text-forest-600"}`}>
                        <Truck className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="font-bold text-sm text-forest-950 block">Cooked & Delivered</span>
                        <span className="text-[10px] text-forest-500">Fresh thermal dispatch from kitchen</span>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allowDelivery}
                        onChange={(e) => {
                          if (!e.target.checked && !allowInHome) {
                            alert("You must offer at least one service format (Fresh Delivery or In-Home).");
                            return;
                          }
                          setAllowDelivery(e.target.checked);
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-forest-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-forest-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-forest-900"></div>
                    </label>
                  </div>
                  <p className="text-xs text-forest-600 leading-relaxed">
                    {allowDelivery
                      ? "Enabled: Clients can order courses prepared in your kitchen and delivered hot in thermal presentation platters."
                      : "Disabled: Clients cannot order delivery from this chef."}
                  </p>
                  {!allowInHome && allowDelivery && (
                    <span className="inline-block mt-3 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-200">
                      🛵 Fresh Delivery Exclusive Mode
                    </span>
                  )}
                </div>
              </div>

              {/* Status Preview Card */}
              <div className="p-4 rounded-2xl bg-cream-50 border border-forest-100 flex items-center justify-between text-xs">
                <span className="text-forest-600 font-medium">How clients see your booking options:</span>
                <span className="font-bold text-forest-950 bg-white px-3 py-1 rounded-xl border border-forest-200 shadow-2xs">
                  {!allowInHome && allowDelivery
                    ? "🛵 Fresh Delivery Only (Privacy Protected)"
                    : allowInHome && !allowDelivery
                    ? "🏡 In-Home Dining Only"
                    : "🏡 In-Home & 🛵 Fresh Delivery"}
                </span>
              </div>
            </div>

            {/* 3. IDENTITY VERIFICATION & SECURITY */}
            <div className="bg-white rounded-[32px] p-6 sm:p-8 border border-forest-100 shadow-sm space-y-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-forest-500 block">
                  Identity Verification
                </span>
                <h4 className="font-serif text-xl font-bold text-forest-950">
                  Government Identity Verification
                </h4>
                <p className="text-xs text-forest-600 mt-1">
                  National ID or Passport Number is required for executive vetting and diner peace of mind.
                </p>
              </div>

              <div className="max-w-md space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black uppercase tracking-widest text-forest-500">
                    National ID or Passport Number *
                  </label>
                  <span className="text-[10px] text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/80">
                    Verified ID
                  </span>
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g. 28941052 or A01948291"
                  value={nationalIdNumber}
                  onChange={(e) => setNationalIdNumber(e.target.value)}
                  className="w-full bg-cream-50 border border-forest-100 rounded-2xl px-4 py-3 font-bold text-forest-950 text-xs outline-none focus:ring-2 focus:ring-forest-900"
                />
                <p className="text-[11px] text-forest-500 italic">
                  Stored securely for Book A Chef identity verification.
                </p>
              </div>
            </div>

            {/* 4. BIO, RATES & CAPACITY */}
            <div className="bg-white rounded-[32px] p-6 sm:p-8 border border-forest-100 shadow-sm space-y-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-forest-500 block">
                  Culinary Profile & Rates
                </span>
                <h4 className="font-serif text-xl font-bold text-forest-950">
                  Bio, Philosophy & Guest Pricing
                </h4>
              </div>

              <div className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-forest-500">
                    Culinary Tagline *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Certified Master • Royal Swahili & Ocean-Fresh Seafood"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    className="w-full bg-cream-50 border border-forest-100 rounded-2xl px-4 py-3 font-bold text-forest-950 text-xs outline-none focus:ring-2 focus:ring-forest-900"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-forest-500">
                    Chef Bio & Experience (Minimum 50 characters) *
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Describe your culinary training, restaurant background, luxury catering experience..."
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full bg-cream-50 border border-forest-100 rounded-2xl p-4 text-forest-950 text-xs outline-none focus:ring-2 focus:ring-forest-900 resize-none font-medium leading-relaxed"
                  />
                  <span className="text-[10px] text-forest-400">
                    {bio.length} / 50 characters minimum {bio.length >= 50 && "✓"}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-forest-500">
                      Rate Per Guest (KES) *
                    </label>
                    <input
                      type="number"
                      min={1500}
                      step={100}
                      value={startingPrice}
                      onChange={(e) => setStartingPrice(Number(e.target.value))}
                      className="w-full bg-cream-50 border border-forest-100 rounded-2xl px-4 py-3 font-bold text-forest-950 text-xs outline-none focus:ring-2 focus:ring-forest-900"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-forest-500">
                      Min Guests
                    </label>
                    <input
                      type="number"
                      min={2}
                      max={10}
                      value={minGuests}
                      onChange={(e) => setMinGuests(Number(e.target.value))}
                      className="w-full bg-cream-50 border border-forest-100 rounded-2xl px-4 py-3 font-bold text-forest-950 text-xs outline-none focus:ring-2 focus:ring-forest-900"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-forest-500">
                      Max Guests
                    </label>
                    <input
                      type="number"
                      min={minGuests}
                      max={100}
                      value={maxGuests}
                      onChange={(e) => setMaxGuests(Number(e.target.value))}
                      className="w-full bg-cream-50 border border-forest-100 rounded-2xl px-4 py-3 font-bold text-forest-950 text-xs outline-none focus:ring-2 focus:ring-forest-900"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Save Bar */}
            <div className="flex items-center justify-between pt-4 pb-12">
              <span className="text-xs text-forest-500">
                All changes automatically recalculate your 97% readiness score.
              </span>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-8 py-4 rounded-2xl bg-forest-900 hover:bg-forest-800 text-cream-50 font-black text-xs uppercase tracking-widest transition-all shadow-xl flex items-center gap-2 disabled:opacity-50"
              >
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-champagne-400" />}
                <span>Save All Changes</span>
              </button>
            </div>
          </form>
        )}
      </main>

      {/* DECLINE MODAL */}
      {decliningBookingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-forest-950/80 backdrop-blur-md">
          <div className="bg-white rounded-[32px] max-w-md w-full p-6 space-y-4 border border-forest-100 text-left text-xs">
            <h3 className="font-serif text-xl font-bold text-forest-950">Decline Reservation</h3>
            <div className="space-y-1">
              <label className="font-bold text-forest-950">Reason for Declining</label>
              <textarea
                rows={2}
                required
                placeholder="e.g. Prior private engagement on this evening..."
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                className="w-full bg-cream-50 border border-forest-100 rounded-xl p-2.5 outline-none resize-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDecliningBookingId(null)}
                className="px-4 py-2 rounded-xl border border-forest-200 font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeclineBooking}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl bg-red-600 text-white font-bold"
              >
                Confirm Decline
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
