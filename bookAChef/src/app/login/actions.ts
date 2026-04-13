'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
    const supabase = createClient()

    const data = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
    }

    const { error } = await supabase.auth.signInWithPassword(data)

    if (error) {
        redirect('/login?message=Could not authenticate user')
    }

    // Fetch role to determine redirect path
    const { data: userData } = await supabase.auth.getUser()
    if (userData?.user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', userData.user.id)
            .single()

        const role = profile?.role || 'customer'

        if (role === 'chef') redirect('/chef-dashboard')
        if (role === 'admin') redirect('/admin')
        redirect('/dashboard') // customer
    } else {
        revalidatePath('/', 'layout')
        redirect('/')
    }
}

export async function signup(formData: FormData) {
    const supabase = createClient()

    // Use headers to get the origin for redirecting back after confirmation
    const origin = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

    const data = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
        options: {
            data: {
                first_name: formData.get('firstName'),
                last_name: formData.get('lastName'),
            }
        }
    }

    const { error } = await supabase.auth.signUp({
        ...data,
        options: {
            emailRedirectTo: `${origin}/auth/callback`,
        },
    })

    if (error) {
        redirect('/login?message=Could not authenticate user')
    }

    redirect('/login?message=Check email to continue sign in process')
}
