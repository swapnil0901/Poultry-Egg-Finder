import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import OpenAI from "openai";
import { buildDashboardAnalytics, triggerSmartAlerts } from "./services/dashboard-analytics";

function resolveOpenAIBaseUrl(): string | undefined {
  const raw =
    process.env.AI_INTEGRATIONS_OPENAI_BASE_URL ?? process.env.OPENAI_BASE_URL;
  const candidate = raw?.trim();

  if (!candidate) {
    return undefined;
  }

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      throw new Error("Unsupported protocol");
    }
    return parsed.toString();
  } catch {
    console.warn(
      `Ignoring invalid OpenAI base URL: "${candidate}". Expected full http(s) URL.`,
    );
    return undefined;
  }
}

// Using Replit AI integrations blueprint
const openaiApiKey =
  process.env.AI_INTEGRATIONS_OPENAI_API_KEY ?? process.env.OPENAI_API_KEY;
const openaiBaseUrl = resolveOpenAIBaseUrl();
const openai = openaiApiKey
  ? new OpenAI({
      apiKey: openaiApiKey,
      baseURL: openaiBaseUrl,
    })
  : null;

type FarmSnapshot = {
  totalEggs: number;
  totalBrokenEggs: number;
  brokenRate: number;
  totalSold: number;
  totalChickenSold: number;
  remainingEggs: number;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  latestChicken:
    | {
        totalChickens: number;
        healthy: number;
        sick: number;
        dead: number;
        chicks: number;
      }
    | undefined;
  latestDisease: Awaited<ReturnType<typeof storage.getDiseaseRecords>>[number] | undefined;
  nextVaccination: Awaited<ReturnType<typeof storage.getVaccinations>>[number] | undefined;
  overdueVaccinations: number;
};

type SafeUser = {
  id: number;
  name: string;
  email: string;
  role: string;
  createdAt?: Date | string | null;
};

function toNumber(value: unknown): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function sanitizeUser(user: {
  id: number;
  name: string;
  email: string;
  role: string;
  createdAt?: Date | string | null;
}): SafeUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt ?? null,
  };
}

function toDateOnly(value: string | Date): string {
  if (value instanceof Date) {
    return value.toISOString().split("T")[0];
  }
  return new Date(value).toISOString().split("T")[0];
}

function formatRupees(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDateLabel(value: string | Date | null | undefined): string {
  if (!value) {
    return "N/A";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "N/A";
  }

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function normalizeWhatsAppPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) {
    return `91${digits}`;
  }
  if (digits.length === 11 && digits.startsWith("0")) {
    return `91${digits.slice(1)}`;
  }
  if (digits.length === 12 && digits.startsWith("91")) {
    return digits;
  }
  return digits;
}

function generateWhatsAppAlertMessage(input: {
  date: string;
  eggs: number;
  brokenEggs: number;
  feed: number;
  profit: number;
  status: string;
}): string {
  return [
    "Smart Poultry Farm Alert",
    "",
    `Date: ${input.date}`,
    "",
    `Eggs Produced: ${input.eggs}`,
    `Broken Eggs: ${input.brokenEggs}`,
    "",
    `Feed Consumed: ${input.feed} kg`,
    "",
    `Profit Today: Rs ${input.profit}`,
    "",
    `System Status: ${input.status}`,
    "",
    "Smart Poultry Monitoring System",
  ].join("\n");
}

function resolveStorageDate(value: string | undefined, fallback: string): string {
  if (!value) {
    return fallback;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return fallback;
  }

  return parsed.toISOString().split("T")[0];
}

