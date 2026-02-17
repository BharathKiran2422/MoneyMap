'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/auth';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Pencil, Save, Wallet, TrendingDown, TrendingUp, AlertTriangle, Target, CheckCircle, DollarSign, Calendar, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { startOfMonth, endOfMonth, getDaysInMonth, getDate } from 'date-fns';
import { UserProfile } from '@/types';
import { checkBudgetAndCreateNotifications } from '@/lib/notifications';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [newBudget, setNewBudget] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!user || !db) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch user budget
                const userDocRef = doc(db, 'users', user.uid);
                const userDoc = await getDoc(userDocRef);
                if (userDoc.exists()) {
                    const userData = userDoc.data() as UserProfile;
                    const monthlyBudget = userData.monthlyBudget ?? null;
                    setBudget(monthlyBudget);
                    setNewBudget(String(monthlyBudget ?? ''));
                } else {
                    setBudget(null);
                }

                // Fetch total expenses for the current month
                const now = new Date();
                const start = startOfMonth(now);
                const end = endOfMonth(now);
                let totalExpenses = 0;
                
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
                        totalExpenses += transactionDoc.data().amount;
                    });
                }
                setExpenses(totalExpenses);

            } catch (error) {
                console.error("Error fetching budget data:", error);
                toast({ title: "Error", description: "Could not fetch budget information.", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user, toast]);

    const handleSaveBudget = async () => {
        if (!user || !db) return;
        const budgetValue = parseFloat(newBudget);
        if (isNaN(budgetValue) || budgetValue <= 0) {
            toast({ title: "Invalid Input", description: "Please enter a valid positive number for your budget.", variant: "destructive" });
            return;
        }

        setIsSaving(true);
        try {
            const userDocRef = doc(db, 'users', user.uid);
            await updateDoc(userDocRef, { monthlyBudget: budgetValue });
            setBudget(budgetValue);
            setIsEditing(false);
            toast({ title: "Success", description: "Your budget has been updated." });
            await checkBudgetAndCreateNotifications(user.uid);
        } catch (error) {
            console.error("Error updating budget:", error);
            toast({ title: "Error", description: "Could not update your budget.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const { status, remainingBudget, progressPercentage, progressColorClass, dailyAverages } = useMemo(() => {
        if (budget === null || budget <= 0) {
            return {
                status: { status: 'none', message: 'No Budget Set' },
                remainingBudget: 0,
                progressPercentage: 0,
                progressColorClass: '',
                dailyAverages: { actual: 0, target: 0 },
            };
        }

        const progress = (expenses / budget) * 100;
        const colorClass = progress > 90 ? 'bg-gradient-to-r from-red-500 to-red-600' :
                           progress > 75 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                           'bg-gradient-to-r from-blue-500 to-blue-600';

        const now = new Date();
        const daysInMonth = getDaysInMonth(now);
        const daysPassed = getDate(now);
        const actualDailyAverage = daysPassed > 0 ? expenses / daysPassed : 0;
        const budgetedDailyAverage = budget / daysInMonth;

        let statusObj;
        
        if (progress > 100) {
            statusObj = { status: 'critical', message: 'Over Budget' };
        } else if (progress > 90) {
            statusObj = { status: 'warning', message: 'Almost Exceeded' };
        } else if (daysPassed > 7) {
            const dailySpendingRatio = budgetedDailyAverage > 0 ? actualDailyAverage / budgetedDailyAverage : 0;
            if (dailySpendingRatio > 1.5) {
                statusObj = { status: 'warning', message: 'High Daily Pace' };
            } else if (dailySpendingRatio > 1.2) {
                statusObj = { status: 'caution', message: 'Pace Yourself' };
            } else {
                statusObj = { status: 'good', message: 'On Track' };
            }
        } else {
            statusObj = { status: 'good', message: 'On Track' };
        }

        return {
            status: statusObj,
            remainingBudget: budget - expenses,
            progressPercentage: Math.min(progress, 100),
            progressColorClass: colorClass,
            dailyAverages: { actual: actualDailyAverage, target: budgetedDailyAverage }
        };
    }, [budget, expenses]);


    const renderContent = () => {
        if (loading) {
            return (
                <div className="h-[200px] flex items-center justify-center">
                    <div className="space-y-4 text-center">
                        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-blue-500/10 mx-auto animate-pulse">
                            <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
                        </div>
                        <p className="text-sm text-muted-foreground">Loading your budget...</p>
                    </div>
                </div>
            );
        }

        if (isEditing) {
            return (
                <div className="relative p-6 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50">
                    <div className="space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-500/10">
                                <Target className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-lg">Set Monthly Budget</h3>
                                <p className="text-sm text-muted-foreground">Enter your total budget for the month</p>
                            </div>
                        </div>
                        
                        <div className="space-y-4">
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input 
                                    type="number" 
                                    value={newBudget}
                                    onChange={(e) => setNewBudget(e.target.value)}
                                    className="pl-10 h-12 text-lg border-2 focus:border-blue-500 transition-colors"
                                    placeholder="e.g., 50,000"
                                />
                            </div>
                            
                            <div className="flex items-center gap-3">
                                <Button onClick={handleSaveBudget} disabled={isSaving} className="flex-1 h-12">
                                    {isSaving ? (
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    ) : (
                                        <Save className="h-4 w-4 mr-2" />
                                    )}
                                    Save Budget
                                </Button>
                                
                                {budget !== null && (
                                    <Button 
                                        variant="outline" 
                                        onClick={() => { 
                                            setIsEditing(false); 
                                            setNewBudget(String(budget ?? ''));
                                        }} 
                                        disabled={isSaving}
                                        className="px-6 h-12"
                                    >
                                        Cancel
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            );
        }
        
        if (budget !== null && budget > 0) {
            return (
                <div className="space-y-6">
                    {/* Budget Overview */}
                    <div className="relative p-6 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 hover:shadow-lg transition-all duration-300">
                        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-xl opacity-50" />
                        
                        <div className="relative space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-500/10">
                                        <Wallet className="h-6 w-6 text-blue-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-xl">Budget Overview</h3>
                                        <p className="text-sm text-muted-foreground">Current month spending</p>
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-3">
                                    <Badge 
                                        variant={status.status === 'critical' ? 'destructive' : 'secondary'} 
                                        className={`px-3 py-1 text-sm font-medium ${
                                            status.status === 'good' ? 'bg-emerald-500/10 text-emerald-700 border-emerald-200' :
                                            status.status === 'critical' ? 'bg-red-500/10 text-red-700 border-red-200' :
                                            status.status === 'warning' ? 'bg-amber-500/10 text-amber-700 border-amber-200' :
                                            status.status === 'caution' ? 'bg-yellow-500/10 text-yellow-700 border-yellow-200' :
                                            ''
                                        }`}
                                    >
                                        {status.message}
                                    </Badge>
                                    <Button 
                                        onClick={() => setIsEditing(true)} 
                                        variant="ghost" 
                                        size="sm"
                                        className="h-8 w-8 p-0 hover:bg-blue-500/10"
                                    >
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>

                            {/* Amount Display */}
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <TrendingDown className="h-4 w-4" />
                                        <span>Spent</span>
                                    </div>
                                    <div className="text-2xl font-bold text-red-600">
                                        {formatCurrency(expenses)}
                                    </div>
                                </div>
                                
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <TrendingUp className="h-4 w-4" />
                                        <span>Remaining</span>
                                    </div>
                                    <div className={`text-2xl font-bold ${remainingBudget >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                        {formatCurrency(Math.abs(remainingBudget))}
                                    </div>
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Budget Progress</span>
                                    <span className="font-medium">{progressPercentage.toFixed(1)}% used</span>
                                </div>
                                
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger className="w-full">
                                            <div className="relative">
                                                <Progress 
                                                    value={progressPercentage} 
                                                    className="h-4 bg-slate-200 dark:bg-slate-700"
                                                />
                                                <div 
                                                    className={`absolute top-0 left-0 h-4 rounded-full transition-all duration-500 ${progressColorClass}`}
                                                    style={{ width: `${progressPercentage}%` }}
                                                />
                                                {progressPercentage > 100 && (
                                                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-pulse" />
                                                )}
                                            </div>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>You've used {progressPercentage.toFixed(1)}% of your monthly budget</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                                
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <span>₹0</span>
                                    <span>Budget: {formatCurrency(budget)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Budget Alert */}
                    {progressPercentage > 75 && (
                        <div className={`relative p-4 rounded-xl border ${
                            progressPercentage > 100 ? 'bg-gradient-to-r from-red-500/10 to-red-600/10 border-red-200/50 dark:border-red-800/50' :
                            progressPercentage > 90 ? 'bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-200/50 dark:border-yellow-800/50' :
                            'bg-gradient-to-r from-blue-500/10 to-blue-600/10 border-blue-200/50 dark:border-blue-800/50'
                        }`}>
                            <div className="flex items-center gap-3">
                                <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                                    progressPercentage > 100 ? 'bg-red-500/20' :
                                    progressPercentage > 90 ? 'bg-yellow-500/20' :
                                    'bg-blue-500/20'
                                }`}>
                                    {progressPercentage > 100 ? (
                                        <AlertTriangle className="h-5 w-5 text-red-600" />
                                    ) : progressPercentage > 90 ? (
                                        <AlertTriangle className="h-5 w-5 text-yellow-600" />
                                    ) : (
                                        <Info className="h-5 w-5 text-blue-600" />
                                    )}
                                </div>
                                <div>
                                    <p className={`font-semibold ${
                                        progressPercentage > 100 ? 'text-red-800 dark:text-red-200' :
                                        progressPercentage > 90 ? 'text-yellow-800 dark:text-yellow-200' :
                                        'text-blue-800 dark:text-blue-200'
                                    }`}>
                                        {progressPercentage > 100 ? 'Budget Exceeded!' :
                                         progressPercentage > 90 ? 'Budget Alert!' :
                                         'High Budget Usage'}
                                    </p>
                                    <p className={`text-sm ${
                                        progressPercentage > 100 ? 'text-red-700 dark:text-red-300' :
                                        progressPercentage > 90 ? 'text-yellow-700 dark:text-yellow-300' :
                                        'text-blue-700 dark:text-blue-300'
                                    }`}>
                                        {progressPercentage > 100 ? 
                                            `You've exceeded your budget by ${formatCurrency(expenses - budget)}` :
                                            `You've used ${progressPercentage.toFixed(1)}% of your monthly budget`
                                        }
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/5 to-blue-600/5 border border-blue-200/50 dark:border-blue-800/50">
                            <div className="flex items-center gap-2 text-sm text-blue-600 mb-1">
                                <Calendar className="h-4 w-4" />
                                <span>This Month</span>
                            </div>
                            <div className="text-lg font-bold">{formatCurrency(expenses)}</div>
                        </div>
                        
                        <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/5 to-emerald-600/5 border border-emerald-200/50 dark:border-emerald-800/50">
                            <div className="flex items-center gap-2 text-sm text-emerald-600 mb-1">
                                <Target className="h-4 w-4" />
                                <span>Budget</span>
                            </div>
                            <div className="text-lg font-bold">{formatCurrency(budget)}</div>
                        </div>
                        
                        <div className="col-span-2 sm:col-span-1 lg:col-span-2 p-4 rounded-xl bg-gradient-to-br from-purple-500/5 to-purple-600/5 border border-purple-200/50 dark:border-purple-800/50 flex flex-col justify-between">
                            <div className="flex items-center gap-2 text-sm text-purple-600 mb-1">
                                <CheckCircle className="h-4 w-4" />
                                <span>Daily Averages</span>
                            </div>
                            <div className="flex justify-around items-baseline gap-2 pt-2">
                                <div className="text-center">
                                    <p className="text-xs text-muted-foreground">Actual</p>
                                    <p className="text-base font-bold">{formatCurrency(dailyAverages.actual)}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-xs text-muted-foreground">Target</p>
                                    <p className="text-base font-bold text-muted-foreground/80">{formatCurrency(dailyAverages.target)}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className="h-[200px] flex items-center justify-center">
                <div className="space-y-6 text-center">
                    <div className="flex items-center justify-center w-16 h-16 rounded-full bg-blue-500/10 mx-auto">
                        <Target className="h-8 w-8 text-blue-600" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-lg font-semibold">No Budget Set</h3>
                        <p className="text-sm text-muted-foreground max-w-md">
                            Set a monthly budget to track your spending and get insights into your financial habits.
                        </p>
                    </div>
                    <Button 
                        onClick={() => setIsEditing(true)}
                        className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-2"
                    >
                        <Target className="h-4 w-4 mr-2" />
                        Set Monthly Budget
                    </Button>
                </div>
            </div>
        );
    };

    return (
        <Card className="relative overflow-hidden border-0 shadow-xl bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-950">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5" />
            
            <CardHeader className="relative pb-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-500/10">
                            <Wallet className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                Monthly Budget
                            </CardTitle>
                            <CardDescription className="text-sm text-muted-foreground mt-1">
                                Track your spending and stay within your budget
                            </CardDescription>
                        </div>
                    </div>
                    
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Info className="h-5 w-5 text-muted-foreground cursor-help hover:text-blue-600 transition-colors" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                                <p>Set a monthly budget to track your expenses and get alerts when you're approaching your limit.</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </CardHeader>

            <CardContent className="relative">
                {renderContent()}
            </CardContent>
        </Card>
    );
}
