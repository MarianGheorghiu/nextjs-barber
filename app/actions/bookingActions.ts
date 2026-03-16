"use server";

import { createClient } from "@supabase/supabase-js";
import { syncClientToAgendaAction } from "./barberClientsActions";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function getAvailableBarbersAction() {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, first_name, last_name, barbershop_name")
    .eq("role", "barber");
  if (error) return { success: false, error: error.message };
  return { success: true, barbers: data };
}

export async function getBarberDetailsAction(barberId: string) {
  const { data: services } = await supabaseAdmin
    .from("services")
    .select("*")
    .eq("barber_id", barberId);
  const { data: settings } = await supabaseAdmin
    .from("barber_settings")
    .select("working_hours, custom_days_off")
    .eq("barber_id", barberId)
    .single();
  return {
    success: true,
    services: services || [],
    settings: settings || null,
  };
}

export async function getBookedSlotsAction(barberId: string, date: string) {
  const { data, error } = await supabaseAdmin
    .from("appointments")
    .select("appointment_time")
    .eq("barber_id", barberId)
    .eq("appointment_date", date)
    .in("status", ["pending", "confirmed", "rescheduled"]); // ORA E BLOCATĂ ȘI CÂND E RESCHEDULED!

  if (error) return { success: false, error: error.message };
  return {
    success: true,
    bookedTimes: data?.map((app) => app.appointment_time.slice(0, 5)) || [],
  };
}

export async function createClientAppointmentAction(data: any) {
  const { error } = await supabaseAdmin.from("appointments").insert([
    {
      barber_id: data.barberId,
      client_id: data.clientId,
      client_name: data.clientName,
      client_phone: data.clientPhone,
      service_name: data.serviceName,
      price: data.price,
      appointment_date: data.date,
      appointment_time: data.time,
      status: "pending",
    },
  ]);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function getClientActiveAppointmentAction(clientId: string) {
  const { data, error } = await supabaseAdmin
    .from("appointments")
    .select(
      `*, profiles!appointments_barber_id_fkey(barbershop_name, first_name, last_name)`,
    )
    .eq("client_id", clientId)
    .in("status", ["pending", "confirmed", "rescheduled"]) // ARATĂM ȘI DACĂ E REPROGRAMAT
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return { success: false, error: error.message };
  return { success: true, appointment: data };
}

export async function cancelClientAppointmentAction(appointmentId: string) {
  const { error } = await supabaseAdmin
    .from("appointments")
    .update({ status: "cancelled" })
    .eq("id", appointmentId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

// NOU: Când clientul Acceptă Reprogramarea Frizerului
export async function acceptClientRescheduleAction(
  appointmentId: string,
  barberId: string,
  clientName: string,
  clientPhone: string,
) {
  // Confirmăm și băgăm direct în agendă
  await syncClientToAgendaAction(barberId, clientName, clientPhone);
  const { error } = await supabaseAdmin
    .from("appointments")
    .update({ status: "confirmed" })
    .eq("id", appointmentId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}
