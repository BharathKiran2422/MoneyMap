'use server';
/**
 * @fileOverview Creates a financial plan for major life goals.
 */

import {ai, callGeminiApi} from '@/ai/genkit';
import {z} from 'genkit';

const LifeEventPlanInputSchema = z.object({
  goal: z.string(),
  targetAmount: z.number().positive(),
  years: z.number().positive(),
  monthlyIncome: z.number().positive(),
});
export type LifeEventPlanInput = z.infer<typeof LifeEventPlanInputSchema>;

const LifeEventPlanOutputSchema = z.object({
  planTitle: z.string(),
  isFeasible: z.boolean(),
  monthlySavings: z.object({
    amount: z.number(),
    summary: z.string()
  }),
  investmentSuggestions: z.array(z.object({
    type: z.string(),
    description: z.string(),
    estimatedReturn: z.string(),
    monthlyInvestment: z.number(),
    futureValue: z.number(),
    suggestedAllocation: z.string()
  })),
  summary: z.string(),
  feasibilityAnalysis: z.any().optional(),
});
export type LifeEventPlanOutput = z.infer<typeof LifeEventPlanOutputSchema>;

export async function generateLifeEventPlan(input: LifeEventPlanInput): Promise<LifeEventPlanOutput> {
  return lifeEventPlannerFlow(input);
}

const lifeEventPlannerFlow = ai.defineFlow(
  {
    name: 'lifeEventPlannerFlow',
    inputSchema: LifeEventPlanInputSchema,
    outputSchema: LifeEventPlanOutputSchema,
  },
  async (input) => {
    const { targetAmount, years, monthlyIncome, goal } = input;
    const totalMonths = years * 12;
    const annualRate = 0.10; 
    const monthlyRate = annualRate / 12;
    
    const requiredSavings = Math.round(targetAmount / ((Math.pow(1 + monthlyRate, totalMonths) - 1) / monthlyRate));
    const maxAffordable = Math.round(monthlyIncome * 0.4); 
    const isFeasible = requiredSavings <= maxAffordable;

    const prompt = `You are a financial planner for "MoneyMap" India. Generate a goal plan:
Goal: ${goal}
Target: ₹${targetAmount} in ${years} years
Monthly Income: ₹${monthlyIncome}
Calculated Monthly Savings Needed: ₹${requiredSavings}
Max Affordable (40%): ₹${maxAffordable}
Feasible: ${isFeasible}

IMPORTANT: All currency formatting in your text responses must use the ₹ (INR) symbol.

Return ONLY a JSON object with this exact structure:
{
  "planTitle": "Personalized Title",
  "isFeasible": boolean,
  "monthlySavings": { "amount": number, "summary": "brief summary using ₹" },
  "investmentSuggestions": [
    { 
      "type": "Asset Class (e.g. Index Funds)", 
      "description": "Why this choice?", 
      "estimatedReturn": "Percentage", 
      "monthlyInvestment": number, 
      "futureValue": number, 
      "suggestedAllocation": "XX% of Goal Savings" 
    }
  ],
  "summary": "Final encouraging advice using ₹",
  "feasibilityAnalysis": { 
    "requiredMonthlySavings": number, 
    "maxAffordableSavings": number,
    "minimumFeasibleTimeframe": "X years Y months",
    "calculationBreakdown": ["Step 1", "Step 2"]
  }
}`;

    try {
      const responseText = await callGeminiApi(prompt);
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      return JSON.parse(jsonMatch ? jsonMatch[0] : responseText);
    } catch (error) {
      console.error('Life event plan failed:', error);
      throw new Error('Failed to generate your plan. Please try again.');
    }
  }
);