"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { saveScheduleAction } from "@/app/actions/barberScheduleActions";

type DailySchedule = { active: boolean; start: string; end: string };
type WorkingHours = Record<string, DailySchedule>;

const DEFAULT_HOURS: WorkingHours = {
  monday: { active: true, start: "09:00", end: "18:00" },
  tuesday: { active: true, start: "09:00", end: "18:00" },
  wednesday: { active: true, start: "09:00", end: "18:00" },
  thursday: { active: true, start: "09:00", end: "18:00" },
  friday: { active: true, start: "09:00", end: "18:00" },
  saturday: { active: false, start: "10:00", end: "14:00" },
  sunday: { active: false, start: "10:00", end: "14:00" },
};

const DAY_NAMES: Record<string, string> = {
  monday: "Luni",
  tuesday: "Marți",
  wednesday: "Miercuri",
  thursday: "Joi",
  friday: "Vineri",
  saturday: "Sâmbătă",
  sunday: "Duminică",
};

// Generăm intervalele de timp din 30 în 30 min (de la 06:00 la 23:00)
const generateTimeOptions = () => {
  const times = [];
  for (let h = 6; h <= 23; h++) {
    const hour = h.toString().padStart(2, "0");
    times.push(`${hour}:00`);
    times.push(`${hour}:30`);
  }
  return times;
};
const TIME_OPTIONS = generateTimeOptions();

