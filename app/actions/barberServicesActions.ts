"use server";

import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// 1. Adaugă serviciu nou
export async function addServiceAction(data: any) {
  const { error } = await supabaseAdmin.from("services").insert([data]);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

// 2. Editează serviciu
export async function updateServiceAction(serviceId: string, data: any) {
  const { error } = await supabaseAdmin
    .from("services")
    .update(data)
    .eq("id", serviceId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

// 3. Șterge serviciu
export async function deleteServiceAction(serviceId: string) {
  const { error } = await supabaseAdmin
    .from("services")
    .delete()
    .eq("id", serviceId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}
