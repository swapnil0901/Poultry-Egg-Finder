import { AppLayout, PageHeader } from "@/components/layout/AppLayout";
import { Button, Card, Input } from "@/components/ui-kit";
import { useChickenSales, useDailyProfitReport, useEggs, useSales, useExpenses } from "@/hooks/use-poultry";
import { Download } from "lucide-react";
import Papa from "papaparse";
import { useMemo, useState } from "react";

type ExportRow = Record<string, unknown>;

const COLUMN_LABELS: Record<string, string> = {
  id: "ID",
  date: "Date",
  chickenType: "Chicken Type",
  shed: "Shed",
  eggsCollected: "Eggs Collected",
  brokenEggs: "Broken Eggs",
  eggsSold: "Eggs Sold",
  chickensSold: "Chickens Sold",
  totalRevenue: "Total Revenue",
  totalExpense: "Total Expense",
  totalExpenses: "Total Expense",
  totalAmount: "Total Amount",
  netDailyProfit: "Net Daily Profit",
  expenseType: "Expense Type",
  customerName: "Customer Name",
  pricePerEgg: "Price Per Egg",
  pricePerChicken: "Price Per Chicken",
  notes: "Notes",
  createdAt: "Created At",
  updatedAt: "Updated At",
};

function formatDateForExport(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString().split("T")[0];
  }

  if (typeof value === "string") {
    const trimmedValue = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmedValue)) {
      return trimmedValue;
    }

    const parsedDate = new Date(trimmedValue);
    if (!Number.isNaN(parsedDate.getTime())) {
      return parsedDate.toISOString().split("T")[0];
    }

    return trimmedValue;
  }

  return String(value ?? "");
}

function formatHeaderLabel(key: string): string {
  if (COLUMN_LABELS[key]) {
    return COLUMN_LABELS[key];
  }

  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatCellValue(key: string, value: unknown): string | number {
  if (value === null || value === undefined) {
    return "";
  }

  if (key.toLowerCase().includes("date")) {
    // Force Excel to keep the date readable as text instead of auto-formatting it poorly.
    return `="${formatDateForExport(value)}"`;
  }

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  return String(value);
}

function toDateKey(value: unknown): string | null {
  if (value instanceof Date) {
    return value.toISOString().split("T")[0];
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().split("T")[0];
    }
  }

  return null;
}

function normalizeRange(start: string, end: string): { start: string; end: string } {
  if (start && end && start > end) {
    return { start: end, end: start };
  }
  return { start, end };
}

function normalizeRowsForExport(data: ExportRow[]): ExportRow[] {
  const columnKeys = Array.from(
    data.reduce((keys, row) => {
      Object.keys(row).forEach((key) => keys.add(key));
      return keys;
    }, new Set<string>()),
  );

  return data.map((row) =>
    Object.fromEntries(
      columnKeys.map((key) => [formatHeaderLabel(key), formatCellValue(key, row[key])]),
    ),
  );
}

