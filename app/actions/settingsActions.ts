"use server";

import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function updateProfileInfoAction(
  userId: string,
  data: {
    firstName: string;
    lastName: string;
    barbershopName: string;
    phone: string;
    diploma: string;
  },
) {
  const { error } = await supabaseAdmin
    .from("profiles")
    .update({
      first_name: data.firstName,
      last_name: data.lastName,
      barbershop_name: data.barbershopName,
      phone: data.phone,
      diploma: data.diploma, // EXACT cum e în baza de date
    })
    .eq("id", userId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function deleteBarberAccountAction(userId: string) {
  await supabaseAdmin.from("profiles").delete().eq("id", userId);
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}
