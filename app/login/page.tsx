"use client";

import { useState } from "react";
import MainContainer from "@/components/MainContainer";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default function Login() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();

    // 1. Logăm utilizatorul
    const { data: authData, error: signInError } =
      await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password,
      });

    if (signInError || !authData.user) {
      setError("Email sau parolă incorectă.");
      setLoading(false);
      return;
    }

    // 2. Aflăm ce rol are
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", authData.user.id)
      .single();

    if (profileError) {
      setError("Eroare la preluarea profilului.");
      setLoading(false);
      return;
    }

    const userRole = profile?.role || "client";

    // 3. Redirecționăm inteligent
    if (userRole === "admin") {
      router.push("/admin");
    } else if (userRole === "barber") {
      router.push("/barber");
    } else {
      router.push("/client");
    }

    router.refresh();
  };

  return (
    <MainContainer>
      <div className="flex-1 flex flex-col justify-center items-center min-h-[90vh] py-12 px-4 relative z-10">
        {/* Glow de fundal */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl h-[80%] bg-cyan-500/10 blur-[100px] -z-10 rounded-full pointer-events-none"></div>

        <div className="w-full max-w-md bg-white/5 backdrop-blur-2xl border border-white/20 p-8 sm:p-10 rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black text-white mb-2 tracking-tight">
              Bine ai revenit
            </h1>
            <p className="text-slate-300 font-medium">
              Loghează-te pentru a continua.
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

          <form
            onSubmit={handleSignIn}
            className="flex flex-col gap-6 animate-fade-in"
          >
            {/* Email */}
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

            {/* Parola */}
            <div className="relative group">
              <div className="flex justify-between items-center mb-2 ml-1 mr-1">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-widest">
                  Parolă
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-bold text-cyan-400 hover:text-cyan-300 hover:underline transition-colors"
                >
                  Ai uitat parola?
                </Link>
              </div>
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
                  placeholder="••••••••"
                  className="w-full bg-white/10 focus:bg-white/15 backdrop-blur-md border border-white/20 focus:border-cyan-400 rounded-2xl pl-11 pr-12 py-4 text-white placeholder:text-slate-400 outline-none transition-all shadow-inner focus:shadow-[0_0_20px_rgba(34,211,238,0.15)] font-medium text-base"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-4 flex items-center text-slate-400 hover:text-cyan-400 transition-colors cursor-pointer focus:outline-none"
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
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
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
                "Intră în cont"
              )}
            </button>
          </form>

          {/* Secțiunea de jos */}
          <div className="mt-8 pt-6 border-t border-white/10 flex flex-col gap-4">
            <Link
              href="/register"
              className="w-full text-center py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-bold text-sm hover:bg-white/10 hover:border-white/30 transition-all cursor-pointer shadow-sm"
            >
              Nu ai cont? Creează unul
            </Link>
            <Link
              href="/"
              className="w-full text-center py-3 text-slate-400 font-medium text-sm hover:text-white transition-all cursor-pointer"
            >
              ← Întoarce-te acasă
            </Link>
          </div>
        </div>
      </div>
    </MainContainer>
  );
}
