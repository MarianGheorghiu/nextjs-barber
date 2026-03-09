"use server";

import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function saveScheduleAction(barberId: string, scheduleData: any) {
  // Upsert înseamnă: "Dacă nu există setări, creează-le. Dacă există, actualizează-le."
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
  return { success: true };
}
