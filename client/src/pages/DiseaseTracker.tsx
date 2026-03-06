import { useState } from "react";
import { AppLayout, PageHeader } from "@/components/layout/AppLayout";
import { Button, Modal, Input, DataTable } from "@/components/ui-kit";
import { useDiseases, useCreateDisease } from "@/hooks/use-poultry";
import { formatDate } from "@/lib/utils";
import { Plus } from "lucide-react";

export default function DiseaseTracker() {
  const { data: records, isLoading } = useDiseases();
  const { mutateAsync: createRecord, isPending } = useCreateDisease();
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [formData, setFormData] = useState({ 
    date: new Date().toISOString().split('T')[0], diseaseName: '', chickensAffected: '', treatment: '' 
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createRecord({
      date: formData.date,
      diseaseName: formData.diseaseName,
      chickensAffected: Number(formData.chickensAffected),
      treatment: formData.treatment
    });
    setIsModalOpen(false);
    setFormData({ date: new Date().toISOString().split('T')[0], diseaseName: '', chickensAffected: '', treatment: '' });
  };

  return (
    <AppLayout>
      <PageHeader 
        title="Disease Tracker" 
        description="Log health issues and track treatment progress."
        action={<Button onClick={() => setIsModalOpen(true)} variant="outline"><Plus size={20}/> Log Outbreak</Button>}
      />

      {isLoading ? (
        <div className="p-8 text-center text-muted-foreground">Loading records...</div>
      ) : (
        <DataTable headers={["Date", "Disease/Condition", "Affected Birds", "Treatment Plan"]}>
          {records?.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(record => (
            <tr key={record.id} className="hover:bg-black/5 transition-colors">
              <td className="px-6 py-4 font-medium">{formatDate(record.date)}</td>
              <td className="px-6 py-4">
                <span className="px-3 py-1 bg-destructive/10 text-destructive rounded-full font-bold text-sm">
                  {record.diseaseName}
                </span>
              </td>
              <td className="px-6 py-4 font-display font-bold text-lg">{record.chickensAffected.toLocaleString()}</td>
              <td className="px-6 py-4 text-foreground/80">{record.treatment}</td>
            </tr>
          ))}
          {(!records || records.length === 0) && (
            <tr><td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">No diseases logged. Healthy flock!</td></tr>
          )}
        </DataTable>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Log Health Issue">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input 
            label="Detection Date" type="date" required
            value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})}
          />
          <Input 
            label="Disease / Condition Name" required placeholder="e.g. Coccidiosis"
            value={formData.diseaseName} onChange={e => setFormData({...formData, diseaseName: e.target.value})}
          />
          <Input 
            label="Number of Affected Birds" type="number" min="1" required
            value={formData.chickensAffected} onChange={e => setFormData({...formData, chickensAffected: e.target.value})}
          />
          <div className="w-full flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-foreground/80 ml-1">Treatment Applied</label>
            <textarea
              required
              className="w-full px-4 py-3 rounded-xl bg-white/50 border-2 border-border/50 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all resize-none h-24"
              placeholder="Describe medications or actions taken..."
              value={formData.treatment}
              onChange={e => setFormData({...formData, treatment: e.target.value})}
            />
          </div>
          <Button type="submit" className="w-full mt-2" disabled={isPending}>
            {isPending ? "Saving..." : "Save Record"}
          </Button>
        </form>
      </Modal>
    </AppLayout>
  );
}
