importScripts("https://www.gstatic.com/firebasejs/10.0.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.0.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyCbsGg60oqKBScSIVlsbWUMusl_9Ml4cYk",
  authDomain: "poultrymanager-7da1e.firebaseapp.com",
  projectId: "poultrymanager-7da1e",
  storageBucket: "poultrymanager-7da1e.firebasestorage.app",
  messagingSenderId: "222819375434",
  appId: "1:222819375434:web:4b0ab679b6007311dc89b3",
  measurementId: "G-RX6T8NL55C",
});

const messaging = firebase.messaging();

// Handle notifications when the app is in the background or fully closed.
messaging.onBackgroundMessage((payload) => {
  const notificationTitle =
    payload.notification?.title || payload.data?.title || "Poultry Manager";
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || "You have a new poultry update.",
    icon: payload.notification?.icon || payload.data?.icon || "/icon-192.png",
    data: {
      url: payload.data?.url || "/",
    },
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Bring the user back into the app when they tap the notification.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client && client.url.includes(self.location.origin)) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }

      return undefined;
    }),
  );
});
