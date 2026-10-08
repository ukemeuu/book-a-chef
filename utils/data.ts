export type UserRole = "client" | "chef" | "admin";

export interface CourseItem {
  name: string;
  description: string;
}

export interface Menu {
  id: string;
  title: string;
  tag: string;
  description: string;
  pricePerGuest: number;
  courses: {
    appetizer?: CourseItem;
    main: CourseItem;
    dessert?: CourseItem;
  };
}

export interface Review {
  id: string;
  author: string;
  rating: number;
  date: string;
  comment: string;
  location?: string;
  avatar?: string;
}

export interface Chef {
  id: string;
  name: string;
  brand: string;
  tagline: string;
  location: string;
  serviceAreas: string[];
  rating: number;
  reviewsCount: number;
  avatar: string;
  coverImage: string;
  gallery: string[];
  startingPrice: number;
  cuisines: string[];
  dietary: string[];
  bio: string;
  culinaryPhilosophy: string;
  verified: boolean;
  certificationBadge?: string;
  featured: boolean;
  isAvailable: boolean;
  maxGuests?: number;
  minGuests?: number;
  menus: Menu[];
  reviews: Review[];
  // Partner & Privacy Service Configuration
  partnerType?: "independent" | "restaurant";
  restaurantName?: string;
  serviceFormats?: ServiceFormat[];
  allowInHome?: boolean;
  allowDelivery?: boolean;
  // Verification, Badges & Safety Protocol
  nationalIdNumber?: string;
  profileCompletion?: number;
  isLive?: boolean;
  foodSafetyCertified?: boolean;
  haccpCertified?: boolean;
  kitchenMealTasted?: boolean; // In-house kitchen tasting & meal verification badge
  goodConductVerified?: boolean; // Background & Safety Compliance verified
}

export type ServiceFormat = "in_home" | "delivery";
export type SourcingPreference = "chef_sourced" | "client_specified";

export interface Booking {
  id: string;
  chefId: string;
  chefName: string;
  chefAvatar?: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  menuTitle: string;
  bookingDate: string;
  bookingTime: string;
  guestsCount: number;
  totalPrice: number;
  depositAmount: number;
  status:
    | "pending"
    | "pending_assignment"
    | "assigned"
    | "chef_accepted"
    | "payment_pending"
    | "confirmed"
    | "en_route"
    | "cooking"
    | "in_progress"
    | "completed"
    | "declined"
    | "cancelled_by_customer"
    | "cancelled_by_chef"
    | "expired"
    | "refund_pending"
    | "refunded"
    | "disputed"
    | "cancelled";
  address: string;
  city: string;
  specialRequests?: string;
  serviceFormat?: ServiceFormat;
  sourcingPreference?: SourcingPreference;
  preferredStores?: string;
  receiptVerified?: boolean;
  createdAt: string;
}

export interface ChefApplication {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  nationalIdNumber?: string; // Government National ID or Passport Number
  partnerType?: "chef" | "restaurant";
  restaurantName?: string;
  restaurantRole?: string;
  serviceFormats?: ServiceFormat[];
  brandName?: string;
  experienceYears: string;
  city: string;
  neighborhood: string;
  cuisines: string[];
  dietary: string[];
  startingPrice: number;
  specialtyDish: string;
  bio: string;
  foodSafetyCertified?: boolean;
  haccpCertified?: boolean;
  kitchenTastingAgreed?: boolean;
  goodConductUploaded?: boolean;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  bookingId?: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  recipientId: string;
  content: string;
  createdAt: string;
}

