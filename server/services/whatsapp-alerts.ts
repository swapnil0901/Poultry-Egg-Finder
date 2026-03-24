import Twilio from "twilio";

const ALERT_COOLDOWN_MS = 5 * 60 * 1000;

type AlertType = "temperature" | "ammonia";

type AlertState = {
  active: boolean;
  lastSentAt: number | null;
};

type AlertStore = Record<AlertType, AlertState>;

declare global {
  // eslint-disable-next-line no-var
  var __sensorWhatsappAlertState__: AlertStore | undefined;
}

function getAlertStore(): AlertStore {
  if (!globalThis.__sensorWhatsappAlertState__) {
    globalThis.__sensorWhatsappAlertState__ = {
      temperature: { active: false, lastSentAt: null },
      ammonia: { active: false, lastSentAt: null },
    };
  }

  return globalThis.__sensorWhatsappAlertState__;
}

function shouldSendAlert(type: AlertType, isActive: boolean, now = Date.now()): boolean {
  const store = getAlertStore();
  const state = store[type];

  if (!isActive) {
    state.active = false;
    return false;
  }

  if (!state.active) {
    return true;
  }

  if (state.lastSentAt === null) {
    return true;
  }

  return now - state.lastSentAt >= ALERT_COOLDOWN_MS;
}

function markAlertSent(type: AlertType, now = Date.now()): void {
  const store = getAlertStore();
  store[type] = {
    active: true,
    lastSentAt: now,
  };
}

export async function sendWhatsAppAlert(message: string): Promise<boolean> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const from = process.env.TWILIO_WHATSAPP_FROM?.trim();
  const to = process.env.TWILIO_WHATSAPP_TO?.trim();

  if (!accountSid || !authToken || !from || !to) {
    console.warn(
      "Twilio WhatsApp alert skipped: missing TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM, or TWILIO_WHATSAPP_TO.",
    );
    return false;
  }

  try {
    const client = Twilio(accountSid, authToken);
    await client.messages.create({
      body: message,
      from,
      to,
    });
    return true;
  } catch (error) {
    console.error("Failed to send WhatsApp alert:", error);
    return false;
  }
}

export async function maybeSendSensorAlerts(input: {
  temperature: number;
  ammonia: number;
}): Promise<boolean> {
  const now = Date.now();
  const alerts: Array<Promise<boolean>> = [];

  const isHighTemperature = input.temperature >= 35;
  if (shouldSendAlert("temperature", isHighTemperature, now)) {
    alerts.push(
      sendWhatsAppAlert(
        `⚠️ High Temperature: ${input.temperature}°C detected. Fan turned ON automatically.`,
      ).then((sent) => {
        if (sent) {
          markAlertSent("temperature", now);
        }
        return sent;
      }),
    );
  }

  const isHighAmmonia = input.ammonia > 20;
  if (shouldSendAlert("ammonia", isHighAmmonia, now)) {
    alerts.push(
      sendWhatsAppAlert(
        `⚠️ High Ammonia detected! Current ammonia: ${input.ammonia}. Improve ventilation immediately.`,
      ).then((sent) => {
        if (sent) {
          markAlertSent("ammonia", now);
        }
        return sent;
      }),
    );
  }

  if (alerts.length === 0) {
    return false;
  }

  const results = await Promise.all(alerts);
  return results.some(Boolean);
}
