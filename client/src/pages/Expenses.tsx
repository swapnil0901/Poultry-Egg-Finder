import { useState } from "react";
import { AppLayout, PageHeader } from "@/components/layout/AppLayout";
import { Button, Modal, Input, DataTable, Select } from "@/components/ui-kit";
import { useExpenses, useCreateExpense } from "@/hooks/use-poultry";
import { useI18n } from "@/lib/i18n";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Plus } from "lucide-react";

export default function Expenses() {
  const { t } = useI18n();
  const { data: records, isLoading } = useExpenses();
  const { mutateAsync: createRecord, isPending } = useCreateExpense();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    expenseType: "Feed",
    amount: "",
    description: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createRecord({
      date: formData.date,
      expenseType: formData.expenseType,
      amount: Number(formData.amount),
      description: formData.description,
    });
    setIsModalOpen(false);
    setFormData({
      date: new Date().toISOString().split("T")[0],
      expenseType: "Feed",
      amount: "",
      description: "",
    });
  };

  return (
    <AppLayout>
      <PageHeader
        title="Expenses"
        description="Track operational costs and farm expenditure."
        action={<Button onClick={() => setIsModalOpen(true)}><Plus size={20}/> {t("Log Expense")}</Button>}
      />

      {isLoading ? (
        <div className="p-8 text-center text-muted-foreground">{t("Loading records...")}</div>
      ) : (
        <DataTable headers={[t("Date"), t("Category"), t("Amount"), t("Description")]}>
          {records?.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((record) => (
            <tr key={record.id} className="hover:bg-black/5 transition-colors">
              <td className="px-6 py-4 font-medium">{formatDate(record.date)}</td>
              <td className="px-6 py-4">
                <span className="px-3 py-1 bg-secondary text-secondary-foreground rounded-md font-semibold text-sm">
                  {record.expenseType}
                </span>
              </td>
              <td className="px-6 py-4 font-display font-bold text-destructive text-lg">-{formatCurrency(record.amount as string)}</td>
              <td className="px-6 py-4 text-muted-foreground">{record.description || "-"}</td>
            </tr>
          ))}
          {(!records || records.length === 0) && (
            <tr><td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">{t("No expenses recorded yet.")}</td></tr>
          )}
        </DataTable>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={t("Log Farm Expense")}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label={t("Date")}
            type="date"
            required
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          />
          <Select
            label={t("Expense Category")}
            value={formData.expenseType}
            onChange={(e) => setFormData({ ...formData, expenseType: e.target.value })}
          >
            <option value="Feed">{t("Feed & Supplements")}</option>
            <option value="Labor">{t("Labor & Wages")}</option>
            <option value="Maintenance">{t("Maintenance & Repairs")}</option>
            <option value="Utilities">{t("Utilities (Water, Electricity)")}</option>
            <option value="Transportation">{t("Transportation")}</option>
            <option value="Other">{t("Other")}</option>
          </Select>
          <Input
            label={t("Amount (INR)")}
            type="number"
            step="0.01"
            min="0"
            required
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
          />
          <Input
            label={t("Description (Optional)")}
            placeholder={t("What was this for?")}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
          <Button type="submit" className="w-full mt-4" disabled={isPending}>
            {isPending ? t("Saving...") : t("Record Expense")}
          </Button>
        </form>
      </Modal>
    </AppLayout>
  );
}
