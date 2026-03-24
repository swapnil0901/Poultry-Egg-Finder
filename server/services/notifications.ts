import { storage } from "../storage.js";
import { sendPushNotificationToAll } from "./fcm.js";

const DEFAULT_FEED_THRESHOLD_KG = 10;
const DEFAULT_EGG_COLLECTION_NOTIFY_THRESHOLD = 1;
const DEFAULT_VACCINATION_REMINDER_DAYS = 1;

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getEnvNumber(key: string, fallback: number): number {
  const value = toNumber(process.env[key], NaN);
  return Number.isFinite(value) ? value : fallback;
}

function parseDateOnly(value: string | Date): Date {
  if (value instanceof Date) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  const parsed = new Date(value);
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

async function sendTwilioSms(message: string): Promise<void> {
  const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const token = process.env.TWILIO_AUTH_TOKEN?.trim();
  const from = process.env.TWILIO_SMS_FROM?.trim();
  const to =
    process.env.TWILIO_SMS_TO?.trim() ??
    process.env.FARM_OWNER_PHONE?.trim();

  if (!sid || !token || !from || !to) {
    throw new Error(
      "Twilio SMS configuration is incomplete. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_SMS_FROM, and TWILIO_SMS_TO or FARM_OWNER_PHONE.",
    );
  }

  const params = new URLSearchParams({
    Body: message,
    From: from,
    To: to,
  });

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Twilio SMS failed with HTTP ${response.status}: ${text.slice(0, 240)}`);
  }
}

async function sendFast2Sms(message: string): Promise<void> {
  const apiKey = process.env.FAST2SMS_API_KEY?.trim();
  const ownerPhone = process.env.FARM_OWNER_PHONE?.trim();
  const route = process.env.FAST2SMS_ROUTE?.trim() || "q";

  if (!apiKey || !ownerPhone) {
    throw new Error("Fast2SMS configuration is incomplete.");
  }

  const params = new URLSearchParams({
    authorization: apiKey,
    route,
    message,
    numbers: ownerPhone,
  });

  const response = await fetch(`https://www.fast2sms.com/dev/bulkV2?${params.toString()}`, {
    method: "GET",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Fast2SMS failed with HTTP ${response.status}: ${text.slice(0, 240)}`);
  }
}

export async function sendNotification(message: string): Promise<void> {
  const errors: Error[] = [];
  let delivered = false;

  const enabled = (process.env.ENABLE_SMS_ALERTS ?? "true").toLowerCase() !== "false";
  if (enabled) {
    try {
      const provider = (process.env.NOTIFICATION_PROVIDER ?? process.env.ALERT_PROVIDER ?? "auto").toLowerCase();
      const hasTwilioSmsConfig =
        Boolean(process.env.TWILIO_ACCOUNT_SID?.trim()) &&
        Boolean(process.env.TWILIO_AUTH_TOKEN?.trim()) &&
        Boolean(process.env.TWILIO_SMS_FROM?.trim()) &&
        Boolean(process.env.TWILIO_SMS_TO?.trim() ?? process.env.FARM_OWNER_PHONE?.trim());

      if (provider !== "disabled" && provider !== "none") {
        if (provider === "twilio" || provider === "twilio_sms") {
          await sendTwilioSms(message);
          delivered = true;
        } else if (provider === "fast2sms") {
          await sendFast2Sms(message);
          delivered = true;
        } else if (hasTwilioSmsConfig) {
          await sendTwilioSms(message);
          delivered = true;
        } else {
          await sendFast2Sms(message);
          delivered = true;
        }
      }
    } catch (error) {
      errors.push(error as Error);
    }
  }

  try {
    const pushResult = await sendPushNotificationToAll(storage, {
      title: "Poultry Manager",
      body: message,
      icon: "/icon-192.png",
      url: "/",
    });
    if (!pushResult.skipped && pushResult.sent > 0) {
      delivered = true;
    }
  } catch (error) {
    errors.push(error as Error);
  }

  if (!delivered && errors.length > 0) {
    throw errors[0]!;
  }
}

export async function notifyEggCollectionSaved(input: {
  date: string | Date;
  eggsCollected: number;
  chickenType?: string;
  shed?: string;
}): Promise<void> {
  const threshold = getEnvNumber(
    "EGG_COLLECTION_NOTIFY_THRESHOLD",
    DEFAULT_EGG_COLLECTION_NOTIFY_THRESHOLD,
  );
  if (toNumber(input.eggsCollected) < threshold) {
    return;
  }

  const chickenType = input.chickenType === "Broiler" ? "Broiler" : "Pure";
  await sendNotification(
    `${input.eggsCollected} ${chickenType.toLowerCase()} eggs collected today from ${input.shed || "farm shed"}.`,
  );
}

export async function notifyLowFeedIfNeeded(input: {
  closingStockKg: string | number;
  date: string | Date;
}): Promise<void> {
  const closingStockKg = toNumber(input.closingStockKg);
  const threshold = getEnvNumber("FEED_STOCK_ALERT_THRESHOLD_KG", DEFAULT_FEED_THRESHOLD_KG);
  if (closingStockKg >= threshold) {
    return;
  }

  await sendNotification(
    `Feed inventory is low. Current stock is ${closingStockKg.toFixed(1)} kg and threshold is ${threshold} kg.`,
  );
}

export async function notifyVaccinationReminderIfNeeded(input: {
  vaccineName: string;
  nextVaccination: string | Date;
}): Promise<void> {
  const nextVaccination = parseDateOnly(input.nextVaccination);
  const reminderDays = Math.max(
    0,
    getEnvNumber("VACCINATION_REMINDER_DAYS_BEFORE", DEFAULT_VACCINATION_REMINDER_DAYS),
  );
  const reminderDate = new Date();
  reminderDate.setHours(0, 0, 0, 0);
  reminderDate.setDate(reminderDate.getDate() + reminderDays);

  if (nextVaccination.getTime() !== reminderDate.getTime()) {
    return;
  }

  await sendNotification(
    `Vaccination scheduled ${reminderDays === 0 ? "today" : "tomorrow"}: ${input.vaccineName} on ${input.nextVaccination}.`,
  );
}
