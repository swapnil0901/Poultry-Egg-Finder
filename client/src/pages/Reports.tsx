import { AppLayout, PageHeader } from "@/components/layout/AppLayout";
import { Button, Card } from "@/components/ui-kit";
import { useChickenSales, useEggs, useSales, useExpenses } from "@/hooks/use-poultry";
import { Download } from "lucide-react";
import Papa from "papaparse";

export default function Reports() {
  const { data: eggs } = useEggs();
  const { data: sales } = useSales();
  const { data: chickenSales } = useChickenSales();
  const { data: expenses } = useExpenses();

  const exportCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) return alert("No data to export");
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AppLayout>
      <PageHeader 
        title="Data & Reports" 
        description="Export farm data for accounting and external analysis."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <Card className="flex flex-col items-center justify-center p-8 text-center hover-lift">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
            <Download size={32} />
          </div>
          <h3 className="text-xl font-bold font-display mb-2">Production Data</h3>
          <p className="text-muted-foreground mb-6 text-sm">Daily egg collection records including dates and sheds.</p>
          <Button className="w-full" onClick={() => exportCSV(eggs || [], 'egg_production')}>Export CSV</Button>
        </Card>

        <Card className="flex flex-col items-center justify-center p-8 text-center hover-lift">
          <div className="w-16 h-16 bg-success/10 text-success rounded-full flex items-center justify-center mb-4">
            <Download size={32} />
          </div>
          <h3 className="text-xl font-bold font-display mb-2">Sales Ledger</h3>
          <p className="text-muted-foreground mb-6 text-sm">All sales transactions, customer details, and generated revenue.</p>
          <Button className="w-full" variant="secondary" onClick={() => exportCSV(sales || [], 'egg_sales')}>Export CSV</Button>
        </Card>

        <Card className="flex flex-col items-center justify-center p-8 text-center hover-lift">
          <div className="w-16 h-16 bg-info/10 text-info rounded-full flex items-center justify-center mb-4">
            <Download size={32} />
          </div>
          <h3 className="text-xl font-bold font-display mb-2">Chicken Sales</h3>
          <p className="text-muted-foreground mb-6 text-sm">Live bird sales records with customer, type, quantity, and value.</p>
          <Button className="w-full" variant="secondary" onClick={() => exportCSV(chickenSales || [], 'chicken_sales')}>Export CSV</Button>
        </Card>

        <Card className="flex flex-col items-center justify-center p-8 text-center hover-lift">
          <div className="w-16 h-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mb-4">
            <Download size={32} />
          </div>
          <h3 className="text-xl font-bold font-display mb-2">Expense Reports</h3>
          <p className="text-muted-foreground mb-6 text-sm">Detailed logs of farm operational costs and categories.</p>
          <Button className="w-full" variant="outline" onClick={() => exportCSV(expenses || [], 'farm_expenses')}>Export CSV</Button>
        </Card>
      </div>
    </AppLayout>
  );
}
