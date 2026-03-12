'use server';
/**
 * @fileOverview Generates short, actionable tips for financial alerts.
 */

import { ai, callGeminiApi } from '@/ai/genkit';
import { z } from 'genkit';

const NotificationTipInputSchema = z.object({
  context: z.string().describe('Context about the alert (e.g., budget reached 80%, spending spike detected).'),
  recentSpending: z.string().describe('Summary of recent transactions to give context.'),
});

export async function generateNotificationTip(input: z.infer<typeof NotificationTipInputSchema>): Promise<string> {
  const prompt = `You are a helpful financial assistant for "MoneyMap". 
  A user has received an alert: "${input.context}".
  Based on their recent spending:
  ${input.recentSpending}
  
  Provide a short (max 15 words), actionable, and personalized tip to help them manage this situation.
  Example for budget alert: "Consider reducing your 'Food & Dining' expenses this week to stay on track."
  Example for spike: "You spent significantly on 'Shopping' today. Try a no-spend day tomorrow."
  
  Return ONLY the tip text.`;

  try {
    const text = await callGeminiApi(prompt);
    return text.trim().replace(/^"|"$/g, '');
  } catch (error) {
    console.error('Notification tip AI failed:', error);
    return "Consider tracking your next few expenses closely to stay within your limits.";
  }
}
