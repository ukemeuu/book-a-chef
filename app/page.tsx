"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChefHat,
  Search,
  MapPin,
  Star,
  ShieldCheck,
  ArrowRight,
  BadgeCheck,
  Phone,
  Heart,
  Home,
  Truck,
  Wine,
  Leaf,
  Cake,
  Flame,
  Fish,
  Briefcase,
  Sparkles,
  Quote,
  Clock,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Reveal from "@/components/Reveal";
import ChefCard from "@/components/chef/ChefCard";
import {
  MarketplaceChef,
  chefAvatar,
  chefCover,
  formatPhone,
  chefTelUrl,
} from "@/utils/marketplace";
import { createClient } from "@/utils/supabase/client";

/* ── Data ──────────────────────────────────────────────────────────────────── */

const CUISINE_CATEGORIES = [
  { id: "Swahili", label: "Swahili", icon: "🍛", slug: "swahili" },
  { id: "Seafood", label: "Seafood", icon: "🦐", slug: "seafood" },
  { id: "BBQ", label: "Nyama Choma & BBQ", icon: "🔥", slug: "nyama-choma-bbq" },
  { id: "Italian", label: "Italian & Pasta", icon: "🍝", slug: "italian-pasta" },
  { id: "Fine Dining", label: "Fine Dining", icon: "🍷", slug: "fine-dining" },
  { id: "Continental", label: "Continental", icon: "🥩" },
  { id: "Indian", label: "Indian & Fusion", icon: "🍛" },
  { id: "Pastry", label: "Pastry & Desserts", icon: "🥐" },
  { id: "Vegan", label: "Plant-Based", icon: "🥗" },
  { id: "Kenyan", label: "Kenyan Traditional", icon: "🍲" },
  { id: "French", label: "French", icon: "🧀" },
];

const CUISINE_CARDS = [
  {
    name: "Swahili",
    slug: "swahili",
    desc: "Coconut, cardamom, and coastal classics",
    image: "https://images.unsplash.com/photo-1559737558-2f5a35f4523b?auto=format&fit=crop&q=80&w=800",
  },
  {
    name: "Seafood",
    slug: "seafood",
    desc: "Fresh catches, grilled fish, and prawns",
    image: "https://images.unsplash.com/photo-1559737558-2f5a35f4523b?auto=format&fit=crop&q=80&w=800",
  },
  {
    name: "Nyama Choma & BBQ",
    slug: "nyama-choma-bbq",
    desc: "Charcoal-grilled meats and garden feasts",
    image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&q=80&w=800",
  },
  {
    name: "Italian & Pasta",
    slug: "italian-pasta",
    desc: "Hand-rolled pasta and slow-simmered sauces",
    image: "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?auto=format&fit=crop&q=80&w=800",
  },
  {
    name: "Fine Dining",
    slug: "fine-dining",
    desc: "Michelin-inspired plated degustations",
    image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&q=80&w=800",
  },
  {
    name: "Indian & Fusion",
    slug: "indian-fusion",
    desc: "Aromatic curries and bold spice",
    image: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&q=80&w=800",
  },
  {
    name: "Pastry & Desserts",
    slug: "pastry-desserts",
    desc: "Cakes, baking, and sweet endings",
    image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=800",
  },
  {
    name: "Plant-Based",
    slug: "plant-based",
    desc: "Vegan and vegetarian feasts",
    image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=800",
  },
];

const CHEF_TYPES = [
  { id: "private", label: "Private Chef", desc: "Cooked in your home", icon: Home },
  { id: "corporate", label: "Corporate & Events", desc: "Team dinners, client events", icon: Briefcase },
  { id: "bbq", label: "BBQ & Grilling", desc: "Nyama choma, outdoor feasts", icon: Flame },
  { id: "finedining", label: "Fine Dining", desc: "Plated multi-course tastings", icon: Wine },
  { id: "delivery", label: "Cooked & Delivered", desc: "Hot food to your door", icon: Truck },
  { id: "healthy", label: "Healthy & Vegan", desc: "Plant-based, guilt-free", icon: Leaf },
  { id: "desserts", label: "Pastry & Desserts", desc: "Cakes, baking, sweet endings", icon: Cake },
  { id: "seafood", label: "Seafood Specialist", desc: "Coastal and ocean catches", icon: Fish },
];

