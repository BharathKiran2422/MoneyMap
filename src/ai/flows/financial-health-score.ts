'use server';
/**
 * @fileOverview Calculates a user's financial health score.
 *
 * - getFinancialHealthScore - A function that generates a financial health score.
 * - FinancialHealthScoreInput - The input type for the getFinancialHealthScore function.
 * - FinancialHealthScoreOutput - The return type for the getFinancialHealthScore function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const FinancialHealthScoreInputSchema = z.object({
  transactionHistory: z
    .string()
    .describe(
      'A string containing the transaction history of the user. Each transaction should be on a new line, including date, description, type, amount, and category.'
    ),
});
export type FinancialHealthScoreInput = z.infer<typeof FinancialHealthScoreInputSchema>;

const FinancialHealthScoreOutputSchema = z.object({
    score: z.number().min(0).max(100).describe("A score from 0 to 100 representing the user's financial health."),
    summary: z.string().describe("A one or two-sentence summary of the user's financial health."),
    strengths: z.array(z.string()).describe("A list of 2-3 key financial strengths, each as a separate string."),
    areasForImprovement: z.array(z.string()).describe("A list of 2-3 key areas for improvement with actionable advice, each as a separate string."),
    // Adding calculation details for transparency
    calculationDetails: z.object({
        totalIncome: z.number(),
        needsSpending: z.number(),
        wantsSpending: z.number(),
        savingsAndDebt: z.number(),
        needsPercentage: z.number(),
        wantsPercentage: z.number(),
        savingsAndDebtPercentage: z.number(),
    }).optional()
});
export type FinancialHealthScoreOutput = z.infer<typeof FinancialHealthScoreOutputSchema>;

// Internal schema to pass pre-calculated data to the AI prompt
const AiInputSchema = z.object({
    score: z.number(),
    needsPercentage: z.number(),
    wantsPercentage: z.number(),
    savingsAndDebtPercentage: z.number(),
    totalIncome: z.number(),
});

export async function getFinancialHealthScore(input: FinancialHealthScoreInput): Promise<FinancialHealthScoreOutput> {
  return financialHealthScoreFlow(input);
}

const prompt = ai.definePrompt({
  name: 'financialHealthScorePrompt',
  input: {schema: AiInputSchema},
  output: {schema: FinancialHealthScoreOutputSchema.pick({ summary: true, strengths: true, areasForImprovement: true })},
  prompt: `You are a financial health analyst for "MoneyMap", an app for users in India. Your task is to provide a qualitative analysis of a user's financial health based on pre-calculated data.

**Pre-Calculated Data:**
- Final Score: {{score}}/100
- Needs Spending: {{needsPercentage}}% of income (Target: 50%)
- Wants Spending: {{wantsPercentage}}% of income (Target: 30%)
- Savings & Debt: {{savingsAndDebtPercentage}}% of income (Target: 20%)

**Your Task:**
Based on the score and the 50/30/20 breakdown, generate the following:
1.  **Summary:** A brief, encouraging one or two-sentence summary of their financial health.
2.  **Strengths:** 2-3 key strengths. Be specific and positive. For example: "You are doing an excellent job managing your essential living costs." or "Your savings rate is impressive this month."
3.  **Areas for Improvement:** 2-3 actionable areas for improvement. Provide specific, practical advice without using the terms 'Needs' or 'Wants'. For example: "Reviewing your spending on restaurant meals and online shopping could help you reach your savings goals faster." or "Consider setting up a recurring investment in MoneyMap to automate your savings."

Focus ONLY on generating these three fields. Do not add any other text.`,
});

const financialHealthScoreFlow = ai.defineFlow(
  {
    name: 'financialHealthScoreFlow',
    inputSchema: FinancialHealthScoreInputSchema,
    outputSchema: FinancialHealthScoreOutputSchema,
  },
  async (input) => {
    // --- Step 1: Perform all calculations deterministically ---

    // Define category mappings
    const NEEDS_CATEGORIES = ['Groceries', 'Utilities', 'Transport', 'Rent', 'Health & Wellness', 'Education'];
    const WANTS_CATEGORIES = ['Food & Dining', 'Shopping', 'Entertainment', 'Travel', 'Other Expense'];
    const SAVINGS_DEBT_CATEGORIES = ['EMI', 'Investment'];

    // Parse transaction history
    const transactions = input.transactionHistory.split('\n')
      .map(line => {
        const parts = line.match(/^(\d{4}-\d{2}-\d{2}): (income|expense) of ([\d,.]+) for '([^']*)' in category '([^']*)'$/);
        if (!parts) return null;
        return {
          date: parts[1],
          type: parts[2] as 'income' | 'expense',
          amount: parseFloat(parts[3].replace(/,/g, '')),
          description: parts[4],
          category: parts[5],
        };
      })
      .filter(t => t !== null) as { date: string, type: 'income' | 'expense', amount: number, description: string, category: string }[];

    // Calculate totals
    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    let needsSpending = 0;
    let wantsSpending = 0;
    let savingsAndDebtSpending = 0;

    transactions.filter(t => t.type === 'expense').forEach(t => {
      if (NEEDS_CATEGORIES.includes(t.category)) {
        needsSpending += t.amount;
      } else if (WANTS_CATEGORIES.includes(t.category)) {
        wantsSpending += t.amount;
      } else if (SAVINGS_DEBT_CATEGORIES.includes(t.category)) {
        savingsAndDebtSpending += t.amount;
      }
    });

    if (totalIncome === 0) {
      return {
        score: 0,
        summary: "No income recorded. Please add income transactions to calculate your financial health score.",
        strengths: [],
        areasForImprovement: ["Add income transactions to get started."],
        calculationDetails: {
            totalIncome: 0,
            needsSpending: 0,
            wantsSpending: 0,
            savingsAndDebt: 0,
            needsPercentage: 0,
            wantsPercentage: 0,
            savingsAndDebtPercentage: 0
        }
      };
    }
    
    const remainingIncome = totalIncome - needsSpending - wantsSpending - savingsAndDebtSpending;
    const totalSavingsAndDebt = savingsAndDebtSpending + (remainingIncome > 0 ? remainingIncome : 0);

    const needsPercentage = (needsSpending / totalIncome) * 100;
    const wantsPercentage = (wantsSpending / totalIncome) * 100;
    const savingsAndDebtPercentage = (totalSavingsAndDebt / totalIncome) * 100;

    // Calculate score
    let score = 0;
    // Needs (Max 50 points)
    if (needsPercentage <= 50) score += 50;
    else score += Math.max(0, 50 - (needsPercentage - 50) * 2);
    
    // Wants (Max 30 points)
    if (wantsPercentage <= 30) score += 30;
    else score += Math.max(0, 30 - (wantsPercentage - 30) * 1.5);
    
    // Savings (Max 20 points)
    if (savingsAndDebtPercentage >= 20) score += 20;
    else score += Math.max(0, 20 - (20 - savingsAndDebtPercentage) * 1);

    const finalScore = Math.round(Math.max(0, Math.min(100, score)));

    // --- Step 2: Call AI for qualitative analysis ---
    const aiInput: z.infer<typeof AiInputSchema> = {
        score: finalScore,
        needsPercentage: parseFloat(needsPercentage.toFixed(1)),
        wantsPercentage: parseFloat(wantsPercentage.toFixed(1)),
        savingsAndDebtPercentage: parseFloat(savingsAndDebtPercentage.toFixed(1)),
        totalIncome
    };

    const maxRetries = 3;
    let attempt = 0;
    while (attempt < maxRetries) {
      try {
        const { output: analysis } = await prompt(aiInput);
        if (!analysis) {
            throw new Error("AI analysis returned no output.");
        }
        
        // --- Step 3: Combine calculated data with AI analysis ---
        return {
          score: finalScore,
          summary: analysis.summary,
          strengths: analysis.strengths,
          areasForImprovement: analysis.areasForImprovement,
          calculationDetails: {
            totalIncome,
            needsSpending,
            wantsSpending,
            savingsAndDebt: totalSavingsAndDebt,
            needsPercentage: parseFloat(needsPercentage.toFixed(1)),
            wantsPercentage: parseFloat(wantsPercentage.toFixed(1)),
            savingsAndDebtPercentage: parseFloat(savingsAndDebtPercentage.toFixed(1)),
          }
        };

      } catch (error: any) {
        attempt++;
        const isLastAttempt = attempt >= maxRetries;
        const isOverloaded = error.message && (error.message.includes('503') || error.message.includes('overloaded'));
        
        if (isOverloaded && !isLastAttempt) {
          const delay = Math.pow(2, attempt) * 1000;
          console.log(`Attempt ${attempt} failed with model overload. Retrying in ${delay / 1000}s...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          throw error;
        }
      }
    }
    throw new Error('Failed to calculate financial health score after multiple retries.');
  }
);
