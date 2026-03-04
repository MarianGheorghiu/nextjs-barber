"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MainContainer from "@/components/MainContainer";
import { createClient } from "@/utils/supabase/client";

export default function BarberDashboard() {
  const router = useRouter();
  const [firstName, setFirstName] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBarberData() {
      const supabase = createClient();

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.push("/login");
        return;
      }

      // Extragem profilul
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("first_name, role")
        .eq("id", user.id)
        .single();

      // Verificăm dacă are voie aici (doar adminii sau frizerii au voie, un admin poate intra să vadă cum arată)
      if (
        profileError ||
        (profile?.role !== "barber" && profile?.role !== "admin")
      ) {
        router.push("/client");
        return;
      }

      setFirstName(profile.first_name || "Colegu'");
      setLoading(false);
    }

    fetchBarberData();
  }, [router]);

  return (
    <MainContainer>
      <div className="flex-1 flex flex-col pt-32 pb-12 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full">
        {loading ? (
          <div className="flex-1 flex justify-center items-center h-64">
            <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 sm:p-10 rounded-[2.5rem] shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] animate-fade-in border-t-cyan-500/30">
            {/* Mesajul de bun venit pentru Frizer */}
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Salutare,{" "}
              <span className="text-cyan-400">{firstName} Frizerul</span>! ✂️
            </h1>
            <p className="text-slate-300 text-lg mb-10 font-light">
              Acesta este spațiul tău de lucru. Urmărește programările de azi.
            </p>

            {/* Structura pentru panoul frizerului */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Programările de azi (Coloană mai lată) */}
              <div className="lg:col-span-2 group bg-white/5 border border-white/10 p-8 rounded-[2rem] hover:bg-white/10 transition-all duration-300">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-white">
                    Programările de azi
                  </h3>
                  <span className="bg-cyan-500/20 text-cyan-400 text-xs font-bold px-3 py-1 rounded-full border border-cyan-500/30">
                    LIVE
                  </span>
                </div>

                {/* Aici va veni o listă preluată din baza de date */}
                <div className="p-4 rounded-xl border border-white/5 bg-black/20 text-center text-slate-400 font-light">
                  Momentan nu ai clienți programați pentru ziua de azi.
                </div>
              </div>

              {/* Opțiuni rapide / Profil */}
              <div className="flex flex-col gap-6">
                <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem]">
                  <h3 className="text-xl font-bold text-white mb-4">
                    Programul meu
                  </h3>
                  <button className="w-full py-2.5 rounded-xl border border-white/10 text-slate-300 hover:text-white hover:bg-white/5 transition-all text-sm">
                    Setează orele libere
                  </button>
                </div>
                <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem]">
                  <h3 className="text-xl font-bold text-white mb-4">
                    Încasări Azi
                  </h3>
                  <p className="text-3xl font-light text-cyan-400">0 RON</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainContainer>
  );
}
