import React, { useState, useMemo } from 'react';
import { Transaction, TransactionType, Period } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { ICONS, getCurrencySymbol } from '../constants';

interface Props {
  transactions: Transaction[];
  currency: string;
}

const COLORS = ['#0ea5e9', '#22c55e', '#eab308', '#f97316', '#ef4444', '#8b5cf6', '#ec4899', '#64748b'];

const Reports: React.FC<Props> = ({ transactions, currency }) => {
  const [period, setPeriod] = useState<Period>('MONTHLY');
  const currencySymbol = getCurrencySymbol(currency);

  // Filter Transactions based on Period and calculate date range label
  const { filteredTransactions, dateRangeLabel } = useMemo(() => {
    const now = new Date();
    const startOfPeriod = new Date();

    if (period === 'WEEKLY') {
      startOfPeriod.setDate(now.getDate() - 7);
    } else if (period === 'MONTHLY') {
      startOfPeriod.setMonth(now.getMonth() - 1);
    } else {
      startOfPeriod.setFullYear(now.getFullYear() - 1);
    }

    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: period === 'YEARLY' ? 'numeric' : undefined };
    const label = `${startOfPeriod.toLocaleDateString(undefined, options)} - ${now.toLocaleDateString(undefined, options)}`;

    return {
        filteredTransactions: transactions.filter(t => t.date >= startOfPeriod.getTime()),
        dateRangeLabel: label
    };
  }, [transactions, period]);

  // Aggregate Data for Pie Chart (Expenses by Category)
  const categoryData = useMemo(() => {
    const expenses = filteredTransactions.filter(t => t.type === TransactionType.EXPENSE);
    const map = new Map<string, number>();

    expenses.forEach(t => {
      map.set(t.category, (map.get(t.category) || 0) + t.amount);
    });

    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredTransactions]);

  // Aggregate Data for Bar Chart (Income vs Expense over time segments)
  const timeSeriesData = useMemo(() => {
    // Group by day for weekly/monthly, by month for yearly
    const dataMap = new Map<string, { income: number, expense: number }>();
    
    filteredTransactions.forEach(t => {
      const date = new Date(t.date);
      let key = '';
      if (period === 'YEARLY') {
        key = date.toLocaleString('default', { month: 'short' });
      } else {
        key = `${date.getMonth() + 1}/${date.getDate()}`;
      }

      if (!dataMap.has(key)) dataMap.set(key, { income: 0, expense: 0 });
      const entry = dataMap.get(key)!;
      
      if (t.type === TransactionType.INCOME) entry.income += t.amount;
      else entry.expense += t.amount;
    });

    return Array.from(dataMap.entries()).map(([name, { income, expense }]) => ({
      name, income, expense
    })).reverse(); 
  }, [filteredTransactions, period]);

  const totalIncome = filteredTransactions.filter(t => t.type === TransactionType.INCOME).reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = filteredTransactions.filter(t => t.type === TransactionType.EXPENSE).reduce((sum, t) => sum + t.amount, 0);
  const savings = totalIncome - totalExpense;

  const exportCSV = () => {
    const headers = ['Date', 'Type', 'Category', 'Amount', 'Description'];
    const rows = filteredTransactions.map(t => [
      new Date(t.date).toISOString().split('T')[0],
      t.type,
      t.category,
      t.amount.toString(),
      `"${t.description.replace(/"/g, '""')}"` // Escape quotes
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `wealthwise_report_${period.toLowerCase()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="pb-24 pt-6 px-4 animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Financial Reports</h2>
        <button 
          onClick={exportCSV}
          className="bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-brand-600 dark:text-brand-400 p-2 rounded-xl transition border border-zinc-200 dark:border-zinc-800 shadow-sm"
          title="Export CSV"
        >
          <ICONS.Download className="w-5 h-5" />
        </button>
      </div>
      
      {/* Period Selector */}
      <div className="mb-8">
        <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl border border-transparent dark:border-zinc-800">
          {(['WEEKLY', 'MONTHLY', 'YEARLY'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${period === p ? 'bg-white dark:bg-zinc-600 text-brand-600 dark:text-white shadow-sm' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'}`}
            >
              {p}
            </button>
          ))}
        </div>
        <p className="text-center text-xs text-zinc-400 dark:text-zinc-500 mt-2 font-medium">
          {dateRangeLabel}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800">
          <p className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500 mb-1 tracking-wider">Income</p>
          <p className="text-sm font-black text-income truncate">{currencySymbol}{totalIncome.toFixed(0)}</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800">
          <p className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500 mb-1 tracking-wider">Expense</p>
          <p className="text-sm font-black text-expense truncate">{currencySymbol}{totalExpense.toFixed(0)}</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800">
          <p className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500 mb-1 tracking-wider">Savings</p>
          <p className={`text-sm font-black truncate ${savings >= 0 ? 'text-brand-600 dark:text-brand-400' : 'text-expense'}`}>{currencySymbol}{savings.toFixed(0)}</p>
        </div>
      </div>

      {/* Graphical Analysis: Bar (Cash Flow) */}
      <div className="bg-white dark:bg-zinc-900 rounded-[2rem] shadow-sm border border-zinc-100 dark:border-zinc-800 p-5 mb-8">
        <h3 className="font-bold text-zinc-900 dark:text-white mb-6">Cash Flow</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={timeSeriesData}>
              <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} tick={{ fill: '#71717a' }} />
              <YAxis fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => `${currencySymbol}${value}`} tick={{ fill: '#71717a' }} />
              <Tooltip 
                cursor={{fill: '#27272a', opacity: 0.1}} 
                contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px', color: '#f4f4f5', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                itemStyle={{ color: '#f4f4f5' }}
                formatter={(value: number) => `${currencySymbol}${value}`}
              />
              <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Graphical Analysis: Pie (Expense Distribution) */}
      <div className="bg-white dark:bg-zinc-900 rounded-[2rem] shadow-sm border border-zinc-100 dark:border-zinc-800 p-5 mb-8">
        <h3 className="font-bold text-zinc-900 dark:text-white mb-6">Expense Distribution</h3>
        <div className="h-64 w-full">
           <ResponsiveContainer width="100%" height="100%">
             <PieChart>
               <Pie
                 data={categoryData}
                 cx="50%"
                 cy="50%"
                 innerRadius={60}
                 outerRadius={80}
                 paddingAngle={5}
                 dataKey="value"
                 stroke="none"
               >
                 {categoryData.map((entry, index) => (
                   <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                 ))}
               </Pie>
               <Tooltip 
                 contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px', color: '#f4f4f5', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                 itemStyle={{ color: '#f4f4f5' }}
                 formatter={(value: number) => `${currencySymbol}${value}`}
               />
               <Legend verticalAlign="bottom" height={36} iconType="circle" />
             </PieChart>
           </ResponsiveContainer>
        </div>
      </div>

      {/* Tabular Analysis: Breakdown */}
      <div className="bg-white dark:bg-zinc-900 rounded-[2rem] shadow-sm border border-zinc-100 dark:border-zinc-800 overflow-hidden mb-8">
        <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900">
           <h3 className="font-bold text-zinc-900 dark:text-white">Category Breakdown</h3>
        </div>
        <table className="w-full text-sm text-left">
          <thead className="text-[10px] text-zinc-400 dark:text-zinc-500 bg-zinc-50 dark:bg-zinc-800/50 uppercase tracking-wider font-bold">
            <tr>
              <th className="px-5 py-3">Category</th>
              <th className="px-5 py-3 text-right">Amount</th>
              <th className="px-5 py-3 text-right">%</th>
            </tr>
          </thead>
          <tbody>
            {categoryData.length > 0 ? categoryData.map((item, idx) => (
              <tr key={idx} className="border-b border-zinc-50 dark:border-zinc-800 last:border-none hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                <td className="px-5 py-4 font-bold text-zinc-700 dark:text-zinc-200 flex items-center gap-2.5">
                   <span className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                   {item.name}
                </td>
                <td className="px-5 py-4 text-right font-black text-zinc-900 dark:text-white">{currencySymbol}{item.value.toFixed(2)}</td>
                <td className="px-5 py-4 text-right text-xs font-bold text-zinc-400 dark:text-zinc-500">
                    {totalExpense > 0 ? ((item.value / totalExpense) * 100).toFixed(1) : '0.0'}%
                </td>
              </tr>
            )) : (
              <tr><td colSpan={3} className="px-5 py-8 text-center text-zinc-400 dark:text-zinc-600 font-medium">No expenses in this period</td></tr>
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
};

export default Reports;