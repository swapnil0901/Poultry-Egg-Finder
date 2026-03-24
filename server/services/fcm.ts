import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import type { IStorage } from "../storage.js";

type PushPayload = {
  title: string;
  body: string;
  icon?: string;
  url?: string;
  data?: Record<string, string>;
};

type PushResult = {
  sent: number;
  failed: number;
  skipped?: boolean;
  reason?: string;
};

function readServiceAccount() {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  return {
    projectId,
    clientEmail,
    privateKey,
  };
}

function ensureFirebaseAdmin() {
  if (getApps().length > 0) {
    return getApps()[0]!;
  }

  const serviceAccount = readServiceAccount();
  if (!serviceAccount) {
    return null;
  }

  return initializeApp({
    credential: cert(serviceAccount),
  });
}

function isInvalidTokenError(code: string | undefined): boolean {
  return code === "messaging/invalid-registration-token" || code === "messaging/registration-token-not-registered";
}

export async function sendPushNotificationToAll(
  storage: IStorage,
  payload: PushPayload,
): Promise<PushResult> {
  // Firebase Admin is optional at runtime so local development still works without secrets.
  const app = ensureFirebaseAdmin();
  if (!app) {
    return {
      sent: 0,
      failed: 0,
      skipped: true,
      reason:
        "Firebase Admin credentials are not configured. Set FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, and FIREBASE_ADMIN_PRIVATE_KEY.",
    };
  }

  const tokenRecords = await storage.getFcmTokens();
  const tokens = tokenRecords.map((record) => record.token);

  if (tokens.length === 0) {
    return {
      sent: 0,
      failed: 0,
      skipped: true,
      reason: "No active FCM tokens are stored yet.",
    };
  }

  const messaging = getMessaging(app);
  const response = await messaging.sendEachForMulticast({
    tokens,
    notification: {
      title: payload.title,
      body: payload.body,
      imageUrl: payload.icon,
    },
    webpush: {
      notification: {
        title: payload.title,
        body: payload.body,
        icon: payload.icon ?? "/icon-192.png",
      },
      fcmOptions: {
        link: payload.url ?? "/",
      },
      data: {
        url: payload.url ?? "/",
        ...(payload.data ?? {}),
      },
    },
    data: {
      title: payload.title,
      body: payload.body,
      icon: payload.icon ?? "/icon-192.png",
      url: payload.url ?? "/",
      ...(payload.data ?? {}),
    },
  });

  await Promise.all(
    response.responses.map(async (result, index) => {
      if (!result.error || !isInvalidTokenError(result.error.code)) {
        return;
      }
      const token = tokens[index];
      if (token) {
        await storage.deactivateFcmToken(token);
      }
    }),
  );

  return {
    sent: response.successCount,
    failed: response.failureCount,
  };
}
