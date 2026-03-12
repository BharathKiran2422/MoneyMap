'use client';

import { useState, useEffect, useMemo } from 'react';
import { Transaction, Account } from '@/types';
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
import { MoreVertical, Pencil, Trash2, ChevronLeft, ChevronRight, ArrowUpDown, RotateCcw, Upload, CalendarIcon, Search, Filter } from 'lucide-react';
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
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { useAuth } from '@/lib/auth';


type Props = {
  transactions: Transaction[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: string) => void;
};

const TRANSACTIONS_PER_PAGE = 10;

export default function TransactionList({ transactions, onEdit, onDelete }: Props) {
    const { user } = useAuth();
    const [currentPage, setCurrentPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
    const [sortConfig, setSortConfig] = useState<{ key: 'date' | 'amount'; direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });
    const { toast } = useToast();
    const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>();
    const [exportPopoverOpen, setExportPopoverOpen] = useState(false);
    const [accountsMap, setAccountsMap] = useState<Record<string, string>>({});

    useEffect(() => {
        if (user) {
            getDocs(collection(db!, 'users', user.uid, 'accounts')).then(snap => {
                const map: Record<string, string> = {};
                snap.docs.forEach(d => map[d.id] = d.data().name);
                setAccountsMap(map);
            });
        }
    }, [user]);

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
        setCurrentPage(1);
    }, [searchQuery, categoryFilter, typeFilter, sortConfig]);
    
    const handlePrevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));
    const handleNextPage = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages));
    
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
    };

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
            toast({ title: "No data to export", description: "There are no transactions in the selected period." });
            return;
        }
    
        const dataForCsv = transactionsToExport.map(t => ({
            Date: format(new Date(t.date), 'yyyy-MM-dd'),
            Description: t.description,
            Category: t.category || 'N/A',
            Type: t.type,
            Amount: t.amount,
            Account: t.accountId ? (accountsMap[t.accountId] || 'Unknown') : 'N/A'
        }));

        const csvData = Papa.unparse(dataForCsv);
        const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    
        toast({ title: 'Export successful', description: 'Your transaction report has been downloaded.' });
        setExportPopoverOpen(false);
    };

  return (
    <Card className="border-0 shadow-lg overflow-hidden bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Find a transaction..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-background/50 border-slate-200 dark:border-slate-800"
                />
            </div>
            <div className="flex flex-wrap items-center gap-2">
                <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as any)}>
                    <SelectTrigger className="w-[120px] bg-background/50">
                        <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="income">Income</SelectItem>
                        <SelectItem value="expense">Expense</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-[160px] bg-background/50">
                        <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {uniqueCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Button variant="ghost" size="icon" onClick={handleClearFilters} className="text-muted-foreground">
                    <RotateCcw className="h-4 w-4" />
                </Button>
                <Separator orientation="vertical" className="h-8 mx-1 hidden sm:block" />
                <Popover open={exportPopoverOpen} onOpenChange={setExportPopoverOpen}>
                    <PopoverTrigger asChild>
                        <Button variant="outline" className="gap-2">
                            <Upload className="h-4 w-4" />
                            Export
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-2" align="end">
                        <Button variant="ghost" className="w-full justify-start text-sm" onClick={() => handleExport('current-month')}>Current Month</Button>
                        <Button variant="ghost" className="w-full justify-start text-sm" onClick={() => handleExport('all-time')}>All Time</Button>
                    </PopoverContent>
                </Popover>
            </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="overflow-x-auto">
            <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
                    <TableRow>
                        <TableHead className="w-[250px]">Description</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Account</TableHead>
                        <TableHead className="cursor-pointer hover:text-primary transition-colors" onClick={() => setSortConfig({ key: 'date', direction: sortConfig.direction === 'asc' ? 'desc' : 'asc' })}>
                            <div className="flex items-center gap-1">
                                Date
                                <ArrowUpDown className="h-3 w-3" />
                            </div>
                        </TableHead>
                        <TableHead className="text-right cursor-pointer hover:text-primary transition-colors" onClick={() => setSortConfig({ key: 'amount', direction: sortConfig.direction === 'asc' ? 'desc' : 'asc' })}>
                            <div className="flex items-center justify-end gap-1">
                                Amount
                                <ArrowUpDown className="h-3 w-3" />
                            </div>
                        </TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {paginatedTransactions.length > 0 ? (
                        paginatedTransactions.map((t) => (
                            <TableRow key={t.id} className="group border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                                <TableCell className="font-medium">{t.description}</TableCell>
                                <TableCell>
                                    <Badge className={cn("font-normal", t.type === 'income' ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-rose-500/10 text-rose-600 border-rose-500/20")}>
                                        {t.type}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <span className="text-sm text-muted-foreground">{t.category || 'Other'}</span>
                                </TableCell>
                                <TableCell>
                                    <span className="text-sm">{t.accountId ? (accountsMap[t.accountId] || 'Loading...') : '-'}</span>
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                    {format(new Date(t.date), 'MMM d, yyyy')}
                                </TableCell>
                                <TableCell className={cn("text-right font-bold", t.type === 'income' ? "text-emerald-600" : "text-rose-600")}>
                                    {t.type === 'income' ? '+' : '-'} {formatCurrency(t.amount)}
                                </TableCell>
                                <TableCell>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-32">
                                            <DropdownMenuItem onClick={() => onEdit(t)}>
                                                <Pencil className="h-4 w-4 mr-2" />
                                                Edit
                                            </DropdownMenuItem>
                                            <DropdownMenuItem className="text-rose-600" onClick={() => onDelete(t.id)}>
                                                <Trash2 className="h-4 w-4 mr-2" />
                                                Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={7} className="h-64 text-center">
                                <div className="flex flex-col items-center justify-center text-muted-foreground">
                                    <Filter className="h-8 w-8 mb-2 opacity-20" />
                                    <p>No transactions match your criteria.</p>
                                </div>
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
      </CardContent>
      {totalPages > 1 && (
        <CardFooter className="px-6 py-4 flex items-center justify-between border-t bg-slate-50/30 dark:bg-slate-900/30">
            <p className="text-sm text-muted-foreground">Showing {(currentPage - 1) * TRANSACTIONS_PER_PAGE + 1} to {Math.min(currentPage * TRANSACTIONS_PER_PAGE, filteredAndSortedTransactions.length)} of {filteredAndSortedTransactions.length}</p>
            <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handlePrevPage} disabled={currentPage === 1}>
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={handleNextPage} disabled={currentPage === totalPages}>
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        </CardFooter>
      )}
    </Card>
  );
}
