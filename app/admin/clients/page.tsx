"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { toggleStatusAction } from "@/app/actions/adminBarberActions";

type ClientProfile = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  status: string;
  created_at: string;
  total_appointments?: number;
};

export default function ClientsListPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchClientsAndAppointments = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      // 1. Extragem profilurile de clienți
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email, phone, status, created_at")
        .eq("role", "client")
        .order("created_at", { ascending: false });

      // 2. Extragem toate programările pentru a număra activitatea clienților
      const { data: appointmentsData } = await supabase
        .from("appointments")
        .select("client_id");

      // 3. Mapăm programările pe clienți
      if (profilesData) {
        const appointmentCounts: Record<string, number> = {};
        if (appointmentsData) {
          appointmentsData.forEach((app) => {
            appointmentCounts[app.client_id] =
              (appointmentCounts[app.client_id] || 0) + 1;
          });
        }

        const enrichedClients = profilesData.map((client) => ({
          ...client,
          total_appointments: appointmentCounts[client.id] || 0, // Garantăm 0 aici
        }));

        setClients(enrichedClients);
      }
      setLoading(false);
    };

    fetchClientsAndAppointments();
  }, [router]);

  const handleToggleStatus = async (
    clientId: string,
    currentStatus: string,
  ) => {
    const newStatus = currentStatus === "suspended" ? "active" : "suspended";
    const confirmMessage =
      newStatus === "suspended"
        ? "⚠️ Ești sigur că vrei să SUSPENZI acest client? Nu se va mai putea loga și nu va mai putea face programări noi."
        : "✅ Vrei să ACTIVEZI acest cont de client?";

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

  const totalClients = clients.length;
  const activeClients = clients.filter((c) => c.status !== "suspended").length;
  const suspendedClients = clients.filter(
    (c) => c.status === "suspended",
  ).length;

  const filteredClients = clients.filter((client) => {
    const searchString =
      `${client.first_name} ${client.last_name} ${client.email} ${client.phone}`.toLowerCase();
    return searchString.includes(searchTerm.toLowerCase());
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh]">
        <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-cyan-400 font-medium animate-pulse">
          Se sincronizează baza de date a clienților...
        </p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in max-w-7xl mx-auto pb-10">
      {/* HEADER */}
      <div className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
          Bază Date Clienți
        </h1>
        <p className="text-slate-400">
          Gestionează accesul clienților și monitorizează loialitatea acestora.
        </p>
      </div>

      {/* 1. Carduri Statistici Premium */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10">
        {/* Card 1: Total */}
        <div className="bg-cyan-500/10 border border-cyan-500/20 p-6 rounded-3xl flex items-center gap-5 relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-cyan-500/20 rounded-full blur-2xl transition-all"></div>
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30 group-hover:scale-110 transition-transform relative z-10 shadow-inner">
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
          <div className="relative z-10">
            <p className="text-cyan-400/80 text-xs font-bold uppercase tracking-wider mb-1">
              Total Înregistrați
            </p>
            <p className="text-3xl font-black text-cyan-400">{totalClients}</p>
          </div>
        </div>

        {/* Card 2: Activi */}
        <div className="bg-green-500/10 border border-green-500/20 p-6 rounded-3xl flex items-center gap-5 relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-green-500/20 rounded-full blur-2xl transition-all"></div>
          <div className="w-14 h-14 rounded-2xl bg-green-500/20 text-green-400 flex items-center justify-center border border-green-500/30 group-hover:scale-110 transition-transform relative z-10 shadow-inner">
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
          <div className="relative z-10">
            <p className="text-green-400/80 text-xs font-bold uppercase tracking-wider mb-1">
              Conturi Active
            </p>
            <p className="text-3xl font-black text-green-400">
              {activeClients}
            </p>
          </div>
        </div>

        {/* Card 3: Suspendati */}
        <div className="bg-red-500/5 border border-red-500/20 p-6 rounded-3xl flex items-center gap-5 relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-red-500/10 rounded-full blur-2xl transition-all"></div>
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center border border-red-500/20 group-hover:scale-110 transition-transform relative z-10 shadow-inner">
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
          <div className="relative z-10">
            <p className="text-red-400/80 text-xs font-bold uppercase tracking-wider mb-1">
              Banați / Suspendate
            </p>
            <p className="text-3xl font-black text-red-400">
              {suspendedClients}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Container Tabel (Liquid Glass) */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 sm:p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none"></div>

        {/* Header Tabel & Căutare */}
        <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <svg
              className="w-5 h-5 text-cyan-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            Registru Clienți
          </h3>
          <div className="relative w-full sm:w-96">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg
                className="w-5 h-5 text-slate-400"
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
              className="w-full bg-black/40 border border-white/10 focus:border-cyan-400 rounded-xl pl-11 pr-4 py-3.5 text-white placeholder:text-slate-500 outline-none transition-all shadow-inner"
            />
          </div>
        </div>

        {/* Tabelul Premium */}
        <div className="overflow-x-auto relative z-10 custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="text-slate-400 border-b border-white/10 text-xs uppercase tracking-wider">
                <th className="pb-4 font-bold pl-4">Identitate & Contact</th>
                <th className="pb-4 font-bold text-center">Programări</th>
                <th className="pb-4 font-bold">Istoric Cont</th>
                <th className="pb-4 font-bold text-right pr-4">
                  Acces Platformă
                </th>
              </tr>
            </thead>
            <tbody className="text-white">
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-16 text-center">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10 text-slate-500">
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
                          d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                        />
                      </svg>
                    </div>
                    <p className="text-slate-300 font-medium">
                      Niciun client nu corespunde căutării.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => {
                  const isActive = client.status !== "suspended";
                  // Garantăm că e număr și verificăm dacă e mai mare ca 0
                  const appointmentsCount = client.total_appointments ?? 0;
                  const hasAppointments = appointmentsCount > 0;

                  return (
                    <tr
                      key={client.id}
                      className={`border-b border-white/5 transition-colors group ${!isActive ? "opacity-60 bg-red-500/5" : "hover:bg-white/5"}`}
                    >
                      {/* Coloana 1: Profil */}
                      <td className="py-5 pl-4 align-middle">
                        <div className="flex items-center gap-4">
                          <div
                            className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg border shrink-0 shadow-inner transition-colors ${
                              isActive
                                ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30 group-hover:bg-cyan-500/20"
                                : "bg-red-500/10 text-red-400 border-red-500/30"
                            }`}
                          >
                            {client.first_name
                              ? client.first_name.charAt(0).toUpperCase()
                              : "?"}
                          </div>
                          <div>
                            <p className="font-bold text-white text-lg tracking-tight mb-0.5 flex items-center gap-2">
                              {client.first_name} {client.last_name}
                              {!isActive && (
                                <span className="px-2 py-0.5 rounded-md bg-red-500/20 text-red-400 text-[10px] uppercase font-black border border-red-500/30">
                                  Banat
                                </span>
                              )}
                            </p>
                            <p className="text-sm text-slate-400">
                              {client.email}
                            </p>
                            <p className="text-xs text-slate-500 font-mono mt-0.5">
                              {client.phone || "Fără telefon"}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Coloana 2: Programări - AICI AM FORȚAT SĂ SE AȘTEPTE 0 */}
                      <td className="py-5 align-middle text-center">
                        <div className="inline-flex flex-col items-center">
                          <span
                            className={`text-2xl font-black ${hasAppointments ? "text-cyan-400" : "text-slate-600"}`}
                          >
                            {appointmentsCount}
                          </span>
                          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                            Vizite
                          </span>
                        </div>
                      </td>

                      {/* Coloana 3: Istoric Cont */}
                      <td className="py-5 align-middle">
                        <div className="flex items-center gap-2 text-sm text-slate-300">
                          <svg
                            className="w-4 h-4 text-slate-500"
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
                          <span className="font-medium">
                            Din{" "}
                            {new Date(client.created_at).toLocaleDateString(
                              "ro-RO",
                              { month: "long", year: "numeric" },
                            )}
                          </span>
                        </div>
                      </td>

                      {/* Coloana 4: Acțiuni */}
                      <td className="py-5 text-right pr-4 align-middle">
                        <button
                          onClick={() =>
                            handleToggleStatus(
                              client.id,
                              client.status || "active",
                            )
                          }
                          className={`cursor-pointer px-4 py-2.5 rounded-xl transition-all text-xs font-bold border flex items-center justify-center gap-2 ml-auto shadow-sm ${
                            isActive
                              ? "bg-white/5 text-slate-300 border-white/10 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30"
                              : "bg-green-500/10 text-green-400 border-green-500/30 hover:bg-green-500/20 hover:shadow-[0_0_15px_rgba(34,197,94,0.2)]"
                          }`}
                        >
                          {isActive ? (
                            <>
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
                                  d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                                />
                              </svg>
                              Suspendă Contul
                            </>
                          ) : (
                            <>
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
                                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                              Debanează
                            </>
                          )}
                        </button>
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
