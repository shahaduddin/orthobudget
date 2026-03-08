import React, { useState } from 'react';
import { TransactionType, RecurrenceFrequency } from '../types';
import { CATEGORIES, getCurrencySymbol } from '../constants';

interface TransactionFormData {
  date?: number;
  amount: number;
  type: TransactionType;
  category: string;
  description: string;
  frequency: RecurrenceFrequency;
}

interface Props {
  onSave: (amount: number, date: number, type: TransactionType, category: string, description: string, frequency: RecurrenceFrequency) => void;
  onCancel: () => void;
  currency: string;
  initialData?: TransactionFormData;
}

const TransactionForm: React.FC<Props> = ({ onSave, onCancel, currency, initialData }) => {
  const [amount, setAmount] = useState(initialData ? initialData.amount.toString() : '');
  const [date, setDate] = useState(initialData?.date ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
  const [type, setType] = useState<TransactionType>(initialData?.type || TransactionType.EXPENSE);
  const [category, setCategory] = useState(initialData?.category || CATEGORIES.EXPENSE[0]);
  const [description, setDescription] = useState(initialData?.description || '');
  const [frequency, setFrequency] = useState<RecurrenceFrequency>(initialData?.frequency || RecurrenceFrequency.NEVER);

  const currencySymbol = getCurrencySymbol(currency);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;
    const dateNum = new Date(date).getTime();
    onSave(parseFloat(amount), dateNum, type, category, description, frequency);
  };

  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    if (!initialData || initialData.type !== newType) {
        setCategory(newType === TransactionType.EXPENSE ? CATEGORIES.EXPENSE[0] : CATEGORIES.INCOME[0]);
    } else if (initialData && initialData.type === newType) {
        setCategory(initialData.category);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center animate-fade-in">
      {/* Click outside to close */}
      <div className="absolute inset-0" onClick={onCancel}></div>
      
      <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 shadow-2xl transform transition-all animate-slide-up border-t border-zinc-100 dark:border-zinc-800 relative z-10 max-h-[90vh] overflow-y-auto no-scrollbar pb-safe">
        
        {/* Drag Handle */}
        <div className="w-12 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full mx-auto mb-6"></div>

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
            {initialData ? 'Edit Transaction' : 'New Transaction'}
          </h2>
          {initialData && (
             <button type="button" onClick={onCancel} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-white p-2">Cancel</button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Segmented Control for Type */}
          <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1.5 rounded-2xl relative">
            <button
              type="button"
              onClick={() => handleTypeChange(TransactionType.EXPENSE)}
              className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all duration-200 z-10 ${type === TransactionType.EXPENSE ? 'bg-white dark:bg-zinc-700 text-red-500 shadow-md' : 'text-zinc-500 dark:text-zinc-400'}`}
            >
              Expense
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange(TransactionType.INCOME)}
              className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all duration-200 z-10 ${type === TransactionType.INCOME ? 'bg-white dark:bg-zinc-700 text-emerald-500 shadow-md' : 'text-zinc-500 dark:text-zinc-400'}`}
            >
              Income
            </button>
          </div>

          {/* Amount Input - Hero Style */}
          <div className="text-center py-2">
             <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Amount</label>
             <div className="flex items-center justify-center gap-1">
                <span className="text-3xl font-bold text-zinc-400 mt-1">{currencySymbol}</span>
                <input
                  type="number"
                  inputMode="decimal"
                  autoFocus={!initialData}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-48 bg-transparent text-5xl font-black text-center text-zinc-900 dark:text-white placeholder-zinc-300 dark:placeholder-zinc-700 outline-none p-0"
                  placeholder="0"
                  required
                />
             </div>
          </div>
          
          <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1 space-y-2">
                    <label className="text-xs font-bold text-zinc-500 ml-1">Date</label>
                    <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-4 py-3.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl focus:ring-2 focus:ring-brand-500 outline-none text-zinc-900 dark:text-white transition-colors appearance-none font-medium"
                    required
                    />
                </div>
                <div className="flex-1 space-y-2">
                    <label className="text-xs font-bold text-zinc-500 ml-1">Repeat</label>
                    <select
                        value={frequency}
                        onChange={(e) => setFrequency(e.target.value as RecurrenceFrequency)}
                        className="w-full px-4 py-3.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl focus:ring-2 focus:ring-brand-500 outline-none appearance-none text-zinc-900 dark:text-white transition-colors font-medium"
                    >
                        {Object.values(RecurrenceFrequency).map(f => (
                            <option key={f} value={f}>{f.charAt(0) + f.slice(1).toLowerCase()}</option>
                        ))}
                    </select>
                </div>
              </div>

              <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 ml-1">Category</label>
                  <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-4 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl focus:ring-2 focus:ring-brand-500 outline-none appearance-none text-zinc-900 dark:text-white transition-colors text-base font-medium"
                  >
                  {(type === TransactionType.EXPENSE ? CATEGORIES.EXPENSE : CATEGORIES.INCOME).map(c => (
                      <option key={c} value={c}>{c}</option>
                  ))}
                  </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 ml-1">Description</label>
                <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-4 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl focus:ring-2 focus:ring-brand-500 outline-none text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 transition-colors font-medium"
                placeholder="What was this for?"
                />
              </div>
          </div>

          <div className="pt-4">
              <button
                type="submit"
                className={`w-full py-4 rounded-2xl text-white font-bold text-lg shadow-lg transform transition active:scale-[0.98] ${type === TransactionType.EXPENSE ? 'bg-red-500 shadow-red-500/30' : 'bg-emerald-500 shadow-emerald-500/30'}`}
              >
                {initialData ? 'Update' : 'Save'}
              </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TransactionForm;