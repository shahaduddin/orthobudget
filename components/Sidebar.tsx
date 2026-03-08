import React, { useEffect, useState, useMemo } from 'react';
import { User, Job, WorkLog } from '../types';
import { dbService } from '../services/db';
import { ICONS, getCurrencySymbol } from '../constants';
import ConfirmDialog from './ConfirmDialog';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onUpdateUser: (user: User) => void;
  currency: string;
}

const Sidebar: React.FC<Props> = ({ isOpen, onClose, user, currency }) => {
  const [archivedJobs, setArchivedJobs] = useState<Job[]>([]);
  const [confirmState, setConfirmState] = useState<{isOpen: boolean, id: string | null}>({ isOpen: false, id: null });
  const [loading, setLoading] = useState(false);

  // Detail View State
  const [view, setView] = useState<'LIST' | 'DETAILS'>('LIST');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [jobLogs, setJobLogs] = useState<WorkLog[]>([]);

  const currencySymbol = getCurrencySymbol(currency);

  useEffect(() => {
    if (isOpen) {
      loadArchivedJobs();
      // Reset view on open
      setView('LIST');
      setSelectedJob(null);
    }
  }, [isOpen]);

  const loadArchivedJobs = async () => {
    setLoading(true);
    const allJobs = await dbService.getJobs(user.email);
    setArchivedJobs(allJobs.filter(j => j.isArchived));
    setLoading(false);
  };

  const handleViewJob = async (job: Job) => {
      setLoading(true);
      const allLogs = await dbService.getWorkLogs(user.email);
      const logs = allLogs.filter(l => l.jobId === job.id).sort((a, b) => b.date - a.date);
      setJobLogs(logs);
      setSelectedJob(job);
      setView('DETAILS');
      setLoading(false);
  };

  const handleBackToList = () => {
      setView('LIST');
      setSelectedJob(null);
      setJobLogs([]);
  };

  const handleRestore = async (job: Job) => {
    const updatedJob = { ...job, isArchived: false };
    await dbService.addJob(updatedJob);
    if (view === 'DETAILS') handleBackToList();
    await loadArchivedJobs();
  };

  const handleDelete = async (id: string) => {
    await dbService.deleteJob(id);
    if (view === 'DETAILS') handleBackToList();
    await loadArchivedJobs();
    setConfirmState({ isOpen: false, id: null });
  };

  const jobStats = useMemo(() => {
      if (!selectedJob) return { hours: 0, earnings: 0 };
      const hours = jobLogs.reduce((acc, log) => acc + log.hours, 0);
      const earnings = jobLogs.reduce((acc, log) => acc + (log.earnings || 0), 0);
      return { hours, earnings };
  }, [jobLogs, selectedJob]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] animate-fade-in" 
        onClick={onClose}
      />

      <ConfirmDialog 
        isOpen={confirmState.isOpen}
        title="Delete Permanently?"
        message="This will permanently delete the job and cannot be undone."
        onConfirm={() => confirmState.id && handleDelete(confirmState.id)}
        onCancel={() => setConfirmState({ isOpen: false, id: null })}
        confirmText="Delete"
        variant="danger"
      />

      {/* Drawer */}
      <div className="fixed top-0 left-0 h-full w-[85%] max-w-sm bg-white dark:bg-zinc-900 z-[70] shadow-2xl animate-slide-right flex flex-col border-r border-zinc-100 dark:border-zinc-800 transition-colors">
        
        {/* Header */}
        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-zinc-800 text-brand-600 dark:text-brand-400 flex items-center justify-center text-xl font-bold border border-zinc-200 dark:border-zinc-700">
               {user.avatar ? user.avatar : user.username.charAt(0).toUpperCase()}
             </div>
             <div>
                <p className="font-bold text-zinc-900 dark:text-white leading-tight">{user.username}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{user.email}</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-white rounded-full transition-colors">
            <ICONS.X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
            
            {view === 'LIST' ? (
                <>
                    <h3 className="text-xs font-bold text-zinc-500 dark:text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <ICONS.Archive className="w-4 h-4" />
                        Archived Jobs
                    </h3>

                    {loading ? (
                        <div className="flex justify-center py-4">
                            <ICONS.Sync className="w-5 h-5 animate-spin text-zinc-400" />
                        </div>
                    ) : archivedJobs.length === 0 ? (
                        <div className="text-center py-8 text-zinc-400 dark:text-zinc-600 bg-zinc-50/50 dark:bg-zinc-800/20 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800">
                            <p className="text-sm">No archived jobs</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {archivedJobs.map(job => (
                                <div key={job.id} onClick={() => handleViewJob(job)} className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors group">
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-bold text-zinc-900 dark:text-white">{job.title}</h4>
                                        <div className="flex items-center gap-1">
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 uppercase">Archived</span>
                                            <ICONS.ArrowLeft className="w-4 h-4 text-zinc-300 dark:text-zinc-600 rotate-180" />
                                        </div>
                                    </div>
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{job.type.replace('_', ' ')} • {job.paymentType}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            ) : (
                // DETAILS VIEW
                <div className="animate-fade-in">
                    <button onClick={handleBackToList} className="flex items-center gap-1 text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white mb-4 transition-colors">
                        <ICONS.ArrowLeft className="w-4 h-4" /> Back to Archive
                    </button>

                    {selectedJob && (
                        <>
                            <div className="bg-zinc-50 dark:bg-zinc-800/50 p-5 rounded-3xl border border-zinc-100 dark:border-zinc-800 mb-6">
                                <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-1">{selectedJob.title}</h3>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">{selectedJob.type.replace('_', ' ')}</p>
                                
                                <div className="grid grid-cols-2 gap-3 mb-4">
                                    <div className="bg-white dark:bg-zinc-900 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-800 text-center">
                                        <p className="text-[10px] font-bold text-zinc-400 uppercase">Rate</p>
                                        <p className="font-bold text-zinc-900 dark:text-white">{currencySymbol}{selectedJob.rate}</p>
                                    </div>
                                    <div className="bg-white dark:bg-zinc-900 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-800 text-center">
                                        <p className="text-[10px] font-bold text-zinc-400 uppercase">Total Earned</p>
                                        <p className="font-bold text-emerald-600 dark:text-emerald-400">{currencySymbol}{jobStats.earnings.toFixed(0)}</p>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => handleRestore(selectedJob)}
                                        className="flex-1 py-3 bg-white dark:bg-zinc-900 text-brand-600 dark:text-brand-400 text-xs font-bold rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm active:scale-95 transition-all hover:bg-zinc-50 dark:hover:bg-zinc-800"
                                    >
                                        Restore Job
                                    </button>
                                    <button 
                                        onClick={() => setConfirmState({isOpen: true, id: selectedJob.id})}
                                        className="p-3 text-zinc-400 hover:text-red-500 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm transition-colors hover:bg-red-50 dark:hover:bg-red-900/10"
                                    >
                                        <ICONS.Trash className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <h4 className="text-xs font-bold text-zinc-500 dark:text-zinc-500 uppercase tracking-widest mb-3 pl-1">Log History</h4>
                            <div className="space-y-2">
                                {jobLogs.length === 0 ? (
                                    <p className="text-center text-xs text-zinc-400 py-8 italic">No logs found for this job.</p>
                                ) : (
                                    jobLogs.map(log => (
                                        <div key={log.id} className="bg-white dark:bg-zinc-900 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-zinc-50 dark:bg-zinc-800 rounded-lg flex flex-col items-center justify-center border border-zinc-100 dark:border-zinc-700">
                                                    <span className="text-[8px] font-bold text-zinc-400 uppercase">{new Date(log.date).toLocaleDateString(undefined, {month: 'short'})}</span>
                                                    <span className="text-xs font-bold text-zinc-900 dark:text-white">{new Date(log.date).getDate()}</span>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-zinc-900 dark:text-white">{log.hours} hrs</p>
                                                    <p className="text-[10px] text-zinc-400">{log.startTime} - {log.endTime}</p>
                                                </div>
                                            </div>
                                            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">+{currencySymbol}{log.earnings?.toFixed(2)}</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </>
                    )}
                </div>
            )}

        </div>

        <div className="p-6 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900 text-center">
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
                Ortho v2.4 • Offline First
            </p>
        </div>
      </div>
    </>
  );
};

export default Sidebar;