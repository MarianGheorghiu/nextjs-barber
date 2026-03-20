"use client";

import { useState } from "react";
import MainContainer from "@/components/MainContainer";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";

export default function Register() {
  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // Funcție de validare a datelor clientului
  const validateForm = () => {
    // Validare Telefon (10 cifre, începe cu 07)
    const phoneRegex = /^07\d{8}$/;
    if (!phoneRegex.test(phone.replace(/\s/g, ""))) {
      return "Numărul de telefon este invalid. Trebuie să aibă 10 cifre și să înceapă cu 07.";
    }

    // Validare Email Standard
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return "Te rugăm să introduci o adresă de email validă.";
    }

    // Validare Parolă
    if (password.length < 6) {
      return "Parola trebuie să aibă cel puțin 6 caractere.";
    }
    if (password !== confirmPassword) {
      return "Parolele nu coincid! Te rugăm să verifici.";
    }

    return null; // Nicio eroare
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const cleanPhone = phone.replace(/\s/g, "");

    const { error: supabaseError } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password: password,
      options: {
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: cleanPhone,
          role: "client", // Salvăm explicit ca fiind client
        },
      },
    });

    if (supabaseError) {
      setError(supabaseError.message);
    } else {
      setSuccess(true);
    }

    setLoading(false);
  };

  return (
    <MainContainer>
      <div className="flex-1 flex flex-col justify-center items-center min-h-[90vh] py-12 px-4 relative z-10">
        {/* Glow de fundal impresionant */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-[80%] bg-cyan-500/10 blur-[120px] -z-10 rounded-full pointer-events-none"></div>

        <div className="w-full max-w-2xl bg-white/5 backdrop-blur-2xl border border-white/20 p-8 sm:p-12 rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden">
          <div className="text-center mb-10">
            <h1 className="text-3xl sm:text-4xl font-black text-white mb-3 tracking-tight">
              Înregistrare Client
            </h1>
            <p className="text-slate-300 font-medium">
              Creează un cont pentru a te programa rapid.
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
            <div className="text-center py-10 animate-fade-in">
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
              <h3 className="text-3xl font-black text-white mb-3">
                Cont Creat!
              </h3>
              <p className="text-slate-300 mb-10 text-lg">
                Contul tău de client a fost înregistrat cu succes. Confirmă-ți
                adresa de email (dacă e necesar) și loghează-te.
              </p>
              <Link
                href="/login"
                className="px-10 py-4 rounded-2xl bg-cyan-500 text-[#000428] font-black text-lg hover:bg-cyan-400 transition-all shadow-[0_0_20px_rgba(34,211,238,0.4)] inline-block hover:scale-105"
              >
                Mergi la Logare →
              </Link>
            </div>
          ) : (
            <form
              onSubmit={handleSignUp}
              className="flex flex-col gap-6 animate-fade-in"
            >
              {/* RÂND 1: Nume / Prenume */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="relative group">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-widest mb-2 ml-1">
                    Nume Familie
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
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                    </div>
                    <input
                      type="text"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Ex: Popescu"
                      className="w-full bg-white/10 focus:bg-white/15 backdrop-blur-md border border-white/20 focus:border-cyan-400 rounded-2xl pl-11 pr-4 py-4 text-white placeholder:text-slate-400 outline-none transition-all shadow-inner focus:shadow-[0_0_20px_rgba(34,211,238,0.15)] font-medium text-base"
                    />
                  </div>
                </div>
                <div className="relative group">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-widest mb-2 ml-1">
                    Prenume
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
                          d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                        />
                      </svg>
                    </div>
                    <input
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Ex: Andrei"
                      className="w-full bg-white/10 focus:bg-white/15 backdrop-blur-md border border-white/20 focus:border-cyan-400 rounded-2xl pl-11 pr-4 py-4 text-white placeholder:text-slate-400 outline-none transition-all shadow-inner focus:shadow-[0_0_20px_rgba(34,211,238,0.15)] font-medium text-base"
                    />
                  </div>
                </div>
              </div>

              {/* RÂND 2: Telefon / Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="relative group">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-widest mb-2 ml-1">
                    Telefon
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
                          d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                        />
                      </svg>
                    </div>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="07XX XXX XXX"
                      className="w-full bg-white/10 focus:bg-white/15 backdrop-blur-md border border-white/20 focus:border-cyan-400 rounded-2xl pl-11 pr-4 py-4 text-white placeholder:text-slate-400 outline-none transition-all shadow-inner focus:shadow-[0_0_20px_rgba(34,211,238,0.15)] font-mono font-bold tracking-wide text-base"
                    />
                  </div>
                </div>

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
                      onChange={(e) =>
                        setEmail(e.target.value.trim().toLowerCase())
                      }
                      placeholder="nume@exemplu.ro"
                      className="w-full bg-white/10 focus:bg-white/15 backdrop-blur-md border border-white/20 focus:border-cyan-400 rounded-2xl pl-11 pr-4 py-4 text-white placeholder:text-slate-400 outline-none transition-all shadow-inner focus:shadow-[0_0_20px_rgba(34,211,238,0.15)] font-medium text-base"
                    />
                  </div>
                </div>
              </div>

              {/* RÂND 3: Parole */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="relative group">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-widest mb-2 ml-1">
                    Parolă
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
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
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
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-6 bg-cyan-500 hover:bg-cyan-400 text-[#000428] font-black text-lg py-4 rounded-2xl transition-all shadow-[0_0_20px_rgba(34,211,238,0.3)] hover:shadow-[0_0_30px_rgba(34,211,238,0.4)] disabled:opacity-50 cursor-pointer flex justify-center items-center gap-2 hover:scale-[1.02]"
              >
                {loading ? (
                  <span className="w-6 h-6 border-4 border-[#000428] border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  "Creează Cont Client"
                )}
              </button>
            </form>
          )}

          {/* BUTOANE DE JOS COMPACTE, DAR PREMIUM */}
          {!success && (
            <div className="mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row gap-4 justify-center w-full">
              <Link
                href="/login"
                className="flex-1 text-center py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white font-bold text-sm hover:bg-white/10 hover:border-white/30 transition-all cursor-pointer shadow-sm"
              >
                Logare
              </Link>
              <Link
                href="/register-barber"
                className="flex-1 text-center py-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-bold text-sm hover:bg-cyan-500/20 hover:border-cyan-400/50 transition-all cursor-pointer shadow-sm"
              >
                Sunt Frizer
              </Link>
            </div>
          )}
        </div>
      </div>
    </MainContainer>
  );
}
