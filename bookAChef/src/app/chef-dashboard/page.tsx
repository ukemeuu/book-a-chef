'use client'

import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ChefHat, Calendar, MessageSquare, Briefcase, Settings, ArrowUpRight, Loader2 } from 'lucide-react'

export default function ChefDashboard() {
    const router = useRouter()
    const [user, setUser] = useState<any>(null)
    const [profile, setProfile] = useState<any>(null)
    const [chef, setChef] = useState<any>(null)
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

            const { data: chef } = await supabase
                .from('chefs')
                .select('*')
                .eq('id', user.id)
                .single()
            setChef(chef)
            
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
                    <Link href="/chef-dashboard" className="flex items-center gap-3 px-4 py-3 bg-orange-600 text-white rounded-2xl font-bold shadow-xl shadow-orange-600/20">
                        <Briefcase className="h-5 w-5" /> Bookings
                    </Link>
                    <Link href="#" className="flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-gray-900 rounded-2xl font-bold transition-colors">
                        <ChefHat className="h-5 w-5" /> My Menus
                    </Link>
                    <Link href="#" className="flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-gray-900 rounded-2xl font-bold transition-colors">
                        <Calendar className="h-5 w-5" /> Availability
                    </Link>
                    <Link href="#" className="flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-gray-900 rounded-2xl font-bold transition-colors">
                        <MessageSquare className="h-5 w-5" /> Chats
                    </Link>
                    <Link href="#" className="flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-gray-900 rounded-2xl font-bold transition-colors mt-auto">
                        <Settings className="h-5 w-5" /> Settings
                    </Link>
                </nav>
                <div className="p-4 border-t border-gray-50">
                    <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-gray-50">
                        <div className="h-10 w-10 rounded-full bg-gray-900 flex items-center justify-center text-white font-black overflow-hidden relative">
                            {chef?.avatar_url ? (
                                <img src={chef.avatar_url} alt="Avatar" className="object-cover h-full w-full" />
                            ) : (
                                profile?.first_name?.[0] || 'C'
                            )}
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <p className="text-sm font-bold text-gray-900 truncate">Chef {profile?.first_name}</p>
                            <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest">Elite Chef</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-4 md:p-12 overflow-y-auto">
                <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Chef Dashboard</h1>
                        <p className="text-gray-500 mt-2 font-medium">Manage your bookings, menus, and client inquiries.</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="bg-white px-6 py-3 rounded-2xl border border-gray-100 shadow-sm">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Earnings this month</p>
                            <p className="text-xl font-black text-gray-900 mt-1">KES 0</p>
                        </div>
                    </div>
                </header>

                <div className="grid gap-8 lg:grid-cols-3">
                    {/* Stats */}
                    <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
                        <h3 className="text-gray-400 text-xs font-bold uppercase tracking-widest">Active Requests</h3>
                        <p className="text-5xl font-black text-gray-900 mt-4">0</p>
                    </div>
                    <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
                        <h3 className="text-gray-400 text-xs font-bold uppercase tracking-widest">Upcoming Dinners</h3>
                        <p className="text-5xl font-black text-gray-900 mt-4">0</p>
                    </div>
                    <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
                        <h3 className="text-gray-400 text-xs font-bold uppercase tracking-widest">Avg. Rating</h3>
                        <p className="text-5xl font-black text-orange-600 mt-4">{chef?.rating || '0.0'}</p>
                    </div>

                    {/* Pending Actions */}
                    <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm lg:col-span-3">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-2xl font-bold text-gray-900">Recent Booking Requests</h2>
                            <Link href="#" className="text-sm font-bold text-orange-600 flex items-center gap-1 hover:underline">
                                View all <ArrowUpRight className="h-4 w-4" />
                            </Link>
                        </div>
                        
                        <div className="text-center py-20 border-2 border-dashed border-gray-100 rounded-3xl">
                            <p className="text-gray-400 font-medium">No new requests yet. Keep your profile updated to attract clients!</p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
