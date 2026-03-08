import React, { useMemo } from 'react';
import { Transaction, TransactionType } from '../types';
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { getCurrencySymbol } from '../constants';

interface Props {
  transactions: Transaction[];
  currency: string;
}

const HomeChart: React.FC<Props> = ({ transactions, currency }) => {
  const currencySymbol = getCurrencySymbol(currency);

  const data = useMemo(() => {
    const today = new Date();
    // Generate last 30 days
    const last30Days = new Array(30).fill(0).map((_, i) => {
      const d = new Date();
      d.setDate(today.getDate() - (29 - i));
      return d;
    });

    // Group transactions by date string (YYYY-MM-DD)
    const grouped = transactions.reduce((acc, t) => {
      const dateStr = new Date(t.date).toISOString().split('T')[0];
      if (!acc[dateStr]) acc[dateStr] = { income: 0, expense: 0 };
      if (t.type === TransactionType.INCOME) acc[dateStr].income += t.amount;
      else acc[dateStr].expense += t.amount;
      return acc;
    }, {} as Record<string, { income: number, expense: number }>);

    // Map to chart data format
    return last30Days.map(dObj => {
        const dateKey = dObj.toISOString().split('T')[0];
        const displayDate = dObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        return {
            name: displayDate,
            income: grouped[dateKey]?.income || 0,
            expense: grouped[dateKey]?.expense || 0
        };
    });
  }, [transactions]);

  // Hide chart if no activity in last 30 days to keep home clean
  const hasData = data.some(d => d.income > 0 || d.expense > 0);

  if (!hasData) return null;

  return (
    <div className="w-full h-40 mt-2 mb-4 bg-white dark:bg-zinc-900 rounded-[2rem] p-4 shadow-sm border border-zinc-100 dark:border-zinc-800">
      <div className="flex justify-between items-center mb-2 px-2">
          <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">30 Day Trend</h3>
          <div className="flex gap-3">
              <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400">Income</span>
              </div>
              <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400">Expense</span>
              </div>
          </div>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} strokeWidth={0.5} stroke="#52525b33" />
          <XAxis 
            dataKey="name" 
            hide={true} 
            axisLine={false}
            tickLine={false}
          />
          <Tooltip 
            cursor={{ stroke: '#52525b', strokeWidth: 1, strokeDasharray: '3 3' }}
            contentStyle={{ 
                backgroundColor: '#18181b', 
                borderColor: '#27272a', 
                borderRadius: '12px', 
                color: '#f4f4f5', 
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
                fontSize: '12px',
                fontWeight: 'bold',
                padding: '8px 12px'
            }}
            formatter={(value: number) => [`${currencySymbol}${value}`, '']}
            labelStyle={{ color: '#a1a1aa', marginBottom: '4px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}
          />
          <Line 
            type="monotone" 
            dataKey="income" 
            stroke="#10b981" 
            strokeWidth={3} 
            dot={false} 
            activeDot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} 
            animationDuration={1000}
          />
          <Line 
            type="monotone" 
            dataKey="expense" 
            stroke="#ef4444" 
            strokeWidth={3} 
            dot={false} 
            activeDot={{ r: 4, fill: '#ef4444', strokeWidth: 2, stroke: '#fff' }} 
            animationDuration={1000}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default HomeChart;