import React from "react";

export default function MainContainer({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#000428] text-slate-100 font-sans selection:bg-cyan-500/30 selection:text-cyan-100 relative overflow-hidden">
      {/* Lumini Ambientale Premium (Fixed în fundal) */}
      <div className="fixed top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-cyan-500/10 rounded-full blur-[150px] pointer-events-none"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-blue-600/10 rounded-full blur-[150px] pointer-events-none"></div>

      <div className="max-w-[1400px] mx-auto flex flex-col px-4 sm:px-6 md:px-10 relative z-10">
        {children}
      </div>
    </div>
  );
}
