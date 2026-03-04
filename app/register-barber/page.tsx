"use client";

import { useState } from "react";
import MainContainer from "@/components/MainContainer";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";

export default function RegisterBarber() {
  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [phone, setPhone] = useState("");
  const [courseDiploma, setCourseDiploma] = useState("");
  const [emailPrefix, setEmailPrefix] = useState(""); // Only the name part
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Stări pentru vizualizarea parolelor adăugate
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleBarberSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Parolele nu coincid! Te rugăm să verifici.");
      return;
    }

    setLoading(true);

    const supabase = createClient();

    // Combine prefix with the mandatory domain
    const fullEmail = `${emailPrefix.trim().toLowerCase()}@mcorp.com`;

    const { data, error: supabaseError } = await supabase.auth.signUp({
      email: fullEmail,
      password: password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          phone: phone,
          diploma: courseDiploma, // Sending diploma details to DB
          role: "barber", // We mark them as barber here
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
      <div className="flex-1 flex flex-col justify-center items-center min-h-[90vh] py-12">
        <div className="w-full max-w-xl bg-white/5 backdrop-blur-xl border border-white/10 p-8 sm:p-10 rounded-[2.5rem] shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] border-t-cyan-500/30">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">
              Înregistrare Frizer
            </h1>
            <p className="text-slate-300 font-light">
              Completează datele pentru acces în sistem.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/50 text-red-200 text-sm text-center">
              {error}
            </div>
          )}

          {success ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/50">
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
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">
                Cont Creat!
              </h3>
              <p className="text-slate-300 mb-6">
                Contul tău de frizer a fost înregistrat cu succes.
              </p>
              <Link
                href="/login"
                className="px-8 py-3 rounded-xl bg-cyan-500 text-[#000428] font-bold inline-block hover:bg-cyan-400 transition-colors cursor-pointer"
              >
                Mergi la Logare
              </Link>
            </div>
          ) : (
            <form onSubmit={handleBarberSignUp} className="flex flex-col gap-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2 ml-1">
                    Nume
                  </label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Popescu"
                    className="w-full bg-white/5 border border-white/10 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 rounded-2xl px-5 py-3.5 text-white placeholder:text-slate-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2 ml-1">
                    Prenume
                  </label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Ion"
                    className="w-full bg-white/5 border border-white/10 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 rounded-2xl px-5 py-3.5 text-white placeholder:text-slate-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2 ml-1">
                  Date Diplomă / Curs Absolvit
                </label>
                <input
                  type="text"
                  required
                  value={courseDiploma}
                  onChange={(e) => setCourseDiploma(e.target.value)}
                  placeholder="Ex: Curs Frizerie Academia X, Seria 123"
                  className="w-full bg-white/5 border border-white/10 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 rounded-2xl px-5 py-3.5 text-white placeholder:text-slate-500 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2 ml-1">
                  Telefon
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="07XX XXX XXX"
                  className="w-full bg-white/5 border border-white/10 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 rounded-2xl px-5 py-3.5 text-white placeholder:text-slate-500 outline-none transition-all"
                />
              </div>

              {/* Email special format */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2 ml-1">
                  Email Intern (@mcorp.com)
                </label>
                <div className="flex relative items-center">
                  <input
                    type="text"
                    required
                    value={emailPrefix}
                    onChange={(e) =>
                      setEmailPrefix(e.target.value.replace(/\s+/g, ""))
                    } // No spaces allowed
                    placeholder="nume.prenume"
                    className="w-full bg-white/5 border border-white/10 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 rounded-2xl pl-5 pr-32 py-3.5 text-white placeholder:text-slate-500 outline-none transition-all"
                  />
                  <span className="absolute right-5 text-cyan-400 font-medium pointer-events-none">
                    @mcorp.com
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Modificat pentru show/hide parola */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2 ml-1">
                    Parolă
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={6}
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
                </div>

                {/* Modificat pentru show/hide confirmare parola */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2 ml-1">
                    Confirmă Parola
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-white/5 border border-white/10 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 rounded-2xl pl-5 pr-12 py-3.5 text-white placeholder:text-slate-500 outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="absolute inset-y-0 right-4 flex items-center text-slate-400 hover:text-cyan-400 transition-colors focus:outline-none cursor-pointer"
                    >
                      {showConfirmPassword ? (
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
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-4 bg-cyan-500 hover:bg-cyan-400 text-[#000428] font-bold text-lg py-4 rounded-2xl transition-all shadow-[0_0_20px_rgba(34,211,238,0.2)] hover:shadow-[0_0_30px_rgba(34,211,238,0.4)] disabled:opacity-50 cursor-pointer"
              >
                {loading ? "Se creează contul..." : "Înregistrează Frizer"}
              </button>
            </form>
          )}
          <div className="mt-8 pt-6 border-t border-white/10 flex gap-4 justify-center w-full">
            <Link
              href="/login"
              className="flex-1 text-center px-4 py-3.5 rounded-2xl border border-white/20 bg-white/5 text-slate-300 font-medium hover:bg-white/10 hover:text-white hover:border-cyan-400/50 transition-all duration-300 cursor-pointer"
            >
              Logare
            </Link>
            <Link
              href="/register"
              className="flex-1 text-center px-4 py-3.5 rounded-2xl border border-white/20 bg-white/5 text-slate-300 font-medium hover:bg-white/10 hover:text-white hover:border-cyan-400/50 transition-all duration-300 cursor-pointer"
            >
              Înregistrare client
            </Link>
          </div>
        </div>
      </div>
    </MainContainer>
  );
}
