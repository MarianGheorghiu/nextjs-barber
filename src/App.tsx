import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, Bell, CalendarDays, Check, Home as HomeIcon, LogOut, RefreshCw, Scissors, Settings2, ShieldCheck, Smartphone, UserRound, Users, WifiOff, X } from 'lucide-react';
import { Salon } from './components/Salon';
import { Appointments } from './components/Appointments';
import { Account } from './components/Account';
import { Clients } from './components/Clients';
import { Settings } from './components/Settings';
import { AuthModal } from './components/AuthModal';
import { Booking } from './components/Booking';
import { NotificationInbox } from './components/NotificationInbox';
import { Modal } from './components/Modal';
import { api, friendlyError } from './lib/api';
import { demoMode, supabase } from './lib/supabase';
import { disableCurrentPush } from './lib/push';
import { localSession, localSignOut, prepareLocalOwner } from './lib/local-auth';
import { DEFAULT_CALENDAR_POLICY } from './lib/calendar';
import type { Appointment, Barber, CalendarPolicy, DayOff, Identity, LocalNotification, Profile, Schedule, Service, View } from './lib/types';

const ownerPortal = window.location.pathname.startsWith('/frizer');
export default function App() {
  const [barber, setBarber] = useState<Barber | null>(null); const [services, setServices] = useState<Service[]>([]); const [schedule, setSchedule] = useState<Schedule[]>([]);
  const [user, setUser] = useState<Identity | null>(() => demoMode ? localSession() : null);
  const [daysOff, setDaysOff] = useState<DayOff[]>([]); const [calendarPolicy, setCalendarPolicy] = useState<CalendarPolicy>(DEFAULT_CALENDAR_POLICY); const [notifications, setNotifications] = useState<LocalNotification[]>([]); const [inbox, setInbox] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null); const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [view, setView] = useState<View>(() => ownerPortal || new URLSearchParams(location.search).get('view') === 'appointments' ? 'appointments' : 'home');
  const [notificationError, setNotificationError] = useState('');
  const [linkedAppointment, setLinkedAppointment] = useState<{ id: string; openedAt: number }>();
  const [cancelAppointmentId, setCancelAppointmentId] = useState<string>();
  const [auth, setAuth] = useState(false); const [recovery, setRecovery] = useState(false); const [install, setInstall] = useState(false); const [privacy, setPrivacy] = useState(false);
  const [booking, setBooking] = useState<{ service?: Service; appointment?: Appointment } | null>(null); const [error, setError] = useState(''); const [toast, setToast] = useState(''); const [online, setOnline] = useState(navigator.onLine); const [refreshing, setRefreshing] = useState(true); const request = useRef(0);
  const scrollArea = useRef<HTMLDivElement>(null);
  const actualOwner = !!user && user.id === barber?.owner_id;
  const owner = actualOwner && ownerPortal;
  useEffect(() => { if (actualOwner && !ownerPortal) location.replace('/frizer'); }, [actualOwner]);
  const refresh = useCallback(async () => {
    const version = ++request.current; setRefreshing(true);
    try {
      const data = await api.publicData();
      if (version !== request.current) return;
      setBarber(data.barber); setServices(data.services); setSchedule(data.schedule); setDaysOff(data.daysOff); setCalendarPolicy(data.calendarPolicy);
      if (user) {
        const [profileResult, appointmentResult, notificationResult] = await Promise.allSettled([
          api.profile(user.id),
          api.appointments(user.id, data.barber.owner_id === user.id),
          api.notifications(user.id),
        ]);
        if (version !== request.current) return;
        if (profileResult.status === 'fulfilled') setProfile(profileResult.value);
        if (appointmentResult.status === 'fulfilled') setAppointments(appointmentResult.value);
        if (notificationResult.status === 'fulfilled') {
          setNotifications(notificationResult.value);
          setNotificationError('');
        } else {
          setNotificationError('Notificările nu au putut fi încărcate. Încearcă din nou.');
        }
        if (appointmentResult.status === 'rejected') throw appointmentResult.reason;
        if (profileResult.status === 'rejected') throw profileResult.reason;
      } else {
        setProfile(null);
        setAppointments([]);
        setNotifications([]);
        setNotificationError('');
      }
      setError('');
    } catch (e) { if (version === request.current) setError(friendlyError(e)); }
    finally { if (version === request.current) setRefreshing(false); }
  }, [user?.id]);
  useEffect(() => { void refresh(); return () => { request.current++; }; }, [refresh]);
  useEffect(() => { if (demoMode) void prepareLocalOwner().catch(e => setError(friendlyError(e))); }, []);
  useEffect(() => {
    if (!supabase) return;
    let active = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => { if (!active) return; setUser(session?.user ?? null); if (event === 'PASSWORD_RECOVERY') { setRecovery(true); setAuth(true); } });
    supabase.auth.getSession().then(({ data, error }) => { if (!active) return; if (error) setError(friendlyError(error)); else setUser(data.session?.user ?? null); });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);
  useEffect(() => {
    if (!supabase) return;
    const channel = supabase.channel(`salon-${user?.id??'public'}`).on('postgres_changes', { event: '*', schema: 'public', table: 'appointments', filter: owner ? `barber_id=eq.${barber!.id}` : user ? `client_id=eq.${user.id}` : undefined }, () => { void refresh(); }).subscribe();
    // Reconcile after sleep / websocket loss as well as realtime updates.
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible' && navigator.onLine) void refresh(); }, 60000);
    return () => { void supabase!.removeChannel(channel); clearInterval(timer); };
  }, [user?.id, owner, barber?.id, refresh]);
  useEffect(() => {
    const sync = () => { void refresh(); };
    const visible = () => { if(document.visibilityState==='visible')void refresh(); };
    const connection = () => { setOnline(navigator.onLine); if (navigator.onLine) void refresh(); };
    window.addEventListener('online', connection); window.addEventListener('offline', connection); document.addEventListener('visibilitychange', visible); window.addEventListener('atelier:demo', sync); window.addEventListener('storage', sync);
    return () => { window.removeEventListener('online', connection); window.removeEventListener('offline', connection); document.removeEventListener('visibilitychange', visible); window.removeEventListener('atelier:demo', sync); window.removeEventListener('storage', sync); };
  }, [refresh]);
  useEffect(()=>{
    if(!booking?.appointment)return;
    const current=appointments.find(a=>a.id===booking.appointment!.id);
    if(current&&!['pending','confirmed'].includes(current.status)){setBooking(null);setToast('Programarea a fost anulată sau încheiată. Verifică istoricul și notificările.');}
    else if(current&&JSON.stringify(current)!==JSON.stringify(booking.appointment)){setBooking({...booking,appointment:current});setToast('Programarea a fost actualizată între timp. Verifică detaliile înainte de confirmare.');}
  },[appointments]);
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(''), 5000); return () => clearTimeout(timer); }, [toast]);
  function navigate(v: View) { setLinkedAppointment(undefined); setCancelAppointmentId(undefined); setView(v); scrollArea.current?.scrollTo({ top: 0, behavior: 'auto' }); }
  function signedIn(identity: Identity) { setUser(identity); setProfile(null); setAppointments([]); setNotifications([]); if (identity.id === 'demo-barber' && !ownerPortal) { location.assign('/frizer'); return; } if (!booking) navigate(ownerPortal ? 'appointments' : 'home'); }
  async function logout() { if (demoMode) localSignOut(); else { try { await disableCurrentPush(); } catch { /* Local sign-out remains available if push is unsupported. */ } const { error } = await supabase!.auth.signOut({ scope: 'local' }); if (error) { setError(friendlyError(error)); return; } } setUser(null); setProfile(null); setAppointments([]); setNotifications([]); setInbox(false); navigate('home'); }
  function startBooking(service?: Service) { if (!services.length) { setToast('Nu există încă servicii disponibile.'); return; } setBooking({ service }); }
  const nav = ownerPortal && !owner ? [] : owner ? [{ id: 'appointments' as View, label: 'Agenda', icon: CalendarDays }, { id: 'clients' as View, label: 'Clienți', icon: Users }, { id: 'settings' as View, label: 'Salon', icon: Settings2 }, { id: 'account' as View, label: 'Contul meu', icon: UserRound }] : [{ id: 'home' as View, label: 'Acasă', icon: HomeIcon }, { id: 'appointments' as View, label: 'Programări', icon: CalendarDays }, { id: 'account' as View, label: 'Contul meu', icon: UserRound }];
  return <>
    <div className="ambient-background" aria-hidden="true"><span className="ambient-glow ambient-glow-top"/><span className="ambient-glow ambient-glow-side"/><span className="ambient-glow ambient-glow-bottom"/></div>

    <header className="site-header"><div className="header-inner"><button className="brand" onClick={() => navigate('home')} aria-label="Cristi Barber Shop — Acasă"><span className="brand-icon"><Scissors size={21}/></span><span className="brand-wordmark"><strong>Cristi</strong><span className="brand-description">Barber Shop</span></span></button><nav className="desktop-nav" aria-label="Navigație principală">{nav.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => navigate(id)} className={view === id ? 'active' : ''} aria-current={view === id ? 'page' : undefined}><Icon size={17}/>{label}</button>)}</nav><div className="header-actions">{user && <button className="icon-button notifications-button" aria-label={`Notificări, ${notifications.filter(n => !n.read_at).length} necitite`} onClick={() => { setInbox(true); void refresh(); }}><Bell size={19}/>{notifications.some(n => !n.read_at) && <span className="notification-count">{notifications.filter(n => !n.read_at).length}</span>}</button>}{!user && <button className="account-button" aria-label="Intră în cont" onClick={() => setAuth(true)}><UserRound size={17}/><span>Intră în cont</span></button>}{user && <button className="header-logout" aria-label="Logout" title="Logout" onClick={logout}><LogOut size={18}/><span>Logout</span></button>}</div></div></header>
    {!online && <div className="offline-banner" role="status"><WifiOff size={17}/>Ești offline. Programările se pot face după reconectare. Contul tău rămâne conectat.</div>}
    <div className="app-scroll-area" ref={scrollArea}>
    <main className="app-container" id="main-content">
      {error && <div className="error-box global-error" role="alert"><span>{error}</span><button className="text-button" disabled={refreshing} onClick={() => refresh()}><RefreshCw size={16}/>Reîncearcă</button></div>}
      {!barber ? <div className="empty loading-page"><div className={refreshing ? 'spinner' : ''}/><h2>{refreshing ? 'Încărcăm salonul…' : 'Salonul nu este disponibil momentan.'}</h2><p className="muted">{refreshing ? 'Doar un moment.' : 'Configurează noul proiect Supabase sau pornește modul demo pentru previzualizare.'}</p></div> : ownerPortal && !owner ? <section className="empty guest-page owner-gate"><div className="service-mark"><Scissors size={28}/></div><h1>Agenda lui Cristi.</h1><p>Intrare rezervată frizerului.</p>{user && <p className="error-box">Acesta este un cont de client.</p>}<button className="primary" onClick={() => setAuth(true)}>Intră în contul frizerului<ArrowRight size={18}/></button><a className="text-button" href="/">Înapoi la programări pentru clienți</a></section> : view === 'home' ? <Salon barber={barber} services={services} schedule={schedule} daysOff={daysOff} calendarPolicy={calendarPolicy} profile={profile} appointments={owner ? [] : appointments} onBook={startBooking} onAppointments={() => navigate('appointments')} onCancel={appointment => { navigate('appointments'); setCancelAppointmentId(appointment.id); }}/> : !user ? <section className="empty guest-page"><div className="service-mark"><UserRound size={30}/></div><h1>Un loc pentru programările tale.</h1><p className="muted">Intră în cont ca să vezi vizitele tale și să faci o nouă programare.</p><button className="primary" onClick={() => setAuth(true)}>Intră în cont<ArrowRight size={18}/></button><p className="small-note"><ShieldCheck size={16}/>Te autentifici o dată și rămâi conectat.</p></section> : view === 'appointments' ? <Appointments key={linkedAppointment?.openedAt ?? 'agenda'} linkedAppointment={appointments.find(a => a.id === linkedAppointment?.id)} initialCancelId={cancelAppointmentId} appointments={appointments} barber={barber} user={user} owner={owner} schedule={schedule} daysOff={daysOff} calendarPolicy={calendarPolicy} onBook={() => startBooking()} onReschedule={a => setBooking({ appointment: a })} onRefresh={refresh}/> : view === 'clients' && owner ? <Clients appointments={appointments}/> : view === 'settings' && owner ? <Settings barber={barber} services={services} daysOff={daysOff} schedule={schedule} calendarPolicy={calendarPolicy} onRefresh={refresh}/> : profile ? <Account key={profile.id} user={user} profile={profile} onRefresh={refresh} onInstall={() => setInstall(true)}/> : <div className="empty"><p>Încărcăm profilul…</p><button className="secondary" onClick={() => refresh()}>Reîncearcă</button></div>}
    </main>
    <footer className="site-footer"><div><button className="brand footer-brand" onClick={() => navigate('home')}><Scissors size={20}/>Cristi Barber Shop</button>{demoMode && <span className="prototype-note">Previzualizare locală</span>}</div><div><button onClick={() => setInstall(true)}><Smartphone size={15}/>Adaugă pe telefon</button><button onClick={() => setPrivacy(true)}>Confidențialitate</button><span>© {new Date().getFullYear()} Cristi Barber Shop</span></div></footer>
    </div>
    <nav className="bottom-nav" aria-label="Navigație mobilă">{nav.map(({ id, label, icon: Icon }) => <button key={id} className={view === id ? 'active' : ''} onClick={() => navigate(id)}><Icon size={21}/><span>{label}</span></button>)}</nav>
    {toast && <div className="toast" role="status"><Check size={18}/>{toast}<button className="icon-button" aria-label="Închide mesajul" onClick={() => setToast('')}><X size={16}/></button></div>}
    {booking && barber && <Booking services={services} initialService={booking.service} barber={barber} schedule={schedule} daysOff={daysOff} calendarPolicy={calendarPolicy} user={user} owner={owner} reschedule={booking.appointment} onClose={() => { setBooking(null); }} onAuth={() => setAuth(true)} onComplete={refresh} onViewAppointments={() => { setBooking(null); navigate('appointments'); }}/>}
    {auth && <AuthModal initial={recovery ? 'recovery' : 'login'} onClose={() => { setAuth(false); setRecovery(false); }} onSignedIn={signedIn} ownerPortal={ownerPortal}/>}
    {inbox && user && <NotificationInbox
      key={user.id}
      notifications={notifications}
      loadError={notificationError}
      onClose={() => setInbox(false)}
      onOpenAppointment={id => {
        setInbox(false);
        navigate('appointments');
        setLinkedAppointment({ id, openedAt: Date.now() });
      }}
      onDismiss={async id => {
        await api.dismissNotification(user.id, id);
        setNotifications(current => current.filter(notification => notification.id !== id));
        await refresh();
      }}
      onRead={async () => { await api.readNotifications(user.id); await refresh(); }}
    />}
    {install && <Modal title="Cristi Barber Shop pe telefon" onClose={() => setInstall(false)}><div className="install-illustration"><Scissors size={32}/><Smartphone size={42}/></div><p>Adaugă aplicația pe ecranul principal al telefonului.</p><ol className="install-steps"><li><strong>Pe iPhone</strong><p>Deschide în Safari → Partajare → Adaugă pe ecranul principal.</p></li><li><strong>Pe Android</strong><p>Deschide în Chrome → meniul ⋮ → Instalează aplicația sau Adaugă pe ecranul principal.</p></li><li><strong>Activează notificările</strong><p>Deschide aplicația instalată, intră în Contul meu și apasă Activează notificările.</p></li></ol><p className="small-note"><Bell size={16}/>Notificările depind de permisiunile și setările telefonului.</p><button className="primary full" onClick={() => setInstall(false)}>Am înțeles<Check size={18}/></button></Modal>}
    {privacy && <Modal title="Datele tale, cu grijă" onClose={() => setPrivacy(false)}><p>Aplicația folosește numele, telefonul și emailul pentru cont și gestionarea programărilor. Frizerul vede datele necesare vizitei tale. Ceilalți clienți nu le pot vedea.</p><p>Sesiunea este păstrată pe dispozitiv pentru a rămâne conectat. Nu folosim cookie-uri de publicitate sau instrumente de urmărire în această versiune.</p><p>Programările rămân în istoric, inclusiv după anulare. Pentru acces, corectare sau ștergerea datelor, contactează salonul{barber?.phone ? ` la ${barber.phone}` : ''}.</p><p className="muted">{demoMode ? 'Această previzualizare păstrează conturile și programările doar pe acest dispozitiv. Folosește date de test.' : 'Pentru informații despre păstrarea datelor și exercitarea drepturilor tale, contactează salonul.'}</p></Modal>}
  </>;
}
