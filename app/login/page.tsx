"use client";

import { useState } from "react";
import MainContainer from "@/components/MainContainer";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default function Login() {
  const router = useRouter();

  // State for form inputs
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // State for UI feedback
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Handle standard Email/Password Login
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (signInError) {
      setError("Email sau parolă incorectă."); // Custom UI message in Romanian
      setLoading(false);
    } else {
      // Success! Redirect to the client dashboard
      router.push("/client");
      router.refresh(); // Refresh to update navbar state (logged in vs out)
    }
  };

  return (
    <MainContainer>
      <div className="flex-1 flex flex-col justify-center items-center min-h-[90vh] py-12">
        {/* Logo */}
        <Link
          href="/"
          className="mb-8 text-3xl font-extrabold tracking-wider text-white hover:scale-105 transition-transform"
        >
          Barber<span className="text-cyan-400">App</span>
        </Link>

        {/* Liquid Glass Card */}
        <div className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 p-8 sm:p-10 rounded-[2.5rem] shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">
              Bine ai revenit
            </h1>
            <p className="text-slate-300 font-light">
              Loghează-te pentru a te programa.
            </p>
          </div>

          {/* Error Message Display */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/50 text-red-200 text-sm text-center">
              {error}
            </div>
          )}

          {/* Email / Password Form */}
          <form onSubmit={handleSignIn} className="flex flex-col gap-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2 ml-1">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nume@exemplu.ro"
                className="w-full bg-white/5 border border-white/10 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 rounded-2xl px-5 py-3.5 text-white placeholder:text-slate-500 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2 ml-1">
                Parolă
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white/5 border border-white/10 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 rounded-2xl px-5 py-3.5 text-white placeholder:text-slate-500 outline-none transition-all"
              />
              <div className="flex justify-end mt-2">
                <Link
                  href="#"
                  className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  Ai uitat parola?
                </Link>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-cyan-500 hover:bg-cyan-400 text-[#000428] font-bold text-lg py-4 rounded-2xl transition-all shadow-[0_0_20px_rgba(34,211,238,0.2)] hover:shadow-[0_0_30px_rgba(34,211,238,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Se încarcă..." : "Intră în cont"}
            </button>
          </form>

          <p className="text-center text-slate-400 text-sm mt-8">
            Nu ai cont încă?{" "}
            <Link
              href="/register"
              className="text-cyan-400 font-bold hover:underline"
            >
              Creează unul
            </Link>
          </p>
        </div>
      </div>
    </MainContainer>
  );
}
