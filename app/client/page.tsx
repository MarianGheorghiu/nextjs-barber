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

  // Date Client
  const [clientId, setClientId] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);

  // State Programare Activă
  const [activeAppointment, setActiveAppointment] = useState<any>(null);

  // Flow State
  const [barbers, setBarbers] = useState<any[]>([]);
  const [selectedBarber, setSelectedBarber] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);

  // Selecții
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [selectedService, setSelectedService] = useState<any>(null);
  const [calendarViewDate, setCalendarViewDate] = useState(new Date());

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ================= MODAL STATE =================
  const [activeModal, setActiveModal] = useState<"none" | "cancel" | "error">(
    "none",
  );
  const [modalMessage, setModalMessage] = useState("");

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
    if (result.success && result.barbers) setBarbers(result.barbers);

    const preselectedBarberId = searchParams.get("barberId");
    if (preselectedBarberId && result.barbers) {
      const foundBarber = result.barbers.find(
        (b) => b.id === preselectedBarberId,
      );
      if (foundBarber) {
        setSelectedBarber(foundBarber);
        const details = await getBarberDetailsAction(foundBarber.id);
        if (details.success) {
          setServices(details.services);
          setSettings(details.settings);
          setStep(2);
        }
      }
    }

    setLoading(false);
  };

  const toggleFavorite = async (e: React.MouseEvent, barberId: string) => {
    e.stopPropagation();
    const isFav = favorites.includes(barberId);
    let newFavorites = isFav
      ? favorites.filter((id) => id !== barberId)
      : [...favorites, barberId];

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
    if (result.success) setBookedSlots(result.bookedTimes || []);
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
      setModalMessage("Eroare la programare: " + result.error);
      setActiveModal("error");
    }
    setIsSubmitting(false);
  };

  // --- ACȚIUNI MODAL (FĂRĂ ALERTE NATIVE) ---
  const triggerCancelModal = () => {
    setModalMessage(
      "Ești sigur că vrei să anulezi programarea? Locul tău va fi eliberat imediat.",
    );
    setActiveModal("cancel");
  };

  const confirmCancelAppointment = async () => {
    setLoading(true);
    setActiveModal("none");
    const result = await cancelClientAppointmentAction(activeAppointment.id);
    if (result.success) {
      setActiveAppointment(null);
      await initPage();
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
      setModalMessage("A apărut o eroare la confirmarea reprogramării.");
      setActiveModal("error");
      setLoading(false);
    }
  };

  // Calendar Engine
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
        <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin shadow-[0_0_20px_rgba(34,211,238,0.5)]"></div>
      </div>
    );

  // ================= ECRAN 1: PROGRAMARE ACTIVĂ =================
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
      <div className="animate-fade-in max-w-4xl mx-auto pb-10">
        <div className="mb-10 text-center sm:text-left">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
            Programarea Ta
          </h1>
          <p className="text-slate-400">Detaliile următoarei tale vizite.</p>
        </div>

        {isRescheduled && (
          <div className="mb-8 bg-orange-500/10 backdrop-blur-md border border-orange-500/30 p-6 sm:p-8 rounded-[2rem] flex flex-col sm:flex-row items-center justify-between gap-6 animate-bounce-subtle shadow-[0_0_30px_rgba(249,115,22,0.15)] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/20 rounded-full blur-[40px] pointer-events-none"></div>
            <div className="relative z-10 text-center sm:text-left">
              <p className="text-orange-400 font-black text-xl mb-1 flex items-center justify-center sm:justify-start gap-2">
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
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Frizerul a propus o nouă oră!
              </p>
              <p className="text-sm text-orange-400/80 font-medium">
                Ești de acord cu noua dată/oră de mai jos?
              </p>
            </div>
            <div className="flex w-full sm:w-auto items-center gap-3 relative z-10">
              <button
                onClick={handleAcceptReschedule}
                className="cursor-pointer flex-1 sm:flex-none bg-orange-500 hover:bg-orange-400 text-white font-black px-8 py-3.5 rounded-xl transition-all shadow-[0_0_20px_rgba(249,115,22,0.4)]"
              >
                ✓ Accept
              </button>
              <button
                onClick={triggerCancelModal}
                className="cursor-pointer flex-1 sm:flex-none bg-white/5 hover:bg-red-500/10 text-slate-300 hover:text-red-400 font-bold px-8 py-3.5 rounded-xl transition-all border border-white/10 hover:border-red-500/30"
              >
                ✕ Refuz
              </button>
            </div>
          </div>
        )}

        {/* CARD PRINCIPAL LIQUID GLASS */}
        <div
          className={`bg-white/5 backdrop-blur-2xl border p-8 sm:p-10 relative overflow-hidden shadow-2xl rounded-[3rem] ${isRescheduled ? "border-orange-500/30" : "border-white/20"}`}
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500/50 via-purple-500/50 to-cyan-500/50"></div>
          <div
            className={`absolute top-0 right-0 w-64 h-64 rounded-full blur-[100px] pointer-events-none ${isRescheduled ? "bg-orange-500/10" : "bg-cyan-500/10"}`}
          ></div>

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8 border-b border-white/10 pb-8">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center text-3xl border border-white/10 shadow-inner shrink-0">
                📍
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1">
                  Locație / Frizer
                </p>
                <p className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {barberName}
                </p>
              </div>
            </div>

            <div
              className={`px-5 py-2.5 rounded-xl flex items-center gap-2.5 font-bold uppercase tracking-wider text-xs shadow-inner border ${isPending ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/30" : isRescheduled ? "bg-orange-500/10 text-orange-400 border-orange-500/30" : "bg-green-500/10 text-green-400 border-green-500/30"}`}
            >
              {isPending && (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 animate-pulse"></span>{" "}
                  În așteptare
                </>
              )}
              {isRescheduled && (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-400 animate-pulse"></span>{" "}
                  Reprogramat
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
            <div className="bg-black/20 p-6 rounded-[2rem] border border-white/5 shadow-inner">
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-2">
                Data & Ora
              </p>
              <p
                className={`text-2xl font-black capitalize tracking-tight ${isRescheduled ? "text-orange-400" : "text-white"}`}
              >
                {appDate}
              </p>
              <div className="flex items-center gap-3 mt-3">
                <svg
                  className={`w-6 h-6 ${isRescheduled ? "text-orange-500" : "text-cyan-500"}`}
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
                <p
                  className={`font-mono font-black text-3xl ${isRescheduled ? "text-orange-400" : "text-cyan-400"}`}
                >
                  {activeAppointment.appointment_time.slice(0, 5)}
                </p>
              </div>
            </div>

            <div className="bg-black/20 p-6 rounded-[2rem] border border-white/5 shadow-inner flex flex-col justify-center">
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-2">
                Serviciu Ales
              </p>
              <p className="text-2xl font-black text-white tracking-tight">
                {activeAppointment.service_name}
              </p>
              <div className="mt-4 p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/10 inline-block">
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">
                  Plată la final
                </p>
                <p className="text-cyan-400 font-black text-3xl">
                  {activeAppointment.price}{" "}
                  <span className="text-base text-cyan-500/70">RON</span>
                </p>
              </div>
            </div>
          </div>

          <div className="relative z-10 pt-8 border-t border-white/10 flex justify-end">
            <button
              onClick={triggerCancelModal}
              className="cursor-pointer w-full sm:w-auto bg-white/5 hover:bg-red-500/10 text-slate-300 hover:text-red-400 border border-white/10 hover:border-red-500/30 font-bold px-8 py-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm"
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
          <p className="text-center text-sm text-cyan-400/70 mt-8 font-medium animate-pulse">
            Frizerul a fost notificat și va confirma în curând.
          </p>
        )}

        {/* MODAL CANCEL PREMIUM */}
        {activeModal === "cancel" && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
            <div className="w-full max-w-sm bg-[#050505]/95 backdrop-blur-2xl border border-red-500/30 p-8 rounded-[2rem] shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-[40px] pointer-events-none"></div>
              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6 border-4 border-red-500/20 text-red-400 shadow-inner relative z-10">
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
              </div>
              <h2 className="text-xl font-black text-white mb-3 text-center relative z-10">
                Anulare Programare
              </h2>
              <p className="text-slate-300 text-sm mb-8 text-center leading-relaxed relative z-10">
                {modalMessage}
              </p>

              <div className="flex gap-3 relative z-10">
                <button
                  onClick={() => setActiveModal("none")}
                  className="flex-1 py-3.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-sm font-bold hover:bg-white/10 transition-all cursor-pointer shadow-sm"
                >
                  Înapoi
                </button>
                <button
                  onClick={confirmCancelAppointment}
                  className="flex-1 py-3.5 rounded-xl bg-red-500 text-[#0a0a0a] text-sm font-black hover:bg-red-400 transition-all cursor-pointer shadow-[0_0_20px_rgba(239,68,68,0.4)]"
                >
                  Anulează Acum
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ================= ECRAN 2: FLUX REZERVARE (LIQUID GLASS UI) =================
  return (
    <div className="animate-fade-in max-w-4xl mx-auto pb-10">
      <div className="mb-10 text-center sm:text-left">
        <h1 className="text-3xl sm:text-4xl font-black text-white mb-2 tracking-tight">
          Programează-te
        </h1>
        <p className="text-slate-400 font-medium">
          Urmează pașii pentru a-ți rezerva locul.
        </p>

        {/* PROGRESS BAR PREMIUM */}
        <div className="flex items-center justify-center sm:justify-start gap-3 mt-8">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex flex-col items-center gap-2 flex-1 max-w-[100px]"
            >
              <div
                className={`w-full h-1.5 rounded-full transition-all duration-500 ${step >= i ? "bg-cyan-500 shadow-[0_0_15px_rgba(34,211,238,0.5)]" : "bg-white/10"}`}
              ></div>
              <span
                className={`text-[10px] font-black uppercase tracking-widest transition-colors duration-500 ${step >= i ? "text-cyan-400" : "text-slate-600"}`}
              >
                Pas {i}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* STEP 1: Frizerii */}
      {step === 1 && (
        <div className="animate-fade-in">
          <h2 className="text-2xl font-black text-white mb-6">
            Alege Frizeria
          </h2>
          {barbers.length === 0 ? (
            <div className="text-center py-20 bg-white/5 backdrop-blur-xl rounded-[2.5rem] border border-white/10">
              <p className="text-slate-400 font-medium text-lg">
                Niciun frizer disponibil momentan.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {barbers.map((barber) => {
                const isFav = favorites.includes(barber.id);
                return (
                  <div
                    key={barber.id}
                    onClick={() => handleSelectBarber(barber)}
                    className="cursor-pointer bg-white/5 backdrop-blur-xl border border-white/10 hover:border-cyan-500/50 p-6 sm:p-8 rounded-[2.5rem] transition-all group relative overflow-hidden shadow-lg hover:shadow-[0_10px_40px_rgba(34,211,238,0.15)] hover:-translate-y-1"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-[40px] group-hover:bg-cyan-500/20 transition-all pointer-events-none"></div>

                    <button
                      onClick={(e) => toggleFavorite(e, barber.id)}
                      className={`absolute top-6 right-6 z-20 cursor-pointer transition-transform hover:scale-110 p-2 rounded-xl bg-black/20 backdrop-blur-md border border-white/5 shadow-sm ${isFav ? "text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]" : "text-slate-400 hover:text-white"}`}
                    >
                      {isFav ? (
                        <svg
                          className="w-6 h-6"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                      ) : (
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
                            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                          />
                        </svg>
                      )}
                    </button>

                    <div className="flex items-center gap-5 relative z-10">
                      <div className="w-16 h-16 bg-cyan-500/10 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform border border-cyan-500/20 shrink-0 shadow-inner">
                        ✂️
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-white mb-1 group-hover:text-cyan-400 transition-colors">
                          {barber.barbershop_name || "Salon Fără Nume"}
                        </h3>
                        <p className="text-sm text-slate-400 font-medium">
                          Frizer:{" "}
                          <span className="text-white">
                            {barber.first_name} {barber.last_name}
                          </span>
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
            className="cursor-pointer text-slate-400 hover:text-cyan-400 text-sm font-black uppercase tracking-wider mb-8 flex items-center gap-2 transition-colors w-max px-4 py-2 rounded-lg hover:bg-white/5"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Înapoi la Locații
          </button>

          <h2 className="text-2xl font-black text-white mb-6">
            Alege Serviciul
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">
            {services.map((service) => (
              <div
                key={service.id}
                onClick={() => {
                  setSelectedService(service);
                  setStep(3);
                }}
                className="cursor-pointer bg-white/5 backdrop-blur-xl border border-white/10 hover:border-cyan-500/50 p-6 rounded-[2rem] transition-all flex justify-between items-center group shadow-lg hover:shadow-[0_10px_30px_rgba(34,211,238,0.15)] relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-[30px] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative z-10">
                  <h3 className="text-lg text-white font-black group-hover:text-cyan-400 transition-colors">
                    {service.name}
                  </h3>
                  <p className="text-xs font-bold text-slate-500 mt-2 uppercase tracking-widest flex items-center gap-1.5">
                    <svg
                      className="w-4 h-4"
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
                    Durează ~45 min
                  </p>
                </div>
                <div className="text-right relative z-10 bg-black/30 px-4 py-2 rounded-xl border border-white/5 group-hover:border-cyan-500/30 transition-colors">
                  <span className="text-cyan-400 font-black text-2xl">
                    {service.price}
                  </span>
                  <span className="text-[10px] text-cyan-400/70 ml-1 font-bold uppercase tracking-widest">
                    RON
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STEP 3: Calendar & Ore (Premium Glass) */}
      {step === 3 && (
        <div className="animate-fade-in">
          <button
            onClick={() => setStep(2)}
            className="cursor-pointer text-slate-400 hover:text-cyan-400 text-sm font-black uppercase tracking-wider mb-8 flex items-center gap-2 transition-colors w-max px-4 py-2 rounded-lg hover:bg-white/5"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Alege Alt Serviciu
          </button>

          <h2 className="text-2xl font-black text-white mb-6">
            Selectează Data & Ora
          </h2>

          <div className="bg-white/5 backdrop-blur-2xl border border-white/20 p-6 sm:p-10 rounded-[3rem] flex flex-col md:flex-row gap-10 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-[80px] pointer-events-none"></div>

            {/* CALENDAR */}
            <div className="flex-1 relative z-10">
              <label className="block text-[10px] font-black text-cyan-400 uppercase tracking-widest mb-4 pl-2">
                Pas 1: Ziua
              </label>

              <div className="bg-[#050505]/60 backdrop-blur-xl border border-white/10 p-6 rounded-[2rem] shadow-inner">
                {/* Header Calendar */}
                <div className="flex items-center justify-between mb-6 bg-white/5 rounded-2xl p-2 border border-white/10">
                  <button
                    onClick={() =>
                      setCalendarViewDate(new Date(viewYear, viewMonth - 1, 1))
                    }
                    className="cursor-pointer p-2.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
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
                        strokeWidth="2.5"
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                  </button>
                  <span className="font-black text-white text-base tracking-wide capitalize">
                    {monthNames[viewMonth]} {viewYear}
                  </span>
                  <button
                    onClick={() =>
                      setCalendarViewDate(new Date(viewYear, viewMonth + 1, 1))
                    }
                    className="cursor-pointer p-2.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
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
                        strokeWidth="2.5"
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                </div>

                {/* Grid Calendar */}
                <div className="grid grid-cols-7 gap-1.5 mb-2">
                  {["Lu", "Ma", "Mi", "Jo", "Vi", "Sâ", "Du"].map((day) => (
                    <div
                      key={day}
                      className="text-center text-[10px] font-black text-slate-500 uppercase tracking-widest pb-2"
                    >
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1.5">
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
                        className={`aspect-square flex items-center justify-center rounded-[1rem] text-sm font-black transition-all border ${isPast ? "text-slate-600 bg-transparent border-transparent cursor-not-allowed" : isBlocked ? "text-red-500/50 bg-red-500/10 line-through border-transparent cursor-not-allowed" : isSelected ? "bg-cyan-500 text-[#000428] shadow-[0_0_20px_rgba(34,211,238,0.5)] border-cyan-400 scale-105" : "text-white bg-white/5 border-white/10 hover:bg-cyan-500/20 hover:border-cyan-500/50 hover:text-cyan-400 cursor-pointer shadow-sm"}`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ORE */}
            <div className="flex-1 relative z-10">
              <label className="block text-[10px] font-black text-cyan-400 uppercase tracking-widest mb-4 pl-2">
                Pas 2: Ora
              </label>

              {!selectedDate ? (
                <div className="h-[300px] flex flex-col items-center justify-center bg-black/20 rounded-[2rem] border border-white/5 border-dashed">
                  <div className="w-12 h-12 rounded-full bg-white/5 text-slate-500 flex items-center justify-center mb-3">
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
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">
                    Alege o zi validă
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3 animate-fade-in max-h-[350px] overflow-y-auto custom-scrollbar pr-2">
                  {TIME_SLOTS.map((t) => {
                    const isToday =
                      selectedDate === new Date().toISOString().split("T")[0];
                    const isPastHour =
                      isToday && t < new Date().toTimeString().slice(0, 5);
                    const isAlreadyBooked = bookedSlots.includes(t);

                    if (isPastHour || isAlreadyBooked) return null;

                    return (
                      <button
                        key={t}
                        onClick={() => setSelectedTime(t)}
                        className={`cursor-pointer py-3.5 rounded-xl text-base font-black transition-all border shadow-sm ${selectedTime === t ? "bg-cyan-500 text-[#000428] border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.5)] scale-105" : "bg-white/5 text-white border-white/10 hover:border-cyan-500/50 hover:bg-cyan-500/10 hover:text-cyan-400"}`}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="mt-8">
                <button
                  onClick={() => setStep(4)}
                  disabled={!selectedDate || !selectedTime}
                  className="w-full cursor-pointer bg-cyan-500 hover:bg-cyan-400 text-[#000428] font-black px-6 py-4 rounded-2xl transition-all shadow-[0_0_20px_rgba(34,211,238,0.3)] hover:shadow-[0_0_30px_rgba(34,211,238,0.5)] disabled:opacity-50 disabled:shadow-none text-lg flex justify-center items-center gap-2 hover:scale-[1.02]"
                >
                  Validare Programare{" "}
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
                      d="M14 5l7 7m0 0l-7 7m7-7H3"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: Rezumat Premium */}
      {step === 4 && (
        <div className="animate-fade-in">
          <button
            onClick={() => setStep(3)}
            className="cursor-pointer text-slate-400 hover:text-cyan-400 text-sm font-black uppercase tracking-wider mb-8 flex items-center gap-2 transition-colors w-max px-4 py-2 rounded-lg hover:bg-white/5"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Modifică Ora
          </button>

          <h2 className="text-2xl font-black text-white mb-6">
            Confirmare Finală
          </h2>

          <div className="bg-white/5 backdrop-blur-2xl border border-white/20 p-8 sm:p-12 rounded-[3rem] mb-8 relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500/50 via-purple-500/50 to-cyan-500/50"></div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none"></div>

            <div className="relative z-10 space-y-8">
              <div className="flex items-center justify-between border-b border-white/10 pb-8">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1.5">
                    Locație & Frizer
                  </p>
                  <p className="text-2xl sm:text-3xl text-white font-black tracking-tight">
                    {selectedBarber.barbershop_name ||
                      selectedBarber.first_name}
                  </p>
                </div>
                <div className="w-16 h-16 bg-cyan-500/10 rounded-2xl flex items-center justify-center border border-cyan-500/30 text-2xl shadow-inner">
                  📍
                </div>
              </div>

              <div className="flex items-center justify-between border-b border-white/10 pb-8">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1.5">
                    Data & Ora Rezervării
                  </p>
                  <p className="text-2xl text-white font-bold capitalize">
                    {new Date(selectedDate).toLocaleDateString("ro-RO", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })}
                  </p>
                  <p className="text-cyan-400 font-mono font-black mt-2 text-2xl">
                    La ora {selectedTime}
                  </p>
                </div>
                <div className="w-16 h-16 bg-cyan-500/10 rounded-2xl flex items-center justify-center border border-cyan-500/30 text-2xl shadow-inner">
                  ⏰
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pt-4 gap-6">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1.5">
                    Serviciu Ales
                  </p>
                  <p className="text-2xl text-white font-black tracking-tight">
                    {selectedService.name}
                  </p>
                  <p className="text-sm font-bold text-cyan-400/80 mt-1 uppercase tracking-widest">
                    Plata se face în locație
                  </p>
                </div>
                <div className="text-left sm:text-right bg-black/30 px-6 py-4 rounded-2xl border border-white/10 shadow-inner">
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">
                    Total de plată
                  </p>
                  <p className="text-4xl font-black text-cyan-400">
                    {selectedService.price}{" "}
                    <span className="text-lg text-cyan-500/70">RON</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleBookAppointment}
              disabled={isSubmitting}
              className="cursor-pointer w-full sm:w-auto bg-cyan-500 hover:bg-cyan-400 text-[#000428] font-black px-12 py-4 rounded-2xl transition-all shadow-[0_0_25px_rgba(34,211,238,0.4)] hover:shadow-[0_0_35px_rgba(34,211,238,0.6)] disabled:opacity-50 text-lg flex items-center justify-center gap-3 hover:scale-105"
            >
              {isSubmitting ? (
                <span className="w-6 h-6 border-4 border-[#000428] border-t-transparent rounded-full animate-spin"></span>
              ) : (
                "Confirmă Rezervarea"
              )}
            </button>
          </div>
        </div>
      )}

      {/* MODAL EROARE */}
      {activeModal === "error" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm bg-[#050505]/95 backdrop-blur-2xl border border-red-500/30 p-8 rounded-[2rem] shadow-2xl relative overflow-hidden">
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6 border-4 border-red-500/20 text-red-400 shadow-inner relative z-10">
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
            </div>
            <h2 className="text-xl font-black text-white mb-3 text-center relative z-10">
              Atenție!
            </h2>
            <p className="text-red-400 text-sm mb-8 text-center font-bold leading-relaxed relative z-10">
              {modalMessage}
            </p>
            <button
              onClick={() => setActiveModal("none")}
              className="w-full py-4 rounded-xl bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 transition-all cursor-pointer shadow-sm relative z-10"
            >
              Închide
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
