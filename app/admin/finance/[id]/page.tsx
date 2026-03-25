"use client";

import { useEffect, useState, use } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

type BarberProfile = {
  id: string;
  first_name: string;
  last_name: string;
  shop_name: string;
};

type FinanceSummary = {
  week: number;
  month: number;
  threeMonths: number;
  sixMonths: number;
  year: number;
};

type ChartData = {
  monthKey: string;
  monthLabel: string;
  value: number;
  height: string;
};

export default function BarberFinancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const barberId = resolvedParams.id;

  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [barber, setBarber] = useState<BarberProfile | null>(null);

  const [summary, setSummary] = useState<FinanceSummary>({
    week: 0,
    month: 0,
    threeMonths: 0,
    sixMonths: 0,
    year: 0,
  });
  const [chartData, setChartData] = useState<ChartData[]>([]);

  useEffect(() => {
    fetchBarberData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [barberId, router]);

  // ================= REALTIME SYNC (Grafic) =================
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("realtime-barber-finance-chart")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "appointments",
          filter: `barber_id=eq.${barberId}`,
        },
        () => {
          fetchBarberData(false); // Refresh silențios ca să se miște barele și numerele
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [barberId]);

  const fetchBarberData = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, shop_name")
      .eq("id", barberId)
      .single();

    if (profile) setBarber(profile);

    const now = new Date();
    const oneYearAgo = new Date(
      now.getFullYear() - 1,
      now.getMonth(),
      now.getDate(),
    )
      .toISOString()
      .split("T")[0];

    const { data: appointments } = await supabase
      .from("appointments")
      .select("price, appointment_date, appointment_time, status")
      .eq("barber_id", barberId)
      .gte("appointment_date", oneYearAgo);

    let w = 0,
      m = 0,
      m3 = 0,
      m6 = 0,
      y = 0;

    const monthNames = [
      "Ian",
      "Feb",
      "Mar",
      "Apr",
      "Mai",
      "Iun",
      "Iul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const chartMap: Record<string, ChartData> = {};
    const chartArray: ChartData[] = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const newObj = {
        monthKey: key,
        monthLabel: monthNames[d.getMonth()],
        value: 0,
        height: "5%",
      };
      chartMap[key] = newObj;
      chartArray.push(newObj);
    }

    if (appointments) {
      const limitWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const limitMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const limit3M = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      const limit6M = new Date(now.getFullYear(), now.getMonth() - 5, 1);

      appointments.forEach((app) => {
        const appDateObj = new Date(
          `${app.appointment_date}T${app.appointment_time}`,
        );

        if (app.status !== "cancelled" && appDateObj < now) {
          const price = app.price;
          y += price;

          if (appDateObj >= limitWeek) w += price;
          if (appDateObj >= limitMonth) m += price;
          if (appDateObj >= limit3M) m3 += price;
          if (appDateObj >= limit6M) m6 += price;

          const monthKey = `${appDateObj.getFullYear()}-${String(appDateObj.getMonth() + 1).padStart(2, "0")}`;
          if (chartMap[monthKey]) {
            chartMap[monthKey].value += price;
          }
        }
      });
    }

    setSummary({ week: w, month: m, threeMonths: m3, sixMonths: m6, year: y });

    const maxValue = Math.max(...chartArray.map((c) => c.value));
    const finalizedChart = chartArray.map((c) => {
      if (maxValue === 0) return c;
      const percentage = Math.max(8, Math.floor((c.value / maxValue) * 95));
      return { ...c, height: `${percentage}%` };
    });

    setChartData(finalizedChart);
    if (showLoader) setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh]">
        <div className="w-10 h-10 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mb-4 shadow-[0_0_15px_rgba(34,211,238,0.5)]"></div>
        <p className="text-cyan-400 font-bold uppercase tracking-widest text-[10px] animate-pulse">
          Se procesează istoricul financiar...
        </p>
      </div>
    );
  }

  if (!barber) {
    return (
      <div className="text-center py-20 animate-fade-in">
        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10 text-2xl shadow-inner">
          🔍
        </div>
        <h2 className="text-xl text-white font-black mb-4 tracking-tight">
          Frizerul nu a fost găsit
        </h2>
        <Link
          href="/admin/finance"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold transition-all shadow-sm text-sm"
        >
          Înapoi la rapoarte
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-fade-in max-w-6xl mx-auto pb-6">
      {/* Navigare Compactă */}
      <Link
        href="/admin/finance"
        className="inline-flex items-center gap-1.5 text-slate-400 hover:text-cyan-400 transition-colors mb-5 group font-black text-xs uppercase tracking-widest px-3 py-1.5 rounded-lg border border-transparent hover:border-white/10 hover:bg-white/5 w-max"
      >
        <svg
          className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.5"
            d="M10 19l-7-7m0 0l7-7m-7 7h18"
          />
        </svg>
        Înapoi la Bilanț
      </Link>

      {/* Header Frizer Compact, dar vizibil */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-[2rem] shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-cyan-500/10 rounded-full blur-[40px] pointer-events-none"></div>
        <div className="flex items-center gap-5 relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-black text-2xl border border-cyan-500/30 shadow-inner shrink-0">
            {barber.first_name.charAt(0)}
            {barber.last_name.charAt(0)}
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight mb-1">
              Raport:{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                {barber.first_name} {barber.last_name}
              </span>
            </h1>
            <p className="text-slate-400 text-xs uppercase tracking-widest font-black flex items-center gap-1.5">
              <span className="text-base">✂️</span>{" "}
              {barber.shop_name || "Locație nesetată"}
            </p>
          </div>
        </div>
      </div>

      {/* 5 Carduri Rezumat (Dimensiuni Medii) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {[
          { label: "7 Zile", val: summary.week, color: "text-white" },
          {
            label: "Luna Curentă",
            val: summary.month,
            color: "text-cyan-400",
            bg: "bg-white/10 border-cyan-500/30 shadow-[0_0_15px_rgba(34,211,238,0.15)]",
            glow: true,
          },
          {
            label: "3 Luni",
            val: summary.threeMonths,
            color: "text-white",
          },
          {
            label: "6 Luni",
            val: summary.sixMonths,
            color: "text-white",
          },
        ].map((item, idx) => (
          <div
            key={idx}
            className={`border p-5 rounded-2xl transition-all group relative overflow-hidden shadow-sm ${item.bg || "bg-white/5 border-white/10 hover:bg-white/10"}`}
          >
            {item.glow && (
              <div className="absolute -right-4 -top-4 w-16 h-16 bg-cyan-500/20 rounded-full blur-xl"></div>
            )}
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1.5 z-10 relative">
              {item.label}
            </p>
            <p
              className={`text-2xl font-black z-10 relative tracking-tight ${item.color}`}
            >
              {item.val.toLocaleString("ro-RO")}{" "}
              <span
                className={`text-[10px] font-black uppercase tracking-widest ${item.glow ? "text-cyan-500/70" : "text-slate-500"}`}
              >
                RON
              </span>
            </p>
          </div>
        ))}

        {/* Card Anual */}
        <div className="bg-gradient-to-br from-white/10 to-transparent border border-purple-500/30 p-5 rounded-2xl relative overflow-hidden group col-span-2 lg:col-span-1 shadow-[0_0_15px_rgba(168,85,247,0.15)] flex flex-col justify-center">
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-purple-500/20 rounded-full blur-xl"></div>
          <p className="text-purple-400/90 text-[10px] font-black uppercase tracking-widest mb-1.5 z-10 relative">
            1 An (Total)
          </p>
          <p className="text-2xl font-black text-purple-400 z-10 relative tracking-tight">
            {summary.year.toLocaleString("ro-RO")}{" "}
            <span className="text-[10px] font-black uppercase tracking-widest text-purple-500/70">
              RON
            </span>
          </p>
        </div>
      </div>

      {/* GRAFIC EVOLUȚIE (Dimensiune Proporțională) */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 sm:p-8 shadow-xl relative overflow-hidden flex flex-col">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[80%] h-32 bg-cyan-500/10 blur-[80px] pointer-events-none"></div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 relative z-10 gap-4">
          <div>
            <h3 className="text-xl font-black text-white flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 text-cyan-400 shadow-inner">
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
                    d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
                  />
                </svg>
              </span>
              Evoluție 6 Luni
            </h3>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-black/40 rounded-xl border border-white/5 shadow-inner">
            <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)] animate-pulse"></span>
            <span className="text-[10px] text-cyan-400/80 font-black uppercase tracking-widest">
              Live
            </span>
          </div>
        </div>

        {/* BARELE GRAFICULUI */}
        <div className="h-56 sm:h-72 w-full mt-2 flex items-end gap-3 sm:gap-8 pt-10 relative z-10 border-b border-white/10 pb-5 px-2 sm:px-6">
          {chartData.map((data, index) => (
            <div
              key={index}
              className="flex-1 flex flex-col items-center justify-end h-full group relative"
            >
              {/* Tooltip Hover */}
              <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-all duration-300 bg-[#0a0a0a] border border-cyan-500/40 text-cyan-400 text-sm font-black py-2 px-3.5 rounded-xl pointer-events-none z-20 shadow-[0_5px_20px_rgba(34,211,238,0.3)] transform translate-y-2 group-hover:translate-y-0 flex items-center justify-center min-w-max tracking-tight">
                {data.value.toLocaleString("ro-RO")}
              </div>

              {/* Bara Lichidă */}
              <div
                className="w-full max-w-[4.5rem] rounded-t-xl relative overflow-hidden transition-all duration-1000 ease-out group-hover:brightness-125 cursor-pointer shadow-[0_-2px_15px_rgba(34,211,238,0.05)] group-hover:shadow-[0_-5px_25px_rgba(34,211,238,0.3)] group-hover:scale-y-[1.02] origin-bottom"
                style={{ height: data.height }}
              >
                <div
                  className={`absolute inset-0 border-t border-x rounded-t-xl transition-all duration-500 ${data.value > 0 ? "bg-gradient-to-t from-cyan-500/10 via-cyan-400/30 to-cyan-300/60 border-white/30" : "bg-white/5 border-white/10"}`}
                ></div>
                <div className="absolute top-0 left-0 w-full h-[2px] bg-white/50"></div>
              </div>

              {/* Label Lună */}
              <div className="absolute -bottom-7 text-slate-500 text-[10px] sm:text-xs font-black uppercase tracking-widest group-hover:text-cyan-400 transition-colors">
                {data.monthLabel}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
