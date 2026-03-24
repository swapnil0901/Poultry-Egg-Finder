import { useState } from "react";
import { AppLayout, PageHeader } from "@/components/layout/AppLayout";
import { Button, Modal, Input, DataTable } from "@/components/ui-kit";
import { useInventory, useCreateInventory } from "@/hooks/use-poultry";
import { useI18n } from "@/lib/i18n";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Plus } from "lucide-react";

export default function Inventory() {
  const { t } = useI18n();
  const { data: records, isLoading } = useInventory();
  const { mutateAsync: createRecord, isPending } = useCreateInventory();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    itemName: "",
    quantity: "",
    purchaseDate: new Date().toISOString().split("T")[0],
    supplier: "",
    cost: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createRecord({
      itemName: formData.itemName,
      quantity: Number(formData.quantity),
      purchaseDate: formData.purchaseDate,
      supplier: formData.supplier,
      cost: Number(formData.cost),
    });
    setIsModalOpen(false);
    setFormData({
      itemName: "",
      quantity: "",
      purchaseDate: new Date().toISOString().split("T")[0],
      supplier: "",
      cost: "",
    });
  };

  return (
    <AppLayout>
      <PageHeader
        title="Feed & Inventory"
        description="Manage stock levels for feed, medicine, and supplies."
        action={<Button onClick={() => setIsModalOpen(true)}><Plus size={20}/> {t("Add Stock")}</Button>}
      />

      {isLoading ? (
        <div className="p-8 text-center text-muted-foreground">{t("Loading records...")}</div>
      ) : (
        <DataTable headers={[t("Item Name"), t("Quantity Added"), t("Purchase Date"), t("Supplier"), t("Total Cost")]}>
          {records?.sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime()).map((record) => (
            <tr key={record.id} className="hover:bg-black/5 transition-colors">
              <td className="px-6 py-4 font-bold">{record.itemName}</td>
              <td className="px-6 py-4">
                <span className="px-3 py-1 bg-info/10 text-info rounded-full font-bold text-sm">
                  +{record.quantity.toLocaleString()} {t("units")}
                </span>
              </td>
              <td className="px-6 py-4 text-muted-foreground">{formatDate(record.purchaseDate)}</td>
              <td className="px-6 py-4">{record.supplier}</td>
              <td className="px-6 py-4 font-display font-bold">{formatCurrency(record.cost as string)}</td>
            </tr>
          ))}
          {(!records || records.length === 0) && (
            <tr><td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">{t("No inventory records found.")}</td></tr>
          )}
        </DataTable>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={t("Add to Inventory")}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label={t("Item Name")}
            required
            placeholder={t("e.g. Layer Feed 50kg")}
            value={formData.itemName}
            onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t("Quantity Added")}
              type="number"
              min="1"
              required
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
            />
            <Input
              label={t("Total Cost (INR)")}
              type="number"
              step="0.01"
              min="0"
              required
              value={formData.cost}
              onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
            />
          </div>
          <Input
            label={t("Purchase Date")}
            type="date"
            required
            value={formData.purchaseDate}
            onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
          />
          <Input
            label={t("Supplier Name")}
            required
            placeholder={t("e.g. Agri Supplies Ltd.")}
            value={formData.supplier}
            onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
          />
          <Button type="submit" className="w-full mt-4" disabled={isPending}>
            {isPending ? t("Saving...") : t("Add Stock")}
          </Button>
        </form>
      </Modal>
    </AppLayout>
  );
}
