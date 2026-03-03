import React from "react";

export default function Rules() {
  const reguli = [
    {
      titlu: "Anularea Programării",
      descriere:
        "Te rugăm să ne spui din timp dacă nu poți onora programarea (ideal cu 24h înainte), ca să eliberăm locul pentru alt client.",
    },
    {
      titlu: "Întârzieri",
      descriere:
        "Pentru întârzieri mai mari de 15 minute, programarea se reprogramează pentru următoarea zi sau la primul interval disponibil.",
    },
    {
      titlu: "Neprezentări",
      descriere:
        "În cazul neprezentării sau anulării în ultimul moment, ne rezervăm dreptul de a solicita un avans la următoarea programare.",
    },
  ];

  return (
    <section id="reguli" className="py-8 w-full">
      <h2 className="text-4xl md:text-5xl font-bold mb-16 text-center tracking-wide text-white">
        Regulile Casei
      </h2>

      {/* Grid cu 3 coloane pe desktop pentru a fi perfect echilibrat */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-10 max-w-7xl mx-auto">
        {reguli.map((regula, index) => (
          <div
            key={index}
            className="group relative bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-[2rem] hover:bg-white/10 transition-all duration-500 hover:-translate-y-2 flex flex-col h-full"
          >
            {/* Cercul fixat pe colț - Păstrăm tema cyan pentru unitate */}
            <div className="absolute -top-4 -left-4 w-10 h-10 rounded-full bg-[#00102a] border border-cyan-400/40 text-cyan-400 flex items-center justify-center text-sm font-bold shadow-lg group-hover:bg-cyan-400 group-hover:text-[#000428] group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(34,211,238,0.5)] transition-all duration-300 z-10">
              0{index + 1}
            </div>

            <div>
              <h3 className="text-xl md:text-2xl font-bold text-white mb-4">
                {regula.titlu}
              </h3>

              <p className="text-slate-300 text-sm md:text-base leading-relaxed font-light">
                {regula.descriere}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
