# 🤖 NeuraXchange Bot

An **AI-powered Telegram bot** for seamless, conversational crypto swaps using the **SideShift API**.  
Built for the **SideShift WaveHack Buildathon** 🏗️

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

## 🛠️ Built With

- [Node.js](https://nodejs.org/)
- [TypeScript](https://www.typescriptlang.org/)
- [node-telegram-bot-api](https://github.com/yagop/node-telegram-bot-api)
- [node-nlp](https://github.com/axa-group/nlp.js)
- [Axios](https://axios-http.com/)
- [SideShift API](https://docs.sideshift.ai/)

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


Start Command:

npm run start


Add environment variables in your platform’s dashboard.

Ensure model.nlp is committed to the repository for the build process.

📜 License

Distributed under the MIT License.
See LICENSE
 for more information.
