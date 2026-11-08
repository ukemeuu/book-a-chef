import type { ChefApplication } from "@/utils/data";
import { slugify } from "@/utils/marketplace";

/**
 * Extra onboarding data that has no dedicated column on the live
 * `chef_applications` table yet.
 *
 * It is packed into `portfolio_links` (a free-text column that already exists)
 * under a namespaced JSON shape. Admin-only RLS protects the table, so this
 * never leaks to customers. The migration in
 * `supabase/migrations/20260101000500_chef_onboarding.sql` adds real columns;
 * when it is applied the application keeps working and the JSON becomes a
 * read-only historical copy.
 */
export interface ApplicationMeta {
  v: 1;
  national_id_number?: string;
  service_formats?: string[];
  service_areas?: string[];
  tagline?: string;
  vetting?: {
    good_conduct?: boolean;
    good_conduct_cert?: string;
    food_safety?: boolean;
    food_safety_cert?: string;
    haccp?: boolean;
    kitchen_tasting?: boolean;
  };
}

export const APPLICATION_META_PREFIX = "__bookachef_meta__:";

export function packApplicationMeta(meta: ApplicationMeta): string {
  return APPLICATION_META_PREFIX + JSON.stringify(meta);
}

export function unpackApplicationMeta(value?: string | null): ApplicationMeta {
  if (!value) return { v: 1 };
  if (!value.startsWith(APPLICATION_META_PREFIX)) return { v: 1 };
  try {
    const parsed = JSON.parse(value.slice(APPLICATION_META_PREFIX.length));
    return { v: 1, ...parsed };
  } catch {
    return { v: 1 };
  }
}

export interface ApplicationCompleteness {
  percentage: number;
  missing: string[];
}

/**
 * Completeness for the APPLICANT, not the 97% go-live gate.
 *
 * An applicant cannot upload headshots or publish menus before approval, so
 * measuring them against the go-live checklist would show an unreachable score
 * and read as a broken product.
 */
export function applicationCompleteness(app: {
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  phone_number?: string | null;
  city?: string | null;
  neighborhood?: string | null;
  cuisines?: string[] | null;
  dietary?: string[] | null;
  starting_price?: number | string | null;
  specialty_dish?: string | null;
  bio?: string | null;
  portfolio_links?: string | null;
}): ApplicationCompleteness {
  const meta = unpackApplicationMeta(app.portfolio_links);
  const missing: string[] = [];

  if (!app.full_name?.trim()) missing.push("Full name");
  if (!app.email?.trim()) missing.push("Email");
  if (!(app.phone || app.phone_number)?.trim()) missing.push("Phone / M-Pesa number");
  if (!app.city?.trim()) missing.push("City");
  if (!app.neighborhood?.trim()) missing.push("Neighbourhood");
  if (!app.cuisines?.length) missing.push("Cuisines");
  if (!app.dietary?.length) missing.push("Dietary specialties");
  if (!Number(app.starting_price)) missing.push("Rate per guest");
  if (!app.specialty_dish?.trim()) missing.push("Signature dish");
  if (!app.bio?.trim() || app.bio.trim().length < 50) {
    missing.push("Bio (50+ characters)");
  }
  if (!meta.national_id_number?.trim()) missing.push("National ID / passport");
  if (!meta.service_formats?.length) missing.push("Service format");

  const total = 12;
  const percentage = Math.round(((total - missing.length) / total) * 100);
  return { percentage: Math.max(0, Math.min(100, percentage)), missing };
}

function parseExperienceYears(value?: string | null): number {
  if (!value) return 5;
  const match = String(value).match(/\d+/);
  return match ? Math.max(1, parseInt(match[0], 10)) : 5;
}

export const DEFAULT_CHEF_AVATAR = "/images/avatars/chef-smile-2.jpg";
export const DEFAULT_CHEF_COVER = "/images/home/chef-plating.jpg";

/**
 * Build the marketplace listing created when an admin approves an application.
 * Only columns that exist on the live `chefs` table are named; the write helper
 * strips anything a future/older schema does not have.
 */
export function buildChefFromApplication(
  app: ChefApplication & Record<string, any>,
  userId: string | null
): Record<string, any> {
  const meta = unpackApplicationMeta(app.portfolio_links);
  const cuisines: string[] = app.cuisines?.length ? app.cuisines : ["Continental"];
  const areas: string[] = meta.service_areas?.length
    ? meta.service_areas
    : [app.neighborhood, "Westlands", "Kilimani", "Karen"].filter(Boolean);
  const city = app.city || "Nairobi";

  return {
    user_id: userId,
    name: app.full_name || app.first_name || "Book A Chef Partner",
    slug: slugify(app.full_name || app.first_name || `chef-${Date.now().toString(36)}`),
    brand_name: app.brand_name || `${app.full_name || "Private"} Kitchens`,
    tagline:
      meta.tagline ||
      `${cuisines[0] || "Private"} dining, cooked in your kitchen`,
    bio:
      app.bio?.trim() ||
      `Private chef based in ${city}, specialising in ${cuisines.join(", ")}.`,
    culinary_philosophy:
      "Seasonal ingredients, disciplined technique, and a spotless kitchen at the end of the night.",
    city,
    service_areas: areas,
    cuisines,
    dietary_specialties: app.dietary?.length ? app.dietary : ["Halal"],
    price_per_guest: Number(app.starting_price) || 4500,
    min_guests: 2,
    max_guests: 30,
    rating: 5,
    reviews_count: 0,
    verified: true,
    verification_status: "approved",
    avatar_url: DEFAULT_CHEF_AVATAR,
    cover_image_url: DEFAULT_CHEF_COVER,
    gallery_images: [],
    // Never dispatch work to a chef who has not signed in yet. The current
    // production list has chefs with is_available = true and no user_id, which
    // is why assigned bookings were impossible to accept.
    is_available: false,
    featured: false,
    experience_years: parseExperienceYears(app.experience_years),
    travel_radius_km: Number(app.travel_radius) || 25,
    min_notice_hours: 48,
    phone: app.phone || app.phone_number || null,
    email: app.email || null,
    // Added by the onboarding migration; stripped automatically if absent.
    national_id_number: app.national_id_number || meta.national_id_number || null,
    service_formats:
      app.service_formats?.length
        ? app.service_formats
        : meta.service_formats || ["in_home", "delivery"],
    profile_completion_percentage: 0,
  };
}
