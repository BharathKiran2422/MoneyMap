export type Transaction = {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  date: Date;
  category?: string;
  accountId?: string;
  accountName?: string;
  // Audit fields
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: string;
  lastModifiedBy?: string;
};

export type Account = {
  id: string;
  name: string;
  type: 'Savings' | 'Checking' | 'Credit Card' | 'Cash';
  isActive?: boolean;
  aiSuggestions?: {
    suggestions: string;
    generatedAt: string;
  };
};

export type Notification = {
  id:string;
  message: string;
  type: 'warning' | 'danger' | 'info';
  category?: 'Alert' | 'Advice' | 'Reminder' | 'Achievement';
  read: boolean;
  createdAt: Date;
  link?: string;
};

export type FinancialHealthScore = {
  score: number;
  summary: string;
  strengths: string[];
  areasForImprovement: string[];
  generatedAt: string;
};

export type UserProfile = {
  uid: string;
  name: string;
  email: string;
  phone: string;
  monthlyBudget?: number;
  lastNotification75Sent?: string; // e.g. "2024-07"
  lastNotification90Sent?: string; // e.g. "2024-07"
  lastNotification100Sent?: string; // e.g. "2024-07"
  lastMonthlySummarySent?: string; // e.g. "2024-07"
  lastRentReminderSent?: string; // e.g. "2024-07"
  aiFinancialReport?: {
    report: string;
    generatedAt: string;
  };
  financialHealthScore?: FinancialHealthScore;
}
