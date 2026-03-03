import React from "react";

export default function MainContainer({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Noul tău background gradient aplicat pe tot ecranul
    <div className="min-h-screen bg-[linear-gradient(to_top,#004e92,#000428)] text-slate-100 font-sans selection:bg-cyan-500 selection:text-white">
      {/* Container invizibil, doar pentru a centra și a da aer (padding) stânga-dreapta */}
      <div className="max-w-[1400px] mx-auto flex flex-col px-4 sm:px-6 md:px-10">
        {children}
      </div>
    </div>
  );
}
