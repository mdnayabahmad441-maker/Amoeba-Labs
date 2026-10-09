"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { updatePassword } from "@/lib/auth";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const result = await updatePassword(password);
      if (!result.success) {
        setError(result.error || "Unable to update password. Your reset link may have expired.");
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.replace("/portal/today");
      }, 2000);
    } catch {
      setError("An unexpected error occurred while resetting your password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(244,213,138,0.08),transparent_44%,rgba(255,255,255,0.03))]" />

      <div className="relative w-full max-w-sm">
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
          <h1 className="text-3xl font-bold text-white mb-2">Set New Password</h1>
          <p className="text-gray-500 text-sm">Groenics - Portal Security</p>
        </div>

        <div className="p-px rounded-2xl bg-linear-to-br from-amber-300/20 via-transparent to-white/5">
          <div className="rounded-2xl brand-panel p-8">
            {error && (
              <div className="mb-5 p-3 bg-red-500/10 border border-red-500/25 rounded-lg text-red-300 text-sm flex items-center gap-2">
                <span>⚠️</span>
                {error}
              </div>
            )}

            {success ? (
              <div className="text-center space-y-4">
                <div className="p-3 bg-green-500/10 border border-green-500/25 rounded-lg text-green-300 text-sm">
                  Password updated successfully! Redirecting to portal...
                </div>
                <Link
                  href="/auth/login"
                  className="inline-block text-xs font-semibold text-amber-300 hover:text-amber-200"
                >
                  Return to sign in
                </Link>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-widest mb-2">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className="w-full px-4 py-3 bg-black/25 border border-amber-300/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-amber-300/50 focus:bg-amber-300/5 transition-all text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-widest mb-2">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className="w-full px-4 py-3 bg-black/25 border border-amber-300/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-amber-300/50 focus:bg-amber-300/5 transition-all text-sm"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-amber-300 hover:bg-amber-200 disabled:bg-amber-300/40 disabled:cursor-not-allowed text-black font-bold rounded-xl transition-all duration-200 mt-2 text-sm shadow-lg shadow-amber-900/20"
                >
                  {loading ? "Updating…" : "Update Password"}
                </button>
              </form>
            )}
          </div>
        </div>

        <p className="text-center text-gray-700 text-xs mt-8">
          Private system — authorised access only.
        </p>
      </div>
    </div>
  );
}

