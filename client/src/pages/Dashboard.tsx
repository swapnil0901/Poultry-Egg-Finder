import { AppLayout, PageHeader } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui-kit";
import { useEggs, useSales, useChickens, useExpenses } from "@/hooks/use-poultry";
import { cn, formatCurrency } from "@/lib/utils";
import { Egg, IndianRupee, ShieldAlert, Package, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, AreaChart, Area } from "recharts";
import { motion } from "framer-motion";
import { useMemo } from "react";

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseDateValue(value: string | Date): Date {
  if (value instanceof Date) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  // Parse YYYY-MM-DD as a local calendar date to avoid timezone shifts.
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

function toDateKey(value: string | Date): string {
  const date = parseDateValue(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function Dashboard() {
  const { data: eggs } = useEggs();
  const { data: sales } = useSales();
  const { data: chickens } = useChickens();
  const { data: expenses } = useExpenses();

  // Aggregate Data Calculations
  const totalEggs = eggs?.reduce((sum, e) => sum + e.eggsCollected, 0) || 0;
  const totalSold = sales?.reduce((sum, s) => sum + s.eggsSold, 0) || 0;
  const totalRevenue = sales?.reduce((sum, s) => sum + toNumber(s.totalAmount), 0) || 0;
  const totalExpenses = expenses?.reduce((sum, e) => sum + toNumber(e.amount), 0) || 0;

  const latestChickenStats = chickens?.[chickens.length - 1] || { totalChickens: 0, sick: 0 };
  const remainingEggs = totalEggs - totalSold;
  const netProfit = totalRevenue - totalExpenses;

  // Chart Data: always render a true 7-day window.
  const last7Days = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (6 - index));
      return date;
    });
  }, []);

  const eggProductionData = useMemo(() => {
    const eggsByDate = new Map<string, number>();

    for (const record of eggs ?? []) {
      const key = toDateKey(record.date);
      eggsByDate.set(key, (eggsByDate.get(key) ?? 0) + toNumber(record.eggsCollected));
    }

    return last7Days.map((date) => {
      const key = toDateKey(date);
      return {
        name: date.toLocaleDateString("en-IN", { weekday: "short" }),
        eggs: eggsByDate.get(key) ?? 0,
      };
    });
  }, [eggs, last7Days]);

  const revenueData = useMemo(() => {
    const revenueByDate = new Map<string, number>();

    for (const record of sales ?? []) {
      const key = toDateKey(record.date);
      revenueByDate.set(key, (revenueByDate.get(key) ?? 0) + toNumber(record.totalAmount));
    }

    return last7Days.map((date) => {
      const key = toDateKey(date);
      return {
        name: date.toLocaleDateString("en-IN", { weekday: "short" }),
        amount: revenueByDate.get(key) ?? 0,
      };
    });
  }, [sales, last7Days]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: "easeOut" },
    },
  };

  return (
    <AppLayout>
      <PageHeader
        title="Farm Overview"
        description="Real-time insights and metrics for your poultry farm."
      />

      {/* Stats Grid with staggered animation */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
      >
        <motion.div variants={itemVariants}>
          <StatCard title="Remaining Eggs" value={remainingEggs} icon={Egg} color="bg-gradient-to-br from-accent to-accent/80 text-accent-foreground shadow-lg shadow-accent/20" trend="+12%" />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatCard title="Total Revenue" value={formatCurrency(totalRevenue)} icon={IndianRupee} color="bg-gradient-to-br from-success/25 to-success/10 text-success border border-success/40 shadow-lg shadow-success/15" trend="+5.2%" />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatCard title="Net Profit" value={formatCurrency(netProfit)} icon={Package} color="bg-gradient-to-br from-primary to-primary/80 text-white shadow-lg shadow-primary/20" trend="Healthy" />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatCard title="Sick Chickens" value={latestChickenStats.sick} icon={ShieldAlert} color="bg-gradient-to-br from-destructive to-destructive/80 text-white shadow-lg shadow-destructive/20" trend="Requires attention" />
        </motion.div>
      </motion.div>

      {/* Charts Section */}
      <motion.div
        className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
      >
        <motion.div variants={itemVariants}>
          <Card className="h-[400px] flex flex-col">
            <h3 className="text-lg font-bold font-display mb-6">7-Day Egg Production</h3>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={eggProductionData}>
                  <defs>
                    <linearGradient id="colorEggs" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--foreground))", opacity: 0.7 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--foreground))", opacity: 0.7 }} dx={-10} />
                  <Tooltip
                    contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)" }}
                    cursor={{ stroke: "hsl(var(--primary))", strokeWidth: 2, strokeDasharray: "4 4" }}
                  />
                  <Area type="monotone" dataKey="eggs" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorEggs)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="h-[400px] flex flex-col">
            <h3 className="text-lg font-bold font-display mb-6">Recent Revenue</h3>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--foreground))", opacity: 0.7 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--foreground))", opacity: 0.7 }} dx={-10} tickFormatter={(val) => `Rs ${val}`} />
                  <Tooltip
                    cursor={{ fill: "hsl(var(--primary)/0.05)" }}
                    contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)" }}
                    formatter={(value: number) => [formatCurrency(value), "Revenue"]}
                  />
                  <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </motion.div>
      </motion.div>
    </AppLayout>
  );
}

function StatCard({ title, value, icon: Icon, color, trend }: { title: string, value: string | number, icon: any, color: string, trend: string }) {
  const isPositive = trend.startsWith("+") || trend === "Healthy";
  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="hover-lift p-6 h-full">
        <div className="flex justify-between items-start mb-4">
          <motion.div
            whileHover={{ scale: 1.1, rotate: 5 }}
            className={`p-3 rounded-2xl ${color}`}
          >
            <Icon size={24} />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className={cn(
              "flex items-center gap-1 text-sm font-bold px-2.5 py-1 rounded-full",
              isPositive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
            )}
          >
            {isPositive ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
            {trend}
          </motion.div>
        </div>
        <div>
          <h4 className="text-muted-foreground font-medium text-sm uppercase tracking-wider mb-2">{title}</h4>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl font-bold font-display text-foreground"
          >
            {value}
          </motion.div>
        </div>
      </Card>
    </motion.div>
  );
}