export default function BarberSchedulePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [barberId, setBarberId] = useState<string | null>(null);

  const [workingHours, setWorkingHours] = useState<WorkingHours>(DEFAULT_HOURS);
  const [holidaysStat, setHolidaysStat] = useState(false);
  const [holidaysReligios, setHolidaysReligios] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // ================= MODAL STATE =================
  const [activeModal, setActiveModal] = useState<"none" | "alert">("none");
  const [modalConfig, setModalConfig] = useState({
    title: "",
    message: "",
    type: "info",
  }); // type: 'success' | 'error' | 'info'

  useEffect(() => {
    const fetchSchedule = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }
      setBarberId(user.id);

      const { data, error } = await supabase
        .from("barber_settings")
        .select("*")
        .eq("barber_id", user.id)
        .maybeSingle();

      if (data && !error) {
        setWorkingHours(data.working_hours);
        setHolidaysStat(data.auto_holidays_stat);
        setHolidaysReligios(data.auto_holidays_religios);
      }
      setLoading(false);
    };

    fetchSchedule();
  }, [router]);

  const showAlert = (
    title: string,
    message: string,
    type: "success" | "error" | "info" = "info",
  ) => {
    setModalConfig({ title, message, type });
    setActiveModal("alert");
  };

  const handleSave = async () => {
    if (!barberId) return;
    setIsSaving(true);

    const result = await saveScheduleAction(barberId, {
      working_hours: workingHours,
      auto_holidays_stat: holidaysStat,
      auto_holidays_religios: holidaysReligios,
    });

    setIsSaving(false);

    if (result.success) {
      showAlert(
        "Program Salvat",
        "Orele de activitate au fost actualizate. Calendarul tău este acum vizibil pentru clienți conform noilor setări.",
        "success",
      );
    } else {
      showAlert(
        "Eroare la Salvare",
        result.error || "A apărut o problemă la comunicarea cu serverul.",
        "error",
      );
    }
  };

  const updateDay = (day: string, field: keyof DailySchedule, value: any) => {
    setWorkingHours((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh]">
        <div className="w-10 h-10 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mb-4 shadow-[0_0_15px_rgba(34,211,238,0.5)]"></div>
        <p className="text-cyan-400 font-bold uppercase tracking-widest text-[10px] animate-pulse">
          Se citește calendarul...
        </p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in max-w-6xl mx-auto pb-10 relative">
      {/* HEADER SPAȚIOS */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-10">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-white mb-2 tracking-tight">
            Program de Lucru
          </h1>
          <p className="text-slate-400 text-sm font-medium">
            Configurează orele de activitate și blocajele automate din calendar.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="cursor-pointer bg-cyan-500 hover:bg-cyan-400 text-[#000428] font-black px-8 py-3.5 rounded-xl transition-all shadow-[0_0_20px_rgba(34,211,238,0.3)] hover:shadow-[0_0_30px_rgba(34,211,238,0.5)] flex items-center gap-2 hover:scale-105 disabled:opacity-50 disabled:pointer-events-none"
        >
          {isSaving ? (
            <span className="w-5 h-5 border-4 border-[#000428] border-t-transparent rounded-full animate-spin"></span>
          ) : (
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="3"
                d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
              />
            </svg>
          )}
          {isSaving ? "Se salvează..." : "Salvează Programul"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ================= COLOANA STÂNGĂ: ZILELE SĂPTĂMÂNII ================= */}
        <div className="lg:col-span-2 bg-white/5 backdrop-blur-2xl border border-white/20 rounded-[2.5rem] p-6 sm:p-8 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500/40 to-transparent"></div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-[80px] pointer-events-none"></div>

          <h3 className="text-xl font-black text-white mb-8 flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/30 text-cyan-400 shadow-inner">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            Program Săptămânal Standard
          </h3>

          <div className="space-y-4 relative z-10">
            {Object.keys(DEFAULT_HOURS).map((dayKey) => {
              const day = workingHours[dayKey];
              return (
                <div
                  key={dayKey}
                  className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 sm:px-6 sm:py-5 rounded-2xl border transition-all shadow-sm ${day.active ? "bg-white/5 border-cyan-500/30 shadow-[0_0_15px_rgba(34,211,238,0.05)]" : "bg-black/40 border-white/5 opacity-70"}`}
                >
                  {/* Switch + Nume Zi */}
                  <div className="flex items-center gap-4 mb-4 sm:mb-0">
                    <button
                      onClick={() => updateDay(dayKey, "active", !day.active)}
                      className={`relative w-14 h-7 rounded-full transition-colors cursor-pointer shadow-inner ${day.active ? "bg-cyan-500" : "bg-slate-700"}`}
                    >
                      <span
                        className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform shadow-md ${day.active ? "translate-x-7" : "translate-x-0"}`}
                      ></span>
                    </button>
                    <span
                      className={`font-black uppercase tracking-widest text-sm w-28 ${day.active ? "text-cyan-400" : "text-slate-500"}`}
                    >
                      {DAY_NAMES[dayKey]}
                    </span>
                  </div>

                  {/* Dropdown-uri de Timp */}
                  {day.active ? (
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <div className="relative flex-1 sm:flex-none">
                        <select
                          value={day.start}
                          onChange={(e) =>
                            updateDay(dayKey, "start", e.target.value)
                          }
                          className="w-full sm:w-auto bg-black/60 border border-cyan-500/20 rounded-xl pl-4 pr-10 py-3 text-cyan-400 font-mono font-bold text-sm outline-none focus:border-cyan-400 cursor-pointer appearance-none transition-all shadow-inner"
                        >
                          {TIME_OPTIONS.map((t) => (
                            <option
                              key={`start-${t}`}
                              value={t}
                              className="bg-[#050505]"
                            >
                              {t}
                            </option>
                          ))}
                        </select>
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-cyan-500/50 pointer-events-none text-xs">
                          ▼
                        </span>
                      </div>

                      <span className="text-slate-500 font-black px-1">-</span>

                      <div className="relative flex-1 sm:flex-none">
                        <select
                          value={day.end}
                          onChange={(e) =>
                            updateDay(dayKey, "end", e.target.value)
                          }
                          className="w-full sm:w-auto bg-black/60 border border-cyan-500/20 rounded-xl pl-4 pr-10 py-3 text-cyan-400 font-mono font-bold text-sm outline-none focus:border-cyan-400 cursor-pointer appearance-none transition-all shadow-inner"
                        >
                          {TIME_OPTIONS.map((t) => (
                            <option
                              key={`end-${t}`}
                              value={t}
                              className="bg-[#050505]"
                            >
                              {t}
                            </option>
                          ))}
                        </select>
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-cyan-500/50 pointer-events-none text-xs">
                          ▼
                        </span>
                      </div>
                    </div>
                  ) : (
                    <span className="text-slate-500 text-xs font-bold uppercase tracking-widest sm:pr-[4.5rem] bg-white/5 px-4 py-2 rounded-lg">
                      Închis / Liber
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ================= COLOANA DREAPTĂ: REGULI AUTOMATE ================= */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="bg-white/5 backdrop-blur-2xl border border-white/20 rounded-[2.5rem] p-6 sm:p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500/40 to-transparent"></div>

            <h3 className="text-xl font-black text-white mb-2 flex items-center gap-3 relative z-10">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/30 text-purple-400 shadow-inner">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.5"
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              Zile Libere Legale
            </h3>
            <p className="text-xs text-slate-400 mb-6 font-medium leading-relaxed relative z-10">
              Bifează opțiunile pentru a bloca automat calendarul în aceste
              zile.
            </p>

            <div className="space-y-5 relative z-10">
              {/* Zile Libere Fixe (Stat) */}
              <div
                onClick={() => setHolidaysStat(!holidaysStat)}
                className={`cursor-pointer p-5 rounded-[1.5rem] border transition-all relative overflow-hidden group shadow-inner ${holidaysStat ? "bg-cyan-500/10 border-cyan-500/40 shadow-[0_0_20px_rgba(34,211,238,0.15)]" : "bg-black/40 border-white/10 hover:border-white/20"}`}
              >
                {holidaysStat && (
                  <div className="absolute -right-4 -top-4 w-24 h-24 bg-cyan-500/20 rounded-full blur-[30px] pointer-events-none"></div>
                )}

                <div className="flex items-center justify-between mb-4 relative z-10">
                  <span
                    className={`font-black text-sm uppercase tracking-wider ${holidaysStat ? "text-cyan-400" : "text-slate-400"}`}
                  >
                    Fixe (Stat)
                  </span>
                  <div
                    className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-colors shadow-inner ${holidaysStat ? "bg-cyan-500 border-cyan-400" : "border-slate-600 bg-black/50"}`}
                  >
                    {holidaysStat && (
                      <svg
                        className="w-5 h-5 text-[#000428]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="3"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </div>
                </div>
                <div className="text-xs text-slate-400 relative z-10 leading-relaxed space-y-1.5 font-medium">
                  <p>
                    1, 2 Ian <span className="text-slate-500">(Anul Nou)</span>
                  </p>
                  <p>
                    6, 7 Ian{" "}
                    <span className="text-slate-500">
                      (Bobotează, Sf. Ioan)
                    </span>
                  </p>
                  <p>
                    24 Ian{" "}
                    <span className="text-slate-500">
                      (Unirea Principatelor)
                    </span>
                  </p>
                  <p>
                    1 Mai <span className="text-slate-500">(Ziua Muncii)</span>
                  </p>
                  <p>
                    1 Iun{" "}
                    <span className="text-slate-500">(Ziua Copilului)</span>
                  </p>
                  <p>
                    15 Aug <span className="text-slate-500">(Sf. Maria)</span>
                  </p>
                  <p>
                    30 Nov, 1 Dec{" "}
                    <span className="text-slate-500">
                      (Sf. Andrei, Ziua Națională)
                    </span>
                  </p>
                  <p>
                    25, 26 Dec{" "}
                    <span className="text-slate-500">(Crăciunul)</span>
                  </p>
                </div>
              </div>

              {/* Sărbători Religioase Mobile */}
              <div
                onClick={() => setHolidaysReligios(!holidaysReligios)}
                className={`cursor-pointer p-5 rounded-[1.5rem] border transition-all relative overflow-hidden group shadow-inner ${holidaysReligios ? "bg-purple-500/10 border-purple-500/40 shadow-[0_0_20px_rgba(168,85,247,0.15)]" : "bg-black/40 border-white/10 hover:border-white/20"}`}
              >
                {holidaysReligios && (
                  <div className="absolute -right-4 -top-4 w-24 h-24 bg-purple-500/20 rounded-full blur-[30px] pointer-events-none"></div>
                )}

                <div className="flex items-center justify-between mb-4 relative z-10">
                  <span
                    className={`font-black text-sm uppercase tracking-wider ${holidaysReligios ? "text-purple-400" : "text-slate-400"}`}
                  >
                    Sărbători Mobile
                  </span>
                  <div
                    className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-colors shadow-inner ${holidaysReligios ? "bg-purple-500 border-purple-400" : "border-slate-600 bg-black/50"}`}
                  >
                    {holidaysReligios && (
                      <svg
                        className="w-5 h-5 text-[#000428]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="3"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </div>
                </div>
                <div className="text-xs text-slate-400 relative z-10 leading-relaxed space-y-1.5 font-medium">
                  <p>Vinerea Mare</p>
                  <p>
                    Paștele{" "}
                    <span className="text-slate-500">(Duminică + Luni)</span>
                  </p>
                  <p>
                    Rusaliile{" "}
                    <span className="text-slate-500">(Duminică + Luni)</span>
                  </p>
                  <p className="text-purple-400/80 italic mt-3 text-[10px] font-bold uppercase tracking-widest">
                    *Sistemul calculează datele automat în fiecare an.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-black/40 border border-white/10 rounded-[2rem] p-6 text-center shadow-inner relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-white/10"></div>
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4 text-slate-400 shadow-inner">
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
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <p className="text-slate-400 text-xs font-medium leading-relaxed">
              Pentru concedii personale sau alte zile libere excepționale, vei
              putea bloca zilele manual, direct din panoul principal de control.
            </p>
          </div>
        </div>
      </div>

      {/* ================= MODAL ALERTĂ ================= */}
      {activeModal === "alert" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div
            className={`w-full max-w-sm bg-[#050505]/95 backdrop-blur-2xl border p-8 rounded-[2rem] shadow-2xl relative overflow-hidden ${modalConfig.type === "error" ? "border-red-500/30" : modalConfig.type === "success" ? "border-green-500/30" : "border-cyan-500/30"}`}
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-white/10"></div>

            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 border-4 shadow-inner relative z-10 ${modalConfig.type === "error" ? "bg-red-500/10 border-red-500/20 text-red-400" : modalConfig.type === "success" ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-cyan-500/10 border-cyan-500/20 text-cyan-400"}`}
            >
              {modalConfig.type === "error" && (
                <svg
                  className="w-8 h-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.5"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              )}
              {modalConfig.type === "success" && (
                <svg
                  className="w-8 h-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.5"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
              {modalConfig.type === "info" && (
                <svg
                  className="w-8 h-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.5"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              )}
            </div>

            <h2 className="text-xl font-black text-white mb-2 text-center tracking-tight relative z-10">
              {modalConfig.title}
            </h2>
            <p className="text-slate-300 text-sm mb-8 text-center font-medium leading-relaxed relative z-10">
              {modalConfig.message}
            </p>

            <button
              onClick={() => setActiveModal("none")}
              className={`w-full py-3.5 rounded-xl font-black transition-all cursor-pointer shadow-lg relative z-10 text-[#0a0a0a] ${modalConfig.type === "error" ? "bg-red-500 hover:bg-red-400" : modalConfig.type === "success" ? "bg-green-500 hover:bg-green-400" : "bg-cyan-500 hover:bg-cyan-400"}`}
            >
              Am înțeles
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
