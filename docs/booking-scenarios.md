# Scenarii frizer–client verificate

Acest raport se referă la prototipul local. Nu certifică backendul Supabase neconectat sau livrarea push/email/SMS pe telefoane.

| Acțiune | Ce vede clientul | Ce vede frizerul / ce se întâmplă |
| --- | --- | --- |
| Rezervare cu confirmare automată | Programare confirmată și notificare în cont | Programarea în agendă și notificare nouă |
| Rezervare fără confirmare automată | Cerere în așteptare, notificare explicită | Cerere de confirmat |
| Frizerul confirmă cererea | Status confirmat și notificare | Cererea trece în confirmată |
| Clientul anulează în termen | Programare anulată în istoric, cu motiv | Notificare de anulare; ora este eliberată |
| Frizerul anulează | Notificare de anulare și istoric cu motiv | Status anulat, istoric păstrat |
| Zi liberă după o rezervare, inclusiv lunea viitoare | Notificare cu serviciu, dată, oră și motiv; programarea trece în istoric | Previzualizare a anulărilor înainte de confirmare; ziua este închisă |
| Concediu cu mai multe rezervări | Sunt anulate numai vizitele active din interval | Lista tuturor programărilor afectate; salvare comună a zilelor, anulărilor și notificărilor |
| Client introdus manual, fără cont | Este contactat telefonic; nu se pretinde că a primit notificare | Telefon în previzualizare și istoric |
| Frizerul activează o sărbătoare după rezervare | Notificare cu sărbătoarea ca motiv | Aceeași confirmare cu lista vizitelor afectate |
| Frizerul introduce o pauză sau scurtează programul | Numai rezervările incompatibile sunt anulate și notificate | Previzualizare înainte de salvare; celelalte rezervări rămân |
| Revenire parțială sau totală din concediu | Zilele redeschise reapar dacă programul și sărbătorile permit; poate face o rezervare nouă | Restul concediului rămâne închis; vizitele anulate și motivele lor rămân în istoric |
| Debifarea unei sărbători | Ziua se poate redeschide, fără reactivarea rezervărilor anulate | Nu se trimit notificări de rezervare sau redeschidere în masă |
| Reprogramare de către client | Noua dată și oră, cu prețul și durata originale | Notificare de reprogramare, ora veche eliberată |
| Reprogramare propusă de frizer pentru un client cu cont | Clientul vede ambele ore și poate accepta sau refuza. La refuz sau expirare păstrează ora inițială. | Frizerul primește răspunsul. La acceptare se verifică disponibilitatea, apoi se mută programarea cu durata și prețul inițiale. |
| Mutare în concediu, pauză, weekend închis, sărbătoare sau peste alt client | Ora este refuzată; se cere o altă alegere | Nu se schimbă rezervarea existentă |
| Anulare/reprogramare de client prea târziu | Este îndrumat să contacteze frizerul | Frizerul poate gestiona anularea; o vizită începută nu se reprogramează |
| Rezervare anulată, finalizată sau neprezentare | Rămâne în istoric | Nu poate fi reactivată sau reprogramată |
| Finalizare/neprezentare înaintea orei de început | Acțiunea este refuzată | Nu se poate închide o vizită viitoare |
| Vizită în curs și încercare de închidere a intervalului | Vizita în curs nu este anulată prin concediu/pauză | Modificarea este refuzată, fără anulări parțiale |
| Serviciu arhivat după rezervare | Istoricul și rezervarea rămân; reprogramarea păstrează durata și prețul | Nu se mai acceptă rezervări noi pentru serviciul arhivat |
| Preț/durată schimbate cât timp formularul este deschis | Se actualizează serviciul și se cere reverificarea orei; confirmarea veche este refuzată | Prețul vizitelor deja rezervate nu este rescris |
| Aceeași oră solicitată de doi clienți | O singură cerere reușește | Scrierile locale folosesc același Web Lock, unde acesta este disponibil |
| O rezervare nouă apare după previzualizarea concediului | Nu este anulată fără ca frizerul să o fi văzut | Salvarea este refuzată până la reverificarea listei |
| Programarea a fost mutată după deschiderea confirmării | Se cer verificarea noilor detalii și o nouă confirmare | Modificările concurente nu sunt suprascrise pe baza unei previzualizări vechi |
| Clientul ține calendarul deschis în altă filă | Ziua și orele se actualizează la schimbările locale; selecția devenită invalidă se șterge | Salvarea rămâne verificată pe starea curentă |
| Clientul revine după ce fila a fost în fundal | Calendarul, rezervările și notificările sunt recitite | Nu se bazează exclusiv pe o listă de ore veche |

## Dovezi de verificare

- `tests/client-flows.test.ts`: scenarii integrate pentru două identități, calendar, notificări, istoric, concurență și previzualizări învechite.
- `tests/calendar.test.ts`: intervale, pauze, sărbători, suprapuneri, revenire parțială, date invalide și vizite în curs.
- Verificare prin interfața reală a aplicației pe originea locală separată `127.0.0.1`: clientul rezervă luni 9 noiembrie 2026 la 09:30; frizerul închide ziua; clientul găsește anularea și motivul în notificări și istoric; calendarul unui vizitator deja deschis pierde ziua; după deblocare ziua și ora reapar, iar vizita veche rămâne anulată.
- Verificarea din browser nu a modificat datele de lucru ale originii `localhost`.

Pentru verificarea pe dispozitive diferite trebuie conectat backendul, portate regulile în tranzacțiile serverului și validate separat autentificarea, canalele realtime și livrarea notificărilor. Notificările locale din cont funcționează fără a pretinde livrarea unui push sau a unui email.
