import { db } from '@/lib/firebase';
import type { UserProfile } from '@/types';
import { getDocs, query, where, Timestamp, doc, getDoc, updateDoc, addDoc, collection } from 'firebase/firestore';
import { startOfMonth, endOfMonth, format, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import { generateMonthlySummary } from '@/ai/flows/monthly-summary-notification';

export async function checkBudgetAndCreateNotifications(userId: string) {
    if (!db) return;

    try {
        const userDocRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
            console.log("User doc does not exist for ID:", userId);
            return;
        };

        const userData = userDoc.data() as UserProfile;
        const { monthlyBudget = 0 } = userData;

        if (monthlyBudget <= 0) {
            return; // No budget set, do nothing.
        }

        const now = new Date();
        const currentMonthStr = format(now, 'yyyy-MM');
        const start = startOfMonth(now);
        const end = endOfMonth(now);

        let totalExpenses = 0;
        
        const accountsSnapshot = await getDocs(collection(db, 'users', userId, 'accounts'));

        for (const accountDoc of accountsSnapshot.docs) {
            const transactionsQuery = query(
                collection(db, 'users', userId, 'accounts', accountDoc.id, 'transactions'),
                where('date', '>=', Timestamp.fromDate(start)),
                where('date', '<=', Timestamp.fromDate(end)),
                where('type', '==', 'expense')
            );
            
            const transactionsSnapshot = await getDocs(transactionsQuery);
            transactionsSnapshot.forEach(transactionDoc => {
                totalExpenses += transactionDoc.data().amount;
            });
        }
        
        const spendingPercentage = (totalExpenses / monthlyBudget) * 100;
        const budgetFormatted = `₹${monthlyBudget.toLocaleString('en-IN')}`;

        // Check for 100% threshold
        if (spendingPercentage >= 100 && userData.lastNotification100Sent !== currentMonthStr) {
            await addDoc(collection(db, 'users', userId, 'notifications'), {
                message: `You have exceeded your monthly budget of ${budgetFormatted}.`,
                type: 'danger',
                read: false,
                createdAt: Timestamp.now(),
            });
            await updateDoc(userDocRef, { lastNotification100Sent: currentMonthStr });
        }
        // Check for 90% threshold (else if to prevent sending both at the same time)
        else if (spendingPercentage >= 90 && spendingPercentage < 100 && userData.lastNotification90Sent !== currentMonthStr) {
            await addDoc(collection(db, 'users', userId, 'notifications'), {
                message: `You have spent over 90% of your ${budgetFormatted} monthly budget.`,
                type: 'warning',
                read: false,
                createdAt: Timestamp.now(),
            });
            await updateDoc(userDocRef, { lastNotification90Sent: currentMonthStr });
        }

    } catch (error) {
        console.error("Error in checkBudgetAndCreateNotifications:", error);
    }
}

export async function sendMonthlySummaryNotificationIfNeeded(userId: string) {
    if (!db) return;

    try {
        const now = new Date();
        // Only run on the first day of the month
        if (now.getDate() !== 1) {
            return;
        }

        const lastMonth = subMonths(now, 1);
        const lastMonthStr = format(lastMonth, 'yyyy-MM');
        
        const userDocRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) return;
        const userData = userDoc.data() as UserProfile;

        // Check if summary for last month was already sent
        if (userData.lastMonthlySummarySent === lastMonthStr || !userData.monthlyBudget || userData.monthlyBudget <= 0) {
            return;
        }

        const startOfLastMonth = startOfMonth(lastMonth);
        const endOfLastMonth = endOfMonth(lastMonth);

        let totalExpensesLastMonth = 0;
        const accountsSnapshot = await getDocs(collection(db, 'users', userId, 'accounts'));

        for (const accountDoc of accountsSnapshot.docs) {
            const transactionsQuery = query(
                collection(db, 'users', userId, 'accounts', accountDoc.id, 'transactions'),
                where('date', '>=', Timestamp.fromDate(startOfLastMonth)),
                where('date', '<=', Timestamp.fromDate(endOfLastMonth)),
                where('type', '==', 'expense')
            );
            
            const transactionsSnapshot = await getDocs(transactionsQuery);
            transactionsSnapshot.forEach(transactionDoc => {
                totalExpensesLastMonth += transactionDoc.data().amount;
            });
        }

        const { message } = await generateMonthlySummary({
            totalExpenses: totalExpensesLastMonth,
            monthlyBudget: userData.monthlyBudget,
            monthName: format(lastMonth, 'MMMM'),
        });
        
        const monthParam = format(lastMonth, 'yyyy-MM');
        const link = `/dashboard/insights?tab=monthly-report&month=${monthParam}`;
        const fullMessage = `${message} Click here to view your detailed monthly report.`;

        await addDoc(collection(db, 'users', userId, 'notifications'), {
            message: fullMessage,
            type: 'info',
            read: false,
            createdAt: Timestamp.now(),
            link: link,
        });

        await updateDoc(userDocRef, { lastMonthlySummarySent: lastMonthStr });

    } catch (error) {
        console.error("Error in sendMonthlySummaryNotificationIfNeeded:", error);
    }
}
