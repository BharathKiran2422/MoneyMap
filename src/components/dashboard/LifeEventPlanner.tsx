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
import { Loader2, Sparkles, Wand2, Target, PiggyBank, AlertTriangle, CheckCircle, Calculator, TrendingUp } from 'lucide-react';
import { generateLifeEventPlan, LifeEventPlanOutput } from '@/ai/flows/life-event-planner';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

const formSchema = z.object({
  goal: z.string().min(3, 'Goal is required.'),
  targetAmount: z.coerce.number().positive('Positive amount required.'),
  monthlyIncome: z.coerce.number().positive('Monthly income required.'),
  years: z.coerce.number().min(1, 'At least 1 year.'),
});

type FormValues = z.infer<typeof formSchema>;

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
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
        title: 'Error',
        description: 'Could not create your plan. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const renderPlan = () => {
    if (!plan) return null;

    return (
        <div className="space-y-6 w-full">
            <div className="relative overflow-hidden rounded-xl border-0 shadow-xl bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-950 p-8 text-center">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5" />
                <div className="relative">
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 text-white">
                            {plan.isFeasible ? <Target className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        {plan.planTitle}
                    </h2>
                    <Badge variant={plan.isFeasible ? "default" : "destructive"} className="mt-2">
                        {plan.isFeasible ? "Plan is Feasible" : "Requires Adjustments"}
                    </Badge>
                </div>
            </div>

            <Card className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/20 dark:to-green-950/20">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-wider">
                       <PiggyBank className="h-4 w-4" />
                       Monthly Savings Target
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-4xl font-bold text-emerald-600 mb-1">{formatCurrency(plan.monthlySavings.amount)}</p>
                    <p className="text-muted-foreground text-sm">{plan.monthlySavings.summary}</p>
                </CardContent>
            </Card>

            {!plan.isFeasible && plan.feasibilityAnalysis && (
                <Card className="border-amber-500/30 bg-amber-50/10">
                    <CardHeader>
                        <CardTitle className="text-amber-600 flex items-center gap-2">
                            <Calculator className="h-5 w-5" />
                            Feasibility Analysis
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-2">
                        <p>To achieve this goal in the original timeframe, you need to save {formatCurrency(plan.feasibilityAnalysis.requiredMonthlySavings)} per month.</p>
                        <p className="font-semibold">Recommendation: Extend your timeline to {plan.feasibilityAnalysis.minimumFeasibleTimeframe} to stay within your affordable savings of {formatCurrency(plan.feasibilityAnalysis.maxAffordableSavings)}.</p>
                    </CardContent>
                </Card>
            )}

            <div className="space-y-4">
                <h3 className="font-semibold text-lg">AI-Suggested Strategy</h3>
                <div className="grid gap-4">
                    {plan.investmentSuggestions.map((item, index) => (
                        <Card key={index} className="hover:shadow-md transition-shadow">
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-center">
                                    <CardTitle className="text-md">{item.type}</CardTitle>
                                    <Badge variant="secondary">{item.suggestedAllocation}</Badge>
                                </div>
                                <CardDescription className="text-xs">Estimated Return: {item.estimatedReturn}</CardDescription>
                            </CardHeader>
                            <CardContent className="text-sm">
                                <p className="mb-4 text-muted-foreground">{item.description}</p>
                                <Separator className="my-2" />
                                <div className="flex justify-between items-baseline pt-2">
                                    <div>
                                        <p className="text-xs text-muted-foreground">Monthly</p>
                                        <p className="font-bold">{formatCurrency(item.monthlyInvestment)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-muted-foreground">Value at End</p>
                                        <p className="font-bold text-blue-600">{formatCurrency(item.futureValue)}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            <Card className="bg-muted/50 border-0">
                <CardContent className="pt-6">
                    <p className="text-xs italic text-muted-foreground text-center">{plan.summary}</p>
                </CardContent>
            </Card>
        </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="grid lg:grid-cols-5 gap-8 items-start">
        <div className="lg:col-span-2">
          <Card className="sticky top-6 shadow-xl border-0 bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-950">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-500/10">
                    <Target className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Goal Planner</h3>
                    <p className="text-sm text-muted-foreground">Plan for major life events</p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="goal"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Financial Goal</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Down payment for a house" {...field} />
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
                            <Input type="number" placeholder="5,00,000" {...field} value={field.value ?? ''} />
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
                          <FormLabel>Monthly Net Income (₹)</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="80,000" {...field} value={field.value ?? ''} />
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
                          <FormLabel>Timeframe (Years)</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="5" {...field} value={field.value ?? ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" disabled={loading} className="w-full">
                      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                      Generate My Strategy
                    </Button>
                  </form>
                </Form>
              </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3">
          <div className="min-h-[500px] flex items-center justify-center">
            {loading ? (
              <div className="text-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
                <h3 className="font-semibold text-lg">Crafting your roadmap...</h3>
              </div>
            ) : plan ? (
              renderPlan()
            ) : (
              <div className="text-center p-8 text-muted-foreground">
                <Wand2 className="h-16 w-16 mx-auto mb-4 opacity-20" />
                <h3 className="font-semibold text-xl mb-2">Ready to plan?</h3>
                <p>Fill out the form to get a personalized investment strategy for your next big milestone.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
