
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Transaction, Account } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { getSpendingSuggestions } from '@/ai/flows/spending-suggestions';
import { Lightbulb, Loader2, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import Link from 'next/link';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/lib/auth';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type Props = {
  transactions: Transaction[];
  account: Account | null;
};

// Helper function to format the AI response
const formatAiResponse = (response: string): string => {
  try {
    const parsed = JSON.parse(response);
    if (Array.isArray(parsed)) {
      return parsed.map(item => {
        const key = Object.keys(item)[0];
        const value = item[key];
        // Reconstruct the markdown list item
        return `${key} ${value}`;
      }).join('\n');
    }
  } catch (e) {
    // Not a JSON string, or not in the expected format. Return as is.
  }
  return response;
};

export default function SmartSuggestions({ transactions, account }: Props) {
  const [suggestionsData, setSuggestionsData] = useState<{ suggestions: string; generatedAt: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (account?.aiSuggestions) {
      setSuggestionsData(account.aiSuggestions);
    } else {
      setSuggestionsData(null);
    }
  }, [account]);

  const handleGetSuggestions = async () => {
    if (!user || !account || !db) {
        toast({ title: "Error", description: "Cannot generate suggestions without a logged-in user and account.", variant: "destructive" });
        return;
    }

    setLoading(true);
    setSuggestionsData(null);
    try {
      const transactionHistory = transactions
        .map(t => `${format(new Date(t.date), 'yyyy-MM-dd')}: ${t.type === 'expense' ? '-' : '+'}₹${t.amount.toFixed(2)} for ${t.description}`)
        .join('\n');
      
      const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
      
      const result = await getSpendingSuggestions({
        transactionHistory,
        currentBudget: totalIncome, // Simplified: uses total income as budget reference
      });

      const newSuggestionsData = {
        suggestions: result.suggestions,
        generatedAt: new Date().toISOString()
      };
      setSuggestionsData(newSuggestionsData);

      // Save to Firebase
      const accountDocRef = doc(db, 'users', user.uid, 'accounts', account.id);
      await updateDoc(accountDocRef, {
        aiSuggestions: newSuggestionsData
      });

    } catch (error) {
      console.error(error);
      toast({
        title: 'Error fetching suggestions',
        description: 'Could not get AI suggestions at this time. Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const displaySuggestions = useMemo(() => formatAiResponse(suggestionsData?.suggestions || ''), [suggestionsData]);

  return (
    <Card className="h-full flex flex-col relative overflow-hidden border-0 shadow-xl bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-950">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5" />
      <CardHeader className="relative flex flex-row items-start justify-between pb-4">
        <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-500/10">
                <Lightbulb className="h-6 w-6 text-blue-600" />
            </div>
            <div>
                <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Smart Suggestions
                </CardTitle>
                <CardDescription className="text-sm text-muted-foreground mt-1">
                  Get AI-powered tips for this account.
                </CardDescription>
            </div>
        </div>
        <Button asChild variant="link" className="text-xs p-0 h-auto">
            <Link href="/dashboard/insights">
                Full Analysis
                <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
        </Button>
      </CardHeader>
      <CardContent className="relative flex-grow flex flex-col">
        <div className="flex-grow min-h-[250px] relative">
          <ScrollArea className="h-full pr-4">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : suggestionsData ? (
              <div className="text-sm text-muted-foreground leading-relaxed prose prose-sm dark:prose-invert max-w-none prose-headings:font-semibold prose-strong:font-semibold">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{displaySuggestions}</ReactMarkdown>
              </div>
            ) : (
              <div className="text-center text-muted-foreground flex flex-col items-center justify-center h-full">
                <Lightbulb className="h-12 w-12 mb-4 text-primary/30" />
                <p>Click the button to get financial advice for this account.</p>
              </div>
            )}
          </ScrollArea>
        </div>
        <div className="mt-4 shrink-0 flex flex-col items-center gap-2">
            <Button onClick={handleGetSuggestions} disabled={loading || transactions.length === 0} className="w-full">
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {loading ? 'Analyzing...' : suggestionsData ? 'Regenerate Suggestions' : 'Get Suggestions'}
            </Button>
            {suggestionsData && suggestionsData.generatedAt && (
              <p className="text-xs text-muted-foreground">
                Last generated: {format(new Date(suggestionsData.generatedAt), "MMM d, yyyy 'at' p")}
              </p>
            )}
        </div>
      </CardContent>
    </Card>
  );
}
