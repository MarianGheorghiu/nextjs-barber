"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MainContainer from "@/components/MainContainer";
import { createClient } from "@/utils/supabase/client";

export default function AdminDashboard() {
  const router = useRouter();
  const [firstName, setFirstName] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAdminData() {
      const supabase = createClient();

      // 1. Verificăm cine e logat
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.push("/login");
        return;
      }

      // 2. Extragem profilul și ROLUL
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("first_name, role")
        .eq("id", user.id)
        .single();

      // 3. Verificăm nivelul de acces (Doar adminii au voie aici!)
      if (profileError || profile?.role !== "admin") {
        router.push("/client"); // Îl trimitem la panoul de client dacă e un "intrus"
        return;
      }

      setFirstName(profile.first_name || "Șefu'");
      setLoading(false);
    }

    fetchAdminData();
  }, [router]);

  return (
    <MainContainer>
      <div className="flex-1 flex flex-col pt-32 pb-12 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full">
        {loading ? (
          <div className="flex-1 flex justify-center items-center h-64">
            <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 sm:p-10 rounded-[2.5rem] shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] animate-fade-in border-t-purple-500/30">
            {/* Mesajul de bun venit pentru Admin */}
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Salutare, <span className="text-cyan-400">Admin {firstName}</span>
              ! 👑
            </h1>
            <p className="text-slate-300 text-lg mb-10 font-light">
              Panoul de control general. De aici gestionezi afacerea.
            </p>

            {/* Carduri pentru funcțiile viitoare de Admin */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="group bg-white/5 border border-white/10 p-6 rounded-[2rem] hover:bg-white/10 transition-all duration-300">
                <div className="text-cyan-400 text-2xl mb-4">📅</div>
                <h3 className="text-xl font-bold text-white mb-2">
                  Toate Programările
                </h3>
                <p className="text-slate-400 font-light text-sm">
                  Vizualizează și modifică programările din tot salonul.
                </p>
              </div>

              <div className="group bg-white/5 border border-white/10 p-6 rounded-[2rem] hover:bg-white/10 transition-all duration-300">
                <div className="text-cyan-400 text-2xl mb-4">✂️</div>
                <h3 className="text-xl font-bold text-white mb-2">
                  Echipa (Frizeri)
                </h3>
                <p className="text-slate-400 font-light text-sm">
                  Gestionează frizerii, aprobă conturi și programe de lucru.
                </p>
              </div>

              <div className="group bg-white/5 border border-white/10 p-6 rounded-[2rem] hover:bg-white/10 transition-all duration-300">
                <div className="text-cyan-400 text-2xl mb-4">📊</div>
                <h3 className="text-xl font-bold text-white mb-2">
                  Statistici
                </h3>
                <p className="text-slate-400 font-light text-sm">
                  Vezi încasările, clienții noi și cele mai bune servicii.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainContainer>
  );
}
