import Link from "next/link";
import { ChefHat } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-forest-950 text-cream-100 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2 mb-3">
              <ChefHat className="h-5 w-5 text-white" />
              <span className="font-bold text-white">Book A Chef</span>
            </Link>
            <p className="text-sm text-cream-200/60 leading-relaxed">
              On-demand private chefs across Kenya. Tell us what you need, we&apos;ll match
              you with the perfect chef.
            </p>
          </div>

          {/* Dine */}
          <div>
            <h3 className="text-sm font-medium text-white mb-3">Dine</h3>
            <ul className="space-y-2 text-sm text-cream-200/60">
              <li>
                <Link href="/request" className="hover:text-white transition-colors">
                  Request a chef
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-white transition-colors">
                  My bookings
                </Link>
              </li>
            </ul>
          </div>

          {/* Cook */}
          <div>
            <h3 className="text-sm font-medium text-white mb-3">Cook</h3>
            <ul className="space-y-2 text-sm text-cream-200/60">
              <li>
                <Link href="/apply" className="hover:text-white transition-colors">
                  Apply as a chef
                </Link>
              </li>
              <li>
                <Link href="/chef-jobs" className="hover:text-white transition-colors">
                  Earnings
                </Link>
              </li>
              <li>
                <Link href="/chef-dashboard" className="hover:text-white transition-colors">
                  Chef dashboard
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-sm font-medium text-white mb-3">Legal</h3>
            <ul className="space-y-2 text-sm text-cream-200/60">
              <li>
                <Link href="/terms" className="hover:text-white transition-colors">
                  Terms
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-white transition-colors">
                  Privacy
                </Link>
              </li>
              <li>
                <Link href="/cancellation-policy" className="hover:text-white transition-colors">
                  Cancellation
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 mt-8 border-t border-forest-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-cream-200/40">
            © {new Date().getFullYear()} Book A Chef Kenya
          </p>
          <a
            href="https://wa.me/254786530713"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-cream-200/40 hover:text-cream-200 transition-colors"
          >
            Concierge: +254 786 530 713
          </a>
        </div>
      </div>
    </footer>
  );
}