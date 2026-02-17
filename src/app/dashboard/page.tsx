// src/app/dashboard/page.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Account, Transaction } from '@/types';
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

export default function DashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [activeAccountId, setActiveAccountId] = useState<string | null>(null);
  const [allTransactions, setAllTransactions] = useState<Map<string, Transaction[]>>(new Map());
  
  const [loading, setLoading] = useState(true);
  
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState('');

  useEffect(() => {
    setCurrentDate(new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
  }, []);

  // Fetch accounts and set up real-time listeners for their transactions
  useEffect(() => {
    if (!user || !db) return;
  
    setLoading(true);
    const accountsCollection = collection(db, 'users', user.uid, 'accounts');
  
    const unsubscribeAccounts = onSnapshot(accountsCollection, (accountsSnapshot) => {
      const accountsData: Account[] = accountsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Account));
      setAccounts(accountsData);
  
      if (accountsData.length > 0) {
        let activeAccount = accountsData.find(a => a.isActive);
  
        if (!activeAccount) {
          activeAccount = accountsData[0];
          const accountRef = doc(db, 'users', user.uid, 'accounts', activeAccount.id);
          updateDoc(accountRef, { isActive: true }).catch(err => console.error("Error setting default active account:", err));
          // Let the snapshot listener handle the state update
        } else {
            setActiveAccountId(activeAccount.id);
        }
      } else {
        setActiveAccountId(null);
        setAllTransactions(new Map());
      }
  
      setLoading(false);
    }, (error) => {
      console.error("Error fetching accounts: ", error);
      toast({ title: "Error", description: "Could not fetch accounts.", variant: "destructive" });
      setLoading(false);
    });
  
    return () => unsubscribeAccounts();
  }, [user, toast]);

  // Effect to set up transaction listeners when accounts change
  useEffect(() => {
    if (!user || !db || accounts.length === 0) {
        setAllTransactions(new Map()); // Clear transactions if no accounts
        return;
    }

    const unsubscribers: (() => void)[] = [];

    accounts.forEach(account => {
        const transactionsQuery = query(
            collection(db, 'users', user.uid, 'accounts', account.id, 'transactions')
        );
        const unsubscribe = onSnapshot(transactionsQuery, (snapshot) => {
            const transactionsData: Transaction[] = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    date: (data.date as Timestamp).toDate(),
                } as Transaction;
            });
            
            setAllTransactions(prevMap => {
                const newMap = new Map(prevMap);
                newMap.set(account.id, transactionsData);
                return newMap;
            });
        }, (error) => {
            console.error(`Error fetching transactions for account ${account.id}:`, error);
        });
        unsubscribers.push(unsubscribe);
    });

    return () => {
        unsubscribers.forEach(unsub => unsub());
    };
  }, [user, accounts]);
  
  const accountsWithBalance = useMemo(() => {
    return accounts.map(account => {
        const accountTransactions = allTransactions.get(account.id) || [];
        const totalIncome = accountTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const totalExpenses = accountTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        return { ...account, balance: totalIncome - totalExpenses };
    });
  }, [accounts, allTransactions]);

  const allCombinedTransactions = useMemo(() => {
    const combined = Array.from(allTransactions.values()).flat();
    return combined.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [allTransactions]);
  
  const allTransactionsForCurrentMonth = useMemo(() => {
    const now = new Date();
    const start = startOfMonth(now);
    const end = endOfMonth(now);
    
    let monthlyTransactions: Transaction[] = [];
    allTransactions.forEach(accountTransactions => {
        const filtered = accountTransactions.filter(t => {
            const tDate = new Date(t.date);
            return tDate >= start && tDate <= end;
        });
        monthlyTransactions.push(...filtered);
    });

    return monthlyTransactions;
  }, [allTransactions]);


  const handleSaveAccount = async (accountData: Omit<Account, 'id' | 'isActive'>) => {
    if (!user || !db) return;
    try {
      const isFirstAccount = accounts.length === 0;
      const newAccountData = {
        ...accountData,
        isActive: isFirstAccount,
      };

      await addDoc(collection(db, 'users', user.uid, 'accounts'), newAccountData);
      toast({ title: "Success", description: "Account created successfully." });
    } catch (error) {
      console.error("Error adding account: ", error);
      toast({ title: "Error", description: "Could not add account.", variant: "destructive" });
    }
  };

  const handleSetActiveAccount = async (newActiveAccountId: string) => {
    if (!user || !db || newActiveAccountId === activeAccountId) return;
    
    try {
      const batch = writeBatch(db);
      
      if (activeAccountId) {
        const oldAccountRef = doc(db, 'users', user.uid, 'accounts', activeAccountId);
        batch.update(oldAccountRef, { isActive: false });
      }

      const newAccountRef = doc(db, 'users', user.uid, 'accounts', newActiveAccountId);
      batch.update(newAccountRef, { isActive: true });

      await batch.commit();
    } catch (error) {
      console.error("Error switching active account:", error);
      toast({ title: "Error", description: "Could not switch active account.", variant: "destructive" });
    }
  };
  
  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  if (accounts.length === 0) {
    return (
      <>
        <div className="flex flex-col items-center justify-center h-[50vh] text-center gap-4">
          <Banknote className="w-16 h-16 text-muted-foreground" />
          <h2 className="text-2xl font-semibold">Welcome, {user?.displayName || 'User'}!</h2>
          <p className="text-muted-foreground max-w-sm">To get started, create your first financial account. You can add savings, checking, or credit card accounts.</p>
          <Button onClick={() => setIsAccountModalOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Your First Account
          </Button>
        </div>
        <AccountModal 
          isOpen={isAccountModalOpen} 
          onClose={() => setIsAccountModalOpen(false)} 
          onSave={handleSaveAccount} 
        />
      </>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <p className="text-lg text-muted-foreground">{currentDate}</p>
        <h1 className="text-3xl font-bold text-foreground">Welcome back, {user?.displayName || 'User'}!</h1>
      </div>

      <NlpTransactionInput activeAccountId={activeAccountId} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <BudgetTracker />
        <FiftyThirtyTwentyRule transactions={allTransactionsForCurrentMonth} />
      </div>

      <div className="space-y-8">
          <AccountOverview transactions={allCombinedTransactions} />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <CategoryPieChart transactions={allCombinedTransactions} type="expense" title="Expense Breakdown" />
              <CategoryPieChart transactions={allCombinedTransactions} type="income" title="Income Sources" />
          </div>
          <RecentTransactions transactions={allCombinedTransactions} />
      </div>

        <div>
            <h2 className="text-2xl font-bold mb-4">Your Accounts</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {accountsWithBalance.map(acc => (
                <AccountCard 
                    key={acc.id} 
                    account={acc} 
                    isActive={acc.id === activeAccountId} 
                    onActivate={handleSetActiveAccount} 
                />
            ))}
            <Card 
                className="flex items-center justify-center border-dashed h-full min-h-[150px] hover:border-primary hover:text-primary transition-colors cursor-pointer rounded-xl bg-card"
                onClick={() => setIsAccountModalOpen(true)}
            >
                <div className="text-center">
                    <PlusCircle className="mx-auto h-8 w-8 mb-2" />
                    <p className="font-semibold">Add New Account</p>
                </div>
            </Card>
            </div>
        </div>

      <AccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        onSave={handleSaveAccount}
      />
    </div>
  );
}
