import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import OpenAI from "openai";

// Using Replit AI integrations blueprint
const openaiApiKey =
  process.env.AI_INTEGRATIONS_OPENAI_API_KEY ?? process.env.OPENAI_API_KEY;
const openai = openaiApiKey
  ? new OpenAI({
      apiKey: openaiApiKey,
      baseURL:
        process.env.AI_INTEGRATIONS_OPENAI_BASE_URL ??
        process.env.OPENAI_BASE_URL,
    })
  : null;

type FarmSnapshot = {
  totalEggs: number;
  totalBrokenEggs: number;
  brokenRate: number;
  totalSold: number;
  remainingEggs: number;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  latestChicken: Awaited<ReturnType<typeof storage.getChickenManagement>>[number] | undefined;
  latestDisease: Awaited<ReturnType<typeof storage.getDiseaseRecords>>[number] | undefined;
  nextVaccination: Awaited<ReturnType<typeof storage.getVaccinations>>[number] | undefined;
  overdueVaccinations: number;
};

function toNumber(value: unknown): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
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

async function buildFarmSnapshot(): Promise<FarmSnapshot> {
  const [eggs, sales, chickens, diseases, expenses, vaccinations] = await Promise.all([
    storage.getEggCollections(),
    storage.getEggSales(),
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
  const totalRevenue = sales.reduce(
    (sum, record) => sum + toNumber(record.totalAmount),
    0,
  );
  const totalExpenses = expenses.reduce(
    (sum, record) => sum + toNumber(record.amount),
    0,
  );

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
    remainingEggs: totalEggs - totalSold,
    totalRevenue,
    totalExpenses,
    netProfit: totalRevenue - totalExpenses,
    latestChicken: chickens[0],
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
    return `Farm summary:\n- Eggs collected: ${snapshot.totalEggs}\n- Broken eggs: ${snapshot.totalBrokenEggs} (${(snapshot.brokenRate * 100).toFixed(1)}%)\n- Eggs sold: ${snapshot.totalSold}\n- Remaining eggs: ${snapshot.remainingEggs}\n- Revenue: ${formatRupees(snapshot.totalRevenue)}\n- Expenses: ${formatRupees(snapshot.totalExpenses)}\n- Net profit: ${formatRupees(snapshot.netProfit)}`;
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

  const [snapshot, eggs, sales, expenses] = await Promise.all([
    buildFarmSnapshot(),
    storage.getEggCollections(),
    storage.getEggSales(),
    storage.getExpenses(),
  ]);

  const periodEggs = eggs.filter((record) => new Date(record.date) >= cutoff);
  const periodSales = sales.filter((record) => new Date(record.date) >= cutoff);
  const periodExpenses = expenses.filter((record) => new Date(record.date) >= cutoff);

  const eggsCollected = periodEggs.reduce((sum, record) => sum + record.eggsCollected, 0);
  const brokenEggs = periodEggs.reduce(
    (sum, record) => sum + toNumber((record as { brokenEggs?: number }).brokenEggs),
    0,
  );
  const revenue = periodSales.reduce((sum, record) => sum + toNumber(record.totalAmount), 0);
  const expenseAmount = periodExpenses.reduce((sum, record) => sum + toNumber(record.amount), 0);
  const periodProfit = revenue - expenseAmount;
  const breakageRate = eggsCollected > 0 ? (brokenEggs / eggsCollected) * 100 : 0;

  const highlights = [
    `${days}-day collection: ${eggsCollected} eggs`,
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
      const user = await storage.getUserByEmail(input.email);
      if (!user || user.password !== input.password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      res.json({ token: "mock-jwt-token-" + user.id, user });
    } catch (err) {
      res.status(401).json({ message: "Invalid credentials" });
    }
  });

  app.post(api.auth.register.path, async (req, res) => {
    try {
      const input = api.auth.register.input.parse(req.body);
      const user = await storage.createUser(input);
      res.status(201).json({ token: "mock-jwt-token-" + user.id, user });
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
      } else {
        res.status(400).json({ message: "Error creating user" });
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
    res.json(user);
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

  // Chickens
  app.get(api.chickens.list.path, async (req, res) => {
    const records = await storage.getChickenManagement();
    res.json(records);
  });

  app.post(api.chickens.create.path, async (req, res) => {
    try {
      const input = api.chickens.create.input.parse(req.body);
      const record = await storage.createChickenManagement(input);
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
        chicks: 200
      });
      
      await storage.createEggCollection({
        date: today,
        eggsCollected: 850,
        brokenEggs: 12,
        shed: "Shed A",
        notes: "Normal collection"
      });
      
      await storage.createEggSales({
        date: today,
        eggsSold: 800,
        pricePerEgg: 5,
        customerName: "Local Market",
        saleType: "Egg",
        totalAmount: 4000
      });
      
      await storage.createExpense({
        date: today,
        expenseType: "Feed purchase",
        amount: 2500,
        description: "50kg layers mash"
      });
    }
  } catch (e) {
    console.error("Seed database failed:", e);
  }
}
