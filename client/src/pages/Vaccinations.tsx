import { useState } from "react";
import { AppLayout, PageHeader } from "@/components/layout/AppLayout";
import { Button, Modal, Input, DataTable } from "@/components/ui-kit";
import { useVaccinations, useCreateVaccination } from "@/hooks/use-poultry";
import { formatDate } from "@/lib/utils";
import { Plus, Clock } from "lucide-react";

export default function Vaccinations() {
  const { data: records, isLoading } = useVaccinations();
  const { mutateAsync: createRecord, isPending } = useCreateVaccination();
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [formData, setFormData] = useState({ 
    vaccineName: '', date: new Date().toISOString().split('T')[0], chickensVaccinated: '', nextVaccination: '' 
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createRecord({
      vaccineName: formData.vaccineName,
      date: formData.date,
      chickensVaccinated: Number(formData.chickensVaccinated),
      nextVaccination: formData.nextVaccination
    });
    setIsModalOpen(false);
    setFormData({ vaccineName: '', date: new Date().toISOString().split('T')[0], chickensVaccinated: '', nextVaccination: '' });
  };

  return (
    <AppLayout>
      <PageHeader 
        title="Vaccination Schedule" 
        description="Track administered vaccines and upcoming boosters."
        action={<Button onClick={() => setIsModalOpen(true)} variant="secondary"><Plus size={20}/> Log Vaccination</Button>}
      />

      {isLoading ? (
        <div className="p-8 text-center text-muted-foreground">Loading records...</div>
      ) : (
        <DataTable headers={["Vaccine", "Administered Date", "Birds Vaccinated", "Next Due Date"]}>
          {records?.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(record => {
            const isDueSoon = new Date(record.nextVaccination).getTime() - new Date().getTime() < (7 * 24 * 60 * 60 * 1000);
            return (
              <tr key={record.id} className="hover:bg-black/5 transition-colors">
                <td className="px-6 py-4 font-bold text-primary">{record.vaccineName}</td>
                <td className="px-6 py-4 text-muted-foreground">{formatDate(record.date)}</td>
                <td className="px-6 py-4 font-display font-semibold">{record.chickensVaccinated.toLocaleString()}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-bold text-sm ${isDueSoon ? 'bg-warning/20 text-warning-foreground' : 'bg-success/10 text-success'}`}>
                    <Clock size={14} />
                    {formatDate(record.nextVaccination)}
                  </span>
                </td>
              </tr>
            );
          })}
          {(!records || records.length === 0) && (
            <tr><td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">No vaccinations recorded.</td></tr>
          )}
        </DataTable>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Log Vaccination">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input 
            label="Vaccine Name" required placeholder="e.g. Newcastle Disease Vaccine"
            value={formData.vaccineName} onChange={e => setFormData({...formData, vaccineName: e.target.value})}
          />
          <Input 
            label="Date Administered" type="date" required
            value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})}
          />
          <Input 
            label="Number of Birds Vaccinated" type="number" min="1" required
            value={formData.chickensVaccinated} onChange={e => setFormData({...formData, chickensVaccinated: e.target.value})}
          />
          <Input 
            label="Next Dose / Booster Date" type="date" required
            value={formData.nextVaccination} onChange={e => setFormData({...formData, nextVaccination: e.target.value})}
          />
          <Button type="submit" className="w-full mt-4" disabled={isPending}>
            {isPending ? "Saving..." : "Save Record"}
          </Button>
        </form>
      </Modal>
    </AppLayout>
  );
}
