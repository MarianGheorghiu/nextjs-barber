import { demoMode, supabase } from './supabase';
export async function disableCurrentPush(): Promise<void> {
  if (demoMode || !('serviceWorker' in navigator)) return;
  const registration = await navigator.serviceWorker.getRegistration('/');
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;
  await subscription.unsubscribe();
  if (supabase) await supabase.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint);
}
export async function enablePush(): Promise<string> {
  if (demoMode) throw new Error('Notificările push se activează după conectarea la Supabase. Modul demo nu trimite notificări.');
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) throw new Error('Pe iPhone, adaugă aplicația pe ecranul principal din meniul Partajare, apoi deschide-o de acolo.');
  const key = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (!key) throw new Error('Cheia de notificări nu a fost configurată încă.');
  // Subscribe immediately from the button gesture; do not await auth/network before permission.
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Permite notificările din setările telefonului pentru această aplicație.');
  const registration = await navigator.serviceWorker.ready;
  const padding = '='.repeat((4 - key.length % 4) % 4);
  const raw = atob((key + padding).replace(/-/g, '+').replace(/_/g, '/'));
  const subscription = await registration.pushManager.getSubscription() ?? await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: Uint8Array.from(raw, c => c.charCodeAt(0)) });
  const { data: { user } } = await supabase!.auth.getUser();
  if (!user) throw new Error('Intră în cont pentru a salva notificările.');
  const json = subscription.toJSON();
  const { error } = await supabase!.from('push_subscriptions').upsert({ user_id: user.id, endpoint: subscription.endpoint, p256dh: json.keys?.p256dh, auth: json.keys?.auth }, { onConflict: 'endpoint' });
  if (error) throw error;
  return 'Notificările sunt activate pe acest dispozitiv.';
}
