"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import {
  updateShopNameAction,
  toggleStatusAction,
  deleteBarberAction,
} from "@/app/actions/adminBarberActions";

import Link from "next/link";

type BarberProfile = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  shop_name?: string;
  status?: string;
  role: string;
};

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [barbers, setBarbers] = useState<BarberProfile[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: barbersData, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email, shop_name, status, role")
        .eq("role", "barber")
        .order("created_at", { ascending: false });

      if (barbersData && !error) {
        setBarbers(barbersData);
      }

      setLoading(false);
    };

    fetchDashboardData();
  }, [router]);

  const handleRenameShop = async (barberId: string, currentName: string) => {
    const newName = window.prompt(
      "Introdu noul nume pentru shop:",
      currentName || "",
    );

    if (newName !== null && newName.trim() !== "") {
      const cleanName = newName.trim();

      // Apelăm Backend-ul
      const result = await updateShopNameAction(barberId, cleanName);

      if (result.success) {
        // Actualizăm interfața doar DACĂ s-a salvat cu succes în baza de date
        setBarbers(
          barbers.map((b) =>
            b.id === barberId ? { ...b, shop_name: cleanName } : b,
          ),
        );
      } else {
        alert("Eroare la baza de date: " + result.error);
      }
    }
  };

  const handleToggleStatus = async (
    barberId: string,
    currentStatus: string,
  ) => {
    const newStatus = currentStatus === "suspended" ? "active" : "suspended";

    const confirmMessage =
      newStatus === "suspended"
        ? "Ești sigur că vrei să SUSPENZI acest frizer? Nu va mai putea primi clienți."
        : "Vrei să ACTIVEZI acest frizer?";

    if (window.confirm(confirmMessage)) {
      // Apelăm Backend-ul
      const result = await toggleStatusAction(barberId, newStatus);

      if (result.success) {
        // Actualizăm interfața doar DACĂ s-a salvat cu succes în baza de date
        setBarbers(
          barbers.map((b) =>
            b.id === barberId ? { ...b, status: newStatus } : b,
          ),
        );
      } else {
        alert("Eroare la baza de date: " + result.error);
      }
    }
  };

  // FUNCȚIA NOUĂ: Ștergere Definitivă
  // FUNCȚIA NOUĂ: Ștergere Definitivă prin Backend
  const handleDeleteBarber = async (barberId: string, barberName: string) => {
    if (
      window.confirm(
        `⚠️ ATENȚIE: Ești sigur că vrei să ștergi DEFINITIV frizerul ${barberName}? Această acțiune îi va șterge complet contul de logare și nu poate fi anulată.`,
      )
    ) {
      // Apelăm funcția de pe server (Backend)
      const result = await deleteBarberAction(barberId);

      if (result.success) {
        // Îl scoatem și din interfață pe loc
        setBarbers(barbers.filter((b) => b.id !== barberId));
        alert(`Frizerul ${barberName} a fost șters DEFINITIV din sistem!`);
      } else {
        alert("A apărut o eroare: " + result.error);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh]">
        <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-cyan-400 font-medium animate-pulse">
          Se încarcă sistemul...
        </p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in max-w-7xl mx-auto">
      {/* Header cu Buton Adăugare */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Prezentare Generală
          </h1>
          <p className="text-slate-400">Bun venit în centrul de comandă.</p>
        </div>
        <Link
          href="/register-barber"
          className="bg-cyan-500 hover:bg-cyan-400 text-[#000428] font-bold px-6 py-3 rounded-xl transition-all shadow-[0_0_20px_rgba(34,211,238,0.2)] flex items-center gap-2 cursor-pointer"
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
              d="M12 4v16m8-8H4"
            />
          </svg>
          Adaugă Frizer Nou
        </Link>
      </div>

      {/* Carduri Statistici */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem] relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-cyan-500/20 rounded-full blur-2xl group-hover:bg-cyan-500/30 transition-all"></div>
          <h3 className="text-slate-400 font-medium mb-1">
            Încasări Totale (Luna asta)
          </h3>
          <p className="text-3xl font-bold text-white">0 RON</p>
          <span className="text-slate-500 text-sm mt-2 block">
            Așteptăm primele programări
          </span>
        </div>

        <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem] relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-purple-500/20 rounded-full blur-2xl group-hover:bg-purple-500/30 transition-all"></div>
          <h3 className="text-slate-400 font-medium mb-1">
            Frizeri Înregistrați
          </h3>
          <p className="text-3xl font-bold text-white">{barbers.length}</p>
          <span className="text-green-400 text-sm font-bold flex items-center gap-1 mt-2">
            ● Sistem activ
          </span>
        </div>

        <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem] relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-orange-500/20 rounded-full blur-2xl group-hover:bg-orange-500/30 transition-all"></div>
          <h3 className="text-slate-400 font-medium mb-1">Clienți Noi</h3>
          <p className="text-3xl font-bold text-white">0</p>
          <span className="text-slate-500 text-sm mt-2 block">
            Înregistrați în ultimele 30 zile
          </span>
        </div>
      </div>

      {/* Tabelul Principal Responsive */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8">
        <h3 className="text-xl font-bold text-white mb-6">
          Gestionare Echipă & Shop-uri
        </h3>

        {barbers.length === 0 ? (
          <div className="text-center py-10 bg-black/20 rounded-2xl border border-white/5">
            <p className="text-slate-400 mb-2">
              Nu există niciun frizer înregistrat încă.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="text-slate-400 border-b border-white/10 text-sm uppercase tracking-wider">
                  <th className="pb-4 font-medium pl-2">Frizer</th>
                  <th className="pb-4 font-medium">Nume Shop</th>
                  <th className="pb-4 font-medium text-center">Clienți</th>
                  <th className="pb-4 font-medium">Status</th>
                  <th className="pb-4 font-medium text-right pr-2">Acțiuni</th>
                </tr>
              </thead>
              <tbody className="text-slate-300">
                {barbers.map((barber) => {
                  const isActive = barber.status !== "suspended";

                  return (
                    <tr
                      key={barber.id}
                      className={`border-b border-white/5 transition-colors group ${!isActive ? "opacity-50 hover:opacity-100" : "hover:bg-white/5"}`}
                    >
                      {/* Nume și Email */}
                      <td className="py-4 pl-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold border border-white/10 shrink-0">
                            {barber.first_name
                              ? barber.first_name.charAt(0).toUpperCase()
                              : "?"}
                          </div>
                          <div>
                            <p className="font-bold text-white">
                              {barber.first_name} {barber.last_name}
                            </p>
                            <p className="text-xs text-slate-500">
                              {barber.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Nume Shop */}
                      <td className="py-4 font-medium text-slate-300">
                        {barber.shop_name ? (
                          <span className="text-cyan-400">
                            {barber.shop_name}
                          </span>
                        ) : (
                          <span className="text-slate-600 italic">Nesetat</span>
                        )}
                      </td>

                      {/* Clienți */}
                      <td className="py-4 text-center">
                        <span className="inline-flex items-center justify-center bg-white/5 border border-white/10 px-3 py-1 rounded-lg text-slate-300 font-mono">
                          0
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-4">
                        {isActive ? (
                          <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-bold border border-green-500/30 shadow-[0_0_10px_rgba(34,197,94,0.1)]">
                            Activ
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-bold border border-red-500/30">
                            Suspendat
                          </span>
                        )}
                      </td>

                      {/* Acțiuni */}
                      <td className="py-4 text-right pr-2">
                        <div className="flex justify-end gap-3 items-center">
                          <button
                            onClick={() =>
                              handleRenameShop(
                                barber.id,
                                barber.shop_name || "",
                              )
                            }
                            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-cyan-400 border border-transparent hover:border-cyan-400/30 transition-all cursor-pointer"
                            title="Editează Nume Shop"
                          >
                            ✏️
                          </button>

                          <button
                            onClick={() =>
                              handleToggleStatus(
                                barber.id,
                                barber.status || "active",
                              )
                            }
                            className={`px-4 py-2 rounded-lg transition-all text-sm font-bold cursor-pointer border ${
                              isActive
                                ? "bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/30 hover:shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                                : "bg-green-500/10 hover:bg-green-500/20 text-green-400 border-green-500/30 hover:shadow-[0_0_15px_rgba(34,197,94,0.2)]"
                            }`}
                          >
                            {isActive ? "Suspendă" : "Activează"}
                          </button>

                          {/* Buton Nou: Ștergere (Iconiță X roșu / Trash) */}
                          <button
                            onClick={() =>
                              handleDeleteBarber(barber.id, barber.first_name)
                            }
                            className="text-slate-500 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/30 transition-all cursor-pointer p-2 rounded-lg"
                            title="Șterge Definitiv"
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
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
