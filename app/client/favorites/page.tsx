"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

type FavoriteBarber = {
  id: string;
  barbershop_name: string;
  first_name: string;
  last_name: string;
};

export default function ClientFavoritesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [favoriteBarbers, setFavoriteBarbers] = useState<FavoriteBarber[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchFavorites();
  }, []);

  const fetchFavorites = async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }
    setUserId(user.id);

    const { data: profile } = await supabase
      .from("profiles")
      .select("favorite_barbers")
      .eq("id", user.id)
      .single();

    if (
      profile &&
      profile.favorite_barbers &&
      profile.favorite_barbers.length > 0
    ) {
      const { data: barbers } = await supabase
        .from("profiles")
        .select("id, barbershop_name, first_name, last_name")
        .in("id", profile.favorite_barbers);

      if (barbers) {
        setFavoriteBarbers(barbers as FavoriteBarber[]);
      }
    }

    setLoading(false);
  };

  const handleRemoveFavorite = async (barberId: string) => {
    if (!userId) return;

    const updatedFavorites = favoriteBarbers.filter((b) => b.id !== barberId);
    setFavoriteBarbers(updatedFavorites);

    const supabase = createClient();
    const newFavIds = updatedFavorites.map((b) => b.id);
    await supabase
      .from("profiles")
      .update({ favorite_barbers: newFavIds })
      .eq("id", userId);
  };

  const handleQuickBook = (barberId: string) => {
    router.push(`/client?barberId=${barberId}`);
  };

  const filteredBarbers = favoriteBarbers.filter((barber) => {
    const searchString =
      `${barber.barbershop_name} ${barber.first_name} ${barber.last_name}`.toLowerCase();
    return searchString.includes(searchTerm.toLowerCase());
  });

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="w-10 h-10 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(34,211,238,0.5)]"></div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in max-w-6xl mx-auto pb-10 relative">
      {/* HEADER PREMIUM */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-black text-white mb-1 tracking-tight">
            Locații Favorite
          </h1>
          <p className="text-slate-400 text-sm font-medium">
            Frizeriile tale preferate, gata pentru o rezervare rapidă.
          </p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 px-6 py-4 rounded-2xl flex items-center gap-4 shadow-xl">
          <div className="w-10 h-10 rounded-xl bg-pink-500/10 text-pink-400 flex items-center justify-center border border-pink-500/20 shadow-inner">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <div>
            <p className="text-[10px] font-black text-pink-400/80 uppercase tracking-widest mb-0.5">
              Total Salvate
            </p>
            <p className="text-2xl font-black text-white leading-none">
              {favoriteBarbers.length}{" "}
              <span className="text-sm font-bold text-slate-500">Locații</span>
            </p>
          </div>
        </div>
      </div>

      {/* CONTAINER PRINCIPAL LIQUID GLASS */}
      <div className="bg-white/5 backdrop-blur-2xl border border-white/20 rounded-[2.5rem] p-6 sm:p-8 relative overflow-hidden shadow-2xl flex flex-col">
        {/* Glow Effects */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-500/40 via-purple-500/40 to-cyan-500/40"></div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-pink-500/10 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none"></div>

        {/* SEARCH BAR & TITLU */}
        <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10 shrink-0">
          <h3 className="text-xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-pink-500/10 flex items-center justify-center border border-pink-500/20 text-pink-400 shadow-inner">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
            </div>
            Registrul Tău
          </h3>
          <div className="relative w-full sm:w-80">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
              <svg
                className="w-5 h-5 text-pink-400"
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
              placeholder="Caută locație sau frizer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-white/20 focus:border-pink-400 rounded-2xl pl-11 pr-4 py-3.5 text-white outline-none transition-all shadow-inner placeholder:text-slate-400 text-sm font-medium"
            />
          </div>
        </div>

        {favoriteBarbers.length === 0 ? (
          <div className="text-center py-16 relative z-10">
            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/20 text-slate-400 shadow-inner">
              <svg
                className="w-8 h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
            </div>
            <p className="text-white font-black text-2xl mb-2 tracking-tight">
              Nicio frizerie favorită
            </p>
            <p className="text-sm text-slate-400 font-medium mb-8">
              Apasă pe inima de pe cardul unei frizerii pentru a o salva aici.
            </p>
            <Link
              href="/client"
              className="inline-flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-[#000428] font-black px-8 py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(34,211,238,0.3)] hover:scale-105"
            >
              Descoperă Frizerii{" "}
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="3"
                  d="M14 5l7 7m0 0l-7 7m7-7H3"
                />
              </svg>
            </Link>
          </div>
        ) : filteredBarbers.length === 0 ? (
          <div className="text-center py-12 text-slate-400 font-medium italic relative z-10">
            Nu s-a găsit nicio locație care să corespundă căutării.
          </div>
        ) : (
          <div className="overflow-auto custom-scrollbar max-h-[600px] relative z-10 pr-2">
            <div className="flex flex-col gap-4">
              {/* Header Listă (doar pe Desktop) */}
              <div className="hidden md:grid grid-cols-12 gap-4 px-6 pb-2 border-b border-white/10 text-[10px] font-black text-slate-400 uppercase tracking-widest sticky top-0 bg-[#0a0a0a]/90 backdrop-blur-xl z-20 py-3 rounded-t-xl">
                <div className="col-span-5">Locație & Frizer</div>
                <div className="col-span-3">Status Disponibilitate</div>
                <div className="col-span-4 text-right">Acțiuni Rapide</div>
              </div>

              {filteredBarbers.map((barber) => (
                <div
                  key={barber.id}
                  className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center bg-black/20 hover:bg-white/5 border border-white/10 hover:border-white/20 p-5 sm:p-6 rounded-2xl transition-colors group shadow-inner"
                >
                  {/* Info Frizer */}
                  <div className="col-span-5 flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 text-2xl shrink-0 shadow-inner group-hover:scale-105 transition-transform">
                      ✂️
                    </div>
                    <div>
                      <h3 className="text-white font-black text-lg sm:text-xl tracking-tight mb-0.5 group-hover:text-cyan-400 transition-colors">
                        {barber.barbershop_name || "Salon Fără Nume"}
                      </h3>
                      <p className="text-sm text-slate-400 font-medium">
                        Frizer:{" "}
                        <span className="text-white">
                          {barber.first_name} {barber.last_name}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Badge Disponibilitate */}
                  <div className="col-span-3 hidden md:flex">
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-green-500/10 text-green-400 border border-green-500/20 text-xs font-bold uppercase tracking-wider shadow-sm">
                      <span className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_8px_rgba(34,197,94,0.8)]"></span>
                      Acceptă Programări
                    </span>
                  </div>

                  {/* Acțiuni (Programează / Șterge) */}
                  <div className="col-span-12 md:col-span-4 flex items-center justify-start md:justify-end gap-3 mt-2 md:mt-0 pt-4 md:pt-0 border-t border-white/5 md:border-transparent">
                    <button
                      onClick={() => handleRemoveFavorite(barber.id)}
                      className="cursor-pointer w-12 h-12 rounded-xl bg-white/5 hover:bg-red-500/10 text-pink-400 hover:text-red-400 border border-white/10 hover:border-red-500/30 transition-all flex items-center justify-center group/btn shadow-sm"
                      title="Șterge de la favorite"
                    >
                      <svg
                        className="w-6 h-6 group-hover/btn:hidden"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                      <svg
                        className="w-6 h-6 hidden group-hover/btn:block"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2.5"
                          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                        />
                      </svg>
                    </button>

                    <button
                      onClick={() => handleQuickBook(barber.id)}
                      className="cursor-pointer flex-1 md:flex-none bg-cyan-500 hover:bg-cyan-400 text-[#000428] font-black px-6 py-3 rounded-xl transition-all shadow-[0_0_20px_rgba(34,211,238,0.3)] hover:shadow-[0_0_30px_rgba(34,211,238,0.5)] flex items-center justify-center gap-2 hover:scale-105"
                    >
                      Programează <span className="hidden sm:inline">Acum</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
