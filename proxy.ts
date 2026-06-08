import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const ALLOWED_EMAIL = "mdnayabahmad441@gmail.com";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const pathname = request.nextUrl.pathname;

  if (!supabaseUrl || !supabaseAnonKey) {
    if (pathname.startsWith("/portal")) {
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }

    return response;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Protect /portal — must be logged in AND be the allowed user
  if (pathname.startsWith("/portal")) {
    if (!user) {
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }
    if (user.email !== ALLOWED_EMAIL) {
      await supabase.auth.signOut();
      return NextResponse.redirect(
        new URL("/auth/login?error=unauthorized", request.url)
      );
    }
  }

  // Redirect to portal if already logged in as the allowed user
  if (
    (pathname === "/auth/login" || pathname === "/auth/signup") &&
    user?.email === ALLOWED_EMAIL
  ) {
    return NextResponse.redirect(new URL("/portal", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/portal/:path*", "/auth/login", "/auth/signup"],
};
