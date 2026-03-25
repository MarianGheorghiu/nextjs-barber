"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { toggleStatusAction } from "@/app/actions/adminBarberActions";

type ClientProfile = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  status: string;
  created_at: string;
  total_appointments?: number;
};

export default function ClientsListPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

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
    fetchClientsAndAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  // ================= REALTIME SYNC (Premium Touch) =================
  useEffect(() => {
    const supabase = createClient();

    // Ascultăm ambele tabele: profiluri (când cineva își face cont) și appointments (când cineva își face o programare ca să crească acel +1)
    const channel = supabase
      .channel("realtime-admin-clients-page")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => {
          fetchClientsAndAppointments(false);
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointments" },
        () => {
          fetchClientsAndAppointments(false);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchClientsAndAppointments = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, email, phone, status, created_at")
      .eq("role", "client")
      .order("created_at", { ascending: false });

    const { data: appointmentsData } = await supabase
      .from("appointments")
      .select("client_id");

    if (profilesData) {
      const appointmentCounts: Record<string, number> = {};
      if (appointmentsData) {
        appointmentsData.forEach((app) => {
          appointmentCounts[app.client_id] =
            (appointmentCounts[app.client_id] || 0) + 1;
        });
      }

      const enrichedClients = profilesData.map((client) => ({
        ...client,
        total_appointments: appointmentCounts[client.id] || 0,
      }));

      setClients(enrichedClients);
    }
    if (showLoader) setLoading(false);
  };

  const showAlert = (
    title: string,
    message: string,
    type: "success" | "error" | "info" = "info",
  ) => {
    setModalConfig({ title, message, type });
    setActiveModal("alert");
  };

  const triggerToggleStatus = (
    clientId: string,
    currentStatus: string,
    clientName: string,
  ) => {
    const newStatus = currentStatus === "suspended" ? "active" : "suspended";
    const isSuspending = newStatus === "suspended";

    setConfirmConfig({
      title: isSuspending ? "Suspendare Cont" : "Activare Cont",
      message: isSuspending
        ? `Atenție! Ești sigur că vrei să SUSPENZI clientul ${clientName}? Nu se va mai putea loga și nu va mai putea face programări.`
        : `Redai accesul pe platformă pentru clientul ${clientName}?`,
      buttonText: isSuspending ? "Suspendă Acum" : "Activează Contul",
      buttonColor: isSuspending ? "red" : "green",
      action: async () => {
        setIsProcessing(true);
        const result = await toggleStatusAction(clientId, newStatus);
        setIsProcessing(false);

        if (result.success) {
          setClients(
            clients.map((c) =>
              c.id === clientId ? { ...c, status: newStatus } : c,
            ),
          );
          setActiveModal("none");
          showAlert(
            "Succes",
            `Contul a fost ${isSuspending ? "suspendat" : "activat"} cu succes.`,
            "success",
          );
        } else {
          setActiveModal("none");
          showAlert(
            "Eroare",
            result.error || "A apărut o problemă la modificarea statusului.",
            "error",
          );
        }
      },
    });
    setActiveModal("confirm");
  };

  const totalClients = clients.length;
  const activeClients = clients.filter((c) => c.status !== "suspended").length;
  const suspendedClients = clients.filter(
    (c) => c.status === "suspended",
  ).length;

  const filteredClients = clients.filter((client) => {
    const searchString =
      `${client.first_name} ${client.last_name} ${client.email} ${client.phone}`.toLowerCase();
    return searchString.includes(searchTerm.toLowerCase());
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh]">
        <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mb-4 shadow-[0_0_15px_rgba(34,211,238,0.5)]"></div>
        <p className="text-cyan-400 font-medium animate-pulse uppercase tracking-widest text-xs">
          Se sincronizează baza de date a clienților...
        </p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in max-w-7xl mx-auto pb-10">
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-black text-white mb-2 tracking-tight">
          Bază Date Clienți
        </h1>
        <p className="text-slate-400 font-medium text-sm">
          Gestionează accesul clienților și monitorizează loialitatea acestora.
        </p>
      </div>

      {/* CARDURI STATISTICI COMPACTE LIQUID GLASS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        <div className="bg-cyan-500/10 border border-cyan-500/20 p-6 rounded-[2rem] flex items-center gap-5 relative overflow-hidden group shadow-lg">
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-cyan-500/20 rounded-full blur-[40px] transition-all pointer-events-none"></div>
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/30 group-hover:scale-110 transition-transform relative z-10 shadow-inner shrink-0">
            <svg
              className="w-7 h-7"
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
          <div className="relative z-10">
            <p className="text-cyan-400/80 text-xs font-black uppercase tracking-widest mb-1">
              Total Înregistrați
            </p>
            <p className="text-4xl font-black text-white">{totalClients}</p>
          </div>
        </div>

        <div className="bg-green-500/10 border border-green-500/20 p-6 rounded-[2rem] flex items-center gap-5 relative overflow-hidden group shadow-lg">
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-green-500/20 rounded-full blur-[40px] transition-all pointer-events-none"></div>
          <div className="w-14 h-14 rounded-2xl bg-green-500/10 text-green-400 flex items-center justify-center border border-green-500/30 group-hover:scale-110 transition-transform relative z-10 shadow-inner shrink-0">
            <svg
              className="w-7 h-7"
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
          <div className="relative z-10">
            <p className="text-green-400/80 text-xs font-black uppercase tracking-widest mb-1">
              Conturi Active
            </p>
            <p className="text-4xl font-black text-white">{activeClients}</p>
          </div>
        </div>

        <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-[2rem] flex items-center gap-5 relative overflow-hidden group shadow-lg">
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-red-500/20 rounded-full blur-[40px] transition-all pointer-events-none"></div>
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center border border-red-500/30 group-hover:scale-110 transition-transform relative z-10 shadow-inner shrink-0">
            <svg
              className="w-7 h-7"
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
          <div className="relative z-10">
            <p className="text-red-400/80 text-xs font-black uppercase tracking-widest mb-1">
              Suspendate / Ban
            </p>
            <p className="text-4xl font-black text-white">{suspendedClients}</p>
          </div>
        </div>
      </div>

      {/* CONTAINER TABEL LIQUID GLASS */}
      <div className="bg-white/5 backdrop-blur-2xl border border-white/20 rounded-[2.5rem] p-6 sm:p-8 relative overflow-hidden shadow-2xl flex flex-col">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500/40 via-purple-500/40 to-cyan-500/40"></div>

        {/* Header Tabel & Căutare */}
        <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10 shrink-0">
          <h3 className="text-xl font-black text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 text-cyan-400 shadow-inner">
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
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            Registru Clienți
            <span className="flex items-center gap-1.5 ml-2 text-[10px] text-green-400 uppercase tracking-widest font-bold bg-green-500/10 px-3 py-1.5 rounded-full border border-green-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>{" "}
              Live Sync
            </span>
          </h3>
          <div className="relative w-full sm:w-96">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg
                className="w-5 h-5 text-slate-400"
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
              placeholder="Caută nume, email, telefon..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-black/40 border border-white/10 focus:border-cyan-400 rounded-2xl pl-11 pr-4 py-3.5 text-white placeholder:text-slate-500 outline-none transition-all shadow-inner text-sm font-medium"
            />
          </div>
        </div>

        {/* Tabelul */}
        <div className="overflow-auto relative z-10 custom-scrollbar max-h-[600px] rounded-2xl border border-white/10 bg-black/20 shadow-inner">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="sticky top-0 z-20 bg-[#050505]/95 backdrop-blur-xl border-b border-white/20 shadow-sm">
              <tr className="text-slate-300 text-[10px] uppercase tracking-widest font-black">
                <th className="py-4 pl-6">Identitate & Contact</th>
                <th className="py-4 text-center">Programări</th>
                <th className="py-4">Istoric Cont</th>
                <th className="py-4 text-right pr-6">Acces Platformă</th>
              </tr>
            </thead>
            <tbody className="text-white text-base">
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-16 text-center">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10 text-slate-500 shadow-inner">
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
                          d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                        />
                      </svg>
                    </div>
                    <p className="text-white font-black text-xl tracking-tight mb-1">
                      Niciun rezultat.
                    </p>
                    <p className="text-sm text-slate-400 font-medium">
                      Nu am găsit niciun client care să corespundă căutării.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => {
                  const isActive = client.status !== "suspended";
                  const appointmentsCount = client.total_appointments ?? 0;
                  const hasAppointments = appointmentsCount > 0;

                  return (
                    <tr
                      key={client.id}
                      className={`border-b border-white/5 transition-colors group ${!isActive ? "opacity-60 bg-red-500/5 hover:bg-red-500/10" : "hover:bg-white/5"}`}
                    >
                      <td className="py-5 pl-6 align-middle">
                        <div className="flex items-center gap-4">
                          <div
                            className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl border shrink-0 shadow-inner transition-colors ${isActive ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30 group-hover:bg-cyan-500/20" : "bg-red-500/10 text-red-400 border-red-500/30"}`}
                          >
                            {client.first_name
                              ? client.first_name.charAt(0).toUpperCase()
                              : "?"}
                          </div>
                          <div>
                            <div className="font-black text-white text-lg tracking-tight mb-0.5 flex items-center gap-2">
                              {client.first_name} {client.last_name}
                              {!isActive && (
                                <span className="px-2 py-0.5 rounded-md bg-red-500/20 text-red-400 text-[10px] uppercase font-black border border-red-500/30 shadow-inner">
                                  Banat
                                </span>
                              )}
                            </div>
                            <p className="text-xs font-bold text-cyan-400 mb-0.5">
                              {client.email}
                            </p>
                            <p className="text-[10px] text-slate-500 font-mono font-bold tracking-widest">
                              📞 {client.phone || "Fără telefon"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-5 align-middle text-center">
                        <div className="inline-flex flex-col items-center bg-black/40 rounded-2xl py-2 px-6 border border-white/5 shadow-inner">
                          <span
                            className={`text-2xl font-black ${hasAppointments ? "text-cyan-400" : "text-slate-600"}`}
                          >
                            {appointmentsCount}
                          </span>
                          <span className="text-[10px] uppercase font-black text-slate-500 tracking-widest">
                            Vizite
                          </span>
                        </div>
                      </td>

                      <td className="py-5 align-middle">
                        <div className="flex items-center gap-2 text-sm text-slate-300 font-medium">
                          <svg
                            className="w-4 h-4 text-slate-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2.5"
                              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                          Din{" "}
                          {new Date(client.created_at).toLocaleDateString(
                            "ro-RO",
                            { month: "long", year: "numeric" },
                          )}
                        </div>
                      </td>

                      <td className="py-5 text-right pr-6 align-middle">
                        <button
                          onClick={() =>
                            triggerToggleStatus(
                              client.id,
                              client.status || "active",
                              `${client.first_name} ${client.last_name}`,
                            )
                          }
                          disabled={isProcessing}
                          className={`cursor-pointer px-5 py-2.5 rounded-xl transition-all text-xs font-black flex items-center justify-center gap-2 ml-auto shadow-sm disabled:opacity-50 border uppercase tracking-wider ${
                            isActive
                              ? "bg-white/5 text-slate-300 border-white/10 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30"
                              : "bg-green-500/10 text-green-400 border-green-500/30 hover:bg-green-500/20 hover:shadow-[0_0_15px_rgba(34,197,94,0.2)]"
                          }`}
                        >
                          {isActive ? (
                            <>
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
                              </svg>{" "}
                              Ban
                            </>
                          ) : (
                            <>
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
                              </svg>{" "}
                              Unban
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= MODALE CENTRALE ================= */}
      {/* Modal Alertă */}
      {activeModal === "alert" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
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
        </div>
      )}

      {/* Modal Confirmare Suspendare */}
      {activeModal === "confirm" && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in`}
        >
          <div
            className={`w-full max-w-sm bg-[#050505]/95 backdrop-blur-2xl border p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden ${confirmConfig.buttonColor === "red" ? "border-red-500/30" : "border-green-500/30"}`}
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-white/10"></div>
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 border-4 shadow-inner relative z-10 ${confirmConfig.buttonColor === "red" ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-green-500/10 border-green-500/20 text-green-400"}`}
            >
              {confirmConfig.buttonColor === "red" ? (
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
              ) : (
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
            </div>
            <h2 className="text-xl font-black text-white mb-2 text-center tracking-tight relative z-10">
              {confirmConfig.title}
            </h2>
            <p className="text-slate-300 text-sm mb-8 text-center font-medium leading-relaxed relative z-10">
              {confirmConfig.message}
            </p>
            <div className="flex gap-3 relative z-10">
              <button
                onClick={() => setActiveModal("none")}
                className="flex-1 py-3.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-sm font-bold hover:bg-white/10 transition-all cursor-pointer shadow-sm"
              >
                Renunță
              </button>
              <button
                onClick={confirmConfig.action}
                disabled={isProcessing}
                className={`flex-1 py-3.5 rounded-xl text-[#0a0a0a] text-sm font-black transition-all cursor-pointer disabled:opacity-50 shadow-lg ${confirmConfig.buttonColor === "red" ? "bg-red-500 hover:bg-red-400 shadow-[0_0_15px_rgba(239,68,68,0.4)]" : "bg-green-500 hover:bg-green-400 shadow-[0_0_15px_rgba(34,197,94,0.4)]"}`}
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
