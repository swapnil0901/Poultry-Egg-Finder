import { api } from "../../shared/routes.js";
import { z } from "zod";
import type { IStorage } from "../storage";
import {
  calculateChickenCount,
  calculateChickenRevenue,
  calculateEggAvailability,
  calculateEggRevenue,
  calculateFeedRemaining,
} from "./farm-metrics.js";

type DashboardAnalytics = z.infer<typeof api.dashboard.analytics.responses[200]>;
type DashboardAlert = DashboardAnalytics["alerts"][number];

const DEFAULT_FEED_THRESHOLD_KG = 10;
const DEFAULT_EGG_DROP_THRESHOLD_PERCENT = 20;
const DEFAULT_MORTALITY_INCREASE_PERCENT = 25;
const CHART_DAYS = 14;

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeChickenType(value: string | null | undefined): "Pure" | "Broiler" {
  return value === "Broiler" ? "Broiler" : "Pure";
}

function toDateOnly(value: string | Date): string {
  if (value instanceof Date) {
    return value.toISOString().split("T")[0];
  }
  return new Date(value).toISOString().split("T")[0];
}

function parseDateValue(value: string | Date): Date {
  if (value instanceof Date) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date();
  }

  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

function safeIsoDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getEnvNumber(key: string, fallback: number): number {
  const value = toNumber(process.env[key], NaN);
  return Number.isFinite(value) ? value : fallback;
}

function buildRecentDateKeys(today: Date, days: number): string[] {
  const keys: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(today);
    day.setDate(day.getDate() - i);
    keys.push(safeIsoDate(day));
  }
  return keys;
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function toSmsMessage(alert: DashboardAlert): string {
  return `Poultry Smart Buddy Alert\n${alert.title}\n${alert.message}`;
}

function toWhatsAppAddress(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith("whatsapp:")) {
    return trimmed;
  }

  if (trimmed.startsWith("+")) {
    return `whatsapp:${trimmed}`;
  }

  return `whatsapp:+${trimmed}`;
}

