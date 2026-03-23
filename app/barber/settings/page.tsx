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

  // ================= FORM STATES =================
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [barbershopName, setBarbershopName] = useState("");
  const [phone, setPhone] = useState("");
  const [diploma, setDiploma] = useState(""); // CORECTAT AICI
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const [isDeleting, setIsDeleting] = useState(false);

  // ================= MODAL STATES =================
  const [activeModal, setActiveModal] = useState<"none" | "alert" | "delete">(
    "none",
  );
  const [modalConfig, setModalConfig] = useState({
    title: "",
    message: "",
    type: "info",
  });
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");

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
        .select("first_name, last_name, barbershop_name, phone, diploma") // Citit corect din DB
        .eq("id", user.id)
        .single();

      if (profile) {
        setFirstName(profile.first_name || "");
        setLastName(profile.last_name || "");
        setBarbershopName(profile.barbershop_name || "");
        setPhone(profile.phone || "");
        setDiploma(profile.diploma || ""); // Setat corect
      }
      setLoading(false);
    };

    fetchProfile();
  }, [router]);

  const showAlert = (
    title: string,
    message: string,
    type: "success" | "error" | "info" = "info",
  ) => {
    setModalConfig({ title, message, type });
    setActiveModal("alert");
  };

  // --- HANDLER: Salvare Profil ---
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    setIsSavingProfile(true);
    const result = await updateProfileInfoAction(userId, {
      firstName,
      lastName,
      barbershopName,
      phone,
      diploma, // Trimis corect către Server Action
    });
    setIsSavingProfile(false);

    if (result.success) {
      showAlert(
        "Profil Actualizat",
        "Datele profesionale au fost salvate cu succes.",
        "success",
      );
    } else {
      showAlert(
        "Eroare la Salvare",
        result.error || "A apărut o problemă.",
        "error",
      );
    }
  };

  // --- HANDLER: Schimbare Parolă ---
  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      return showAlert("Atenție", "Parolele introduse nu coincid.", "error");
    }
    if (newPassword.length < 6) {
      return showAlert(
        "Securitate Scăzută",
        "Noua parolă trebuie să aibă minim 6 caractere.",
        "error",
      );
    }

    setIsSavingPassword(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setIsSavingPassword(false);

    if (error) {
      showAlert("Eroare Securitate", error.message, "error");
    } else {
      showAlert(
        "Securitate Actualizată",
        "Parola a fost schimbată cu succes.",
        "success",
      );
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  // --- HANDLER: Ștergere Cont ---
  const triggerDeleteModal = () => {
    setDeleteConfirmationText("");
    setActiveModal("delete");
  };

  const confirmDeleteAccount = async () => {
    if (!userId) return;
    if (deleteConfirmationText !== "STERGE") {
      showAlert(
        "Confirmare Invalidă",
        "Trebuie să scrii exact cuvântul STERGE.",
        "error",
      );
      return;
    }

    setIsDeleting(true);
    const result = await deleteBarberAccountAction(userId);

    if (result.success) {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/login");
    } else {
      setIsDeleting(false);
      setActiveModal("none");
      showAlert(
        "Eroare la Ștergere",
        result.error || "Contul nu a putut fi șters.",
        "error",
      );
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh]">
        <div className="w-8 h-8 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mb-3 shadow-[0_0_15px_rgba(34,211,238,0.5)]"></div>
        <p className="text-cyan-400 font-bold uppercase tracking-widest text-[10px] animate-pulse">
          Se încarcă setările...
        </p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in max-w-6xl mx-auto pb-10 relative">
      {/* HEADER COMPACT */}
      <div className="mb-6 border-b border-white/10 pb-4">
        <h1 className="text-2xl sm:text-3xl font-black text-white mb-1 tracking-tight">
          Setări Cont
        </h1>
        <p className="text-slate-400 text-sm font-medium">
          Gestionează datele profesionale și detaliile de securitate.
        </p>
      </div>

      {/* GRID COMPACT - DOUĂ FORMULARE ALĂTURATE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative z-10 mb-6">
        {/* ================= FORMULAR PROFIL (STÂNGA) ================= */}
        <form
          onSubmit={handleSaveProfile}
          className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-2xl relative overflow-hidden shadow-xl flex flex-col"
        >
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-cyan-500/50 to-transparent"></div>
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-cyan-500/10 rounded-full blur-[40px] pointer-events-none"></div>

          <h2 className="text-lg font-black text-white mb-5 flex items-center gap-2 relative z-10">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center border border-cyan-500/30 text-cyan-400 shadow-inner shrink-0">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            Profil Profesional
          </h2>

          <div className="space-y-4 relative z-10 flex-1">
            <div>
              <label className="block text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-1.5 ml-1">
                Nume Locație
              </label>
              <input
                type="text"
                required
                value={barbershopName}
                onChange={(e) => setBarbershopName(e.target.value)}
                className="w-full bg-black/40 border border-white/10 focus:border-cyan-400 rounded-xl px-4 py-2.5 text-white text-sm outline-none transition-all shadow-inner font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-1.5 ml-1">
                  Nume
                </label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 focus:border-cyan-400 rounded-xl px-4 py-2.5 text-white text-sm outline-none transition-all shadow-inner"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-1.5 ml-1">
                  Prenume
                </label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 focus:border-cyan-400 rounded-xl px-4 py-2.5 text-white text-sm outline-none transition-all shadow-inner"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-1.5 ml-1">
                  Telefon
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 focus:border-cyan-400 rounded-xl px-4 py-2.5 text-cyan-400 font-mono font-bold text-sm outline-none transition-all shadow-inner"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-1.5 ml-1">
                  Certificare / Curs
                </label>
                <input
                  type="text"
                  value={diploma}
                  onChange={(e) => setDiploma(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 focus:border-cyan-400 rounded-xl px-4 py-2.5 text-white text-sm outline-none transition-all shadow-inner"
                  placeholder="ex: Academia X"
                />
              </div>
            </div>
          </div>

          <div className="pt-5 mt-5 border-t border-white/5 relative z-10">
            <button
              type="submit"
              disabled={isSavingProfile}
              className="cursor-pointer w-full bg-cyan-500 hover:bg-cyan-400 text-[#000428] font-black py-3 rounded-xl transition-all shadow-[0_0_15px_rgba(34,211,238,0.3)] disabled:opacity-50 text-sm"
            >
              {isSavingProfile ? "Se salvează..." : "Actualizează Profilul"}
            </button>
          </div>
        </form>

        {/* ================= FORMULAR SECURITATE (DREAPTA) ================= */}
        <form
          onSubmit={handleSavePassword}
          className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-2xl relative overflow-hidden shadow-xl flex flex-col"
        >
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-purple-500/50 to-transparent"></div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-[40px] pointer-events-none"></div>

          <h2 className="text-lg font-black text-white mb-5 flex items-center gap-2 relative z-10">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center border border-purple-500/30 text-purple-400 shadow-inner shrink-0">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            Securitate Cont
          </h2>

          <div className="space-y-4 relative z-10 flex-1">
            <div>
              <label className="block text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-1.5 ml-1">
                Email Autentificare
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black/40 border border-white/10 focus:border-purple-400 rounded-xl px-4 py-2.5 text-slate-300 text-sm outline-none transition-all shadow-inner font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-1.5 ml-1">
                Noua Parolă
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-black/40 border border-white/10 focus:border-purple-400 rounded-xl px-4 py-2.5 text-white text-sm outline-none transition-all shadow-inner placeholder:text-slate-600"
                placeholder="Minim 6 caractere (lasă gol dacă nu schimbi)"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-1.5 ml-1">
                Confirmă Parola Nouă
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-black/40 border border-white/10 focus:border-purple-400 rounded-xl px-4 py-2.5 text-white text-sm outline-none transition-all shadow-inner placeholder:text-slate-600"
                placeholder="Repetă parola nouă"
              />
            </div>
          </div>

          <div className="pt-5 mt-5 border-t border-white/5 relative z-10">
            <button
              type="submit"
              disabled={isSavingPassword || !newPassword || !confirmPassword}
              className="cursor-pointer w-full bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border border-purple-500/30 font-black py-3 rounded-xl transition-all shadow-sm disabled:opacity-50 text-sm"
            >
              {isSavingPassword ? "Așteaptă..." : "Schimbă Parola"}
            </button>
          </div>
        </form>
      </div>

      {/* ================= ZONA DE PERICOL (COMPACTĂ) ================= */}
      <div className="bg-black/40 border border-red-500/20 p-6 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-4 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-red-500/20"></div>
        <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-red-500/10 rounded-full blur-[40px] pointer-events-none"></div>

        <div className="relative z-10 w-full sm:w-auto text-center sm:text-left">
          <h2 className="text-lg font-black text-red-400 mb-1 flex items-center justify-center sm:justify-start gap-2">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            Închidere Cont
          </h2>
          <p className="text-xs text-red-400/70 font-medium">
            Ștergerea contului este definitivă. Vei pierde toată agenda și
            istoricul.
          </p>
        </div>

        <button
          onClick={triggerDeleteModal}
          disabled={isDeleting}
          className="cursor-pointer shrink-0 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/30 hover:border-red-500 font-black px-6 py-2.5 rounded-xl transition-all shadow-sm w-full sm:w-auto text-sm"
        >
          Șterge Definitiv
        </button>
      </div>

      {/* ================= MODALE CUSTOM ================= */}

      {/* Modal Alertă */}
      {activeModal === "alert" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div
            className={`w-full max-w-sm bg-[#050505]/95 backdrop-blur-2xl border p-6 rounded-[1.5rem] shadow-2xl relative overflow-hidden ${modalConfig.type === "error" ? "border-red-500/30" : modalConfig.type === "success" ? "border-green-500/30" : "border-cyan-500/30"}`}
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-white/10"></div>
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 border-2 shadow-inner relative z-10 ${modalConfig.type === "error" ? "bg-red-500/10 border-red-500/20 text-red-400" : modalConfig.type === "success" ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-cyan-500/10 border-cyan-500/20 text-cyan-400"}`}
            >
              {modalConfig.type === "error" && (
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.5"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              )}
              {modalConfig.type === "success" && (
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.5"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
              {modalConfig.type === "info" && (
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.5"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              )}
            </div>
            <h2 className="text-lg font-black text-white mb-2 text-center tracking-tight relative z-10">
              {modalConfig.title}
            </h2>
            <p className="text-slate-300 text-sm mb-6 text-center font-medium leading-relaxed relative z-10">
              {modalConfig.message}
            </p>
            <button
              onClick={() => setActiveModal("none")}
              className={`w-full py-2.5 rounded-xl font-black transition-all cursor-pointer shadow-lg relative z-10 text-[#0a0a0a] text-sm ${modalConfig.type === "error" ? "bg-red-500 hover:bg-red-400" : modalConfig.type === "success" ? "bg-green-500 hover:bg-green-400" : "bg-cyan-500 hover:bg-cyan-400"}`}
            >
              Am înțeles
            </button>
          </div>
        </div>
      )}

      {/* Modal Ștergere (Atenție) */}
      {activeModal === "delete" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm bg-[#050505]/95 backdrop-blur-2xl border border-red-500/30 p-6 rounded-[1.5rem] shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-red-500/20"></div>
            <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4 border-2 border-red-500/20 text-red-400 shadow-inner relative z-10">
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </div>

            <h2 className="text-xl font-black text-white mb-2 text-center tracking-tight relative z-10">
              Confirmare Ștergere
            </h2>
            <p className="text-red-400/90 text-xs mb-5 text-center font-bold relative z-10">
              Scrie cuvântul{" "}
              <span className="text-white bg-red-500/20 px-1.5 py-0.5 rounded">
                STERGE
              </span>{" "}
              pentru a confirma acțiunea ireversibilă.
            </p>

            <input
              type="text"
              placeholder="STERGE"
              value={deleteConfirmationText}
              onChange={(e) => setDeleteConfirmationText(e.target.value)}
              className="w-full bg-black/60 border border-red-500/30 focus:border-red-500 rounded-xl px-4 py-3 text-white text-center tracking-widest font-black outline-none transition-all shadow-inner mb-6 relative z-10"
            />

            <div className="flex gap-3 relative z-10">
              <button
                onClick={() => setActiveModal("none")}
                className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-bold hover:bg-white/10 transition-all cursor-pointer"
              >
                Anulează
              </button>
              <button
                onClick={confirmDeleteAccount}
                disabled={isDeleting || deleteConfirmationText !== "STERGE"}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-[#0a0a0a] text-sm font-black hover:bg-red-400 transition-all cursor-pointer shadow-[0_0_15px_rgba(239,68,68,0.4)] disabled:opacity-30 disabled:shadow-none disabled:cursor-not-allowed"
              >
                {isDeleting ? "..." : "Șterge"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
