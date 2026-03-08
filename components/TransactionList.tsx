import React, { useMemo } from 'react';
import { Transaction, TransactionType } from '../types';
import { getCurrencySymbol, ICONS } from '../constants';

interface Props {
  transactions: Transaction[];
  onDelete: (id: string) => void;
  onEdit: (transaction: Transaction) => void;
  currency: string;
}

const TransactionList: React.FC<Props> = ({ transactions, onDelete, onEdit, currency }) => {
  const currencySymbol = getCurrencySymbol(currency);

  const groupedTransactions = useMemo(() => {
    const groups: { [key: string]: Transaction[] } = {};
    const today = new Date().toDateString();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    transactions.forEach(t => {
      const date = new Date(t.date);
      let key = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
      
      if (date.toDateString() === today) key = 'Today';
      else if (date.toDateString() === yesterdayStr) key = 'Yesterday';

      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    });
    return groups;
  }, [transactions]);

  // Sort keys to ensure Today comes first, then Yesterday, then dates descending
  const sortedKeys = Object.keys(groupedTransactions).sort((a, b) => {
     if (a === 'Today') return -1;
     if (b === 'Today') return 1;
     if (a === 'Yesterday') return -1;
     if (b === 'Yesterday') return 1;
     return new Date(b).getTime() - new Date(a).getTime();
  });

  return (
    <div className="pb-8">
      {transactions.length === 0 ? (
            <div className="text-center py-16 text-zinc-400 dark:text-zinc-600 bg-white/50 dark:bg-zinc-900/50 rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800 mx-2">
                <div className="bg-zinc-100 dark:bg-zinc-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ICONS.List className="w-8 h-8 opacity-50" />
                </div>
                <p className="font-medium">No transactions yet</p>
                <p className="text-xs mt-1 opacity-70">Tap the + button to add one</p>
            </div>
      ) : (
          sortedKeys.map(dateKey => (
              <div key={dateKey} className="mb-6">
                  <h3 className="font-bold text-zinc-500 dark:text-zinc-400 mb-3 px-1 text-xs uppercase tracking-wider sticky top-0 bg-zinc-50/95 dark:bg-black/95 backdrop-blur-sm py-2 z-10 w-full">
                      {dateKey}
                  </h3>
                  <div className="space-y-3">
                    {groupedTransactions[dateKey].map(t => (
                      <div 
                        key={t.id} 
                        onClick={() => onEdit(t)}
                        className="group bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-sm border border-zinc-100/50 dark:border-zinc-800 flex justify-between items-center active:scale-[0.98] transition-transform duration-150 cursor-pointer relative overflow-hidden"
                      >
                        <div className="flex items-center gap-4 overflow-hidden flex-1">
                          <div className={`w-12 h-12 shrink-0 rounded-full flex items-center justify-center text-xl shadow-inner ${t.type === TransactionType.INCOME ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400'}`}>
                            {t.type === TransactionType.INCOME ? <ICONS.TrendingUp className="w-5 h-5" /> : <ICONS.TrendingUp className="w-5 h-5 rotate-180" />}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-zinc-900 dark:text-white text-base truncate pr-2">{t.category}</p>
                            {t.description && (
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{t.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="text-right shrink-0">
                                <p className={`font-bold text-base ${t.type === TransactionType.INCOME ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-900 dark:text-white'}`}>
                                {t.type === TransactionType.INCOME ? '+' : ''}{currencySymbol}{Math.abs(t.amount).toFixed(2)}
                                </p>
                            </div>
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete(t.id);
                                }}
                                className="p-2 -mr-2 text-zinc-300 hover:text-red-500 hover:bg-red-50 dark:text-zinc-700 dark:hover:text-red-400 dark:hover:bg-red-900/20 rounded-xl transition-all"
                                aria-label="Delete transaction"
                            >
                                <ICONS.Trash className="w-5 h-5" />
                            </button>
                        </div>
                      </div>
                    ))}
                  </div>
              </div>
          ))
      )}
    </div>
  );
};

export default TransactionList;