"use client";

import { useState } from "react";
import MainContainer from "@/components/MainContainer";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default function ResetPassword() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Parola trebuie să aibă cel puțin 6 caractere.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Parolele nu coincid!");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    // Supabase a preluat automat token-ul din URL când utilizatorul a dat click pe link-ul din email
    // Deci acum doar îi cerem să îi facă update la parolă
    const { error: updateError } = await supabase.auth.updateUser({
      password: password,
    });

    if (updateError) {
      setError(
        "Link invalid sau expirat. Te rugăm să ceri un nou link de resetare.",
      );
    } else {
      setSuccess(true);
      // Opțional: deloghează-l pentru a-l forța să intre cu noua parolă, sau lasă-l logat
      await supabase.auth.signOut();
    }

    setLoading(false);
  };

  return (
    <MainContainer>
      <div className="flex-1 flex flex-col justify-center items-center min-h-[90vh] py-12 px-4 relative z-10">
        {/* Glow de fundal */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl h-[80%] bg-cyan-500/10 blur-[100px] -z-10 rounded-full pointer-events-none"></div>

        <div className="w-full max-w-md bg-white/5 backdrop-blur-2xl border border-white/20 p-8 sm:p-10 rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500"></div>

          <div className="text-center mb-8">
            <h1 className="text-3xl font-black text-white mb-2 tracking-tight">
              Setare Parolă Nouă
            </h1>
            <p className="text-slate-300 font-medium text-sm">
              Alege o parolă puternică pentru contul tău.
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
              <div className="w-20 h-20 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-green-500/50 shadow-[0_0_30px_rgba(34,197,94,0.4)]">
                <svg
                  className="w-10 h-10"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="3"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-black text-white mb-3">
                Parolă Schimbată!
              </h3>
              <p className="text-slate-300 mb-10 text-sm">
                Totul e gata. Acum te poți autentifica folosind noua parolă.
              </p>
              <Link
                href="/login"
                className="w-full text-center block px-8 py-4 rounded-2xl bg-cyan-500 text-[#000428] font-bold hover:bg-cyan-400 transition-all shadow-[0_0_20px_rgba(34,211,238,0.4)] hover:scale-105"
              >
                Mergi la Logare →
              </Link>
            </div>
          ) : (
            <form
              onSubmit={handleUpdatePassword}
              className="flex flex-col gap-6 animate-fade-in"
            >
              <div className="relative group">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-widest mb-2 ml-1">
                  Parolă Nouă
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
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minim 6 caractere"
                    className="w-full bg-white/10 focus:bg-white/15 backdrop-blur-md border border-white/20 focus:border-cyan-400 rounded-2xl pl-11 pr-12 py-4 text-white placeholder:text-slate-400 outline-none transition-all shadow-inner focus:shadow-[0_0_20px_rgba(34,211,238,0.15)] font-medium text-base"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-4 flex items-center text-slate-400 hover:text-cyan-400 transition-colors cursor-pointer"
                  >
                    {showPassword ? (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="relative group">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-widest mb-2 ml-1">
                  Confirmare
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
                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                      />
                    </svg>
                  </div>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repetă parola"
                    className="w-full bg-white/10 focus:bg-white/15 backdrop-blur-md border border-white/20 focus:border-cyan-400 rounded-2xl pl-11 pr-12 py-4 text-white placeholder:text-slate-400 outline-none transition-all shadow-inner focus:shadow-[0_0_20px_rgba(34,211,238,0.15)] font-medium text-base"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-4 flex items-center text-slate-400 hover:text-cyan-400 transition-colors cursor-pointer"
                  >
                    {showConfirmPassword ? (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                        />
                      </svg>
                    )}
                  </button>
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
                  "Salvează Parola"
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </MainContainer>
  );
}
