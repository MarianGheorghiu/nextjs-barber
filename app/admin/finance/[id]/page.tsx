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
  height: string; // Procentaj pentru bara de sticlă
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
    const fetchBarberData = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      // 1. Aflăm detaliile frizerului
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, shop_name")
        .eq("id", barberId)
        .single();

      if (profile) setBarber(profile);

      // 2. Extragem programările din ultimul AN calendaristic
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

      // 3. Calculăm perioadele și generăm Graficul
      let w = 0,
        m = 0,
        m3 = 0,
        m6 = 0,
        y = 0;

      // Setup pentru graficul de 6 luni
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

      // Construim array-ul cu ultimele 6 luni ordonate (inclusiv luna curentă)
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; // ex: 2024-03
        const newObj = {
          monthKey: key,
          monthLabel: monthNames[d.getMonth()],
          value: 0,
          height: "5%",
        }; // min 5% să se vadă
        chartMap[key] = newObj;
        chartArray.push(newObj);
      }

      // 4. Parcurgem datele și împărțim banii
      if (appointments) {
        // Obținem limitelor de timp
        const limitWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const limitMonth = new Date(now.getFullYear(), now.getMonth(), 1); // De la 1 a lunii
        const limit3M = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        const limit6M = new Date(now.getFullYear(), now.getMonth() - 5, 1);

        appointments.forEach((app) => {
          const appDateObj = new Date(
            `${app.appointment_date}T${app.appointment_time}`,
          );

          // Trebuie să fie validă (Trecută și Ne-anulată)
          if (app.status !== "cancelled" && appDateObj < now) {
            const price = app.price;
            y += price; // Dacă e aici, e din ultimul an sigur

            if (appDateObj >= limitWeek) w += price;
            if (appDateObj >= limitMonth) m += price;
            if (appDateObj >= limit3M) m3 += price;
            if (appDateObj >= limit6M) m6 += price;

            // Adăugăm la grafic dacă intră în ultimele 6 luni
            const monthKey = `${appDateObj.getFullYear()}-${String(appDateObj.getMonth() + 1).padStart(2, "0")}`;
            if (chartMap[monthKey]) {
              chartMap[monthKey].value += price;
            }
          }
        });
      }

      setSummary({
        week: w,
        month: m,
        threeMonths: m3,
        sixMonths: m6,
        year: y,
      });

      // Calculăm procentajul de înălțime (Cea mai mare valoare e 100% sau 95%)
      const maxValue = Math.max(...chartArray.map((c) => c.value));
      const finalizedChart = chartArray.map((c) => {
        if (maxValue === 0) return c; // Evităm împărțirea la zero
        // Păstrăm un minim de 10% ca să existe bara fizic chiar dacă valoarea e mică, 95% maxim
        const percentage = Math.max(10, Math.floor((c.value / maxValue) * 95));
        return { ...c, height: `${percentage}%` };
      });

      setChartData(finalizedChart);
      setLoading(false);
    };

    fetchBarberData();
  }, [barberId, router]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh]">
        <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-cyan-400 font-medium animate-pulse">
          Se procesează istoricul financiar...
        </p>
      </div>
    );
  }

  if (!barber) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl text-white font-bold mb-4">
          Frizerul nu a fost găsit
        </h2>
        <Link href="/admin/finance" className="text-cyan-400 hover:underline">
          Înapoi la rapoarte
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-fade-in max-w-6xl mx-auto pb-10">
      {/* 1. Navigare înapoi */}
      <Link
        href="/admin/finance"
        className="inline-flex items-center gap-2 text-slate-400 hover:text-cyan-400 transition-colors mb-8 group font-bold text-sm uppercase tracking-wider"
      >
        <svg
          className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M10 19l-7-7m0 0l7-7m-7 7h18"
          />
        </svg>
        Înapoi la Bilanț
      </Link>

      {/* 2. Header cu numele Frizerului */}
      <div className="flex items-center gap-5 mb-10">
        <div className="w-16 h-16 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-black text-2xl border border-cyan-500/30 shadow-[0_0_20px_rgba(34,211,238,0.2)]">
          {barber.first_name.charAt(0)}
          {barber.last_name.charAt(0)}
        </div>
        <div>
          <h1 className="text-3xl font-black text-white tracking-wide leading-tight">
            Performanță:{" "}
            <span className="text-cyan-400">
              {barber.first_name} {barber.last_name}
            </span>
          </h1>
          <p className="text-slate-400 text-sm mt-1 uppercase tracking-widest font-bold">
            {barber.shop_name || "Locație nesetată"}
          </p>
        </div>
      </div>

      {/* 3. Cele 5 Carduri de Rezumat (Săptămână -> An) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-5 mb-10">
        <div className="bg-white/5 border border-white/10 p-5 rounded-2xl hover:bg-white/10 transition-all group">
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1.5">
            Ultimele 7 Zile
          </p>
          <p className="text-2xl font-bold text-white group-hover:text-cyan-400 transition-colors">
            {summary.week.toLocaleString("ro-RO")}{" "}
            <span className="text-xs text-slate-500 font-bold">RON</span>
          </p>
        </div>

        <div className="bg-white/5 border border-white/10 p-5 rounded-2xl hover:bg-white/10 transition-all group relative overflow-hidden shadow-lg">
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-cyan-500/10 rounded-full blur-xl"></div>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1.5 z-10 relative">
            Luna Curentă
          </p>
          <p className="text-2xl font-bold text-cyan-400 z-10 relative">
            {summary.month.toLocaleString("ro-RO")}{" "}
            <span className="text-xs text-cyan-500/50 font-bold">RON</span>
          </p>
        </div>

        <div className="bg-white/5 border border-white/10 p-5 rounded-2xl hover:bg-white/10 transition-all group">
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1.5">
            Ultimele 3 Luni
          </p>
          <p className="text-2xl font-bold text-white group-hover:text-cyan-400 transition-colors">
            {summary.threeMonths.toLocaleString("ro-RO")}{" "}
            <span className="text-xs text-slate-500 font-bold">RON</span>
          </p>
        </div>

        <div className="bg-white/5 border border-white/10 p-5 rounded-2xl hover:bg-white/10 transition-all group">
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1.5">
            Ultimele 6 Luni
          </p>
          <p className="text-2xl font-bold text-white group-hover:text-cyan-400 transition-colors">
            {summary.sixMonths.toLocaleString("ro-RO")}{" "}
            <span className="text-xs text-slate-500 font-bold">RON</span>
          </p>
        </div>

        <div className="bg-gradient-to-br from-white/5 to-transparent border border-cyan-500/30 p-5 rounded-2xl relative overflow-hidden group col-span-2 lg:col-span-1 shadow-[0_0_20px_rgba(34,211,238,0.1)]">
          <p className="text-cyan-400/80 text-[10px] font-black uppercase tracking-widest mb-1.5 z-10 relative">
            1 An (Total)
          </p>
          <p className="text-2xl font-black text-cyan-400 z-10 relative">
            {summary.year.toLocaleString("ro-RO")}{" "}
            <span className="text-xs text-cyan-500/50 font-bold">RON</span>
          </p>
        </div>
      </div>

      {/* 4. Graficul Real (Evoluție pe ultimele 6 luni) */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
        {/* Glow fundal interior tabel */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[80%] h-32 bg-cyan-500/10 blur-[80px] pointer-events-none"></div>

        <div className="flex justify-between items-end mb-8 relative z-10">
          <div>
            <h3 className="text-xl font-black text-white">
              Evoluție Încasări Reale
            </h3>
            <p className="text-slate-400 text-sm mt-1 font-medium">
              Performanța lunară bazată pe serviciile completate.
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-black/40 rounded-xl border border-white/5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]"></span>
            <span className="text-xs text-slate-300 font-bold uppercase tracking-wider">
              Venit Brut
            </span>
          </div>
        </div>

        {/* Containerul Graficului */}
        <div className="h-64 sm:h-80 w-full mt-4 flex items-end gap-2 sm:gap-6 pt-10 relative z-10 border-b border-white/10 pb-4">
          {chartData.map((data, index) => (
            <div
              key={index}
              className="flex-1 flex flex-col items-center justify-end h-full group relative"
            >
              {/* Tooltip la Hover (Bula cu suma) */}
              <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-all duration-300 bg-[#0a0a0a] border border-cyan-500/30 text-cyan-400 text-sm font-bold py-2 px-3 rounded-xl pointer-events-none z-20 shadow-[0_10px_30px_rgba(34,211,238,0.2)] transform translate-y-4 group-hover:translate-y-0 flex items-center justify-center min-w-max">
                {data.value.toLocaleString("ro-RO")} RON
              </div>

              {/* Bara de sticlă */}
              <div
                className="w-full max-w-[4.5rem] rounded-t-xl relative overflow-hidden transition-all duration-700 ease-out group-hover:brightness-125 cursor-pointer shadow-[0_-5px_15px_rgba(34,211,238,0.1)] group-hover:shadow-[0_-5px_25px_rgba(34,211,238,0.3)]"
                style={{ height: data.height }}
              >
                {/* Gradientul lichid (Dacă valoarea e zero, facem bara fadă) */}
                <div
                  className={`absolute inset-0 border-t border-x rounded-t-xl transition-all ${
                    data.value > 0
                      ? "bg-gradient-to-t from-cyan-500/10 via-cyan-400/40 to-cyan-300/70 border-white/30"
                      : "bg-white/5 border-white/5"
                  }`}
                ></div>
                <div className="absolute top-0 left-0 right-0 h-1 bg-white/40"></div>
              </div>

              {/* Eticheta cu Luna */}
              <div className="absolute -bottom-10 text-slate-400 text-xs sm:text-sm font-bold uppercase tracking-wider group-hover:text-white transition-colors">
                {data.monthLabel}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
