"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

type BarberProfile = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  diploma: string;
  shop_name: string;
  status: string;
  created_at: string;
  total_appointments?: number;
  total_unique_clients?: number;
};

export default function BarbersTeamPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [barbers, setBarbers] = useState<BarberProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchBarbersAndStats = async () => {
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
        .select(
          "id, first_name, last_name, email, phone, diploma, shop_name, status, created_at",
        )
        .eq("role", "barber")
        .order("created_at", { ascending: false });

      const now = new Date().toISOString();
      const { data: appointmentsData } = await supabase
        .from("appointments")
        .select("barber_id, client_id")
        .neq("status", "cancelled")
        .lt("appointment_date", now);

      if (profilesData) {
        const appointmentCounts: Record<string, number> = {};
        const clientSets: Record<string, Set<string>> = {};

        if (appointmentsData) {
          appointmentsData.forEach((app) => {
            appointmentCounts[app.barber_id] =
              (appointmentCounts[app.barber_id] || 0) + 1;

            if (!clientSets[app.barber_id]) {
              clientSets[app.barber_id] = new Set();
            }
            clientSets[app.barber_id].add(app.client_id);
          });
        }

        const enrichedBarbers = profilesData.map((barber) => ({
          ...barber,
          total_appointments: appointmentCounts[barber.id] || 0,
          total_unique_clients: clientSets[barber.id]
            ? clientSets[barber.id].size
            : 0,
        }));

        setBarbers(enrichedBarbers);
      }
      setLoading(false);
    };

    fetchBarbersAndStats();
  }, [router]);

  const totalBarbers = barbers.length;
  const activeBarbers = barbers.filter((b) => b.status !== "suspended").length;
  const suspendedBarbers = barbers.filter(
    (b) => b.status === "suspended",
  ).length;

  const filteredBarbers = barbers.filter((barber) => {
    const searchString =
      `${barber.first_name} ${barber.last_name} ${barber.email} ${barber.phone} ${barber.shop_name}`.toLowerCase();
    return searchString.includes(searchTerm.toLowerCase());
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh]">
        <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-cyan-400 font-medium animate-pulse">
          Se încarcă baza de date a frizerilor...
        </p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in max-w-7xl mx-auto pb-10">
      <div className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
          Echipă Frizeri
        </h1>
        <p className="text-slate-400">
          Gestionează toți angajații și partenerii platformei.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10">
        <div className="bg-cyan-500/10 border border-cyan-500/20 p-6 rounded-3xl flex items-center gap-5 relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-cyan-500/20 rounded-full blur-2xl transition-all"></div>
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30 group-hover:scale-110 transition-transform relative z-10 shadow-inner">
            <svg
              className="w-7 h-7"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
          <div className="relative z-10">
            <p className="text-cyan-400/80 text-xs font-bold uppercase tracking-wider mb-1">
              Total Echipa
            </p>
            <p className="text-3xl font-black text-cyan-400">{totalBarbers}</p>
          </div>
        </div>

        <div className="bg-green-500/10 border border-green-500/20 p-6 rounded-3xl flex items-center gap-5 relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-green-500/20 rounded-full blur-2xl transition-all"></div>
          <div className="w-14 h-14 rounded-2xl bg-green-500/20 text-green-400 flex items-center justify-center border border-green-500/30 group-hover:scale-110 transition-transform relative z-10 shadow-inner">
            <svg
              className="w-7 h-7"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div className="relative z-10">
            <p className="text-green-400/80 text-xs font-bold uppercase tracking-wider mb-1">
              Frizeri Activi
            </p>
            <p className="text-3xl font-black text-green-400">
              {activeBarbers}
            </p>
          </div>
        </div>

        <div className="bg-red-500/5 border border-red-500/20 p-6 rounded-3xl flex items-center gap-5 relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-red-500/10 rounded-full blur-2xl transition-all"></div>
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center border border-red-500/20 group-hover:scale-110 transition-transform relative z-10 shadow-inner">
            <svg
              className="w-7 h-7"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
              />
            </svg>
          </div>
          <div className="relative z-10">
            <p className="text-red-400/80 text-xs font-bold uppercase tracking-wider mb-1">
              Conturi Suspendate
            </p>
            <p className="text-3xl font-black text-red-400">
              {suspendedBarbers}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 sm:p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
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
                d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            Registru Angajați
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
              placeholder="Caută frizer, telefon, frizerie..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-black/40 border border-white/10 focus:border-cyan-400 rounded-xl pl-11 pr-4 py-3.5 text-white placeholder:text-slate-500 outline-none transition-all shadow-inner"
            />
          </div>
        </div>

        <div className="overflow-x-auto relative z-10 custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="text-slate-400 border-b border-white/10 text-xs uppercase tracking-wider">
                <th className="pb-4 font-bold pl-4">Profil & Contact</th>
                <th className="pb-4 font-bold">Detalii Profesionale</th>
                <th className="pb-4 font-bold text-center">Activitate</th>
                <th className="pb-4 font-bold text-right pr-4">Acces Profil</th>
              </tr>
            </thead>
            <tbody className="text-white">
              {filteredBarbers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-16 text-center">
                    <p className="text-slate-300 font-medium">
                      Niciun frizer nu corespunde căutării.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredBarbers.map((barber) => {
                  const isActive = barber.status !== "suspended";
                  const appointmentsCount = barber.total_appointments ?? 0;
                  const clientsCount = barber.total_unique_clients ?? 0;

                  return (
                    <tr
                      key={barber.id}
                      className={`border-b border-white/5 transition-colors group ${!isActive ? "opacity-60 bg-red-500/5" : "hover:bg-white/5"}`}
                    >
                      <td className="py-5 pl-4 align-middle">
                        <div className="flex items-center gap-4">
                          <div
                            className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg border shrink-0 shadow-inner transition-colors ${
                              isActive
                                ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30 group-hover:bg-cyan-500/20"
                                : "bg-red-500/10 text-red-400 border-red-500/30"
                            }`}
                          >
                            {barber.first_name
                              ? barber.first_name.charAt(0).toUpperCase()
                              : "?"}
                          </div>
                          <div>
                            <p className="font-bold text-white text-lg tracking-tight mb-0.5 flex items-center gap-2">
                              {barber.first_name} {barber.last_name}
                              {!isActive && (
                                <span className="px-2 py-0.5 rounded-md bg-red-500/20 text-red-400 text-[10px] uppercase font-black border border-red-500/30">
                                  Suspendat
                                </span>
                              )}
                            </p>
                            <p className="text-sm text-cyan-400">
                              {barber.email}
                            </p>
                            <p className="text-xs text-slate-500 font-mono mt-0.5">
                              {barber.phone || "Fără telefon"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-5 align-middle">
                        <div className="flex flex-col gap-1.5">
                          <p className="text-white font-bold text-base flex items-center gap-2">
                            <span className="text-xl">✂️</span>
                            {barber.shop_name ? (
                              barber.shop_name
                            ) : (
                              <span className="text-slate-500 italic font-medium">
                                Fără frizerie
                              </span>
                            )}
                          </p>
                          <p
                            className="text-xs text-slate-400 max-w-[200px] truncate"
                            title={barber.diploma}
                          >
                            <span className="text-slate-500 font-bold uppercase tracking-wider mr-1">
                              Curs:
                            </span>
                            {barber.diploma || "Nespecificat"}
                          </p>
                        </div>
                      </td>

                      <td className="py-5 align-middle text-center">
                        <div className="flex justify-center gap-6">
                          <div className="inline-flex flex-col items-center">
                            <span
                              className={`text-2xl font-black ${appointmentsCount > 0 ? "text-cyan-400" : "text-slate-600"}`}
                            >
                              {appointmentsCount}
                            </span>
                            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                              Servicii
                            </span>
                          </div>
                          <div className="inline-flex flex-col items-center">
                            <span
                              className={`text-2xl font-black ${clientsCount > 0 ? "text-purple-400" : "text-slate-600"}`}
                            >
                              {clientsCount}
                            </span>
                            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                              Clienți
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-5 text-right pr-4 align-middle">
                        <Link
                          href={`/admin/barbers/${barber.id}`}
                          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-cyan-400/30 text-slate-300 hover:text-cyan-400 transition-all text-sm font-bold shadow-sm"
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
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
                          Vezi Profil
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
