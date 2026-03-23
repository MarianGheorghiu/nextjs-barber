# ✂️ BarberApp - Premium Salon Management Platform

BarberApp este un MVP (Minimum Viable Product) robust și scalabil, creat pentru a digitaliza și eficientiza complet experiența dintr-un salon de frizerie / barbershop.

Aplicația este construită folosind **Next.js** (App Router) pentru un frontend ultra-rapid și un SEO excelent, bazându-se pe **Supabase** pentru backend (Autentificare sigură, Bază de Date PostgreSQL, Server Actions și Row Level Security). Interfața grafică este complet personalizată cu Tailwind CSS, urmărind un design de lux tip **"Liquid Glass Premium"** (sticlă mată, reflexii ambientale, animații fluide și modale customizate).

---

## 🌟 Funcționalități de Bază pe Roluri

Aplicația folosește un sistem de rutare și protecție bazat pe 3 roluri distincte:

### 👑 1. Admin (Centrul de Comandă)

Rolul de administrator gestionează platforma la nivel macro, având acces la statistici globale și managementul echipei.

- **Dashboard Statistic:** Vizualizare încasări globale lunare, număr total de clienți noi și membri activi ai echipei.
- **Managementul Echipei (Frizeri):** \* Înregistrarea de noi frizeri direct din platformă (creare automată de conturi cu email corporativ).
  - Editarea numelui locațiilor (Barbershop).
  - Suspendarea temporară sau activarea conturilor frizerilor.
  - Ștergerea definitivă a conturilor.
- **Baza de Clienți:** Vizualizare globală a tuturor clienților de pe platformă, cu opțiuni de moderare.

### 💈 2. Barber (Panoul Profesionistului)

Frizerii au la dispoziție un set complet de unelte pentru a-și gestiona agenda, serviciile și baza proprie de clienți.

- **Agenda Zilei & Kanban Săptămânal:** Vizualizare detaliată a programărilor (În Așteptare, Confirmat, Anulat, Reprogramat).
- **Control Programări:** Confirmarea cererilor, anularea sau trimiterea de propuneri de reprogramare către clienți direct din interfață.
- **Setări Program de Lucru:** \* Definirea orelor de lucru pentru fiecare zi a săptămânii.
  - Integrare automată cu Sărbătorile Legale (fixe) și Sărbătorile Religioase (mobile) pentru blocarea automată a calendarului.
  - Blocare manuală pentru zile de concediu / zile libere.
- **Catalog Servicii:** Adăugare, editare, ștergere servicii. Sistem integrat de discounturi procentuale (calculează automat prețul final pentru client).
- **Registru Clienți:** Agendă permanentă cu toți clienții care i-au trecut pragul. Posibilitatea de a bloca (ban) clienții neserioși.
- **Setări Cont:** Actualizare date personale, nume salon, diplomă/certificare, telefon, securitate (schimbare parolă) și ștergere definitivă a contului.

### 📱 3. Client (Portalul de Rezervări)

O experiență premium, rapidă și intuitivă pentru clienții finali.

- **Flux de Rezervare Fluid:** 1. Alegerea locației/frizerului. 2. Selectarea serviciului dorit. 3. Alegerea datei și a orei (orele ocupate sau blocate de frizer dispar automat). 4. Confirmarea rezumatului de plată.
- **Management Programare Activă:** Vizualizarea statusului programării curente. Posibilitatea de a o anula sau de a accepta/refuza o propunere de reprogramare venită de la frizer.
- **Locații Favorite:** Salvarea frizerilor preferați pentru o rezervare ultra-rapidă (Quick Book) dintr-un meniu dedicat.
- **Istoric Complet:** Tabel detaliat cu toate vizitele anterioare, statusul lor și sumele plătite.
- **Setări Cont:** Modificare profil, securitate și opțiune de ștergere definitivă a contului (GDPR compliance).

---

## 🛠 Tech Stack

- **Framework:** [Next.js](https://nextjs.org/) (React) cu App Router.
- **Backend as a Service:** [Supabase](https://supabase.com/) (PostgreSQL, Supabase Auth, Supabase Server Actions).
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) (Efecte avansate de backdrop-blur, gradienți și modale customizate).
- **TypeScript:** Tipizare strictă pentru o arhitectură curată, scalabilă și lipsită de erori.

---

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev

```
