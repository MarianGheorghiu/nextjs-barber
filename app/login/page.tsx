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
        email: email,
        password: password,
      });

    if (signInError || !authData.user) {
      setError("Email sau parolă incorectă.");
      setLoading(false);
      return;
    }

    // 2. Aflăm ce rol are din tabelul `profiles`
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

    // 3. Redirecționăm inteligent pe baza rolului
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
      <div className="flex-1 flex flex-col justify-center items-center min-h-[90vh] py-12 px-4">
        {/* Liquid Glass Container curățat */}
        <div className="relative w-full max-w-md bg-white/[0.04] backdrop-blur-2xl border border-white/10 p-8 sm:p-10 rounded-[2.5rem] shadow-[0_15px_40px_rgba(0,0,0,0.4)] overflow-hidden">
          {/* Glow subtil */}
          <div className="absolute -top-24 -right-24 w-52 h-52 bg-cyan-500/20 blur-[80px] rounded-full pointer-events-none"></div>

          <div className="relative z-10 text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">
              Bine ai revenit
            </h1>
            {/* Am micșorat textul aici */}
            <p className="text-slate-400 font-light text-sm">
              Loghează-te în contul tău.
            </p>
          </div>

          {error && (
            <div className="relative z-10 mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/50 text-red-200 text-sm text-center">
              {error}
            </div>
          )}

          <form
            onSubmit={handleSignIn}
            className="relative z-10 flex flex-col gap-5"
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

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2 ml-1">
                Parolă
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white/5 border border-white/10 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 rounded-2xl pl-5 pr-12 py-3.5 text-white placeholder:text-slate-500 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-4 flex items-center text-slate-400 hover:text-cyan-400 transition-colors focus:outline-none cursor-pointer"
                >
                  {showPassword ? (
                    <svg
                      className="w-5 h-5 cursor-pointer"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
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
                      className="w-5 h-5 cursor-pointer"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
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
              {/* Am mutat "Ai uitat parola?" sub input, aliniat la dreapta */}
              <div className="flex justify-end mt-2 mr-1">
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-cyan-400 hover:text-cyan-300 hover:underline transition-colors"
                >
                  Ai uitat parola?
                </Link>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-cyan-500 hover:bg-cyan-400 text-[#000428] font-bold text-lg py-4 rounded-2xl transition-all shadow-[0_0_20px_rgba(34,211,238,0.2)] hover:shadow-[0_0_30px_rgba(34,211,238,0.4)] disabled:opacity-50 cursor-pointer"
            >
              {loading ? "Se încarcă..." : "Intră în cont"}
            </button>
          </form>

          <div className="relative z-10 mt-6 pt-4 border-t border-white/10 flex flex-col gap-4">
            <p className="text-center text-slate-400 text-sm">
              Nu ai cont încă?{" "}
              <Link
                href="/register"
                className="text-cyan-400 font-semibold hover:text-cyan-300 hover:underline transition-colors ml-1"
              >
                Creează unul
              </Link>
            </p>

            <div className="relative z-10 border-t border-white/10 flex flex-col gap-4"></div>
            {/* Noul link pentru pagina principală */}
            <p className="text-center text-slate-400 text-sm">
              Te-ai rătăcit?{" "}
              <Link
                href="/"
                className="text-cyan-400 font-semibold hover:text-cyan-300 hover:underline transition-colors ml-1"
              >
                Hai acasă
              </Link>
            </p>
          </div>
        </div>
      </div>
    </MainContainer>
  );
}
