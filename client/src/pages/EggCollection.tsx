import { useMemo, useState } from "react";
import { AppLayout, PageHeader } from "@/components/layout/AppLayout";
import { Button, Modal, Input, DataTable, Select } from "@/components/ui-kit";
import { useEggs, useCreateEgg } from "@/hooks/use-poultry";
import { useI18n } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";
import { Plus } from "lucide-react";

type ChickenType = "Pure" | "Broiler";

function normalizeChickenType(value: string | undefined): ChickenType {
  return value === "Broiler" ? "Broiler" : "Pure";
}

export default function EggCollection() {
  const { t } = useI18n();
  const { data: eggs, isLoading } = useEggs();
  const { mutateAsync: createEgg, isPending } = useCreateEgg();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    eggsCollected: '',
    brokenEggs: '',
    chickenType: "Pure" as ChickenType,
    shed: '',
    notes: ''
  });

  const eggsCollectedValue = Number(formData.eggsCollected || 0);
  const brokenEggsValue = Number(formData.brokenEggs || 0);
  const actualEggsValue = Math.max(0, eggsCollectedValue - brokenEggsValue);

  const sortedEggs = useMemo(
    () =>
      [...(eggs ?? [])].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      ),
    [eggs],
  );
  const pureEggs = sortedEggs.filter(
    (record) => normalizeChickenType(record.chickenType) === "Pure",
  );
  const broilerEggs = sortedEggs.filter(
    (record) => normalizeChickenType(record.chickenType) === "Broiler",
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createEgg({
      date: formData.date,
      eggsCollected: Number(formData.eggsCollected),
      brokenEggs: Number(formData.brokenEggs || 0),
      chickenType: formData.chickenType,
      shed: formData.shed,
      notes: formData.notes
    });
    setIsModalOpen(false);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      eggsCollected: '',
      brokenEggs: '',
      chickenType: "Pure",
      shed: '',
      notes: '',
    });
  };

  return (
    <AppLayout>
      <PageHeader 
        title="Egg Collection" 
        description="Track daily egg production across all sheds."
        action={<Button onClick={() => setIsModalOpen(true)}><Plus size={20}/> {t("Record Collection")}</Button>}
      />

      {isLoading ? (
        <div className="p-8 text-center text-muted-foreground">{t("Loading records...")}</div>
      ) : (
        <div className="space-y-8">
          <section className="space-y-3">
            <h3 className="text-lg font-bold font-display text-primary">{t("Pure Egg Collection")}</h3>
            <DataTable headers={[t("Date"), t("Shed"), t("Eggs Collected"), t("Broken Eggs"), t("Actual Eggs"), t("Notes")]}>
              {pureEggs.map(record => (
                <tr key={record.id} className="hover:bg-black/5 transition-colors">
                  <td className="px-6 py-4 font-medium">{formatDate(record.date)}</td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 bg-primary/10 text-primary rounded-full font-bold text-sm">
                      {record.shed}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-display font-bold text-lg">{record.eggsCollected.toLocaleString()}</td>
                  <td className="px-6 py-4 font-bold text-warning">{(record.brokenEggs ?? 0).toLocaleString()}</td>
                  <td className="px-6 py-4 font-display font-bold text-lg">
                    {Math.max(0, record.eggsCollected - (record.brokenEggs ?? 0)).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">{record.notes || '-'}</td>
                </tr>
              ))}
              {pureEggs.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">{t("No pure egg records found.")}</td></tr>
              )}
            </DataTable>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-bold font-display text-primary">{t("Broiler Egg Collection")}</h3>
            <DataTable headers={[t("Date"), t("Shed"), t("Eggs Collected"), t("Broken Eggs"), t("Actual Eggs"), t("Notes")]}>
              {broilerEggs.map(record => (
                <tr key={record.id} className="hover:bg-black/5 transition-colors">
                  <td className="px-6 py-4 font-medium">{formatDate(record.date)}</td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 bg-primary/10 text-primary rounded-full font-bold text-sm">
                      {record.shed}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-display font-bold text-lg">{record.eggsCollected.toLocaleString()}</td>
                  <td className="px-6 py-4 font-bold text-warning">{(record.brokenEggs ?? 0).toLocaleString()}</td>
                  <td className="px-6 py-4 font-display font-bold text-lg">
                    {Math.max(0, record.eggsCollected - (record.brokenEggs ?? 0)).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">{record.notes || '-'}</td>
                </tr>
              ))}
              {broilerEggs.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">{t("No broiler egg records found.")}</td></tr>
              )}
            </DataTable>
          </section>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={t("Record Egg Collection")}>
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input 
            label={t("Date")} type="date" required
            value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})}
          />
          <Select
            label={t("Egg Type")}
            value={formData.chickenType}
            onChange={e => setFormData({ ...formData, chickenType: e.target.value as ChickenType })}
          >
            <option value="Pure">{t("Pure Egg")}</option>
            <option value="Broiler">{t("Broiler Egg")}</option>
          </Select>
          <Input 
            label={t("Eggs Collected")} type="number" min="0" required placeholder={t("e.g. 5000")}
            value={formData.eggsCollected} onChange={e => setFormData({...formData, eggsCollected: e.target.value})}
          />
          <Input
            label={t("Broken Eggs")} type="number" min="0" placeholder={t("e.g. 12")}
            value={formData.brokenEggs} onChange={e => setFormData({...formData, brokenEggs: e.target.value})}
          />
          <Input
            label={t("Actual Eggs")}
            type="number"
            value={actualEggsValue}
            readOnly
          />
          <Input 
            label={t("Shed Name/Number")} required placeholder={t("e.g. Shed A")}
            value={formData.shed} onChange={e => setFormData({...formData, shed: e.target.value})}
          />
          <Input 
            label={t("Notes (Optional)")} placeholder={t("Any observations...")}
            value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})}
          />
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? t("Saving...") : t("Save Record")}
          </Button>
        </form>
      </Modal>
    </AppLayout>
  );
}
