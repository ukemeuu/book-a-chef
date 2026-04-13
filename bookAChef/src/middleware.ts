import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value
                },
                set(name: string, value: string, options: CookieOptions) {
                    request.cookies.set({
                        name,
                        value,
                        ...options,
                    })
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    response.cookies.set({
                        name,
                        value,
                        ...options,
                    })
                },
                remove(name: string, options: CookieOptions) {
                    request.cookies.set({
                        name,
                        value: '',
                        ...options,
                    })
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    response.cookies.set({
                        name,
                        value: '',
                        ...options,
                    })
                },
            },
        }
    )

    const {
        data: { user },
    } = await supabase.auth.getUser()

    const currentPath = request.nextUrl.pathname

    // 1. Unauthenticated users trying to access protected routes -> redirect to login
    if (!user && (currentPath.startsWith('/dashboard') || currentPath.startsWith('/chef-dashboard') || currentPath.startsWith('/admin'))) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    // 2. If user is logged in, fetch their role from the profiles table
    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        const userRole = profile?.role || 'customer'

        // 3. Role-Based Redirection Logic (Preventing cross-role access)
        if (currentPath.startsWith('/chef-dashboard') && userRole !== 'chef') {
            const url = request.nextUrl.clone()
            url.pathname = userRole === 'admin' ? '/admin' : '/dashboard'
            return NextResponse.redirect(url)
        }

        if (currentPath.startsWith('/dashboard') && userRole !== 'customer') {
            const url = request.nextUrl.clone()
            url.pathname = userRole === 'chef' ? '/chef-dashboard' : '/admin'
            return NextResponse.redirect(url)
        }

        if (currentPath.startsWith('/admin') && userRole !== 'admin') {
            const url = request.nextUrl.clone()
            url.pathname = userRole === 'chef' ? '/chef-dashboard' : '/dashboard'
            return NextResponse.redirect(url)
        }

        // 4. Authenticated users going to /login -> redirect to their respective dashboard
        if (currentPath === '/login' || currentPath === '/register') {
            const url = request.nextUrl.clone()
            if (userRole === 'chef') url.pathname = '/chef-dashboard'
            else if (userRole === 'admin') url.pathname = '/admin'
            else url.pathname = '/dashboard'
            return NextResponse.redirect(url)
        }
    }

    return response
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * Feel free to modify this pattern to include more paths.
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
