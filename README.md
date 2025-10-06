NeuraXchange Bot
An AI-powered Telegram bot for seamless, conversational crypto swaps using the SideShift API. This project was built for the SideShift WaveHack Buildathon.

🚀 About The Project
Cross-chain cryptocurrency swaps are powerful but often intimidating for everyday users. The process can involve navigating multiple websites, connecting wallets, and understanding complex interfaces, creating a high barrier to entry.

NeuraXchange solves this problem by transforming the complex process of swapping crypto into a simple, secure conversation. It leverages the power of AI and the SideShift API to allow users to perform non-custodial, direct-to-wallet swaps without ever leaving their favorite chat app.

✨ Key Features
🧠 Natural Language Processing: NeuraXchange understands plain English. Users can simply state what they want to trade (e.g., "swap 0.1 ETH on arbitrum for SOL"), and the bot's AI brain extracts all the necessary details.

🔗 Full SideShift API Integration: The bot is fully integrated with the SideShift API to handle the entire swap lifecycle: fetching live quotes, creating fixed-rate orders, and polling for real-time status updates.

💬 Conversational UI with Interactive Buttons: The user is guided through a seamless, multi-step conversation with clean, clickable buttons for confirmation and cancellation, making the experience fast, intuitive, and error-proof.

** smart Order Cancellation:** A robust /cancel command understands the SideShift API's 5-minute cancellation rule. If a user cancels too early, the bot intelligently schedules the cancellation to execute automatically, providing a superior and more helpful user experience.

📈 Live Price Check Command: A handy /price utility allows users to get real-time exchange rates for any pair, including those on specific networks (e.g., /price eth (arbitrum) to sol), adding value beyond just executing swaps.

🛠️ Built With
Node.js

(https://www.typescriptlang.org/)

node-telegram-bot-api

node-nlp

Axios

(https://docs.sideshift.ai/)

🏁 Getting Started
Follow these steps to get a local copy of the bot up and running for development and testing purposes.

Prerequisites
Node.js (v18 or later)

npm

A Telegram Bot Token obtained from(https://t.me/BotFather).

Installation & Setup
**Clone the repository:**sh
git clone https://github.com/your-username/NeuraXchange.git
cd NeuraXchange


Install NPM packages:

Bash

npm install
Set up your Environment Variables:
Create a .env file in the root of the project. Use the .env.example file as a template and add your secret keys.

مقتطف الرمز

TELEGRAM_BOT_TOKEN=YOUR_TELEGRAM_BOT_TOKEN_HERE
SIDESHIFT_AFFILIATE_ID=YOUR_SIDESHIFT_AFFILIATE_ID_HERE
SIDESHIFT_SECRET=YOUR_SIDESHIFT_SECRET_HERE
Train the AI Model:
You must run the training script once to generate the model.nlp file. This file contains the trained brain of your bot.

Bash

npx ts-node src/nlp.ts
Run the Bot:
Start the bot in development mode. nodemon will automatically restart the bot when you make changes to the code.

Bash

npm run dev
You should see the message Bot is running... in your terminal. The bot is now live and ready to receive messages on Telegram.

🤖 Usage
Once the bot is running, you can interact with it on Telegram.

Start a Conversation:
Send /start to receive a welcome message.

Perform a Swap (Natural Language):
Simply tell the bot what you want to do.

swap 0.1 ETH on arbitrum for SOL
trade 500 USDC for BTC

Check a Price:
Use the /price command to get a live exchange rate.

/price btc to eth
/price eth (arbitrum) to sol

Cancel a Transaction:
At any point during a swap, you can send /cancel to safely exit the process.

🚀 Deployment
This bot is designed to run 24/7 on a cloud hosting platform. It has been successfully deployed on Render and Railway as a Background Worker (or equivalent service type that does not require an open port).

Key deployment steps include:

Setting the Build Command to npm install && npm run build.

Setting the Start Command to npm run start.

Adding the environment variables to the platform's secrets management dashboard.

Ensuring the model.nlp file is committed to the repository so it's available during the build process.

📄 License
Distributed under the MIT License. See LICENSE for more information.

