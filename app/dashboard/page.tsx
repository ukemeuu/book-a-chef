"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Utensils,
  LogOut,
  ChevronRight,
  ChefHat,
  Loader2,
  Sparkles,
  Phone,
  MessageSquare,
  ShieldCheck,
  CheckCircle2,
  Receipt,
  Star,
  Send,
  AlertCircle,
  XCircle,
  DollarSign,
  AlertTriangle,
  Home,
  Truck,
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

  // Payment modal state
  const [payingBooking, setPayingBooking] = useState<Booking | null>(null);
  const [paymentPhone, setPaymentPhone] = useState("");
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null);

  // Cancellation modal state
  const [cancellingBooking, setCancellingBooking] = useState<Booking | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);

  // Review modal state
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
          router.push("/login?role=client&message=Please sign in to view your dining reservations.");
          return;
        }

        setUser(authUser);
        setPaymentPhone(authUser.user_metadata?.phone || "");

        // Fetch user's bookings from Supabase
        const { data: dbBookings, error: bErr } = await supabase
          .from("bookings")
          .select("*, chefs(name, brand_name, avatar_url)")
          .or(`client_id.eq.${authUser.id},client_email.eq.${authUser.email}`)
          .order("created_at", { ascending: false });

        if (dbBookings && dbBookings.length > 0) {
          const mapped: Booking[] = dbBookings.map((b: any) => ({
            id: b.id,
            chefId: b.chef_id,
            chefName: b.chefs?.name || "Private Chef",
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
            serviceFormat: b.service_format || (b.special_requests?.includes("[Service: Cooked & Delivered]") ? "delivery" : "in_home"),
            sourcingPreference: b.sourcing_preference || (b.special_requests?.includes("[Sourcing: Client Store:") ? "client_specified" : "chef_sourced"),
            preferredStores: b.preferred_stores || (b.special_requests?.match(/\[Sourcing: Client Store: ([^\]]+)\]/)?.[1] || undefined),
            receiptVerified: b.receipt_verified ?? false,
            createdAt: b.created_at,
          }));
          setBookings(mapped);
          setSelectedBookingForChat(mapped[0]);
        }

        // Fetch real messages
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
        // Refresh bookings
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

  const handleCancelBooking = async (e: React.FormEvent) => {
    e.preventDefault();
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
        alert(data.message);
        setBookings((prev) =>
          prev.map((b) =>
            b.id === cancellingBooking.id ? { ...b, status: "cancelled_by_customer" } : b
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

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        alert("Thank you! Your verified review has been published.");
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

  if (loading) {
    return (
      <div className="min-h-screen bg-cream-50 flex flex-col justify-center items-center">
        <Loader2 className="h-10 w-10 text-forest-900 animate-spin mb-3" />
        <p className="text-xs font-bold uppercase tracking-widest text-forest-600">
          Loading your dining reservations...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream-50 text-forest-950 font-sans flex flex-col">
      <Navbar />

      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-28 pb-20 flex-1">
        {/* Header Banner */}
        <div className="bg-forest-950 text-cream-100 rounded-[36px] p-6 sm:p-10 shadow-xl mb-10 border border-forest-900 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-1 text-left">
            <span className="text-[10px] font-black uppercase tracking-widest text-champagne-400">
              Diner Dashboard
            </span>
            <h1 className="font-serif text-2xl sm:text-4xl font-bold text-white tracking-tight">
              Welcome, {user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Guest"}
            </h1>
            <p className="text-xs text-forest-300">
              Manage your in-home dining reservations, M-Pesa escrow deposits, and chef communications.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/chefs"
              className="px-5 py-3 rounded-2xl bg-champagne-400 hover:bg-champagne-300 text-forest-950 text-xs font-black uppercase tracking-wider shadow-lg transition-all"
            >
              + Book Another Chef
            </Link>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-forest-100 pb-3 mb-8">
          <button
            onClick={() => setActiveTab("bookings")}
            className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
              activeTab === "bookings"
                ? "bg-forest-900 text-white shadow-sm"
                : "bg-white text-forest-700 hover:bg-forest-50 border border-forest-100"
            }`}
          >
            My Reservations ({bookings.length})
          </button>
          <button
            onClick={() => setActiveTab("messages")}
            className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
              activeTab === "messages"
                ? "bg-forest-900 text-white shadow-sm"
                : "bg-white text-forest-700 hover:bg-forest-50 border border-forest-100"
            }`}
          >
            Chef Messages
          </button>
        </div>

        {/* TAB 1: BOOKINGS LIST */}
        {activeTab === "bookings" && (
          <div className="space-y-6 text-left">
            {bookings.length > 0 ? (
              <div className="grid grid-cols-1 gap-6">
                {bookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="bg-white rounded-[32px] p-6 sm:p-8 border border-forest-100 shadow-sm space-y-6 flex flex-col justify-between"
                  >
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-forest-100">
                      <div className="flex items-center gap-4">
                        <div className="relative h-14 w-14 rounded-2xl overflow-hidden bg-forest-100 shrink-0 border border-forest-200">
                          {booking.chefAvatar ? (
                            <Image
                              src={booking.chefAvatar}
                              alt={booking.chefName}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-forest-800">
                              <ChefHat className="h-6 w-6" />
                            </div>
                          )}
                        </div>
                        <div>
                          <h3 className="font-serif text-xl font-bold text-forest-950">
                            {booking.chefName}
                          </h3>
                          <p className="text-xs text-forest-600 font-medium">{booking.menuTitle}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${
                            booking.status === "confirmed"
                              ? "bg-emerald-100 text-emerald-800"
                              : booking.status === "chef_accepted"
                              ? "bg-blue-100 text-blue-800"
                              : booking.status === "payment_pending"
                              ? "bg-purple-100 text-purple-800"
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
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                      <div className="space-y-1">
                        <span className="text-forest-400 font-medium">Date & Time</span>
                        <p className="font-bold text-forest-950">
                          {booking.bookingDate} at {booking.bookingTime}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-forest-400 font-medium">Location</span>
                        <p className="font-bold text-forest-950 truncate">{booking.address}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-forest-400 font-medium">Guests</span>
                        <p className="font-bold text-forest-950">{booking.guestsCount} Guests</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-forest-400 font-medium">Culinary Fee (Paid in Full)</span>
                        <p className="font-black text-forest-950">
                          KES {booking.totalPrice.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Service Format & Verified Sourcing Breakdown */}
                    <div className="p-4 rounded-2xl bg-cream-50/70 border border-forest-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${booking.serviceFormat === "delivery" ? "bg-amber-100 text-amber-900" : "bg-forest-100 text-forest-800"}`}>
                          {booking.serviceFormat === "delivery" ? <Truck className="h-4 w-4" /> : <Home className="h-4 w-4" />}
                        </div>
                        <div>
                          <span className="font-bold text-forest-950 block">
                            {booking.serviceFormat === "delivery" ? "Cooked & Delivered Feast" : "In-Home Private Chef"}
                          </span>
                          <span className="text-[11px] text-forest-500">
                            {booking.serviceFormat === "delivery"
                              ? "Prepared at chef's certified kitchen, delivered hot in thermal presentation platters"
                              : "Chef cooks in your kitchen, provides table service & full kitchen cleanup"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-forest-100">
                        {booking.sourcingPreference === "client_specified" ? (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100/70 border border-emerald-200 text-emerald-900">
                            <Receipt className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                            <div className="text-[11px]">
                              <span className="font-bold block">
                                {booking.preferredStores || "Client Stores"}
                              </span>
                              <span className="text-[9px] text-emerald-700">Pay Direct to Store Till</span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100/70 border border-emerald-200 text-emerald-900">
                            <Receipt className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                            <div className="text-[11px]">
                              <span className="font-bold block">Carrefour Sourcing</span>
                              <span className="text-[9px] text-emerald-700">Pay Direct to Store Till</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ACTION BUTTONS BASED ON STATE MACHINE */}
                    <div className="pt-4 border-t border-forest-100 flex flex-wrap items-center justify-between gap-3">
                      <div className="text-xs text-forest-500">
                        {booking.status === "pending" && (
                          <span>Awaiting chef calendar review. Response expected within 24 hours.</span>
                        )}
                        {booking.status === "chef_accepted" && (
                          <span className="text-blue-700 font-bold">
                            Chef accepted! Please complete full culinary fee payment to unlock direct chef connection.
                          </span>
                        )}
                        {booking.status === "confirmed" && (
                          <span className="text-emerald-700 font-bold">
                            ✓ Paid in Full in Escrow. Chef will share supermarket Till on event day.
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {/* Pay Full Culinary Fee Button */}
                        {(booking.status === "chef_accepted" || booking.status === "pending") && (
                          <button
                            onClick={() => {
                              setPayingBooking(booking);
                              setPaymentMessage(null);
                            }}
                            className="px-4 py-2 rounded-xl bg-forest-900 hover:bg-forest-800 text-white font-bold text-xs shadow-sm flex items-center gap-1.5"
                          >
                            <DollarSign className="h-3.5 w-3.5" />
                            <span>Pay in Full (KES {booking.totalPrice.toLocaleString()})</span>
                          </button>
                        )}

                        {/* Review Button for completed bookings */}
                        {booking.status === "completed" && (
                          <button
                            onClick={() => setReviewBooking(booking)}
                            className="px-4 py-2 rounded-xl bg-champagne-400 hover:bg-champagne-300 text-forest-950 font-bold text-xs shadow-sm flex items-center gap-1.5"
                          >
                            <Star className="h-3.5 w-3.5 fill-current" />
                            <span>Leave Verified Review</span>
                          </button>
                        )}

                        {/* Cancel Button */}
                        {!booking.status.includes("cancelled") &&
                          booking.status !== "declined" &&
                          booking.status !== "completed" && (
                            <button
                              onClick={() => setCancellingBooking(booking)}
                              className="px-4 py-2 rounded-xl border border-red-200 text-red-700 hover:bg-red-50 font-bold text-xs"
                            >
                              Cancel Booking
                            </button>
                          )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-[32px] p-12 text-center border border-forest-100 space-y-4">
                <ChefHat className="h-12 w-12 text-forest-300 mx-auto" />
                <h3 className="font-serif text-xl font-bold text-forest-950">No Reservations Yet</h3>
                <p className="text-xs text-forest-600 max-w-sm mx-auto leading-relaxed">
                  Browse our directory of verified private chefs and book an unforgettable in-home dining experience.
                </p>
                <Link
                  href="/chefs"
                  className="inline-block px-6 py-3 rounded-2xl bg-forest-900 text-white font-bold text-xs shadow-md"
                >
                  Explore Available Chefs →
                </Link>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: CHAT MESSAGING */}
        {activeTab === "messages" && (
          <div className="bg-white rounded-[32px] border border-forest-100 shadow-sm p-6 text-left space-y-6">
            <h3 className="font-serif text-xl font-bold text-forest-950">Chef Direct Messaging</h3>
            <div className="space-y-3 min-h-[250px] max-h-[400px] overflow-y-auto p-4 bg-cream-50 rounded-2xl border border-forest-100">
              {messages.length > 0 ? (
                messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex flex-col ${
                      m.senderRole === "client" ? "items-end" : "items-start"
                    }`}
                  >
                    <div
                      className={`max-w-md p-3.5 rounded-2xl text-xs ${
                        m.senderRole === "client"
                          ? "bg-forest-900 text-white rounded-br-none"
                          : "bg-white text-forest-950 border border-forest-200 rounded-bl-none shadow-sm"
                      }`}
                    >
                      <span className="block text-[10px] font-bold text-champagne-400 mb-0.5">
                        {m.senderName}
                      </span>
                      <p>{m.content}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-forest-400 text-xs">
                  No message history yet. Select a booking and message your chef directly.
                </div>
              )}
            </div>

            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                placeholder="Ask about dietary substitutions, kitchen setup, or arrival timing..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="flex-1 bg-cream-50 border border-forest-100 rounded-2xl px-4 py-3 text-xs font-medium outline-none focus:ring-2 focus:ring-forest-900"
              />
              <button
                type="submit"
                className="px-6 py-3 rounded-2xl bg-forest-900 hover:bg-forest-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-md"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Send</span>
              </button>
            </form>
          </div>
        )}
      </main>

      {/* M-PESA PAYMENT MODAL */}
      {payingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-forest-950/80 backdrop-blur-md">
          <div className="bg-white rounded-[32px] max-w-md w-full p-6 sm:p-8 space-y-5 border border-forest-100 text-left">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-champagne-700">
                  Escrow Protection
                </span>
                <h3 className="font-serif text-2xl font-bold text-forest-950">
                  Pay Booking in Full
                </h3>
              </div>
              <button
                onClick={() => setPayingBooking(null)}
                className="h-8 w-8 rounded-full bg-forest-50 text-forest-800 flex items-center justify-center text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {paymentMessage ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-xs text-emerald-800 space-y-2">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                <p className="font-bold">{paymentMessage}</p>
                <button
                  onClick={() => setPayingBooking(null)}
                  className="w-full mt-2 py-2 rounded-xl bg-forest-900 text-white font-bold"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleInitiatePayment} className="space-y-4 text-xs">
                <div className="bg-cream-50 p-4 rounded-2xl border border-forest-100 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-forest-600">Chef:</span>
                    <span className="font-bold text-forest-950">{payingBooking.chefName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-forest-600">Date:</span>
                    <span className="font-bold text-forest-950">{payingBooking.bookingDate}</span>
                  </div>
                  <div className="flex justify-between border-t border-forest-100 pt-2 font-black">
                    <span className="text-forest-950">Culinary Fee (100% Escrow):</span>
                    <span className="text-emerald-800 text-sm">
                      KES {payingBooking.totalPrice.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-[10px] text-forest-500 pt-1 border-t border-forest-100 leading-snug">
                    🛒 <strong>Groceries Not Included:</strong> On event day, your chef shops at Carrefour (or your chosen store) and sends the supermarket Till number for you to pay directly.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-forest-950">M-Pesa Registered Phone Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="0712 345 678"
                    value={paymentPhone}
                    onChange={(e) => setPaymentPhone(e.target.value)}
                    className="w-full bg-cream-50 border border-forest-100 rounded-xl p-3 font-bold text-forest-950 outline-none"
                  />
                  <p className="text-[10px] text-forest-500">
                    An STK push prompt will appear on this phone to enter your PIN.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={paymentLoading}
                  className="w-full py-3.5 rounded-xl bg-forest-900 hover:bg-forest-800 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md"
                >
                  {paymentLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    `Send STK Push (KES ${payingBooking.depositAmount.toLocaleString()}) →`
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* CANCELLATION MODAL */}
      {cancellingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-forest-950/80 backdrop-blur-md">
          <div className="bg-white rounded-[32px] max-w-md w-full p-6 sm:p-8 space-y-4 border border-forest-100 text-left text-xs">
            <h3 className="font-serif text-xl font-bold text-forest-950">Cancel Reservation</h3>
            <p className="text-forest-600">
              Are you sure you want to cancel your reservation with{" "}
              <strong>{cancellingBooking.chefName}</strong> on {cancellingBooking.bookingDate}?
            </p>

            <div className="space-y-1">
              <label className="font-bold text-forest-950">Cancellation Reason</label>
              <textarea
                rows={2}
                placeholder="Reason for cancellation..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full bg-cream-50 border border-forest-100 rounded-xl p-2.5 outline-none resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCancellingBooking(null)}
                className="px-4 py-2 rounded-xl border border-forest-200 font-bold"
              >
                Keep Booking
              </button>
              <button
                type="button"
                disabled={cancelLoading}
                onClick={handleCancelBooking}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold flex items-center gap-1.5"
              >
                {cancelLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Confirm Cancellation"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REVIEW MODAL */}
      {reviewBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-forest-950/80 backdrop-blur-md">
          <div className="bg-white rounded-[32px] max-w-md w-full p-6 sm:p-8 space-y-4 border border-forest-100 text-left text-xs">
            <h3 className="font-serif text-xl font-bold text-forest-950">
              Review Chef {reviewBooking.chefName}
            </h3>

            <div className="space-y-1">
              <label className="font-bold text-forest-950">Rating (1 to 5 Stars)</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className={`text-2xl ${rating >= star ? "text-amber-500" : "text-gray-300"}`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-forest-950">Your Dining Feedback</label>
              <textarea
                rows={3}
                required
                placeholder="Describe the flavors, chef hospitality, plating, and kitchen cleanliness..."
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                className="w-full bg-cream-50 border border-forest-100 rounded-xl p-2.5 outline-none resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReviewBooking(null)}
                className="px-4 py-2 rounded-xl border border-forest-200 font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={reviewLoading || !reviewText.trim()}
                onClick={handleReviewSubmit}
                className="px-5 py-2 rounded-xl bg-forest-900 text-white font-bold flex items-center gap-1.5 shadow-md"
              >
                {reviewLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Publish Review"}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
