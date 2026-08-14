import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { isPortalAllowedEmail } from "@/lib/auth-config";
import { checkRateLimit, getRequestIp } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const rateLimit = checkRateLimit(`login:${getRequestIp(request)}`, 10, 15 * 60 * 1000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many sign-in attempts. Please try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
      }
    );
  }

  let credentials: { email?: string; password?: string };

  try {
    credentials = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid login request." }, { status: 400 });
  }

  const email = credentials.email?.trim().toLowerCase();
  const password = credentials.password;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required." },
      { status: 400 }
    );
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      { error: "Portal authentication is not configured." },
      { status: 503 }
    );
  }

  const response = NextResponse.json({ success: true, redirectTo: "/portal/today" });
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return [];
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    return NextResponse.json(
      { error: "Invalid email or password." },
      { status: 401 }
    );
  }

  if (!isPortalAllowedEmail(data.user.email)) {
    await supabase.auth.signOut();
    return NextResponse.json(
      { error: "Invalid email or password." },
      { status: 401 }
    );
  }

  return response;
}
