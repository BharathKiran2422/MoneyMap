
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2, Sparkles, Wand2, Target, PiggyBank, ArrowRight, AlertTriangle, CheckCircle, Calculator, TrendingUp } from 'lucide-react';
import { generateLifeEventPlan, LifeEventPlanOutput } from '@/ai/flows/life-event-planner';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';

const formSchema = z.object({
  goal: z.string().min(3, 'Goal must be at least 3 characters long.'),
  targetAmount: z.coerce.number().positive('Target amount must be a positive number.'),
  monthlyIncome: z.coerce.number().positive('Monthly income must be a positive number.'),
  years: z.coerce.number().min(1, 'Timeframe must be at least 1 year.'),
});

type FormValues = z.infer<typeof formSchema>;

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
};

export default function LifeEventPlanner() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<LifeEventPlanOutput | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      goal: '',
      targetAmount: undefined,
      years: undefined,
      monthlyIncome: undefined,
    },
  });

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    setPlan(null);
    try {
      const result = await generateLifeEventPlan(values);
      setPlan(result);
    } catch (error: any) {
      console.error(error);
      toast({
        title: 'Error Generating Plan',
        description: error.message || 'Could not create a financial plan at this time.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const grandTotalFutureValue = plan?.investmentSuggestions?.reduce((sum, item) => sum + item.futureValue, 0) ?? 0;
  
  const renderPlan = () => {
    if (!plan) return null;

    if (!plan.isFeasible && plan.feasibilityAnalysis) {
        return (
            <div className="space-y-6 w-full">
                {/* Plan Title Header */}
                <div className="relative overflow-hidden rounded-xl border-0 shadow-xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/50 dark:to-orange-950/50 p-8 text-center">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-orange-500/5" />
                    <div className="relative">
                        <div className="flex items-center justify-center gap-3 mb-4">
                            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white">
                                <AlertTriangle className="h-6 w-6" />
                            </div>
                        </div>
                        <h2 className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                            {plan.planTitle}
                        </h2>
                        <p className="text-muted-foreground mt-2">Let's find a realistic path to your goal</p>
                    </div>
                </div>

                {/* Feasibility Analysis */}
                <Card className="border-amber-500/30 bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/20">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-amber-700 dark:text-amber-400">
                           <Calculator className="h-5 w-5" />
                           Current Plan Analysis
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="text-center p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
                                <p className="text-sm text-muted-foreground mb-1">Required Monthly Savings</p>
                                <p className="text-2xl font-bold text-red-600">{formatCurrency(plan.feasibilityAnalysis.requiredMonthlySavings)}</p>
                            </div>
                            <div className="text-center p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
                                <p className="text-sm text-muted-foreground mb-1">Your Max Affordable Savings</p>
                                <p className="text-2xl font-bold text-emerald-600">{formatCurrency(plan.feasibilityAnalysis.maxAffordableSavings)}</p>
                            </div>
                        </div>
                        <div className="text-center pt-4">
                            <p className="text-sm text-muted-foreground mb-2">The good news? You can still achieve your goal!</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Alternative Solution */}
                <Card className="border-emerald-500/30 bg-gradient-to-br from-emerald-50/50 to-green-50/50 dark:from-emerald-950/20 dark:to-green-950/20">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-emerald-700 dark:text-emerald-400">
                           <CheckCircle className="h-5 w-5" />
                           Your Achievable Timeline
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="text-center p-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
                            <p className="text-sm text-muted-foreground mb-2">You can reach your goal in:</p>
                            <p className="text-4xl font-bold text-emerald-600 mb-2">{plan.feasibilityAnalysis.minimumFeasibleTimeframe}</p>
                            <p className="text-sm text-muted-foreground">
                                Saving {formatCurrency(plan.feasibilityAnalysis.maxAffordableSavings)} per month
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Calculation Breakdown */}
                <Card className="bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-950 border-0 shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                           <TrendingUp className="h-5 w-5" />
                           How We Calculated This
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground">
                            {plan.feasibilityAnalysis.calculationBreakdown.map((step, index) => (
                                <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-white/50 dark:bg-slate-800/50">
                                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-xs font-semibold text-blue-600 dark:text-blue-400">
                                        {index + 1}
                                    </div>
                                    <p className="text-sm">{step}</p>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Summary */}
                <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
                    <CardContent className="pt-6">
                        <p className="text-center text-muted-foreground italic leading-relaxed">{plan.summary}</p>
                    </CardContent>
                </Card>
            </div>
        );
    }
    
    if (plan.isFeasible && plan.monthlySavings && plan.investmentSuggestions) {
        return (
            <div className="space-y-6 w-full">
                {/* Plan Title Header */}
                <div className="relative overflow-hidden rounded-xl border-0 shadow-xl bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-950 p-8 text-center">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5" />
                    <div className="relative">
                        <div className="flex items-center justify-center gap-3 mb-4">
                            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 text-white">
                                <Target className="h-6 w-6" />
                            </div>
                        </div>
                        <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                            {plan.planTitle}
                        </h2>
                        <p className="text-muted-foreground mt-2">Your personalized investment roadmap</p>
                    </div>
                </div>

                {/* Monthly Savings Card */}
                <Card className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/20 dark:to-green-950/20 border-emerald-200 dark:border-emerald-800">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-emerald-700 dark:text-emerald-400">
                           <PiggyBank className="h-5 w-5" />
                           Monthly Savings Target
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-center p-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
                            <p className="text-4xl font-bold text-emerald-600 mb-2">{formatCurrency(plan.monthlySavings.amount)}</p>
                            <p className="text-muted-foreground">{plan.monthlySavings.summary}</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Investment Strategy */}
                <div className="space-y-4">
                    <div className="text-center">
                        <h3 className="text-xl font-semibold text-foreground mb-2">Your Investment Strategy</h3>
                        <p className="text-muted-foreground">Diversified approach to maximize returns while managing risk</p>
                    </div>
                    
                    <div className="grid gap-4">
                        {plan.investmentSuggestions.map((item, index) => (
                            <Card key={index} className="transition-all duration-200 hover:shadow-lg">
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-sm font-bold">
                                                {index + 1}
                                            </div>
                                            {item.type}
                                        </CardTitle>
                                        <Badge variant="secondary" className="px-3 py-1">
                                            {item.suggestedAllocation}
                                        </Badge>
                                    </div>
                                    <CardDescription className="flex items-center gap-2">
                                        <TrendingUp className="h-4 w-4 text-green-500" />
                                        Expected Return: <span className="font-semibold text-green-600">{item.estimatedReturn}</span>
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                                    <Separator />
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="text-center p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                                            <p className="text-xs text-muted-foreground mb-1">Monthly Investment</p>
                                            <p className="font-bold text-lg text-blue-600">{formatCurrency(item.monthlyInvestment)}</p>
                                        </div>
                                        <div className="text-center p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                                            <p className="text-xs text-muted-foreground mb-1">Projected Value</p>
                                            <p className="font-bold text-lg text-purple-600">{formatCurrency(item.futureValue)}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>

                {/* Grand Total */}
                <Card className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border-blue-200 dark:border-purple-800">
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between text-xl">
                            <span className="flex items-center gap-2">
                                <Sparkles className="h-6 w-6 text-blue-600" />
                                Projected Total Value
                            </span>
                            <span className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                {formatCurrency(grandTotalFutureValue)}
                            </span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-center p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                            <p className="text-sm text-muted-foreground">
                                This projection assumes consistent monthly investments and average market returns over your timeframe.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Disclaimer */}
                <Card className="bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-900 dark:to-gray-950 border-slate-200 dark:border-gray-800">
                    <CardContent className="pt-6">
                        <p className="text-sm text-muted-foreground italic text-center leading-relaxed">
                            {plan.summary}
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return null;
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="grid lg:grid-cols-5 gap-8 items-start">
        {/* Form Section */}
        <div className="lg:col-span-2">
          <Card className="sticky top-6 shadow-lg border-0 bg-transparent">
            <div className='relative overflow-hidden rounded-xl border-0 shadow-xl bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-950'>
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5" />
              <CardHeader className='relative'>
                <CardTitle className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 text-white">
                    <Target className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Plan Your Goal</h3>
                    <p className="text-sm text-muted-foreground font-normal">Start your financial journey</p>
                  </div>
                </CardTitle>
                <CardDescription>
                  Tell us about your financial goal and we'll create a personalized investment strategy to help you achieve it.
                </CardDescription>
              </CardHeader>
              <CardContent className='relative'>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="goal"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>What's your financial goal?</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="e.g., Buy a new car, House down payment, Wedding expenses" 
                              {...field} 
                              className="h-11"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="targetAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Target Amount (₹)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="e.g., 5,00,000" 
                              {...field} 
                              value={field.value ?? ''} 
                              className="h-11"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="monthlyIncome"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Monthly Income (₹)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="e.g., 80,000" 
                              {...field} 
                              value={field.value ?? ''} 
                              className="h-11"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="years"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Time to achieve (years)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="e.g., 3" 
                              {...field} 
                              value={field.value ?? ''} 
                              className="h-11"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" disabled={loading} className="w-full h-12" size="lg">
                      {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Sparkles className="mr-2 h-5 w-5" />}
                      {loading ? 'Creating Your Plan...' : 'Generate My Investment Plan'}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </div>
          </Card>
        </div>

        {/* Results Section */}
        <div className="lg:col-span-3">
          <div className="min-h-[600px] flex items-center justify-center">
            {loading ? (
              <div className="text-center">
                <div className="relative">
                  <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-white" />
                  </div>
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 opacity-20 animate-pulse"></div>
                </div>
                <h3 className="font-semibold text-xl text-foreground mb-2">Crafting your personalized plan...</h3>
                <p className="text-muted-foreground">Analyzing your goals and creating the perfect investment strategy</p>
              </div>
            ) : plan ? (
              renderPlan()
            ) : (
              <div className="text-center p-8 max-w-md">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-blue-400/10 to-purple-500/10 flex items-center justify-center">
                  <Wand2 className="h-10 w-10 text-primary/60" />
                </div>
                <h3 className="font-semibold text-xl text-foreground mb-3">Ready to plan your future?</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Fill out the form to get a comprehensive investment strategy tailored to your financial goals and timeline.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
