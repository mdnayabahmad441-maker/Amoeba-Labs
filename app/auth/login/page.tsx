"use client";

import { Suspense } from "react";
import { useEffect, useState } from "react";
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
    <div className="min-h-screen bg-[#071A35] flex items-center justify-center px-4">
      {/* Background glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(0,229,255,0.07),transparent)]" />

      <div className="relative w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 mb-5 text-2xl">
            🔐
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Portal Access</h1>
          <p className="text-gray-500 text-sm">Amoeba Labs — Internal System</p>
        </div>

        {/* Card */}
        <div className="p-px rounded-2xl bg-linear-to-br from-white/10 via-transparent to-cyan-500/10">
          <div className="rounded-2xl bg-[#071a35] p-8">

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
                  className="w-full px-4 py-3 bg-white/4 border border-white/8 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/50 focus:bg-white/6 transition-all text-sm"
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
                  className="w-full px-4 py-3 bg-white/4 border border-white/8 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/50 focus:bg-white/6 transition-all text-sm"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 disabled:bg-cyan-500/40 disabled:cursor-not-allowed text-black font-bold rounded-xl transition-all duration-200 mt-2 text-sm shadow-lg shadow-cyan-500/20"
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
        <div className="min-h-screen bg-[#071A35] flex items-center justify-center px-4">
          <div className="text-sm text-gray-500">Loading...</div>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
