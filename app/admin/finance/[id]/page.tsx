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

// Date fictive pentru a construi UI-ul graficelor
const MOCK_FINANCE_DATA = {
  summary: {
    week: 1250,
    month: 5400,
    threeMonths: 15200,
    sixMonths: 28500,
    year: 54000,
  },
  // Date pentru graficul cu bare (ultimele 6 luni)
  chart: [
    { month: "Oct", value: 4200, height: "60%" },
    { month: "Nov", value: 4800, height: "70%" },
    { month: "Dec", value: 6500, height: "95%" }, // Luna de top (Sărbători)
    { month: "Ian", value: 3100, height: "45%" },
    { month: "Feb", value: 4500, height: "65%" },
    { month: "Mar", value: 5400, height: "80%" },
  ],
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

  useEffect(() => {
    const fetchBarber = async () => {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, shop_name")
        .eq("id", barberId)
        .single();

      if (data && !error) {
        setBarber(data);
      }
      setLoading(false);
    };

    fetchBarber();
  }, [barberId, router]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh]">
        <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-cyan-400 font-medium">
          Se încarcă analizele financiare...
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
        className="inline-flex items-center gap-2 text-slate-400 hover:text-cyan-400 transition-colors mb-8 group"
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
        Înapoi la Tabelul Financiar
      </Link>

      {/* 2. Header cu numele Frizerului */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-16 h-16 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-2xl border border-cyan-500/30">
          {barber.first_name.charAt(0)}
          {barber.last_name.charAt(0)}
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white tracking-wide">
            Raport:{" "}
            <span className="text-cyan-400">
              {barber.first_name} {barber.last_name}
            </span>
          </h1>
          <p className="text-slate-400 text-lg mt-1">
            {barber.shop_name || "Shop Nesetat"}
          </p>
        </div>
      </div>

      {/* 3. Cele 5 Carduri de Rezumat (Săptămână -> An) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-10">
        {/* 1 Săptămână */}
        <div className="bg-white/5 border border-white/10 p-5 rounded-2xl hover:bg-white/10 transition-all group">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
            Ultimele 7 Zile
          </p>
          <p className="text-2xl font-bold text-white group-hover:text-cyan-400 transition-colors">
            {MOCK_FINANCE_DATA.summary.week.toLocaleString("ro-RO")}{" "}
            <span className="text-sm text-slate-500 font-normal">RON</span>
          </p>
        </div>

        {/* 1 Lună */}
        <div className="bg-white/5 border border-white/10 p-5 rounded-2xl hover:bg-white/10 transition-all group relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-cyan-500/10 rounded-full blur-xl"></div>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2 z-10 relative">
            Luna Curentă
          </p>
          <p className="text-2xl font-bold text-white group-hover:text-cyan-400 transition-colors z-10 relative">
            {MOCK_FINANCE_DATA.summary.month.toLocaleString("ro-RO")}{" "}
            <span className="text-sm text-slate-500 font-normal">RON</span>
          </p>
        </div>

        {/* 3 Luni */}
        <div className="bg-white/5 border border-white/10 p-5 rounded-2xl hover:bg-white/10 transition-all group">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
            Ultimele 3 Luni
          </p>
          <p className="text-2xl font-bold text-white group-hover:text-cyan-400 transition-colors">
            {MOCK_FINANCE_DATA.summary.threeMonths.toLocaleString("ro-RO")}{" "}
            <span className="text-sm text-slate-500 font-normal">RON</span>
          </p>
        </div>

        {/* 6 Luni */}
        <div className="bg-white/5 border border-white/10 p-5 rounded-2xl hover:bg-white/10 transition-all group">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
            Ultimele 6 Luni
          </p>
          <p className="text-2xl font-bold text-white group-hover:text-cyan-400 transition-colors">
            {MOCK_FINANCE_DATA.summary.sixMonths.toLocaleString("ro-RO")}{" "}
            <span className="text-sm text-slate-500 font-normal">RON</span>
          </p>
        </div>

        {/* 1 An */}
        <div className="bg-white/5 border border-cyan-500/20 p-5 rounded-2xl relative overflow-hidden group col-span-2 lg:col-span-1 shadow-[0_0_15px_rgba(34,211,238,0.05)]">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent"></div>
          <p className="text-cyan-500/80 text-xs font-bold uppercase tracking-wider mb-2 z-10 relative">
            1 An (Total)
          </p>
          <p className="text-2xl font-bold text-cyan-400 z-10 relative">
            {MOCK_FINANCE_DATA.summary.year.toLocaleString("ro-RO")}{" "}
            <span className="text-sm text-cyan-500/50 font-normal">RON</span>
          </p>
        </div>
      </div>

      {/* 4. Graficul CSS "Liquid Glass" (Evoluție pe ultimele 6 luni) */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h3 className="text-xl font-bold text-white">Evoluție Încasări</h3>
            <p className="text-slate-400 text-sm mt-1">
              Performanța pe ultimele 6 luni de activitate.
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]"></span>
            <span className="text-sm text-slate-300 font-medium">
              Venit Brut
            </span>
          </div>
        </div>

        {/* Containerul Graficului */}
        <div className="h-64 sm:h-80 w-full mt-4 flex items-end gap-2 sm:gap-6 pt-10">
          {MOCK_FINANCE_DATA.chart.map((data, index) => (
            <div
              key={index}
              className="flex-1 flex flex-col items-center justify-end h-full group relative"
            >
              {/* Tooltip la Hover (Bula cu suma) */}
              <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-all duration-300 bg-black/80 backdrop-blur-md border border-white/10 text-white text-xs font-bold py-1.5 px-3 rounded-lg pointer-events-none z-20 shadow-xl transform translate-y-2 group-hover:translate-y-0">
                {data.value.toLocaleString("ro-RO")} RON
              </div>

              {/* Bara de sticlă */}
              <div
                className="w-full max-w-[4rem] rounded-t-xl relative overflow-hidden transition-all duration-500 ease-out group-hover:brightness-125 cursor-pointer shadow-[0_-5px_15px_rgba(34,211,238,0.1)] group-hover:shadow-[0_-5px_25px_rgba(34,211,238,0.2)]"
                style={{ height: data.height }}
              >
                {/* Gradientul lichid */}
                <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/10 via-cyan-400/50 to-cyan-300/80 border-t border-x border-white/20 rounded-t-xl"></div>

                {/* O mică reflexie de lumină sus (efect glass) */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-white/40"></div>
              </div>

              {/* Eticheta cu Luna */}
              <div className="mt-4 text-slate-400 text-xs sm:text-sm font-medium uppercase tracking-wider">
                {data.month}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
