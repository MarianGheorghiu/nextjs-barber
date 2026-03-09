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
  price: number;
  discount_percentage: number;
  status: string;
};

export default function BarberServicesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<Service[]>([]);
  const [barberId, setBarberId] = useState<string | null>(null);

  // Stări pentru formular (Create & Edit)
  const [showForm, setShowForm] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    duration: "",
    price: "",
    discount_percentage: "",
  });

  useEffect(() => {
    const fetchServices = async () => {
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

    fetchServices();
  }, [router]);

  // Funcție pentru a reseta formularul la starea inițială
  const resetForm = () => {
    setFormData({ name: "", duration: "", price: "", discount_percentage: "" });
    setEditingServiceId(null);
    setShowForm(false);
  };

  // Handler Salvare (Adăugare SAU Editare)
  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barberId) return;

    const serviceData = {
      barber_id: barberId,
      name: formData.name,
      duration: Number(formData.duration),
      price: Number(formData.price),
      discount_percentage: Number(formData.discount_percentage) || 0,
    };

    if (editingServiceId) {
      // Mod EDITARE
      const result = await updateServiceAction(editingServiceId, serviceData);
      if (result.success) {
        // Actualizăm UI-ul instant fără refresh
        setServices(
          services.map((s) =>
            s.id === editingServiceId ? { ...s, ...serviceData } : s,
          ),
        );
        resetForm();
      } else {
        alert("Eroare la editare: " + result.error);
      }
    } else {
      // Mod ADĂUGARE
      const result = await addServiceAction(serviceData);
      if (result.success) {
        window.location.reload(); // Refresh pentru a trage ID-ul generat de baza de date
      } else {
        alert("Eroare la adăugare: " + result.error);
      }
    }
  };

  // Când apăsăm pe butonul de Edit din tabel
  const handleEditClick = (service: Service) => {
    setFormData({
      name: service.name,
      duration: service.duration.toString(),
      price: service.price.toString(),
      discount_percentage: service.discount_percentage.toString(),
    });
    setEditingServiceId(service.id);
    setShowForm(true);
    // Facem scroll subtil sus către formular
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Ești sigur că vrei să ștergi acest serviciu?")) {
      const result = await deleteServiceAction(id);
      if (result.success) {
        setServices(services.filter((s) => s.id !== id));
      } else {
        alert("Eroare: " + result.error);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh]">
        <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-cyan-400 font-medium">
          Se încarcă lista de servicii...
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
            Serviciile Mele
          </h1>
          <p className="text-slate-400">
            Configurează ce oferi clienților tăi și prețurile aferente.
          </p>
        </div>
        <button
          onClick={() => {
            if (showForm) {
              resetForm();
            } else {
              setShowForm(true);
            }
          }}
          className="bg-cyan-500 hover:bg-cyan-400 text-[#000428] font-bold px-6 py-3 rounded-xl cursor-pointer transition-all shadow-[0_0_20px_rgba(34,211,238,0.2)]"
        >
          {showForm ? "✕ Anulează" : "+ Adaugă Serviciu Nou"}
        </button>
      </div>

      {/* Formular Adăugare / Editare */}
      {showForm && (
        <form
          onSubmit={handleSaveService}
          className="bg-white/5 backdrop-blur-xl border border-cyan-500/30 rounded-[2rem] p-6 mb-8 animate-fade-in shadow-[0_0_20px_rgba(34,211,238,0.1)] relative overflow-hidden"
        >
          {editingServiceId && (
            <div className="absolute top-0 left-0 w-full h-1 bg-cyan-400 animate-pulse"></div>
          )}

          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            {editingServiceId ? (
              <>
                <span className="text-cyan-400">✏️ Editare:</span>{" "}
                {formData.name}
              </>
            ) : (
              "Creare Serviciu Nou"
            )}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
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
                className="w-full bg-black/20 border border-white/10 focus:border-cyan-400 rounded-xl px-4 py-3 text-white outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Durată (Minute)
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
                className="w-full bg-black/20 border border-white/10 focus:border-cyan-400 rounded-xl px-4 py-3 text-white outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Preț Standard (RON)
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
                className="w-full bg-black/20 border border-white/10 focus:border-cyan-400 rounded-xl px-4 py-3 text-white outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <div className="bg-cyan-500/5 border border-cyan-500/20 p-4 rounded-xl flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold shrink-0">
                %
              </div>
              <div className="w-full">
                <label className="block text-xs font-bold text-cyan-400 uppercase tracking-wider mb-1">
                  Reducere Pachet (%)
                </label>
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
                  className="w-full bg-transparent border-b border-cyan-500/30 focus:border-cyan-400 text-white outline-none py-1 placeholder:text-cyan-500/30"
                />
              </div>
            </div>

            <div className="flex justify-end mt-4 md:mt-0">
              <button
                type="submit"
                className="bg-cyan-500 hover:bg-cyan-400 text-[#000428] font-bold px-8 py-3 cursor-pointer rounded-xl transition-all shadow-lg w-full md:w-auto"
              >
                {editingServiceId
                  ? "Salvează Modificările"
                  : "Salvează Serviciul"}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Tabel Servicii */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 sm:p-8">
        {services.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-slate-400 mb-2">
              Nu ai adăugat niciun serviciu încă.
            </p>
            <p className="text-sm text-slate-500">
              Apasă pe butonul de mai sus pentru a începe.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="text-slate-400 border-b border-white/10 text-xs uppercase tracking-wider">
                  <th className="pb-4 font-medium pl-2">Serviciu & Timp</th>
                  <th className="pb-4 font-medium text-center">Preț Bază</th>
                  <th className="pb-4 font-medium text-center">Reducere</th>
                  <th className="pb-4 font-medium text-right">
                    Preț Final Pachet
                  </th>
                  <th className="pb-4 font-medium text-right pr-2">Acțiuni</th>
                </tr>
              </thead>
              <tbody className="text-slate-300">
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
                      <td className="py-4 pl-2 align-middle">
                        <p className="font-bold text-white text-base mb-1">
                          {service.name}
                        </p>
                        <p className="text-xs text-cyan-400 flex items-center gap-1">
                          <svg
                            className="w-3.5 h-3.5"
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
                          {service.duration} minute
                        </p>
                      </td>

                      {/* Preț Bază */}
                      <td
                        className={`py-4 text-center align-middle font-mono ${hasDiscount ? "text-slate-600" : "text-slate-400"}`}
                      >
                        {service.price} RON
                      </td>

                      {/* Reducere */}
                      <td className="py-4 text-center align-middle">
                        {hasDiscount ? (
                          <span className="px-3 py-1 rounded-lg bg-green-500/20 text-green-400 text-xs font-extrabold border border-green-500/30 tracking-wider shadow-[0_0_10px_rgba(34,197,94,0.1)]">
                            -{service.discount_percentage}%
                          </span>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>

                      {/* Preț Final */}
                      <td className="py-4 text-right align-middle">
                        {hasDiscount ? (
                          <div className="flex flex-col items-end justify-center">
                            <span className="text-xs text-slate-500 line-through decoration-red-500/50 decoration-2 mb-0.5">
                              {service.price} RON
                            </span>
                            <span className="text-cyan-400 font-extrabold text-xl leading-none">
                              {finalPrice.toFixed(0)}{" "}
                              <span className="text-sm font-medium text-cyan-500/60">
                                RON
                              </span>
                            </span>
                          </div>
                        ) : (
                          <span className="text-cyan-400 font-bold text-lg">
                            {service.price}{" "}
                            <span className="text-sm font-medium text-cyan-500/60">
                              RON
                            </span>
                          </span>
                        )}
                      </td>

                      {/* Acțiuni (Edit + Delete) */}
                      <td className="py-4 text-right pr-2 align-middle">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleEditClick(service)}
                            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-cyan-400 border border-transparent hover:border-cyan-400/30 transition-all cursor-pointer"
                            title="Editează Serviciul"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDelete(service.id)}
                            className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-transparent hover:border-red-500/30 transition-all cursor-pointer"
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
    </div>
  );
}
