import { useState } from "react";
import { AppLayout, PageHeader } from "@/components/layout/AppLayout";
import { Button, Modal, Input, DataTable, Select } from "@/components/ui-kit";
import { useExpenses, useCreateExpense } from "@/hooks/use-poultry";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Plus } from "lucide-react";

export default function Expenses() {
  const { data: records, isLoading } = useExpenses();
  const { mutateAsync: createRecord, isPending } = useCreateExpense();
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [formData, setFormData] = useState({ 
    date: new Date().toISOString().split('T')[0], expenseType: 'Feed', amount: '', description: '' 
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createRecord({
      date: formData.date,
      expenseType: formData.expenseType,
      amount: Number(formData.amount),
      description: formData.description
    });
    setIsModalOpen(false);
    setFormData({ date: new Date().toISOString().split('T')[0], expenseType: 'Feed', amount: '', description: '' });
  };

  return (
    <AppLayout>
      <PageHeader 
        title="Expenses" 
        description="Track operational costs and farm expenditure."
        action={<Button onClick={() => setIsModalOpen(true)}><Plus size={20}/> Log Expense</Button>}
      />

      {isLoading ? (
        <div className="p-8 text-center text-muted-foreground">Loading records...</div>
      ) : (
        <DataTable headers={["Date", "Category", "Amount", "Description"]}>
          {records?.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(record => (
            <tr key={record.id} className="hover:bg-black/5 transition-colors">
              <td className="px-6 py-4 font-medium">{formatDate(record.date)}</td>
              <td className="px-6 py-4">
                <span className="px-3 py-1 bg-secondary text-secondary-foreground rounded-md font-semibold text-sm">
                  {record.expenseType}
                </span>
              </td>
              <td className="px-6 py-4 font-display font-bold text-destructive text-lg">-{formatCurrency(record.amount as string)}</td>
              <td className="px-6 py-4 text-muted-foreground">{record.description || '-'}</td>
            </tr>
          ))}
          {(!records || records.length === 0) && (
            <tr><td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">No expenses recorded yet.</td></tr>
          )}
        </DataTable>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Log Farm Expense">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input 
            label="Date" type="date" required
            value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})}
          />
          <Select 
            label="Expense Category" 
            value={formData.expenseType} 
            onChange={e => setFormData({...formData, expenseType: e.target.value})}
          >
            <option value="Feed">Feed & Supplements</option>
            <option value="Labor">Labor & Wages</option>
            <option value="Maintenance">Maintenance & Repairs</option>
            <option value="Utilities">Utilities (Water, Electricity)</option>
            <option value="Transportation">Transportation</option>
            <option value="Other">Other</option>
          </Select>
          <Input 
            label="Amount (₹)" type="number" step="0.01" min="0" required
            value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})}
          />
          <Input 
            label="Description (Optional)" placeholder="What was this for?"
            value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}
          />
          <Button type="submit" className="w-full mt-4" disabled={isPending}>
            {isPending ? "Saving..." : "Record Expense"}
          </Button>
        </form>
      </Modal>
    </AppLayout>
  );
}
