# Cristi Barber Shop — prototip UI local

În această etapă lucrăm exclusiv la interfață și la datele locale. Nu este conectat un proiect Supabase și nu se trimit emailuri sau notificări reale.

## Pornire

```bash
npm install
npm run dev
```

Deschide `http://localhost:5173/`. Configurarea locală folosește `VITE_DEMO_MODE=true`.

## Client

Clientul vede salonul și serviciile. La **Contul meu → Intră în cont → Creează un cont** completează prenumele, numele, telefonul, emailul și parola. Formularul creează exclusiv un cont de client. Sesiunea este păstrată în acest browser.

Poate face o rezervare, să o reprogrameze sau să o anuleze. Orele încep la 09:30 și se calculează după durata serviciului: 30 min → 09:30, 10:00; 40 min → 09:30, 10:10. Pauzele și rezervările existente împart ziua în intervale libere. Nu există butoane de alegere a rolului sau acces la agenda frizerului în fluxul clientului.

## Cristi

Intră din pagina principală, folosind butonul **Intră în cont**. Contul lui Cristi deschide automat agenda frizerului; clienții rămân în zona lor de programări. Ruta `/frizer` rămâne disponibilă direct.

Cont LOCAL de prezentare, creat automat în acest browser:

- Email: `cristi@barber.com`
- Parolă: `1`

În Salon → Program de lucru nu există o pauză implicită. Frizerul o activează pentru fiecare zi și alege orele din selecturile în format 24h, în pași de 5 minute. Programul existent salvat în browser este păstrat până îl editează. Înainte de salvare vede rezervările incompatibile cu noul program sau pauza; după confirmare acestea se anulează, rămân în istoric și primesc notificări locale. O programare în curs nu se anulează prin acest flux.

În Salon → Zile libere poate bloca o zi sau un concediu de până la 90 de zile. Înainte de confirmare vede programările care vor fi anulate și clienții fără cont pe care trebuie să îi sune. Clienții cu cont primesc notificări locale în secțiunea cu clopoțel. Rezervările anulate rămân în istoric; deblocarea unei zile nu le reactivează. **Modifică / deblochează** permite alegerea unui subinterval din concediu. Restul zilelor rămân blocate; programul săptămânal și sărbătorile au în continuare efect. Redeschiderea nu trimite notificări în masă și nu reactivează rezervări.

În Salon → Sărbători poate selecta toate sărbătorile sau alege individual sărbătorile legale și sărbătorile ortodoxe suplimentare în care nu lucrează. Paștele, Vinerea Mare, Înălțarea și Rusaliile se calculează pentru fiecare an. Zilele săptămânale închise, concediile și sărbătorile selectate dispar din calendarul clientului.

Parola simplă `1` este exclusiv pentru acest cont de test local; înregistrarea clienților cere în continuare minimum 8 caractere. Contul local vechi este actualizat automat, păstrând aceeași identitate și datele existente.

Acestea sunt credențiale publice de test, fără valoare în afara prototipului. Cristi are agenda, clienții, serviciile, programul de lucru, pauzele și zilele libere. Un cont de client nu poate intra în această zonă prin formularul de autentificare.

Conturile locale sunt o simulare pentru verificarea UI, nu autentificare sigură pentru producție. Parolele se păstrează ca digesturi PBKDF2 cu salt, nu în clar. Folosește date fictive. Ștergerea datelor browserului șterge și conturile/progrămările locale. Autentificarea pe telefoane folosește Web Crypto și necesită localhost sau HTTPS.

## Design

Direcția curentă este dark glass, cu lumină portocalie, text alb lizibil, servicii în rânduri și rezervare în sheet-uri ancorate jos. Mobile-first, text de bază de 16px, butoane mari și navigație de jos. Pe mobil nu există hamburger sau un al doilea meniu sus; pe desktop există navigație orizontală.

Selecturile au liste proprii ancorate imediat sub câmp, suprafață glass, opțiune bifată, scroll și navigare prin tastatură. Săgeata este la 20px în interior. Zilele au minimum 70px lățime într-un rând glisabil, iar săgețile de săptămână au 44px. Preferința de reducere a mișcării este respectată.

## Verificări

```bash
npm run build
npm test
```

Testele locale verifică separarea contului lui Cristi de clienți, autentificarea persistentă, parolele stocate ca digesturi, orele României, schimbarea orei și suprapunerea intervalelor.

## Etapa următoare

După validarea UI, conectăm un proiect Supabase nou și configurăm autentificarea, emailurile și push. Codul de backend pregătit anterior și instrucțiunile tehnice sunt în [docs/backend-later.md](docs/backend-later.md). Nu trebuie executate pentru a testa interfața locală.

Aplicația veche Next.js a fost eliminată cu acordul utilizatorului; poate fi recuperată din istoricul Git. `craft-anything` a fost evaluat din README, dar nu a fost instalat/executat. Experiența publică MERO a fost inspectată fără crearea vreunei rezervări acolo.

Lista include și Floriile, Izvorul Tămăduirii, Sfinții Trei Ierarhi, Nașterea și Tăierea Capului Sfântului Ioan, Sfântul Ilie, Acoperământul Maicii Domnului, Sfânta Parascheva, Dimitrie cel Nou și Sfântul Ștefan. Un hram local sau o altă zi se poate adăuga din Zile libere. Selecția se repetă anual; schimbarea anului afișează datele, fără să schimbe politica.

Calendarul folosește o politică editabilă a salonului, nu o presupunere că frizerul este obligat să închidă în toate zilele enumerate. Referințe pentru date: [calendarul Doxologia](https://doxologia.ro/calendar-ortodox), [lista sărbătorilor legale](https://legislatie.just.ro/Public/DetaliiDocument/290668).


## Agenda și controalele de disponibilitate

Agenda frizerului afișează zilele de lucru; săgețile sar peste zilele săptămânale închise, concedii și sărbătorile selectate. Calendarul propriu al aplicației este ancorat și centrat sub câmp, cu suprafață glass, cifre de 16px și panou compact de 264px. Nu mai folosește popup-ul nativ al browserului.

Căutarea din agendă verifică toate datele după client, telefon, serviciu, dată sau oră, păstrând filtrul de status. Cardul afișează doar ora sosirii. Serviciile salonului, programul săptămânal, clienții și sărbătorile au căutare; aceasta ignoră diacriticele și majusculele. Căutările au un singur buton de ștergere.

La **Zi liberă** există un singur selector de dată; **Concediu** păstrează începutul și sfârșitul. Selecturile cu multe opțiuni includ căutare. Logout este în header, separat de singurul acces **Contul meu** din navigație. Acțiunile programărilor și controalele nebifate folosesc aceeași paletă glass.
