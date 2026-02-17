'use client';

import { useMemo } from 'react';
import { Transaction } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { PieChart as PieChartIcon } from 'lucide-react';

type Props = {
  transactions: Transaction[];
  type: 'income' | 'expense';
  title: string;
};

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(217, 85%, 70%)',
  'hsl(38, 85%, 60%)',
];

export default function CategoryPieChart({ transactions, type, title }: Props) {
  const chartData = useMemo(() => {
    const categoryMap = new Map<string, number>();
    transactions
      .filter((t) => t.type === type)
      .forEach((t) => {
        const category = t.category || 'Uncategorized';
        const currentAmount = categoryMap.get(category) || 0;
        categoryMap.set(category, currentAmount + t.amount);
      });

    return Array.from(categoryMap.entries()).map(([name, value]) => ({
      name,
      value,
    })).sort((a, b) => b.value - a.value);
  }, [transactions, type]);

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
  };

  return (
    <Card className="relative overflow-hidden border-0 shadow-xl bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-950">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5" />
      <CardHeader className="relative pb-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-500/10">
            <PieChartIcon className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {title}
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground mt-1">
              A breakdown of your {type} by category across all accounts.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="relative">
        {chartData.length > 0 ? (
          <ChartContainer config={{}} className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Tooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, name) => (
                        <div className="flex flex-col">
                           <span>{name}: {formatCurrency(Number(value))}</span>
                           <span className='text-xs text-muted-foreground'>{total > 0 ? ((Number(value)/total)*100).toFixed(1) : 0}%</span>
                        </div>
                      )}
                    />
                  }
                />
                <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>
        ) : (
          <div className="flex h-[300px] items-center justify-center text-muted-foreground">
            No {type} data to display.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
