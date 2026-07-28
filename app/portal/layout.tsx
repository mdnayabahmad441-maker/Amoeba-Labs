import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import PortalLayout from "@/components/PortalLayout";
import { PORTAL_ALLOWED_EMAIL } from "@/lib/auth-config";

export const metadata = {
  title: "Groenics Portal",
  description: "Operating system for business execution and growth",
};

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    redirect("/auth/login");
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {
        // Session refresh cookies are handled in proxy.ts before the layout renders.
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  if (user.email?.toLowerCase() !== PORTAL_ALLOWED_EMAIL.toLowerCase()) {
    redirect("/auth/login?error=unauthorized");
  }

  const currentDateLabel = new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(new Date());

  return <PortalLayout userEmail={user.email || PORTAL_ALLOWED_EMAIL} currentDateLabel={currentDateLabel}>{children}</PortalLayout>;
}
