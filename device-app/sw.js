'use strict';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

// ── Push received ────────────────────────────────────────────────────────
self.addEventListener('push', (e) => {
  if (!e.data) return;

  let payload;
  try { payload = e.data.json(); }
  catch { payload = { event_id: 'unknown', event_name: e.data.text() }; }

  const { event_id, event_name } = payload;

  const notifyClients = self.clients
    .matchAll({ type: 'window', includeUncontrolled: true })
    .then(clients =>
      clients.forEach(c => c.postMessage({ type: 'EVENT_STARTED', event_id, event_name }))
    );

  const showNotif = self.registration.showNotification('SnapShot — אירוע פעיל', {
    body: event_name || 'אירוע חדש נפתח — פתח כדי להתחיל שידור מיקום',
    data: { event_id },
    tag: 'anashot-event',
    renotify: true,
    requireInteraction: true,
    vibrate: [200, 100, 200],
  });

  e.waitUntil(Promise.all([notifyClients, showNotif]));
});

// ── Notification click ───────────────────────────────────────────────────
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const event_id = e.notification.data?.event_id;

  e.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(clients => {
        for (const client of clients) {
          if (client.url.includes('/device-app')) {
            client.focus();
            client.postMessage({ type: 'EVENT_STARTED', event_id });
            return;
          }
        }
        return self.clients.openWindow(`/device-app/?event_id=${event_id}`);
      })
  );
});

// ── Subscription renewal ─────────────────────────────────────────────────
self.addEventListener('pushsubscriptionchange', (e) => {
  // Re-registration is handled by the app on next open
  console.log('Push subscription changed — will re-register on next open');
});
