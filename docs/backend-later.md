> Regulile de disponibilitate și modificare a calendarului sunt portate în migrarea `202611050003_booking_consistency.sql`. Verifică integrarea pe un proiect Supabase nou înainte de lansare, inclusiv Auth, Realtime și push pe telefon.

# Backend pregătit pentru o etapă ulterioară

Aplicație React + TypeScript + Vite, proiectată pentru telefon. Un singur salon/frizer, mai mulți clienți și programări. PWA instalabilă, găzduire statică pe Cloudflare Pages, backend Supabase. Proiectul vechi Next.js este disponibil în istoricul Git.

## Pornire locală

```bash
npm install
npm run dev
```

Fără configurare Supabase, **doar în dezvoltare**, aplicația pornește în demo. Conturile și programările demo sunt stocate local în browser. Confirmarea prin email și livrarea push necesită integrarea Supabase. Nu introduce date personale în demo.

Pentru demo din build-ul static setează explicit `VITE_DEMO_MODE=true`. În producție, lipsa configurării afișează o stare neconectată; nu simulează rezervări reale automat.

```bash
npm run build
npm run preview
npm test
```

## Ce este implementat

- Salon, categorii și servicii cu preț și durată.
- Înregistrare cu prenume, nume, telefon, email și parolă; confirmare email, autentificare persistentă, recuperare parolă și logout pe dispozitivul curent.
- Rezervare în doi pași, anulare, reprogramare și istoric păstrat.
- Agenda frizerului pe zile, filtrare, confirmare, finalizare, neprezentare și programări introduse manual.
- Listă de clienți, căutare și apelare telefonică.
- Editare servicii, arhivare, profil salon, program săptămânal, pauze și zile libere.
- Realtime și reconciliere la revenirea în aplicație/reconectare. Lipsa internetului nu declanșează logout explicit.
- PWA, abonare Web Push și coadă backend cu reîncercări. Trimiterea push necesită configurarea secțiunii dedicate.
- Fonturi și imagini servite local. Fără analytics sau SDK de publicitate.

Nu include SMS, plăți online, marketplace, recenzii sau remindere programate înaintea vizitei. Notificările implementate sunt pentru modificări de programări.

## Conectarea unui proiect Supabase NOU

1. Creează un proiect Free nou, preferabil într-o regiune UE. Nu rula migrarea în proiectul vechi.
2. Aplică fișierele din `supabase/migrations/` în ordinea numelui, prin SQL Editor sau Supabase CLI.
3. Copiază `.env.example` în `.env.local` și completează:

```dotenv
VITE_SUPABASE_URL=https://PROIECT-NOU.supabase.co
VITE_SUPABASE_ANON_KEY=CHEIA-PUBLICA-ANON-SAU-PUBLISHABLE
VITE_DEMO_MODE=false
VITE_VAPID_PUBLIC_KEY=
```

Nu pune niciodată `service_role`, o cheie secretă sau cheia VAPID privată într-o variabilă `VITE_*`. Aceste variabile sunt publice în browser.

4. În Auth → URL Configuration setează Site URL la adresa aplicației. Adaugă redirecturile locale și de producție, inclusiv `/?recovery=1`, pentru confirmare și resetare.
5. În Auth activează confirmarea emailului, configurează parola minimă la 8 caractere și un furnizor SMTP propriu. Serviciul implicit Supabase este limitat la testare. Pentru pilot, un cont Gmail dedicat, cu 2FA și parolă de aplicație, poate fi configurat ca SMTP (`smtp.gmail.com`, port 465). Contul trebuie să permită parole de aplicație; verifică livrarea la Gmail și Outlook. Gmail are limite și nu înlocuiește un serviciu tranzacțional la volum mare.
6. Înregistrează contul frizerului prin formular și confirmă emailul.
7. Atribuie proprietarul DOAR din SQL Editor (înlocuiește emailul):

