

export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER'
}

export enum UserTier {
  FREE = 'FREE',
  PRO = 'PRO',
  PREMIUM = 'PREMIUM'
}

export interface User {
  id: string;
  username: string;
  email: string; // Used as ID effectively in this simple app
  createdAt: number;
  role: UserRole;
  tier: UserTier;
  
  // Personalization & Settings
  currency: string; // ISO code e.g., 'USD'
  fullName?: string;
  country?: string;
  birthDate?: string; // YYYY-MM-DD
  avatar?: string; // Emoji char
}

export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE'
}

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  category: string;
  description: string;
  date: number; // timestamp
  type: TransactionType;
}

export enum RecurrenceFrequency {
  NEVER = 'NEVER',
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY'
}

export interface RecurringTransaction {
  id: string;
  userId: string;
  amount: number;
  category: string;
  description: string;
  type: TransactionType;
  frequency: RecurrenceFrequency;
  nextDueDate: number;
}

export type Period = 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export interface ReportData {
  period: string;
  income: number;
  expense: number;
  savings: number;
}

export interface CategorySummary {
  name: string;
  value: number;
  color: string;
}

export interface AiInsight {
  title: string;
  message: string;
  type: 'positive' | 'negative' | 'neutral';
}

// --- Investment Types ---
export enum InvestmentType {
  STOCK = 'STOCK',
  CRYPTO = 'CRYPTO',
  BOND = 'BOND',
  REAL_ESTATE = 'REAL_ESTATE',
  GOLD = 'GOLD',
  MUTUAL_FUND = 'MUTUAL_FUND',
  OTHER = 'OTHER'
}

export interface Investment {
  id: string;
  userId: string;
  name: string;
  type: InvestmentType;
  initialValue: number;
  currentValue: number;
  lastUpdated: number;
}

export interface PortfolioSnapshot {
  id: string;
  userId: string;
  date: number;
  totalValue: number;
}

// --- Work/Job Types ---
export enum JobType {
  FULL_TIME = 'FULL_TIME',
  PART_TIME = 'PART_TIME',
  FREELANCE = 'FREELANCE'
}

export enum PaymentType {
  HOURLY = 'HOURLY',
  MONTHLY = 'MONTHLY'
}

export interface Job {
  id: string;
  userId: string;
  title: string;
  type: JobType;
  paymentType: PaymentType;
  rate?: number; // Hourly rate or Monthly Salary
  schedule?: string[]; // Array of days e.g., ['Mon', 'Wed']
  defaultStartTime?: string; // HH:mm
  defaultEndTime?: string; // HH:mm
  lastPaidDate?: number;
  autoLogEnabled?: boolean; // Defaults to true
  skippedDates?: number[]; // Timestamps of dates where auto-log was manually deleted (Off Days)
  isArchived?: boolean;
}

export interface WorkLog {
  id: string;
  jobId: string;
  userId: string;
  date: number; // timestamp for the day
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  hours: number;
  earnings?: number; // Calculated based on rate if hourly
  notes?: string;
  isAutoLogged?: boolean;
  transactionId?: string; // ID of the linked INCOME transaction
}

declare global {
  interface Window {
    google?: any;
    median?: any;
    gonative_social_login_google_callback?: (data: any) => void;
    deferredPrompt?: any;
  }
}
