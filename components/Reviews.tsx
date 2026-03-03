"use client";
import React, { useState, useEffect } from "react";

export default function Reviews() {
  const reviews = [
    {
      nume: "Andrei P.",
      text: "Cea mai rapidă modalitate să mă programez. Aplicația merge brici, la fel și băieții din salon!",
      stele: "★★★★★",
    },
    {
      nume: "Mihai C.",
      text: "Atmosferă super profi, iar faptul că văd direct pe telefon când au liber mă salvează de mult timp pierdut.",
      stele: "★★★★★",
    },
    {
      nume: "Alexandru D.",
      text: "Nu credeam că un tuns poate fi o experiență atât de relaxantă. Recomand pachetul VIP, e din altă ligă.",
      stele: "★★★★★",
    },
    {
      nume: "Cristian T.",
      text: "În sfârșit un barber shop unde stiliștii chiar ascultă ce vrei. Nota 10 pentru curățenie și profesionalism.",
      stele: "★★★★★",
    },
  ];

  const [currentIndex, setCurrentIndex] = useState(0);

  // Funcții pentru navigare
  const nextSlide = () => {
    setCurrentIndex((prev) => (prev === reviews.length - 1 ? 0 : prev + 1));
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev === 0 ? reviews.length - 1 : prev - 1));
  };

  // Auto-play la fiecare 5 secunde
  useEffect(() => {
    const timer = setInterval(() => {
      nextSlide();
    }, 5000);
    return () => clearInterval(timer); // Curățăm intervalul ca să nu avem memory leaks
  }, [currentIndex]); // Se resetează timer-ul dacă user-ul dă click manual

  return (
    <section id="recenzii" className="py-4 w-full">
      <h2 className="text-4xl md:text-5xl font-bold mb-16 text-center tracking-wide text-white">
        Ce spun clienții
      </h2>

      {/* Containerul principal al Carousel-ului */}
      <div className="w-full mx-auto px-4 sm:px-6 relative">
        {/* Fereastra prin care vedem slide-urile (overflow-hidden taie restul) */}
        <div className="overflow-hidden rounded-[2rem] bg-white/5 backdrop-blur-xl border border-white/10 relative">
          {/* Un icon uriaș de ghilimele, transparent, pus pe fundal pentru estetică */}
          <svg
            className="absolute top-4 left-6 w-24 h-24 text-white/[0.03] z-0 pointer-events-none"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
          </svg>

          {/* Banda care se mișcă stânga-dreapta */}
          <div
            className="flex transition-transform duration-700 ease-in-out relative z-10"
            style={{ transform: `translateX(-${currentIndex * 100}%)` }}
          >
            {reviews.map((review, index) => (
              <div
                key={index}
                className="w-full min-w-full flex flex-col items-center text-center p-8 md:p-14"
              >
                <div className="flex text-cyan-400 mb-6 text-2xl drop-shadow-[0_0_10px_rgba(34,211,238,0.4)]">
                  {review.stele}
                </div>
                <p className="text-xl md:text-2xl font-light text-slate-200 mb-8 leading-relaxed italic">
                  "{review.text}"
                </p>
                <span className="font-bold text-cyan-400 tracking-wider uppercase text-sm">
                  - {review.nume}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Controalele (Săgeți + Puncte) sub card */}
        <div className="flex items-center justify-center gap-6 mt-8">
          {/* Săgeată Stânga */}
          <button
            onClick={prevSlide}
            className="w-12 h-12 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 backdrop-blur-md flex items-center justify-center text-white transition-all hover:-translate-x-1"
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
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>

          {/* Punctele de navigație */}
          <div className="flex gap-3">
            {reviews.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`transition-all duration-300 rounded-full ${
                  index === currentIndex
                    ? "w-8 h-2 bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]"
                    : "w-2 h-2 bg-white/20 hover:bg-white/40"
                }`}
              />
            ))}
          </div>

          {/* Săgeată Dreapta */}
          <button
            onClick={nextSlide}
            className="w-12 h-12 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 backdrop-blur-md flex items-center justify-center text-white transition-all hover:translate-x-1"
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
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}
