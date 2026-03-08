import React, { useState, useEffect, useMemo } from 'react';
import { Job, JobType, WorkLog, PaymentType, Transaction, TransactionType, Period } from '../types';
import { dbService } from '../services/db';
import { ICONS, getCurrencySymbol } from '../constants';
import ConfirmDialog from './ConfirmDialog';

interface Props {
  userId: string;
  currency: string;
  onSync: () => void; // Callback to refresh parent data
}

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Helper to prevent timezone shifts: Treat date strings as Local Midnight
const getLocalDateTimestamp = (dateString: string): number => {
  if (!dateString) return Date.now();
  const [y, m, d] = dateString.split('-').map(Number);
  return new Date(y, m - 1, d).getTime();
};

const getLocalDateString = (timestamp: number | undefined): string => {
  if (!timestamp) return new Date().toISOString().split('T')[0]; // Fallback to today
  const d = new Date(timestamp);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const WorkTracker: React.FC<Props> = ({ userId, currency, onSync }) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [logs, setLogs] = useState<WorkLog[]>([]);
  const [showJobModal, setShowJobModal] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  
  // Confirmation state
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    onConfirm: () => void;
    variant?: 'danger' | 'brand';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // History Modal State
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyJobId, setHistoryJobId] = useState<string | null>(null);
  const [historyPeriod, setHistoryPeriod] = useState<Period | 'CUSTOM'>('MONTHLY');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [viewDate, setViewDate] = useState(new Date());
  
  // Job Form State
  const [jobTitle, setJobTitle] = useState('');
  const [jobType, setJobType] = useState<JobType>(JobType.FULL_TIME);
  const [paymentType, setPaymentType] = useState<PaymentType>(PaymentType.MONTHLY);
  const [rate, setRate] = useState('');
  const [schedule, setSchedule] = useState<string[]>([]);
  const [defaultStartTime, setDefaultStartTime] = useState('09:00');
  const [defaultEndTime, setDefaultEndTime] = useState('17:00');
  const [lastPaidDate, setLastPaidDate] = useState('');
  const [autoLogEnabled, setAutoLogEnabled] = useState(true);

  // Log Form State
  const [logId, setLogId] = useState<string | null>(null); // For editing logs
  const [logStartTime, setLogStartTime] = useState('');
  const [logEndTime, setLogEndTime] = useState('');
  const [logDate, setLogDate] = useState(getLocalDateString(Date.now()));

  // Payment Modal State
  const [paymentDate, setPaymentDate] = useState('');

  const currencySymbol = getCurrencySymbol(currency);

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    const jobsData = await dbService.getJobs(userId);
    const logsData = await dbService.getWorkLogs(userId);
    setJobs(jobsData);
    setLogs(logsData.sort((a, b) => b.date - a.date));
  };

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const d = new Date(log.date);
      return d.getMonth() === viewDate.getMonth() && d.getFullYear() === viewDate.getFullYear();
    });
  }, [logs, viewDate]);

  const activeJobs = useMemo(() => {
    return jobs.filter(job => !job.isArchived);
  }, [jobs]);

  const changeMonth = (offset: number) => {
    const newDate = new Date(viewDate);
    newDate.setMonth(newDate.getMonth() + offset);
    setViewDate(newDate);
  };

  const calculateDuration = (start: string, end: string): number => {
    if (!start || !end) return 0;
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    let duration = (endH + endM / 60) - (startH + startM / 60);
    if (duration < 0) duration += 24;
    return parseFloat(duration.toFixed(2));
  };

  const getDaysSinceLastPaid = (job: Job) => {
    // If no last paid date, we count all logs as unpaid
    const checkDate = job.lastPaidDate || 0;
    // Count unique dates worked after the last paid date
    const workedDates = new Set();
    logs.forEach(l => {
        if (l.jobId === job.id && l.date > checkDate) {
            workedDates.add(new Date(l.date).toDateString());
        }
    });
    return workedDates.size;
  };

  const handleToggleDay = (day: string) => {
    if (schedule.includes(day)) {
      setSchedule(schedule.filter(d => d !== day));
    } else {
      setSchedule([...schedule, day]);
    }
  };

  const handleOpenJobModal = (job?: Job) => {
    if (job) {
      setEditingJobId(job.id);
      setJobTitle(job.title);
      setJobType(job.type);
      setPaymentType(job.paymentType);
      setRate(job.rate?.toString() || '');
      setSchedule(job.schedule || []);
      setDefaultStartTime(job.defaultStartTime || '09:00');
      setDefaultEndTime(job.defaultEndTime || '17:00');
      setLastPaidDate(job.lastPaidDate ? getLocalDateString(job.lastPaidDate) : '');
      setAutoLogEnabled(job.autoLogEnabled !== false); // Default true if undefined
    } else {
      setEditingJobId(null);
      resetJobForm();
    }
    setShowJobModal(true);
  };

  const handleSaveJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobTitle) return;

    const jobData: Job = {
      id: editingJobId || crypto.randomUUID(),
      userId,
      title: jobTitle,
      type: jobType,
      paymentType: paymentType,
      rate: parseFloat(rate) || 0,
      schedule: schedule,
      defaultStartTime,
      defaultEndTime,
      // Use helper to save Local Midnight timestamp
      lastPaidDate: lastPaidDate ? getLocalDateTimestamp(lastPaidDate) : undefined,
      autoLogEnabled: autoLogEnabled,
      // Preserve skippedDates when editing
      skippedDates: editingJobId ? jobs.find(j => j.id === editingJobId)?.skippedDates : [],
      isArchived: editingJobId ? jobs.find(j => j.id === editingJobId)?.isArchived : false
    };

    await dbService.addJob(jobData);
    setShowJobModal(false);
    resetJobForm();
    loadData();
  };

  const handleArchiveJob = async (job: Job) => {
      setConfirmState({
        isOpen: true,
        title: 'Archive Job',
        message: 'This job will be moved to the archive section. Your logs will be preserved.',
        confirmText: 'Archive',
        variant: 'brand',
        onConfirm: async () => {
          const updatedJob = { ...job, isArchived: true };
          await dbService.addJob(updatedJob);
          loadData();
          setConfirmState(p => ({...p, isOpen: false}));
        }
      });
  };

  const handleDeleteJob = async (id: string) => {
      setConfirmState({
        isOpen: true,
        title: 'Delete Job',
        message: 'Are you sure you want to delete this job and all associated settings?',
        onConfirm: async () => {
          await dbService.deleteJob(id);
          loadData();
          setConfirmState(p => ({...p, isOpen: false}));
        }
      });
  }

  const handleDeleteLog = async (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      const log = logs.find(l => l.id === id);
      
      const isAutoLog = log?.isAutoLogged;
      const message = isAutoLog 
        ? 'This is an auto-generated log. Deleting it will mark this date as an "Off Day" and it will not be re-created automatically.' 
        : 'This work log will be permanently deleted.';

      setConfirmState({
        isOpen: true,
        title: isAutoLog ? 'Set as Off Day?' : 'Delete Log',
        message: message,
        confirmText: isAutoLog ? 'Confirm Off Day' : 'Delete',
        onConfirm: async () => {
          if (isAutoLog && log) {
             // Logic to mark this date as skipped in the Job
             const job = jobs.find(j => j.id === log.jobId);
             if (job) {
                // Ensure we use midnight timestamp for consistency with scheduler
                // Since log.date should be midnight already, we can use it directly or ensure local midnight
                const d = new Date(log.date);
                d.setHours(0,0,0,0);
                const skippedDateTimestamp = d.getTime();
                
                const updatedJob = {
                    ...job,
                    skippedDates: [...(job.skippedDates || []), skippedDateTimestamp]
                };
                await dbService.addJob(updatedJob);
             }
          }
          await dbService.deleteWorkLog(id);
          loadData();
          setConfirmState(p => ({...p, isOpen: false}));
        }
      });
  }

  const handleSyncLog = async (e: React.MouseEvent, log: WorkLog) => {
    e.stopPropagation();
    if (!log.earnings || log.earnings <= 0) {
        alert("Cannot add zero earnings to reports.");
        return;
    }

    setConfirmState({
      isOpen: true,
      title: 'Sync to Reports',
      variant: 'brand',
      message: 'This will create an income transaction in your main budget based on these earnings.',
      onConfirm: async () => {
        const job = jobs.find(j => j.id === log.jobId);
        const txId = crypto.randomUUID();
        
        let category = 'Salary';
        if (job?.type === JobType.FREELANCE) category = 'Freelance';
        
        const transaction: Transaction = {
            id: txId,
            userId: userId,
            amount: log.earnings!,
            category: category,
            description: `Work Log: ${job?.title || 'Unknown'} (${new Date(log.date).toLocaleDateString()})`,
            date: log.date,
            type: TransactionType.INCOME
        };

        await dbService.addTransaction(transaction);
        const updatedLog = { ...log, transactionId: txId };
        await dbService.addWorkLog(updatedLog);
        
        loadData();
        onSync();
        setConfirmState(p => ({...p, isOpen: false}));
      }
    });
  };

  const resetJobForm = () => {
    setJobTitle('');
    setJobType(JobType.FULL_TIME);
    setPaymentType(PaymentType.MONTHLY);
    setRate('');
    setSchedule([]);
    setDefaultStartTime('09:00');
    setDefaultEndTime('17:00');
    setLastPaidDate('');
    setAutoLogEnabled(true);
    setEditingJobId(null);
  };

  const handleOpenLogModal = (jobId: string, existingLog?: WorkLog) => {
    setSelectedJobId(jobId);
    
    if (existingLog) {
      setLogId(existingLog.id);
      setLogDate(getLocalDateString(existingLog.date));
      setLogStartTime(existingLog.startTime || '09:00');
      setLogEndTime(existingLog.endTime || '17:00');
    } else {
      setLogId(null);
      const job = jobs.find(j => j.id === jobId);
      setLogDate(getLocalDateString(Date.now()));
      setLogStartTime(job?.defaultStartTime || '09:00');
      setLogEndTime(job?.defaultEndTime || '17:00');
    }
    setShowLogModal(true);
  };

  const handleOpenPaymentModal = (jobId: string) => {
    // Only open if click was deliberate, prevent bubbling if necessary
    setSelectedJobId(jobId);
    setPaymentDate(getLocalDateString(Date.now()));
    setShowPaymentModal(true);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJobId) return;
    
    const job = jobs.find(j => j.id === selectedJobId);
    if (!job) return;

    const updatedJob = {
        ...job,
        lastPaidDate: getLocalDateTimestamp(paymentDate)
    };

    await dbService.addJob(updatedJob);
    setShowPaymentModal(false);
    loadData();
  };

  const handleOpenHistoryModal = (jobId: string) => {
      setHistoryJobId(jobId);
      setHistoryPeriod('MONTHLY');
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setCustomStartDate(getLocalDateString(firstDay.getTime()));
      setCustomEndDate(getLocalDateString(now.getTime()));
      setShowHistoryModal(true);
  };

  const handleSaveLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJobId) return;

    const job = jobs.find(j => j.id === selectedJobId);
    if (!job) return;

    const hours = calculateDuration(logStartTime, logEndTime);
    
    // Earnings logic
    let earnings = 0;
    if (job.paymentType === PaymentType.HOURLY && job.rate) {
        earnings = hours * job.rate;
    }

    // Preserve existing transaction ID if editing
    let transactionId = undefined;
    if (logId) {
        const existing = logs.find(l => l.id === logId);
        transactionId = existing?.transactionId;
    }

    const newLog: WorkLog = {
      id: logId || crypto.randomUUID(),
      jobId: selectedJobId,
      userId,
      date: getLocalDateTimestamp(logDate), // Use local midnight
      startTime: logStartTime,
      endTime: logEndTime,
      hours: hours,
      earnings: earnings,
      notes: logId ? 'Edited manually' : 'Logged manually',
      transactionId: transactionId,
      isAutoLogged: logId ? logs.find(l => l.id === logId)?.isAutoLogged : false
    };

    await dbService.addWorkLog(newLog);
    setShowLogModal(false);
    loadData();
  };

  // Calculate monthly earnings for display
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthlyHourlyEarnings = logs
    .filter(l => {
      const d = new Date(l.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    })
    .reduce((sum, l) => sum + (l.earnings || 0), 0);

  // Helper variables for modal
  const selectedJobForModal = jobs.find(j => j.id === selectedJobId);
  const currentDuration = calculateDuration(logStartTime, logEndTime);
  const potentialEarnings = selectedJobForModal && selectedJobForModal.paymentType === PaymentType.HOURLY && selectedJobForModal.rate 
    ? (currentDuration * selectedJobForModal.rate) 
    : 0;

  // History Modal Logic
  const historyLogs = useMemo(() => {
    if (!historyJobId) return [];
    
    let start = 0;
    let end = Date.now() + 86400000; // Default end to future

    if (historyPeriod === 'CUSTOM') {
        start = customStartDate ? getLocalDateTimestamp(customStartDate) : 0;
        end = customEndDate ? getLocalDateTimestamp(customEndDate) : end;
    } else {
        const now = new Date();
        const cutoff = new Date();

        if (historyPeriod === 'WEEKLY') {
            cutoff.setDate(now.getDate() - 7);
        } else if (historyPeriod === 'MONTHLY') {
            cutoff.setMonth(now.getMonth() - 1);
        } else {
            cutoff.setFullYear(now.getFullYear() - 1);
        }
        start = cutoff.getTime();
    }

    return logs.filter(l => l.jobId === historyJobId && l.date >= start && l.date <= end).sort((a,b) => b.date - a.date);
  }, [logs, historyJobId, historyPeriod, customStartDate, customEndDate]);

  const { totalHours, totalEarnings, paidLogsCount, unpaidLogsCount } = useMemo(() => {
      const job = jobs.find(j => j.id === historyJobId);
      const lastPaid = job?.lastPaidDate || 0;
      
      let hours = 0;
      let earnings = 0;
      let paid = 0;
      let unpaid = 0;

      historyLogs.forEach(l => {
          hours += l.hours;
          earnings += (l.earnings || 0);
          
          const isPaid = l.date <= lastPaid || !!l.transactionId;
          if (isPaid) paid++;
          else unpaid++;
      });

      return { 
          totalHours: hours, 
          totalEarnings: earnings, 
          paidLogsCount: paid, 
          unpaidLogsCount: unpaid 
      };
  }, [historyLogs, historyJobId, jobs]);

  // Status Badge Component
  const LogStatusBadge = ({ log, job }: { log: WorkLog, job?: Job }) => {
      const isSynced = !!log.transactionId;
      const lastPaid = job?.lastPaidDate || 0;
      const isSettled = log.date <= lastPaid;
      // It is Unpaid if it is NOT synced AND NOT settled (meaning date > lastPaidDate)
      const isUnpaid = !isSynced && !isSettled;

      if (isSynced) {
          return <span className="text-[9px] bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1"><ICONS.CheckCircle className="w-3 h-3"/> SYNCED</span>;
      }
      if (isSettled) {
          return <span className="text-[9px] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1"><ICONS.CheckCircle className="w-3 h-3"/> SETTLED</span>;
      }
      if (isUnpaid) {
          return <span className="text-[9px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1">UNPAID</span>;
      }
      return null;
  };

  return (
    <div className="pb-24 pt-6 px-4 animate-fade-in">
      <ConfirmDialog 
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        variant={confirmState.variant}
        confirmText={confirmState.confirmText}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState(p => ({...p, isOpen: false}))}
      />

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Work & Income</h2>
        <button onClick={() => handleOpenJobModal()} className="bg-brand-600 text-white p-2 rounded-lg shadow-lg hover:bg-brand-700 transition active:scale-95 transform">
          <ICONS.Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Monthly Summary */}
      <div className="relative overflow-hidden bg-white dark:bg-zinc-900 rounded-[2.5rem] p-8 shadow-2xl shadow-zinc-200/50 dark:shadow-black/50 border border-zinc-100 dark:border-zinc-800 transition-colors duration-300 group mb-8">
         {/* Dynamic Mesh Gradient Background */}
         <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-emerald-400/10 dark:bg-emerald-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
         <div className="absolute bottom-0 left-0 w-[200px] h-[200px] bg-teal-400/10 dark:bg-teal-500/10 rounded-full blur-[60px] translate-y-1/2 -translate-x-1/3 pointer-events-none"></div>
         
         <div className="relative z-10 flex flex-col items-center text-center">
             <p className="text-zinc-500 dark:text-zinc-400 text-xs font-bold uppercase tracking-widest mb-3">Total Earnings (This Month)</p>
             <h3 className="text-5xl font-black tracking-tight mb-6 text-zinc-900 dark:text-white scale-100 group-hover:scale-105 transition-transform duration-300 cursor-default">
                <span className="text-3xl align-top opacity-40 mr-1 font-bold">{currencySymbol}</span>
                {monthlyHourlyEarnings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
             </h3>
             <div className="inline-flex items-center gap-2 text-xs font-bold bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 rounded-full text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                <ICONS.Clock className="w-3.5 h-3.5" />
                <span>{logs.filter(l => new Date(l.date).getMonth() === currentMonth).reduce((acc, curr) => acc + curr.hours, 0)} hrs logged</span>
             </div>
         </div>
      </div>

      {/* Jobs List */}
      <h3 className="font-bold text-gray-900 dark:text-white mb-4 px-1 flex items-center gap-2">
          <span>Active Jobs</span>
          <span className="text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded-full">{activeJobs.length}</span>
      </h3>
      <div className="space-y-4 mb-8">
        {activeJobs.length === 0 ? (
           <div className="text-center py-10 text-gray-400 dark:text-zinc-500 bg-zinc-50 dark:bg-zinc-900 rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800">
               <ICONS.Briefcase className="w-10 h-10 mx-auto mb-2 opacity-50" />
               <p className="font-medium">No active jobs</p>
               <p className="text-xs opacity-70 mt-1">Add a job to track hours and earnings</p>
           </div>
        ) : (
          activeJobs.map(job => {
            const unpaidDays = getDaysSinceLastPaid(job);
            return (
                <div key={job.id} className="bg-white dark:bg-zinc-900 p-5 rounded-3xl shadow-sm border border-zinc-100 dark:border-zinc-800 relative overflow-hidden transition-all active:scale-[0.99]">
                    {/* Header Row */}
                    <div className="flex justify-between items-start mb-4">
                        <div className="min-w-0 flex-1 mr-2">
                            <h4 className="font-bold text-xl text-zinc-900 dark:text-white tracking-tight truncate">{job.title}</h4>
                            <div className="flex flex-nowrap gap-2 mt-2 overflow-x-auto no-scrollbar">
                                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 whitespace-nowrap flex-shrink-0">
                                    {job.type === 'FULL_TIME' ? 'Full-Time' : job.type === 'PART_TIME' ? 'Part-Time' : 'Freelance'}
                                </span>
                                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 whitespace-nowrap flex-shrink-0">
                                    {job.paymentType === 'HOURLY' ? 'Hourly' : 'Monthly'}
                                </span>
                                {!job.autoLogEnabled && (
                                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-500 whitespace-nowrap flex-shrink-0">
                                        Manual
                                    </span>
                                )}
                            </div>
                        </div>
                        
                        {/* Actions - Grouped */}
                        <div className="flex gap-1 shrink-0">
                            <button onClick={() => handleOpenHistoryModal(job.id)} className="p-2 text-zinc-400 hover:text-brand-600 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl transition-colors" title="History"><ICONS.List className="w-5 h-5" /></button>
                            <button onClick={() => handleOpenJobModal(job)} className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl transition-colors" title="Edit"><ICONS.Edit className="w-5 h-5" /></button>
                            <button onClick={() => handleArchiveJob(job)} className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl transition-colors" title="Archive"><ICONS.Archive className="w-5 h-5" /></button>
                            <button onClick={() => handleDeleteJob(job.id)} className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors" title="Delete"><ICONS.Trash className="w-5 h-5" /></button>
                        </div>
                    </div>
                    
                    {/* Main Stats Grid */}
                    <div className="grid grid-cols-2 gap-3 mb-5">
                        <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Rate</p>
                            <p className="text-lg font-black text-zinc-900 dark:text-white">
                                {currencySymbol}{job.rate}
                                <span className="text-xs font-medium text-zinc-400 ml-0.5">/{job.paymentType === PaymentType.HOURLY ? 'hr' : 'mo'}</span>
                            </p>
                        </div>
                        <div 
                            onClick={() => handleOpenPaymentModal(job.id)}
                            className={`p-3 rounded-2xl border cursor-pointer transition-colors active:scale-95 ${unpaidDays > 0 ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/20' : 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/20'}`}
                        >
                            <div className="flex justify-between items-start">
                                <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${unpaidDays > 0 ? 'text-amber-600 dark:text-amber-500' : 'text-emerald-600 dark:text-emerald-500'}`}>
                                    {unpaidDays > 0 ? 'Unpaid' : 'Settled'}
                                </p>
                                <ICONS.CheckCircle className={`w-3.5 h-3.5 ${unpaidDays > 0 ? 'text-amber-400' : 'text-emerald-500'}`} />
                            </div>
                            <p className={`text-lg font-black ${unpaidDays > 0 ? 'text-amber-700 dark:text-amber-500' : 'text-emerald-700 dark:text-emerald-500'}`}>
                                {unpaidDays} <span className="text-xs font-medium opacity-70">days</span>
                            </p>
                        </div>
                    </div>

                    {/* Schedule & Actions Footer */}
                    <div className="flex flex-col gap-4">
                        {/* Schedule */}
                        <div>
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2 ml-1">Schedule</p>
                            <div className="flex justify-between bg-zinc-50 dark:bg-zinc-800/50 p-2 rounded-2xl">
                                {WEEK_DAYS.map(day => (
                                    <div key={day} className={`w-8 h-8 flex items-center justify-center rounded-xl text-[10px] font-bold transition-all ${job.schedule?.includes(day) ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-600' : 'text-zinc-300 dark:text-zinc-600'}`}>
                                        {day.charAt(0)}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Primary Action */}
                        <button 
                            onClick={() => handleOpenLogModal(job.id)}
                            className="w-full py-3.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl font-bold shadow-lg shadow-zinc-900/10 dark:shadow-white/5 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                        >
                            <ICONS.Clock className="w-4 h-4" />
                            <span>Log Hours</span>
                        </button>
                    </div>
                </div>
            )
          })
        )}
      </div>

      {/* Logs Header with Date Filter */}
      <div className="flex justify-between items-center mb-4 px-1">
          <h3 className="font-bold text-zinc-900 dark:text-white">Recent Logs</h3>
          <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl p-1">
              <button onClick={() => changeMonth(-1)} className="p-1.5 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <span className="text-xs font-bold w-24 text-center text-zinc-700 dark:text-zinc-200">
                  {viewDate.toLocaleString('default', { month: 'short', year: 'numeric' })}
              </span>
              <button onClick={() => changeMonth(1)} className="p-1.5 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white">
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
          </div>
      </div>

      {/* Recent Logs List */}
      <div className="space-y-3">
         {filteredLogs.map(log => {
           const job = jobs.find(j => j.id === log.jobId);
           return (
             <div key={log.id} onClick={() => handleOpenLogModal(log.jobId, log)} className="bg-white dark:bg-zinc-900 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-800 flex justify-between items-center cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 transition group relative">
                <div className="flex items-center gap-3">
                   <div className="flex flex-col items-center justify-center w-12 h-12 bg-zinc-50 dark:bg-zinc-800 rounded-xl text-zinc-500 dark:text-zinc-400 border border-zinc-100 dark:border-zinc-700/50">
                        <span className="text-[9px] font-bold uppercase">{new Date(log.date).toLocaleDateString(undefined, { month: 'short' })}</span>
                        <span className="text-lg font-black text-zinc-900 dark:text-white leading-none">{new Date(log.date).getDate()}</span>
                   </div>
                   <div>
                       <div className="flex items-center gap-2 mb-0.5">
                           <p className="font-bold text-sm text-zinc-900 dark:text-white">{job?.title || 'Unknown Job'}</p>
                           {log.isAutoLogged && <span className="text-[9px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-1.5 rounded-md flex items-center gap-0.5"><ICONS.Sparkles className="w-2 h-2"/> AUTO</span>}
                           <LogStatusBadge log={log} job={job} />
                       </div>
                       <p className="text-xs text-zinc-400 font-medium">
                           {log.startTime} - {log.endTime}
                       </p>
                   </div>
                </div>
                <div className="text-right flex items-center gap-3">
                   <div>
                       <p className="font-black text-sm text-zinc-800 dark:text-zinc-200">{log.hours} <span className="text-[10px] font-normal text-zinc-400">hrs</span></p>
                       {log.earnings ? <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">+{currencySymbol}{log.earnings.toFixed(2)}</p> : null}
                   </div>
                   {!log.transactionId && log.earnings && log.earnings > 0 && (
                       <button 
                        onClick={(e) => handleSyncLog(e, log)} 
                        className="bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 p-2 rounded-lg hover:bg-brand-100 dark:hover:bg-brand-900/40 flex items-center gap-1 border border-brand-100 dark:border-brand-900/30 transition-all shadow-sm"
                        title="Sync to Income"
                       >
                           <ICONS.Sync className="w-4 h-4" />
                       </button>
                   )}
                   <button onClick={(e) => handleDeleteLog(e, log.id)} className="text-zinc-300 hover:text-red-500 p-2 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20" title="Delete Log">
                       <ICONS.Trash className="w-4 h-4" />
                   </button>
                </div>
             </div>
           );
         })}
         {filteredLogs.length === 0 && <div className="text-center text-xs text-zinc-400 py-12 bg-zinc-50 dark:bg-zinc-900 rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800">No logs found for this period.</div>}
      </div>

      {/* Add/Edit Job Modal (Keep existing implementation) */}
      {showJobModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 shadow-xl animate-slide-up border border-transparent dark:border-zinc-800 overflow-y-auto max-h-[85vh] no-scrollbar">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white">{editingJobId ? 'Edit Job' : 'New Job'}</h3>
                <button onClick={() => setShowJobModal(false)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-white p-2">✕</button>
             </div>
             
             <form onSubmit={handleSaveJob} className="space-y-4">
                <div>
                   <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-500 uppercase tracking-wider mb-1.5 ml-1">Job Title</label>
                   <input type="text" value={jobTitle} onChange={e => setJobTitle(e.target.value)} className="w-full p-3.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:border-brand-500 text-zinc-900 dark:text-white transition-all" required placeholder="e.g. Senior Designer" />
                </div>
                
                <div className="flex gap-4">
                    <div className="flex-1">
                        <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-500 uppercase tracking-wider mb-1.5 ml-1">Type</label>
                        <select value={jobType} onChange={e => setJobType(e.target.value as JobType)} className="w-full p-3.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:border-brand-500 text-zinc-900 dark:text-white transition-all appearance-none">
                            {Object.values(JobType).map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                        </select>
                    </div>
                    <div className="flex-1">
                        <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-500 uppercase tracking-wider mb-1.5 ml-1">Payment</label>
                        <select value={paymentType} onChange={e => setPaymentType(e.target.value as PaymentType)} className="w-full p-3.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:border-brand-500 text-zinc-900 dark:text-white transition-all appearance-none">
                            {Object.values(PaymentType).map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                </div>

                <div>
                   <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-500 uppercase tracking-wider mb-1.5 ml-1">
                       {paymentType === PaymentType.HOURLY ? 'Hourly Rate' : 'Monthly Salary'}
                   </label>
                   <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-bold">{currencySymbol}</span>
                      <input type="number" value={rate} onChange={e => setRate(e.target.value)} className="w-full p-3.5 pl-9 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:border-brand-500 text-zinc-900 dark:text-white transition-all" placeholder="0.00" />
                   </div>
                </div>
                
                <div>
                    <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-500 uppercase tracking-wider mb-2 ml-1">Weekly Schedule</label>
                    <div className="flex justify-between">
                        {WEEK_DAYS.map(day => (
                        <button
                            key={day}
                            type="button"
                            onClick={() => handleToggleDay(day)}
                            className={`w-10 h-10 rounded-full text-xs font-bold transition-all transform active:scale-90 ${schedule.includes(day) ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/20' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'}`}
                        >
                            {day.charAt(0)}
                        </button>
                        ))}
                    </div>
                </div>

                <div className="flex gap-4">
                   <div className="flex-1">
                       <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-500 uppercase tracking-wider mb-1.5 ml-1">Start Time</label>
                       <input type="time" value={defaultStartTime} onChange={e => setDefaultStartTime(e.target.value)} className="w-full p-3.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:border-brand-500 text-zinc-900 dark:text-white transition-all" />
                   </div>
                   <div className="flex-1">
                       <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-500 uppercase tracking-wider mb-1.5 ml-1">End Time</label>
                       <input type="time" value={defaultEndTime} onChange={e => setDefaultEndTime(e.target.value)} className="w-full p-3.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:border-brand-500 text-zinc-900 dark:text-white transition-all" />
                   </div>
                </div>

                <div>
                   <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-500 uppercase tracking-wider mb-1.5 ml-1">Last Paid Date</label>
                   <input type="date" value={lastPaidDate} onChange={e => setLastPaidDate(e.target.value)} className="w-full p-3.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:border-brand-500 text-zinc-900 dark:text-white transition-all" />
                </div>
                
                <div className="flex items-center gap-3 p-3.5 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700">
                    <div 
                        onClick={() => setAutoLogEnabled(!autoLogEnabled)} 
                        className={`w-12 h-6 rounded-full p-1 transition-colors cursor-pointer ${autoLogEnabled ? 'bg-brand-600' : 'bg-zinc-300 dark:bg-zinc-600'}`}
                    >
                        <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${autoLogEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-zinc-900 dark:text-white">Auto-Log Hours</p>
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400">Automatically add daily entries based on schedule</p>
                    </div>
                </div>

                <div className="flex gap-3 mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                   <button type="button" onClick={() => setShowJobModal(false)} className="flex-1 py-4 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl font-bold transition-all hover:bg-zinc-200 dark:hover:bg-zinc-700">Cancel</button>
                   <button type="submit" className="flex-1 py-4 bg-brand-600 text-white rounded-xl font-bold shadow-lg shadow-brand-500/20 hover:bg-brand-700 transition-all transform active:scale-[0.98]">
                       {editingJobId ? 'Update' : 'Save Job'}
                   </button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
           <div className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-[2rem] p-6 shadow-2xl animate-scale-in border border-transparent dark:border-zinc-800 text-center">
               <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-50 dark:border-emerald-900/50">
                   <ICONS.CheckCircle className="w-8 h-8" />
               </div>
               <h3 className="text-xl font-bold mb-2 text-zinc-900 dark:text-white">Record Payment</h3>
               <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6 px-2 leading-relaxed">
                   Confirming this payment will update your last paid date and mark active logs as settled.
               </p>
               <form onSubmit={handleRecordPayment} className="space-y-4">
                   <div className="text-left">
                       <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-500 uppercase tracking-wider mb-1.5 ml-1">Payment Date</label>
                       <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className="w-full p-3.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:border-brand-500 text-zinc-900 dark:text-white transition-all font-bold" required />
                   </div>
                   <div className="flex flex-col gap-2 mt-4">
                       <button type="submit" className="w-full py-4 bg-brand-600 text-white rounded-xl font-bold shadow-lg shadow-brand-500/20 active:scale-95 transform transition-all">Confirm Payment</button>
                       <button type="button" onClick={() => setShowPaymentModal(false)} className="w-full py-3 text-zinc-400 dark:text-zinc-500 font-bold hover:text-zinc-600 dark:hover:text-zinc-300">Cancel</button>
                   </div>
               </form>
           </div>
        </div>
      )}

      {/* Log Hours Modal (Enhanced) */}
      {showLogModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
           <div className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 shadow-2xl animate-slide-up border border-transparent dark:border-zinc-800">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white">{logId ? 'Edit Log' : 'Log Hours'}</h3>
                <button onClick={() => setShowLogModal(false)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-white p-2">✕</button>
              </div>
              
              <form onSubmit={handleSaveLog} className="space-y-5">
                 <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-700">
                    <label className="block text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5 ml-1">Date</label>
                    <input type="date" value={logDate} onChange={e => setLogDate(e.target.value)} className="w-full bg-transparent outline-none text-zinc-900 dark:text-white font-bold" required />
                 </div>
                 
                 <div className="flex gap-3">
                   <div className="flex-1 bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-700 text-center">
                       <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-2">Start</label>
                       <input type="time" value={logStartTime} onChange={e => setLogStartTime(e.target.value)} className="w-full bg-transparent outline-none text-xl font-black text-zinc-900 dark:text-white text-center" required />
                   </div>
                   <div className="flex items-center text-zinc-200 dark:text-zinc-700 font-bold">→</div>
                   <div className="flex-1 bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-700 text-center">
                       <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-2">End</label>
                       <input type="time" value={logEndTime} onChange={e => setLogEndTime(e.target.value)} className="w-full bg-transparent outline-none text-xl font-black text-zinc-900 dark:text-white text-center" required />
                   </div>
                 </div>
                 
                 <div className="flex gap-3">
                    <div className="flex-1 p-4 bg-brand-50 dark:bg-brand-900/10 rounded-2xl border border-brand-100 dark:border-brand-900/20 text-center">
                        <p className="text-[10px] font-bold text-brand-400 uppercase tracking-widest mb-1">Duration</p>
                        <p className="text-2xl font-black text-brand-600 dark:text-brand-400">{currentDuration} <span className="text-xs font-normal">hrs</span></p>
                    </div>
                    {potentialEarnings > 0 && (
                        <div className="flex-1 p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-100 dark:border-emerald-900/20 text-center">
                            <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1">Potential</p>
                            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{currencySymbol}{potentialEarnings.toFixed(0)}</p>
                        </div>
                    )}
                 </div>

                 <div className="flex gap-3 mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                    <button type="button" onClick={() => setShowLogModal(false)} className="flex-1 py-4 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl font-bold transition-all hover:bg-zinc-200 dark:hover:bg-zinc-700">Cancel</button>
                    <button type="submit" className="flex-1 py-4 bg-brand-600 text-white rounded-xl font-bold shadow-lg shadow-brand-500/20 hover:bg-brand-700 transition-all transform active:scale-[0.98]">Save Log</button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && historyJobId && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
             <div className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-[2rem] p-0 shadow-2xl animate-scale-in border border-transparent dark:border-zinc-800 overflow-hidden flex flex-col max-h-[85vh]">
                 <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-800/30">
                     <div>
                        <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Job History</h3>
                        <p className="text-xs font-medium text-zinc-500 mt-0.5">{jobs.find(j => j.id === historyJobId)?.title}</p>
                     </div>
                     <button onClick={() => setShowHistoryModal(false)} className="bg-zinc-100 dark:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-white p-2.5 rounded-full transition-colors">✕</button>
                 </div>

                 {/* Filters */}
                 <div className="p-4 flex flex-col gap-3">
                     <div className="flex gap-2">
                        {(['WEEKLY', 'MONTHLY', 'YEARLY', 'CUSTOM'] as const).map(p => (
                            <button 
                                key={p} 
                                onClick={() => setHistoryPeriod(p)}
                                className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${historyPeriod === p ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/20' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'}`}
                            >
                                {p === 'CUSTOM' ? 'Custom' : p.charAt(0) + p.slice(1).toLowerCase()}
                            </button>
                        ))}
                     </div>
                     
                     {historyPeriod === 'CUSTOM' && (
                         <div className="flex gap-3 bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-2xl animate-fade-in border border-zinc-100 dark:border-zinc-800">
                             <div className="flex-1">
                                 <label className="block text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-1">From</label>
                                 <input type="date" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)} className="w-full bg-transparent font-bold text-zinc-900 dark:text-white outline-none text-sm" />
                             </div>
                             <div className="w-px bg-zinc-200 dark:bg-zinc-700"></div>
                             <div className="flex-1">
                                 <label className="block text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-1">To</label>
                                 <input type="date" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} className="w-full bg-transparent font-bold text-zinc-900 dark:text-white outline-none text-sm" />
                             </div>
                         </div>
                     )}
                 </div>

                 {/* Summary Stats */}
                 <div className="px-4 mb-4 space-y-3">
                     <div className="grid grid-cols-3 gap-2">
                         <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800 text-center">
                             <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest mb-1">Total Days</p>
                             <p className="text-lg font-black text-zinc-900 dark:text-white">{historyLogs.length}</p>
                         </div>
                         <div className="bg-blue-50 dark:bg-blue-900/10 p-3 rounded-xl border border-blue-100 dark:border-blue-900/20 text-center">
                             <p className="text-[9px] text-blue-400 font-bold uppercase tracking-widest mb-1">Paid</p>
                             <p className="text-lg font-black text-blue-600 dark:text-blue-400">{paidLogsCount}</p>
                         </div>
                         <div className="bg-amber-50 dark:bg-amber-900/10 p-3 rounded-xl border border-amber-100 dark:border-amber-900/20 text-center">
                             <p className="text-[9px] text-amber-500 font-bold uppercase tracking-widest mb-1">Unpaid</p>
                             <p className="text-lg font-black text-amber-600 dark:text-amber-500">{unpaidLogsCount}</p>
                         </div>
                     </div>
                     <div className="grid grid-cols-2 gap-2">
                         <div className="bg-brand-50 dark:bg-brand-900/10 p-3 rounded-xl border border-brand-100 dark:border-brand-900/20 text-center">
                             <p className="text-[9px] text-brand-400 font-bold uppercase tracking-widest mb-1">Hours</p>
                             <p className="text-lg font-black text-brand-700 dark:text-brand-400">{totalHours} <span className="text-[10px] font-normal">hrs</span></p>
                         </div>
                         <div className="bg-emerald-50 dark:bg-emerald-900/10 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/20 text-center">
                             <p className="text-[9px] text-emerald-500 font-bold uppercase tracking-widest mb-1">Earnings</p>
                             <p className="text-lg font-black text-emerald-700 dark:text-emerald-400">{currencySymbol}{totalEarnings.toFixed(0)}</p>
                         </div>
                     </div>
                 </div>

                 {/* Scrollable List */}
                 <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
                     {historyLogs.length === 0 ? (
                         <div className="text-center py-12 text-zinc-400 dark:text-zinc-600 bg-zinc-50/50 dark:bg-zinc-800/20 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800">
                            <p className="text-sm">No logs found for this period.</p>
                         </div>
                     ) : (
                         historyLogs.map(log => {
                             const job = jobs.find(j => j.id === log.jobId);
                             return (
                                 <div key={log.id} className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                                     <div className="flex items-center gap-4">
                                         <div className="w-12 h-12 rounded-xl bg-white dark:bg-zinc-800 flex flex-col items-center justify-center text-xs font-black border border-zinc-100 dark:border-zinc-700 shadow-sm">
                                             <span className="text-zinc-400 text-[9px] uppercase tracking-tighter mb-0.5">{new Date(log.date).toLocaleDateString(undefined, {weekday: 'short'})}</span>
                                             <span className="text-zinc-900 dark:text-white">{new Date(log.date).getDate()}</span>
                                         </div>
                                         <div>
                                             <p className="text-sm font-bold text-zinc-900 dark:text-white mb-1">{log.hours} hours</p>
                                             <LogStatusBadge log={log} job={job} />
                                         </div>
                                     </div>
                                     <div className="text-right">
                                         <p className="font-black text-sm text-emerald-600 dark:text-emerald-400">+{currencySymbol}{log.earnings?.toFixed(2)}</p>
                                         <p className="text-[10px] text-zinc-400 mt-1">{log.startTime} - {log.endTime}</p>
                                     </div>
                                 </div>
                             );
                         })
                     )}
                 </div>
             </div>
        </div>
      )}
    </div>
  );
};

export default WorkTracker;