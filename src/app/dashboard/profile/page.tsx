'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/lib/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, User, Mail, Phone, ShieldCheck, Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Separator } from '@/components/ui/separator';

const profileSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  phone: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: '',
      phone: '',
    },
  });

  useEffect(() => {
    if (user) {
      const fetchUserData = async () => {
        if (!db) {
            toast({ variant: 'destructive', title: 'Database not connected.' });
            setFetching(false);
            return;
        }
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          form.reset({
            name: userData.name || user.displayName || '',
            phone: userData.phone || '',
          });
        } else {
            form.reset({
                name: user.displayName || '',
                phone: '',
            });
        }
        setFetching(false);
      };
      fetchUserData();
    } else if (!user && fetching === false) {
        router.push('/login');
    }
  }, [user, form, toast, router, fetching]);

  async function onSubmit(data: ProfileFormValues) {
    setLoading(true);
    if (!user || !auth.currentUser || !db) {
      toast({
        title: 'Error',
        description: 'You must be logged in to update your profile.',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    try {
      if (auth.currentUser.displayName !== data.name) {
        await updateProfile(auth.currentUser, {
          displayName: data.name,
        });
      }

      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        name: data.name,
        phone: data.phone || '',
      });

      toast({
        title: 'Success',
        description: 'Your profile has been updated.',
      });
      router.refresh();
    } catch (error: any) {
      toast({
        title: 'Error updating profile',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  if (fetching) {
      return (
        <div className="flex justify-center items-center h-[80vh]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )
  }

  return (
    <div className="max-w-5xl mx-auto py-10">
      <div className="flex flex-col gap-10">
        <div className="space-y-3">
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Account Center</h1>
            <p className="text-muted-foreground text-lg">Manage your identity and communication preferences.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-1 space-y-6">
                <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
                    <CardHeader className="pb-4">
                        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-white/20 mb-6">
                            <ShieldCheck className="h-8 w-8" />
                        </div>
                        <CardTitle className="text-2xl">Security Hub</CardTitle>
                        <CardDescription className="text-primary-foreground/70">Securely managed via Firebase Identity Services.</CardDescription>
                    </CardHeader>
                    <CardContent className="text-sm">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 bg-white/10 p-3 rounded-lg">
                                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                                <span className="font-semibold">Verified Member</span>
                            </div>
                            <p className="text-xs opacity-80 leading-relaxed">Your data is isolated and protected by per-user security rules.</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-lg bg-slate-50 dark:bg-slate-900">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Settings className="h-5 w-5 text-primary" />
                            Preferences
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <p className="text-xs text-muted-foreground">Currency: INR (₹)</p>
                        <p className="text-xs text-muted-foreground">Timezone: India Standard Time</p>
                    </CardContent>
                </Card>
            </div>

            <div className="lg:col-span-2">
                <Card className="border-0 shadow-2xl overflow-hidden bg-white dark:bg-slate-900">
                    <div className="h-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600" />
                    <CardHeader className="pt-8 px-8">
                        <CardTitle className="flex items-center gap-3 text-2xl">
                            <User className="h-6 w-6 text-primary" />
                            Identity Details
                        </CardTitle>
                        <CardDescription>Update your contact and identification data.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 pt-4">
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                                <div className="grid gap-8 sm:grid-cols-2">
                                    <FormField
                                        control={form.control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="font-bold">Full Name</FormLabel>
                                                <FormControl>
                                                    <div className="relative">
                                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                        <Input placeholder="John Doe" {...field} className="pl-10 h-12 bg-slate-50 dark:bg-slate-800/50" />
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormItem>
                                        <FormLabel className="font-bold">Email Address</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                <Input value={user?.email ?? ''} disabled className="pl-10 h-12 bg-slate-100 dark:bg-slate-800 cursor-not-allowed border-dashed" />
                                            </div>
                                        </FormControl>
                                        <FormDescription className="text-[10px]">Managed by identity provider.</FormDescription>
                                    </FormItem>
                                </div>

                                <FormField
                                    control={form.control}
                                    name="phone"
                                    render={({ field }) => (
                                        <FormItem className="max-w-sm">
                                            <FormLabel className="font-bold">Phone Number</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                    <Input placeholder="+91 98765 43210" {...field} className="pl-10 h-12 bg-slate-50 dark:bg-slate-800/50" />
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <Separator />

                                <div className="flex justify-end pt-4">
                                    <Button type="submit" disabled={loading} size="lg" className="min-w-[180px] h-12 text-md shadow-lg shadow-primary/20">
                                        {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                                        Update Profile
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    </CardContent>
                </Card>
            </div>
        </div>
      </div>
    </div>
  );
}
