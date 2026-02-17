
'use client';

import { useState, useEffect } from 'react';
import { Transaction, UserProfile, FinancialHealthScore as FinancialHealthScoreType } from '@/types';
import { useAuth } from '@/lib/auth';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { getFinancialHealthScore } from '@/ai/flows/financial-health-score';
import { Loader2, Sparkles, TrendingUp, TrendingDown, CheckCircle, AlertTriangle, HeartPulse } from 'lucide-react';

export default function FinancialHealthScore({ transactions, userProfile }: { transactions: Transaction[], userProfile: UserProfile | null }) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [scoreData, setScoreData] = useState<FinancialHealthScoreType | null>(userProfile?.financialHealthScore || null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (userProfile?.financialHealthScore) {
            setScoreData(userProfile.financialHealthScore);
        }
    }, [userProfile]);

    const handleCalculateScore = async () => {
        if (!user || !db) return;

        setLoading(true);
        try {
            const transactionHistory = transactions
                .map(t => `${format(new Date(t.date), 'yyyy-MM-dd')}: ${t.type} of ${t.amount} for '${t.description}' in category '${t.category || 'Uncategorized'}'`)
                .join('\n');
            
            const result = await getFinancialHealthScore({
                transactionHistory,
            });

            const newScoreData = {
                ...result,
                generatedAt: new Date().toISOString()
            };

            setScoreData(newScoreData);
            
            const userDocRef = doc(db, 'users', user.uid);
            await updateDoc(userDocRef, { financialHealthScore: newScoreData });

        } catch (error) {
            console.error(error);
            toast({
                title: 'Error generating score',
                description: 'Could not calculate your health score at this time.',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };
    
    const getProgressColorClass = (score: number) => {
        if (score >= 80) return 'bg-emerald-500';
        if (score >= 50) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    if (loading) {
        return (
            <Card className="flex flex-col items-center justify-center min-h-[400px] text-center relative overflow-hidden border-0 shadow-xl bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-950 p-6">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <p className="text-lg font-semibold text-foreground">Calculating your financial health...</p>
                <p className="text-muted-foreground mt-1">This may take a moment.</p>
            </Card>
        );
    }

    if (!scoreData) {
        return (
            <Card className="flex flex-col items-center justify-center min-h-[400px] text-center relative overflow-hidden border-0 shadow-xl bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-950 p-6">
                <HeartPulse className="h-16 w-16 mb-4 text-primary/30" />
                <h3 className="font-semibold text-xl text-foreground mb-2">Check Your Financial Health</h3>
                <p className="max-w-md text-muted-foreground">Get a score from 1-100 that reflects your budgeting, saving, and spending habits, along with personalized tips for improvement.</p>
                <Button onClick={handleCalculateScore} disabled={loading || transactions.length === 0} size="lg" className="mt-8">
                    <Sparkles className="mr-2 h-4 w-4" />
                    Calculate My Health Score
                </Button>
            </Card>
        );
    }

    return (
        <Card className="relative overflow-hidden border-0 shadow-xl bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-950 p-6">
            <CardContent className="relative flex flex-col items-center text-center p-0">
                <p className="text-xl font-semibold mb-2">Your Financial Health Score</p>
                <div className="text-7xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent my-2">
                    {scoreData.score}
                    <span className="text-3xl text-muted-foreground">/100</span>
                </div>
                <div className="w-full max-w-sm my-4">
                    <Progress value={scoreData.score} indicatorClassName={getProgressColorClass(scoreData.score)} />
                </div>
                <p className="text-muted-foreground max-w-xl mx-auto">{scoreData.summary}</p>
                
                <div className="grid md:grid-cols-2 gap-8 w-full text-left my-8">
                    <div className="space-y-4">
                        <h4 className="font-semibold text-lg flex items-center gap-2 text-emerald-600">
                            <TrendingUp />
                            What You're Doing Well
                        </h4>
                        <ul className="space-y-3">
                            {scoreData.strengths.map((item, index) => (
                                <li key={index} className="flex items-start gap-3">
                                    <CheckCircle className="h-5 w-5 text-emerald-500 mt-0.5 shrink-0" />
                                    <span className="text-muted-foreground">{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="space-y-4">
                        <h4 className="font-semibold text-lg flex items-center gap-2 text-amber-600">
                            <TrendingDown />
                            Areas for Improvement
                        </h4>
                        <ul className="space-y-3">
                            {scoreData.areasForImprovement.map((item, index) => (
                                <li key={index} className="flex items-start gap-3">
                                    <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                                    <span className="text-muted-foreground">{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                <div className='flex flex-col items-center gap-2'>
                    <Button onClick={handleCalculateScore} disabled={loading || transactions.length === 0} size="lg">
                        <Sparkles className="mr-2 h-4 w-4" />
                        Recalculate Score
                    </Button>
                    {scoreData && scoreData.generatedAt && (
                        <p className="text-xs text-muted-foreground">Last calculated: {format(new Date(scoreData.generatedAt), "MMM d, yyyy 'at' p")}</p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
