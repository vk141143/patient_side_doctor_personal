// Service Worker for MediConnect Doctor App
// Handles background push notifications

self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  const title = data.title ?? "New Consultation Request";
  const options = {
    body: data.body ?? "A patient is waiting for a doctor.",
    icon: "/icon-192.png",
    badge: "/icon-72.png",
    vibrate: [300, 100, 300, 100, 300, 100, 300],
    tag: "consultation-request",
    renotify: true,
    requireInteraction: true,   // stays until doctor taps
    data: { url: data.url ?? "/dashboard" },
    actions: [
      { action: "accept", title: "Open App" },
      { action: "dismiss", title: "Dismiss" },
    ],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "dismiss") return;
  const url = event.notification.data?.url ?? "/dashboard";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      clients.openWindow(url);
    })
  );
});

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(clients.claim()));
