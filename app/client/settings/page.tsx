"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  updateClientProfileInfoAction,
  deleteClientAccountAction,
} from "@/app/actions/clientSettingsActions";

export default function ClientSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSavingSecurity, setIsSavingSecurity] = useState(false);

  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setUserId(user.id);
      setEmail(user.email || "");

      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, last_name, phone")
        .eq("id", user.id)
        .single();

      if (profile) {
        setFirstName(profile.first_name || "");
        setLastName(profile.last_name || "");
        setPhone(profile.phone || "");
      }
      setLoading(false);
    };

    fetchProfile();
  }, [router]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setIsSavingProfile(true);
    const result = await updateClientProfileInfoAction(userId, {
      firstName,
      lastName,
      phone,
    });
    setIsSavingProfile(false);
    if (result.success) alert("✅ Datele au fost salvate cu succes!");
    else alert("❌ Eroare la salvare: " + result.error);
  };

  const handleSaveSecurity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword && newPassword !== confirmPassword)
      return alert("⚠️ Parolele nu coincid!");
    if (newPassword && newPassword.length < 6)
      return alert("⚠️ Parola trebuie să aibă minim 6 caractere!");

    setIsSavingSecurity(true);
    const supabase = createClient();
    const updates: any = {};
    if (email) updates.email = email;
    if (newPassword) updates.password = newPassword;

    const { error } = await supabase.auth.updateUser(updates);
    setIsSavingSecurity(false);

    if (error) alert("❌ Eroare: " + error.message);
    else {
      alert("✅ Securitatea a fost actualizată!");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  const handleDeleteAccount = async () => {
    if (!userId) return;
    if (!window.confirm("⚠️ Ești sigur? Vei pierde contul și tot istoricul!"))
      return;
    if (window.prompt("Scrie STERGE pentru a confirma:") !== "STERGE") return;

    setIsDeleting(true);
    const result = await deleteClientAccountAction(userId);
    if (result.success) {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/login");
    } else {
      alert("Eroare la ștergere: " + result.error);
      setIsDeleting(false);
    }
  };

  if (loading)
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );

  return (
    <div className="animate-fade-in max-w-5xl mx-auto pb-10">
      {/* HEADER SPAȚIOS */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-10">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
            Setări Cont
          </h1>
          <p className="text-slate-400 text-base">
            Gestionează datele personale și de securitate.
          </p>
        </div>
        <Link
          href="/client"
          className="cursor-pointer bg-cyan-500 hover:bg-cyan-400 text-[#0a0a0a] font-bold px-6 py-3.5 rounded-xl transition-all flex items-center gap-2 text-base shadow-[0_0_20px_rgba(34,211,238,0.3)]"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="3"
              d="M12 4v16m8-8H4"
            />
          </svg>
          Programare Nouă
        </Link>
      </div>

      {/* GRID PE ECRANE MARI */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* PROFIL */}
        <form
          onSubmit={handleSaveProfile}
          className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 sm:p-8 rounded-[2rem] relative overflow-hidden flex flex-col shadow-xl"
        >
          <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-[60px] pointer-events-none"></div>

          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30 text-cyan-400">
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
            Date Profil
          </h2>

          <div className="space-y-6 relative z-10 flex-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Nume
                </label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 focus:border-cyan-400 rounded-xl px-4 py-3.5 text-white text-base outline-none transition-all shadow-inner"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Prenume
                </label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 focus:border-cyan-400 rounded-xl px-4 py-3.5 text-white text-base outline-none transition-all shadow-inner"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Telefon
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-black/50 border border-white/10 focus:border-cyan-400 rounded-xl px-4 py-3.5 text-white text-base outline-none transition-all shadow-inner"
              />
            </div>
          </div>

          <div className="pt-8 relative z-10">
            <button
              type="submit"
              disabled={isSavingProfile}
              className="cursor-pointer w-full bg-cyan-500 hover:bg-cyan-400 text-[#0a0a0a] font-bold py-3.5 rounded-xl transition-all text-base disabled:opacity-50 shadow-[0_0_15px_rgba(34,211,238,0.2)]"
            >
              {isSavingProfile ? "Se salvează..." : "Salvează Profilul"}
            </button>
          </div>
        </form>

        {/* SECURITATE */}
        <form
          onSubmit={handleSaveSecurity}
          className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 sm:p-8 rounded-[2rem] relative overflow-hidden flex flex-col shadow-xl"
        >
          <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/10 rounded-full blur-[60px] pointer-events-none"></div>

          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center border border-purple-500/30 text-purple-400">
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
            Securitate
          </h2>

          <div className="space-y-6 relative z-10 flex-1">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black/50 border border-white/10 focus:border-purple-400 rounded-xl px-4 py-3.5 text-white text-base outline-none transition-all shadow-inner"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Parolă Nouă
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 focus:border-purple-400 rounded-xl px-4 py-3.5 text-white text-base outline-none transition-all shadow-inner placeholder:text-slate-600"
                  placeholder="Opțional"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Confirmă
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 focus:border-purple-400 rounded-xl px-4 py-3.5 text-white text-base outline-none transition-all shadow-inner placeholder:text-slate-600"
                  placeholder="Repetă parola"
                />
              </div>
            </div>
          </div>

          <div className="pt-8 relative z-10">
            <button
              type="submit"
              disabled={isSavingSecurity}
              className="cursor-pointer w-full bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border border-purple-500/30 font-bold py-3.5 rounded-xl transition-all text-base disabled:opacity-50 shadow-sm"
            >
              {isSavingSecurity ? "Se salvează..." : "Actualizează Securitatea"}
            </button>
          </div>
        </form>
      </div>

      {/* DANGER ZONE - BANDA JOS */}
      <div className="bg-red-500/5 border border-red-500/20 p-6 sm:p-8 rounded-[2rem] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 shadow-xl">
        <div>
          <h3 className="text-white font-bold text-lg mb-1 flex items-center gap-2">
            <svg
              className="w-5 h-5 text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            Ștergere Cont
          </h3>
          <p className="text-sm text-red-400/80">
            Această acțiune este permanentă. Îți vei pierde istoricul,
            favoritele și accesul în platformă.
          </p>
        </div>
        <button
          onClick={handleDeleteAccount}
          disabled={isDeleting}
          className="cursor-pointer shrink-0 w-full sm:w-auto bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-bold px-8 py-3.5 rounded-xl transition-all text-base hover:shadow-[0_0_15px_rgba(239,68,68,0.2)]"
        >
          {isDeleting ? "Așteaptă..." : "Șterge Definitiv"}
        </button>
      </div>
    </div>
  );
}
