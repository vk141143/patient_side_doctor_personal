// Register service worker and handle push notifications

export async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    return reg;
  } catch (e) {
    console.warn("[SW] registration failed:", e);
    return null;
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

// Show a local notification (works when app is open but in background tab)
export function showLocalNotification(title: string, body: string, url = "/dashboard") {
  if (!("serviceWorker" in navigator) || Notification.permission !== "granted") return;
  navigator.serviceWorker.ready.then((reg) => {
    reg.showNotification(title, {
      body,
      icon: "/icon-192.png",
      badge: "/icon-72.png",
      vibrate: [300, 100, 300, 100, 300],
      tag: "consultation-request",
      renotify: true,
      requireInteraction: true,
      data: { url },
    } as NotificationOptions);
  });
}

// Vibrate device (works in PWA/Android)
export function vibrateDevice(pattern: number[] = [300, 100, 300, 100, 300]) {
  if (navigator.vibrate) navigator.vibrate(pattern);
}
