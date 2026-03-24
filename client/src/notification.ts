import { api } from "@shared/routes";
import { fetchWithAuth } from "@/lib/auth-client";
import { getMessagingToken, subscribeToForegroundMessages } from "@/firebase";

type NotificationHandler = (payload: {
  title: string;
  body: string;
  icon: string;
  url: string;
}) => void;

function buildForegroundPayload(payload: Record<string, any>) {
  const notification = payload.notification ?? {};
  const data = payload.data ?? {};

  return {
    title: notification.title || data.title || "Poultry Manager",
    body: notification.body || data.body || "You have a new poultry update.",
    icon: notification.icon || data.icon || "/icon-192.png",
    url: data.url || "/",
  };
}

async function registerTokenWithBackend(token: string): Promise<void> {
  // Persist the browser token so the server can target this device later.
  const deviceLabel = `${navigator.platform || "web"} browser`;

  const response = await fetchWithAuth(api.notifications.registerToken.path, {
    method: api.notifications.registerToken.method,
    body: JSON.stringify({
      token,
      deviceLabel,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to store FCM token on backend.");
  }
}

export async function initializeNotifications(
  onForegroundNotification?: NotificationHandler,
): Promise<void> {
  // Step 1: request permission and create the browser's FCM token.
  const token = await getMessagingToken();

  if (token) {
    console.log("FCM registration token:", token);
    try {
      await registerTokenWithBackend(token);
    } catch (error) {
      console.error("Failed to register FCM token with backend:", error);
    }
  } else {
    console.warn("FCM token was not created. Notification permission may be blocked.");
  }

  // Step 2: subscribe to foreground messages while the app tab is open.
  const unsubscribe = await subscribeToForegroundMessages((payload) => {
    console.log("Foreground FCM message:", payload);
    const notification = buildForegroundPayload(payload as Record<string, any>);
    onForegroundNotification?.(notification);
  });

  if (!unsubscribe) {
    console.warn("Foreground FCM messaging is not supported in this browser.");
  }
}
