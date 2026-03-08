import { dbService } from './db';
import { RecurrenceFrequency, Transaction, Job, WorkLog, PaymentType } from '../types';
import { notificationService } from './notifications';

export const processRecurringTransactions = async (userId: string) => {
  const rules = await dbService.getRecurringTransactions(userId);
  const now = Date.now();
  let processedCount = 0;
  let changesMade = false;

  for (const rule of rules) {
    let due = rule.nextDueDate;
    let ruleUpdated = false;

    let iterations = 0;
    
    while (due <= now && iterations < 60) {
      const newTx: Transaction = {
        id: crypto.randomUUID(),
        userId: rule.userId,
        amount: rule.amount,
        category: rule.category,
        description: `(Recurring) ${rule.description}`,
        date: due,
        type: rule.type
      };
      
      await dbService.addTransaction(newTx);
      processedCount++;

      const dateObj = new Date(due);
      if (rule.frequency === RecurrenceFrequency.DAILY) dateObj.setDate(dateObj.getDate() + 1);
      if (rule.frequency === RecurrenceFrequency.WEEKLY) dateObj.setDate(dateObj.getDate() + 7);
      if (rule.frequency === RecurrenceFrequency.MONTHLY) dateObj.setMonth(dateObj.getMonth() + 1);
      if (rule.frequency === RecurrenceFrequency.YEARLY) dateObj.setFullYear(dateObj.getFullYear() + 1);
      
      due = dateObj.getTime();
      ruleUpdated = true;
      iterations++;
    }

    if (ruleUpdated) {
      await dbService.updateRecurringTransaction({ ...rule, nextDueDate: due });
      changesMade = true;
    }
  }

  if (processedCount > 0) {
    notificationService.sendSummary(processedCount, 'TRANSACTION');
  }

  return changesMade;
};

// Helper to calculate hours between two time strings (HH:mm)
const calculateHours = (start: string, end: string): number => {
  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);
  let duration = (endH + endM / 60) - (startH + startM / 60);
  if (duration < 0) duration += 24; // Handle overnight shifts
  return parseFloat(duration.toFixed(2));
};

const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Auto-create work logs (recurring job instances) based on templates if no log exists for that date
export const processAutoWorkLogs = async (userId: string) => {
  const jobs = await dbService.getJobs(userId);
  const logs = await dbService.getWorkLogs(userId);
  let processedCount = 0;
  let changesMade = false;

  // We look back up to 30 days to auto-fill missed logs, primarily for monthly management
  const checkStart = new Date();
  checkStart.setDate(checkStart.getDate() - 30); 
  
  // Strip time for comparison
  checkStart.setHours(0,0,0,0);
  const todayMidnight = new Date();
  todayMidnight.setHours(0,0,0,0);

  for (const job of jobs) {
    // Check if auto-log is disabled (default is true if undefined)
    if (job.autoLogEnabled === false) continue;

    // Skip if no schedule or default times defined in the job template
    if (!job.schedule || job.schedule.length === 0 || !job.defaultStartTime || !job.defaultEndTime) continue;

    // Iterate from checkStart up to Yesterday (Today is handled manually or next time)
    let iterDate = new Date(checkStart);
    
    while (iterDate < todayMidnight) {
      const dayName = WEEK_DAYS[iterDate.getDay()];
      const dateTs = iterDate.getTime();
      
      // Check if this specific date is marked as skipped (Off Day)
      const isSkipped = job.skippedDates && job.skippedDates.includes(dateTs);

      // If job is scheduled for this day AND not manually skipped
      if (job.schedule.includes(dayName) && !isSkipped) {
        
        // Check if a log already exists for this job on this specific date
        // This ensures we only create the "recurring job" instance if it doesn't exist
        const exists = logs.some(l => l.jobId === job.id && new Date(l.date).toDateString() === iterDate.toDateString());
        
        if (!exists) {
          // Create Auto Log
          const hours = calculateHours(job.defaultStartTime, job.defaultEndTime);
          let earnings = 0;
          if (job.paymentType === PaymentType.HOURLY && job.rate) {
            earnings = hours * job.rate;
          }

          const newLog: WorkLog = {
            id: crypto.randomUUID(),
            jobId: job.id,
            userId: job.userId,
            date: dateTs,
            startTime: job.defaultStartTime,
            endTime: job.defaultEndTime,
            hours: hours,
            earnings: earnings,
            notes: 'Auto-logged based on schedule',
            isAutoLogged: true
          };

          await dbService.addWorkLog(newLog);
          processedCount++;
          changesMade = true;
        }
      }
      
      // Next day
      iterDate.setDate(iterDate.getDate() + 1);
    }
  }

  if (processedCount > 0) {
    notificationService.sendSummary(processedCount, 'WORK_LOG');
  }

  return changesMade;
};
