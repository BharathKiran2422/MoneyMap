'use client';

import { useMemo } from 'react';
import { Transaction } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, CheckCircle, TrendingDown, Info, Target, Wallet, PiggyBank, ShoppingCart, TrendingUp, AlertTriangle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';

type Props = {
  transactions: Transaction[];
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const NEEDS_CATEGORIES = ['Groceries', 'Utilities', 'Transport', 'Rent', 'Health & Wellness', 'Education'];
const WANTS_CATEGORIES = ['Food & Dining', 'Shopping', 'Entertainment', 'Travel', 'Other Expense'];
const SAVINGS_DEBT_CATEGORIES = ['EMI', 'Investment'];

export default function FiftyThirtyTwentyRule({ transactions }: Props) {
  const {
    needs,
    wants,
    savingsAndDebt,
    totalIncome,
    needsPercentage,
    wantsPercentage,
    savingsAndDebtPercentage,
    remainingSavings,
    needsTarget,
    wantsTarget,
    savingsTarget,
  } = useMemo(() => {
    const totalIncome = transactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const needs = transactions
      .filter((t) => t.type === 'expense' && NEEDS_CATEGORIES.includes(t.category || ''))
      .reduce((sum, t) => sum + t.amount, 0);

    const wants = transactions
      .filter((t) => t.type === 'expense' && WANTS_CATEGORIES.includes(t.category || ''))
      .reduce((sum, t) => sum + t.amount, 0);

    const savingsAndDebtFromCategories = transactions
      .filter((t) => t.type === 'expense' && SAVINGS_DEBT_CATEGORIES.includes(t.category || ''))
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalExpenses = needs + wants + savingsAndDebtFromCategories;
    const remainingSavings = totalIncome - totalExpenses;
    const totalSavingsAndDebt = savingsAndDebtFromCategories + (remainingSavings > 0 ? remainingSavings : 0);

    if (totalIncome === 0) {
      return { needs: 0, wants: 0, savingsAndDebt: 0, totalIncome: 0, needsPercentage: 0, wantsPercentage: 0, savingsAndDebtPercentage: 0, remainingSavings: 0, needsTarget: 0, wantsTarget: 0, savingsTarget: 0 };
    }

    const needsPercentage = (needs / totalIncome) * 100;
    const wantsPercentage = (wants / totalIncome) * 100;
    const savingsAndDebtPercentage = (totalSavingsAndDebt / totalIncome) * 100;
    
    const needsTarget = totalIncome * 0.5;
    const wantsTarget = totalIncome * 0.3;
    const savingsTarget = totalIncome * 0.2;

    return { needs, wants, savingsAndDebt: totalSavingsAndDebt, totalIncome, needsPercentage, wantsPercentage, savingsAndDebtPercentage, remainingSavings, needsTarget, wantsTarget, savingsTarget };
  }, [transactions]);
  
  if (totalIncome === 0) {
    return (
      <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-950">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5" />
        <CardHeader className="relative pb-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-500/10">
              <Target className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                50/30/20 Rule Analysis
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground mt-1">
                Smart budgeting insights for balanced financial health
              </CardDescription>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help hover:text-blue-600 transition-colors" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>The 50/30/20 rule is a simple budgeting guideline: allocate 50% of your after-tax income to Needs, 30% to Wants, and 20% to Savings & Debt Repayment.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardHeader>
        <CardContent className="relative">
          <div className="flex h-[200px] items-center justify-center text-center">
            <div className="space-y-4">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-blue-500/10 mx-auto">
                <Wallet className="h-8 w-8 text-blue-600" />
              </div>
              <div className="space-y-2">
                <p className="text-lg font-semibold text-muted-foreground">No income data yet</p>
                <p className="text-sm text-muted-foreground max-w-md">
                  Add some income transactions for this month to see your personalized 50/30/20 budget breakdown and insights.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusBadge = (actual: number, target: number, isReverse: boolean = false) => {
    const isGood = isReverse ? actual >= target : actual <= target;
    const variance = Math.abs(actual - target);
    
    if (isGood) {
      return <Badge variant="default" className="bg-emerald-500/10 text-emerald-700 border-emerald-200 hover:bg-emerald-500/20">On Track</Badge>;
    } else if (variance <= 5) {
      return <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-700 border-yellow-200 hover:bg-yellow-500/20">Close</Badge>;
    } else {
      return <Badge variant="destructive" className="bg-red-500/10 text-red-700 border-red-200 hover:bg-red-500/20">Over Budget</Badge>;
    }
  };

  const RuleItem = ({ 
    title, 
    target, 
    targetAmount, 
    actualPercentage, 
    actualAmount, 
    colorClass, 
    tooltipText, 
    icon: Icon,
    isReverse = false 
  }: { 
    title: string, 
    target: number, 
    targetAmount: number, 
    actualPercentage: number, 
    actualAmount: number, 
    colorClass: string, 
    tooltipText: string,
    icon: React.ComponentType<{ className?: string }>,
    isReverse?: boolean
  }) => (
    <div className="group relative p-6 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="relative space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 group-hover:scale-110 transition-transform">
              <Icon className="h-5 w-5 text-slate-600 dark:text-slate-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg">{title}</span>
                {getStatusBadge(actualPercentage, target, isReverse)}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Target: {formatCurrency(targetAmount)}</span>
                <span className="text-xs px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-700">
                  {target}%
                </span>
              </div>
            </div>
          </div>
          
          <div className="text-right">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xl">{formatCurrency(actualAmount)}</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    {title === 'Savings & Debt' ? (
                      actualPercentage < target ? (
                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                      ) : (
                        <CheckCircle className="h-5 w-5 text-emerald-500" />
                      )
                    ) : (
                      actualPercentage > target ? (
                        <AlertCircle className="h-5 w-5 text-red-500" />
                      ) : (
                        <CheckCircle className="h-5 w-5 text-emerald-500" />
                      )
                    )}
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{tooltipText}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="text-sm text-muted-foreground">
              {actualPercentage.toFixed(1)}% of income
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span>{Math.min(actualPercentage, 100).toFixed(1)}%</span>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger className="w-full">
                <div className="relative">
                  <Progress 
                    value={Math.min(actualPercentage, 100)} 
                    className="h-3 bg-slate-200 dark:bg-slate-700"
                  />
                  <div 
                    className={`absolute top-0 left-0 h-3 rounded-full transition-all duration-500 ${colorClass}`}
                    style={{ width: `${Math.min(actualPercentage, 100)}%` }}
                  />
                  {actualPercentage > 100 && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>You've allocated {actualPercentage.toFixed(1)}% of your income to {title.toLowerCase()}.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">0%</span>
            <span className="text-muted-foreground">{target}% target</span>
            <span className="text-muted-foreground">100%</span>
          </div>
        </div>
      </div>
    </div>
  );

  const overallStatus = () => {
    const overBudget = needsPercentage > 50 || wantsPercentage > 30;
    const underSaving = savingsAndDebtPercentage < 20;
    
    if (remainingSavings < 0) return { status: 'critical', message: 'Overspending Alert' };
    if (overBudget && underSaving) return { status: 'warning', message: 'Needs Attention' };
    if (overBudget || underSaving) return { status: 'caution', message: 'Minor Adjustments' };
    return { status: 'good', message: 'Excellent Balance' };
  };

  const status = overallStatus();

  return (
    <Card className="relative overflow-hidden border-0 shadow-xl bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-950">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5" />
      
      <CardHeader className="relative pb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-500/10">
              <Target className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                50/30/20 Rule Analysis
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground mt-1">
                Smart budgeting insights for balanced financial health
              </CardDescription>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Badge 
              variant={status.status === 'good' ? 'default' : status.status === 'critical' ? 'destructive' : 'secondary'} 
              className={`px-3 py-1 text-sm font-medium ${
                status.status === 'good' ? 'bg-emerald-500/10 text-emerald-700 border-emerald-200' :
                status.status === 'critical' ? 'bg-red-500/10 text-red-700 border-red-200' :
                'bg-yellow-500/10 text-yellow-700 border-yellow-200'
              }`}
            >
              {status.message}
            </Badge>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-5 w-5 text-muted-foreground cursor-help hover:text-blue-600 transition-colors" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>The 50/30/20 rule is a simple budgeting guideline: allocate 50% of your after-tax income to Needs, 30% to Wants, and 20% to Savings & Debt Repayment.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardHeader>

      <CardContent className="relative space-y-6">
        <div className="grid gap-6">
          <RuleItem 
            title="Needs"
            target={50}
            targetAmount={needsTarget}
            actualPercentage={needsPercentage}
            actualAmount={needs}
            colorClass={needsPercentage > 50 ? 'bg-gradient-to-r from-red-500 to-red-600' : 'bg-gradient-to-r from-blue-500 to-blue-600'}
            tooltipText={needsPercentage > 50 ? `You're ${(needsPercentage - 50).toFixed(1)}% over budget on needs.` : `You're ${(50 - needsPercentage).toFixed(1)}% under budget for needs.`}
            icon={Wallet}
          />
          
          <RuleItem 
            title="Wants"
            target={30}
            targetAmount={wantsTarget}
            actualPercentage={wantsPercentage}
            actualAmount={wants}
            colorClass={wantsPercentage > 30 ? 'bg-gradient-to-r from-red-500 to-red-600' : 'bg-gradient-to-r from-purple-500 to-purple-600'}
            tooltipText={wantsPercentage > 30 ? `You're ${(wantsPercentage - 30).toFixed(1)}% over budget on wants.` : `You're ${(30 - wantsPercentage).toFixed(1)}% under budget for wants.`}
            icon={ShoppingCart}
          />
          
          <RuleItem 
            title="Savings & Debt"
            target={20}
            targetAmount={savingsTarget}
            actualPercentage={savingsAndDebtPercentage}
            actualAmount={savingsAndDebt}
            colorClass={savingsAndDebtPercentage < 20 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' : 'bg-gradient-to-r from-emerald-500 to-green-600'}
            tooltipText={savingsAndDebtPercentage < 20 ? `You're ${(20 - savingsAndDebtPercentage).toFixed(1)}% short of your savings goal.` : `Great job! You're ${(savingsAndDebtPercentage - 20).toFixed(1)}% above your savings target.`}
            icon={PiggyBank}
            isReverse={true}
          />
        </div>

        {remainingSavings < 0 && (
          <div className="relative p-4 rounded-xl bg-gradient-to-r from-red-500/10 to-red-600/10 border border-red-200/50 dark:border-red-800/50">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-500/20">
                <TrendingDown className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="font-semibold text-red-800 dark:text-red-200">
                  Budget Deficit Alert
                </p>
                <p className="text-sm text-red-700 dark:text-red-300">
                  You have spent {formatCurrency(Math.abs(remainingSavings))} more than your income this month.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
