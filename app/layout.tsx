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
  title: "Book A Chef | Verified Private Chefs Across Kenya",
  description:
    "Browse verified private chefs across Kenya. See what they cook and contact them directly by phone or WhatsApp.",
  keywords:
    "private chef Nairobi, find a chef Kenya, chef directory Kenya, private dining Karen, Diani chef, Swahili cuisine private chef, verified chefs Kenya",
  metadataBase: new URL("https://bookachef.co.ke"),
  openGraph: {
    title: "Book A Chef | Verified Private Chefs in Kenya",
    description:
      "Browse verified private chefs, see what they cook, and contact them directly.",
    url: "https://bookachef.co.ke",
    siteName: "Book A Chef",
    locale: "en_KE",
    type: "website",
  },
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: { url: "/apple-icon.png", sizes: "180x180" },
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
