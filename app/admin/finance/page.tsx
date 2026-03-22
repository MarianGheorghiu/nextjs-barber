"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

type BarberFinancial = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  shop_name: string;
  status: string;
  current_month_revenue?: number; // Adăugăm proprietatea aici pentru a o afișa
};

export default function FinanceDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [barbers, setBarbers] = useState<BarberFinancial[]>([]);
  const [totalClientsCount, setTotalClientsCount] = useState(0);
  const [globalMonthlyRevenue, setGlobalMonthlyRevenue] = useState(0);

  useEffect(() => {
    const fetchFinanceData = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      // 1. Tragem lista de frizeri
      const { data: barbersData } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email, shop_name, status")
        .eq("role", "barber")
        .order("created_at", { ascending: false });

      // 2. Tragem numărul total de clienți
      const { count: clientsCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("role", "client");

      if (clientsCount !== null) setTotalClientsCount(clientsCount);

      // 3. Tragem TOATE programările de LUNA ASTA pentru a calcula încasările
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .split("T")[0];

      const { data: appointments } = await supabase
        .from("appointments")
        .select("barber_id, price, appointment_date, appointment_time, status")
        .gte("appointment_date", firstDayOfMonth);

      // 4. CALCUL FINANCIAR REAL
      let totalPlatformRevenue = 0;
      const revenuePerBarber: Record<string, number> = {};

      if (appointments) {
        appointments.forEach((app) => {
          // Creăm data și ora exactă a programării
          const appDateTime = new Date(
            `${app.appointment_date}T${app.appointment_time}`,
          );

          // Condiția supremă: Să nu fie anulată și să fi trecut de ora respectivă
          if (app.status !== "cancelled" && appDateTime < now) {
            totalPlatformRevenue += app.price;
            revenuePerBarber[app.barber_id] =
              (revenuePerBarber[app.barber_id] || 0) + app.price;
          }
        });
      }

      setGlobalMonthlyRevenue(totalPlatformRevenue);

      // Mapăm încasările către frizerii noștri
      if (barbersData) {
        const enrichedBarbers = barbersData.map((barber) => ({
          ...barber,
          current_month_revenue: revenuePerBarber[barber.id] || 0,
        }));
        setBarbers(enrichedBarbers);
      }

      setLoading(false);
    };

    fetchFinanceData();
  }, [router]);

  const totalBarbersCount = barbers.length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh]">
        <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-cyan-400 font-medium animate-pulse">
          Se calculează încasările reale...
        </p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Raport Financiar</h1>
        <p className="text-slate-400">
          Situația financiară globală calculată la zi.
        </p>
      </div>

      {/* 1. Cele 3 Carduri Principale */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {/* Card: Total Cash Luna Asta */}
        <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem] flex flex-col justify-between relative overflow-hidden group hover:bg-white/10 transition-all">
          <div className="absolute -right-4 -top-4 w-32 h-32 bg-green-500/10 rounded-full blur-3xl group-hover:bg-green-500/20 transition-all"></div>
          <div className="flex justify-between items-start mb-4 z-10">
            <div>
              <p className="text-slate-400 text-sm font-medium">
                Încasări (Luna Curentă)
              </p>
              <p className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-cyan-400 mt-1">
                {globalMonthlyRevenue.toLocaleString("ro-RO")} RON
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-green-500/20 text-green-400 flex items-center justify-center border border-green-500/30">
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
          <div className="z-10 mt-2">
            <span className="text-green-400/80 text-xs font-bold bg-green-500/10 px-3 py-1.5 rounded-lg border border-green-500/20 flex items-center gap-1 w-max">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>{" "}
              Calculat automat
            </span>
          </div>
        </div>

        {/* Card: Total Frizeri */}
        <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem] flex flex-col justify-between group hover:bg-white/10 transition-all">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-slate-400 text-sm font-medium">
                Număr Frizeri / Shop-uri
              </p>
              <p className="text-3xl font-bold text-white mt-1">
                {totalBarbersCount}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z"
                />
              </svg>
            </div>
          </div>
          <Link
            href="/admin/barbers"
            className="text-cyan-400 text-xs font-bold hover:underline flex items-center gap-1 w-max"
          >
            Vezi toată echipa{" "}
            <svg
              className="w-3 h-3"
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
          </Link>
        </div>

        {/* Card: Total Clienți */}
        <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem] flex flex-col justify-between group hover:bg-white/10 transition-all">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-slate-400 text-sm font-medium">
                Bază Totală Clienți
              </p>
              <p className="text-3xl font-bold text-white mt-1">
                {totalClientsCount}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
              <svg
                className="w-6 h-6"
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
          </div>
          <Link
            href="/admin/clients"
            className="text-purple-400 text-xs font-bold hover:underline flex items-center gap-1 w-max"
          >
            Vezi lista clienților{" "}
            <svg
              className="w-3 h-3"
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
          </Link>
        </div>
      </div>

      {/* 2. Tabel Financiar Per Frizer */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 sm:p-8">
        <h3 className="text-xl font-bold text-white mb-6">
          Performanță Financiară per Shop
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="text-slate-400 border-b border-white/10 text-xs uppercase tracking-wider">
                <th className="pb-4 font-medium pl-2">Frizer / Angajat</th>
                <th className="pb-4 font-medium">Nume Shop</th>
                <th className="pb-4 font-medium text-right">
                  Încasări (Luna Curentă)
                </th>
                <th className="pb-4 font-medium text-right pr-2">
                  Analiză Detaliată
                </th>
              </tr>
            </thead>
            <tbody className="text-slate-300">
              {barbers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-slate-500">
                    Niciun frizer înregistrat.
                  </td>
                </tr>
              ) : (
                barbers.map((barber) => {
                  const isActive = barber.status !== "suspended";
                  const monthlyRev = barber.current_month_revenue || 0;

                  return (
                    <tr
                      key={barber.id}
                      className={`border-b border-white/5 transition-colors ${!isActive ? "opacity-60" : "hover:bg-white/5"}`}
                    >
                      {/* Nume */}
                      <td className="py-4 pl-2 align-middle">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-white font-bold border border-white/10 shrink-0">
                            {barber.first_name
                              ? barber.first_name.charAt(0).toUpperCase()
                              : "?"}
                          </div>
                          <div>
                            <p className="font-bold text-white">
                              {barber.first_name} {barber.last_name}
                            </p>
                            <p className="text-xs text-slate-500">
                              {barber.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Shop */}
                      <td className="py-4 align-middle">
                        <p className="text-white font-medium">
                          {barber.shop_name ? (
                            barber.shop_name
                          ) : (
                            <span className="text-slate-600 italic">
                              Shop nesetat
                            </span>
                          )}
                        </p>
                      </td>

                      {/* Bani */}
                      <td className="py-4 text-right align-middle font-mono">
                        <span className="text-cyan-400 font-bold text-lg">
                          {monthlyRev.toLocaleString("ro-RO")}
                        </span>{" "}
                        <span className="text-slate-500 text-sm">RON</span>
                      </td>

                      {/* Buton Raport */}
                      <td className="py-4 text-right pr-2 align-middle">
                        <Link
                          href={`/admin/finance/${barber.id}`}
                          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 transition-all text-sm font-bold cursor-pointer"
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
                              d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
                            />
                          </svg>
                          Vezi Detalii
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
