# NeuraXchange Telegram Bot

NeuraXchange is a Telegram bot that allows users to swap cryptocurrencies using natural language. It integrates with SideShift.ai to provide quotes and execute swaps.

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- [npm](https://www.npmjs.com/)
- [Docker](https://www.docker.com/) (optional, for containerized deployment)

## Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/neuraxchange.git
    cd neuraxchange
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up environment variables:**
    Create a `.env` file in the project root and add your Telegram bot token:
    ```
    TELEGRAM_BOT_TOKEN=your_telegram_bot_token
    ```

## Usage

### Development

To run the bot in development mode with hot-reloading:

```bash
npm run dev
```

This will start the bot using `ts-node` and `nodemon`.

### Production

To build and run the bot for production:

1.  **Build the TypeScript code:**
    ```bash
    npm run build
    ```

2.  **Run the bot:**
    ```bash
    npm start
    ```

### Docker

To build and run the bot in a Docker container:

1.  **Build the image:**
    ```bash
    docker build -t neuraxchange-bot .
    ```

2.  **Run the container:**
    ```bash
    docker run -d --env-file .env neuraxchange-bot
    ```

## Architecture

-   **`src/index.ts`**: The main entry point of the application. It initializes the Telegram bot, loads the NLP model, and handles incoming messages.
-   **`src/nlp.ts`**: Responsible for training and saving the Natural Language Processing (NLP) model using `node-nlp`.
-   **`src/sideshift.ts`**: An API client for interacting with the SideShift.ai API.
-   **`Dockerfile`**: Defines the multi-stage Docker build for creating a production-ready container.
-   **`tsconfig.json`**: TypeScript configuration file.
-   **`package.json`**: Project metadata and dependencies.
