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

  const handleSave = async () => {
    if (!barberId) return;

    const result = await saveScheduleAction(barberId, {
      working_hours: workingHours,
      auto_holidays_stat: holidaysStat,
      auto_holidays_religios: holidaysReligios,
    });

    if (result.success) {
      alert(
        "Programul a fost salvat cu succes! Calendarul este acum actualizat.",
      );
    } else {
      alert("Eroare la salvare: " + result.error);
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
        <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-cyan-400 font-medium animate-pulse">
          Se configurează calendarul...
        </p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in max-w-6xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Program de Lucru
          </h1>
          <p className="text-slate-400">
            Configurează orele de activitate și blocajele automate.
          </p>
        </div>
        <button
          onClick={handleSave}
          className="bg-cyan-500 hover:bg-cyan-400 text-[#000428] font-bold px-8 py-3 rounded-xl transition-all shadow-[0_0_20px_rgba(34,211,238,0.2)] flex items-center gap-2"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
            />
          </svg>
          Salvează Programul
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Coloana Stângă: Zilele Săptămânii */}
        <div className="lg:col-span-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 sm:p-8">
          <h3 className="text-xl font-bold text-white mb-6">
            Program Săptămânal Standard
          </h3>

          <div className="space-y-4">
            {Object.keys(DEFAULT_HOURS).map((dayKey) => {
              const day = workingHours[dayKey];
              return (
                <div
                  key={dayKey}
                  className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-2xl border transition-all ${day.active ? "bg-white/5 border-cyan-500/30 shadow-[0_0_15px_rgba(34,211,238,0.05)]" : "bg-black/20 border-white/5 opacity-60"}`}
                >
                  {/* Switch + Nume Zi */}
                  <div className="flex items-center gap-4 mb-4 sm:mb-0">
                    <button
                      onClick={() => updateDay(dayKey, "active", !day.active)}
                      className={`relative w-14 h-7 rounded-full transition-colors ${day.active ? "bg-cyan-500" : "bg-slate-700"}`}
                    >
                      <span
                        className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${day.active ? "translate-x-7" : "translate-x-0"}`}
                      ></span>
                    </button>
                    <span
                      className={`font-bold w-24 ${day.active ? "text-white" : "text-slate-500"}`}
                    >
                      {DAY_NAMES[dayKey]}
                    </span>
                  </div>

                  {/* Dropdown-uri de Timp (Mai ușor de folosit) */}
                  {day.active ? (
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <select
                        value={day.start}
                        onChange={(e) =>
                          updateDay(dayKey, "start", e.target.value)
                        }
                        className="bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white font-mono text-sm outline-none focus:border-cyan-400 cursor-pointer appearance-none hover:bg-black/60 transition-colors"
                      >
                        {TIME_OPTIONS.map((t) => (
                          <option key={`start-${t}`} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                      <span className="text-slate-500 font-bold px-1">-</span>
                      <select
                        value={day.end}
                        onChange={(e) =>
                          updateDay(dayKey, "end", e.target.value)
                        }
                        className="bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white font-mono text-sm outline-none focus:border-cyan-400 cursor-pointer appearance-none hover:bg-black/60 transition-colors"
                      >
                        {TIME_OPTIONS.map((t) => (
                          <option key={`end-${t}`} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <span className="text-slate-500 text-sm font-medium italic sm:pr-[4.5rem]">
                      Închis / Liber
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Coloana Dreaptă: Reguli Automate (Sărbători) */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 sm:p-8">
            <h3 className="text-xl font-bold text-white mb-2">
              Zile Libere Legale
            </h3>
            <p className="text-sm text-slate-400 mb-6">
              Bifează pentru a bloca automat calendarul în aceste zile.
            </p>

            <div className="space-y-4">
              {/* Zile Libere Fixe (Stat) */}
              <div
                onClick={() => setHolidaysStat(!holidaysStat)}
                className={`cursor-pointer p-5 rounded-2xl border transition-all relative overflow-hidden group ${holidaysStat ? "bg-cyan-500/10 border-cyan-500/50 shadow-[0_0_15px_rgba(34,211,238,0.1)]" : "bg-black/20 border-white/5 hover:border-white/20"}`}
              >
                {holidaysStat && (
                  <div className="absolute -right-4 -top-4 w-16 h-16 bg-cyan-500/20 rounded-full blur-xl"></div>
                )}
                <div className="flex items-center justify-between mb-3 relative z-10">
                  <span
                    className={`font-bold ${holidaysStat ? "text-cyan-400" : "text-slate-300"}`}
                  >
                    Zile Libere Fixe (Stat)
                  </span>
                  <div
                    className={`w-6 h-6 rounded-md border flex items-center justify-center transition-colors ${holidaysStat ? "bg-cyan-500 border-cyan-400" : "border-slate-600"}`}
                  >
                    {holidaysStat && (
                      <svg
                        className="w-4 h-4 text-[#000428]"
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
                <div className="text-xs text-slate-400 relative z-10 leading-relaxed space-y-1">
                  <p>1, 2 Ian (Anul Nou)</p>
                  <p>6, 7 Ian (Bobotează, Sf. Ioan)</p>
                  <p>24 Ian (Unirea Principatelor)</p>
                  <p>1 Mai (Ziua Muncii)</p>
                  <p>1 Iun (Ziua Copilului)</p>
                  <p>15 Aug (Adormirea Maicii Domnului)</p>
                  <p>30 Nov, 1 Dec (Sf. Andrei, Ziua Națională)</p>
                  <p>25, 26 Dec (Crăciunul)</p>
                </div>
              </div>

              {/* Sărbători Religioase Mobile */}
              <div
                onClick={() => setHolidaysReligios(!holidaysReligios)}
                className={`cursor-pointer p-5 rounded-2xl border transition-all relative overflow-hidden group ${holidaysReligios ? "bg-purple-500/10 border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.1)]" : "bg-black/20 border-white/5 hover:border-white/20"}`}
              >
                {holidaysReligios && (
                  <div className="absolute -right-4 -top-4 w-16 h-16 bg-purple-500/20 rounded-full blur-xl"></div>
                )}
                <div className="flex items-center justify-between mb-3 relative z-10">
                  <span
                    className={`font-bold ${holidaysReligios ? "text-purple-400" : "text-slate-300"}`}
                  >
                    Sărbători Mobile
                  </span>
                  <div
                    className={`w-6 h-6 rounded-md border flex items-center justify-center transition-colors ${holidaysReligios ? "bg-purple-500 border-purple-400" : "border-slate-600"}`}
                  >
                    {holidaysReligios && (
                      <svg
                        className="w-4 h-4 text-[#000428]"
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
                <div className="text-xs text-slate-400 relative z-10 leading-relaxed space-y-1">
                  <p>Vinerea Mare</p>
                  <p>Paștele (Duminică + Luni)</p>
                  <p>Rusaliile (Duminică + Luni)</p>
                  <p className="text-purple-400/70 italic mt-2">
                    *Sistemul calculează automat datele în funcție de an.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-black/20 border border-white/5 rounded-[2rem] p-6 text-center">
            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3 text-slate-400">
              <svg
                className="w-5 h-5"
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
            <p className="text-slate-400 text-sm">
              Pentru concedii personale sau alte zile libere excepționale, vei
              putea bloca zilele direct din calendarul tău lunar.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
