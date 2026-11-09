/**
 * SEO content for the cuisine landing pages.
 *
 * Each entry is a self-contained, indexable page: a unique title, meta
 * description, keywords, structured data, long-form copy, signature dishes,
 * and an FAQ. The chef list is fetched live from the directory and filtered
 * by `cuisineKey`.
 */

export interface CuisineContent {
  slug: string;
  /** Display name, e.g. "Swahili & Seafood". */
  name: string;
  /** Short label used in the browser title. */
  shortName: string;
  title: string;
  description: string;
  keywords: string[];
  heroImage: string;
  intro: string;
  /** What the cuisine is known for. */
  dishes: { name: string; description: string }[];
  /** What a private chef experience looks like for this cuisine. */
  experience: { title: string; description: string }[];
  faqs: { q: string; a: string }[];
  /** Value matched against the chefs.cuisines array. */
  cuisineKey: string;
}

export const CUISINES: Record<string, CuisineContent> = {
  "swahili-seafood": {
    slug: "swahili-seafood",
    name: "Swahili & Seafood",
    shortName: "Swahili & Seafood",
    title: "Swahili & Seafood Chefs in Kenya | Book A Private Chef",
    description:
      "Book a verified Swahili and seafood private chef in Kenya. Coconut prawns, grilled fish, pilau and coastal classics — cooked fresh in your home.",
    keywords: [
      "Swahili chef Kenya",
      "seafood private chef Nairobi",
      "Swahili food catering Kenya",
      "coastal chef Diani",
      "prawns pilau chef",
      "private chef Mombasa",
      "book a Swahili chef",
    ],
    heroImage:
      "https://images.unsplash.com/photo-1559737558-2f5a35f4523b?auto=format&fit=crop&q=80&w=1600",
    intro:
      "Swahili cooking is the taste of Kenya's coast — coconut milk, cardamom, tamarind, and seafood landed the same morning. A private Swahili chef brings that coastal larder into your home: prawns simmered in coconut cream, red snapper grilled over charcoal, and pilau fragrant with cumin and cinnamon.",
    dishes: [
      {
        name: "Coconut Prawns Pilau",
        description:
          "Tiger prawns simmered in a fragrant cardamom and coconut pilau — the centrepiece of a coastal feast.",
      },
      {
        name: "Samaki wa Kupaka",
        description:
          "Whole red snapper basted in a fiery coconut-chilli sauce, finished over charcoal.",
      },
      {
        name: "Octopus wa Nazi",
        description:
          "Tender octopus slow-cooked in coconut cream with lime and coastal herbs.",
      },
      {
        name: "Mahamri & Cardamom Custard",
        description:
          "Warm Swahili doughnuts served with a vanilla-infused coconut custard.",
      },
    ],
    experience: [
      {
        title: "The coastal table",
        description:
          "Your chef arrives with fresh catches from the coast and builds a shared table of coastal classics.",
      },
      {
        title: "Cooked in your kitchen",
        description:
          "Everything is prepared in front of you — from the coconut milk to the final plate.",
      },
      {
        title: "Dietary flexibility",
        description:
          "Pescatarian, halal, and gluten-free coastal menus are easy to arrange.",
      },
    ],
    faqs: [
      {
        q: "Do Swahili chefs provide the seafood?",
        a: "Yes. Most Swahili and seafood chefs source the catch themselves on the day, or you can agree a budget and let them shop at your local market.",
      },
      {
        q: "Can you cater for a coastal-themed event?",
        a: "Absolutely. Chefs regularly cook for beach weddings, villa parties, and corporate coastal nights across Diani, Watamu, and Nairobi.",
      },
      {
        q: "Is Swahili food spicy?",
        a: "It can be. Chefs will usually ask your preferred heat level and prepare a mild version alongside a spicier one.",
      },
    ],
    cuisineKey: "Swahili",
  },

  "nyama-choma-bbq": {
    slug: "nyama-choma-bbq",
    name: "Nyama Choma & BBQ",
    shortName: "Nyama Choma & BBQ",
    title: "Nyama Choma & BBQ Chefs in Kenya | Book A Private Chef",
    description:
      "Book a verified nyama choma and BBQ private chef in Kenya. Charcoal-grilled meats, kachumbari, and outdoor feasts — cooked live at your home.",
    keywords: [
      "nyama choma chef Kenya",
      "BBQ private chef Nairobi",
      "nyama choma catering Kenya",
      "garden party chef",
      "charcoal grill chef Kenya",
      "outdoor chef Nairobi",
      "book a BBQ chef",
    ],
    heroImage:
      "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&q=80&w=1600",
    intro:
      "Nyama choma is Kenya's great social ritual — meat grilled slowly over charcoal, sliced to order, and eaten with your hands. A private BBQ chef brings the grill to you: aged cuts, wood smoke, and all the sides, from kachumbari to ugali.",
    dishes: [
      {
        name: "Charcoal-Grilled Nyama Choma",
        description:
          "Prime beef or goat, marinated overnight and grilled over acacia charcoal until smoky and tender.",
      },
      {
        name: "BBQ Ribs & Choma Wings",
        description:
          "Slow-smoked ribs and wings glazed with a tamarind and chilli sauce.",
      },
      {
        name: "Kachumbari & Ugali",
        description:
          "The essential sides — fresh tomato-onion salad and soft, hand-rolled ugali.",
      },
      {
        name: "Grilled Pineapple & Chilli Salt",
        description:
          "Caramelised pineapple with a chilli-salt dusting to finish the feast.",
      },
    ],
    experience: [
      {
        title: "The live grill",
        description:
          "Your chef sets up the grill in your garden or courtyard and cooks everything to order.",
      },
      {
        title: "A feast for a crowd",
        description:
          "BBQ works beautifully for birthdays, corporate team days, and family gatherings.",
      },
      {
        title: "You set the menu",
        description:
          "Choose your cuts, your sides, and your smoke — the chef handles the rest.",
      },
    ],
    faqs: [
      {
        q: "Can the chef bring their own grill?",
        a: "Yes. Most BBQ chefs bring a charcoal grill and all the equipment, or can use yours if you prefer.",
      },
      {
        q: "How many guests can a BBQ chef serve?",
        a: "Chefs regularly cater for 10 to 100+ guests. Tell them your number and they will plan the quantities.",
      },
      {
        q: "Is the meat halal?",
        a: "Many nyama choma chefs offer halal meat on request — just mention it when you book.",
      },
    ],
    cuisineKey: "Nyama Choma",
  },

  "italian-pasta": {
    slug: "italian-pasta",
    name: "Italian & Pasta",
    shortName: "Italian & Pasta",
    title: "Italian & Pasta Chefs in Kenya | Book A Private Chef",
    description:
      "Book a verified Italian and pasta private chef in Kenya. Hand-rolled pasta, risotto, and slow-simmered sauces — cooked fresh in your home.",
    keywords: [
      "Italian chef Kenya",
      "pasta private chef Nairobi",
      "Italian catering Kenya",
      "handmade pasta chef",
      "risotto chef Nairobi",
      "Italian fine dining at home",
      "book an Italian chef",
    ],
    heroImage:
      "https://images.unsplash.com/photo-1551183053-fbf97917c697?auto=format&fit=crop&q=80&w=1600",
    intro:
      "Italian cooking is about restraint — a few excellent ingredients, treated with care. A private Italian chef rolls pasta by hand in your kitchen, builds a slow ragù, and finishes with a proper tiramisu. No trattoria shortcuts, just the real thing.",
    dishes: [
      {
        name: "Hand-Rolled Pasta",
        description:
          "Tagliatelle, pappardelle, or ravioli made to order and served with a slow-simmered ragù.",
      },
      {
        name: "Truffle Risotto",
        description:
          "Carnaroli rice stirred slowly with butter, parmesan, and truffle.",
      },
      {
        name: "Osso Buco",
        description:
          "Braised veal shank with gremolata and a saffron risotto — a northern Italian classic.",
      },
      {
        name: "Tiramisu",
        description:
          "Espresso-soaked savoiardi with mascarpone and cocoa, made fresh on the day.",
      },
    ],
    experience: [
      {
        title: "Pasta made in front of you",
        description:
          "Watch your chef roll and cut pasta by hand, then cook it to order.",
      },
      {
        title: "A proper Italian table",
        description:
          "Antipasti, primi, secondi, and dolci — served as they would be in Italy.",
      },
      {
        title: "Wine-friendly menus",
        description:
          "Chefs can structure courses to pair with the wines you plan to serve.",
      },
    ],
    faqs: [
      {
        q: "Can the chef make gluten-free pasta?",
        a: "Yes. Most Italian chefs can prepare gluten-free pasta and adapt sauces on request.",
      },
      {
        q: "Do you need to provide Italian ingredients?",
        a: "Your chef will bring or source the specialist ingredients — flour, cheese, and cured meats — and itemise any shopping for you.",
      },
      {
        q: "Can you do a vegetarian Italian menu?",
        a: "Absolutely. Italian cooking has a deep vegetarian tradition, from pasta al pomodoro to melanzane alla parmigiana.",
      },
    ],
    cuisineKey: "Italian",
  },

  "fine-dining": {
    slug: "fine-dining",
    name: "Fine Dining",
    shortName: "Fine Dining",
    title: "Fine Dining Chefs in Kenya | Book A Private Chef",
    description:
      "Book a verified fine dining private chef in Kenya. Plated multi-course tasting menus, wine pairing, and Michelin-inspired service in your home.",
    keywords: [
      "fine dining chef Kenya",
      "private fine dining Nairobi",
      "tasting menu chef Kenya",
      "Michelin chef Nairobi",
      "degustation private chef",
      "luxury chef Kenya",
      "book a fine dining chef",
    ],
    heroImage:
      "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&q=80&w=1600",
    intro:
      "Fine dining at home is the most memorable way to mark an occasion. A private chef designs a multi-course tasting menu around you, plates each course with precision, and serves it with the polish of a Michelin-starred dining room.",
    dishes: [
      {
        name: "Plated Degustation",
        description:
          "Five to eight courses of precisely plated dishes, built around the season and your preferences.",
      },
      {
        name: "Seared Scallops & Beurre Blanc",
        description:
          "Hand-dived scallops with a classic beurre blanc and seasonal vegetables.",
      },
      {
        name: "Beef Fillet & Red Wine Jus",
        description:
          "Grass-fed beef fillet with a slow-reduced red wine jus and pomme purée.",
      },
      {
        name: "Valrhona Chocolate Fondant",
        description:
          "A molten-centred chocolate fondant with passion fruit coulis — the final course.",
      },
    ],
    experience: [
      {
        title: "A tasting menu built for you",
        description:
          "Your chef designs the menu around your tastes, dietary needs, and the occasion.",
      },
      {
        title: "Restaurant-level service",
        description:
          "Courses are served at the right pace, with wine pairing and full table service.",
      },
      {
        title: "A spotless kitchen",
        description:
          "Your chef cleans everything down before they leave — no trace of the kitchen remains.",
      },
    ],
    faqs: [
      {
        q: "How many guests can a fine dining chef serve?",
        a: "Fine dining works best for intimate groups of 2 to 12, where each course can be plated individually and served at its best.",
      },
      {
        q: "Can you arrange wine pairing?",
        a: "Yes. Chefs will structure the menu to match the wines you plan to serve, and can advise on pairings.",
      },
      {
        q: "How far in advance should I book?",
        a: "For a tasting menu, booking 1 to 2 weeks ahead gives the chef time to design the menu and source ingredients.",
      },
    ],
    cuisineKey: "Fine Dining",
  },
};

export const CUISINE_LIST = Object.values(CUISINES);
