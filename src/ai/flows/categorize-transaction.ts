'use server';
/**
 * @fileOverview An AI flow to automatically categorize financial transactions.
 */

import {ai, callGeminiApi} from '@/ai/genkit';
import {z} from 'genkit';

const CategorizeTransactionInputSchema = z.object({
  description: z.string().describe('The description of the transaction.'),
  type: z.enum(['income', 'expense']).describe('The type of the transaction.'),
});
export type CategorizeTransactionInput = z.infer<typeof CategorizeTransactionInputSchema>;

const CategorizeTransactionOutputSchema = z.object({
  category: z.string().describe('A relevant category for the transaction.'),
});
export type CategorizeTransactionOutput = z.infer<typeof CategorizeTransactionOutputSchema>;

export async function categorizeTransaction(input: CategorizeTransactionInput): Promise<CategorizeTransactionOutput> {
  return categorizeTransactionFlow(input);
}

const categorizeTransactionFlow = ai.defineFlow(
  {
    name: 'categorizeTransactionFlow',
    inputSchema: CategorizeTransactionInputSchema,
    outputSchema: CategorizeTransactionOutputSchema,
  },
  async (input) => {
    const prompt = `You are a financial assistant for users in India. Your task is to categorize a financial transaction based on its description and type.

Please categorize the transaction into one of the following common Indian financial categories:
- For expenses: Food & Dining, Shopping, Groceries, Utilities, Transport, Entertainment, Health & Wellness, Travel, Rent, EMI, Education, Investment, Other Expense.
- For income: Salary, Freelance Income, Investment, Rental Income, Other Income.

Transaction Description: '${input.description}'
Transaction Type: '${input.type}'

Return your response ONLY as a JSON object with a single key "category". Example: {"category": "Food & Dining"}`;

    try {
      const responseText = await callGeminiApi(prompt);
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      const data = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);
      return { category: data.category || (input.type === 'expense' ? 'Other Expense' : 'Other Income') };
    } catch (error) {
      console.error('Categorization failed:', error);
      return { category: input.type === 'expense' ? 'Other Expense' : 'Other Income' };
    }
  }
);