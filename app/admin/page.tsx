"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Shield,
  Users,
  ChefHat,
  DollarSign,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Calendar,
  Sparkles,
  Search,
  Filter,
  Eye,
  Phone,
  Mail,
  MapPin,
  Clock,
  ArrowUpRight,
  Loader2,
  ShieldAlert,
  Plus,
  Image as ImageIcon,
  Award,
  Utensils,
  X,
  Trash2,
  Car,
  MessageCircle,
  Send,
  Check,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ChefApplication, Booking, Chef, INITIAL_CHEFS } from "@/utils/data";
import { createClient } from "@/utils/supabase/client";
import {
  resolveCommission,
  LEGACY_CHEF_PAYOUT_RATE,
  CommissionResolution,
} from "@/utils/commission";

const ALL_CUISINES = [
  "Swahili",
  "Seafood",
  "Nyama Choma",
  "BBQ",
  "Continental",
  "Italian",
  "Fine Dining",
  "Wine & Sommeliers",
  "Indian",
  "Pan-Asian",
  "Pastry & Baking",
  "Vegan / Plant-Based",
];

const ALL_DIETARY = ["Halal", "Vegetarian", "Vegan", "Gluten-Free", "Keto", "Pescatarian"];

export default function AdminPortalPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "dispatch" | "applications" | "bookings" | "chefs">("overview");

  const [applications, setApplications] = useState<ChefApplication[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [chefs, setChefs] = useState<Chef[]>(INITIAL_CHEFS);
  const [appStatusFilter, setAppStatusFilter] = useState<"pending" | "approved" | "all">("pending");
  const [qualifyingAppId, setQualifyingAppId] = useState<string | null>(null);

  // Uber Dispatch State
  const [dispatchFilter, setDispatchFilter] = useState<"all" | "pending" | "assigned" | "active">("all");
  const [selectedChefForBooking, setSelectedChefForBooking] = useState<{ [bookingId: string]: string }>({});
  const [assigningId, setAssigningId] = useState<string | null>(null);
  // Real platform rate. Stays on the legacy fallback (and flagged indicative)
  // until an admin approves and activates a rate in platform_settings.
  const [commission, setCommission] = useState<CommissionResolution>({
    chefPayoutRate: LEGACY_CHEF_PAYOUT_RATE,
    platformRate: 1 - LEGACY_CHEF_PAYOUT_RATE,
    source: "legacy",
    isIndicative: true,
  });

  const handleAssignChef = async (bookingId: string) => {
    const chefId = selectedChefForBooking[bookingId];
    if (!chefId) {
      alert("Please select a verified chef from the dropdown first.");
      return;
    }
    const assignedChef = chefs.find((c) => c.id === chefId);
    setAssigningId(bookingId);
    try {
      const { error } = await supabase
        .from("bookings")
        .update({
          chef_id: chefId,
          status: "assigned",
        })
        .eq("id", bookingId);

      if (error) console.warn("Supabase update error:", error);

      setBookings((prev) =>
        prev.map((b) =>
          b.id === bookingId
            ? { ...b, chefId, chefName: assignedChef?.name || "Assigned Chef", status: "assigned" }
            : b
        )
      );
      alert(`Chef ${assignedChef?.name} assigned to booking #${bookingId}!`);
    } catch (err) {
      console.error(err);
    } finally {
      setAssigningId(null);
    }
  };

  const handleUpdateBookingStatus = async (bookingId: string, newStatus: any) => {
    try {
      await supabase.from("bookings").update({ status: newStatus }).eq("id", bookingId);
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status: newStatus } : b))
      );
    } catch (err) {
      console.error(err);
    }
  };

  // Listing modal state
  const [isListingModalOpen, setIsListingModalOpen] = useState(false);
  const [submittingChef, setSubmittingChef] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState<string | null>(null);

  // Photo upload helper
  const uploadPhoto = async (file: File, label: string): Promise<string | null> => {
    setUploadingPhoto(label);
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `chefs/${Date.now()}-${label.replace(/\s/g, '_').toLowerCase()}.${ext}`;
    try {
      const { data, error } = await supabase.storage
        .from('chef-photos')
        .upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('chef-photos').getPublicUrl(path);
      return urlData.publicUrl;
    } catch (err: any) {
      alert('Photo upload failed: ' + err.message + '\n\nFallback: paste a direct image URL below.');
      return null;
    } finally {
      setUploadingPhoto(null);
    }
  };

  // Form Fields for Listing a Chef
  const [chefName, setChefName] = useState("");
  const [brandName, setBrandName] = useState("");
  const [tagline, setTagline] = useState("Book A Chef Certified Master");
  const [city, setCity] = useState("Nairobi");
  const [pricePerGuest, setPricePerGuest] = useState("4500");
  const [avatarUrl, setAvatarUrl] = useState("https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&q=80&w=800");
  const [coverDishUrl, setCoverDishUrl] = useState("https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&q=80&w=2070");
  const [dishPhoto1, setDishPhoto1] = useState("https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&q=80&w=1200");
  const [dishPhoto2, setDishPhoto2] = useState("https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=1200");
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>(["Swahili", "Seafood"]);
  const [selectedDietary, setSelectedDietary] = useState<string[]>(["Halal"]);
  const [bio, setBio] = useState("");
  const [menuTitle, setMenuTitle] = useState("Royal Signature Degustation");
  const [menuDesc, setMenuDesc] = useState("3-course handcrafted fine dining menu.");
  const [appetizerName, setAppetizerName] = useState("");
  const [mainName, setMainName] = useState("");
  const [dessertName, setDessertName] = useState("");

  const supabase = createClient();

  useEffect(() => {
    async function verifyAdmin() {
      setLoading(true);
      try {
        const {
          data: { user },
          error: authErr,
        } = await supabase.auth.getUser();

        if (authErr || !user) {
          router.push("/login?role=admin&message=Super Admin authentication required.");
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        const role = profile?.role || (user.user_metadata?.role as any);

        if (role !== "admin") {
          alert("Access Denied: Your account does not have Super Admin privileges.");
          router.push("/dashboard");
          return;
        }

        setIsAdmin(true);

        // 1. Fetch chefs first to reconcile live accounts
        const { data: dbChefs } = await supabase
          .from("chefs")
          .select("*")
          .order("created_at", { ascending: false });

        const liveChefNames = new Set(
          (dbChefs || []).map((c: any) => c.name?.toLowerCase().trim())
        );

        if (dbChefs && dbChefs.length > 0) {
          const mapped: Chef[] = dbChefs.map((c: any) => ({
            id: c.id,
            name: c.name,
            brand: c.brand_name || "Culinary Studio",
            tagline: c.tagline || "Book A Chef Certified Master",
            location: c.city || "Nairobi",
            serviceAreas: c.service_areas || ["Kilimani", "Karen", "Runda"],
            rating: Number(c.rating) || 5.0,
            reviewsCount: c.reviews_count || 0,
            avatar: c.avatar_url,
            coverImage: c.cover_image_url,
            gallery: c.gallery_images || [],
            startingPrice: Number(c.price_per_guest) || 4000,
            cuisines: c.cuisines || [],
            dietary: c.dietary_specialties || [],
            bio: c.bio || "",
            culinaryPhilosophy: c.culinary_philosophy || "",
            verified: c.verified ?? true,
            certificationBadge: "Book A Chef Certified • Meal Tasted & Approved",
            featured: c.featured ?? false,
            isAvailable: c.is_available ?? true,
            menus: [],
            reviews: [],
          }));
          setChefs(mapped);
        }

        // 2. Fetch applications from Supabase
        // Resolve the platform rate alongside. Never throws — on failure it
        // returns the legacy split marked indicative.
        setCommission(await resolveCommission(supabase as any));

        const { data: dbApps } = await supabase
          .from("chef_applications")
          .select("*")
          .order("created_at", { ascending: false });

        if (dbApps && dbApps.length > 0) {
          setApplications(
            dbApps.map((a: any) => {
              const displayName =
                a.full_name ||
                (a.first_name ? `${a.first_name} ${a.last_name || ""}`.trim() : "") ||
                a.email?.split("@")[0] ||
                "Chef Applicant";

              const isLive =
                liveChefNames.has(displayName.toLowerCase().trim()) ||
                (a.full_name && liveChefNames.has(a.full_name.toLowerCase().trim()));

              const status = isLive ? "approved" : (a.status || "pending");

              return {
                id: a.id,
                fullName: displayName,
                email: a.email || "No email",
                phone: a.phone || a.phone_number || "",
                brandName: a.brand_name,
                experienceYears: a.experience_years || "3+ years",
                city: a.city || "Nairobi",
                neighborhood: a.neighborhood || "Kilimani",
                cuisines: a.cuisines || [],
                dietary: a.dietary || [],
                startingPrice: Number(a.starting_price) || 4500,
                specialtyDish: a.specialty_dish || "Signature Course",
                bio: a.bio || "",
                status: status as any,
                createdAt: a.created_at,
              };
            })
          );
        }

        // 3. Fetch bookings
        const { data: dbBookings } = await supabase
          .from("bookings")
          .select("*, chefs(name)")
          .order("created_at", { ascending: false });

        if (dbBookings && dbBookings.length > 0) {
          setBookings(
            dbBookings.map((b: any) => ({
              id: b.id,
              chefId: b.chef_id,
              chefName: b.chefs?.name || "Assigned Chef",
              clientName: b.client_name,
              clientEmail: b.client_email,
              clientPhone: b.client_phone,
              menuTitle: b.special_requests || "Private Dining Experience",
              bookingDate: b.booking_date,
              bookingTime: b.booking_time,
              guestsCount: b.guests_count,
              totalPrice: Number(b.total_price),
              depositAmount: Number(b.deposit_amount),
              status: b.status,
              address: b.location_address,
              city: b.location_city || "Nairobi",
              createdAt: b.created_at,
            }))
          );
        }
      } catch (err) {
        console.error("Admin verification error:", err);
      } finally {
        setLoading(false);
      }
    }

    verifyAdmin();
  }, [supabase, router]);

  const toggleCuisine = (c: string) => {
    setSelectedCuisines((prev) =>
      prev.includes(c) ? prev.filter((i) => i !== c) : [...prev, c]
    );
  };

  const toggleDietary = (d: string) => {
    setSelectedDietary((prev) =>
      prev.includes(d) ? prev.filter((i) => i !== d) : [...prev, d]
    );
  };

  // Open modal pre-filled from an application
  const qualifyApplicant = (app: ChefApplication) => {
    setQualifyingAppId(app.id);
    setChefName(app.fullName);
    setBrandName(app.brandName || `${app.fullName} Kitchens`);
    setCity(app.city || "Nairobi");
    setPricePerGuest(app.startingPrice ? app.startingPrice.toString() : "4500");
    setSelectedCuisines(app.cuisines.length > 0 ? app.cuisines : ["Swahili"]);
    setSelectedDietary(app.dietary.length > 0 ? app.dietary : ["Halal"]);
    setBio(app.bio || `Certified master private chef specializing in ${app.specialtyDish}.`);
    setMainName(app.specialtyDish || "Signature Course");
    setIsListingModalOpen(true);
  };

  // Update application status directly
  const handleUpdateAppStatus = async (
    appId: string,
    nextStatus: "approved" | "rejected" | "pending"
  ) => {
    try {
      await supabase
        .from("chef_applications")
        .update({ status: nextStatus })
        .eq("id", appId);

      setApplications((prev) =>
        prev.map((a) => (a.id === appId ? { ...a, status: nextStatus } : a))
      );
    } catch (err: any) {
      console.warn("Status update error:", err);
      setApplications((prev) =>
        prev.map((a) => (a.id === appId ? { ...a, status: nextStatus } : a))
      );
    }
  };

  // Publish Chef to Supabase & Marketplace
  const handlePublishChef = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingChef(true);

    const gallery = [dishPhoto1, dishPhoto2].filter(Boolean);

    const chefPayload = {
      name: chefName.trim(),
      brand_name: brandName.trim() || `${chefName} Culinary`,
      tagline: tagline.trim() || "Book A Chef Certified Master",
      city: city.trim(),
      service_areas: ["Kilimani", "Karen", "Runda", "Westlands", "Gigiri"],
      price_per_guest: parseInt(pricePerGuest) || 4500,
      cuisines: selectedCuisines,
      dietary_specialties: selectedDietary,
      bio: bio.trim() || "Certified master chef wearing the official Book A Chef uniform. Meal tasted & approved by our executive panel.",
      culinary_philosophy: "Fresh organic ingredients, Michelin-level technique, and spotless kitchen care.",
      avatar_url: avatarUrl.trim(),
      cover_image_url: coverDishUrl.trim(),
      gallery_images: gallery,
      verified: true,
      is_available: true,
      rating: 5.0,
      reviews_count: 1,
    };

    try {
      // 1. Insert chef into Supabase
      const { data: chefData, error: cErr } = await supabase
        .from("chefs")
        .insert([chefPayload])
        .select();

      const newChefId = chefData?.[0]?.id || `c_${Date.now()}`;

      // 2. Insert initial signature menu
      if (chefData?.[0]?.id) {
        await supabase.from("menus").insert([
          {
            chef_id: newChefId,
            title: menuTitle.trim() || "Royal Tasting Degustation",
            description: menuDesc.trim() || "3-course signature dining experience.",
            price_per_guest: parseInt(pricePerGuest) || 4500,
            courses: {
              appetizer: appetizerName ? { name: appetizerName, description: "Seasonal creation" } : undefined,
              main: { name: mainName || "Chef's Signature Course", description: "Farm fresh ingredients" },
              dessert: dessertName ? { name: dessertName, description: "Handcrafted dessert" } : undefined,
            },
          },
        ]);
      }

      // 3. Mark application as approved if linked to an applicant
      if (qualifyingAppId) {
        try {
          await supabase
            .from("chef_applications")
            .update({ status: "approved" })
            .eq("id", qualifyingAppId);
        } catch (e) {}

        setApplications((prev) =>
          prev.map((a) => (a.id === qualifyingAppId ? { ...a, status: "approved" } : a))
        );
        setQualifyingAppId(null);
      }

      // 4. Update local state
      const createdChef: Chef = {
        id: newChefId,
        name: chefName,
        brand: brandName || `${chefName} Kitchens`,
        tagline: tagline,
        location: city,
        serviceAreas: ["Kilimani", "Karen", "Runda", "Westlands"],
        rating: 5.0,
        reviewsCount: 1,
        avatar: avatarUrl,
        coverImage: coverDishUrl,
        gallery: gallery,
        startingPrice: parseInt(pricePerGuest) || 4500,
        cuisines: selectedCuisines,
        dietary: selectedDietary,
        bio: bio,
        culinaryPhilosophy: "Spotless kitchen care and pure culinary mastery.",
        verified: true,
        certificationBadge: "Book A Chef Certified • Meal Tasted & Approved",
        featured: true,
        isAvailable: true,
        menus: [
          {
            id: `m_${Date.now()}`,
            title: menuTitle,
            tag: "Signature",
            description: menuDesc,
            pricePerGuest: parseInt(pricePerGuest) || 4500,
            courses: {
              appetizer: appetizerName ? { name: appetizerName, description: "Appetizer" } : undefined,
              main: { name: mainName || "Signature Main", description: "Main Course" },
              dessert: dessertName ? { name: dessertName, description: "Dessert" } : undefined,
            },
          },
        ],
        reviews: [],
      };

      setChefs((prev) => [createdChef, ...prev]);
      setIsListingModalOpen(false);
      alert(`Chef ${chefName} has been officially listed and published live to Book A Chef!`);
    } catch (err: any) {
      alert("Error publishing chef: " + err.message);
    } finally {
      setSubmittingChef(false);
    }
  };

  const handleToggleChefAvailability = async (chefId: string, current: boolean) => {
    const next = !current;
    try {
      await supabase.from("chefs").update({ is_available: next }).eq("id", chefId);
    } catch (e) {}
    setChefs((prev) =>
      prev.map((c) => (c.id === chefId ? { ...c, isAvailable: next } : c))
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-cream-50 flex flex-col justify-center items-center">
        <Loader2 className="h-10 w-10 text-forest-900 animate-spin mb-3" />
        <p className="text-xs font-bold uppercase tracking-widest text-forest-600">
          Authenticating Super Admin Privileges...
        </p>
      </div>
    );
  }

  if (!isAdmin) return null;

  // GMV is the real sum of booking value. There is deliberately NO fallback
  // figure here.
  //
  // This previously read `... || 1840000`, which meant that whenever the real
  // total was zero the console silently displayed a fabricated KES 1,840,000
  // — sitting next to a Bookings tab reading "(0)", with a commission tile
  // derived from it. An admin console that invents revenue is worse than one
  // that shows zero: it turns a broken pipeline into an apparently healthy
  // business, and it hides exactly the regression worth noticing.
  const totalGMV = bookings.reduce((sum, b) => sum + Number(b.totalPrice || 0), 0);

  // Commission is only shown as a KES figure once a rate has been approved and
  // activated. Until then the rate itself is unapproved commercial terms, so
  // displaying a number here would contradict both the decision to leave
  // platform_settings inactive and the "rate pending approval" wording the
  // chef-facing screens already use.
  const totalCommission = commission.isIndicative
    ? null
    : Math.round(totalGMV * commission.platformRate);

  return (
    <div className="min-h-screen bg-cream-50 text-forest-950 font-sans flex flex-col">
      <Navbar />

      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-28 pb-20 flex-1">
        {/* Admin Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
          <div>
            <p className="text-xs font-medium text-forest-400 uppercase tracking-wider mb-1">
              Admin
            </p>
            <h1 className="text-3xl font-bold text-forest-950 tracking-tight">Console</h1>
            <p className="text-forest-500 text-sm mt-1">
              Dispatch, chef verification, and bookings.
            </p>
          </div>
          <button
            onClick={() => setIsListingModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-forest-950 text-white text-sm font-medium hover:bg-forest-800 transition-colors shrink-0"
          >
            <Plus className="h-4 w-4" />
            Add chef
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 text-left">
          <div className="bg-white rounded-2xl border border-forest-100 p-5">
            <p className="text-[10px] font-medium text-forest-400 uppercase mb-1.5">GMV</p>
            <p className="text-xl sm:text-2xl font-bold text-forest-950">
              {totalGMV.toLocaleString()}
            </p>
            <p className="text-xs text-forest-500 mt-0.5">Bookings value</p>
          </div>

          <div className="bg-white rounded-2xl border border-forest-100 p-5">
            <p className="text-[10px] font-medium text-forest-400 uppercase mb-1.5">Commission</p>
            <p className="text-xl sm:text-2xl font-bold text-forest-950">
              {totalCommission === null ? (
                <span className="text-forest-300">—</span>
              ) : (
                totalCommission.toLocaleString()
              )}
            </p>
            <p className="text-xs text-forest-500 mt-0.5">
              {commission.isIndicative ? (
                "Rate not yet approved"
              ) : (
                `${Math.round(commission.platformRate * 100)}% take rate`
              )}
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-forest-100 p-5">
            <p className="text-[10px] font-medium text-forest-400 uppercase mb-1.5">Chefs</p>
            <p className="text-xl sm:text-2xl font-bold text-forest-950">{chefs.length}</p>
            <p className="text-xs text-forest-500 mt-0.5">Verified</p>
          </div>

          <div className="bg-white rounded-2xl border border-forest-100 p-5">
            <p className="text-[10px] font-medium text-forest-400 uppercase mb-1.5">Applications</p>
            <p className="text-xl sm:text-2xl font-bold text-amber-600">
              {applications.filter((a) => a.status === "pending").length}
            </p>
            <button
              onClick={() => setActiveTab("applications")}
              className="text-xs text-forest-500 hover:text-forest-950 transition-colors mt-0.5"
            >
              Review →
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-forest-100 mb-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-1 py-3 mr-6 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              activeTab === "overview"
                ? "border-forest-950 text-forest-950"
                : "border-transparent text-forest-500 hover:text-forest-800"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("dispatch")}
            className={`px-1 py-3 mr-6 text-sm font-medium border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === "dispatch"
                ? "border-forest-950 text-forest-950"
                : "border-transparent text-forest-500 hover:text-forest-800"
            }`}
          >
            Dispatch
            {bookings.filter((b) => b.status === "pending_assignment" || b.status === "pending")
              .length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-champagne-400 text-forest-950 text-[10px] font-bold">
                {bookings.filter(
                  (b) => b.status === "pending_assignment" || b.status === "pending"
                ).length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("chefs")}
            className={`px-1 py-3 mr-6 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              activeTab === "chefs"
                ? "border-forest-950 text-forest-950"
                : "border-transparent text-forest-500 hover:text-forest-800"
            }`}
          >
            Chefs ({chefs.length})
          </button>
          <button
            onClick={() => setActiveTab("applications")}
            className={`px-1 py-3 mr-6 text-sm font-medium border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === "applications"
                ? "border-forest-950 text-forest-950"
                : "border-transparent text-forest-500 hover:text-forest-800"
            }`}
          >
            Applications
            {applications.filter((a) => a.status === "pending").length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                {applications.filter((a) => a.status === "pending").length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("bookings")}
            className={`px-1 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              activeTab === "bookings"
                ? "border-forest-950 text-forest-950"
                : "border-transparent text-forest-500 hover:text-forest-800"
            }`}
          >
            Bookings ({bookings.length})
          </button>
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-left">
            <div className="lg:col-span-8 bg-white rounded-[32px] p-6 sm:p-8 border border-forest-100 shadow-sm space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-serif text-2xl font-bold text-forest-950">
                    Certified Chef Marketplace Status
                  </h3>
                  <p className="text-xs text-forest-500">Live active listings with certified meal tasting badges.</p>
                </div>
                <button
                  onClick={() => setIsListingModalOpen(true)}
                  className="text-xs font-bold text-champagne-700 underline"
                >
                  + Add Chef
                </button>
              </div>

              <div className="space-y-4">
                {chefs.slice(0, 3).map((c) => (
                  <div
                    key={c.id}
                    className="p-4 rounded-2xl bg-cream-50/70 border border-forest-100 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative h-12 w-12 rounded-2xl overflow-hidden shrink-0 border border-forest-200">
                        <Image src={c.avatar} alt={c.name} fill className="object-cover" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-forest-950">{c.name}</span>
                        <p className="text-[11px] text-forest-600">{c.brand} • {c.cuisines.join(", ")}</p>
                        <div className="flex items-center gap-1.5 flex-wrap pt-1">
                          <span className="inline-flex items-center gap-1 text-[9px] font-black text-champagne-800 bg-champagne-100 px-2 py-0.5 rounded-full border border-champagne-300">
                            🍳 In-House Kitchen Tasted
                          </span>
                          {c.haccpCertified && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-black text-sky-800 bg-sky-100 px-2 py-0.5 rounded-full border border-sky-300">
                              🛡️ HACCP Certified
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1 text-[9px] font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            📜 Compliance Verified
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-black text-forest-950">
                        KES {c.startingPrice.toLocaleString()} / guest
                      </span>
                      <span className="block text-[9px] font-bold text-emerald-700 uppercase">
                        {c.isAvailable ? "● Live in Marketplace" : "● Hidden"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Admin Actions */}
            <div className="lg:col-span-4 bg-white rounded-[32px] p-6 sm:p-8 border border-forest-100 shadow-sm space-y-4">
              <h3 className="font-serif text-xl font-bold text-forest-950">
                Admin Publishing Controls
              </h3>
              <p className="text-xs text-forest-500 leading-relaxed">
                Only Super Admins can list and verify private chefs on Book A Chef Kenya.
              </p>
              <button
                onClick={() => setIsListingModalOpen(true)}
                className="w-full py-3.5 px-4 rounded-2xl bg-forest-900 text-cream-50 font-bold text-xs flex items-center justify-between shadow-md hover:bg-forest-800"
              >
                <span>+ List & Publish Chef</span>
                <ArrowUpRight className="h-4 w-4" />
              </button>
              <Link
                href="/chef-dashboard"
                className="w-full py-3.5 px-4 rounded-2xl bg-cream-100 text-forest-900 font-bold text-xs flex items-center justify-between hover:bg-cream-200"
              >
                <span>View Chef Portal</span>
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        )}

        {/* TAB 2: MANAGE CERTIFIED CHEFS */}
        {activeTab === "chefs" && (
          <div className="space-y-6 text-left">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div>
                <h3 className="font-serif text-2xl font-bold text-forest-950">
                  Certified Chef Directory ({chefs.length})
                </h3>
                <p className="text-xs text-forest-500">
                  All active chefs wearing official Book A Chef uniforms and verified by our tasting panel.
                </p>
              </div>
              <button
                onClick={() => setIsListingModalOpen(true)}
                className="px-5 py-3 rounded-2xl bg-forest-900 text-white font-bold text-xs uppercase tracking-wider hover:bg-forest-800 flex items-center gap-1.5 shadow-md self-start sm:self-auto"
              >
                <Plus className="h-4 w-4" /> List New Chef
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {chefs.map((chef) => (
                <div
                  key={chef.id}
                  className="bg-white rounded-[32px] p-6 border border-forest-100 shadow-sm space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="relative h-14 w-14 rounded-2xl overflow-hidden shrink-0 border border-forest-200">
                        <Image src={chef.avatar} alt={chef.name} fill className="object-cover" />
                      </div>
                      <div>
                        <h4 className="font-serif text-lg font-bold text-forest-950 leading-tight">
                          {chef.name}
                        </h4>
                        <p className="text-xs text-forest-600 font-medium">{chef.brand}</p>
                        <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-champagne-700 bg-cream-100 px-2 py-0.5 rounded-full mt-1">
                          <Award className="h-3 w-3" /> Meal Tasted & Certified
                        </span>
                      </div>
                    </div>

                    <div className="relative aspect-video rounded-2xl overflow-hidden bg-forest-100">
                      <Image src={chef.coverImage} alt={chef.name} fill className="object-cover" />
                    </div>

                    <p className="text-xs text-forest-700 line-clamp-2">{chef.bio}</p>

                    <div className="flex flex-wrap gap-1">
                      {chef.cuisines.map((c) => (
                        <span
                          key={c}
                          className="px-2 py-0.5 rounded-full bg-forest-50 text-forest-800 text-[9px] font-bold"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-forest-100 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-forest-950">
                        KES {chef.startingPrice.toLocaleString()} / guest
                      </span>
                      <button
                        onClick={() => handleToggleChefAvailability(chef.id, chef.isAvailable)}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                          chef.isAvailable
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {chef.isAvailable ? "● Live" : "● Paused"}
                      </button>
                    </div>

                    <Link
                      href={`/chef/${chef.id}`}
                      className="block w-full text-center py-2.5 rounded-xl bg-cream-100 hover:bg-cream-200 text-forest-950 font-bold text-xs transition-colors"
                    >
                      View Public Profile →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: INBOUND APPLICATIONS */}
        {activeTab === "applications" && (
          <div className="space-y-6 text-left">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-serif text-2xl font-bold text-forest-950">
                  Inbound Chef Applications
                </h3>
                <p className="text-xs text-forest-500">
                  Review applicant details, conduct 10-minute Video KYC, or qualify & publish live to the marketplace.
                </p>
              </div>

              {/* Status Filter Tabs */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setAppStatusFilter("pending")}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    appStatusFilter === "pending"
                      ? "bg-amber-500 text-white shadow-sm"
                      : "bg-white text-forest-700 hover:bg-cream-100 border border-forest-100"
                  }`}
                >
                  Pending ({applications.filter((a) => a.status === "pending").length})
                </button>
                <button
                  onClick={() => setAppStatusFilter("approved")}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    appStatusFilter === "approved"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "bg-white text-forest-700 hover:bg-cream-100 border border-forest-100"
                  }`}
                >
                  Approved ({applications.filter((a) => a.status === "approved").length})
                </button>
                <button
                  onClick={() => setAppStatusFilter("all")}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    appStatusFilter === "all"
                      ? "bg-forest-900 text-white shadow-sm"
                      : "bg-white text-forest-700 hover:bg-cream-100 border border-forest-100"
                  }`}
                >
                  All ({applications.length})
                </button>
              </div>
            </div>

            {applications.filter((a) => (appStatusFilter === "all" ? true : a.status === appStatusFilter)).length > 0 ? (
              <div className="grid grid-cols-1 gap-6">
                {applications
                  .filter((a) => (appStatusFilter === "all" ? true : a.status === appStatusFilter))
                  .map((app) => {
                    const cleanPhone = app.phone
                      ? app.phone.replace(/[^0-9]/g, "").replace(/^0/, "254")
                      : "";

                    const kycMessage = `Hi Chef ${app.fullName || ""}, this is Book A Chef Kenya. We reviewed your chef application and would like to schedule a quick 10-minute video KYC call before activating your profile. When are you free today?`;

                    return (
                      <div
                        key={app.id}
                        className="bg-white rounded-[32px] p-6 sm:p-8 border border-forest-100 shadow-sm space-y-4"
                      >
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-4 border-b border-forest-100">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-serif text-xl font-bold text-forest-950">
                                {app.fullName}
                              </h4>
                              {app.brandName && (
                                <span className="text-xs font-bold text-champagne-700 bg-cream-100 px-2.5 py-0.5 rounded-full">
                                  {app.brandName}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-forest-600 mt-0.5">
                              {app.experienceYears} Experience • {app.city} ({app.neighborhood})
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${
                                app.status === "approved"
                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                  : app.status === "rejected"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-amber-100 text-amber-800 border border-amber-300"
                              }`}
                            >
                              ● {app.status === "approved" ? "Approved & Live" : app.status}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-2 text-xs">
                          <p>
                            <strong className="text-forest-950">Signature Specialty: </strong>
                            <span className="text-forest-700">{app.specialtyDish}</span>
                          </p>
                          <p>
                            <strong className="text-forest-950">Bio: </strong>
                            <span className="text-forest-700">{app.bio}</span>
                          </p>
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {app.cuisines.map((c) => (
                              <span
                                key={c}
                                className="px-2.5 py-0.5 rounded-full bg-forest-50 text-forest-800 text-[10px] font-bold"
                              >
                                {c}
                              </span>
                            ))}
                          </div>

                          {/* Vetting Credentials Checklist */}
                          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-forest-100/60">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-champagne-800 bg-champagne-100 px-2 py-0.5 rounded-full border border-champagne-300">
                              🍳 Kitchen Tasting: {app.bio?.includes("Nairobi Test Kitchen Tasting: Agreed") ? "Agreed" : "Pending In-House Session"}
                            </span>
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              app.bio?.includes("HACCP: Certified")
                                ? "text-sky-800 bg-sky-100 border-sky-300"
                                : "text-forest-700 bg-forest-50 border-forest-200"
                            }`}>
                              🛡️ HACCP: {app.bio?.includes("HACCP: Certified") ? "Certified" : "Standard"}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              📜 Compliance: {app.bio?.includes("Compliance: Verified") ? "Verified" : "Checked"}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              ✅ Food Safety: Verified
                            </span>
                          </div>
                        </div>

                        <div className="pt-4 border-t border-forest-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                          <div className="flex flex-wrap items-center gap-4 text-xs text-forest-700">
                            {cleanPhone && (
                              <a
                                href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(kycMessage)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-emerald-700 hover:text-emerald-800 font-bold bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200 transition-colors"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 24 24"
                                  fill="currentColor"
                                  className="h-3.5 w-3.5 text-[#25D366]"
                                >
                                  <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2zm.01 1.67c2.2 0 4.26.86 5.82 2.42a8.17 8.17 0 0 1 2.41 5.82c0 4.54-3.7 8.24-8.24 8.24-1.42 0-2.82-.37-4.06-1.07l-.29-.17-3.12.82.83-3.04-.19-.3a8.21 8.21 0 0 1-1.26-4.48c0-4.54 3.7-8.24 8.24-8.24zm4.52 11.59c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.02-1.25-.75-.67-1.25-1.49-1.4-1.74-.14-.25-.02-.39.11-.51.11-.11.25-.29.37-.44.13-.14.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.56-1.35-.77-1.85-.2-.49-.41-.42-.56-.43l-.48-.01c-.17 0-.44.06-.67.31-.23.25-.87.85-.87 2.08 0 1.22.89 2.41 1.02 2.58.13.17 1.76 2.68 4.26 3.76.59.26 1.06.41 1.42.53.6.19 1.14.16 1.57.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.06-.1-.23-.17-.48-.29z" />
                                </svg>
                                <span>Schedule 10-Min Video KYC</span>
                              </a>
                            )}
                            <span className="flex items-center gap-1">
                              <Phone className="h-3.5 w-3.5 text-forest-400" /> {app.phone || "No phone"}
                            </span>
                            <span className="flex items-center gap-1">
                              <Mail className="h-3.5 w-3.5 text-forest-400" /> {app.email}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            {app.status !== "approved" ? (
                              <>
                                <button
                                  onClick={() => handleUpdateAppStatus(app.id, "approved")}
                                  className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition-all"
                                >
                                  Mark Approved
                                </button>
                                <button
                                  onClick={() => qualifyApplicant(app)}
                                  className="px-4 py-2 rounded-xl bg-forest-900 hover:bg-forest-800 text-white font-bold text-xs uppercase tracking-wider shadow-md flex items-center gap-1.5 transition-all"
                                >
                                  <Award className="h-3.5 w-3.5 text-champagne-400" />
                                  <span>Qualify & List →</span>
                                </button>
                                <button
                                  onClick={() => handleUpdateAppStatus(app.id, "rejected")}
                                  className="px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs border border-red-200 transition-all"
                                >
                                  Decline
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => qualifyApplicant(app)}
                                  className="px-3 py-2 rounded-xl bg-cream-100 hover:bg-cream-200 text-forest-900 font-bold text-xs border border-forest-200 transition-all"
                                >
                                  Update Listing
                                </button>
                                <button
                                  onClick={() => handleUpdateAppStatus(app.id, "pending")}
                                  className="px-3 py-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold text-xs border border-gray-200 transition-all"
                                >
                                  Revert to Pending
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-12 text-center border border-forest-100 space-y-2">
                <ChefHat className="h-10 w-10 text-forest-400 mx-auto" />
                <h3 className="font-serif text-lg font-bold text-forest-950">
                  No {appStatusFilter !== "all" ? appStatusFilter : ""} Applications
                </h3>
                <p className="text-xs text-forest-500">
                  {appStatusFilter === "pending"
                    ? "All inbound chef applications have been reviewed and qualified!"
                    : "No applications found matching this status filter."}
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB: UBER DISPATCH CONSOLE */}
        {activeTab === "dispatch" && (
          <div className="space-y-6 text-left">
            <div className="bg-white rounded-[32px] p-6 sm:p-8 border border-forest-100 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-champagne-100 text-[10px] font-black uppercase tracking-wider text-forest-950 mb-2">
                    <Sparkles className="h-3.5 w-3.5 text-champagne-600" />
                    <span>Uber / Gwiji Dispatch Console</span>
                  </div>
                  <h3 className="font-serif text-2xl sm:text-3xl font-bold text-forest-950">
                    Live Chef Matching & Dispatch
                  </h3>
                  <p className="text-xs text-forest-600 mt-1">
                    Match customer requests to verified private chefs, dispatch automated WhatsApp job alerts, and monitor service status.
                  </p>
                </div>

                {/* Filter Pills */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setDispatchFilter("all")}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                      dispatchFilter === "all"
                        ? "bg-forest-900 text-white"
                        : "bg-forest-50 text-forest-700 hover:bg-forest-100"
                    }`}
                  >
                    All ({bookings.length})
                  </button>
                  <button
                    onClick={() => setDispatchFilter("pending")}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                      dispatchFilter === "pending"
                        ? "bg-amber-500 text-white"
                        : "bg-amber-50 text-amber-800 hover:bg-amber-100"
                    }`}
                  >
                    Needs Match ({bookings.filter((b) => b.status === "pending_assignment" || b.status === "pending").length})
                  </button>
                  <button
                    onClick={() => setDispatchFilter("assigned")}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                      dispatchFilter === "assigned"
                        ? "bg-champagne-600 text-white"
                        : "bg-champagne-50 text-champagne-900 hover:bg-champagne-100"
                    }`}
                  >
                    Dispatched ({bookings.filter((b) => b.status === "assigned" || b.status === "confirmed").length})
                  </button>
                  <button
                    onClick={() => setDispatchFilter("active")}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                      dispatchFilter === "active"
                        ? "bg-emerald-600 text-white"
                        : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                    }`}
                  >
                    En Route / Active ({bookings.filter((b) => b.status === "en_route" || b.status === "cooking" || b.status === "in_progress").length})
                  </button>
                </div>
              </div>

              {/* REQUESTS LIST */}
              {bookings.length > 0 ? (
                <div className="space-y-4">
                  {bookings
                    .filter((b) => {
                      if (dispatchFilter === "pending") return b.status === "pending_assignment" || b.status === "pending";
                      if (dispatchFilter === "assigned") return b.status === "assigned" || b.status === "confirmed";
                      if (dispatchFilter === "active") return b.status === "en_route" || b.status === "cooking" || b.status === "in_progress";
                      return true;
                    })
                    .map((b) => {
                      const isUnassigned = !b.chefId || b.status === "pending_assignment" || b.status === "pending";
                      const currentlySelectedChefId = selectedChefForBooking[b.id] || b.chefId || "";
                      const assignedChefObj = chefs.find((c) => c.id === currentlySelectedChefId || c.id === b.chefId);

                      const chefWaMsg = encodeURIComponent(
                        `Hi Chef ${assignedChefObj?.name || ""}! New private dining dispatch from Book A Chef Kenya.\n\nDate: ${b.bookingDate} at ${b.bookingTime || "19:00"}\nArea: ${b.city || b.address}\nGuests: ${b.guestsCount}\nEstimated payout: KES ${Math.round(Number(b.totalPrice || 0) * 0.85).toLocaleString()}\nNotes: ${b.menuTitle || "Standard Menu"}\n\nThis job has been dispatched to you. Sign in to review and respond: https://bookachef.co.ke/chef-dashboard`
                      );

                      const clientWaMsg = encodeURIComponent(
                        `Hi ${b.clientName}! This is Book A Chef Concierge. We have matched you with ${b.chefName || "your certified chef"} for your event on ${b.bookingDate}. View live status: https://bookachef.co.ke/request/status?ref=${b.id}`
                      );

                      return (
                        <div
                          key={b.id}
                          className="bg-cream-50/70 border border-forest-100 rounded-3xl p-5 sm:p-6 space-y-4 hover:border-forest-200 transition-all"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-forest-100/80 pb-3">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-black text-xs text-forest-950 bg-white px-2.5 py-1 rounded-xl border border-forest-100">
                                #{b.id.slice(0, 10)}
                              </span>
                              <span
                                className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                  b.status === "pending_assignment" || b.status === "pending"
                                    ? "bg-amber-100 text-amber-800 border border-amber-300"
                                    : b.status === "assigned"
                                    ? "bg-champagne-200 text-forest-950 border border-champagne-400"
                                    : b.status === "en_route"
                                    ? "bg-blue-100 text-blue-900 border border-blue-300"
                                    : b.status === "cooking" || b.status === "in_progress"
                                    ? "bg-purple-100 text-purple-900 border border-purple-300"
                                    : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                }`}
                              >
                                {b.status === "pending_assignment"
                                  ? "Awaiting Chef Match"
                                  : b.status === "assigned"
                                  ? "Chef Assigned"
                                  : b.status === "en_route"
                                  ? "Chef En Route"
                                  : b.status === "cooking" || b.status === "in_progress"
                                  ? "Cooking in Kitchen"
                                  : b.status}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-forest-500 font-medium">Booking value:</span>
                              <strong className="text-forest-950 font-black">
                                {/* No fallback figure. This previously rendered a
                                    hardcoded "18,000" for any booking with a zero
                                    or missing total, inventing revenue per row. */}
                                {b.totalPrice
                                  ? `KES ${Number(b.totalPrice).toLocaleString()}`
                                  : "Not recorded"}
                              </strong>
                            </div>
                          </div>

                          {/* Event Specs Grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                            <div className="bg-white p-3 rounded-2xl border border-forest-100/60">
                              <span className="text-[10px] uppercase font-bold text-forest-400 block">Diner</span>
                              <strong className="text-forest-950 mt-0.5 block">{b.clientName}</strong>
                              <span className="text-[11px] text-forest-600 block">{b.clientPhone}</span>
                            </div>

                            <div className="bg-white p-3 rounded-2xl border border-forest-100/60">
                              <span className="text-[10px] uppercase font-bold text-forest-400 block">Date & Time</span>
                              <strong className="text-forest-950 mt-0.5 block">{b.bookingDate}</strong>
                              <span className="text-[11px] text-forest-600 block">{b.bookingTime || "19:00"}</span>
                            </div>

                            <div className="bg-white p-3 rounded-2xl border border-forest-100/60">
                              <span className="text-[10px] uppercase font-bold text-forest-400 block">Location</span>
                              <strong className="text-forest-950 mt-0.5 block truncate">{b.city || "Nairobi"}</strong>
                              <span className="text-[11px] text-forest-600 block truncate">{b.address || "Client Residence"}</span>
                            </div>

                            <div className="bg-white p-3 rounded-2xl border border-forest-100/60">
                              <span className="text-[10px] uppercase font-bold text-forest-400 block">Guests & Details</span>
                              <strong className="text-forest-950 mt-0.5 block">{b.guestsCount} Guests</strong>
                              <span className="text-[11px] text-forest-600 block truncate">{b.menuTitle || "Private Dining"}</span>
                            </div>
                          </div>

                          {/* Matching & Dispatch Actions Bar */}
                          <div className="pt-2 border-t border-forest-100/80 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                            {/* Chef Selector */}
                            <div className="flex items-center gap-2 flex-1">
                              <select
                                value={selectedChefForBooking[b.id] || b.chefId || ""}
                                onChange={(e) =>
                                  setSelectedChefForBooking((prev) => ({
                                    ...prev,
                                    [b.id]: e.target.value,
                                  }))
                                }
                                className="bg-white border border-forest-200 rounded-xl px-3 py-2 text-xs font-bold text-forest-950 focus:outline-none focus:border-forest-900 flex-1 max-w-xs"
                              >
                                <option value="">Select Certified Chef to Match...</option>
                                {chefs.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.name} ({c.cuisines?.slice(0, 2).join(", ")})
                                  </option>
                                ))}
                              </select>

                              <button
                                onClick={() => handleAssignChef(b.id)}
                                disabled={assigningId === b.id}
                                className="px-4 py-2 bg-forest-900 hover:bg-forest-800 text-white rounded-xl font-bold text-xs transition-all shrink-0 active:scale-95 disabled:opacity-50"
                              >
                                {assigningId === b.id ? "Assigning..." : isUnassigned ? "Assign Chef" : "Reassign"}
                              </button>
                            </div>

                            {/* Direct WhatsApp Dispatches */}
                            <div className="flex flex-wrap items-center gap-2 shrink-0">
                              <a
                                href={`https://wa.me/254786530713?text=${chefWaMsg}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-sm"
                              >
                                <MessageCircle className="h-3.5 w-3.5" />
                                <span>WhatsApp Chef</span>
                              </a>

                              <a
                                href={
                                  b.clientPhone
                                    ? `https://wa.me/${b.clientPhone.replace(/\D/g, "")}?text=${clientWaMsg}`
                                    : undefined
                                }
                                aria-disabled={!b.clientPhone}
                                title={
                                  b.clientPhone
                                    ? undefined
                                    : "This booking has no client phone on file"
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all ${
                                  b.clientPhone
                                    ? "bg-forest-100 hover:bg-forest-200 text-forest-900"
                                    : "bg-forest-50 text-forest-300 cursor-not-allowed"
                                } font-bold text-xs`}
                              >
                                <Phone className="h-3.5 w-3.5" />
                                <span>WhatsApp Client</span>
                              </a>

                              {/* Status Switcher */}
                              <select
                                value={b.status}
                                onChange={(e) => handleUpdateBookingStatus(b.id, e.target.value)}
                                className="bg-white border border-forest-200 rounded-xl px-2.5 py-2 text-[11px] font-bold text-forest-900 focus:outline-none"
                              >
                                <option value="pending_assignment">Pending Assignment</option>
                                <option value="assigned">Assigned</option>
                                <option value="confirmed">Confirmed</option>
                                <option value="en_route">En Route 🚗</option>
                                <option value="cooking">Cooking 👨‍🍳</option>
                                <option value="completed">Completed 🎉</option>
                                <option value="cancelled">Cancelled</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="bg-cream-50 rounded-3xl p-12 text-center border border-forest-100 space-y-2">
                  <Sparkles className="h-10 w-10 text-champagne-500 mx-auto" />
                  <h3 className="font-serif text-lg font-bold text-forest-950">
                    No Inbound Requests
                  </h3>
                  <p className="text-xs text-forest-600">
                    New guest requests from the Uber-style booking form will appear here for concierge dispatch.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: ALL BOOKINGS */}
        {activeTab === "bookings" && (
          <div className="bg-white rounded-[32px] p-6 sm:p-8 border border-forest-100 shadow-sm text-left space-y-6">
            <h3 className="font-serif text-2xl font-bold text-forest-950">
              Master Platform Bookings
            </h3>
            {bookings.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-cream-100 text-[10px] font-black uppercase tracking-wider text-forest-500 border-b border-forest-200">
                    <tr>
                      <th className="p-3">Diner</th>
                      <th className="p-3">Chef</th>
                      <th className="p-3">Date</th>
                      <th className="p-3">Guests</th>
                      <th className="p-3">Total Value</th>
                      <th className="p-3">Escrow Fee</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-forest-100">
                    {bookings.map((b) => (
                      <tr key={b.id} className="hover:bg-cream-50">
                        <td className="p-3 font-bold text-forest-950">{b.clientName}</td>
                        <td className="p-3 font-medium text-forest-800">{b.chefName}</td>
                        <td className="p-3">{b.bookingDate}</td>
                        <td className="p-3">{b.guestsCount}</td>
                        <td className="p-3 font-black text-forest-950">KES {b.totalPrice.toLocaleString()}</td>
                        <td className="p-3 font-bold text-champagne-700">KES {b.depositAmount.toLocaleString()}</td>
                        <td className="p-3">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800">
                            {b.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-forest-500 py-6">No reservations in the database.</p>
            )}
          </div>
        )}
      </main>

      {/* ADMIN LISTING MODAL: CREATE / PUBLISH CERTIFIED CHEF */}
      {isListingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-forest-950/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="relative bg-white rounded-[36px] max-w-2xl w-full max-h-[92vh] overflow-y-auto p-6 sm:p-10 space-y-6 border border-forest-100 text-left">
            <button
              onClick={() => setIsListingModalOpen(false)}
              className="absolute top-6 right-6 h-9 w-9 rounded-full bg-forest-50 hover:bg-forest-100 text-forest-900 flex items-center justify-center"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cream-100 text-[10px] font-black uppercase tracking-widest text-champagne-700">
                <Award className="h-3.5 w-3.5" /> Book A Chef Official Certification
              </div>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-forest-950">
                List New Certified Private Chef
              </h2>
              <p className="text-xs text-forest-600">
                Attach official Book A Chef uniform portrait, verified dish imagery, and tasting certification notes.
              </p>
            </div>

            <form onSubmit={handlePublishChef} className="space-y-5 text-xs">
              {/* 1. Identity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-forest-950">Chef Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Chef Brian Mutua"
                    value={chefName}
                    onChange={(e) => setChefName(e.target.value)}
                    className="w-full bg-cream-50 border border-forest-100 rounded-2xl p-3 font-bold text-forest-950 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-forest-950">Brand / Studio Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Atelier Mutua"
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    className="w-full bg-cream-50 border border-forest-100 rounded-2xl p-3 font-bold text-forest-950 outline-none"
                  />
                </div>
              </div>

              {/* 2. City & Price */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-forest-950">City / Base Location *</label>
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full bg-cream-50 border border-forest-100 rounded-2xl p-3 font-bold text-forest-950 outline-none"
                  >
                    <option value="Nairobi">Nairobi (All Areas)</option>
                    <option value="Mombasa">Mombasa & Coast</option>
                    <option value="Diani Beach">Diani Beach (Villas)</option>
                    <option value="Watamu">Watamu / Malindi</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-forest-950">Price Per Guest (KES) *</label>
                  <input
                    type="number"
                    required
                    value={pricePerGuest}
                    onChange={(e) => setPricePerGuest(e.target.value)}
                    className="w-full bg-cream-50 border border-forest-100 rounded-2xl p-3 font-bold text-forest-950 outline-none"
                  />
                </div>
              </div>

              {/* 3. Photo Uploads (Supabase Storage) */}
              <div className="space-y-4 pt-3 border-t border-forest-100">
                <p className="font-black text-forest-950 uppercase tracking-widest text-[10px]">
                  📸 Chef Photos — Upload or Paste URL
                </p>
                <p className="text-[11px] text-forest-600">
                  Upload from device (stored securely in Supabase) or paste a direct image URL. Placeholder chefs are marked with watermark overlays.
                </p>

                {/* Avatar Portrait */}
                <div className="space-y-1.5">
                  <label className="font-bold text-forest-800">Chef Portrait (in Book A Chef uniform) *</label>
                  <div className="flex items-center gap-3">
                    {avatarUrl && (
                      <div className="relative h-14 w-14 rounded-2xl overflow-hidden shrink-0 border border-forest-200 bg-cream-100">
                        <Image src={avatarUrl} alt="portrait preview" fill className="object-cover" unoptimized />
                      </div>
                    )}
                    <div className="flex-1 space-y-1">
                      <label className="cursor-pointer flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-forest-200 bg-cream-50 hover:bg-cream-100 text-xs font-bold text-forest-700 transition-all">
                        {uploadingPhoto === 'avatar' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
                        {uploadingPhoto === 'avatar' ? 'Uploading...' : 'Upload Photo'}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const url = await uploadPhoto(file, 'avatar');
                            if (url) setAvatarUrl(url);
                          }}
                        />
                      </label>
                      <input
                        type="url"
                        placeholder="Or paste image URL..."
                        value={avatarUrl}
                        onChange={(e) => setAvatarUrl(e.target.value)}
                        className="w-full bg-cream-50 border border-forest-100 rounded-xl p-2.5 text-[11px] text-forest-700 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Cover Dish Photo */}
                <div className="space-y-1.5">
                  <label className="font-bold text-forest-800">Signature Dish / Cover Photo *</label>
                  <div className="flex items-center gap-3">
                    {coverDishUrl && (
                      <div className="relative h-14 w-20 rounded-xl overflow-hidden shrink-0 border border-forest-200 bg-cream-100">
                        <Image src={coverDishUrl} alt="cover preview" fill className="object-cover" unoptimized />
                      </div>
                    )}
                    <div className="flex-1 space-y-1">
                      <label className="cursor-pointer flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-forest-200 bg-cream-50 hover:bg-cream-100 text-xs font-bold text-forest-700 transition-all">
                        {uploadingPhoto === 'cover' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
                        {uploadingPhoto === 'cover' ? 'Uploading...' : 'Upload Photo'}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const url = await uploadPhoto(file, 'cover');
                            if (url) setCoverDishUrl(url);
                          }}
                        />
                      </label>
                      <input
                        type="url"
                        placeholder="Or paste image URL..."
                        value={coverDishUrl}
                        onChange={(e) => setCoverDishUrl(e.target.value)}
                        className="w-full bg-cream-50 border border-forest-100 rounded-xl p-2.5 text-[11px] text-forest-700 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Gallery Photos */}
                <div className="space-y-1.5">
                  <label className="font-bold text-forest-800">Gallery Dish Photos (optional)</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="cursor-pointer flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-dashed border-forest-100 bg-cream-50 hover:bg-cream-100 text-xs font-bold text-forest-600 transition-all">
                        {uploadingPhoto === 'dish1' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageIcon className="h-3.5 w-3.5" />}
                        {uploadingPhoto === 'dish1' ? 'Uploading...' : 'Gallery Photo 1'}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const url = await uploadPhoto(file, 'dish1');
                            if (url) setDishPhoto1(url);
                          }}
                        />
                      </label>
                      <input
                        type="url"
                        placeholder="Or paste URL..."
                        value={dishPhoto1}
                        onChange={(e) => setDishPhoto1(e.target.value)}
                        className="w-full bg-cream-50 border border-forest-100 rounded-xl p-2 text-[11px] text-forest-700 outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="cursor-pointer flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-dashed border-forest-100 bg-cream-50 hover:bg-cream-100 text-xs font-bold text-forest-600 transition-all">
                        {uploadingPhoto === 'dish2' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageIcon className="h-3.5 w-3.5" />}
                        {uploadingPhoto === 'dish2' ? 'Uploading...' : 'Gallery Photo 2'}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const url = await uploadPhoto(file, 'dish2');
                            if (url) setDishPhoto2(url);
                          }}
                        />
                      </label>
                      <input
                        type="url"
                        placeholder="Or paste URL..."
                        value={dishPhoto2}
                        onChange={(e) => setDishPhoto2(e.target.value)}
                        className="w-full bg-cream-50 border border-forest-100 rounded-xl p-2 text-[11px] text-forest-700 outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Cuisines Multi-select */}
              <div className="space-y-2 pt-3 border-t border-forest-100">
                <label className="font-bold text-forest-950">Cuisines Mastered</label>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_CUISINES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => toggleCuisine(c)}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-all border ${
                        selectedCuisines.includes(c)
                          ? "bg-forest-900 text-white border-forest-900"
                          : "bg-cream-50 text-forest-800 border-forest-100 hover:bg-cream-100"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* 5. Chef Biography */}
              <div className="space-y-1 pt-3 border-t border-forest-100">
                <label className="font-bold text-forest-950">Chef Bio & Tasting Panel Endorsement *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Verified by Book A Chef executive panel. Executive chef pedigree, specialized dishes, and kitchen hospitality..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full bg-cream-50 border border-forest-100 rounded-2xl p-3 font-medium text-forest-950 outline-none"
                />
              </div>

              {/* 6. Signature Menu */}
              <div className="space-y-3 pt-3 border-t border-forest-100 bg-cream-50/60 p-4 rounded-2xl">
                <p className="font-black text-forest-950 uppercase tracking-widest text-[10px]">
                  🍽️ Initial Signature Menu
                </p>
                <input
                  type="text"
                  placeholder="Menu Name (e.g. Coastal Tamarind 4-Course Tasting)..."
                  value={menuTitle}
                  onChange={(e) => setMenuTitle(e.target.value)}
                  className="w-full bg-white border border-forest-100 rounded-xl p-2.5 font-bold outline-none"
                />
                <input
                  type="text"
                  placeholder="Main Course dish name *..."
                  value={mainName}
                  onChange={(e) => setMainName(e.target.value)}
                  className="w-full bg-white border border-forest-100 rounded-xl p-2.5 font-medium outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-forest-100">
                <button
                  type="button"
                  onClick={() => setIsListingModalOpen(false)}
                  className="px-5 py-3 rounded-2xl border border-forest-200 text-xs font-bold text-forest-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingChef}
                  className="px-8 py-3.5 rounded-2xl bg-forest-900 text-cream-50 font-black text-xs uppercase tracking-widest hover:bg-forest-800 shadow-xl flex items-center gap-2"
                >
                  {submittingChef ? <Loader2 className="h-4 w-4 animate-spin" /> : "Publish Certified Chef to Live Marketplace ✓"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
