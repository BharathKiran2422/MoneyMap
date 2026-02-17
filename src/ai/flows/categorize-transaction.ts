'use server';
/**
 * @fileOverview An AI flow to automatically categorize financial transactions.
 *
 * - categorizeTransaction - A function that categorizes a transaction based on its description and type.
 * - CategorizeTransactionInput - The input type for the categorizeTransaction function.
 * - CategorizeTransactionOutput - The return type for the categorizeTransaction function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CategorizeTransactionInputSchema = z.object({
  description: z.string().describe('The description of the transaction.'),
  type: z.enum(['income', 'expense']).describe('The type of the transaction.'),
});
export type CategorizeTransactionInput = z.infer<typeof CategorizeTransactionInputSchema>;

const CategorizeTransactionOutputSchema = z.object({
  category: z
    .string()
    .describe(
      'A relevant category for the transaction.'
    ),
});
export type CategorizeTransactionOutput = z.infer<typeof CategorizeTransactionOutputSchema>;

export async function categorizeTransaction(input: CategorizeTransactionInput): Promise<CategorizeTransactionOutput> {
  return categorizeTransactionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'categorizeTransactionPrompt',
  input: {schema: CategorizeTransactionInputSchema},
  output: {schema: CategorizeTransactionOutputSchema},
  prompt: `You are a financial assistant for users in India. Your task is to categorize a financial transaction based on its description and type.

Please categorize the transaction into one of the following common Indian financial categories:
- For expenses: Food & Dining, Shopping, Groceries, Utilities, Transport, Entertainment, Health & Wellness, Travel, Rent, EMI, Education, Investment, Other Expense.
- For income: Salary, Freelance Income, Investment, Rental Income, Other Income.

Analyze the transaction details below and provide a single, most appropriate category.

Transaction Description: '{{description}}'
Transaction Type: '{{type}}'`,
});

const categorizeTransactionFlow = ai.defineFlow(
  {
    name: 'categorizeTransactionFlow',
    inputSchema: CategorizeTransactionInputSchema,
    outputSchema: CategorizeTransactionOutputSchema,
  },
  async (input) => {
    const maxRetries = 3;
    let attempt = 0;
    while (attempt < maxRetries) {
      try {
        const {output} = await prompt(input);
        return output!;
      } catch (error: any) {
        attempt++;
        const isLastAttempt = attempt >= maxRetries;
        const isOverloaded = error.message && (error.message.includes('503') || error.message.includes('overloaded'));
        
        if (isOverloaded && !isLastAttempt) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          console.log(`Attempt ${attempt} failed with model overload. Retrying in ${delay / 1000}s...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          throw error;
        }
      }
    }
    throw new Error('Failed to categorize transaction after multiple retries.');
  }
);
