import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Egg,
  IndianRupee,
  Package,
  ShoppingBasket,
  Warehouse,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card } from "@/components/ui-kit";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useChickenSales,
  useChickens,
  useDashboardAnalytics,
  useEggs,
  useExpenses,
  useFeedMetrics,
  useInventory,
  useSales,
} from "@/hooks/use-poultry";
import { cn, formatCurrency } from "@/lib/utils";

type DashboardData = {
  generatedAt: string;
  today: {
    date: string;
    eggsProduced: number;
    brokenEggs: number;
    totalEggsAvailable: number;
    totalEggsSold: number;
    pureEggsSold: number;
    broilerEggsSold: number;
    pureEggsAvailable: number;
    broilerEggsAvailable: number;
    totalFeedRemaining: number;
    totalChickensAvailable: number;
    pureChickensAvailable: number;
    broilerChickensAvailable: number;
    eggRevenue: number;
    pureEggRevenue: number;
    broilerEggRevenue: number;
    chickenRevenue: number;
    pureChickenRevenue: number;
    broilerChickenRevenue: number;
    feedConsumedKg: number;
    mortalityCount: number;
  };
  charts: {
    eggProduction: Array<{ date: string; eggsProduced: number; brokenEggs: number }>;
    feedConsumption: Array<{ date: string; feedConsumedKg: number; feedStockKg: number }>;
  };
  alerts: Array<{
    type: "feed_low" | "egg_drop" | "mortality_increase";
    title: string;
    message: string;
    severity: "warning" | "critical";
    thresholdValue: number;
    currentValue: number;
    smsSent: boolean;
    smsSentAt: string | null;
  }>;
};

