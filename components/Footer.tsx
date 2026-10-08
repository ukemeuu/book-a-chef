import Link from "next/link";
import { ChefHat, ShieldCheck, Phone, Mail, Heart, Sparkles } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-forest-950 text-cream-100 pt-20 pb-12 border-t border-forest-900 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 mb-16">
          {/* Brand Col */}
          <div className="lg:col-span-2 space-y-5">
            <div className="flex items-center gap-2.5">
              <div className="h-10 w-10 rounded-2xl bg-cream-100 text-forest-950 flex items-center justify-center shadow-lg">
                <ChefHat className="h-5 w-5" />
              </div>
              <span className="font-serif text-2xl font-bold tracking-tight text-white">
                Book A <span className="text-champagne-400 italic">Chef</span>
              </span>
            </div>
            <p className="text-sm text-forest-200/80 leading-relaxed max-w-sm">
              Connecting diners with verified private chefs and celebrated restaurant kitchens across Kenya for bespoke in-home dining and delivery.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-forest-900/80 border border-forest-800 text-xs font-bold text-champagne-400">
                <ShieldCheck className="h-4 w-4" /> Vetted Chefs
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-forest-900/80 border border-forest-800 text-xs font-bold text-cream-200">
                <Sparkles className="h-3.5 w-3.5" /> M-Pesa Protected
              </div>
            </div>
          </div>

          {/* Diners */}
          <div className="space-y-4 text-left">
            <h4 className="text-xs font-black uppercase tracking-[0.2em] text-champagne-400">
              For Diners
            </h4>
            <ul className="space-y-2.5 text-sm font-medium text-forest-200/90">
              <li>
                <Link href="/chefs" className="hover:text-white transition-colors">
                  Browse All Chefs
                </Link>
              </li>
              <li>
                <Link href="/chefs?cuisine=Swahili" className="hover:text-white transition-colors">
                  Swahili & Seafood
                </Link>
              </li>
              <li>
                <Link href="/chefs?cuisine=BBQ" className="hover:text-white transition-colors">
                  Nyama Choma & BBQ
                </Link>
              </li>
              <li>
                <Link href="/chefs?cuisine=Continental" className="hover:text-white transition-colors">
                  Fine Dining & Italian
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-white transition-colors">
                  Client Dashboard
                </Link>
              </li>
            </ul>
          </div>

          {/* Chefs & Restaurants */}
          <div className="space-y-4 text-left">
            <h4 className="text-xs font-black uppercase tracking-[0.2em] text-champagne-400">
              For Chefs & Kitchens
            </h4>
            <ul className="space-y-2.5 text-sm font-medium text-forest-200/90">
              <li>
                <Link href="/apply?type=restaurant" className="hover:text-white transition-colors flex items-center gap-1.5 text-champagne-300 font-bold">
                  <span>🏢</span> List Restaurant Chefs
                </Link>
              </li>
              <li>
                <Link href="/apply" className="hover:text-white transition-colors flex items-center gap-1.5">
                  <span className="text-champagne-400">★</span> Apply as Independent Chef
                </Link>
              </li>
              <li>
                <Link href="/chef-jobs" className="hover:text-white transition-colors">
                  Chef Earnings Estimator
                </Link>
              </li>
              <li>
                <Link href="/chef-dashboard" className="hover:text-white transition-colors">
                  Chef Partner Portal
                </Link>
              </li>
              <li>
                <Link href="/login?role=chef" className="hover:text-white transition-colors">
                  Sign In to Kitchen
                </Link>
              </li>
            </ul>
          </div>

          {/* Administration & Contact */}
          <div className="space-y-4 text-left">
            <h4 className="text-xs font-black uppercase tracking-[0.2em] text-champagne-400">
              Platform & Contact
            </h4>
            <ul className="space-y-2.5 text-sm text-forest-200/90">

              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-champagne-400 shrink-0" />
                <span>concierge@bookachef.co.ke</span>
              </li>
              <li className="pt-2">
                <Link
                  href="/admin"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-champagne-400 hover:underline"
                >
                  <ShieldCheck className="h-3.5 w-3.5" /> Admin Management
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-forest-900/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-forest-400 font-medium">
          <p>© {new Date().getFullYear()} Book A Chef Kenya. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <Link href="/cancellation-policy" className="hover:text-cream-200 transition-colors">
              Cancellation Policy
            </Link>
            <Link href="/privacy" className="hover:text-cream-200 transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-cream-200 transition-colors">
              Terms of Service
            </Link>
            <span className="flex items-center gap-1 text-forest-300">
              Crafted with <Heart className="h-3 w-3 text-red-500 fill-red-500" /> in Nairobi
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