const POPULAR_DISHES = [
  {
    name: "Coconut Prawns Pilau",
    chef: "Chef Swiok",
    slug: "chef-swiok",
    price: "KES 3,800",
    image: "https://images.unsplash.com/photo-1559737558-2f5a35f4523b?auto=format&fit=crop&q=80&w=800",
  },
  {
    name: "Charcoal Nyama Choma",
    chef: "Chef Kenneth Kamau",
    slug: "chef-kenneth-kamau-kamanu",
    price: "KES 4,500",
    image: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=800",
  },
  {
    name: "Hand-Rolled Tagliatelle",
    chef: "Chef Sophia Katana",
    slug: "chef-sophia-katana",
    price: "KES 4,500",
    image: "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?auto=format&fit=crop&q=80&w=800",
  },
  {
    name: "Plated Degustation",
    chef: "Chef Rodgers kelly",
    slug: "chef-rodgers-kelly",
    price: "KES 5,000",
    image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&q=80&w=800",
  },
  {
    name: "Whole Grilled Fish",
    chef: "Ian Indika",
    slug: "ian-indika",
    price: "KES 30,000",
    image: "https://images.unsplash.com/photo-1559737558-2f5a35f4523b?auto=format&fit=crop&q=80&w=800",
  },
  {
    name: "Street Food Spread",
    chef: "Kennedy Milanya",
    slug: "kennedy-milanya-ouma",
    price: "KES 4,500",
    image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&q=80&w=800",
  },
];

const OCCASIONS = [
  { name: "Birthday", icon: "🎂", desc: "A cake, a dinner, and a night to remember." },
  { name: "Anniversary", icon: "🥂", desc: "Recreate your first date, done properly." },
  { name: "Dinner Party", icon: "🍽️", desc: "Impress your guests without lifting a finger." },
  { name: "Corporate Event", icon: "💼", desc: "Client dinners and team celebrations, handled." },
  { name: "Date Night", icon: "🕯️", desc: "A private table for two in your own home." },
  { name: "Family Gathering", icon: "👨‍👩‍👧‍👦", desc: "Bring everyone together around one table." },
];

const TESTIMONIALS = [
  {
    quote:
      "Chef Sophia cooked for our anniversary and it felt like a restaurant had moved into our home. Every course was perfect.",
    name: "Wanjiru M.",
    detail: "Private dinner, Nairobi",
  },
  {
    quote:
      "I called Chef Kenneth directly, agreed the menu, and he arrived with everything. The nyama choma was the best we've had.",
    name: "David O.",
    detail: "Garden party, Karen",
  },
  {
    quote:
      "Booking was just a phone call. No forms, no middleman — and the food was incredible value for a group of twelve.",
    name: "Achieng N.",
    detail: "Family gathering, Westlands",
  },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Browse the directory",
    desc: "Filter by cuisine, location, and price. See each chef's menus and reviews.",
    icon: <Search className="h-5 w-5" />,
  },
  {
    step: "02",
    title: "Call or WhatsApp directly",
    desc: "No booking forms, no middleman. Talk to the chef and agree the details yourselves.",
    icon: <Phone className="h-5 w-5" />,
  },
  {
    step: "03",
    title: "Enjoy your dinner",
    desc: "Your chef arrives with fresh ingredients, cooks, serves, and cleans up.",
    icon: <ChefHat className="h-5 w-5" />,
  },
];

const TRUST_FEATURES = [
  {
    icon: <ShieldCheck className="h-5 w-5 text-forest-600" />,
    title: "ID-verified chefs",
    desc: "Every chef submits a national ID or passport before their profile goes live.",
  },
  {
    icon: <BadgeCheck className="h-5 w-5 text-forest-600" />,
    title: "Vetted by our team",
    desc: "We review each application and confirm credentials before listing.",
  },
  {
    icon: <Phone className="h-5 w-5 text-forest-600" />,
    title: "Direct contact",
    desc: "Call or WhatsApp the chef directly — no platform messaging, no middleman.",
  },
];

const DESTINATIONS = [
  { name: "Westlands", area: "Nairobi" },
  { name: "Karen", area: "Nairobi" },
  { name: "Diani Beach", area: "Coast" },
  { name: "Kilimani", area: "Nairobi" },
  { name: "Runda", area: "Nairobi" },
  { name: "Watamu", area: "Coast" },
  { name: "Naivasha", area: "Rift Valley" },
  { name: "Nyali", area: "Mombasa" },
];

