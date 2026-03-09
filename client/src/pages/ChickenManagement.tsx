import { useMemo, useState } from "react";
import { AppLayout, PageHeader } from "@/components/layout/AppLayout";
import { Button, Modal, Input, DataTable, Select } from "@/components/ui-kit";
import { useChickens, useCreateChicken } from "@/hooks/use-poultry";
import { formatDate } from "@/lib/utils";
import { Plus } from "lucide-react";

type ChickenType = "Pure" | "Broiler";

function normalizeChickenType(value: string | undefined): ChickenType {
  return value === "Broiler" ? "Broiler" : "Pure";
}

export default function ChickenManagement() {
  const { data: records, isLoading } = useChickens();
  const { mutateAsync: createRecord, isPending } = useCreateChicken();
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [formData, setFormData] = useState({ 
    totalChickens: '',
    healthy: '',
    sick: '',
    dead: '',
    chicks: '',
    chickenType: "Pure" as ChickenType,
  });

  const sortedRecords = useMemo(
    () =>
      [...(records ?? [])].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      ),
    [records],
  );

  const pureRecords = sortedRecords.filter(
    (record) => normalizeChickenType(record.chickenType) === "Pure",
  );
  const broilerRecords = sortedRecords.filter(
    (record) => normalizeChickenType(record.chickenType) === "Broiler",
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createRecord({
      date: new Date().toISOString().split('T')[0],
      totalChickens: Number(formData.totalChickens),
      healthy: Number(formData.healthy),
      sick: Number(formData.sick),
      dead: Number(formData.dead),
      chicks: Number(formData.chicks),
      chickenType: formData.chickenType,
    });
    setIsModalOpen(false);
    setFormData({
      totalChickens: '',
      healthy: '',
      sick: '',
      dead: '',
      chicks: '',
      chickenType: "Pure",
    });
  };

  return (
    <AppLayout>
      <PageHeader 
        title="Flock Management" 
        description="Monitor the size and health status of your flock."
        action={<Button onClick={() => setIsModalOpen(true)}><Plus size={20}/> Update Census</Button>}
      />

      {isLoading ? (
        <div className="p-8 text-center text-muted-foreground">Loading records...</div>
      ) : (
        <div className="space-y-8">
          <section className="space-y-3">
            <h3 className="text-lg font-bold font-display text-primary">Pure Chicken</h3>
            <DataTable headers={["Date", "Total Flock", "Healthy", "Sick", "Mortality", "New Chicks"]}>
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
                <tr><td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">No pure chicken census data yet.</td></tr>
              )}
            </DataTable>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-bold font-display text-primary">Broiler Chicken</h3>
            <DataTable headers={["Date", "Total Flock", "Healthy", "Sick", "Mortality", "New Chicks"]}>
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
                <tr><td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">No broiler chicken census data yet.</td></tr>
              )}
            </DataTable>
          </section>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Update Flock Census">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Chicken Type"
            value={formData.chickenType}
            onChange={e => setFormData({ ...formData, chickenType: e.target.value as ChickenType })}
          >
            <option value="Pure">Pure Chicken</option>
            <option value="Broiler">Broiler Chicken</option>
          </Select>
          <Input 
            label="Total Chickens" type="number" min="0" required
            value={formData.totalChickens} onChange={e => setFormData({...formData, totalChickens: e.target.value})}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Healthy Count" type="number" min="0" required
              value={formData.healthy} onChange={e => setFormData({...formData, healthy: e.target.value})}
            />
            <Input 
              label="Sick Count" type="number" min="0" required
              value={formData.sick} onChange={e => setFormData({...formData, sick: e.target.value})}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Mortalities (Dead)" type="number" min="0" required
              value={formData.dead} onChange={e => setFormData({...formData, dead: e.target.value})}
            />
            <Input 
              label="New Chicks Added" type="number" min="0" required
              value={formData.chicks} onChange={e => setFormData({...formData, chicks: e.target.value})}
            />
          </div>
          <Button type="submit" className="w-full mt-4" disabled={isPending}>
            {isPending ? "Saving..." : "Save Census"}
          </Button>
        </form>
      </Modal>
    </AppLayout>
  );
}
