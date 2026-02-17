'use client';

import { useState, useEffect, useMemo } from 'react';
import { Transaction } from '@/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MoreVertical, Pencil, Trash2, ChevronLeft, ChevronRight, ArrowUpDown, RotateCcw, Upload, CalendarIcon } from 'lucide-react';
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth } from 'date-fns';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
  } from "@/components/ui/dropdown-menu"
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import Papa from 'papaparse';
import { DateRange } from 'react-day-picker';
import { Calendar } from '@/components/ui/calendar';
import { Separator } from '@/components/ui/separator';


type Props = {
  transactions: Transaction[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: string) => void;
};

const TRANSACTIONS_PER_PAGE = 10;

export default function TransactionList({ transactions, onEdit, onDelete }: Props) {
    const [currentPage, setCurrentPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
    const [sortConfig, setSortConfig] = useState<{ key: 'date' | 'amount'; direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });
    const { toast } = useToast();
    const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>();
    const [exportPopoverOpen, setExportPopoverOpen] = useState(false);

    const uniqueCategories = useMemo(() => {
        const categories = new Set(transactions.map(t => t.category).filter(Boolean) as string[]);
        return Array.from(categories).sort();
    }, [transactions]);
    
    const filteredAndSortedTransactions = useMemo(() => {
        let processedTransactions = [...transactions];

        // Filter by search query
        if (searchQuery) {
            processedTransactions = processedTransactions.filter(t =>
                t.description.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // Filter by category
        if (categoryFilter !== 'all') {
            processedTransactions = processedTransactions.filter(t => t.category === categoryFilter);
        }
        
        // Filter by type
        if (typeFilter !== 'all') {
            processedTransactions = processedTransactions.filter(t => t.type === typeFilter);
        }

        // Sort
        processedTransactions.sort((a, b) => {
            if (sortConfig.key === 'date') {
                const dateA = new Date(a.date).getTime();
                const dateB = new Date(b.date).getTime();
                return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
            } else { // sort by amount
                return sortConfig.direction === 'asc' ? a.amount - b.amount : b.amount - a.amount;
            }
        });

        return processedTransactions;
    }, [transactions, searchQuery, categoryFilter, typeFilter, sortConfig]);

    const totalPages = Math.ceil(filteredAndSortedTransactions.length / TRANSACTIONS_PER_PAGE);

    const paginatedTransactions = filteredAndSortedTransactions.slice(
        (currentPage - 1) * TRANSACTIONS_PER_PAGE,
        currentPage * TRANSACTIONS_PER_PAGE
    );
    
    useEffect(() => {
        // Reset to first page if filters change
        setCurrentPage(1);
    }, [searchQuery, categoryFilter, typeFilter, sortConfig]);
    
    useEffect(() => {
        if (paginatedTransactions.length === 0 && currentPage > 1) {
            setCurrentPage(currentPage - 1);
        }
    }, [paginatedTransactions.length, currentPage, filteredAndSortedTransactions]);

    const handlePrevPage = () => {
        setCurrentPage((prev) => Math.max(prev - 1, 1));
    };

    const handleNextPage = () => {
        setCurrentPage((prev) => Math.min(prev + 1, totalPages));
    };
    
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
          style: 'currency',
          currency: 'INR',
        }).format(amount);
    };

    const getSortLabel = () => {
        const labels: { [key: string]: string } = {
            date_desc: 'Date: Newest',
            date_asc: 'Date: Oldest',
            amount_desc: 'Amount: High to Low',
            amount_asc: 'Amount: Low to High',
        };
        return labels[`${sortConfig.key}_${sortConfig.direction}`] || 'Sort by';
    }

    const handleClearFilters = () => {
        setSearchQuery('');
        setCategoryFilter('all');
        setTypeFilter('all');
        setSortConfig({ key: 'date', direction: 'desc' });
    };

    const handleExport = (period: 'current-month' | 'all-time' | 'custom', range?: DateRange) => {
        let transactionsToExport: Transaction[] = [];
        let fileName = '';
        const now = new Date();
    
        if (period === 'current-month') {
            const start = startOfMonth(now);
            const end = endOfMonth(now);
            transactionsToExport = transactions.filter(t => {
                const tDate = new Date(t.date);
                return tDate >= start && tDate <= end;
            });
            fileName = `Transaction Report - ${format(now, 'MMMM yyyy')}.csv`;
        } else if (period === 'all-time') {
            transactionsToExport = transactions;
            fileName = `Transaction Report - All Time.csv`;
        } else if (period === 'custom' && range?.from && range?.to) {
            const start = startOfDay(range.from);
            const end = endOfDay(range.to);
            transactionsToExport = transactions.filter(t => {
                const tDate = new Date(t.date);
                return tDate >= start && tDate <= end;
            });
            fileName = `Transaction Report - ${format(start, 'yyyy-MM-dd')}_to_${format(end, 'yyyy-MM-dd')}.csv`;
        }
    
        if (transactionsToExport.length === 0) {
            toast({
                title: "No data to export",
                description: "There are no transactions in the selected period.",
            });
            return;
        }
    
        const dataForCsv = transactionsToExport.map(t => ({
            Date: format(new Date(t.date), 'yyyy-MM-dd'),
            Description: t.description,
            Category: t.category || 'N/A',
            Type: t.type,
            Amount: t.amount,
        }));

        const csvData = Papa.unparse({
            fields: ["Date", "Description", "Category", "Type", "Amount"],
            data: dataForCsv,
        });
    
        const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    
        toast({ title: 'Export successful', description: 'Your transaction report has been downloaded.' });
        
        if (period === 'custom') {
            setCustomDateRange(undefined);
        }
        setExportPopoverOpen(false);
    };

  return (
    <Card className="relative overflow-hidden border-0 shadow-xl bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-950">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5" />
      <CardHeader className="relative flex flex-col gap-4">
        <div className="flex flex-row items-start justify-between">
            <div>
                <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Transaction Log
                </CardTitle>
                <CardDescription>Search, filter, and sort all your income and expenses.</CardDescription>
            </div>
            <Popover open={exportPopoverOpen} onOpenChange={setExportPopoverOpen}>
                <PopoverTrigger asChild>
                    <Button variant="outline" size="icon">
                        <Upload className="h-4 w-4" />
                        <span className="sr-only">Export Transactions</span>
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="end">
                    <div className="space-y-4 p-2">
                        <p className="text-sm font-medium">Export as CSV</p>
                        <div className="space-y-2">
                            <Button variant="ghost" className="w-full justify-start" onClick={() => handleExport('current-month')}>
                                This Month's Report
                            </Button>
                            <Button variant="ghost" className="w-full justify-start" onClick={() => handleExport('all-time')}>
                                All Transactions
                            </Button>
                        </div>
                        <Separator />
                        <div className="space-y-2">
                            <p className="text-sm font-medium">Custom Date Range</p>
                            <div className="grid gap-2">
                                <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                    id="date"
                                    variant={"outline"}
                                    className={cn(
                                        "w-full justify-start text-left font-normal",
                                        !customDateRange && "text-muted-foreground"
                                    )}
                                    >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {customDateRange?.from ? (
                                        customDateRange.to ? (
                                        <>
                                            {format(customDateRange.from, "LLL dd, y")} -{" "}
                                            {format(customDateRange.to, "LLL dd, y")}
                                        </>
                                        ) : (
                                        format(customDateRange.from, "LLL dd, y")
                                        )
                                    ) : (
                                        <span>Pick a date range</span>
                                    )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="end">
                                    <Calendar
                                    initialFocus
                                    mode="range"
                                    defaultMonth={customDateRange?.from}
                                    selected={customDateRange}
                                    onSelect={setCustomDateRange}
                                    numberOfMonths={2}
                                    />
                                </PopoverContent>
                                </Popover>
                            </div>
                            <Button
                                className="w-full"
                                disabled={!customDateRange?.from || !customDateRange?.to}
                                onClick={() => handleExport('custom', customDateRange)}
                            >
                                Download Custom Report
                            </Button>
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
        <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="w-full md:w-auto md:flex-1">
                <Input
                    placeholder="Search descriptions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full md:max-w-xs"
                />
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as 'all' | 'income' | 'expense')}>
                    <SelectTrigger className="w-full sm:w-[130px]">
                        <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="income">Income</SelectItem>
                        <SelectItem value="expense">Expense</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter by category" />
                    </SelectTrigger>
                    <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {uniqueCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                    </SelectContent>
                </Select>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full sm:w-auto justify-start">
                        <ArrowUpDown className="mr-2 h-4 w-4" />
                        <span className="truncate">{getSortLabel()}</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setSortConfig({ key: 'date', direction: 'desc' })}>Date: Newest</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setSortConfig({ key: 'date', direction: 'asc' })}>Date: Oldest</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setSortConfig({ key: 'amount', direction: 'desc' })}>Amount: High to Low</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setSortConfig({ key: 'amount', direction: 'asc' })}>Amount: Low to High</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="ghost" onClick={handleClearFilters} size="icon" title="Clear Filters">
                    <RotateCcw className="h-4 w-4" />
                </Button>
            </div>
        </div>
      </CardHeader>
      
      <CardContent className="relative p-0">
        {/* Desktop View */}
        <div className='hidden md:block min-h-[620px] px-6'>
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead>Description</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-[50px] text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {paginatedTransactions.length > 0 ? (
                paginatedTransactions.map((t) => (
                    <TableRow key={t.id} className="hover:bg-white/5 dark:hover:bg-black/5">
                    <TableCell className="font-medium">{t.description}</TableCell>
                    <TableCell>
                        <span className={cn('px-2.5 py-0.5 text-xs font-semibold rounded-full capitalize', {
                            'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300': t.type === 'income',
                            'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300': t.type === 'expense',
                        })}>
                            {t.type}
                        </span>
                    </TableCell>
                    <TableCell>{t.category || '-'}</TableCell>
                    <TableCell>{format(new Date(t.date), 'MMM d, yyyy')}</TableCell>
                    <TableCell className={cn('text-right font-semibold', {
                        'text-emerald-600': t.type === 'income',
                        'text-rose-600': t.type === 'expense'
                    })}>
                        {t.type === 'income' ? '+' : '-'} {formatCurrency(t.amount)}
                    </TableCell>
                    <TableCell className="text-right">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onEdit(t)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onDelete(t.id)} className="text-destructive focus:text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                    </TableRow>
                ))
                ) : (
                    <TableRow>
                        <TableCell colSpan={6} className="text-center h-[560px]">No transactions found.</TableCell>
                    </TableRow>
                )}
            </TableBody>
            </Table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden p-4 min-h-[500px] flex flex-col">
            <div className="space-y-4 flex-grow">
                {paginatedTransactions.length > 0 ? (
                    paginatedTransactions.map((t) => (
                        <Card key={t.id} className="p-4 flex justify-between items-start bg-white/30 dark:bg-slate-800/30 backdrop-blur-sm border border-slate-200/30 dark:border-slate-700/30 hover:shadow-md transition-shadow">
                            <div className="flex-1 space-y-2">
                                <p className="font-medium truncate">{t.description}</p>
                                <div className='flex flex-wrap gap-2 items-center'>
                                  <span className={cn('px-2 py-0.5 text-xs font-semibold rounded-full capitalize', {
                                      'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300': t.type === 'income',
                                      'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300': t.type === 'expense',
                                  })}>
                                      {t.type}
                                  </span>
                                  {t.category && <Badge variant="secondary" className="font-normal">{t.category}</Badge>}
                                </div>
                                <p className="text-sm text-muted-foreground pt-1">{format(new Date(t.date), 'MMM d, yyyy')}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <p className={cn('font-semibold text-right', {
                                    'text-emerald-600': t.type === 'income',
                                    'text-rose-600': t.type === 'expense'
                                })}>
                                    {t.type === 'income' ? '+' : '-'} {formatCurrency(t.amount)}
                                </p>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                            <span className="sr-only">Open menu</span>
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => onEdit(t)}>
                                            <Pencil className="mr-2 h-4 w-4" />
                                            Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => onDelete(t.id)} className="text-destructive focus:text-destructive">
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Delete
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </Card>
                    ))
                ) : (
                    <div className="text-center h-full flex items-center justify-center text-muted-foreground">
                        <p>No transactions found.</p>
                    </div>
                )}
            </div>
        </div>
      </CardContent>
      {totalPages > 1 && (
        <CardFooter className="relative flex items-center justify-between border-t border-border/50 px-6 py-4">
            <div className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
            </div>
            <div className="flex items-center space-x-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrevPage}
                    disabled={currentPage === 1}
                >
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Previous
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                >
                    Next
                    <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
            </div>
        </CardFooter>
      )}
    </Card>
  );
}
