import { useMemo, useState } from "react";
import { AppLayout, PageHeader } from "@/components/layout/AppLayout";
import { Button, Modal, Input, DataTable, Select } from "@/components/ui-kit";
import { useSales, useCreateSale } from "@/hooks/use-poultry";
import { useI18n } from "@/lib/i18n";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Plus } from "lucide-react";

type ChickenType = "Pure" | "Broiler";

function normalizeChickenType(value: string | undefined): ChickenType {
  return value === "Broiler" ? "Broiler" : "Pure";
}

export default function EggSales() {
  const { t } = useI18n();
  const { data: sales, isLoading } = useSales();
  const { mutateAsync: createSale, isPending } = useCreateSale();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    customerName: "",
    eggsSold: "",
    pricePerEgg: "",
    saleType: "Egg",
    chickenType: "Pure" as ChickenType,
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
    (Number(formData.eggsSold) || 0) * (Number(formData.pricePerEgg) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createSale({
      date: formData.date,
      customerName: formData.customerName,
      eggsSold: Number(formData.eggsSold),
      pricePerEgg: Number(formData.pricePerEgg),
      totalAmount,
      saleType: formData.saleType,
      chickenType: formData.chickenType,
    });
    setIsModalOpen(false);
    setFormData({
      date: new Date().toISOString().split("T")[0],
      customerName: "",
      eggsSold: "",
      pricePerEgg: "",
      saleType: "Egg",
      chickenType: "Pure",
    });
  };

  return (
    <AppLayout>
      <PageHeader
        title="Egg Sales"
        description="Manage pure and broiler egg sales and revenue generation."
        action={
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus size={20} /> {t("New Sale")}
          </Button>
        }
      />

      {isLoading ? (
        <div className="p-8 text-center text-muted-foreground">{t("Loading records...")}</div>
      ) : (
        <div className="space-y-8">
          <section className="space-y-3">
            <h3 className="text-lg font-bold font-display text-primary">{t("Pure Egg Sales")}</h3>
            <DataTable headers={[t("Date"), t("Customer"), t("Type"), t("Quantity"), t("Price"), t("Total Amount")]}>
              {pureSales.map((record) => (
                <tr key={record.id} className="hover:bg-black/5 transition-colors">
                  <td className="px-6 py-4 font-medium">{formatDate(record.date)}</td>
                  <td className="px-6 py-4 font-semibold">{record.customerName}</td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 bg-accent/20 text-accent-foreground rounded-full text-xs font-bold uppercase tracking-wider">
                      {record.saleType}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-display font-bold">{record.eggsSold.toLocaleString()}</td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {formatCurrency(record.pricePerEgg)}
                  </td>
                  <td className="px-6 py-4 font-bold text-success text-lg">
                    {formatCurrency(record.totalAmount)}
                  </td>
                </tr>
              ))}
              {pureSales.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    {t("No pure egg sales yet.")}
                  </td>
                </tr>
              )}
            </DataTable>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-bold font-display text-primary">{t("Broiler Egg Sales")}</h3>
            <DataTable headers={[t("Date"), t("Customer"), t("Type"), t("Quantity"), t("Price"), t("Total Amount")]}>
              {broilerSales.map((record) => (
                <tr key={record.id} className="hover:bg-black/5 transition-colors">
                  <td className="px-6 py-4 font-medium">{formatDate(record.date)}</td>
                  <td className="px-6 py-4 font-semibold">{record.customerName}</td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 bg-accent/20 text-accent-foreground rounded-full text-xs font-bold uppercase tracking-wider">
                      {record.saleType}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-display font-bold">{record.eggsSold.toLocaleString()}</td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {formatCurrency(record.pricePerEgg)}
                  </td>
                  <td className="px-6 py-4 font-bold text-success text-lg">
                    {formatCurrency(record.totalAmount)}
                  </td>
                </tr>
              ))}
              {broilerSales.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    {t("No broiler egg sales yet.")}
                  </td>
                </tr>
              )}
            </DataTable>
          </section>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={t("Record New Egg Sale")}>
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label={t("Date")}
            type="date"
            required
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          />
          <Input
            label={t("Customer Name")}
            required
            placeholder={t("e.g. Fresh Mart")}
            value={formData.customerName}
            onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
          />
          <Select
            label={t("Egg Type")}
            value={formData.chickenType}
            onChange={(e) => setFormData({ ...formData, chickenType: e.target.value as ChickenType })}
          >
            <option value="Pure">{t("Pure Egg")}</option>
            <option value="Broiler">{t("Broiler Egg")}</option>
          </Select>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label={t("Sale Unit")}
              value={formData.saleType}
              onChange={(e) => setFormData({ ...formData, saleType: e.target.value })}
            >
              <option value="Egg">{t("Individual Eggs")}</option>
              <option value="Tray">{t("Trays (30 eggs)")}</option>
            </Select>
            <Input
              label={`${t("Quantity")} (${formData.saleType}s)`}
              type="number"
              min="1"
              required
              value={formData.eggsSold}
              onChange={(e) => setFormData({ ...formData, eggsSold: e.target.value })}
            />
          </div>
          <Input
            label={`${t("Price per")} ${formData.saleType} (INR)`}
            type="number"
            step="0.01"
            min="0"
            required
            value={formData.pricePerEgg}
            onChange={(e) => setFormData({ ...formData, pricePerEgg: e.target.value })}
          />

          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex justify-between items-center mt-2">
            <span className="font-semibold text-primary">{t("Total Amount:")}</span>
            <span className="font-display font-bold text-2xl text-primary">
              {formatCurrency(totalAmount)}
            </span>
          </div>

          <Button type="submit" className="w-full" disabled={isPending || totalAmount <= 0}>
            {isPending ? t("Processing...") : t("Complete Sale")}
          </Button>
        </form>
      </Modal>
    </AppLayout>
  );
}
