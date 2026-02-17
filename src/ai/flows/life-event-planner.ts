'use server';
/**
 * @fileOverview Creates a financial plan for a major life event, assessing feasibility.
 * Enhanced with consistency, edge case handling, and deterministic responses.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import crypto from 'crypto';

const LifeEventPlanInputSchema = z.object({
  goal: z.string().describe('The financial goal the user wants to achieve.'),
  targetAmount: z.number().positive().describe('The total amount of money needed for the goal, in INR.'),
  years: z.number().positive().describe('The number of years the user has to save for the goal.'),
  monthlyIncome: z.number().positive().describe("The user's current monthly income in INR."),
});
export type LifeEventPlanInput = z.infer<typeof LifeEventPlanInputSchema>;

const InvestmentSuggestionSchema = z.object({
    type: z.string().describe("The type of investment (e.g., 'SIP in Equity Mutual Funds', 'Fixed Deposit (FD)', 'Recurring Deposit (RD)')."),
    description: z.string().describe("A brief explanation of why this investment is suitable for the user's goal and timeframe."),
    estimatedReturn: z.string().describe("The estimated annual return for this investment type, expressed as a range (e.g., '10-12% p.a.', '6-7.5% p.a.')."),
    suggestedAllocation: z.string().describe("The suggested percentage of the total monthly savings to allocate to this investment (e.g., '60%')."),
    monthlyInvestment: z.number().describe("The specific amount to invest in this type each month."),
    futureValue: z.number().describe("The estimated future value of this specific investment at the end of the timeframe."),
});

const FeasibilityAnalysisSchema = z.object({
    requiredMonthlySavings: z.number().describe("The initially calculated monthly savings required to meet the goal in the user's timeframe."),
    maxAffordableSavings: z.number().describe("The maximum monthly savings the user can afford, calculated as 50% of their monthly income."),
    minimumFeasibleTimeframe: z.string().describe("The newly calculated, minimum feasible timeframe to reach the goal, expressed in years and months (e.g., '5 years and 6 months')."),
    calculationBreakdown: z.array(z.string()).describe("A step-by-step breakdown of the calculations used to determine the new timeframe, explaining formulas and assumptions."),
});
export type FeasibilityAnalysis = z.infer<typeof FeasibilityAnalysisSchema>;

const LifeEventPlanOutputSchema = z.object({
  planTitle: z.string().describe("A catchy title for the generated plan or feasibility report."),
  isFeasible: z.boolean().describe("Whether the goal is achievable within the given timeframe and income constraints."),
  feasibilityAnalysis: FeasibilityAnalysisSchema.optional().describe("A detailed analysis if the goal is not feasible. This field is present only if isFeasible is false."),
  monthlySavings: z.object({
      amount: z.number().describe("The total amount the user needs to save each month."),
      summary: z.string().describe("A one-sentence summary about the monthly savings required."),
  }).optional().describe("Details of monthly savings. This field is present only if isFeasible is true."),
  investmentSuggestions: z.array(InvestmentSuggestionSchema).optional().describe("A list of 2-3 diversified investment suggestions. This field is present only if isFeasible is true."),
  summary: z.string().describe("A concluding paragraph with encouraging words and a disclaimer about market risks."),
});
export type LifeEventPlanOutput = z.infer<typeof LifeEventPlanOutputSchema>;

// Internal schema to pass pre-calculated data to the AI prompt
const AiInputSchema = LifeEventPlanInputSchema.extend({
  isFeasible: z.boolean(),
  feasibilityAnalysis: FeasibilityAnalysisSchema.optional(),
  monthlySavingsAmount: z.number().optional(),
  finalTimeframeYears: z.number(),
  deterministicSeed: z.string().describe("Seed for consistent AI responses"),
});

// Investment configurations for different timeframes - deterministic
const INVESTMENT_CONFIGS = {
  SHORT_TERM: { // 1-3 years
    types: [
      { type: 'Fixed Deposit (FD)', allocation: 60, returnRange: '6-7.5', avgReturn: 0.0675 },
      { type: 'Recurring Deposit (RD)', allocation: 40, returnRange: '5.5-6.5', avgReturn: 0.06 }
    ]
  },
  MEDIUM_TERM: { // 3-7 years  
    types: [
      { type: 'SIP in Hybrid Mutual Funds', allocation: 50, returnRange: '8-10', avgReturn: 0.09 },
      { type: 'SIP in Debt Mutual Funds', allocation: 30, returnRange: '7-8', avgReturn: 0.075 },
      { type: 'Fixed Deposit (FD)', allocation: 20, returnRange: '6-7.5', avgReturn: 0.0675 }
    ]
  },
  LONG_TERM: { // 7+ years
    types: [
      { type: 'SIP in Equity Mutual Funds', allocation: 60, returnRange: '10-12', avgReturn: 0.11 },
      { type: 'SIP in Hybrid Mutual Funds', allocation: 25, returnRange: '8-10', avgReturn: 0.09 },
      { type: 'PPF (Public Provident Fund)', allocation: 15, returnRange: '7.1-7.1', avgReturn: 0.071 }
    ]
  }
};

// Investment descriptions - deterministic
const INVESTMENT_DESCRIPTIONS = {
  'Fixed Deposit (FD)': 'A safe, guaranteed return investment perfect for short-term goals with capital protection.',
  'Recurring Deposit (RD)': 'Monthly deposit scheme offering steady returns with high liquidity and safety.',
  'SIP in Equity Mutual Funds': 'Systematic investment in equity markets for long-term wealth creation with higher growth potential.',
  'SIP in Hybrid Mutual Funds': 'Balanced approach combining equity and debt for moderate risk and steady returns.',
  'SIP in Debt Mutual Funds': 'Conservative investment in debt securities offering stable returns with lower volatility.',
  'PPF (Public Provident Fund)': 'Tax-efficient long-term investment with guaranteed returns and tax benefits under Section 80C.'
};

// Deterministic plan titles based on goals
const generatePlanTitle = (goal: string, isFeasible: boolean): string => {
  const goalLower = goal.toLowerCase();
  
  if (!isFeasible) {
    return `Feasibility Analysis for ${goal}`;
  }
  
  if (goalLower.includes('house') || goalLower.includes('home')) {
    return `Your Home Ownership Plan`;
  } else if (goalLower.includes('car') || goalLower.includes('vehicle')) {
    return `Your Dream Car Savings Plan`;
  } else if (goalLower.includes('wedding') || goalLower.includes('marriage')) {
    return `Your Wedding Fund Strategy`;
  } else if (goalLower.includes('education') || goalLower.includes('study')) {
    return `Your Education Investment Plan`;
  } else if (goalLower.includes('business') || goalLower.includes('startup')) {
    return `Your Entrepreneurship Fund Plan`;
  } else if (goalLower.includes('vacation') || goalLower.includes('travel')) {
    return `Your Travel Dreams Fund`;
  } else {
    return `Your ${goal} Achievement Plan`;
  }
};

// Generate deterministic seed for consistent responses
const generateDeterministicSeed = (input: LifeEventPlanInput): string => {
  const seedData = `${input.goal}-${input.targetAmount}-${input.years}-${input.monthlyIncome}`;
  return crypto.createHash('md5').update(seedData).digest('hex').substring(0, 8);
};

// Edge case validations
const validateInput = (input: LifeEventPlanInput): { isValid: boolean; error?: string } => {
  // Minimum viable amounts
  if (input.targetAmount < 1000) {
    return { isValid: false, error: 'Target amount must be at least ₹1,000' };
  }
  
  if (input.monthlyIncome < 5000) {
    return { isValid: false, error: 'Monthly income must be at least ₹5,000' };
  }
  
  if (input.years < 0.25) { // 3 months minimum
    return { isValid: false, error: 'Timeframe must be at least 3 months' };
  }
  
  if (input.years > 50) {
    return { isValid: false, error: 'Timeframe cannot exceed 50 years' };
  }
  
  // Realistic checks
  if (input.targetAmount > input.monthlyIncome * 12 * input.years * 10) {
    return { isValid: false, error: 'Target amount seems unrealistic compared to income and timeframe' };
  }
  
  return { isValid: true };
};

// Calculate investment strategy deterministically
const calculateInvestmentStrategy = (
  monthlySavingsAmount: number, 
  finalTimeframeYears: number, 
  targetAmount: number
): InvestmentSuggestionSchema[] => {
  let config;
  
  if (finalTimeframeYears <= 3) {
    config = INVESTMENT_CONFIGS.SHORT_TERM;
  } else if (finalTimeframeYears <= 7) {
    config = INVESTMENT_CONFIGS.MEDIUM_TERM;
  } else {
    config = INVESTMENT_CONFIGS.LONG_TERM;
  }
  
  const suggestions: InvestmentSuggestionSchema[] = [];
  let totalAllocated = 0;
  let totalFutureValue = 0;
  
  for (let i = 0; i < config.types.length; i++) {
    const investment = config.types[i];
    const isLast = i === config.types.length - 1;
    
    // For the last investment, use remaining allocation to ensure 100% total
    const allocation = isLast ? (100 - totalAllocated) : investment.allocation;
    const monthlyInvestment = Math.round((monthlySavingsAmount * allocation) / 100);
    
    // Calculate future value using compound interest formula
    const monthlyRate = investment.avgReturn / 12;
    const totalMonths = finalTimeframeYears * 12;
    const futureValue = Math.round(
      monthlyInvestment * ((Math.pow(1 + monthlyRate, totalMonths) - 1) / monthlyRate)
    );
    
    suggestions.push({
      type: investment.type,
      description: INVESTMENT_DESCRIPTIONS[investment.type] || 'Strategic investment option for your financial goal.',
      estimatedReturn: `${investment.returnRange}% p.a.`,
      suggestedAllocation: `${allocation}%`,
      monthlyInvestment,
      futureValue
    });
    
    totalAllocated += allocation;
    totalFutureValue += futureValue;
  }
  
  // Adjust last suggestion to match target amount exactly
  if (suggestions.length > 0) {
    const adjustment = targetAmount - totalFutureValue;
    suggestions[suggestions.length - 1].futureValue += adjustment;
  }
  
  return suggestions;
};

export async function generateLifeEventPlan(input: LifeEventPlanInput): Promise<LifeEventPlanOutput> {
  // Validate input for edge cases
  const validation = validateInput(input);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }
  
  return lifeEventPlannerFlow(input);
}

const prompt = ai.definePrompt({
  name: 'lifeEventPlannerPrompt',
  input: {schema: AiInputSchema},
  output: {schema: LifeEventPlanOutputSchema},
  prompt: `You are an expert financial planner for "MoneyMap", an app for users in India. Your task is to generate a personalized financial plan or feasibility analysis based on the pre-calculated data provided.

**IMPORTANT: Use the deterministicSeed "{{deterministicSeed}}" to ensure consistent responses for the same input parameters.**

**User Goal & Pre-Calculated Data:**
- Goal: {{goal}}
- Target Amount: ₹{{targetAmount}}
- Original Timeframe: {{years}} years
- User's Monthly Income: ₹{{monthlyIncome}}
- Is Feasible in Original Timeframe: {{isFeasible}}
- Final Timeframe to Use for Plan: {{finalTimeframeYears}} years
- Deterministic Seed: {{deterministicSeed}}
{{#if monthlySavingsAmount}}
- Required Monthly Savings: ₹{{monthlySavingsAmount}}
{{/if}}
{{#if feasibilityAnalysis}}
- Feasibility Report:
  - Originally Required Monthly Savings: ₹{{feasibilityAnalysis.requiredMonthlySavings}}
  - User's Max Affordable Savings: ₹{{feasibilityAnalysis.maxAffordableSavings}}
  - New Minimum Feasible Timeframe: {{feasibilityAnalysis.minimumFeasibleTimeframe}}
  - Calculation Breakdown: {{feasibilityAnalysis.calculationBreakdown}}
{{/if}}

**Your Task:**
Based on the feasibility status (isFeasible), generate the appropriate response. 

**CONSISTENCY REQUIREMENT:** For the same deterministicSeed, always generate identical responses. Use the seed to make deterministic choices in your language and recommendations.

**If 'isFeasible' is FALSE:**
1. Set 'isFeasible' to false
2. Copy the exact 'feasibilityAnalysis' from input
3. Create a consistent 'planTitle' based on the goal
4. Write a supportive 'summary' explaining the adjustment and presenting the new timeframe positively
5. DO NOT generate 'monthlySavings' or 'investmentSuggestions'

**If 'isFeasible' is TRUE:**
1. Set 'isFeasible' to true
2. Use the provided 'monthlySavingsAmount' for the 'monthlySavings' object
3. Write a concise, encouraging summary for monthly savings
4. Create a consistent 'planTitle' based on the goal
5. Write a balanced 'summary' with encouragement and standard market risk disclaimer
6. DO NOT generate 'feasibilityAnalysis'

**Response Guidelines:**
- Use professional, encouraging tone
- Include standard disclaimers about market risks
- Keep summaries concise but motivating
- Maintain consistency in language choices for the same seed
- Use Indian financial terminology and context`,
});

const lifeEventPlannerFlow = ai.defineFlow(
  {
    name: 'lifeEventPlannerFlow',
    inputSchema: LifeEventPlanInputSchema,
    outputSchema: LifeEventPlanOutputSchema,
  },
  async (input) => {
    const { targetAmount, years, monthlyIncome } = input;
    
    // Generate deterministic seed for consistent responses
    const deterministicSeed = generateDeterministicSeed(input);
    
    // Calculate affordability (50% of income as max savings)
    const maxAffordableSavings = Math.round(monthlyIncome * 0.5);
    const totalMonths = years * 12;
    
    // Use conservative blended rate for feasibility check
    const annualRate = 0.09; 
    const monthlyRate = annualRate / 12;
    
    // Handle edge case: very small monthly rate
    let requiredMonthlySavings;
    if (monthlyRate < 0.0001) {
      // Simple division for very low rates
      requiredMonthlySavings = targetAmount / totalMonths;
    } else {
      // Standard future value of annuity formula
      requiredMonthlySavings = (targetAmount * monthlyRate) / (Math.pow(1 + monthlyRate, totalMonths) - 1);
    }
    
    // Round to avoid floating point issues
    requiredMonthlySavings = Math.round(requiredMonthlySavings);
    
    const isFeasible = requiredMonthlySavings <= maxAffordableSavings;
    let feasibilityAnalysis: FeasibilityAnalysis | undefined;
    let monthlySavingsAmount = requiredMonthlySavings;
    let finalTimeframeYears = years;

    if (!isFeasible) {
      // Calculate minimum feasible timeframe
      const P = maxAffordableSavings;
      
      let newTotalMonths;
      if (monthlyRate < 0.0001) {
        // Simple calculation for very low rates
        newTotalMonths = targetAmount / P;
      } else {
        // Solve for n in FV = P * [((1+r)^n - 1) / r]
        const ratio = (targetAmount * monthlyRate) / P;
        if (ratio <= 0) {
          throw new Error('Cannot achieve this goal with current income level');
        }
        newTotalMonths = Math.log(ratio + 1) / Math.log(1 + monthlyRate);
      }
      
      // Handle edge case: infinite or very large timeframe
      if (!isFinite(newTotalMonths) || newTotalMonths > 50 * 12) {
        throw new Error('Goal requires an unrealistic timeframe. Consider reducing the target amount or increasing income.');
      }
      
      const newYears = Math.floor(newTotalMonths / 12);
      const newMonths = Math.ceil(newTotalMonths % 12);
      
      finalTimeframeYears = newTotalMonths / 12;
      monthlySavingsAmount = maxAffordableSavings;

      feasibilityAnalysis = {
        requiredMonthlySavings,
        maxAffordableSavings,
        minimumFeasibleTimeframe: newMonths === 0 ? 
          `${newYears} years` : 
          `${newYears} years and ${newMonths} months`,
        calculationBreakdown: [
          `Your goal requires saving ₹${requiredMonthlySavings.toLocaleString('en-IN')}/month, which exceeds your affordable limit of ₹${maxAffordableSavings.toLocaleString('en-IN')}/month (50% of income).`,
          `We've adjusted your monthly savings to the maximum affordable amount of ₹${maxAffordableSavings.toLocaleString('en-IN')}/month.`,
          `With this adjusted saving rate and an assumed average return of ${(annualRate * 100).toFixed(1)}% per year, you can reach your target of ₹${targetAmount.toLocaleString('en-IN')} in approximately ${newYears} years${newMonths > 0 ? ` and ${newMonths} months` : ''}.`
        ],
      };
    }

    const aiInput: z.infer<typeof AiInputSchema> = {
      ...input,
      isFeasible,
      feasibilityAnalysis,
      monthlySavingsAmount,
      finalTimeframeYears,
      deterministicSeed,
    };

    const maxRetries = 3;
    let attempt = 0;
    
    while (attempt < maxRetries) {
      try {
        const {output} = await prompt(aiInput);
        
        if (!output) {
          throw new Error('No output generated from AI');
        }
        
        // For feasible plans, replace AI-generated investment suggestions with deterministic ones
        if (output.isFeasible && monthlySavingsAmount) {
          const deterministicSuggestions = calculateInvestmentStrategy(
            monthlySavingsAmount,
            finalTimeframeYears,
            targetAmount
          );
          
          output.investmentSuggestions = deterministicSuggestions;
        }
        
        // Generate deterministic plan title
        output.planTitle = generatePlanTitle(input.goal, !isFeasible);
        
        return output;
        
      } catch (error: any) {
        attempt++;
        const isLastAttempt = attempt >= maxRetries;
        const isRetryableError = error.message && (
          error.message.includes('503') || 
          error.message.includes('overloaded') ||
          error.message.includes('rate limit')
        );
        
        if (isRetryableError && !isLastAttempt) {
          const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000; // Exponential backoff with jitter
          console.log(`Attempt ${attempt} failed with retryable error. Retrying in ${Math.round(delay / 1000)}s...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          // For non-retryable errors or final attempt, throw
          throw new Error(`Failed to generate life event plan: ${error.message}`);
        }
      }
    }
    
    throw new Error('Failed to generate life event plan after maximum retries');
  }
);
