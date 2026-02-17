// src/app/page.tsx
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { IndianRupee, BarChart, Zap, UserPlus, ListPlus, Lightbulb, Twitter, Linkedin, Facebook, Quote } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import Image from "next/image";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import LandingHeader from "@/components/LandingHeader";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <LandingHeader />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-12 sm:py-16 md:py-24 lg:py-32 xl:py-40 bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-950">
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12">
            <div className="grid gap-8 lg:gap-12 lg:grid-cols-2 lg:items-center">
              <div className="flex flex-col justify-center space-y-6 order-2 lg:order-1">
                <div className="space-y-4">
                  <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tighter leading-tight bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Take Control of Your Finances
                  </h1>
                  <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground leading-relaxed">
                    The simple, smart, and secure way to manage your money. Track spending, visualize habits, and get AI-powered insights to save more.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button size="lg" asChild className="w-full sm:w-auto">
                    <Link href="/signup">Sign Up for Free</Link>
                  </Button>
                </div>
              </div>
              <div className="order-1 lg:order-2 w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg mx-auto">
                <Image
                  src="/hero-image.png"
                  width="600"
                  height="400"
                  alt="Hero"
                  className="w-full h-auto rounded-xl shadow-2xl"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="w-full py-12 sm:py-16 md:py-24 lg:py-32 bg-background">
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12">
            <div className="flex flex-col items-center justify-center space-y-6 text-center">
              <div className="space-y-4">
                <div className="inline-block rounded-lg bg-primary/10 text-primary px-3 py-1 text-sm font-medium">
                  Key Features
                </div>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight">
                  Everything You Need to Succeed
                </h2>
                <p className="max-w-3xl text-lg md:text-xl text-muted-foreground leading-relaxed">
                  MoneyMap is packed with features designed to help you understand your money and achieve your financial goals.
                </p>
              </div>
            </div>
            <div className="mt-12 md:mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <Card className="relative overflow-hidden border-0 shadow-xl bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-950 h-full transition-all hover:-translate-y-2 duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5" />
                <CardHeader className="relative flex flex-row items-center gap-4 pb-4">
                  <div className="bg-blue-500/10 p-3 rounded-full flex-shrink-0">
                    <IndianRupee className="h-6 w-6 text-blue-600" />
                  </div>
                  <CardTitle className="text-lg sm:text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Easy Transaction Entry</CardTitle>
                </CardHeader>
                <CardContent className="relative">
                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                    Quickly log your income and expenses. A clean interface makes tracking effortless.
                  </p>
                </CardContent>
              </Card>
              <Card className="relative overflow-hidden border-0 shadow-xl bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-950 h-full transition-all hover:-translate-y-2 duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5" />
                <CardHeader className="relative flex flex-row items-center gap-4 pb-4">
                  <div className="bg-blue-500/10 p-3 rounded-full flex-shrink-0">
                    <BarChart className="h-6 w-6 text-blue-600" />
                  </div>
                  <CardTitle className="text-lg sm:text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Spending Visualization</CardTitle>
                </CardHeader>
                <CardContent className="relative">
                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                    See where your money goes with simple, beautiful charts. Understand your habits at a glance.
                  </p>
                </CardContent>
              </Card>
              <Card className="relative overflow-hidden border-0 shadow-xl bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-950 h-full md:col-span-2 lg:col-span-1 transition-all hover:-translate-y-2 duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5" />
                <CardHeader className="relative flex flex-row items-center gap-4 pb-4">
                  <div className="bg-blue-500/10 p-3 rounded-full flex-shrink-0">
                    <Zap className="h-6 w-6 text-blue-600" />
                  </div>
                  <CardTitle className="text-lg sm:text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Smart Suggestions</CardTitle>
                </CardHeader>
                <CardContent className="relative">
                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                    Get personalized, AI-driven tips to cut costs and boost your savings.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="w-full py-12 sm:py-16 md:py-24 lg:py-32 bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-950">
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12">
            <div className="flex flex-col items-center justify-center space-y-6 text-center">
              <div className="space-y-4">
                <div className="inline-block rounded-lg bg-primary/10 text-primary px-3 py-1 text-sm font-medium">
                  How It Works
                </div>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight">
                  Get Started in 3 Easy Steps
                </h2>
                <p className="max-w-3xl text-lg md:text-xl text-muted-foreground leading-relaxed">
                  Start managing your finances in minutes. It's that simple.
                </p>
              </div>
            </div>
            <div className="mt-12 md:mt-16 grid grid-cols-1 md:grid-cols-3 gap-12">
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center">
                  <div className="flex items-center justify-center rounded-full bg-blue-500/10 p-4 ring-8 ring-blue-500/5">
                    <UserPlus className="h-8 w-8 text-blue-600" />
                  </div>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold">1. Create Your Account</h3>
                <p className="text-base text-muted-foreground leading-relaxed">
                  Sign up for free in less than a minute. All you need is an email address.
                </p>
              </div>
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center">
                  <div className="flex items-center justify-center rounded-full bg-blue-500/10 p-4 ring-8 ring-blue-500/5">
                    <ListPlus className="h-8 w-8 text-blue-600" />
                  </div>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold">2. Add Your Transactions</h3>
                <p className="text-base text-muted-foreground leading-relaxed">
                  Manually log your income and expenses. The more you add, the smarter the insights.
                </p>
              </div>
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center">
                  <div className="flex items-center justify-center rounded-full bg-blue-500/10 p-4 ring-8 ring-blue-500/5">
                    <Lightbulb className="h-8 w-8 text-blue-600" />
                  </div>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold">3. Get Smart Insights</h3>
                <p className="text-base text-muted-foreground leading-relaxed">
                  Our AI analyzes your spending and provides personalized tips to help you save.
                </p>
              </div>
            </div>
          </div>
        </section>
        
        {/* Testimonials Section */}
        <section id="testimonials" className="w-full py-12 sm:py-16 md:py-24 lg:py-32 bg-background">
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12">
            <div className="flex flex-col items-center justify-center space-y-6 text-center">
              <div className="space-y-4">
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight">
                  Loved by Savers Everywhere
                </h2>
                <p className="max-w-3xl text-lg md:text-xl text-muted-foreground leading-relaxed">
                  Don't just take our word for it. Here's what our users are saying about MoneyMap.
                </p>
              </div>
            </div>
            <div className="mt-12 md:mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <Card className="relative overflow-hidden border-0 shadow-xl bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-950 h-full transition-all hover:-translate-y-2 duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5" />
                <CardContent className="relative pt-6">
                  <Quote className="h-8 w-8 text-primary/20 dark:text-primary/30 mb-4" />
                  <p className="text-base text-muted-foreground leading-relaxed">
                    "MoneyMap has been a game-changer for my finances. I finally feel in control of my money."
                  </p>
                </CardContent>
                <CardFooter className="relative flex items-center gap-4 pt-4">
                  <div>
                    <p className="font-semibold text-base">Sarah L.</p>
                    <p className="text-sm text-muted-foreground">Freelance Designer</p>
                  </div>
                </CardFooter>
              </Card>
              <Card className="relative overflow-hidden border-0 shadow-xl bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-950 h-full transition-all hover:-translate-y-2 duration-300">
                 <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5" />
                <CardContent className="relative pt-6">
                  <Quote className="h-8 w-8 text-primary/20 dark:text-primary/30 mb-4" />
                  <p className="text-base text-muted-foreground leading-relaxed">
                    "The AI suggestions are incredibly helpful. It's like having a personal finance coach in my pocket."
                  </p>
                </CardContent>
                <CardFooter className="relative flex items-center gap-4 pt-4">
                  <div>
                    <p className="font-semibold text-base">Mike D.</p>
                    <p className="text-sm text-muted-foreground">Software Engineer</p>
                  </div>
                </CardFooter>
              </Card>
              <Card className="relative overflow-hidden border-0 shadow-xl bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-950 h-full md:col-span-2 lg:col-span-1 transition-all hover:-translate-y-2 duration-300">
                 <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5" />
                <CardContent className="relative pt-6">
                  <Quote className="h-8 w-8 text-primary/20 dark:text-primary/30 mb-4" />
                  <p className="text-base text-muted-foreground leading-relaxed">
                    "I've tried other budgeting apps, but this is the first one that has actually stuck. So simple and effective!"
                  </p>
                </CardContent>
                <CardFooter className="relative flex items-center gap-4 pt-4">
                  <div>
                    <p className="font-semibold text-base">Jessica P.</p>
                    <p className="text-sm text-muted-foreground">Marketing Manager</p>
                  </div>
                </CardFooter>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="w-full py-12 sm:py-16 md:py-24 lg:py-32 bg-gradient-to-br from-blue-500 to-purple-500">
          <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 text-center">
            <div className="space-y-6">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-white">
                Ready to Get Started?
              </h2>
              <p className="text-lg md:text-xl text-white/80 leading-relaxed max-w-2xl mx-auto">
                Join thousands of users who are taking control of their financial future.
                Sign up today for free.
              </p>
            </div>
            <div className="mt-8 w-full max-w-sm mx-auto">
              <Button size="lg" asChild className="w-full bg-white text-primary hover:bg-white/90">
                <Link href="/signup">Start Budgeting Now</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-navy text-primary-foreground">
        <div className="w-full max-w-7xl mx-auto py-8 sm:py-12 px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="flex flex-col gap-4 sm:col-span-2 lg:col-span-1">
              <Logo className="text-white" />
              <p className="text-primary-foreground/70 text-sm leading-relaxed">Your financial co-pilot.</p>
              <div className="flex gap-4">
                <Link href="#" className="text-primary-foreground/70 hover:text-white transition-colors">
                  <Twitter className="h-5 w-5" />
                </Link>
                <Link href="#" className="text-primary-foreground/70 hover:text-white transition-colors">
                  <Facebook className="h-5 w-5" />
                </Link>
                <Link href="#" className="text-primary-foreground/70 hover:text-white transition-colors">
                  <Linkedin className="h-5 w-5" />
                </Link>
              </div>
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold text-white text-base">Product</h4>
              <ul className="space-y-3">
                <li>
                  <Link href="#features" className="text-primary-foreground/70 hover:text-white text-sm transition-colors">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-primary-foreground/70 hover:text-white text-sm transition-colors">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-primary-foreground/70 hover:text-white text-sm transition-colors">
                    Integrations
                  </Link>
                </li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold text-white text-base">Company</h4>
              <ul className="space-y-3">
                <li>
                  <Link href="#" className="text-primary-foreground/70 hover:text-white text-sm transition-colors">
                    About Us
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-primary-foreground/70 hover:text-white text-sm transition-colors">
                    Careers
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-primary-foreground/70 hover:text-white text-sm transition-colors">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold text-white text-base">Legal</h4>
              <ul className="space-y-3">
                <li>
                  <Link href="#" className="text-primary-foreground/70 hover:text-white text-sm transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-primary-foreground/70 hover:text-white text-sm transition-colors">
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-8 border-t border-slate-200/20 pt-8 text-center text-sm text-primary-foreground/70">
            &copy; {new Date().getFullYear()} MoneyMap. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
