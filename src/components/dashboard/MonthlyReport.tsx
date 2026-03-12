'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Transaction } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, FileDown, CalendarClock, TrendingUp, TrendingDown, Wallet, PiggyBank, PieChart as PieChartIcon, BarChart3, LineChart, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, startOfMonth, endOfMonth, subMonths, eachDayOfInterval, eachWeekOfInterval, endOfWeek, isSameDay } from 'date-fns';
import { useSearchParams, useRouter } from 'next/navigation';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useAuth } from '@/lib/auth';
import { db } from '@/lib/firebase';
import { doc, updateDoc, deleteDoc, Timestamp, getDoc, getDocs, collection, setDoc } from 'firebase/firestore';
import { cn } from '@/lib/utils';

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart as RechartsLineChart, Line, LabelList } from 'recharts';
import TransactionList from '@/components/dashboard/TransactionList';
import TransactionModal from '@/components/dashboard/TransactionModal';
import { Badge } from '../ui/badge';

type Props = {
    allTransactions: Transaction[];
    onRefresh?: () => void;
};

const COLORS = [
    '#6366f1', '#ec4899', '#f59e0b', '#10b981', '#ef4444', 
    '#8b5cf6', '#06b6d4', '#f97316', '#3b82f6', '#14b8a6'
];

