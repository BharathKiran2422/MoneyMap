'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Send, X, Loader2, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, Timestamp, doc, getDoc } from 'firebase/firestore';
import { Transaction, UserProfile } from '@/types';
import { financialChatbot, FinancialChatbotInput } from '@/ai/flows/financial-chatbot';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const suggestedQuestions = [
    "What are my top 3 expenses this month?",
    "How much did I spend on groceries last week?",
    "What's my spending trend for dining out?",
    "Show me my largest transactions"
];

type Message = {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  suggestions?: string[];
};

export default function Chatbot() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
        id: 'initial',
        text: "Hello! I'm MoneyMap AI. I've analyzed your accounts. Ask me anything about your spending or select a common query below.",
        sender: 'bot',
        timestamp: new Date(),
        suggestions: suggestedQuestions,
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    setTimeout(() => {
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
        }
    }, 100);
  };
  
  useEffect(() => { if (isOpen) scrollToBottom(); }, [isOpen]);
  useEffect(() => { scrollToBottom(); }, [messages]);

  const fetchFinancialData = async (): Promise<Omit<FinancialChatbotInput, 'question'>> => {
    if (!user) throw new Error("Unauthorized");
    const userDocRef = doc(db!, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);
    const profile = userDoc.exists() ? userDoc.data() as UserProfile : null;
    
    const accountsSnapshot = await getDocs(collection(db!, 'users', user.uid, 'accounts'));
    const allT: Transaction[] = [];
    
    for (const acc of accountsSnapshot.docs) {
        const tSnap = await getDocs(query(collection(db!, 'users', user.uid, 'accounts', acc.id, 'transactions')));
        tSnap.docs.forEach(d => allT.push({ ...d.data(), id: d.id, date: (d.data().date as Timestamp).toDate() } as Transaction));
    }

    const sorted = allT.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 100);
    const tHistory = sorted.map(t => `${format(t.date, 'yyyy-MM-dd')}: ${t.type} of ₹${t.amount} for '${t.description}' in category '${t.category || 'Other'}'`).join('\n');

    return {
        transactionHistory: tHistory || "No transactions yet.",
        userProfile: JSON.stringify({ name: profile?.name, budget: profile?.monthlyBudget })
    };
  };

  const processQuestion = async (question: string) => {
    if (!question.trim() || isLoading) return;
    const userM: Message = { id: Date.now().toString(), text: question, sender: 'user', timestamp: new Date() };
    setMessages(prev => [...prev, userM]);
    setInput('');
    setIsLoading(true);

    try {
        const context = await fetchFinancialData();
        const response = await financialChatbot({ ...context, question });
        const botM: Message = { id: (Date.now() + 1).toString(), text: response, sender: 'bot', timestamp: new Date() };
        setMessages(prev => [...prev, botM]);
    } catch (error: any) {
        toast({ title: 'Error', description: "AI assistant is busy. Try again later.", variant: 'destructive' });
    } finally {
        setIsLoading(false);
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    processQuestion(input);
  };

  return (
    <>
      <div className={cn("fixed bottom-4 right-4 z-50 transition-all duration-300", isOpen && "inset-2 sm:inset-auto sm:bottom-4 sm:right-4 sm:w-[400px] sm:h-[600px]")}>
        {isOpen ? (
          <Card className="h-full flex flex-col shadow-2xl border-2">
            <CardHeader className="flex flex-row items-center justify-between border-b p-4 bg-gradient-to-r from-blue-50 to-indigo-50">
                <div className="flex items-center gap-3">
                    <Bot className="h-10 w-10 p-2 rounded-full bg-blue-600 text-white" />
                    <div>
                        <CardTitle className="text-lg">MoneyMap AI</CardTitle>
                        <CardDescription className="text-xs">Your financial co-pilot</CardDescription>
                    </div>
                </div>
              <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}><X className="h-5 w-5" /></Button>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden">
                <ScrollArea className="h-full p-4" viewportRef={scrollAreaRef}>
                    <div className="space-y-4">
                    {messages.map((m) => (
                        <div key={m.id} className={cn('flex items-end gap-2', m.sender === 'user' ? 'justify-end' : 'justify-start')}>
                            {m.sender === 'bot' && <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center"><Bot className="h-4 w-4 text-blue-600" /></div>}
                            <div className={cn('max-w-[85%] rounded-2xl px-4 py-3 text-sm', m.sender === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-muted rounded-bl-none')}>
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.text}</ReactMarkdown>
                                {m.suggestions && (
                                    <div className="mt-4 space-y-2">
                                        {m.suggestions.map((s, i) => (
                                            <Button key={i} variant="outline" size="sm" className="w-full justify-start text-left h-auto py-2 text-xs" onClick={() => processQuestion(s)}>{s}</Button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    {isLoading && <div className="flex gap-2"><Loader2 className="h-4 w-4 animate-spin text-blue-600" /><span className="text-xs text-muted-foreground italic">Consulting history...</span></div>}
                    </div>
                </ScrollArea>
            </CardContent>
            <form onSubmit={handleSubmit} className="p-4 border-t bg-muted/30">
              <div className="flex gap-2">
                <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about your spending..." className="h-11" disabled={isLoading} />
                <Button type="submit" size="icon" className="h-11 w-11" disabled={isLoading || !input.trim()}><Send className="h-4 w-4" /></Button>
              </div>
            </form>
          </Card>
        ) : (
          <Button size="lg" className="rounded-full w-16 h-16 shadow-2xl bg-blue-600 hover:bg-blue-700 hover:scale-110 transition-all" onClick={() => setIsOpen(true)}>
            <MessageSquare className="h-8 w-8" />
          </Button>
        )}
      </div>
    </>
  );
}
