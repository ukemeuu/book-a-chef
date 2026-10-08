import { Chef, Menu } from "./data";

export interface ProfileCheckItem {
  id: string;
  label: string;
  category: "Identity & Security" | "Culinary Profile" | "Menus & Portfolio" | "Service & Rates";
  weight: number;
  completed: boolean;
  missingHint: string;
}

export interface ProfileReadinessResult {
  percentage: number;
  canGoLive: boolean; // Must be >= 97% to go live
  requiredThreshold: number; // 97
  items: ProfileCheckItem[];
  missingItems: ProfileCheckItem[];
  completedCount: number;
  totalCount: number;
}

export interface ChefProfileData {
  name?: string;
  phone?: string;
  email?: string;
  nationalIdNumber?: string; // National ID or Passport Number
  avatar?: string;
  coverImage?: string;
  gallery?: string[];
  brand?: string;
  tagline?: string;
  partnerType?: "independent" | "restaurant";
  serviceFormats?: ("in_home" | "delivery")[];
  city?: string;
  serviceAreas?: string[];
  bio?: string;
  cuisines?: string[];
  culinaryPhilosophy?: string;
  dietary?: string[];
  startingPrice?: number;
  minGuests?: number;
  maxGuests?: number;
  menus?: Menu[];
}

/**
 * Calculates a chef's profile completion percentage.
 * Enforces the strict 97% completion threshold before a chef can "Go Live".
 * Verifies Government National ID or Passport Number.
 */
export function calculateProfileReadiness(chef: ChefProfileData): ProfileReadinessResult {
  const items: ProfileCheckItem[] = [
    {
      id: "name_phone",
      label: "Full Legal Name & Direct Phone",
      category: "Identity & Security",
      weight: 10,
      completed: Boolean(chef.name?.trim() && chef.phone?.trim()),
      missingHint: "Add your full name and M-Pesa contact number",
    },
    {
      id: "national_id",
      label: "National ID or Passport Number",
      category: "Identity & Security",
      weight: 10,
      completed: Boolean(chef.nationalIdNumber?.trim() && chef.nationalIdNumber.trim().length >= 6),
      missingHint: "Add your Government National ID or Passport Number for identity verification",
    },
    {
      id: "avatar",
      label: "Profile Headshot / Chef Portrait",
      category: "Menus & Portfolio",
      weight: 8,
      completed: Boolean(chef.avatar?.trim()),
      missingHint: "Upload a clean headshot or portrait in professional culinary attire",
    },
    {
      id: "cover_image",
      label: "Kitchen or Showcase Cover Photo",
      category: "Menus & Portfolio",
      weight: 6,
      completed: Boolean(chef.coverImage?.trim()),
      missingHint: "Add a high-resolution banner photo of your culinary table or kitchen",
    },
    {
      id: "dish_gallery",
      label: "Dish Gallery (At least 2 photos)",
      category: "Menus & Portfolio",
      weight: 8,
      completed: Boolean(chef.gallery && chef.gallery.length >= 2),
      missingHint: "Upload at least 2 dish photos showcasing your plating and craftsmanship",
    },
    {
      id: "brand_tagline",
      label: "Brand / Kitchen Name & Signature Tagline",
      category: "Culinary Profile",
      weight: 8,
      completed: Boolean(chef.brand?.trim() && chef.tagline?.trim()),
      missingHint: "Provide your culinary brand name and memorable tagline",
    },
    {
      id: "service_format",
      label: "Service Format & Privacy Configuration",
      category: "Service & Rates",
      weight: 8,
      completed: Boolean(chef.serviceFormats && chef.serviceFormats.length > 0),
      missingHint: "Choose In-Home Dining, Fresh Delivery Only (Restaurant Kitchen), or both",
    },
    {
      id: "location_areas",
      label: "Service City & Target Neighborhoods",
      category: "Service & Rates",
      weight: 8,
      completed: Boolean(chef.city?.trim() && chef.serviceAreas && chef.serviceAreas.length > 0),
      missingHint: "Specify your home base city and service areas (e.g. Kilimani, Karen, Runda)",
    },
    {
      id: "bio",
      label: "Chef Bio & Professional Pedigree",
      category: "Culinary Profile",
      weight: 10,
      completed: Boolean(chef.bio?.trim() && chef.bio.trim().length >= 50),
      missingHint: "Write a detailed bio (at least 50 characters) detailing your culinary background",
    },
    {
      id: "cuisines_philosophy",
      label: "Cuisines & Culinary Philosophy",
      category: "Culinary Profile",
      weight: 7,
      completed: Boolean(chef.cuisines && chef.cuisines.length > 0 && chef.culinaryPhilosophy?.trim()),
      missingHint: "Select your cuisines and write your culinary philosophy quote",
    },
    {
      id: "dietary",
      label: "Dietary Specialties",
      category: "Culinary Profile",
      weight: 5,
      completed: Boolean(chef.dietary && chef.dietary.length > 0),
      missingHint: "Indicate dietary accommodations (e.g. Halal, Gluten-Free, Vegan)",
    },
    {
      id: "pricing",
      label: "Rate Per Guest & Guest Capacity",
      category: "Service & Rates",
      weight: 6,
      completed: Boolean(
        chef.startingPrice &&
        chef.startingPrice >= 1500 &&
        chef.minGuests &&
        chef.maxGuests &&
        chef.maxGuests >= chef.minGuests
      ),
      missingHint: "Set your starting price per guest and guest count limits",
    },
    {
      id: "degustation_menu",
      label: "At Least 1 Complete Degustation Menu",
      category: "Menus & Portfolio",
      weight: 6,
      completed: Boolean(
        chef.menus &&
        chef.menus.length > 0 &&
        chef.menus.some((m) => m.title && m.pricePerGuest > 0 && m.courses?.main?.name)
      ),
      missingHint: "Publish at least one multi-course tasting menu with courses and pricing",
    },
  ];

  const totalEarned = items.reduce((sum, item) => sum + (item.completed ? item.weight : 0), 0);
  const percentage = Math.min(100, Math.round(totalEarned));
  const missingItems = items.filter((i) => !i.completed);
  const completedCount = items.length - missingItems.length;

  return {
    percentage,
    canGoLive: percentage >= 97,
    requiredThreshold: 97,
    items,
    missingItems,
    completedCount,
    totalCount: items.length,
  };
}
