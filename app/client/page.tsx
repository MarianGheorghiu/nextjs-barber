"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import {
  getAvailableBarbersAction,
  getBarberDetailsAction,
  createClientAppointmentAction,
  getClientActiveAppointmentAction,
  getBookedSlotsAction,
  cancelClientAppointmentAction,
  acceptClientRescheduleAction,
} from "@/app/actions/bookingActions";

const generateTimeSlots = () => {
  const times = [];
  for (let h = 9; h <= 20; h++) {
    const hour = h.toString().padStart(2, "0");
    times.push(`${hour}:00`);
    times.push(`${hour}:30`);
  }
  return times;
};
const TIME_SLOTS = generateTimeSlots();

export default function ClientDashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);

  // Date Client Logat
  const [clientId, setClientId] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);

  // Stare Programare Activă
  const [activeAppointment, setActiveAppointment] = useState<any>(null);

  // Step 1: Frizeri
  const [barbers, setBarbers] = useState<any[]>([]);
  const [selectedBarber, setSelectedBarber] = useState<any>(null);

  // Step 2 & 3: Date Frizer & Ore
  const [services, setServices] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);

  // Selecțiile utilizatorului
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [selectedService, setSelectedService] = useState<any>(null);

  // Calendar State
  const [calendarViewDate, setCalendarViewDate] = useState(new Date());

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    initPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initPage = async () => {
    setLoading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("first_name, last_name, phone, favorite_barbers")
      .eq("id", user.id)
      .single();

    if (profile) {
      setClientId(user.id);
      setClientName(`${profile.first_name} ${profile.last_name}`);
      setClientPhone(profile.phone || "");
      setFavorites(profile.favorite_barbers || []);
    }

    const activeResult = await getClientActiveAppointmentAction(user.id);
    if (activeResult.success && activeResult.appointment) {
      setActiveAppointment(activeResult.appointment);
      setLoading(false);
      return;
    }

    const result = await getAvailableBarbersAction();
    if (result.success && result.barbers) {
      setBarbers(result.barbers);
    }
    // MAGIC JUMP TO STEP 2
    const preselectedBarberId = searchParams.get("barberId");
    if (preselectedBarberId && result.barbers) {
      const foundBarber = result.barbers.find(
        (b) => b.id === preselectedBarberId,
      );
      if (foundBarber) {
        // Îl selectăm automat și tragem detaliile
        setSelectedBarber(foundBarber);
        const details = await getBarberDetailsAction(foundBarber.id);
        if (details.success) {
          setServices(details.services);
          setSettings(details.settings);
          setStep(2); // Sărim direct la pasul de servicii!
        }
      }
    }

    setLoading(false);
  };

  const toggleFavorite = async (e: React.MouseEvent, barberId: string) => {
    e.stopPropagation();
    const isFav = favorites.includes(barberId);
    let newFavorites = [];

    if (isFav) {
      newFavorites = favorites.filter((id) => id !== barberId);
    } else {
      newFavorites = [...favorites, barberId];
    }

    setFavorites(newFavorites);
    const supabase = createClient();
    await supabase
      .from("profiles")
      .update({ favorite_barbers: newFavorites })
      .eq("id", clientId);
  };

  const handleSelectBarber = async (barber: any) => {
    setSelectedBarber(barber);
    setLoading(true);
    const result = await getBarberDetailsAction(barber.id);
    if (result.success) {
      setServices(result.services);
      setSettings(result.settings);
      setStep(2);
    }
    setLoading(false);
  };

  const handleDateSelect = async (date: string) => {
    setSelectedDate(date);
    setSelectedTime("");
    const result = await getBookedSlotsAction(selectedBarber.id, date);
    if (result.success) {
      setBookedSlots(result.bookedTimes || []);
    }
  };

  const handleBookAppointment = async () => {
    if (!selectedBarber || !selectedDate || !selectedTime || !selectedService)
      return;

    setIsSubmitting(true);
    const result = await createClientAppointmentAction({
      barberId: selectedBarber.id,
      clientId: clientId,
      clientName: clientName,
      clientPhone: clientPhone,
      serviceName: selectedService.name,
      price: selectedService.price,
      date: selectedDate,
      time: selectedTime,
    });

    if (result.success) {
      await initPage();
    } else {
      alert("Eroare la programare: " + result.error);
    }
    setIsSubmitting(false);
  };

  const handleCancelAppointment = async () => {
    if (
      window.confirm(
        "Ești sigur că vrei să anulezi programarea? Locul tău va fi eliberat imediat.",
      )
    ) {
      setLoading(true);
      const result = await cancelClientAppointmentAction(activeAppointment.id);
      if (result.success) {
        setActiveAppointment(null);
        await initPage();
      }
    }
  };

  const handleAcceptReschedule = async () => {
    setLoading(true);
    const result = await acceptClientRescheduleAction(
      activeAppointment.id,
      activeAppointment.barber_id,
      activeAppointment.client_name,
      activeAppointment.client_phone,
    );
    if (result.success) {
      await initPage();
    } else {
      alert("A apărut o eroare la confirmare.");
      setLoading(false);
    }
  };

  // Generare Calendar Logică
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const viewYear = calendarViewDate.getFullYear();
  const viewMonth = calendarViewDate.getMonth();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();
  const startDay = firstDayIndex === 0 ? 6 : firstDayIndex - 1;
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanksArray = Array.from({ length: startDay }, (_, i) => i);
  const monthNames = [
    "Ianuarie",
    "Februarie",
    "Martie",
    "Aprilie",
    "Mai",
    "Iunie",
    "Iulie",
    "August",
    "Septembrie",
    "Octombrie",
    "Noiembrie",
    "Decembrie",
  ];

  if (loading)
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );

  // =========================================================================
  // ECRANUL 1: PROGRAMARE ACTIVĂ SAU REPROGRAMATĂ
  // =========================================================================
  if (activeAppointment) {
    const isPending = activeAppointment.status === "pending";
    const isConfirmed = activeAppointment.status === "confirmed";
    const isRescheduled = activeAppointment.status === "rescheduled";

    const barberName =
      activeAppointment.profiles?.barbershop_name ||
      activeAppointment.profiles?.first_name ||
      "Frizerie";
    const appDate = new Date(
      activeAppointment.appointment_date,
    ).toLocaleDateString("ro-RO", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });

    return (
      <div className="animate-fade-in max-w-3xl mx-auto pt-10">
        <h1 className="text-3xl font-bold text-white mb-8 text-center sm:text-left">
          Programarea Ta
        </h1>

        {isRescheduled && (
          <div className="mb-6 bg-orange-500/10 border border-orange-500/30 p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-bounce-subtle">
            <div>
              <p className="text-orange-400 font-bold text-lg mb-1">
                ⚠️ Frizerul a propus o nouă oră!
              </p>
              <p className="text-sm text-orange-400/80">
                Ești de acord cu noua dată/oră de mai jos?
              </p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={handleAcceptReschedule}
                className="cursor-pointer flex-1 sm:flex-none bg-orange-500 hover:bg-orange-400 text-white font-bold px-6 py-3 rounded-xl transition-all shadow-[0_0_15px_rgba(249,115,22,0.3)]"
              >
                ✓ Accept
              </button>
              <button
                onClick={handleCancelAppointment}
                className="cursor-pointer flex-1 sm:flex-none bg-white/5 hover:bg-red-500/20 text-slate-300 hover:text-red-400 font-bold px-6 py-3 rounded-xl transition-all border border-transparent hover:border-red-500/30"
              >
                ✕ Refuz
              </button>
            </div>
          </div>
        )}

        <div
          className={`bg-gradient-to-br from-white/10 to-transparent border p-8 relative overflow-hidden shadow-2xl rounded-[2.5rem] ${isRescheduled ? "border-orange-500/50 shadow-[0_0_30px_rgba(249,115,22,0.1)]" : "border-white/10"}`}
        >
          <div
            className={`absolute top-0 right-0 w-64 h-64 rounded-full blur-[80px] ${isRescheduled ? "bg-orange-500/20" : "bg-cyan-500/10"}`}
          ></div>

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8 border-b border-white/10 pb-8">
            <div>
              <p className="text-sm text-slate-400 uppercase tracking-widest font-bold mb-1">
                Locație
              </p>
              <p className="text-2xl font-black text-white">{barberName}</p>
            </div>

            <div
              className={`px-4 py-2 rounded-xl flex items-center gap-2 font-bold ${
                isPending
                  ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                  : isRescheduled
                    ? "bg-orange-500/10 text-orange-400 border border-orange-500/20"
                    : "bg-green-500/10 text-green-400 border border-green-500/20"
              }`}
            >
              {isPending && (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 animate-pulse"></span>{" "}
                  În așteptare...
                </>
              )}
              {isRescheduled && (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-400 animate-pulse"></span>{" "}
                  Necesită Confirmare
                </>
              )}
              {isConfirmed && (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.8)]"></span>{" "}
                  Confirmat
                </>
              )}
            </div>
          </div>

          <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-8 mb-8">
            <div>
              <p className="text-sm text-slate-400 uppercase tracking-widest font-bold mb-1">
                Data & Ora
              </p>
              <p
                className={`text-xl font-bold capitalize ${isRescheduled ? "text-orange-400" : "text-white"}`}
              >
                {appDate}
              </p>
              <p
                className={`font-mono font-black text-2xl mt-1 ${isRescheduled ? "text-orange-400" : "text-cyan-400"}`}
              >
                {activeAppointment.appointment_time.slice(0, 5)}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-400 uppercase tracking-widest font-bold mb-1">
                Serviciu Ales
              </p>
              <p className="text-xl font-bold text-white">
                {activeAppointment.service_name}
              </p>
              <p className="text-slate-300 font-bold mt-2">
                Plată la locație:{" "}
                <span className="text-cyan-400">
                  {activeAppointment.price} RON
                </span>
              </p>
            </div>
          </div>

          <div className="relative z-10 pt-6 border-t border-white/10 flex justify-end">
            <button
              onClick={handleCancelAppointment}
              className="cursor-pointer bg-white/5 hover:bg-red-500/10 text-slate-300 hover:text-red-400 border border-transparent hover:border-red-500/30 font-bold px-6 py-3 rounded-xl transition-all flex items-center gap-2"
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              Anulează Programarea
            </button>
          </div>
        </div>

        {isPending && (
          <p className="text-center text-sm text-slate-500 mt-6 animate-pulse">
            Frizerul va primi o notificare și va confirma în scurt timp.
          </p>
        )}
      </div>
    );
  }

  // =========================================================================
  // ECRANUL 2: FLUXUL DE REZERVARE (PREMIUM UI)
  // =========================================================================
  return (
    <div className="animate-fade-in max-w-4xl mx-auto pb-10">
      <div className="mb-10 text-center sm:text-left">
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
          Programează-te
        </h1>
        <p className="text-slate-400">
          Urmează pașii pentru a-ți rezerva locul.
        </p>

        <div className="flex items-center justify-center sm:justify-start gap-2 mt-6">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`h-2 rounded-full flex-1 max-w-[80px] transition-colors ${step >= i ? "bg-cyan-500 shadow-[0_0_10px_rgba(34,211,238,0.5)]" : "bg-white/10"}`}
            ></div>
          ))}
        </div>
      </div>

      {/* STEP 1: Selectare Frizerie */}
      {step === 1 && (
        <div className="animate-fade-in">
          <h2 className="text-xl font-bold text-white mb-6">
            1. Alege Frizeria
          </h2>
          {barbers.length === 0 ? (
            <p className="text-slate-400 italic">
              Nu a fost găsit niciun frizer disponibil.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {barbers.map((barber) => {
                const isFav = favorites.includes(barber.id);
                return (
                  <div
                    key={barber.id}
                    onClick={() => handleSelectBarber(barber)}
                    className="cursor-pointer bg-gradient-to-br from-white/5 to-transparent border border-white/10 hover:border-cyan-500/50 p-6 rounded-[2rem] transition-all group relative overflow-hidden shadow-lg hover:shadow-[0_0_30px_rgba(34,211,238,0.1)]"
                  >
                    <div className="absolute top-0 right-0 p-5 z-10">
                      <button
                        onClick={(e) => toggleFavorite(e, barber.id)}
                        className={`cursor-pointer transition-transform hover:scale-110 ${isFav ? "text-red-500" : "text-slate-500 hover:text-white"}`}
                      >
                        {isFav ? (
                          <svg
                            className="w-7 h-7"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                        ) : (
                          <svg
                            className="w-7 h-7"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                            />
                          </svg>
                        )}
                      </button>
                    </div>

                    <div className="flex items-center gap-5 relative z-0">
                      <div className="w-16 h-16 bg-cyan-500/10 rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform border border-cyan-500/30 shrink-0 shadow-inner">
                        ✂️
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white mb-1">
                          {barber.barbershop_name || "Salon Fără Nume"}
                        </h3>
                        <p className="text-sm text-cyan-400 font-medium">
                          Frizer: {barber.first_name} {barber.last_name}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* STEP 2: Servicii */}
      {step === 2 && (
        <div className="animate-fade-in">
          <button
            onClick={() => setStep(1)}
            className="cursor-pointer text-slate-400 hover:text-white text-sm font-bold mb-6 flex items-center gap-1 transition-colors"
          >
            ← Înapoi la Frizerii
          </button>
          <h2 className="text-xl font-bold text-white mb-6">
            2. Ce serviciu dorești?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
            {services.map((service) => (
              <div
                key={service.id}
                onClick={() => {
                  setSelectedService(service);
                  setStep(3);
                }}
                className="cursor-pointer bg-white/5 hover:bg-cyan-500/10 border border-white/10 hover:border-cyan-500/50 p-6 rounded-3xl transition-all flex justify-between items-center group shadow-md"
              >
                <div>
                  <h3 className="text-lg text-white font-bold">
                    {service.name}
                  </h3>
                  <p className="text-sm text-slate-500 mt-1 flex items-center gap-1">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    ~45 minute
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-cyan-400 font-black text-2xl">
                    {service.price}
                  </span>
                  <span className="text-xs text-cyan-400/70 ml-1 font-bold">
                    RON
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STEP 3: Calendar & Ore */}
      {step === 3 && (
        <div className="animate-fade-in">
          <button
            onClick={() => setStep(2)}
            className="cursor-pointer text-slate-400 hover:text-white text-sm font-bold mb-6 flex items-center gap-1 transition-colors"
          >
            ← Înapoi la Servicii
          </button>

          <h2 className="text-xl font-bold text-white mb-6">
            3. Alege Data și Ora
          </h2>

          <div className="bg-white/5 border border-white/10 p-6 sm:p-8 rounded-[2.5rem] flex flex-col md:flex-row gap-8 shadow-xl">
            {/* MINI CALENDAR */}
            <div className="flex-1">
              <label className="block text-xs font-bold text-cyan-400 uppercase tracking-wider mb-4">
                Selectează Ziua
              </label>

              <div className="bg-[#0a0a0a] border border-white/5 p-5 rounded-2xl shadow-inner">
                {/* Header Calendar */}
                <div className="flex items-center justify-between mb-4 bg-white/5 rounded-xl p-1.5 border border-white/5">
                  <button
                    onClick={() =>
                      setCalendarViewDate(new Date(viewYear, viewMonth - 1, 1))
                    }
                    className="cursor-pointer p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
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
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                  </button>
                  <span className="font-bold text-white text-sm tracking-wide capitalize">
                    {monthNames[viewMonth]} {viewYear}
                  </span>
                  <button
                    onClick={() =>
                      setCalendarViewDate(new Date(viewYear, viewMonth + 1, 1))
                    }
                    className="cursor-pointer p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
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
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                </div>

                {/* Grid Calendar */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {["Lu", "Ma", "Mi", "Jo", "Vi", "Sâ", "Du"].map((day) => (
                    <div
                      key={day}
                      className="text-center text-[10px] font-bold text-slate-500 uppercase"
                    >
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {blanksArray.map((_, i) => (
                    <div key={`blank-${i}`} className="aspect-square"></div>
                  ))}

                  {daysArray.map((day) => {
                    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                    const cellDate = new Date(viewYear, viewMonth, day);

                    const isPast = cellDate < today;
                    const isBlocked =
                      settings?.custom_days_off?.includes(dateStr);
                    const isSelected = selectedDate === dateStr;

                    return (
                      <button
                        key={day}
                        disabled={isPast || isBlocked}
                        onClick={() => handleDateSelect(dateStr)}
                        className={`
                          aspect-square flex items-center justify-center rounded-xl text-sm font-bold transition-all border
                          ${
                            isPast
                              ? "text-slate-500 bg-white/5 border-transparent cursor-not-allowed"
                              : isBlocked
                                ? "text-red-400/70 bg-red-500/10 line-through border-red-500/20 cursor-not-allowed"
                                : isSelected
                                  ? "bg-cyan-500 text-[#0a0a0a] shadow-[0_0_15px_rgba(34,211,238,0.5)] border-cyan-400"
                                  : "text-slate-200 bg-white/10 border-white/5 hover:bg-cyan-500/20 hover:border-cyan-500/50 hover:text-cyan-400 cursor-pointer shadow-sm"
                          }
                        `}
                        title={isBlocked ? "Zi Indisponibilă" : ""}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ORE DISPONIBILE */}
            <div className="flex-1">
              <label className="block text-xs font-bold text-cyan-400 uppercase tracking-wider mb-4 flex justify-between">
                <span>Selectează Ora</span>
              </label>

              {!selectedDate ? (
                <div className="h-full min-h-[200px] flex items-center justify-center bg-black/20 rounded-2xl border border-white/5 border-dashed">
                  <p className="text-sm text-slate-500 font-medium">
                    Selectează o zi din calendar
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-3 lg:grid-cols-4 gap-3 animate-fade-in">
                  {TIME_SLOTS.map((t) => {
                    const isToday =
                      selectedDate === new Date().toISOString().split("T")[0];
                    const isPastHour =
                      isToday && t < new Date().toTimeString().slice(0, 5);
                    const isAlreadyBooked = bookedSlots.includes(t);

                    if (isPastHour || isAlreadyBooked) return null; // Ascundem orele ocupate

                    return (
                      <button
                        key={t}
                        onClick={() => setSelectedTime(t)}
                        className={`cursor-pointer py-3 rounded-xl text-sm font-bold transition-all border shadow-sm hover:scale-105 ${
                          selectedTime === t
                            ? "bg-cyan-500 text-[#0a0a0a] border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.4)]"
                            : "bg-white/5 text-white border-white/10 hover:border-cyan-500/50 hover:text-cyan-400"
                        }`}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <button
              onClick={() => setStep(4)}
              disabled={!selectedDate || !selectedTime}
              className="cursor-pointer bg-cyan-500 hover:bg-cyan-400 text-[#0a0a0a] font-bold px-8 py-3.5 rounded-xl transition-all shadow-[0_0_20px_rgba(34,211,238,0.3)] disabled:opacity-50 disabled:shadow-none"
            >
              Continuă spre Confirmare →
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Rezumat */}
      {step === 4 && (
        <div className="animate-fade-in">
          <button
            onClick={() => setStep(3)}
            className="cursor-pointer text-slate-400 hover:text-white text-sm font-bold mb-6 flex items-center gap-1 transition-colors"
          >
            ← Înapoi la Calendar
          </button>

          <h2 className="text-2xl font-bold text-white mb-6">
            Rezumatul Rezervării
          </h2>

          <div className="bg-gradient-to-br from-white/10 to-transparent border border-white/10 p-6 sm:p-8 rounded-[2rem] mb-8 relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-[80px]"></div>

            <div className="relative z-10 space-y-6">
              <div className="flex items-center justify-between border-b border-white/5 pb-5">
                <div>
                  <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">
                    Locație
                  </p>
                  <p className="text-xl text-white font-black">
                    {selectedBarber.barbershop_name ||
                      selectedBarber.first_name}
                  </p>
                </div>
                <div className="w-12 h-12 bg-cyan-500/20 rounded-full flex items-center justify-center border border-cyan-500/30 text-xl shadow-inner">
                  📍
                </div>
              </div>

              <div className="flex items-center justify-between border-b border-white/5 pb-5">
                <div>
                  <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">
                    Data & Ora
                  </p>
                  <p className="text-xl text-white font-medium capitalize">
                    {new Date(selectedDate).toLocaleDateString("ro-RO", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })}
                  </p>
                  <p className="text-cyan-400 font-mono font-bold mt-1 text-lg">
                    La ora {selectedTime}
                  </p>
                </div>
                <div className="w-12 h-12 bg-cyan-500/20 rounded-full flex items-center justify-center border border-cyan-500/30 text-xl shadow-inner">
                  ⏰
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div>
                  <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">
                    Serviciu Ales
                  </p>
                  <p className="text-xl text-white font-bold">
                    {selectedService.name}
                  </p>
                  <p className="text-sm text-slate-400 mt-1">
                    Vei plăti direct în locație.
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">
                    Total
                  </p>
                  <p className="text-4xl font-black text-cyan-400">
                    {selectedService.price}{" "}
                    <span className="text-base text-cyan-500/70">RON</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleBookAppointment}
              disabled={isSubmitting}
              className="cursor-pointer w-full sm:w-auto bg-cyan-500 hover:bg-cyan-400 text-[#0a0a0a] font-black px-10 py-4 rounded-xl transition-all shadow-[0_0_25px_rgba(34,211,238,0.4)] disabled:opacity-50 text-lg flex items-center justify-center gap-2"
            >
              {isSubmitting ? "Se trimite..." : "Confirmă Rezervarea"}
              {!isSubmitting && (
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
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