```sql
update public.barbers
set owner_id = (select id from auth.users where email = 'EMAILUL-FRIZERULUI')
where id = '11111111-1111-4111-8111-111111111111';
```

Verifică să fie actualizat un cont existent, nu să rămână `owner_id` null. Nu există alegerea rolului sau creare de administratori din browser. Clienții nu își pot acorda drepturi prin metadata.

8. Repornește Vite. Din contul frizerului completează numele, adresa, telefonul, prețurile și programul. Serviciile inițiale sunt exemple editabile, nu tarife validate cu frizerul.
9. Confirmă în Dashboard → Database → Publications că `appointments` este în `supabase_realtime` (migrarea o adaugă).

## Modelul de date

```text
auth.users 1 ── 1 profiles
barbers    1 ── N profiles (clienți)
barbers    1 ── N services
barbers    1 ── N working_hours / days_off
barbers    1 ── N appointments
profiles   1 ── N appointments
services   1 ── N appointments
auth.users 1 ── N push_subscriptions
```

`barbers` are o constrângere pentru un singur rând. Proprietarul este identificat prin `owner_id`, separat de informațiile editabile din profil. Programările manuale pot avea `client_id = null`, cu numele și telefonul introduse de frizer. Programările conturilor reale aparțin profilului autentificat.

Prețurile se stochează în bani întregi (`price_cents`); în UI se afișează lei. Programarea păstrează un snapshot al numelui serviciului, prețului, duratei și datelor clientului. Arhivarea serviciului nu șterge istoricul.

Orele se stochează ca `timestamptz`. Programul de lucru se interpretează în `Europe/Bucharest`, inclusiv la schimbarea orei. Disponibilitatea acoperă următoarele 60 de zile, în pași egali cu durata serviciului din fiecare interval liber. Se pot alege ore cu minimum 15 minute înainte de vizită. Durata completă, pauzele, concediile și sărbătorile selectate sunt verificate pe server. Maximum 5 rezervări viitoare active/client.

Exclusion constraint pe intervale `[start,end)` împiedică suprapunerile. RPC-urile de rezervare, reprogramare, anulare și modificare a programului folosesc același lock tranzacțional. Frizerul vede programările afectate înainte să confirme o schimbare de calendar. Serverul verifică din nou agenda, păstrează anulările în istoric și notifică utilizatorii afectați. Dacă o vizită este în curs, schimbarea este respinsă. O propunere a frizerului păstrează ora inițială până la acceptarea clientului. Reprogramarea păstrează prețul și durata inițiale.

## Push fără abonament plătit

1. Generează perechea VAPID cu `node scripts/generate-vapid.mjs`. Păstrează cheia privată în managerul de secrete, nu în repository.
2. Pune cheia PUBLICĂ în `VITE_VAPID_PUBLIC_KEY` și reconstruiește frontendul.
3. Adaugă în Supabase Edge Function Secrets:
   - `VAPID_PUBLIC_KEY`
   - `VAPID_PRIVATE_KEY`
   - `VAPID_SUBJECT` (de exemplu `mailto:CONTACTUL-SALONULUI`)
   - `PUSH_DISPATCH_SECRET` (secret lung, aleator, separat de cheile Supabase)
4. Deploy: `supabase functions deploy push-dispatch`. `supabase/config.toml` dezactivează verificarea JWT a gateway-ului pentru această funcție; funcția verifică obligatoriu secretul dedicat din Authorization. Nu este un endpoint public neprotejat.
5. Creează în Vault `atelier_project_url` și `atelier_dispatch_secret`, conform comentariilor din `supabase/push-setup.sql`; rulează acel fișier după deploy. Un trigger trimite imediat coada prin `pg_net`; cron reîncearcă erorile în fundal.
6. Frizerul instalează PWA pe telefon, intră în cont și apasă Contul meu → Activează notificările. Pe iPhone, folosește aplicația adăugată pe ecranul principal.
7. Fă o rezervare de pe ALT cont/dispozitiv. Verifică notificarea cu telefonul frizerului blocat și deschiderea agendei prin atingere.

