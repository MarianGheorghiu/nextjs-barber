"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

type BarberProfile = {
  first_name: string;
  last_name: string;
  shop_name: string;
};

export default function BarberDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<BarberProfile | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      // Extragem datele profilului
      const { data, error } = await supabase
        .from("profiles")
        .select("first_name, last_name, shop_name, role")
        .eq("id", user.id)
        .single();

      // Dacă cumva intră un admin sau client pe link-ul ăsta, îl dăm afară
      if (data?.role !== "barber") {
        router.push("/login");
        return;
      }

      if (data && !error) {
        setProfile(data);
      }
      setLoading(false);
    };

    fetchProfile();
  }, [router]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh]">
        <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-cyan-400 font-medium animate-pulse">
          Se pregătește scaunul...
        </p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in max-w-7xl mx-auto">
      {/* Header Personalizat */}
      <div className="mb-10 bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-[2.5rem] relative overflow-hidden">
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2 relative z-10">
          Salutare, <span className="text-cyan-400">{profile?.first_name}</span>
          ! ✂️
        </h1>
        <p className="text-slate-400 relative z-10">
          Bine ai revenit la{" "}
          <span className="text-white font-medium">
            {profile?.shop_name || "Shop Nesetat"}
          </span>
          . Iată ce te așteaptă azi.
        </p>
      </div>

      {/* Carduri Rapide - Situația pe Ziua Curentă */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem] relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-cyan-500/20 rounded-full blur-2xl transition-all"></div>
          <h3 className="text-slate-400 font-medium mb-1">Programări Azi</h3>
          <p className="text-4xl font-bold text-white">0</p>
          <span className="text-cyan-400 text-sm font-bold block mt-2">
            Nicio programare încă
          </span>
        </div>

        <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem] relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-green-500/20 rounded-full blur-2xl transition-all"></div>
          <h3 className="text-slate-400 font-medium mb-1">
            Câștig Estimat Azi
          </h3>
          <p className="text-4xl font-bold text-white">
            0 <span className="text-xl text-slate-500 font-normal">RON</span>
          </p>
          <span className="text-slate-500 text-sm mt-2 block">
            Bazează-te pe serviciile finalizate
          </span>
        </div>

        <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem] relative overflow-hidden group flex flex-col justify-center items-center text-center">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent"></div>
          <p className="text-slate-300 font-medium z-10 mb-3">
            Ai timp liber momentan.
          </p>
          <Link
            href="/barber/services"
            className="z-10 bg-cyan-500/20 border border-cyan-500/30 hover:bg-cyan-500/30 text-cyan-400 px-6 py-2.5 rounded-xl transition-all font-bold text-sm"
          >
            Configurează Servicii
          </Link>
        </div>
      </div>

      {/* Programul Zilei (Agenda) */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 sm:p-8">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-white">Agenda Zilei</h3>
          <Link
            href="/barber/appointments/week"
            className="text-sm text-cyan-400 hover:underline font-medium"
          >
            Vezi tot calendarul
          </Link>
        </div>

        {/* Când nu are programări */}
        <div className="py-12 flex flex-col items-center justify-center text-center bg-black/20 rounded-2xl border border-white/5">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 text-slate-500">
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <p className="text-slate-400 font-medium text-lg">Program liber!</p>
          <p className="text-slate-500 text-sm mt-1 max-w-sm">
            Nu ai nicio programare confirmată pentru astăzi. Profită de timp
            pentru a-ți actualiza lista de servicii.
          </p>
        </div>
      </div>
    </div>
  );
}
