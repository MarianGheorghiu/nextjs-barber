import { BARBER_ID } from './constants.ts';
import { readDemo, writeDemo } from './demo.ts';
import type { Identity, Profile } from './types';

// UI prototype only. These accounts never leave this browser and are NOT production auth.
// Passwords are salted PBKDF2 digests; production identity will be provided by Supabase Auth.
const ACCOUNTS = 'cristi.local.accounts.v1';
const SESSION = 'cristi.local.session.v1';
type Account = Identity & { email: string; salt: string; digest: string; ownerCredentialVersion?: number };
function accounts(): Account[] { try { return JSON.parse(localStorage.getItem(ACCOUNTS) ?? '[]'); } catch { return []; } }
function saveAccounts(value: Account[]) { localStorage.setItem(ACCOUNTS, JSON.stringify(value)); }
function hex(bytes: Uint8Array): string { return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join(''); }
async function digest(password: string, salt: string): Promise<string> {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', iterations: 120000, salt: new TextEncoder().encode(salt) }, material, 256);
  return hex(new Uint8Array(bits));
}
let ownerReady: Promise<void> | null = null;
async function ensureOwner() {
  ownerReady ??= (async () => {
    if (accounts().some(a => a.id === 'demo-barber' && a.ownerCredentialVersion === 2)) return;
    const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
    const owner: Account = { id: 'demo-barber', email: 'cristi@barber.com', salt, digest: await digest('1', salt), ownerCredentialVersion: 2 };
    saveAccounts([...accounts().filter(a => a.id !== owner.id), owner]);
    const state = readDemo();
    state.profiles = [...state.profiles.filter(p => p.id !== owner.id), { id: owner.id, barber_id: BARBER_ID, first_name: 'Cristi', last_name: 'Epure', phone: '0700000000' }];
    writeDemo(state);
  })();
  await ownerReady;
}
export const prepareLocalOwner = ensureOwner;
export function localSession(): Identity | null {
  try { const id = localStorage.getItem(SESSION); const account = accounts().find(a => a.id === id); return account ? { id: account.id, email: account.email } : null; } catch { return null; }
}
export function localSignOut() { localStorage.removeItem(SESSION); }
function signIn(account: Account): Identity { localStorage.setItem(SESSION, account.id); return { id: account.id, email: account.email }; }
export async function localLogin(email: string, password: string, ownerOnly = false): Promise<Identity> {
  await ensureOwner();
  const account = accounts().find(a => a.email === email.trim().toLowerCase());
  if (!account || await digest(password, account.salt) !== account.digest) throw new Error('Emailul sau parola nu sunt corecte.');
  if (ownerOnly && account.id !== 'demo-barber') throw new Error('Acesta este un cont de client. Intră în zona de programări pentru clienți.');
  return signIn(account);
}
export async function localRegister(profile: Omit<Profile, 'id' | 'barber_id'>, email: string, password: string): Promise<Identity> {
  await ensureOwner();
  const normalized = email.trim().toLowerCase();
  if (accounts().some(a => a.email === normalized)) throw new Error('Există deja un cont cu acest email. Intră în cont.');
  if (password.length < 8) throw new Error('Alege o parolă de cel puțin 8 caractere.');
  const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
  const account: Account = { id: crypto.randomUUID(), email: normalized, salt, digest: await digest(password, salt) };
  const state = readDemo(); state.profiles.push({ ...profile, id: account.id, barber_id: BARBER_ID, created_at: new Date().toISOString() }); writeDemo(state);
  saveAccounts([...accounts(), account]);
  return signIn(account);
}
