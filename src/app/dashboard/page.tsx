// src/app/dashboard/page.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Account, Transaction, UserProfile } from '@/types';
import AccountOverview from '@/components/dashboard/AccountOverview';
import { Button } from '@/components/ui/button';
import { Loader2, PlusCircle, Banknote } from 'lucide-react';
import AccountModal from '@/components/dashboard/AccountModal';
import { useAuth } from '@/lib/auth';
import {
  collection,
  query,
  onSnapshot,
  addDoc,
  Timestamp,
  getDocs,
  doc,
  updateDoc,
  writeBatch,
  getDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import AccountCard from '@/components/dashboard/AccountCard';
import CategoryPieChart from '@/components/dashboard/CategoryPieChart';
import RecentTransactions from '@/components/dashboard/RecentTransactions';
import { Card } from '@/components/ui/card';
import BudgetTracker from '@/components/dashboard/BudgetTracker';
import FiftyThirtyTwentyRule from '@/components/dashboard/FiftyThirtyTwentyRule';
import { startOfMonth, endOfMonth } from 'date-fns';
import NlpTransactionInput from '@/components/dashboard/NlpTransactionInput';
import SpendingTrendWidget from '@/components/dashboard/SpendingTrendWidget';
import FinancialInsightCard from '@/components/dashboard/FinancialInsightCard';

export default function DashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [activeAccountId, setActiveAccountId] = useState<string | null>(null);
  const [allTransactions, setAllTransactions] = useState<Map<string, Transaction[]>>(new Map());
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState('');

  useEffect(() => {
    setCurrentDate(new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
  }, []);

  useEffect(() => {
    if (!user || !db) return;
  
    setLoading(true);
    const userDocRef = doc(db, 'users', user.uid);
    getDoc(userDocRef).then(snap => setUserProfile(snap.data() as UserProfile));

    const accountsCollection = collection(db, 'users', user.uid, 'accounts');
    const unsubscribeAccounts = onSnapshot(accountsCollection, (accountsSnapshot) => {
      const accountsData: Account[] = accountsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Account));
      setAccounts(accountsData);
  
      if (accountsData.length > 0) {
        let activeAccount = accountsData.find(a => a.isActive);
        if (!activeAccount) {
          activeAccount = accountsData[0];
          updateDoc(doc(db!, 'users', user.uid, 'accounts', activeAccount.id), { isActive: true });
        } else {
            setActiveAccountId(activeAccount.id);
        }
      } else {
        setActiveAccountId(null);
        setAllTransactions(new Map());
      }
      setLoading(false);
    });
  
    return () => unsubscribeAccounts();
  }, [user]);

  useEffect(() => {
    if (!user || !db || accounts.length === 0) {
        setAllTransactions(new Map());
        return;
    }

    const unsubscribers: (() => void)[] = [];
    accounts.forEach(account => {
        const transactionsQuery = query(collection(db!, 'users', user.uid, 'accounts', account.id, 'transactions'));
        const unsubscribe = onSnapshot(transactionsQuery, (snapshot) => {
            const transactionsData: Transaction[] = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                date: (doc.data().date as Timestamp).toDate(),
            } as Transaction));
            setAllTransactions(prev => {
                const next = new Map(prev);
                next.set(account.id, transactionsData);
                return next;
            });
        });
        unsubscribers.push(unsubscribe);
    });
    return () => unsubscribers.forEach(unsub => unsub());
  }, [user, accounts]);
  
  const allCombinedTransactions = useMemo(() => {
    return Array.from(allTransactions.values()).flat().sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [allTransactions]);
  
  const monthlyTransactions = useMemo(() => {
    const start = startOfMonth(new Date());
    const end = endOfMonth(new Date());
    return allCombinedTransactions.filter(t => t.date >= start && t.date <= end);
  }, [allCombinedTransactions]);

  const accountsWithBalance = useMemo(() => {
    return accounts.map(account => {
        const t = allTransactions.get(account.id) || [];
        const balance = t.reduce((s, x) => x.type === 'income' ? s + x.amount : s - x.amount, 0);
        return { ...account, balance };
    });
  }, [accounts, allTransactions]);

  const handleSaveAccount = async (data: Omit<Account, 'id' | 'isActive'>) => {
    if (!user || !db) return;
    try {
      await addDoc(collection(db, 'users', user.uid, 'accounts'), { ...data, isActive: accounts.length === 0 });
      toast({ title: "Success", description: "Account created." });
    } catch (e) {
      toast({ title: "Error", description: "Could not add account.", variant: "destructive" });
    }
  };

  const handleSetActiveAccount = async (id: string) => {
    if (!user || !db || id === activeAccountId) return;
    const batch = writeBatch(db);
    if (activeAccountId) batch.update(doc(db, 'users', user.uid, 'accounts', activeAccountId), { isActive: false });
    batch.update(doc(db, 'users', user.uid, 'accounts', id), { isActive: true });
    await batch.commit();
  };
  
  if (loading) return <div className="flex h-[80vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  
  if (accounts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center gap-4">
        <Banknote className="w-16 h-16 text-muted-foreground" />
        <h2 className="text-2xl font-bold">Welcome, {user?.displayName || 'User'}!</h2>
        <p className="text-muted-foreground max-w-sm">Start by creating your first financial account.</p>
        <Button onClick={() => setIsAccountModalOpen(true)}><PlusCircle className="mr-2 h-4 w-4" /> Create Account</Button>
        <AccountModal isOpen={isAccountModalOpen} onClose={() => setIsAccountModalOpen(false)} onSave={handleSaveAccount} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <p className="text-lg text-muted-foreground font-medium">{currentDate}</p>
        <h1 className="text-3xl font-bold text-foreground">Dashboard Snapshot</h1>
      </div>

      <NlpTransactionInput activeAccountId={activeAccountId} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
            <BudgetTracker />
        </div>
        <div className="flex flex-col gap-6">
            <SpendingTrendWidget transactions={allCombinedTransactions} />
            <FinancialInsightCard transactions={allCombinedTransactions} userProfile={userProfile} />
        </div>
      </div>

      <AccountOverview transactions={allCombinedTransactions} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <FiftyThirtyTwentyRule transactions={monthlyTransactions} />
        <div className="grid grid-cols-1 gap-6">
            <CategoryPieChart transactions={allCombinedTransactions} type="expense" title="Expense Breakdown" />
            <CategoryPieChart transactions={allCombinedTransactions} type="income" title="Income Sources" />
        </div>
      </div>

      <RecentTransactions transactions={allCombinedTransactions} />

      <div>
          <h2 className="text-2xl font-bold mb-4">Your Wallets</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {accountsWithBalance.map(acc => (
              <AccountCard key={acc.id} account={acc} isActive={acc.id === activeAccountId} onActivate={handleSetActiveAccount} />
          ))}
          <Card className="flex items-center justify-center border-dashed h-full min-h-[150px] hover:border-primary hover:text-primary transition-all cursor-pointer group" onClick={() => setIsAccountModalOpen(true)}>
              <div className="text-center group-hover:scale-110 transition-transform">
                  <PlusCircle className="mx-auto h-8 w-8 mb-2 opacity-50" />
                  <p className="font-bold text-sm uppercase tracking-wider">Add Account</p>
              </div>
          </Card>
          </div>
      </div>

      <AccountModal isOpen={isAccountModalOpen} onClose={() => setIsAccountModalOpen(false)} onSave={handleSaveAccount} />
    </div>
  );
}
