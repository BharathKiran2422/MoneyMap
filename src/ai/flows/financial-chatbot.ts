'use server';

/**
 * @fileOverview Conversational assistant for financial queries.
 */

import { ai, callGeminiApi } from '@/ai/genkit';
import { z } from 'genkit';

const FinancialChatbotInputSchema = z.object({
  question: z.string().describe('The user question.'),
  transactionHistory: z.string().describe('Contextual transaction history.'),
  userProfile: z.string().describe('User profile summary.'),
});
export type FinancialChatbotInput = z.infer<typeof FinancialChatbotInputSchema>;

export async function financialChatbot(input: FinancialChatbotInput): Promise<string> {
    const { question, transactionHistory, userProfile } = input;
    const currentDate = new Date().toLocaleDateString('en-IN');

    const prompt = `You are "MoneyMap AI," an expert personal finance assistant for a user in India. 

**Context:**
Date: ${currentDate}
User Profile: ${userProfile}
Transaction Data:
${transactionHistory}

**Rules:**
1. Answer based ONLY on the provided transaction data.
2. If the user asks for "top expenses," identify the largest amounts.
3. If they ask for "spending trends," compare amounts over time if data exists.
4. Format all currency in INR (₹).
5. Be concise, professional, and helpful.
6. If the data is missing, ask the user to add more transactions to specific accounts.

User Question: "${question}"`;
    
    try {
        return await callGeminiApi(prompt);
    } catch (error) {
        console.error('Chatbot error:', error);
        return "I'm having trouble connecting to my brain right now. Please try again in a moment!";
    }
}
