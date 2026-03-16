"use server";

import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function saveScheduleAction(barberId: string, scheduleData: any) {
  // 1. Salvăm noul program în baza de date
  const { error } = await supabaseAdmin.from("barber_settings").upsert(
    {
      barber_id: barberId,
      working_hours: scheduleData.working_hours,
      auto_holidays_stat: scheduleData.auto_holidays_stat,
      auto_holidays_religios: scheduleData.auto_holidays_religios,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "barber_id" },
  );

  if (error) return { success: false, error: error.message };

  // 2. MAGIA: Căutăm zilele care au fost marcate ca "Zi Liberă" (active: false)
  // getDay() în JS dă 0 pt Duminică, 1 pt Luni, etc.
  const dayMap: Record<string, number> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  };

  const disabledDays = Object.keys(scheduleData.working_hours)
    .filter((day) => !scheduleData.working_hours[day].active)
    .map((day) => dayMap[day]);

  // 3. Dacă are zile libere debifate, căutăm toate programările VIITOARE și le ștergem pe cele din zilele respective
  if (disabledDays.length > 0) {
    const todayStr = new Date().toISOString().split("T")[0];

    const { data: futureApps } = await supabaseAdmin
      .from("appointments")
      .select("id, appointment_date")
      .eq("barber_id", barberId)
      .gte("appointment_date", todayStr);

    if (futureApps && futureApps.length > 0) {
      // Filtrăm doar programările care pică într-o zi a săptămânii dezactivată
      const idsToDelete = futureApps
        .filter((app) => {
          // Punem T12:00:00Z ca să nu avem probleme de fus orar la calcularea zilei
          const dateObj = new Date(app.appointment_date + "T12:00:00Z");
          return disabledDays.includes(dateObj.getDay());
        })
        .map((app) => app.id);

      if (idsToDelete.length > 0) {
        await supabaseAdmin.from("appointments").delete().in("id", idsToDelete);
      }
    }
  }

  return { success: true };
}

// Adaugă o zi liberă (Concediu) și șterge automat programările din acea zi
export async function addCustomDayOffAction(barberId: string, dateStr: string) {
  // 1. Ștergem toate programările din acea zi
  await supabaseAdmin
    .from("appointments")
    .delete()
    .eq("barber_id", barberId)
    .eq("appointment_date", dateStr);

  // 2. Extragem setările curente
  const { data: settings } = await supabaseAdmin
    .from("barber_settings")
    .select("custom_days_off")
    .eq("barber_id", barberId)
    .single();

  let daysOff = settings?.custom_days_off || [];

  // 3. Adăugăm ziua nouă (dacă nu e deja acolo)
  if (!daysOff.includes(dateStr)) {
    daysOff.push(dateStr);
    const { error } = await supabaseAdmin
      .from("barber_settings")
      .update({ custom_days_off: daysOff })
      .eq("barber_id", barberId);

    if (error) return { success: false, error: error.message };
  }

  return { success: true };
}

// Elimină o zi din lista de concediu (Deblochează ziua)
export async function removeCustomDayOffAction(
  barberId: string,
  dateStr: string,
) {
  const { data: settings } = await supabaseAdmin
    .from("barber_settings")
    .select("custom_days_off")
    .eq("barber_id", barberId)
    .single();

  if (!settings) return { success: false, error: "Nu s-au găsit setările." };

  const daysOff = (settings.custom_days_off || []).filter(
    (d: string) => d !== dateStr,
  );

  const { error } = await supabaseAdmin
    .from("barber_settings")
    .update({ custom_days_off: daysOff })
    .eq("barber_id", barberId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}
