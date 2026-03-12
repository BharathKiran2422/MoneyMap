'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { db } from '@/lib/firebase';
import { collection, query, onSnapshot, orderBy, doc, updateDoc, Timestamp, getDoc, getDocs, where } from 'firebase/firestore';
import type { Notification, UserProfile } from '@/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Bell, BellRing, CheckCheck, AlertTriangle, AlertCircle, ArrowRight, Lightbulb, Trophy } from 'lucide-react';
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

    useEffect(() => {
        if (!user || !db) return;
        
        const q = query(
            collection(db, 'users', user.uid, 'notifications'),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const notifs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: (doc.data().createdAt as Timestamp).toDate(),
            } as Notification));
            setNotifications(notifs);
            setUnreadCount(notifs.filter(n => !n.read).length);
            
            const highAlert = notifs.some(n => !n.read && n.type === 'danger');
            const warnAlert = notifs.some(n => !n.read && n.type === 'warning');
            setBudgetStatus(highAlert ? 'danger' : warnAlert ? 'warning' : 'ok');
        });

        return () => unsubscribe();
    }, [user]);

    const handleMarkAllAsRead = async () => {
        if (!user || !db || unreadCount === 0) return;
        const unread = notifications.filter(n => !n.read);
        for (const notif of unread) {
            await updateDoc(doc(db, 'users', user.uid, 'notifications', notif.id), { read: true });
        }
    };
    
    const handleNotificationClick = async (notif: Notification) => {
        if (!user || !db) return;
        if (!notif.read) await updateDoc(doc(db, 'users', user.uid, 'notifications', notif.id), { read: true });
        if (notif.link) {
          router.push(notif.link);
          setIsOpen(false);
        }
    };

    const getIcon = (notif: Notification) => {
        if (notif.category === 'Achievement') return <Trophy className="h-4 w-4 text-emerald-500" />;
        if (notif.category === 'Advice') return <Lightbulb className="h-4 w-4 text-blue-500" />;
        if (notif.type === 'danger') return <AlertCircle className="h-4 w-4 text-rose-500" />;
        if (notif.type === 'warning') return <AlertTriangle className="h-4 w-4 text-amber-500" />;
        return <Bell className="h-4 w-4 text-muted-foreground" />;
    };

    const BellIcon = () => {
        if (budgetStatus === 'danger') return <BellRing className="h-5 w-5 text-rose-500 animate-bounce" />;
        if (budgetStatus === 'warning') return <BellRing className="h-5 w-5 text-amber-500" />;
        return <Bell className="h-5 w-5" />;
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative rounded-full border bg-background/50">
                    <BellIcon />
                    {unreadCount > 0 && (
                        <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px] font-bold">
                            {unreadCount}
                        </Badge>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 shadow-2xl border-0 overflow-hidden rounded-xl" align="end">
                <Card className="border-0 shadow-none">
                    <CardHeader className="flex flex-row items-center justify-between border-b p-4 bg-slate-50 dark:bg-slate-900">
                        <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Notifications</CardTitle>
                        {unreadCount > 0 && (
                             <Button variant="ghost" size="sm" onClick={handleMarkAllAsRead} className="text-[10px] h-auto p-1 font-bold text-primary">
                                <CheckCheck className="mr-1 h-3 w-3" />
                                Mark All
                            </Button>
                        )}
                    </CardHeader>
                    <ScrollArea className="h-[300px]">
                        <CardContent className="p-0">
                            {notifications.length > 0 ? (
                                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                {notifications.map(notif => (
                                    <div 
                                        key={notif.id} 
                                        className={cn("p-4 transition-colors", !notif.read && "bg-blue-500/5", notif.link && "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800")}
                                        onClick={() => handleNotificationClick(notif)}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="mt-1 shrink-0">{getIcon(notif)}</div>
                                            <div className="flex-1 space-y-1">
                                                <div className="flex items-center gap-2">
                                                    {notif.category && <Badge variant="outline" className="text-[8px] h-3 px-1 font-bold uppercase">{notif.category}</Badge>}
                                                    <p className="text-[10px] text-muted-foreground font-medium">{formatDistanceToNow(notif.createdAt, { addSuffix: true })}</p>
                                                </div>
                                                <p className={cn("text-xs leading-relaxed", !notif.read ? "font-bold text-foreground" : "text-muted-foreground")}>{notif.message}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                </div>
                            ) : (
                                <div className="p-12 text-center space-y-2">
                                    <Bell className="h-8 w-8 mx-auto text-muted-foreground/20" />
                                    <p className="text-xs text-muted-foreground font-medium">All caught up!</p>
                                </div>
                            )}
                        </CardContent>
                    </ScrollArea>
                     {notifications.length > 0 && (
                        <CardFooter className="p-2 border-t bg-slate-50 dark:bg-slate-900">
                            <Button variant="ghost" asChild className="w-full text-xs font-bold">
                                <Link href="/dashboard/notifications">
                                    History <ArrowRight className="ml-2 h-3 w-3" />
                                </Link>
                            </Button>
                        </CardFooter>
                    )}
                </Card>
            </PopoverContent>
        </Popover>
    );
}
