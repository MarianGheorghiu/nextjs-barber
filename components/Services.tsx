import React from "react";

export default function Services() {
  const servicii = [
    {
      titlu: "Tuns Clasic",
      pret: "50 RON",
      descriere: "Tuns din foarfecă și mașină, spălat și aranjat în detaliu.",
    },
    {
      titlu: "Skin Fade",
      pret: "60 RON",
      descriere: "Pierdut la zero cu shaver-ul, contur precis și texturare.",
    },
    {
      titlu: "Tuns + Barbă",
      pret: "80 RON",
      descriere:
        "Pachetul complet pentru un aspect impecabil, incluzând contur barbă și prosop cald.",
    },
    {
      titlu: "Tuns Copii",
      pret: "40 RON",
      descriere:
        "Tuns modern adaptat pentru cei mici, realizat cu multă răbdare și atenție (sub 12 ani).",
    },
    {
      titlu: "Aranjat Barbă",
      pret: "35 RON",
      descriere:
        "Contur precis la brici, tuns la formă și hidratare cu uleiuri premium și prosop cald.",
    },
    {
      titlu: "Pachet VIP",
      pret: "120 RON",
      descriere:
        "Tuns, barbă, spălat, masaj capilar, black mask, ceară și tratament facial complet.",
    },
  ];

  return (
    <section id="servicii" className="py-14 w-full">
      <h2 className="text-4xl md:text-5xl font-bold mb-12 text-center tracking-wide text-white">
        Serviciile Noastre
      </h2>

      {/* Am redus gap-ul pentru un aspect mai unitar */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 mt-8">
        {servicii.map((serviciu, index) => (
          <div
            key={index}
            // Am redus padding-ul (p-6 md:p-8) și am pus flex-col h-full
            className="group relative bg-white/5 backdrop-blur-xl border border-white/10 p-6 md:p-8 rounded-[2rem] hover:bg-white/10 transition-all duration-500 hover:-translate-y-2 flex flex-col h-full"
          >
            {/* Cercul MIC rămas pe poziție */}
            <div className="absolute -top-4 -left-4 w-10 h-10 rounded-full bg-[#00102a] border border-cyan-400/40 text-cyan-400 flex items-center justify-center text-sm font-bold shadow-lg group-hover:bg-cyan-400 group-hover:text-[#000428] group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(34,211,238,0.5)] transition-all duration-300 z-10">
              0{index + 1}
            </div>

            {/* Containerul pentru Titlu și Descriere */}
            <div>
              <h3 className="text-xl md:text-2xl font-bold text-white mb-3">
                {serviciu.titlu}
              </h3>

              {/* Am scos min-h-[4rem] ca să nu lase spațiu gol inutil */}
              <p className="text-slate-300 text-sm md:text-base leading-relaxed font-light">
                {serviciu.descriere}
              </p>
            </div>

            {/* Containerul pentru preț, lipit de partea de jos automat doar dacă e nevoie (mt-auto) */}
            <div className="mt-auto pt-6">
              <div className="w-full h-px bg-white/10 mb-4 group-hover:bg-cyan-500/50 transition-colors duration-500"></div>

              <div className="flex items-center justify-center relative w-full">
                <span className="text-2xl md:text-3xl font-light text-cyan-400 tracking-wide text-center">
                  {serviciu.pret}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
