
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { db } from '@/lib/firebase';
import { collection, query, onSnapshot, orderBy, Timestamp } from 'firebase/firestore';
import type { Notification } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BellRing, CheckCheck, AlertTriangle, AlertCircle, Bell } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export default function NotificationsPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user || !db) return;

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
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    const getIcon = (notification: Notification) => {
        switch (notification.type) {
            case 'danger':
                return <AlertCircle className="h-5 w-5 text-destructive" />;
            case 'warning':
                return <AlertTriangle className="h-5 w-5 text-amber-500" />;
            case 'info':
                return <BellRing className="h-5 w-5 text-primary" />;
            default:
                return <Bell className="h-5 w-5 text-muted-foreground" />;
        }
    };

    return (
        <div className="space-y-6">
            <Button variant="outline" onClick={() => router.push('/dashboard')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
            </Button>

            <Card className="max-w-4xl mx-auto relative overflow-hidden border-0 shadow-xl bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-950">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5" />
                <CardHeader className="relative">
                    <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      All Notifications
                    </CardTitle>
                    <CardDescription>Here is a complete history of your alerts.</CardDescription>
                </CardHeader>
                <CardContent className="relative">
                    {loading ? (
                        <div className="flex justify-center items-center h-48">
                            <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                    ) : notifications.length > 0 ? (
                        <div className="divide-y divide-border/50">
                            {notifications.map(notif => (
                                <div key={notif.id} className={cn("p-4 transition-colors", !notif.read && "bg-primary/5 dark:bg-primary/10")}>
                                    <div className="flex items-start gap-4">
                                        <div className="w-5 h-5 shrink-0 mt-0.5 flex items-center justify-center">
                                            {getIcon(notif)}
                                        </div>
                                        <div className="flex-1">
                                            <p className={cn("text-sm leading-tight text-foreground", !notif.read && "font-semibold")}>{notif.message}</p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {formatDistanceToNow(notif.createdAt, { addSuffix: true })}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center text-muted-foreground flex flex-col items-center justify-center h-48 p-8">
                            <Bell className="h-12 w-12 mb-4 text-primary/30" />
                            <h3 className="font-semibold text-lg text-foreground mb-2">All caught up!</h3>
                            <p className="max-w-md">You have no notifications yet.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
