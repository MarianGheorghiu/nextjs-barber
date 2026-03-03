"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MainContainer from "@/components/MainContainer";
import { createClient } from "@/utils/supabase/client";

export default function ClientDashboard() {
  const router = useRouter();
  const [firstName, setFirstName] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUserData() {
      const supabase = createClient();

      // 1. Verificăm cine este utilizatorul logat în acest moment
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      // Dacă nu există user sau e o eroare, înseamnă că nu e logat -> îl dăm afară la login
      if (authError || !user) {
        router.push("/login");
        return;
      }

      // 2. Dacă e logat, îi căutăm numele în tabelul "profiles" creat de noi
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("first_name")
        .eq("id", user.id)
        .single();

      if (profile && !profileError) {
        setFirstName(profile.first_name); // Salvăm numele pentru a-l afișa pe ecran
      } else {
        setFirstName("Client"); // Fallback de siguranță
      }

      setLoading(false); // Am terminat de încărcat, afișăm interfața
    }

    fetchUserData();
  }, [router]);

  return (
    <MainContainer>
      {/* Container adaptat pentru o pagină de Dashboard */}
      <div className="flex-1 flex flex-col pt-32 pb-12 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full">
        {loading ? (
          // Spinner-ul de încărcare cât timp așteptăm răspunsul de la Supabase
          <div className="flex-1 flex justify-center items-center h-64">
            <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          // Panoul principal după ce s-au încărcat datele
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 sm:p-10 rounded-[2.5rem] shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] animate-fade-in">
            {/* Mesajul de bun venit personalizat */}
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Salut, <span className="text-cyan-400">{firstName}</span>! 👋
            </h1>
            <p className="text-slate-300 text-lg mb-10 font-light">
              Bine ai venit în panoul tău. De aici îți poți gestiona
              programările la salon.
            </p>

            {/* Structura pentru ce va urma: Programare nouă vs Următoarea programare */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Card Programare Nouă */}
              <div className="group bg-white/5 border border-white/10 p-8 rounded-[2rem] hover:bg-white/10 transition-all duration-300">
                <div className="w-12 h-12 bg-cyan-500/10 text-cyan-400 rounded-full flex items-center justify-center mb-6">
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">
                  Programare Nouă
                </h3>
                <p className="text-slate-400 mb-8 font-light leading-relaxed">
                  Alege un serviciu și un interval orar disponibil pentru
                  următoarea ta vizită.
                </p>
                <button className="w-full px-6 py-3.5 bg-cyan-500 text-[#000428] font-bold rounded-xl hover:bg-cyan-400 transition-colors shadow-[0_0_15px_rgba(34,211,238,0.2)]">
                  Programează-te
                </button>
              </div>

              {/* Card Programare Activă (Goală momentan) */}
              <div className="bg-white/5 border border-white/10 p-8 rounded-[2rem]">
                <div className="w-12 h-12 bg-white/10 text-slate-300 rounded-full flex items-center justify-center mb-6">
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">
                  Următoarea Vizită
                </h3>
                <p className="text-slate-400 font-light leading-relaxed">
                  Momentan nu ai nicio programare activă.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainContainer>
  );
}
