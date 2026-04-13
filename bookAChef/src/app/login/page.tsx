import { login, signup } from './actions'
import Link from 'next/link'
import { ChevronLeft, Mail, Lock, User } from 'lucide-react'

export default function LoginPage({
    searchParams,
}: {
    searchParams: { message: string }
}) {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
            <div className="absolute top-8 left-8">
                <Link href="/" className="flex items-center text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors">
                    <ChevronLeft className="mr-2 h-4 w-4" /> Back to home
                </Link>
            </div>

            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="flex justify-center">
                    <div className="text-3xl font-extrabold tracking-tight text-gray-900 bg-white px-4 py-2 rounded-2xl shadow-sm border border-gray-100">
                        Book A <span className="text-orange-600 italic">Chef</span>
                    </div>
                </div>
                <h2 className="mt-8 text-center text-3xl font-extrabold text-gray-900 tracking-tight">
                    Welcome back
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600">
                    Connecting you with Kenya's best private chefs
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-10 px-6 shadow-2xl shadow-gray-200/60 rounded-3xl border border-gray-100 sm:px-12">
                    <form className="space-y-6">
                        <div>
                            <label htmlFor="email" className="block text-xs font-bold uppercase tracking-widest text-gray-400">
                                Email Address
                            </label>
                            <div className="mt-2 relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    placeholder="you@example.com"
                                    className="appearance-none block w-full pl-12 pr-4 py-4 border border-gray-200 rounded-2xl bg-gray-50 text-gray-900 font-medium placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-600/20 focus:border-orange-600 transition-all sm:text-sm"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-xs font-bold uppercase tracking-widest text-gray-400">
                                Password
                            </label>
                            <div className="mt-2 relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="current-password"
                                    required
                                    placeholder="••••••••"
                                    className="appearance-none block w-full pl-12 pr-4 py-4 border border-gray-200 rounded-2xl bg-gray-50 text-gray-900 font-medium placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-600/20 focus:border-orange-600 transition-all sm:text-sm"
                                />
                            </div>
                        </div>

                        <div className="pt-2">
                            <button
                                formAction={login}
                                className="w-full flex justify-center py-5 px-4 border border-transparent rounded-2xl shadow-xl shadow-orange-600/20 text-sm font-black text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-all active:scale-[0.98]"
                            >
                                Sign In
                            </button>
                        </div>

                        <div className="relative my-8">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-100"></div>
                            </div>
                            <div className="relative flex justify-center text-xs font-bold uppercase tracking-widest">
                                <span className="px-4 bg-white text-gray-400">Or join as customer</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <input
                                    name="firstName"
                                    type="text"
                                    placeholder="First Name"
                                    className="appearance-none block w-full px-4 py-4 border border-gray-200 rounded-2xl bg-gray-50 text-gray-900 font-medium placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-600/20 focus:border-orange-600 transition-all sm:text-sm"
                                />
                            </div>
                            <div>
                                <input
                                    name="lastName"
                                    type="text"
                                    placeholder="Last Name"
                                    className="appearance-none block w-full px-4 py-4 border border-gray-200 rounded-2xl bg-gray-50 text-gray-900 font-medium placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-600/20 focus:border-orange-600 transition-all sm:text-sm"
                                />
                            </div>
                        </div>

                        <button
                            formAction={signup}
                            className="w-full flex justify-center items-center py-5 px-4 border border-gray-200 rounded-2xl shadow-sm text-sm font-bold text-gray-700 bg-white hover:bg-gray-50 focus:outline-none transition-all active:scale-[0.98]"
                        >
                            <User className="mr-2 h-4 w-4 text-orange-600" /> Create Customer Account
                        </button>
                    </form>

                    {searchParams?.message && (
                        <div className="mt-6 p-4 rounded-2xl bg-red-50 border border-red-100">
                            <p className="text-sm font-medium text-red-600 text-center">
                                {searchParams.message}
                            </p>
                        </div>
                    )}
                </div>

                <div className="mt-10 text-center">
                    <p className="text-sm text-gray-500 font-medium">
                        Are you a chef? <a href="/apply" className="font-bold text-orange-600 hover:text-orange-700 underline group transition-all">
                            Apply to join <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
                        </a>
                    </p>
                </div>
            </div>
        </div>
    )
}
