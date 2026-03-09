"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { useState, useEffect } from "react";

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Închidem meniul pe mobil automat după ce dăm click pe un link
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const menuItems = [
    {
      name: "Panou Control",
      href: "/admin",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
        />
      ),
    },
    {
      name: "Echipă Frizeri",
      href: "/admin/barbers",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z"
        />
      ),
    },
    {
      name: "Lista Clienți",
      href: "/admin/clients",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
        />
      ),
    },
    {
      name: "Financiar",
      href: "/admin/finance",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      ),
    },
  ];

  return (
    <>
      {/* 1. Bară de Navigație pentru Mobil (Vizibilă doar pe ecrane mici) */}
      <div className="md:hidden sticky top-0 z-40 w-full bg-[#0a0a0a]/90 backdrop-blur-xl border-b border-white/10 p-4 flex justify-between items-center shadow-lg">
        <div className="text-xl font-extrabold text-white tracking-wider">
          Barber<span className="text-cyan-400">App</span>
        </div>
        <button
          onClick={() => setIsMobileOpen(true)}
          className="text-cyan-400 p-2 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 cursor-pointer"
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
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
      </div>

      {/* 2. Fundal Întunecat pentru Mobil (Când meniul este deschis) */}
      {isMobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* 3. Meniul Lateral (Sidebar) */}
      <aside
        className={`fixed md:sticky top-0 left-0 h-screen bg-[#0a0a0a]/95 md:bg-[#0a0a0a]/90 backdrop-blur-xl border-r border-white/10 flex flex-col z-50 transition-all duration-300 
          ${isMobileOpen ? "translate-x-0 w-64 shadow-2xl" : "-translate-x-full w-64"} 
          md:translate-x-0 ${isCollapsed ? "md:w-24" : "md:w-72"}`}
      >
        {/* Buton Închidere X pe Mobil */}
        <button
          onClick={() => setIsMobileOpen(false)}
          className="md:hidden absolute top-4 right-4 text-slate-400 hover:text-white bg-white/5 p-2 rounded-lg cursor-pointer"
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
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* Butonul de Toggle pentru Desktop (Ascuns pe mobil) */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden md:flex absolute -right-4 top-10 bg-cyan-500 items-center justify-center w-8 h-8 rounded-full shadow-[0_0_15px_rgba(34,211,238,0.4)] cursor-pointer hover:scale-110 hover:bg-cyan-400 transition-all z-50 text-[#000428]"
        >
          <svg
            className={`w-4 h-4 transition-transform duration-300 ${isCollapsed ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="3"
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>

        {/* Partea de Sus: Administrator Profile */}
        <div
          className={`p-6 border-b border-white/10 flex items-center gap-4 transition-all ${isCollapsed ? "justify-center" : "mt-8 md:mt-0"}`}
        >
          <div className="w-12 h-12 shrink-0 rounded-2xl bg-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold border border-cyan-500/30 shadow-[0_0_20px_rgba(34,211,238,0.1)]">
            AD
          </div>
          {/* Textul e vizibil dacă nu e collapsed (sau dacă suntem pe mobil unde e mereu vizibil) */}
          <div
            className={`overflow-hidden whitespace-nowrap animate-fade-in ${isCollapsed ? "hidden" : "block"}`}
          >
            <h2 className="text-white font-bold text-lg leading-tight">
              Administrator
            </h2>
            <p className="text-xs text-green-400 flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
              Sistem Online
            </p>
          </div>
        </div>

        {/* Navigare (Link-uri) */}
        <nav className="flex-1 px-4 py-8 space-y-3 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={isCollapsed ? item.name : ""}
                className={`flex items-center px-4 py-3.5 rounded-xl transition-all duration-300 cursor-pointer group ${
                  isCollapsed ? "justify-center" : "gap-4"
                } ${
                  isActive
                    ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_15px_rgba(34,211,238,0.1)]"
                    : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"
                }`}
              >
                <svg
                  className={`shrink-0 ${isCollapsed ? "w-7 h-7" : "w-6 h-6"} transition-all`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  {item.icon}
                </svg>
                <span
                  className={`font-medium tracking-wide whitespace-nowrap animate-fade-in ${isCollapsed ? "hidden" : "block"}`}
                >
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Partea de Jos: Logout */}
        <div className="p-4 border-t border-white/10">
          <button
            onClick={handleLogout}
            title={isCollapsed ? "Deconectare" : ""}
            className={`w-full flex items-center justify-center gap-3 py-3.5 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/10 hover:text-red-300 hover:border-red-500/40 transition-all duration-300 cursor-pointer group shadow-[0_0_10px_rgba(239,68,68,0.05)] hover:shadow-[0_0_20px_rgba(239,68,68,0.15)]`}
          >
            <svg
              className="w-5 h-5 shrink-0 group-hover:-translate-x-1 transition-transform"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            <span
              className={`font-bold text-sm uppercase tracking-wider animate-fade-in ${isCollapsed ? "hidden" : "block"}`}
            >
              Deconectare
            </span>
          </button>
        </div>
      </aside>
    </>
  );
}
