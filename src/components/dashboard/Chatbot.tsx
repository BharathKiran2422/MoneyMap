
'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Send, X, Loader2, Bot, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, Timestamp, doc, getDoc, Firestore } from 'firebase/firestore';
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
        text: "Hello! I'm your MoneyMap assistant. I can help you analyze your spending patterns and answer questions about your finances. Try asking me something, or pick a suggestion below.",
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
            scrollAreaRef.current.scrollTo({
                top: scrollAreaRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, 100);
  };
  
  useEffect(() => {
    if (isOpen) {
        scrollToBottom();
    }
  }, [isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchFinancialData = async (): Promise<Omit<FinancialChatbotInput, 'question'>> => {
    if (!user) throw new Error("User not authenticated");
    if (!db) throw new Error("Database not initialized");

    try {
        // Fetch user profile
        const userDocRef = doc(db!, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        const userProfile = userDoc.exists() ? userDoc.data() as UserProfile : null;
        
        // Fetch all accounts to get all transactions
        const accountsSnapshot = await getDocs(collection(db!, 'users', user.uid, 'accounts'));
        
        if (accountsSnapshot.empty) {
            return {
                transactionHistory: "No transactions found. Please add some transactions to your account first.",
                userProfile: JSON.stringify({
                    name: userProfile?.name || 'User',
                    monthlyBudget: userProfile?.monthlyBudget || 0,
                    currency: 'INR'
                })
            };
        }

        const transactionPromises = accountsSnapshot.docs.map(accountDoc =>
            getDocs(query(collection(db!, 'users', user.uid, 'accounts', accountDoc.id, 'transactions')))
        );

        const transactionSnapshots = await Promise.all(transactionPromises);
        const allTransactions = transactionSnapshots.flatMap(snapshot =>
            snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    ...data,
                    id: doc.id,
                    date: (data.date as Timestamp).toDate(),
                } as Transaction;
            })
        );

        if (allTransactions.length === 0) {
            return {
                transactionHistory: "No transactions found. Please add some transactions to your account first.",
                userProfile: JSON.stringify({
                    name: userProfile?.name || 'User',
                    monthlyBudget: userProfile?.monthlyBudget || 0,
                    currency: 'INR'
                })
            };
        }

        // Sort transactions by date (newest first) and format them
        const sortedTransactions = allTransactions.sort((a, b) => b.date.getTime() - a.date.getTime());
        
        const transactionHistoryString = sortedTransactions.map(t => {
            const formattedDate = format(t.date, 'yyyy-MM-dd');
            const amount = typeof t.amount === 'number' ? t.amount.toFixed(2) : t.amount;
            const category = t.category || 'Uncategorized';
            return `${formattedDate}: ${t.type} of ₹${amount} for '${t.description}' in category '${category}'`;
        }).join('\n');

        const userProfileString = JSON.stringify({
            name: userProfile?.name || 'User',
            monthlyBudget: userProfile?.monthlyBudget || 0,
            currency: 'INR'
        });

        return {
            transactionHistory: transactionHistoryString,
            userProfile: userProfileString
        };
    } catch (error) {
        console.error('Error fetching financial data:', error);
        throw new Error('Failed to fetch your financial data. Please try again.');
    }
  };

  const processQuestion = async (question: string) => {
    if (!question.trim() || isLoading) return;
    
    // Add user message to UI
    const userMessage: Message = { 
        id: Date.now().toString(), 
        text: question, 
        sender: 'user',
        timestamp: new Date()
    };

    // Remove suggestions from previous bot message if they exist
    setMessages(prev => {
        const newMessages = [...prev];
        const lastMessage = newMessages[newMessages.length - 1];
        if (lastMessage && lastMessage.sender === 'bot' && lastMessage.suggestions) {
            delete lastMessage.suggestions;
        }
        return [...newMessages, userMessage];
    });

    setInput('');
    setIsLoading(true);

    try {
        const financialData = await fetchFinancialData();
        const chatbotInput: FinancialChatbotInput = {
            ...financialData,
            question: question
        };

        const response = await financialChatbot(chatbotInput);
        
        const botMessage: Message = { 
            id: (Date.now() + 1).toString(), 
            text: response, 
            sender: 'bot',
            timestamp: new Date()
        };
        setMessages(prev => [...prev, botMessage]);

    } catch (error: any) {
        console.error('Chatbot error:', error);
        toast({
            title: 'Error',
            description: error.message || "Could not get a response from the chatbot.",
            variant: 'destructive'
        });
        const errorMessage: Message = {
            id: 'error-' + Date.now(),
            text: "I apologize, but I'm having trouble processing your request right now. Please make sure you have some transaction data and try again.",
            sender: 'bot',
            timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
    } finally {
        setIsLoading(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    processQuestion(input);
  };
  
  const handleSuggestionClick = (question: string) => {
    processQuestion(question);
  };


  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  const getInitials = (email: string | null | undefined) => {
    if (!email) return 'U';
    if(user?.displayName) {
        const parts = user.displayName.split(' ').filter(Boolean);
        if (parts.length > 1) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return user.displayName.substring(0, 2).toUpperCase();
    }
    const parts = email.split('@')[0];
    return parts.substring(0, 2).toUpperCase();
  };

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}
      <div className={cn(
        "fixed bottom-4 right-4 z-50 transition-all duration-300",
        isOpen && "inset-2 sm:inset-auto sm:bottom-4 sm:right-4 sm:w-[400px] sm:h-[600px]"
      )}>
        {isOpen ? (
          <Card className="h-full flex flex-col shadow-2xl rounded-xl border-2">
            <CardHeader className="flex flex-row items-center justify-between border-b p-4 bg-gradient-to-r from-blue-50 to-indigo-50">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500">
                        <Bot className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <CardTitle className="text-lg text-gray-800">MoneyMap AI</CardTitle>
                        <CardDescription className="text-xs text-gray-600">Your personal financial assistant</CardDescription>
                    </div>
                </div>
              <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="text-muted-foreground hover:bg-gray-100 hover:text-gray-900">
                <X className="h-5 w-5" />
              </Button>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden">
                <ScrollArea className="h-full p-4" viewportRef={scrollAreaRef}>
                    <div className="space-y-4">
                    {messages.map((message) => (
                        <div key={message.id}>
                            <div className={cn(
                                'flex items-end gap-2 animate-in fade-in-0 slide-in-from-bottom-1 duration-200',
                                message.sender === 'user' ? 'justify-end' : 'justify-start'
                            )}>
                                {message.sender === 'bot' && (
                                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center">
                                        <Bot className="h-4 w-4 text-white" />
                                    </div>
                                )}
                                <div className="flex flex-col">
                                    <div
                                        className={cn(
                                        'max-w-[85%] rounded-2xl px-4 py-3 text-sm',
                                        message.sender === 'user'
                                            ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-br-none'
                                            : 'bg-gray-100 text-gray-800 rounded-bl-none'
                                        )}
                                    >
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm]}
                                            components={{
                                                p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                                                strong: ({node, ...props}) => <strong className="font-semibold" {...props} />,
                                                ul: ({node, ...props}) => <ul className="list-disc pl-4 mb-2" {...props} />,
                                                li: ({node, ...props}) => <li className="mb-1" {...props} />
                                            }}
                                        >
                                            {message.text}
                                        </ReactMarkdown>
                                    </div>
                                    <div className={cn(
                                        'text-xs text-gray-500 mt-1 px-1',
                                        message.sender === 'user' ? 'text-right' : 'text-left'
                                    )}>
                                        {format(message.timestamp, 'HH:mm')}
                                    </div>
                                </div>
                                {message.sender === 'user' && (
                                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center font-semibold text-xs text-gray-600">
                                        {getInitials(user?.email)}
                                    </div>
                                )}
                            </div>
                             {message.sender === 'bot' && message.suggestions && (
                                <div className="mt-2 ml-10 space-y-2 animate-in fade-in-0 slide-in-from-bottom-1 duration-200">
                                    {message.suggestions.map((suggestion, index) => (
                                        <Button 
                                            key={index}
                                            variant="outline"
                                            size="sm"
                                            className="w-full justify-start h-auto py-2 text-left"
                                            onClick={() => handleSuggestionClick(suggestion)}
                                        >
                                            {suggestion}
                                        </Button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                    {isLoading && (
                         <div className="flex items-end gap-2 justify-start animate-in fade-in-0 slide-in-from-bottom-1 duration-200">
                            <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center">
                                <Bot className="h-4 w-4 text-white" />
                            </div>
                            <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-gray-100 rounded-bl-none">
                                <div className="flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                                    <span className="text-sm text-gray-600">MoneyMap is thinking...</span>
                                </div>
                            </div>
                        </div>
                    )}
                    </div>
                </ScrollArea>
            </CardContent>
            <form onSubmit={handleSubmit} className="p-4 border-t bg-gray-50">
              <div className="relative">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about your spending..."
                  className="pr-12 h-11 border-2 focus:border-blue-500 transition-colors"
                  disabled={isLoading}
                />
                <Button 
                  type="submit" 
                  size="icon" 
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600" 
                  disabled={isLoading || !input.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </Card>
        ) : (
          <Button
            size="lg"
            className="rounded-full w-16 h-16 shadow-lg flex items-center justify-center bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 transition-all duration-300 hover:scale-105"
            onClick={() => setIsOpen(true)}
          >
            <MessageSquare className="h-8 w-8" />
          </Button>
        )}
      </div>
    </>
  );
}
