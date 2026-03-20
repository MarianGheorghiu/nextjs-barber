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
      email.trim().toLowerCase(),
      {
        // Aici va veni user-ul după ce dă click pe link-ul din email
        redirectTo: `${window.location.origin}/reset-password`,
      },
    );

    if (resetError) {
      setError(
        "A apărut o eroare. Verifică adresa de email și încearcă din nou.",
      );
    } else {
      setSuccess(true);
    }

    setLoading(false);
  };

  return (
    <MainContainer>
      <div className="flex-1 flex flex-col justify-center items-center min-h-[90vh] py-12 px-4 relative z-10">
        {/* Glow de fundal */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl h-[80%] bg-cyan-500/10 blur-[100px] -z-10 rounded-full pointer-events-none"></div>

        <div className="w-full max-w-md bg-white/5 backdrop-blur-2xl border border-white/20 p-8 sm:p-10 rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black text-white mb-2 tracking-tight">
              Recuperare Parolă
            </h1>
            <p className="text-slate-300 font-medium text-sm">
              Introdu emailul contului tău pentru a primi linkul de resetare.
            </p>
          </div>

          {error && (
            <div className="mb-8 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm text-center animate-fade-in flex items-center justify-center gap-2 font-bold shadow-lg">
              <svg
                className="w-5 h-5 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="3"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              {error}
            </div>
          )}

          {success ? (
            <div className="text-center py-6 animate-fade-in">
              <div className="w-20 h-20 bg-cyan-500/20 text-cyan-400 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-cyan-500/50 shadow-[0_0_30px_rgba(34,211,238,0.3)]">
                <svg
                  className="w-10 h-10"
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
              <h3 className="text-2xl font-black text-white mb-3">
                Email Trimis!
              </h3>
              <p className="text-slate-300 mb-10 text-sm">
                Verifică-ți căsuța de email. Vei găsi un link magic pentru a-ți
                schimba parola.
              </p>
              <Link
                href="/login"
                className="w-full text-center block px-8 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 hover:border-white/30 transition-all shadow-sm"
              >
                Întoarce-te la Logare
              </Link>
            </div>
          ) : (
            <form
              onSubmit={handleResetPassword}
              className="flex flex-col gap-6 animate-fade-in"
            >
              <div className="relative group">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-widest mb-2 ml-1">
                  Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-cyan-400 transition-colors">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
                      />
                    </svg>
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nume@exemplu.ro"
                    className="w-full bg-white/10 focus:bg-white/15 backdrop-blur-md border border-white/20 focus:border-cyan-400 rounded-2xl pl-11 pr-4 py-4 text-white placeholder:text-slate-400 outline-none transition-all shadow-inner focus:shadow-[0_0_20px_rgba(34,211,238,0.15)] font-medium text-base"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 bg-cyan-500 hover:bg-cyan-400 text-[#000428] font-black text-lg py-4 rounded-2xl transition-all shadow-[0_0_20px_rgba(34,211,238,0.3)] hover:shadow-[0_0_30px_rgba(34,211,238,0.5)] disabled:opacity-50 cursor-pointer flex justify-center items-center gap-2 hover:scale-[1.02]"
              >
                {loading ? (
                  <span className="w-6 h-6 border-4 border-[#000428] border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  "Trimite Link"
                )}
              </button>
            </form>
          )}

          {!success && (
            <div className="mt-8 pt-6 border-t border-white/10 flex flex-col gap-4">
              <Link
                href="/login"
                className="w-full text-center py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-bold text-sm hover:bg-white/10 hover:border-white/30 transition-all cursor-pointer shadow-sm"
              >
                Mi-am amintit parola!
              </Link>
            </div>
          )}
        </div>
      </div>
    </MainContainer>
  );
}
