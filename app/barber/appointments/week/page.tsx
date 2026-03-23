"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import {
  updateAppointmentStatusAction,
  rescheduleAppointmentAction,
  createMockAppointmentAction,
  deleteAppointmentAction,
  cleanupPastAppointmentsAction,
} from "@/app/actions/appointmentActions";

type Appointment = {
  id: string;
  client_name: string;
  client_phone: string;
  service_name: string;
  price: number;
  appointment_date: string;
  appointment_time: string;
  status: string;
};

const generateNextDays = () => {
  const days = [];
  const today = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const dateValue = d.toISOString().split("T")[0];
    const dateLabel = d.toLocaleDateString("ro-RO", {
      weekday: "long",
      day: "numeric",
      month: "short",
    });
    const capitalizedLabel =
      dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1);
    days.push({
      value: dateValue,
      label:
        i === 0
          ? `Azi (${capitalizedLabel})`
          : i === 1
            ? `Mâine (${capitalizedLabel})`
            : capitalizedLabel,
    });
  }
  return days;
};

const generateTimeSlots = () => {
  const times = [];
  for (let h = 9; h <= 20; h++) {
    const hour = h.toString().padStart(2, "0");
    times.push(`${hour}:00`);
    times.push(`${hour}:30`);
  }
  return times;
};

const NEXT_DAYS = generateNextDays();
const TIME_SLOTS = generateTimeSlots();

