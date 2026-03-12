'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Bell, ArrowRight, CreditCard, Home, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

const reminders = [
    { title: 'Rent Payment', date: 'Due Tomorrow', amount: '₹15,000', icon: Home, color: 'text-blue-600', bg: 'bg-blue-500/10' },
    { title: 'Electricity Bill', date: 'Due in 3 days', amount: '₹2,400', icon: Zap, color: 'text-amber-600', bg: 'bg-amber-500/10' },
    { title: 'CC Payment', date: 'Due in 5 days', amount: '₹8,500', icon: CreditCard, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
];

export default function UpcomingReminders() {
    return (
        <Card className="h-full relative overflow-hidden border-0 shadow-xl bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-950">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-purple-500/10">
                            <Bell className="h-5 w-5 text-purple-600" />
                        </div>
                        <CardTitle className="text-lg font-bold">Reminders</CardTitle>
                    </div>
                    <Button variant="ghost" size="sm" asChild className="h-8 text-xs text-primary font-bold">
                        <Link href="/dashboard/notifications">All <ArrowRight className="ml-1 h-3 w-3" /></Link>
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
                {reminders.map((r, i) => (
                    <div key={i} className="group flex items-center gap-4 p-2 rounded-lg hover:bg-white/50 dark:hover:bg-slate-800/50 transition-colors border border-transparent hover:border-slate-200/50">
                        <div className={cn("flex items-center justify-center w-10 h-10 rounded-lg shrink-0", r.bg)}>
                            <r.icon className={cn("h-5 w-5", r.color)} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold truncate">{r.title}</p>
                            <p className="text-[10px] text-muted-foreground font-medium">{r.date}</p>
                        </div>
                        <div className="text-right shrink-0">
                            <p className="text-sm font-bold text-primary">{r.amount}</p>
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}

import { cn } from '@/lib/utils';
