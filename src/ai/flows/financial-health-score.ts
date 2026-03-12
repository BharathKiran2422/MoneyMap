'use server';
/**
 * @fileOverview Evaluates user financial health based on 50/30/20 rule.
 */

import {ai, callGeminiApi} from '@/ai/genkit';
import {z} from 'genkit';

const FinancialHealthScoreInputSchema = z.object({
  transactionHistory: z.string().describe('Detailed transaction history.'),
});
export type FinancialHealthScoreInput = z.infer<typeof FinancialHealthScoreInputSchema>;

const FinancialHealthScoreOutputSchema = z.object({
    score: z.number().min(0).max(100),
    summary: z.string(),
    strengths: z.array(z.string()),
    areasForImprovement: z.array(z.string()),
});
export type FinancialHealthScoreOutput = z.infer<typeof FinancialHealthScoreOutputSchema>;

export async function getFinancialHealthScore(input: FinancialHealthScoreInput): Promise<FinancialHealthScoreOutput> {
  return financialHealthScoreFlow(input);
}

const financialHealthScoreFlow = ai.defineFlow(
  {
    name: 'financialHealthScoreFlow',
    inputSchema: FinancialHealthScoreInputSchema,
    outputSchema: FinancialHealthScoreOutputSchema,
  },
  async (input) => {
    const NEEDS_CATEGORIES = ['Groceries', 'Utilities', 'Transport', 'Rent', 'Health & Wellness', 'Education'];
    const WANTS_CATEGORIES = ['Food & Dining', 'Shopping', 'Entertainment', 'Travel', 'Other Expense'];
    const SAVINGS_DEBT_CATEGORIES = ['EMI', 'Investment'];

    const transactions = input.transactionHistory.split('\n')
      .map(line => {
        const parts = line.match(/^(\d{4}-\d{2}-\d{2}): (income|expense) of ([\d,.]+) for '([^']*)' in category '([^']*)'$/);
        if (!parts) return null;
        return {
          type: parts[2] as 'income' | 'expense',
          amount: parseFloat(parts[3].replace(/,/g, '')),
          category: parts[5],
        };
      })
      .filter(t => t !== null) as any[];

    const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    let needsS = 0, wantsS = 0, savingsS = 0;

    transactions.filter(t => t.type === 'expense').forEach(t => {
      if (NEEDS_CATEGORIES.includes(t.category)) needsS += t.amount;
      else if (WANTS_CATEGORIES.includes(t.category)) wantsS += t.amount;
      else if (SAVINGS_DEBT_CATEGORIES.includes(t.category)) savingsS += t.amount;
    });

    if (totalIncome === 0) {
      return { 
        score: 0, 
        summary: "We need income data to calculate your health score.", 
        strengths: ["Added the module!"], 
        areasForImprovement: ["Add your income transactions to see your score."] 
      };
    }
    
    const needsP = (needsS / totalIncome) * 100;
    const wantsP = (wantsS / totalIncome) * 100;
    const remaining = totalIncome - (needsS + wantsS + savingsS);
    const savingsP = ((savingsS + Math.max(0, remaining)) / totalIncome) * 100;

    let score = 0;
    score += needsP <= 50 ? 50 : Math.max(0, 50 - (needsP - 50) * 2);
    score += wantsP <= 30 ? 30 : Math.max(0, 30 - (wantsP - 30) * 1.5);
    score += savingsP >= 20 ? 20 : Math.max(0, 20 - (20 - savingsP) * 1);
    const finalScore = Math.round(score);

    const prompt = `You are a financial health analyst for "MoneyMap" India. Provide a qualitative analysis based on these metrics:
Score: ${finalScore}/100
Current Mix: Needs ${needsP.toFixed(1)}%, Wants ${wantsP.toFixed(1)}%, Savings ${savingsP.toFixed(1)}%
Target Mix: Needs 50%, Wants 30%, Savings 20%

Return ONLY a JSON object: 
{
  "summary": "One sentence summary of their status",
  "strengths": ["string", "string"],
  "areasForImprovement": ["string", "string"]
}`;

    try {
      const responseText = await callGeminiApi(prompt);
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      const analysis = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);
      
      return {
        score: finalScore,
        summary: analysis.summary,
        strengths: analysis.strengths,
        areasForImprovement: analysis.areasForImprovement,
      };
    } catch (error) {
      console.error('Health score AI failed:', error);
      return { 
        score: finalScore, 
        summary: "Deterministic calculation complete. AI analysis unavailable.", 
        strengths: ["Calculated budget split."], 
        areasForImprovement: ["Retry analysis later for tips."] 
      };
    }
  }
);
