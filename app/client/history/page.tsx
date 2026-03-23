"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";

type HistoryAppointment = {
  id: string;
  service_name: string;
  price: number;
  appointment_date: string;
  appointment_time: string;
  status: string;
  profiles: {
    barbershop_name: string;
    first_name: string;
    last_name: string;
  };
};

export default function ClientHistoryPage() {
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<HistoryAppointment[]>([]);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("favorite_barbers")
      .eq("id", user.id)
      .single();

    if (profile && profile.favorite_barbers) {
      setFavoritesCount(profile.favorite_barbers.length);
    }

    const { data: apps } = await supabase
      .from("appointments")
      .select(
        `
        id, service_name, price, appointment_date, appointment_time, status,
        profiles!appointments_barber_id_fkey(barbershop_name, first_name, last_name)
      `,
      )
      .eq("client_id", user.id)
      .order("appointment_date", { ascending: false })
      .order("appointment_time", { ascending: false });

    if (apps) {
      setAppointments(apps as any);
    }

    setLoading(false);
  };

  const filteredAppointments = appointments.filter((app) => {
    const searchLower = searchQuery.toLowerCase();
    const shopName = (
      app.profiles?.barbershop_name ||
      app.profiles?.first_name ||
      ""
    ).toLowerCase();
    const serviceName = app.service_name.toLowerCase();
    const dateStr = new Date(app.appointment_date).toLocaleDateString("ro-RO");

    return (
      shopName.includes(searchLower) ||
      serviceName.includes(searchLower) ||
      dateStr.includes(searchLower)
    );
  });

  const confirmedAppointments = appointments.filter(
    (a) => a.status === "confirmed",
  );
  const totalCompleted = confirmedAppointments.length;
  const lastAppointment = confirmedAppointments[0] || null;

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="w-10 h-10 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(34,211,238,0.5)]"></div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in max-w-6xl mx-auto pb-10 relative">
      {/* HEADER & BUTON CTA */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Istoricul Meu</h1>
          <p className="text-slate-300 text-sm">
            Toate vizitele și experiențele tale în locațiile noastre.
          </p>
        </div>
        <Link
          href="/client"
          className="cursor-pointer bg-cyan-500 hover:bg-cyan-400 text-[#0a0a0a] font-bold px-6 py-3.5 rounded-xl transition-all shadow-[0_0_20px_rgba(34,211,238,0.3)] hover:shadow-[0_0_30px_rgba(34,211,238,0.5)] flex items-center gap-2 whitespace-nowrap"
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

      {/* 3 PANOURI PREMIUM LIQUID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        {/* Panou 1 */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/20 p-6 rounded-[2rem] relative overflow-hidden group shadow-xl">
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-cyan-500/20 rounded-full blur-[40px] transition-all pointer-events-none group-hover:bg-cyan-500/30"></div>
          <p className="text-cyan-400 text-xs font-bold uppercase tracking-widest mb-2 relative z-10">
            Total Vizite
          </p>
          <div className="flex items-end gap-3 relative z-10">
            <span className="text-5xl font-black text-white leading-none">
              {totalCompleted}
            </span>
            <span className="text-slate-200 text-sm font-medium mb-1">
              finalizate
            </span>
          </div>
        </div>

        {/* Panou 2 */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/20 p-6 rounded-[2rem] relative overflow-hidden flex flex-col justify-center shadow-xl group">
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-purple-500/20 rounded-full blur-[40px] transition-all pointer-events-none group-hover:bg-purple-500/30"></div>
          <p className="text-purple-400 text-xs font-bold uppercase tracking-widest mb-3 relative z-10">
            Ultima Vizită
          </p>

          {lastAppointment ? (
            <div className="relative z-10">
              <p className="text-lg font-bold text-white leading-tight mb-1 line-clamp-1">
                {lastAppointment.profiles?.barbershop_name ||
                  lastAppointment.profiles?.first_name}
              </p>
              <div className="flex items-center gap-2 text-sm mt-1">
                <span className="text-purple-300 font-bold bg-purple-500/20 border border-purple-500/40 px-2 py-0.5 rounded-lg text-xs">
                  {new Date(
                    lastAppointment.appointment_date,
                  ).toLocaleDateString("ro-RO", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
                <span className="text-slate-200 text-xs font-medium">
                  ora {lastAppointment.appointment_time.slice(0, 5)}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-slate-300 italic text-sm relative z-10">
              Nicio vizită finalizată.
            </p>
          )}
        </div>

        {/* Panou 3 */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/20 p-6 rounded-[2rem] relative overflow-hidden flex flex-col justify-center shadow-xl group">
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-pink-500/20 rounded-full blur-[40px] transition-all pointer-events-none group-hover:bg-pink-500/30"></div>
          <p className="text-pink-400 text-xs font-bold uppercase tracking-widest mb-2 relative z-10">
            Locații Favorite
          </p>
          <div className="flex items-end gap-3 relative z-10">
            <span className="text-5xl font-black text-white leading-none">
              {favoritesCount}
            </span>
            <span className="text-slate-200 text-sm font-medium mb-1 flex items-center gap-1">
              salvate
              <svg
                className="w-4 h-4 text-pink-400 ml-0.5"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </span>
          </div>
        </div>
      </div>

      {/* TABEL ISTORIC LIQUID GLASS */}
      <div className="bg-white/5 backdrop-blur-2xl border border-white/20 rounded-[2.5rem] p-6 sm:p-8 shadow-2xl relative flex flex-col overflow-hidden">
        {/* Glow luminos fundal container tabel */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500/40 via-purple-500/40 to-cyan-500/40"></div>

        {/* SEARCH BAR & TITLU */}
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10 shrink-0">
          <h3 className="text-xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30 text-cyan-400 shadow-inner">
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
            Registru Programări
          </h3>
          <div className="relative w-full sm:w-80">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-300">
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
              placeholder="Caută locație, serviciu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/20 focus:border-cyan-400 rounded-2xl pl-11 pr-4 py-3.5 text-white outline-none transition-all shadow-inner placeholder:text-slate-300 text-base font-medium"
            />
          </div>
        </div>

        {appointments.length === 0 ? (
          <div className="text-center py-16 relative z-10">
            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/20 text-3xl shadow-inner">
              🗓️
            </div>
            <p className="text-white font-bold text-xl mb-1">
              Nu ai nicio programare în istoric.
            </p>
            <p className="text-sm text-slate-300">
              Apasă butonul de sus pentru a rezerva primul tău loc.
            </p>
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className="text-center py-12 text-white font-medium italic relative z-10">
            Nu s-a găsit nicio programare care să corespundă căutării.
          </div>
        ) : (
          <div className="overflow-auto custom-scrollbar max-h-[500px] rounded-2xl border border-white/10 bg-black/20 relative z-10 shadow-inner">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead className="sticky top-0 z-20 bg-[#0a0a0a]/90 backdrop-blur-2xl border-b border-white/20 shadow-md">
                <tr className="text-white text-xs uppercase tracking-widest font-black">
                  <th className="py-4 pl-6">Locație & Frizer</th>
                  <th className="py-4">Data & Ora</th>
                  <th className="py-4">Serviciu</th>
                  <th className="py-4 text-right pr-6">Status</th>
                </tr>
              </thead>
              <tbody className="text-white text-base">
                {filteredAppointments.map((app) => {
                  const isConfirmed = app.status === "confirmed";
                  const isCancelled = app.status === "cancelled";
                  const isPending = app.status === "pending";
                  const isRescheduled = app.status === "rescheduled";

                  return (
                    <tr
                      key={app.id}
                      className={`border-b border-white/10 transition-colors group ${isCancelled ? "bg-white/[0.03] hover:bg-white/[0.06]" : "hover:bg-white/10"}`}
                    >
                      {/* Frizerie */}
                      <td className="py-6 pl-6 align-middle">
                        <p
                          className={`font-bold text-lg tracking-tight mb-1 ${isCancelled ? "text-slate-300 line-through decoration-red-500" : "text-white"}`}
                        >
                          {app.profiles?.barbershop_name || "Salon"}
                        </p>
                        <p
                          className={`text-sm font-medium ${isCancelled ? "text-slate-300" : "text-slate-200"}`}
                        >
                          Frizer: {app.profiles?.first_name}{" "}
                          {app.profiles?.last_name}
                        </p>
                      </td>

                      {/* Data și Ora */}
                      <td className="py-6 align-middle">
                        <p
                          className={`font-medium capitalize text-base mb-1 ${isCancelled ? "text-slate-300" : "text-white"}`}
                        >
                          {new Date(app.appointment_date).toLocaleDateString(
                            "ro-RO",
                            { day: "numeric", month: "short", year: "numeric" },
                          )}
                        </p>
                        <p
                          className={`font-mono text-lg font-bold ${isCancelled ? "text-slate-300" : "text-cyan-400"}`}
                        >
                          {app.appointment_time.slice(0, 5)}
                        </p>
                      </td>

                      {/* Serviciu & Preț */}
                      <td className="py-6 align-middle">
                        <p
                          className={`font-bold text-base tracking-tight mb-1 ${isCancelled ? "text-slate-300" : "text-white"}`}
                        >
                          {app.service_name}
                        </p>
                        <p
                          className={`text-sm font-bold ${isCancelled ? "text-slate-300" : "text-cyan-300"}`}
                        >
                          {app.price} RON
                        </p>
                      </td>

                      {/* Status */}
                      <td className="py-6 text-right pr-6 align-middle">
                        {isConfirmed && (
                          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500/20 text-green-400 border border-green-500/40 text-xs font-bold uppercase tracking-wider shadow-sm">
                            <span className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_8px_rgba(34,197,94,0.8)]"></span>
                            Finalizat
                          </span>
                        )}
                        {isCancelled && (
                          <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-500 text-white border border-red-600 text-xs font-black uppercase tracking-wider shadow-[0_0_10px_rgba(239,68,68,0.3)]">
                            <span className="text-sm leading-none font-bold">
                              ✕
                            </span>{" "}
                            Anulat
                          </span>
                        )}
                        {isPending && (
                          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-yellow-500/20 text-yellow-400 border border-yellow-500/40 text-xs font-bold uppercase tracking-wider shadow-sm">
                            <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></span>
                            În Așteptare
                          </span>
                        )}
                        {isRescheduled && (
                          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/40 text-xs font-bold uppercase tracking-wider shadow-sm">
                            <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse"></span>
                            Reprogramat
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