export default function Reports() {
  const { data: eggs } = useEggs();
  const { data: sales } = useSales();
  const { data: chickenSales } = useChickenSales();
  const { data: expenses } = useExpenses();
  const { data: dailyProfitReport } = useDailyProfitReport();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const dateRange = useMemo(() => normalizeRange(startDate, endDate), [startDate, endDate]);

  const filterByDate = <T extends ExportRow>(data: T[] | undefined): T[] => {
    if (!data) return [];
    if (!dateRange.start && !dateRange.end) return data;
    return data.filter((row) => {
      const dateKey = toDateKey(row.date);
      if (!dateKey) return false;
      if (dateRange.start && dateKey < dateRange.start) return false;
      if (dateRange.end && dateKey > dateRange.end) return false;
      return true;
    });
  };

  const exportCSV = (data: ExportRow[], filename: string) => {
    if (!data || data.length === 0) return alert("No data to export");
    const normalizedRows = normalizeRowsForExport(data);
    const csv = Papa.unparse(normalizedRows, {
      header: true,
      quotes: true,
      skipEmptyLines: true,
    });
    const blob = new Blob(["\uFEFF", csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    const dateLabel = [dateRange.start, dateRange.end].filter(Boolean).join("_");
    const suffix = dateLabel ? `${dateLabel}_` : "";
    link.setAttribute("download", `${filename}_${suffix}${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredDailyProfitReport = useMemo(
    () => filterByDate(dailyProfitReport),
    [dailyProfitReport, dateRange],
  );
  const filteredEggs = useMemo(() => filterByDate(eggs), [eggs, dateRange]);
  const filteredSales = useMemo(() => filterByDate(sales), [sales, dateRange]);
  const filteredChickenSales = useMemo(
    () => filterByDate(chickenSales),
    [chickenSales, dateRange],
  );
  const filteredExpenses = useMemo(() => filterByDate(expenses), [expenses, dateRange]);

  return (
    <AppLayout>
      <PageHeader 
        title="Data & Reports" 
        description="Export farm data for accounting and external analysis."
      />

      <Card className="mb-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="From Date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <Input
            label="To Date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Selected date range will filter all CSV exports.
        </p>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <Card className="flex flex-col items-center justify-center p-8 text-center hover-lift">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
            <Download size={32} />
          </div>
          <h3 className="text-xl font-bold font-display mb-2">Daily Profit Report</h3>
          <p className="text-muted-foreground mb-6 text-sm">
            Date, eggs sold, chickens sold, revenue, expenses, and net daily profit.
          </p>
          <Button className="w-full" onClick={() => exportCSV(filteredDailyProfitReport, 'daily_profit_report')}>
            Download Daily Report
          </Button>
        </Card>

        <Card className="flex flex-col items-center justify-center p-8 text-center hover-lift">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
            <Download size={32} />
          </div>
          <h3 className="text-xl font-bold font-display mb-2">Production Data</h3>
          <p className="text-muted-foreground mb-6 text-sm">Daily egg collection records including dates and sheds.</p>
          <Button className="w-full" onClick={() => exportCSV(filteredEggs, 'egg_production')}>Export CSV</Button>
        </Card>

        <Card className="flex flex-col items-center justify-center p-8 text-center hover-lift">
          <div className="w-16 h-16 bg-success/10 text-success rounded-full flex items-center justify-center mb-4">
            <Download size={32} />
          </div>
          <h3 className="text-xl font-bold font-display mb-2">Sales Ledger</h3>
          <p className="text-muted-foreground mb-6 text-sm">All sales transactions, customer details, and generated revenue.</p>
          <Button className="w-full" variant="secondary" onClick={() => exportCSV(filteredSales, 'egg_sales')}>Export CSV</Button>
        </Card>

        <Card className="flex flex-col items-center justify-center p-8 text-center hover-lift">
          <div className="w-16 h-16 bg-info/10 text-info rounded-full flex items-center justify-center mb-4">
            <Download size={32} />
          </div>
          <h3 className="text-xl font-bold font-display mb-2">Chicken Sales</h3>
          <p className="text-muted-foreground mb-6 text-sm">Live bird sales records with customer, type, quantity, and value.</p>
          <Button className="w-full" variant="secondary" onClick={() => exportCSV(filteredChickenSales, 'chicken_sales')}>Export CSV</Button>
        </Card>

        <Card className="flex flex-col items-center justify-center p-8 text-center hover-lift">
          <div className="w-16 h-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mb-4">
            <Download size={32} />
          </div>
          <h3 className="text-xl font-bold font-display mb-2">Expense Reports</h3>
          <p className="text-muted-foreground mb-6 text-sm">Detailed logs of farm operational costs and categories.</p>
          <Button className="w-full" variant="outline" onClick={() => exportCSV(filteredExpenses, 'farm_expenses')}>Export CSV</Button>
        </Card>
      </div>
    </AppLayout>
  );
}
