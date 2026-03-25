"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import {
  updateShopNameAction,
  toggleStatusAction,
  deleteBarberAction,
  addBarberFromAdminAction,
} from "@/app/actions/adminBarberActions";

type BarberProfile = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  shop_name?: string;
  status?: string;
  role: string;
  total_unique_clients?: number;
};

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [barbers, setBarbers] = useState<BarberProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Statistici Globale
  const [globalRevenue, setGlobalRevenue] = useState(0);
  const [newClientsCount, setNewClientsCount] = useState(0);

  // ================= MODAL STATES =================
  const [activeModal, setActiveModal] = useState<
    "none" | "add" | "edit" | "confirm"
  >("none");
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const [selectedBarber, setSelectedBarber] = useState<BarberProfile | null>(
    null,
  );
  const [editShopName, setEditShopName] = useState("");
  const [confirmConfig, setConfirmConfig] = useState({
    title: "",
    message: "",
    actionType: "",
    buttonText: "",
    buttonColor: "",
  });
  const [newBarber, setNewBarber] = useState({
    lastName: "",
    firstName: "",
    shopName: "",
    phone: "",
    diploma: "",
    emailPrefix: "",
    password: "",
  });

  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ================= REALTIME SYNC PENTRU ADMIN =================
  useEffect(() => {
    const supabase = createClient();

    // Ascultăm modificările atât pe profiluri (angajați/clienți noi) cât și pe programări (pentru încasări)
    const channel = supabase
      .channel("realtime-admin-dashboard")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => {
          fetchDashboardData(false); // Refresh tăcut
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointments" },
        () => {
          fetchDashboardData(false); // Refresh tăcut
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchDashboardData = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    const { data: barbersData } = await supabase
      .from("profiles")
      .select(
        "id, first_name, last_name, email, shop_name, status, role, phone",
      )
      .eq("role", "barber")
      .order("created_at", { ascending: false });

    const now = new Date();
    const firstDayOfMonth = new Date(
      now.getFullYear(),
      now.getMonth(),
      1,
    ).toISOString();
    const thirtyDaysAgo = new Date(
      now.getTime() - 30 * 24 * 60 * 60 * 1000,
    ).toISOString();

    const { data: appointmentsData } = await supabase
      .from("appointments")
      .select("barber_id, client_id, price, appointment_date, appointment_time")
      .neq("status", "cancelled");

    const { count: recentClients } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "client")
      .gte("created_at", thirtyDaysAgo);

    if (recentClients !== null) setNewClientsCount(recentClients);

    if (barbersData) {
      let totalRev = 0;
      const clientSets: Record<string, Set<string>> = {};

      if (appointmentsData) {
        appointmentsData.forEach((app) => {
          const appDate = new Date(
            `${app.appointment_date}T${app.appointment_time}`,
          );
          if (appDate < now) {
            if (appDate.toISOString() >= firstDayOfMonth) totalRev += app.price;
            if (!clientSets[app.barber_id])
              clientSets[app.barber_id] = new Set();
            clientSets[app.barber_id].add(app.client_id);
          }
        });
      }

      setGlobalRevenue(totalRev);
      setBarbers(
        barbersData.map((b) => ({
          ...b,
          total_unique_clients: clientSets[b.id] ? clientSets[b.id].size : 0,
        })),
      );
    }
    if (showLoader) setLoading(false);
  };

  const closeModal = () => {
    setActiveModal("none");
    setSelectedBarber(null);
    setModalError(null);
    setNewBarber({
      lastName: "",
      firstName: "",
      shopName: "",
      phone: "",
      diploma: "",
      emailPrefix: "",
      password: "",
    });
  };

  const handleAddBarberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setModalLoading(true);

    if (!/^07\d{8}$/.test(newBarber.phone.replace(/\s/g, ""))) {
      setModalError("Telefon invalid (10 cifre, începe cu 07).");
      setModalLoading(false);
      return;
    }
    if (!/^[a-z0-9.]+$/.test(newBarber.emailPrefix)) {
      setModalError("Prefix email invalid.");
      setModalLoading(false);
      return;
    }
    if (newBarber.password.length < 6) {
      setModalError("Parola necesită minim 6 caractere.");
      setModalLoading(false);
      return;
    }

    const result = await addBarberFromAdminAction(newBarber);

    if (result.success) {
      await fetchDashboardData();
      closeModal();
    } else {
      setModalError(result.error || "Eroare la creare cont.");
    }
    setModalLoading(false);
  };

  const handleEditShopSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBarber || !editShopName.trim()) return;
    setModalLoading(true);

    const cleanName = editShopName.trim();
    const result = await updateShopNameAction(selectedBarber.id, cleanName);

    if (result.success) {
      setBarbers(
        barbers.map((b) =>
          b.id === selectedBarber.id ? { ...b, shop_name: cleanName } : b,
        ),
      );
      closeModal();
    } else {
      setModalError(result.error || "A apărut o eroare.");
    }
    setModalLoading(false);
  };

  const executeConfirmAction = async () => {
    if (!selectedBarber) return;
    setModalLoading(true);

    if (confirmConfig.actionType === "toggle_status") {
      const newStatus =
        selectedBarber.status === "suspended" ? "active" : "suspended";
      const result = await toggleStatusAction(selectedBarber.id, newStatus);
      if (result.success) {
        setBarbers(
          barbers.map((b) =>
            b.id === selectedBarber.id ? { ...b, status: newStatus } : b,
          ),
        );
        closeModal();
      } else setModalError(result.error || "Eroare modificare status.");
    } else if (confirmConfig.actionType === "delete") {
      const result = await deleteBarberAction(selectedBarber.id);
      if (result.success) {
        setBarbers(barbers.filter((b) => b.id !== selectedBarber.id));
        closeModal();
      } else setModalError(result.error || "Eroare ștergere cont.");
    }
    setModalLoading(false);
  };

  const filteredBarbers = barbers.filter((barber) => {
    const searchString =
      `${barber.first_name} ${barber.last_name} ${barber.email} ${barber.shop_name}`.toLowerCase();
    return searchString.includes(searchTerm.toLowerCase());
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh]">
        <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mb-4 shadow-[0_0_15px_rgba(34,211,238,0.5)]"></div>
        <p className="text-cyan-400 font-bold uppercase tracking-widest text-xs animate-pulse">
          Se încarcă sistemul...
        </p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in max-w-7xl mx-auto pb-10 relative">
      {/* HEADER COMPACT DAR PREMIUM */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">
            Prezentare Generală
          </h1>
          <p className="text-slate-400 text-sm font-medium">
            Centrul de comandă administrativ. Toate statisticile sunt live.
          </p>
        </div>
        <button
          onClick={() => setActiveModal("add")}
          className="bg-cyan-500 hover:bg-cyan-400 text-[#000428] font-black px-6 py-3 rounded-xl transition-all shadow-[0_0_15px_rgba(34,211,238,0.3)] hover:shadow-[0_0_25px_rgba(34,211,238,0.5)] flex items-center gap-2 hover:scale-105"
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
              strokeWidth="3"
              d="M12 4v16m8-8H4"
            />
          </svg>
          Adaugă Angajat
        </button>
      </div>

      {/* CARDURI STATISTICI (Liquid Glass) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {/* Card 1 */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/20 p-6 rounded-[1.5rem] shadow-xl flex items-center gap-5 relative overflow-hidden group hover:bg-white/10 transition-all cursor-default">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-green-500/20 rounded-full blur-[30px] group-hover:bg-green-500/30 transition-all pointer-events-none"></div>
          <div className="w-14 h-14 rounded-2xl bg-green-500/10 text-green-400 flex items-center justify-center border border-green-500/20 shrink-0 shadow-inner relative z-10">
            <svg
              className="w-7 h-7"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div className="relative z-10">
            <p className="text-slate-300 text-[10px] font-black uppercase tracking-widest mb-0.5">
              Încasări Lunare
            </p>
            <p className="text-3xl font-black text-white">
              {globalRevenue.toLocaleString("ro-RO")}{" "}
              <span className="text-sm font-bold text-green-400">RON</span>
            </p>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/20 p-6 rounded-[1.5rem] shadow-xl flex items-center gap-5 relative overflow-hidden group hover:bg-white/10 transition-all cursor-default">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-cyan-500/20 rounded-full blur-[30px] group-hover:bg-cyan-500/30 transition-all pointer-events-none"></div>
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20 shrink-0 shadow-inner relative z-10">
            <svg
              className="w-7 h-7"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
          <div className="relative z-10">
            <p className="text-slate-300 text-[10px] font-black uppercase tracking-widest mb-0.5">
              Echipă Activă
            </p>
            <p className="text-3xl font-black text-white">
              {barbers.length}{" "}
              <span className="text-sm font-bold text-cyan-400">Membri</span>
            </p>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/20 p-6 rounded-[1.5rem] shadow-xl flex items-center gap-5 relative overflow-hidden group hover:bg-white/10 transition-all cursor-default">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-purple-500/20 rounded-full blur-[30px] group-hover:bg-purple-500/30 transition-all pointer-events-none"></div>
          <div className="w-14 h-14 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20 shrink-0 shadow-inner relative z-10">
            <svg
              className="w-7 h-7"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
              />
            </svg>
          </div>
          <div className="relative z-10">
            <p className="text-slate-300 text-[10px] font-black uppercase tracking-widest mb-0.5">
              Clienți Noi (30 Zile)
            </p>
            <p className="text-3xl font-black text-white">
              {newClientsCount}{" "}
              <span className="text-sm font-bold text-purple-400">
                Înscrieri
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* TABEL CENTRAL LIQUID GLASS SPATIOS */}
      <div className="bg-white/5 backdrop-blur-2xl border border-white/20 rounded-[2.5rem] p-6 sm:p-8 shadow-2xl flex flex-col relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500/50 via-purple-500/50 to-cyan-500/50"></div>
        <div className="absolute -top-10 -right-10 w-64 h-64 bg-cyan-500/10 rounded-full blur-[80px] pointer-events-none"></div>

        <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0 relative z-10">
          <h3 className="text-xl font-black text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 text-cyan-400 shadow-inner">
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
                  d="M4 6h16M4 10h16M4 14h16M4 18h16"
                />
              </svg>
            </div>
            Manager Frizerii
          </h3>
          <div className="relative w-full sm:w-80">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
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
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Caută frizer, frizerie..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-black/40 border border-white/10 focus:border-cyan-400 rounded-2xl pl-11 pr-4 py-3.5 text-white placeholder:text-slate-400 outline-none transition-all text-sm shadow-inner"
            />
          </div>
        </div>

        {barbers.length === 0 ? (
          <div className="text-center py-16 relative z-10">
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
            <p className="text-slate-400 text-base font-medium">
              Platforma nu are niciun frizer angajat.
            </p>
          </div>
        ) : (
          <div className="overflow-auto relative z-10 custom-scrollbar max-h-[500px] rounded-2xl border border-white/10 bg-black/20 shadow-inner">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead className="sticky top-0 z-20 bg-[#050505]/95 backdrop-blur-xl border-b border-white/10 shadow-sm">
                <tr className="text-slate-300 text-xs uppercase tracking-widest font-black">
                  <th className="py-4 pl-6">Identitate</th>
                  <th className="py-4">Frizerie</th>
                  <th className="py-4 text-center">Clienți</th>
                  <th className="py-4 text-right pr-6">Control Acces</th>
                </tr>
              </thead>
              <tbody className="text-white text-base">
                {filteredBarbers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="py-12 text-center text-slate-500 font-medium"
                    >
                      Nu s-a găsit niciun rezultat.
                    </td>
                  </tr>
                ) : (
                  filteredBarbers.map((barber) => {
                    const isActive = barber.status !== "suspended";
                    const clientsCount = barber.total_unique_clients ?? 0;

                    return (
                      <tr
                        key={barber.id}
                        className={`border-b border-white/5 transition-colors ${!isActive ? "opacity-60 bg-red-500/5" : "hover:bg-white/5"}`}
                      >
                        <td className="py-5 pl-6 align-middle">
                          <div className="flex items-center gap-4">
                            <div
                              className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg border shrink-0 shadow-inner ${isActive ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30" : "bg-red-500/10 text-red-400 border-red-500/30"}`}
                            >
                              {barber.first_name
                                ? barber.first_name.charAt(0).toUpperCase()
                                : "?"}
                            </div>
                            <div>
                              <p className="font-bold text-white mb-0.5 flex items-center gap-2">
                                {barber.first_name} {barber.last_name}
                                {!isActive && (
                                  <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 text-[10px] uppercase font-black border border-red-500/30">
                                    Oprit
                                  </span>
                                )}
                              </p>
                              <p className="text-sm text-slate-400">
                                {barber.email}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="py-5 align-middle font-medium">
                          {barber.shop_name ? (
                            <span className="flex items-center gap-2">
                              <span className="text-xl">✂️</span>{" "}
                              {barber.shop_name}
                            </span>
                          ) : (
                            <span className="text-slate-500 italic">
                              Nesetat
                            </span>
                          )}
                        </td>

                        <td className="py-5 align-middle text-center">
                          <span
                            className={`font-black text-xl ${clientsCount > 0 ? "text-cyan-400" : "text-slate-500"}`}
                          >
                            {clientsCount}
                          </span>
                        </td>

                        <td className="py-5 text-right pr-6 align-middle">
                          <div className="flex justify-end gap-2.5 items-center">
                            <button
                              onClick={() => {
                                setSelectedBarber(barber);
                                setEditShopName(barber.shop_name || "");
                                setActiveModal("edit");
                              }}
                              className="w-10 h-10 rounded-xl bg-white/5 hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-400 border border-white/10 hover:border-cyan-500/40 transition-all flex items-center justify-center cursor-pointer shadow-sm"
                              title="Editează Nume Frizerie"
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
                                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                                />
                              </svg>
                            </button>

                            <button
                              onClick={() => {
                                setSelectedBarber(barber);
                                setConfirmConfig({
                                  title: isActive
                                    ? "Suspendare Cont"
                                    : "Activare Cont",
                                  message: isActive
                                    ? `Oprești accesul pentru ${barber.first_name}?`
                                    : `Redai accesul lui ${barber.first_name}?`,
                                  actionType: "toggle_status",
                                  buttonText: isActive
                                    ? "Suspendă"
                                    : "Activează",
                                  buttonColor: isActive ? "red" : "green",
                                });
                                setActiveModal("confirm");
                              }}
                              className={`w-10 h-10 rounded-xl transition-all flex items-center justify-center cursor-pointer border shadow-sm ${isActive ? "bg-white/5 text-slate-400 border-white/10 hover:bg-yellow-500/20 hover:text-yellow-400 hover:border-yellow-500/40" : "bg-green-500/10 text-green-400 border-green-500/30 hover:bg-green-500/20 hover:shadow-[0_0_15px_rgba(34,197,94,0.2)]"}`}
                              title={
                                isActive ? "Suspendă Cont" : "Activează Cont"
                              }
                            >
                              {isActive ? (
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
                                    d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                                  />
                                </svg>
                              ) : (
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
                                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                  />
                                </svg>
                              )}
                            </button>

                            <button
                              onClick={() => {
                                setSelectedBarber(barber);
                                setConfirmConfig({
                                  title: "Ștergere Definitivă",
                                  message: `Ștergi contul ${barber.first_name}? Datele vor dispărea permanent.`,
                                  actionType: "delete",
                                  buttonText: "Șterge Acum",
                                  buttonColor: "red",
                                });
                                setActiveModal("confirm");
                              }}
                              className="w-10 h-10 rounded-xl bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-white/10 hover:border-red-500/40 transition-all flex items-center justify-center cursor-pointer shadow-sm"
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
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ================= MODALE PREMIUM ================= */}
      {activeModal !== "none" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          {/* MODAL ADĂUGARE FRIZER */}
          {activeModal === "add" && (
            <div className="w-full max-w-2xl bg-[#050505]/95 backdrop-blur-2xl border border-white/20 p-8 sm:p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-[80px] pointer-events-none"></div>

              <div className="flex justify-between items-center mb-8 relative z-10">
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Înregistrare Angajat
                </h2>
                <button
                  onClick={closeModal}
                  className="p-2.5 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl cursor-pointer transition-colors"
                >
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
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {modalError && (
                <div className="relative z-10 mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-bold text-center shadow-inner">
                  {modalError}
                </div>
              )}

              <form
                onSubmit={handleAddBarberSubmit}
                className="flex flex-col gap-6 relative z-10"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-cyan-400/80 uppercase tracking-widest mb-2 ml-1">
                      Nume
                    </label>
                    <input
                      type="text"
                      required
                      value={newBarber.lastName}
                      onChange={(e) =>
                        setNewBarber({ ...newBarber, lastName: e.target.value })
                      }
                      className="w-full bg-black/40 border border-white/10 focus:border-cyan-400 rounded-2xl px-4 py-3.5 text-white text-base outline-none transition-all shadow-inner"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-cyan-400/80 uppercase tracking-widest mb-2 ml-1">
                      Prenume
                    </label>
                    <input
                      type="text"
                      required
                      value={newBarber.firstName}
                      onChange={(e) =>
                        setNewBarber({
                          ...newBarber,
                          firstName: e.target.value,
                        })
                      }
                      className="w-full bg-black/40 border border-white/10 focus:border-cyan-400 rounded-2xl px-4 py-3.5 text-white text-base outline-none transition-all shadow-inner"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-cyan-400/80 uppercase tracking-widest mb-2 ml-1">
                      Frizerie
                    </label>
                    <input
                      type="text"
                      required
                      value={newBarber.shopName}
                      onChange={(e) =>
                        setNewBarber({ ...newBarber, shopName: e.target.value })
                      }
                      className="w-full bg-black/40 border border-white/10 focus:border-cyan-400 rounded-2xl px-4 py-3.5 text-white text-base outline-none transition-all shadow-inner"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-cyan-400/80 uppercase tracking-widest mb-2 ml-1">
                      Telefon
                    </label>
                    <input
                      type="tel"
                      required
                      value={newBarber.phone}
                      onChange={(e) =>
                        setNewBarber({ ...newBarber, phone: e.target.value })
                      }
                      className="w-full bg-black/40 border border-white/10 focus:border-cyan-400 rounded-2xl px-4 py-3.5 text-cyan-400 text-base outline-none transition-all font-mono shadow-inner"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-cyan-400/80 uppercase tracking-widest mb-2 ml-1">
                    Diplomă
                  </label>
                  <input
                    type="text"
                    required
                    value={newBarber.diploma}
                    onChange={(e) =>
                      setNewBarber({ ...newBarber, diploma: e.target.value })
                    }
                    className="w-full bg-black/40 border border-white/10 focus:border-cyan-400 rounded-2xl px-4 py-3.5 text-white text-base outline-none transition-all shadow-inner"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 border-t border-white/10 pt-6 mt-2">
                  <div>
                    <label className="block text-xs font-bold text-cyan-400/80 uppercase tracking-widest mb-2 ml-1">
                      Email Intern
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={newBarber.emailPrefix}
                        onChange={(e) =>
                          setNewBarber({
                            ...newBarber,
                            emailPrefix: e.target.value
                              .replace(/[^a-zA-Z0-9.]/g, "")
                              .toLowerCase(),
                          })
                        }
                        placeholder="nume.prenume"
                        className="w-full bg-black/40 border border-white/10 focus:border-cyan-400 rounded-2xl pl-4 pr-[100px] py-3.5 text-white text-base outline-none transition-all font-mono shadow-inner"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-cyan-400 font-bold text-xs pointer-events-none">
                        @mcorp.com
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-cyan-400/80 uppercase tracking-widest mb-2 ml-1">
                      Parolă
                    </label>
                    <input
                      type="password"
                      required
                      value={newBarber.password}
                      onChange={(e) =>
                        setNewBarber({ ...newBarber, password: e.target.value })
                      }
                      className="w-full bg-black/40 border border-white/10 focus:border-cyan-400 rounded-2xl px-4 py-3.5 text-white text-base outline-none transition-all shadow-inner"
                    />
                  </div>
                </div>

                <div className="mt-4 flex justify-end gap-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-6 py-3.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-sm font-bold hover:bg-white/10 hover:text-white transition-all cursor-pointer shadow-sm"
                  >
                    Anulează
                  </button>
                  <button
                    type="submit"
                    disabled={modalLoading}
                    className="px-8 py-3.5 rounded-xl bg-cyan-500 text-[#000428] text-base font-black hover:bg-cyan-400 transition-all cursor-pointer disabled:opacity-50 shadow-[0_0_15px_rgba(34,211,238,0.3)]"
                  >
                    {modalLoading ? "Așteaptă..." : "Salvează Angajat"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* MODAL EDITARE NUME SHOP */}
          {activeModal === "edit" && selectedBarber && (
            <div className="w-full max-w-md bg-[#050505]/95 backdrop-blur-2xl border border-white/20 p-8 sm:p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500"></div>
              <h2 className="text-2xl font-black text-white mb-6 tracking-tight">
                Editare Frizerie
              </h2>
              {modalError && (
                <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-bold shadow-inner">
                  {modalError}
                </div>
              )}
              <form onSubmit={handleEditShopSubmit} className="relative z-10">
                <input
                  type="text"
                  required
                  value={editShopName}
                  onChange={(e) => setEditShopName(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 focus:border-cyan-400 rounded-2xl px-5 py-4 text-white text-lg outline-none transition-all mb-8 shadow-inner"
                />
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 py-4 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-base font-bold hover:bg-white/10 hover:text-white transition-all cursor-pointer shadow-sm"
                  >
                    Anulează
                  </button>
                  <button
                    type="submit"
                    disabled={modalLoading}
                    className="flex-1 py-4 rounded-xl bg-cyan-500 text-[#000428] text-base font-black hover:bg-cyan-400 transition-all cursor-pointer disabled:opacity-50 shadow-[0_0_15px_rgba(34,211,238,0.3)]"
                  >
                    {modalLoading ? "Se salvează..." : "Confirmă"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* MODAL CONFIRMARE (SUSPEND & DELETE) */}
          {activeModal === "confirm" && selectedBarber && (
            <div
              className={`w-full max-w-md bg-[#050505]/95 backdrop-blur-2xl border p-8 sm:p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden ${confirmConfig.buttonColor === "red" ? "border-red-500/30" : "border-green-500/30"}`}
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-white/20"></div>
              <div
                className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border-4 shadow-inner ${confirmConfig.buttonColor === "red" ? "bg-red-500/10 text-red-400 border-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.2)]" : "bg-green-500/10 text-green-400 border-green-500/30 shadow-[0_0_30px_rgba(34,197,94,0.2)]"}`}
              >
                {confirmConfig.buttonColor === "red" ? (
                  <svg
                    className="w-10 h-10"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-10 h-10"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </div>
              <h2 className="text-2xl font-black text-white mb-4 text-center tracking-tight">
                {confirmConfig.title}
              </h2>
              <p className="text-slate-300 text-sm mb-8 text-center leading-relaxed font-medium px-2">
                {confirmConfig.message}
              </p>

              {modalError && (
                <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-bold text-center shadow-inner">
                  {modalError}
                </div>
              )}

              <div className="flex gap-4 relative z-10">
                <button
                  onClick={closeModal}
                  className="flex-1 py-4 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-base font-bold hover:bg-white/10 transition-all cursor-pointer shadow-sm"
                >
                  Înapoi
                </button>
                <button
                  onClick={executeConfirmAction}
                  disabled={modalLoading}
                  className={`flex-1 py-4 rounded-xl text-[#0a0a0a] text-base font-black transition-all cursor-pointer disabled:opacity-50 shadow-lg ${confirmConfig.buttonColor === "red" ? "bg-red-500 hover:bg-red-400 shadow-[0_0_15px_rgba(239,68,68,0.4)]" : "bg-green-500 hover:bg-green-400 shadow-[0_0_15px_rgba(34,197,94,0.4)]"}`}
                >
                  {modalLoading ? "..." : confirmConfig.buttonText}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
