# MoneyMap (Budget Buddy)

MoneyMap is a modern, AI-powered personal finance management application designed to provide users with a simple, smart, and secure way to take control of their finances. It offers an intuitive platform to track income and expenses, visualize spending habits, and receive personalized financial guidance.

![MoneyMap Screenshot](/public/moneymap.png)

## Abstract
MoneyMap is an AI-native financial ecosystem that transforms bookkeeping into an automated, insight-rich experience. By integrating Generative AI (Google Gemini) with a robust Next.js and Firebase stack, it allows users to manage multiple accounts through conversational interfaces and gain strategic insights into their financial health.

## Key Features
1.  **AI-Powered Logging**: Add transactions quickly using natural language commands or voice dictation. No more tedious manual forms for every entry.
2.  **Smart AI Categorization**: Let AI automatically categorize your income and expenses for consistent and accurate tracking based on the context of your description.
3.  **Financial Health Co-Pilot**: Get a score from 0-100 that reflects your stability based on the 50/30/20 rule, with qualitative advice on how to improve.
4.  **Life Event Planner**: Create AI-driven investment strategies for major life goals like buying a home or planning a wedding, adjusted for your income and timeline.
5.  **Smart Notifications**: Proactive alerts for budget thresholds (75%, 90%, 100%), spending spikes, and recurring reminders like rent or bills.
6.  **Monthly Professional Reports**: Generate comprehensive, professional-grade PDF reports with automated charts and performance summaries.

## Technology Stack
- **Frontend**: Next.js 15, React, Tailwind CSS, ShadCN UI
- **Backend**: Firebase (Firestore, Authentication)
- **AI Engine**: Google Gemini (Direct API Integration via Genkit)
- **Visualization**: Recharts
- **PDF Generation**: jsPDF & html2canvas

## Security
MoneyMap leverages Firebase Security Rules to ensure that financial data is isolated and accessible only to the authenticated owner. AI processing occurs on summarized data to ensure privacy.