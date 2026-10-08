import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mtmxezxpioelurgrujlk.supabase.co";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10bXhlenhwaW9lbHVyZ3J1amxrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1MDE2MTQsImV4cCI6MjA5MjA3NzYxNH0.kIm0WymYZKFxT9wo5Xng3G6Nq5vAxzFhNttrEI5nW3M";

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        request.cookies.set({ name, value, ...options } as any);
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        response.cookies.set({ name, value, ...options } as any);
      },
      remove(name: string, options: CookieOptions) {
        request.cookies.set({ name, value: "", ...options } as any);
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        response.cookies.set({ name, value: "", ...options } as any);
      },
    },
  });

  // Check auth session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 1. Admin route protection
  if (pathname.startsWith("/admin")) {
    if (!user) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("role", "admin");
      loginUrl.searchParams.set("message", "Admin authentication required.");
      return NextResponse.redirect(loginUrl);
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.redirect(new URL("/dashboard?error=unauthorized", request.url));
    }
    return response;
  }

  // 2. Chef Dashboard route protection
  if (pathname.startsWith("/chef-dashboard")) {
    if (!user) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("role", "chef");
      loginUrl.searchParams.set("message", "Chef portal authentication required.");
      return NextResponse.redirect(loginUrl);
    }
    return response;
  }

  // 3. Client Dashboard route protection
  if (pathname.startsWith("/dashboard")) {
    if (!user) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("role", "client");
      loginUrl.searchParams.set("message", "Please sign in to view your dining reservations.");
      return NextResponse.redirect(loginUrl);
    }
    return response;
  }

  // 4. Login route (if already signed in)
  if (pathname === "/login" && user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = profile?.role;
    if (role === "admin") return NextResponse.redirect(new URL("/admin", request.url));
    if (role === "chef") return NextResponse.redirect(new URL("/chef-dashboard", request.url));
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

// Strictly run ONLY on protected dashboard & login routes — do NOT intercept public pages (/, /chefs, /apply, etc.)
export const config = {
  matcher: ["/admin/:path*", "/chef-dashboard/:path*", "/dashboard/:path*", "/login"],
};
