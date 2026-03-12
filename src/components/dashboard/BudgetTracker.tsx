'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/auth';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, Timestamp, orderBy, limit } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Pencil, Save, Wallet, Target, IndianRupee, PieChart, Info, TrendingUp, TrendingDown, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { startOfMonth, endOfMonth } from 'date-fns';
import { UserProfile, Transaction } from '@/types';
import { checkBudgetAndCreateNotifications } from '@/lib/notifications';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getSpendingSuggestions } from '@/ai/flows/spending-suggestions';
import { cn } from "@/lib/utils";

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
};

export default function BudgetTracker() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [budget, setBudget] = useState<number | null>(null);
    const [expenses, setExpenses] = useState(0);
    const [topCategories, setTopCategories] = useState<{ name: string; amount: number }[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [newBudget, setNewBudget] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [aiAdvice, setAiAdvice] = useState<string | null>(null);
    const [loadingAi, setLoadingAi] = useState(false);

    useEffect(() => {
        if (!user || !db) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                const userDocRef = doc(db, 'users', user.uid);
                const userDoc = await getDoc(userDocRef);
                if (userDoc.exists()) {
                    const userData = userDoc.data() as UserProfile;
                    const monthlyBudget = userData.monthlyBudget ?? null;
                    setBudget(monthlyBudget);
                    setNewBudget(String(monthlyBudget ?? ''));
                }

                const now = new Date();
                const start = startOfMonth(now);
                const end = endOfMonth(now);
                let totalExpenses = 0;
                const categoryMap: Record<string, number> = {};
                
                const accountsSnapshot = await getDocs(collection(db, 'users', user.uid, 'accounts'));

                for (const accountDoc of accountsSnapshot.docs) {
                    const transactionsQuery = query(
                        collection(db, 'users', user.uid, 'accounts', accountDoc.id, 'transactions'),
                        where('date', '>=', Timestamp.fromDate(start)),
                        where('date', '<=', Timestamp.fromDate(end)),
                        where('type', '==', 'expense')
                    );
                    
                    const transactionsSnapshot = await getDocs(transactionsQuery);
                    transactionsSnapshot.forEach(transactionDoc => {
                        const data = transactionDoc.data();
                        totalExpenses += data.amount;
                        const cat = data.category || 'Other';
                        categoryMap[cat] = (categoryMap[cat] || 0) + data.amount;
                    });
                }
                setExpenses(totalExpenses);
                setTopCategories(
                    Object.entries(categoryMap)
                        .map(([name, amount]) => ({ name, amount }))
                        .sort((a, b) => b.amount - a.amount)
                        .slice(0, 3)
                );

            } catch (error) {
                console.error("Error fetching budget data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user, toast]);

    const handleGetAiAdvice = async () => {
        if (!user || !budget) return;
        setLoadingAi(true);
        try {
            const summary = topCategories.map(c => `${c.name}: ₹${c.amount}`).join(', ');
            const result = await getSpendingSuggestions({
                transactionHistory: `Summary: ${summary}. Total: ₹${expenses}`,
                currentBudget: budget,
            });
            // Extract a single sentence from the markdown list
            const advice = result.suggestions.split('\n').find(l => l.match(/^\d\./))?.replace(/^\d\.\s*/, '') || "Keep tracking your expenses to stay within budget.";
            setAiAdvice(advice);
        } catch (error) {
            setAiAdvice("Track your daily expenses to optimize your budget.");
        } finally {
            setLoadingAi(false);
        }
    };

    const handleSaveBudget = async () => {
        if (!user || !db) return;
        const budgetValue = parseFloat(newBudget);
        if (isNaN(budgetValue) || budgetValue <= 0) {
            toast({ title: "Invalid Input", description: "Please enter a valid positive number.", variant: "destructive" });
            return;
        }

        setIsSaving(true);
        try {
            const userDocRef = doc(db, 'users', user.uid);
            await updateDoc(userDocRef, { monthlyBudget: budgetValue });
            setBudget(budgetValue);
            setIsEditing(false);
            toast({ title: "Success", description: "Budget updated." });
            await checkBudgetAndCreateNotifications(user.uid);
        } catch (error) {
            toast({ title: "Error", description: "Update failed.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const { status, remainingBudget, progressPercentage, progressColor } = useMemo(() => {
        if (!budget) return { status: 'None', remainingBudget: 0, progressPercentage: 0, progressColor: 'bg-emerald-500' };
        
        const progress = (expenses / budget) * 100;
        let color = 'bg-emerald-500';
        let label = 'Safe';
        
        if (progress > 85) {
            color = 'bg-rose-500';
            label = 'Critical';
        } else if (progress > 60) {
            color = 'bg-amber-500';
            label = 'Moderate';
        }

        return {
            status: label,
            remainingBudget: budget - expenses,
            progressPercentage: Math.min(progress, 100),
            progressColor: color
        };
    }, [budget, expenses]);

    if (loading) {
        return (
            <Card className="h-full flex items-center justify-center border-0 shadow-xl bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-950">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </Card>
        );
    }

    if (isEditing) {
        return (
            <Card className="h-full border-0 shadow-xl bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-950">
                <CardHeader>
                    <CardTitle className="text-xl font-bold">Adjust Monthly Budget</CardTitle>
                    <CardDescription>Define your spending limit for the month.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="relative">
                        <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            type="number" 
                            value={newBudget}
                            onChange={(e) => setNewBudget(e.target.value)}
                            className="pl-10 h-12 text-lg"
                            placeholder="e.g., 50000"
                        />
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={handleSaveBudget} disabled={isSaving} className="flex-1">
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Limit
                        </Button>
                        <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!budget) {
        return (
            <Card className="h-full border-0 shadow-xl bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-950 flex flex-col items-center justify-center p-8 text-center space-y-4">
                <Target className="h-12 w-12 text-primary/20" />
                <div className="space-y-1">
                    <h3 className="font-bold text-xl">No Budget Set</h3>
                    <p className="text-sm text-muted-foreground">Define a monthly goal to track your stability.</p>
                </div>
                <Button onClick={() => setIsEditing(true)}><Target className="mr-2 h-4 w-4" /> Set Monthly Budget</Button>
            </Card>
        );
    }

    return (
        <Card className="h-full relative overflow-hidden border-0 shadow-xl bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-950">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5" />
            <CardHeader className="relative pb-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-500/10">
                            <Wallet className="h-5 w-5 text-blue-600" />
                        </div>
                        <CardTitle className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Budget Overview</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant={status === 'Critical' ? 'destructive' : status === 'Moderate' ? 'secondary' : 'default'}>{status}</Badge>
                        <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)} className="h-8 w-8"><Pencil className="h-4 w-4" /></Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="relative space-y-6 pt-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Spent So Far</p>
                        <p className="text-2xl font-bold text-rose-600">{formatCurrency(expenses)}</p>
                    </div>
                    <div className="space-y-1 text-right">
                        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Remaining</p>
                        <p className={cn("text-2xl font-bold", remainingBudget < 0 ? "text-rose-600" : "text-emerald-600")}>
                            {formatCurrency(Math.abs(remainingBudget))}
                        </p>
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between text-xs font-medium">
                        <span>Utilization</span>
                        <span>{progressPercentage.toFixed(1)}%</span>
                    </div>
                    <div className="relative">
                        <Progress value={progressPercentage} className="h-2.5 bg-slate-200 dark:bg-slate-800" />
                        <div className={cn("absolute top-0 left-0 h-2.5 rounded-full transition-all duration-500", progressColor)} style={{ width: `${progressPercentage}%` }} />
                    </div>
                    <p className="text-[10px] text-muted-foreground">Monthly Limit: {formatCurrency(budget)}</p>
                </div>

                <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground tracking-wider">
                        <PieChart className="h-3.5 w-3.5" />
                        Top Budget Categories
                    </div>
                    <div className="space-y-2">
                        {topCategories.length > 0 ? topCategories.map((cat, i) => (
                            <div key={i} className="flex items-center justify-between text-sm p-2 rounded-lg bg-white/40 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-700/50">
                                <span className="font-medium">{cat.name}</span>
                                <span className="font-bold text-primary">{formatCurrency(cat.amount)}</span>
                            </div>
                        )) : (
                            <p className="text-xs text-muted-foreground italic text-center py-2">No expenses recorded yet.</p>
                        )}
                    </div>
                </div>

                <div className="pt-2 border-t border-slate-200/50 dark:border-slate-700/50">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground tracking-wider">
                            <Sparkles className="h-3.5 w-3.5 text-blue-500" />
                            Budget Advice
                        </div>
                        {!aiAdvice && (
                            <Button variant="ghost" size="sm" onClick={handleGetAiAdvice} disabled={loadingAi} className="h-6 text-[10px]">
                                {loadingAi ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
                                Generate Advice
                            </Button>
                        )}
                    </div>
                    <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/10 min-h-[50px] flex items-center">
                        {aiAdvice ? (
                            <p className="text-xs leading-relaxed text-blue-700 dark:text-blue-300 italic">"{aiAdvice}"</p>
                        ) : (
                            <p className="text-xs text-muted-foreground italic">Analyze your spending patterns to get personalized tips.</p>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
