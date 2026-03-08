import React, { useState, useEffect } from 'react';
import { Investment, InvestmentType, PortfolioSnapshot } from '../types';
import { dbService } from '../services/db';
import { ICONS, getCurrencySymbol } from '../constants';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import ConfirmDialog from './ConfirmDialog';

interface Props {
  userId: string;
  currency: string;
}

const Investments: React.FC<Props> = ({ userId, currency }) => {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [snapshots, setSnapshots] = useState<PortfolioSnapshot[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Confirmation state
  const [confirmData, setConfirmData] = useState<{isOpen: boolean, id: string}>({isOpen: false, id: ''});

  // Form State
  const [name, setName] = useState('');
  const [type, setType] = useState<InvestmentType>(InvestmentType.STOCK);
  const [initialValue, setInitialValue] = useState('');
  const [currentValue, setCurrentValue] = useState('');

  const currencySymbol = getCurrencySymbol(currency);

  useEffect(() => {
    loadInvestments();
    loadSnapshots();
  }, [userId]);

  const loadInvestments = async () => {
    const data = await dbService.getInvestments(userId);
    setInvestments(data);
  };

  const loadSnapshots = async () => {
    const data = await dbService.getPortfolioSnapshots(userId);
    setSnapshots(data.sort((a, b) => a.date - b.date));
  };

  const saveSnapshot = async (currentInvestments: Investment[]) => {
      const total = currentInvestments.reduce((sum, i) => sum + i.currentValue, 0);
      const snapshot: PortfolioSnapshot = {
          id: crypto.randomUUID(),
          userId,
          date: Date.now(),
          totalValue: total
      };
      await dbService.addPortfolioSnapshot(snapshot);
      loadSnapshots();
  };

  const handleOpenModal = (investment?: Investment) => {
    if (investment) {
      setEditingId(investment.id);
      setName(investment.name);
      setType(investment.type);
      setInitialValue(investment.initialValue.toString());
      setCurrentValue(investment.currentValue.toString());
    } else {
      setEditingId(null);
      setName('');
      setType(InvestmentType.STOCK);
      setInitialValue('');
      setCurrentValue('');
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !initialValue || !currentValue) return;

    const investmentData: Investment = {
      id: editingId || crypto.randomUUID(),
      userId,
      name,
      type,
      initialValue: parseFloat(initialValue),
      currentValue: parseFloat(currentValue),
      lastUpdated: Date.now()
    };

    await dbService.addInvestment(investmentData);
    
    // Refresh list and save snapshot
    const updatedList = editingId 
        ? investments.map(i => i.id === editingId ? investmentData : i)
        : [...investments, investmentData];
        
    setInvestments(updatedList);
    await saveSnapshot(updatedList);
    
    setShowModal(false);
  };

  const handleDelete = async (id: string) => {
    await dbService.deleteInvestment(id);
    const updatedList = investments.filter(i => i.id !== id);
    setInvestments(updatedList);
    await saveSnapshot(updatedList);
    setConfirmData({isOpen: false, id: ''});
  };

  const totalValue = investments.reduce((sum, i) => sum + i.currentValue, 0);
  const totalInitial = investments.reduce((sum, i) => sum + i.initialValue, 0);
  const totalProfit = totalValue - totalInitial;

  // Chart Data preparation
  const chartData = snapshots.map(s => ({
      date: new Date(s.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      value: s.totalValue,
      originalTimestamp: s.date
  }));

  // If we have no snapshots but have investments, create a dummy current point for the chart
  if (chartData.length === 0 && investments.length > 0) {
      chartData.push({
          date: 'Now',
          value: totalValue,
          originalTimestamp: Date.now()
      });
  }

  return (
    <div className="pb-24 pt-6 px-4 animate-fade-in">
      <ConfirmDialog 
        isOpen={confirmData.isOpen}
        title="Remove Asset"
        message="Are you sure you want to remove this investment from your portfolio? This action cannot be undone."
        onConfirm={() => handleDelete(confirmData.id)}
        onCancel={() => setConfirmData({isOpen: false, id: ''})}
      />

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Assets</h2>
        <button onClick={() => handleOpenModal()} className="bg-brand-600 text-white p-2 rounded-xl shadow-lg hover:bg-brand-700 transition active:scale-95">
          <ICONS.Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Portfolio Summary */}
      <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-6 shadow-2xl shadow-zinc-200/50 dark:shadow-black/50 border border-zinc-100 dark:border-zinc-800 mb-8 relative overflow-hidden">
        <div className="relative z-10">
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400 mb-1">Total Portfolio Value</p>
            <h3 className="text-4xl font-black text-zinc-900 dark:text-white mb-2 tracking-tight">{currencySymbol}{totalValue.toFixed(2)}</h3>
            <div className={`text-sm font-bold flex items-center gap-1 mb-8 ${totalProfit >= 0 ? 'text-income' : 'text-expense'}`}>
            <ICONS.TrendingUp className={`w-4 h-4 ${totalProfit < 0 ? 'rotate-180' : ''}`} />
            <span>{totalProfit >= 0 ? '+' : ''}{currencySymbol}{totalProfit.toFixed(2)} ({totalInitial > 0 ? ((totalProfit / totalInitial) * 100).toFixed(1) : '0.0'}%)</span>
            </div>

            {/* Portfolio History Chart */}
            <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                        <defs>
                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#0d9488" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#0d9488" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px', color: '#f4f4f5', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                            itemStyle={{ color: '#f4f4f5' }}
                            formatter={(value: number) => [`${currencySymbol}${value.toFixed(2)}`, 'Value']}
                            labelStyle={{ color: '#a1a1aa' }}
                        />
                        <XAxis 
                            dataKey="date" 
                            hide={chartData.length < 2} 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{fill: '#a1a1aa', fontSize: 10}} 
                            minTickGap={30}
                        />
                        <Area 
                            type="monotone" 
                            dataKey="value" 
                            stroke="#0d9488" 
                            strokeWidth={3}
                            fillOpacity={1} 
                            fill="url(#colorValue)" 
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
      </div>

      {/* Investment List */}
      <h3 className="font-bold text-zinc-900 dark:text-white mb-4 px-1">Holdings</h3>
      <div className="space-y-3">
        {investments.length === 0 ? (
           <div className="text-center py-12 text-zinc-400 dark:text-zinc-600 bg-zinc-50 dark:bg-zinc-900 rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800">No investments added yet.</div>
        ) : (
          investments.map(inv => {
            const profit = inv.currentValue - inv.initialValue;
            const isProfit = profit >= 0;
            return (
              <div key={inv.id} className="bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 flex justify-between items-center transition-all hover:bg-zinc-50 dark:hover:bg-zinc-800/50 active:scale-[0.99]">
                 <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-100 dark:border-blue-900/30">
                       <span className="text-xs font-black uppercase">{inv.type.substring(0, 2)}</span>
                    </div>
                    <div>
                       <p className="font-bold text-zinc-900 dark:text-white text-base">{inv.name}</p>
                       <p className="text-xs font-medium text-zinc-400 dark:text-zinc-500">Init: {currencySymbol}{inv.initialValue.toFixed(0)}</p>
                    </div>
                 </div>
                 <div className="text-right">
                    <p className="font-black text-zinc-900 dark:text-white text-base">{currencySymbol}{inv.currentValue.toFixed(2)}</p>
                    <div className="flex items-center justify-end gap-2 mt-0.5">
                         <span className={`text-xs font-bold ${isProfit ? 'text-income' : 'text-expense'}`}>
                           {isProfit ? '+' : ''}{currencySymbol}{Math.abs(profit).toFixed(0)}
                         </span>
                         <div className="flex gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                             {/* Actions can be added here if needed, keeping UI clean for now */}
                         </div>
                    </div>
                 </div>
                 <div className="flex gap-2 ml-4 pl-4 border-l border-zinc-100 dark:border-zinc-800">
                    <button onClick={() => handleOpenModal(inv)} className="text-zinc-400 hover:text-brand-600 p-2 bg-zinc-50 dark:bg-zinc-800 rounded-xl transition-colors"><ICONS.Edit className="w-4 h-4" /></button>
                    <button onClick={() => setConfirmData({isOpen: true, id: inv.id})} className="text-zinc-400 hover:text-expense p-2 bg-zinc-50 dark:bg-zinc-800 rounded-xl transition-colors"><ICONS.Trash className="w-4 h-4" /></button>
                 </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 shadow-xl animate-slide-up border border-transparent dark:border-zinc-800">
            <h3 className="text-xl font-bold mb-6 text-zinc-900 dark:text-white">{editingId ? 'Edit Investment' : 'Add Investment'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
               <div>
                 <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-500 uppercase tracking-wider mb-1.5 ml-1">Asset Name</label>
                 <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full p-3.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:border-brand-500 text-zinc-900 dark:text-white font-medium" placeholder="e.g. Apple Stock" required />
               </div>
               <div>
                 <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-500 uppercase tracking-wider mb-1.5 ml-1">Type</label>
                 <select value={type} onChange={e => setType(e.target.value as InvestmentType)} className="w-full p-3.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:border-brand-500 text-zinc-900 dark:text-white appearance-none font-medium">
                    {Object.values(InvestmentType).map(t => <option key={t} value={t}>{t}</option>)}
                 </select>
               </div>
               <div className="flex gap-4">
                  <div className="flex-1">
                     <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-500 uppercase tracking-wider mb-1.5 ml-1">Initial Value</label>
                     <input type="number" value={initialValue} onChange={e => setInitialValue(e.target.value)} className="w-full p-3.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:border-brand-500 text-zinc-900 dark:text-white font-medium" required />
                  </div>
                  <div className="flex-1">
                     <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-500 uppercase tracking-wider mb-1.5 ml-1">Current Value</label>
                     <input type="number" value={currentValue} onChange={e => setCurrentValue(e.target.value)} className="w-full p-3.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:border-brand-500 text-zinc-900 dark:text-white font-medium" required />
                  </div>
               </div>
               <div className="flex gap-3 mt-6 pt-2">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl font-bold transition-all">Cancel</button>
                  <button type="submit" className="flex-1 py-4 bg-brand-600 text-white rounded-xl font-bold shadow-lg shadow-brand-500/20 hover:bg-brand-700 transition-all">Save</button>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Investments;