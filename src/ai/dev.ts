import { config } from 'dotenv';
config();

import '@/ai/flows/spending-suggestions.ts';
import '@/ai/flows/categorize-transaction.ts';
import '@/ai/flows/monthly-summary-notification.ts';
import '@/ai/flows/financial-health-score.ts';
import '@/ai/flows/life-event-planner.ts';
import '@/ai/flows/create-transaction-from-text.ts';
import '@/ai/flows/financial-chatbot.ts';