async function sendTwilioWhatsApp(
  alert: DashboardAlert,
): Promise<{ smsSent: boolean; smsResponse: string | null }> {
  const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const token = process.env.TWILIO_AUTH_TOKEN?.trim();
  const fromRaw = process.env.TWILIO_WHATSAPP_FROM?.trim() || "whatsapp:+14155238886";
  const toRaw =
    process.env.TWILIO_WHATSAPP_TO?.trim() ??
    process.env.FARM_OWNER_WHATSAPP?.trim() ??
    process.env.FARM_OWNER_PHONE?.trim();

  if (!sid || !token) {
    return {
      smsSent: false,
      smsResponse: "Twilio credentials are missing (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN).",
    };
  }

  if (!toRaw) {
    return {
      smsSent: false,
      smsResponse: "Twilio destination is missing (TWILIO_WHATSAPP_TO or FARM_OWNER_WHATSAPP).",
    };
  }

  const params = new URLSearchParams();
  params.set("From", toWhatsAppAddress(fromRaw));
  params.set("To", toWhatsAppAddress(toRaw));

  const contentSid = process.env.TWILIO_CONTENT_SID?.trim();
  if (contentSid) {
    params.set("ContentSid", contentSid);
    params.set(
      "ContentVariables",
      JSON.stringify({
        "1": alert.title,
        "2": alert.message,
      }),
    );
  } else {
    params.set("Body", toSmsMessage(alert));
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  try {
    const auth = Buffer.from(`${sid}:${token}`).toString("base64");
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
        signal: controller.signal,
      },
    );
    const text = await response.text();

    if (!response.ok) {
      return {
        smsSent: false,
        smsResponse: `Twilio HTTP ${response.status}: ${text.slice(0, 240)}`,
      };
    }

    return {
      smsSent: true,
      smsResponse: text.slice(0, 500),
    };
  } catch (error) {
    return {
      smsSent: false,
      smsResponse: `Twilio request failed: ${(error as Error).message}`,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function sendFast2Sms(message: string): Promise<{ smsSent: boolean; smsResponse: string | null }> {
  const apiKey = process.env.FAST2SMS_API_KEY?.trim();
  const ownerPhone = process.env.FARM_OWNER_PHONE?.trim();
  const route = process.env.FAST2SMS_ROUTE?.trim() || "q";

  if (!apiKey || !ownerPhone) {
    return {
      smsSent: false,
      smsResponse: "Fast2SMS credentials are missing (FAST2SMS_API_KEY / FARM_OWNER_PHONE).",
    };
  }

  const params = new URLSearchParams({
    authorization: apiKey,
    route,
    message,
    numbers: ownerPhone,
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  try {
    const response = await fetch(`https://www.fast2sms.com/dev/bulkV2?${params.toString()}`, {
      method: "GET",
      signal: controller.signal,
    });
    const text = await response.text();

    if (!response.ok) {
      return {
        smsSent: false,
        smsResponse: `Fast2SMS HTTP ${response.status}: ${text.slice(0, 240)}`,
      };
    }

    return {
      smsSent: true,
      smsResponse: text.slice(0, 500),
    };
  } catch (error) {
    return {
      smsSent: false,
      smsResponse: `Fast2SMS request failed: ${(error as Error).message}`,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function sendAlertNotification(
  alert: DashboardAlert,
): Promise<{ smsSent: boolean; smsResponse: string | null }> {
  const smsEnabled = (process.env.ENABLE_SMS_ALERTS ?? "true").toLowerCase() !== "false";
  if (!smsEnabled) {
    return {
      smsSent: false,
      smsResponse: "Alert notifications are disabled (ENABLE_SMS_ALERTS=false).",
    };
  }

  const provider = (process.env.ALERT_PROVIDER ?? "auto").toLowerCase();

  if (provider === "disabled" || provider === "none") {
    return {
      smsSent: false,
      smsResponse: "Alert provider disabled via ALERT_PROVIDER.",
    };
  }

  if (provider === "twilio") {
    return sendTwilioWhatsApp(alert);
  }

  if (provider === "fast2sms") {
    return sendFast2Sms(toSmsMessage(alert));
  }

  const hasTwilioConfig =
    Boolean(process.env.TWILIO_ACCOUNT_SID?.trim()) &&
    Boolean(process.env.TWILIO_AUTH_TOKEN?.trim()) &&
    Boolean(
      process.env.TWILIO_WHATSAPP_TO?.trim() ||
        process.env.FARM_OWNER_WHATSAPP?.trim() ||
        process.env.FARM_OWNER_PHONE?.trim(),
    );

  if (hasTwilioConfig) {
    return sendTwilioWhatsApp(alert);
  }

  return sendFast2Sms(toSmsMessage(alert));
}

function generateAlerts(
  todayKey: string,
  eggsByDate: Map<string, { eggsProduced: number; brokenEggs: number }>,
  mortalityByDate: Map<string, number>,
  latestFeedStockKg: number | null,
): DashboardAlert[] {
  const feedThreshold = getEnvNumber("FEED_STOCK_ALERT_THRESHOLD_KG", DEFAULT_FEED_THRESHOLD_KG);
  const eggDropThreshold = getEnvNumber(
    "EGG_DROP_ALERT_THRESHOLD_PERCENT",
    DEFAULT_EGG_DROP_THRESHOLD_PERCENT,
  );
  const mortalityThreshold = getEnvNumber(
    "MORTALITY_INCREASE_ALERT_THRESHOLD_PERCENT",
    DEFAULT_MORTALITY_INCREASE_PERCENT,
  );

  const alerts: DashboardAlert[] = [];

  if (latestFeedStockKg !== null && latestFeedStockKg < feedThreshold) {
    alerts.push({
      type: "feed_low",
      title: "Feed stock low",
      message: `Feed stock is ${latestFeedStockKg.toFixed(1)} kg, below ${feedThreshold} kg.`,
      severity: latestFeedStockKg <= feedThreshold * 0.6 ? "critical" : "warning",
      thresholdValue: feedThreshold,
      currentValue: latestFeedStockKg,
      smsSent: false,
      smsSentAt: null,
    });
  }

  const hasTodayEggEntry = eggsByDate.has(todayKey);
  if (hasTodayEggEntry) {
    const todayEggs = eggsByDate.get(todayKey)?.eggsProduced ?? 0;
    const previousEggDays = Array.from(eggsByDate.entries())
      .filter(([date]) => date < todayKey)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-3)
      .map(([, value]) => value.eggsProduced);

    if (previousEggDays.length > 0) {
      const averagePrevious =
        previousEggDays.reduce((sum, value) => sum + value, 0) / previousEggDays.length;
      if (averagePrevious > 0) {
        const dropPercent = ((averagePrevious - todayEggs) / averagePrevious) * 100;
        if (dropPercent >= eggDropThreshold) {
          alerts.push({
            type: "egg_drop",
            title: "Egg production dropped",
            message: `Today's production dropped ${formatPercent(dropPercent)} versus recent average.`,
            severity: dropPercent >= eggDropThreshold * 1.5 ? "critical" : "warning",
            thresholdValue: eggDropThreshold,
            currentValue: dropPercent,
            smsSent: false,
            smsSentAt: null,
          });
        }
      }
    }
  }

  const hasTodayMortalityEntry = mortalityByDate.has(todayKey);
  if (hasTodayMortalityEntry) {
    const todayMortality = mortalityByDate.get(todayKey) ?? 0;
    const previousMortality = Array.from(mortalityByDate.entries())
      .filter(([date]) => date < todayKey)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-3)
      .map(([, value]) => value);

    if (previousMortality.length > 0) {
      const baseline =
        previousMortality.reduce((sum, value) => sum + value, 0) / previousMortality.length;
      if (baseline > 0) {
        const increasePercent = ((todayMortality - baseline) / baseline) * 100;
        if (increasePercent >= mortalityThreshold) {
          alerts.push({
            type: "mortality_increase",
            title: "Mortality increased",
            message: `Mortality is up ${formatPercent(increasePercent)} versus recent average.`,
            severity: increasePercent >= mortalityThreshold * 1.5 ? "critical" : "warning",
            thresholdValue: mortalityThreshold,
            currentValue: increasePercent,
            smsSent: false,
            smsSentAt: null,
          });
        }
      }
    }
  }

  return alerts;
}

async function attachAlertStatuses(
  storage: IStorage,
  alertDate: string,
  alerts: DashboardAlert[],
  triggerSms: boolean,
): Promise<DashboardAlert[]> {
  if (alerts.length === 0) {
    return [];
  }

  const existingEvents = await storage.getAlertEventsByDate(alertDate);
  const byType = new Map(existingEvents.map((event) => [event.alertType, event]));

  const resolved: DashboardAlert[] = [];

  for (const alert of alerts) {
    const existing = byType.get(alert.type);
    if (existing) {
      resolved.push({
        ...alert,
        smsSent: existing.smsSent,
        smsSentAt: existing.createdAt ? new Date(existing.createdAt).toISOString() : null,
      });
      continue;
    }

    if (!triggerSms) {
      resolved.push(alert);
      continue;
    }

    const smsResult = await sendAlertNotification(alert);

    try {
      const created = await storage.createAlertEvent({
        alertDate,
        alertType: alert.type,
        severity: alert.severity,
        alertMessage: alert.message,
        thresholdValue: alert.thresholdValue,
        currentValue: alert.currentValue,
        smsSent: smsResult.smsSent,
        smsResponse: smsResult.smsResponse,
      });

      resolved.push({
        ...alert,
        smsSent: created.smsSent,
        smsSentAt: created.createdAt ? new Date(created.createdAt).toISOString() : null,
      });
    } catch (error) {
      const duplicate = await storage.getAlertEventByDateAndType(alertDate, alert.type);
      if (duplicate) {
        resolved.push({
          ...alert,
          smsSent: duplicate.smsSent,
          smsSentAt: duplicate.createdAt ? new Date(duplicate.createdAt).toISOString() : null,
        });
      } else {
        resolved.push({
          ...alert,
          smsSent: smsResult.smsSent,
          smsSentAt: smsResult.smsSent ? new Date().toISOString() : null,
        });
        console.error("Failed to persist alert event:", error);
      }
    }
  }

  return resolved;
}

export async function buildDashboardAnalytics(
  storage: IStorage,
  options?: { triggerSms?: boolean; now?: Date },
): Promise<DashboardAnalytics> {
  const today = options?.now ? parseDateValue(options.now) : parseDateValue(new Date());
  const todayKey = safeIsoDate(today);
  const triggerSms = options?.triggerSms ?? false;

  const [eggRecords, salesRecords, chickenSalesRecords, chickenRecords, expenseRecords, feedRecords] = await Promise.all([
    storage.getEggCollections(),
    storage.getEggSales(),
    storage.getChickenSales(),
    storage.getChickenManagement(),
    storage.getExpenses(),
    storage.getFeedMetrics(),
  ]);

  const eggsByDate = new Map<string, { eggsProduced: number; brokenEggs: number }>();
  const eggTotalsByType = new Map<"Pure" | "Broiler", { collected: number; broken: number }>();
  for (const record of eggRecords) {
    const key = toDateOnly(record.date);
    const current = eggsByDate.get(key) ?? { eggsProduced: 0, brokenEggs: 0 };
    current.eggsProduced += toNumber(record.eggsCollected);
    current.brokenEggs += toNumber(record.brokenEggs);
    eggsByDate.set(key, current);

    const type = normalizeChickenType(record.chickenType);
    const totals = eggTotalsByType.get(type) ?? { collected: 0, broken: 0 };
    totals.collected += toNumber(record.eggsCollected);
    totals.broken += toNumber(record.brokenEggs);
    eggTotalsByType.set(type, totals);
  }

  const eggSalesByDate = new Map<string, { total: number; pure: number; broiler: number }>();
  const eggSalesTotalsByType = new Map<"Pure" | "Broiler", number>();
  const revenueByDate = new Map<string, number>();
  const eggSalesRevenueByType = new Map<"Pure" | "Broiler", number>();
  const chickenSalesRevenueByType = new Map<"Pure" | "Broiler", number>();
  for (const record of salesRecords) {
    const key = toDateOnly(record.date);
    const current = eggSalesByDate.get(key) ?? { total: 0, pure: 0, broiler: 0 };
    const eggsSold = toNumber(record.eggsSold);
    const chickenType = normalizeChickenType(record.chickenType);
    current.total += eggsSold;
    if (chickenType === "Broiler") {
      current.broiler += eggsSold;
    } else {
      current.pure += eggsSold;
    }
    eggSalesByDate.set(key, current);

    eggSalesTotalsByType.set(
      chickenType,
      (eggSalesTotalsByType.get(chickenType) ?? 0) + eggsSold,
    );
    const computed = toNumber(record.totalAmount);
    const fallback = toNumber(record.eggsSold) * toNumber(record.pricePerEgg);
    const amount = computed > 0 ? computed : fallback;
    revenueByDate.set(key, (revenueByDate.get(key) ?? 0) + amount);
    eggSalesRevenueByType.set(
      chickenType,
      (eggSalesRevenueByType.get(chickenType) ?? 0) + amount,
    );
  }
  for (const record of chickenSalesRecords) {
    const key = toDateOnly(record.date);
    const chickenType = normalizeChickenType(record.chickenType);
    const computed = toNumber(record.totalAmount);
    const fallback = toNumber(record.chickensSold) * toNumber(record.pricePerChicken);
    const amount = computed > 0 ? computed : fallback;
    revenueByDate.set(key, (revenueByDate.get(key) ?? 0) + amount);
    chickenSalesRevenueByType.set(
      chickenType,
      (chickenSalesRevenueByType.get(chickenType) ?? 0) + amount,
    );
  }

  const expenseByDate = new Map<string, number>();
  for (const record of expenseRecords) {
    const key = toDateOnly(record.date);
    expenseByDate.set(key, (expenseByDate.get(key) ?? 0) + toNumber(record.amount));
  }

  const feedByDate = new Map<string, { feedConsumedKg: number; feedStockKg: number; feedCost: number }>();
  const sortedFeed = [...feedRecords].sort((a, b) => {
    const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
    return dateDiff === 0 ? a.id - b.id : dateDiff;
  });
  for (const record of sortedFeed) {
    const key = toDateOnly(record.date);
    const current = feedByDate.get(key) ?? { feedConsumedKg: 0, feedStockKg: 0, feedCost: 0 };
    current.feedConsumedKg += toNumber(record.feedConsumedKg);
    current.feedStockKg = toNumber(record.closingStockKg);
    current.feedCost += toNumber(record.feedCost);
    feedByDate.set(key, current);
  }

  const chickenByDate = new Map<
    string,
    {
      totalChickens: number;
      healthy: number;
      sick: number;
      dead: number;
      chicks: number;
    }
  >();
  for (const record of chickenRecords) {
    const key = toDateOnly(record.date);
    const current = chickenByDate.get(key) ?? {
      totalChickens: 0,
      healthy: 0,
      sick: 0,
      dead: 0,
      chicks: 0,
    };
    current.totalChickens += toNumber(record.totalChickens);
    current.healthy += toNumber(record.healthy);
    current.sick += toNumber(record.sick);
    current.dead += toNumber(record.dead);
    current.chicks += toNumber(record.chicks);
    chickenByDate.set(key, current);
  }
  const mortalityByDate = new Map<string, number>();
  for (const [key, totals] of Array.from(chickenByDate.entries())) {
    mortalityByDate.set(key, totals.dead);
  }
  const sortedChickenRecords = [...chickenRecords].sort((a, b) => {
    const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
    return dateDiff === 0 ? b.id - a.id : dateDiff;
  });
  const latestChickenByType = new Map<"Pure" | "Broiler", number>();
  for (const record of sortedChickenRecords) {
    const chickenType = normalizeChickenType(record.chickenType);
    if (!latestChickenByType.has(chickenType)) {
      latestChickenByType.set(chickenType, toNumber(record.totalChickens));
    }
  }

  for (const [key, feed] of Array.from(feedByDate.entries())) {
    expenseByDate.set(key, (expenseByDate.get(key) ?? 0) + toNumber(feed.feedCost));
  }

  const dateKeys = buildRecentDateKeys(today, CHART_DAYS);

  const eggProduction = dateKeys.map((date) => ({
    date,
    eggsProduced: eggsByDate.get(date)?.eggsProduced ?? 0,
    brokenEggs: eggsByDate.get(date)?.brokenEggs ?? 0,
  }));

  const feedConsumption = dateKeys.map((date) => ({
    date,
    feedConsumedKg: feedByDate.get(date)?.feedConsumedKg ?? 0,
    feedStockKg: feedByDate.get(date)?.feedStockKg ?? 0,
  }));

  const todayEggs = eggsByDate.get(todayKey)?.eggsProduced ?? 0;
  const todayBroken = eggsByDate.get(todayKey)?.brokenEggs ?? 0;
  const todayEggSales = eggSalesByDate.get(todayKey) ?? { total: 0, pure: 0, broiler: 0 };
  const todayEggsSold = todayEggSales.total;
  const todayFeed = feedByDate.get(todayKey);
  const latestFeedMetric = sortedFeed.length > 0 ? sortedFeed[sortedFeed.length - 1] : null;
  const latestFeedStockKg =
    latestFeedMetric !== null ? toNumber(latestFeedMetric.closingStockKg) : null;
  const [
    totalEggsAvailable,
    totalFeedRemaining,
    totalChickensAvailable,
    eggRevenue,
    chickenRevenue,
  ] = await Promise.all([
    calculateEggAvailability(storage),
    calculateFeedRemaining(storage),
    calculateChickenCount(storage),
    calculateEggRevenue(storage),
    calculateChickenRevenue(storage),
  ]);

  const pureEggTotals = eggTotalsByType.get("Pure") ?? { collected: 0, broken: 0 };
  const broilerEggTotals = eggTotalsByType.get("Broiler") ?? { collected: 0, broken: 0 };
  const pureEggsSoldTotal = eggSalesTotalsByType.get("Pure") ?? 0;
  const broilerEggsSoldTotal = eggSalesTotalsByType.get("Broiler") ?? 0;
  const pureEggRevenue = eggSalesRevenueByType.get("Pure") ?? 0;
  const broilerEggRevenue = eggSalesRevenueByType.get("Broiler") ?? 0;
  const pureChickensAvailable = latestChickenByType.get("Pure") ?? 0;
  const broilerChickensAvailable = latestChickenByType.get("Broiler") ?? 0;
  const pureChickenRevenue = chickenSalesRevenueByType.get("Pure") ?? 0;
  const broilerChickenRevenue = chickenSalesRevenueByType.get("Broiler") ?? 0;
  const pureEggsAvailable = Math.max(
    0,
    pureEggTotals.collected - pureEggTotals.broken - pureEggsSoldTotal,
  );
  const broilerEggsAvailable = Math.max(
    0,
    broilerEggTotals.collected - broilerEggTotals.broken - broilerEggsSoldTotal,
  );

  const generatedAlerts = generateAlerts(todayKey, eggsByDate, mortalityByDate, latestFeedStockKg);
  const alerts = await attachAlertStatuses(storage, todayKey, generatedAlerts, triggerSms);

  return {
    generatedAt: new Date().toISOString(),
    today: {
      date: todayKey,
      eggsProduced: todayEggs,
      brokenEggs: todayBroken,
      totalEggsAvailable,
      totalEggsSold: todayEggsSold,
      pureEggsSold: todayEggSales.pure,
      broilerEggsSold: todayEggSales.broiler,
      pureEggsAvailable,
      broilerEggsAvailable,
      totalFeedRemaining,
      totalChickensAvailable,
      eggRevenue,
      chickenRevenue,
      pureChickensAvailable,
      broilerChickensAvailable,
      pureEggRevenue,
      broilerEggRevenue,
      pureChickenRevenue,
      broilerChickenRevenue,
      feedConsumedKg: todayFeed?.feedConsumedKg ?? 0,
      mortalityCount: mortalityByDate.get(todayKey) ?? 0,
    },
    charts: {
      eggProduction,
      feedConsumption,
    },
    alerts,
  };
}

export async function triggerSmartAlerts(storage: IStorage): Promise<void> {
  await buildDashboardAnalytics(storage, { triggerSms: true });
}

