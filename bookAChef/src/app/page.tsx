import Image from "next/image";
import Link from "next/link";
import ChefCard from "@/components/ChefCard";
import HomeSearch from "@/components/HomeSearch";
import chefsData from "@/data/chefs.json";
import { ChevronRight, Play, Utensils, Shield, Clock, Sparkles } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 z-50 flex w-full items-center justify-between bg-white/80 px-6 py-4 backdrop-blur-md md:px-12 border-b border-gray-100">
        <div className="text-2xl font-extrabold tracking-tight text-gray-900">
          Book A <span className="text-orange-600 italic">Chef</span>
        </div>
        <div className="hidden items-center gap-8 font-medium text-gray-600 md:flex">
          <Link href="#cuisines" className="hover:text-gray-900 transition-colors">Cuisines</Link>
          <Link href="#how-it-works" className="hover:text-gray-900 transition-colors">How it Works</Link>
          <Link href="/apply" className="hover:text-gray-900 font-bold text-orange-600">For Chefs</Link>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="hidden text-sm font-semibold text-gray-600 hover:text-gray-900 sm:block">Log In</Link>
          <Link href="/apply" className="rounded-full bg-orange-600 px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-orange-700 shadow-lg shadow-orange-600/20 active:scale-95">
            Book a Chef
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative px-4 pb-24 pt-32 md:px-12 md:pt-40 lg:pt-48 bg-white overflow-hidden">
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-[20%] -right-[10%] h-[600px] w-[600px] rounded-full bg-orange-50 blur-[120px] opacity-70"></div>
          <div className="absolute top-[40%] -left-[5%] h-[400px] w-[400px] rounded-full bg-orange-50/50 blur-[100px] opacity-40"></div>
        </div>

        <div className="relative z-10 mx-auto max-w-6xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-orange-50 px-4 py-2 text-xs font-bold uppercase tracking-widest text-orange-600">
            <span className="h-2 w-2 rounded-full bg-orange-600 animate-pulse" /> The #1 Private Chef Marketplace in Kenya
          </div>
          <h1 className="text-6xl font-extrabold tracking-tight text-gray-900 sm:text-7xl lg:text-8xl leading-[1.1]">
            Bring Kenya’s Best Chefs <br className="hidden sm:block" />
            <span className="text-orange-600 italic underline decoration-orange-100 decoration-8 underline-offset-8">to Your Table</span>
          </h1>
          <p className="mx-auto mt-10 max-w-2xl text-lg text-gray-600 sm:text-2xl font-medium leading-relaxed">
            From intimate dinners in Kilimani to holiday feasts in Diani. Book vetted private chefs to curate, cook, and clean.
          </p>

          <HomeSearch />
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className="mx-auto max-w-7xl px-4 py-32 md:px-12 scroll-mt-20">
        <div className="text-center mb-20">
          <h2 className="text-5xl font-extrabold tracking-tight text-gray-900">The Ultimate Dining Experience</h2>
          <p className="mt-6 text-xl text-gray-600 max-w-2xl mx-auto font-medium">Four simple steps to enjoying a high-end restaurant experience in the comfort of your home.</p>
        </div>

        <div className="grid gap-12 md:grid-cols-4">
          {[
            { step: '01', title: 'Find Your Chef', desc: 'Browse our curated selection of vetted elite chefs across Kenya.', icon: <Utensils className="h-8 w-8 text-orange-600" /> },
            { step: '02', title: 'Pick a Menu', desc: 'Choose from signature menus or request a bespoke culinary creation.', icon: <Shield className="h-8 w-8 text-orange-600" /> },
            { step: '03', title: 'Secure Booking', desc: 'Pay a small 15% deposit via M-Pesa to lock in your date.', icon: <Clock className="h-8 w-8 text-orange-600" /> },
            { step: '04', title: 'Enjoy the Feast', desc: 'The chef buys ingredients, cooks, serves, and leaves your kitchen spotless.', icon: <Sparkles className="h-8 w-8 text-orange-600" /> },
          ].map((item, i) => (
            <div key={i} className="group flex flex-col items-center text-center">
              <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-[28px] bg-gray-50 group-hover:bg-orange-600 group-hover:rotate-6 transition-all duration-500 group-hover:shadow-2xl group-hover:shadow-orange-600/20">
                <div className="group-hover:text-white transition-colors duration-500">
                  {item.icon}
                </div>
              </div>
              <p className="text-[10px] font-black text-orange-600 uppercase tracking-[0.2em] mb-3">{item.step}</p>
              <h3 className="text-2xl font-black text-gray-900 tracking-tight mb-3">{item.title}</h3>
              <p className="text-gray-500 text-sm font-medium leading-relaxed px-4">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Chefs Section */}
      <section id="cuisines" className="mx-auto max-w-7xl px-4 py-32 md:px-12 scroll-mt-20">
        <div className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h2 className="text-5xl font-extrabold tracking-tight text-gray-900">Featured Private Chefs</h2>
            <p className="mt-4 text-xl text-gray-600 font-medium">Highly rated culinary experts ready to transform your dining room.</p>
          </div>
          <Link href="/chefs" className="inline-flex items-center gap-2 rounded-2xl bg-gray-900 px-8 py-4 text-sm font-black uppercase tracking-widest text-white transition-all hover:bg-orange-600 shadow-xl shadow-gray-200 active:scale-95">
            View all chefs <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-3">
          {chefsData.map((chef: any) => (
            <ChefCard 
              key={chef.id} 
              chef={{
                id: chef.id,
                first_name: chef.firstName,
                last_name: chef.lastName,
                title: chef.title,
                avatar_url: chef.avatarUrl,
                cover_url: chef.coverUrl,
                rating: chef.rating,
                review_count: chef.reviewCount,
                location: chef.location,
                price_per_guest: chef.pricePerGuest,
                cuisines: chef.cuisines
              }} 
            />
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="mx-auto max-w-7xl px-4 py-24 md:px-12 mb-20">
        <div className="relative overflow-hidden rounded-[48px] bg-gray-900 px-8 py-24 text-center text-white md:px-24">
           <div className="absolute inset-0 bg-gradient-to-br from-orange-600/30 to-transparent pointer-events-none" />
           <h2 className="relative text-4xl md:text-6xl font-black tracking-tight leading-tight">Ready for an unforgettable <br /> dinner party?</h2>
           <p className="relative mt-8 text-xl text-gray-400 max-w-xl mx-auto font-medium">Join 500+ Kenyans who have discovered the luxury of private dining.</p>
           <div className="relative mt-12 flex flex-col sm:flex-row justify-center gap-6">
              <Link href="/chefs" className="rounded-2xl bg-orange-600 px-10 py-5 font-black uppercase tracking-widest text-white shadow-2xl shadow-orange-600/40 hover:bg-orange-700 transition-all active:scale-95">
                Book a Chef
              </Link>
              <Link href="/apply" className="rounded-2xl bg-white/10 px-10 py-5 font-black uppercase tracking-widest text-white border border-white/20 hover:bg-white hover:text-gray-900 transition-all active:scale-95 backdrop-blur-md">
                Chef Application
              </Link>
           </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 py-20 bg-gray-50 border-t border-gray-100 text-center">
        <div className="mb-8 text-2xl font-extrabold tracking-tight text-gray-900">
          Book A <span className="text-orange-600 italic">Chef</span>
        </div>
        <p className="text-gray-400 font-bold uppercase tracking-[0.3em] text-[10px]">© 2026 Book A Chef Intl. Elevating Kenya&apos;s Culinary Landscape.</p>
      </footer>
    </div>
  );
}
