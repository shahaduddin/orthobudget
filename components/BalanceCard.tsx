import React from 'react';
import { Transaction, TransactionType } from '../types';
import { getCurrencySymbol, ICONS } from '../constants';

interface Props {
  transactions: Transaction[];
  currency: string;
}

const BalanceCard: React.FC<Props> = ({ transactions, currency }) => {
  const currencySymbol = getCurrencySymbol(currency);
  const totalIncome = transactions.filter(t => t.type === TransactionType.INCOME).reduce((acc, t) => acc + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === TransactionType.EXPENSE).reduce((acc, t) => acc + t.amount, 0);
  const totalBalance = totalIncome - totalExpense;

  return (
    <div className="relative overflow-hidden bg-white dark:bg-zinc-900 rounded-[2.5rem] p-8 shadow-2xl shadow-zinc-200/50 dark:shadow-black/50 border border-zinc-100 dark:border-zinc-800 transition-colors duration-300 group">
      {/* Dynamic Mesh Gradient Background - Adjusted for both themes */}
      <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-brand-400/10 dark:bg-brand-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[200px] h-[200px] bg-indigo-400/10 dark:bg-indigo-500/10 rounded-full blur-[60px] translate-y-1/2 -translate-x-1/3 pointer-events-none"></div>
      
      <div className="relative z-10 flex flex-col items-center text-center">
        <p className="text-zinc-500 dark:text-zinc-400 text-xs font-bold uppercase tracking-widest mb-3">Total Balance</p>
        <h2 className="text-5xl font-black tracking-tight mb-8 text-zinc-900 dark:text-white scale-100 group-hover:scale-105 transition-transform duration-300 cursor-default">
          <span className="text-3xl align-top opacity-40 mr-1 font-bold">{currencySymbol}</span>
          {totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </h2>
        
        <div className="grid grid-cols-2 gap-4 w-full">
            <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl p-4 border border-zinc-100 dark:border-zinc-700/50 flex flex-col items-center transition-colors">
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2 shadow-sm">
                 <ICONS.TrendingUp className="w-5 h-5" />
              </div>
              <p className="text-zinc-400 dark:text-zinc-500 text-[10px] uppercase font-bold mb-1 tracking-wider">Income</p>
              <p className="font-bold text-lg tracking-tight text-zinc-900 dark:text-white">
                <span className="text-xs opacity-50 mr-0.5">{currencySymbol}</span>{totalIncome.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
            </div>
            
            <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl p-4 border border-zinc-100 dark:border-zinc-700/50 flex flex-col items-center transition-colors">
              <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-2 shadow-sm">
                 <ICONS.TrendingUp className="w-5 h-5 rotate-180" />
              </div>
              <p className="text-zinc-400 dark:text-zinc-500 text-[10px] uppercase font-bold mb-1 tracking-wider">Expense</p>
              <p className="font-bold text-lg tracking-tight text-zinc-900 dark:text-white">
                <span className="text-xs opacity-50 mr-0.5">{currencySymbol}</span>{totalExpense.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default BalanceCard;