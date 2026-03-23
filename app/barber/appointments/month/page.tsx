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
  const [searchTerm, setSearchTerm] = useState("");

  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(
    getMonday(new Date()),
  );
  const [weekDays, setWeekDays] = useState<Date[]>([]);

  // ================= MODAL STATES =================
  const [rescheduleData, setRescheduleData] = useState<{
    id: string;
    date: string;
    time: string;
    name: string;
  } | null>(null);

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

  const showAlert = (
    title: string,
    message: string,
    type: "success" | "error" | "info" = "info",
  ) => {
    setModalConfig({ title, message, type });
    setActiveModal("alert");
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
    } else {
      showAlert("Eroare", result.error || "Acțiunea a eșuat.", "error");
    }
  };

  // FUNCȚIA REPARATĂ: Se numește corect triggerDelete și folosește numele clientului!
  const triggerDelete = (id: string, clientName: string) => {
    setConfirmConfig({
      title: "Ștergere Definitivă",
      message: `Ești sigur că vrei să ștergi definitiv programarea anulată pentru ${clientName}? Acțiunea nu poate fi anulată.`,
      buttonText: "Șterge",
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
      fetchAppointmentsForWeek(barberId, currentWeekStart);
      showAlert(
        "Reprogramare Trimisă",
        "Propunerea de reprogramare a fost trimisă clientului.",
        "success",
      );
    } else {
      showAlert(
        "Eroare",
        result.error || "Cererea nu a putut fi trimisă.",
        "error",
      );
    }
  };

  const handleConfirmDay = (dateStr: string) => {
    if (!barberId) return;
    setConfirmConfig({
      title: "Confirmare Zi",
      message: `Ești sigur că vrei să confirmi automat TOATE programările din data de ${new Date(dateStr).toLocaleDateString("ro-RO")}?`,
      buttonText: "Confirmă Tot",
      buttonColor: "cyan",
      action: async () => {
        setIsProcessing(true);
        await confirmAppointmentsByDateRangeAction(barberId, dateStr, dateStr);
        await fetchAppointmentsForWeek(barberId, currentWeekStart);
        setIsProcessing(false);
        setActiveModal("none");
      },
    });
    setActiveModal("confirm");
  };

  const handleDeleteDay = (dateStr: string) => {
    if (!barberId) return;
    setConfirmConfig({
      title: "Ștergere Zi Întreagă",
      message: `ATENȚIE MAXIMĂ! Ștergi DEFINITIV toate programările din data de ${new Date(dateStr).toLocaleDateString("ro-RO")}? Această acțiune este ireversibilă!`,
      buttonText: "Șterge Toată Ziua",
      buttonColor: "red",
      action: async () => {
        setIsProcessing(true);
        await deleteAppointmentsByDateRangeAction(barberId, dateStr, dateStr);
        await fetchAppointmentsForWeek(barberId, currentWeekStart);
        setIsProcessing(false);
        setActiveModal("none");
      },
    });
    setActiveModal("confirm");
  };

  const generateMockClientsForThisWeek = async () => {
    if (!barberId) return;
    setIsProcessing(true);
    const supabase = createClient();
    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(currentWeekStart);
      d.setDate(d.getDate() + i);
      weekDates.push(formatDateForDB(d));
    }

    const mocks = [
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
    await fetchAppointmentsForWeek(barberId, currentWeekStart);
    setIsProcessing(false);
    showAlert(
      "Săptămână Generată",
      "Zilele curente au fost umplute cu clienți de test.",
      "success",
    );
  };

  const weekEnd = new Date(currentWeekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const weekTitle = `${currentWeekStart.getDate()} - ${weekEnd.getDate()} ${weekEnd.toLocaleDateString("ro-RO", { month: "short" })}`;

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
    <div className="animate-fade-in max-w-[95rem] mx-auto pb-4 h-[calc(100vh-6rem)] flex flex-col relative">
      {/* HEADER KANBAN LIQUID GLASS */}
      <div className="shrink-0 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-6 bg-white/5 backdrop-blur-2xl border border-white/20 p-6 sm:p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-[80px] pointer-events-none"></div>
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500/40 via-purple-500/40 to-cyan-500/40"></div>

        <div className="w-full xl:w-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 relative z-10">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white mb-1 tracking-tight">
              Calendar Kanban
            </h1>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Afișare Săptămânală
            </p>
          </div>

          <div className="flex items-center justify-between gap-4 bg-black/40 p-2 rounded-[1.5rem] border border-white/10 w-full sm:w-auto shadow-inner">
            <button
              onClick={handlePrevWeek}
              className="cursor-pointer p-3 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-all shadow-sm"
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
                  strokeWidth="2.5"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <span className="text-cyan-400 font-black min-w-[140px] text-base text-center capitalize tracking-wide">
              {weekTitle}
            </span>
            <button
              onClick={handleNextWeek}
              className="cursor-pointer p-3 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-all shadow-sm"
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
                  strokeWidth="2.5"
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
        </div>

        <button
          onClick={generateMockClientsForThisWeek}
          disabled={isProcessing}
          className="cursor-pointer relative z-10 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 font-black px-6 py-3.5 rounded-xl transition-all text-xs uppercase tracking-widest w-full sm:w-auto text-center shadow-sm disabled:opacity-50 hover:shadow-[0_0_15px_rgba(168,85,247,0.3)]"
        >
          {isProcessing ? "Așteaptă..." : "+ Populează Săptămâna"}
        </button>
      </div>

      {/* TRACKING ORIZONTAL ZILE */}
      <div className="flex-1 overflow-x-auto snap-x min-h-0 pb-4 [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar-track]:bg-black/20 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-cyan-500/30 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-cyan-500/50 transition-all">
        <div className="flex gap-5 h-full px-2">
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
                className={`flex flex-col min-w-[300px] w-full max-w-[340px] bg-white/5 backdrop-blur-md border rounded-[2rem] overflow-hidden snap-start flex-shrink-0 h-full shadow-xl transition-colors ${isToday ? "border-cyan-500/40 shadow-[0_0_20px_rgba(34,211,238,0.1)]" : "border-white/10"}`}
              >
                {/* Header Zi */}
                <div
                  className={`shrink-0 p-5 border-b ${isToday ? "bg-cyan-500/10 border-b-cyan-500/30" : "bg-black/40 border-white/5"}`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p
                        className={`font-black capitalize text-lg tracking-tight ${isToday ? "text-cyan-400" : "text-white"}`}
                      >
                        {day.toLocaleDateString("ro-RO", { weekday: "long" })}
                      </p>
                      <p className="text-xs font-bold text-slate-500 mt-0.5">
                        {day.toLocaleDateString("ro-RO", {
                          day: "2-digit",
                          month: "short",
                        })}
                      </p>
                    </div>
                    <span className="text-xs font-black bg-white/10 text-slate-300 px-3 py-1.5 rounded-xl border border-white/10 shadow-inner">
                      {dayAppointments.length} PROG
                    </span>
                  </div>

                  {(hasAppointmentsInDay || hasPendingInDay) && (
                    <div className="flex gap-2 mt-4 animate-fade-in">
                      {hasPendingInDay && (
                        <button
                          onClick={() => handleConfirmDay(dateStr)}
                          className="cursor-pointer flex-1 py-2 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded-xl text-[10px] uppercase tracking-wider font-black border border-green-500/20 transition-all shadow-sm"
                        >
                          Confirmă Tot
                        </button>
                      )}
                      {hasAppointmentsInDay && (
                        <button
                          onClick={() => handleDeleteDay(dateStr)}
                          className="cursor-pointer flex-1 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-[10px] uppercase tracking-wider font-black border border-red-500/20 transition-all shadow-sm"
                        >
                          Șterge Ziua
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Lista Programări */}
                <div className="flex-1 p-3 space-y-3 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-cyan-500/40 pr-2">
                  {dayAppointments.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500">
                      <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
                        ☕
                      </div>
                      <p className="text-xs font-bold uppercase tracking-widest">
                        Fără Activitate
                      </p>
                    </div>
                  ) : (
                    dayAppointments.map((app) => {
                      const isPending = app.status === "pending";
                      const isConfirmed = app.status === "confirmed";
                      const isCancelled = app.status === "cancelled";
                      const isRescheduled = app.status === "rescheduled";

                      return (
                        <div
                          key={app.id}
                          className={`relative p-4 rounded-[1.5rem] border transition-all shadow-inner ${isConfirmed ? "bg-green-500/5 border-green-500/20" : isCancelled ? "bg-red-500/5 border-red-500/20 opacity-70" : isRescheduled ? "bg-orange-500/5 border-orange-500/20" : "bg-black/40 border-white/10 hover:border-cyan-500/30 hover:bg-white/5"}`}
                        >
                          <div className="flex justify-between items-center mb-2.5">
                            <span
                              className={`font-mono font-black text-xl tracking-tight leading-none ${isCancelled ? "text-slate-500 line-through" : isRescheduled ? "text-orange-400" : "text-cyan-400"}`}
                            >
                              {app.appointment_time.slice(0, 5)}
                            </span>
                            <div className="flex gap-1.5">
                              {isPending && (
                                <span
                                  className="w-2.5 h-2.5 rounded-full bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.8)] animate-pulse"
                                  title="În Așteptare"
                                ></span>
                              )}
                              {isConfirmed && (
                                <span
                                  className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]"
                                  title="Confirmat"
                                ></span>
                              )}
                              {isRescheduled && (
                                <span
                                  className="w-2.5 h-2.5 rounded-full bg-orange-400 shadow-[0_0_8px_rgba(249,115,22,0.8)] animate-pulse"
                                  title="Așteaptă Răspuns"
                                ></span>
                              )}
                              {isCancelled && (
                                <span
                                  className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]"
                                  title="Anulat"
                                ></span>
                              )}
                            </div>
                          </div>

                          <div className="flex justify-between items-end">
                            <div>
                              <p
                                className={`font-black text-base leading-tight mb-0.5 ${isCancelled ? "text-slate-400" : "text-white"}`}
                              >
                                {app.client_name}
                              </p>
                              <p className="text-[10px] font-bold text-slate-500 mb-2 font-mono">
                                📞 {app.client_phone || "-"}
                              </p>
                              <p className="text-xs font-medium text-slate-300 line-clamp-1">
                                {app.service_name}
                              </p>
                            </div>
                            <p className="text-xs font-black text-cyan-400 bg-cyan-500/10 px-2 py-1 rounded-lg border border-cyan-500/20 shadow-inner">
                              {app.price} RON
                            </p>
                          </div>

                          <div className="flex justify-between items-center pt-3 mt-3 border-t border-white/5 gap-1.5">
                            {!isConfirmed && !isCancelled && !isRescheduled && (
                              <button
                                onClick={() =>
                                  handleStatusChange(app.id, "confirmed")
                                }
                                className="cursor-pointer flex-1 py-1.5 rounded-xl bg-green-500/10 hover:bg-green-500/20 text-green-400 transition-colors shadow-sm"
                                title="Confirmă"
                              >
                                <svg
                                  className="w-5 h-5 mx-auto"
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
                                className="cursor-pointer flex-1 py-1.5 rounded-xl bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 transition-colors shadow-sm"
                                title="Reprogramează"
                              >
                                <svg
                                  className="w-5 h-5 mx-auto"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2.5"
                                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                  />
                                </svg>
                              </button>
                            )}

                            {isRescheduled && (
                              <span className="flex-1 py-1.5 rounded-xl bg-orange-500/5 text-orange-400/80 text-[10px] font-bold text-center uppercase tracking-widest border border-orange-500/10">
                                În Negociere
                              </span>
                            )}

                            {!isCancelled && (
                              <button
                                onClick={() =>
                                  handleStatusChange(app.id, "cancelled")
                                }
                                className="cursor-pointer flex-1 py-1.5 rounded-xl bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors shadow-sm"
                                title="Anulează"
                              >
                                <svg
                                  className="w-5 h-5 mx-auto"
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
                                onClick={() =>
                                  triggerDelete(app.id, app.client_name)
                                }
                                className="cursor-pointer flex-1 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors shadow-sm border border-red-500/20"
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
                                    strokeWidth="2.5"
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
                  <div className="h-4 w-full"></div>
                </div>
              </div>
            );
          })}
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

      {/* Modal Reprogramare */}
      {rescheduleData && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#050505]/95 backdrop-blur-2xl border border-yellow-500/30 p-8 rounded-[2.5rem] w-full max-w-md shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/10 rounded-full blur-[80px] pointer-events-none"></div>

            <div className="relative z-10 mb-8">
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
                <label className="block text-[10px] font-bold text-yellow-400/80 uppercase tracking-widest mb-2 ml-1">
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
                    className="cursor-pointer w-full bg-black/40 border border-white/10 rounded-2xl pl-5 pr-10 py-4 text-white text-sm outline-none focus:border-yellow-400 appearance-none shadow-inner font-medium transition-colors hover:bg-black/60"
                  >
                    {NEXT_DAYS.map((d) => (
                      <option
                        key={`modal-date-${d.value}`}
                        value={d.value}
                        className="bg-[#050505]"
                      >
                        {d.label}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                    ▼
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-yellow-400/80 uppercase tracking-widest mb-2 ml-1">
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
                    className="cursor-pointer w-full bg-black/40 border border-white/10 rounded-2xl pl-5 pr-10 py-4 text-yellow-400 text-lg outline-none focus:border-yellow-400 appearance-none shadow-inner font-mono font-black transition-colors hover:bg-black/60"
                  >
                    {TIME_SLOTS.map((t) => (
                      <option
                        key={`modal-time-${t}`}
                        value={t}
                        className="bg-[#050505]"
                      >
                        {t}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                    ▼
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-4 relative z-10">
              <button
                onClick={() => setRescheduleData(null)}
                className="cursor-pointer flex-1 bg-white/5 border border-white/10 hover:bg-white/10 text-white text-sm font-bold py-4 rounded-xl transition-all shadow-sm"
              >
                Anulează
              </button>
              <button
                onClick={submitReschedule}
                disabled={isProcessing}
                className="cursor-pointer flex-1 bg-yellow-500 hover:bg-yellow-400 text-[#000428] text-sm font-black py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(234,179,8,0.4)] disabled:opacity-50"
              >
                {isProcessing ? "Așteaptă..." : "Trimite Ofertă"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
