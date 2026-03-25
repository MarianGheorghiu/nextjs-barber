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
  current_month_revenue?: number;
};

export default function FinanceDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [barbers, setBarbers] = useState<BarberFinancial[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [totalClientsCount, setTotalClientsCount] = useState(0);
  const [globalMonthlyRevenue, setGlobalMonthlyRevenue] = useState(0);

  useEffect(() => {
    fetchFinanceData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  // ================= REALTIME SYNC (Financiar) =================
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("realtime-admin-finance")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointments" },
        () => {
          fetchFinanceData(false); // Refresh silențios
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => {
          fetchFinanceData(false); // Refresh silențios pentru numărul de clienți/frizeri
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchFinanceData = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    const { data: barbersData } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, email, shop_name, status")
      .eq("role", "barber")
      .order("created_at", { ascending: false });

    const { count: clientsCount } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "client");

    if (clientsCount !== null) setTotalClientsCount(clientsCount);

    const now = new Date();
    // Folosim o abordare mai sigură pentru fusul orar local
    const firstDayOfMonth = new Date(
      now.getFullYear(),
      now.getMonth(),
      1,
    ).toISOString();

    const { data: appointments } = await supabase
      .from("appointments")
      .select("barber_id, price, appointment_date, appointment_time, status")
      .gte("appointment_date", firstDayOfMonth.split("T")[0]);

    let totalPlatformRevenue = 0;
    const revenuePerBarber: Record<string, number> = {};

    if (appointments) {
      appointments.forEach((app) => {
        const appDateTime = new Date(
          `${app.appointment_date}T${app.appointment_time}`,
        );

        if (app.status !== "cancelled" && appDateTime < now) {
          totalPlatformRevenue += app.price;
          revenuePerBarber[app.barber_id] =
            (revenuePerBarber[app.barber_id] || 0) + app.price;
        }
      });
    }

    setGlobalMonthlyRevenue(totalPlatformRevenue);

    if (barbersData) {
      const enrichedBarbers = barbersData.map((barber) => ({
        ...barber,
        current_month_revenue: revenuePerBarber[barber.id] || 0,
      }));
      setBarbers(enrichedBarbers);
    }

    if (showLoader) setLoading(false);
  };

  const totalBarbersCount = barbers.length;

  const filteredBarbers = barbers.filter((barber) => {
    const searchString =
      `${barber.first_name} ${barber.last_name} ${barber.email} ${barber.shop_name}`.toLowerCase();
    return searchString.includes(searchTerm.toLowerCase());
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh]">
        <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mb-4 shadow-[0_0_15px_rgba(34,211,238,0.5)]"></div>
        <p className="text-cyan-400 font-bold uppercase tracking-widest text-[10px] animate-pulse">
          Se calculează încasările reale...
        </p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in max-w-7xl mx-auto pb-10">
      {/* HEADER */}
      <div className="mb-6">
        <h1 className="text-3xl sm:text-4xl font-black text-white mb-1 tracking-tight">
          Raport Financiar
        </h1>
        <p className="text-slate-400 text-sm font-medium">
          Situația financiară globală calculată la zi.
        </p>
      </div>

      {/* 3 CARDURI COMPACTE LIQUID GLASS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Card: Încasări */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 p-5 rounded-2xl relative overflow-hidden group shadow-lg flex flex-col justify-center">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-green-500/10 rounded-full blur-[30px] group-hover:bg-green-500/20 transition-all pointer-events-none"></div>

          <div className="relative z-10 flex justify-between items-start mb-1">
            <h3 className="text-green-400/90 text-[10px] font-black uppercase tracking-widest">
              Încasări (Luna Curentă)
            </h3>
            <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center border border-green-500/20 text-green-400 shadow-inner">
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
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>

          <div className="relative z-10">
            <p className="text-3xl font-black text-white leading-none">
              {globalMonthlyRevenue.toLocaleString("ro-RO")}{" "}
              <span className="text-xs font-bold text-green-400">RON</span>
            </p>
          </div>
        </div>

        {/* Card: Frizeri */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 p-5 rounded-2xl relative overflow-hidden group shadow-lg flex flex-col justify-center">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-cyan-500/10 rounded-full blur-[30px] group-hover:bg-cyan-500/20 transition-all pointer-events-none"></div>

          <div className="relative z-10 flex justify-between items-start mb-1">
            <h3 className="text-cyan-400/90 text-[10px] font-black uppercase tracking-widest">
              Număr Frizeri / Locații
            </h3>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 text-cyan-400 shadow-inner">
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
                  d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z"
                />
              </svg>
            </div>
          </div>

          <div className="relative z-10 flex items-end justify-between">
            <p className="text-3xl font-black text-white leading-none">
              {totalBarbersCount}
            </p>
            <Link
              href="/admin/barbers"
              className="inline-flex items-center gap-1.5 text-cyan-400 text-[10px] font-black uppercase tracking-widest hover:text-cyan-300 transition-colors"
            >
              Vezi echipa{" "}
              <svg
                className="w-3.5 h-3.5"
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
            </Link>
          </div>
        </div>

        {/* Card: Clienți */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 p-5 rounded-2xl relative overflow-hidden group shadow-lg flex flex-col justify-center">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-purple-500/10 rounded-full blur-[30px] group-hover:bg-purple-500/20 transition-all pointer-events-none"></div>

          <div className="relative z-10 flex justify-between items-start mb-1">
            <h3 className="text-purple-400/90 text-[10px] font-black uppercase tracking-widest">
              Bază Totală Clienți
            </h3>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center border border-purple-500/20 text-purple-400 shadow-inner">
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
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
          </div>

          <div className="relative z-10 flex items-end justify-between">
            <p className="text-3xl font-black text-white leading-none">
              {totalClientsCount}
            </p>
            <Link
              href="/admin/clients"
              className="inline-flex items-center gap-1.5 text-purple-400 text-[10px] font-black uppercase tracking-widest hover:text-purple-300 transition-colors"
            >
              Vezi registrul{" "}
              <svg
                className="w-3.5 h-3.5"
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
            </Link>
          </div>
        </div>
      </div>

      {/* TABEL FINANCIAR LIQUID GLASS */}
      <div className="bg-white/5 backdrop-blur-2xl border border-white/20 rounded-[2.5rem] p-6 sm:p-8 shadow-2xl relative flex flex-col overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-cyan-500/40 via-purple-500/40 to-cyan-500/40"></div>
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-cyan-500/10 rounded-full blur-[80px] pointer-events-none"></div>

        {/* SEARCH BAR & TITLU */}
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10 shrink-0">
          <h3 className="text-lg font-black text-white flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 text-cyan-400 shadow-inner shrink-0">
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
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            Performanță per Angajat
          </h3>
          <div className="relative w-full sm:w-80">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="w-4 h-4 text-slate-400"
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
              placeholder="Caută frizer, locație..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-black/40 border border-white/10 focus:border-cyan-400 rounded-xl pl-9 pr-4 py-2.5 text-white placeholder:text-slate-500 outline-none transition-all shadow-inner text-sm font-medium"
            />
          </div>
        </div>

        <div className="overflow-auto relative z-10 custom-scrollbar max-h-[600px] rounded-xl border border-white/10 bg-black/20 shadow-inner">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead className="sticky top-0 z-20 bg-[#050505]/95 backdrop-blur-xl border-b border-white/20 shadow-sm">
              <tr className="text-slate-300 text-[10px] uppercase tracking-widest font-black">
                <th className="py-3 pl-4">Frizer / Angajat</th>
                <th className="py-3">Nume Locație</th>
                <th className="py-3 text-right">Încasări (Lună Curentă)</th>
                <th className="py-3 text-right pr-4">Analiză Detaliată</th>
              </tr>
            </thead>
            <tbody className="text-white text-sm">
              {filteredBarbers.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="py-12 text-center text-slate-500 font-medium italic"
                  >
                    Nu a fost găsit niciun rezultat.
                  </td>
                </tr>
              ) : (
                filteredBarbers.map((barber) => {
                  const isActive = barber.status !== "suspended";
                  const monthlyRev = barber.current_month_revenue || 0;

                  return (
                    <tr
                      key={barber.id}
                      className={`border-b border-white/5 transition-colors ${!isActive ? "opacity-50 bg-red-500/5" : "hover:bg-white/5"}`}
                    >
                      <td className="py-4 pl-4 align-middle">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-base border shrink-0 shadow-inner ${isActive ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30" : "bg-red-500/10 text-red-400 border-red-500/30"}`}
                          >
                            {barber.first_name
                              ? barber.first_name.charAt(0).toUpperCase()
                              : "?"}
                          </div>
                          <div>
                            <p className="font-bold text-white mb-0.5 flex items-center gap-2 tracking-tight text-base">
                              {barber.first_name} {barber.last_name}
                              {!isActive && (
                                <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 text-[9px] uppercase font-black border border-red-500/30">
                                  Suspendat
                                </span>
                              )}
                            </p>
                            <p className="text-[10px] font-bold text-cyan-400">
                              {barber.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 align-middle">
                        {barber.shop_name ? (
                          <span className="flex items-center gap-1.5 font-bold text-white text-sm">
                            <span className="text-lg">✂️</span>{" "}
                            {barber.shop_name}
                          </span>
                        ) : (
                          <span className="text-slate-500 italic text-xs font-medium">
                            Nesetat
                          </span>
                        )}
                      </td>

                      <td className="py-4 text-right align-middle font-mono">
                        <span className="text-cyan-400 font-black text-xl tracking-tighter">
                          {monthlyRev.toLocaleString("ro-RO")}
                        </span>{" "}
                        <span className="text-cyan-500/70 text-[10px] uppercase font-black tracking-widest ml-0.5">
                          RON
                        </span>
                      </td>

                      <td className="py-4 text-right pr-4 align-middle">
                        <Link
                          href={`/admin/finance/${barber.id}`}
                          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-cyan-400/30 text-white hover:text-cyan-400 transition-all text-xs font-black shadow-sm"
                        >
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2.5"
                              d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
                            />
                          </svg>
                          Vezi Istoric
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
