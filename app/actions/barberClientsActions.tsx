"use server";

import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Sincronizare: Adaugă clientul în Agendă dacă nu există deja
export async function syncClientToAgendaAction(
  barberId: string,
  clientName: string,
  clientPhone: string,
) {
  if (!clientPhone || clientPhone.trim() === "")
    return { success: true, status: "ignored" };

  // Verificăm dacă există deja în agendă după numărul de telefon
  const { data: existingClient } = await supabaseAdmin
    .from("barber_clients")
    .select("id, status")
    .eq("barber_id", barberId)
    .eq("phone", clientPhone)
    .maybeSingle();

  if (existingClient) {
    if (existingClient.status === "blocked") {
      return {
        success: false,
        isBlocked: true,
        error: "Acest client este pe lista ta de blocați!",
      };
    }
    return { success: true, status: "exists" };
  }

  // Nu există, deci îl salvăm permanent în agendă
  const { error } = await supabaseAdmin.from("barber_clients").insert([
    {
      barber_id: barberId,
      name: clientName,
      phone: clientPhone,
      status: "active",
    },
  ]);

  if (error) return { success: false, error: error.message };
  return { success: true, status: "added" };
}

// Schimbă statusul (Blochează / Deblochează)
export async function toggleClientStatusAction(
  clientId: string,
  currentStatus: string,
) {
  const newStatus = currentStatus === "active" ? "blocked" : "active";
  const { error } = await supabaseAdmin
    .from("barber_clients")
    .update({ status: newStatus })
    .eq("id", clientId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// Șterge definitiv din agendă
export async function deleteClientAction(clientId: string) {
  const { error } = await supabaseAdmin
    .from("barber_clients")
    .delete()
    .eq("id", clientId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}
