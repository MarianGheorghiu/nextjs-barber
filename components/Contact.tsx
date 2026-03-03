import React from "react";
import Link from "next/link"; // Adăugat pentru a face link-ul de copyright

export default function Contact() {
  return (
    <section id="contact" className="py-4 w-full">
      <h2 className="text-4xl md:text-5xl font-bold mb-8 mt-8 text-center tracking-wide text-white">
        Contact
      </h2>

      {/* Containerul principal Liquid Glass */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 md:p-12 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Partea Stângă: Informații */}
          <div className="flex flex-col gap-8">
            <h3 className="text-3xl font-bold text-white mb-2">
              Cristi Barber Shop
            </h3>

            {/* Adresa */}
            <div className="flex items-start gap-4 group">
              <div className="w-12 h-12 shrink-0 rounded-full bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center text-cyan-400 group-hover:bg-cyan-500/20 group-hover:shadow-[0_0_15px_rgba(34,211,238,0.2)] transition-all duration-300">
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
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.243-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm text-cyan-400 font-semibold tracking-wider uppercase mb-1">
                  Adresă
                </p>
                <p className="text-lg text-slate-200 font-light">
                  Comuna Borca, Județul Neamț
                </p>
              </div>
            </div>

            {/* Telefon */}
            <div className="flex items-start gap-4 group">
              <div className="w-12 h-12 shrink-0 rounded-full bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center text-cyan-400 group-hover:bg-cyan-500/20 group-hover:shadow-[0_0_15px_rgba(34,211,238,0.2)] transition-all duration-300">
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
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm text-cyan-400 font-semibold tracking-wider uppercase mb-1">
                  Telefon
                </p>
                <p className="text-lg text-slate-200 font-light">
                  0700 123 456
                </p>
              </div>
            </div>

            {/* Email */}
            <div className="flex items-start gap-4 group">
              <div className="w-12 h-12 shrink-0 rounded-full bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center text-cyan-400 group-hover:bg-cyan-500/20 group-hover:shadow-[0_0_15px_rgba(34,211,238,0.2)] transition-all duration-300">
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
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm text-cyan-400 font-semibold tracking-wider uppercase mb-1">
                  Email
                </p>
                <p className="text-lg text-slate-200 font-light">
                  contact@cristibarber.ro
                </p>
              </div>
            </div>

            {/* Program */}
            <div className="flex items-start gap-4 group">
              <div className="w-12 h-12 shrink-0 rounded-full bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center text-cyan-400 group-hover:bg-cyan-500/20 group-hover:shadow-[0_0_15px_rgba(34,211,238,0.2)] transition-all duration-300">
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
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm text-cyan-400 font-semibold tracking-wider uppercase mb-1">
                  Program
                </p>
                <p className="text-lg text-slate-200 font-light">
                  Luni - Sâmbătă:{" "}
                  <span className="text-white font-medium">10:00 - 20:00</span>
                </p>
                <p className="text-lg text-slate-400 font-light">
                  Duminică:{" "}
                  <span className="text-red-400 font-medium">Închis</span>
                </p>
              </div>
            </div>
          </div>

          {/* Partea Dreaptă: Google Maps - FĂRĂ HOVER, colorată direct */}
          <div className="w-full h-[350px] lg:h-[450px] rounded-3xl overflow-hidden border border-white/20 relative bg-[#00102a] shadow-[0_0_20px_rgba(0,0,0,0.4)]">
            {/* O umbră interioară fină pe margini ca să o lege de design */}
            <div className="absolute inset-0 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] pointer-events-none z-10"></div>

            <iframe
              title="Locatie Cristi Barber Shop"
              // Aici pui link-ul de la Google Maps
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2711.9506081325976!2d25.78535267676378!3d47.178403617447906!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x47357989bfffffff%3A0x333b00056167179e!2sCristi%E2%80%99s%20Barbershop!5e0!3m2!1sro!2sro!4v1772525464451!5m2!1sro!2sro"
              className="w-full h-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            ></iframe>
          </div>
        </div>
      </div>

      {/* Footer / Copyright Liquid Glass Premium */}
      <div className="flex flex-col items-center justify-center pt-8 border-t border-white/10">
        <p className="text-slate-400 font-light text-center mb-4">
          © {new Date().getFullYear()} Cristi Barber Shop. All rights reserved.
        </p>

        {/* Butonul de copyright mcropdev.com */}
        <Link
          href="https://mcropdev.com"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-2 px-6 py-2.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 backdrop-blur-md transition-all duration-300"
        >
          <span className="text-sm font-light text-slate-300 group-hover:text-white transition-colors">
            Created by
          </span>
          <span className="text-sm font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-300 group-hover:shadow-cyan-400 drop-shadow-md">
            MCORPDEV
          </span>
        </Link>
      </div>
    </section>
  );
}
