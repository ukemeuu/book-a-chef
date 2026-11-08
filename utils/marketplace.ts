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
  phone: string;
  email: string;
  instagram_handle: string;
  menus: MarketplaceMenu[];
}

/**
 * The Book A Chef logo, used whenever a chef has not uploaded a photo.
 * This is the same asset served as the site icon, so a listing without a
 * portrait still shows our brand rather than a stock photo.
 */
export const DEFAULT_CHEF_IMAGE = "/icon.png";

/** A chef's portrait, falling back to the Book A Chef logo. */
export function chefAvatar(chef: { avatar_url?: string | null }): string {
  return chef.avatar_url?.trim() || DEFAULT_CHEF_IMAGE;
}

/** A chef's cover image, falling back to the portrait then the logo. */
export function chefCover(chef: {
  cover_image_url?: string | null;
  avatar_url?: string | null;
}): string {
  return chef.cover_image_url?.trim() || chef.avatar_url?.trim() || DEFAULT_CHEF_IMAGE;
}

/**
 * Format a Kenyan phone number for display. Accepts 07…, 2547…, +2547… and
 * raw digits, and always renders the local 07xx format.
 */
export function formatPhone(value?: string | null): string {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";

  // Normalise to a 07xx local number.
  let local = digits;
  if (digits.startsWith("254")) local = "0" + digits.slice(3);
  else if (digits.startsWith("00254")) local = "0" + digits.slice(5);

  // Group as 07xx xxx xxx when we have 10 digits.
  if (local.length === 10) {
    return `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`;
  }
  return local;
}

/** Convert any Kenyan phone input to the digits wa.me expects (2547…). */
export function whatsappDigits(value?: string | null): string {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("254")) return digits;
  if (digits.startsWith("00254")) return digits.slice(2);
  if (digits.startsWith("0")) return "254" + digits.slice(1);
  return digits;
}

/** A wa.me deep link to message a chef directly. */
export function chefWhatsAppUrl(
  phone?: string | null,
  name?: string | null
): string | null {
  const digits = whatsappDigits(phone);
  if (!digits) return null;
  const text = name
    ? `Hi ${name}, I found your profile on Book A Chef and would like to talk about a private dining booking.`
    : "Hi, I found your profile on Book A Chef and would like to talk about a private dining booking.";
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

/** A tel: link for click-to-call. */
export function chefTelUrl(phone?: string | null): string | null {
  const digits = whatsappDigits(phone);
  return digits ? `tel:+${digits}` : null;
}

/**
 * The number of reviews to show. `reviews_count` on the chef row is a
 * denormalised counter that can drift from the reviews table; the actual
 * reviews array is the source of truth.
 */
export function reviewCount(
  reviews: unknown[],
  fallbackCount?: number | null
): number {
  if (Array.isArray(reviews)) return reviews.length;
  return Number(fallbackCount || 0);
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
