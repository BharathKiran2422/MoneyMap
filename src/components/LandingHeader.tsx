'use client';

import { useAuth } from '@/lib/auth';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';
import { Skeleton } from '@/components/ui/skeleton';

export default function LandingHeader() {
  const { user, loading } = useAuth();

  return (
    <header className="h-14 sm:h-16 flex items-center border-b sticky top-0 bg-background/95 backdrop-blur-sm z-10">
      <div className="w-full max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12">
        <Logo />
        <nav className="flex gap-2 sm:gap-4">
          {loading ? (
            <div className="flex items-center gap-2 sm:gap-4">
              <Skeleton className="h-9 w-20" />
              <Skeleton className="h-9 w-28" />
            </div>
          ) : user ? (
            <Button size="sm" asChild className="text-sm">
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild className="text-sm">
                <Link href="/login">Login</Link>
              </Button>
              <Button size="sm" asChild className="text-sm">
                <Link href="/signup">Get Started</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
