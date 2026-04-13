import { searchChefs, ChefFilterState } from '@/app/actions/searchChefs'
import ChefCard from '@/components/ChefCard'
import { Search, MapPin, SlidersHorizontal, ChevronRight } from 'lucide-react'
import Link from 'next/link'

export default async function ChefsPage({
    searchParams,
}: {
    searchParams: { [key: string]: string | string[] | undefined }
}) {
    const filters: ChefFilterState = {
        location: searchParams.location as string || '',
        cuisines: Array.isArray(searchParams.cuisines) ? searchParams.cuisines : (searchParams.cuisines ? [searchParams.cuisines as string] : []),
        minPrice: searchParams.minPrice ? parseInt(searchParams.minPrice as string) : undefined,
        maxPrice: searchParams.maxPrice ? parseInt(searchParams.maxPrice as string) : undefined,
        minRating: 0,
        page: 1,
        limit: 20
    }

    const { chefs, totalCount } = await searchChefs(filters)

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Navigation */}
            <nav className="fixed top-0 z-50 flex w-full items-center justify-between bg-white/80 px-6 py-4 backdrop-blur-md md:px-12 border-b border-gray-100">
                <Link href="/" className="text-2xl font-extrabold tracking-tight text-gray-900">
                    Book A <span className="text-orange-600 italic">Chef</span>
                </Link>
                <div className="flex items-center gap-4">
                    <Link href="/login" className="text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors">Log In</Link>
                    <Link href="/apply" className="rounded-full bg-orange-600 px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-orange-700 shadow-lg shadow-orange-600/20 active:scale-95">
                        Become a Chef
                    </Link>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-6 pt-32">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                    <div>
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-orange-600 mb-2">
                           <MapPin className="h-3 w-3" /> {filters.location || 'All Locations'}
                        </div>
                        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
                            {totalCount} {totalCount === 1 ? 'Chef' : 'Chefs'} found in {filters.location || 'Kenya'}
                        </h1>
                    </div>
                    
                    <button className="flex items-center gap-2 bg-white px-6 py-3 rounded-2xl border border-gray-100 shadow-sm font-bold text-gray-600 hover:text-gray-900 transition-colors">
                        <SlidersHorizontal className="h-4 w-4" /> Filters
                    </button>
                </div>

                {chefs.length > 0 ? (
                    <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                        {chefs.map((chef) => (
                            <ChefCard 
                                key={chef.id} 
                                chef={{
                                    id: chef.id,
                                    first_name: chef.first_name,
                                    last_name: chef.last_name,
                                    title: chef.brand_name || 'Expert Chef',
                                    avatar_url: chef.avatar_url || 'https://images.unsplash.com/photo-1577219491135-ce391730fbaf?auto=format&fit=crop&w=200&h=200',
                                    cover_url: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&q=80', // Fallback
                                    rating: Number(chef.rating),
                                    review_count: chef.review_count,
                                    location: chef.city,
                                    price_per_guest: chef.menus?.[0]?.price_per_person ? Number(chef.menus[0].price_per_person) : 0,
                                    cuisines: chef.cuisines
                                }} 
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-32 bg-white rounded-[40px] border border-gray-100">
                        <div className="mx-auto h-24 w-24 bg-gray-50 rounded-full flex items-center justify-center mb-8">
                            <Search className="h-12 w-12 text-gray-200" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900">No chefs matching your criteria</h2>
                        <p className="text-gray-500 mt-4 max-w-sm mx-auto font-medium">Try broadening your search or exploring different cuisines.</p>
                        <Link href="/" className="mt-8 inline-block text-orange-600 font-bold hover:underline">
                            Return to homepage
                        </Link>
                    </div>
                )}
            </main>
        </div>
    )
}
