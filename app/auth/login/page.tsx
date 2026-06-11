"use client";

import { Suspense } from "react";
import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Show error from proxy redirect (e.g. unauthorized account)
    if (searchParams.get("error") === "unauthorized") {
      setError("Access denied. This portal is private.");
    }
  }, [searchParams]);

  useEffect(() => {
    let isMounted = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (isMounted && session) {
        router.replace("/portal");
      }
    });
    return () => { isMounted = false; };
  }, [router]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn(email, password);

    if (!result.success) {
      setError("Invalid email or password.");
      setLoading(false);
      return;
    }

    router.push("/portal");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(244,213,138,0.08),transparent_44%,rgba(255,255,255,0.03))]" />

      <div className="relative w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-black border border-amber-300/25 mb-5 overflow-hidden">
            <Image
              src="/groenics-logo.jpeg"
              alt="Groenics"
              width={64}
              height={64}
              className="h-full w-full object-cover"
              priority
            />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Portal Access</h1>
          <p className="text-gray-500 text-sm">Groenics - Internal System</p>
        </div>

        {/* Card */}
        <div className="p-px rounded-2xl bg-linear-to-br from-amber-300/20 via-transparent to-white/5">
          <div className="rounded-2xl brand-panel p-8">

            {error && (
              <div className="mb-5 p-3 bg-red-500/10 border border-red-500/25 rounded-lg text-red-300 text-sm flex items-center gap-2">
                <span>⚠️</span>
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-widest mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  autoComplete="email"
                  className="w-full px-4 py-3 bg-black/25 border border-amber-300/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-amber-300/50 focus:bg-amber-300/5 transition-all text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-widest mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full px-4 py-3 bg-black/25 border border-amber-300/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-amber-300/50 focus:bg-amber-300/5 transition-all text-sm"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-amber-300 hover:bg-amber-200 disabled:bg-amber-300/40 disabled:cursor-not-allowed text-black font-bold rounded-xl transition-all duration-200 mt-2 text-sm shadow-lg shadow-amber-900/20"
              >
                {loading ? "Signing in…" : "Sign In"}
              </button>
            </form>
          </div>
        </div>

        <p className="text-center text-gray-700 text-xs mt-8">
          Private system — authorised access only.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#050505] flex items-center justify-center px-4">
          <div className="text-sm text-gray-500">Loading...</div>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