export default function WeeklyAppointmentsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [barberId, setBarberId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [rescheduleData, setRescheduleData] = useState<{
    id: string;
    date: string;
    time: string;
    name: string;
  } | null>(null);

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
    buttonColor: "cyan",
    action: async () => {},
  });
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const initPage = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }
      setBarberId(user.id);

      await cleanupPastAppointmentsAction(user.id);
      await fetchAppointments(user.id);
    };

    initPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const fetchAppointments = async (id: string) => {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("appointments")
      .select("*")
      .eq("barber_id", id)
      .order("appointment_date", { ascending: true })
      .order("appointment_time", { ascending: true });

    if (data && !error) setAppointments(data);
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

  const handleStatusChange = async (id: string, newStatus: string) => {
    const result = await updateAppointmentStatusAction(id, newStatus);
    if (result.success) {
      setAppointments(
        appointments.map((app) =>
          app.id === id ? { ...app, status: newStatus } : app,
        ),
      );
    } else showAlert("Eroare", result.error || "Acțiunea a eșuat.", "error");
  };

  const submitReschedule = async () => {
    if (!rescheduleData || !barberId) return;
    setIsProcessing(true);
    const result = await rescheduleAppointmentAction(
      rescheduleData.id,
      rescheduleData.date,
      rescheduleData.time,
    );
    setIsProcessing(false);

    if (result.success) {
      setRescheduleData(null);
      fetchAppointments(barberId);
      showAlert(
        "Reprogramare Trimisă",
        `O cerere de reprogramare a fost trimisă către ${rescheduleData.name}. Programarea este în așteptare până la validare.`,
        "success",
      );
    } else {
      showAlert(
        "Eroare",
        result.error || "Nu s-a putut trimite cererea.",
        "error",
      );
    }
  };

  const triggerDelete = (id: string, name: string) => {
    setConfirmConfig({
      title: "Ștergere Definitivă",
      message: `Ești sigur că vrei să ștergi definitiv programarea anulată pentru ${name}? Nu va mai apărea în listă.`,
      buttonText: "Șterge Acum",
      buttonColor: "red",
      action: async () => {
        setIsProcessing(true);
        const result = await deleteAppointmentAction(id);
        setIsProcessing(false);
        if (result.success) {
          setAppointments(appointments.filter((app) => app.id !== id));
          setActiveModal("none");
        } else {
          setActiveModal("none");
          showAlert(
            "Eroare",
            result.error || "Programarea nu a putut fi ștearsă.",
            "error",
          );
        }
      },
    });
    setActiveModal("confirm");
  };

  const generateTestAppointment = async () => {
    if (!barberId) return;
    setIsProcessing(true);
    await createMockAppointmentAction(barberId);
    await fetchAppointments(barberId);
    setIsProcessing(false);
    showAlert(
      "Succes",
      "Un client de test a fost generat în agendă.",
      "success",
    );
  };

  const filteredAppointments = appointments.filter((app) => {
    const searchString =
      `${app.client_name} ${app.client_phone} ${app.service_name}`.toLowerCase();
    return searchString.includes(searchTerm.toLowerCase());
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh]">
        <div className="w-10 h-10 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mb-4 shadow-[0_0_15px_rgba(34,211,238,0.5)]"></div>
        <p className="text-cyan-400 font-bold uppercase tracking-widest text-[10px] animate-pulse">
          Sincronizare agendă...
        </p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in max-w-7xl mx-auto pb-10 relative">
      {/* HEADER SPAȚIOS & BUTON TEST */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-8">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-white mb-2 tracking-tight">
            Programări Viitoare
          </h1>
          <p className="text-slate-400 text-sm font-medium">
            Vizualizează și gestionează toată agenda ta viitoare.
          </p>
        </div>
        <button
          onClick={generateTestAppointment}
          disabled={isProcessing}
          className="cursor-pointer bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 font-black px-6 py-3.5 rounded-xl transition-all text-sm uppercase tracking-wider flex items-center gap-2 shadow-inner disabled:opacity-50"
        >
          {isProcessing ? "Așteaptă..." : "+ Client de Test"}
        </button>
      </div>

      {/* TABEL LIQUID GLASS PREMIUM */}
      <div className="bg-white/5 backdrop-blur-2xl border border-white/20 rounded-[2.5rem] p-6 sm:p-8 shadow-2xl relative overflow-hidden flex flex-col">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500/40 via-purple-500/40 to-cyan-500/40"></div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none"></div>

        {/* BARA CĂUTARE & TITLU */}
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0 relative z-10">
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
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            Registru Agendă
          </h3>
          <div className="relative w-full sm:w-80">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
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
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Caută client, telefon, serviciu..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-black/40 border border-white/10 focus:border-cyan-400 rounded-2xl pl-11 pr-4 py-3.5 text-white outline-none transition-all shadow-inner placeholder:text-slate-400 text-sm font-medium"
            />
          </div>
        </div>

        {appointments.length === 0 ? (
          <div className="text-center py-16 relative z-10">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10 text-3xl shadow-inner">
              📅
            </div>
            <p className="text-white font-black text-2xl mb-1 tracking-tight">
              Agenda este perfect curată.
            </p>
            <p className="text-sm text-slate-400 font-medium">
              Apasă pe butonul de test de mai sus pentru a genera o programare.
            </p>
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className="text-center py-12 text-slate-400 font-medium italic relative z-10">
            Nu a fost găsită nicio programare care să corespundă căutării.
          </div>
        ) : (
          <div className="overflow-auto custom-scrollbar max-h-[600px] rounded-2xl border border-white/10 bg-black/20 relative z-10 shadow-inner">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead className="sticky top-0 z-20 bg-[#050505]/95 backdrop-blur-2xl border-b border-white/20 shadow-md">
                <tr className="text-slate-300 text-[10px] uppercase tracking-widest font-black">
                  <th className="py-4 pl-6">Client & Contact</th>
                  <th className="py-4">Dată & Oră</th>
                  <th className="py-4">Serviciu</th>
                  <th className="py-4 text-center">Status</th>
                  <th className="py-4 text-right pr-6">Acțiuni Operative</th>
                </tr>
              </thead>
              <tbody className="text-white text-base">
                {filteredAppointments.map((app) => {
                  const isPending = app.status === "pending";
                  const isConfirmed = app.status === "confirmed";
                  const isCancelled = app.status === "cancelled";
                  const isRescheduled = app.status === "rescheduled";

                  return (
                    <tr
                      key={app.id}
                      className={`border-b border-white/5 transition-colors group ${isCancelled ? "bg-white/[0.02] opacity-70" : "hover:bg-white/5"}`}
                    >
                      {rescheduleData?.id === app.id ? (
                        /* ================= INLINE RESCHEDULE UI ================= */
                        <td colSpan={5} className="p-0">
                          <div className="bg-[#001a2c]/80 backdrop-blur-xl p-6 sm:p-8 border-y border-cyan-500/40 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 w-full animate-fade-in shadow-inner">
                            <div>
                              <p className="text-[10px] font-black text-cyan-400 uppercase tracking-widest mb-1">
                                Reprogramare
                              </p>
                              <p className="text-white font-black text-xl tracking-tight">
                                {app.client_name}
                              </p>
                            </div>

                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full lg:w-auto">
                              <div className="relative">
                                <select
                                  value={rescheduleData.date}
                                  onChange={(e) =>
                                    setRescheduleData({
                                      ...rescheduleData,
                                      date: e.target.value,
                                    })
                                  }
                                  className="w-full sm:w-auto bg-black/60 border border-cyan-500/30 rounded-xl pl-4 pr-10 py-3.5 text-white outline-none focus:border-cyan-400 cursor-pointer appearance-none font-medium transition-colors shadow-inner"
                                >
                                  {NEXT_DAYS.map((d) => (
                                    <option
                                      key={`date-${d.value}`}
                                      value={d.value}
                                      className="bg-[#050505]"
                                    >
                                      {d.label}
                                    </option>
                                  ))}
                                </select>
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-cyan-500/50 pointer-events-none text-xs">
                                  ▼
                                </span>
                              </div>

                              <div className="relative">
                                <select
                                  value={rescheduleData.time}
                                  onChange={(e) =>
                                    setRescheduleData({
                                      ...rescheduleData,
                                      time: e.target.value,
                                    })
                                  }
                                  className="w-full sm:w-auto bg-black/60 border border-cyan-500/30 rounded-xl pl-4 pr-10 py-3.5 text-cyan-400 outline-none focus:border-cyan-400 cursor-pointer appearance-none font-mono font-bold transition-colors shadow-inner"
                                >
                                  {TIME_SLOTS.map((t) => (
                                    <option
                                      key={`time-${t}`}
                                      value={t}
                                      className="bg-[#050505]"
                                    >
                                      {t}
                                    </option>
                                  ))}
                                </select>
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-cyan-500/50 pointer-events-none text-xs">
                                  ▼
                                </span>
                              </div>

                              <div className="flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                                <button
                                  onClick={submitReschedule}
                                  disabled={isProcessing}
                                  className="flex-1 sm:flex-none cursor-pointer bg-cyan-500 hover:bg-cyan-400 text-[#000428] font-black px-6 py-3.5 rounded-xl transition-all shadow-[0_0_15px_rgba(34,211,238,0.3)] disabled:opacity-50"
                                >
                                  {isProcessing ? "..." : "Propune Ora"}
                                </button>
                                <button
                                  onClick={() => setRescheduleData(null)}
                                  className="flex-1 sm:flex-none cursor-pointer bg-white/5 hover:bg-red-500/10 text-slate-300 hover:text-red-400 border border-white/10 hover:border-red-500/30 font-bold px-6 py-3.5 rounded-xl transition-all shadow-sm"
                                >
                                  Renunță
                                </button>
                              </div>
                            </div>
                          </div>
                        </td>
                      ) : (
                        /* ================= NORMAL ROW UI ================= */
                        <>
                          <td className="py-6 pl-6 align-middle">
                            <p
                              className={`font-black text-lg tracking-tight mb-0.5 ${isCancelled ? "text-slate-400 line-through decoration-slate-500" : "text-white"}`}
                            >
                              {app.client_name}
                            </p>
                            <p className="text-xs text-slate-400 font-mono font-bold">
                              📞 {app.client_phone || "Fără telefon"}
                            </p>
                          </td>

                          <td className="py-6 align-middle">
                            <p
                              className={`font-bold capitalize text-base mb-0.5 ${isCancelled ? "text-slate-500" : "text-white"}`}
                            >
                              {new Date(
                                app.appointment_date,
                              ).toLocaleDateString("ro-RO", {
                                weekday: "long",
                                day: "numeric",
                                month: "short",
                              })}
                            </p>
                            <p
                              className={`text-sm font-black flex items-center gap-1.5 ${isCancelled ? "text-slate-600" : "text-cyan-400"}`}
                            >
                              <svg
                                className="w-4 h-4 opacity-70"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2.5"
                                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                              {app.appointment_time.slice(0, 5)}
                            </p>
                          </td>

                          <td className="py-6 align-middle">
                            <p
                              className={`font-bold text-base tracking-tight mb-0.5 ${isCancelled ? "text-slate-500" : "text-slate-200"}`}
                            >
                              {app.service_name}
                            </p>
                            <p
                              className={`text-xs font-black ${isCancelled ? "text-slate-600" : "text-cyan-400/80"}`}
                            >
                              {app.price} RON
                            </p>
                          </td>

                          <td className="py-6 text-center align-middle">
                            {isPending && (
                              <span className="inline-flex px-3 py-1.5 rounded-xl bg-yellow-500/10 text-yellow-400 text-[10px] font-bold uppercase tracking-widest border border-yellow-500/20 animate-pulse shadow-inner">
                                În Așteptare
                              </span>
                            )}
                            {isConfirmed && (
                              <span className="inline-flex px-3 py-1.5 rounded-xl bg-green-500/10 text-green-400 text-[10px] font-bold uppercase tracking-widest border border-green-500/20 shadow-inner">
                                Confirmat
                              </span>
                            )}
                            {isRescheduled && (
                              <span className="inline-flex px-3 py-1.5 rounded-xl bg-orange-500/10 text-orange-400 text-[10px] font-bold uppercase tracking-widest border border-orange-500/20 shadow-inner">
                                Se Negociază
                              </span>
                            )}
                            {isCancelled && (
                              <span className="inline-flex px-3 py-1.5 rounded-xl bg-red-500/5 text-red-500/50 text-[10px] font-bold uppercase tracking-widest border border-red-500/10">
                                Anulat
                              </span>
                            )}
                          </td>

                          <td className="py-6 text-right pr-6 align-middle">
                            <div className="flex justify-end gap-2 items-center">
                              {!isConfirmed &&
                                !isCancelled &&
                                !isRescheduled && (
                                  <button
                                    onClick={() =>
                                      handleStatusChange(app.id, "confirmed")
                                    }
                                    className="cursor-pointer px-4 py-2 rounded-xl bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/30 transition-all text-xs font-bold shadow-sm hover:shadow-[0_0_15px_rgba(34,197,94,0.2)]"
                                  >
                                    ✓ Confirmă
                                  </button>
                                )}

                              {!isCancelled && !isRescheduled && (
                                <button
                                  onClick={() =>
                                    setRescheduleData({
                                      id: app.id,
                                      date: app.appointment_date,
                                      time: app.appointment_time.slice(0, 5),
                                      name: app.client_name,
                                    })
                                  }
                                  className="cursor-pointer px-4 py-2 rounded-xl bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 transition-all text-xs font-bold shadow-sm hover:shadow-[0_0_15px_rgba(234,179,8,0.2)]"
                                >
                                  ↻ Reprogramează
                                </button>
                              )}

                              {isRescheduled && (
                                <span className="px-4 py-2 text-orange-400/80 text-xs font-bold italic">
                                  Așteaptă Răspuns
                                </span>
                              )}

                              {!isCancelled && (
                                <button
                                  onClick={() =>
                                    handleStatusChange(app.id, "cancelled")
                                  }
                                  className="cursor-pointer px-4 py-2 rounded-xl bg-white/5 hover:bg-red-500/10 text-slate-400 hover:text-red-400 border border-white/10 hover:border-red-500/30 transition-all text-xs font-bold shadow-sm"
                                >
                                  ✕ Anulează
                                </button>
                              )}

                              {isCancelled && (
                                <button
                                  onClick={() =>
                                    triggerDelete(app.id, app.client_name)
                                  }
                                  className="cursor-pointer px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-all text-xs font-bold shadow-sm hover:shadow-[0_0_15px_rgba(239,68,68,0.2)] flex items-center gap-1.5"
                                >
                                  <svg
                                    className="w-3.5 h-3.5"
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
                                  Șterge Definitiv
                                </button>
                              )}
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
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

      {/* Modal Confirmare (Ștergere Definitivă) */}
      {activeModal === "confirm" && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in`}
        >
          <div
            className={`w-full max-w-sm bg-[#050505]/95 backdrop-blur-2xl border p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden ${confirmConfig.buttonColor === "red" ? "border-red-500/30" : "border-cyan-500/30"}`}
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-white/10"></div>
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 border-4 shadow-inner relative z-10 ${confirmConfig.buttonColor === "red" ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-cyan-500/10 border-cyan-500/20 text-cyan-400"}`}
            >
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
                className={`flex-1 py-3.5 rounded-xl text-[#0a0a0a] text-sm font-black transition-all cursor-pointer disabled:opacity-50 shadow-lg ${confirmConfig.buttonColor === "red" ? "bg-red-500 hover:bg-red-400 shadow-[0_0_15px_rgba(239,68,68,0.4)]" : "bg-cyan-500 hover:bg-cyan-400"}`}
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
