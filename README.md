# MoneyMap

MoneyMap is a modern, AI-powered personal finance management application designed to provide users with a simple, smart, and secure way to take control of their finances. It offers an intuitive platform to track income and expenses, visualize spending habits, and receive personalized financial guidance.

![MoneyMap Screenshot](/public/moneymap.png)

## Key Features

- **AI-Powered Transaction Logging:** Add transactions quickly using natural language commands or voice dictation.
- **Smart Categorization:** Let AI automatically categorize your income and expenses for consistent and accurate tracking.
- **Unified Dashboard:** A central hub providing a high-level overview of your total income, expenses, and current balance across all accounts.
- **In-Depth Analytics:** Visualize your financial habits with interactive charts for spending breakdowns and income sources.
- **AI Financial Co-Pilot:**
    - **Financial Health Score:** Get a score from 0-100 that reflects your budgeting, saving, and spending habits.
    - **Life Event Planner:** Create AI-driven investment strategies for major life goals like buying a car or planning a wedding.
    - **Spending Suggestions:** Receive personalized reports with tips to cut costs and optimize your savings.
- **Conversational AI Chatbot:** Ask questions about your finances in plain English and get instant, data-driven answers.
- **Multi-Account Management:** Track your finances across various accounts, including Savings, Checking, Credit Cards, and Cash.
- **Secure Authentication:** User accounts are protected with secure email/password authentication powered by Firebase.
- **Automated Notifications:** Stay on top of your budget with automatic alerts when you approach or exceed your spending limits.

## Technology Stack

- **Frontend Framework:** Next.js (with React)
- **Language:** TypeScript
- **Styling:** Tailwind CSS & ShadCN UI
- **Generative AI:** Genkit (powered by Google Gemini)
- **Backend & Database:** Firebase (Firestore & Firebase Authentication)
- **Deployment:** Configured for Firebase App Hosting
- **Data Visualization:** Recharts

## Getting Started

Follow these instructions to set up and run the project locally.

### Prerequisites

- Node.js (v18 or later)
- npm or yarn
- A Firebase project with Firestore and Authentication enabled.

### Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/fiscal-flow.git
    cd fiscal-flow
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up environment variables:**
    Create a file named `.env` in the root of your project and add your Firebase project configuration details:
    ```env
    NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
    NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
    ```

4.  **Run the development server:**
    ```bash
    npm run dev
    ```

The application will be available at `http://localhost:9002`.

## Project Structure

The project follows a standard Next.js App Router structure:

```
.
├── src
│   ├── app         # Core application pages and layouts (e.g., dashboard, login)
│   ├── components  # Reusable React components (UI elements, dashboard widgets)
│   ├── ai          # Genkit flows that power all AI features
│   ├── lib         # Utility functions, Firebase configuration, and custom hooks
│   ├── hooks       # Custom React hooks (e.g., use-speech-recognition)
│   └── types       # TypeScript type definitions for the application
├── public          # Static assets like images
└── ...             # Root configuration files (tailwind, next.js, etc.)
```
