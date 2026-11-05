import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';
import { allowedPushEndpoint } from './validation.ts';

// This function is called by pg_net with a dedicated secret, never by the browser.
// The gateway JWT check is replaced by the secret check below; see config.toml.
Deno.serve(async (request: Request) => {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const secret = Deno.env.get('PUSH_DISPATCH_SECRET');
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) return new Response('Unauthorized', { status: 401 });
  const publicKey = Deno.env.get('VAPID_PUBLIC_KEY'); const privateKey = Deno.env.get('VAPID_PRIVATE_KEY'); const subject = Deno.env.get('VAPID_SUBJECT');
  if (!publicKey || !privateKey || !subject) return new Response('Push is not configured', { status: 503 });
  webpush.setVapidDetails(subject, publicKey, privateKey);
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: notifications, error } = await db.rpc('claim_notifications');
  if (error) return new Response('Unable to claim notifications', { status: 500 });
  let processed = 0;
  for (const notification of notifications ?? []) {
    const { data: subscriptions, error: subscriptionError } = await db.from('push_subscriptions').select('id,endpoint,p256dh,auth').eq('user_id', notification.user_id);
    let failed = !!subscriptionError;
    for (const subscription of subscriptions ?? []) {
      // Prevent a malicious subscription from turning the service-role sender into an SSRF proxy.
      if (!allowedPushEndpoint(subscription.endpoint)) { await db.from('push_subscriptions').delete().eq('id', subscription.id); continue; }
      try {
        await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, JSON.stringify({ title: notification.title, body: notification.body, tag: `appointment-${notification.appointment_id}` }), { TTL: 3600, urgency: 'high', timeout: 5000 });
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) await db.from('push_subscriptions').delete().eq('id', subscription.id);
        else failed = true;
      }
    }
    if (failed) {
      await db.from('notification_outbox').update({ locked_until: null, last_error: 'Push provider or subscription lookup failed', next_attempt_at: new Date(Date.now() + Math.min(3600, 2 ** notification.attempts * 15) * 1000).toISOString() }).eq('id', notification.id);
    } else {
      await db.from('notification_outbox').update({ locked_until: null, delivered_at: new Date().toISOString(), last_error: subscriptions?.length ? null : 'No registered devices' }).eq('id', notification.id);
    }
    processed++;
  }
  return Response.json({ processed });
});
