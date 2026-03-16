"use server";

import { createClient } from "@supabase/supabase-js";

// Folosim Service Role Key pentru drepturi absolute (necesar pentru ștergerea contului de Auth)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Actualizează numele și frizeria în tabelul `profiles`
export async function updateProfileInfoAction(
  userId: string,
  data: { firstName: string; lastName: string; barbershopName: string },
) {
  const { error } = await supabaseAdmin
    .from("profiles")
    .update({
      first_name: data.firstName,
      last_name: data.lastName,
      barbershop_name: data.barbershopName,
    })
    .eq("id", userId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// Șterge complet contul frizerului din Auth și din Baza de date
export async function deleteBarberAccountAction(userId: string) {
  // 1. Ștergem profilul (dacă ai setat "On Delete Cascade" în Supabase, va șterge și programările)
  await supabaseAdmin.from("profiles").delete().eq("id", userId);

  // 2. Ștergem utilizatorul din sistemul principal de autentificare Supabase
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}
