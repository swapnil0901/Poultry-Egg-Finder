import { useState } from "react";
import { AppLayout, PageHeader } from "@/components/layout/AppLayout";
import { Button, Modal, Input, DataTable } from "@/components/ui-kit";
import { useEggs, useCreateEgg } from "@/hooks/use-poultry";
import { formatDate } from "@/lib/utils";
import { Plus } from "lucide-react";

export default function EggCollection() {
  const { data: eggs, isLoading } = useEggs();
  const { mutateAsync: createEgg, isPending } = useCreateEgg();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    eggsCollected: '',
    brokenEggs: '',
    shed: '',
    notes: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createEgg({
      date: formData.date,
      eggsCollected: Number(formData.eggsCollected),
      brokenEggs: Number(formData.brokenEggs || 0),
      shed: formData.shed,
      notes: formData.notes
    });
    setIsModalOpen(false);
    setFormData({ date: new Date().toISOString().split('T')[0], eggsCollected: '', brokenEggs: '', shed: '', notes: '' });
  };

  return (
    <AppLayout>
      <PageHeader 
        title="Egg Collection" 
        description="Track daily egg production across all sheds."
        action={<Button onClick={() => setIsModalOpen(true)}><Plus size={20}/> Record Collection</Button>}
      />

      {isLoading ? (
        <div className="p-8 text-center text-muted-foreground">Loading records...</div>
      ) : (
        <DataTable headers={["Date", "Shed", "Eggs Collected", "Broken Eggs", "Notes"]}>
          {eggs?.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(record => (
            <tr key={record.id} className="hover:bg-black/5 transition-colors">
              <td className="px-6 py-4 font-medium">{formatDate(record.date)}</td>
              <td className="px-6 py-4">
                <span className="px-3 py-1 bg-primary/10 text-primary rounded-full font-bold text-sm">
                  {record.shed}
                </span>
              </td>
              <td className="px-6 py-4 font-display font-bold text-lg">{record.eggsCollected.toLocaleString()}</td>
              <td className="px-6 py-4 font-bold text-warning">{(record.brokenEggs ?? 0).toLocaleString()}</td>
              <td className="px-6 py-4 text-muted-foreground">{record.notes || '-'}</td>
            </tr>
          ))}
          {(!eggs || eggs.length === 0) && (
            <tr><td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">No records found.</td></tr>
          )}
        </DataTable>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Record Egg Collection">
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input 
            label="Date" type="date" required
            value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})}
          />
          <Input 
            label="Eggs Collected" type="number" min="0" required placeholder="e.g. 5000"
            value={formData.eggsCollected} onChange={e => setFormData({...formData, eggsCollected: e.target.value})}
          />
          <Input
            label="Broken Eggs" type="number" min="0" placeholder="e.g. 12"
            value={formData.brokenEggs} onChange={e => setFormData({...formData, brokenEggs: e.target.value})}
          />
          <Input 
            label="Shed Name/Number" required placeholder="e.g. Shed A"
            value={formData.shed} onChange={e => setFormData({...formData, shed: e.target.value})}
          />
          <Input 
            label="Notes (Optional)" placeholder="Any observations..."
            value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})}
          />
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Saving..." : "Save Record"}
          </Button>
        </form>
      </Modal>
    </AppLayout>
  );
}
