"use client";
import { useState } from "react";
import Link from "next/link";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    // Am adăugat puțin padding sus pentru a lăsa meniul să "plutească"
    <nav className="pt-6 pb-4 relative z-50">
      {/* Containerul Liquid Glass Principal */}
      <div
        className="flex items-center justify-between px-6 py-4 md:px-8 
                      bg-white/5 backdrop-blur-lg border border-white/10 
                      rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.2)] transition-all"
      >
        {/* Logo */}
        <Link
          href="/"
          className="text-2xl md:text-3xl font-extrabold tracking-wider text-white"
        >
          Barber<span className="text-cyan-400">App</span>
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-8 text-sm md:text-base font-medium text-slate-200">
          <Link href="#acasa" className="hover:text-cyan-400 transition-colors">
            Acasă
          </Link>
          <Link
            href="#servicii"
            className="hover:text-cyan-400 transition-colors"
          >
            Servicii
          </Link>
          <Link
            href="#recenzii"
            className="hover:text-cyan-400 transition-colors"
          >
            Recenzii
          </Link>
          <Link
            href="#contact"
            className="hover:text-cyan-400 transition-colors"
          >
            Contact
          </Link>
        </div>

        {/* Desktop Buttons */}
        <div className="hidden md:flex gap-4">
          <Link
            href="/login"
            className="px-6 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 transition-all text-sm font-medium"
          >
            Logare
          </Link>
          <Link
            href="/register"
            className="px-6 py-2.5 rounded-2xl bg-cyan-500/90 hover:bg-cyan-400 transition-all text-sm font-medium text-[#000428] shadow-[0_0_20px_rgba(34,211,238,0.3)]"
          >
            Înregistrare
          </Link>
        </div>

        {/* Mobile Burger Button */}
        <button
          className="md:hidden p-1 text-slate-200 hover:text-white transition-colors focus:outline-none"
          onClick={() => setIsOpen(!isOpen)}
        >
          <svg
            className="w-7 h-7"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {isOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Menu Dropdown - Liquid Glass pt Mobil */}
      {isOpen && (
        <div
          className="md:hidden absolute top-full left-0 w-full mt-4 
                        bg-[#002E5D]/40 backdrop-blur-xl border border-white/10 
                        rounded-3xl flex flex-col items-center py-8 gap-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] z-50"
        >
          <Link
            href="#acasa"
            onClick={() => setIsOpen(false)}
            className="text-lg text-slate-200 hover:text-cyan-400"
          >
            Acasă
          </Link>
          <Link
            href="#servicii"
            onClick={() => setIsOpen(false)}
            className="text-lg text-slate-200 hover:text-cyan-400"
          >
            Servicii
          </Link>
          <Link
            href="#recenzii"
            onClick={() => setIsOpen(false)}
            className="text-lg text-slate-200 hover:text-cyan-400"
          >
            Recenzii
          </Link>
          <Link
            href="#contact"
            onClick={() => setIsOpen(false)}
            className="text-lg text-slate-200 hover:text-cyan-400"
          >
            Contact
          </Link>
          <div className="flex flex-col w-full px-8 gap-4 mt-4 border-t border-white/10 pt-6">
            <Link
              href="/login"
              className="w-full text-center px-6 py-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
            >
              Logare
            </Link>
            <Link
              href="/register"
              className="w-full text-center px-6 py-3 rounded-2xl bg-cyan-500 text-[#000428] font-bold shadow-[0_0_15px_rgba(34,211,238,0.4)]"
            >
              Înregistrare
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