const CHART_DAYS = 14;

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseDateValue(value: string | Date | undefined): Date {
  if (!value) return new Date();
  if (value instanceof Date) return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return new Date();
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

function toDateKey(value: string | Date | undefined): string {
  const date = parseDateValue(value);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function normalizeChickenType(value: string | null | undefined): "Pure" | "Broiler" {
  return value === "Broiler" ? "Broiler" : "Pure";
}

function buildDateKeys(today: Date, days: number): string[] {
  const result: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    result.push(toDateKey(date));
  }
  return result;
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

function buildFallbackAnalytics({
  eggs,
  sales,
  chickenSales,
  expenses,
  chickens,
  feedMetrics,
  inventory,
}: {
  eggs: any[] | undefined;
  sales: any[] | undefined;
  chickenSales: any[] | undefined;
  expenses: any[] | undefined;
  chickens: any[] | undefined;
  feedMetrics: any[] | undefined;
  inventory: any[] | undefined;
}): DashboardData {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = toDateKey(today);

  const eggsByDate = new Map<string, { eggsProduced: number; brokenEggs: number }>();
  let totalEggsCollected = 0;
  let totalBrokenEggs = 0;
  for (const record of eggs ?? []) {
    const date = toDateKey(record.date);
    const current = eggsByDate.get(date) ?? { eggsProduced: 0, brokenEggs: 0 };
    const eggsCollected = toNumber(record.eggsCollected);
    const brokenEggs = toNumber(record.brokenEggs);
    current.eggsProduced += eggsCollected;
    current.brokenEggs += brokenEggs;
    eggsByDate.set(date, current);
    totalEggsCollected += eggsCollected;
    totalBrokenEggs += brokenEggs;
  }

  let totalEggsSold = 0;
  let pureEggsSold = 0;
  let broilerEggsSold = 0;
  let totalEggSalesAmount = 0;
  let pureEggRevenue = 0;
  let broilerEggRevenue = 0;
  const eggsCollectedByType = new Map<"Pure" | "Broiler", number>();
  const brokenEggsByType = new Map<"Pure" | "Broiler", number>();
  for (const record of sales ?? []) {
    const eggsSold = toNumber(record.eggsSold);
    totalEggsSold += eggsSold;
    if (normalizeChickenType(record.chickenType) === "Broiler") {
      broilerEggsSold += eggsSold;
    } else {
      pureEggsSold += eggsSold;
    }
    const amount = Math.max(
      toNumber(record.totalAmount),
      eggsSold * toNumber(record.pricePerEgg),
    );
    totalEggSalesAmount += amount;
    if (normalizeChickenType(record.chickenType) === "Broiler") {
      broilerEggRevenue += amount;
    } else {
      pureEggRevenue += amount;
    }
  }

  for (const record of eggs ?? []) {
    const chickenType = normalizeChickenType(record.chickenType);
    eggsCollectedByType.set(
      chickenType,
      (eggsCollectedByType.get(chickenType) ?? 0) + toNumber(record.eggsCollected),
    );
    brokenEggsByType.set(
      chickenType,
      (brokenEggsByType.get(chickenType) ?? 0) + toNumber(record.brokenEggs),
    );
  }

  const pureCollected = eggsCollectedByType.get("Pure") ?? 0;
  const broilerCollected = eggsCollectedByType.get("Broiler") ?? 0;
  const pureBroken = brokenEggsByType.get("Pure") ?? 0;
  const broilerBroken = brokenEggsByType.get("Broiler") ?? 0;
  const pureEggsAvailable = Math.max(0, pureCollected - pureBroken - pureEggsSold);
  const broilerEggsAvailable = Math.max(0, broilerCollected - broilerBroken - broilerEggsSold);

  let totalChickenSalesAmount = 0;
  let totalChickensSold = 0;
  let pureChickenRevenue = 0;
  let broilerChickenRevenue = 0;
  for (const record of chickenSales ?? []) {
    totalChickensSold += toNumber(record.chickensSold);
    const amount = Math.max(
      toNumber(record.totalAmount),
      toNumber(record.chickensSold) * toNumber(record.pricePerChicken),
    );
    totalChickenSalesAmount += amount;
    if (normalizeChickenType(record.chickenType) === "Broiler") {
      broilerChickenRevenue += amount;
    } else {
      pureChickenRevenue += amount;
    }
  }

  let totalExpenses = 0;
  let chickenPurchaseCost = 0;
  for (const record of expenses ?? []) {
    const amount = toNumber(record.amount);
    totalExpenses += amount;
    if (isChickenPurchaseExpense(record)) {
      chickenPurchaseCost += amount;
    }
  }

  let totalFeedAdded = 0;
  for (const record of inventory ?? []) {
    if (isFeedInventoryItem(record)) {
      totalFeedAdded += toNumber(record.quantity);
    }
  }

  const feedByDate = new Map<string, { feedConsumedKg: number; feedStockKg: number }>();
  let totalFeedUsed = 0;
  let totalFeedLoggedAdded = 0;
  for (const record of feedMetrics ?? []) {
    const date = toDateKey(record.date);
    const current = feedByDate.get(date) ?? { feedConsumedKg: 0, feedStockKg: 0 };
    current.feedConsumedKg += toNumber(record.feedConsumedKg);
    current.feedStockKg = toNumber(record.closingStockKg);
    feedByDate.set(date, current);
    totalFeedUsed += toNumber(record.feedConsumedKg);
    totalFeedLoggedAdded += toNumber(record.feedAddedKg);
  }

  const mortalityByDate = new Map<string, number>();
  const sortedChickenRecords = [...(chickens ?? [])].sort(
    (a, b) => parseDateValue(a.date).getTime() - parseDateValue(b.date).getTime(),
  );
  for (const record of sortedChickenRecords) {
    const date = toDateKey(record.date);
    mortalityByDate.set(date, (mortalityByDate.get(date) ?? 0) + toNumber(record.dead));
  }

  const dateKeys = buildDateKeys(today, CHART_DAYS);
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

  const latestFeedStockKg =
    feedMetrics && feedMetrics.length > 0
      ? toNumber([...feedMetrics].sort((a, b) => parseDateValue(a.date).getTime() - parseDateValue(b.date).getTime()).at(-1)?.closingStockKg)
      : 0;

  const alerts: DashboardData["alerts"] = [];
  if (latestFeedStockKg < 10) {
    alerts.push({
      type: "feed_low",
      title: "Feed stock low",
      message: `Feed stock is ${latestFeedStockKg.toFixed(1)} kg, below 10 kg.`,
      severity: latestFeedStockKg <= 6 ? "critical" : "warning",
      thresholdValue: 10,
      currentValue: latestFeedStockKg,
      smsSent: false,
      smsSentAt: null,
    });
  }

  const todayEggs = eggsByDate.get(todayKey)?.eggsProduced ?? 0;
  const previousEggs = Array.from(eggsByDate.entries())
    .filter(([date]) => date < todayKey)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-3)
    .map(([, value]) => value.eggsProduced);
  if (previousEggs.length > 0) {
    const avg = previousEggs.reduce((sum, value) => sum + value, 0) / previousEggs.length;
    if (avg > 0) {
      const drop = ((avg - todayEggs) / avg) * 100;
      if (drop >= 20) {
        alerts.push({
          type: "egg_drop",
          title: "Egg production dropped",
          message: `Today's production dropped ${drop.toFixed(1)}% versus recent average.`,
          severity: drop >= 30 ? "critical" : "warning",
          thresholdValue: 20,
          currentValue: drop,
          smsSent: false,
          smsSentAt: null,
        });
      }
    }
  }

  const todayMortality = mortalityByDate.get(todayKey) ?? 0;
  const previousMortality = Array.from(mortalityByDate.entries())
    .filter(([date]) => date < todayKey)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-3)
    .map(([, value]) => value);
  if (previousMortality.length > 0) {
    const avg = previousMortality.reduce((sum, value) => sum + value, 0) / previousMortality.length;
    if (avg > 0) {
      const increase = ((todayMortality - avg) / avg) * 100;
      if (increase >= 25) {
        alerts.push({
          type: "mortality_increase",
          title: "Mortality increased",
          message: `Mortality is up ${increase.toFixed(1)}% versus recent average.`,
          severity: increase >= 40 ? "critical" : "warning",
          thresholdValue: 25,
          currentValue: increase,
          smsSent: false,
          smsSentAt: null,
        });
      }
    }
  }

  const latestFlockByType = new Map<"Pure" | "Broiler", number>();
  for (const record of sortedChickenRecords) {
    const chickenType = normalizeChickenType(record.chickenType);
    latestFlockByType.set(chickenType, toNumber(record.totalChickens));
  }

  const totalChickensAvailable = Array.from(latestFlockByType.values()).reduce(
    (sum, count) => sum + count,
    0,
  );
  const pureChickensAvailable = latestFlockByType.get("Pure") ?? 0;
  const broilerChickensAvailable = latestFlockByType.get("Broiler") ?? 0;

  return {
    generatedAt: new Date().toISOString(),
    today: {
      date: todayKey,
      eggsProduced: totalEggsCollected,
      brokenEggs: totalBrokenEggs,
      totalEggsAvailable: Math.max(0, totalEggsCollected - totalBrokenEggs - totalEggsSold),
      totalEggsSold,
      pureEggsSold,
      broilerEggsSold,
      pureEggsAvailable,
      broilerEggsAvailable,
      totalFeedRemaining: Math.max(0, totalFeedAdded + totalFeedLoggedAdded - totalFeedUsed),
      totalChickensAvailable: Math.max(0, totalChickensAvailable),
      pureChickensAvailable: Math.max(0, pureChickensAvailable),
      broilerChickensAvailable: Math.max(0, broilerChickensAvailable),
      eggRevenue: totalEggSalesAmount - totalExpenses,
      chickenRevenue: totalChickenSalesAmount - chickenPurchaseCost,
      pureEggRevenue,
      broilerEggRevenue,
      pureChickenRevenue,
      broilerChickenRevenue,
      feedConsumedKg: feedByDate.get(todayKey)?.feedConsumedKg ?? 0,
      mortalityCount: todayMortality,
    },
    charts: {
      eggProduction,
      feedConsumption,
    },
    alerts,
  };
}

