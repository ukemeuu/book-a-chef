'use client'

import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Calendar, MessageSquare, Heart, Settings, User, Loader2 } from 'lucide-react'

export default function CustomerDashboard() {
    const router = useRouter()
    const [user, setUser] = useState<any>(null)
    const [profile, setProfile] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/login')
                return
            }
            setUser(user)

            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single()
            setProfile(profile)
            setLoading(false)
        }
        checkUser()
    }, [router, supabase])

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Loader2 className="h-10 w-10 text-orange-600 animate-spin" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-gray-100 hidden md:flex flex-col">
                <div className="p-8">
                    <div className="text-2xl font-extrabold tracking-tight text-gray-900 text-center">
                        Book A <span className="text-orange-600 italic">Chef</span>
                    </div>
                </div>
                <nav className="flex-1 px-4 space-y-2 mt-8">
                    <Link href="/dashboard" className="flex items-center gap-3 px-4 py-3 bg-orange-50 text-orange-600 rounded-2xl font-bold">
                        <Calendar className="h-5 w-5" /> My Bookings
                    </Link>
                    <Link href="#" className="flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-gray-900 rounded-2xl font-bold transition-colors">
                        <MessageSquare className="h-5 w-5" /> Messages
                    </Link>
                    <Link href="#" className="flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-gray-900 rounded-2xl font-bold transition-colors">
                        <Heart className="h-5 w-5" /> Favorites
                    </Link>
                    <Link href="#" className="flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-gray-900 rounded-2xl font-bold transition-colors">
                        <Settings className="h-5 w-5" /> Settings
                    </Link>
                </nav>
                <div className="p-4 border-t border-gray-50">
                    <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-gray-50">
                        <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-black">
                            {profile?.first_name?.[0] || user?.email?.[0].toUpperCase()}
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <p className="text-sm font-bold text-gray-900 truncate">{profile?.first_name} {profile?.last_name}</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Customer</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-4 md:p-12 overflow-y-auto">
                <header className="mb-12">
                    <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Welcome back, {profile?.first_name || 'Foodie'}!</h1>
                    <p className="text-gray-500 mt-2 font-medium">Manage your private chef experiences and upcoming dinners.</p>
                </header>

                <div className="grid gap-8 lg:grid-cols-2">
                    {/* Booking Card Placeholder */}
                    <div className="bg-white rounded-3xl p-10 border border-gray-100 shadow-sm col-span-2 text-center py-24">
                        <div className="mx-auto h-20 w-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                            <Calendar className="h-10 w-10 text-gray-200" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900">No upcoming bookings</h3>
                        <p className="text-gray-500 mt-2 max-w-xs mx-auto">You haven't booked any chefs yet. Start exploring Kenya's best culinary talent.</p>
                        <Link href="/" className="mt-8 inline-block bg-orange-600 text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-orange-600/20 hover:bg-orange-700 transition-all active:scale-95">
                            Find a Chef
                        </Link>
                    </div>
                </div>
            </main>
        </div>
    )
}
