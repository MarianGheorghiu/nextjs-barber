// Do not cache auth responses, private data, or availability. Reservations need a connection.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('push', event => {
  let data = { title: 'Cristi Barber Shop', body: 'Ai o actualizare în agenda ta.' };
  try { data = { ...data, ...event.data.json() }; } catch { /* generic notification */ }
  event.waitUntil(self.registration.showNotification(data.title, {
    body: data.body, icon: '/icon-192.png', badge: '/icon-192.png',
    tag: data.tag || 'atelier-update', data: { url: '/?view=appointments' }
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async clients => {
    const client = clients.find(item => new URL(item.url).origin === self.location.origin);
    if (client) { await client.navigate('/?view=appointments'); return client.focus(); }
    return self.clients.openWindow('/?view=appointments');
  }));
});
