// src/app/dashboard/layout.tsx
'use client';

import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Header from '@/components/dashboard/Header';
import { sendMonthlySummaryNotificationIfNeeded } from '@/lib/notifications';
import Chatbot from '@/components/dashboard/Chatbot';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) {
      return;
    }
    if (!user || !user.emailVerified) {
      router.push('/login');
    } else {
      // Check if a monthly summary notification needs to be sent
      sendMonthlySummaryNotificationIfNeeded(user.uid);
    }
  }, [user, loading, router]);

  if (loading || !user || !user.emailVerified) {
    return null;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 py-4 sm:py-6 md:py-8">
        {children}
      </main>
      <Chatbot />
    </div>
  );
}