export default function MonthlyReport({ allTransactions, onRefresh }: Props) {
    const { user } = useAuth();
    const searchParams = useSearchParams();
    const router = useRouter();
    const { toast } = useToast();
    
    const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
    const [monthlyTransactions, setMonthlyTransactions] = useState<Transaction[]>([]);
    const [prevMonthlyTransactions, setPrevMonthlyTransactions] = useState<Transaction[]>([]);
    const [generating, setGenerating] = useState(true);
    const [downloading, setDownloading] = useState(false);
    
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
    const [isEditModalOpen, setIsTransactionModalOpen] = useState(false);

    const reportRef = useRef<HTMLDivElement>(null);

    const formatCurrency = (val: number) => new Intl.NumberFormat('en-IN', { 
        style: 'currency', 
        currency: 'INR', 
        maximumFractionDigits: 0 
    }).format(val);

    const availableMonths = useMemo(() => {
        if (allTransactions.length === 0) return [];
        const dates = allTransactions.map(t => new Date(t.date));
        const earliest = new Date(Math.min(...dates.map(d => d.getTime())));
        const latest = new Date();
        const months = new Set<string>();
        let curr = startOfMonth(latest);
        while (curr >= startOfMonth(earliest)) {
            months.add(format(curr, 'yyyy-MM'));
            curr = subMonths(curr, 1);
        }
        return Array.from(months);
    }, [allTransactions]);

    useEffect(() => {
        const monthParam = searchParams.get('month');
        if (monthParam && availableMonths.includes(monthParam)) {
            setSelectedMonth(monthParam);
        } else if (availableMonths.length > 0) {
            setSelectedMonth(availableMonths[0]);
        }
    }, [searchParams, availableMonths]);
      
    useEffect(() => {
        if (!selectedMonth) return;
        setGenerating(true);
        const start = startOfMonth(new Date(selectedMonth));
        const end = endOfMonth(new Date(selectedMonth));
        
        const filtered = allTransactions.filter(t => {
            const tDate = new Date(t.date);
            return tDate >= start && tDate <= end;
        });
        setMonthlyTransactions(filtered);

        const prevMonthDate = subMonths(start, 1);
        const prevStart = startOfMonth(prevMonthDate);
        const prevEnd = endOfMonth(prevMonthDate);
        const prevFiltered = allTransactions.filter(t => {
            const tDate = new Date(t.date);
            return tDate >= prevStart && tDate <= prevEnd;
        });
        setPrevMonthlyTransactions(prevFiltered);

        setTimeout(() => setGenerating(false), 400);
    }, [selectedMonth, allTransactions]);

    const stats = useMemo(() => {
        const income = monthlyTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
        const expenses = monthlyTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
        const savings = income - expenses;
        const savingsRate = income > 0 ? (savings / income) * 100 : 0;

        const prevIncome = prevMonthlyTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
        const prevExpenses = prevMonthlyTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

        const cats: Record<string, number> = {};
        monthlyTransactions.filter(t => t.type === 'expense').forEach(t => {
            const c = t.category || 'Other Expense';
            cats[c] = (cats[c] || 0) + t.amount;
        });
        const topCat = Object.entries(cats).sort((a, b) => b[1] - a[1])[0]?.[0] || 'None';

        return {
            income, expenses, savings, savingsRate, topCat,
            incomeTrend: prevIncome > 0 ? ((income - prevIncome) / prevIncome) * 100 : null,
            expenseTrend: prevExpenses > 0 ? ((expenses - prevExpenses) / prevExpenses) * 100 : null,
        };
    }, [monthlyTransactions, prevMonthlyTransactions]);

    const expenseChartData = useMemo(() => {
        const map: Record<string, number> = {};
        monthlyTransactions.filter(t => t.type === 'expense').forEach(t => {
            const c = t.category || 'Other';
            map[c] = (map[c] || 0) + t.amount;
        });
        return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    }, [monthlyTransactions]);

    const incomeChartData = useMemo(() => {
        const map: Record<string, number> = {};
        monthlyTransactions.filter(t => t.type === 'income').forEach(t => {
            const c = t.category || 'Other';
            map[c] = (map[c] || 0) + t.amount;
        });
        return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    }, [monthlyTransactions]);

    const weeklyTrendData = useMemo(() => {
        const start = startOfMonth(new Date(selectedMonth));
        const end = endOfMonth(new Date(selectedMonth));
        const weeks = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });
        
        return weeks.map((wStart, i) => {
            const wEnd = endOfWeek(wStart, { weekStartsOn: 1 });
            const income = monthlyTransactions.filter(t => t.type === 'income' && t.date >= wStart && t.date <= wEnd).reduce((s, t) => s + t.amount, 0);
            const expense = monthlyTransactions.filter(t => t.type === 'expense' && t.date >= wStart && t.date <= wEnd).reduce((s, t) => s + t.amount, 0);
            return {
                name: `Week ${i + 1}`,
                income,
                expense
            };
        });
    }, [monthlyTransactions, selectedMonth]);

    const dailySpendingData = useMemo(() => {
        const start = startOfMonth(new Date(selectedMonth));
        const end = endOfMonth(new Date(selectedMonth));
        const days = eachDayOfInterval({ start, end });
        
        return days.map(d => {
            const amount = monthlyTransactions.filter(t => t.type === 'expense' && isSameDay(new Date(t.date), d)).reduce((s, t) => s + t.amount, 0);
            return {
                date: format(d, 'dd'),
                amount
            };
        });
    }, [monthlyTransactions, selectedMonth]);

    const handleDownloadPdf = async () => {
        if (!reportRef.current) return;
        setDownloading(true);
        try {
            const canvas = await html2canvas(reportRef.current, { 
                scale: 2, 
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const imgHeight = (canvas.height * pageWidth) / canvas.width;
            
            pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, imgHeight > pageHeight ? pageHeight : imgHeight);
            
            pdf.save(`MoneyMap-Financial-Report-${selectedMonth}.pdf`);
            toast({ title: "Report Ready", description: "PDF downloaded successfully." });
        } catch (error) {
            console.error(error);
            toast({ title: "Export Error", description: "Could not generate professional PDF.", variant: "destructive" });
        } finally {
            setDownloading(false);
        }
    };

    const handleUpdateTransaction = async (updated: Transaction) => {
        if (!user || !db) return;
        try {
            const originalAccountId = editingTransaction?.accountId;
            const { id, accountId: newAccountId, ...data } = updated;

            if (!newAccountId) {
                toast({ title: "Error", description: "Please select an account.", variant: "destructive" });
                return;
            }

            const payload = {
                ...data,
                date: Timestamp.fromDate(data.date),
                updatedAt: Timestamp.now(),
                lastModifiedBy: user.uid
            };

            // If account has changed, we must delete from old and set in new
            if (originalAccountId && newAccountId !== originalAccountId) {
                const oldRef = doc(db, 'users', user.uid, 'accounts', originalAccountId, 'transactions', id);
                const newRef = doc(db, 'users', user.uid, 'accounts', newAccountId, 'transactions', id);
                
                await setDoc(newRef, payload);
                await deleteDoc(oldRef);
            } else {
                // Standard update
                const docRef = doc(db, 'users', user.uid, 'accounts', newAccountId, 'transactions', id);
                await updateDoc(docRef, payload);
            }

            toast({ title: "Success", description: "Transaction updated." });
            if (onRefresh) onRefresh();
        } catch (error) {
            console.error("Update failed:", error);
            toast({ title: "Error", description: "Update failed.", variant: "destructive" });
        }
    };

    const handleDeleteTransaction = async (id: string) => {
        if (!user || !db) return;
        try {
            let foundAccId = null;
            // Since MonthlyReport transactions now have accountId from the parent
            const target = monthlyTransactions.find(t => t.id === id);
            if (target?.accountId) {
                foundAccId = target.accountId;
            } else {
                // Fallback scan (inefficient)
                const accountsSnap = await getDocs(collection(db, 'users', user.uid, 'accounts'));
                for(const accDoc of accountsSnap.docs) {
                    const tSnap = await getDoc(doc(db, 'users', user.uid, 'accounts', accDoc.id, 'transactions', id));
                    if (tSnap.exists()) {
                        foundAccId = accDoc.id;
                        break;
                    }
                }
            }

            if (foundAccId) {
                await deleteDoc(doc(db, 'users', user.uid, 'accounts', foundAccId, 'transactions', id));
                toast({ title: "Deleted", description: "Transaction removed." });
                if (onRefresh) onRefresh();
            }
        } catch (error) {
            toast({ title: "Error", description: "Delete failed.", variant: "destructive" });
        }
    };

    return (
        <div className="space-y-8 pb-20">
            <Card className="relative overflow-hidden border-0 shadow-xl bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-950 p-6">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5" />
                <div className="relative flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600">
                            <CalendarClock className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                Monthly Performance
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1">Report for {format(new Date(selectedMonth), 'MMMM yyyy')}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                            <SelectTrigger className="w-full sm:w-[200px]">
                                <SelectValue placeholder="Select Month" />
                            </SelectTrigger>
                            <SelectContent>
                                {availableMonths.map(m => (
                                    <SelectItem key={m} value={m}>{format(new Date(m), 'MMMM yyyy')}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button onClick={handleDownloadPdf} disabled={generating || downloading || monthlyTransactions.length === 0} variant="outline" className="border-primary text-primary hover:bg-primary/5">
                            {downloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                            Download PDF
                        </Button>
                    </div>
                </div>
            </Card>

            {generating ? (
                <div className="flex flex-col items-center justify-center h-96">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                    <p className="text-muted-foreground">Aggregating your financial data...</p>
                </div>
            ) : monthlyTransactions.length > 0 ? (
                <div ref={reportRef} className="space-y-8 bg-white dark:bg-slate-950 p-4 sm:p-8 rounded-2xl">
                    {/* PDF Header Section */}
                    <div className="flex items-center justify-between border-b pb-6 mb-4">
                        <div>
                            <h1 className="text-3xl font-bold text-primary">MoneyMap Financial Report</h1>
                            <p className="text-muted-foreground">{format(new Date(selectedMonth), 'MMMM yyyy')} Summary</p>
                        </div>
                        <div className="text-right text-sm text-muted-foreground">
                            <p>Generated on: {format(new Date(), 'dd/MM/yyyy')}</p>
                            <p>User: {user?.displayName || 'Authorized Member'}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                        {[
                            { label: 'Income', val: stats.income, icon: TrendingUp, color: 'text-emerald-600', trend: stats.incomeTrend },
                            { label: 'Expenses', val: stats.expenses, icon: TrendingDown, color: 'text-rose-600', trend: stats.expenseTrend },
                            { label: 'Savings', val: stats.savings, icon: PiggyBank, color: 'text-blue-600', trend: null },
                            { label: 'Savings Rate', val: `${stats.savingsRate.toFixed(1)}%`, icon: PieChartIcon, color: 'text-purple-600', trend: null, isCurrency: false },
                            { label: 'Top Category', val: stats.topCat, icon: BarChart3, color: 'text-amber-600', trend: null, isCurrency: false },
                        ].map((item, i) => (
                            <Card key={i} className="border border-slate-100 dark:border-slate-800 shadow-sm">
                                <CardContent className="p-5">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className={`p-2 rounded-lg bg-slate-50 dark:bg-slate-900 ${item.color}`}>
                                            <item.icon className="h-5 w-5" />
                                        </div>
                                        {item.trend !== null && (
                                            <div className={cn("flex items-center text-xs font-bold", item.trend >= 0 ? "text-emerald-600" : "text-rose-600")}>
                                                {item.trend >= 0 ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
                                                {Math.abs(item.trend).toFixed(0)}%
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-tighter">{item.label}</p>
                                    <p className="text-xl font-bold mt-1 text-slate-900 dark:text-slate-100 truncate">
                                        {item.isCurrency === false ? item.val : formatCurrency(item.val as number)}
                                    </p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    <Card className="border-0 shadow-lg">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <BarChart3 className="h-5 w-5 text-primary" />
                                Weekly Cash Flow
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={weeklyTrendData} margin={{top: 20, right: 30, left: 20, bottom: 5}}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                        <YAxis axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v/1000}k`} />
                                        <Tooltip 
                                            cursor={{fill: 'rgba(99, 102, 241, 0.05)'}}
                                            formatter={(v) => formatCurrency(v as number)}
                                            contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}}
                                        />
                                        <Legend />
                                        <Bar dataKey="income" fill="#6366f1" radius={[4, 4, 0, 0]} name="Income" />
                                        <Bar dataKey="expense" fill="#f43f5e" radius={[4, 4, 0, 0]} name="Expense" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <Card className="border-0 shadow-lg">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <PieChartIcon className="h-5 w-5 text-rose-500" />
                                    Expense Breakdown
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[300px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={expenseChartData}
                                                innerRadius={60}
                                                outerRadius={90}
                                                paddingAngle={5}
                                                dataKey="value"
                                                stroke="none"
                                            >
                                                {expenseChartData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                                <LabelList 
                                                    dataKey="name" 
                                                    position="outside" 
                                                    style={{fontSize: '10px', fill: 'currentColor', opacity: 0.7}} 
                                                />
                                            </Pie>
                                            <Tooltip formatter={(v) => formatCurrency(v as number)} />
                                            <Legend verticalAlign="middle" align="right" layout="vertical" />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-0 shadow-lg">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Wallet className="h-5 w-5 text-emerald-500" />
                                    Income Sources
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[300px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={incomeChartData}
                                                innerRadius={0}
                                                outerRadius={90}
                                                dataKey="value"
                                                stroke="none"
                                            >
                                                {incomeChartData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip formatter={(v) => formatCurrency(v as number)} />
                                            <Legend verticalAlign="middle" align="right" layout="vertical" />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card className="border-0 shadow-lg">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <LineChart className="h-5 w-5 text-blue-500" />
                                Daily Spending Spikes
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[250px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RechartsLineChart data={dailySpendingData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                                        <YAxis hide />
                                        <Tooltip 
                                            formatter={(v) => formatCurrency(v as number)}
                                            contentStyle={{borderRadius: '12px'}}
                                        />
                                        <Line type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={3} dot={{r: 4, fill: '#3b82f6'}} activeDot={{r: 6}} name="Spent" />
                                    </RechartsLineChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="space-y-4 pt-8">
                        <h2 className="text-2xl font-bold">Transaction Record</h2>
                        <TransactionList 
                            transactions={monthlyTransactions} 
                            onEdit={(t) => {
                                setEditingTransaction(t);
                                setIsTransactionModalOpen(true);
                            }}
                            onDelete={handleDeleteTransaction}
                        />
                    </div>

                    {/* PDF Footer Section */}
                    <div className="mt-12 pt-8 border-t text-center text-xs text-muted-foreground">
                        <p>Generated by MoneyMap AI Financial Assistant</p>
                        <p>© {new Date().getFullYear()} MoneyMap. All rights reserved.</p>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-96 text-center">
                    <p className="text-xl font-semibold">No Activity Recorded</p>
                    <p className="text-muted-foreground mt-2">You didn't record any transactions for this month.</p>
                    <Button className="mt-8" onClick={() => router.push('/dashboard')}>Back to Dashboard</Button>
                </div>
            )}

            <TransactionModal
                isOpen={isEditModalOpen}
                onClose={() => setIsTransactionModalOpen(false)}
                onSave={handleUpdateTransaction}
                transaction={editingTransaction}
            />
        </div>
    );
}
