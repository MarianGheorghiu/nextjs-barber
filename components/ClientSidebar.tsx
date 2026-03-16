"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { useState, useEffect } from "react";

export default function ClientSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const [clientName, setClientName] = useState("");
  const [loading, setLoading] = useState(true);

  // Stările pentru Toggle (Desktop) și Mobile Menu
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Când schimbăm ruta, închidem meniul pe mobil automat
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("first_name, last_name")
          .eq("id", user.id)
          .single();

        if (profile) {
          setClientName(`${profile.first_name} ${profile.last_name}`);
        }
      }
      setLoading(false);
    };

    fetchUser();
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  const menuItems = [
    {
      name: "Programare Nouă",
      href: "/client",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      ),
    },
    {
      name: "Istoric",
      href: "/client/history",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      ),
    },
    {
      name: "Frizerii Favorite",
      href: "/client/favorites",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      ),
    },
    {
      name: "Setări Cont",
      href: "/client/settings",
      icon: (
        <>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </>
      ),
    },
  ];

  return (
    <>
      {/* BARĂ DE NAVIGAȚIE SUS (DOAR PE MOBIL) */}
      <div className="md:hidden sticky top-0 z-40 w-full bg-[#0a0a0a]/90 backdrop-blur-xl border-b border-white/10 p-4 flex justify-between items-center shadow-lg">
        <div className="text-xl font-extrabold text-cyan-400 tracking-tight truncate max-w-[70%]">
          {loading
            ? "Se încarcă..."
            : clientName
              ? `Salut, ${clientName.split(" ")[0]}`
              : "Salut!"}
        </div>
        <button
          onClick={() => setIsMobileOpen(true)}
          className="text-cyan-400 p-2 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 cursor-pointer shrink-0"
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

      {/* OVERLAY NEGRU PENTRU MOBIL */}
      {isMobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* SIDEBAR-ul PROPRIU-ZIS */}
      <aside
        className={`fixed md:sticky top-0 left-0 h-screen bg-[#0a0a0a]/95 md:bg-[#0a0a0a]/90 backdrop-blur-xl border-r border-white/10 flex flex-col z-50 transition-all duration-300 ${
          isMobileOpen
            ? "translate-x-0 w-64 shadow-2xl"
            : "-translate-x-full w-64"
        } md:translate-x-0 ${isCollapsed ? "md:w-24" : "md:w-64"}`}
      >
        {/* Buton Închidere Mobil */}
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

        {/* Buton TOGGLE pentru Desktop */}
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

        {/* Partea de Sus: Profil Client */}
        <div
          className={`p-6 border-b border-white/10 flex items-center gap-4 transition-all ${isCollapsed ? "justify-center" : "mt-8 md:mt-0"}`}
        >
          <div className="w-12 h-12 shrink-0 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold border border-cyan-500/30 shadow-[0_0_20px_rgba(34,211,238,0.2)]">
            {loading ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : clientName ? (
              clientName.charAt(0).toUpperCase()
            ) : (
              "C"
            )}
          </div>
          <div
            className={`overflow-hidden whitespace-nowrap animate-fade-in ${isCollapsed ? "hidden" : "block"}`}
          >
            <h2 className="text-white font-bold text-lg leading-tight truncate">
              {loading ? "Se încarcă..." : clientName || "Client"}
            </h2>
            <p className="text-[10px] text-cyan-400 font-mono tracking-widest uppercase mt-0.5">
              Portal Client
            </p>
          </div>
        </div>

        {/* Navigare */}
        <nav className="flex-1 px-4 py-8 space-y-3 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => {
            const isActive =
              item.href === "/client"
                ? pathname === "/client"
                : pathname === item.href ||
                  pathname?.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileOpen(false)}
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

        {/* Footer / Delogare */}
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
