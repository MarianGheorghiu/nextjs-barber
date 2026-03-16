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

    // 1. Tragem numărul de frizerii favorite din profil
    const { data: profile } = await supabase
      .from("profiles")
      .select("favorite_barbers")
      .eq("id", user.id)
      .single();

    if (profile && profile.favorite_barbers) {
      setFavoritesCount(profile.favorite_barbers.length);
    }

    // 2. Tragem toate programările clientului, ordonate descrescător (cele mai noi primele)
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

  // Filtrăm programările pentru Search Bar
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

  // Calcule pentru Panouri
  const confirmedAppointments = appointments.filter(
    (a) => a.status === "confirmed",
  );
  const totalCompleted = confirmedAppointments.length;
  const lastAppointment = confirmedAppointments[0] || null;

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in max-w-6xl mx-auto pb-10">
      {/* HEADER & BUTON CTA */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-10">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
            Istoricul Meu
          </h1>
          <p className="text-slate-300">
            Toate vizitele și experiențele tale în locațiile noastre.
          </p>
        </div>
        <Link
          href="/client"
          className="cursor-pointer bg-cyan-500 hover:bg-cyan-400 text-[#0a0a0a] font-bold px-6 py-3.5 rounded-xl transition-all shadow-[0_0_20px_rgba(34,211,238,0.3)] flex items-center gap-2 whitespace-nowrap"
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
        {/* Panou 1 */}
        <div className="bg-cyan-500/10 border border-cyan-500/20 p-6 rounded-3xl relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-cyan-500/20 rounded-full blur-2xl transition-all"></div>
          <p className="text-cyan-400/80 text-xs font-bold uppercase tracking-wider mb-2 relative z-10">
            Total Vizite
          </p>
          <div className="flex items-end gap-3 relative z-10">
            <span className="text-5xl font-black text-cyan-400 leading-none">
              {totalCompleted}
            </span>
            <span className="text-slate-300 font-medium mb-1">
              programări finalizate
            </span>
          </div>
        </div>

        {/* Panou 2 */}
        <div className="bg-purple-500/10 border border-purple-500/20 p-6 rounded-3xl relative overflow-hidden flex flex-col justify-center">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-purple-500/20 rounded-full blur-2xl transition-all"></div>
          <p className="text-purple-400/80 text-xs font-bold uppercase tracking-wider mb-3 relative z-10">
            Ultima Vizită
          </p>

          {lastAppointment ? (
            <div className="relative z-10">
              <p className="text-xl font-bold text-white leading-tight mb-1 line-clamp-1">
                {lastAppointment.profiles?.barbershop_name ||
                  lastAppointment.profiles?.first_name}
              </p>
              <div className="flex items-center gap-2 text-sm mt-2">
                <span className="text-purple-400 font-bold bg-purple-500/20 px-2 py-0.5 rounded-md">
                  {new Date(
                    lastAppointment.appointment_date,
                  ).toLocaleDateString("ro-RO", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
                <span className="text-slate-200">
                  ora {lastAppointment.appointment_time.slice(0, 5)}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-slate-300 italic relative z-10">
              Nicio vizită finalizată.
            </p>
          )}
        </div>

        {/* Panou 3 */}
        <div className="bg-pink-500/10 border border-pink-500/20 p-6 rounded-3xl relative overflow-hidden flex flex-col justify-center">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-pink-500/20 rounded-full blur-2xl transition-all"></div>
          <p className="text-pink-400/80 text-xs font-bold uppercase tracking-wider mb-2 relative z-10">
            Locații Favorite
          </p>
          <div className="flex items-end gap-3 relative z-10">
            <span className="text-5xl font-black text-pink-400 leading-none">
              {favoritesCount}
            </span>
            <span className="text-slate-300 font-medium mb-1 flex items-center gap-1">
              salvate în cont{" "}
              <svg
                className="w-4 h-4 text-pink-400"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </span>
          </div>
        </div>
      </div>

      {/* SEARCH BAR (Luminos) */}
      <div className="mb-6 relative">
        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-400">
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
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <input
          type="text"
          placeholder="Caută după nume locație, serviciu sau dată..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white/10 backdrop-blur-md border border-white/20 focus:border-cyan-400 rounded-2xl pl-12 pr-4 py-4 text-white outline-none transition-all shadow-inner placeholder:text-slate-400 font-medium"
        />
      </div>

      {/* TABEL ISTORIC LIQUID (Contrast Crescut) */}
      <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-[2.5rem] p-6 sm:p-8 relative overflow-hidden shadow-2xl">
        {/* Glow fundal tabel */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none"></div>

        {appointments.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/20 text-2xl">
              🗓️
            </div>
            <p className="text-white font-medium text-lg mb-2">
              Nu ai nicio programare în istoric.
            </p>
            <p className="text-sm text-slate-300">
              Apasă butonul de sus pentru a rezerva primul tău loc.
            </p>
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className="text-center py-12 text-slate-300 font-medium italic">
            Nu s-a găsit nicio programare care să corespundă căutării.
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar relative z-10">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="text-slate-200 border-b border-white/20 text-xs uppercase tracking-wider">
                  <th className="pb-4 font-bold pl-2">Locație & Frizer</th>
                  <th className="pb-4 font-bold">Data & Ora</th>
                  <th className="pb-4 font-bold">Serviciu</th>
                  <th className="pb-4 font-bold text-right pr-2">Status</th>
                </tr>
              </thead>
              <tbody className="text-white">
                {filteredAppointments.map((app) => {
                  const isConfirmed = app.status === "confirmed";
                  const isCancelled = app.status === "cancelled";
                  const isPending = app.status === "pending";
                  const isRescheduled = app.status === "rescheduled";

                  return (
                    <tr
                      key={app.id}
                      className={`border-b border-white/10 transition-colors group ${isCancelled ? "opacity-75" : "hover:bg-white/10"}`}
                    >
                      {/* Frizerie */}
                      <td className="py-5 pl-2 align-middle">
                        <p
                          className={`font-bold text-lg ${isCancelled ? "text-slate-400 line-through decoration-slate-500" : "text-white"}`}
                        >
                          {app.profiles?.barbershop_name || "Salon"}
                        </p>
                        <p
                          className={`text-sm mt-0.5 ${isCancelled ? "text-slate-500" : "text-slate-300"}`}
                        >
                          {app.profiles?.first_name} {app.profiles?.last_name}
                        </p>
                      </td>

                      {/* Data și Ora */}
                      <td className="py-5 align-middle">
                        <p className="text-white font-semibold capitalize text-base">
                          {new Date(app.appointment_date).toLocaleDateString(
                            "ro-RO",
                            { day: "numeric", month: "short", year: "numeric" },
                          )}
                        </p>
                        <p
                          className={`font-mono text-base mt-0.5 font-bold ${isCancelled ? "text-slate-400" : "text-cyan-400"}`}
                        >
                          {app.appointment_time.slice(0, 5)}
                        </p>
                      </td>

                      {/* Serviciu & Preț */}
                      <td className="py-5 align-middle">
                        <p className="text-white font-semibold text-base">
                          {app.service_name}
                        </p>
                        <p
                          className={`text-sm font-bold mt-0.5 ${isCancelled ? "text-slate-400" : "text-cyan-300"}`}
                        >
                          {app.price} RON
                        </p>
                      </td>

                      {/* Status */}
                      <td className="py-5 text-right pr-2 align-middle">
                        {isConfirmed && (
                          <span className="inline-flex px-4 py-2 rounded-xl bg-green-500/20 text-green-400 border border-green-500/30 text-sm font-bold shadow-sm">
                            Finalizat
                          </span>
                        )}
                        {isCancelled && (
                          <span className="inline-flex px-4 py-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 text-sm font-bold">
                            Anulat
                          </span>
                        )}
                        {isPending && (
                          <span className="inline-flex px-4 py-2 rounded-xl bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 text-sm font-bold shadow-sm">
                            În Așteptare
                          </span>
                        )}
                        {isRescheduled && (
                          <span className="inline-flex px-4 py-2 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30 text-sm font-bold shadow-sm">
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
