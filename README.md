# 🤖 NeuraXchange Bot

An **AI-powered Telegram bot** for seamless, conversational crypto swaps using the **SideShift API**.  
Built for the **SideShift WaveHack Buildathon** 🏗️

## 🌐 Live Demo

- **Telegram Bot**: [@NeuraXchange_bot](https://t.me/NeuraXchange_bot)
- **Web Dashboard**: [neura-xchange.vercel.app](https://neura-xchange.vercel.app)

---

## 🚀 About The Project

Cross-chain cryptocurrency swaps are powerful — but often intimidating for everyday users.  
The process can involve **multiple websites, wallets, and complex UIs**, creating a high barrier to entry.

**NeuraXchange** solves this by transforming that complexity into a **simple, secure conversation**.  
It leverages **AI** and the **SideShift API** to let users perform **non-custodial, direct-to-wallet swaps** — without ever leaving Telegram.

---

## ✨ Key Features

### 🧠 Natural Language Processing
NeuraXchange understands plain English.  
Just type what you want to do — for example:
> “swap 0.1 ETH on Arbitrum for SOL”

The bot’s AI extracts all the details and guides you through the swap.

---

### 🔗 Full SideShift API Integration
- Fetches **live quotes**
- Creates **fixed-rate orders**
- Polls for **real-time status updates**

---

### 💬 Conversational UI with Interactive Buttons
Clean, guided steps with **confirmation** and **cancel** buttons make every interaction:
- Fast ⚡  
- Intuitive 💡  
- Error-proof ✅

---

### 🧩 Smart Order Cancellation
Implements the SideShift API’s **5-minute cancellation rule** intelligently.  
If you cancel too early, the bot **schedules** a future cancellation automatically.

---

### 📈 Live Price Check Command
Use `/price` to get **real-time rates** for any pair — even on specific networks.  
Examples:
/price btc to eth
/price eth (arbitrum) to sol

---

### 🖥️ Web Dashboard
A beautiful **cyberpunk-themed web dashboard** to manage your trading activity:
- **Swap History** - View all your past transactions
- **Price Alerts** - Set and manage price notifications
- **DCA Orders** - Configure dollar-cost averaging strategies
- **Limit Orders** - Set buy/sell orders at target prices
- **Favorite Pairs** - Quick access to frequently traded pairs
- **Referral Program** - Share your referral code and earn rewards
- **Settings** - Customize slippage, notifications, and preferences

Access the dashboard at [neura-xchange.vercel.app](https://neura-xchange.vercel.app) using your Telegram Chat ID.

---

## 🛠️ Built With

### Telegram Bot
- [Node.js](https://nodejs.org/)
- [TypeScript](https://www.typescriptlang.org/)
- [node-telegram-bot-api](https://github.com/yagop/node-telegram-bot-api)
- [node-nlp](https://github.com/axa-group/nlp.js)
- [Axios](https://axios-http.com/)
- [SideShift API](https://docs.sideshift.ai/)
- [Prisma](https://www.prisma.io/) + PostgreSQL

### Web Dashboard
- [Next.js 16](https://nextjs.org/) with Turbopack
- [React 19](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Lucide React](https://lucide.dev/) icons
- [Prisma](https://www.prisma.io/) (shared database)
- Deployed on [Vercel](https://vercel.com/)

---

## 🏁 Getting Started

Follow these steps to run **NeuraXchange** locally for development and testing.

### ✅ Prerequisites

- Node.js (v18 or later)
- npm
- A **Telegram Bot Token** from [@BotFather](https://t.me/BotFather)

---

### ⚙️ Installation & Setup

1. **Clone the Repository**
   ```bash
   git clone https://github.com/your-username/NeuraXchange.git
   cd NeuraXchange
Install Dependencies

npm install


Set Up Environment Variables
Create a .env file in the root directory (use .env.example as a guide):

TELEGRAM_BOT_TOKEN=YOUR_TELEGRAM_BOT_TOKEN_HERE
SIDESHIFT_AFFILIATE_ID=YOUR_SIDESHIFT_AFFILIATE_ID_HERE
SIDESHIFT_SECRET=YOUR_SIDESHIFT_SECRET_HERE


Train the AI Model

npx ts-node src/nlp.ts


This generates the model.nlp file (the bot’s trained AI brain).

Run the Bot

npm run dev


You should see:

Bot is running...

💬 Usage
🏁 Start a Conversation

Send /start in Telegram to receive a welcome message.

🔄 Perform a Swap

Just type what you want:

swap 0.1 ETH on arbitrum for SOL
trade 500 USDC for BTC

💹 Check a Price
/price btc to eth
/price eth (arbitrum) to sol

❌ Cancel a Transaction

Send /cancel anytime to safely exit a swap.

☁️ Deployment

NeuraXchange is designed to run 24/7 on cloud platforms like Render or Railway as a Background Worker (no open port needed).

🔧 Deployment Steps

Build Command:

npm install && npm run build

## Agent tools demo

This repository includes a small LangChain-ready `tools` array in `src/agent.ts` and a tiny natural-language parser in `src/nl-parser.ts`.

Quick demo (dry-run): build then run the demo script. It will parse a short natural-language request and show which tool would be called and with what payload.

PowerShell example:

```powershell
npm install
npm run build
node dist/scripts/demo-agent.js "I need 0.3 SOL"
```

To actually execute the SideShift API calls from the demo script (not recommended on CI), set the required environment variables and enable execution:

```powershell
$env:SIDESHIFT_SECRET='your_secret';
$env:SIDESHIFT_AFFILIATE_ID='your_affiliate_id';
$env:DEMO_EXECUTE='true';
npm run build; node dist/scripts/demo-agent.js "I need 0.3 SOL"
```

Notes:
- The parser is intentionally small and heuristic-based; it maps phrases like "I need 0.3 SOL" to a call to `get_quote_by_settle_amount` with `settleAmount=0.3`.
- Use `src/agent.ts`'s `tools` array with a LangChain agent if you'd like automated tool-calling from a full LLM.
- If you want an example wiring a live LangChain agent (OpenAI) into a running demo, I can add that as an optional example (requires an OpenAI API key).

Start Command:

npm run start

Add environment variables in your platform’s dashboard.

Ensure model.nlp is committed to the repository for the build process.

📜 License

Distributed under the MIT License. See LICENSE for more information.
