"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import {
  getUniqueClientsAction,
  blockClientAction,
  unblockClientAction,
} from "@/app/actions/barberClientsActions";

type BarberClient = {
  id: string; // Acum id-ul este de fapt numărul de telefon
  name: string;
  phone: string;
  status: "active" | "blocked";
};

export default function BarberClientsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<BarberClient[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [barberId, setBarberId] = useState<string | null>(null);

  useEffect(() => {
    fetchClients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const fetchClients = async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }
    setBarberId(user.id);

    // Chemăm backend-ul inteligent care scotocește prin appointments
    const uniqueClients = await getUniqueClientsAction(user.id);
    setClients(uniqueClients);
    setLoading(false);
  };

  const handleToggleStatus = async (phone: string, currentStatus: string) => {
    if (!barberId) return;

    if (currentStatus === "active") {
      const result = await blockClientAction(barberId, phone);
      if (result.success) {
        setClients(
          clients.map((c) =>
            c.phone === phone ? { ...c, status: "blocked" } : c,
          ),
        );
      }
    } else {
      const result = await unblockClientAction(barberId, phone);
      if (result.success) {
        setClients(
          clients.map((c) =>
            c.phone === phone ? { ...c, status: "active" } : c,
          ),
        );
      }
    }
  };

  const filteredClients = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery),
  );

  const totalClients = clients.length;
  const activeClients = clients.filter((c) => c.status === "active").length;
  const blockedClients = clients.filter((c) => c.status === "blocked").length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh]">
        <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-cyan-400 font-medium animate-pulse">
          Analizăm istoricul programărilor...
        </p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in max-w-6xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Clienții Mei</h1>
          <p className="text-slate-400">
            Aceasta este agenda ta generată automat din programările confirmate.
          </p>
        </div>
      </div>

      {/* 3 Panouri Statistici */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white/5 border border-white/10 p-5 rounded-2xl relative overflow-hidden">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">
            Total Clienți Unici
          </p>
          <p className="text-3xl font-bold text-white">{totalClients}</p>
        </div>

        <div className="bg-green-500/5 border border-green-500/20 p-5 rounded-2xl relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-green-500/10 rounded-full blur-xl"></div>
          <p className="text-green-400/80 text-xs font-bold uppercase tracking-wider mb-1 relative z-10">
            Clienți Activi
          </p>
          <p className="text-3xl font-bold text-green-400 relative z-10">
            {activeClients}
          </p>
        </div>

        <div className="bg-red-500/5 border border-red-500/20 p-5 rounded-2xl relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-red-500/10 rounded-full blur-xl"></div>
          <p className="text-red-400/80 text-xs font-bold uppercase tracking-wider mb-1 relative z-10">
            Clienți Blocați
          </p>
          <p className="text-3xl font-bold text-red-400 relative z-10">
            {blockedClients}
          </p>
        </div>
      </div>

      {/* Bară de Căutare */}
      <div className="mb-6 relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
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
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <input
          type="text"
          placeholder="Caută după nume sau număr de telefon..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-black/40 backdrop-blur-md border border-white/10 focus:border-cyan-400 rounded-2xl pl-12 pr-4 py-4 text-white outline-none transition-all shadow-[0_0_15px_rgba(0,0,0,0.2)] placeholder:text-slate-500"
        />
      </div>

      {/* Tabel Clienți */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 sm:p-8">
        {clients.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-400 font-medium text-lg mb-2">
              Agenda ta este goală.
            </p>
            <p className="text-sm text-slate-500">
              Clienții vor apărea aici automat după ce le confirmi prima
              programare.
            </p>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="text-center py-12 text-slate-400 font-medium italic">
            Nu s-a găsit niciun client cu acest nume/număr.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="text-slate-400 border-b border-white/10 text-xs uppercase tracking-wider">
                  <th className="pb-4 font-medium pl-2">Nume Client</th>
                  <th className="pb-4 font-medium">Telefon</th>
                  <th className="pb-4 font-medium text-center">Status</th>
                  <th className="pb-4 font-medium text-right pr-2">
                    Acces Programări
                  </th>
                </tr>
              </thead>
              <tbody className="text-slate-300">
                {filteredClients.map((client) => {
                  const isActive = client.status === "active";

                  return (
                    <tr
                      key={client.phone}
                      className={`border-b border-white/5 transition-colors group ${!isActive ? "opacity-60 hover:opacity-100" : "hover:bg-white/5"}`}
                    >
                      <td className="py-4 pl-2 align-middle">
                        <p
                          className={`font-bold text-base ${isActive ? "text-white" : "text-slate-400 line-through decoration-red-500/50 decoration-2"}`}
                        >
                          {client.name}
                        </p>
                      </td>

                      <td className="py-4 align-middle font-mono text-cyan-400 text-sm">
                        {client.phone}
                      </td>

                      <td className="py-4 text-center align-middle">
                        {isActive ? (
                          <span className="px-3 py-1 rounded-md bg-green-500/10 text-green-400 border border-green-500/20 text-xs font-bold">
                            Activ
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-md bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-bold">
                            Blocat
                          </span>
                        )}
                      </td>

                      <td className="py-4 text-right pr-2 align-middle">
                        <button
                          onClick={() =>
                            handleToggleStatus(client.phone, client.status)
                          }
                          className={`cursor-pointer px-4 py-2 rounded-lg border transition-all text-xs font-bold inline-flex items-center gap-2 ${
                            isActive
                              ? "bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/30"
                              : "bg-green-500/10 hover:bg-green-500/20 text-green-400 border-green-500/30"
                          }`}
                        >
                          {isActive ? <>🚫 Interzice</> : <>✅ Permite</>}
                        </button>
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
