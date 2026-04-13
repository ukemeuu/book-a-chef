'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
    ChevronLeft, 
    ChefHat, 
    MapPin, 
    CheckCircle2, 
    Info, 
    Upload, 
    Utensils, 
    Check,
    ArrowRight,
    Loader2
} from 'lucide-react'

const CUISINES = [
    'Swahili', 'Coastal', 'Continental', 'Italian', 'Indian', 
    'Pan-African', 'Nyama Choma', 'BBQ', 'Vegan', 'Vegetarian',
    'French', 'Japanese', 'Chinese', 'Middle Eastern'
]

const DIETARY = [
    'Halal', 'Vegan', 'Vegetarian', 'Gluten-Free', 'Nut-Free', 'Dairy-Free'
]

export default function ChefApplyPage() {
    const [step, setStep] = useState(1)
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        brandName: '',
        city: 'Nairobi',
        neighborhood: '',
        bio: '',
        cuisines: [] as string[],
        dietary: [] as string[],
        travelRadius: 10,
    })

    const handleCuisineToggle = (cuisine: string) => {
        setFormData(prev => ({
            ...prev,
            cuisines: prev.cuisines.includes(cuisine) 
                ? prev.cuisines.filter(c => c !== cuisine)
                : [...prev.cuisines, cuisine]
        }))
    }

    const handleDietaryToggle = (item: string) => {
        setFormData(prev => ({
            ...prev,
            dietary: prev.dietary.includes(item) 
                ? prev.dietary.filter(d => d !== item)
                : [...prev.dietary, item]
        }))
    }

    const nextStep = () => setStep(prev => prev + 1)
    const prevStep = () => setStep(prev => prev - 1)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        
        // Mocking the creation for now - in reality this would call a server action
        setTimeout(() => {
            setIsLoading(false)
            router.push('/chef-dashboard')
        }, 2000)
    }

    return (
        <div className="min-h-screen bg-white font-sans selection:bg-orange-100">
            {/* Header */}
            <header className="fixed top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <Link href="/" className="text-2xl font-extrabold tracking-tight text-gray-900">
                        Book A <span className="text-orange-600 italic">Chef</span>
                    </Link>
                    <div className="flex items-center gap-4">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Step {step} of 3</span>
                        <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-orange-600 transition-all duration-500 ease-out" 
                                style={{ width: `${(step / 3) * 100}%` }}
                            />
                        </div>
                    </div>
                </div>
            </header>

            <main className="pt-32 pb-20 px-6">
                <div className="max-w-2xl mx-auto">
                    {step === 1 && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight leading-tight">
                                Let's build your <br />
                                <span className="text-orange-600 italic">chef profile.</span>
                            </h1>
                            <p className="mt-4 text-lg text-gray-600 font-medium">Start by telling us who you are and where you're based.</p>

                            <div className="mt-12 space-y-8">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-widest text-gray-400">First Name</label>
                                        <input 
                                            type="text" 
                                            placeholder="John"
                                            className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 font-bold text-gray-900 focus:ring-2 focus:ring-orange-600/20 transition-all outline-none"
                                            value={formData.firstName}
                                            onChange={e => setFormData({...formData, firstName: e.target.value})}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Last Name</label>
                                        <input 
                                            type="text" 
                                            placeholder="Doe"
                                            className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 font-bold text-gray-900 focus:ring-2 focus:ring-orange-600/20 transition-all outline-none"
                                            value={formData.lastName}
                                            onChange={e => setFormData({...formData, lastName: e.target.value})}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Email Address</label>
                                    <input 
                                        type="email" 
                                        placeholder="chef@example.com"
                                        className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 font-bold text-gray-900 focus:ring-2 focus:ring-orange-600/20 transition-all outline-none"
                                        value={formData.email}
                                        onChange={e => setFormData({...formData, email: e.target.value})}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Professional Brand Name (Optional)</label>
                                    <input 
                                        type="text" 
                                        placeholder="e.g. Taste of the Coast"
                                        className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 font-bold text-gray-900 focus:ring-2 focus:ring-orange-600/20 transition-all outline-none"
                                        value={formData.brandName}
                                        onChange={e => setFormData({...formData, brandName: e.target.value})}
                                    />
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">This will be displayed on your profile card.</p>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-widest text-gray-400">City</label>
                                        <select 
                                            className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 font-bold text-gray-900 focus:ring-2 focus:ring-orange-600/20 transition-all outline-none appearance-none"
                                            value={formData.city}
                                            onChange={e => setFormData({...formData, city: e.target.value})}
                                        >
                                            <option>Nairobi</option>
                                            <option>Mombasa</option>
                                            <option>Kisumu</option>
                                            <option>Nakuru</option>
                                            <option>Naivasha</option>
                                            <option>Diani</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Neighborhood</label>
                                        <input 
                                            type="text" 
                                            placeholder="e.g. Kilimani"
                                            className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 font-bold text-gray-900 focus:ring-2 focus:ring-orange-600/20 transition-all outline-none"
                                            value={formData.neighborhood}
                                            onChange={e => setFormData({...formData, neighborhood: e.target.value})}
                                        />
                                    </div>
                                </div>

                                <button 
                                    onClick={nextStep}
                                    className="w-full group bg-gray-900 text-white py-6 rounded-2xl font-black shadow-xl hover:bg-black transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                                >
                                    Continue to Cuisines <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                            <button onClick={prevStep} className="mb-8 flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-gray-900 transition-colors">
                                <ChevronLeft className="h-4 w-4" /> Back to basics
                            </button>
                            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight leading-tight">
                                What's your <br />
                                <span className="text-orange-600 italic">Signature Style?</span>
                            </h1>
                            <p className="mt-4 text-lg text-gray-600 font-medium">Select the cuisines and dietary specialties you excel in.</p>

                            <div className="mt-12 space-y-12">
                                <div className="space-y-4">
                                    <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Cuisine Types</label>
                                    <div className="flex flex-wrap gap-3">
                                        {CUISINES.map(cuisine => (
                                            <button 
                                                key={cuisine}
                                                onClick={() => handleCuisineToggle(cuisine)}
                                                className={`px-6 py-3 rounded-full text-sm font-bold transition-all ${
                                                    formData.cuisines.includes(cuisine)
                                                    ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20 scale-105'
                                                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                                                }`}
                                            >
                                                {cuisine}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Dietary Expertise</label>
                                    <div className="flex flex-wrap gap-3">
                                        {DIETARY.map(item => (
                                            <button 
                                                key={item}
                                                onClick={() => handleDietaryToggle(item)}
                                                className={`px-6 py-3 rounded-full text-sm font-bold transition-all ${
                                                    formData.dietary.includes(item)
                                                    ? 'bg-gray-900 text-white shadow-lg scale-105'
                                                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                                                }`}
                                            >
                                                {formData.dietary.includes(item) && <Check className="h-4 w-4 inline mr-2" />}
                                                {item}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <button 
                                    onClick={nextStep}
                                    className="w-full group bg-gray-900 text-white py-6 rounded-2xl font-black shadow-xl hover:bg-black transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                                >
                                    Final Details <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                            <button onClick={prevStep} className="mb-8 flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-gray-900 transition-colors">
                                <ChevronLeft className="h-4 w-4" /> Back to cuisines
                            </button>
                            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight leading-tight">
                                The <span className="text-orange-600 italic">Finishing Touches.</span>
                            </h1>
                            <p className="mt-4 text-lg text-gray-600 font-medium">Write a brief bio and set your travel preferences.</p>

                            <div className="mt-12 space-y-12">
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <label className="text-xs font-bold uppercase tracking-widest text-gray-400">About You</label>
                                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{formData.bio.length} / 500</span>
                                    </div>
                                    <textarea 
                                        rows={6}
                                        placeholder="Tell potential clients about your culinary journey, your passion for food, and what they can expect when booking you..."
                                        className="w-full bg-gray-50 border-none rounded-3xl px-8 py-6 font-medium text-gray-900 focus:ring-2 focus:ring-orange-600/20 transition-all outline-none resize-none placeholder:text-gray-300"
                                        value={formData.bio}
                                        onChange={e => setFormData({...formData, bio: e.target.value.slice(0, 500)})}
                                    />
                                </div>

                                <div className="space-y-6">
                                    <div className="flex justify-between items-center">
                                        <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Travel Radius (km)</label>
                                        <span className="bg-orange-50 text-orange-600 px-4 py-1.5 rounded-full text-xs font-black">{formData.travelRadius} km</span>
                                    </div>
                                    <input 
                                        type="range" 
                                        min="2" 
                                        max="100" 
                                        step="1"
                                        className="w-full accent-orange-600 h-2 bg-gray-100 rounded-full appearance-none cursor-pointer"
                                        value={formData.travelRadius}
                                        onChange={e => setFormData({...formData, travelRadius: parseInt(e.target.value)})}
                                    />
                                    <div className="flex justify-between text-[10px] font-bold text-gray-300 uppercase tracking-widest">
                                        <span>Local (2km)</span>
                                        <span>Regional (100km)</span>
                                    </div>
                                </div>

                                <div className="p-8 bg-orange-50 rounded-3xl border border-orange-100">
                                    <div className="flex gap-4">
                                        <div className="h-10 w-10 rounded-2xl bg-orange-600 flex items-center justify-center text-white shrink-0">
                                            <Info className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h4 className="font-black text-gray-900 tracking-tight">Vetting Process</h4>
                                            <p className="text-sm text-gray-600 mt-1 leading-relaxed">By submitting, you agree to undergo our quality vetting process, which includes a background check and a tasting session.</p>
                                        </div>
                                    </div>
                                </div>

                                <button 
                                    onClick={handleSubmit}
                                    disabled={isLoading}
                                    className="w-full bg-orange-600 text-white py-6 rounded-2xl font-black shadow-xl shadow-orange-600/30 hover:bg-orange-700 transition-all active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-70 disabled:pointer-events-none"
                                >
                                    {isLoading ? (
                                        <><Loader2 className="h-5 w-5 animate-spin" /> Submitting Application...</>
                                    ) : (
                                        <>Submit Application <CheckCircle2 className="h-5 w-5" /></>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}
