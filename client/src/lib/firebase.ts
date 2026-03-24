import { getApp, getApps, initializeApp } from "firebase/app";
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";
import {
  getMessaging,
  getToken,
  isSupported as isMessagingSupported,
  onMessage,
  type MessagePayload,
  type Messaging,
} from "firebase/messaging";

export const firebaseConfig = {
  apiKey: "AIzaSyCbsGg60oqKBScSIVlsbWUMusl_9Ml4cYk",
  authDomain: "poultrymanager-7da1e.firebaseapp.com",
  projectId: "poultrymanager-7da1e",
  storageBucket: "poultrymanager-7da1e.firebasestorage.app",
  messagingSenderId: "222819375434",
  appId: "1:222819375434:web:4b0ab679b6007311dc89b3",
  measurementId: "G-RX6T8NL55C",
};

export const firebaseWebPushVapidKey =
  "BA-20xNflYmrT-lpR8U44wUjkMugu1eoXjlkbo22yHrCKuBgswlRA51hX8m8Aise6UnEkEZeoLtW0eMh6qhj0ZM";

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export let analytics: Analytics | null = null;

void (typeof window === "undefined"
  ? Promise.resolve(null)
  : isSupported().then((supported) => {
      analytics = supported ? getAnalytics(app) : null;
      return analytics;
    }));

export async function getMessagingInstance(): Promise<Messaging | null> {
  if (typeof window === "undefined") {
    return null;
  }

  const supported = await isMessagingSupported();
  if (!supported) {
    return null;
  }

  return getMessaging(app);
}

export async function getMessagingToken(): Promise<string | null> {
  if (typeof window === "undefined" || typeof Notification === "undefined") {
    return null;
  }

  const messaging = await getMessagingInstance();
  if (!messaging) {
    return null;
  }

  const permission =
    Notification.permission === "granted"
      ? "granted"
      : await Notification.requestPermission();

  if (permission !== "granted") {
    return null;
  }

  const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");

  return getToken(messaging, {
    vapidKey: firebaseWebPushVapidKey,
    serviceWorkerRegistration: registration,
  });
}

export async function subscribeToForegroundMessages(
  handler: (payload: MessagePayload) => void,
): Promise<(() => void) | null> {
  const messaging = await getMessagingInstance();
  if (!messaging) {
    return null;
  }

  return onMessage(messaging, handler);
}

export default app;
