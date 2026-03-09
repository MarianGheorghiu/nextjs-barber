"use server";

import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Schimbă statusul (Confirmă / Anulează)
export async function updateAppointmentStatusAction(
  appointmentId: string,
  newStatus: string,
) {
  const { error } = await supabaseAdmin
    .from("appointments")
    .update({ status: newStatus })
    .eq("id", appointmentId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// Reprogramează (Schimbă data și ora)
export async function rescheduleAppointmentAction(
  appointmentId: string,
  newDate: string,
  newTime: string,
) {
  const { error } = await supabaseAdmin
    .from("appointments")
    .update({
      appointment_date: newDate,
      appointment_time: newTime,
      status: "confirmed", // Dacă o reprogramează frizerul, o și confirmăm automat
    })
    .eq("id", appointmentId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// DOAR PENTRU TESTARE: Generăm o programare falsă
export async function createMockAppointmentAction(barberId: string) {
  // Generăm data de mâine pentru test
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().split("T")[0];

  const { error } = await supabaseAdmin.from("appointments").insert([
    {
      barber_id: barberId,
      client_name: "Alexandru Popa (Test)",
      client_phone: "0722123456",
      service_name: "Tuns Clasic + Barbă",
      price: 85,
      appointment_date: dateStr,
      appointment_time: "14:30",
      status: "pending",
    },
  ]);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// Ștergere manuală a unei programări (pentru cele anulate)
export async function deleteAppointmentAction(appointmentId: string) {
  const { error } = await supabaseAdmin
    .from("appointments")
    .delete()
    .eq("id", appointmentId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// Curățare automată a programărilor din trecut (cu salvarea statisticilor)
export async function cleanupPastAppointmentsAction(barberId: string) {
  // Luăm data curentă (fără oră, doar YYYY-MM-DD)
  const today = new Date().toISOString().split("T")[0];

  // 1. Căutăm câte programări CONFIRMATE au fost în trecut
  const { data: pastConfirmed } = await supabaseAdmin
    .from("appointments")
    .select("id")
    .eq("barber_id", barberId)
    .eq("status", "confirmed")
    .lt("appointment_date", today); // "lt" înseamnă "less than" (mai mic decât azi)

  const count = pastConfirmed?.length || 0;

  // 2. Dacă a avut programări confirmate, actualizăm statisticile frizerului
  if (count > 0) {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("total_clients")
      .eq("id", barberId)
      .single();

    const currentTotal = profile?.total_clients || 0;

    await supabaseAdmin
      .from("profiles")
      .update({ total_clients: currentTotal + count })
      .eq("id", barberId);
  }

  // 3. Ștergem DEFINITIV toate programările trecute (indiferent de status)
  const { error: deleteError } = await supabaseAdmin
    .from("appointments")
    .delete()
    .eq("barber_id", barberId)
    .lt("appointment_date", today);

  if (deleteError) return { success: false, error: deleteError.message };

  return { success: true, count };
}

// Confirmă toate programările dintr-un interval de date (o zi sau o săptămână)
export async function confirmAppointmentsByDateRangeAction(
  barberId: string,
  startDate: string,
  endDate: string,
) {
  const { error } = await supabaseAdmin
    .from("appointments")
    .update({ status: "confirmed" })
    .eq("barber_id", barberId)
    .gte("appointment_date", startDate)
    .lte("appointment_date", endDate)
    .neq("status", "confirmed"); // Le confirmăm doar pe cele care nu sunt deja confirmate

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// Șterge TOATE programările dintr-un interval (Anulare + Ștergere din DB)
export async function deleteAppointmentsByDateRangeAction(
  barberId: string,
  startDate: string,
  endDate: string,
) {
  const { error } = await supabaseAdmin
    .from("appointments")
    .delete()
    .eq("barber_id", barberId)
    .gte("appointment_date", startDate)
    .lte("appointment_date", endDate);

  if (error) return { success: false, error: error.message };
  return { success: true };
}
