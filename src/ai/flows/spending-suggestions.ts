'use server';

/**
 * @fileOverview Provides personalized recommendations to optimize spending and savings.
 */

import {ai, callGeminiApi} from '@/ai/genkit';
import {z} from 'genkit';

const SpendingSuggestionsInputSchema = z.object({
  transactionHistory: z.string().describe('Summarized transaction history.'),
  currentBudget: z.number().describe('The current monthly budget.'),
});
export type SpendingSuggestionsInput = z.infer<typeof SpendingSuggestionsInputSchema>;

const SpendingSuggestionsOutputSchema = z.object({
  suggestions: z.string().describe('A markdown list of recommendations.'),
});
export type SpendingSuggestionsOutput = z.infer<typeof SpendingSuggestionsOutputSchema>;

export async function getSpendingSuggestions(input: SpendingSuggestionsInput): Promise<SpendingSuggestionsOutput> {
  return spendingSuggestionsFlow(input);
}

const spendingSuggestionsFlow = ai.defineFlow(
  {
    name: 'spendingSuggestionsFlow',
    inputSchema: SpendingSuggestionsInputSchema,
    outputSchema: SpendingSuggestionsOutputSchema,
  },
  async (input) => {
    const prompt = `You are "MoneyMap AI," an expert financial advisor in India. Analyze the following summarized transaction data and budget to provide a structured financial report.

**User Data:**
Budget: ₹${input.currentBudget}
Transactions:
${input.transactionHistory}

**Your Task:**
Provide 5-7 concise, actionable recommendations in Markdown format.
IMPORTANT: Use Indian Rupee (₹) symbols for all monetary values.
Cover:
1. Emergency fund status (suggest targets based on expenses).
2. High-frequency category optimization.
3. Discretionary spending control.
4. Investment allocation hints.
5. Savings ratio improvement.

Use a professional, encouraging tone. Start directly with the first suggestion using a numbered list.`;

    try {
      const suggestions = await callGeminiApi(prompt);
      return { suggestions };
    } catch (error) {
      console.error('Spending suggestions failed:', error);
      return { suggestions: "I'm sorry, I couldn't generate your report right now. Please check back in a few minutes." };
    }
  }
);