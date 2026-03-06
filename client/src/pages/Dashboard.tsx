import { AppLayout, PageHeader } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui-kit";
import { useEggs, useSales, useChickens, useExpenses } from "@/hooks/use-poultry";
import { cn, formatCurrency } from "@/lib/utils";
import { Egg, IndianRupee, Bird, ShieldAlert, Package, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, AreaChart, Area } from 'recharts';

export default function Dashboard() {
  const { data: eggs } = useEggs();
  const { data: sales } = useSales();
  const { data: chickens } = useChickens();
  const { data: expenses } = useExpenses();

  // Aggregate Data Calculations
  const totalEggs = eggs?.reduce((sum, e) => sum + e.eggsCollected, 0) || 0;
  const totalSold = sales?.reduce((sum, s) => sum + s.eggsSold, 0) || 0;
  const totalRevenue = sales?.reduce((sum, s) => sum + parseFloat(s.totalAmount as string), 0) || 0;
  const totalExpenses = expenses?.reduce((sum, e) => sum + parseFloat(e.amount as string), 0) || 0;
  
  const latestChickenStats = chickens?.[chickens.length - 1] || { totalChickens: 0, sick: 0 };
  const remainingEggs = totalEggs - totalSold;
  const netProfit = totalRevenue - totalExpenses;

  // Chart Data format
  const eggProductionData = eggs?.slice(-7).map(e => ({ name: new Date(e.date).toLocaleDateString('en-IN', {weekday:'short'}), eggs: e.eggsCollected })) || [];
  const revenueData = sales?.slice(-7).map(s => ({ name: new Date(s.date).toLocaleDateString('en-IN', {weekday:'short'}), amount: parseFloat(s.totalAmount as string) })) || [];

  return (
    <AppLayout>
      <PageHeader 
        title="Farm Overview" 
        description="Real-time insights and metrics for your poultry farm."
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="Remaining Eggs" value={remainingEggs} icon={Egg} color="bg-accent text-accent-foreground" trend="+12%" />
        <StatCard title="Total Revenue" value={formatCurrency(totalRevenue)} icon={IndianRupee} color="bg-success text-white" trend="+5.2%" />
        <StatCard title="Net Profit" value={formatCurrency(netProfit)} icon={Package} color="bg-primary text-white" trend="Healthy" />
        <StatCard title="Sick Chickens" value={latestChickenStats.sick} icon={ShieldAlert} color="bg-destructive text-white" trend="Requires attention" />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <Card className="h-[400px] flex flex-col">
          <h3 className="text-lg font-bold font-display mb-6">7-Day Egg Production</h3>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={eggProductionData}>
                <defs>
                  <linearGradient id="colorEggs" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--foreground))', opacity: 0.7}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--foreground))', opacity: 0.7}} dx={-10} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                  cursor={{stroke: 'hsl(var(--primary))', strokeWidth: 2, strokeDasharray: '4 4'}}
                />
                <Area type="monotone" dataKey="eggs" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorEggs)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="h-[400px] flex flex-col">
          <h3 className="text-lg font-bold font-display mb-6">Recent Revenue</h3>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--foreground))', opacity: 0.7}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--foreground))', opacity: 0.7}} dx={-10} tickFormatter={(val) => `₹${val}`} />
                <Tooltip 
                  cursor={{fill: 'hsl(var(--primary)/0.05)'}}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                  formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                />
                <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}

function StatCard({ title, value, icon: Icon, color, trend }: { title: string, value: string | number, icon: any, color: string, trend: string }) {
  const isPositive = trend.startsWith('+') || trend === 'Healthy';
  return (
    <Card className="hover-lift p-6">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-2xl ${color} shadow-lg`}>
          <Icon size={24} />
        </div>
        <div className={cn(
          "flex items-center gap-1 text-sm font-bold px-2.5 py-1 rounded-full",
          isPositive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
        )}>
          {isPositive ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
          {trend}
        </div>
      </div>
      <div>
        <h4 className="text-muted-foreground font-medium text-sm uppercase tracking-wider mb-1">{title}</h4>
        <div className="text-3xl font-bold font-display text-foreground">{value}</div>
      </div>
    </Card>
  );
}
