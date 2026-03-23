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

  // ================= MODAL STATES =================
  const [activeModal, setActiveModal] = useState<"none" | "alert" | "delete">(
    "none",
  );
  const [modalConfig, setModalConfig] = useState({
    title: "",
    message: "",
    type: "info",
  }); // type: 'success' | 'error' | 'info'
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

  // Funcție Helper pentru a deschide un modal de alertă
  const showAlert = (
    title: string,
    message: string,
    type: "success" | "error" | "info" = "info",
  ) => {
    setModalConfig({ title, message, type });
    setActiveModal("alert");
  };

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

    if (result.success)
      showAlert(
        "Actualizare Reușită",
        "Datele profilului au fost salvate cu succes.",
        "success",
      );
    else
      showAlert(
        "Eroare la Salvare",
        result.error || "A apărut o problemă la actualizarea datelor.",
        "error",
      );
  };

  const handleSaveSecurity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword && newPassword !== confirmPassword) {
      return showAlert(
        "Atenție",
        "Parolele introduse nu coincid. Te rugăm să verifici.",
        "error",
      );
    }
    if (newPassword && newPassword.length < 6) {
      return showAlert(
        "Securitate Scăzută",
        "Parola nouă trebuie să conțină minimum 6 caractere.",
        "error",
      );
    }

    setIsSavingSecurity(true);
    const supabase = createClient();
    const updates: any = {};
    if (email) updates.email = email;
    if (newPassword) updates.password = newPassword;

    const { error } = await supabase.auth.updateUser(updates);
    setIsSavingSecurity(false);

    if (error) {
      showAlert("Eroare de Securitate", error.message, "error");
    } else {
      showAlert(
        "Securitate Actualizată",
        "Datele tale de securitate au fost modificate cu succes.",
        "success",
      );
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  // Declansare Modal Ștergere
  const triggerDeleteModal = () => {
    setDeleteConfirmationText("");
    setActiveModal("delete");
  };

  const confirmDeleteAccount = async () => {
    if (!userId) return;
    if (deleteConfirmationText !== "STERGE") {
      showAlert(
        "Confirmare Invalidă",
        "Trebuie să scrii exact cuvântul STERGE pentru a continua.",
        "error",
      );
      return;
    }

    setIsDeleting(true);
    const result = await deleteClientAccountAction(userId);

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
      <div className="flex h-[80vh] items-center justify-center">
        <div className="w-10 h-10 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(34,211,238,0.5)]"></div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in max-w-5xl mx-auto pb-10 relative">
      {/* HEADER SPAȚIOS */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-10">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-white mb-2 tracking-tight">
            Setări Cont
          </h1>
          <p className="text-slate-400 text-sm font-medium">
            Gestionează datele personale și detaliile de securitate.
          </p>
        </div>
        <Link
          href="/client"
          className="cursor-pointer bg-cyan-500 hover:bg-cyan-400 text-[#000428] font-black px-6 py-3.5 rounded-xl transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(34,211,238,0.3)] hover:shadow-[0_0_30px_rgba(34,211,238,0.5)] hover:scale-105"
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
        {/* ================= PROFIL LIQUID GLASS ================= */}
        <form
          onSubmit={handleSaveProfile}
          className="bg-white/5 backdrop-blur-2xl border border-white/20 p-6 sm:p-8 rounded-[2rem] relative overflow-hidden flex flex-col shadow-2xl"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500/40 to-transparent"></div>
          <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-[60px] pointer-events-none"></div>

          <h2 className="text-xl font-black text-white mb-8 flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/30 text-cyan-400 shadow-inner">
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
            Date Personale
          </h2>

          <div className="space-y-6 relative z-10 flex-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-bold text-cyan-400/80 uppercase tracking-widest mb-1.5 ml-1">
                  Nume Familie
                </label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 focus:border-cyan-400 rounded-xl px-4 py-3.5 text-white text-sm outline-none transition-all shadow-inner"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-cyan-400/80 uppercase tracking-widest mb-1.5 ml-1">
                  Prenume
                </label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 focus:border-cyan-400 rounded-xl px-4 py-3.5 text-white text-sm outline-none transition-all shadow-inner"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-cyan-400/80 uppercase tracking-widest mb-1.5 ml-1">
                Telefon Contact
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-black/40 border border-white/10 focus:border-cyan-400 rounded-xl px-4 py-3.5 text-white font-mono text-sm outline-none transition-all shadow-inner"
              />
            </div>
          </div>

          <div className="pt-8 relative z-10">
            <button
              type="submit"
              disabled={isSavingProfile}
              className="cursor-pointer w-full bg-cyan-500 hover:bg-cyan-400 text-[#000428] font-black py-3.5 rounded-xl transition-all shadow-[0_0_15px_rgba(34,211,238,0.3)] disabled:opacity-50"
            >
              {isSavingProfile ? "Se salvează..." : "Salvează Profilul"}
            </button>
          </div>
        </form>

        {/* ================= SECURITATE LIQUID GLASS ================= */}
        <form
          onSubmit={handleSaveSecurity}
          className="bg-white/5 backdrop-blur-2xl border border-white/20 p-6 sm:p-8 rounded-[2rem] relative overflow-hidden flex flex-col shadow-2xl"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500/40 to-transparent"></div>
          <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/10 rounded-full blur-[60px] pointer-events-none"></div>

          <h2 className="text-xl font-black text-white mb-8 flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/30 text-purple-400 shadow-inner">
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
            Securitate Cont
          </h2>

          <div className="space-y-6 relative z-10 flex-1">
            <div>
              <label className="block text-[10px] font-bold text-purple-400/80 uppercase tracking-widest mb-1.5 ml-1">
                Email Autentificare
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black/40 border border-white/10 focus:border-purple-400 rounded-xl px-4 py-3.5 text-white text-sm outline-none transition-all shadow-inner font-mono"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-bold text-purple-400/80 uppercase tracking-widest mb-1.5 ml-1">
                  Schimbă Parola
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 focus:border-purple-400 rounded-xl px-4 py-3.5 text-white text-sm outline-none transition-all shadow-inner placeholder:text-slate-600"
                  placeholder="Scrie o parolă nouă"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-purple-400/80 uppercase tracking-widest mb-1.5 ml-1">
                  Confirmă Parola
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 focus:border-purple-400 rounded-xl px-4 py-3.5 text-white text-sm outline-none transition-all shadow-inner placeholder:text-slate-600"
                  placeholder="Repetă parola"
                />
              </div>
            </div>
          </div>

          <div className="pt-8 relative z-10">
            <button
              type="submit"
              disabled={isSavingSecurity}
              className="cursor-pointer w-full bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 font-black py-3.5 rounded-xl transition-all shadow-sm disabled:opacity-50"
            >
              {isSavingSecurity ? "Așteaptă..." : "Actualizează Datele"}
            </button>
          </div>
        </form>
      </div>

      {/* ================= DANGER ZONE ================= */}
      <div className="bg-black/40 border border-red-500/20 p-6 sm:p-8 rounded-[2.5rem] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-red-500/20"></div>
        <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-red-500/10 rounded-full blur-[40px] pointer-events-none"></div>

        <div className="relative z-10">
          <h3 className="text-white font-black text-xl mb-1.5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center border border-red-500/20 text-red-400 shadow-inner">
              <svg
                className="w-4 h-4"
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
            </div>
            Zona de Pericol
          </h3>
          <p className="text-sm font-medium text-slate-400 max-w-lg leading-relaxed">
            Ștergerea contului este ireversibilă. Îți vei pierde istoricul
            programărilor, locațiile favorite salvate și accesul în platformă.
          </p>
        </div>
        <button
          onClick={triggerDeleteModal}
          disabled={isDeleting}
          className="cursor-pointer shrink-0 w-full sm:w-auto bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/30 hover:border-red-500 font-black px-8 py-3.5 rounded-xl transition-all shadow-sm hover:shadow-[0_0_20px_rgba(239,68,68,0.4)] relative z-10"
        >
          Șterge Contul Meu
        </button>
      </div>

      {/* ================= SISTEM DE MODALE ================= */}
      {activeModal !== "none" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          {/* Modal Alertă Generală (Success / Error) */}
          {activeModal === "alert" && (
            <div
              className={`w-full max-w-sm bg-[#050505]/95 backdrop-blur-2xl border p-8 rounded-[2rem] shadow-2xl relative overflow-hidden ${modalConfig.type === "error" ? "border-red-500/30" : modalConfig.type === "success" ? "border-green-500/30" : "border-cyan-500/30"}`}
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-white/10"></div>

              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 border-4 shadow-inner relative z-10 ${modalConfig.type === "error" ? "bg-red-500/10 border-red-500/20 text-red-400" : modalConfig.type === "success" ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-cyan-500/10 border-cyan-500/20 text-cyan-400"}`}
              >
                {modalConfig.type === "error" && (
                  <svg
                    className="w-8 h-8"
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
                    className="w-8 h-8"
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
                    className="w-8 h-8"
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

              <h2 className="text-xl font-black text-white mb-2 text-center tracking-tight relative z-10">
                {modalConfig.title}
              </h2>
              <p className="text-slate-300 text-sm mb-8 text-center font-medium leading-relaxed relative z-10">
                {modalConfig.message}
              </p>

              <button
                onClick={() => setActiveModal("none")}
                className={`w-full py-3.5 rounded-xl font-black transition-all cursor-pointer shadow-lg relative z-10 text-[#0a0a0a] ${modalConfig.type === "error" ? "bg-red-500 hover:bg-red-400" : modalConfig.type === "success" ? "bg-green-500 hover:bg-green-400" : "bg-cyan-500 hover:bg-cyan-400"}`}
              >
                Am înțeles
              </button>
            </div>
          )}

          {/* Modal Confirmare Ștergere */}
          {activeModal === "delete" && (
            <div className="w-full max-w-md bg-[#050505]/95 backdrop-blur-2xl border border-red-500/30 p-8 sm:p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-red-500/20"></div>
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-red-500/10 rounded-full blur-[40px] pointer-events-none"></div>

              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6 border-4 border-red-500/20 text-red-400 shadow-inner relative z-10">
                <svg
                  className="w-8 h-8"
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

              <h2 className="text-2xl font-black text-white mb-2 text-center tracking-tight relative z-10">
                Atenție Maximă!
              </h2>
              <p className="text-red-400/90 text-sm mb-6 text-center font-bold relative z-10">
                Această acțiune este permanentă. Pentru a confirma, te rugăm să
                scrii cuvântul{" "}
                <span className="text-white bg-red-500/20 px-2 py-0.5 rounded">
                  STERGE
                </span>{" "}
                mai jos.
              </p>

              <input
                type="text"
                placeholder="Scrie STERGE aici..."
                value={deleteConfirmationText}
                onChange={(e) => setDeleteConfirmationText(e.target.value)}
                className="w-full bg-black/60 border border-red-500/30 focus:border-red-500 rounded-xl px-4 py-4 text-white text-center tracking-widest font-black outline-none transition-all shadow-inner mb-8 relative z-10"
              />

              <div className="flex gap-4 relative z-10">
                <button
                  onClick={() => setActiveModal("none")}
                  className="flex-1 py-4 rounded-xl bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 transition-all cursor-pointer"
                >
                  Anulează
                </button>
                <button
                  onClick={confirmDeleteAccount}
                  disabled={isDeleting || deleteConfirmationText !== "STERGE"}
                  className="flex-1 py-4 rounded-xl bg-red-500 text-[#0a0a0a] font-black hover:bg-red-400 transition-all cursor-pointer shadow-[0_0_20px_rgba(239,68,68,0.4)] disabled:opacity-30 disabled:shadow-none disabled:cursor-not-allowed"
                >
                  {isDeleting ? "Așteaptă..." : "Șterge Definitiv"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
