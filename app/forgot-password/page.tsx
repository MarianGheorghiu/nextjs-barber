"use client";

import { useState } from "react";
import MainContainer from "@/components/MainContainer";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: `${window.location.origin}/reset-password`,
      },
    );

    if (resetError) {
      setError(resetError.message);
    } else {
      setSuccess(true);
    }

    setLoading(false);
  };

  return (
    <MainContainer>
      <div className="flex-1 flex flex-col justify-center items-center min-h-[90vh] py-12">
        <div className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 p-8 sm:p-10 rounded-[2.5rem] shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">
              Recuperare Parolă
            </h1>
            <p className="text-slate-300 font-light">
              Introdu emailul pentru a reseta parola.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/50 text-red-200 text-sm text-center">
              {error}
            </div>
          )}

          {success ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-cyan-500/20 text-cyan-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-cyan-500/50 shadow-[0_0_20px_rgba(34,211,238,0.2)]">
                <svg
                  className="w-8 h-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                Email trimis!
              </h3>
              <p className="text-slate-300 mb-6 text-sm">
                Verifică-ți căsuța de email pentru instrucțiunile de resetare.
              </p>
              <Link
                href="/login"
                className="text-cyan-400 font-bold hover:underline"
              >
                Înapoi la Logare
              </Link>
            </div>
          ) : (
            <form
              onSubmit={handleResetPassword}
              className="flex flex-col gap-5"
            >
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

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-4 bg-cyan-500 hover:bg-cyan-400 text-[#000428] font-bold text-lg py-4 rounded-2xl transition-all shadow-[0_0_20px_rgba(34,211,238,0.2)] hover:shadow-[0_0_30px_rgba(34,211,238,0.4)] disabled:opacity-50"
              >
                {loading ? "Se trimite..." : "Trimite Link"}
              </button>
            </form>
          )}

          {!success && (
            <p className="text-center text-slate-400 text-sm mt-8">
              Îți amintești parola?{" "}
              <Link
                href="/login"
                className="text-cyan-400 font-bold hover:underline"
              >
                Loghează-te aici
              </Link>
            </p>
          )}
        </div>
      </div>
    </MainContainer>
  );
}
