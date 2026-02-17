'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/auth';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, doc, getDoc, Timestamp, updateDoc, where } from 'firebase/firestore';
import { Transaction, UserProfile, Account } from '@/types';
import { Button } from '@/components/ui/button';
import { getSpendingSuggestions } from '@/ai/flows/spending-suggestions';
import { Lightbulb, Loader2, ArrowLeft, Sparkles, FileText, HeartPulse, Map, CalendarDays } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { useRouter, useSearchParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import FinancialHealthScore from '@/components/dashboard/FinancialHealthScore';
import LifeEventPlanner from '@/components/dashboard/LifeEventPlanner';
import MonthlyReport from '@/components/dashboard/MonthlyReport';

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

export default function InsightsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [reportData, setReportData] = useState<{ report: string; generatedAt: string; } | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState('report');

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['report', 'health-score', 'event-planner', 'monthly-report'].includes(tab)) {
        setActiveTab(tab);
    } else {
        // If tab is invalid or not present, set default and update URL
        router.replace('/dashboard/insights?tab=report', { scroll: false });
    }
  }, [searchParams, router]);

  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    router.push(`/dashboard/insights?tab=${newTab}`, { scroll: false });
  };


  useEffect(() => {
    if (!user || !db) return;

    const fetchAllData = async () => {
      setLoadingData(true);
      try {
        // Fetch user profile for budget and saved report
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const data = userDoc.data() as UserProfile;
          setUserProfile(data);
          if (data.aiFinancialReport?.report) {
            setReportData({
              report: data.aiFinancialReport.report,
              generatedAt: data.aiFinancialReport.generatedAt,
            });
          }
        }

        // Fetch all accounts
        const accountsSnapshot = await getDocs(collection(db, 'users', user.uid, 'accounts'));
        const accountsData: Account[] = accountsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Account));

        // Fetch transactions for ALL accounts
        const transactionsList: Transaction[] = [];
        const transactionPromises = accountsData.map(account => {
            const transactionsQuery = query(
                collection(db, 'users', user.uid, 'accounts', account.id, 'transactions')
            );
            return getDocs(transactionsQuery).then(snapshot => {
                snapshot.docs.forEach(doc => {
                    const data = doc.data();
                    transactionsList.push({
                        id: doc.id,
                        ...data,
                        date: (data.date as Timestamp).toDate(),
                    } as Transaction);
                });
            });
        });

        await Promise.all(transactionPromises);
        setAllTransactions(transactionsList.sort((a, b) => b.date.getTime() - a.date.getTime()));
      } catch (error) {
        console.error("Error fetching data for insights:", error);
        toast({ title: "Error", description: "Could not load data for AI Insights.", variant: "destructive" });
      } finally {
        setLoadingData(false);
      }
    };

    fetchAllData();
  }, [user, toast]);

  const handleGenerateReport = async () => {
    if (!user || !db) return;

    setLoadingReport(true);
    setReportData(null);
    try {
      const transactionHistory = allTransactions
        .map(t => `${format(new Date(t.date), 'yyyy-MM-dd')}: ${t.type === 'expense' ? '-' : '+'}₹${t.amount.toFixed(2)} for ${t.description}`)
        .join('\n');
      
      const budget = userProfile?.monthlyBudget ?? 0;
      
      const result = await getSpendingSuggestions({
        transactionHistory,
        currentBudget: budget,
      });
      
      const newReportData = {
        report: result.suggestions,
        generatedAt: new Date().toISOString()
      };
      setReportData(newReportData);

      // Save report to Firebase
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, { aiFinancialReport: newReportData });

    } catch (error) {
      console.error(error);
      toast({
        title: 'Error generating report',
        description: 'Could not get AI report at this time. Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setLoadingReport(false);
    }
  };

  const displayReport = useMemo(() => formatAiResponse(reportData?.report || ''), [reportData]);

  return (
    <div className="space-y-8">
        <Button variant="outline" onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
        </Button>

        <div className="space-y-8">
            <div className="max-w-4xl mx-auto text-center space-y-2">
                <div className="inline-flex items-center justify-center gap-3">
                    <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 text-white shadow-lg">
                      <Lightbulb className="h-8 w-8" />
                    </div>
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  AI Financial Co-Pilot
                </h1>
                <p className="text-lg text-muted-foreground">
                    Get personalized advice by letting our AI analyze your entire transaction history across all accounts.
                </p>
            </div>
            
            <div className="max-w-7xl mx-auto flex flex-col">
                {loadingData ? (
                    <div className="flex flex-col items-center justify-center h-64">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="mt-4 text-muted-foreground">Loading your financial data...</p>
                    </div>
                ) : (
                    <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
                        <TabsList className="grid w-full grid-cols-4 max-w-4xl mx-auto h-12">
                            <TabsTrigger value="report" className="h-full text-base gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                                <FileText className="h-5 w-5" />
                                Financial Report
                            </TabsTrigger>
                            <TabsTrigger value="health-score" className="h-full text-base gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                                <HeartPulse className="h-5 w-5" />
                                Health Score
                            </TabsTrigger>
                            <TabsTrigger value="event-planner" className="h-full text-base gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                                <Map className="h-5 w-5" />
                                Life Event Plan
                            </TabsTrigger>
                            <TabsTrigger value="monthly-report" className="h-full text-base gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                                <CalendarDays className="h-5 w-5" />
                                Monthly Report
                            </TabsTrigger>
                        </TabsList>
                        <TabsContent value="report" className="flex flex-col items-center max-w-4xl mx-auto">
                          <div className="flex-grow min-h-[300px] relative overflow-hidden rounded-xl border-0 shadow-xl bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-950 p-6 w-full">
                              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5" />
                              <div className="relative h-full">
                                {loadingReport ? (
                                    <div className="flex flex-col items-center justify-center h-full text-center">
                                        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                                        <p className="text-foreground">Analyzing your spending habits...</p>
                                        <p className="text-xs text-muted-foreground mt-1">This may take a moment.</p>
                                    </div>
                                ) : reportData ? (
                                    <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed prose prose-sm dark:prose-invert max-w-none prose-headings:font-semibold prose-strong:font-semibold">
                                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{displayReport}</ReactMarkdown>
                                    </div>
                                ) : (
                                    <div className="text-center text-muted-foreground flex flex-col items-center justify-center h-full p-8">
                                        <FileText className="h-12 w-12 mb-4 text-primary/30" />
                                        <h3 className="font-semibold text-lg text-foreground mb-2">Ready for your financial check-up?</h3>
                                        <p className="max-w-md">Click the button below to get personalized advice based on your entire transaction history.</p>
                                    </div>
                                )}
                              </div>
                          </div>
                          <div className="flex flex-col items-center mt-6 gap-2">
                            <Button onClick={handleGenerateReport} disabled={loadingReport || allTransactions.length === 0} className="w-full sm:w-auto" size="lg">
                                {loadingReport ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                {loadingReport ? 'Analyzing...' : reportData ? 'Regenerate Full Financial Report' : 'Generate Full Financial Report'}
                            </Button>
                            {reportData && reportData.generatedAt && (
                              <p className="text-xs text-muted-foreground">
                                Last generated: {format(new Date(reportData.generatedAt), "MMM d, yyyy 'at' p")}
                              </p>
                            )}
                          </div>
                        </TabsContent>
                        <TabsContent value="health-score" className="max-w-4xl mx-auto">
                            <FinancialHealthScore 
                                transactions={allTransactions}
                                userProfile={userProfile}
                            />
                        </TabsContent>
                        <TabsContent value="event-planner">
                            <LifeEventPlanner />
                        </TabsContent>
                        <TabsContent value="monthly-report">
                            <MonthlyReport allTransactions={allTransactions} />
                        </TabsContent>
                    </Tabs>
                )}
            </div>
        </div>
    </div>
  );
}
