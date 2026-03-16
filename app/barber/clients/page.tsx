"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import {
  toggleClientStatusAction,
  deleteClientAction,
} from "@/app/actions/barberClientsActions";

type BarberClient = {
  id: string;
  name: string;
  phone: string;
  status: string;
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

    // Citim din tabelul permanent de agendă!
    const { data, error } = await supabase
      .from("barber_clients")
      .select("*")
      .eq("barber_id", user.id)
      .order("name", { ascending: true });

    if (data && !error) setClients(data);
    setLoading(false);
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const result = await toggleClientStatusAction(id, currentStatus);
    if (result.success) {
      setClients(
        clients.map((c) =>
          c.id === id
            ? {
                ...c,
                status: currentStatus === "active" ? "blocked" : "active",
              }
            : c,
        ),
      );
    } else {
      alert("Eroare la modificare status: " + result.error);
    }
  };

  const handleDelete = async (id: string) => {
    if (
      window.confirm(
        "Ștergi definitiv acest client din agendă? (Nu îi va afecta programările curente)",
      )
    ) {
      const result = await deleteClientAction(id);
      if (result.success) {
        setClients(clients.filter((c) => c.id !== id));
      } else {
        alert("Eroare la ștergere: " + result.error);
      }
    }
  };

  // Logica de Căutare (Filtrare instantanee)
  const filteredClients = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.phone && c.phone.includes(searchQuery)),
  );

  // Calcule pentru Panouri
  const totalClients = clients.length;
  const activeClients = clients.filter((c) => c.status === "active").length;
  const blockedClients = clients.filter((c) => c.status === "blocked").length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh]">
        <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-cyan-400 font-medium animate-pulse">
          Se încarcă agenda permanentă...
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
            Agenda ta permanentă. Clienții apar aici automat când le confirmi o
            programare.
          </p>
        </div>
      </div>

      {/* 3 Panouri Statistici */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white/5 border border-white/10 p-5 rounded-2xl relative overflow-hidden">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">
            Total Clienți În Agendă
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
              Agenda este goală.
            </p>
            <p className="text-sm text-slate-500">
              Du-te în Calendar și apasă "Confirmă" pe o programare, iar
              clientul va fi salvat automat aici!
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
                  <th className="pb-4 font-medium text-right pr-2">Acțiuni</th>
                </tr>
              </thead>
              <tbody className="text-slate-300">
                {filteredClients.map((client) => {
                  const isActive = client.status === "active";

                  return (
                    <tr
                      key={client.id}
                      className={`border-b border-white/5 transition-colors group ${!isActive ? "opacity-60 hover:opacity-100" : "hover:bg-white/5"}`}
                    >
                      {/* Nume */}
                      <td className="py-4 pl-2 align-middle">
                        <p
                          className={`font-bold text-base ${isActive ? "text-white" : "text-slate-400 line-through decoration-red-500/50 decoration-2"}`}
                        >
                          {client.name}
                        </p>
                      </td>

                      {/* Telefon */}
                      <td className="py-4 align-middle font-mono text-cyan-400 text-sm">
                        {client.phone || "Lipsă"}
                      </td>

                      {/* Status */}
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

                      {/* Acțiuni */}
                      <td className="py-4 text-right pr-2 align-middle">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() =>
                              handleToggleStatus(client.id, client.status)
                            }
                            className={`cursor-pointer px-3 py-1.5 rounded-lg border transition-all text-xs font-bold flex items-center gap-1.5 ${
                              isActive
                                ? "bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border-orange-500/30"
                                : "bg-green-500/10 hover:bg-green-500/20 text-green-400 border-green-500/30"
                            }`}
                            title={
                              isActive
                                ? "Blochează Clientul"
                                : "Deblochează Clientul"
                            }
                          >
                            {isActive ? (
                              <>
                                🚫{" "}
                                <span className="hidden sm:inline">
                                  Blochează
                                </span>
                              </>
                            ) : (
                              <>
                                ✅{" "}
                                <span className="hidden sm:inline">
                                  Deblochează
                                </span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => handleDelete(client.id)}
                            className="cursor-pointer px-3 py-1.5 rounded-lg bg-white/5 hover:bg-red-500/10 text-slate-400 hover:text-red-400 border border-transparent hover:border-red-500/30 transition-all text-xs font-bold flex items-center gap-1"
                            title="Șterge din agendă"
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
