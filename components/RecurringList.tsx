import React, { useEffect, useState } from 'react';
import { RecurringTransaction, TransactionType, RecurrenceFrequency } from '../types';
import { dbService } from '../services/db';
import { ICONS, getCurrencySymbol } from '../constants';
import TransactionForm from './TransactionForm';
import ConfirmDialog from './ConfirmDialog';

interface Props {
  userId: string;
  onClose: () => void;
  currency: string;
}

const RecurringList: React.FC<Props> = ({ userId, onClose, currency }) => {
  const [recurring, setRecurring] = useState<RecurringTransaction[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<{isOpen: boolean, id: string | null}>({ isOpen: false, id: null });
  
  const currencySymbol = getCurrencySymbol(currency);

  useEffect(() => {
    loadRecurring();
  }, [userId]);

  const loadRecurring = async () => {
    const data = await dbService.getRecurringTransactions(userId);
    setRecurring(data);
  };

  const handleDeleteClick = (id: string) => {
    setConfirmState({ isOpen: true, id });
  };

  const handleConfirmDelete = async () => {
    if (confirmState.id) {
        await dbService.deleteRecurringTransaction(confirmState.id);
        setRecurring(recurring.filter(r => r.id !== confirmState.id));
    }
    setConfirmState({ isOpen: false, id: null });
  };

  const handleUpdate = async (amount: number, date: number, type: TransactionType, category: string, description: string, frequency: RecurrenceFrequency) => {
    if (!editingId) return;
    const transaction = recurring.find(r => r.id === editingId);
    if (!transaction) return;
  
    const updated: RecurringTransaction = {
      ...transaction,
      amount,
      type,
      category,
      description,
      frequency,
      nextDueDate: date // Map the form's "date" to nextDueDate
    };
    
    await dbService.updateRecurringTransaction(updated);
    setEditingId(null);
    loadRecurring();
  };

  const editingTransaction = recurring.find(r => r.id === editingId);

  // Map RecurringTransaction to TransactionFormData (specifically map nextDueDate to date)
  const initialDataForForm = editingTransaction ? {
    ...editingTransaction,
    date: editingTransaction.nextDueDate
  } : undefined;

  if (editingId && initialDataForForm) {
    return (
      <TransactionForm
        onSave={handleUpdate}
        onCancel={() => setEditingId(null)}
        currency={currency}
        initialData={initialDataForForm}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <ConfirmDialog 
        isOpen={confirmState.isOpen}
        title="Stop Recurring Transaction?"
        message="Future transactions will not be generated. Past transactions will remain in your history."
        confirmText="Stop & Delete"
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmState({ isOpen: false, id: null })}
        variant="danger"
      />

      <div className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border border-transparent dark:border-zinc-800 animate-slide-up">
        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-white dark:bg-zinc-900">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
             <ICONS.Repeat className="w-6 h-6 text-brand-600 dark:text-brand-500" /> Scheduled Transactions
          </h2>
          <button onClick={onClose} className="p-2 text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-white rounded-full transition-colors">✕</button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-zinc-50/50 dark:bg-zinc-900 no-scrollbar">
          {recurring.length === 0 ? (
            <div className="text-center py-12 text-zinc-400 dark:text-zinc-500 flex flex-col items-center">
                <ICONS.Repeat className="w-12 h-12 mb-3 opacity-20" />
                <p>No recurring transactions set up.</p>
            </div>
          ) : (
            recurring.map(r => (
              <div key={r.id} className="bg-white dark:bg-zinc-800/50 rounded-2xl p-4 flex justify-between items-center border border-zinc-100 dark:border-zinc-800/50 shadow-sm">
                <div className="flex items-center gap-4">
                   <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-sm shadow-sm ${r.frequency === 'MONTHLY' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'}`}>
                      {r.frequency.substring(0, 1)}
                   </div>
                   <div>
                      <p className="font-bold text-base text-zinc-900 dark:text-white">{r.category}</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">{r.description || 'No description'}</p>
                      <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 mt-1 uppercase tracking-wide">Next: {new Date(r.nextDueDate).toLocaleDateString()}</p>
                   </div>
                </div>
                <div className="text-right flex flex-col items-end gap-2">
                    <p className={`font-black text-lg ${r.type === 'INCOME' ? 'text-income' : 'text-expense'}`}>
                        {currencySymbol}{r.amount.toFixed(2)}
                    </p>
                    <div className="flex gap-2">
                        <button onClick={() => setEditingId(r.id)} className="p-2 bg-zinc-100 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-300 rounded-xl hover:bg-brand-50 dark:hover:bg-brand-900/30 hover:text-brand-600 dark:hover:text-brand-400 transition-colors" title="Edit">
                           <ICONS.Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteClick(r.id)} className="p-2 bg-red-50 dark:bg-red-900/20 text-red-400 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/40 hover:text-red-600 dark:hover:text-red-300 transition-colors" title="Stop">
                           <ICONS.Trash className="w-4 h-4" />
                        </button>
                    </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default RecurringList;