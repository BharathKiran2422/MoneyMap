import { Transaction } from '@/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Button } from '../ui/button';
import { ArrowRight, ListChecks } from 'lucide-react';

type Props = {
  transactions: Transaction[];
  accountId?: string | null;
};

export default function RecentTransactions({ transactions, accountId }: Props) {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
          style: 'currency',
          currency: 'INR',
        }).format(amount);
    };

  const recentTransactions = transactions.slice(0, 5);

  return (
    <Card className="relative overflow-hidden border-0 shadow-xl bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-950">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5" />
      <CardHeader className='relative flex flex-row items-center justify-between pb-4'>
        <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-500/10">
                <ListChecks className="h-6 w-6 text-blue-600" />
            </div>
            <div>
                <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    {accountId ? "Recent Transactions" : "All Recent Transactions"}
                </CardTitle>
                <CardDescription className="text-sm text-muted-foreground mt-1">
                    {accountId 
                        ? "Your last five transactions for this account."
                        : "Your last five transactions from all accounts."
                    }
                </CardDescription>
            </div>
        </div>
        {accountId && (
           <Button variant="ghost" asChild>
             <Link href={`/dashboard/accounts/${accountId}`}>
               View All <ArrowRight className="ml-2 h-4 w-4" />
             </Link>
           </Button>
        )}
      </CardHeader>
      <CardContent className="relative">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Description</TableHead>
              <TableHead className="hidden sm:table-cell">Category</TableHead>
              <TableHead className="hidden sm:table-cell">Date</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentTransactions.length > 0 ? (
              recentTransactions.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.description}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant="secondary">{t.category || '-'}</Badge>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">{format(new Date(t.date), 'MMM d, yyyy')}</TableCell>
                  <TableCell className={cn('text-right font-semibold', {
                      'text-emerald-600': t.type === 'income',
                      'text-rose-600': t.type === 'expense'
                  })}>
                      {t.type === 'income' ? '+' : '-'} {formatCurrency(t.amount)}
                  </TableCell>
                </TableRow>
              ))
            ) : (
                <TableRow>
                    <TableCell colSpan={4} className="text-center h-24">No recent transactions.</TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