// 3 CERTIFIED MASTER CHEFS WEARING BOOK A CHEF UNIFORM (MEAL TASTED & APPROVED)
export const INITIAL_CHEFS: Chef[] = [
  {
    id: "c_1",
    name: "Chef Amina Hassan",
    brand: "Taste of the Coast",
    tagline: "Certified Master • Royal Swahili & Ocean-Fresh Seafood",
    location: "Mombasa & Nairobi (Travels Countrywide)",
    serviceAreas: ["Kilimani", "Karen", "Runda", "Nyali", "Diani Beach"],
    rating: 4.98,
    reviewsCount: 94,
    avatar: "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&q=80&w=800",
    coverImage: "https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&q=80&w=2070",
    gallery: [
      "https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&q=80&w=1200",
      "https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&q=80&w=1200",
      "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=1200",
      "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&q=80&w=1200",
    ],
    startingPrice: 3800,
    cuisines: ["Swahili", "Seafood", "Halal"],
    dietary: ["Halal", "Pescatarian", "Gluten-Free"],
    partnerType: "independent",
    serviceFormats: ["in_home", "delivery"],
    allowInHome: true,
    allowDelivery: true,
    nationalIdNumber: "28471923",
    profileCompletion: 100,
    isLive: true,
    verified: true,
    certificationBadge: "Book A Chef Certified • Meal Tasted & Approved",
    foodSafetyCertified: true,
    haccpCertified: true,
    kitchenMealTasted: true,
    goodConductVerified: true,
    featured: true,
    isAvailable: true,
    bio: "Certified by the Book A Chef Executive Tasting Panel. Chef Amina wears the official Book A Chef executive uniform with over 12 years of coastal culinary mastery spanning Lamu, Mombasa, and Nairobi's finest private residences.",
    culinaryPhilosophy: "Wild ocean catch delivered at dawn, cold-pressed coastal coconut cream, and hand-ground Zanzibar spices cooked over slow embers.",
    menus: [
      {
        id: "m_1",
        title: "Royal Swahili Seafood Feast",
        tag: "Most Popular",
        description: "A 3-course coastal celebration highlighting fresh Indian Ocean lobster, tamarind prawns, and coconut-cardamom mahamri.",
        pricePerGuest: 4500,
        courses: {
          appetizer: {
            name: "Crispy Lamu Crab Samosas",
            description: "Hand-rolled with sweet crabmeat, lime zest, ginger, and mango tamarind relish.",
          },
          main: {
            name: "Charcoal-Grilled Jumbo Prawns & Kamba wa Nazi",
            description: "Tiger prawns simmered in thick coastal coconut sauce, accompanied by saffron coconut rice and kachumbari.",
          },
          dessert: {
            name: "Cardamom Mahamri & Spiced Chai Panna Cotta",
            description: "Warm Swahili pastries infused with Zanzibar cardamom, honey drizzle, and tropical passion coulis.",
          },
        },
      },
      {
        id: "m_2",
        title: "Old Town Mombasa Biryani Tasting",
        tag: "Chef's Signature",
        description: "A slow-braised aromatic feast inspired by centuries of Coastal spice trade.",
        pricePerGuest: 3800,
        courses: {
          appetizer: {
            name: "Swahili Mishkaki Skewers",
            description: "Tender beef fillet skewers marinated in raw papaya, garlic, cumin, and chilli.",
          },
          main: {
            name: "Traditional Slow-Braised Goat Biryani Ya Kuku",
            description: "Fragrant basmati layered with caramelized onions, whole cloves, and tender marinated goat.",
          },
          dessert: {
            name: "Kashata za Nazi & Pistachio Ice Cream",
            description: "Classic toasted coconut brittle paired with homemade pistachio cream.",
          },
        },
      },
    ],
    reviews: [
      {
        id: "r_1",
        author: "Dr. Evelyn Kiprono",
        rating: 5,
        date: "2 weeks ago",
        location: "Karen, Nairobi",
        comment: "Chef Amina arrived in her crisp Book A Chef uniform. The seafood coconut sauce was Michelin quality, and my kitchen was left spotless!",
      },
      {
        id: "r_2",
        author: "Marcus Vance",
        rating: 5,
        date: "Last month",
        location: "Diani Beach",
        comment: "Flawless dining experience. The grilled prawns and coconut rice tasted like pure luxury.",
      },
    ],
  },
  {
    id: "c_2",
    name: "Chef David Omondi",
    brand: "The Grill Master KE",
    tagline: "Certified Master • Artisanal Charcoal BBQ & Modern Kenyan Cuts",
    location: "Nairobi (Kilimani, Karen, Kileleshwa, Lavington)",
    serviceAreas: ["Kilimani", "Karen", "Kileleshwa", "Lavington", "Gigiri"],
    rating: 4.97,
    reviewsCount: 72,
    avatar: "https://images.unsplash.com/photo-1600565193348-f74bd3c7ccdf?auto=format&fit=crop&q=80&w=800",
    coverImage: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=2069",
    gallery: [
      "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=1200",
      "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&q=80&w=1200",
      "https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?auto=format&fit=crop&q=80&w=1200",
    ],
    startingPrice: 4200,
    cuisines: ["Nyama Choma", "BBQ", "Kenyan Traditional"],
    dietary: ["Gluten-Free", "Keto", "Halal Upon Request"],
    partnerType: "independent",
    serviceFormats: ["in_home", "delivery"],
    allowInHome: true,
    allowDelivery: true,
    nationalIdNumber: "29841029",
    profileCompletion: 100,
    isLive: true,
    verified: true,
    certificationBadge: "Book A Chef Certified • Meal Tasted & Approved",
    foodSafetyCertified: true,
    haccpCertified: false,
    kitchenMealTasted: true,
    goodConductVerified: true,
    featured: true,
    isAvailable: true,
    bio: "Certified by the Book A Chef Executive Tasting Panel. Chef David wears the Book A Chef master uniform, trained in Texas smokehouses and South African braai culture, elevating East African open-fire cooking to a high-end art form.",
    culinaryPhilosophy: "24-hour slow smoke, local acacia wood smoke, and bold, balanced dry rubs that let prime cuts sing.",
    menus: [
      {
        id: "m_3",
        title: "Prime Savannah Smoke & Ember Feast",
        tag: "Signature",
        description: "Dry-aged T-bones, herb-crusted lamb chops, and artisanal smoked sausages paired with traditional sides.",
        pricePerGuest: 4500,
        courses: {
          appetizer: {
            name: "Smoked Bone Marrow on Brioche",
            description: "Roasted over wild embers, topped with herb chimichurri and pickled shallots.",
          },
          main: {
            name: "14-Hour Smoked Beef Brisket & Herb Lamb Chops",
            description: "Served with brown butter ugali fries, charred sukuma wiki with bone broth, and roasted tomato relish.",
          },
          dessert: {
            name: "Bourbon & Baobab Glazed Grilled Peaches",
            description: "Caramelized over open embers, topped with vanilla bean mascarpone and roasted macadamias.",
          },
        },
      },
    ],
    reviews: [
      {
        id: "r_3",
        author: "Eng. Patrick Kamau",
        rating: 5,
        date: "3 weeks ago",
        location: "Runda Estate, Nairobi",
        comment: "David brought genuine high-end smokehouse magic to our garden barbecue. The brisket melted like butter.",
      },
    ],
  },
  {
    id: "c_3",
    name: "Chef Sarah Wanjiku",
    brand: "Atelier Wanjiku",
    tagline: "Certified Master • French Classical Technique & Rift Valley Terroir",
    location: "Nairobi & Naivasha",
    serviceAreas: ["Runda", "Muthaiga", "Loresho", "Naivasha Lakefront"],
    rating: 4.99,
    reviewsCount: 118,
    avatar: "https://images.unsplash.com/photo-1583394293214-28ded15ee548?auto=format&fit=crop&q=80&w=800",
    coverImage: "https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?auto=format&fit=crop&q=80&w=2070",
    gallery: [
      "https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?auto=format&fit=crop&q=80&w=1200",
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=1200",
      "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&q=80&w=1200",
    ],
    startingPrice: 5000,
    cuisines: ["Fine Dining", "Italian", "Wine & Sommeliers", "Continental", "Pastry & Desserts"],
    dietary: ["Vegetarian", "Gluten-Free", "Pescatarian"],
    partnerType: "restaurant",
    restaurantName: "Atelier Wanjiku Culinary Lab",
    serviceFormats: ["delivery"],
    allowInHome: false,
    allowDelivery: true,
    nationalIdNumber: "31045981",
    profileCompletion: 100,
    isLive: true,
    verified: true,
    certificationBadge: "Book A Chef Certified • Meal Tasted & Approved",
    foodSafetyCertified: true,
    haccpCertified: true,
    kitchenMealTasted: true,
    goodConductVerified: true,
    featured: true,
    isAvailable: true,
    bio: "Certified by the Book A Chef Executive Tasting Panel. Le Cordon Bleu alumnus with Michelin-starred restaurant training in Florence and London. Wears the Book A Chef executive jacket, crafting bespoke fine-dining with Great Rift Valley organic produce.",
    culinaryPhilosophy: "Pure ingredients, delicate French precision, and modern art on every plate.",
    menus: [
      {
        id: "m_4",
        title: "Tuscan Sunset 4-Course Tasting",
        tag: "Fine Dining",
        description: "Handmade pasta, aged parmesan, truffle oil, and pan-seared sea bass with Limuru organic microgreens.",
        pricePerGuest: 6000,
        courses: {
          appetizer: {
            name: "Handmade Burrata & Heirloom Rift Tomatoes",
            description: "Cold-pressed extra virgin olive oil, aged balsamic glaze, basil oil, and toasted focaccia.",
          },
          main: {
            name: "Pan-Seared Sea Bass & Hand-Rolled Truffle Tagliolini",
            description: "With wild porcini mushrooms, white wine reduction, and shaved 24-month Parmigiano-Reggiano.",
          },
          dessert: {
            name: "Deconstructed Classic Tiramisu",
            description: "Kenyan AA espresso-soaked savoiardi, mascarpone mousse, and 70% dark chocolate shavings.",
          },
        },
      },
    ],
    reviews: [
      {
        id: "r_4",
        author: "Sophie De Meyer",
        rating: 5,
        date: "1 week ago",
        location: "Muthaiga, Nairobi",
        comment: "Sarah curated an intimate 6-person tasting menu for our board dinner. The food and wine pairing advice was exceptional.",
      },
    ],
  },
];

