import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Bird,
  Egg,
  IndianRupee,
  Package,
  TrendingDown,
  TrendingUp,
  Skull,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AppLayout, PageHeader } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui-kit";
import {
  useChickens,
  useChickenSales,
  useDashboardAnalytics,
  useEggs,
  useExpenses,
  useFeedMetrics,
  useSales,
} from "@/hooks/use-poultry";
import { cn, formatCurrency } from "@/lib/utils";

type DashboardData = {
  generatedAt: string;
  today: {
    date: string;
    eggsProduced: number;
    brokenEggs: number;
    totalRevenue: number;
    totalCost: number;
    netProfit: number;
    feedConsumedKg: number;
    feedStockKg: number;
    mortalityCount: number;
    healthyChickens: number;
    sickChickens: number;
    newChicks: number;
  };
  profit: {
    daily: number;
    monthly: number;
    yearly: number;
  };
  charts: {
    eggProduction: Array<{ date: string; eggsProduced: number; brokenEggs: number }>;
    feedConsumption: Array<{ date: string; feedConsumedKg: number; feedStockKg: number }>;
    profitAnalysis: Array<{ date: string; revenue: number; cost: number; profit: number }>;
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
  if (!value) {
    return new Date();
  }

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

function toDateKey(value: string | Date | undefined): string {
  const date = parseDateValue(value);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
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

function buildFallbackAnalytics({
  eggs,
  sales,
  chickenSales,
  expenses,
  chickens,
  feedMetrics,
}: {
  eggs: any[] | undefined;
  sales: any[] | undefined;
  chickenSales: any[] | undefined;
  expenses: any[] | undefined;
  chickens: any[] | undefined;
  feedMetrics: any[] | undefined;
}): DashboardData {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = toDateKey(today);

  const eggsByDate = new Map<string, { eggsProduced: number; brokenEggs: number }>();
  for (const record of eggs ?? []) {
    const date = toDateKey(record.date);
    const current = eggsByDate.get(date) ?? { eggsProduced: 0, brokenEggs: 0 };
    current.eggsProduced += toNumber(record.eggsCollected);
    current.brokenEggs += toNumber(record.brokenEggs);
    eggsByDate.set(date, current);
  }

  const revenueByDate = new Map<string, number>();
  for (const record of sales ?? []) {
    const date = toDateKey(record.date);
    const amount = toNumber(record.totalAmount, toNumber(record.eggsSold) * toNumber(record.pricePerEgg));
    revenueByDate.set(date, (revenueByDate.get(date) ?? 0) + amount);
  }
  for (const record of chickenSales ?? []) {
    const date = toDateKey(record.date);
    const amount = toNumber(
      record.totalAmount,
      toNumber(record.chickensSold) * toNumber(record.pricePerChicken),
    );
    revenueByDate.set(date, (revenueByDate.get(date) ?? 0) + amount);
  }

  const expenseByDate = new Map<string, number>();
  for (const record of expenses ?? []) {
    const date = toDateKey(record.date);
    expenseByDate.set(date, (expenseByDate.get(date) ?? 0) + toNumber(record.amount));
  }

  const feedByDate = new Map<string, { feedConsumedKg: number; feedStockKg: number; feedCost: number }>();
  for (const record of feedMetrics ?? []) {
    const date = toDateKey(record.date);
    const current = feedByDate.get(date) ?? { feedConsumedKg: 0, feedStockKg: 0, feedCost: 0 };
    current.feedConsumedKg += toNumber(record.feedConsumedKg);
    current.feedStockKg = toNumber(record.closingStockKg);
    current.feedCost += toNumber(record.feedCost);
    feedByDate.set(date, current);
  }

  for (const [date, feed] of Array.from(feedByDate.entries())) {
    expenseByDate.set(date, (expenseByDate.get(date) ?? 0) + toNumber(feed.feedCost));
  }

  const mortalityByDate = new Map<string, number>();
  for (const record of chickens ?? []) {
    const date = toDateKey(record.date);
    mortalityByDate.set(date, (mortalityByDate.get(date) ?? 0) + toNumber(record.dead));
  }

  const latestChicken = [...(chickens ?? [])].sort(
    (a, b) => parseDateValue(b.date).getTime() - parseDateValue(a.date).getTime(),
  )[0];

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

  const profitAnalysis = dateKeys.map((date) => {
    const revenue = revenueByDate.get(date) ?? 0;
    const cost = expenseByDate.get(date) ?? 0;
    return { date, revenue, cost, profit: revenue - cost };
  });

  const todayRevenue = revenueByDate.get(todayKey) ?? 0;
  const todayCost = expenseByDate.get(todayKey) ?? 0;

  const allProfitDates = new Set<string>([
    ...Array.from(revenueByDate.keys()),
    ...Array.from(expenseByDate.keys()),
  ]);

  let monthlyProfit = 0;
  let yearlyProfit = 0;
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  for (const date of Array.from(allProfitDates)) {
    const parsed = parseDateValue(date);
    const revenue = revenueByDate.get(date) ?? 0;
    const cost = expenseByDate.get(date) ?? 0;
    const profit = revenue - cost;
    if (parsed.getFullYear() === currentYear) {
      yearlyProfit += profit;
      if (parsed.getMonth() === currentMonth) {
        monthlyProfit += profit;
      }
    }
  }

  const sortedFeedMetrics = [...(feedMetrics ?? [])].sort(
    (a, b) => parseDateValue(a.date).getTime() - parseDateValue(b.date).getTime(),
  );
  const latestFeedStockKg =
    sortedFeedMetrics.length > 0
      ? toNumber(sortedFeedMetrics[sortedFeedMetrics.length - 1].closingStockKg)
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

  return {
    generatedAt: new Date().toISOString(),
    today: {
      date: todayKey,
      eggsProduced: todayEggs,
      brokenEggs: eggsByDate.get(todayKey)?.brokenEggs ?? 0,
      totalRevenue: todayRevenue,
      totalCost: todayCost,
      netProfit: todayRevenue - todayCost,
      feedConsumedKg: feedByDate.get(todayKey)?.feedConsumedKg ?? 0,
      feedStockKg: feedByDate.get(todayKey)?.feedStockKg ?? latestFeedStockKg,
      mortalityCount: todayMortality,
      healthyChickens: toNumber(latestChicken?.healthy),
      sickChickens: toNumber(latestChicken?.sick),
      newChicks: toNumber(latestChicken?.chicks),
    },
    profit: {
      daily: todayRevenue - todayCost,
      monthly: monthlyProfit,
      yearly: yearlyProfit,
    },
    charts: {
      eggProduction,
      feedConsumption,
      profitAnalysis,
    },
    alerts,
  };
}

function toLabel(date: string): string {
  const parsed = new Date(`${date}T00:00:00`);
  return parsed.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

export default function Dashboard() {
  const analyticsQuery = useDashboardAnalytics();
  const eggsQuery = useEggs();
  const salesQuery = useSales();
  const chickenSalesQuery = useChickenSales();
  const expensesQuery = useExpenses();
  const chickensQuery = useChickens();
  const feedMetricsQuery = useFeedMetrics();

  const fallbackData = useMemo(
    () =>
      buildFallbackAnalytics({
        eggs: eggsQuery.data,
        sales: salesQuery.data,
        chickenSales: chickenSalesQuery.data,
        expenses: expensesQuery.data,
        chickens: chickensQuery.data,
        feedMetrics: feedMetricsQuery.data,
      }),
    [
      chickenSalesQuery.data,
      chickensQuery.data,
      eggsQuery.data,
      expensesQuery.data,
      feedMetricsQuery.data,
      salesQuery.data,
    ],
  );

  const data = analyticsQuery.data ?? fallbackData;
  const isLoading = analyticsQuery.isLoading && !analyticsQuery.error;

  const eggChartData = useMemo(
    () =>
      (data?.charts.eggProduction ?? []).map((item) => ({
        ...item,
        label: toLabel(item.date),
      })),
    [data],
  );

  const feedChartData = useMemo(
    () =>
      (data?.charts.feedConsumption ?? []).map((item) => ({
        ...item,
        label: toLabel(item.date),
      })),
    [data],
  );

  const profitChartData = useMemo(
    () =>
      (data?.charts.profitAnalysis ?? []).map((item) => ({
        ...item,
        label: toLabel(item.date),
      })),
    [data],
  );

  if (isLoading) {
    return (
      <AppLayout>
        <PageHeader title="Farm Dashboard" description="Loading analytics..." />
      </AppLayout>
    );
  }

  const todayStats = [
    {
      title: "Eggs Produced Today",
      value: data.today.eggsProduced.toLocaleString(),
      icon: Egg,
      color: "bg-primary/10 text-primary",
    },
    {
      title: "Healthy Chickens",
      value: data.today.healthyChickens.toLocaleString(),
      icon: Bird,
      color: "bg-success/15 text-success",
    },
    {
      title: "Sick Chickens",
      value: data.today.sickChickens.toLocaleString(),
      icon: AlertTriangle,
      color: "bg-destructive/10 text-destructive",
    },
    {
      title: "New Added Chickens",
      value: data.today.newChicks.toLocaleString(),
      icon: Egg,
      color: "bg-info/15 text-info",
    },
    {
      title: "Broken Eggs",
      value: data.today.brokenEggs.toLocaleString(),
      icon: TrendingDown,
      color: "bg-destructive/10 text-destructive",
    },
    {
      title: "Total Revenue",
      value: formatCurrency(data.today.totalRevenue),
      icon: IndianRupee,
      color: "bg-success/15 text-success",
    },
    {
      title: "Total Cost",
      value: formatCurrency(data.today.totalCost),
      icon: Package,
      color: "bg-warning/15 text-warning",
    },
    {
      title: "Net Profit",
      value: formatCurrency(data.today.netProfit),
      icon: data.today.netProfit >= 0 ? TrendingUp : TrendingDown,
      color: data.today.netProfit >= 0 ? "bg-success/15 text-success" : "bg-destructive/10 text-destructive",
    },
  ];

  return (
    <AppLayout>
      <PageHeader
        title="Farm Dashboard"
        description="Egg production, feed usage, profit analysis, and smart alerts."
      />

      {analyticsQuery.error && (
        <Card className="mb-6 border-warning/40 bg-warning/5">
          <p className="text-sm text-foreground/80">
            Live analytics service is temporarily unavailable. Showing fallback dashboard data.
          </p>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {todayStats.map((item) => (
          <StatCard key={item.title} {...item} />
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <ProfitCard label="Daily Profit" value={data.profit.daily} />
        <ProfitCard label="Monthly Profit" value={data.profit.monthly} />
        <ProfitCard label="Yearly Profit" value={data.profit.yearly} />
      </div>

      <Card className="mb-8">
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
                <p className="text-xs mt-1 text-muted-foreground">
                  SMS: {alert.smsSent ? "Sent" : "Not sent"}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
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

        <Card className="h-[360px]">
          <h3 className="text-lg font-bold font-display mb-4">Profit Analysis (Daily)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={profitChartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Line
                type="monotone"
                dataKey="profit"
                stroke="hsl(var(--success))"
                strokeWidth={3}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </AppLayout>
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

function ProfitCard({ label, value }: { label: string; value: number }) {
  const isPositive = value >= 0;
  return (
    <Card>
      <div className="flex items-center gap-2 mb-1">
        {isPositive ? (
          <TrendingUp size={16} className="text-success" />
        ) : (
          <Skull size={16} className="text-destructive" />
        )}
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
      <p className={cn("text-2xl font-bold font-display", isPositive ? "text-success" : "text-destructive")}>
        {formatCurrency(value)}
      </p>
    </Card>
  );
}
