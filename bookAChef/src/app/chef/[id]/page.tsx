'use client';

import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { useState, useEffect } from "react";
import chefsData from "@/data/chefs.json";
import { Star, MapPin, ChefHat, ArrowLeft, Send, CheckCircle, ShieldCheck, Lock, Smartphone, Loader2 } from "lucide-react";
import { ChefData } from "@/components/ChefCard";
import { createClient } from "@/utils/supabase/client";

export default function ChefProfilePage({ params }: { params: { id: string } }) {
    const rawChef = chefsData.find((c) => c.id === params.id);
    const chef: ChefData | undefined = rawChef ? {
        id: rawChef.id,
        first_name: rawChef.firstName,
        last_name: rawChef.lastName,
        title: rawChef.title,
        avatar_url: rawChef.avatarUrl,
        cover_url: rawChef.coverUrl,
        rating: rawChef.rating,
        review_count: rawChef.reviewCount,
        location: rawChef.location,
        price_per_guest: rawChef.pricePerGuest,
        cuisines: rawChef.cuisines,
        // Carry over non-interface props for internal use
        ...rawChef 
    } as any : undefined;
    const [bookingStatus, setBookingStatus] = useState<'idle' | 'creating' | 'paying' | 'confirmed' | 'failed'>('idle');
    const [guestCount, setGuestCount] = useState(2);
    const [phone, setPhone] = useState("");
    const [bookingId, setBookingId] = useState<string | null>(null);
    const supabase = createClient();

    if (!chef) {
        notFound();
    }

    // Calculations for Option 1: Upfront Booking Fee
    const price_per_guest = chef.price_per_guest;
    const totalAmount = price_per_guest * guestCount;
    const bookingFeeRate = 0.15; // 15% platform commission
    const depositAmount = Math.round(totalAmount * bookingFeeRate);
    const balanceToChef = totalAmount - depositAmount;

    // Typecasting the dynamic structure
    const featuredMenu = (chef as any).featuredMenu as { title: string, price: number, courses: { course: string, dish: string }[] };

    // Listen for Realtime status updates on the booking
    useEffect(() => {
        if (!bookingId) return;

        const sub = supabase
            .channel(`booking_${bookingId}`)
            .on('postgres_changes', { 
                event: 'UPDATE', 
                schema: 'public', 
                table: 'bookings', 
                filter: `id=eq.${bookingId}` 
            }, (payload) => {
                if (payload.new.status === 'confirmed') {
                    setBookingStatus('confirmed');
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(sub);
        };
    }, [bookingId, supabase]);

    const handleBooking = async () => {
        if (!phone.match(/^254[0-9]{9}$/)) {
            alert("Please enter a valid M-Pesa number starting with 254 (e.g., 254712345678)");
            return;
        }

        setBookingStatus('creating');

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Please log in to book a chef.");

            const { data: booking, error: bookingErr } = await supabase
                .from('bookings')
                .insert({
                    customer_id: user.id,
                    chef_id: params.id.startsWith('c_') ? '6e9f195d-79e1-4560-84c6-8c437a34236a' : params.id, 
                    menu_id: '86e5c545-d360-4786-896a-0498b5847e09', 
                    event_time: new Date(Date.now() + 86400000).toISOString(), 
                    guest_count: guestCount,
                    total_amount: totalAmount,
                    deposit_amount: depositAmount,
                    location_address: 'Customer Address'
                })
                .select()
                .single();

            if (bookingErr) throw bookingErr;
            setBookingId(booking.id);

            setBookingStatus('paying');
            const { error: mpesaErr } = await supabase.functions.invoke('mpesa-stk-push', {
                body: { 
                    phoneNumber: phone, 
                    amount: depositAmount, 
                    bookingId: booking.id 
                }
            });

            if (mpesaErr) throw mpesaErr;

        } catch (err: any) {
            console.error(err);
            alert(err.message || "Failed to initiate payment.");
            setBookingStatus('failed');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20 font-sans">
            {/* Navigation */}
            <nav className="fixed top-0 z-50 flex w-full items-center justify-between bg-white/80 px-6 py-4 backdrop-blur-md md:px-12 border-b border-gray-100">
                <Link href="/" className="text-2xl font-extrabold tracking-tight text-gray-900">
                    Book A <span className="text-orange-600 italic">Chef</span>
                </Link>
                <Link href="/" className="flex items-center text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Directory
                </Link>
            </nav>

            {/* Hero Cover */}
            <div className="relative h-[400px] w-full mt-[72px]">
                <Image src={chef.cover_url} alt="Cover" fill className="object-cover" priority />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 via-gray-900/40 to-transparent" />
            </div>

            <div className="mx-auto max-w-6xl px-4 md:px-8">
                {/* Profile Header */}
                <div className="relative -mt-32 flex flex-col md:flex-row md:items-end md:justify-between pb-8">
                    <div className="flex flex-col items-center md:flex-row md:items-end gap-6">
                        <div className="relative h-44 w-44 overflow-hidden rounded-full border-4 border-white bg-white shadow-2xl">
                            <Image src={chef.avatar_url} alt={chef.first_name} fill className="object-cover" />
                        </div>
                        <div className="text-center md:text-left mb-2">
                            <div className="mb-2 hidden md:block">
                                <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-orange-600">
                                    <ShieldCheck className="h-3.5 w-3.5" /> Verified Elite Chef
                                </span>
                            </div>
                            <h1 className="text-4xl font-extrabold text-white md:text-gray-900 drop-shadow-lg md:drop-shadow-none tracking-tight">
                                Chef {chef.first_name} {chef.last_name}
                            </h1>
                            <p className="text-xl font-medium text-orange-600 md:text-gray-600 mt-1">{chef.title}</p>
                        </div>
                    </div>
                </div>

                <div className="mt-8 grid gap-8 lg:grid-cols-3">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-12">
                        <section className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                <span className="h-8 w-1 bg-orange-600 rounded-full" />
                                Chef’s Philosophy
                            </h2>
                            <p className="mt-6 text-lg leading-relaxed text-gray-600 font-light">{chef.bio}</p>
                            <div className="mt-8 flex flex-wrap gap-2">
                                {chef.cuisines.map((cuisine) => (
                                    <span key={cuisine} className="rounded-full bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700">
                                        <ChefHat className="mr-1.5 h-4 w-4 inline" /> {cuisine}
                                    </span>
                                ))}
                            </div>
                        </section>

                        <section className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-8">
                                <span className="h-8 w-1 bg-orange-600 rounded-full" />
                                Signature Menu
                            </h2>
                            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-gray-50/50">
                                <div className="bg-white p-6 border-b border-gray-100 flex justify-between items-center">
                                    <h3 className="text-xl font-extrabold text-gray-900">{featuredMenu.title}</h3>
                                    <p className="font-extrabold text-orange-600">KES {featuredMenu.price.toLocaleString()} pp</p>
                                </div>
                                <div className="p-8 space-y-8">
                                    {featuredMenu.courses.map((c, i) => (
                                        <div key={i}>
                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-600">{c.course}</p>
                                            <p className="text-lg font-bold text-gray-900 mt-1">{c.dish}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* Booking Widget - Orange Design */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-28 rounded-3xl border border-gray-100 bg-white p-8 shadow-2xl shadow-gray-200/60">
                            {bookingStatus === 'confirmed' ? (
                                <div className="text-center">
                                    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-50 text-green-500">
                                        <CheckCircle className="h-10 w-10" />
                                    </div>
                                    <h3 className="mt-6 text-2xl font-black text-gray-900">Payment Verified!</h3>
                                    <p className="mt-2 text-sm text-gray-500">You are now connected. Chat with the chef to finalize your dinner details.</p>
                                    <a 
                                        href={(chef as any).whatsappLink} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="mt-8 flex w-full items-center justify-center gap-3 rounded-2xl bg-[#25D366] py-5 font-black text-white shadow-xl shadow-[#25D366]/30 transition-all hover:scale-[1.02]"
                                    >
                                        <Send className="h-5 w-5" /> Chat via WhatsApp
                                    </a>
                                </div>
                            ) : (
                                <>
                                    <h3 className="text-2xl font-black text-gray-900 tracking-tight">Reserve Your Chef</h3>
                                    <p className="mt-2 text-sm leading-relaxed text-gray-500">Secure the chef for your specific date. You only pay a 15% booking fee now.</p>

                                    <div className="mt-8 space-y-6">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Number of Guests</label>
                                            <div className="flex items-center justify-between rounded-xl border border-gray-200 p-2">
                                                <button onClick={() => setGuestCount(Math.max(1, guestCount - 1))} className="h-10 w-10 rounded-lg bg-gray-50 font-bold hover:bg-gray-100">-</button>
                                                <span className="font-extrabold">{guestCount} Guests</span>
                                                <button onClick={() => setGuestCount(guestCount + 1)} className="h-10 w-10 rounded-lg bg-gray-50 font-bold hover:bg-gray-100">+</button>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-bold uppercase tracking-widest text-gray-400">M-Pesa Number</label>
                                            <div className="relative">
                                                <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                                <input 
                                                    type="tel"
                                                    placeholder="2547XXXXXXXX"
                                                    value={phone}
                                                    onChange={(e) => setPhone(e.target.value)}
                                                    className="w-full rounded-xl border border-gray-200 bg-gray-50 py-4 pl-12 pr-4 font-bold outline-none focus:border-orange-600 focus:ring-1 focus:ring-orange-600/20"
                                                />
                                            </div>
                                        </div>

                                        <div className="rounded-2xl bg-gray-50 p-6 space-y-3">
                                            <div className="flex items-center justify-between text-sm font-medium">
                                                <span className="text-gray-500">Grand Total</span>
                                                <span className="text-gray-900">KES {totalAmount.toLocaleString()}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-sm font-black text-orange-600">
                                                <span>Booking Deposit (15%)</span>
                                                <span>KES {depositAmount.toLocaleString()}</span>
                                            </div>
                                        </div>

                                        <button 
                                            onClick={handleBooking}
                                            disabled={bookingStatus !== 'idle'}
                                            className="relative flex w-full items-center justify-center gap-3 rounded-2xl bg-gray-900 py-5 font-black text-white shadow-xl transition-all hover:bg-black active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none"
                                        >
                                            {bookingStatus === 'idle' ? (
                                                <>Pay via M-Pesa <Smartphone className="h-5 w-5 text-orange-600" /></>
                                            ) : (
                                                <><Loader2 className="h-5 w-5 animate-spin text-orange-600" /> {bookingStatus === 'paying' ? 'Check your phone...' : 'Connecting...'}</>
                                            )}
                                        </button>
                                        
                                        <div className="text-center">
                                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 flex items-center justify-center gap-2">
                                                <Lock className="h-3 w-3" /> Secure Payment Hub
                                            </span>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
