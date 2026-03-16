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

    // 1. Luăm lista de ID-uri favorite
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
      // 2. Tragem detaliile acelor frizeri
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

    // Actualizăm starea locală instant pentru UI rapid
    const updatedFavorites = favoriteBarbers.filter((b) => b.id !== barberId);
    setFavoriteBarbers(updatedFavorites);

    // Salvăm în baza de date
    const supabase = createClient();
    const newFavIds = updatedFavorites.map((b) => b.id);
    await supabase
      .from("profiles")
      .update({ favorite_barbers: newFavIds })
      .eq("id", userId);
  };

  // Funcția care te trimite la booking direct la Pasul 2
  const handleQuickBook = (barberId: string) => {
    // Trimitem ID-ul frizerului prin URL
    router.push(`/client?barberId=${barberId}`);
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in max-w-5xl mx-auto pb-10">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-10">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
            Locații Favorite
          </h1>
          <p className="text-slate-300">
            Frizeriile tale preferate, salvate pentru o programare rapidă.
          </p>
        </div>
        <div className="bg-pink-500/10 border border-pink-500/20 px-4 py-2 rounded-xl flex items-center gap-2">
          <svg
            className="w-5 h-5 text-pink-400"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          <span className="text-pink-400 font-bold">
            {favoriteBarbers.length} salvate
          </span>
        </div>
      </div>

      {/* LISTA PREMIUM (Tabel stilizat) */}
      <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-[2.5rem] p-6 sm:p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-pink-500/10 rounded-full blur-[100px] pointer-events-none"></div>

        {favoriteBarbers.length === 0 ? (
          <div className="text-center py-16 relative z-10">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
              <svg
                className="w-8 h-8 text-slate-500"
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
            <p className="text-white font-medium text-lg mb-2">
              Nu ai adăugat nicio frizerie la favorite.
            </p>
            <p className="text-sm text-slate-300 mb-6">
              Apasă pe inima de pe cardul unei frizerii pentru a o salva aici.
            </p>
            <Link
              href="/client"
              className="inline-block bg-cyan-500 hover:bg-cyan-400 text-[#0a0a0a] font-bold px-6 py-3 rounded-xl transition-all shadow-[0_0_15px_rgba(34,211,238,0.3)]"
            >
              Caută o frizerie
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-4 relative z-10">
            {/* Cap de tabel vizual */}
            <div className="hidden md:grid grid-cols-12 gap-4 px-6 pb-2 border-b border-white/10 text-xs font-bold text-slate-400 uppercase tracking-wider">
              <div className="col-span-5">Locație & Detalii</div>
              <div className="col-span-3">Status</div>
              <div className="col-span-4 text-right">Acțiuni Rapide</div>
            </div>

            {favoriteBarbers.map((barber) => (
              <div
                key={barber.id}
                className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center bg-black/40 hover:bg-white/5 border border-white/10 hover:border-white/20 p-5 rounded-2xl transition-all group"
              >
                {/* Info Frizer */}
                <div className="col-span-5 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 text-xl shrink-0">
                    ✂️
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg leading-tight">
                      {barber.barbershop_name || "Salon Fără Nume"}
                    </h3>
                    <p className="text-sm text-slate-400 mt-0.5">
                      Frizer:{" "}
                      <span className="text-cyan-400">
                        {barber.first_name} {barber.last_name}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Badge disponibilitate */}
                <div className="col-span-3 hidden md:flex">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-green-500/10 text-green-400 border border-green-500/20 text-xs font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>{" "}
                    Disponibil
                  </span>
                </div>

                {/* Acțiuni (Programează / Șterge) */}
                <div className="col-span-12 md:col-span-4 flex items-center justify-start md:justify-end gap-3 mt-4 md:mt-0 pt-4 md:pt-0 border-t border-white/10 md:border-transparent">
                  <button
                    onClick={() => handleRemoveFavorite(barber.id)}
                    className="cursor-pointer p-3 rounded-xl bg-white/5 hover:bg-red-500/10 text-pink-500 hover:text-red-400 border border-white/5 hover:border-red-500/30 transition-all flex items-center justify-center group/btn"
                    title="Șterge de la favorite"
                  >
                    {/* Inima plină care se face "broken" sau goală la hover */}
                    <svg
                      className="w-5 h-5 group-hover/btn:hidden"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    <svg
                      className="w-5 h-5 hidden group-hover/btn:block"
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
                  </button>

                  <button
                    onClick={() => handleQuickBook(barber.id)}
                    className="cursor-pointer flex-1 md:flex-none bg-cyan-500 hover:bg-cyan-400 text-[#0a0a0a] font-bold px-6 py-3 rounded-xl transition-all shadow-[0_0_15px_rgba(34,211,238,0.2)] hover:shadow-[0_0_20px_rgba(34,211,238,0.4)] flex items-center justify-center gap-2"
                  >
                    Programează <span className="hidden sm:inline">Acum</span> →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
