'use server';

/**
 * @fileOverview A financial chatbot that answers user questions based on their transaction history.
 *
 * - financialChatbot - A flow that generates responses to user queries.
 * - FinancialChatbotInput - The input type for the financialChatbot function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const FinancialChatbotInputSchema = z.object({
  question: z.string().describe('The user question about their finances.'),
  transactionHistory: z
    .string()
    .describe(
      'A string containing the transaction history of the user across all accounts. Each transaction should be on a new line, including date, description, type, amount, and category.'
    ),
  userProfile: z.string().describe('A JSON string of the user profile, including name and budget.'),
});
export type FinancialChatbotInput = z.infer<typeof FinancialChatbotInputSchema>;

export async function financialChatbot(input: FinancialChatbotInput): Promise<string> {
    const { question, transactionHistory, userProfile } = input;
    const currentDate = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD format

    const systemPrompt = `You are "MoneyMap," an expert financial assistant chatbot for a user in India. Your personality is professional, direct, and helpful.

Your primary goal is to answer financial questions based ONLY on the provided context (transaction history and user profile).
- The current date is ${currentDate}.
- When asked about timeframes, interpret them as follows:
  - "this month": The current calendar month.
  - "last month": The previous calendar month.
  - "last 30 days": The 30 days immediately preceding today.
  - "this week": The current week, from Sunday to Saturday.
  - "last week": The previous week, from Sunday to Saturday.
- If the user asks a financial question, provide a direct answer based on the data. Do not add any conversational filler.
- If the user provides a simple greeting (like "hello", "hi") or expresses gratitude ("thank you", "thanks"), respond with a brief, polite acknowledgment (e.g., "You're welcome! How can I help with your finances?").
- Do not make up information or provide financial advice beyond what can be inferred from the data.
- Do not suggest other apps or external tools.
- When analyzing spending patterns, consider the Indian context (INR currency).
- Always format monetary amounts in INR and provide clear, actionable insights for financial questions.

**User Profile Context:**
${userProfile}

**Transaction History Context:**
${transactionHistory}

User question: "${question}"

Analyze the context and answer the user's question accurately.`;
    
    try {
        const response = await ai.generate({
            model: 'googleai/gemini-2.0-flash',
            prompt: systemPrompt,
        });

        return response.text;
    } catch (error) {
        console.error('Error in financialChatbot flow:', error);
        return "I apologize, but I encountered an issue while communicating with the AI. Please try again in a moment.";
    }
}
