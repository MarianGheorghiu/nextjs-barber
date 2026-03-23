"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import {
  addServiceAction,
  updateServiceAction,
  deleteServiceAction,
} from "@/app/actions/barberServicesActions";

type Service = {
  id: string;
  name: string;
  duration: number;
  price: number; // Acesta va fi prețul tăiat (prețul de bază)
  discount_percentage: number;
};

export default function BarberServicesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<Service[]>([]);
  const [barberId, setBarberId] = useState<string | null>(null);

  // Stări pentru formular (Create & Edit)
  const [showForm, setShowForm] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    duration: "",
    price: "",
    discount_percentage: "",
  });

  // ================= MODAL STATES =================
  const [activeModal, setActiveModal] = useState<"none" | "alert" | "confirm">(
    "none",
  );
  const [modalConfig, setModalConfig] = useState({
    title: "",
    message: "",
    type: "info",
  });
  const [confirmConfig, setConfirmConfig] = useState({
    title: "",
    message: "",
    buttonText: "",
    buttonColor: "red",
    action: async () => {},
  });
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchServices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const fetchServices = async () => {
    setLoading(true);
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
      .from("services")
      .select("*")
      .eq("barber_id", user.id)
      .order("created_at", { ascending: false });

    if (data && !error) setServices(data);
    setLoading(false);
  };

  const showAlert = (
    title: string,
    message: string,
    type: "success" | "error" | "info" = "info",
  ) => {
    setModalConfig({ title, message, type });
    setActiveModal("alert");
  };

  const resetForm = () => {
    setFormData({ name: "", duration: "", price: "", discount_percentage: "" });
    setEditingServiceId(null);
    setShowForm(false);
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barberId) return;

    const basePrice = Number(formData.price);
    const discount = Number(formData.discount_percentage) || 0;

    // MAGIA AICI: Când trimitem în DB, nu stricăm câmpul original.
    // Clientul ia datele din "services". Ne asigurăm că trimitem corect prețul.
    const serviceData = {
      barber_id: barberId,
      name: formData.name.trim(),
      duration: Number(formData.duration),
      price: basePrice, // Păstrăm prețul întreg
      discount_percentage: discount, // Salvăm discountul pentru a calcula prețul final dinamic pe Client Portal
    };

    setIsSaving(true);

    if (editingServiceId) {
      const result = await updateServiceAction(editingServiceId, serviceData);
      if (result.success) {
        setServices(
          services.map((s) =>
            s.id === editingServiceId ? { ...s, ...serviceData } : s,
          ),
        );
        resetForm();
        showAlert(
          "Serviciu Actualizat",
          "Modificările au fost salvate cu succes.",
          "success",
        );
      } else {
        showAlert(
          "Eroare",
          result.error || "A apărut o problemă la actualizare.",
          "error",
        );
      }
    } else {
      const result = await addServiceAction(serviceData);
      if (result.success) {
        await fetchServices(); // Re-fetch ca să avem ID-ul real de la Supabase
        resetForm();
        showAlert(
          "Serviciu Creat",
          "Noul serviciu a fost adăugat în listă.",
          "success",
        );
      } else {
        showAlert(
          "Eroare",
          result.error || "A apărut o problemă la creare.",
          "error",
        );
      }
    }

    setIsSaving(false);
  };

  const handleEditClick = (service: Service) => {
    setFormData({
      name: service.name,
      duration: service.duration.toString(),
      price: service.price.toString(),
      discount_percentage: service.discount_percentage.toString(),
    });
    setEditingServiceId(service.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const triggerDelete = (id: string, name: string) => {
    setConfirmConfig({
      title: "Ștergere Serviciu",
      message: `Ești sigur că vrei să ștergi serviciul "${name}"? Acesta nu va mai fi vizibil pentru clienți.`,
      buttonText: "Șterge",
      buttonColor: "red",
      action: async () => {
        setIsProcessing(true);
        const result = await deleteServiceAction(id);
        setIsProcessing(false);
        if (result.success) {
          setServices(services.filter((s) => s.id !== id));
          setActiveModal("none");
        } else {
          setActiveModal("none");
          showAlert(
            "Eroare",
            result.error || "Serviciul nu a putut fi șters.",
            "error",
          );
        }
      },
    });
    setActiveModal("confirm");
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh]">
        <div className="w-10 h-10 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mb-4 shadow-[0_0_15px_rgba(34,211,238,0.5)]"></div>
        <p className="text-cyan-400 font-bold uppercase tracking-widest text-[10px] animate-pulse">
          Se încarcă catalogul...
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
            Serviciile Mele
          </h1>
          <p className="text-slate-400 text-sm font-medium">
            Gestionează pachetele, prețurile și reducerile pentru clienții tăi.
          </p>
        </div>
        <button
          onClick={() => {
            if (showForm) resetForm();
            else setShowForm(true);
          }}
          className={`cursor-pointer font-black px-6 py-3.5 rounded-xl transition-all shadow-[0_0_20px_rgba(34,211,238,0.3)] hover:shadow-[0_0_30px_rgba(34,211,238,0.5)] flex items-center gap-2 hover:scale-105 ${showForm ? "bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10 shadow-none" : "bg-cyan-500 hover:bg-cyan-400 text-[#000428]"}`}
        >
          {showForm ? "✕ Anulează Editarea" : "+ Adaugă Serviciu Nou"}
        </button>
      </div>

      {/* FORMULAR ADĂUGARE / EDITARE LIQUID GLASS */}
      {showForm && (
        <div className="bg-white/5 backdrop-blur-2xl border border-white/20 p-6 sm:p-10 rounded-[2.5rem] mb-10 animate-fade-in relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-[80px] pointer-events-none"></div>
          {editingServiceId && (
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 to-cyan-500 shadow-[0_0_15px_rgba(34,211,238,0.8)] animate-pulse"></div>
          )}

          <h3 className="text-2xl font-black text-white mb-8 flex items-center gap-3 relative z-10 tracking-tight">
            {editingServiceId ? (
              <>
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 text-cyan-400 shadow-inner">
                  ✏️
                </div>{" "}
                Editezi: {formData.name}
              </>
            ) : (
              <>
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 text-cyan-400 shadow-inner">
                  +
                </div>{" "}
                Creare Serviciu Nou
              </>
            )}
          </h3>

          <form
            onSubmit={handleSaveService}
            className="relative z-10 flex flex-col gap-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold text-cyan-400/80 uppercase tracking-widest mb-1.5 ml-1">
                  Nume Serviciu / Pachet
                </label>
                <input
                  required
                  type="text"
                  placeholder="ex: Tuns Clasic + Aranjat Barbă"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full bg-black/40 border border-white/10 focus:border-cyan-400 rounded-2xl px-5 py-3.5 text-white outline-none transition-all shadow-inner font-medium"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-cyan-400/80 uppercase tracking-widest mb-1.5 ml-1">
                  Durată (Min)
                </label>
                <input
                  required
                  type="number"
                  min="5"
                  placeholder="ex: 45"
                  value={formData.duration}
                  onChange={(e) =>
                    setFormData({ ...formData, duration: e.target.value })
                  }
                  className="w-full bg-black/40 border border-white/10 focus:border-cyan-400 rounded-2xl px-5 py-3.5 text-white outline-none transition-all shadow-inner font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-cyan-400/80 uppercase tracking-widest mb-1.5 ml-1">
                  Preț Bază (RON)
                </label>
                <input
                  required
                  type="number"
                  min="1"
                  placeholder="ex: 80"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: e.target.value })
                  }
                  className="w-full bg-black/40 border border-white/10 focus:border-cyan-400 rounded-2xl px-5 py-3.5 text-cyan-400 outline-none transition-all shadow-inner font-mono font-black"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end pt-4 border-t border-white/10 mt-2">
              <div className="bg-cyan-500/5 border border-cyan-500/20 p-4 sm:p-5 rounded-2xl flex items-center gap-5 shadow-inner">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 font-black text-xl shrink-0 shadow-sm">
                  %
                </div>
                <div className="w-full">
                  <label className="block text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-1">
                    Reducere Pachet (Promoție)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      placeholder="0"
                      value={formData.discount_percentage}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          discount_percentage: e.target.value,
                        })
                      }
                      className="w-full bg-transparent border-b-2 border-cyan-500/30 focus:border-cyan-400 text-white outline-none py-1 text-xl font-black placeholder:text-cyan-500/30 transition-colors font-mono"
                    />
                    <span className="text-cyan-400/50 font-bold">%</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="cursor-pointer w-full md:w-auto bg-cyan-500 hover:bg-cyan-400 text-[#000428] font-black px-10 py-4 rounded-2xl transition-all shadow-[0_0_20px_rgba(34,211,238,0.3)] disabled:opacity-50 hover:scale-105"
                >
                  {isSaving
                    ? "Se salvează..."
                    : editingServiceId
                      ? "Actualizează Serviciul"
                      : "Publică Serviciul"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* TABEL SERVICII LIQUID GLASS PREMIUM */}
      <div className="bg-white/5 backdrop-blur-2xl border border-white/20 rounded-[2.5rem] p-6 sm:p-8 shadow-2xl relative overflow-hidden flex flex-col">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500/40 via-purple-500/40 to-cyan-500/40"></div>

        <h3 className="text-xl font-black text-white mb-6 flex items-center gap-3 relative z-10 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 text-cyan-400 shadow-inner">
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
                d="M4 6h16M4 10h16M4 14h16M4 18h16"
              />
            </svg>
          </div>
          Catalog Servicii
        </h3>

        {services.length === 0 ? (
          <div className="text-center py-16 relative z-10">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10 text-3xl shadow-inner">
              📋
            </div>
            <p className="text-white font-black text-2xl tracking-tight mb-2">
              Niciun serviciu definit.
            </p>
            <p className="text-sm text-slate-400 font-medium">
              Clienții tăi nu se pot programa până nu adaugi primul serviciu.
            </p>
          </div>
        ) : (
          <div className="overflow-auto custom-scrollbar max-h-[600px] rounded-2xl border border-white/10 bg-black/20 relative z-10 shadow-inner">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead className="sticky top-0 z-20 bg-[#050505]/95 backdrop-blur-2xl border-b border-white/20 shadow-sm">
                <tr className="text-slate-300 text-[10px] uppercase tracking-widest font-black">
                  <th className="py-4 pl-6">Serviciu & Timp</th>
                  <th className="py-4 text-center">Preț Bază</th>
                  <th className="py-4 text-center">Promoție</th>
                  <th className="py-4 text-right">Preț Final Client</th>
                  <th className="py-4 text-right pr-6">Acțiuni</th>
                </tr>
              </thead>
              <tbody className="text-white text-base">
                {services.map((service) => {
                  const finalPrice =
                    service.price -
                    service.price * (service.discount_percentage / 100);
                  const hasDiscount = service.discount_percentage > 0;

                  return (
                    <tr
                      key={service.id}
                      className="border-b border-white/5 transition-colors hover:bg-white/5 group"
                    >
                      {/* Nume & Durată */}
                      <td className="py-6 pl-6 align-middle">
                        <p className="font-black text-white text-lg tracking-tight mb-1">
                          {service.name}
                        </p>
                        <p className="text-xs font-bold text-cyan-400 flex items-center gap-1.5 uppercase tracking-widest">
                          <svg
                            className="w-4 h-4 opacity-70"
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
                          {service.duration} min
                        </p>
                      </td>

                      {/* Preț Bază */}
                      <td
                        className={`py-6 text-center align-middle font-mono font-bold ${hasDiscount ? "text-slate-500 line-through decoration-slate-600" : "text-slate-300"}`}
                      >
                        {service.price} RON
                      </td>

                      {/* Reducere */}
                      <td className="py-6 text-center align-middle">
                        {hasDiscount ? (
                          <span className="px-3 py-1.5 rounded-xl bg-green-500/10 text-green-400 text-xs font-black border border-green-500/30 tracking-widest shadow-inner">
                            -{service.discount_percentage}%
                          </span>
                        ) : (
                          <span className="text-slate-600 text-xs font-bold">
                            —
                          </span>
                        )}
                      </td>

                      {/* Preț Final */}
                      <td className="py-6 text-right align-middle">
                        <div className="flex flex-col items-end justify-center">
                          {hasDiscount && (
                            <span className="text-[10px] uppercase font-bold tracking-widest text-cyan-400/80 mb-0.5">
                              Preț Redus
                            </span>
                          )}
                          <span className="text-cyan-400 font-black text-2xl leading-none">
                            {finalPrice.toFixed(0)}{" "}
                            <span className="text-sm font-bold text-cyan-500/60 tracking-widest">
                              RON
                            </span>
                          </span>
                        </div>
                      </td>

                      {/* Acțiuni (Edit + Delete) */}
                      <td className="py-6 text-right pr-6 align-middle">
                        <div className="flex justify-end gap-2.5 items-center">
                          <button
                            onClick={() => handleEditClick(service)}
                            className="cursor-pointer w-10 h-10 rounded-xl bg-white/5 hover:bg-cyan-500/10 text-slate-400 hover:text-cyan-400 border border-white/5 hover:border-cyan-500/30 transition-all flex items-center justify-center shadow-sm"
                            title="Editează Serviciul"
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
                                strokeWidth="2"
                                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                              />
                            </svg>
                          </button>
                          <button
                            onClick={() =>
                              triggerDelete(service.id, service.name)
                            }
                            className="cursor-pointer w-10 h-10 rounded-xl bg-white/5 hover:bg-red-500/10 text-slate-400 hover:text-red-400 border border-white/5 hover:border-red-500/30 transition-all flex items-center justify-center shadow-sm"
                            title="Șterge Serviciu"
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
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ================= MODALE CENTRALE ================= */}

      {/* Modal Alertă */}
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

      {/* Modal Confirmare (Ștergere Definitivă) */}
      {activeModal === "confirm" && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in`}
        >
          <div
            className={`w-full max-w-sm bg-[#050505]/95 backdrop-blur-2xl border p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden ${confirmConfig.buttonColor === "red" ? "border-red-500/30" : "border-cyan-500/30"}`}
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-white/10"></div>
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 border-4 shadow-inner relative z-10 ${confirmConfig.buttonColor === "red" ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-cyan-500/10 border-cyan-500/20 text-cyan-400"}`}
            >
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
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </div>
            <h2 className="text-xl font-black text-white mb-2 text-center tracking-tight relative z-10">
              {confirmConfig.title}
            </h2>
            <p className="text-slate-300 text-sm mb-8 text-center font-medium leading-relaxed relative z-10">
              {confirmConfig.message}
            </p>
            <div className="flex gap-3 relative z-10">
              <button
                onClick={() => setActiveModal("none")}
                className="flex-1 py-3.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-sm font-bold hover:bg-white/10 transition-all cursor-pointer shadow-sm"
              >
                Renunță
              </button>
              <button
                onClick={confirmConfig.action}
                disabled={isProcessing}
                className={`flex-1 py-3.5 rounded-xl text-[#0a0a0a] text-sm font-black transition-all cursor-pointer disabled:opacity-50 shadow-lg ${confirmConfig.buttonColor === "red" ? "bg-red-500 hover:bg-red-400 shadow-[0_0_15px_rgba(239,68,68,0.4)]" : "bg-cyan-500 hover:bg-cyan-400"}`}
              >
                {isProcessing ? "..." : confirmConfig.buttonText}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
