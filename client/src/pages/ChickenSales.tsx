import { useMemo, useState } from "react";
import { AppLayout, PageHeader } from "@/components/layout/AppLayout";
import { Button, Modal, Input, DataTable, Select } from "@/components/ui-kit";
import { useChickenSales, useCreateChickenSale } from "@/hooks/use-poultry";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Plus } from "lucide-react";

type ChickenType = "Pure" | "Broiler";

function normalizeChickenType(value: string | undefined): ChickenType {
  return value === "Broiler" ? "Broiler" : "Pure";
}

export default function ChickenSales() {
  const { data: sales, isLoading } = useChickenSales();
  const { mutateAsync: createChickenSale, isPending } = useCreateChickenSale();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    customerName: "",
    chickensSold: "",
    pricePerChicken: "",
    chickenType: "Pure" as ChickenType,
    notes: "",
  });

  const sortedSales = useMemo(
    () =>
      [...(sales ?? [])].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      ),
    [sales],
  );

  const pureSales = sortedSales.filter(
    (record) => normalizeChickenType(record.chickenType) === "Pure",
  );
  const broilerSales = sortedSales.filter(
    (record) => normalizeChickenType(record.chickenType) === "Broiler",
  );

  const totalAmount =
    (Number(formData.chickensSold) || 0) * (Number(formData.pricePerChicken) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createChickenSale({
      date: formData.date,
      customerName: formData.customerName,
      chickensSold: Number(formData.chickensSold),
      pricePerChicken: Number(formData.pricePerChicken),
      totalAmount,
      chickenType: formData.chickenType,
      notes: formData.notes || null,
    });
    setIsModalOpen(false);
    setFormData({
      date: new Date().toISOString().split("T")[0],
      customerName: "",
      chickensSold: "",
      pricePerChicken: "",
      chickenType: "Pure",
      notes: "",
    });
  };

  return (
    <AppLayout>
      <PageHeader
        title="Chicken Sales"
        description="Record live bird sales for both pure and broiler stock."
        action={
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus size={20} /> New Chicken Sale
          </Button>
        }
      />

      {isLoading ? (
        <div className="p-8 text-center text-muted-foreground">Loading records...</div>
      ) : (
        <div className="space-y-8">
          <section className="space-y-3">
            <h3 className="text-lg font-bold font-display text-primary">Pure Chicken Sales</h3>
            <DataTable headers={["Date", "Customer", "Birds Sold", "Rate", "Total Amount", "Notes"]}>
              {pureSales.map((record) => (
                <tr key={record.id} className="hover:bg-black/5 transition-colors">
                  <td className="px-6 py-4 font-medium">{formatDate(record.date)}</td>
                  <td className="px-6 py-4 font-semibold">{record.customerName}</td>
                  <td className="px-6 py-4 font-display font-bold">
                    {record.chickensSold.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {formatCurrency(record.pricePerChicken)}
                  </td>
                  <td className="px-6 py-4 font-bold text-success text-lg">
                    {formatCurrency(record.totalAmount)}
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">{record.notes || "-"}</td>
                </tr>
              ))}
              {pureSales.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    No pure chicken sale records yet.
                  </td>
                </tr>
              )}
            </DataTable>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-bold font-display text-primary">Broiler Chicken Sales</h3>
            <DataTable headers={["Date", "Customer", "Birds Sold", "Rate", "Total Amount", "Notes"]}>
              {broilerSales.map((record) => (
                <tr key={record.id} className="hover:bg-black/5 transition-colors">
                  <td className="px-6 py-4 font-medium">{formatDate(record.date)}</td>
                  <td className="px-6 py-4 font-semibold">{record.customerName}</td>
                  <td className="px-6 py-4 font-display font-bold">
                    {record.chickensSold.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {formatCurrency(record.pricePerChicken)}
                  </td>
                  <td className="px-6 py-4 font-bold text-success text-lg">
                    {formatCurrency(record.totalAmount)}
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">{record.notes || "-"}</td>
                </tr>
              ))}
              {broilerSales.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    No broiler chicken sale records yet.
                  </td>
                </tr>
              )}
            </DataTable>
          </section>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Record Chicken Sale">
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Date"
            type="date"
            required
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          />
          <Input
            label="Customer Name"
            required
            placeholder="e.g. Farm Fresh Buyers"
            value={formData.customerName}
            onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
          />
          <Select
            label="Chicken Type"
            value={formData.chickenType}
            onChange={(e) => setFormData({ ...formData, chickenType: e.target.value as ChickenType })}
          >
            <option value="Pure">Pure Chicken</option>
            <option value="Broiler">Broiler Chicken</option>
          </Select>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Birds Sold"
              type="number"
              min="1"
              required
              value={formData.chickensSold}
              onChange={(e) => setFormData({ ...formData, chickensSold: e.target.value })}
            />
            <Input
              label="Price per Chicken (INR)"
              type="number"
              step="0.01"
              min="0"
              required
              value={formData.pricePerChicken}
              onChange={(e) => setFormData({ ...formData, pricePerChicken: e.target.value })}
            />
          </div>
          <Input
            label="Notes (Optional)"
            placeholder="Batch details, average weight, buyer notes..."
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />

          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex justify-between items-center mt-2">
            <span className="font-semibold text-primary">Total Amount:</span>
            <span className="font-display font-bold text-2xl text-primary">
              {formatCurrency(totalAmount)}
            </span>
          </div>

          <Button type="submit" className="w-full" disabled={isPending || totalAmount <= 0}>
            {isPending ? "Processing..." : "Complete Chicken Sale"}
          </Button>
        </form>
      </Modal>
    </AppLayout>
  );
}
