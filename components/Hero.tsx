import Image from "next/image";
import Link from "next/link";

export default function Hero() {
  return (
    // Am lăsat distanța mai mică sus, exact cum ai cerut
    <section
      id="acasa"
      className="w-full pt-4 pb-16 md:pt-8 md:pb-24 lg:pt-12 lg:pb-32 flex items-center min-h-[75vh]"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center w-full">
        {/* Coloana Stângă: Text & Buton */}
        <div className="flex flex-col items-center lg:items-start text-center lg:text-left order-2 lg:order-1">
          {/* Am relaxat leading-ul și am dat spațiu gradientului ca să nu mai ia crop */}
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight mb-6 drop-shadow-2xl text-white leading-[1.1]">
            Măiestrie la <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-300 inline-block py-2">
              Fiecare Tăietură
            </span>
          </h1>

          <p className="text-lg md:text-2xl text-slate-300 mb-10 md:mb-12 font-light leading-relaxed max-w-2xl">
            Programează-te rapid direct de pe telefon. Fără sunat, fără
            așteptare. Alegi serviciul, frizerul și ora care ți se potrivește.
          </p>

          <Link
            href="/register"
            className="px-10 py-5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-[#000428] font-extrabold text-xl transition-all hover:scale-105 shadow-[0_0_30px_rgba(34,211,238,0.3)] hover:shadow-[0_0_50px_rgba(34,211,238,0.5)]"
          >
            Fă o programare
          </Link>
        </div>

        {/* Coloana Dreaptă: Placeholder pentru Imagine (Liquid Glass) */}
        <div className="w-full flex justify-center lg:justify-end order-1 lg:order-2">
          {/* Cadrul de sticlă pentru imagine */}
          <div
            className="relative w-full max-w-md aspect-square md:aspect-[4/5] lg:aspect-square 
                          bg-white/5 backdrop-blur-md border border-white/10 
                          rounded-[2.5rem] shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] 
                          overflow-hidden flex items-center justify-center group transition-transform hover:-translate-y-2 duration-500"
          >
            <Image
              src="/hero.jpg"
              alt="Barber"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              priority
            />
          </div>
        </div>
      </div>
    </section>
  );
}
