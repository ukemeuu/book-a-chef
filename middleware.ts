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

  // Resolve the caller's role once. Used to route people to the surface that
  // matches who they are, not just to guard the sensitive ones.
  //
  // Returns null when signed out, or when the profile row is missing — the
  // latter happens if sign-up failed to create one, so callers must treat null
  // as "unknown" and NOT assume the most privileged role.
  const getRole = async (): Promise<"client" | "chef" | "admin" | null> => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const role = profile?.role;
    return role === "admin" || role === "chef" || role === "client" ? role : null;
  };

  // Where a user of a given role belongs by default.
  const homeFor = (role: "client" | "chef" | "admin" | null) =>
    role === "admin" ? "/admin" : role === "chef" ? "/chef-dashboard" : "/dashboard";

  // 1. Admin route protection
  if (pathname.startsWith("/admin")) {
    if (!user) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("role", "admin");
      loginUrl.searchParams.set("message", "Admin authentication required.");
      return NextResponse.redirect(loginUrl);
    }

    const role = await getRole();
    if (role !== "admin") {
      // Send them to their OWN surface, not to a customer dashboard they
      // cannot use. Preserve the error so the page can explain the refusal.
      const dest = new URL(homeFor(role), request.url);
      dest.searchParams.set("error", "unauthorized");
      return NextResponse.redirect(dest);
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
    // Admins belong in the dispatch console. Without this an admin could sit in
    // the chef portal seeing an empty board and think they had no jobs.
    const role = await getRole();
    if (role === "admin") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return response;
  }

  // 3. Client Dashboard route protection
  //
  // Access control alone was not enough: /dashboard only ever checked that a
  // session existed, so an admin landing here by bookmark, by the "My bookings"
  // footer link, or via the sign-up fallback stayed on a customer screen
  // showing "No bookings yet" with no obvious way onward.
  if (pathname.startsWith("/dashboard")) {
    if (!user) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("role", "client");
      loginUrl.searchParams.set("message", "Please sign in to view your dining reservations.");
      return NextResponse.redirect(loginUrl);
    }
    const role = await getRole();
    if (role === "admin" || role === "chef") {
      return NextResponse.redirect(new URL(homeFor(role), request.url));
    }
    return response;
  }

  // 4. Login route (if already signed in)
  if (pathname === "/login" && user) {
    const role = await getRole();
    return NextResponse.redirect(new URL(homeFor(role), request.url));
  }

  return response;
}

// Strictly run ONLY on protected dashboard & login routes — do NOT intercept public pages (/, /chefs, /apply, etc.)
export const config = {
  matcher: ["/admin/:path*", "/chef-dashboard/:path*", "/dashboard/:path*", "/login"],
};