/* ── Chef card (large) ─────────────────────────────────────────────────────── */

function ChefCardLarge({
  chef,
  isFavorite,
  onToggleFavorite,
}: {
  chef: MarketplaceChef;
  isFavorite?: boolean;
  onToggleFavorite?: (e: React.MouseEvent) => void;
}) {
  const cover = chefCover(chef);
  const avatar = chefAvatar(chef);
  const telUrl = chefTelUrl(chef.phone);
  const topRated = Number(chef.rating || 0) >= 4.9;

  return (
    <div className="group relative bg-white rounded-2xl border border-forest-100/70 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
      <Link href={`/chefs/${chef.slug}`} className="block">
        <div className="relative aspect-[4/3] overflow-hidden bg-forest-950">
          <Image
            src={cover}
            alt={chef.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-forest-950/45 via-transparent to-transparent" />
          {topRated && (
            <span className="absolute top-3 left-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-champagne-400 text-forest-950 text-[10px] font-bold shadow-sm">
              <Sparkles className="h-3 w-3" />
              Guest favourite
            </span>
          )}
          {chef.verified && (
            <span className="absolute top-3 right-3 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/90 text-forest-900 text-[10px] font-bold shadow-sm">
              <BadgeCheck className="h-3 w-3 text-emerald-600" />
              Verified
            </span>
          )}
        </div>
      </Link>

      {onToggleFavorite && (
        <button
          type="button"
          onClick={onToggleFavorite}
          aria-label={isFavorite ? "Remove from favourites" : "Save to favourites"}
          className="absolute top-12 right-3 w-9 h-9 rounded-full bg-white/90 hover:bg-white flex items-center justify-center shadow-sm transition-colors"
        >
          <Heart
            className={`h-4 w-4 ${isFavorite ? "fill-red-500 text-red-500" : "text-forest-600"}`}
          />
        </button>
      )}

      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow shrink-0 bg-forest-950">
            <Image src={avatar} alt={chef.name} fill className="object-cover" />
          </div>
          <div className="min-w-0 flex-1">
            <Link href={`/chefs/${chef.slug}`} className="block">
              <h3 className="font-bold text-forest-950 truncate group-hover:text-forest-700 transition-colors">
                {chef.name}
              </h3>
            </Link>
            {chef.brand_name && (
              <p className="text-xs text-forest-500 truncate">{chef.brand_name}</p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Star className="h-3.5 w-3.5 text-champagne-500 fill-current" />
            <span className="text-sm font-semibold text-forest-950">
              {Number(chef.rating || 0).toFixed(1)}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-1 mt-3">
          {chef.cuisines?.slice(0, 3).map((c) => (
            <span
              key={c}
              className="px-2 py-0.5 rounded-full bg-cream-100 text-forest-700 text-[10px] font-medium"
            >
              {c}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-forest-100">
          <span className="text-xs text-forest-500 flex items-center gap-1 min-w-0">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{chef.city}</span>
          </span>
          {chef.phone && telUrl ? (
            <a
              href={telUrl}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-forest-950 text-white text-[11px] font-bold hover:bg-forest-800 transition-colors shrink-0"
            >
              <Phone className="h-3 w-3" />
              {formatPhone(chef.phone)}
            </a>
          ) : (
            <span className="text-xs font-bold text-forest-950">
              KES {Number(chef.price_per_guest || 0).toLocaleString()}
              <span className="text-[10px] font-normal text-forest-400"> /guest</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Page ──────────────────────────────────────────────────────────────────── */

export default function HomePage() {
  const router = useRouter();
  const [featuredChefs, setFeaturedChefs] = useState<MarketplaceChef[]>([]);
  const [allChefs, setAllChefs] = useState<MarketplaceChef[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [heroOffset, setHeroOffset] = useState(0);

  const carouselRef = useRef<HTMLDivElement>(null);

  const supabase = createClient();

  useEffect(() => {
    async function loadChefs() {
      try {
        const res = await fetch("/api/chefs?limit=60");
        const data = await res.json();
        if (res.ok) {
          setAllChefs(data.chefs || []);
          setFeaturedChefs((data.chefs || []).slice(0, 8));
        }
      } catch {
        // Silent.
      }
    }
    loadChefs();
  }, []);

  useEffect(() => {
    async function loadFavorites() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("chef_favorites")
        .select("chef_id")
        .eq("client_id", user.id);
      if (data) setFavorites(new Set(data.map((f: any) => f.chef_id)));
    }
    loadFavorites();
  }, [supabase]);

  // Subtle parallax on the hero
  useEffect(() => {
    const onScroll = () => setHeroOffset(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const toggleFavorite = async (chef: MarketplaceChef) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const isFav = favorites.has(chef.id);
    setFavorites((prev) => {
      const next = new Set(prev);
      if (isFav) next.delete(chef.id);
      else next.add(chef.id);
      return next;
    });

    try {
      await fetch(`/api/chefs/${chef.slug}/favorite`, { method: "POST" });
    } catch {
      setFavorites((prev) => {
        const next = new Set(prev);
        if (isFav) next.add(chef.id);
        else next.delete(chef.id);
        return next;
      });
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set("search", searchQuery.trim());
    router.push(`/chefs${params.toString() ? `?${params.toString()}` : ""}`);
  };

  const scrollCarousel = (dir: "left" | "right") => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({
        left: dir === "left" ? -320 : 320,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className="min-h-screen bg-white text-forest-950 font-sans">
      <Navbar />

      {/* ── HERO ── */}
      <section className="relative bg-forest-950 pt-28 pb-14 sm:pt-36 sm:pb-20 overflow-hidden">
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ transform: `translateY(${heroOffset * 0.25}px)` }}
        >
          <Image
            src="https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&q=80&w=2070"
            alt="Private dining"
            fill
            priority
            className="object-cover opacity-25"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-forest-950/60 via-forest-950/80 to-forest-950" />
        </div>

        <div className="relative max-w-3xl mx-auto px-4 text-center">
          <Reveal>
            <h1 className="font-sans text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight tracking-tight">
              A private chef for
              <br />
              <span className="text-champagne-400">every occasion.</span>
            </h1>
            <p className="mt-4 text-base sm:text-lg text-cream-200/80 max-w-xl mx-auto leading-relaxed">
              Browse verified chefs, see what they cook, and call them directly.
            </p>
          </Reveal>

          <Reveal delay={100}>
            <form
              onSubmit={handleSearch}
              className="mt-8 bg-white rounded-2xl shadow-2xl p-2 flex items-center gap-2 max-w-xl mx-auto"
            >
              <div className="flex-1 flex items-center gap-2 px-4 py-3">
                <Search className="h-4 w-4 text-forest-400 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search chefs, cuisines, or specialties…"
                  className="w-full text-sm font-medium text-forest-950 placeholder-forest-400 outline-none bg-transparent"
                />
              </div>
              <button
                type="submit"
                className="px-6 py-3 rounded-xl bg-forest-950 hover:bg-forest-800 text-white text-sm font-bold transition-colors shrink-0"
              >
                Search
              </button>
            </form>
          </Reveal>

          <Reveal delay={200}>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              {OCCASIONS.map((o) => (
                <Link
                  key={o.name}
                  href="/chefs"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-cream-100 text-xs font-medium transition-colors"
                >
                  <span aria-hidden="true">{o.icon}</span>
                  {o.name}
                </Link>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── CATEGORY CAROUSEL ── */}
      <section className="sticky top-16 z-30 bg-white/95 backdrop-blur-md border-b border-forest-100/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <button
              onClick={() => scrollCarousel("left")}
              className="hidden sm:flex w-8 h-8 shrink-0 rounded-full border border-forest-200 items-center justify-center text-forest-600 hover:bg-cream-50 transition-colors"
              aria-label="Scroll left"
            >
              ‹
            </button>
            <div
              ref={carouselRef}
              className="flex-1 flex items-center gap-2 py-3 overflow-x-auto no-scrollbar"
            >
              <button
                type="button"
                onClick={() => setActiveCategory("all")}
                className={`shrink-0 inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  activeCategory === "all"
                    ? "bg-forest-950 text-white"
                    : "bg-cream-100 text-forest-700 hover:bg-cream-200"
                }`}
              >
                <span aria-hidden="true">✨</span>
                All chefs
              </button>
              {CUISINE_CATEGORIES.map((cat) => (
                <Link
                  key={cat.id}
                  href={
                    cat.slug
                      ? `/cuisines/${cat.slug}`
                      : `/chefs?cuisine=${encodeURIComponent(cat.id)}`
                  }
                  onMouseEnter={() => setActiveCategory(cat.id)}
                  className={`shrink-0 inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    activeCategory === cat.id
                      ? "bg-forest-950 text-white"
                      : "bg-cream-100 text-forest-700 hover:bg-cream-200"
                  }`}
                >
                  <span aria-hidden="true">{cat.icon}</span>
                  {cat.label}
                </Link>
              ))}
            </div>
            <button
              onClick={() => scrollCarousel("right")}
              className="hidden sm:flex w-8 h-8 shrink-0 rounded-full border border-forest-200 items-center justify-center text-forest-600 hover:bg-cream-50 transition-colors"
              aria-label="Scroll right"
            >
              ›
            </button>
          </div>
        </div>
      </section>

      {/* ── FEATURED CHEFS ── */}
      {featuredChefs.length > 0 && (
        <section className="py-14 sm:py-18">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Reveal>
              <div className="flex items-end justify-between mb-6">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-champagne-600 mb-2">
                    Handpicked
                  </p>
                  <h2 className="font-sans text-3xl sm:text-4xl font-bold text-forest-950 tracking-tight">
                    Featured chefs
                  </h2>
                  <p className="mt-2 text-forest-500 max-w-lg">
                    Verified, vetted, and ready to cook for you.
                  </p>
                </div>
                <Link
                  href="/chefs"
                  className="hidden sm:inline-flex items-center gap-1.5 text-sm font-medium text-forest-950 hover:text-forest-700 transition-colors shrink-0"
                >
                  Show all {allChefs.length} chefs
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </Reveal>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {featuredChefs.slice(0, 8).map((chef, i) => (
                <Reveal key={chef.id} delay={i * 60}>
                  <ChefCardLarge
                    chef={chef}
                    isFavorite={favorites.has(chef.id)}
                    onToggleFavorite={(e) => toggleFavorite(chef)}
                  />
                </Reveal>
              ))}
            </div>

            <div className="mt-8 text-center sm:hidden">
              <Link
                href="/chefs"
                className="inline-flex items-center gap-1.5 px-6 py-3 rounded-xl border border-forest-200 text-sm font-medium text-forest-800 hover:bg-cream-50 transition-colors"
              >
                Show all chefs
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── POPULAR DISHES ── */}
      <section className="py-14 sm:py-18 bg-forest-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="flex items-end justify-between mb-8">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-champagne-400 mb-2">
                  From the kitchens
                </p>
                <h2 className="font-sans text-3xl sm:text-4xl font-bold text-white tracking-tight">
                  Popular right now
                </h2>
              </div>
              <Link
                href="/chefs"
                className="hidden sm:inline-flex items-center gap-1.5 text-sm font-medium text-cream-200 hover:text-white transition-colors shrink-0"
              >
                Browse all
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </Reveal>

          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
            {POPULAR_DISHES.map((dish, i) => (
              <Reveal key={dish.name} delay={i * 60} className="shrink-0">
                <Link
                  href={`/chefs/${dish.slug}`}
                  className="group relative block w-72 aspect-[4/5] rounded-2xl overflow-hidden bg-forest-900"
                >
                  <Image
                    src={dish.image}
                    alt={dish.name}
                    fill
                    sizes="288px"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-forest-950/85 via-forest-950/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    <h3 className="font-bold text-white text-lg leading-tight">
                      {dish.name}
                    </h3>
                    <p className="text-sm text-cream-200/80 mt-1">{dish.chef}</p>
                    <span className="inline-flex items-center gap-1 text-sm font-bold text-champagne-400 mt-3">
                      {dish.price}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="py-14 sm:py-18 scroll-mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="max-w-2xl mb-10">
              <p className="text-xs font-bold uppercase tracking-widest text-champagne-600 mb-2">
                How it works
              </p>
              <h2 className="font-sans text-3xl sm:text-4xl font-bold text-forest-950 tracking-tight">
                Three steps to dinner
              </h2>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {HOW_IT_WORKS.map((item, i) => (
              <Reveal key={item.step} delay={i * 100}>
                <div className="group flex flex-col bg-white rounded-2xl p-6 border border-forest-100/70 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-11 h-11 rounded-xl bg-cream-100 flex items-center justify-center text-forest-700 group-hover:bg-forest-950 group-hover:text-champagne-400 transition-colors">
                      {item.icon}
                    </div>
                    <span className="font-sans text-2xl font-bold leading-none text-champagne-500/40">
                      {item.step}
                    </span>
                  </div>
                  <h3 className="font-sans text-lg font-bold text-forest-950 mb-1.5">
                    {item.title}
                  </h3>
                  <p className="text-sm text-forest-600 leading-relaxed">{item.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── CUISINE SEGMENTS ── */}
      <section className="py-14 sm:py-18 bg-cream-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="flex items-end justify-between mb-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-champagne-600 mb-2">
                  Cuisines
                </p>
                <h2 className="font-sans text-3xl sm:text-4xl font-bold text-forest-950 tracking-tight">
                  What are you craving?
                </h2>
              </div>
              <Link
                href="/cuisines"
                className="hidden sm:inline-flex items-center gap-1.5 text-sm font-medium text-forest-950 hover:text-forest-700 transition-colors shrink-0"
              >
                Browse all
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </Reveal>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
            {CUISINE_CARDS.map((item, i) => (
              <Reveal key={item.name} delay={i * 60} className="shrink-0">
                <Link
                  href={`/cuisines/${item.slug}`}
                  className="group relative block w-64 sm:w-72 aspect-[3/4] rounded-2xl overflow-hidden bg-forest-950 focus-visible:ring-2 focus-visible:ring-forest-950 focus-visible:ring-offset-2 transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
                >
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    sizes="(max-width: 640px) 256px, 288px"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-forest-950/80 via-forest-950/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h3 className="font-bold text-white text-lg leading-tight">
                      {item.name}
                    </h3>
                    <p className="text-xs text-cream-200/80 mt-1">{item.desc}</p>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── CHEF TYPES ── */}
      <section className="py-14 sm:py-18">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="max-w-2xl mb-8">
              <p className="text-xs font-bold uppercase tracking-widest text-champagne-600 mb-2">
                Chef types
              </p>
              <h2 className="font-sans text-3xl sm:text-4xl font-bold text-forest-950 tracking-tight">
                Find the right kind of chef
              </h2>
              <p className="mt-2 text-forest-500">
                From intimate dinners to full corporate catering.
              </p>
            </div>
          </Reveal>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {CHEF_TYPES.map((type, i) => {
              const Icon = type.icon;
              return (
                <Reveal key={type.id} delay={i * 50}>
                  <Link
                    href="/chefs"
                    className="group flex flex-col p-5 rounded-2xl bg-white border border-forest-100/70 hover:shadow-lg hover:-translate-y-1 hover:border-forest-200 transition-all duration-300"
                  >
                    <div className="w-11 h-11 rounded-xl bg-cream-100 flex items-center justify-center text-forest-700 mb-3 group-hover:bg-forest-950 group-hover:text-champagne-400 transition-colors">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-bold text-forest-950 group-hover:text-forest-700 transition-colors">
                      {type.label}
                    </h3>
                    <p className="text-xs text-forest-500 mt-1 leading-snug">
                      {type.desc}
                    </p>
                  </Link>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── OCCASIONS ── */}
      <section className="py-14 sm:py-18 bg-cream-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="max-w-2xl mb-8">
              <p className="text-xs font-bold uppercase tracking-widest text-champagne-600 mb-2">
                Occasions
              </p>
              <h2 className="font-sans text-3xl sm:text-4xl font-bold text-forest-950 tracking-tight">
                What are you celebrating?
              </h2>
            </div>
          </Reveal>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {OCCASIONS.map((o, i) => (
              <Reveal key={o.name} delay={i * 50}>
                <Link
                  href="/chefs"
                  className="group flex flex-col items-center text-center p-5 rounded-2xl bg-white border border-forest-100/70 hover:shadow-lg hover:-translate-y-1 hover:border-forest-200 transition-all duration-300"
                >
                  <span className="text-3xl mb-3" aria-hidden="true">{o.icon}</span>
                  <h3 className="font-bold text-sm text-forest-950 group-hover:text-champagne-600 transition-colors">
                    {o.name}
                  </h3>
                  <p className="text-xs text-forest-500 mt-1 leading-snug">{o.desc}</p>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="py-14 sm:py-18">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="max-w-2xl mb-10">
              <p className="text-xs font-bold uppercase tracking-widest text-champagne-600 mb-2">
                From our customers
              </p>
              <h2 className="font-sans text-3xl sm:text-4xl font-bold text-forest-950 tracking-tight">
                Dinners people talk about
              </h2>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <Reveal key={t.name} delay={i * 100}>
                <figure className="bg-white rounded-2xl border border-forest-100/70 p-6 hover:shadow-lg transition-all duration-300">
                  <Quote className="h-7 w-7 text-champagne-400 mb-4" />
                  <blockquote className="text-sm text-forest-700 leading-relaxed">
                    &ldquo;{t.quote}&rdquo;
                  </blockquote>
                  <figcaption className="mt-5 pt-4 border-t border-forest-100">
                    <p className="font-bold text-forest-950">{t.name}</p>
                    <p className="text-xs text-forest-500">{t.detail}</p>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── TRUST ── */}
      <section className="py-14 sm:py-18 bg-cream-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="max-w-2xl mb-10">
              <p className="text-xs font-bold uppercase tracking-widest text-champagne-600 mb-2">
                Why Book A Chef
              </p>
              <h2 className="font-sans text-3xl sm:text-4xl font-bold text-forest-950 tracking-tight">
                Book with confidence
              </h2>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {TRUST_FEATURES.map((feature, i) => (
              <Reveal key={feature.title} delay={i * 80}>
                <div className="flex gap-4">
                  <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center shrink-0">
                    {feature.icon}
                  </div>
                  <div>
                    <h3 className="font-bold text-forest-950 mb-1">{feature.title}</h3>
                    <p className="text-sm text-forest-600 leading-relaxed">{feature.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── DESTINATIONS ── */}
      <section className="py-14 sm:py-18">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="max-w-2xl mb-8">
              <p className="text-xs font-bold uppercase tracking-widest text-champagne-600 mb-2">
                Where we operate
              </p>
              <h2 className="font-sans text-3xl sm:text-4xl font-bold text-forest-950 tracking-tight">
                Chefs across Kenya
              </h2>
            </div>
          </Reveal>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {DESTINATIONS.map((loc, i) => (
              <Reveal key={loc.name} delay={i * 50}>
                <Link
                  href={`/chefs?location=${encodeURIComponent(loc.name)}`}
                  className="group flex items-center gap-3 p-4 rounded-xl bg-white border border-forest-100/70 hover:shadow-md hover:border-forest-200 transition-all"
                >
                  <div className="w-10 h-10 shrink-0 rounded-lg bg-cream-100 flex items-center justify-center text-forest-600 group-hover:bg-champagne-100 group-hover:text-champagne-600 transition-colors">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-forest-950 truncate">{loc.name}</p>
                    <p className="text-xs text-forest-500">{loc.area}</p>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="relative rounded-3xl overflow-hidden bg-forest-950 px-6 py-16 sm:px-12 sm:py-20 text-center">
              <div className="absolute -top-24 -right-24 w-72 h-72 bg-champagne-500/10 rounded-full blur-3xl" />
              <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl" />

              <div className="relative max-w-2xl mx-auto">
                <h2 className="font-sans text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight leading-tight">
                  Your next dinner starts with a phone call
                </h2>
                <p className="mt-4 text-cream-200/70 text-base sm:text-lg leading-relaxed">
                  Browse verified chefs, see what they cook, and reach them directly.
                </p>
                <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Link
                    href="/chefs"
                    className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-champagne-500 hover:bg-champagne-600 text-white font-bold text-sm uppercase tracking-wider shadow-xl transition-all hover:scale-105 active:scale-95"
                  >
                    <ChefHat className="h-5 w-5" />
                    Find your chef
                  </Link>
                  <Link
                    href="/chefs?sort=rating"
                    className="inline-flex items-center gap-2 px-8 py-4 rounded-full border border-white/25 text-white font-bold text-sm uppercase tracking-wider hover:bg-white/10 transition-all"
                  >
                    <Star className="h-5 w-5" />
                    Top rated chefs
                  </Link>
                </div>
                <div className="mt-8 flex items-center justify-center gap-6 text-cream-200/60 text-xs font-medium">
                  <span className="flex items-center gap-1.5">
                    <BadgeCheck className="h-3.5 w-3.5 text-champagne-400" />
                    ID-verified
                  </span>
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-champagne-400" />
                    Vetted by our team
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-champagne-400" />
                    Direct contact
                  </span>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <Footer />
    </div>
  );
}
