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
  removeCustomDayOffAction, // Funcția nouă de deblocare
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
  const [blockedDays, setBlockedDays] = useState<string[]>([]); // Zilele de concediu curente

  const [rescheduleData, setRescheduleData] = useState<{
    id: string;
    date: string;
    time: string;
    name: string;
  } | null>(null);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveDate, setLeaveDate] = useState("");
  const [calendarViewDate, setCalendarViewDate] = useState(new Date());

  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const fetchDashboardData = async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }
    setBarberId(user.id);

    // Luăm profilul
    const { data: profile } = await supabase
      .from("profiles")
      .select("first_name")
      .eq("id", user.id)
      .single();
    if (profile) setBarberName(profile.first_name);

    const todayStr = new Date().toISOString().split("T")[0];

    // Luăm zilele libere (concediile viitoare)
    const { data: settings } = await supabase
      .from("barber_settings")
      .select("custom_days_off")
      .eq("barber_id", user.id)
      .maybeSingle();

    if (settings && settings.custom_days_off) {
      // Afișăm doar zilele blocate de azi încolo (curățăm UI-ul de cele trecute)
      const futureBlocked = settings.custom_days_off
        .filter((d: string) => d >= todayStr)
        .sort();
      setBlockedDays(futureBlocked);
    } else {
      setBlockedDays([]);
    }

    // Luăm programările de AZI
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
    setLoading(false);
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
    const result = await rescheduleAppointmentAction(
      rescheduleData.id,
      rescheduleData.date,
      rescheduleData.time,
    );
    if (result.success) {
      setRescheduleData(null);
      fetchDashboardData();
    }
  };

  const handleTakeLeave = async () => {
    if (!leaveDate || !barberId) return;
    if (
      window.confirm(
        `Ești sigur că vrei să blochezi data de ${leaveDate}? Toate programările din acea zi vor fi șterse automat!`,
      )
    ) {
      const result = await addCustomDayOffAction(barberId, leaveDate);
      if (result.success) {
        setShowLeaveModal(false);
        setLeaveDate("");
        fetchDashboardData();
      }
    }
  };

  const handleRemoveLeave = async (dateStr: string) => {
    if (!barberId) return;
    if (
      window.confirm(
        `Vrei să redeschizi data de ${new Date(dateStr).toLocaleDateString("ro-RO")} pentru programări?`,
      )
    ) {
      const result = await removeCustomDayOffAction(barberId, dateStr);
      if (result.success) {
        fetchDashboardData();
      }
    }
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
        <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-cyan-400 font-medium animate-pulse">
          Se pregătește panoul de control...
        </p>
      </div>
    );
  }

  const activeTodayCount = todayAppointments.filter(
    (a) => a.status !== "cancelled",
  ).length;

  return (
    <div className="animate-fade-in max-w-6xl mx-auto pb-10">
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
          Salutare,{" "}
          <span className="text-cyan-400">{barberName || "Frizer"}</span>! ✂️
        </h1>
        <p className="text-slate-400 text-lg">
          Iată situația ta pentru astăzi,{" "}
          {new Date().toLocaleDateString("ro-RO", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
          .
        </p>
      </div>

      {/* 3 PANOURI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
        <div className="bg-cyan-500/10 border border-cyan-500/20 p-6 rounded-3xl relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-cyan-500/20 rounded-full blur-2xl transition-all"></div>
          <p className="text-cyan-400/80 text-xs font-bold uppercase tracking-wider mb-2 relative z-10">
            Programări Azi
          </p>
          <div className="flex items-end gap-3 relative z-10">
            <span className="text-5xl font-black text-cyan-400 leading-none">
              {activeTodayCount}
            </span>
            <span className="text-slate-400 font-medium mb-1">
              clienți activi
            </span>
          </div>
        </div>

        <div className="bg-purple-500/10 border border-purple-500/20 p-6 rounded-3xl relative overflow-hidden flex flex-col justify-center">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-purple-500/20 rounded-full blur-2xl transition-all"></div>
          <p className="text-purple-400/80 text-xs font-bold uppercase tracking-wider mb-3 relative z-10">
            Următorul Client
          </p>

          {nextAppointment ? (
            <div className="relative z-10">
              <p className="text-xl font-bold text-white leading-tight mb-1">
                {nextAppointment.client_name}
              </p>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-purple-400 font-bold bg-purple-500/20 px-2 py-0.5 rounded-md">
                  {nextAppointment.appointment_time.slice(0, 5)}
                </span>
                <span className="text-slate-300 line-clamp-1">
                  {nextAppointment.service_name}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-slate-400 italic relative z-10">
              Nu mai ai clienți programați.
            </p>
          )}
        </div>

        {/* Panou 3: Zile Libere (Updatat cu lista) */}
        <div className="bg-white/5 border border-white/10 p-6 rounded-3xl relative overflow-hidden flex flex-col justify-between">
          <div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-3">
              Zile Libere / Concediu
            </p>

            {/* Lista cu zile blocate */}
            <div className="flex flex-wrap gap-2 mb-4">
              {blockedDays.length === 0 ? (
                <span className="text-sm text-slate-500 italic">
                  Nu ai nicio zi liberă programată.
                </span>
              ) : (
                blockedDays.map((date) => (
                  <div
                    key={date}
                    className="flex items-center gap-1 bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-bold px-2.5 py-1.5 rounded-lg"
                  >
                    {new Date(date).toLocaleDateString("ro-RO", {
                      day: "numeric",
                      month: "short",
                    })}
                    <button
                      onClick={() => handleRemoveLeave(date)}
                      className="ml-1 hover:text-red-400 cursor-pointer transition-colors"
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
            className="cursor-pointer mt-auto w-full bg-white/10 hover:bg-white/20 text-white font-bold py-2.5 rounded-xl transition-all border border-white/10 flex items-center justify-center gap-2"
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
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            Ia concediu
          </button>
        </div>
      </div>

      {/* AGENDA DE AZI */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 sm:p-8">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          📅 Agenda Zilei Curente
        </h3>

        {todayAppointments.length === 0 ? (
          <div className="text-center py-16 bg-black/20 rounded-2xl border border-white/5">
            <p className="text-slate-400 font-medium text-lg">
              Ai zi liberă momentan.
            </p>
            <p className="text-sm text-slate-500 mt-1">
              Nu este înregistrată nicio programare pentru ziua de azi.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="text-slate-400 border-b border-white/10 text-xs uppercase tracking-wider">
                  <th className="pb-4 font-medium pl-2 w-24">Ora</th>
                  <th className="pb-4 font-medium">Client & Contact</th>
                  <th className="pb-4 font-medium">Serviciu</th>
                  <th className="pb-4 font-medium text-right pr-2">Acțiuni</th>
                </tr>
              </thead>
              <tbody className="text-slate-300">
                {todayAppointments.map((app) => {
                  const isPending = app.status === "pending";
                  const isConfirmed = app.status === "confirmed";
                  const isCancelled = app.status === "cancelled";
                  const isRescheduled = app.status === "rescheduled"; // STATUS NOU

                  return (
                    <tr
                      key={app.id}
                      className={`border-b border-white/5 transition-colors group ${isCancelled ? "opacity-50" : "hover:bg-white/5"}`}
                    >
                      <td className="py-4 pl-2 align-middle">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-lg font-mono font-bold ${isCancelled ? "text-slate-500" : isRescheduled ? "text-orange-400" : "text-cyan-400"}`}
                          >
                            {app.appointment_time.slice(0, 5)}
                          </span>
                          {isPending && (
                            <span
                              className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"
                              title="În Așteptare"
                            ></span>
                          )}
                          {isConfirmed && (
                            <span
                              className="w-2 h-2 rounded-full bg-green-500"
                              title="Confirmat"
                            ></span>
                          )}
                          {isRescheduled && (
                            <span
                              className="w-2 h-2 rounded-full bg-orange-400 animate-pulse"
                              title="Așteaptă Răspuns"
                            ></span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 align-middle">
                        <p
                          className={`font-bold text-base mb-0.5 ${isCancelled ? "text-slate-400 line-through" : "text-white"}`}
                        >
                          {app.client_name}
                        </p>
                        <p className="text-xs text-slate-500 font-mono">
                          📞 {app.client_phone || "-"}
                        </p>
                      </td>
                      <td className="py-4 align-middle">
                        <p className="text-slate-300 font-medium">
                          {app.service_name}
                        </p>
                        <p className="text-xs text-cyan-500/70 font-bold">
                          {app.price} RON
                        </p>
                      </td>
                      <td className="py-4 text-right pr-2 align-middle">
                        <div className="flex justify-end gap-2">
                          {!isConfirmed && !isCancelled && !isRescheduled && (
                            <button
                              onClick={() =>
                                handleStatusChange(app.id, "confirmed")
                              }
                              className="cursor-pointer px-3 py-1.5 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 transition-all text-xs font-bold"
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
                              className="cursor-pointer px-3 py-1.5 rounded-lg bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/20 transition-all text-xs font-bold"
                            >
                              ↻ Mută
                            </button>
                          )}
                          {!isCancelled && (
                            <button
                              onClick={() =>
                                handleStatusChange(app.id, "cancelled")
                              }
                              className="cursor-pointer px-3 py-1.5 rounded-lg bg-white/5 hover:bg-red-500/10 text-slate-400 hover:text-red-400 border border-transparent hover:border-red-500/30 transition-all text-xs font-bold"
                            >
                              ✕ Anulează
                            </button>
                          )}

                          {/* BUTOANE PENTRU CELE ANULATE / RESCHEDULED */}
                          {isRescheduled && (
                            <span className="px-3 py-1.5 rounded-lg bg-orange-500/5 text-orange-400/80 border border-orange-500/10 text-xs font-bold">
                              Așteaptă Client
                            </span>
                          )}
                          {isCancelled && (
                            <>
                              <span className="px-3 py-1.5 rounded-lg bg-red-500/5 text-red-500/50 border border-red-500/10 text-xs font-bold">
                                Anulat
                              </span>
                              <button
                                onClick={async () => {
                                  const { deleteAppointmentAction } =
                                    await import("@/app/actions/appointmentActions");
                                  if (window.confirm("Ștergi definitiv?")) {
                                    await deleteAppointmentAction(app.id);
                                    fetchDashboardData();
                                  }
                                }}
                                className="cursor-pointer px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-all text-xs font-bold"
                                title="Șterge definitiv"
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

      {rescheduleData && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#0a0a0a] border border-cyan-500/30 p-6 sm:p-8 rounded-[2rem] w-full max-w-md shadow-[0_0_30px_rgba(34,211,238,0.1)]">
            <h3 className="text-xl font-bold text-white mb-1">Reprogramare</h3>
            <p className="text-cyan-400 font-medium mb-6">
              Client: {rescheduleData.name}
            </p>
            <div className="space-y-4 mb-8">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">
                  Ziua Nouă
                </label>
                <select
                  value={rescheduleData.date}
                  onChange={(e) =>
                    setRescheduleData({
                      ...rescheduleData,
                      date: e.target.value,
                    })
                  }
                  className="cursor-pointer w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-cyan-400 appearance-none"
                >
                  {NEXT_DAYS.map((d) => (
                    <option key={`modal-date-${d.value}`} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">
                  Ora Nouă
                </label>
                <select
                  value={rescheduleData.time}
                  onChange={(e) =>
                    setRescheduleData({
                      ...rescheduleData,
                      time: e.target.value,
                    })
                  }
                  className="cursor-pointer w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-cyan-400 font-mono font-bold outline-none focus:border-cyan-400 appearance-none"
                >
                  {TIME_SLOTS.map((t) => (
                    <option key={`modal-time-${t}`} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setRescheduleData(null)}
                className="cursor-pointer flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-xl transition-all border border-transparent hover:border-white/10"
              >
                Anulează
              </button>
              <button
                onClick={submitReschedule}
                className="cursor-pointer flex-1 bg-cyan-500 hover:bg-cyan-400 text-[#000428] font-bold py-3 rounded-xl transition-all shadow-[0_0_15px_rgba(34,211,238,0.3)]"
              >
                Confirmă
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL IA-ȚI LIBER --- */}
      {showLeaveModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#0a0a0a] border border-orange-500/20 p-5 sm:p-7 rounded-[2rem] w-full max-w-sm shadow-[0_0_30px_rgba(249,115,22,0.1)]">
            <div className="text-center mb-5">
              <h3 className="text-xl font-bold text-white">
                Selectează Ziua Liberă
              </h3>
              <p className="text-xs text-orange-400 mt-1">
                Alege data pe care vrei să o blochezi.
              </p>
            </div>

            <div className="flex items-center justify-between mb-4 bg-white/5 rounded-xl p-1.5 border border-white/5">
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
              <span className="font-bold text-white text-sm tracking-wide">
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

            <div className="mb-6">
              <div className="grid grid-cols-7 gap-1 mb-2">
                {["Lu", "Ma", "Mi", "Jo", "Vi", "Sâ", "Du"].map((day) => (
                  <div
                    key={day}
                    className="text-center text-[10px] font-bold text-slate-500 uppercase"
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
                  const isAlreadyBlocked = blockedDays.includes(dateStr); // <-- AICI ESTE MAGIA
                  const isDisabled = isPast || isAlreadyBlocked;
                  const isSelected = leaveDate === dateStr;
                  const isToday = cellDate.getTime() === today.getTime();

                  return (
                    <button
                      key={day}
                      disabled={isDisabled}
                      onClick={() => setLeaveDate(dateStr)}
                      className={`
                        aspect-square flex items-center justify-center rounded-xl text-sm font-medium transition-all
                        ${isPast ? "text-slate-700 cursor-not-allowed opacity-50" : ""}
                        ${isAlreadyBlocked ? "bg-red-500/10 text-red-500/50 line-through border border-red-500/20 cursor-not-allowed" : ""}
                        ${!isDisabled ? "hover:bg-white/10 text-slate-300 cursor-pointer" : ""}
                        ${isToday && !isSelected && !isDisabled ? "border border-cyan-500/50 text-cyan-400" : ""}
                        ${isSelected ? "bg-orange-500 text-white font-bold shadow-[0_0_15px_rgba(249,115,22,0.4)] border-transparent" : "border-transparent"}
                      `}
                      title={isAlreadyBlocked ? "Ziua este deja blocată!" : ""}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowLeaveModal(false);
                  setLeaveDate("");
                  setCalendarViewDate(new Date());
                }}
                className="cursor-pointer flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-xl transition-all"
              >
                Renunță
              </button>
              <button
                onClick={handleTakeLeave}
                disabled={!leaveDate}
                className={`cursor-pointer flex-1 font-bold py-3 rounded-xl transition-all ${leaveDate ? "bg-orange-500 hover:bg-orange-400 text-white shadow-[0_0_15px_rgba(249,115,22,0.3)]" : "bg-orange-500/30 text-white/30 cursor-not-allowed"}`}
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
