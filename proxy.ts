import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const ALLOWED_EMAIL = "mdnayabahmad441@gmail.com";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

  // Allow OAuth callback through
  if (request.nextUrl.pathname === "/auth/callback") {
    return response;
  }

  // Protect /portal — must be logged in AND be the allowed user
  if (request.nextUrl.pathname.startsWith("/portal")) {
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
    (request.nextUrl.pathname === "/auth/login" ||
      request.nextUrl.pathname === "/auth/signup") &&
    user?.email === ALLOWED_EMAIL
  ) {
    return NextResponse.redirect(new URL("/portal", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
};
