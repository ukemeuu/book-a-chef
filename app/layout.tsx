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
  title: "Book A Chef | On-Demand Private Chefs Across Kenya",
  description:
    "Request a vetted private chef for your home or villa. Tell us your date, location and cuisine — we match and dispatch a certified chef to your kitchen.",
  keywords:
    "private chef Nairobi, book a chef Kenya, on-demand chef dispatch, in-home dining Kenya, private catering Karen, Diani holiday chef, Swahili cuisine private chef",
  metadataBase: new URL("https://bookachef.co.ke"),
  openGraph: {
    title: "Book A Chef | On-Demand Private Chefs in Kenya",
    description:
      "Tell us what you need. We dispatch a vetted chef to your kitchen for intimate dinners, celebrations and luxury coastal retreats.",
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
