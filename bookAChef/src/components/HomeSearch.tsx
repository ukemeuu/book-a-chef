'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, MapPin, Calendar, Users } from 'lucide-react'

export default function HomeSearch() {
    const [location, setLocation] = useState('')
    const router = useRouter()

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        const params = new URLSearchParams()
        if (location) params.set('location', location)
        router.push(`/chefs?${params.toString()}`)
    }

    return (
        <form 
            onSubmit={handleSearch}
            className="mx-auto mt-16 max-w-4xl rounded-3xl bg-white p-3 shadow-2xl shadow-gray-200/60 flex flex-col md:flex-row items-center gap-2 border border-gray-100"
        >
            <div className="flex flex-1 items-center gap-4 px-6 py-4 rounded-2xl hover:bg-gray-50 transition-colors group">
                <MapPin className="h-6 w-6 text-orange-600 transition-transform group-hover:scale-110" />
                <div className="text-left">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Location</p>
                    <input 
                        type="text" 
                        placeholder="Where in Nairobi?" 
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="w-full bg-transparent text-sm font-bold text-gray-900 outline-none placeholder:text-gray-300" 
                    />
                </div>
            </div>
            <div className="hidden md:block h-10 w-px bg-gray-100" />
            <div className="flex flex-1 items-center gap-4 px-6 py-4 rounded-2xl hover:bg-gray-50 transition-colors group">
                <Calendar className="h-6 w-6 text-orange-600 transition-transform group-hover:scale-110" />
                <div className="text-left">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Add Date</p>
                    <input type="text" placeholder="Select a date" className="w-full bg-transparent text-sm font-bold text-gray-900 outline-none placeholder:text-gray-300" />
                </div>
            </div>
            <div className="hidden md:block h-10 w-px bg-gray-100" />
            <div className="flex flex-1 items-center gap-4 px-6 py-4 rounded-2xl hover:bg-gray-50 transition-colors group">
                <Users className="h-6 w-6 text-orange-600 transition-transform group-hover:scale-110" />
                <div className="text-left">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Guests</p>
                    <input type="text" placeholder="How many?" className="w-full bg-transparent text-sm font-bold text-gray-900 outline-none placeholder:text-gray-300" />
                </div>
            </div>
            <button 
                type="submit"
                className="w-full md:w-auto rounded-2xl bg-orange-600 px-8 py-5 text-white transition-all hover:bg-orange-700 shadow-xl shadow-orange-600/30 flex justify-center items-center active:scale-95"
            >
                <Search className="h-6 w-6 stroke-[3px]" />
            </button>
        </form>
    )
}
