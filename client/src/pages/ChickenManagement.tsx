import { useEffect, useMemo, useState } from "react";
import { AppLayout, PageHeader } from "@/components/layout/AppLayout";
import { Button, Modal, Input, DataTable, Select } from "@/components/ui-kit";
import { useChickens, useCreateChicken } from "@/hooks/use-poultry";
import { useI18n } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";
import { Plus } from "lucide-react";

type ChickenType = "Pure" | "Broiler";

function normalizeChickenType(value: string | undefined): ChickenType {
  return value === "Broiler" ? "Broiler" : "Pure";
}

type CensusFormData = {
  totalChickens: string;
  healthy: string;
  sick: string;
  dead: string;
  chicks: string;
  chickenType: ChickenType;
};

type CensusFormErrors = {
  totalChickens: string;
  sick: string;
  dead: string;
  chicks: string;
};

const DEFAULT_FORM_DATA: CensusFormData = {
  totalChickens: "",
  healthy: "",
  sick: "",
  dead: "",
  chicks: "",
  chickenType: "Pure",
};

const DEFAULT_FORM_ERRORS: CensusFormErrors = {
  totalChickens: "",
  sick: "",
  dead: "",
  chicks: "",
};

function parseCount(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function calculateHealthyCount(totalChickens: number, sick: number, dead: number, chicks: number): number {
  return totalChickens + chicks - sick - dead;
}

export default function ChickenManagement() {
  const { t } = useI18n();
  const { data: records, isLoading } = useChickens();
  const { mutateAsync: createRecord, isPending } = useCreateChicken();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<CensusFormData>(DEFAULT_FORM_DATA);
  const [formErrors, setFormErrors] = useState<CensusFormErrors>(DEFAULT_FORM_ERRORS);

  const sortedRecords = useMemo(
    () =>
      [...(records ?? [])].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      ),
    [records],
  );

  const pureRecords = useMemo(
    () =>
      sortedRecords.filter(
        (record) => normalizeChickenType(record.chickenType) === "Pure",
      ),
    [sortedRecords],
  );

  const broilerRecords = useMemo(
    () =>
      sortedRecords.filter(
        (record) => normalizeChickenType(record.chickenType) === "Broiler",
      ),
    [sortedRecords],
  );

  const latestTotalsByType = useMemo(
    () => ({
      Pure:
        pureRecords[0]?.totalChickens ??
        0,
      Broiler:
        broilerRecords[0]?.totalChickens ??
        0,
    }),
    [broilerRecords, pureRecords],
  );

  const syncFormForType = (chickenType: ChickenType) => {
    const currentTotal = latestTotalsByType[chickenType];
    setFormData({
      totalChickens: String(currentTotal),
      healthy: String(currentTotal),
      sick: "",
      dead: "",
      chicks: "",
      chickenType,
    });
    setFormErrors(DEFAULT_FORM_ERRORS);
  };

  useEffect(() => {
    if (!isModalOpen) {
      return;
    }

    syncFormForType(formData.chickenType);
  }, [isModalOpen, latestTotalsByType.Pure, latestTotalsByType.Broiler]);

  const validateAndBuildFormState = (nextFormData: CensusFormData) => {
    const totalChickens = parseCount(nextFormData.totalChickens);
    const sick = parseCount(nextFormData.sick);
    const dead = parseCount(nextFormData.dead);
    const chicks = parseCount(nextFormData.chicks);
    const effectiveTotal = totalChickens + chicks;
    const healthyCount = calculateHealthyCount(totalChickens, sick, dead, chicks);

    const nextErrors: CensusFormErrors = {
      totalChickens: totalChickens < 0 ? "Total chickens cannot be negative." : "",
      sick: "",
      dead: "",
      chicks: chicks < 0 ? "New chicks added cannot be negative." : "",
    };

    if (sick < 0) {
      nextErrors.sick = "Sick count cannot be negative.";
    } else if (sick > effectiveTotal) {
      nextErrors.sick = "Sick count cannot be greater than total chickens.";
    }

    if (dead < 0) {
      nextErrors.dead = "Mortalities cannot be negative.";
    } else if (dead > effectiveTotal) {
      nextErrors.dead = "Mortalities cannot be greater than total chickens.";
    }

    if (!nextErrors.sick && !nextErrors.dead && healthyCount < 0) {
      const combinedError = "Sick count and mortalities cannot exceed total chickens.";
      nextErrors.sick = combinedError;
      nextErrors.dead = combinedError;
    }

    return {
      nextFormData: {
        ...nextFormData,
        healthy: String(Math.max(healthyCount, 0)),
      },
      nextErrors,
      totals: {
        totalChickens,
        sick,
        dead,
        chicks,
        healthyCount,
      },
      isValid:
        !nextErrors.totalChickens &&
        !nextErrors.sick &&
        !nextErrors.dead &&
        !nextErrors.chicks &&
        healthyCount >= 0,
    };
  };

  const updateFormData = (changes: Partial<CensusFormData>) => {
    const result = validateAndBuildFormState({
      ...formData,
      ...changes,
    });

    setFormData(result.nextFormData);
    setFormErrors(result.nextErrors);
    return result;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = validateAndBuildFormState(formData);

    setFormData(result.nextFormData);
    setFormErrors(result.nextErrors);

    if (!result.isValid) {
      return;
    }

    await createRecord({
      date: new Date().toISOString().split('T')[0],
      totalChickens: result.totals.totalChickens + result.totals.chicks - result.totals.dead,
      healthy: result.totals.healthyCount,
      sick: result.totals.sick,
      dead: result.totals.dead,
      chicks: result.totals.chicks,
      chickenType: formData.chickenType,
    });
    setIsModalOpen(false);
    setFormData(DEFAULT_FORM_DATA);
    setFormErrors(DEFAULT_FORM_ERRORS);
  };

  return (
    <AppLayout>
      <PageHeader 
        title="Flock Management" 
        description="Monitor the size and health status of your flock."
        action={<Button onClick={() => setIsModalOpen(true)}><Plus size={20}/> {t("Update Census")}</Button>}
      />

      {isLoading ? (
        <div className="p-8 text-center text-muted-foreground">{t("Loading records...")}</div>
      ) : (
        <div className="space-y-8">
          <section className="space-y-3">
            <h3 className="text-lg font-bold font-display text-primary">{t("Pure Chicken")}</h3>
            <DataTable headers={[t("Date"), t("Total Flock"), t("Healthy"), t("Sick"), t("Mortality"), t("New Chicks")]}>
              {pureRecords.map(record => (
                <tr key={record.id} className="hover:bg-black/5 transition-colors">
                  <td className="px-6 py-4 font-medium">{formatDate(record.date)}</td>
                  <td className="px-6 py-4 font-display font-bold text-lg text-primary">{record.totalChickens.toLocaleString()}</td>
                  <td className="px-6 py-4 font-bold text-success">{record.healthy.toLocaleString()}</td>
                  <td className="px-6 py-4 font-bold text-warning">{record.sick.toLocaleString()}</td>
                  <td className="px-6 py-4 font-bold text-destructive">{record.dead.toLocaleString()}</td>
                  <td className="px-6 py-4 font-bold text-info">{record.chicks.toLocaleString()}</td>
                </tr>
              ))}
              {pureRecords.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">{t("No pure chicken census data yet.")}</td></tr>
              )}
            </DataTable>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-bold font-display text-primary">{t("Broiler Chicken")}</h3>
            <DataTable headers={[t("Date"), t("Total Flock"), t("Healthy"), t("Sick"), t("Mortality"), t("New Chicks")]}>
              {broilerRecords.map(record => (
                <tr key={record.id} className="hover:bg-black/5 transition-colors">
                  <td className="px-6 py-4 font-medium">{formatDate(record.date)}</td>
                  <td className="px-6 py-4 font-display font-bold text-lg text-primary">{record.totalChickens.toLocaleString()}</td>
                  <td className="px-6 py-4 font-bold text-success">{record.healthy.toLocaleString()}</td>
                  <td className="px-6 py-4 font-bold text-warning">{record.sick.toLocaleString()}</td>
                  <td className="px-6 py-4 font-bold text-destructive">{record.dead.toLocaleString()}</td>
                  <td className="px-6 py-4 font-bold text-info">{record.chicks.toLocaleString()}</td>
                </tr>
              ))}
              {broilerRecords.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">{t("No broiler chicken census data yet.")}</td></tr>
              )}
            </DataTable>
          </section>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={t("Update Flock Census")}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label={t("Chicken Type")}
            value={formData.chickenType}
            onChange={e => syncFormForType(e.target.value as ChickenType)}
          >
            <option value="Pure">{t("Pure Chicken")}</option>
            <option value="Broiler">{t("Broiler Chicken")}</option>
          </Select>
          <Input 
            label={t("Total Chickens")} type="number" min="0" required
            value={formData.totalChickens}
            onChange={e => updateFormData({ totalChickens: e.target.value })}
            error={formErrors.totalChickens}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input 
              label={t("Healthy Count")} type="number" min="0" required
              value={formData.healthy}
              readOnly
            />
            <Input 
              label={t("Sick Count")} type="number" min="0" required
              value={formData.sick}
              onChange={e => updateFormData({ sick: e.target.value })}
              error={formErrors.sick}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input 
              label={t("Mortalities (Dead)")} type="number" min="0" required
              value={formData.dead}
              onChange={e => updateFormData({ dead: e.target.value })}
              error={formErrors.dead}
            />
            <Input 
              label={t("New Chicks Added")} type="number" min="0" required
              value={formData.chicks}
              onChange={e => updateFormData({ chicks: e.target.value })}
              error={formErrors.chicks}
            />
          </div>
          <Button type="submit" className="w-full mt-4" disabled={isPending}>
            {isPending ? t("Saving...") : t("Save Census")}
          </Button>
        </form>
      </Modal>
    </AppLayout>
  );
}
