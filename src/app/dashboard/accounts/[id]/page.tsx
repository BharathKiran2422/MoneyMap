
// src/app/dashboard/accounts/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Account, Transaction } from '@/types';
import { useAuth } from '@/lib/auth';
import {
  collection,
  doc,
  getDoc,
  query,
  orderBy,
  onSnapshot,
  updateDoc,
  deleteDoc,
  Timestamp,
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
import { categorizeTransaction } from '@/ai/flows/categorize-transaction';
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

    // Fetch account details
    const accountDocRef = doc(db, 'users', user.uid, 'accounts', accountId);
    const unsubscribeAccount = onSnapshot(accountDocRef, (doc) => {
      if (doc.exists()) {
        setAccount({ id: doc.id, ...doc.data() } as Account);
      } else {
        toast({ title: "Error", description: "Account not found.", variant: "destructive" });
        router.push('/dashboard');
      }
    });

    // Fetch transactions for the account
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
        } as Transaction;
      });
      setTransactions(transactionsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching transactions: ", error);
      toast({ title: "Error", description: "Could not fetch transactions.", variant: "destructive" });
      setLoading(false);
    });

    return () => {
      unsubscribeAccount();
      unsubscribeTransactions();
    };
  }, [user, db, accountId, router, toast]);

  const handleUpdateTransaction = async (updatedTransaction: Transaction) => {
    if (!user || !db || !accountId) return;
    const { id, ...data } = updatedTransaction;
    try {
      const { category } = await categorizeTransaction({
        description: data.description,
        type: data.type,
      });
      const docRef = doc(db, 'users', user.uid, 'accounts', accountId, 'transactions', id);
      await updateDoc(docRef, {
        ...data,
        category,
        date: Timestamp.fromDate(data.date)
      });
      await checkBudgetAndCreateNotifications(user.uid);
    } catch (error) {
      console.error("Error updating transaction: ", error);
      toast({ title: "Error", description: "Could not update transaction.", variant: "destructive" });
    }
  };
  
  const handleDeleteTransaction = async (id: string) => {
    if (!user || !db || !accountId) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'accounts', accountId, 'transactions', id));
      await checkBudgetAndCreateNotifications(user.uid);
    } catch (error) {
      console.error("Error deleting transaction: ", error);
      toast({ title: "Error", description: "Could not delete transaction.", variant: "destructive" });
    }
  };

  const openEditModal = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsTransactionModalOpen(true);
  }

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
          Back to Dashboard
        </Button>
        <h1 className="text-2xl font-bold">{account?.name} Details</h1>
        <Button asChild>
          <Link href={`/dashboard/accounts/${accountId}/new-transaction`}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Transaction
          </Link>
        </Button>
      </div>
      
      <>
        <AccountOverview
          transactions={transactions}
          title="Account Snapshot"
          description={`A summary of financial activity for your ${account?.name || '...'} account.`}
        />
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <SpendingChart transactions={transactions} />
          <SmartSuggestions transactions={transactions} account={account} />
        </div>
        <TransactionList 
          transactions={transactions} 
          onEdit={openEditModal}
          onDelete={handleDeleteTransaction}
        />
      </>

      <TransactionModal
        isOpen={isTransactionModalOpen}
        onClose={() => setIsTransactionModalOpen(false)}
        onSave={handleUpdateTransaction}
        transaction={editingTransaction}
      />
    </div>
  );
}
