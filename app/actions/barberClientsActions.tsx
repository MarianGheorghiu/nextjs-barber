"use server";

import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Tragem toți clienții unici (grupându-i după telefon) și vedem dacă sunt blocați
export async function getUniqueClientsAction(barberId: string) {
  // 1. Tragem toate programările CONFIRMATE (ca să avem numele și telefoanele)
  const { data: apps } = await supabaseAdmin
    .from("appointments")
    .select("client_name, client_phone")
    .eq("barber_id", barberId)
    .eq("status", "confirmed")
    .order("created_at", { ascending: false }); // Cei mai recenți primii

  // 2. Tragem lista de numere blocate
  const { data: blockedList } = await supabaseAdmin
    .from("blocked_clients")
    .select("phone")
    .eq("barber_id", barberId);

  const blockedPhones = new Set(blockedList?.map((b) => b.phone) || []);

  // 3. Grupăm ca să scoatem dublurile (ex: Ion a fost de 5 ori, îi luăm ultimul nume)
  const uniqueClientsMap = new Map();

  if (apps) {
    apps.forEach((app) => {
      // Ignorăm programările fără telefon
      if (!app.client_phone) return;

      if (!uniqueClientsMap.has(app.client_phone)) {
        uniqueClientsMap.set(app.client_phone, {
          id: app.client_phone, // Folosim numărul ca ID unic
          name: app.client_name,
          phone: app.client_phone,
          status: blockedPhones.has(app.client_phone) ? "blocked" : "active",
        });
      }
    });
  }

  return Array.from(uniqueClientsMap.values());
}

// Blochează un client (Adaugă numărul în blacklist)
export async function blockClientAction(barberId: string, phone: string) {
  const { error } = await supabaseAdmin
    .from("blocked_clients")
    .insert([{ barber_id: barberId, phone }]);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

// Deblochează (Șterge numărul din blacklist)
export async function unblockClientAction(barberId: string, phone: string) {
  const { error } = await supabaseAdmin
    .from("blocked_clients")
    .delete()
    .eq("barber_id", barberId)
    .eq("phone", phone);
  if (error) return { success: false, error: error.message };
  return { success: true };
}
