"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import {
  updateAppointmentStatusAction,
  rescheduleAppointmentAction,
  deleteAppointmentAction,
  cleanupPastAppointmentsAction,
  confirmAppointmentsByDateRangeAction,
  deleteAppointmentsByDateRangeAction,
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

const getMonday = (date: Date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
};

const formatDateForDB = (date: Date) => {
  return date.toISOString().split("T")[0];
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

export default function CalendarGridPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [barberId, setBarberId] = useState<string | null>(null);

  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(
    getMonday(new Date()),
  );
  const [weekDays, setWeekDays] = useState<Date[]>([]);
  const [rescheduleData, setRescheduleData] = useState<{
    id: string;
    date: string;
    time: string;
    name: string;
  } | null>(null);

  useEffect(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(currentWeekStart);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    setWeekDays(days);
  }, [currentWeekStart]);

  useEffect(() => {
    const initCalendar = async () => {
      setLoading(true);
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
      await fetchAppointmentsForWeek(user.id, currentWeekStart);
    };

    initCalendar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWeekStart, router]);

  const fetchAppointmentsForWeek = async (id: string, startOfWeek: Date) => {
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);

    const supabase = createClient();
    const { data, error } = await supabase
      .from("appointments")
      .select("*")
      .eq("barber_id", id)
      .gte("appointment_date", formatDateForDB(startOfWeek))
      .lte("appointment_date", formatDateForDB(endOfWeek))
      .order("appointment_time", { ascending: true });

    if (data && !error) setAppointments(data);
    setLoading(false);
  };

  const handleNextWeek = () => {
    const next = new Date(currentWeekStart);
    next.setDate(next.getDate() + 7);
    setCurrentWeekStart(next);
  };

  const handlePrevWeek = () => {
    const prev = new Date(currentWeekStart);
    prev.setDate(prev.getDate() - 7);
    setCurrentWeekStart(prev);
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    const result = await updateAppointmentStatusAction(id, newStatus);
    if (result.success) {
      setAppointments(
        appointments.map((app) =>
          app.id === id ? { ...app, status: newStatus } : app,
        ),
      );
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Ștergi definitiv această programare?")) {
      const result = await deleteAppointmentAction(id);
      if (result.success)
        setAppointments(appointments.filter((app) => app.id !== id));
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
      fetchAppointmentsForWeek(barberId, currentWeekStart);
    }
  };

  const handleConfirmDay = async (dateStr: string) => {
    if (!barberId) return;
    if (window.confirm("Confirmi TOATE programările din această zi?")) {
      await confirmAppointmentsByDateRangeAction(barberId, dateStr, dateStr);
      fetchAppointmentsForWeek(barberId, currentWeekStart);
    }
  };

  const handleDeleteDay = async (dateStr: string) => {
    if (!barberId) return;
    if (
      window.confirm("⚠️ Ștergi DEFINITIV toate programările din această zi?")
    ) {
      await deleteAppointmentsByDateRangeAction(barberId, dateStr, dateStr);
      fetchAppointmentsForWeek(barberId, currentWeekStart);
    }
  };

  // ACEASTA ESTE FUNCȚIA NOUĂ, CURATĂ ȘI PERFECT FUNCȚIONALĂ
  const generateMockClientsForThisWeek = async () => {
    if (!barberId) return;
    const supabase = createClient();

    // Generăm toate cele 7 zile ale săptămânii curente
    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(currentWeekStart);
      d.setDate(d.getDate() + i);
      weekDates.push(formatDateForDB(d));
    }

    // Creăm un set de clienți răspândiți pe toată săptămâna
    const mocks = [
      // Luni (Ziua 0)
      {
        barber_id: barberId,
        client_name: "Andrei S.",
        client_phone: "0722111222",
        service_name: "Tuns Clasic",
        price: 60,
        appointment_date: weekDates[0],
        appointment_time: "10:30",
        status: "pending",
      },
      {
        barber_id: barberId,
        client_name: "Mihai V.",
        client_phone: "0733444555",
        service_name: "Pachet Premium",
        price: 120,
        appointment_date: weekDates[0],
        appointment_time: "14:00",
        status: "confirmed",
      },
      // Marți (Ziua 1)
      {
        barber_id: barberId,
        client_name: "Cristi M.",
        client_phone: "0744999888",
        service_name: "Aranjat Barbă",
        price: 40,
        appointment_date: weekDates[1],
        appointment_time: "11:30",
        status: "pending",
      },
      {
        barber_id: barberId,
        client_name: "Ion Pop",
        client_phone: "0755123456",
        service_name: "Tuns",
        price: 50,
        appointment_date: weekDates[1],
        appointment_time: "16:00",
        status: "confirmed",
      },
      // Miercuri (Ziua 2)
      {
        barber_id: barberId,
        client_name: "Alex G.",
        client_phone: "0722333444",
        service_name: "Tuns + Spălat",
        price: 70,
        appointment_date: weekDates[2],
        appointment_time: "09:30",
        status: "pending",
      },
      {
        barber_id: barberId,
        client_name: "Sorin D.",
        client_phone: "0766222333",
        service_name: "Tuns Premium",
        price: 100,
        appointment_date: weekDates[2],
        appointment_time: "18:00",
        status: "pending",
      },
      // Joi (Ziua 3)
      {
        barber_id: barberId,
        client_name: "Vlad P.",
        client_phone: "0777444111",
        service_name: "Tuns Clasic",
        price: 60,
        appointment_date: weekDates[3],
        appointment_time: "13:30",
        status: "confirmed",
      },
      // Vineri (Ziua 4)
      {
        barber_id: barberId,
        client_name: "Bogdan C.",
        client_phone: "0788555222",
        service_name: "Tuns + Barbă",
        price: 90,
        appointment_date: weekDates[4],
        appointment_time: "15:30",
        status: "pending",
      },
      // Sâmbătă (Ziua 5) - zi mai plină
      {
        barber_id: barberId,
        client_name: "Radu I.",
        client_phone: "0799666333",
        service_name: "Pachet Premium",
        price: 120,
        appointment_date: weekDates[5],
        appointment_time: "10:00",
        status: "pending",
      },
      {
        barber_id: barberId,
        client_name: "Florin B.",
        client_phone: "0711222333",
        service_name: "Tuns Copil",
        price: 40,
        appointment_date: weekDates[5],
        appointment_time: "11:30",
        status: "confirmed",
      },
      // Duminică (Ziua 6)
      {
        barber_id: barberId,
        client_name: "Gabi T.",
        client_phone: "0722888999",
        service_name: "Tuns Rapid",
        price: 50,
        appointment_date: weekDates[6],
        appointment_time: "12:00",
        status: "pending",
      },
    ];

    await supabase.from("appointments").insert(mocks);
    fetchAppointmentsForWeek(barberId, currentWeekStart);
  };

  const weekEnd = new Date(currentWeekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const weekTitle = `${currentWeekStart.getDate()} - ${weekEnd.getDate()} ${weekEnd.toLocaleDateString("ro-RO", { month: "short" })}`;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh]">
        <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-cyan-400 font-medium animate-pulse">
          Se încarcă calendarul...
        </p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in max-w-[95rem] mx-auto pb-4 h-[calc(100vh-6rem)] flex flex-col">
      {/* Header Compact */}
      <div className="shrink-0 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-6 bg-white/5 backdrop-blur-xl border border-white/10 p-4 sm:p-5 rounded-[2rem]">
        <div className="w-full xl:w-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white mb-0.5">
              Calendar Kanban
            </h1>
            <p className="text-xs text-slate-400">
              Trage cu mouse-ul / glisează pentru a vedea zilele.
            </p>
          </div>

          <div className="flex items-center justify-between gap-3 bg-black/40 p-1.5 rounded-xl border border-white/10 w-full sm:w-auto">
            <button
              onClick={handlePrevWeek}
              className="cursor-pointer p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-all"
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
            <span className="text-white font-bold min-w-[130px] text-sm text-center capitalize">
              {weekTitle}
            </span>
            <button
              onClick={handleNextWeek}
              className="cursor-pointer p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-all"
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
        </div>

        <button
          onClick={generateMockClientsForThisWeek}
          className="cursor-pointer bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 font-bold px-4 py-2.5 rounded-xl transition-all text-xs whitespace-nowrap w-full sm:w-auto text-center"
        >
          + Generează Zi Plină
        </button>
      </div>

      {/* Traking orizontal cu SCROLLBAR STILIZAT */}
      <div className="flex-1 overflow-x-auto snap-x min-h-0 pb-3 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-white/5 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-cyan-500/30 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-cyan-400/50 transition-all">
        <div className="flex gap-4 h-full">
          {weekDays.map((day, index) => {
            const dateStr = formatDateForDB(day);
            const dayAppointments = appointments.filter(
              (app) => app.appointment_date === dateStr,
            );
            const isToday = dateStr === formatDateForDB(new Date());

            const hasAppointmentsInDay = dayAppointments.length > 0;
            const hasPendingInDay = dayAppointments.some(
              (app) => app.status === "pending",
            );

            return (
              <div
                key={index}
                className="flex flex-col min-w-[280px] w-full max-w-[320px] bg-white/5 border border-white/10 rounded-[1.5rem] overflow-hidden snap-start flex-shrink-0 h-full"
              >
                {/* Header Zi */}
                <div
                  className={`shrink-0 p-3 sm:p-4 border-b border-white/10 ${isToday ? "bg-cyan-500/10 border-b-cyan-500/30" : "bg-black/20"}`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p
                        className={`font-bold capitalize text-base ${isToday ? "text-cyan-400" : "text-white"}`}
                      >
                        {day.toLocaleDateString("ro-RO", { weekday: "long" })}
                      </p>
                      <p className="text-xs text-slate-500">
                        {day.toLocaleDateString("ro-RO", {
                          day: "2-digit",
                          month: "short",
                        })}
                      </p>
                    </div>
                    <span className="text-xs font-bold bg-white/10 text-slate-300 px-2 py-1 rounded-lg border border-white/5">
                      {dayAppointments.length} prog
                    </span>
                  </div>

                  {/* Butoane Acțiuni Zi Inteligente */}
                  {(hasAppointmentsInDay || hasPendingInDay) && (
                    <div className="flex gap-2 mt-3 animate-fade-in">
                      {hasPendingInDay && (
                        <button
                          onClick={() => handleConfirmDay(dateStr)}
                          className="cursor-pointer flex-1 py-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded-lg text-[10px] uppercase tracking-wider font-bold border border-green-500/20 transition-all"
                        >
                          Confirmă Tot
                        </button>
                      )}
                      {hasAppointmentsInDay && (
                        <button
                          onClick={() => handleDeleteDay(dateStr)}
                          className="cursor-pointer flex-1 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-[10px] uppercase tracking-wider font-bold border border-red-500/20 transition-all"
                        >
                          Șterge Tot
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Lista de Carduri a Zilei cu SCROLLBAR VERTICAL STILIZAT */}
                <div className="flex-1 p-2 space-y-2 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-cyan-500/40 pr-1">
                  {dayAppointments.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-600">
                      <p className="text-xs font-medium italic">Liber</p>
                    </div>
                  ) : (
                    dayAppointments.map((app) => {
                      const isPending = app.status === "pending";
                      const isConfirmed = app.status === "confirmed";
                      const isCancelled = app.status === "cancelled";

                      return (
                        <div
                          key={app.id}
                          className={`relative p-3 rounded-xl border transition-all ${
                            isConfirmed
                              ? "bg-green-500/5 border-green-500/20"
                              : isCancelled
                                ? "bg-red-500/5 border-red-500/20 opacity-60"
                                : "bg-black/40 border-white/10 hover:border-cyan-500/30"
                          }`}
                        >
                          <div className="flex justify-between items-center mb-1.5">
                            <span className="text-cyan-400 font-mono font-bold text-base leading-none">
                              {app.appointment_time.slice(0, 5)}
                            </span>
                            {isPending && (
                              <span className="w-2 h-2 rounded-full bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.8)] animate-pulse"></span>
                            )}
                            {isConfirmed && (
                              <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]"></span>
                            )}
                            {isCancelled && (
                              <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>
                            )}
                          </div>

                          <div className="flex justify-between items-end">
                            <div>
                              <p className="text-white font-bold text-sm leading-tight">
                                {app.client_name}
                              </p>
                              <p className="text-[10px] text-slate-400 mb-1">
                                {app.client_phone || "-"}
                              </p>
                              <p className="text-xs text-slate-300 line-clamp-1">
                                {app.service_name}
                              </p>
                            </div>
                            <p className="text-xs font-bold text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">
                              {app.price} RON
                            </p>
                          </div>

                          <div className="flex justify-between items-center pt-2 mt-2 border-t border-white/5 gap-1">
                            {!isConfirmed && !isCancelled && (
                              <button
                                onClick={() =>
                                  handleStatusChange(app.id, "confirmed")
                                }
                                className="cursor-pointer flex-1 p-1 rounded-md bg-green-500/10 hover:bg-green-500/20 text-green-400 transition-colors"
                                title="Confirmă"
                              >
                                <svg
                                  className="w-4 h-4 mx-auto"
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
                              </button>
                            )}
                            {!isCancelled && (
                              <button
                                onClick={() =>
                                  setRescheduleData({
                                    id: app.id,
                                    date: app.appointment_date,
                                    time: app.appointment_time.slice(0, 5),
                                    name: app.client_name,
                                  })
                                }
                                className="cursor-pointer flex-1 p-1 rounded-md bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 transition-colors"
                                title="Reprogramează"
                              >
                                <svg
                                  className="w-4 h-4 mx-auto"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                  />
                                </svg>
                              </button>
                            )}
                            {!isCancelled && (
                              <button
                                onClick={() =>
                                  handleStatusChange(app.id, "cancelled")
                                }
                                className="cursor-pointer flex-1 p-1 rounded-md bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
                                title="Anulează"
                              >
                                <svg
                                  className="w-4 h-4 mx-auto"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2.5"
                                    d="M6 18L18 6M6 6l12 12"
                                  />
                                </svg>
                              </button>
                            )}
                            {isCancelled && (
                              <button
                                onClick={() => handleDelete(app.id)}
                                className="cursor-pointer flex-1 p-1 rounded-md bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                                title="Șterge definitiv"
                              >
                                <svg
                                  className="w-4 h-4 mx-auto"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div className="h-2 w-full"></div>
                </div>
              </div>
            );
          })}
        </div>
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
                className="cursor-pointer flex-1 bg-white/5 hover:bg-red-500/10 text-slate-300 hover:text-red-400 border border-transparent font-bold py-3 rounded-xl transition-all"
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
    </div>
  );
}
