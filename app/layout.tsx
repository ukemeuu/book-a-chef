import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Playfair_Display } from "next/font/google";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#1d382b",
};

export const metadata: Metadata = {
  title: "Book A Chef | Handcrafted Private Dining Experiences Across Kenya",
  description:
    "The Airbnb for private chefs in Kenya. Browse verified elite culinary masters for intimate dinners, family celebrations, and luxury coastal retreats.",
  keywords:
    "private chef Nairobi, chef marketplace Kenya, luxury home dining, private catering Karen, Runda private chef, Diani holiday chef, Swahili cuisine private chef",
  metadataBase: new URL("https://bookachef.co.ke"),
  openGraph: {
    title: "Book A Chef | Luxury Private Dining at Home",
    description: "Book vetted master chefs for bespoke multi-course dinners in Nairobi and Diani.",
    url: "https://bookachef.co.ke",
    siteName: "Book A Chef",
    locale: "en_KE",
    type: "website",
  },
  icons: {
    icon: "/favicon.ico",
  },
};

import MobileBottomNav from "@/components/navigation/MobileBottomNav";
import WhatsAppButton from "@/components/WhatsAppButton";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${plusJakarta.variable} ${playfair.variable}`}>
      <body className="antialiased min-h-screen bg-cream-50 text-forest-950 selection:bg-forest-100 selection:text-forest-900 font-sans pb-16 lg:pb-0">
        {children}
        <WhatsAppButton />
        <MobileBottomNav />
      </body>
    </html>
  );
}
