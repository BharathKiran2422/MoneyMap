'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  signOut,
  updateProfile,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import Link from 'next/link';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { Logo } from '@/components/Logo';

// Schema for login
const loginSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email.' }),
  password: z.string().min(1, { message: 'Password is required.' }),
});

// Schema for signup with strong password requirements
const signupSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Please enter a valid email.' }),
  password: z
    .string()
    .min(8, { message: 'Password must be at least 8 characters.' })
    .refine((password) => /[a-z]/.test(password), {
      message: 'Password must contain at least one lowercase letter.',
    })
    .refine((password) => /[A-Z]/.test(password), {
      message: 'Password must contain at least one uppercase letter.',
    })
    .refine((password) => /\d/.test(password), {
      message: 'Password must contain at least one number.',
    })
    .refine((password) => /[\W_]/.test(password), {
      message: 'Password must contain at least one special character.',
    }),
});

// Schema for forgot password
const forgotPasswordSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email.' }),
});

type AuthFormProps = {
  mode: 'login' | 'signup';
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [view, setView] = useState<'login' | 'signup' | 'forgotPassword'>(mode);

  const formSchema =
    view === 'signup'
      ? signupSchema
      : view === 'forgotPassword'
      ? forgotPasswordSchema
      : loginSchema;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues:
      view === 'signup'
        ? { name: '', email: '', password: '' }
        : { email: '', password: '' },
  });

  useEffect(() => {
    setView(mode);
  }, [mode]);

  useEffect(() => {
    form.reset(
      view === 'signup'
        ? { name: '', email: '', password: '' }
        : { email: '', password: '' }
    );
  }, [view, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    if (!auth || !db) {
      toast({
        title: 'Configuration Error',
        description: 'Firebase is not configured. Please check your .env file.',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }
    try {
      if (view === 'signup') {
        const signupValues = values as z.infer<typeof signupSchema>;
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          signupValues.email,
          signupValues.password
        );
        const user = userCredential.user;
        await updateProfile(user, {
          displayName: signupValues.name,
        });

        // Add user to Firestore 'users' collection
        if (user) {
          await setDoc(doc(db, "users", user.uid), {
            uid: user.uid,
            name: signupValues.name,
            email: user.email,
            phone: ''
          });
        }
        
        await sendEmailVerification(user);
        await signOut(auth);
        toast({
          title: 'Verification Email Sent',
          description:
            'Please check your inbox and verify your email to log in.',
        });
        router.push('/login');
      } else if (view === 'login') {
        const loginValues = values as z.infer<typeof loginSchema>;
        const userCredential = await signInWithEmailAndPassword(
          auth,
          loginValues.email,
          loginValues.password
        );
        if (userCredential.user && userCredential.user.emailVerified) {
          router.push('/dashboard');
          router.refresh();
        } else {
          if (auth) {
            await signOut(auth);
          }
          toast({
            title: 'Email Not Verified',
            description:
              'Please check your email and click the verification link.',
            variant: 'destructive',
          });
        }
      } else if (view === 'forgotPassword') {
        const { email } = values as z.infer<typeof forgotPasswordSchema>;
        await sendPasswordResetEmail(auth, email);
        toast({
          title: 'Password Reset Email Sent',
          description: 'Check your inbox for a link to reset your password.',
        });
        setView('login');
      }
    } catch (error: any) {
      toast({
        title: 'Authentication Error',
        description: error.message.replace('Firebase: ', ''),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  const titles = {
    login: 'Welcome Back',
    signup: 'Create an Account',
    forgotPassword: 'Forgot Password',
  };

  const descriptions = {
    login: 'Sign in to your account to continue.',
    signup: 'Enter your details to create an account.',
    forgotPassword: "Enter your email and we'll send you a reset link.",
  };

  const buttonTexts = {
    login: 'Login',
    signup: 'Sign Up',
    forgotPassword: 'Send Reset Link',
  };

  return (
    <Card className="w-full max-w-sm shadow-xl border-border/50">
      <CardHeader className="text-center">
        <div className="mb-4 flex justify-center">
          <Logo />
        </div>
        <CardTitle className="text-h3 font-semibold">{titles[view]}</CardTitle>
        <CardDescription>{descriptions[view]}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {view === 'signup' && (
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="John Doe"
                        {...field}
                        autoComplete="name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="name@example.com"
                      {...field}
                      autoComplete="email"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {view !== 'forgotPassword' && (
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          {...field}
                          autoComplete={
                            view === 'login'
                              ? 'current-password'
                              : 'new-password'
                          }
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute inset-y-0 right-0 h-full px-3 text-muted-foreground hover:text-foreground"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                          <span className="sr-only">
                            {showPassword ? 'Hide password' : 'Show password'}
                          </span>
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {view === 'login' && (
              <div className="text-right -mt-2">
                <Button
                  type="button"
                  variant="link"
                  className="p-0 h-auto text-sm"
                  onClick={() => setView('forgotPassword')}
                >
                  Forgot password?
                </Button>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {buttonTexts[view]}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-muted-foreground">
          {view === 'login' && "Don't have an account? "}
          {view === 'signup' && 'Already have an account? '}
          {view === 'forgotPassword' && 'Remember your password? '}

          {view === 'forgotPassword' ? (
            <Button
              type="button"
              variant="link"
              onClick={() => setView('login')}
              className="p-0"
            >
              Login
            </Button>
          ) : (
            <Button variant="link" asChild className="p-0">
              <Link href={view === 'login' ? '/signup' : '/login'}>
                {view === 'login' ? 'Sign up' : 'Login'}
              </Link>
            </Button>
          )}
        </p>
      </CardFooter>
    </Card>
  );
}
