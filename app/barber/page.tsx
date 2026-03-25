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

  // State-uri pentru Concediu (Selecție Multiplă)
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveStart, setLeaveStart] = useState("");
  const [leaveEnd, setLeaveEnd] = useState("");
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

  // ================= REALTIME SYNC =================
  useEffect(() => {
    if (!barberId) return;

    const supabase = createClient();
    const channel = supabase
      .channel("realtime-barber-dashboard")
      .on(
        "postgres_changes",
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

  // --- LOGICĂ CALENDAR INTERVAL ---
  const handleLeaveDateClick = (dateStr: string) => {
    if (!leaveStart || (leaveStart && leaveEnd)) {
      setLeaveStart(dateStr);
      setLeaveEnd("");
    } else {
      if (dateStr < leaveStart) {
        setLeaveStart(dateStr);
        setLeaveEnd("");
      } else {
        setLeaveEnd(dateStr);
      }
    }
  };

  // Verificăm dacă intervalul selectat conține preponderent zile blocate (pentru a decide dacă butonul face Block sau Unblock)
  const isSelectionMostlyBlocked = () => {
    if (!leaveStart) return false;
    let blockedCount = 0;
    let totalCount = 0;

    let [sY, sM, sD] = leaveStart.split("-").map(Number);
    let curr = new Date(sY, sM - 1, sD);
    let [eY, eM, eD] = (leaveEnd || leaveStart).split("-").map(Number);
    let last = new Date(eY, eM - 1, eD);

    while (curr <= last) {
      const y = curr.getFullYear();
      const m = String(curr.getMonth() + 1).padStart(2, "0");
      const d = String(curr.getDate()).padStart(2, "0");
      const currentStr = `${y}-${m}-${d}`;

      if (blockedDays.includes(currentStr)) blockedCount++;
      totalCount++;
      curr.setDate(curr.getDate() + 1);
    }

    return blockedCount > 0 && blockedCount >= totalCount / 2; // Dacă măcar jumătate sunt blocate, butonul va fi de Deblocare
  };

  const triggerTakeLeave = async (isUnblocking = false) => {
    if (!leaveStart || !barberId) return;
    setIsProcessing(true);

    const datesToProcess: string[] = [];

    let [sY, sM, sD] = leaveStart.split("-").map(Number);
    let curr = new Date(sY, sM - 1, sD);

    let [eY, eM, eD] = (leaveEnd || leaveStart).split("-").map(Number);
    let last = new Date(eY, eM - 1, eD);

    while (curr <= last) {
      const y = curr.getFullYear();
      const m = String(curr.getMonth() + 1).padStart(2, "0");
      const d = String(curr.getDate()).padStart(2, "0");
      const currentStr = `${y}-${m}-${d}`;

      if (isUnblocking) {
        if (blockedDays.includes(currentStr)) datesToProcess.push(currentStr);
      } else {
        if (!blockedDays.includes(currentStr)) datesToProcess.push(currentStr);
      }
      curr.setDate(curr.getDate() + 1);
    }

    if (isUnblocking) {
      await Promise.all(
        datesToProcess.map((date) => removeCustomDayOffAction(barberId, date)),
      );
    } else {
      await Promise.all(
        datesToProcess.map((date) => addCustomDayOffAction(barberId, date)),
      );
    }

    setIsProcessing(false);
    setShowLeaveModal(false);
    setLeaveStart("");
    setLeaveEnd("");
    fetchDashboardData();
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

  const isUnblockAction = isSelectionMostlyBlocked();

  return (
    <div className="animate-fade-in max-w-6xl mx-auto pb-10 relative">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-black text-white mb-1 tracking-tight">
          Salutare,{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
            {barberName || "Frizer"}
          </span>
          ! ✂️
        </h1>
        <p className="text-slate-400 text-sm font-medium">
          Iată situația ta pentru{" "}
          {new Date().toLocaleDateString("ro-RO", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
          . Statusul se actualizează Live.
        </p>
      </div>

      {/* CARDURI COMPACTE */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white/5 backdrop-blur-md border border-white/10 p-5 rounded-2xl relative overflow-hidden group shadow-lg flex flex-col justify-center">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-cyan-500/10 rounded-full blur-[30px] transition-all pointer-events-none group-hover:bg-cyan-500/20"></div>
          <p className="text-cyan-400/90 text-[10px] font-black uppercase tracking-widest mb-1 relative z-10">
            Programări Azi
          </p>
          <div className="flex items-end gap-2 relative z-10">
            <span className="text-4xl font-black text-white leading-none">
              {activeTodayCount}
            </span>
            <span className="text-slate-300 text-xs font-medium mb-1">
              clienți activi
            </span>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-md border border-white/10 p-5 rounded-2xl relative overflow-hidden flex flex-col justify-center shadow-lg group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-purple-500/10 rounded-full blur-[30px] transition-all pointer-events-none group-hover:bg-purple-500/20"></div>
          <p className="text-purple-400/90 text-[10px] font-black uppercase tracking-widest mb-2 relative z-10">
            Următorul Client
          </p>
          {nextAppointment ? (
            <div className="relative z-10">
              <p className="text-lg font-bold text-white leading-tight mb-1 line-clamp-1">
                {nextAppointment.client_name}
              </p>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-purple-400 font-bold bg-purple-500/10 border border-purple-500/30 px-2 py-0.5 rounded shadow-inner">
                  {nextAppointment.appointment_time.slice(0, 5)}
                </span>
                <span className="text-slate-300 font-medium line-clamp-1">
                  {nextAppointment.service_name}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-slate-400 italic text-xs relative z-10">
              Nu mai ai clienți programați azi.
            </p>
          )}
        </div>

        <div className="bg-white/5 backdrop-blur-md border border-white/10 p-5 rounded-2xl relative overflow-hidden flex flex-col justify-between shadow-lg group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-orange-500/10 rounded-full blur-[30px] transition-all pointer-events-none group-hover:bg-orange-500/20"></div>
          <div className="relative z-10 mb-3 flex-1 flex flex-col">
            <p className="text-orange-400/90 text-[10px] font-black uppercase tracking-widest mb-2">
              Zile Libere Active
            </p>
            <div className="flex flex-wrap gap-1.5 overflow-y-auto custom-scrollbar max-h-16 pr-1">
              {blockedDays.length === 0 ? (
                <span className="text-xs text-slate-400 font-medium">
                  Nicio zi liberă setată.
                </span>
              ) : (
                blockedDays.map((date) => (
                  <div
                    key={date}
                    className="flex items-center gap-1 bg-orange-500/10 border border-orange-500/30 text-orange-400 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-inner h-fit"
                  >
                    {new Date(date).toLocaleDateString("ro-RO", {
                      day: "numeric",
                      month: "short",
                    })}
                    <button
                      onClick={() => triggerRemoveLeave(date)}
                      className="ml-0.5 text-orange-400 hover:text-white transition-colors cursor-pointer"
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
            className="cursor-pointer shrink-0 w-full bg-white/5 hover:bg-white/10 text-white text-xs font-bold py-2 rounded-xl transition-all border border-white/10 flex items-center justify-center gap-1.5 shadow-sm relative z-10"
          >
            <svg
              className="w-3.5 h-3.5 text-orange-400"
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
            Blochează / Deblochează
          </button>
        </div>
      </div>

      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col">
        <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-[80px] pointer-events-none"></div>
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-cyan-500/40 via-purple-500/40 to-cyan-500/40"></div>

        <h3 className="text-lg font-black text-white mb-4 flex items-center gap-2 relative z-10">
          <span className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 text-cyan-400 shadow-inner">
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
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </span>
          Agenda Zilei Curente
          <span className="flex items-center gap-1.5 ml-auto text-[10px] text-green-400 uppercase tracking-widest font-bold bg-green-500/10 px-2.5 py-1 rounded-full border border-green-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
            Live Sync
          </span>
        </h3>

        {todayAppointments.length === 0 ? (
          <div className="text-center py-10 relative z-10">
            <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3 border border-white/10 text-2xl shadow-inner">
              ☕
            </div>
            <p className="text-white font-bold text-base mb-1">
              Ai zi liberă momentan.
            </p>
            <p className="text-xs text-slate-400">
              Dacă un client se programează, va apărea aici instantaneu.
            </p>
          </div>
        ) : (
          <div className="overflow-auto custom-scrollbar max-h-[500px] rounded-xl border border-white/10 bg-black/20 relative z-10 shadow-inner">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead className="sticky top-0 z-20 bg-[#0a0a0a]/95 backdrop-blur-md border-b border-white/20 shadow-sm">
                <tr className="text-slate-300 text-[10px] uppercase tracking-widest font-black">
                  <th className="py-3 pl-4 w-20">Ora</th>
                  <th className="py-3">Client & Contact</th>
                  <th className="py-3">Serviciu</th>
                  <th className="py-3 text-right pr-4">Acțiuni Operative</th>
                </tr>
              </thead>
              <tbody className="text-white text-sm">
                {todayAppointments.map((app) => {
                  const isPending = app.status === "pending";
                  const isConfirmed = app.status === "confirmed";
                  const isCancelled = app.status === "cancelled";
                  const isRescheduled = app.status === "rescheduled";

                  return (
                    <tr
                      key={app.id}
                      className={`border-b border-white/5 transition-colors group ${isCancelled ? "bg-white/[0.02] hover:bg-white/[0.04]" : "hover:bg-white/5"}`}
                    >
                      <td className="py-3 pl-4 align-middle">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-base font-mono font-black ${isCancelled ? "text-slate-500" : isRescheduled ? "text-orange-400" : "text-cyan-400"}`}
                          >
                            {app.appointment_time.slice(0, 5)}
                          </span>
                          {isPending && (
                            <span
                              className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse shadow-[0_0_8px_rgba(250,204,21,0.6)]"
                              title="În Așteptare"
                            ></span>
                          )}
                          {isConfirmed && (
                            <span
                              className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"
                              title="Confirmat"
                            ></span>
                          )}
                          {isRescheduled && (
                            <span
                              className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse shadow-[0_0_8px_rgba(249,115,22,0.6)]"
                              title="Așteaptă Răspuns"
                            ></span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 align-middle">
                        <p
                          className={`font-bold text-base tracking-tight mb-0.5 ${isCancelled ? "text-slate-500 line-through decoration-slate-600" : "text-white"}`}
                        >
                          {app.client_name}
                        </p>
                        <p
                          className={`text-[10px] font-mono font-bold ${isCancelled ? "text-slate-600" : "text-slate-400"}`}
                        >
                          📞 {app.client_phone || "-"}
                        </p>
                      </td>
                      <td className="py-3 align-middle">
                        <p
                          className={`font-bold text-sm tracking-tight mb-0.5 ${isCancelled ? "text-slate-500" : "text-slate-200"}`}
                        >
                          {app.service_name}
                        </p>
                        <p
                          className={`text-[10px] font-black ${isCancelled ? "text-slate-600" : "text-cyan-400/80"}`}
                        >
                          {app.price} RON
                        </p>
                      </td>
                      <td className="py-3 text-right pr-4 align-middle">
                        <div className="flex justify-end gap-1.5 items-center">
                          {!isConfirmed && !isCancelled && !isRescheduled && (
                            <button
                              onClick={() =>
                                handleStatusChange(app.id, "confirmed")
                              }
                              className="cursor-pointer px-3 py-1.5 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/30 transition-all text-[10px] font-bold shadow-sm"
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
                              className="cursor-pointer px-3 py-1.5 rounded-lg bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 transition-all text-[10px] font-bold shadow-sm"
                            >
                              ↻ Mută
                            </button>
                          )}
                          {!isCancelled && (
                            <button
                              onClick={() =>
                                handleStatusChange(app.id, "cancelled")
                              }
                              className="cursor-pointer px-3 py-1.5 rounded-lg bg-white/5 hover:bg-red-500/10 text-slate-300 hover:text-red-400 border border-white/10 hover:border-red-500/30 transition-all text-[10px] font-bold shadow-sm"
                            >
                              ✕ Anulează
                            </button>
                          )}
                          {isRescheduled && (
                            <span className="px-3 py-1.5 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20 text-[10px] font-bold shadow-inner">
                              Așteaptă Client
                            </span>
                          )}
                          {isCancelled && (
                            <>
                              <span className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 border border-white/5 text-[10px] font-bold">
                                Anulat
                              </span>
                              <button
                                onClick={() => triggerDeleteAppointment(app.id)}
                                className="cursor-pointer px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-all text-[10px] font-bold flex items-center gap-1 shadow-sm"
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div
            className={`bg-[#050505]/95 backdrop-blur-xl border p-6 rounded-2xl w-full max-w-xs shadow-2xl relative overflow-hidden ${confirmModal.buttonColor === "red" ? "border-red-500/30" : confirmModal.buttonColor === "orange" ? "border-orange-500/30" : "border-cyan-500/30"}`}
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-white/10"></div>
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 border-2 shadow-inner relative z-10 ${confirmModal.buttonColor === "red" ? "bg-red-500/10 border-red-500/20 text-red-400" : confirmModal.buttonColor === "orange" ? "bg-orange-500/10 border-orange-500/20 text-orange-400" : "bg-cyan-500/10 border-cyan-500/20 text-cyan-400"}`}
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
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-black text-white mb-2 text-center tracking-tight relative z-10">
              {confirmModal.title}
            </h3>
            <p className="text-slate-300 text-xs mb-6 text-center font-medium leading-relaxed relative z-10">
              {confirmModal.message}
            </p>
            <div className="flex gap-2 relative z-10">
              <button
                onClick={() =>
                  setConfirmModal((prev) => ({ ...prev, isOpen: false }))
                }
                className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-xs font-bold hover:bg-white/10 transition-all cursor-pointer shadow-sm"
              >
                Anulează
              </button>
              <button
                onClick={confirmModal.action}
                disabled={isProcessing}
                className={`flex-1 py-2.5 rounded-xl text-[#0a0a0a] text-xs font-black transition-all cursor-pointer disabled:opacity-50 shadow-md ${confirmModal.buttonColor === "red" ? "bg-red-500 hover:bg-red-400" : confirmModal.buttonColor === "orange" ? "bg-orange-500 hover:bg-orange-400" : "bg-cyan-500 hover:bg-cyan-400"}`}
              >
                {isProcessing ? "..." : confirmModal.buttonText}
              </button>
            </div>
          </div>
        </div>
      )}

      {rescheduleData && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#050505]/95 backdrop-blur-xl border border-yellow-500/30 p-6 rounded-2xl w-full max-w-sm shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 rounded-full blur-[40px] pointer-events-none"></div>
            <div className="relative z-10 mb-6">
              <h3 className="text-xl font-black text-white tracking-tight mb-1">
                Reprogramare
              </h3>
              <p className="text-slate-400 text-xs font-medium">
                Mută programarea pentru{" "}
                <span className="text-yellow-400 font-bold">
                  {rescheduleData.name}
                </span>
                .
              </p>
            </div>
            <div className="space-y-4 mb-6 relative z-10">
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
                    className="cursor-pointer w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white text-xs outline-none focus:border-yellow-400 appearance-none shadow-inner font-medium transition-colors hover:bg-black/60"
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
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 text-xs">
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
                    className="cursor-pointer w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-yellow-400 text-sm font-black font-mono outline-none focus:border-yellow-400 appearance-none shadow-inner transition-colors hover:bg-black/60"
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
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 text-xs">
                    ▼
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-2 relative z-10">
              <button
                onClick={() => setRescheduleData(null)}
                className="cursor-pointer flex-1 bg-white/5 border border-white/10 hover:bg-white/10 text-white text-xs font-bold py-2.5 rounded-xl transition-all shadow-sm"
              >
                Anulează
              </button>
              <button
                onClick={submitReschedule}
                disabled={isProcessing}
                className="cursor-pointer flex-1 bg-yellow-500 hover:bg-yellow-400 text-[#0a0a0a] text-xs font-black py-2.5 rounded-xl transition-all shadow-md disabled:opacity-50"
              >
                {isProcessing ? "Așteaptă..." : "Trimite Ofertă"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL BLOCARE ZILE */}
      {showLeaveModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#050505]/95 backdrop-blur-xl border border-orange-500/30 p-6 rounded-2xl w-full max-w-sm shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-[40px] pointer-events-none"></div>

            <div className="text-center mb-5 relative z-10">
              <h3 className="text-xl font-black text-white tracking-tight mb-1">
                Zile Libere
              </h3>
              <p className="text-[10px] text-orange-400 font-medium">
                Click pe 1 zi sau pe 2 zile pentru a selecta un interval.
              </p>
            </div>

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4 bg-white/5 rounded-xl p-1 border border-white/10 shadow-inner">
                <button
                  onClick={() =>
                    setCalendarViewDate(new Date(viewYear, viewMonth - 1, 1))
                  }
                  className="cursor-pointer p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
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
                      strokeWidth="2"
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </button>
                <span className="font-bold text-white text-xs tracking-wide capitalize">
                  {monthNames[viewMonth]} {viewYear}
                </span>
                <button
                  onClick={() =>
                    setCalendarViewDate(new Date(viewYear, viewMonth + 1, 1))
                  }
                  className="cursor-pointer p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
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
                      strokeWidth="2"
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              </div>

              <div className="mb-6">
                <div className="grid grid-cols-7 gap-1 mb-1.5">
                  {["Lu", "Ma", "Mi", "Jo", "Vi", "Sâ", "Du"].map((day) => (
                    <div
                      key={day}
                      className="text-center text-[10px] font-black text-slate-500 uppercase tracking-widest"
                    >
                      {day}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {blanksArray.map((_, i) => (
                    <div key={`blank-${i}`} className="aspect-square"></div>
                  ))}

                  {daysArray.map((day) => {
                    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                    const cellDate = new Date(viewYear, viewMonth, day);
                    const isPast = cellDate < today;
                    const isAlreadyBlocked = blockedDays.includes(dateStr);

                    const isSelectedStart = leaveStart === dateStr;
                    const isSelectedEnd = leaveEnd === dateStr;
                    const isBoundary = isSelectedStart || isSelectedEnd;
                    const isInRange =
                      leaveStart &&
                      leaveEnd &&
                      dateStr > leaveStart &&
                      dateStr < leaveEnd;

                    return (
                      <button
                        key={day}
                        disabled={isPast}
                        onClick={() => handleLeaveDateClick(dateStr)}
                        className={`aspect-square flex items-center justify-center rounded-lg text-xs font-bold transition-all border
                          ${isPast ? "text-slate-700 cursor-not-allowed opacity-50 border-transparent" : ""}
                          ${!isPast && !isBoundary && !isInRange && !isAlreadyBlocked ? "bg-white/5 border-white/10 hover:bg-orange-500/20 hover:border-orange-500/50 hover:text-orange-400 text-white cursor-pointer shadow-sm" : ""}
                          ${!isPast && !isBoundary && !isInRange && isAlreadyBlocked ? "bg-red-500/10 border-red-500/30 text-red-400 cursor-pointer" : ""}
                          ${isInRange ? "bg-orange-500/30 text-orange-400 border-orange-500/50" : ""}
                          ${isBoundary ? "bg-orange-500 text-[#000428] font-black shadow-[0_0_10px_rgba(249,115,22,0.5)] border-orange-400 scale-105 z-10" : ""}
                        `}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex gap-2 relative z-10">
              <button
                onClick={() => {
                  setShowLeaveModal(false);
                  setLeaveStart("");
                  setLeaveEnd("");
                  setCalendarViewDate(new Date());
                }}
                className="cursor-pointer flex-1 bg-white/5 border border-white/10 hover:bg-white/10 text-white text-xs font-bold py-2.5 rounded-xl transition-all shadow-sm"
              >
                Anulează
              </button>
              <button
                onClick={() => triggerTakeLeave(isUnblockAction)}
                disabled={!leaveStart || isProcessing}
                className={`cursor-pointer flex-1 text-xs font-black py-2.5 rounded-xl transition-all shadow-md ${
                  !leaveStart
                    ? "bg-orange-500/20 text-orange-500/50 cursor-not-allowed"
                    : isUnblockAction
                      ? "bg-cyan-500 hover:bg-cyan-400 text-[#0a0a0a]"
                      : "bg-orange-500 hover:bg-orange-400 text-[#0a0a0a]"
                }`}
              >
                {isProcessing
                  ? "..."
                  : isUnblockAction
                    ? "Deblochează"
                    : "Blochează"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
