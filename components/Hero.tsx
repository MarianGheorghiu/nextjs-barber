import Image from "next/image";
import Link from "next/link";

export default function Hero() {
  return (
    <section
      id="acasa"
      className="w-full pt-8 pb-16 md:pt-12 md:pb-24 lg:pt-16 lg:pb-32 flex items-center min-h-[80vh] relative z-10"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center w-full">
        {/* Coloana Stângă: Text & Buton */}
        <div className="flex flex-col items-center lg:items-start text-center lg:text-left order-2 lg:order-1">
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight mb-8 text-white leading-[1.1]">
            Măiestrie la <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 inline-block pb-2">
              Fiecare Tăietură
            </span>
          </h1>

          <p className="text-lg md:text-2xl text-slate-300 mb-12 font-medium leading-relaxed max-w-2xl">
            Programează-te rapid direct de pe telefon. Fără sunat, fără
            așteptare. Alegi serviciul, frizerul și ora care ți se potrivește
            perfect.
          </p>

          <Link
            href="/register"
            className="px-12 py-5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-[#000428] font-black text-xl transition-all hover:scale-105 shadow-[0_0_30px_rgba(34,211,238,0.4)] hover:shadow-[0_0_50px_rgba(34,211,238,0.6)] flex items-center gap-3"
          >
            Fă o programare{" "}
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="3"
                d="M14 5l7 7m0 0l-7 7m7-7H3"
              />
            </svg>
          </Link>
        </div>

        {/* Coloana Dreaptă: Imagine Liquid Glass */}
        <div className="w-full flex justify-center lg:justify-end order-1 lg:order-2 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-cyan-500/20 rounded-full blur-[80px] pointer-events-none"></div>

          <div className="relative w-full max-w-lg aspect-square md:aspect-[4/5] lg:aspect-square bg-white/5 backdrop-blur-2xl border border-white/20 rounded-[3rem] shadow-2xl overflow-hidden flex items-center justify-center group transition-transform hover:-translate-y-2 duration-500">
            <div className="absolute inset-0 bg-gradient-to-t from-[#000428]/80 to-transparent z-10 pointer-events-none"></div>
            <Image
              src="/hero.jpg"
              alt="Barber"
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-700"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              priority
            />
          </div>
        </div>
      </div>
    </section>
  );
}
