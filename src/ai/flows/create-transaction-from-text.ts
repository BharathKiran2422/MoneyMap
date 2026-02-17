
'use server';
/**
 * @fileOverview Creates a financial transaction from a natural language text input,
 * using a robust fallback parser. The AI is only used for categorization.
 */
import {categorizeTransaction, CategorizeTransactionInput} from './categorize-transaction';
import { z } from 'zod';
import { subMonths, startOfMonth, setDate, subDays, startOfWeek } from 'date-fns';


// Input and Output types remain the same for the client
export type CreateTransactionFromTextInput = {
  text: string;
};

export type CreateTransactionFromTextOutput = {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  date: Date;
};

// Preprocessing for Indian number formats
function preprocessIndianText(text: string): string {
  let processed = text.toLowerCase();
  processed = processed.replace(/(\d+(?:\.\d+)?)k/g, (_, num) => (parseFloat(num) * 1000).toString());
  processed = processed.replace(/(\d+(?:\.\d+)?)\s*lakh/g, (_, num) => (parseFloat(num) * 100000).toString());
  processed = processed.replace(/(\d+(?:\.\d+)?)\s*crore/g, (_, num) => (parseFloat(num) * 10000000).toString());
  return processed;
}

// Fallback parser for when AI fails or is not used
function fallbackParseTransaction(text: string) {
  const lowerText = text.toLowerCase();
  const amountMatch = lowerText.match(/\d+(?:\.\d+)?/);
  
  if (!amountMatch || !amountMatch[0]) {
    throw new Error("AMOUNT_NOT_FOUND");
  }
  const amount = parseFloat(amountMatch[0]);

  const expenseKeywords = /\b(spent|paid|bought|purchase|cost|expense|bill|fee|charge|debit|withdraw|loss|lose)\b/;
  const incomeKeywords = /\b(earned|received|salary|income|got|profit|bonus|refund|credit|deposit|gain|win|won)\b/;
  const type = incomeKeywords.test(lowerText) ? 'income' : 'expense';

  let date = new Date(); // Defaults to today
  if (lowerText.includes('yesterday') || lowerText.includes('last night')) {
    date = subDays(date, 1);
  } else if (lowerText.includes('last week')) {
    // Set date to the middle of last week
    date = startOfWeek(subDays(date, 7)); // Start of last week
    date = setDate(date, date.getDate() + 3); // Middle of week
  } else if (lowerText.includes('last month')) {
    // Set date to the 15th of last month
    date = startOfMonth(subMonths(date, 1));
    date = setDate(date, 15);
  } else if (lowerText.includes('this month')) {
    // No change, defaults to today which is in "this month"
  } else if (lowerText.includes('last weekend')) {
      const todayDay = date.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
      const diff = todayDay >= 6 ? todayDay - 6 : todayDay + 1; // days to subtract to get to last Saturday
      date.setDate(date.getDate() - diff);
  } else {
      const dayMatch = lowerText.match(/last (monday|tuesday|wednesday|thursday|friday|saturday|sunday)/);
      if (dayMatch) {
          const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
          const targetDay = weekdays.indexOf(dayMatch[1]);
          const todayDay = date.getDay();
          let diff = todayDay - targetDay;
          if (diff <= 0) {
              diff += 7;
          }
          date.setDate(date.getDate() - diff);
      }
  }
  
  const fillerWordsRegex = /\b(on|for|at|a|an|the|of|was|were|from|in|with|to|is|are|my|i|last month|this month|last week|last night|yesterday|last (monday|tuesday|wednesday|thursday|friday|saturday|sunday|weekend))\b/gi;
  let description = text.replace(/rs\.?|rupees|inr/gi, '')
                        .replace(/\d+(?:\.\d+)?k?/gi, '')
                        .replace(expenseKeywords, '')
                        .replace(incomeKeywords, '')
                        .replace(fillerWordsRegex, '')
                        .replace(/\s+/g, ' ')
                        .trim();

  description = description.charAt(0).toUpperCase() + description.slice(1);

  if (!description) {
    description = type === 'income' ? 'Income' : 'Expense';
  }

  return {
    amount,
    type,
    date: date.toISOString().split('T')[0],
    description,
  };
}


// The main exported function
export async function createTransactionFromText(input: CreateTransactionFromTextInput): Promise<CreateTransactionFromTextOutput> {
  const processedText = preprocessIndianText(input.text);
  let transactionData;

  try {
    // Use fallback parser directly
    transactionData = fallbackParseTransaction(processedText);
    console.log('Fallback parsing successful:', transactionData);
  } catch (fallbackError: any) {
    console.error('Fallback parser failed:', fallbackError);
    if (fallbackError.message === "AMOUNT_NOT_FOUND") {
      throw new Error("Please specify an amount in your transaction (e.g., 'spent 200 on coffee' or 'earned 5000 salary')");
    }
    throw new Error(`Could not parse transaction from: "${input.text}". Please try rephrasing.`);
  }

  // Categorize the transaction using AI
  try {
    const categorizationInput: CategorizeTransactionInput = {
      description: transactionData.description,
      type: transactionData.type,
    };
    const { category } = await categorizeTransaction(categorizationInput);
    const transactionDate = new Date(transactionData.date);

    // Ensure date is not in the future
    if (transactionDate > new Date()) {
        const currentYear = new Date().getFullYear();
        if (transactionDate.getFullYear() > currentYear) {
            transactionDate.setFullYear(currentYear);
        }
    }

    return {
      id: '', // Will be set on the client
      description: transactionData.description,
      amount: transactionData.amount,
      type: transactionData.type,
      category: category,
      date: transactionDate,
    };
  } catch (error) {
    console.error('Categorization failed:', error);
    // Return with a default category if categorization fails
    return {
      id: '',
      description: transactionData.description,
      amount: transactionData.amount,
      type: transactionData.type,
      category: transactionData.type === 'expense' ? 'Other Expense' : 'Other Income',
      date: new Date(transactionData.date),
    };
  }
}
