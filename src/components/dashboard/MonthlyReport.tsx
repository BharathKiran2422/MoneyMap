// src/components/dashboard/MonthlyReport.tsx
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Transaction } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, FileDown, CalendarClock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { useSearchParams } from 'next/navigation';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

import AccountOverview from '@/components/dashboard/AccountOverview';
import CategoryPieChart from '@/components/dashboard/CategoryPieChart';
import SpendingChart from '@/components/dashboard/SpendingChart';
import TransactionList from '@/components/dashboard/TransactionList';

type Props = {
    allTransactions: Transaction[];
};

export default function MonthlyReport({ allTransactions }: Props) {
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const [selectedMonth, setSelectedMonth] = useState<string>(format(subMonths(new Date(), 1), 'yyyy-MM'));
    const [monthlyTransactions, setMonthlyTransactions] = useState<Transaction[]>([]);
    const [generating, setGenerating] = useState(true);
    const [downloading, setDownloading] = useState(false);
    const reportRef = useRef<HTMLDivElement>(null);

    const availableMonths = useMemo(() => {
        if (allTransactions.length === 0) return [];
        
        const dates = allTransactions.map(t => new Date(t.date));
        const earliestDate = new Date(Math.min(...dates.map(d => d.getTime())));
        const latestDate = new Date();
    
        const months = new Set<string>();
        let currentDate = startOfMonth(latestDate);
    
        while (currentDate >= startOfMonth(earliestDate)) {
            months.add(format(currentDate, 'yyyy-MM'));
            currentDate = subMonths(currentDate, 1);
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
        setTimeout(() => setGenerating(false), 500); // simulate generation time
    }, [selectedMonth, allTransactions]);

    const handleDownloadPdf = async () => {
        if (!reportRef.current) {
            toast({ title: "Error", description: "Report content not found.", variant: "destructive" });
            return;
        }

        setDownloading(true);
        try {
            const canvas = await html2canvas(reportRef.current, {
                scale: 2,
                useCORS: true,
                backgroundColor: null // Use transparent background
            });
            const imgData = canvas.toDataURL('image/png');
            
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'px',
                format: [canvas.width, canvas.height]
            });
            
            pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
            pdf.save(`FiscalFlow-Report-${selectedMonth}.pdf`);

        } catch (error) {
            console.error("Error generating PDF:", error);
            toast({ title: "Error", description: "Could not generate PDF.", variant: "destructive" });
        } finally {
            setDownloading(false);
        }
    };
    
    return (
        <div className="space-y-6">
            <Card className="relative overflow-hidden border-0 shadow-xl bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-950 p-6">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5" />
                <div className="relative flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-500/10">
                            <CalendarClock className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                Monthly Financial Report
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                Generate a detailed financial summary for any month.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                        <Select value={selectedMonth} onValueChange={setSelectedMonth} disabled={availableMonths.length === 0}>
                            <SelectTrigger className="w-full sm:w-[200px]">
                                <SelectValue placeholder="Select a month" />
                            </SelectTrigger>
                            <SelectContent>
                                {availableMonths.map(month => (
                                    <SelectItem key={month} value={month}>
                                        {format(new Date(month), 'MMMM yyyy')}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button onClick={handleDownloadPdf} disabled={generating || downloading || monthlyTransactions.length === 0}>
                            {downloading ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <FileDown className="mr-2 h-4 w-4" />
                            )}
                            Download PDF
                        </Button>
                    </div>
                </div>
            </Card>

            {generating ? (
                <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                    <p className="text-lg font-semibold text-foreground">Generating your report for {format(new Date(selectedMonth), 'MMMM yyyy')}...</p>
                </div>
            ) : monthlyTransactions.length > 0 ? (
                <div ref={reportRef} className="bg-background p-4 sm:p-8 rounded-lg space-y-8">
                    <div className='text-center space-y-2 mb-8'>
                        <h1 className='text-3xl font-bold'>Financial Report</h1>
                        <p className='text-xl text-muted-foreground'>{format(new Date(selectedMonth), 'MMMM yyyy')}</p>
                    </div>
                    <AccountOverview transactions={monthlyTransactions} />
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <CategoryPieChart transactions={monthlyTransactions} type="expense" title="Expense Breakdown" />
                        <CategoryPieChart transactions={monthlyTransactions} type="income" title="Income Sources" />
                    </div>
                    <SpendingChart transactions={monthlyTransactions} />
                    <TransactionList 
                        transactions={monthlyTransactions} 
                        onEdit={() => toast({ title: "Read-only", description: "Editing is disabled in report view."})}
                        onDelete={() => toast({ title: "Read-only", description: "Deleting is disabled in report view."})}
                    />
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
                    <p className="text-lg font-semibold text-foreground">No data available for {format(new Date(selectedMonth), 'MMMM yyyy')}.</p>
                    <p className="text-muted-foreground mt-1">Please select another month or add some transactions.</p>
                </div>
            )}
        </div>
    );
}
