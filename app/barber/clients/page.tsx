"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import {
  toggleClientStatusAction,
  deleteClientAction,
} from "@/app/actions/barberClientsActions";

type BarberClient = {
  id: string;
  name: string;
  phone: string;
  status: string;
};

export default function BarberClientsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<BarberClient[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [barberId, setBarberId] = useState<string | null>(null);

  // ================= MODAL STATES =================
  const [activeModal, setActiveModal] = useState<"none" | "alert" | "confirm">(
    "none",
  );
  const [modalConfig, setModalConfig] = useState({
    title: "",
    message: "",
    type: "info",
  });
  const [confirmConfig, setConfirmConfig] = useState({
    title: "",
    message: "",
    buttonText: "",
    buttonColor: "red",
    action: async () => {},
  });
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchClients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const fetchClients = async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }
    setBarberId(user.id);

    const { data, error } = await supabase
      .from("barber_clients")
      .select("*")
      .eq("barber_id", user.id)
      .order("name", { ascending: true });

    if (data && !error) setClients(data);
    setLoading(false);
  };

  const showAlert = (
    title: string,
    message: string,
    type: "success" | "error" | "info" = "info",
  ) => {
    setModalConfig({ title, message, type });
    setActiveModal("alert");
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "blocked" : "active";
    const actionText = newStatus === "blocked" ? "blocat" : "deblocat";

    setIsProcessing(true);
    const result = await toggleClientStatusAction(id, currentStatus);
    setIsProcessing(false);

    if (result.success) {
      setClients(
        clients.map((c) => (c.id === id ? { ...c, status: newStatus } : c)),
      );
      showAlert(
        "Succes",
        `Clientul a fost ${actionText} cu succes.`,
        "success",
      );
    } else {
      showAlert(
        "Eroare",
        result.error || "A apărut o problemă la modificarea statusului.",
        "error",
      );
    }
  };

  const handleDelete = (id: string, clientName: string) => {
    setConfirmConfig({
      title: "Ștergere Client",
      message: `Ești sigur că vrei să ștergi definitiv clientul "${clientName}" din agendă? Nu îi va afecta programările curente.`,
      buttonText: "Șterge Definitiv",
      buttonColor: "red",
      action: async () => {
        setIsProcessing(true);
        const result = await deleteClientAction(id);
        setIsProcessing(false);
        if (result.success) {
          setClients(clients.filter((c) => c.id !== id));
          setActiveModal("none");
        } else {
          setActiveModal("none");
          showAlert(
            "Eroare la ștergere",
            result.error || "Clientul nu a putut fi șters din sistem.",
            "error",
          );
        }
      },
    });
    setActiveModal("confirm");
  };

  // Logica de Căutare
  const filteredClients = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.phone && c.phone.includes(searchQuery)),
  );

  // Calcule pentru Panouri
  const totalClients = clients.length;
  const activeClients = clients.filter((c) => c.status === "active").length;
  const blockedClients = clients.filter((c) => c.status === "blocked").length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh]">
        <div className="w-10 h-10 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mb-4 shadow-[0_0_15px_rgba(34,211,238,0.5)]"></div>
        <p className="text-cyan-400 font-bold uppercase tracking-widest text-[10px] animate-pulse">
          Se citește agenda de clienți...
        </p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in max-w-6xl mx-auto pb-10 relative">
      {/* HEADER COMPACT */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-black text-white mb-1 tracking-tight">
          Clienții Mei
        </h1>
        <p className="text-slate-400 text-sm font-medium">
          Agenda ta permanentă. Clienții apar aici automat când le confirmi o
          programare.
        </p>
      </div>

      {/* 3 PANOURI STATISTICI LIQUID GLASS - COMPACTE */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Panou Total */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 p-5 rounded-2xl relative overflow-hidden group shadow-lg flex flex-col justify-center">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-cyan-500/10 rounded-full blur-[30px] pointer-events-none group-hover:bg-cyan-500/20 transition-all"></div>
          <div className="relative z-10 flex justify-between items-start mb-1">
            <h3 className="text-cyan-400/90 text-[10px] font-black uppercase tracking-widest">
              Total Agendă
            </h3>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 text-cyan-400 shadow-inner">
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
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            </div>
          </div>
          <div className="flex items-end gap-2 relative z-10">
            <span className="text-4xl font-black text-white leading-none">
              {totalClients}
            </span>
            <span className="text-slate-400 text-xs font-medium mb-0.5">
              clienți
            </span>
          </div>
        </div>

        {/* Panou Activi */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 p-5 rounded-2xl relative overflow-hidden group shadow-lg flex flex-col justify-center">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-green-500/10 rounded-full blur-[30px] pointer-events-none group-hover:bg-green-500/20 transition-all"></div>
          <div className="relative z-10 flex justify-between items-start mb-1">
            <h3 className="text-green-400/90 text-[10px] font-black uppercase tracking-widest">
              Activi
            </h3>
            <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center border border-green-500/20 text-green-400 shadow-inner">
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
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
          <div className="flex items-end gap-2 relative z-10">
            <span className="text-4xl font-black text-green-400 leading-none">
              {activeClients}
            </span>
            <span className="text-slate-400 text-xs font-medium mb-0.5">
              cu acces
            </span>
          </div>
        </div>

        {/* Panou Blocați */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 p-5 rounded-2xl relative overflow-hidden group shadow-lg flex flex-col justify-center">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-red-500/10 rounded-full blur-[30px] pointer-events-none group-hover:bg-red-500/20 transition-all"></div>
          <div className="relative z-10 flex justify-between items-start mb-1">
            <h3 className="text-red-400/90 text-[10px] font-black uppercase tracking-widest">
              Blocați (Banned)
            </h3>
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
                  strokeWidth="2.5"
                  d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                />
              </svg>
            </div>
          </div>
          <div className="flex items-end gap-2 relative z-10">
            <span className="text-4xl font-black text-red-400 leading-none">
              {blockedClients}
            </span>
            <span className="text-slate-400 text-xs font-medium mb-0.5">
              interziși
            </span>
          </div>
        </div>
      </div>

      {/* CONTAINER TABEL LIQUID GLASS PREMIUM */}
      <div className="bg-white/5 backdrop-blur-2xl border border-white/20 rounded-[2rem] p-6 shadow-2xl relative flex flex-col overflow-hidden">
        {/* Glow luminos fundal container tabel */}
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-cyan-500/40 via-purple-500/40 to-cyan-500/40"></div>
        <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-[80px] pointer-events-none"></div>

        {/* SEARCH BAR & TITLU */}
        <div className="mb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10 shrink-0">
          <h3 className="text-lg font-black text-white flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 text-cyan-400 shadow-inner shrink-0">
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
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            Registru
          </h3>
          <div className="relative w-full sm:w-80">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <svg
                className="w-4 h-4 text-cyan-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Caută client sau număr..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black/40 border border-white/10 focus:border-cyan-400 rounded-xl pl-9 pr-4 py-2.5 text-white outline-none transition-all shadow-inner placeholder:text-slate-500 font-medium text-sm"
            />
          </div>
        </div>

        {clients.length === 0 ? (
          <div className="text-center py-10 relative z-10">
            <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3 border border-white/10 text-slate-500 shadow-inner">
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            </div>
            <p className="text-white font-black text-xl tracking-tight mb-1">
              Agenda ta este goală.
            </p>
            <p className="text-xs text-slate-400 font-medium">
              Apasă pe butonul "Confirmă" de la prima ta programare, iar datele
              clientului vor fi salvate automat aici.
            </p>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="text-center py-8 text-slate-400 font-medium italic relative z-10 text-sm">
            Nu a fost găsit niciun client conform căutării.
          </div>
        ) : (
          <div className="overflow-auto custom-scrollbar max-h-[500px] rounded-xl border border-white/10 bg-black/20 relative z-10 shadow-inner">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead className="sticky top-0 z-20 bg-[#0a0a0a]/95 backdrop-blur-md border-b border-white/20 shadow-sm">
                <tr className="text-slate-300 text-[10px] uppercase tracking-widest font-black">
                  <th className="py-3 pl-4">Nume Client</th>
                  <th className="py-3">Telefon Contact</th>
                  <th className="py-3 text-center">Status Cont</th>
                  <th className="py-3 text-right pr-4">Acțiuni Operative</th>
                </tr>
              </thead>
              <tbody className="text-white text-sm">
                {filteredClients.map((client) => {
                  const isActive = client.status === "active";

                  return (
                    <tr
                      key={client.id}
                      className={`border-b border-white/5 transition-colors group ${!isActive ? "bg-red-500/[0.02] hover:bg-red-500/[0.04]" : "hover:bg-white/5"}`}
                    >
                      {/* Nume */}
                      <td className="py-4 pl-4 align-middle">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-base border shrink-0 shadow-inner ${isActive ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30" : "bg-red-500/10 text-red-400 border-red-500/30"}`}
                          >
                            {client.name
                              ? client.name.charAt(0).toUpperCase()
                              : "?"}
                          </div>
                          <p
                            className={`font-black text-base tracking-tight ${!isActive ? "text-red-400" : "text-white"}`}
                          >
                            {client.name}
                          </p>
                        </div>
                      </td>

                      {/* Telefon */}
                      <td className="py-4 align-middle font-mono font-bold text-cyan-400">
                        {client.phone || "Lipsă"}
                      </td>

                      {/* Status */}
                      <td className="py-4 text-center align-middle">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-500/10 text-green-400 border border-green-500/30 text-[10px] font-black uppercase tracking-wider shadow-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_8px_rgba(34,197,94,0.8)]"></span>
                            Activ
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 text-[10px] font-black uppercase tracking-wider shadow-[0_0_10px_rgba(239,68,68,0.1)]">
                            <span className="text-[10px] leading-none">🚫</span>{" "}
                            Interzis
                          </span>
                        )}
                      </td>

                      {/* Acțiuni */}
                      <td className="py-4 text-right pr-4 align-middle">
                        <div className="flex justify-end gap-2 items-center">
                          <button
                            onClick={() =>
                              handleToggleStatus(client.id, client.status)
                            }
                            disabled={isProcessing}
                            className={`cursor-pointer px-4 py-2 rounded-lg transition-all text-[10px] font-black flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 border uppercase tracking-wider ${isActive ? "bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border-orange-500/30 hover:border-orange-500/50" : "bg-green-500/10 hover:bg-green-500/20 text-green-400 border-green-500/30 hover:border-green-500/50"}`}
                            title={
                              isActive
                                ? "Blochează Clientul"
                                : "Deblochează Clientul"
                            }
                          >
                            {isActive ? (
                              <>
                                🚫 <span className="hidden sm:inline">Ban</span>
                              </>
                            ) : (
                              <>
                                ✅{" "}
                                <span className="hidden sm:inline">Unban</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => handleDelete(client.id, client.name)}
                            disabled={isProcessing}
                            className="cursor-pointer w-8 h-8 rounded-lg bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-white/10 hover:border-red-500/30 transition-all flex items-center justify-center shadow-sm disabled:opacity-50"
                            title="Șterge din agendă"
                          >
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
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ================= MODALE CENTRALE ================= */}
      {/* Modal Alertă (Success/Error) */}
      {activeModal === "alert" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div
            className={`w-full max-w-xs bg-[#050505]/95 backdrop-blur-xl border p-6 rounded-2xl shadow-2xl relative overflow-hidden ${modalConfig.type === "error" ? "border-red-500/30" : modalConfig.type === "success" ? "border-green-500/30" : "border-cyan-500/30"}`}
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
            <p className="text-slate-300 text-xs mb-6 text-center font-medium leading-relaxed relative z-10">
              {modalConfig.message}
            </p>
            <button
              onClick={() => setActiveModal("none")}
              className={`w-full py-2.5 rounded-xl font-black transition-all cursor-pointer shadow-md relative z-10 text-[#0a0a0a] text-xs ${modalConfig.type === "error" ? "bg-red-500 hover:bg-red-400" : modalConfig.type === "success" ? "bg-green-500 hover:bg-green-400" : "bg-cyan-500 hover:bg-cyan-400"}`}
            >
              Am înțeles
            </button>
          </div>
        </div>
      )}

      {/* Modal Confirmare Ștergere */}
      {activeModal === "confirm" && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in`}
        >
          <div
            className={`w-full max-w-xs bg-[#050505]/95 backdrop-blur-xl border p-6 rounded-2xl shadow-2xl relative overflow-hidden ${confirmConfig.buttonColor === "red" ? "border-red-500/30" : "border-cyan-500/30"}`}
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-white/10"></div>
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 border-2 shadow-inner relative z-10 ${confirmConfig.buttonColor === "red" ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-cyan-500/10 border-cyan-500/20 text-cyan-400"}`}
            >
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
            <h2 className="text-lg font-black text-white mb-2 text-center tracking-tight relative z-10">
              {confirmConfig.title}
            </h2>
            <p className="text-slate-300 text-xs mb-6 text-center font-medium leading-relaxed relative z-10">
              {confirmConfig.message}
            </p>
            <div className="flex gap-2 relative z-10">
              <button
                onClick={() => setActiveModal("none")}
                className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-xs font-bold hover:bg-white/10 transition-all cursor-pointer shadow-sm"
              >
                Renunță
              </button>
              <button
                onClick={confirmConfig.action}
                disabled={isProcessing}
                className={`flex-1 py-2.5 rounded-xl text-[#0a0a0a] text-xs font-black transition-all cursor-pointer disabled:opacity-50 shadow-md ${confirmConfig.buttonColor === "red" ? "bg-red-500 hover:bg-red-400" : "bg-cyan-500 hover:bg-cyan-400"}`}
              >
                {isProcessing ? "..." : confirmConfig.buttonText}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
