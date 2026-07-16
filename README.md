# EPIC AI Trader Studio

A browser-based prototype for an AI agent app that helps users explore **trading research workflows**, **video-making workflows**, and a safe path toward **paper/live trading execution**.

The app includes a no-cost demo mode that runs in the browser without API keys, sign-ups, paid AI credits, or a backend server. The demo uses a transparent JavaScript rules engine to simulate how an AI agent would gather inputs, build a paper-trade plan, and create a video script/storyboard.

> Educational demo only. This project does not provide financial advice. Live trading is intentionally locked until you implement a real backend broker adapter, configure server-side credentials, and test in sandbox/paper mode.

## Features

### Trading Strategy Agent

- Creates a paper-trade research brief
- Generates setup score, market bias, entry checklist, risk guardrails, levels, and journal prompts
- Emphasizes risk management and educational use

### Video Maker Agent

- Creates scripts, hooks, title ideas, storyboards, captions/prompts, and production checklists
- Supports short-form, YouTube explainer, and webinar/course formats

### Combined Campaign Agent

- Turns a market idea into both a paper-trade plan and a content plan

### Free Agent Playground

- Runs locally in the browser
- No API keys required
- Inputs stay private on the user's device
- Output can be copied as Markdown

### Active AI Agent Runner

- Runs a backend agent loop through `POST /api/agent/run`
- Supports **Free Rules Agent** mode with no API key
- Supports **Ollama Local LLM** mode for a free local AI brain
- Agent modes: research only, paper trade only, live trade requires approval, video creator, trading + video campaign
- Applies the server risk engine before any paper execution
- Live execution is never sent directly by the agent; it only creates approval-ready previews

### Paper / Live Trading Desk

- Order builder with symbol, side, quantity, entry price, stop-loss, and take-profit
- Risk settings panel for account size, max risk per trade, daily loss limit, max notional, stop-loss requirement, and human approval
- Order preview screen that blocks unsafe setups before execution
- Free paper-trading simulator in the browser or through the Node backend
- Backend API routes for broker integration
- Alpaca, Binance, and Coinbase adapter structure
- Live trading mode is present but locked by default

### Supported Broker Adapters

The backend now includes adapter files for the three brokers you selected:

- **Alpaca** — uses Alpaca paper trading while `BROKER_SANDBOX=true` / `ALPACA_PAPER=true`.
- **Binance** — uses Binance Spot testnet/test-order behavior while `BROKER_SANDBOX=true` / `BINANCE_TESTNET=true`.
- **Coinbase** — uses Coinbase Advanced Trade formatting. Sandbox mode defaults to a backend dry run; real Coinbase orders require `BROKER_SANDBOX=false` and `COINBASE_ALLOW_LIVE=true`.

All broker keys must be configured on the backend using environment variables. Never paste broker keys into the webpage or frontend JavaScript.

## Run the free static app

Open `index.html` directly in your browser.

You can use the AI agent playground and local paper-trading preview without installing anything.

## Run with the backend API

The backend uses only built-in Node.js modules; no dependencies are required.

```bash
npm start
```

Then visit:

```text
http://localhost:8080
```

Useful API endpoints:

```text
GET  /api/health
GET  /api/brokers
GET  /api/agent/status
POST /api/agent/run
GET  /api/trades
POST /api/order/preview
POST /api/order/execute
```

## Active AI agent modes

The Active Agent section can run in these modes:

```text
research       # AI analysis only, no order candidate required
paper_trade    # Creates a paper-trade candidate and can auto-execute paper trades if enabled
live_approval  # Creates a live-order preview only; never sends it automatically
video          # Creates video hooks, scripts, title ideas, and visual prompts
campaign       # Combines trading research, paper-trade preview, and video package
```

The free default provider is the built-in rules agent:

```bash
AI_AGENT_PROVIDER=free-rules
```

To use a free local LLM, install and run Ollama, then pull a model:

```bash
ollama pull llama3.1
ollama serve
```

