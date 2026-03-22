"use client";

import { useEffect, useState, use } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  toggleStatusAction,
  deleteBarberAction,
  updateShopNameAction,
} from "@/app/actions/adminBarberActions";

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
};

export default function BarberProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const barberId = resolvedParams.id;

  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [barber, setBarber] = useState<BarberProfile | null>(null);

  const [totalAppointments, setTotalAppointments] = useState(0);
  const [totalUniqueClients, setTotalUniqueClients] = useState(0);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);

  useEffect(() => {
    const fetchBarberDetailsAndStats = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", barberId)
        .single();
      if (data) setBarber(data);

      const now = new Date();
      const firstDayOfMonth = new Date(
        now.getFullYear(),
        now.getMonth(),
        1,
      ).toISOString();

      const { data: appointments } = await supabase
        .from("appointments")
        .select("price, appointment_date, appointment_time, status, client_id")
        .eq("barber_id", barberId)
        .neq("status", "cancelled");

      if (appointments) {
        let appCount = 0;
        let revenue = 0;
        const uniqueClients = new Set();

        appointments.forEach((app) => {
          const appDate = new Date(
            `${app.appointment_date}T${app.appointment_time}`,
          );
          if (appDate < now) {
            appCount++;
            uniqueClients.add(app.client_id); // Adăugăm ID-ul la set pentru unicitate

            if (appDate.toISOString() >= firstDayOfMonth) {
              revenue += app.price;
            }
          }
        });

        setTotalAppointments(appCount);
        setTotalUniqueClients(uniqueClients.size);
        setMonthlyRevenue(revenue);
      }

      setLoading(false);
    };

    fetchBarberDetailsAndStats();
  }, [barberId, router]);

  const handleToggleStatus = async () => {
    if (!barber) return;
    const newStatus = barber.status === "suspended" ? "active" : "suspended";
    const confirmMsg =
      newStatus === "suspended"
        ? "⚠️ Ești sigur că vrei să SUSPENZI acest frizer? Nu va mai putea primi programări."
        : "✅ Activezi contul acestui frizer?";

    if (window.confirm(confirmMsg)) {
      const result = await toggleStatusAction(barber.id, newStatus);
      if (result.success) setBarber({ ...barber, status: newStatus });
      else alert("Eroare: " + result.error);
    }
  };

  const handleRenameShop = async () => {
    if (!barber) return;
    const newName = window.prompt(
      "Introdu noul nume pentru frizerie:",
      barber.shop_name || "",
    );

    if (newName !== null && newName.trim() !== "") {
      const result = await updateShopNameAction(barber.id, newName.trim());
      if (result.success) setBarber({ ...barber, shop_name: newName.trim() });
      else alert("Eroare: " + result.error);
    }
  };

  const handleDelete = async () => {
    if (!barber) return;
    if (
      window.confirm(
        `⚠️ ATENȚIE: Ștergi DEFINITIV contul frizerului ${barber.first_name}? Toate datele vor dispărea!`,
      )
    ) {
      const result = await deleteBarberAction(barber.id);
      if (result.success) router.push("/admin/barbers");
      else alert("Eroare: " + result.error);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh]">
        <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-cyan-400 font-medium">
          Se încarcă profilul administrativ...
        </p>
      </div>
    );
  }

  if (!barber) return null;

  const isActive = barber.status !== "suspended";

  return (
    <div className="animate-fade-in max-w-6xl mx-auto pb-10">
      <Link
        href="/admin/barbers"
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
        Înapoi la Lista Echipei
      </Link>

      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 mb-10 flex flex-col md:flex-row items-center md:items-start gap-8 relative overflow-hidden shadow-2xl">
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-cyan-500/10 rounded-full blur-[80px] pointer-events-none"></div>

        <div
          className={`w-28 h-28 rounded-full flex items-center justify-center text-4xl text-white font-black border-4 shrink-0 shadow-[0_0_30px_rgba(34,211,238,0.2)] relative z-10 ${isActive ? "bg-gradient-to-br from-cyan-500 to-blue-600 border-cyan-400/50" : "bg-slate-800 border-red-500/50 text-slate-400"}`}
        >
          {barber.first_name.charAt(0).toUpperCase()}
          {barber.last_name.charAt(0).toUpperCase()}
        </div>

        <div className="flex-1 text-center md:text-left z-10 w-full">
          <div className="flex flex-col md:flex-row md:items-center gap-4 mb-3 justify-center md:justify-start">
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              {barber.first_name} {barber.last_name}
            </h1>
            <span
              className={`px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest border shadow-sm w-max mx-auto md:mx-0 ${isActive ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-red-500/20 text-red-400 border-red-500/30"}`}
            >
              {isActive ? "Status Activ" : "Cont Suspendat"}
            </span>
          </div>
          <p className="text-cyan-400 font-bold text-xl mb-1 flex items-center gap-2 justify-center md:justify-start">
            <span className="text-2xl">✂️</span>{" "}
            {barber.shop_name || "Nume frizerie nesetat"}
          </p>
          <p className="text-slate-400 text-sm font-medium">
            Cont creat:{" "}
            {new Date(barber.created_at).toLocaleDateString("ro-RO", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>

        <div className="flex flex-col gap-3 z-10 w-full md:w-auto mt-4 md:mt-0">
          <button
            onClick={handleToggleStatus}
            className={`w-full cursor-pointer px-6 py-3.5 rounded-xl text-sm font-black uppercase tracking-wider transition-all border shadow-sm flex items-center justify-center gap-2 ${isActive ? "bg-white/5 text-slate-300 border-white/10 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30" : "bg-green-500/10 text-green-400 border-green-500/30 hover:bg-green-500/20 hover:shadow-[0_0_15px_rgba(34,197,94,0.2)]"}`}
          >
            {isActive ? (
              <>
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
                    d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                  />
                </svg>{" "}
                Suspendă Accesul
              </>
            ) : (
              <>
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
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>{" "}
                Debanează
              </>
            )}
          </button>

          <button
            onClick={handleDelete}
            className="w-full cursor-pointer px-6 py-3.5 rounded-xl bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-all text-sm font-black uppercase tracking-wider flex items-center justify-center gap-2"
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
                strokeWidth="2"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            Șterge Cont
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 flex flex-col gap-6">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 sm:p-8 relative overflow-hidden shadow-xl">
            <h3 className="text-xl font-black text-white mb-8 flex items-center gap-3 relative z-10">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30 text-cyan-400">
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
                    d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"
                  />
                </svg>
              </div>
              Fișă Angajat
            </h3>
            <div className="space-y-6 relative z-10">
              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1.5">
                  Email Autentificare
                </p>
                <p className="text-white font-medium text-base break-all bg-black/40 p-3 rounded-xl border border-white/5">
                  {barber.email}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1.5">
                  Telefon Contact
                </p>
                <p className="text-cyan-400 font-bold text-base font-mono bg-cyan-500/5 p-3 rounded-xl border border-cyan-500/10">
                  {barber.phone || "Lipsă"}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1.5">
                  Diplomă / Calificări
                </p>
                <p className="text-slate-300 font-medium bg-black/40 p-3 rounded-xl border border-white/5">
                  {barber.diploma || "Nicio diplomă înregistrată"}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 shadow-xl text-center">
            <h3 className="text-lg font-black text-white mb-4">
              Setări Frizerie
            </h3>
            <button
              onClick={handleRenameShop}
              className="cursor-pointer w-full py-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500/20 text-cyan-400 transition-all font-bold flex justify-center items-center gap-2 text-sm shadow-sm"
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
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                />
              </svg>
              Schimbă Nume Frizerie
            </button>
          </div>
        </div>

        <div className="md:col-span-2 flex flex-col gap-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-6 text-center shadow-xl group hover:bg-white/10 transition-all">
              <p className="text-4xl font-black text-cyan-400">
                {totalAppointments}
              </p>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-2">
                Servicii Efectuate
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-6 text-center shadow-xl group hover:bg-white/10 transition-all">
              <p className="text-4xl font-black text-purple-400">
                {totalUniqueClients}
              </p>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-2">
                Clienți Unici
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-6 text-center shadow-xl group hover:bg-white/10 transition-all relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/10 rounded-full blur-2xl"></div>
              <p className="text-4xl font-black text-green-400 relative z-10">
                {monthlyRevenue.toLocaleString("ro-RO")}
              </p>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-2 relative z-10">
                RON Încasări (Lună)
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-white/5 to-transparent border border-cyan-500/20 rounded-[2.5rem] p-8 sm:p-12 flex-1 flex flex-col items-center justify-center text-center shadow-[0_0_30px_rgba(34,211,238,0.05)]">
            <div className="w-20 h-20 bg-cyan-500/10 text-cyan-400 rounded-full flex items-center justify-center mb-6 shadow-inner">
              <svg
                className="w-10 h-10"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <h3 className="text-2xl font-black text-white mb-2">
              Analiză Financiară Avansată
            </h3>
            <p className="text-slate-400 text-sm max-w-sm mx-auto mb-8">
              Accesează modulul contabil pentru a vedea graficul complet al
              încasărilor pe luni și ani pentru acest angajat.
            </p>
            <Link
              href={`/admin/finance/${barber.id}`}
              className="px-8 py-4 rounded-xl bg-cyan-500 text-[#000428] font-black hover:bg-cyan-400 transition-all shadow-[0_0_20px_rgba(34,211,238,0.3)] hover:scale-105 inline-block"
            >
              Deschide Raportul Financiar →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
