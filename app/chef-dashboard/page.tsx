"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Calendar, Clock, MapPin, Users, ChevronRight,
  ChefHat, Loader2, Phone, AlertCircle, Star, Home, Truck, Receipt,
  CheckCircle2, Settings, ShieldCheck, Lock, Sparkles, XCircle,
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
          router.push("/login?role=chef");
          return;
        }

        const { data: chefRecord } = await supabase
          .from("chefs")
          .select("*, menus(*)")
          .or(`user_id.eq.${user.id},email.eq.${user.email}`)
          .single();

        if (!chefRecord) {
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
        }

        const activeChef = chefRecord || INITIAL_CHEFS[0];
        if (activeChef) {
          setChef(activeChef);
          setMenus(activeChef.menus || []);
          setNationalIdNumber(
            activeChef.national_id_number || activeChef.nationalIdNumber || ""
          );
          setAllowInHome(activeChef.allow_in_home ?? true);
          setAllowDelivery(activeChef.allow_delivery ?? true);
          setBio(activeChef.bio || "");
          setTagline(activeChef.tagline || "");
          setStartingPrice(Number(activeChef.price_per_guest) || 4500);
          setMinGuests(activeChef.min_guests || 2);
          setMaxGuests(activeChef.max_guests || 30);
          setIsLive(activeChef.is_available ?? false);
        }

        // Fetch assigned bookings
        const chefId = chefRecord?.id;
        if (chefId) {
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
                serviceFormat: b.service_format || "in_home",
                sourcingPreference: b.sourcing_preference || "chef_sourced",
                preferredStores: b.preferred_stores || undefined,
                receiptVerified: b.receipt_verified ?? false,
                createdAt: b.created_at,
              }))
            );
          }
        }

        // Fetch unassigned dispatch requests
        const { data: openRequests } = await supabase
          .from("bookings")
          .select("*")
          .eq("status", "pending_assignment")
          .is("chef_id", null)
          .order("created_at", { ascending: false })
          .limit(20);

        if (openRequests && openRequests.length > 0) {
          const mappedOpen: Booking[] = openRequests.map((b: any) => ({
            id: b.id,
            chefId: b.chef_id || "unassigned",
            chefName: "Open Request",
            clientName: b.client_name,
            clientEmail: b.client_email,
            clientPhone: b.client_phone,
            menuTitle: b.special_requests || "Custom Request",
            bookingDate: b.booking_date,
            bookingTime: b.booking_time,
            guestsCount: b.guests_count,
            totalPrice: Number(b.total_price),
            depositAmount: Number(b.deposit_amount),
            status: "pending_assignment",
            address: b.location_address,
            city: b.location_city || "Nairobi",
            specialRequests: b.special_requests,
            serviceFormat: b.service_format || "in_home",
            sourcingPreference: b.sourcing_preference || "chef_sourced",
            preferredStores: b.preferred_stores || undefined,
            receiptVerified: b.receipt_verified ?? false,
            createdAt: b.created_at,
          }));
          setBookings((prev) => [...mappedOpen, ...prev]);
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
      const res = await fetch(`/api/bookings/${bookingId}/accept`, { method: "POST" });
      const data = await res.json();
      if (res.ok && data.success) {
        setBookings((prev) =>
          prev.map((b) =>
            b.id === bookingId ? { ...b, status: "chef_accepted", chefId: chef?.id || b.chefId } : b
          )
        );
      } else {
        alert(data.error || "Failed to accept booking.");
      }
    } catch (e: any) {
      alert("Error: " + e.message);
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
        setBookings((prev) =>
          prev.map((b) =>
            b.id === decliningBookingId
              ? { ...b, status: data.status || "declined", chefId: "unassigned" }
              : b
          )
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
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          review_eligible: true,
        })
        .eq("id", bookingId);

      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status: "completed" } : b))
      );
    } catch (e: any) {
      alert("Error: " + e.message);
    }
  };

  const readiness: ProfileReadinessResult = calculateProfileReadiness({
    name: chef?.name,
    phone: chef?.phone,
    nationalIdNumber,
    avatar: chef?.avatar_url || chef?.avatar,
    coverImage: chef?.cover_image_url || chef?.coverImage,
    gallery: chef?.gallery_images || chef?.gallery,
    brand: chef?.brand_name || chef?.brand,
    tagline,
    partnerType: "independent",
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
      setSaveError(
        `Cannot go live: ${readiness.percentage}% complete. 97% required.`
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
        nextLive ? "You're live and receiving dispatch requests." : "You're now offline."
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

  if (loading) {
    return (
      <div className="min-h-screen bg-cream-50 flex items-center justify-center">
        <Loader2 className="h-6 w-6 text-forest-950 animate-spin" />
      </div>
    );
  }

  if (underReview) {
    return (
      <div className="min-h-screen bg-cream-50 text-forest-950 font-sans flex flex-col">
        <Navbar />
        <main className="max-w-md mx-auto w-full px-4 pt-32 pb-20 flex-1 flex items-center">
          <div className="bg-white rounded-2xl border border-forest-100 p-8 text-center w-full">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-4">
              <Clock className="h-6 w-6 text-amber-700" />
            </div>
            <p className="text-xs font-medium text-amber-700 mb-2">Application under review</p>
            <h1 className="text-2xl font-bold text-forest-950 mb-2">
              Welcome, {chef?.name || "Chef"}
            </h1>
            <p className="text-sm text-forest-500 mb-6">
              We&apos;re reviewing your application. You&apos;ll get a WhatsApp message once approved.
            </p>
            <Link
              href="/"
              className="inline-block px-6 py-3 rounded-xl bg-forest-950 text-white text-sm font-medium"
            >
              Back to home
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const openRequests = bookings.filter((b) => b.status === "pending_assignment");
  const activeBookings = bookings.filter((b) => b.status !== "pending_assignment");
  const completedBookings = bookings.filter(
    (b) => b.status === "confirmed" || b.status === "completed"
  );
  const totalEarned = completedBookings.reduce((sum, b) => sum + b.totalPrice * 0.85, 0);

  const inputClass =
    "w-full px-4 py-3 rounded-xl bg-white border border-forest-200 text-sm font-medium text-forest-950 placeholder-forest-400 outline-none focus:border-forest-950 focus:ring-1 focus:ring-forest-950 transition-colors";

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
      assigned: "Assigned",
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
              {chef?.avatar_url ? (
                <Image src={chef.avatar_url} alt={chef?.name} fill className="object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center">
                  <ChefHat className="h-6 w-6 text-forest-400" />
                </div>
              )}
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-forest-950 tracking-tight">
                {chef?.name || "Chef"}
              </h1>
              <p className="text-sm text-forest-500">{tagline || "Private Chef"}</p>
            </div>
          </div>

          {/* Live toggle */}
          <button
            onClick={handleToggleLiveStatus}
            disabled={!readiness.canGoLive || actionLoading}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shrink-0 ${
              !readiness.canGoLive
                ? "bg-cream-100 text-forest-400 cursor-not-allowed border border-forest-200"
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
            <p className="text-[10px] font-medium text-forest-400 uppercase mb-1">Earnings</p>
            <p className="text-lg sm:text-xl font-bold text-forest-950">
              KES {Math.round(totalEarned).toLocaleString()}
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-forest-100 p-4">
            <p className="text-[10px] font-medium text-forest-400 uppercase mb-1">Active</p>
            <p className="text-lg sm:text-xl font-bold text-forest-950">
              {bookings.filter((b) => b.status === "confirmed" || b.status === "chef_accepted").length}
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-forest-100 p-4">
            <p className="text-[10px] font-medium text-forest-400 uppercase mb-1">Open requests</p>
            <p className="text-lg sm:text-xl font-bold text-amber-600">
              {openRequests.length}
            </p>
          </div>
        </div>

        {/* Readiness bar */}
        <div className="bg-white rounded-2xl border border-forest-100 p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-medium text-forest-950">Profile readiness</p>
              <p className="text-xs text-forest-500">
                {readiness.completedCount} of {readiness.totalCount} criteria complete
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
            Requests ({bookings.length})
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
            {/* Open requests — dispatch board */}
            {openRequests.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="text-sm font-bold text-forest-950">Available requests</h2>
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-medium">
                    {openRequests.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {openRequests.map((booking) => (
                    <div
                      key={booking.id}
                      className="bg-white rounded-2xl border border-amber-200 p-5"
                    >
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div>
                          <p className="font-bold text-forest-950">{booking.clientName}</p>
                          <p className="text-xs text-forest-500">
                            {booking.bookingDate} at {booking.bookingTime} •{" "}
                            {booking.guestsCount} guests
                          </p>
                        </div>
                        <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[11px] font-medium shrink-0">
                          {statusLabel(booking.status)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
                        <div>
                          <p className="text-[10px] font-medium text-forest-400 uppercase mb-1">Location</p>
                          <p className="text-sm font-medium text-forest-950 truncate">
                            {booking.address}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-medium text-forest-400 uppercase mb-1">
                            Format
                          </p>
                          <p className="text-sm font-medium text-forest-950">
                            {booking.serviceFormat === "delivery" ? "Delivery" : "In-home"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-medium text-forest-400 uppercase mb-1">
                            Your earnings
                          </p>
                          <p className="text-sm font-bold text-forest-950">
                            KES {Math.round(booking.totalPrice * 0.85).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {booking.specialRequests && (
                        <div className="mb-4 p-3 rounded-xl bg-cream-50 border border-forest-100">
                          <p className="text-xs text-forest-700">{booking.specialRequests}</p>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <button
                          onClick={() => setDecliningBookingId(booking.id)}
                          className="px-4 py-2.5 rounded-xl border border-forest-200 text-sm font-medium text-forest-700 hover:bg-cream-50 transition-colors"
                        >
                          Pass
                        </button>
                        <button
                          disabled={actionLoading}
                          onClick={() => handleAcceptBooking(booking.id)}
                          className="flex-1 px-4 py-2.5 rounded-xl bg-forest-950 text-white text-sm font-medium hover:bg-forest-800 transition-colors disabled:opacity-50"
                        >
                          {actionLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Accept request"
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Active bookings */}
            {activeBookings.length > 0 && (
              <section>
                <h2 className="text-sm font-bold text-forest-950 mb-3">Your bookings</h2>
                <div className="space-y-3">
                  {activeBookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="bg-white rounded-2xl border border-forest-100 p-5"
                    >
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div>
                          <p className="font-bold text-forest-950">{booking.clientName}</p>
                          <p className="text-xs text-forest-500">
                            {booking.bookingDate} at {booking.bookingTime} •{" "}
                            {booking.guestsCount} guests
                          </p>
                        </div>
                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-medium shrink-0 ${statusBadge(booking.status)}`}
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
                            KES {Math.round(booking.totalPrice * 0.85).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-4 border-t border-forest-100">
                        <a
                          href={`https://wa.me/${booking.clientPhone?.replace(/[^0-9]/g, "") || ""}?text=${encodeURIComponent(
                            `Hi ${booking.clientName}! This is your chef for booking #${booking.id.slice(0, 8).toUpperCase()} on ${booking.bookingDate}.`
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
                            className="px-4 py-2.5 rounded-xl bg-forest-950 text-white text-sm font-medium hover:bg-forest-800 transition-colors"
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

            {bookings.length === 0 && (
              <div className="bg-white rounded-2xl border border-forest-100 p-12 text-center">
                <div className="w-14 h-14 rounded-2xl bg-cream-100 flex items-center justify-center mx-auto mb-4">
                  <ChefHat className="h-6 w-6 text-forest-400" />
                </div>
                <h3 className="text-lg font-bold text-forest-950 mb-1">No requests yet</h3>
                <p className="text-sm text-forest-500">
                  Go online to start receiving dispatch requests.
                </p>
              </div>
            )}
          </div>
        )}

        {/* MENUS TAB */}
        {activeTab === "menus" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {menus.map((m) => (
              <div key={m.id} className="bg-white rounded-2xl border border-forest-100 p-5">
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
              <p className="text-forest-400 text-sm col-span-full py-8 text-center">
                No menus yet.
              </p>
            )}
          </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === "settings" && (
          <form onSubmit={handleSaveProfile} className="space-y-6">
            {/* Identity */}
            <section className="bg-white rounded-2xl border border-forest-100 p-6">
              <h2 className="text-lg font-bold text-forest-950 mb-1">Identity verification</h2>
              <p className="text-sm text-forest-500 mb-5">
                Required for chef vetting and client trust.
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

            {/* Service formats */}
            <section className="bg-white rounded-2xl border border-forest-100 p-6">
              <h2 className="text-lg font-bold text-forest-950 mb-1">Service formats</h2>
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
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    allowInHome
                      ? "border-forest-950 bg-forest-950 text-white"
                      : "border-forest-200 hover:border-forest-400"
                  }`}
                >
                  <Home
                    className={`h-5 w-5 mb-2 ${
                      allowInHome ? "text-champagne-400" : "text-forest-400"
                    }`}
                  />
                  <span
                    className={`block text-sm font-bold ${
                      allowInHome ? "text-white" : "text-forest-950"
                    }`}
                  >
                    In-home dining
                  </span>
                  <span
                    className={`text-xs ${
                      allowInHome ? "text-cream-200" : "text-forest-500"
                    }`}
                  >
                    Cook in client&apos;s home
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!allowDelivery && allowInHome) return;
                    setAllowDelivery(!allowDelivery);
                  }}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    allowDelivery
                      ? "border-forest-950 bg-forest-950 text-white"
                      : "border-forest-200 hover:border-forest-400"
                  }`}
                >
                  <Truck
                    className={`h-5 w-5 mb-2 ${
                      allowDelivery ? "text-champagne-400" : "text-forest-400"
                    }`}
                  />
                  <span
                    className={`block text-sm font-bold ${
                      allowDelivery ? "text-white" : "text-forest-950"
                    }`}
                  >
                    Cooked &amp; delivered
                  </span>
                  <span
                    className={`text-xs ${
                      allowDelivery ? "text-cream-200" : "text-forest-500"
                    }`}
                  >
                    Hot delivery
                  </span>
                </button>
              </div>
            </section>

            {/* Profile */}
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
                  <label className="block text-sm font-medium text-forest-950 mb-1.5">Bio</label>
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

            {/* Rates */}
            <section className="bg-white rounded-2xl border border-forest-100 p-6">
              <h2 className="text-lg font-bold text-forest-950 mb-5">Rates & capacity</h2>
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
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
            </button>
          </form>
        )}
      </main>

      {/* DECLINE MODAL */}
      {decliningBookingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-forest-950/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-forest-950 mb-2">Pass on this request?</h3>
            <p className="text-sm text-forest-500 mb-5">
              We&apos;ll send it to another available chef.
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
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Pass"}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}