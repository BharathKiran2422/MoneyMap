import { db } from '@/lib/firebase';
import type { UserProfile, Transaction } from '@/types';
import { getDocs, query, where, Timestamp, doc, getDoc, updateDoc, addDoc, collection, limit, orderBy } from 'firebase/firestore';
import { startOfMonth, endOfMonth, format, subMonths, startOfDay, subDays } from 'date-fns';
import { generateMonthlySummary } from '@/ai/flows/monthly-summary-notification';
import { generateNotificationTip } from '@/ai/flows/generate-notification-tips';

export async function checkBudgetAndCreateNotifications(userId: string) {
    if (!db) return;

    try {
        const userDocRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) return;

        const userData = userDoc.data() as UserProfile;
        const { monthlyBudget = 0 } = userData;

        if (monthlyBudget <= 0) return;

        const now = new Date();
        const currentMonthStr = format(now, 'yyyy-MM');
        const start = startOfMonth(now);
        const end = endOfMonth(now);

        let totalExpenses = 0;
        let recentExpenses: Transaction[] = [];
        
        const accountsSnapshot = await getDocs(collection(db, 'users', userId, 'accounts'));

        for (const accountDoc of accountsSnapshot.docs) {
            const transactionsQuery = query(
                collection(db, 'users', userId, 'accounts', accountDoc.id, 'transactions'),
                where('date', '>=', Timestamp.fromDate(start)),
                where('date', '<=', Timestamp.fromDate(end)),
                where('type', '==', 'expense'),
                orderBy('date', 'desc')
            );
            
            const transactionsSnapshot = await getDocs(transactionsQuery);
            transactionsSnapshot.forEach(transactionDoc => {
                const data = transactionDoc.data();
                totalExpenses += data.amount;
                if (recentExpenses.length < 5) {
                    recentExpenses.push({ ...data, id: transactionDoc.id } as Transaction);
                }
            });
        }
        
        const spendingPercentage = (totalExpenses / monthlyBudget) * 100;
        const budgetFormatted = `₹${monthlyBudget.toLocaleString('en-IN')}`;
        const recentContext = recentExpenses.map(t => `${t.category}: ₹${t.amount}`).join(', ');

        // Logic for Thresholds
        if (spendingPercentage >= 100 && userData.lastNotification100Sent !== currentMonthStr) {
            const tip = await generateNotificationTip({ context: 'Budget limit exceeded', recentSpending: recentContext });
            await addDoc(collection(db, 'users', userId, 'notifications'), {
                message: `⚠️ Budget Exceeded: You've spent more than your ${budgetFormatted} limit. ${tip}`,
                type: 'danger',
                category: 'Alert',
                read: false,
                createdAt: Timestamp.now(),
            });
            await updateDoc(userDocRef, { lastNotification100Sent: currentMonthStr });
        } else if (spendingPercentage >= 90 && userData.lastNotification90Sent !== currentMonthStr) {
            const tip = await generateNotificationTip({ context: '90% budget reached', recentSpending: recentContext });
            await addDoc(collection(db, 'users', userId, 'notifications'), {
                message: `⚠️ Budget Alert: You've used 90% of your ${budgetFormatted} budget. ${tip}`,
                type: 'warning',
                category: 'Alert',
                read: false,
                createdAt: Timestamp.now(),
            });
            await updateDoc(userDocRef, { lastNotification90Sent: currentMonthStr });
        } else if (spendingPercentage >= 75 && userData.lastNotification75Sent !== currentMonthStr) {
            const tip = await generateNotificationTip({ context: '75% budget reached', recentSpending: recentContext });
            await addDoc(collection(db, 'users', userId, 'notifications'), {
                message: `💡 Budget Advice: You've reached 75% of your budget. ${tip}`,
                type: 'info',
                category: 'Advice',
                read: false,
                createdAt: Timestamp.now(),
            });
            await updateDoc(userDocRef, { lastNotification75Sent: currentMonthStr });
        }

        // Spending Spike Detection
        const todayStart = startOfDay(now);
        let todaySpending = 0;
        for (const accountDoc of accountsSnapshot.docs) {
            const todayQuery = query(
                collection(db, 'users', userId, 'accounts', accountDoc.id, 'transactions'),
                where('date', '>=', Timestamp.fromDate(todayStart)),
                where('type', '==', 'expense')
            );
            const todaySnap = await getDocs(todayQuery);
            todaySnap.forEach(d => todaySpending += d.data().amount);
        }

        const daysPassed = now.getDate();
        const dailyAverage = daysPassed > 1 ? (totalExpenses - todaySpending) / (daysPassed - 1) : monthlyBudget / 30;
        
        if (todaySpending > dailyAverage * 2.5 && todaySpending > 1000) {
            await addDoc(collection(db, 'users', userId, 'notifications'), {
                message: `📈 Spending Spike: Today's expenses (₹${todaySpending.toLocaleString('en-IN')}) are unusually high. Keep an eye on your discretionary spending.`,
                type: 'warning',
                category: 'Alert',
                read: false,
                createdAt: Timestamp.now(),
            });
        }

        // --- NEW: Dynamic Payment Reminders ---
        // Checks if specific dates are near
        const dayOfMonth = now.getDate();
        if (dayOfMonth >= 25 || dayOfMonth <= 5) {
            // Check if we've sent a rent reminder this window
            const reminderKey = `rent_rem_${currentMonthStr}`;
            if (userData.lastRentReminderSent !== currentMonthStr) {
                await addDoc(collection(db, 'users', userId, 'notifications'), {
                    message: `🏠 Rent Reminder: It's near the end/start of the month. Don't forget to record your rent payment!`,
                    type: 'info',
                    category: 'Reminder',
                    read: false,
                    createdAt: Timestamp.now(),
                });
                await updateDoc(userDocRef, { lastRentReminderSent: currentMonthStr });
            }
        }

    } catch (error) {
        console.error("Error in checkBudgetAndCreateNotifications:", error);
    }
}

export async function sendMonthlySummaryNotificationIfNeeded(userId: string) {
    if (!db) return;

    try {
        const now = new Date();
        if (now.getDate() !== 1) return;

        const lastMonth = subMonths(now, 1);
        const lastMonthStr = format(lastMonth, 'yyyy-MM');
        
        const userDocRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) return;
        const userData = userDoc.data() as UserProfile;

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

        await addDoc(collection(db, 'users', userId, 'notifications'), {
            message: `📊 Monthly Summary: ${message}`,
            type: 'info',
            category: 'Advice',
            read: false,
            createdAt: Timestamp.now(),
            link: link,
        });

        await updateDoc(userDocRef, { lastMonthlySummarySent: lastMonthStr });

    } catch (error) {
        console.error("Error in sendMonthlySummaryNotificationIfNeeded:", error);
    }
}
