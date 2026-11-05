import { useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowRight, CheckCircle2, Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react';
import { Modal } from './Modal';
import { demoMode, supabase } from '../lib/supabase';
import { friendlyError } from '../lib/api';
import { localLogin, localRegister } from '../lib/local-auth';
import type { Identity } from '../lib/types';
export function AuthModal({ onClose, onSignedIn, initial = 'login', ownerPortal = false }: { onClose: () => void; onSignedIn: (user: Identity) => void; initial?: 'login' | 'register' | 'recovery'; ownerPortal?: boolean }) {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'recovery'>(initial);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [success, setSuccess] = useState(''); const [show, setShow] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError(''); setSuccess('');
    const values = new FormData(e.currentTarget); const email = String(values.get('email') ?? '').trim().toLowerCase(); const password = String(values.get('password') ?? '');
    setBusy(true);
    try {
      if (demoMode) {
        if (mode === 'forgot' || mode === 'recovery') { setSuccess('Recuperarea prin email va fi disponibilă în versiunea online. În această previzualizare, conturile sunt salvate doar pe dispozitiv.'); return; }
        const identity = mode === 'register' ? await localRegister({ first_name: String(values.get('first_name')).trim(), last_name: String(values.get('last_name')).trim(), phone: String(values.get('phone')).trim() }, email, password) : await localLogin(email, password, ownerPortal);
        if (ownerPortal && identity.id !== 'demo-barber') { setError('Acest cont este un cont de client. Intră în zona de programări pentru clienți.'); return; }
        onSignedIn(identity); onClose(); return;
      }
      if (!supabase) throw new Error('Autentificarea nu este disponibilă momentan.');
      if (mode === 'register') {
        const { error, data } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin, data: { first_name: String(values.get('first_name')).trim(), last_name: String(values.get('last_name')).trim(), phone: String(values.get('phone')).trim() } } });
        if (error) throw error;
        if (data.session) { onSignedIn(data.session.user); onClose(); } else setSuccess('Verifică emailul pentru confirmarea contului. După confirmare, intră cu emailul și parola ta.');
      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/?recovery=1` }); if (error) throw error;
        setSuccess('Dacă există un cont cu această adresă, vei primi un link de resetare.');
      } else if (mode === 'recovery') {
        const { error } = await supabase.auth.updateUser({ password }); if (error) throw error; setSuccess('Parola a fost actualizată. Poți închide această fereastră.'); window.history.replaceState({}, '', '/');
      } else { const { data, error } = await supabase.auth.signInWithPassword({ email, password }); if (error) throw error; onSignedIn(data.user); onClose(); }
    } catch (e) { setError(friendlyError(e)); } finally { setBusy(false); }
  }
  function switchMode(next: typeof mode) { setMode(next); setError(''); setSuccess(''); }
  return <Modal title={ownerPortal ? 'Intră în agenda ta' : mode === 'register' ? 'Creează-ți contul' : mode === 'forgot' ? 'Ai uitat parola?' : mode === 'recovery' ? 'Alege o parolă nouă' : 'Bine ai revenit'} onClose={onClose}>
    <p className="muted">{mode === 'register' ? 'Un cont, toate programările tale. Durează doar un minut.' : ownerPortal ? 'Cristi Epure · Administrarea programărilor' : 'Intră în cont pentru a-ți vedea programările.'}</p>

    {success ? <div className="success-box" role="status"><CheckCircle2/>{success}</div> : <form className="form-stack" onSubmit={submit}>
      {mode === 'register' && <><div className="two-fields"><label>Prenume<input name="first_name" autoComplete="given-name" required minLength={2} maxLength={60} placeholder="Prenumele tău"/></label><label>Nume<input name="last_name" autoComplete="family-name" required minLength={2} maxLength={60} placeholder="Numele tău"/></label></div><label>Telefon<input name="phone" type="tel" autoComplete="tel" required pattern="[+0-9 \(\)\-]{9,20}" placeholder="07xx xxx xxx"/></label></>}
      {mode !== 'recovery' && <label>Email<div className="input-icon"><Mail size={18}/><input name="email" type="email" autoComplete="email" required placeholder="nume@exemplu.ro"/></div></label>}
      {mode !== 'forgot' && <label>Parolă<div className="input-icon"><LockKeyhole size={18}/><input name="password" type={show ? 'text' : 'password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={mode === 'login' ? 1 : 8} maxLength={128} placeholder={mode === 'login' ? 'Parola ta' : 'Cel puțin 8 caractere'}/><button type="button" className="icon-button" aria-label={show ? 'Ascunde parola' : 'Arată parola'} onClick={() => setShow(!show)}>{show ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div></label>}
      {mode === 'login' && <button type="button" className="text-button right" onClick={() => switchMode('forgot')}>Am uitat parola</button>}
      {error && <p className="error-box" role="alert">{error}</p>}
      <button className="primary full" disabled={busy}>{busy ? 'Se procesează…' : mode === 'register' ? 'Creează cont' : mode === 'forgot' ? 'Trimite linkul' : mode === 'recovery' ? 'Salvează parola' : 'Intră în cont'}<ArrowRight size={18}/></button>
    </form>}
    {mode !== 'recovery' && !ownerPortal && <p className="auth-switch">{mode === 'login' ? 'Ești pentru prima dată aici?' : 'Ai deja cont?'} <button className="text-button" onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}>{mode === 'login' ? 'Creează un cont' : 'Intră în cont'}</button></p>}

    <div className="small-note"><LockKeyhole size={14}/> Rămâi conectat pe acest dispozitiv.</div>
  </Modal>;
}
