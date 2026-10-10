"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Calendar, Clock, MapPin, Users, LogOut, ChevronRight,
  ChefHat, Loader2, Phone, MessageSquare, Send, AlertCircle,
  XCircle, DollarSign, AlertTriangle, Home, Truck, Receipt, Star, Activity,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import StatusStepper from "@/components/booking/StatusStepper";
import { Booking, ChatMessage } from "@/utils/data";
import { createClient } from "@/utils/supabase/client";

export default function ClientDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"bookings" | "messages">("bookings");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedBookingForChat, setSelectedBookingForChat] = useState<Booking | null>(null);

  const [payingBooking, setPayingBooking] = useState<Booking | null>(null);
  const [paymentPhone, setPaymentPhone] = useState("");
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null);

  const [cancellingBooking, setCancellingBooking] = useState<Booking | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);

  const [reviewBooking, setReviewBooking] = useState<Booking | null>(null);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    async function initDashboard() {
      setLoading(true);
      try {
        const {
          data: { user: authUser },
          error: authErr,
        } = await supabase.auth.getUser();

        if (authErr || !authUser) {
          router.push("/login?redirect=/dashboard");
          return;
        }

        // This is the CUSTOMER surface. Admins and chefs have their own
        // consoles; showing them a bookings list they have no use for reads
        // as "no bookings yet", which is misleading. The middleware already
        // redirects, but client-side nav can render this page without ever
        // re-running it, so guard here too.
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", authUser.id)
          .maybeSingle();

        if (profile?.role === "admin") {
          router.replace("/admin");
          return;
        }
        if (profile?.role === "chef") {
          router.replace("/chef-dashboard");
          return;
        }

        setUser(authUser);
        setPaymentPhone(authUser.user_metadata?.phone || "");

        const { data: dbBookings } = await supabase
          .from("bookings")
          .select("*, chefs(name, brand_name, avatar_url)")
          .or(`client_id.eq.${authUser.id},client_email.eq.${authUser.email}`)
          .order("created_at", { ascending: false });

        if (dbBookings && dbBookings.length > 0) {
          const mapped: Booking[] = dbBookings.map((b: any) => ({
            id: b.id,
            chefId: b.chef_id,
            chefName: b.chefs?.name || "Finding your chef…",
            chefAvatar: b.chefs?.avatar_url,
            clientName: b.client_name || authUser.user_metadata?.full_name || "Client",
            clientEmail: b.client_email || authUser.email || "",
            clientPhone: b.client_phone || "",
            menuTitle: b.special_requests || "Signature Tasting Degustation",
            bookingDate: b.booking_date,
            bookingTime: b.booking_time,
            guestsCount: b.guests_count,
            totalPrice: Number(b.total_price),
            depositAmount: Number(b.deposit_amount),
            status: b.status,
            address: b.location_address,
            city: b.location_city || "Nairobi",
            specialRequests: b.special_requests,
            serviceFormat:
              b.service_format ||
              (b.special_requests?.includes("[Service: Cooked & Delivered]")
                ? "delivery"
                : "in_home"),
            sourcingPreference:
              b.sourcing_preference ||
              (b.special_requests?.includes("[Sourcing: Client Store:")
                ? "client_specified"
                : "chef_sourced"),
            preferredStores:
              b.preferred_stores ||
              b.special_requests?.match(/\[Sourcing: Client Store: ([^\]]+)\]/)?.[1] ||
              undefined,
            receiptVerified: b.receipt_verified ?? false,
            createdAt: b.created_at,
          }));
          setBookings(mapped);
          setSelectedBookingForChat(mapped[0]);
        }

        const { data: dbMessages } = await supabase
          .from("messages")
          .select("*")
          .or(`sender_id.eq.${authUser.id},recipient_id.eq.${authUser.id}`)
          .order("created_at", { ascending: true });

        if (dbMessages && dbMessages.length > 0) {
          setMessages(
            dbMessages.map((m: any) => ({
              id: m.id,
              bookingId: m.booking_id,
              senderId: m.sender_id,
              senderName: m.sender_name,
              senderRole: m.sender_role,
              recipientId: m.recipient_id,
              content: m.content,
              createdAt: m.created_at,
            }))
          );
        }
      } catch (err) {
        console.error("Dashboard initialization error:", err);
      } finally {
        setLoading(false);
      }
    }

    initDashboard();
  }, [supabase, router]);

  const handleInitiatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingBooking || !paymentPhone.trim()) return;

    setPaymentLoading(true);
    setPaymentMessage(null);

    try {
      const res = await fetch("/api/payments/mpesa/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking_id: payingBooking.id,
          phone_number: paymentPhone.trim(),
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setPaymentMessage(data.message);
        setBookings((prev) =>
          prev.map((b) =>
            b.id === payingBooking.id ? { ...b, status: "payment_pending" } : b
          )
        );
      } else {
        alert(data.error || "Failed to initiate payment. Please try again.");
      }
    } catch (err: any) {
      alert("Network error: " + err.message);
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!cancellingBooking) return;

    setCancelLoading(true);
    try {
      const res = await fetch(`/api/bookings/${cancellingBooking.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancelReason }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setBookings((prev) =>
          prev.map((b) =>
            b.id === cancellingBooking.id
              ? { ...b, status: "cancelled_by_customer" }
              : b
          )
        );
        setCancellingBooking(null);
      } else {
        alert(data.error || "Failed to cancel booking.");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setCancelLoading(false);
    }
  };

  const handleReviewSubmit = async () => {
    if (!reviewBooking) return;

    setReviewLoading(true);
    try {
      const res = await fetch("/api/reviews/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking_id: reviewBooking.id,
          rating,
          comment: reviewText,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setReviewBooking(null);
        setReviewText("");
      } else {
        alert(data.error || "Failed to submit review.");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setReviewLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !selectedBookingForChat) return;

    const payload = {
      booking_id: selectedBookingForChat.id.startsWith("bk_") ? null : selectedBookingForChat.id,
      sender_id: user.id,
      sender_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "Client",
      sender_role: "client",
      recipient_id: selectedBookingForChat.chefId.startsWith("c_") ? null : selectedBookingForChat.chefId,
      content: newMessage.trim(),
    };

    try {
      await supabase.from("messages").insert([payload]);
      setMessages((prev) => [
        ...prev,
        {
          id: `msg_${Date.now()}`,
          bookingId: selectedBookingForChat.id,
          senderId: user.id,
          senderName: payload.sender_name,
          senderRole: "client",
          recipientId: payload.recipient_id || "",
          content: newMessage.trim(),
          createdAt: new Date().toISOString(),
        },
      ]);
      setNewMessage("");
    } catch (err) {
      console.error("Message send error:", err);
    }
  };

  const statusBadge = (status: string) => {
    if (status === "confirmed")
      return "bg-emerald-100 text-emerald-800";
    if (status === "chef_accepted")
      return "bg-blue-100 text-blue-800";
    if (status === "payment_pending")
      return "bg-purple-100 text-purple-800";
    if (status === "completed")
      return "bg-cream-100 text-forest-700";
    if (status === "declined" || status.includes("cancelled"))
      return "bg-red-100 text-red-800";
    if (status === "pending_assignment")
      return "bg-amber-100 text-amber-800";
    return "bg-cream-100 text-forest-700";
  };

  const statusLabel = (status: string) => {
    const map: Record<string, string> = {
      pending_assignment: "Finding your chef",
      assigned: "Chef assigned",
      chef_accepted: "Awaiting payment",
      payment_pending: "Payment processing",
      confirmed: "Confirmed",
      en_route: "Chef en route",
      in_progress: "In progress",
      completed: "Completed",
      declined: "Declined",
      cancelled_by_customer: "Cancelled",
      cancelled_by_chef: "Cancelled by chef",
      expired: "Expired",
    };
    return map[status] || status.replace(/_/g, " ");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-cream-50 flex items-center justify-center">
        <Loader2 className="h-6 w-6 text-forest-950 animate-spin" />
      </div>
    );
  }

  const inputClass =
    "w-full px-4 py-3 rounded-xl bg-white border border-forest-200 text-sm font-medium text-forest-950 placeholder-forest-400 outline-none focus:border-forest-950 focus:ring-1 focus:ring-forest-950 transition-colors";

  return (
    <div className="min-h-screen bg-cream-50 text-forest-950 font-sans flex flex-col">
      <Navbar />

      <main className="max-w-4xl mx-auto w-full px-4 pt-24 pb-16 flex-1">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-forest-950 tracking-tight">
              {user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Welcome"}
            </h1>
            <p className="text-forest-500 text-sm mt-1">
              Your bookings and chef messages.
            </p>
          </div>
          <Link
            href="/request"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-forest-950 text-white text-sm font-medium hover:bg-forest-800 transition-colors shrink-0"
          >
            <ChefHat className="h-4 w-4" />
            Request a Chef
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-forest-100 mb-6">
          <button
            onClick={() => setActiveTab("bookings")}
            className={`px-1 py-3 mr-6 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "bookings"
                ? "border-forest-950 text-forest-950"
                : "border-transparent text-forest-500 hover:text-forest-800"
            }`}
          >
            Bookings ({bookings.length})
          </button>
          <button
            onClick={() => setActiveTab("messages")}
            className={`px-1 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "messages"
                ? "border-forest-950 text-forest-950"
                : "border-transparent text-forest-500 hover:text-forest-800"
            }`}
          >
            Messages
          </button>
        </div>

        {/* BOOKINGS TAB */}
        {activeTab === "bookings" && (
          <div className="space-y-4">
            {bookings.length > 0 ? (
              bookings.map((booking) => (
                <div
                  key={booking.id}
                  className="bg-white rounded-2xl border border-forest-100 p-6"
                >
                  <div className="flex items-start justify-between gap-4 mb-5">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative h-12 w-12 rounded-xl overflow-hidden bg-cream-100 shrink-0">
                        {booking.chefAvatar ? (
                          <Image src={booking.chefAvatar} alt={booking.chefName} fill className="object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <ChefHat className="h-5 w-5 text-forest-400" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-forest-950 truncate">
                          {booking.chefName}
                        </h3>
                        <p className="text-xs text-forest-500 truncate">
                          #{booking.id.slice(0, 8).toUpperCase()}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium ${statusBadge(booking.status)}`}
                    >
                      {statusLabel(booking.status)}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
                    <div>
                      <p className="text-[10px] font-medium text-forest-400 uppercase mb-1">
                        Date & Time
                      </p>
                      <p className="text-sm font-medium text-forest-950">
                        {booking.bookingDate}
                      </p>
                      <p className="text-xs text-forest-500">{booking.bookingTime}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-forest-400 uppercase mb-1">
                        Location
                      </p>
                      <p className="text-sm font-medium text-forest-950 truncate">
                        {booking.address}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-forest-400 uppercase mb-1">
                        Guests
                      </p>
                      <p className="text-sm font-medium text-forest-950">
                        {booking.guestsCount} guests
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-forest-400 uppercase mb-1">
                        Total
                      </p>
                      <p className="text-sm font-bold text-forest-950">
                        KES {booking.totalPrice.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Status message */}
                  <div className="mb-5">
                    {booking.status === "pending_assignment" && (
                      <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200">
                        <Loader2 className="h-4 w-4 text-amber-600 shrink-0 mt-0.5 animate-spin" />
                        <p className="text-xs text-amber-900">
                          Finding your chef. We&apos;ll notify you on WhatsApp as soon as
                          someone accepts.
                        </p>
                      </div>
                    )}
                    {booking.status === "chef_accepted" && (
                      <div className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-50 border border-blue-200">
                        <AlertCircle className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                        <p className="text-xs text-blue-900">
                          Chef accepted. Complete payment to confirm your booking.
                        </p>
                      </div>
                    )}
                    {booking.status === "confirmed" && (
                      <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                        <Calendar className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                        <p className="text-xs text-emerald-900">
                          Confirmed and paid in full. Your chef will share the store Till
                          on event day.
                        </p>
                      </div>
                    )}
                    {booking.status === "completed" && (
                      <div className="flex items-start gap-2.5 p-3 rounded-xl bg-cream-100 border border-forest-200">
                        <Star className="h-4 w-4 text-forest-600 shrink-0 mt-0.5" />
                        <p className="text-xs text-forest-800">
                          Event complete. Leave a review to help other diners.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 pt-4 border-t border-forest-100">
                    {(booking.status === "chef_accepted" || booking.status === "pending") && (
                      <button
                        onClick={() => {
                          setPayingBooking(booking);
                          setPaymentMessage(null);
                        }}
                        className="px-4 py-2.5 rounded-xl bg-forest-950 text-white text-sm font-medium hover:bg-forest-800 transition-colors flex items-center gap-2"
                      >
                        <DollarSign className="h-4 w-4" />
                        Pay KES {booking.totalPrice.toLocaleString()}
                      </button>
                    )}

                    {booking.status === "completed" && (
                      <button
                        onClick={() => setReviewBooking(booking)}
                        className="px-4 py-2.5 rounded-xl bg-forest-950 text-white text-sm font-medium hover:bg-forest-800 transition-colors flex items-center gap-2"
                      >
                        <Star className="h-4 w-4" />
                        Leave a review
                      </button>
                    )}

                    {/* Deep link into the live dispatcher — always available,
                        regardless of whether a chef is assigned yet. */}
                    <Link
                      href={`/request/status?ref=${booking.id}`}
                      className="px-4 py-2.5 rounded-xl border border-forest-200 text-forest-700 text-sm font-medium hover:bg-cream-50 transition-colors flex items-center gap-2"
                    >
                      <Activity className="h-4 w-4" />
                      Track live
                    </Link>

                    {booking.chefId && (
                      <button
                        onClick={() => {
                          setSelectedBookingForChat(booking);
                          setActiveTab("messages");
                        }}
                        className="px-4 py-2.5 rounded-xl border border-forest-200 text-forest-700 text-sm font-medium hover:bg-cream-50 transition-colors flex items-center gap-2"
                      >
                        <MessageSquare className="h-4 w-4" />
                        Message chef
                      </button>
                    )}

                    {booking.chefId && (
                      <a
                        href={`https://wa.me/254786530713?text=${encodeURIComponent(
                          `Hi! I'm following up on booking #${booking.id.slice(0, 8).toUpperCase()}.`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2.5 rounded-xl border border-forest-200 text-forest-700 text-sm font-medium hover:bg-cream-50 transition-colors flex items-center gap-2"
                      >
                        <Phone className="h-4 w-4" />
                        WhatsApp
                      </a>
                    )}

                    {!booking.status.includes("cancelled") &&
                      booking.status !== "declined" &&
                      booking.status !== "completed" &&
                      booking.status !== "pending_assignment" && (
                        <button
                          onClick={() => setCancellingBooking(booking)}
                          className="px-4 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white rounded-2xl border border-forest-100 p-12 text-center">
                <div className="w-14 h-14 rounded-2xl bg-cream-100 flex items-center justify-center mx-auto mb-4">
                  <ChefHat className="h-6 w-6 text-forest-400" />
                </div>
                <h3 className="text-lg font-bold text-forest-950 mb-1">No bookings yet</h3>
                <p className="text-sm text-forest-500 mb-6 max-w-sm mx-auto">
                  Request a chef and we&apos;ll match you with the perfect one.
                </p>
                <Link
                  href="/request"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-forest-950 text-white text-sm font-medium hover:bg-forest-800 transition-colors"
                >
                  <ChefHat className="h-4 w-4" />
                  Request a Chef
                </Link>
              </div>
            )}
          </div>
        )}

        {/* MESSAGES TAB */}
        {activeTab === "messages" && (
          <div className="bg-white rounded-2xl border border-forest-100">
            {/* Booking selector */}
            {bookings.length > 0 && (
              <div className="border-b border-forest-100 p-4">
                <select
                  value={selectedBookingForChat?.id || ""}
                  onChange={(e) =>
                    setSelectedBookingForChat(
                      bookings.find((b) => b.id === e.target.value) || null
                    )
                  }
                  className="w-full px-4 py-2.5 rounded-xl bg-cream-50 border border-forest-200 text-sm font-medium text-forest-950 outline-none focus:border-forest-950 transition-colors"
                >
                  {bookings.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.chefName} — {b.bookingDate}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Messages */}
            <div className="max-h-[420px] overflow-y-auto p-4 space-y-3">
              {messages.length > 0 ? (
                messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex ${
                      m.senderRole === "client" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                        m.senderRole === "client"
                          ? "bg-forest-950 text-white rounded-br-md"
                          : "bg-cream-100 text-forest-950 rounded-bl-md"
                      }`}
                    >
                      {m.senderRole !== "client" && (
                        <span className="block text-[10px] font-medium text-forest-500 mb-0.5">
                          {m.senderName}
                        </span>
                      )}
                      {m.content}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-forest-400 text-sm py-12">
                  No messages yet.
                </p>
              )}
            </div>

            {/* Input */}
            <form onSubmit={handleSendMessage} className="border-t border-forest-100 p-4 flex gap-2">
              <input
                type="text"
                placeholder="Write a message…"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="flex-1 px-4 py-3 rounded-xl bg-cream-50 border border-forest-200 text-sm outline-none focus:border-forest-950 transition-colors"
              />
              <button
                type="submit"
                disabled={!newMessage.trim()}
                className="px-4 py-3 rounded-xl bg-forest-950 text-white hover:bg-forest-800 transition-colors disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        )}
      </main>

      {/* PAYMENT MODAL */}
      {payingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-forest-950/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-5">
              <div>
                <p className="text-xs font-medium text-forest-500 mb-1">Payment</p>
                <h3 className="text-xl font-bold text-forest-950">
                  KES {payingBooking.totalPrice.toLocaleString()}
                </h3>
              </div>
              <button
                onClick={() => setPayingBooking(null)}
                className="w-8 h-8 rounded-full hover:bg-cream-100 flex items-center justify-center text-forest-500"
              >
                ✕
              </button>
            </div>

            {paymentMessage ? (
              <div className="text-center py-6">
                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                  <Calendar className="h-6 w-6 text-emerald-600" />
                </div>
                <p className="text-sm font-medium text-forest-950 mb-4">{paymentMessage}</p>
                <button
                  onClick={() => setPayingBooking(null)}
                  className="w-full py-3 rounded-xl bg-forest-950 text-white text-sm font-medium"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleInitiatePayment} className="space-y-4">
                <div className="p-4 rounded-xl bg-cream-50 border border-forest-100">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-forest-500">Chef</span>
                    <span className="font-medium text-forest-950">{payingBooking.chefName}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-3">
                    <span className="text-forest-500">Date</span>
                    <span className="font-medium text-forest-950">{payingBooking.bookingDate}</span>
                  </div>
                  <div className="flex justify-between text-sm pt-3 border-t border-forest-100">
                    <span className="font-bold text-forest-950">Total (escrow)</span>
                    <span className="font-bold text-forest-950">
                      KES {payingBooking.totalPrice.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-forest-950 mb-1.5">
                    M-Pesa phone number
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="0712 345 678"
                    value={paymentPhone}
                    onChange={(e) => setPaymentPhone(e.target.value)}
                    className={inputClass}
                  />
                  <p className="text-xs text-forest-500 mt-1.5">
                    You&apos;ll get a prompt to enter your PIN.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={paymentLoading}
                  className="w-full py-3.5 rounded-xl bg-forest-950 text-white text-sm font-medium hover:bg-forest-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {paymentLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <DollarSign className="h-4 w-4" />
                      Send payment request
                    </>
                  )}
                </button>

                <p className="text-xs text-forest-400 leading-relaxed">
                  Groceries are not included. On event day your chef shops and
                  shares the store Till for you to pay directly.
                </p>
              </form>
            )}
          </div>
        </div>
      )}

      {/* CANCELLATION MODAL */}
      {cancellingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-forest-950/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-forest-950 mb-2">Cancel booking?</h3>
            <p className="text-sm text-forest-500 mb-5">
              Your reservation with <strong>{cancellingBooking.chefName}</strong> on{" "}
              {cancellingBooking.bookingDate} will be cancelled.
            </p>

            <div className="mb-5">
              <label className="block text-sm font-medium text-forest-950 mb-1.5">
                Reason (optional)
              </label>
              <textarea
                rows={2}
                placeholder="Let us know why…"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className={inputClass + " resize-none"}
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setCancellingBooking(null)}
                className="flex-1 py-3 rounded-xl border border-forest-200 text-sm font-medium text-forest-700 hover:bg-cream-50 transition-colors"
              >
                Keep booking
              </button>
              <button
                disabled={cancelLoading}
                onClick={handleCancelBooking}
                className="flex-1 py-3 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {cancelLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Cancel booking"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REVIEW MODAL */}
      {reviewBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-forest-950/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-forest-950 mb-1">
              Review {reviewBooking.chefName}
            </h3>
            <p className="text-sm text-forest-500 mb-5">
              Your review is verified and published.
            </p>

            <div className="mb-5">
              <label className="block text-sm font-medium text-forest-950 mb-2">Rating</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      className={`h-7 w-7 ${
                        rating >= star
                          ? "fill-champagne-400 text-champagne-400"
                          : "text-forest-200"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-5">
              <label className="block text-sm font-medium text-forest-950 mb-1.5">
                Your feedback
              </label>
              <textarea
                rows={3}
                required
                placeholder="How was the food, service, and experience?"
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                className={inputClass + " resize-none"}
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setReviewBooking(null)}
                className="flex-1 py-3 rounded-xl border border-forest-200 text-sm font-medium text-forest-700 hover:bg-cream-50 transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={reviewLoading || !reviewText.trim()}
                onClick={handleReviewSubmit}
                className="flex-1 py-3 rounded-xl bg-forest-950 text-white text-sm font-medium hover:bg-forest-800 transition-colors disabled:opacity-50"
              >
                {reviewLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Publish"}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}