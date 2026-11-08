/**
 * Shared marketplace types and helpers.
 *
 * The marketplace is the public, browsable side of Book A Chef: customers
 * discover chefs, view profiles, and book directly. These types are shared
 * between the API routes, server components, and client components so the
 * shape of a chef never drifts between layers.
 */

export interface MarketplaceMenu {
  id: string;
  title: string;
  tag: string;
  description: string;
  price_per_guest: number;
  courses: {
    appetizer?: { name: string; description: string };
    main: { name: string; description: string };
    dessert?: { name: string; description: string };
  };
  is_active: boolean;
}

export interface MarketplaceReview {
  id: string;
  client_name: string;
  rating: number;
  comment: string;
  occasion?: string;
  created_at: string;
}

export interface MarketplaceChef {
  id: string;
  slug: string;
  name: string;
  brand_name: string;
  tagline: string;
  bio: string;
  culinary_philosophy: string;
  city: string;
  service_areas: string[];
  cuisines: string[];
  dietary_specialties: string[];
  price_per_guest: number;
  min_guests: number;
  max_guests: number;
  rating: number;
  reviews_count: number;
  verified: boolean;
  verification_status: string;
  avatar_url: string;
  cover_image_url: string;
  gallery_images: string[];
  is_available: boolean;
  featured: boolean;
  experience_years: number;
  travel_radius_km: number;
  min_notice_hours: number;
  service_formats: string[];
  allow_in_home: boolean;
  allow_delivery: boolean;
  menus: MarketplaceMenu[];
}

export interface ChefAvailability {
  working_days: number[];
  start_time: string;
  end_time: string;
  max_bookings_per_day: number;
  min_notice_hours: number;
  max_advance_days: number;
}

export interface BlockedDate {
  blocked_date: string;
  reason?: string;
}

export interface ChefProfileResponse {
  chef: MarketplaceChef;
  reviews: MarketplaceReview[];
  availability: ChefAvailability | null;
  blockedDates: BlockedDate[];
}

/** Day-of-week labels. JS getDay(): 0 = Sunday. */
export const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export const CUISINE_OPTIONS = [
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

export const LOCATION_OPTIONS = [
  "Nairobi",
  "Mombasa",
  "Diani Beach",
  "Naivasha",
  "Watamu",
  "Kilifi",
  "Lamu Island",
  "Tigoni",
  "Nanyuki",
  "Eldoret",
];

export const PRICE_BANDS = [
  { label: "Under 4,000", min: 0, max: 4000 },
  { label: "4,000 – 6,000", min: 4000, max: 6000 },
  { label: "6,000 – 10,000", min: 6000, max: 10000 },
  { label: "10,000+", min: 10000, max: 999999 },
];

export function formatPrice(value: number): string {
  return `KES ${Number(value || 0).toLocaleString()}`;
}

export function formatDate(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString("en-KE", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function timeAgo(value: string): string {
  const now = new Date();
  const then = new Date(value);
  const diffMs = now.getTime() - then.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 1) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

/**
 * Build a URL-safe slug from a chef's name. Used when creating a listing that
 * has no slug yet, so the profile is always addressable.
 */
export function slugify(name: string): string {
  return String(name || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Human-readable service format label.
 */
export function serviceFormatLabel(format: string): string {
  if (format === "in_home") return "In-home dining";
  if (format === "delivery") return "Cooked & delivered";
  return format;
}

/**
 * Human-readable verification status.
 */
export function verificationLabel(status: string): string {
  if (status === "approved") return "Verified";
  if (status === "under_review") return "Under review";
  if (status === "rejected") return "Not verified";
  return "Pending";
}
