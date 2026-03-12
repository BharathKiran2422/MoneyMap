import { Wallet } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

type LogoProps = {
  className?: string;
}

export function Logo({ className }: LogoProps) {
  return (
    <Link href="/" className={cn("flex items-center gap-2 text-xl font-bold text-primary", className)}>
      <Wallet className="h-6 w-6" />
      <span className="font-headline">MoneyMap</span>
    </Link>
  );
}