async function buildFarmSnapshot(): Promise<FarmSnapshot> {
  const [eggs, sales, chickenSales, chickens, diseases, expenses, vaccinations] = await Promise.all([
    storage.getEggCollections(),
    storage.getEggSales(),
    storage.getChickenSales(),
    storage.getChickenManagement(),
    storage.getDiseaseRecords(),
    storage.getExpenses(),
    storage.getVaccinations(),
  ]);

  const totalEggs = eggs.reduce((sum, record) => sum + record.eggsCollected, 0);
  const totalBrokenEggs = eggs.reduce(
    (sum, record) => sum + toNumber((record as { brokenEggs?: number }).brokenEggs),
    0,
  );
  const totalSold = sales.reduce((sum, record) => sum + record.eggsSold, 0);
  const totalChickenSold = chickenSales.reduce((sum, record) => sum + record.chickensSold, 0);
  const totalRevenue =
    sales.reduce((sum, record) => sum + toNumber(record.totalAmount), 0) +
    chickenSales.reduce((sum, record) => sum + toNumber(record.totalAmount), 0);
  const totalExpenses = expenses.reduce(
    (sum, record) => sum + toNumber(record.amount),
    0,
  );
  const chickenByDate = new Map<
    string,
    { totalChickens: number; healthy: number; sick: number; dead: number; chicks: number }
  >();
  for (const record of chickens) {
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
  const latestChickenDate = chickens[0] ? toDateOnly(chickens[0].date) : null;
  const latestChicken =
    latestChickenDate !== null ? chickenByDate.get(latestChickenDate) : undefined;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const vaccinationTimeline = vaccinations
    .map((record) => ({
      record,
      date: new Date(record.nextVaccination),
    }))
    .filter((item) => !Number.isNaN(item.date.getTime()));

  const nextVaccination = vaccinationTimeline
    .filter((item) => item.date >= today)
    .sort((a, b) => a.date.getTime() - b.date.getTime())[0]?.record;

  const overdueVaccinations = vaccinationTimeline.filter(
    (item) => item.date < today,
  ).length;

  return {
    totalEggs,
    totalBrokenEggs,
    brokenRate: totalEggs > 0 ? totalBrokenEggs / totalEggs : 0,
    totalSold,
    totalChickenSold,
    remainingEggs: totalEggs - totalSold,
    totalRevenue,
    totalExpenses,
    netProfit: totalRevenue - totalExpenses,
    latestChicken,
    latestDisease: diseases[0],
    nextVaccination,
    overdueVaccinations,
  };
}

function buildSnapshotSummary(snapshot: FarmSnapshot): string {
  return [
    `Total eggs collected: ${snapshot.totalEggs}`,
    `Total broken eggs: ${snapshot.totalBrokenEggs} (${(snapshot.brokenRate * 100).toFixed(1)}%)`,
    `Total eggs sold: ${snapshot.totalSold}`,
    `Total chickens sold: ${snapshot.totalChickenSold}`,
    `Remaining eggs: ${snapshot.remainingEggs}`,
    `Total revenue: ${formatRupees(snapshot.totalRevenue)}`,
    `Total expenses: ${formatRupees(snapshot.totalExpenses)}`,
    `Net profit: ${formatRupees(snapshot.netProfit)}`,
    `Latest flock status: total=${snapshot.latestChicken?.totalChickens ?? 0}, healthy=${snapshot.latestChicken?.healthy ?? 0}, sick=${snapshot.latestChicken?.sick ?? 0}, dead=${snapshot.latestChicken?.dead ?? 0}, chicks=${snapshot.latestChicken?.chicks ?? 0}`,
    `Latest disease: ${snapshot.latestDisease?.diseaseName ?? "None"} (affected=${snapshot.latestDisease?.chickensAffected ?? 0}, date=${formatDateLabel(snapshot.latestDisease?.date)})`,
    `Next vaccination: ${snapshot.nextVaccination?.vaccineName ?? "N/A"} on ${formatDateLabel(snapshot.nextVaccination?.nextVaccination)}`,
    `Overdue vaccinations: ${snapshot.overdueVaccinations}`,
  ].join("\n");
}

function buildFallbackAIResponse(message: string, snapshot: FarmSnapshot): string {
  const text = message.toLowerCase();

  if (text.includes("summary") || text.includes("overview") || text.includes("status")) {
    return `Farm summary:\n- Eggs collected: ${snapshot.totalEggs}\n- Broken eggs: ${snapshot.totalBrokenEggs} (${(snapshot.brokenRate * 100).toFixed(1)}%)\n- Eggs sold: ${snapshot.totalSold}\n- Chickens sold: ${snapshot.totalChickenSold}\n- Remaining eggs: ${snapshot.remainingEggs}\n- Revenue: ${formatRupees(snapshot.totalRevenue)}\n- Expenses: ${formatRupees(snapshot.totalExpenses)}\n- Net profit: ${formatRupees(snapshot.netProfit)}`;
  }

  if (text.includes("broken")) {
    return `Broken eggs recorded: ${snapshot.totalBrokenEggs}. Breakage rate is ${(snapshot.brokenRate * 100).toFixed(1)}% of ${snapshot.totalEggs} total collected eggs.`;
  }

  if (text.includes("egg") || text.includes("production") || text.includes("yield")) {
    return `Egg performance: ${snapshot.totalEggs} collected, ${snapshot.totalSold} sold, ${snapshot.remainingEggs} remaining, and ${snapshot.totalBrokenEggs} broken (${(snapshot.brokenRate * 100).toFixed(1)}%).`;
  }

  if (text.includes("sale") || text.includes("revenue") || text.includes("income") || text.includes("profit")) {
    return `Financials: revenue ${formatRupees(snapshot.totalRevenue)}, expenses ${formatRupees(snapshot.totalExpenses)}, net profit ${formatRupees(snapshot.netProfit)}.`;
  }

  if (text.includes("expense") || text.includes("cost") || text.includes("feed")) {
    return `Total recorded expenses are ${formatRupees(snapshot.totalExpenses)}. If costs are rising, compare feed supplier rates and monitor feed conversion weekly.`;
  }

  if (text.includes("sick") || text.includes("disease") || text.includes("health")) {
    const diseasePart = snapshot.latestDisease
      ? `Latest disease record: ${snapshot.latestDisease.diseaseName} affecting ${snapshot.latestDisease.chickensAffected} birds on ${formatDateLabel(snapshot.latestDisease.date)}.`
      : "No disease records found yet.";
    return `Current flock health: healthy ${snapshot.latestChicken?.healthy ?? 0}, sick ${snapshot.latestChicken?.sick ?? 0}, dead ${snapshot.latestChicken?.dead ?? 0}. ${diseasePart}`;
  }

  if (text.includes("vaccin")) {
    return `Next vaccination: ${snapshot.nextVaccination?.vaccineName ?? "N/A"} on ${formatDateLabel(snapshot.nextVaccination?.nextVaccination)}. Overdue vaccinations: ${snapshot.overdueVaccinations}.`;
  }

  return `I can answer using your farm data. Ask about eggs, broken eggs, sales, profit, expenses, flock health, or vaccinations.\nQuick status: Eggs ${snapshot.totalEggs}, Revenue ${formatRupees(snapshot.totalRevenue)}, Profit ${formatRupees(snapshot.netProfit)}.`;
}

function normalizeBase64Image(input: string): string {
  if (input.startsWith("data:image/")) {
    return input;
  }
  return `data:image/jpeg;base64,${input}`;
}

function estimateDiseaseFromNotes(notes: string | undefined): z.infer<typeof api.ai.diseaseDetection.responses[200]> {
  const text = (notes || "").toLowerCase();

  if (
    text.includes("twisted neck") ||
    text.includes("paralysis") ||
    text.includes("respiratory") ||
    text.includes("sneeze")
  ) {
    return {
      disease: "Possible Newcastle Disease",
      confidence: 78,
      severity: "high",
      suggestedTreatment:
        "Isolate affected birds, start Newcastle vaccination protocol for healthy flock, and consult a veterinarian for antibiotics/supportive care.",
      observations:
        "Symptoms pattern suggests a possible viral respiratory-neurological infection.",
    };
  }

  if (
    text.includes("bloody") ||
    text.includes("diarrhea") ||
    text.includes("droppings")
  ) {
    return {
      disease: "Possible Coccidiosis",
      confidence: 74,
      severity: "moderate",
      suggestedTreatment:
        "Start anticoccidial treatment, improve litter dryness, and sanitize drinkers/feeders.",
      observations:
        "Digestive symptom pattern is commonly associated with coccidial infection.",
    };
  }

  if (text.includes("swollen eye") || text.includes("nasal discharge") || text.includes("cough")) {
    return {
      disease: "Possible Chronic Respiratory Disease (CRD)",
      confidence: 71,
      severity: "moderate",
      suggestedTreatment:
        "Improve shed ventilation, isolate sick birds, and consult a vet for targeted respiratory antibiotics.",
      observations:
        "Respiratory signs may indicate bacterial respiratory disease spread.",
    };
  }

  return {
    disease: "General Stress / Nutritional Imbalance",
    confidence: 58,
    severity: "low",
    suggestedTreatment:
      "Review feed quality, water hygiene, temperature control, and monitor birds for 48 hours.",
    observations:
      "No strong disease signature detected from the provided input. Clinical confirmation is recommended.",
  };
}

async function detectDiseaseFromImage(
  imageBase64: string,
  notes?: string,
): Promise<z.infer<typeof api.ai.diseaseDetection.responses[200]>> {
  if (!openai) {
    return estimateDiseaseFromNotes(notes);
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You are a poultry disease triage assistant. Analyze image + farmer notes and return strict JSON with keys: disease, confidence, severity, suggestedTreatment, observations. confidence is number 0-100. severity must be one of: low, moderate, high.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Farmer notes: ${notes || "No additional notes provided."}`,
            },
            {
              type: "image_url",
              image_url: { url: normalizeBase64Image(imageBase64) },
            },
          ],
        } as any,
      ] as any,
    });

    const payload = response.choices[0]?.message?.content;
    if (!payload) {
      return estimateDiseaseFromNotes(notes);
    }

    const parsed = JSON.parse(payload) as Record<string, unknown>;
    const severityRaw = String(parsed.severity || "moderate").toLowerCase();
    const severity =
      severityRaw === "low" || severityRaw === "moderate" || severityRaw === "high"
        ? severityRaw
        : "moderate";

    return {
      disease: String(parsed.disease || "Possible poultry health issue"),
      confidence: Math.min(99, Math.max(1, Math.round(toNumber(parsed.confidence) || 60))),
      severity,
      suggestedTreatment: String(
        parsed.suggestedTreatment ||
          "Isolate suspicious birds and consult a veterinarian for lab confirmation.",
      ),
      observations: String(
        parsed.observations ||
          "AI review completed. Use this as preliminary guidance, not a final diagnosis.",
      ),
    };
  } catch (error) {
    console.error("Vision disease detection failed, using fallback:", error);
    return estimateDiseaseFromNotes(notes);
  }
}

function linearRegressionNext(values: number[]): { slope: number; next: number } {
  if (values.length <= 1) {
    return { slope: 0, next: values[0] ?? 0 };
  }

  const n = values.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  values.forEach((value, index) => {
    sumX += index;
    sumY += value;
    sumXY += index * value;
    sumXX += index * index;
  });

  const denominator = n * sumXX - sumX * sumX;
  const slope = denominator === 0 ? 0 : (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;
  const next = intercept + slope * n;

  return { slope, next };
}

async function predictEggProduction(
  days: number,
): Promise<z.infer<typeof api.ai.eggPrediction.responses[200]>> {
  const records = await storage.getEggCollections();
  const sorted = [...records].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  const recent = sorted.slice(-days);
  const netEggValues = recent.map(
    (record) => record.eggsCollected - toNumber((record as { brokenEggs?: number }).brokenEggs),
  );

  if (netEggValues.length === 0) {
    return {
      daysUsed: 0,
      expectedTomorrow: 0,
      expectedThisWeek: 0,
      trend: "stable",
      confidence: 0,
      insights: "No egg collection history found. Add at least 7 days of records for prediction.",
    };
  }

  const average =
    netEggValues.reduce((sum, value) => sum + value, 0) / netEggValues.length;
  const regression = linearRegressionNext(netEggValues);
  const blendedTomorrow = (regression.next + netEggValues[netEggValues.length - 1]) / 2;
  const expectedTomorrow = Math.max(0, Math.round(blendedTomorrow || average));
  const expectedThisWeek = Math.max(0, Math.round(expectedTomorrow * 7));
  const trend =
    regression.slope > 2 ? "increasing" : regression.slope < -2 ? "decreasing" : "stable";
  const confidence = Math.min(
    95,
    Math.max(45, Math.round(45 + Math.min(netEggValues.length, days) * 1.2)),
  );

  return {
    daysUsed: recent.length,
    expectedTomorrow,
    expectedThisWeek,
    trend,
    confidence,
    insights:
      trend === "increasing"
        ? "Production trend is improving. Maintain current feed and health routines."
        : trend === "decreasing"
          ? "Production trend is softening. Review feed quality, disease signs, and shed stress factors."
          : "Production is stable. Small feed and lighting optimizations can improve output.",
  };
}

function generateFeedPlan(
  input: z.infer<typeof api.ai.feedRecommendation.input>,
): z.infer<typeof api.ai.feedRecommendation.responses[200]> {
  let perBirdDailyKg = input.avgWeightKg < 1 ? 0.065 : input.avgWeightKg < 2 ? 0.08 : 0.095;
  let waterPerBirdLiters = 0.25;

  if (input.weather === "hot") {
    perBirdDailyKg *= 0.95;
    waterPerBirdLiters *= 1.25;
  } else if (input.weather === "cold") {
    perBirdDailyKg *= 1.08;
    waterPerBirdLiters *= 1.1;
  }

  const totalFeed = input.farmSize * perBirdDailyKg;
  const morningFeedKg = Number((totalFeed * 0.53).toFixed(1));
  const eveningFeedKg = Number((totalFeed * 0.47).toFixed(1));
  const waterLiters = Number((input.farmSize * waterPerBirdLiters).toFixed(1));

  return {
    morningFeedKg,
    eveningFeedKg,
    waterLiters,
    recommendation:
      input.weather === "hot"
        ? "Use cool clean water, add electrolytes, and feed heavier portion during cooler hours."
        : input.weather === "cold"
          ? "Increase energy density slightly and keep water temperature moderate."
          : "Maintain consistent feed timing and keep feeders clean to reduce wastage.",
  };
}

async function buildSmartReport(
  period: z.infer<typeof api.ai.smartReport.input>["period"],
): Promise<z.infer<typeof api.ai.smartReport.responses[200]>> {
  const days = period === "monthly" ? 30 : 7;
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - days + 1);

  const [snapshot, eggs, sales, chickenSales, expenses] = await Promise.all([
    buildFarmSnapshot(),
    storage.getEggCollections(),
    storage.getEggSales(),
    storage.getChickenSales(),
    storage.getExpenses(),
  ]);

  const periodEggs = eggs.filter((record) => new Date(record.date) >= cutoff);
  const periodSales = sales.filter((record) => new Date(record.date) >= cutoff);
  const periodChickenSales = chickenSales.filter((record) => new Date(record.date) >= cutoff);
  const periodExpenses = expenses.filter((record) => new Date(record.date) >= cutoff);

  const eggsCollected = periodEggs.reduce((sum, record) => sum + record.eggsCollected, 0);
  const brokenEggs = periodEggs.reduce(
    (sum, record) => sum + toNumber((record as { brokenEggs?: number }).brokenEggs),
    0,
  );
  const revenue =
    periodSales.reduce((sum, record) => sum + toNumber(record.totalAmount), 0) +
    periodChickenSales.reduce((sum, record) => sum + toNumber(record.totalAmount), 0);
  const expenseAmount = periodExpenses.reduce((sum, record) => sum + toNumber(record.amount), 0);
  const periodProfit = revenue - expenseAmount;
  const breakageRate = eggsCollected > 0 ? (brokenEggs / eggsCollected) * 100 : 0;

  const highlights = [
    `${days}-day collection: ${eggsCollected} eggs`,
    `${days}-day chicken sales: ${periodChickenSales.reduce((sum, record) => sum + record.chickensSold, 0)} birds`,
    `Breakage: ${brokenEggs} eggs (${breakageRate.toFixed(1)}%)`,
    `Revenue: ${formatRupees(revenue)}, Expenses: ${formatRupees(expenseAmount)}`,
    `Profit for period: ${formatRupees(periodProfit)}`,
  ];

  const risks: string[] = [];
  if (breakageRate > 3) risks.push("Broken egg rate is above 3%; check handling and tray quality.");
  if ((snapshot.latestChicken?.sick ?? 0) > 0) {
    risks.push(`${snapshot.latestChicken?.sick} birds are currently marked sick.`);
  }
  if (snapshot.overdueVaccinations > 0) {
    risks.push(`${snapshot.overdueVaccinations} vaccination records appear overdue.`);
  }
  if (periodProfit < 0) {
    risks.push("This period shows negative profit; prioritize expense optimization.");
  }
  if (risks.length === 0) {
    risks.push("No critical risk flags detected from current records.");
  }

  const actions = [
    "Review top 3 expense categories and set a weekly spending cap.",
    "Track broken eggs shed-wise daily and target <2% breakage.",
    "Re-check feed quality and water hygiene every morning.",
  ];
  if ((snapshot.latestChicken?.sick ?? 0) > 0) {
    actions.unshift("Isolate sick birds and monitor treatment response daily.");
  }

  return {
    title: period === "monthly" ? "Monthly Smart Analysis" : "Weekly Smart Analysis",
    summary:
      periodProfit >= 0
        ? `Farm is profitable for the selected ${period} period with ${formatRupees(periodProfit)} net gain.`
        : `Farm is at a ${formatRupees(Math.abs(periodProfit))} loss for the selected ${period} period.`,
    highlights,
    risks,
    actions,
  };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Auth routes (mock JWT for now)
  app.post(api.auth.login.path, async (req, res) => {
    try {
      const input = api.auth.login.input.parse(req.body);
      // Allow fixed admin credentials without hitting storage for quick local sign-in
      if (input.email === "admin@gmail.com" && input.password === "123456") {
        return res.json({
          token: "mock-jwt-token-0",
          user: sanitizeUser({
            id: 0,
            name: "Admin",
            email: input.email,
            role: "admin",
          }),
        });
      }
      const user = await storage.getUserByEmail(input.email);
      if (!user || user.password !== input.password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      res.json({ token: "mock-jwt-token-" + user.id, user: sanitizeUser(user) });
    } catch (err) {
      res.status(401).json({ message: "Invalid credentials" });
    }
  });

  app.post(api.auth.register.path, async (req, res) => {
    try {
      const input = api.auth.register.input.parse(req.body);
      const existing = await storage.getUserByEmail(input.email);
      if (existing) {
        return res.status(409).json({ message: "Email already registered. Please sign in." });
      }

      const user = await storage.createUser(input);
      res.status(201).json({ token: "mock-jwt-token-" + user.id, user: sanitizeUser(user) });
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
      } else {
        const dbError = err as { code?: string | number; message?: string };

        if (dbError.code === "23505" || dbError.code === "11000" || dbError.code === 11000) {
          return res.status(409).json({ message: "Email already registered. Please sign in." });
        }

        if (dbError.code === "42703") {
          return res.status(500).json({
            message: "Database schema is outdated. Run database migration and redeploy.",
          });
        }

        console.error("Register failed:", err);
        res.status(500).json({
          message: dbError.message || "Unable to create user right now. Please try again.",
        });
      }
    }
  });

  app.get(api.auth.me.path, async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer mock-jwt-token-")) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const id = parseInt(authHeader.replace("Bearer mock-jwt-token-", ""));
    const user = await storage.getUserById(id);
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    res.json(sanitizeUser(user));
  });

  // Egg Collection
  app.get(api.eggCollection.list.path, async (req, res) => {
    const records = await storage.getEggCollections();
    res.json(records);
  });

  app.post(api.eggCollection.create.path, async (req, res) => {
    try {
      const input = api.eggCollection.create.input.parse(req.body);
      const record = await storage.createEggCollection(input);
      void triggerSmartAlerts(storage).catch((error) => {
        console.error("Smart alert trigger failed after egg collection:", error);
      });
      res.status(201).json(record);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
      } else {
        res.status(400).json({ message: "Bad request" });
      }
    }
  });

  // Egg Sales
  app.get(api.eggSales.list.path, async (req, res) => {
    const records = await storage.getEggSales();
    res.json(records);
  });

  app.post(api.eggSales.create.path, async (req, res) => {
    try {
      const input = api.eggSales.create.input.parse(req.body);
      const record = await storage.createEggSales(input);
      res.status(201).json(record);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
      } else {
        res.status(400).json({ message: "Bad request" });
      }
    }
  });

  // Chicken Sales
  app.get(api.chickenSales.list.path, async (_req, res) => {
    const records = await storage.getChickenSales();
    res.json(records);
  });

  app.post(api.chickenSales.create.path, async (req, res) => {
    try {
      const input = api.chickenSales.create.input.parse(req.body);
      const record = await storage.createChickenSales(input);
      res.status(201).json(record);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
      } else {
        res.status(400).json({ message: "Bad request" });
      }
    }
  });

  // Chickens
  app.get(api.chickens.list.path, async (req, res) => {
    const records = await storage.getChickenManagement();
    res.json(records);
  });

  app.post(api.chickens.create.path, async (req, res) => {
    try {
      const input = api.chickens.create.input.parse(req.body);
      const record = await storage.createChickenManagement(input);
      void triggerSmartAlerts(storage).catch((error) => {
        console.error("Smart alert trigger failed after chicken update:", error);
      });
      res.status(201).json(record);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
      } else {
        res.status(400).json({ message: "Bad request" });
      }
    }
  });

  // Diseases
  app.get(api.diseases.list.path, async (req, res) => {
    const records = await storage.getDiseaseRecords();
    res.json(records);
  });

  app.post(api.diseases.create.path, async (req, res) => {
    try {
      const input = api.diseases.create.input.parse(req.body);
      const record = await storage.createDiseaseRecord(input);
      res.status(201).json(record);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
      } else {
        res.status(400).json({ message: "Bad request" });
      }
    }
  });

  // Inventory
  app.get(api.inventory.list.path, async (req, res) => {
    const records = await storage.getInventory();
    res.json(records);
  });

  app.post(api.inventory.create.path, async (req, res) => {
    try {
      const input = api.inventory.create.input.parse(req.body);
      const record = await storage.createInventory(input);
      res.status(201).json(record);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
      } else {
        res.status(400).json({ message: "Bad request" });
      }
    }
  });

  // Expenses
  app.get(api.expenses.list.path, async (req, res) => {
    const records = await storage.getExpenses();
    res.json(records);
  });

  app.post(api.expenses.create.path, async (req, res) => {
    try {
      const input = api.expenses.create.input.parse(req.body);
      const record = await storage.createExpense(input);
      res.status(201).json(record);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
      } else {
        res.status(400).json({ message: "Bad request" });
      }
    }
  });

  // Feed Metrics
  app.get(api.feedMetrics.list.path, async (_req, res) => {
    const records = await storage.getFeedMetrics();
    res.json(records);
  });

  app.post(api.feedMetrics.create.path, async (req, res) => {
    try {
      const input = api.feedMetrics.create.input.parse(req.body);
      const record = await storage.createFeedMetric(input);
      void triggerSmartAlerts(storage).catch((error) => {
        console.error("Smart alert trigger failed after feed update:", error);
      });
      res.status(201).json(record);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
      } else {
        res.status(400).json({ message: "Bad request" });
      }
    }
  });

  // Vaccinations
  app.get(api.vaccinations.list.path, async (req, res) => {
    const records = await storage.getVaccinations();
    res.json(records);
  });

  app.post(api.vaccinations.create.path, async (req, res) => {
    try {
      const input = api.vaccinations.create.input.parse(req.body);
      const record = await storage.createVaccination(input);
      res.status(201).json(record);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
      } else {
        res.status(400).json({ message: "Bad request" });
      }
    }
  });

  // Dashboard Analytics
  app.get(api.dashboard.analytics.path, async (_req, res) => {
    try {
      const analytics = await buildDashboardAnalytics(storage, { triggerSms: true });
      res.json(analytics);
    } catch (err) {
      console.error("Failed to build dashboard analytics:", err);
      res.status(500).json({ message: "Unable to load dashboard analytics" });
    }
  });

  app.get(api.alerts.history.path, async (req, res) => {
    const limit = Number(req.query.limit ?? 50);
    const records = await storage.getWhatsAppMessages(Number.isFinite(limit) ? limit : 50);
    res.json(records);
  });

  // WhatsApp Link Alert Generator (No paid API required)
  app.post(api.alerts.sendWhatsApp.path, async (req, res) => {
    try {
      const input = api.alerts.sendWhatsApp.input.parse(req.body);
      const analytics = await buildDashboardAnalytics(storage, { triggerSms: false });
      const hasManualValues =
        input.eggs !== undefined ||
        input.brokenEggs !== undefined ||
        input.feed !== undefined ||
        input.profit !== undefined ||
        input.date !== undefined;

      const eggs = input.eggs ?? analytics.today.eggsProduced;
      const brokenEggs = input.brokenEggs ?? analytics.today.brokenEggs;
      const feed = input.feed ?? analytics.today.feedConsumedKg;
      const profit = input.profit ?? analytics.today.netProfit;
      const displayDate = input.date ?? analytics.today.date;
      const storageDate = resolveStorageDate(input.date, analytics.today.date);
      const status =
        input.status?.trim() ||
        (analytics.alerts.some((alert) => alert.severity === "critical")
          ? "Needs Attention"
          : "Normal");

      const fallbackPhone =
        process.env.FARM_OWNER_WHATSAPP?.trim() ?? process.env.FARM_OWNER_PHONE?.trim();
      const rawPhone = input.phone ?? fallbackPhone;
      if (!rawPhone) {
        return res.status(400).json({
          message: "Phone is required. Pass phone in body or set FARM_OWNER_PHONE.",
        });
      }

      const phone = normalizeWhatsAppPhone(rawPhone);
      const message = generateWhatsAppAlertMessage({
        date: displayDate,
        eggs,
        brokenEggs,
        feed,
        profit,
        status,
      });
      const whatsappLink = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
      const saved = await storage.createWhatsAppMessage({
        phone,
        messageDate: storageDate,
        eggs,
        brokenEggs,
        feedConsumedKg: feed,
        profit,
        status,
        messageText: message,
        whatsappLink,
      });

      return res.json({
        status: "Message Ready",
        messageId: saved.id,
        dataSource: hasManualValues ? "request" : "database",
        preview: message,
        whatsappLink,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error("Failed to generate WhatsApp alert link:", err);
      return res.status(500).json({ message: "Unable to generate WhatsApp alert link" });
    }
  });

  // AI Chat
  app.post(api.ai.chat.path, async (req, res) => {
    try {
      const { message } = api.ai.chat.input.parse(req.body);
      const snapshot = await buildFarmSnapshot();

      if (!openai) {
        return res.json({ response: buildFallbackAIResponse(message, snapshot) });
      }

      try {
        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "You are an AI assistant for a poultry farm called 'Poultry Egg Tracker'. Use the provided farm snapshot values as the source of truth for numeric answers. If data is missing, state that clearly. Keep responses concise and practical.",
            },
            {
              role: "system",
              content: `Farm snapshot:\n${buildSnapshotSummary(snapshot)}`,
            },
            { role: "user", content: message },
          ],
          temperature: 0.3,
        });

        return res.json({
          response:
            response.choices[0]?.message?.content ||
            "I couldn't process that request.",
        });
      } catch (err) {
        console.error("OpenAI request failed, returning fallback response:", err);
        return res.json({ response: buildFallbackAIResponse(message, snapshot) });
      }
    } catch (err) {
      console.error(err);
      res.status(400).json({ message: "Invalid AI request payload" });
    }
  });

  // AI Disease Detection
  app.post(api.ai.diseaseDetection.path, async (req, res) => {
    try {
      const input = api.ai.diseaseDetection.input.parse(req.body);
      const result = await detectDiseaseFromImage(input.imageBase64, input.notes);
      res.json(result);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
      } else {
        console.error("Disease detection failed:", err);
        res.status(400).json({ message: "Unable to analyze uploaded image" });
      }
    }
  });

  // AI Egg Production Prediction
  app.post(api.ai.eggPrediction.path, async (req, res) => {
    try {
      const input = api.ai.eggPrediction.input.parse(req.body);
      const result = await predictEggProduction(input.days);
      res.json(result);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
      } else {
        console.error("Egg prediction failed:", err);
        res.status(400).json({ message: "Unable to generate egg prediction" });
      }
    }
  });

  // AI Feed Recommendation
  app.post(api.ai.feedRecommendation.path, async (req, res) => {
    try {
      const input = api.ai.feedRecommendation.input.parse(req.body);
      const result = generateFeedPlan(input);
      res.json(result);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
      } else {
        console.error("Feed recommendation failed:", err);
        res.status(400).json({ message: "Unable to generate feed recommendation" });
      }
    }
  });

  // AI Smart Reports
  app.post(api.ai.smartReport.path, async (req, res) => {
    try {
      const input = api.ai.smartReport.input.parse(req.body);
      const result = await buildSmartReport(input.period);
      res.json(result);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
      } else {
        console.error("Smart report generation failed:", err);
        res.status(400).json({ message: "Unable to generate smart report" });
      }
    }
  });

  // Seed data function to provide realistic example data
  seedDatabase().catch(console.error);

  return httpServer;
}

async function seedDatabase() {
  try {
    const users = await storage.getUserByEmail("admin@poultry.com");
    if (!users) {
      await storage.createUser({
        name: "Admin Farmer",
        email: "admin@poultry.com",
        password: "password123",
        role: "admin"
      });
      
      const today = new Date().toISOString().split('T')[0];
      
      await storage.createChickenManagement({
        totalChickens: 1000,
        healthy: 980,
        sick: 15,
        dead: 5,
        chicks: 200,
        chickenType: "Pure",
      });
      
      await storage.createEggCollection({
        date: today,
        eggsCollected: 850,
        brokenEggs: 12,
        chickenType: "Pure",
        shed: "Shed A",
        notes: "Normal collection"
      });
      
      await storage.createEggSales({
        date: today,
        eggsSold: 800,
        pricePerEgg: 5,
        customerName: "Local Market",
        chickenType: "Pure",
        saleType: "Egg",
        totalAmount: 4000
      });

      await storage.createChickenSales({
        date: today,
        chickensSold: 40,
        pricePerChicken: 320,
        customerName: "District Buyer",
        totalAmount: 12800,
        chickenType: "Broiler",
        notes: "Weekend batch sale",
      });
      
      await storage.createExpense({
        date: today,
        expenseType: "Feed purchase",
        amount: 2500,
        description: "50kg layers mash"
      });

      await storage.createFeedMetric({
        date: today,
        openingStockKg: 42,
        feedAddedKg: 15,
        feedConsumedKg: 32,
        closingStockKg: 25,
        feedCost: 1800,
        notes: "Daily feed consumption entry",
      });

      await triggerSmartAlerts(storage);
    }
  } catch (e) {
    console.error("Seed database failed:", e);
  }
}
