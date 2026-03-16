"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import {
  updateProfileInfoAction,
  deleteBarberAccountAction,
} from "@/app/actions/settingsActions";

export default function BarberSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Formular Profil
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [barbershopName, setBarbershopName] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Formular Parolă
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  // Ștergere Cont
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

      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, last_name, barbershop_name")
        .eq("id", user.id)
        .single();

      if (profile) {
        setFirstName(profile.first_name || "");
        setLastName(profile.last_name || "");
        setBarbershopName(profile.barbershop_name || "");
      }
      setLoading(false);
    };

    fetchProfile();
  }, [router]);

  // --- HANDLER: Salvare Profil ---
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    setIsSavingProfile(true);
    const result = await updateProfileInfoAction(userId, {
      firstName,
      lastName,
      barbershopName,
    });
    setIsSavingProfile(false);

    if (result.success) {
      alert("✅ Profilul a fost actualizat cu succes!");
    } else {
      alert("❌ Eroare la salvare: " + result.error);
    }
  };

  // --- HANDLER: Schimbare Parolă ---
  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert("⚠️ Parolele nu coincid!");
      return;
    }
    if (newPassword.length < 6) {
      alert("⚠️ Parola trebuie să aibă minim 6 caractere!");
      return;
    }

    setIsSavingPassword(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setIsSavingPassword(false);

    if (error) {
      alert("❌ Eroare la schimbarea parolei: " + error.message);
    } else {
      alert("✅ Parola a fost schimbată cu succes!");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  // --- HANDLER: Ștergere Cont ---
  const handleDeleteAccount = async () => {
    if (!userId) return;

    const confirm1 = window.confirm(
      "⚠️ ATENȚIE: Ești sigur că vrei să-ți ștergi contul?",
    );
    if (!confirm1) return;

    const confirm2 = window.prompt("Pentru a confirma, scrie cuvântul: STERGE");
    if (confirm2 !== "STERGE") {
      alert("Acțiunea a fost anulată.");
      return;
    }

    setIsDeleting(true);
    const result = await deleteBarberAccountAction(userId);

    if (result.success) {
      const supabase = createClient();
      await supabase.auth.signOut(); // Scoatem utilizatorul din sesiune
      router.push("/login"); // Îl trimitem la login
    } else {
      alert("Eroare la ștergere: " + result.error);
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh]">
        <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-cyan-400 font-medium animate-pulse">
          Se încarcă setările...
        </p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in max-w-4xl mx-auto pb-10">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-white mb-2">Setări Cont</h1>
        <p className="text-slate-400">
          Gestionează datele tale personale și de securitate.
        </p>
      </div>

      <div className="space-y-8">
        {/* SECȚIUNEA 1: Date Personale */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 sm:p-8 rounded-[2rem]">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <svg
              className="w-5 h-5 text-cyan-400"
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
            Date Profil
          </h2>

          <form onSubmit={handleSaveProfile} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Nume Frizerie / Salon
              </label>
              <input
                type="text"
                required
                value={barbershopName}
                onChange={(e) => setBarbershopName(e.target.value)}
                className="w-full bg-black/50 border border-white/10 focus:border-cyan-400 rounded-xl px-4 py-3 text-white outline-none transition-all placeholder:text-slate-600"
                placeholder="Ex: Barber Shop by Alex"
              />
            </div>

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
                  className="w-full bg-black/50 border border-white/10 focus:border-cyan-400 rounded-xl px-4 py-3 text-white outline-none transition-all"
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
                  className="w-full bg-black/50 border border-white/10 focus:border-cyan-400 rounded-xl px-4 py-3 text-white outline-none transition-all"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isSavingProfile}
                className="cursor-pointer bg-cyan-500 hover:bg-cyan-400 text-[#000428] font-bold px-6 py-3 rounded-xl transition-all shadow-[0_0_15px_rgba(34,211,238,0.2)] disabled:opacity-50"
              >
                {isSavingProfile ? "Se salvează..." : "Salvează Modificările"}
              </button>
            </div>
          </form>
        </div>

        {/* SECȚIUNEA 2: Securitate */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 sm:p-8 rounded-[2rem]">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <svg
              className="w-5 h-5 text-purple-400"
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
            Securitate (Schimbare Parolă)
          </h2>

          <form onSubmit={handleSavePassword} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Noua Parolă
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 focus:border-purple-400 rounded-xl px-4 py-3 text-white outline-none transition-all"
                  placeholder="Minim 6 caractere"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Confirmă Parola
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 focus:border-purple-400 rounded-xl px-4 py-3 text-white outline-none transition-all"
                  placeholder="Repetă parola"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isSavingPassword || !newPassword || !confirmPassword}
                className="cursor-pointer bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border border-purple-500/30 font-bold px-6 py-3 rounded-xl transition-all disabled:opacity-50"
              >
                {isSavingPassword
                  ? "Se actualizează..."
                  : "Actualizează Parola"}
              </button>
            </div>
          </form>
        </div>

        {/* SECȚIUNEA 3: Zona Periculoasă */}
        <div className="bg-red-500/5 border border-red-500/20 p-6 sm:p-8 rounded-[2rem]">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
            <div>
              <h2 className="text-xl font-bold text-red-400 mb-2 flex items-center gap-2">
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
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                Închidere Cont
              </h2>
              <p className="text-sm text-red-400/70 max-w-md leading-relaxed">
                Odată ce îți ștergi contul, toate programările, clienții și
                setările vor fi șterse definitiv. Această acțiune nu poate fi
                anulată.
              </p>
            </div>

            <button
              onClick={handleDeleteAccount}
              disabled={isDeleting}
              className="cursor-pointer shrink-0 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-bold px-6 py-3 rounded-xl transition-all w-full sm:w-auto text-center"
            >
              {isDeleting ? "Se șterge..." : "Șterge Contul Definitiv"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
