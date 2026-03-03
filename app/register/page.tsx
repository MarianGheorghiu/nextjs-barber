"use client";

import { useState } from "react";
import MainContainer from "@/components/MainContainer";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";

export default function Register() {
  // Store user input using English variable names
  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Store form state
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // Handle form submission
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 1. Check if passwords match
    if (password !== confirmPassword) {
      setError("Parolele nu coincid! Te rugăm să verifici."); // UI text remains in Romanian
      return;
    }

    setLoading(true);

    // 2. Initialize Supabase
    const supabase = createClient();

    // 3. Send data to Supabase Auth
    const { data, error: supabaseError } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          email: email,
          phone: phone,
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
        <Link
          href="/"
          className="mb-8 text-3xl font-extrabold tracking-wider text-white hover:scale-105 transition-transform"
        >
          Barber<span className="text-cyan-400">App</span>
        </Link>

        <div className="w-full max-w-xl bg-white/5 backdrop-blur-xl border border-white/10 p-8 sm:p-10 rounded-[2.5rem] shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">
              Creează un cont nou
            </h1>
            <p className="text-slate-300 font-light">
              Alătură-te Cristi Barber Shop.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/50 text-red-200 text-sm text-center">
              {error}
            </div>
          )}

          {/* Success State */}
          {success ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/50 shadow-[0_0_20px_rgba(34,197,94,0.3)]">
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
                Cont creat cu succes!
              </h3>
              <p className="text-slate-300 mb-6">
                Te rugăm să îți verifici emailul pentru a confirma contul.
              </p>
              <Link
                href="/login"
                className="px-8 py-3 rounded-xl bg-cyan-500 text-[#000428] font-bold inline-block hover:bg-cyan-400 transition-colors"
              >
                Mergi la Logare
              </Link>
            </div>
          ) : (
            // Registration Form
            <form onSubmit={handleSignUp} className="flex flex-col gap-5">
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
                    placeholder="Andrei"
                    className="w-full bg-white/5 border border-white/10 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 rounded-2xl px-5 py-3.5 text-white placeholder:text-slate-500 outline-none transition-all"
                  />
                </div>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2 ml-1">
                    Parolă
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-white/5 border border-white/10 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 rounded-2xl px-5 py-3.5 text-white placeholder:text-slate-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2 ml-1">
                    Confirmă Parola
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-white/5 border border-white/10 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 rounded-2xl px-5 py-3.5 text-white placeholder:text-slate-500 outline-none transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-4 bg-cyan-500 hover:bg-cyan-400 text-[#000428] font-bold text-lg py-4 rounded-2xl transition-all shadow-[0_0_20px_rgba(34,211,238,0.2)] hover:shadow-[0_0_30px_rgba(34,211,238,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Se creează contul..." : "Creează Contul"}
              </button>
            </form>
          )}

          {!success && (
            <p className="text-center text-slate-400 text-sm mt-8">
              Ai deja un cont?{" "}
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
