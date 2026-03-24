import type { IStorage } from "../storage.js";

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toDateKey(value: string | Date): string {
  if (value instanceof Date) {
    return value.toISOString().split("T")[0];
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString().split("T")[0];
  }

  return parsed.toISOString().split("T")[0];
}

function normalizeChickenType(value: string | null | undefined): "Pure" | "Broiler" {
  return value === "Broiler" ? "Broiler" : "Pure";
}

function isFeedInventoryItem(record: { itemName?: string | null; supplier?: string | null }): boolean {
  const text = `${record.itemName ?? ""} ${record.supplier ?? ""}`.toLowerCase();
  return text.includes("feed") || text.includes("mash");
}

function isChickenPurchaseExpense(record: {
  expenseType?: string | null;
  description?: string | null;
}): boolean {
  const text = `${record.expenseType ?? ""} ${record.description ?? ""}`.toLowerCase();
  return (
    text.includes("chicken purchase") ||
    text.includes("bird purchase") ||
    text.includes("chick purchase") ||
    text.includes("layer purchase") ||
    text.includes("broiler purchase")
  );
}

export async function calculateEggAvailability(storage: IStorage): Promise<number> {
  const [eggRecords, salesRecords] = await Promise.all([
    storage.getEggCollections(),
    storage.getEggSales(),
  ]);

  const totalCollected = eggRecords.reduce((sum, record) => sum + toNumber(record.eggsCollected), 0);
  const totalBroken = eggRecords.reduce((sum, record) => sum + toNumber(record.brokenEggs), 0);
  const totalSold = salesRecords.reduce((sum, record) => sum + toNumber(record.eggsSold), 0);

  return Math.max(0, totalCollected - totalBroken - totalSold);
}

export async function calculateFeedRemaining(storage: IStorage): Promise<number> {
  const [inventoryRecords, feedRecords] = await Promise.all([
    storage.getInventory(),
    storage.getFeedMetrics(),
  ]);

  const totalFeedAdded = inventoryRecords
    .filter((record) => isFeedInventoryItem(record))
    .reduce((sum, record) => sum + toNumber(record.quantity), 0);

  const totalFeedLoggedAdded = feedRecords.reduce(
    (sum, record) => sum + toNumber(record.feedAddedKg),
    0,
  );
  const totalFeedUsed = feedRecords.reduce(
    (sum, record) => sum + toNumber(record.feedConsumedKg),
    0,
  );

  return Math.max(0, totalFeedAdded + totalFeedLoggedAdded - totalFeedUsed);
}

export async function calculateChickenCount(storage: IStorage): Promise<number> {
  const chickenRecords = await storage.getChickenManagement();

  if (chickenRecords.length === 0) {
    return 0;
  }

  const sortedChickenRecords = [...chickenRecords].sort(
    (a, b) => {
      const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
      return dateDiff === 0 ? b.id - a.id : dateDiff;
    },
  );

  const latestByType = new Map<"Pure" | "Broiler", number>();
  for (const record of sortedChickenRecords) {
    const chickenType = normalizeChickenType(record.chickenType);
    if (!latestByType.has(chickenType)) {
      latestByType.set(chickenType, toNumber(record.totalChickens));
    }
  }

  return Math.max(
    0,
    Array.from(latestByType.values()).reduce((sum, count) => sum + count, 0),
  );
}

export async function calculateEggRevenue(storage: IStorage): Promise<number> {
  const [salesRecords, expenseRecords] = await Promise.all([
    storage.getEggSales(),
    storage.getExpenses(),
  ]);

  const totalEggSalesAmount = salesRecords.reduce(
    (sum, record) =>
      sum + Math.max(toNumber(record.totalAmount), toNumber(record.eggsSold) * toNumber(record.pricePerEgg)),
    0,
  );
  const eggRelatedExpenses = expenseRecords.reduce((sum, record) => sum + toNumber(record.amount), 0);

  return totalEggSalesAmount - eggRelatedExpenses;
}

export async function calculateChickenRevenue(storage: IStorage): Promise<number> {
  const [chickenSalesRecords, expenseRecords] = await Promise.all([
    storage.getChickenSales(),
    storage.getExpenses(),
  ]);

  const totalChickenSalesAmount = chickenSalesRecords.reduce(
    (sum, record) =>
      sum +
      Math.max(
        toNumber(record.totalAmount),
        toNumber(record.chickensSold) * toNumber(record.pricePerChicken),
      ),
    0,
  );

  const chickenPurchaseCost = expenseRecords
    .filter((record) => isChickenPurchaseExpense(record))
    .reduce((sum, record) => sum + toNumber(record.amount), 0);

  return totalChickenSalesAmount - chickenPurchaseCost;
}

export async function buildDailyProfitReport(storage: IStorage) {
  const [salesRecords, chickenSalesRecords, expenseRecords] = await Promise.all([
    storage.getEggSales(),
    storage.getChickenSales(),
    storage.getExpenses(),
  ]);

  const dateKeys = new Set<string>();
  const eggsSoldByDate = new Map<string, number>();
  const chickensSoldByDate = new Map<string, number>();
  const revenueByDate = new Map<string, number>();
  const expensesByDate = new Map<string, number>();

  for (const record of salesRecords) {
    const date = toDateKey(record.date);
    dateKeys.add(date);
    eggsSoldByDate.set(date, (eggsSoldByDate.get(date) ?? 0) + toNumber(record.eggsSold));
    revenueByDate.set(
      date,
      (revenueByDate.get(date) ?? 0) +
        Math.max(toNumber(record.totalAmount), toNumber(record.eggsSold) * toNumber(record.pricePerEgg)),
    );
  }

  for (const record of chickenSalesRecords) {
    const date = toDateKey(record.date);
    dateKeys.add(date);
    chickensSoldByDate.set(
      date,
      (chickensSoldByDate.get(date) ?? 0) + toNumber(record.chickensSold),
    );
    revenueByDate.set(
      date,
      (revenueByDate.get(date) ?? 0) +
        Math.max(
          toNumber(record.totalAmount),
          toNumber(record.chickensSold) * toNumber(record.pricePerChicken),
        ),
    );
  }

  for (const record of expenseRecords) {
    const date = toDateKey(record.date);
    dateKeys.add(date);
    expensesByDate.set(date, (expensesByDate.get(date) ?? 0) + toNumber(record.amount));
  }

  return Array.from(dateKeys)
    .sort((a, b) => b.localeCompare(a))
    .map((date) => {
      const totalRevenue = revenueByDate.get(date) ?? 0;
      const totalExpenses = expensesByDate.get(date) ?? 0;

      return {
        date,
        eggsSold: eggsSoldByDate.get(date) ?? 0,
        chickensSold: chickensSoldByDate.get(date) ?? 0,
        totalRevenue,
        totalExpenses,
        netDailyProfit: totalRevenue - totalExpenses,
      };
    });
}
