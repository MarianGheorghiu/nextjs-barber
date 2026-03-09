"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toggleStatusAction } from "@/app/actions/adminBarberActions";

type ClientProfile = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  status: string;
  created_at: string;
};

export default function ClientsListPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchClients = async () => {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      // Extragem doar utilizatorii cu rolul de 'client'
      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email, phone, status, created_at")
        .eq("role", "client")
        .order("created_at", { ascending: false });

      if (data && !error) {
        setClients(data);
      }
      setLoading(false);
    };

    fetchClients();
  }, [router]);

  // Funcție pentru suspendare/activare client
  const handleToggleStatus = async (
    clientId: string,
    currentStatus: string,
  ) => {
    const newStatus = currentStatus === "suspended" ? "active" : "suspended";

    const confirmMessage =
      newStatus === "suspended"
        ? "Ești sigur că vrei să SUSPENZI acest client? Nu se va mai putea programa."
        : "Vrei să ACTIVEZI acest cont de client?";

    if (window.confirm(confirmMessage)) {
      const result = await toggleStatusAction(clientId, newStatus);
      if (result.success) {
        setClients(
          clients.map((c) =>
            c.id === clientId ? { ...c, status: newStatus } : c,
          ),
        );
      } else {
        alert("Eroare la schimbarea statusului: " + result.error);
      }
    }
  };

  // Statistici
  const totalClients = clients.length;
  const activeClients = clients.filter((c) => c.status !== "suspended").length;
  const suspendedClients = clients.filter(
    (c) => c.status === "suspended",
  ).length;

  // Căutare instantanee
  const filteredClients = clients.filter((client) => {
    const searchString =
      `${client.first_name} ${client.last_name} ${client.email} ${client.phone}`.toLowerCase();
    return searchString.includes(searchTerm.toLowerCase());
  });

  // Formatare dată
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ro-RO", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh]">
        <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-cyan-400 font-medium animate-pulse">
          Se încarcă lista clienților...
        </p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Lista Clienți</h1>
        <p className="text-slate-400">
          Gestionează toți clienții înregistrați în aplicație.
        </p>
      </div>

      {/* 1. Carduri Statistici */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
        <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem] flex items-center gap-5 group hover:bg-white/10 transition-all">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30 group-hover:scale-110 transition-transform">
            <svg
              className="w-7 h-7"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          </div>
          <div>
            <p className="text-slate-400 text-sm font-medium">Total Clienți</p>
            <p className="text-3xl font-bold text-white">{totalClients}</p>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem] flex items-center gap-5 group hover:bg-white/10 transition-all">
          <div className="w-14 h-14 rounded-2xl bg-green-500/20 text-green-400 flex items-center justify-center border border-green-500/30 group-hover:scale-110 transition-transform">
            <svg
              className="w-7 h-7"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <p className="text-slate-400 text-sm font-medium">Conturi Active</p>
            <p className="text-3xl font-bold text-white">{activeClients}</p>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem] flex items-center gap-5 group hover:bg-white/10 transition-all">
          <div className="w-14 h-14 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center border border-red-500/30 group-hover:scale-110 transition-transform">
            <svg
              className="w-7 h-7"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
              />
            </svg>
          </div>
          <div>
            <p className="text-slate-400 text-sm font-medium">
              Conturi Suspendate
            </p>
            <p className="text-3xl font-bold text-white">{suspendedClients}</p>
          </div>
        </div>
      </div>

      {/* 2. Containerul Tabelului & Search */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 sm:p-8">
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <h3 className="text-xl font-bold text-white w-full sm:w-auto">
            Bază de date clienți
          </h3>
          <div className="relative w-full sm:w-80">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg
                className="w-5 h-5 text-slate-500"
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
              placeholder="Caută nume, email, telefon..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-black/20 border border-white/10 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 rounded-xl pl-11 pr-4 py-3 text-white placeholder:text-slate-500 outline-none transition-all"
            />
          </div>
        </div>

        {/* Tabelul Compact */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="text-slate-400 border-b border-white/10 text-xs uppercase tracking-wider">
                <th className="pb-4 font-medium pl-2">Profil & Contact</th>
                <th className="pb-4 font-medium">Activitate</th>
                <th className="pb-4 font-medium text-right pr-2">Acțiuni</th>
              </tr>
            </thead>
            <tbody className="text-slate-300">
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-10 text-center text-slate-500">
                    Niciun client găsit.
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => {
                  const isActive = client.status !== "suspended";

                  return (
                    <tr
                      key={client.id}
                      className={`border-b border-white/5 transition-colors ${!isActive ? "opacity-60" : "hover:bg-white/5"}`}
                    >
                      {/* Coloana 1: Profil */}
                      <td className="py-4 pl-2 align-top">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-white font-bold border border-white/10 shrink-0 mt-1 shadow-inner">
                            {client.first_name
                              ? client.first_name.charAt(0).toUpperCase()
                              : "?"}
                          </div>
                          <div>
                            <p className="font-bold text-white text-base">
                              {client.first_name} {client.last_name}
                            </p>
                            <p className="text-sm text-slate-400 mb-0.5">
                              {client.email}
                            </p>
                            <p className="text-xs text-cyan-400 font-mono">
                              {client.phone || "Fără telefon"}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Coloana 2: Activitate & Status */}
                      <td className="py-4 align-top">
                        <div className="flex flex-col items-start gap-2">
                          {isActive ? (
                            <span className="px-2.5 py-0.5 rounded-md bg-green-500/10 text-green-400 text-[10px] font-bold border border-green-500/20 uppercase tracking-wider">
                              Activ
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-md bg-red-500/10 text-red-400 text-[10px] font-bold border border-red-500/20 uppercase tracking-wider">
                              Suspendat
                            </span>
                          )}
                          <p className="text-sm text-white">
                            <span className="font-bold">0</span>{" "}
                            <span className="text-slate-500 text-xs">
                              Programări totale
                            </span>
                          </p>
                          <p className="text-[11px] text-slate-500">
                            Client din: {formatDate(client.created_at)}
                          </p>
                        </div>
                      </td>

                      {/* Coloana 3: Acțiuni */}
                      <td className="py-4 text-right pr-2 align-middle">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() =>
                              handleToggleStatus(
                                client.id,
                                client.status || "active",
                              )
                            }
                            className={`px-3 py-1.5 rounded-lg transition-all text-xs font-bold border ${
                              isActive
                                ? "bg-white/5 text-slate-300 border-white/10 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30"
                                : "bg-green-500/10 text-green-400 border-green-500/30 hover:bg-green-500/20"
                            }`}
                          >
                            {isActive ? "Suspendă" : "Activează"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