Then set:

```bash
AI_AGENT_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1
```

If Ollama is not running, the backend falls back to the free rules agent.

Example agent run:

```bash
curl -X POST http://localhost:8080/api/agent/run \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "free-rules",
    "mode": "campaign",
    "idea": "Bitcoin breakout retest after CPI with confirmation",
    "symbol": "BTCUSD",
    "assetClass": "crypto",
    "estimatedPrice": 65000,
    "stopLoss": 63000,
    "takeProfit": 69000,
    "accountSize": 10000,
    "maxRiskPercent": 1,
    "maxNotional": 7500,
    "autoExecutePaper": false
  }'
```

## Live trading safety model

Live trading is technically possible, but this project keeps it disabled by default.

A safe production flow should be:

```text
AI plan → order preview → risk engine → human approval → broker sandbox → live broker adapter → audit log
```

To prepare for real broker integration:

1. Copy `.env.example` to `.env` locally.
2. Keep `LIVE_TRADING_ENABLED=false` while developing.
3. Choose `alpaca`, `binance`, or `coinbase` in `LIVE_BROKER_ADAPTER`.
4. Store broker keys only as server environment variables, never in frontend JavaScript.
5. Test with a broker sandbox, testnet, dry run, or paper account first.
6. Only after testing, set `LIVE_TRADING_ENABLED=true` and keep human approval enabled.
7. Add production protections such as a kill switch, daily loss lockout, order-size caps, and audit logging.

Example environment values:

```bash
PORT=8080
LIVE_TRADING_ENABLED=false
LIVE_BROKER_ADAPTER=alpaca
BROKER_SANDBOX=true

# Active AI agent
AI_AGENT_PROVIDER=free-rules
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1
ACTIVE_AGENT_ALLOW_PAPER_EXECUTION=true
ACTIVE_AGENT_ALLOW_LIVE_EXECUTION=false

# Alpaca
ALPACA_API_KEY=your_alpaca_key
ALPACA_API_SECRET=your_alpaca_secret

# Binance
BINANCE_API_KEY=your_binance_key
BINANCE_API_SECRET=your_binance_secret

# Coinbase Advanced Trade
COINBASE_API_KEY_NAME=your_coinbase_key_name
COINBASE_API_PRIVATE_KEY="-----BEGIN EC PRIVATE KEY-----\n...\n-----END EC PRIVATE KEY-----"
```

## Files

```text
index.html                         # Main webpage/app structure
styles.css                         # Responsive dark UI styling
app.js                             # Free local agent and trading desk logic
server.js                          # Node backend API and static file server
src/risk/riskEngine.js             # Server-side order validation and risk checks
src/agents/activeAgent.js          # Active AI agent runner with free rules + Ollama support
src/brokers/paperBroker.js         # Free paper-trading simulator
src/brokers/liveBrokerPlaceholder.js # Broker router for live adapters
src/brokers/adapters/alpacaAdapter.js   # Alpaca Trading API adapter
src/brokers/adapters/binanceAdapter.js  # Binance Spot API adapter
src/brokers/adapters/coinbaseAdapter.js # Coinbase Advanced Trade adapter
src/orders/orderStore.js           # Local JSON paper-trade storage
.env.example                       # Example backend configuration without secrets
GO_LIVE_PAPER.md                   # Go-live checklist and required production changes
```

## Check syntax

```bash
npm run check
```

## How to turn this into a full production AI agent app

1. Connect market data, news, chart indicators, broker sandbox APIs, and a paper-trading database.
2. Extend `src/agents/activeAgent.js` with market-data tools, memory, and scheduling.
3. Replace or augment the free rules engine with your preferred LLM/orchestration API.
4. Add image, voice, captions, and video-generation API integrations.
5. Extend the Alpaca, Binance, or Coinbase backend adapter for any advanced order types you need.
6. Keep human approval, audit logs, risk controls, and a kill switch before publishing or trading.
