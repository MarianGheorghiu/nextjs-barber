"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import {
  updateAppointmentStatusAction,
  rescheduleAppointmentAction,
} from "@/app/actions/appointmentActions";
import {
  addCustomDayOffAction,
  removeCustomDayOffAction,
} from "@/app/actions/barberScheduleActions";

type Appointment = {
  id: string;
  client_name: string;
  client_phone: string;
  service_name: string;
  price: number;
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
      weekday: "short",
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

export default function BarberDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [barberId, setBarberId] = useState<string | null>(null);
  const [barberName, setBarberName] = useState("");

  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
  const [nextAppointment, setNextAppointment] = useState<Appointment | null>(
    null,
  );
  const [blockedDays, setBlockedDays] = useState<string[]>([]);

  // ================= MODAL STATES =================
  const [rescheduleData, setRescheduleData] = useState<{
    id: string;
    date: string;
    time: string;
    name: string;
  } | null>(null);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveDate, setLeaveDate] = useState("");
  const [calendarViewDate, setCalendarViewDate] = useState(new Date());

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    buttonText: string;
    buttonColor: "red" | "cyan" | "orange";
    action: () => Promise<void>;
  }>({
    isOpen: false,
    title: "",
    message: "",
    buttonText: "",
    buttonColor: "cyan",
    action: async () => {},
  });

  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  // ================= REALTIME SYNC (Corectat) =================
  useEffect(() => {
    if (!barberId) return;

    const supabase = createClient();
    const channel = supabase
      .channel("realtime-barber-dashboard")
      .on(
        "postgres_changes",
        // Ascultăm tot tabelul ca să meargă perfect UPDATE și DELETE
        { event: "*", schema: "public", table: "appointments" },
        () => {
          fetchDashboardData(false);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [barberId]);

  const fetchDashboardData = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }
    setBarberId(user.id);

    const { data: profile } = await supabase
      .from("profiles")
      .select("first_name")
      .eq("id", user.id)
      .single();
    if (profile) setBarberName(profile.first_name);

    const todayStr = new Date().toISOString().split("T")[0];

    const { data: settings } = await supabase
      .from("barber_settings")
      .select("custom_days_off")
      .eq("barber_id", user.id)
      .maybeSingle();

    if (settings && settings.custom_days_off) {
      const futureBlocked = settings.custom_days_off
        .filter((d: string) => d >= todayStr)
        .sort();
      setBlockedDays(futureBlocked);
    } else {
      setBlockedDays([]);
    }

    const { data: apps } = await supabase
      .from("appointments")
      .select("*")
      .eq("barber_id", user.id)
      .eq("appointment_date", todayStr)
      .order("appointment_time", { ascending: true });

    if (apps) {
      setTodayAppointments(apps);
      const nowTime = new Date().toTimeString().slice(0, 5);
      const upcoming = apps.find(
        (a) =>
          a.appointment_time.slice(0, 5) >= nowTime && a.status !== "cancelled",
      );
      setNextAppointment(upcoming || null);
    }
    if (showLoader) setLoading(false);
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    const result = await updateAppointmentStatusAction(id, newStatus);
    if (result.success) {
      setTodayAppointments(
        todayAppointments.map((app) =>
          app.id === id ? { ...app, status: newStatus } : app,
        ),
      );
    }
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
      fetchDashboardData();
    }
  };

  const triggerTakeLeave = () => {
    if (!leaveDate || !barberId) return;
    setConfirmModal({
      isOpen: true,
      title: "Confirmare Zi Liberă",
      message: `Blochezi data de ${new Date(leaveDate).toLocaleDateString("ro-RO")}? Orice programare existentă în această zi va fi ștearsă automat!`,
      buttonText: "Blochează Ziua",
      buttonColor: "orange",
      action: async () => {
        setIsProcessing(true);
        const result = await addCustomDayOffAction(barberId, leaveDate);
        setIsProcessing(false);
        if (result.success) {
          setShowLeaveModal(false);
          setLeaveDate("");
          fetchDashboardData();
        }
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const triggerRemoveLeave = (dateStr: string) => {
    if (!barberId) return;
    setConfirmModal({
      isOpen: true,
      title: "Deblocare Zi",
      message: `Vrei să redeschizi data de ${new Date(dateStr).toLocaleDateString("ro-RO")} pentru programări noi?`,
      buttonText: "Deblochează",
      buttonColor: "cyan",
      action: async () => {
        setIsProcessing(true);
        const result = await removeCustomDayOffAction(barberId, dateStr);
        setIsProcessing(false);
        if (result.success) fetchDashboardData();
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const triggerDeleteAppointment = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Ștergere Definitivă",
      message:
        "Ești sigur că vrei să ștergi această programare? Acțiunea nu poate fi anulată și va dispărea din istoric.",
      buttonText: "Șterge Acum",
      buttonColor: "red",
      action: async () => {
        setIsProcessing(true);
        const { deleteAppointmentAction } =
          await import("@/app/actions/appointmentActions");
        await deleteAppointmentAction(id);
        setIsProcessing(false);
        fetchDashboardData();
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const viewYear = calendarViewDate.getFullYear();
  const viewMonth = calendarViewDate.getMonth();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();
  const startDay = firstDayIndex === 0 ? 6 : firstDayIndex - 1;
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanksArray = Array.from({ length: startDay }, (_, i) => i);
  const monthNames = [
    "Ianuarie",
    "Februarie",
    "Martie",
    "Aprilie",
    "Mai",
    "Iunie",
    "Iulie",
    "August",
    "Septembrie",
    "Octombrie",
    "Noiembrie",
    "Decembrie",
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh]">
        <div className="w-10 h-10 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mb-4 shadow-[0_0_15px_rgba(34,211,238,0.5)]"></div>
        <p className="text-cyan-400 font-bold uppercase tracking-widest text-[10px] animate-pulse">
          Se încarcă agenda...
        </p>
      </div>
    );
  }

  const activeTodayCount = todayAppointments.filter(
    (a) => a.status !== "cancelled",
  ).length;

  return (
    <div className="animate-fade-in max-w-6xl mx-auto pb-10 relative">
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-black text-white mb-1 tracking-tight">
          Salutare,{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
            {barberName || "Frizer"}
          </span>
          ! ✂️
        </h1>
        <p className="text-slate-400 font-medium">
          Iată situația ta pentru{" "}
          {new Date().toLocaleDateString("ro-RO", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
          . Statusul se actualizează Live.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        <div className="bg-white/5 backdrop-blur-xl border border-white/20 p-6 rounded-[2rem] relative overflow-hidden group shadow-xl flex flex-col justify-center">
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-cyan-500/10 rounded-full blur-[40px] transition-all pointer-events-none group-hover:bg-cyan-500/20"></div>
          <p className="text-cyan-400/90 text-[10px] font-black uppercase tracking-widest mb-2 relative z-10">
            Programări Azi
          </p>
          <div className="flex items-end gap-3 relative z-10">
            <span className="text-5xl font-black text-white leading-none">
              {activeTodayCount}
            </span>
            <span className="text-slate-300 text-sm font-medium mb-1">
              clienți activi
            </span>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/20 p-6 rounded-[2rem] relative overflow-hidden flex flex-col justify-center shadow-xl group">
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-purple-500/10 rounded-full blur-[40px] transition-all pointer-events-none group-hover:bg-purple-500/20"></div>
          <p className="text-purple-400/90 text-[10px] font-black uppercase tracking-widest mb-3 relative z-10">
            Următorul Client
          </p>
          {nextAppointment ? (
            <div className="relative z-10">
              <p className="text-xl font-bold text-white leading-tight mb-2 line-clamp-1">
                {nextAppointment.client_name}
              </p>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-purple-400 font-bold bg-purple-500/10 border border-purple-500/30 px-2.5 py-1 rounded-lg text-xs shadow-inner">
                  {nextAppointment.appointment_time.slice(0, 5)}
                </span>
                <span className="text-slate-300 font-medium text-xs line-clamp-1">
                  {nextAppointment.service_name}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-slate-400 italic text-sm relative z-10">
              Nu mai ai clienți programați.
            </p>
          )}
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/20 p-6 rounded-[2rem] relative overflow-hidden flex flex-col justify-between shadow-xl group">
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-orange-500/10 rounded-full blur-[40px] transition-all pointer-events-none group-hover:bg-orange-500/20"></div>
          <div className="relative z-10">
            <p className="text-orange-400/90 text-[10px] font-black uppercase tracking-widest mb-3">
              Zile Libere / Concediu
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              {blockedDays.length === 0 ? (
                <span className="text-sm text-slate-400 font-medium">
                  Nicio zi liberă setată.
                </span>
              ) : (
                blockedDays.map((date) => (
                  <div
                    key={date}
                    className="flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-bold px-2.5 py-1.5 rounded-lg shadow-inner"
                  >
                    {new Date(date).toLocaleDateString("ro-RO", {
                      day: "numeric",
                      month: "short",
                    })}
                    <button
                      onClick={() => triggerRemoveLeave(date)}
                      className="ml-1 text-orange-400 hover:text-white transition-colors cursor-pointer"
                      title="Deblochează ziua"
                    >
                      ✕
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
          <button
            onClick={() => setShowLeaveModal(true)}
            className="cursor-pointer mt-auto w-full bg-white/5 hover:bg-white/10 text-white text-sm font-bold py-3 rounded-xl transition-all border border-white/10 flex items-center justify-center gap-2 shadow-sm relative z-10"
          >
            <svg
              className="w-4 h-4 text-orange-400"
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
            Programează Concediu
          </button>
        </div>
      </div>

      <div className="bg-white/5 backdrop-blur-2xl border border-white/20 rounded-[2.5rem] p-6 sm:p-8 shadow-2xl relative overflow-hidden flex flex-col">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500/40 via-purple-500/40 to-cyan-500/40"></div>

        <h3 className="text-xl font-black text-white mb-6 flex items-center gap-3 relative z-10">
          <span className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 text-cyan-400 shadow-inner">
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
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </span>
          Agenda Zilei Curente
          {/* Corectat Hydration Error (div -> span) */}
          <span className="flex items-center gap-1.5 ml-auto text-[10px] text-green-400 uppercase tracking-widest font-bold bg-green-500/10 px-3 py-1.5 rounded-full border border-green-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
            Live Sync
          </span>
        </h3>

        {todayAppointments.length === 0 ? (
          <div className="text-center py-16 relative z-10">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10 text-3xl shadow-inner">
              ☕
            </div>
            <p className="text-white font-bold text-xl mb-1">
              Ai zi liberă momentan.
            </p>
            <p className="text-sm text-slate-400">
              Dacă un client se programează, va apărea aici instantaneu.
            </p>
          </div>
        ) : (
          <div className="overflow-auto custom-scrollbar max-h-[500px] rounded-2xl border border-white/10 bg-black/20 relative z-10 shadow-inner">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead className="sticky top-0 z-20 bg-[#0a0a0a]/90 backdrop-blur-xl border-b border-white/20 shadow-md">
                <tr className="text-slate-300 text-[10px] uppercase tracking-widest font-black">
                  <th className="py-4 pl-6 w-24">Ora</th>
                  <th className="py-4">Client & Contact</th>
                  <th className="py-4">Serviciu</th>
                  <th className="py-4 text-right pr-6">Acțiuni Operative</th>
                </tr>
              </thead>
              <tbody className="text-white text-base">
                {todayAppointments.map((app) => {
                  const isPending = app.status === "pending";
                  const isConfirmed = app.status === "confirmed";
                  const isCancelled = app.status === "cancelled";
                  const isRescheduled = app.status === "rescheduled";

                  return (
                    <tr
                      key={app.id}
                      className={`border-b border-white/5 transition-colors group ${isCancelled ? "bg-white/[0.03] hover:bg-white/[0.06]" : "hover:bg-white/5"}`}
                    >
                      <td className="py-5 pl-6 align-middle">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`text-xl font-mono font-black ${isCancelled ? "text-slate-500" : isRescheduled ? "text-orange-400" : "text-cyan-400"}`}
                          >
                            {app.appointment_time.slice(0, 5)}
                          </span>
                          {isPending && (
                            <span
                              className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse shadow-[0_0_8px_rgba(250,204,21,0.6)]"
                              title="În Așteptare"
                            ></span>
                          )}
                          {isConfirmed && (
                            <span
                              className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"
                              title="Confirmat"
                            ></span>
                          )}
                          {isRescheduled && (
                            <span
                              className="w-2 h-2 rounded-full bg-orange-400 animate-pulse shadow-[0_0_8px_rgba(249,115,22,0.6)]"
                              title="Așteaptă Răspuns"
                            ></span>
                          )}
                        </div>
                      </td>
                      <td className="py-5 align-middle">
                        <p
                          className={`font-bold text-lg tracking-tight mb-0.5 ${isCancelled ? "text-slate-500 line-through decoration-slate-600" : "text-white"}`}
                        >
                          {app.client_name}
                        </p>
                        <p
                          className={`text-xs font-mono font-bold ${isCancelled ? "text-slate-600" : "text-slate-400"}`}
                        >
                          📞 {app.client_phone || "-"}
                        </p>
                      </td>
                      <td className="py-5 align-middle">
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
                      <td className="py-5 text-right pr-6 align-middle">
                        <div className="flex justify-end gap-2 items-center">
                          {!isConfirmed && !isCancelled && !isRescheduled && (
                            <button
                              onClick={() =>
                                handleStatusChange(app.id, "confirmed")
                              }
                              className="cursor-pointer px-4 py-2 rounded-xl bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/30 transition-all text-xs font-bold shadow-sm"
                            >
                              ✓ Confirmă
                            </button>
                          )}
                          {!isCancelled && (
                            <button
                              onClick={() =>
                                setRescheduleData({
                                  id: app.id,
                                  date: new Date().toISOString().split("T")[0],
                                  time: app.appointment_time.slice(0, 5),
                                  name: app.client_name,
                                })
                              }
                              className="cursor-pointer px-4 py-2 rounded-xl bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 transition-all text-xs font-bold shadow-sm"
                            >
                              ↻ Mută
                            </button>
                          )}
                          {!isCancelled && (
                            <button
                              onClick={() =>
                                handleStatusChange(app.id, "cancelled")
                              }
                              className="cursor-pointer px-4 py-2 rounded-xl bg-white/5 hover:bg-red-500/10 text-slate-300 hover:text-red-400 border border-white/10 hover:border-red-500/30 transition-all text-xs font-bold shadow-sm"
                            >
                              ✕ Anulează
                            </button>
                          )}
                          {isRescheduled && (
                            <span className="px-4 py-2 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20 text-xs font-bold shadow-inner">
                              Așteaptă Client
                            </span>
                          )}
                          {isCancelled && (
                            <>
                              <span className="px-4 py-2 rounded-xl bg-slate-800 text-slate-400 border border-white/5 text-xs font-bold">
                                Anulat
                              </span>
                              <button
                                onClick={() => triggerDeleteAppointment(app.id)}
                                className="cursor-pointer px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-all text-xs font-bold flex items-center gap-1 shadow-sm"
                              >
                                🗑️ Șterge
                              </button>
                            </>
                          )}
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

      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
          <div
            className={`bg-[#050505]/95 backdrop-blur-2xl border p-8 rounded-[2.5rem] w-full max-w-sm shadow-2xl relative overflow-hidden ${confirmModal.buttonColor === "red" ? "border-red-500/30" : confirmModal.buttonColor === "orange" ? "border-orange-500/30" : "border-cyan-500/30"}`}
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-white/10"></div>
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 border-4 shadow-inner relative z-10 ${confirmModal.buttonColor === "red" ? "bg-red-500/10 border-red-500/20 text-red-400" : confirmModal.buttonColor === "orange" ? "bg-orange-500/10 border-orange-500/20 text-orange-400" : "bg-cyan-500/10 border-cyan-500/20 text-cyan-400"}`}
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
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-black text-white mb-2 text-center tracking-tight relative z-10">
              {confirmModal.title}
            </h3>
            <p className="text-slate-300 text-sm mb-8 text-center font-medium leading-relaxed relative z-10">
              {confirmModal.message}
            </p>
            <div className="flex gap-3 relative z-10">
              <button
                onClick={() =>
                  setConfirmModal((prev) => ({ ...prev, isOpen: false }))
                }
                className="flex-1 py-3.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-sm font-bold hover:bg-white/10 transition-all cursor-pointer shadow-sm"
              >
                Anulează
              </button>
              <button
                onClick={confirmModal.action}
                disabled={isProcessing}
                className={`flex-1 py-3.5 rounded-xl text-[#0a0a0a] text-sm font-black transition-all cursor-pointer disabled:opacity-50 shadow-lg ${confirmModal.buttonColor === "red" ? "bg-red-500 hover:bg-red-400 shadow-[0_0_15px_rgba(239,68,68,0.4)]" : confirmModal.buttonColor === "orange" ? "bg-orange-500 hover:bg-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.4)]" : "bg-cyan-500 hover:bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.4)]"}`}
              >
                {isProcessing ? "Așteaptă..." : confirmModal.buttonText}
              </button>
            </div>
          </div>
        </div>
      )}

      {rescheduleData && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#050505]/95 backdrop-blur-2xl border border-yellow-500/30 p-8 rounded-[2.5rem] w-full max-w-md shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-yellow-500/10 rounded-full blur-[60px] pointer-events-none"></div>
            <div className="relative z-10 mb-6">
              <h3 className="text-2xl font-black text-white tracking-tight mb-1">
                Reprogramare
              </h3>
              <p className="text-slate-400 text-sm font-medium">
                Modifici programarea pentru{" "}
                <span className="text-yellow-400 font-bold">
                  {rescheduleData.name}
                </span>
                .
              </p>
            </div>
            <div className="space-y-5 mb-8 relative z-10">
              <div>
                <label className="block text-[10px] font-bold text-yellow-400/80 uppercase tracking-widest mb-1.5 ml-1">
                  Ziua Nouă
                </label>
                <div className="relative">
                  <select
                    value={rescheduleData.date}
                    onChange={(e) =>
                      setRescheduleData({
                        ...rescheduleData,
                        date: e.target.value,
                      })
                    }
                    className="cursor-pointer w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-white text-sm outline-none focus:border-yellow-400 appearance-none shadow-inner font-medium"
                  >
                    {NEXT_DAYS.map((d) => (
                      <option
                        key={`modal-date-${d.value}`}
                        value={d.value}
                        className="bg-[#0a0a0a]"
                      >
                        {d.label}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    ▼
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-yellow-400/80 uppercase tracking-widest mb-1.5 ml-1">
                  Ora Nouă
                </label>
                <div className="relative">
                  <select
                    value={rescheduleData.time}
                    onChange={(e) =>
                      setRescheduleData({
                        ...rescheduleData,
                        time: e.target.value,
                      })
                    }
                    className="cursor-pointer w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-yellow-400 text-base font-black font-mono outline-none focus:border-yellow-400 appearance-none shadow-inner"
                  >
                    {TIME_SLOTS.map((t) => (
                      <option
                        key={`modal-time-${t}`}
                        value={t}
                        className="bg-[#0a0a0a]"
                      >
                        {t}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    ▼
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-3 relative z-10">
              <button
                onClick={() => setRescheduleData(null)}
                className="cursor-pointer flex-1 bg-white/5 border border-white/10 hover:bg-white/10 text-white text-sm font-bold py-3.5 rounded-xl transition-all shadow-sm"
              >
                Anulează
              </button>
              <button
                onClick={submitReschedule}
                disabled={isProcessing}
                className="cursor-pointer flex-1 bg-yellow-500 hover:bg-yellow-400 text-[#0a0a0a] text-sm font-black py-3.5 rounded-xl transition-all shadow-[0_0_15px_rgba(234,179,8,0.4)] disabled:opacity-50"
              >
                {isProcessing ? "..." : "Propune Ora"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showLeaveModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#050505]/95 backdrop-blur-2xl border border-orange-500/30 p-6 sm:p-8 rounded-[2.5rem] w-full max-w-sm shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-orange-500/10 rounded-full blur-[60px] pointer-events-none"></div>
            <div className="text-center mb-6 relative z-10">
              <h3 className="text-2xl font-black text-white tracking-tight mb-1">
                Zi Liberă
              </h3>
              <p className="text-xs text-orange-400 font-medium">
                Selectează o zi pentru a o bloca în calendar.
              </p>
            </div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-5 bg-white/5 rounded-xl p-1.5 border border-white/10 shadow-inner">
                <button
                  onClick={() =>
                    setCalendarViewDate(new Date(viewYear, viewMonth - 1, 1))
                  }
                  className="cursor-pointer p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
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
                      strokeWidth="2"
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </button>
                <span className="font-bold text-white text-sm tracking-wide capitalize">
                  {monthNames[viewMonth]} {viewYear}
                </span>
                <button
                  onClick={() =>
                    setCalendarViewDate(new Date(viewYear, viewMonth + 1, 1))
                  }
                  className="cursor-pointer p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
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
                      strokeWidth="2"
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              </div>
              <div className="mb-8">
                <div className="grid grid-cols-7 gap-1.5 mb-2">
                  {["Lu", "Ma", "Mi", "Jo", "Vi", "Sâ", "Du"].map((day) => (
                    <div
                      key={day}
                      className="text-center text-[10px] font-black text-slate-500 uppercase tracking-widest"
                    >
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1.5">
                  {blanksArray.map((_, i) => (
                    <div key={`blank-${i}`} className="aspect-square"></div>
                  ))}
                  {daysArray.map((day) => {
                    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                    const cellDate = new Date(viewYear, viewMonth, day);
                    const isPast = cellDate < today;
                    const isAlreadyBlocked = blockedDays.includes(dateStr);
                    const isDisabled = isPast || isAlreadyBlocked;
                    const isSelected = leaveDate === dateStr;

                    return (
                      <button
                        key={day}
                        disabled={isDisabled}
                        onClick={() => setLeaveDate(dateStr)}
                        className={`aspect-square flex items-center justify-center rounded-lg text-sm font-bold transition-all border
                          ${isPast ? "text-slate-700 cursor-not-allowed opacity-50 border-transparent" : ""}
                          ${isAlreadyBlocked ? "bg-red-500/10 text-red-500/50 line-through border-red-500/20 cursor-not-allowed" : ""}
                          ${!isDisabled && !isSelected ? "bg-white/5 border-white/10 hover:bg-orange-500/20 hover:border-orange-500/50 hover:text-orange-400 text-white cursor-pointer shadow-sm" : ""}
                          ${isSelected ? "bg-orange-500 text-[#000428] font-black shadow-[0_0_15px_rgba(249,115,22,0.5)] border-orange-400 scale-110 z-10" : ""}
                        `}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="flex gap-3 relative z-10">
              <button
                onClick={() => {
                  setShowLeaveModal(false);
                  setLeaveDate("");
                  setCalendarViewDate(new Date());
                }}
                className="cursor-pointer flex-1 bg-white/5 border border-white/10 hover:bg-white/10 text-white text-sm font-bold py-3.5 rounded-xl transition-all shadow-sm"
              >
                Înapoi
              </button>
              <button
                onClick={triggerTakeLeave}
                disabled={!leaveDate}
                className={`cursor-pointer flex-1 text-sm font-black py-3.5 rounded-xl transition-all ${leaveDate ? "bg-orange-500 hover:bg-orange-400 text-[#0a0a0a] shadow-[0_0_15px_rgba(249,115,22,0.4)]" : "bg-orange-500/20 text-orange-500/50 cursor-not-allowed"}`}
              >
                Blochează
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
