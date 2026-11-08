"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Shield,
  ChefHat,
  CheckCircle2,
  Sparkles,
  Search,
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
  X,
  Check,
  ExternalLink,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { createClient } from "@/utils/supabase/client";
import {
  applicationCompleteness,
  unpackApplicationMeta,
} from "@/utils/chefApplication";
import { chefAvatar } from "@/utils/marketplace";

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

const inputClass =
  "w-full px-4 py-3 rounded-xl bg-white border border-forest-200 text-sm font-medium text-forest-950 placeholder-forest-400 outline-none focus:border-forest-950 focus:ring-1 focus:ring-forest-950 transition-colors";

type AdminTab = "overview" | "chefs" | "applications";

export default function AdminPortalPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");

  const [applications, setApplications] = useState<any[]>([]);
  const [chefs, setChefs] = useState<any[]>([]);
  const [unlinkedChefs, setUnlinkedChefs] = useState<any[]>([]);
  const [appStatusFilter, setAppStatusFilter] = useState<"pending" | "approved" | "all">("pending");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [adminNotice, setAdminNotice] = useState<{
    tone: "success" | "error";
    message: string;
    whatsappUrl?: string | null;
  } | null>(null);

  // Listing modal state
  const [isListingModalOpen, setIsListingModalOpen] = useState(false);
  const [submittingChef, setSubmittingChef] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState<string | null>(null);

  // Edit modal state — edits an existing chef's public details.
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingChef, setEditingChef] = useState<any>(null);
  const [savingEdit, setSavingEdit] = useState(false);

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
  const [chefEmail, setChefEmail] = useState("");
  const [chefPhone, setChefPhone] = useState("");
  const [brandName, setBrandName] = useState("");
  const [tagline, setTagline] = useState("Book A Chef Certified Master");
  const [city, setCity] = useState("Nairobi");
  const [pricePerGuest, setPricePerGuest] = useState("4500");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [coverDishUrl, setCoverDishUrl] = useState("");
  const [dishPhoto1, setDishPhoto1] = useState("");
  const [dishPhoto2, setDishPhoto2] = useState("");
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>(["Swahili", "Seafood"]);
  const [selectedDietary, setSelectedDietary] = useState<string[]>(["Halal"]);
  const [bio, setBio] = useState("");
  const [menuTitle, setMenuTitle] = useState("Royal Signature Degustation");
  const [mainName, setMainName] = useState("");

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

        // 1. Fetch chefs.
        const { data: dbChefs } = await supabase
          .from("chefs")
          .select("*")
          .order("created_at", { ascending: false });

        if (dbChefs) {
          setUnlinkedChefs(
            (dbChefs as any[]).filter((c) => !c.user_id)
          );

          const mapped: any[] = (dbChefs as any[]).map((c: any) => ({
            id: c.id,
            userId: c.user_id || null,
            email: c.email || null,
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
            featured: c.featured ?? false,
            isAvailable: c.is_available ?? false,
            phone: c.phone || null,
            slug: c.slug || null,
            menus: [],
            reviews: [],
          }));
          setChefs(mapped);
        }

        // 2. Fetch applications.
        const { data: dbApps } = await supabase
          .from("chef_applications")
          .select("*")
          .order("created_at", { ascending: false });

        if (dbApps) {
          setApplications(
            (dbApps as any[]).map((a: any) => {
              const displayName =
                a.full_name ||
                (a.first_name ? `${a.first_name} ${a.last_name || ""}`.trim() : "") ||
                a.email?.split("@")[0] ||
                "Chef Applicant";

              const meta = unpackApplicationMeta(a.portfolio_links);

              return {
                id: a.id,
                userId: a.user_id || null,
                fullName: displayName,
                email: a.email || "",
                phone: a.phone || a.phone_number || "",
                brandName: a.brand_name,
                experienceYears: a.experience_years || "3+ years",
                city: a.city || "Nairobi",
                neighborhood: a.neighborhood || "Kilimani",
                cuisines: a.cuisines || [],
                dietary: a.dietary || a.dietary_specialties || [],
                startingPrice: Number(a.starting_price) || 4500,
                specialtyDish: a.specialty_dish || "Signature course",
                bio: a.bio || "",
                status: a.status || "pending",
                createdAt: a.created_at,
                meta,
                nationalIdNumber: a.national_id_number || meta.national_id_number || "",
                serviceFormats: a.service_formats || meta.service_formats || [],
                completeness: applicationCompleteness(a),
              };
            })
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

  const mapChefRow = (c: any) => ({
    id: c.id,
    userId: c.user_id || null,
    email: c.email || null,
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
    featured: c.featured ?? false,
    isAvailable: c.is_available ?? false,
    phone: c.phone || null,
    slug: c.slug || null,
    menus: [],
    reviews: [],
  });

  const callChefAction = async (payload: Record<string, any>) => {
    const response = await fetch("/api/admin/chef-actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || "The action failed. Please retry.");
    }
    return data;
  };

  const handleApproveApplication = async (app: any) => {
    setActionLoadingId(app.id);
    setAdminNotice(null);
    try {
      const data = await callChefAction({
        action: "approve",
        application_id: app.id,
      });

      setApplications((prev) =>
        prev.map((a) =>
          a.id === app.id ? { ...a, status: "approved", userId: data.user_id } : a
        )
      );
      if (data.chef) {
        setChefs((prev) => [
          mapChefRow(data.chef),
          ...prev.filter((c) => c.id !== data.chef.id),
        ]);
        setUnlinkedChefs((prev) => prev.filter((c) => c.id !== data.chef.id));
      }
      setAdminNotice({
        tone: "success",
        message: data.user_id
          ? `${app.fullName} is approved. Their login is ${data.email} and the invite link is ready.`
          : `${app.fullName}'s profile was created, but no login account could be attached. Add an email and use Invite.`,
        whatsappUrl: data.whatsapp_url,
      });
    } catch (err: any) {
      setAdminNotice({ tone: "error", message: err.message });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleInviteApplicant = async (app: any) => {
    setActionLoadingId(app.id);
    setAdminNotice(null);
    try {
      const data = await callChefAction({
        action: "invite",
        application_id: app.id,
      });
      setAdminNotice({
        tone: data.user_id ? "success" : "error",
        message: data.user_id
          ? `Login ready for ${app.email}. Send the WhatsApp invite so they can set a password.`
          : data.message || "Could not create the login.",
        whatsappUrl: data.whatsapp_url,
      });
    } catch (err: any) {
      setAdminNotice({ tone: "error", message: err.message });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSetApplicationStatus = async (
    appId: string,
    status: "pending" | "under_review" | "rejected"
  ) => {
    setActionLoadingId(appId);
    setAdminNotice(null);
    try {
      await callChefAction({
        action: "set_status",
        application_id: appId,
        status,
      });
      setApplications((prev) =>
        prev.map((a) => (a.id === appId ? { ...a, status } : a))
      );
      setAdminNotice({
        tone: "success",
        message:
          status === "rejected"
            ? "Application declined. The applicant can revise and resubmit from their dashboard."
            : `Application moved to ${status.replace("_", " ")}.`,
      });
    } catch (err: any) {
      setAdminNotice({ tone: "error", message: err.message });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleLinkChef = async (chef: any) => {
    const email = window.prompt(
      `Email address for ${chef.name}. This creates or links their login.`,
      chef.email || ""
    );
    if (!email) return;
    const phone = window.prompt(
      `Phone number for ${chef.name} (used for the WhatsApp invite).`,
      ""
    );

    setActionLoadingId(chef.id);
    setAdminNotice(null);
    try {
      const data = await callChefAction({
        action: "link_chef",
        chef_id: chef.id,
        email: email.trim(),
        full_name: chef.name,
        phone: phone || "",
      });
      setChefs((prev) =>
        prev.map((c) =>
          c.id === chef.id ? { ...c, userId: data.user_id, email: email.trim() } : c
        )
      );
      setUnlinkedChefs((prev) => prev.filter((c) => c.id !== chef.id));
      setAdminNotice({
        tone: "success",
        message: `${chef.name} can now sign in as ${email}. Send the invite to set a password.`,
        whatsappUrl: data.whatsapp_url,
      });
    } catch (err: any) {
      setAdminNotice({ tone: "error", message: err.message });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handlePublishChef = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingChef(true);
    setAdminNotice(null);

    const gallery = [dishPhoto1, dishPhoto2].filter(Boolean);

    try {
      const data = await callChefAction({
        action: "create_listing",
        full_name: chefName.trim(),
        email: chefEmail.trim(),
        phone: chefPhone.trim(),
        brand_name: brandName.trim(),
        tagline,
        city,
        price_per_guest: Number(pricePerGuest) || 4500,
        cuisines: selectedCuisines,
        dietary: selectedDietary,
        bio: bio.trim(),
        avatar_url: avatarUrl.trim(),
        cover_image_url: coverDishUrl.trim(),
        gallery_images: gallery,
      });

      if (data.chef) {
        setChefs((prev) => [mapChefRow(data.chef), ...prev]);
      }
      setIsListingModalOpen(false);
      setChefEmail("");
      setChefPhone("");
      setAdminNotice({
        tone: "success",
        message: `${chefName} has an account and a profile. Send the WhatsApp invite so they can set a password.`,
        whatsappUrl: data.whatsapp_url,
      });
    } catch (err: any) {
      setAdminNotice({ tone: "error", message: err.message });
    } finally {
      setSubmittingChef(false);
    }
  };

  const handleToggleChefAvailability = async (chefId: string, current: boolean) => {
    const next = !current;
    setAdminNotice(null);
    try {
      const data = await callChefAction({
        action: "set_available",
        chef_id: chefId,
        is_available: next,
      });
      setChefs((prev) =>
        prev.map((c) => (c.id === chefId ? { ...c, isAvailable: data.is_available } : c))
      );
    } catch (err: any) {
      setAdminNotice({ tone: "error", message: err.message });
    }
  };

  const openEditChef = (chef: any) => {
    setEditingChef({
      id: chef.id,
      name: chef.name || "",
      brand_name: chef.brand || "",
      tagline: chef.tagline || "",
      bio: chef.bio || "",
      city: chef.location || "Nairobi",
      phone: chef.phone || "",
      email: chef.email || "",
      price_per_guest: String(chef.startingPrice || 4500),
      cuisines: chef.cuisines || [],
      dietary: chef.dietary || [],
      avatar: chef.avatar || "",
      cover: chef.coverImage || "",
      gallery: chef.gallery || [],
      verified: chef.verified ?? true,
      featured: chef.featured ?? false,
      is_available: chef.isAvailable ?? false,
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingChef) return;
    setSavingEdit(true);
    setAdminNotice(null);
    try {
      const data = await callChefAction({
        action: "update_listing",
        chef_id: editingChef.id,
        name: editingChef.name,
        brand_name: editingChef.brand_name,
        tagline: editingChef.tagline,
        bio: editingChef.bio,
        city: editingChef.city,
        phone: editingChef.phone,
        email: editingChef.email,
        price_per_guest: Number(editingChef.price_per_guest) || 0,
        cuisines: editingChef.cuisines,
        dietary_specialties: editingChef.dietary,
        avatar_url: editingChef.avatar,
        cover_image_url: editingChef.cover,
        gallery_images: editingChef.gallery,
        verified: editingChef.verified,
        featured: editingChef.featured,
        is_available: editingChef.is_available,
      });

      if (data.chef) {
        setChefs((prev) => [
          mapChefRow(data.chef),
          ...prev.filter((c) => c.id !== data.chef.id),
        ]);
      }
      setIsEditModalOpen(false);
      setAdminNotice({ tone: "success", message: `${editingChef.name} updated.` });
    } catch (err: any) {
      setAdminNotice({ tone: "error", message: err.message });
    } finally {
      setSavingEdit(false);
    }
  };

  const toggleEditCuisine = (c: string) => {
    setEditingChef((prev: any) => ({
      ...prev,
      cuisines: prev.cuisines.includes(c)
        ? prev.cuisines.filter((i: string) => i !== c)
        : [...prev.cuisines, c],
    }));
  };

  const toggleEditDietary = (d: string) => {
    setEditingChef((prev: any) => ({
      ...prev,
      dietary: prev.dietary.includes(d)
        ? prev.dietary.filter((i: string) => i !== d)
        : [...prev.dietary, d],
    }));
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

  const pendingApplications = applications.filter(
    (a) => a.status === "pending" || a.status === "under_review"
  ).length;

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
            <h1 className="text-3xl font-bold text-forest-950 tracking-tight">Directory Console</h1>
            <p className="text-forest-500 text-sm mt-1">
              Manage chef profiles and review applications.
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

        {adminNotice && (
          <div
            className={`mb-5 rounded-2xl border px-4 py-3 text-sm font-medium flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 ${
              adminNotice.tone === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-red-50 border-red-200 text-red-700"
            }`}
          >
            <span>{adminNotice.message}</span>
            <div className="flex items-center gap-3 shrink-0">
              {adminNotice.whatsappUrl && (
                <a
                  href={adminNotice.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 text-white px-3 py-1.5 text-xs font-bold hover:bg-emerald-700"
                >
                  <Phone className="h-3.5 w-3.5" />
                  Send WhatsApp invite
                </a>
              )}
              <button
                onClick={() => setAdminNotice(null)}
                className="text-xs font-medium underline underline-offset-2 opacity-70 hover:opacity-100"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6 text-left">
          <div className="bg-white rounded-2xl border border-forest-100 p-5">
            <p className="text-[10px] font-medium text-forest-400 uppercase mb-1.5">Chefs</p>
            <p className="text-xl sm:text-2xl font-bold text-forest-950">{chefs.length}</p>
            <p className="text-xs text-forest-500 mt-0.5">In the directory</p>
          </div>

          <div className="bg-white rounded-2xl border border-forest-100 p-5">
            <p className="text-[10px] font-medium text-forest-400 uppercase mb-1.5">Applications</p>
            <p className="text-xl sm:text-2xl font-bold text-amber-600">
              {pendingApplications}
            </p>
            <button
              onClick={() => setActiveTab("applications")}
              className="text-xs text-forest-500 hover:text-forest-950 transition-colors mt-0.5"
            >
              Review →
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-forest-100 p-5 col-span-2 lg:col-span-1">
            <p className="text-[10px] font-medium text-forest-400 uppercase mb-1.5">Missing login</p>
            <p className="text-xl sm:text-2xl font-bold text-forest-950">
              {unlinkedChefs.length}
            </p>
            <p className="text-xs text-forest-500 mt-0.5">Chefs who cannot sign in yet</p>
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
            {pendingApplications > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                {pendingApplications}
              </span>
            )}
          </button>
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-left">
            <div className="lg:col-span-8 bg-white rounded-2xl p-6 sm:p-8 border border-forest-100 shadow-sm space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-sans text-2xl font-bold text-forest-950">
                    Chef directory
                  </h3>
                  <p className="text-xs text-forest-500">Live, verified profiles.</p>
                </div>
                <button
                  onClick={() => setIsListingModalOpen(true)}
                  className="text-xs font-bold text-champagne-700 underline"
                >
                  + Add chef
                </button>
              </div>

              <div className="space-y-4">
                {chefs.slice(0, 5).map((c) => (
                  <div
                    key={c.id}
                    className="p-4 rounded-2xl bg-cream-50/70 border border-forest-100 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative h-12 w-12 rounded-2xl overflow-hidden shrink-0 border border-forest-200 bg-forest-950">
                        <Image src={chefAvatar(c)} alt={c.name} fill className="object-cover" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-forest-950 block truncate">
                          {c.name}
                        </span>
                        <p className="text-[11px] text-forest-600 truncate">
                          {c.brand} • {c.cuisines.join(", ")}
                        </p>
                        {c.phone && (
                          <p className="text-[11px] text-forest-500 truncate">{c.phone}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-black text-forest-950 block">
                        {c.verified ? "● Live" : "● Unverified"}
                      </span>
                      {c.slug && (
                        <Link
                          href={`/chefs/${c.slug}`}
                          target="_blank"
                          className="text-[10px] font-bold text-forest-500 hover:text-forest-900 uppercase"
                        >
                          View
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Admin Actions */}
            <div className="lg:col-span-4 bg-white rounded-2xl p-6 sm:p-8 border border-forest-100 shadow-sm space-y-4">
              <h3 className="font-sans text-xl font-bold text-forest-950">
                Admin Controls
              </h3>
              <p className="text-xs text-forest-500 leading-relaxed">
                Only Super Admins can publish and verify chefs on Book A Chef
                Kenya.
              </p>
              <button
                onClick={() => setIsListingModalOpen(true)}
                className="w-full py-3.5 px-4 rounded-2xl bg-forest-900 text-cream-50 font-bold text-xs flex items-center justify-between shadow-md hover:bg-forest-800"
              >
                <span>+ Add chef</span>
                <ArrowUpRight className="h-4 w-4" />
              </button>
              <Link
                href="/chefs"
                target="_blank"
                className="w-full py-3.5 px-4 rounded-2xl bg-cream-100 text-forest-900 font-bold text-xs flex items-center justify-between hover:bg-cream-200"
              >
                <span>View public directory</span>
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        )}

        {/* TAB 2: MANAGE CHEFS */}
        {activeTab === "chefs" && (
          <div className="space-y-6 text-left">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div>
                <h3 className="text-2xl font-bold text-forest-950">
                  Chef directory ({chefs.length})
                </h3>
                <p className="text-xs text-forest-500">
                  A chef can sign in once their profile is linked to a login
                  account.
                </p>
              </div>
              <button
                onClick={() => setIsListingModalOpen(true)}
                className="px-5 py-3 rounded-xl bg-forest-950 text-white font-bold text-sm hover:bg-forest-800 flex items-center gap-1.5 self-start sm:self-auto"
              >
                <Plus className="h-4 w-4" /> Add chef
              </button>
            </div>

            {unlinkedChefs.length > 0 && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                <div className="flex items-start gap-2">
                  <ShieldAlert className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-forest-950">
                      {unlinkedChefs.length} chef
                      {unlinkedChefs.length === 1 ? "" : "s"} cannot sign in
                    </p>
                    <p className="text-xs text-forest-600 mt-1 mb-3">
                      These profiles have no login account. Link an email to
                      create the account and send an invite.
                    </p>
                    <div className="space-y-2">
                      {unlinkedChefs.map((chef) => (
                        <div
                          key={chef.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl bg-white border border-amber-200 px-3 py-2"
                        >
                          <div className="text-xs">
                            <span className="font-bold text-forest-950">
                              {chef.name}
                            </span>
                            <span className="text-forest-500">
                              {" "}
                              · {chef.city || "Nairobi"} · KES{" "}
                              {Number(chef.price_per_guest || 0).toLocaleString()}
                              /guest
                            </span>
                          </div>
                          <button
                            onClick={() => handleLinkChef(chef)}
                            disabled={actionLoadingId === chef.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-forest-950 text-white text-xs font-bold hover:bg-forest-800 disabled:opacity-50"
                          >
                            {actionLoadingId === chef.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Mail className="h-3.5 w-3.5" />
                            )}
                            Link login
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {chefs.map((chef) => (
                <div
                  key={chef.id}
                  className="bg-white rounded-2xl p-5 border border-forest-100 space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="relative h-14 w-14 rounded-xl overflow-hidden shrink-0 border border-forest-100 bg-forest-950">
                        {chef.avatar ? (
                          <Image src={chef.avatar} alt={chef.name} fill className="object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <ChefHat className="h-6 w-6 text-forest-400" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-base font-bold text-forest-950 leading-tight truncate">
                          {chef.name}
                        </h4>
                        <p className="text-xs text-forest-600 truncate">{chef.brand}</p>
                        <p className="text-[11px] text-forest-500 truncate">
                          {chef.email || "No email on file"}
                        </p>
                      </div>
                    </div>

                    {chef.coverImage && (
                      <div className="relative aspect-video rounded-xl overflow-hidden bg-forest-100">
                        <Image src={chef.coverImage} alt={chef.name} fill className="object-cover" />
                      </div>
                    )}

                    <p className="text-xs text-forest-600 line-clamp-2">{chef.bio}</p>

                    <div className="flex flex-wrap gap-1">
                      {chef.cuisines.slice(0, 5).map((c: string) => (
                        <span
                          key={c}
                          className="px-2 py-0.5 rounded-full bg-forest-50 text-forest-800 text-[10px] font-medium"
                        >
                          {c}
                        </span>
                      ))}
                    </div>

                    {chef.phone && (
                      <p className="text-xs text-forest-600 flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-forest-400" />
                        {chef.phone}
                      </p>
                    )}
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
                            : "bg-cream-100 text-forest-600"
                        }`}
                      >
                        {chef.isAvailable ? "● Online" : "● Offline"}
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <span
                        className={
                          chef.userId
                            ? "text-emerald-700 font-medium"
                            : "text-amber-700 font-medium"
                        }
                      >
                        {chef.userId ? "Login linked" : "No login"}
                      </span>
                      <div className="flex items-center gap-2">
                        {chef.slug && (
                          <Link
                            href={`/chefs/${chef.slug}`}
                            target="_blank"
                            className="inline-flex items-center gap-1 text-forest-600 hover:text-forest-950 font-medium"
                          >
                            <ExternalLink className="h-3 w-3" />
                            View
                          </Link>
                        )}
                        <button
                          onClick={() => openEditChef(chef)}
                          className="inline-flex items-center gap-1 text-forest-950 font-bold underline underline-offset-2"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleLinkChef(chef)}
                          disabled={actionLoadingId === chef.id}
                          className="inline-flex items-center gap-1 text-forest-950 font-bold underline underline-offset-2 disabled:opacity-50"
                        >
                          {chef.userId ? "Send invite" : "Link login"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: APPLICATIONS */}
        {activeTab === "applications" && (
          <div className="space-y-6 text-left">
            <div className="flex flex-col gap-3">
              <div>
                <h3 className="text-2xl font-bold text-forest-950">
                  Chef applications
                </h3>
                <p className="text-xs text-forest-500">
                  Approving creates the login account, the profile, and a
                  signature menu in one step, then gives you a WhatsApp invite.
                </p>
              </div>

              <div className="flex border-b border-forest-100 overflow-x-auto">
                {(
                  [
                    ["pending", `Pending (${pendingApplications})`],
                    ["approved", `Approved (${applications.filter((a) => a.status === "approved").length})`],
                    ["all", `All (${applications.length})`],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => setAppStatusFilter(value)}
                    className={`px-1 py-3 mr-6 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                      appStatusFilter === value
                        ? "border-forest-950 text-forest-950"
                        : "border-transparent text-forest-500 hover:text-forest-800"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {applications.filter((a) => (appStatusFilter === "all"
                        ? true
                        : appStatusFilter === "pending"
                        ? a.status === "pending" ||
                          a.status === "under_review" ||
                          a.status === "rejected"
                        : a.status === appStatusFilter)).length > 0 ? (
              <div className="grid grid-cols-1 gap-6">
                {applications
                  .filter((a) => (appStatusFilter === "all"
                        ? true
                        : appStatusFilter === "pending"
                        ? a.status === "pending" ||
                          a.status === "under_review" ||
                          a.status === "rejected"
                        : a.status === appStatusFilter))
                  .map((app) => {
                    const cleanPhone = app.phone
                      ? app.phone.replace(/[^0-9]/g, "").replace(/^0/, "254")
                      : "";

                    const kycMessage = `Hi Chef ${app.fullName || ""}, this is Book A Chef Kenya. We reviewed your chef application and would like to schedule a quick 10-minute video KYC call before activating your profile. When are you free today?`;

                    return (
                      <div
                        key={app.id}
                        className="bg-white rounded-2xl p-6 border border-forest-100 space-y-4"
                      >
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-2 pb-4 border-b border-forest-100">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-xl font-bold text-forest-950">
                                {app.fullName}
                              </h4>
                              {app.brandName && (
                                <span className="text-xs font-medium text-forest-700 bg-cream-100 px-2.5 py-0.5 rounded-full">
                                  {app.brandName}
                                </span>
                              )}
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  app.userId
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-amber-50 text-amber-700"
                                }`}
                              >
                                {app.userId ? "Account ready" : "No login yet"}
                              </span>
                            </div>
                            <p className="text-xs text-forest-600 mt-1">
                              {app.experienceYears} experience · {app.city} (
                              {app.neighborhood}) · {app.completeness?.percentage ?? 0}%
                              profile
                            </p>
                            <p className="text-[11px] text-forest-500 mt-0.5">
                              Applied{" "}
                              {new Date(app.createdAt).toLocaleDateString("en-KE", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </p>
                          </div>

                          <span
                            className={`text-[10px] font-bold uppercase tracking-wide px-3 py-1 rounded-full shrink-0 ${
                              app.status === "approved"
                                ? "bg-emerald-100 text-emerald-800"
                                : app.status === "rejected"
                                ? "bg-red-100 text-red-700"
                                : app.status === "under_review"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {app.status === "approved"
                              ? "Approved"
                              : app.status === "under_review"
                              ? "Under review"
                              : app.status === "rejected"
                              ? "Declined"
                              : "Pending"}
                          </span>
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

                          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-forest-100">
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-forest-700 bg-cream-50 px-2 py-0.5 rounded-full border border-forest-100">
                              ID:{" "}
                              {app.nationalIdNumber
                                ? `••••${String(app.nationalIdNumber).slice(-4)}`
                                : "not provided"}
                            </span>
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                                app.meta?.vetting?.goodConduct
                                  ? "text-emerald-800 bg-emerald-50 border-emerald-200"
                                  : "text-forest-600 bg-cream-50 border-forest-100"
                              }`}
                            >
                              Good conduct:{" "}
                              {app.meta?.vetting?.goodConduct ? "on file" : "pending"}
                            </span>
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                                app.meta?.vetting?.foodSafety
                                  ? "text-emerald-800 bg-emerald-50 border-emerald-200"
                                  : "text-forest-600 bg-cream-50 border-forest-100"
                              }`}
                            >
                              Food safety:{" "}
                              {app.meta?.vetting?.foodSafety ? "on file" : "pending"}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-forest-700 bg-cream-50 px-2 py-0.5 rounded-full border border-forest-100">
                              {app.meta?.vetting?.kitchenTasting
                                ? "Tasting: agreed"
                                : "Tasting: not agreed"}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-forest-700 bg-cream-50 px-2 py-0.5 rounded-full border border-forest-100">
                              {app.meta?.vetting?.haccp ? "HACCP certified" : "HACCP: no"}
                            </span>
                          </div>

                          {app.completeness?.missing?.length > 0 && (
                            <div className="pt-2">
                              <p className="text-[10px] font-medium text-forest-500 mb-1">
                                Missing from profile
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {app.completeness.missing.map((item: string) => (
                                  <span
                                    key={item}
                                    className="px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-900 text-[10px] font-medium"
                                  >
                                    {item}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
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
                                  onClick={() => handleApproveApplication(app)}
                                  disabled={actionLoadingId === app.id || !app.email}
                                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-forest-950 hover:bg-forest-800 text-white font-bold text-xs disabled:opacity-50 transition-colors"
                                >
                                  {actionLoadingId === app.id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Check className="h-3.5 w-3.5" />
                                  )}
                                  Approve &amp; create login
                                </button>
                                <button
                                  onClick={() => handleInviteApplicant(app)}
                                  disabled={actionLoadingId === app.id || !app.email}
                                  className="px-3 py-2 rounded-xl border border-forest-200 text-forest-800 font-medium text-xs hover:bg-cream-50 disabled:opacity-50 transition-colors"
                                >
                                  Send invite
                                </button>
                                {app.status !== "rejected" && (
                                  <button
                                    onClick={() =>
                                      handleSetApplicationStatus(app.id, "rejected")
                                    }
                                    disabled={actionLoadingId === app.id}
                                    className="px-3 py-2 rounded-xl bg-red-50 text-red-700 font-medium text-xs border border-red-200 hover:bg-red-100 disabled:opacity-50 transition-colors"
                                  >
                                    Decline
                                  </button>
                                )}
                                {app.status === "rejected" && (
                                  <button
                                    onClick={() =>
                                      handleSetApplicationStatus(app.id, "pending")
                                    }
                                    disabled={actionLoadingId === app.id}
                                    className="px-3 py-2 rounded-xl bg-cream-100 text-forest-800 font-medium text-xs hover:bg-cream-200 disabled:opacity-50 transition-colors"
                                  >
                                    Re-open application
                                  </button>
                                )}
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleInviteApplicant(app)}
                                  disabled={actionLoadingId === app.id || !app.email}
                                  className="px-3 py-2 rounded-xl border border-forest-200 text-forest-800 font-medium text-xs hover:bg-cream-50 disabled:opacity-50 transition-colors"
                                >
                                  Resend invite
                                </button>
                                <button
                                  onClick={() =>
                                    handleSetApplicationStatus(app.id, "pending")
                                  }
                                  disabled={actionLoadingId === app.id}
                                  className="px-3 py-2 rounded-xl bg-cream-100 text-forest-700 font-medium text-xs hover:bg-cream-200 disabled:opacity-50 transition-colors"
                                >
                                  Revert to pending
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
                <h3 className="font-sans text-lg font-bold text-forest-950">
                  No {appStatusFilter !== "all" ? appStatusFilter : ""} Applications
                </h3>
                <p className="text-xs text-forest-500">
                  {appStatusFilter === "pending"
                    ? "All inbound chef applications have been reviewed!"
                    : "No applications found matching this status filter."}
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* EDIT CHEF MODAL */}
      {isEditModalOpen && editingChef && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-forest-950/80 backdrop-blur-md">
          <div className="relative bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto p-6 sm:p-10 space-y-6 border border-forest-100 text-left">
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="absolute top-6 right-6 h-9 w-9 rounded-full bg-forest-50 hover:bg-forest-100 text-forest-900 flex items-center justify-center"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="space-y-1">
              <h2 className="font-sans text-2xl sm:text-3xl font-bold text-forest-950">
                Edit {editingChef.name}
              </h2>
              <p className="text-xs text-forest-600">
                Update the public profile. Phone and email are shown to customers.
              </p>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-forest-950">Full name</label>
                  <input
                    className={inputClass}
                    value={editingChef.name}
                    onChange={(e) => setEditingChef({ ...editingChef, name: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-forest-950">Brand / studio</label>
                  <input
                    className={inputClass}
                    value={editingChef.brand_name}
                    onChange={(e) => setEditingChef({ ...editingChef, brand_name: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-forest-950">Phone / WhatsApp</label>
                  <input
                    className={inputClass}
                    placeholder="0712 345 678"
                    value={editingChef.phone}
                    onChange={(e) => setEditingChef({ ...editingChef, phone: e.target.value })}
                  />
                  <p className="text-[10px] text-forest-500">
                    Shown on the public profile for direct contact.
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-forest-950">Email</label>
                  <input
                    type="email"
                    className={inputClass}
                    value={editingChef.email}
                    onChange={(e) => setEditingChef({ ...editingChef, email: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-forest-950">City</label>
                  <input
                    className={inputClass}
                    value={editingChef.city}
                    onChange={(e) => setEditingChef({ ...editingChef, city: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-forest-950">Rate per guest (KES)</label>
                  <input
                    type="number"
                    min={0}
                    className={inputClass}
                    value={editingChef.price_per_guest}
                    onChange={(e) => setEditingChef({ ...editingChef, price_per_guest: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-forest-950">Tagline</label>
                <input
                  className={inputClass}
                  value={editingChef.tagline}
                  onChange={(e) => setEditingChef({ ...editingChef, tagline: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-forest-950">Bio</label>
                <textarea
                  rows={4}
                  className={inputClass + " resize-y"}
                  value={editingChef.bio}
                  onChange={(e) => setEditingChef({ ...editingChef, bio: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <span className="font-bold text-forest-950">Cuisines</span>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_CUISINES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => toggleEditCuisine(c)}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-all border ${
                        editingChef.cuisines.includes(c)
                          ? "bg-forest-900 text-white border-forest-900"
                          : "bg-cream-50 text-forest-800 border-forest-100 hover:bg-cream-100"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <span className="font-bold text-forest-950">Dietary specialties</span>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_DIETARY.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => toggleEditDietary(d)}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-all border ${
                        editingChef.dietary.includes(d)
                          ? "bg-forest-900 text-white border-forest-900"
                          : "bg-cream-50 text-forest-800 border-forest-100 hover:bg-cream-100"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-forest-950">Avatar URL</label>
                  <input
                    className={inputClass}
                    value={editingChef.avatar}
                    onChange={(e) => setEditingChef({ ...editingChef, avatar: e.target.value })}
                  />
                  <p className="text-[10px] text-forest-500">
                    Leave blank to use the Book A Chef logo.
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-forest-950">Cover image URL</label>
                  <input
                    className={inputClass}
                    value={editingChef.cover}
                    onChange={(e) => setEditingChef({ ...editingChef, cover: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-4 pt-3 border-t border-forest-100">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingChef.verified}
                    onChange={(e) => setEditingChef({ ...editingChef, verified: e.target.checked })}
                    className="h-4 w-4 rounded accent-forest-950"
                  />
                  <span className="text-xs font-bold text-forest-950">Verified (public)</span>
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingChef.featured}
                    onChange={(e) => setEditingChef({ ...editingChef, featured: e.target.checked })}
                    className="h-4 w-4 rounded accent-forest-950"
                  />
                  <span className="text-xs font-bold text-forest-950">Featured</span>
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingChef.is_available}
                    onChange={(e) => setEditingChef({ ...editingChef, is_available: e.target.checked })}
                    className="h-4 w-4 rounded accent-forest-950"
                  />
                  <span className="text-xs font-bold text-forest-950">Available</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-forest-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-5 py-3 rounded-2xl border border-forest-200 text-xs font-bold text-forest-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-8 py-3.5 rounded-2xl bg-forest-900 text-cream-50 font-black text-xs uppercase tracking-widest hover:bg-forest-800 shadow-xl flex items-center gap-2 disabled:opacity-60"
                >
                  {savingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD CHEF MODAL */}
      {isListingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-forest-950/80 backdrop-blur-md">
          <div className="relative bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto p-6 sm:p-10 space-y-6 border border-forest-100 text-left">
            <button
              onClick={() => setIsListingModalOpen(false)}
              className="absolute top-6 right-6 h-9 w-9 rounded-full bg-forest-50 hover:bg-forest-100 text-forest-900 flex items-center justify-center"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cream-100 text-[10px] font-black uppercase tracking-widest text-champagne-700">
                <Award className="h-3.5 w-3.5" /> Book A Chef Official
              </div>
              <h2 className="font-sans text-2xl sm:text-3xl font-bold text-forest-950">
                Add a chef manually
              </h2>
              <p className="text-xs text-forest-600">
                Creates the login account, the public profile, and a first menu
                in one step. Leave photos blank to use the Book A Chef logo.
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
                    className="w-full bg-cream-50 border border-forest-100 rounded-xl p-3 font-medium text-forest-950 outline-none focus:border-forest-950"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-forest-950">Email for login *</label>
                  <input
                    type="email"
                    required
                    placeholder="chef@example.com"
                    value={chefEmail}
                    onChange={(e) => setChefEmail(e.target.value)}
                    className="w-full bg-cream-50 border border-forest-100 rounded-xl p-3 font-medium text-forest-950 outline-none focus:border-forest-950"
                  />
                  <p className="text-[10px] text-forest-500">
                    Creates their account. They set a password through the invite.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-forest-950">Phone / WhatsApp *</label>
                  <input
                    type="tel"
                    required
                    placeholder="0712 345 678"
                    value={chefPhone}
                    onChange={(e) => setChefPhone(e.target.value)}
                    className="w-full bg-cream-50 border border-forest-100 rounded-xl p-3 font-medium text-forest-950 outline-none focus:border-forest-950"
                  />
                  <p className="text-[10px] text-forest-500">
                    Shown on the public profile for direct contact.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-forest-950">Brand / Studio Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Atelier Mutua"
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    className="w-full bg-cream-50 border border-forest-100 rounded-xl p-3 font-medium text-forest-950 outline-none focus:border-forest-950"
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

              {/* 3. Photo Uploads */}
              <div className="space-y-4 pt-3 border-t border-forest-100">
                <p className="font-black text-forest-950 uppercase tracking-widest text-[10px]">
                  📸 Chef Photos — Upload or Paste URL
                </p>
                <p className="text-[11px] text-forest-600">
                  Upload from device or paste a direct image URL. Leave blank to
                  use the Book A Chef logo.
                </p>

                <div className="space-y-1.5">
                  <label className="font-bold text-forest-800">Chef Portrait</label>
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

                <div className="space-y-1.5">
                  <label className="font-bold text-forest-800">Signature Dish / Cover Photo</label>
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
                <label className="font-bold text-forest-950">Chef Bio *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Executive chef pedigree, specialized dishes, and kitchen hospitality..."
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
                  {submittingChef ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create account & profile ✓"}
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
