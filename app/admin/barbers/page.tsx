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
  total_clients: number;
  created_at: string;
};

export default function BarbersTeamPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [barbers, setBarbers] = useState<BarberProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchBarbers = async () => {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      // Tragem absolut toate datele necesare
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id, first_name, last_name, email, phone, diploma, shop_name, status, total_clients, created_at",
        )
        .eq("role", "barber")
        .order("created_at", { ascending: false });

      if (data && !error) {
        setBarbers(data);
      }
      setLoading(false);
    };

    fetchBarbers();
  }, [router]);

  // Statistici pentru carduri
  const totalBarbers = barbers.length;
  const activeBarbers = barbers.filter((b) => b.status !== "suspended").length;
  const suspendedBarbers = barbers.filter(
    (b) => b.status === "suspended",
  ).length;

  // Logica de filtrare (Search)
  const filteredBarbers = barbers.filter((barber) => {
    const searchString =
      `${barber.first_name} ${barber.last_name} ${barber.email} ${barber.phone} ${barber.shop_name}`.toLowerCase();
    return searchString.includes(searchTerm.toLowerCase());
  });

  // Funcție de formatare a datei
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = {
      day: "numeric",
      month: "short",
      year: "numeric",
    };
    return new Date(dateString).toLocaleDateString("ro-RO", options);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh]">
        <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-cyan-400 font-medium animate-pulse">
          Se încarcă echipa...
        </p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Echipă Frizeri</h1>
        <p className="text-slate-400">
          Gestionează toți angajații și partenerii platformei.
        </p>
      </div>

      {/* 1. Cele 3 Carduri de Statistici */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
        <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem] flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
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
          <div>
            <p className="text-slate-400 text-sm font-medium">Total Frizeri</p>
            <p className="text-3xl font-bold text-white">{totalBarbers}</p>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem] flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-green-500/20 text-green-400 flex items-center justify-center border border-green-500/30">
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
          <div>
            <p className="text-slate-400 text-sm font-medium">Frizeri Activi</p>
            <p className="text-3xl font-bold text-white">{activeBarbers}</p>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem] flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center border border-red-500/30">
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
          <div>
            <p className="text-slate-400 text-sm font-medium">
              Conturi Suspendate
            </p>
            <p className="text-3xl font-bold text-white">{suspendedBarbers}</p>
          </div>
        </div>
      </div>

      {/* 2. Containerul Tabelului & Search */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 sm:p-8">
        {/* Search Bar */}
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <h3 className="text-xl font-bold text-white w-full sm:w-auto">
            Bază de date echipa
          </h3>
          <div className="relative w-full sm:w-80">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg
                className="w-5 h-5 text-slate-500"
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
              placeholder="Caută frizer, telefon, shop..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-black/20 border border-white/10 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 rounded-xl pl-11 pr-4 py-3 text-white placeholder:text-slate-500 outline-none transition-all"
            />
          </div>
        </div>

        {/* Tabelul Compact & Responsive */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="text-slate-400 border-b border-white/10 text-xs uppercase tracking-wider">
                <th className="pb-4 font-medium pl-2">Profil & Contact</th>
                <th className="pb-4 font-medium">Detalii Profesionale</th>
                <th className="pb-4 font-medium">Activitate</th>
                <th className="pb-4 font-medium text-right pr-2">Detalii</th>
              </tr>
            </thead>
            <tbody className="text-slate-300">
              {filteredBarbers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-slate-500">
                    Nu a fost găsit niciun frizer conform căutării.
                  </td>
                </tr>
              ) : (
                filteredBarbers.map((barber) => {
                  const isActive = barber.status !== "suspended";

                  return (
                    <tr
                      key={barber.id}
                      className={`border-b border-white/5 transition-colors ${!isActive ? "opacity-60" : "hover:bg-white/5"}`}
                    >
                      {/* Coloana 1: Profil (Nume, Email, Telefon) */}
                      <td className="py-4 pl-2 align-top">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold border border-white/10 shrink-0 mt-1">
                            {barber.first_name
                              ? barber.first_name.charAt(0).toUpperCase()
                              : "?"}
                          </div>
                          <div>
                            <p className="font-bold text-white text-base">
                              {barber.first_name} {barber.last_name}
                            </p>
                            <p className="text-sm text-cyan-400 mb-0.5">
                              {barber.email}
                            </p>
                            <p className="text-xs text-slate-500 font-mono">
                              {barber.phone || "Fără telefon"}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Coloana 2: Detalii Profesionale (Shop, Diplomă) */}
                      <td className="py-4 align-top">
                        <div className="flex flex-col gap-1">
                          <p className="text-white font-medium">
                            {barber.shop_name ? (
                              barber.shop_name
                            ) : (
                              <span className="text-slate-600 italic">
                                Shop nesetat
                              </span>
                            )}
                          </p>
                          <p
                            className="text-xs text-slate-400 line-clamp-2 max-w-[250px]"
                            title={barber.diploma}
                          >
                            <span className="text-slate-500">Curs: </span>
                            {barber.diploma || "Nespecificat"}
                          </p>
                        </div>
                      </td>

                      {/* Coloana 3: Activitate (Status, Clienți, Dată) */}
                      <td className="py-4 align-top">
                        <div className="flex flex-col items-start gap-2">
                          {isActive ? (
                            <span className="px-2.5 py-0.5 rounded-md bg-green-500/10 text-green-400 text-[10px] font-bold border border-green-500/20 uppercase tracking-wider">
                              Activ
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-md bg-red-500/10 text-red-400 text-[10px] font-bold border border-red-500/20 uppercase tracking-wider">
                              Suspendat
                            </span>
                          )}
                          <p className="text-sm text-white">
                            <span className="font-bold text-cyan-400">
                              {barber.total_clients}
                            </span>{" "}
                            <span className="text-slate-500 text-xs">
                              Clienți totali
                            </span>
                          </p>
                          <p className="text-[11px] text-slate-500">
                            Înscris: {formatDate(barber.created_at)}
                          </p>
                        </div>
                      </td>

                      {/* Coloana 4: Acțiuni / Detalii */}
                      <td className="py-4 text-right pr-2 align-middle">
                        <Link
                          href={`/admin/barbers/${barber.id}`}
                          className="inline-block px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-cyan-400/30 text-slate-300 hover:text-cyan-400 transition-all text-sm font-medium cursor-pointer"
                        >
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