export const DEMO_APPLICATIONS: ChefApplication[] = [
  {
    id: "app_1",
    fullName: "Chef Johnathan Muriuki",
    email: "john.muriuki@culinary.ke",
    phone: "+254 701 445 566",
    brandName: "Afro-Fusion Table",
    experienceYears: "8 years",
    city: "Nairobi",
    neighborhood: "Kilimani",
    cuisines: ["Fine Dining", "Kenyan Traditional", "Pan-Asian"],
    dietary: ["Gluten-Free", "Halal"],
    startingPrice: 4500,
    specialtyDish: "Slow-roasted Mount Kenya lamb loin with baobab jus and cassava puree",
    bio: "Former sous-chef at Villa Rosa Kempinski with a passion for modernizing indigenous East African tubers and heirloom grains.",
    status: "pending",
    createdAt: "2026-08-21T16:20:00Z",
  },
  {
    id: "app_2",
    fullName: "Chef Fatma Al-Husseini",
    email: "fatma.coastal@gmail.com",
    phone: "+254 788 332 211",
    brandName: "Lamu Spiced Kitchen",
    experienceYears: "6 years",
    city: "Mombasa",
    neighborhood: "Nyali",
    cuisines: ["Swahili", "Seafood", "Pastry & Baking"],
    dietary: ["Halal"],
    startingPrice: 3800,
    specialtyDish: "Wood-fired whole red snapper with tamarind glaze and coconut sima",
    bio: "Passionate coastal chef specializing in private villa catering across Diani, Watamu, and Mombasa.",
    status: "pending",
    createdAt: "2026-08-22T10:05:00Z",
  },
];

export const DEMO_BOOKINGS: Booking[] = [
  {
    id: "bk_101",
    chefId: "c_1",
    chefName: "Chef Amina Hassan",
    chefAvatar: "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&q=80&w=800",
    clientName: "Michael Wachira",
    clientEmail: "m.wachira@example.com",
    clientPhone: "+254 712 345 678",
    menuTitle: "Royal Swahili Seafood Feast",
    bookingDate: "2026-08-28",
    bookingTime: "7:00 PM (Dinner)",
    guestsCount: 6,
    totalPrice: 27000,
    depositAmount: 4050,
    status: "confirmed",
    address: "Riverside Drive, Penthouse 4B, Westlands",
    city: "Nairobi",
    specialRequests: "One guest has a mild shellfish allergy; please prepare alternative sea bass course.",
    createdAt: "2026-08-20T14:30:00Z",
  },
];

export const DEMO_MESSAGES: ChatMessage[] = [];
