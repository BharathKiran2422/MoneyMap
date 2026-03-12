// src/app/page.tsx
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, Mic, ShieldCheck, FileText, ArrowRight, Sparkles, PieChart, Target } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import LandingHeader from "@/components/LandingHeader";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <LandingHeader />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative w-full py-16 sm:py-24 md:py-32 lg:py-40 xl:py-48 overflow-hidden bg-white text-slate-900 border-b">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-50/50 via-transparent to-transparent" />
          
          <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <div className="flex flex-col justify-center space-y-8 animate-in fade-in slide-in-from-left duration-1000">
                <div className="space-y-6">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-bold uppercase tracking-widest">
                    <Bot className="h-3 w-3" />
                    AI-Native Personal Finance
                  </div>
                  <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tighter leading-tight bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    Your Money, <br />Smarter Than Ever.
                  </h1>
                  <p className="text-lg sm:text-xl text-slate-600 leading-relaxed max-w-xl">
                    Experience the future of bookkeeping. Track transactions with natural language, get AI-powered investment roadmaps, and receive proactive budget alerts.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button size="lg" asChild className="w-full sm:w-auto h-14 text-lg bg-primary hover:bg-primary/90 text-white border-0 shadow-lg shadow-primary/20">
                    <Link href="/signup">Get Started for Free</Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild className="w-full sm:w-auto h-14 text-lg border-slate-200 hover:bg-slate-50 text-slate-900">
                    <Link href="#features">Explore Features</Link>
                  </Button>
                </div>
              </div>
              <div className="relative hidden lg:block animate-in fade-in zoom-in duration-1000">
                <div className="absolute -inset-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl blur-3xl opacity-10 animate-pulse" />
                <div className="relative rounded-2xl overflow-hidden shadow-2xl border-8 border-slate-50 bg-white">
                  <Image
                    src="/hero-image.png"
                    width={800}
                    height={600}
                    alt="MoneyMap Dashboard"
                    className="w-full h-auto"
                    priority
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="w-full py-20 sm:py-32 bg-background">
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12">
            <div className="text-center space-y-4 mb-16">
              <h2 className="text-sm font-bold uppercase tracking-[0.3em] text-primary">Capabilities</h2>
              <h3 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">Built for modern financial life</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <Card className="group border-0 shadow-xl bg-slate-50 dark:bg-slate-900/50 hover:bg-white dark:hover:bg-slate-900 transition-all duration-300">
                <CardHeader>
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Mic className="h-6 w-6 text-blue-600" />
                  </div>
                  <CardTitle className="text-xl">NLP Logging</CardTitle>
                  <CardDescription className="text-base">"Spent 500 on dinner yesterday." Simply type or speak, and our AI handles the rest.</CardDescription>
                </CardHeader>
              </Card>

              <Card className="group border-0 shadow-xl bg-slate-50 dark:bg-slate-900/50 hover:bg-white dark:hover:bg-slate-900 transition-all duration-300">
                <CardHeader>
                  <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Bot className="h-6 w-6 text-purple-600" />
                  </div>
                  <CardTitle className="text-xl">AI Financial Co-Pilot</CardTitle>
                  <CardDescription className="text-base">Get a 0-100 health score based on the 50/30/20 rule and actionable improvement tips.</CardDescription>
                </CardHeader>
              </Card>

              <Card className="group border-0 shadow-xl bg-slate-50 dark:bg-slate-900/50 hover:bg-white dark:hover:bg-slate-900 transition-all duration-300">
                <CardHeader>
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <FileText className="h-6 w-6 text-emerald-600" />
                  </div>
                  <CardTitle className="text-xl">Professional Reports</CardTitle>
                  <CardDescription className="text-base">Generate comprehensive monthly PDF summaries with detailed charts and trend analysis.</CardDescription>
                </CardHeader>
              </Card>

              <Card className="group border-0 shadow-xl bg-slate-50 dark:bg-slate-900/50 hover:bg-white dark:hover:bg-slate-900 transition-all duration-300">
                <CardHeader>
                  <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Target className="h-6 w-6 text-amber-600" />
                  </div>
                  <CardTitle className="text-xl">Goal Planner</CardTitle>
                  <CardDescription className="text-base">Plan for big milestones like a house or wedding with AI-driven investment roadmaps.</CardDescription>
                </CardHeader>
              </Card>

              <Card className="group border-0 shadow-xl bg-slate-50 dark:bg-slate-900/50 hover:bg-white dark:hover:bg-slate-900 transition-all duration-300">
                <CardHeader>
                  <div className="w-12 h-12 rounded-xl bg-rose-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <PieChart className="h-6 w-6 text-rose-600" />
                  </div>
                  <CardTitle className="text-xl">Categorical Insights</CardTitle>
                  <CardDescription className="text-base">Visualize where your money flows with automated donut charts and spending breakdown.</CardDescription>
                </CardHeader>
              </Card>

              <Card className="group border-0 shadow-xl bg-slate-50 dark:bg-slate-900/50 hover:bg-white dark:hover:bg-slate-900 transition-all duration-300">
                <CardHeader>
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Sparkles className="h-6 w-6 text-blue-600" />
                  </div>
                  <CardTitle className="text-xl">Smart Alerts</CardTitle>
                  <CardDescription className="text-base">Receive proactive notifications when you hit budget limits or detect spending spikes.</CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </section>

        {/* Security / Trust section */}
        <section className="w-full py-20 bg-slate-50 dark:bg-slate-950 border-y">
            <div className="max-w-4xl mx-auto px-4 text-center space-y-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                    <ShieldCheck className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-3xl font-bold">Secure by Design</h3>
                <p className="text-lg text-muted-foreground leading-relaxed">
                    MoneyMap uses **Firebase's industry-standard encryption** and secure authentication. 
                    Your financial data is private, encrypted, and accessible only to you. 
                    We leverage **Google Gemini AI** to process summarized data, ensuring your raw sensitive details stay protected.
                </p>
            </div>
        </section>

        {/* CTA Section */}
        <section className="w-full py-20 bg-primary text-primary-foreground relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent opacity-50" />
          <div className="relative w-full max-w-4xl mx-auto px-4 text-center space-y-8">
            <h2 className="text-4xl font-extrabold tracking-tight">Ready to take control?</h2>
            <p className="text-xl opacity-90 max-w-2xl mx-auto">
              Join thousands of users who are using MoneyMap to hit their savings goals and achieve financial peace of mind.
            </p>
            <div className="pt-4">
              <Button size="lg" variant="secondary" asChild className="h-14 px-10 text-lg font-bold">
                <Link href="/signup">Join MoneyMap Today <ArrowRight className="ml-2 h-5 w-5" /></Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
