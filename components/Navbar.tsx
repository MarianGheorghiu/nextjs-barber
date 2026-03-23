"use client";
import { useState } from "react";
import Link from "next/link";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="pt-6 pb-4 relative z-50 w-full">
      {/* Containerul Liquid Glass Principal */}
      <div className="flex items-center justify-between px-6 py-5 md:px-10 bg-white/5 backdrop-blur-2xl border border-white/20 rounded-[2.5rem] shadow-2xl relative overflow-hidden transition-all">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"></div>

        {/* Logo */}
        <Link
          href="/"
          className="text-2xl md:text-4xl font-black tracking-tight text-white flex items-center gap-3 hover:scale-[1.02] transition-transform relative z-10"
        >
          Barber
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
            App
          </span>
        </Link>

        {/* Desktop Menu */}
        <div className="hidden lg:flex items-center gap-4 text-base font-bold text-slate-300 relative z-10">
          <Link
            href="#acasa"
            className="px-5 py-2.5 rounded-xl hover:text-cyan-400 hover:bg-white/5 transition-all"
          >
            Acasă
          </Link>
          <Link
            href="#servicii"
            className="px-5 py-2.5 rounded-xl hover:text-cyan-400 hover:bg-white/5 transition-all"
          >
            Servicii
          </Link>
          <Link
            href="#reguli"
            className="px-5 py-2.5 rounded-xl hover:text-cyan-400 hover:bg-white/5 transition-all"
          >
            Reguli
          </Link>
          <Link
            href="#recenzii"
            className="px-5 py-2.5 rounded-xl hover:text-cyan-400 hover:bg-white/5 transition-all"
          >
            Recenzii
          </Link>
          <Link
            href="#contact"
            className="px-5 py-2.5 rounded-xl hover:text-cyan-400 hover:bg-white/5 transition-all"
          >
            Contact
          </Link>
        </div>

        {/* Desktop Buttons */}
        <div className="hidden lg:flex gap-4 relative z-10">
          <Link
            href="/login"
            className="px-8 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all text-sm font-bold text-white shadow-sm"
          >
            Autentificare
          </Link>
          <Link
            href="/register"
            className="px-8 py-3.5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 transition-all text-sm font-black text-[#000428] shadow-[0_0_20px_rgba(34,211,238,0.3)] hover:shadow-[0_0_30px_rgba(34,211,238,0.5)] hover:scale-105"
          >
            Creare Cont
          </Link>
        </div>

        {/* Mobile Burger Button */}
        <button
          className="lg:hidden p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-200 hover:text-cyan-400 hover:bg-white/10 transition-all relative z-10"
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
                strokeWidth="2.5"
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {isOpen && (
        <div className="lg:hidden absolute top-full left-4 right-4 mt-4 bg-[#050505]/95 backdrop-blur-2xl border border-white/20 rounded-[2.5rem] p-8 flex flex-col gap-4 shadow-2xl z-50 animate-fade-in overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-[60px] pointer-events-none"></div>

          <Link
            href="#acasa"
            onClick={() => setIsOpen(false)}
            className="text-xl font-bold text-slate-300 hover:text-cyan-400 py-2 border-b border-white/5"
          >
            Acasă
          </Link>
          <Link
            href="#servicii"
            onClick={() => setIsOpen(false)}
            className="text-xl font-bold text-slate-300 hover:text-cyan-400 py-2 border-b border-white/5"
          >
            Servicii
          </Link>
          <Link
            href="#reguli"
            onClick={() => setIsOpen(false)}
            className="text-xl font-bold text-slate-300 hover:text-cyan-400 py-2 border-b border-white/5"
          >
            Reguli
          </Link>
          <Link
            href="#recenzii"
            onClick={() => setIsOpen(false)}
            className="text-xl font-bold text-slate-300 hover:text-cyan-400 py-2 border-b border-white/5"
          >
            Recenzii
          </Link>
          <Link
            href="#contact"
            onClick={() => setIsOpen(false)}
            className="text-xl font-bold text-slate-300 hover:text-cyan-400 py-2"
          >
            Contact
          </Link>

          <div className="flex flex-col gap-4 mt-6 pt-6 border-t border-white/10 relative z-10">
            <Link
              href="/login"
              className="w-full text-center px-6 py-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold transition-all shadow-sm"
            >
              Autentificare
            </Link>
            <Link
              href="/register"
              className="w-full text-center px-6 py-4 rounded-xl bg-cyan-500 text-[#000428] font-black shadow-[0_0_20px_rgba(34,211,238,0.4)]"
            >
              Creare Cont
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