Cheia administrativă este folosită exclusiv în Edge Function, din secretele runtime Supabase. Browserul vede doar propria subscripție. Endpointurile push sunt filtrate la furnizorii de browser cunoscuți pentru a preveni SSRF. Mesajele nu includ nume/telefon pe ecranul blocat. Provider receipt nu garantează afișarea imediată: setările telefonului și conexiunea contează. Reîncercările pot produce livrare repetată; tag-ul notificării este stabil pe programare.

`notification_outbox` păstrează erorile. După 8 încercări nereușite, notificarea rămâne pentru inspecție și nu este retrimisă automat. Nu există o afirmație de livrare dacă dispozitivul nu are subscripție.

## Cloudflare Pages Free

- Root directory: rădăcina repository-ului.
- Build command: `npm run build`
- Output directory: `dist`
- Configurează variabilele publice de mai sus în Pages, cu `VITE_DEMO_MODE=false` pentru aplicația reală.
- Subdomeniul `*.pages.dev` este suficient; nu este necesară cumpărarea unui domeniu.
- `_redirects` deservește aplicația pe rutele SPA; `_headers` setează antetele de bază.

Nu sunt necesare servere Node permanente sau Cloudflare Workers plătit. Vercel Hobby are restricții de utilizare comercială; ținta acestui proiect este Cloudflare Pages.

## Verificări

`npm run build` verifică TypeScript și buildul static. `npm test` verifică datele în fusul României, DST, limitele anulării, suprapunerea intervalelor și validarea endpointurilor push.

Testele de integrare folosesc un PostgreSQL **temporar local**, separat de Supabase:

```bash
# Exemplu Linux, cu PostgreSQL 18 instalat; port rezervat testelor.
/usr/lib/postgresql/18/bin/initdb -D /tmp/atelier-studio-pg -A trust --encoding=UTF8
/usr/lib/postgresql/18/bin/pg_ctl -D /tmp/atelier-studio-pg -l /tmp/atelier-studio-pg.log -o '-k /tmp -p 55438 -h 127.0.0.1' start
python3 tests/database.test.py
/usr/lib/postgresql/18/bin/pg_ctl -D /tmp/atelier-studio-pg stop
```

Scriptul creează și elimină propria bază. Simulează doar structura Auth necesară testelor SQL, nu întregul serviciu Supabase Auth. Verifică și izolarea clienților, confirmarea, propunerile de reprogramare, istoricul, inboxul, modificarea calendarului și două rezervări concurente. Nu rula bootstrap-ul de test în Supabase.

## Înainte de primul client real

Conectează proiectul nou și SMTP, verifică înscrierea/confirmarea/resetarea reală pe telefon, testează persistența sesiunii după închidere și reconectare și validează push pe dispozitivul frizerului. Aceste fluxuri externe nu sunt certificate de demo sau de testul PostgreSQL local.

Completează datele salonului și informarea de confidențialitate cu operatorul real, contactul, retenția și procesul de soluționare a cererilor. Stabilește exporturi de siguranță și urmărește cotele Free. Un plan gratuit nu garantează disponibilitate permanentă; Supabase poate suspenda proiectele cu activitate redusă.

## Referințe de implementare

- MERO: doar experiența publică de servicii → dată/oră → confirmare a fost inspectată; nu au fost făcute rezervări în serviciul original și nu a fost accesat codul său privat.
- [craft-anything](https://github.com/storytold/craft-anything): README evaluat; CLI nu era instalat și nu a fost executat. Implementarea este proprie.
- [frontend-design](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md): ghid de design consultat; interfață orientată spre produs, gradiente și verificare mobilă.
- Fotografia `public/barber.webp` provine din assetul `public/hero.jpg` al repository-ului inițial, optimizată pentru web.
