'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { db } from '@/lib/firebase';
import { collection, query, onSnapshot, orderBy, doc, updateDoc, Timestamp, getDoc, getDocs, where, limit } from 'firebase/firestore';
import type { Notification, UserProfile } from '@/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Bell, BellRing, CheckCheck, AlertTriangle, AlertCircle, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { formatDistanceToNow, startOfMonth, endOfMonth } from 'date-fns';
import { cn } from '@/lib/utils';
import { ScrollArea } from '../ui/scroll-area';
import Link from 'next/link';
import { useRouter } from 'next/navigation';


export default function NotificationBell() {
    const { user } = useAuth();
    const router = useRouter();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [budgetStatus, setBudgetStatus] = useState<'ok' | 'warning' | 'danger'>('ok');

    const checkBudgetStatus = async () => {
        if (!user || !db) return;
        try {
            const userDocRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userDocRef);
            
            if (!userDoc.exists()) {
                setBudgetStatus('ok');
                return;
            }

            const userData = userDoc.data() as UserProfile;
            const { monthlyBudget } = userData;

            if (!monthlyBudget || monthlyBudget <= 0) {
                setBudgetStatus('ok');
                return;
            }
            
            const now = new Date();
            const start = startOfMonth(now);
            const end = endOfMonth(now);
            let totalExpenses = 0;
            
            const accountsSnapshot = await getDocs(collection(db, 'users', user.uid, 'accounts'));

            for (const accountDoc of accountsSnapshot.docs) {
                const transactionsQuery = query(
                    collection(db, 'users', user.uid, 'accounts', accountDoc.id, 'transactions'),
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
            
            if (spendingPercentage >= 100) {
                setBudgetStatus('danger');
            } else if (spendingPercentage >= 90) {
                setBudgetStatus('warning');
            } else {
                setBudgetStatus('ok');
            }

        } catch (error) {
            console.error("Error checking budget status:", error);
            setBudgetStatus('ok');
        }
    };

    useEffect(() => {
        if (!user) return;
        
        checkBudgetStatus();
        
        const q = query(
            collection(db, 'users', user.uid, 'notifications'),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const notifs = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    createdAt: (data.createdAt as Timestamp).toDate(),
                } as Notification;
            });
            setNotifications(notifs);
            setUnreadCount(notifs.filter(n => !n.read).length);
        });

        return () => unsubscribe();
    }, [user]);

    const handleMarkAllAsRead = async () => {
        if (!user || !db || unreadCount === 0) return;
        
        const unreadNotifications = notifications.filter(n => !n.read);
        for (const notif of unreadNotifications) {
            const notifRef = doc(db, 'users', user.uid, 'notifications', notif.id);
            await updateDoc(notifRef, { read: true });
        }
    };
    
    const handleOpenChange = (open: boolean) => {
        setIsOpen(open);
        if (open) {
            checkBudgetStatus();
        }
    }
    
    const handleNotificationClick = async (notif: Notification) => {
        if (!user || !db) return;
    
        // Mark as read
        if (!notif.read) {
          const notifRef = doc(db, 'users', user.uid, 'notifications', notif.id);
          await updateDoc(notifRef, { read: true });
        }
    
        // Navigate if there's a link
        if (notif.link) {
          router.push(notif.link);
          setIsOpen(false);
        }
    };

    const BellIcon = () => {
        if (budgetStatus === 'danger') {
            return <BellRing className="h-5 w-5 text-destructive" />;
        }
        if (budgetStatus === 'warning') {
            return <BellRing className="h-5 w-5 text-amber-500" />;
        }
        return <Bell className="h-5 w-5" />;
    };

    return (
        <Popover open={isOpen} onOpenChange={handleOpenChange}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative data-[state=open]:bg-accent rounded-full border">
                    <BellIcon />
                    {unreadCount > 0 && (
                        <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                            {unreadCount}
                        </Badge>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
                <Card className="border-0 shadow-none">
                    <CardHeader className="flex flex-row items-center justify-between border-b p-4">
                        <CardTitle className="text-base font-semibold">Notifications</CardTitle>
                        {unreadCount > 0 && (
                             <Button variant="ghost" size="sm" onClick={handleMarkAllAsRead} className="text-xs h-auto p-1">
                                <CheckCheck className="mr-1 h-3 w-3" />
                                Mark all as read
                            </Button>
                        )}
                    </CardHeader>
                    <ScrollArea className="h-[240px]">
                        <CardContent className="p-0">
                            {notifications.length > 0 ? (
                                <div className="divide-y">
                                {notifications.slice(0, 4).map(notif => (
                                    <div 
                                        key={notif.id} 
                                        className={cn("p-4", !notif.read && "bg-secondary", notif.link && "cursor-pointer hover:bg-accent")}
                                        onClick={() => handleNotificationClick(notif)}
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className="w-5 h-5 shrink-0 mt-0.5 flex items-center justify-center">
                                                {notif.type === 'danger' && <AlertCircle className="h-5 w-5 text-destructive" />}
                                                {notif.type === 'warning' && <AlertTriangle className="h-5 w-5 text-amber-500" />}
                                                {notif.type === 'info' && <BellRing className="h-5 w-5 text-primary" />}
                                                {!notif.type && !notif.read && <div className="h-2 w-2 rounded-full shrink-0 bg-primary"></div>}
                                            </div>
                                            <div className="flex-1">
                                                <p className={cn("text-sm leading-tight", !notif.read && "font-semibold")}>{notif.message}</p>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {formatDistanceToNow(notif.createdAt, { addSuffix: true })}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                </div>
                            ) : (
                                <p className="p-8 text-center text-sm text-muted-foreground">You have no notifications.</p>
                            )}
                        </CardContent>
                    </ScrollArea>
                     {notifications.length > 0 && (
                        <CardFooter className="p-2 border-t">
                            <Button variant="ghost" asChild className="w-full">
                                <Link href="/dashboard/notifications">
                                    View All Notifications
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                        </CardFooter>
                    )}
                </Card>
            </PopoverContent>
        </Popover>
    );
}
