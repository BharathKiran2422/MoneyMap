import { Wallet } from 'lucide-react';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="w-full border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-8 px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex flex-col items-center md:items-start gap-2">
          <Link href="/" className="flex items-center gap-2 text-lg font-bold text-primary">
            <Wallet className="h-5 w-5" />
            <span>MoneyMap</span>
          </Link>
          <p className="text-xs text-muted-foreground font-medium">Smart Personal Finance Manager</p>
        </div>
        
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="text-sm font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            AI Powered Financial Insights
          </p>
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">Built with Firebase & Gemini AI</p>
        </div>

        <div className="flex flex-col items-center md:items-end gap-3">
          <div className="flex items-center gap-4 text-xs font-bold text-muted-foreground">
            <Link href="#" className="hover:text-primary transition-colors">Privacy</Link>
            <Link href="#" className="hover:text-primary transition-colors">Terms</Link>
            <Link href="#" className="hover:text-primary transition-colors">Support</Link>
          </div>
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} MoneyMap | All Rights Reserved
          </p>
        </div>
      </div>
    </footer>
  );
}
