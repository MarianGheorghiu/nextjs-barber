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
  total_clients: number;
  created_at: string;
};

export default function BarberProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Despachetăm parametrii folosind `use()` din React (standardul nou in Next.js)
  const resolvedParams = use(params);
  const barberId = resolvedParams.id;

  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [barber, setBarber] = useState<BarberProfile | null>(null);

  useEffect(() => {
    const fetchBarberDetails = async () => {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      // Tragem datele DOAR pentru frizerul cu acest ID
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", barberId)
        .single(); // Cerem un singur rând

      if (data && !error) {
        setBarber(data);
      }
      setLoading(false);
    };

    fetchBarberDetails();
  }, [barberId, router]);

  // --- ACȚIUNI DIRECT DIN FIȘĂ ---

  const handleToggleStatus = async () => {
    if (!barber) return;
    const newStatus = barber.status === "suspended" ? "active" : "suspended";
    const confirmMsg =
      newStatus === "suspended"
        ? "Suspenzi acest frizer?"
        : "Activezi acest frizer?";

    if (window.confirm(confirmMsg)) {
      const result = await toggleStatusAction(barber.id, newStatus);
      if (result.success) {
        setBarber({ ...barber, status: newStatus });
      } else {
        alert("Eroare: " + result.error);
      }
    }
  };

  const handleRenameShop = async () => {
    if (!barber) return;
    const newName = window.prompt(
      "Introdu noul nume pentru shop:",
      barber.shop_name || "",
    );

    if (newName !== null && newName.trim() !== "") {
      const result = await updateShopNameAction(barber.id, newName.trim());
      if (result.success) {
        setBarber({ ...barber, shop_name: newName.trim() });
      } else {
        alert("Eroare: " + result.error);
      }
    }
  };

  const handleDelete = async () => {
    if (!barber) return;
    if (
      window.confirm(
        `⚠️ ATENȚIE: Ștergi DEFINITIV frizerul ${barber.first_name}?`,
      )
    ) {
      const result = await deleteBarberAction(barber.id);
      if (result.success) {
        alert("Frizer șters cu succes!");
        router.push("/admin/barbers"); // Îl aruncăm înapoi la lista de echipă
      } else {
        alert("Eroare: " + result.error);
      }
    }
  };

  // Funcție de formatare a datei
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ro-RO", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh]">
        <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-cyan-400 font-medium">Se încarcă profilul...</p>
      </div>
    );
  }

  if (!barber) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl text-white font-bold mb-4">
          Frizerul nu a fost găsit
        </h2>
        <Link href="/admin/barbers" className="text-cyan-400 hover:underline">
          Înapoi la echipă
        </Link>
      </div>
    );
  }

  const isActive = barber.status !== "suspended";

  return (
    <div className="animate-fade-in max-w-5xl mx-auto pb-10">
      {/* 1. Bara de navigare înapoi */}
      <Link
        href="/admin/barbers"
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
        Înapoi la Lista Echipei
      </Link>

      {/* 2. Header Profil Principal */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 mb-8 flex flex-col md:flex-row items-center md:items-start gap-6 relative overflow-hidden">
        {/* Decor de fundal */}
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="w-24 h-24 rounded-full bg-slate-800 flex items-center justify-center text-3xl text-white font-bold border-2 border-white/10 shrink-0 shadow-xl">
          {barber.first_name.charAt(0).toUpperCase()}
          {barber.last_name.charAt(0).toUpperCase()}
        </div>

        <div className="flex-1 text-center md:text-left z-10">
          <div className="flex flex-col md:flex-row md:items-center gap-3 mb-2 justify-center md:justify-start">
            <h1 className="text-3xl font-bold text-white">
              {barber.first_name} {barber.last_name}
            </h1>
            {isActive ? (
              <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-bold border border-green-500/30 w-max mx-auto md:mx-0">
                ACTIV
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-bold border border-red-500/30 w-max mx-auto md:mx-0">
                SUSPENDAT
              </span>
            )}
          </div>
          <p className="text-cyan-400 font-medium text-lg mb-1">
            {barber.shop_name || "Shop Nesetat"}
          </p>
          <p className="text-slate-400 text-sm">
            Alăturat pe: {formatDate(barber.created_at)}
          </p>
        </div>

        {/* Acțiuni Rapide Header */}
        <div className="flex gap-3 z-10 mt-4 md:mt-0">
          <button
            onClick={handleToggleStatus}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border ${isActive ? "bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20" : "bg-green-500/10 text-green-400 border-green-500/30 hover:bg-green-500/20"}`}
          >
            {isActive ? "Suspendă" : "Activează"}
          </button>
          <button
            onClick={handleDelete}
            className="px-4 py-2 rounded-xl bg-white/5 text-slate-300 border border-white/10 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30 transition-all text-sm font-bold"
          >
            Șterge Cont
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* 3. Coloana Stânga: Date Personale & Profesionale */}
        <div className="md:col-span-1 flex flex-col gap-6">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
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
                  d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"
                />
              </svg>
              Detalii Contact
            </h3>

            <div className="space-y-4">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                  Email
                </p>
                <p className="text-white font-medium break-all">
                  {barber.email}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                  Telefon
                </p>
                <p className="text-white font-mono">{barber.phone || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                  Diplomă / Curs
                </p>
                <p className="text-white">{barber.diploma || "-"}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6">
            <h3 className="text-xl font-bold text-white mb-4">Setări Shop</h3>
            <button
              onClick={handleRenameShop}
              className="w-full py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-cyan-400 transition-all font-medium flex justify-center items-center gap-2"
            >
              ✏️ Editează Numele Shop-ului
            </button>
          </div>
        </div>

        {/* 4. Coloana Dreapta: Statistici & Programări */}
        <div className="md:col-span-2 flex flex-col gap-6">
          {/* Mini-Statistici */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6">
              <p className="text-slate-400 text-sm font-medium mb-1">
                Clienți Deserviți
              </p>
              <p className="text-3xl font-bold text-white">
                {barber.total_clients}
              </p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6">
              <p className="text-slate-400 text-sm font-medium mb-1">
                Încasări (Luna asta)
              </p>
              <p className="text-3xl font-bold text-cyan-400">0 RON</p>
            </div>
          </div>

          {/* Zona pentru Programări (Pregătită pentru viitor) */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 flex-1 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">
                Următoarele Programări
              </h3>
              <span className="text-xs font-bold px-2 py-1 rounded bg-white/10 text-slate-300">
                Azi
              </span>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-black/20 rounded-xl border border-white/5">
              <div className="w-16 h-16 mb-4 opacity-50 text-slate-400">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <p className="text-slate-400 font-medium">
                Nicio programare pentru azi.
              </p>
              <p className="text-sm text-slate-500 mt-1">
                Modulul de calendar va fi adăugat aici în curând.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
