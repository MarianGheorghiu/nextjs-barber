export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-[#000428] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Lumini Ambientale */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-cyan-500"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-[600px] h-[90vw] max-h-[600px] bg-cyan-500/20 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="bg-white/5 backdrop-blur-2xl border border-white/20 p-10 sm:p-16 rounded-[3rem] shadow-2xl relative z-10 text-center max-w-lg w-full animate-fade-in">
        <div className="w-24 h-24 bg-cyan-500/10 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-cyan-500/30 text-5xl shadow-inner animate-pulse">
          🔒
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-white mb-4 tracking-tight">
          Mentenanță
        </h1>
        <p className="text-slate-300 text-lg font-medium leading-relaxed mb-8">
          Platforma este momentan oprită pentru actualizări și teste private. Te
          rugăm să revii mai târziu!
        </p>

        <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/5 border border-white/10 text-slate-400 text-sm font-bold shadow-inner">
          <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
          Sistem Offline
        </div>
      </div>
    </div>
  );
}
