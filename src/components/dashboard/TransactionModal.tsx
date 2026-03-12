'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Transaction, Account } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
  } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { useAuth } from '@/lib/auth';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (transaction: Transaction) => void;
  transaction: Transaction | null;
};

const formSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  amount: z.coerce.number().positive('Amount must be positive'),
  type: z.enum(['income', 'expense']),
  date: z.date(),
  category: z.string().min(1, 'Category is required'),
  accountId: z.string().min(1, 'Account is required'),
});

const CATEGORIES = {
  expense: ['Food & Dining', 'Shopping', 'Groceries', 'Utilities', 'Transport', 'Entertainment', 'Health & Wellness', 'Travel', 'Rent', 'EMI', 'Education', 'Investment', 'Other Expense'],
  income: ['Salary', 'Freelance Income', 'Investment', 'Rental Income', 'Other Income']
};

export default function TransactionModal({ isOpen, onClose, onSave, transaction }: Props) {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  const transactionType = form.watch('type');

  useEffect(() => {
    if (user && isOpen) {
      const fetchAccounts = async () => {
        setLoadingAccounts(true);
        try {
          const snapshot = await getDocs(collection(db!, 'users', user.uid, 'accounts'));
          const accountsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Account));
          setAccounts(accountsData);
        } catch (error) {
          console.error("Error fetching accounts:", error);
        } finally {
          setLoadingAccounts(false);
        }
      };
      fetchAccounts();
    }
  }, [user, isOpen]);

  useEffect(() => {
    if (isOpen && transaction) {
        form.reset({
          description: transaction.description,
          amount: transaction.amount,
          type: transaction.type,
          date: new Date(transaction.date),
          category: transaction.category || (transaction.type === 'expense' ? 'Other Expense' : 'Other Income'),
          accountId: transaction.accountId || '',
        });
    }
  }, [transaction, form, isOpen]);


  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (transaction) {
        onSave({ ...values, id: transaction.id });
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Transaction</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Groceries" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
                <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                        <Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Select onValueChange={(val) => {
                            field.onChange(val);
                            form.setValue('category', val === 'expense' ? 'Other Expense' : 'Other Income');
                        }} defaultValue={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            <SelectItem value="income">Income</SelectItem>
                            <SelectItem value="expense">Expense</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {CATEGORIES[transactionType as keyof typeof CATEGORIES]?.map(cat => (
                                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="accountId"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Account</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder={loadingAccounts ? "Loading..." : "Select account"} />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {accounts.map(acc => (
                                    <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="mt-6">
              <DialogClose asChild>
                <Button type="button" variant="secondary">Cancel</Button>
              </DialogClose>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
