import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Transaction } from "@/types";
import { TrendingUp, TrendingDown, Wallet, BarChart } from "lucide-react";

type Props = {
  transactions: Transaction[];
  title?: string;
  description?: string;
};

export default function AccountOverview({ 
  transactions, 
  title = "Overall Financial Snapshot", 
  description = "A quick summary of your financial activity across all accounts." 
}: Props) {
  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = totalIncome - totalExpenses;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  return (
    <Card className="relative overflow-hidden border-0 shadow-xl bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-950">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5" />
        <CardHeader className="relative pb-6">
            <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-500/10">
                    <BarChart className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                    <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        {title}
                    </CardTitle>
                    <CardDescription className="text-sm text-muted-foreground mt-1">
                        {description}
                    </CardDescription>
                </div>
            </div>
        </CardHeader>
        <CardContent className="relative">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 hover:shadow-lg transition-all duration-300">
                    <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Total Income</h3>
                        <TrendingUp className="h-5 w-5 text-emerald-500" />
                    </div>
                    <div className="text-2xl font-bold">{formatCurrency(totalIncome)}</div>
                </div>
                <div className="p-6 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 hover:shadow-lg transition-all duration-300">
                    <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Total Expenses</h3>
                        <TrendingDown className="h-5 w-5 text-rose-500" />
                    </div>
                    <div className="text-2xl font-bold">{formatCurrency(totalExpenses)}</div>
                </div>
                <div className="p-6 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 hover:shadow-lg transition-all duration-300">
                    <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Current Balance</h3>
                        <Wallet className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="text-2xl font-bold">{formatCurrency(balance)}</div>
                </div>
            </div>
        </CardContent>
    </Card>
  );
}
