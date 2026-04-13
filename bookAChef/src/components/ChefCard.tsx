import Image from "next/image";
import Link from "next/link";
import { Star, MapPin, ChefHat, CheckCircle2 } from "lucide-react";

export interface ChefData {
    id: string;
    first_name: string;
    last_name: string;
    title: string;
    avatar_url: string;
    cover_url: string;
    rating: number;
    review_count: number;
    location: string;
    price_per_guest: number;
    cuisines: string[];
}

export default function ChefCard({ chef }: { chef: ChefData }) {
    return (
        <div className="group relative rounded-[32px] border border-gray-100 bg-white p-5 shadow-sm transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-gray-200/50">
            <Link href={`/chef/${chef.id}`} className="absolute inset-0 z-10" aria-label={`View ${chef.first_name}'s profile`} />

            {/* Immersive Cover Image */}
            <div className="relative h-64 w-full overflow-hidden rounded-[24px]">
                <Image
                    src={chef.cover_url}
                    alt={`${chef.title} dish`}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                />
                
                {/* Floating Avatar */}
                <div className="absolute bottom-4 left-4 z-20 h-16 w-16 overflow-hidden rounded-full border-4 border-white bg-white shadow-xl transition-transform duration-500 group-hover:scale-110">
                    <Image src={chef.avatar_url} alt={chef.first_name} fill className="object-cover" />
                </div>

                {/* Status Badge */}
                <div className="absolute left-4 top-4 z-20 flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-orange-600 shadow-xl backdrop-blur-md">
                   <CheckCircle2 className="h-3.5 w-3.5" /> Verified
                </div>

                {/* Rating Badge */}
                <div className="absolute right-4 top-4 z-20 flex items-center gap-1.5 rounded-full bg-gray-900/80 px-3 py-1.5 text-xs font-black text-white shadow-xl backdrop-blur-md border border-white/10">
                    <Star className="h-4 w-4 fill-orange-500 text-orange-500" />
                    {chef.rating.toFixed(1)} <span className="font-bold text-gray-400 opacity-60">({chef.review_count})</span>
                </div>

                {/* Gradient Overlay */}
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent" />
            </div>

            {/* Details */}
            <div className="mt-6 px-1">
                <div className="flex items-start justify-between">
                    <div>
                        <h3 className="text-xl font-black tracking-tight text-gray-900 group-hover:text-orange-600 transition-colors">
                            Chef {chef.first_name} {chef.last_name}
                        </h3>
                        <p className="text-sm font-bold text-orange-600 uppercase tracking-widest mt-0.5">{chef.title}</p>
                    </div>
                </div>

                <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-gray-400 group-hover:text-gray-600 transition-colors">
                    <MapPin className="h-4 w-4 text-orange-600 opacity-70" />
                    <span className="truncate tracking-widest uppercase text-[10px]">{chef.location}</span>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                    {chef.cuisines.slice(0, 3).map((cuisine) => (
                        <span key={cuisine} className="inline-flex items-center gap-1.5 rounded-full bg-gray-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:bg-orange-600 hover:text-white transition-all cursor-default">
                            <ChefHat className="h-3 w-3" />
                            {cuisine}
                        </span>
                    ))}
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-gray-50 pt-6">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Starting At</p>
                        <div className="flex items-baseline gap-1 mt-0.5">
                           <span className="text-xl font-black text-gray-900">KES {chef.price_per_guest.toLocaleString()}</span>
                           <span className="text-xs font-bold text-gray-400">/ guest</span>
                        </div>
                    </div>
                    <button className="rounded-2xl bg-gray-900 px-6 py-3.5 text-[10px] font-black uppercase tracking-[0.2em] text-white shadow-lg transition-all hover:bg-orange-600 active:scale-95 group-hover:px-8">
                        View Menus
                    </button>
                </div>
            </div>
        </div>
    );
}
