"use server";

import { createClient } from "@supabase/supabase-js";

// Inițializăm Supabase o singură dată, cu drepturi absolute, pentru toate funcțiile de mai jos
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// 1. Acțiune pentru schimbarea numelui
export async function updateShopNameAction(barberId: string, newName: string) {
  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ shop_name: newName })
    .eq("id", barberId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// 2. Acțiune pentru suspendare/activare
export async function toggleStatusAction(barberId: string, newStatus: string) {
  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ status: newStatus })
    .eq("id", barberId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// 3. Acțiune pentru ștergere definitivă
export async function deleteBarberAction(barberId: string) {
  // Șterge din auth.users, iar baza de date va șterge automat și din profiles (ON DELETE CASCADE)
  const { error } = await supabaseAdmin.auth.admin.deleteUser(barberId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// Adaugă asta la finalul fișierului app/actions/adminBarberActions.ts

export async function addBarberFromAdminAction(data: {
  firstName: string;
  lastName: string;
  shopName: string;
  phone: string;
  diploma: string;
  emailPrefix: string;
  password: string;
}) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // Trebuie să ai această cheie în .env.local
  );

  const fullEmail = `${data.emailPrefix.trim().toLowerCase()}@mcorp.com`;
  const cleanPhone = data.phone.replace(/\s/g, "");

  // Folosim admin.createUser pentru a NU deloga adminul curent
  const { data: userData, error } = await supabaseAdmin.auth.admin.createUser({
    email: fullEmail,
    password: data.password,
    email_confirm: true, // Îl confirmăm automat
    user_metadata: {
      first_name: data.firstName.trim(),
      last_name: data.lastName.trim(),
      barbershop_name: data.shopName.trim(),
      phone: cleanPhone,
      diploma: data.diploma.trim(),
      role: "barber",
    },
  });

  if (error) return { success: false, error: error.message };
  return { success: true, user: userData.user };
}
