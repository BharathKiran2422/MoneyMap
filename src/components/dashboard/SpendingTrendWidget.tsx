'use client';

import { Transaction } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts';
import { useMemo } from 'react';
import { subDays, format, startOfDay, eachDayOfInterval } from 'date-fns';
import { TrendingUp } from 'lucide-react';

export default function SpendingTrendWidget({ transactions }: { transactions: Transaction[] }) {
    const data = useMemo(() => {
        const now = new Date();
        const days = eachDayOfInterval({ start: subDays(now, 6), end: now });
        
        return days.map(day => {
            const amount = transactions
                .filter(t => t.type === 'expense' && startOfDay(new Date(t.date)).getTime() === startOfDay(day).getTime())
                .reduce((sum, t) => sum + t.amount, 0);
            return {
                date: format(day, 'EEE'),
                amount
            };
        });
    }, [transactions]);

    const formatCurrency = (val: number) => `₹${val.toLocaleString('en-IN')}`;

    return (
        <Card className="h-full relative overflow-hidden border-0 shadow-xl bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-950">
            <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/10">
                        <TrendingUp className="h-5 w-5 text-emerald-600" />
                    </div>
                    <CardTitle className="text-lg font-bold">Weekly Activity</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="pt-4">
                <div className="h-[180px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data}>
                            <defs>
                                <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.1} />
                            <XAxis 
                                dataKey="date" 
                                axisLine={false} 
                                tickLine={false} 
                                fontSize={10} 
                                tick={{ fill: 'currentColor', opacity: 0.5 }} 
                            />
                            <YAxis hide />
                            <Tooltip 
                                formatter={(v) => [formatCurrency(v as number), 'Spent']}
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '11px' }}
                            />
                            <Area 
                                type="monotone" 
                                dataKey="amount" 
                                stroke="hsl(var(--primary))" 
                                strokeWidth={2} 
                                fillOpacity={1} 
                                fill="url(#colorTrend)" 
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
                <div className="mt-6 flex items-center justify-between text-[10px] text-muted-foreground font-bold uppercase tracking-widest border-t pt-4">
                    <span>Analysis: Last 7 Days</span>
                    <span className="text-emerald-600">Active Tracking</span>
                </div>
            </CardContent>
        </Card>
    );
}
