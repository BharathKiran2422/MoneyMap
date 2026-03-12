'use client';

import { useState, useEffect } from 'react';
import { Account, Transaction } from '@/types';
import { useAuth } from '@/lib/auth';
import {
  collection,
  doc,
  query,
  orderBy,
  onSnapshot,
  updateDoc,
  deleteDoc,
  Timestamp,
  getDoc,
  getDocs,
  setDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, PlusCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AccountOverview from '@/components/dashboard/AccountOverview';
import SpendingChart from '@/components/dashboard/SpendingChart';
import SmartSuggestions from '@/components/dashboard/SmartSuggestions';
import TransactionList from '@/components/dashboard/TransactionList';
import TransactionModal from '@/components/dashboard/TransactionModal';
import Link from 'next/link';
import { checkBudgetAndCreateNotifications } from '@/lib/notifications';

export default function AccountDetailsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const accountId = params.id as string;

  const [account, setAccount] = useState<Account | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (!user || !db || !accountId) return;

    const accountDocRef = doc(db, 'users', user.uid, 'accounts', accountId);
    const unsubscribeAccount = onSnapshot(accountDocRef, (doc) => {
      if (doc.exists()) {
        setAccount({ id: doc.id, ...doc.data() } as Account);
      } else {
        toast({ title: "Error", description: "Account not found.", variant: "destructive" });
        router.push('/dashboard');
      }
    });

    const q = query(
      collection(db, 'users', user.uid, 'accounts', accountId, 'transactions'),
      orderBy('date', 'desc')
    );

    const unsubscribeTransactions = onSnapshot(q, (snapshot) => {
      const transactionsData: Transaction[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          date: (data.date as Timestamp).toDate(),
          accountId: accountId
        } as Transaction;
      });
      setTransactions(transactionsData);
      setLoading(false);
    });

    return () => {
      unsubscribeAccount();
      unsubscribeTransactions();
    };
  }, [user, db, accountId, router, toast]);

  const handleUpdateTransaction = async (updated: Transaction) => {
    if (!user || !db || !accountId) return;
    try {
      const { id, accountId: targetAccountId, ...data } = updated;
      
      const payload = {
          ...data,
          date: Timestamp.fromDate(data.date),
          updatedAt: Timestamp.now(),
          lastModifiedBy: user.uid
      };

      // Handle moving transaction to different account if necessary
      if (targetAccountId && targetAccountId !== accountId) {
          const oldRef = doc(db, 'users', user.uid, 'accounts', accountId, 'transactions', id);
          const newRef = doc(db, 'users', user.uid, 'accounts', targetAccountId, 'transactions', id);
          
          await setDoc(newRef, payload);
          await deleteDoc(oldRef);
      } else {
          const docRef = doc(db, 'users', user.uid, 'accounts', accountId, 'transactions', id);
          await updateDoc(docRef, payload);
      }
      
      toast({ title: "Success", description: "Transaction updated." });
      await checkBudgetAndCreateNotifications(user.uid);
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Update failed.", variant: "destructive" });
    }
  };
  
  const handleDeleteTransaction = async (id: string) => {
    if (!user || !db || !accountId) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'accounts', accountId, 'transactions', id));
      await checkBudgetAndCreateNotifications(user.uid);
      toast({ title: "Deleted", description: "Transaction removed." });
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Delete failed.", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => router.push('/dashboard')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">{account?.name} Details</h1>
        <Button asChild>
          <Link href={`/dashboard/accounts/${accountId}/new-transaction`}>
            <PlusCircle className="mr-2 h-4 w-4" />
            New Entry
          </Link>
        </Button>
      </div>
      
      <AccountOverview
        transactions={transactions}
        title="Account Snapshot"
        description={`Summary for your ${account?.name} account.`}
      />
      
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <SpendingChart transactions={transactions} />
        <SmartSuggestions transactions={transactions} account={account} />
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold">Account Ledger</h2>
        <TransactionList 
          transactions={transactions} 
          onEdit={(t) => {
              setEditingTransaction(t);
              setIsTransactionModalOpen(true);
          }}
          onDelete={handleDeleteTransaction}
        />
      </div>

      <TransactionModal
        isOpen={isTransactionModalOpen}
        onClose={() => setIsTransactionModalOpen(false)}
        onSave={handleUpdateTransaction}
        transaction={editingTransaction}
      />
    </div>
  );
}
