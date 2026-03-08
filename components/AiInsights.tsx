import React from 'react';
import { AiInsight } from '../types';
import { ICONS } from '../constants';

interface Props {
  insights: AiInsight[];
  loading: boolean;
  onRefresh: () => void;
}

const AiInsights: React.FC<Props> = ({ insights, loading, onRefresh }) => {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-[2rem] p-6 shadow-sm border border-zinc-100 dark:border-zinc-800">
        <div className="flex justify-between items-center mb-5">
            <h3 className="font-bold text-zinc-900 dark:text-white flex items-center gap-2.5 text-lg">
                <ICONS.Sparkles className="w-5 h-5 text-amber-500" /> 
                <span>Wisdom</span>
            </h3>
            <button onClick={onRefresh} disabled={loading} className="text-xs text-brand-600 dark:text-brand-400 font-bold px-4 py-2 bg-brand-50 dark:bg-brand-900/20 rounded-full border border-brand-100 dark:border-brand-900/30 transition-all hover:bg-brand-100 dark:hover:bg-brand-900/40">
                {loading ? 'Contemplating...' : 'Refresh'}
            </button>
        </div>
        {insights.length > 0 ? (
            <div className="space-y-3">
                {insights.map((insight, idx) => (
                    <div key={idx} className={`p-4 rounded-2xl border-l-[3px] text-sm transition-all hover:translate-x-1 ${
                        insight.type === 'positive' ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-500 text-emerald-900 dark:text-emerald-200' :
                        insight.type === 'negative' ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-500 text-rose-900 dark:text-rose-200' :
                        'bg-blue-50 dark:bg-blue-950/30 border-blue-500 text-blue-900 dark:text-blue-200'
                    }`}>
                        <p className="font-bold mb-1.5">{insight.title}</p>
                        <p className="opacity-90 leading-relaxed">{insight.message}</p>
                    </div>
                ))}
            </div>
        ) : (
            <div className="text-center py-8 text-zinc-400 dark:text-zinc-500 text-sm bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-700">
                Tap refresh to seek guidance on your spending.
            </div>
        )}
    </div>
  );
};

export default AiInsights;