"use server";

import { createClient } from "@supabase/supabase-js";

// Folosim Service Role pentru a putea șterge useri din Auth
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// 1. Actualizare Profil (Nume și Telefon)
export async function updateClientProfileInfoAction(
  userId: string,
  data: { firstName: string; lastName: string; phone: string },
) {
  const { error } = await supabaseAdmin
    .from("profiles")
    .update({
      first_name: data.firstName,
      last_name: data.lastName,
      phone: data.phone,
    })
    .eq("id", userId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// 2. Ștergere Definitivă Cont Client
export async function deleteClientAccountAction(userId: string) {
  // Ștergem profilul (dacă e setat cascade, va șterge și programările lui, sau le lasă "orfane" în funcție de cum ai setat baza)
  await supabaseAdmin.from("profiles").delete().eq("id", userId);

  // Ștergem user-ul complet din sistemul de logare Supabase
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}
