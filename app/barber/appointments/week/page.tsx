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

// ... (restul tipurilor și funcțiilor generatoare rămân la fel)
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
  for (let i = 0; i < 7; i++) {
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

  const [rescheduleData, setRescheduleData] = useState<{
    id: string;
    date: string;
    time: string;
  } | null>(null);

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

      // --- MAGIA: Curățăm istoricul automat înainte să încărcăm pagina ---
      await cleanupPastAppointmentsAction(user.id);

      // După ce e curat, tragem programările (doar de azi încolo)
      await fetchAppointments(user.id);
    };

    initPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const fetchAppointments = async (id: string) => {
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

  const handleStatusChange = async (id: string, newStatus: string) => {
    const result = await updateAppointmentStatusAction(id, newStatus);
    if (result.success) {
      setAppointments(
        appointments.map((app) =>
          app.id === id ? { ...app, status: newStatus } : app,
        ),
      );
    } else {
      alert("Eroare: " + result.error);
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
      fetchAppointments(barberId);
    } else {
      alert("Eroare: " + result.error);
    }
  };

  // NOU: Funcție de ștergere manuală
  const handleDelete = async (id: string) => {
    if (
      window.confirm(
        "Ești sigur că vrei să ștergi definitiv această programare anulată?",
      )
    ) {
      const result = await deleteAppointmentAction(id);
      if (result.success) {
        setAppointments(appointments.filter((app) => app.id !== id));
      } else {
        alert("Eroare la ștergere: " + result.error);
      }
    }
  };

  const generateTestAppointment = async () => {
    if (!barberId) return;
    await createMockAppointmentAction(barberId);
    fetchAppointments(barberId);
  };

  const formatDateLabel = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("ro-RO", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh]">
        <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-cyan-400 font-medium animate-pulse">
          Se încarcă și se curăță agenda...
        </p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in max-w-7xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Programări Săptămânale
          </h1>
          <p className="text-slate-400">
            Zilele trecute au fost transferate automat la statistici.
          </p>
        </div>
        <button
          onClick={generateTestAppointment}
          className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border border-purple-500/30 font-bold px-6 py-3 rounded-xl transition-all text-sm"
        >
          + Generare Client de Test
        </button>
      </div>

      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] overflow-hidden">
        {appointments.length === 0 ? (
          <div className="text-center py-16 px-6">
            <p className="text-slate-400 font-medium text-lg mb-2">
              Agenda ta este perfect curată.
            </p>
            <p className="text-sm text-slate-500 mb-6">
              Apasă pe butonul de test de mai sus pentru a vedea cum
              funcționează.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto p-6 sm:p-8">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="text-slate-400 border-b border-white/10 text-xs uppercase tracking-wider">
                  <th className="pb-4 font-medium pl-2">Client & Contact</th>
                  <th className="pb-4 font-medium">Dată & Oră</th>
                  <th className="pb-4 font-medium">Serviciu Ales</th>
                  <th className="pb-4 font-medium text-center">Status</th>
                  <th className="pb-4 font-medium text-right pr-2">Decizie</th>
                </tr>
              </thead>
              <tbody className="text-slate-300">
                {appointments.map((app) => (
                  <tr
                    key={app.id}
                    className="border-b border-white/5 transition-colors hover:bg-white/5 group relative"
                  >
                    {rescheduleData?.id === app.id ? (
                      <td colSpan={5} className="p-0">
                        {/* Aici rămâne UI-ul de reprogramare neschimbat */}
                        <div className="bg-cyan-950/40 p-5 sm:p-6 border-y border-cyan-500/30 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 w-full animate-fade-in">
                          <div>
                            <p className="text-cyan-400 font-bold text-lg mb-1">
                              Reprogramare: {app.client_name}
                            </p>
                            <p className="text-sm text-slate-400">
                              Alege noua dată și oră din liste.
                            </p>
                          </div>

                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
                            <select
                              value={rescheduleData.date}
                              onChange={(e) =>
                                setRescheduleData({
                                  ...rescheduleData,
                                  date: e.target.value,
                                })
                              }
                              className="w-full sm:w-auto bg-black/50 border border-cyan-500/30 rounded-xl px-4 py-3 text-white outline-none focus:border-cyan-400 cursor-pointer appearance-none font-medium hover:bg-black/80 transition-colors"
                            >
                              {NEXT_DAYS.map((d) => (
                                <option key={`date-${d.value}`} value={d.value}>
                                  {d.label}
                                </option>
                              ))}
                            </select>

                            <select
                              value={rescheduleData.time}
                              onChange={(e) =>
                                setRescheduleData({
                                  ...rescheduleData,
                                  time: e.target.value,
                                })
                              }
                              className="w-full sm:w-auto bg-black/50 border border-cyan-500/30 rounded-xl px-4 py-3 text-cyan-400 outline-none focus:border-cyan-400 cursor-pointer appearance-none font-mono font-bold hover:bg-black/80 transition-colors text-center"
                            >
                              {TIME_SLOTS.map((t) => (
                                <option key={`time-${t}`} value={t}>
                                  {t}
                                </option>
                              ))}
                            </select>

                            <div className="flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                              <button
                                onClick={submitReschedule}
                                className="flex-1 sm:flex-none bg-cyan-500 hover:bg-cyan-400 text-[#000428] font-bold px-5 py-3 rounded-xl transition-all shadow-[0_0_15px_rgba(34,211,238,0.2)]"
                              >
                                ✓ Confirmă
                              </button>
                              <button
                                onClick={() => setRescheduleData(null)}
                                className="flex-1 sm:flex-none bg-white/5 hover:bg-red-500/10 text-slate-300 hover:text-red-400 border border-transparent hover:border-red-500/30 font-bold px-5 py-3 rounded-xl transition-all"
                              >
                                ✕ Anulează
                              </button>
                            </div>
                          </div>
                        </div>
                      </td>
                    ) : (
                      <>
                        <td className="py-4 pl-2 align-middle">
                          <p className="font-bold text-white text-base mb-0.5">
                            {app.client_name}
                          </p>
                          <p className="text-xs text-cyan-400 font-mono">
                            📞 {app.client_phone || "Fără telefon"}
                          </p>
                        </td>

                        <td className="py-4 align-middle">
                          <p className="text-white font-medium capitalize mb-0.5">
                            {formatDateLabel(app.appointment_date)}
                          </p>
                          <p className="text-sm font-bold text-slate-400 flex items-center gap-1">
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
                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            Ora {app.appointment_time.slice(0, 5)}
                          </p>
                        </td>

                        <td className="py-4 align-middle">
                          <p className="text-slate-300 font-medium">
                            {app.service_name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {app.price} RON
                          </p>
                        </td>

                        <td className="py-4 text-center align-middle">
                          {app.status === "pending" && (
                            <span className="px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-bold border border-yellow-500/30 animate-pulse">
                              În Așteptare
                            </span>
                          )}
                          {app.status === "confirmed" && (
                            <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-bold border border-green-500/30">
                              Confirmat
                            </span>
                          )}
                          {app.status === "cancelled" && (
                            <span className="px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-bold border border-red-500/30">
                              Anulat
                            </span>
                          )}
                        </td>

                        <td className="py-4 text-right pr-2 align-middle">
                          <div className="flex justify-end gap-2">
                            {/* Butoane dacă e PENDING sau CONFIRMED */}
                            {app.status !== "cancelled" && (
                              <>
                                {app.status !== "confirmed" && (
                                  <button
                                    onClick={() =>
                                      handleStatusChange(app.id, "confirmed")
                                    }
                                    className="px-3 py-1.5 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/30 transition-all text-xs font-bold"
                                    title="Confirmă Programarea"
                                  >
                                    ✓ Confirmă
                                  </button>
                                )}
                                <button
                                  onClick={() =>
                                    setRescheduleData({
                                      id: app.id,
                                      date: app.appointment_date,
                                      time: app.appointment_time.slice(0, 5),
                                    })
                                  }
                                  className="px-3 py-1.5 rounded-lg bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 transition-all text-xs font-bold shadow-[0_0_10px_rgba(234,179,8,0.05)] hover:shadow-[0_0_15px_rgba(234,179,8,0.15)]"
                                  title="Mută la altă oră/dată"
                                >
                                  ↻ Reprogramează
                                </button>
                                <button
                                  onClick={() =>
                                    handleStatusChange(app.id, "cancelled")
                                  }
                                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-red-500/10 text-slate-400 hover:text-red-400 border border-transparent hover:border-red-500/30 transition-all text-xs font-bold"
                                  title="Anulează"
                                >
                                  ✕ Anulează
                                </button>
                              </>
                            )}

                            {/* BUTON NOU: Apare doar când e ANULATĂ */}
                            {app.status === "cancelled" && (
                              <button
                                onClick={() => handleDelete(app.id)}
                                className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-all text-xs font-bold"
                                title="Șterge definitiv din listă"
                              >
                                Șterge
                              </button>
                            )}
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
