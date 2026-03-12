'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Lightbulb, ArrowUpRight, ArrowDownRight, Loader2 } from 'lucide-react';
import { Transaction, UserProfile } from '@/types';
import { startOfMonth, subMonths, endOfMonth } from 'date-fns';
import { cn } from '@/lib/utils';

export default function FinancialInsightCard({ transactions, userProfile }: { transactions: Transaction[], userProfile: UserProfile | null }) {
    const [insight, setInsight] = useState<{ message: string; sub: string; type: 'positive' | 'negative' | 'neutral' } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const calculateInsight = () => {
            const now = new Date();
            const thisMonthStart = startOfMonth(now);
            const prevMonthStart = startOfMonth(subMonths(now, 1));
            const prevMonthEnd = endOfMonth(subMonths(now, 1));

            const thisMonthSavings = transactions
                .filter(t => t.date >= thisMonthStart && t.date <= now)
                .reduce((sum, t) => t.type === 'income' ? sum + t.amount : sum - t.amount, 0);

            const prevMonthSavings = transactions
                .filter(t => t.date >= prevMonthStart && t.date <= prevMonthEnd)
                .reduce((sum, t) => t.type === 'income' ? sum + t.amount : sum - t.amount, 0);

            if (thisMonthSavings > prevMonthSavings && prevMonthSavings !== 0) {
                const diff = ((thisMonthSavings - prevMonthSavings) / Math.abs(prevMonthSavings)) * 100;
                setInsight({
                    message: `Savings up by ${diff.toFixed(0)}%`,
                    sub: `You saved ₹${Math.abs(thisMonthSavings).toLocaleString('en-IN')} this month. Great job!`,
                    type: 'positive'
                });
            } else if (thisMonthSavings < prevMonthSavings && prevMonthSavings !== 0) {
                const diff = ((prevMonthSavings - thisMonthSavings) / Math.abs(prevMonthSavings)) * 100;
                setInsight({
                    message: `Savings down by ${diff.toFixed(0)}%`,
                    sub: `Spending is higher than last month. Check your 'Wants' category.`,
                    type: 'negative'
                });
            } else {
                setInsight({
                    message: `Consistent Stability`,
                    sub: `Your financial health is steady. Keep maintaining your targets!`,
                    type: 'neutral'
                });
            }
            setLoading(false);
        };

        if (transactions.length > 0) calculateInsight();
        else setLoading(false);
    }, [transactions]);

    if (loading) return <Card className="h-full border-0 shadow-xl bg-primary flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-white" /></Card>;

    return (
        <Card className={cn(
            "h-full relative overflow-hidden border-0 shadow-xl text-white",
            insight?.type === 'positive' ? "bg-emerald-600" : insight?.type === 'negative' ? "bg-rose-600" : "bg-blue-600"
        )}>
            <div className="absolute top-0 right-0 p-4 opacity-20">
                <Lightbulb className="h-16 w-16" />
            </div>
            <CardContent className="p-6 flex flex-col justify-between h-full relative">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest opacity-80">
                        <Lightbulb className="h-3 w-3" />
                        Quick Insight
                    </div>
                    <h3 className="text-2xl font-bold leading-tight">{insight?.message || 'Ready to analyze'}</h3>
                </div>
                <div className="mt-4">
                    <p className="text-sm opacity-90 leading-relaxed font-medium">{insight?.sub || 'Add more transactions to see trends.'}</p>
                    <div className="mt-4 flex items-center gap-2">
                        <div className="px-2 py-1 rounded-full bg-white/20 text-[10px] font-bold">
                            {insight?.type === 'positive' ? <ArrowUpRight className="inline h-3 w-3 mr-1" /> : <ArrowDownRight className="inline h-3 w-3 mr-1" />}
                            LIVE UPDATE
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