function toLabel(date: string): string {
  const parsed = new Date(`${date}T00:00:00`);
  return parsed.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

export function ClassicAnalyticsSection({ embedded = false }: { embedded?: boolean }) {
  const analyticsQuery = useDashboardAnalytics();
  const eggsQuery = useEggs();
  const salesQuery = useSales();
  const chickenSalesQuery = useChickenSales();
  const expensesQuery = useExpenses();
  const chickensQuery = useChickens();
  const feedMetricsQuery = useFeedMetrics();
  const inventoryQuery = useInventory();

  const fallbackData = useMemo(
    () =>
      buildFallbackAnalytics({
        eggs: eggsQuery.data,
        sales: salesQuery.data,
        chickenSales: chickenSalesQuery.data,
        expenses: expensesQuery.data,
        chickens: chickensQuery.data,
        feedMetrics: feedMetricsQuery.data,
        inventory: inventoryQuery.data,
      }),
    [
      chickenSalesQuery.data,
      chickensQuery.data,
      eggsQuery.data,
      expensesQuery.data,
      feedMetricsQuery.data,
      inventoryQuery.data,
      salesQuery.data,
    ],
  );

  const data = analyticsQuery.data ?? fallbackData;
  const isLoading = analyticsQuery.isLoading && !analyticsQuery.error;

  const eggChartData = useMemo(
    () => (data?.charts.eggProduction ?? []).map((item) => ({ ...item, label: toLabel(item.date) })),
    [data],
  );
  const feedChartData = useMemo(
    () => (data?.charts.feedConsumption ?? []).map((item) => ({ ...item, label: toLabel(item.date) })),
    [data],
  );

  if (isLoading) {
    return (
      <Card className={cn(!embedded && "mt-6")}>
        <p className="text-sm text-muted-foreground">Loading analytics...</p>
      </Card>
    );
  }

  const buildTypeStats = (type: "Pure" | "Broiler") => {
    const isBroiler = type === "Broiler";
    return [
      {
        title: `${type} Eggs Available`,
        value: Math.max(0, isBroiler ? data.today.broilerEggsAvailable : data.today.pureEggsAvailable).toLocaleString(),
        icon: Egg,
        color: "bg-primary/10 text-primary",
      },
      {
        title: `${type} Eggs Sold`,
        value: (isBroiler ? data.today.broilerEggsSold : data.today.pureEggsSold).toLocaleString(),
        icon: ShoppingBasket,
        color: "bg-info/10 text-info",
      },
      {
        title: `${type} Chickens Available`,
        value: Math.max(0, isBroiler ? data.today.broilerChickensAvailable : data.today.pureChickensAvailable).toLocaleString(),
        icon: Package,
        color: "bg-success/15 text-success",
      },
      {
        title: `${type} Egg Revenue`,
        value: formatCurrency(isBroiler ? data.today.broilerEggRevenue : data.today.pureEggRevenue),
        icon: IndianRupee,
        color: "bg-success/15 text-success",
      },
      {
        title: `${type} Chicken Revenue`,
        value: formatCurrency(isBroiler ? data.today.broilerChickenRevenue : data.today.pureChickenRevenue),
        icon: IndianRupee,
        color: "bg-accent/15 text-accent-foreground",
      },
    ];
  };

  return (
    <section className={cn("space-y-6", !embedded && "mt-6")}>
      <div>
        <p className="monitoring-kicker">Farm Analytics</p>
        <h3 className="text-2xl font-bold font-display">Production and Revenue Overview</h3>
      </div>

      {analyticsQuery.error && (
        <Card className="border-warning/40 bg-warning/5">
          <p className="text-sm text-foreground/80">
            Live analytics service is temporarily unavailable. Showing fallback dashboard data.
          </p>
        </Card>
      )}

      <Tabs defaultValue="total">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground text-center">
            View availability, sales, and revenue by chicken type.
          </p>
          <TabsList className="mx-auto h-14 w-full max-w-xl justify-center rounded-3xl bg-gradient-to-r from-amber-50 via-white to-emerald-50 p-1.5 shadow-md">
            <TabsTrigger
              value="broiler"
              className="rounded-2xl border border-transparent px-6 py-2.5 text-base font-semibold text-muted-foreground transition-all hover:bg-white/80 hover:text-foreground data-[state=active]:border-primary/40 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:ring-2 data-[state=active]:ring-primary/30 sm:text-lg"
            >
              Broiler
            </TabsTrigger>
            <TabsTrigger
              value="pure"
              className="rounded-2xl border border-transparent px-6 py-2.5 text-base font-semibold text-muted-foreground transition-all hover:bg-white/80 hover:text-foreground data-[state=active]:border-primary/40 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:ring-2 data-[state=active]:ring-primary/30 sm:text-lg"
            >
              Pure
            </TabsTrigger>
            <TabsTrigger
              value="total"
              className="rounded-2xl border border-transparent px-6 py-2.5 text-base font-semibold text-muted-foreground transition-all hover:bg-white/80 hover:text-foreground data-[state=active]:border-primary/40 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:ring-2 data-[state=active]:ring-primary/30 sm:text-lg"
            >
              Total
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="total">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[
              {
                title: "Total Egg Revenue",
                value: formatCurrency(data.today.pureEggRevenue + data.today.broilerEggRevenue),
                icon: IndianRupee,
                color: "bg-success/15 text-success",
              },
              {
                title: "Total Chicken Revenue",
                value: formatCurrency(data.today.pureChickenRevenue + data.today.broilerChickenRevenue),
                icon: IndianRupee,
                color: "bg-accent/15 text-accent-foreground",
              },
              {
                title: "Total Revenue",
                value: formatCurrency(
                  data.today.pureEggRevenue +
                    data.today.broilerEggRevenue +
                    data.today.pureChickenRevenue +
                    data.today.broilerChickenRevenue,
                ),
                icon: IndianRupee,
                color: "bg-success/15 text-success",
              },
              {
                title: "Total Feed Remaining",
                value: `${Math.max(0, data.today.totalFeedRemaining).toLocaleString()} kg`,
                icon: Warehouse,
                color: "bg-warning/15 text-warning",
              },
              {
                title: "Pure Egg Revenue",
                value: formatCurrency(data.today.pureEggRevenue),
                icon: IndianRupee,
                color: "bg-success/15 text-success",
              },
              {
                title: "Broiler Egg Revenue",
                value: formatCurrency(data.today.broilerEggRevenue),
                icon: IndianRupee,
                color: "bg-success/15 text-success",
              },
              {
                title: "Pure Chicken Revenue",
                value: formatCurrency(data.today.pureChickenRevenue),
                icon: IndianRupee,
                color: "bg-accent/15 text-accent-foreground",
              },
              {
                title: "Broiler Chicken Revenue",
                value: formatCurrency(data.today.broilerChickenRevenue),
                icon: IndianRupee,
                color: "bg-accent/15 text-accent-foreground",
              },
            ].map((item) => (
              <StatCard key={item.title} {...item} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="pure">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {buildTypeStats("Pure").map((item) => (
              <StatCard key={item.title} {...item} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="broiler">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {buildTypeStats("Broiler").map((item) => (
              <StatCard key={item.title} {...item} />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <Card>
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="text-warning" size={20} />
          <h3 className="text-lg font-bold font-display">Today&apos;s Alerts</h3>
        </div>

        {data.alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active alerts today.</p>
        ) : (
          <div className="space-y-3">
            {data.alerts.map((alert) => (
              <div
                key={alert.type}
                className={cn(
                  "rounded-xl border px-4 py-3",
                  alert.severity === "critical"
                    ? "border-destructive/40 bg-destructive/5"
                    : "border-warning/40 bg-warning/5",
                )}
              >
                <p className="font-semibold">{alert.title}</p>
                <p className="text-sm text-muted-foreground">{alert.message}</p>
                <p className="text-xs mt-1 text-muted-foreground">SMS: {alert.smsSent ? "Sent" : "Not sent"}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid gap-6 grid-cols-1 xl:grid-cols-2">
        <Card className="h-[360px]">
          <h3 className="text-lg font-bold font-display mb-4">Egg Production (Daily)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={eggChartData}>
              <defs>
                <linearGradient id="eggGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="eggsProduced"
                stroke="hsl(var(--primary))"
                fill="url(#eggGradient)"
                strokeWidth={2.5}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card className="h-[360px]">
          <h3 className="text-lg font-bold font-display mb-4">Feed Consumption (Daily)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={feedChartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="feedConsumedKg" fill="hsl(var(--warning))" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </section>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: string;
  icon: any;
  color: string;
}) {
  return (
    <motion.div whileHover={{ y: -3 }}>
      <Card className="h-full">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted-foreground uppercase tracking-wide">{title}</p>
          <div className={cn("rounded-xl p-2", color)}>
            <Icon size={18} />
          </div>
        </div>
        <p className="text-2xl font-bold font-display">{value}</p>
      </Card>
    </motion.div>
  );
}
