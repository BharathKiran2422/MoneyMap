'use server';

/**
 * @fileOverview Generates a monthly budget summary notification using direct API calls.
 */

import { ai, callGeminiApi } from '@/ai/genkit';
import { z } from 'genkit';

const MonthlySummaryInputSchema = z.object({
  totalExpenses: z.number(),
  monthlyBudget: z.number(),
  monthName: z.string(),
});
export type MonthlySummaryInput = z.infer<typeof MonthlySummaryInputSchema>;

const MonthlySummaryOutputSchema = z.object({
  message: z.string(),
});
export type MonthlySummaryOutput = z.infer<typeof MonthlySummaryOutputSchema>;

export async function generateMonthlySummary(input: MonthlySummaryInput): Promise<MonthlySummaryOutput> {
  return monthlySummaryFlow(input);
}

const monthlySummaryFlow = ai.defineFlow(
  {
    name: 'monthlySummaryFlow',
    inputSchema: MonthlySummaryInputSchema,
    outputSchema: MonthlySummaryOutputSchema,
  },
  async (input) => {
    const isOver = input.totalExpenses > input.monthlyBudget;
    const prompt = `You are an AI financial assistant for "MoneyMap". Generate a concise, friendly, one-sentence notification for the month of ${input.monthName}.
    
    Status: ${isOver ? 'Spent more than budget' : 'Stayed within budget'}
    Budget: ₹${input.monthlyBudget}
    Actual: ₹${input.totalExpenses}
    
    If over budget, mention cost-cutting. If under, offer congratulations. Keep it to exactly one sentence.`;

    try {
      const message = await callGeminiApi(prompt);
      return { message: message.trim() };
    } catch (error) {
      console.error('Monthly summary failed:', error);
      return { message: `Summary for ${input.monthName}: You spent ₹${input.totalExpenses.toLocaleString('en-IN')} this month.` };
    }
  }
);
