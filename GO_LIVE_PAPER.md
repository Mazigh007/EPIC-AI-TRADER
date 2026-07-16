# EPIC AI Trader Studio — Go-Live Paper

Prepared for: EPIC AI Trader Studio

Date: 2026-07-16

## Executive summary

This project is currently a **safe prototype** with:

- AI-style trading and video agent UI
- Active agent runner API
- Free rules-based agent mode
- Optional Ollama local LLM mode
- Paper trading simulator
- Risk engine
- Broker adapter structure for Alpaca, Binance, and Coinbase

It is **not ready for real-money unattended trading yet**. The code intentionally keeps live trading locked behind backend-only environment variables, risk checks, human confirmation, and broker credentials.

The safest path to production is:

```text
Static demo → backend paper trading → broker sandbox/testnet → limited live pilot → monitored production
```

## Current live-trading status

| Area | Current state | Go-live requirement |
|---|---|---|
| Frontend UI | Ready for demo, paper preview, active agent runs | Add authentication before exposing publicly |
| Active AI agent | On-demand agent runner exists | Add live market-data tools, memory, scheduling, and stricter safeguards |
| Broker adapters | Basic Alpaca, Binance, Coinbase adapter structure exists | Complete broker-specific precision rules, balances, order status, and advanced order handling |
| Paper trading | Works locally and through backend | Add persistent database and reconciliation if used seriously |
| Live trading | Locked by default | Only enable after sandbox testing, security hardening, and human approval workflow |
| Risk engine | Basic per-trade checks exist | Add account-wide exposure, daily loss lockout, max open positions, kill switch, and broker-side stop orders |
| Security | Secrets kept server-side by design | Add auth, HTTPS, rate limiting, secret manager, audit logs, and deployment hardening |
| Compliance | Educational disclaimers exist | Review legal/regulatory requirements for your location and users |

## Important safety warning

The current app can create live-order requests through backend code only if you intentionally enable live trading. Do not enable live trading until every item in this paper is reviewed.

Never put API keys in:

- `index.html`
- `app.js`
- browser localStorage
- chat messages
- Git commits
- public hosting environment variables visible to the frontend

API keys belong only in backend environment variables or a secure secret manager.

## Existing backend safety locks

Live execution is locked by default using these environment variables:

```bash
LIVE_TRADING_ENABLED=false
BROKER_SANDBOX=true
ACTIVE_AGENT_ALLOW_LIVE_EXECUTION=false
```

Human confirmation phrase:

```text
CONFIRM LIVE TRADE
```

Coinbase has an additional safety flag:

```bash
COINBASE_ALLOW_LIVE=false
```

## Files that matter for live trading

```text
server.js                                  # Backend API and static server
.env.example                               # Safe sample environment file
src/risk/riskEngine.js                     # Risk validation before execution
src/agents/activeAgent.js                  # Active agent runner
src/brokers/liveBrokerPlaceholder.js       # Broker router
src/brokers/paperBroker.js                 # Paper simulator
src/brokers/adapters/alpacaAdapter.js      # Alpaca adapter
src/brokers/adapters/binanceAdapter.js     # Binance adapter
src/brokers/adapters/coinbaseAdapter.js    # Coinbase adapter
src/orders/orderStore.js                   # Local paper-trade storage
```

## Go-live checklist

### 1. Choose one broker first

Do not go live with three brokers at the same time. Pick one broker, complete sandbox testing, then add the others.

Recommended order:

1. Alpaca paper trading
2. Binance testnet/test orders
3. Coinbase dry-run and then Coinbase live only after extra review

### 2. Create broker sandbox credentials

#### Alpaca

Required backend variables:

```bash
LIVE_BROKER_ADAPTER=alpaca
BROKER_SANDBOX=true
ALPACA_API_KEY=your_paper_key
ALPACA_API_SECRET=your_paper_secret
ALPACA_PAPER=true
```

Default paper endpoint used by the code:

```text
https://paper-api.alpaca.markets
```

Before live:

- Confirm paper account orders work
- Confirm symbol formatting for stocks and crypto
- Confirm buying power checks
- Confirm bracket/OCO order behavior if you want broker-side stop-loss/take-profit

#### Binance

Required backend variables:

```bash
LIVE_BROKER_ADAPTER=binance
BROKER_SANDBOX=true
BINANCE_API_KEY=your_testnet_key
BINANCE_API_SECRET=your_testnet_secret
BINANCE_TESTNET=true
BINANCE_CREATE_SANDBOX_ORDER=false
```

Default testnet endpoint used by the code:

```text
https://testnet.binance.vision
```

Before live:

- Implement and test exchange filters for tick size, lot size, min notional, and step size
- Handle timestamp drift and `recvWindow`
- Add rate-limit handling
- Validate symbol conversion such as `BTCUSD` to `BTCUSDT`
- Confirm whether you want `/api/v3/order/test` or real testnet order creation

#### Coinbase

Required backend variables:

```bash
LIVE_BROKER_ADAPTER=coinbase
BROKER_SANDBOX=true
COINBASE_API_KEY_NAME=your_key_name
COINBASE_API_PRIVATE_KEY="-----BEGIN EC PRIVATE KEY-----\n...\n-----END EC PRIVATE KEY-----"
COINBASE_SANDBOX=true
COINBASE_ALLOW_LIVE=false
```

Current Coinbase behavior:

- Sandbox mode returns a backend dry-run response
- No real Coinbase order is sent while sandbox is enabled

Before live:

- Verify Coinbase Advanced Trade authentication against the latest Coinbase docs
- Confirm product IDs such as `BTC-USD`
- Confirm order configuration schema
- Keep `COINBASE_ALLOW_LIVE=false` until final approval

### 3. Add authentication before public deployment

Current project has no user login. Before exposing it on the internet, add:

- Admin login
- Strong password or SSO
- Session expiration
- CSRF protection for state-changing actions
- Rate limiting
- IP allowlist for admin routes if possible
- Separate read-only and trading permissions

Suggested backend routes to protect:

```text
POST /api/order/execute
POST /api/agent/run
GET  /api/trades
GET  /api/brokers
```

### 4. Add real market data

The current app often uses user-provided estimated prices. Real trading must not depend on manually typed prices.

Add:

- Live quote feed
- Candle data
- Order book where relevant
- Spread checks
- Stale-price checks
- Trading-session checks
- Market open/close checks for stocks

Suggested new routes:

```text
GET /api/market/quote?symbol=BTCUSD&broker=binance
GET /api/market/candles?symbol=BTCUSD&timeframe=1h
GET /api/market/status
```

### 5. Expand the risk engine

Current checks include:

- Stop-loss requirement
- Max risk per trade
- Daily loss limit estimate
- Max notional
- Basic long/short stop validation

Add before live:

- Current account equity from broker
- Buying power / available balance
- Existing position exposure
- Max open positions
- Max correlated exposure
- Daily realized PnL lockout
- Consecutive-loss lockout
- Max orders per hour/day
- Spread/slippage limit
- Volatility limit
- News-event lockout if needed
- Emergency kill switch
- Broker-side stop-loss / take-profit order placement

Important: current `stopLoss` and `takeProfit` are mostly **risk metadata**. For live trading, implement real broker-side protective orders where supported.

### 6. Complete broker order handling

Before live, each adapter should support:

- Market orders
- Limit orders
- Broker-side stop-loss
- Broker-side take-profit
- Bracket/OCO where available
- Order cancellation
- Order status polling
- Partial fill handling
- Rejected order handling
- Position reconciliation
- Idempotency using client order IDs
- Precision filters and minimum order sizes
- Balance checks before submit

Suggested new routes:

```text
GET    /api/order/:id
DELETE /api/order/:id
GET    /api/positions
GET    /api/account
POST   /api/kill-switch
```

### 7. Upgrade persistence

Current paper trades are stored in local JSON under `.data/` when using the backend. For production, replace this with a database.

Recommended options:

- PostgreSQL
- SQLite for local-only single-user deployment
- Supabase/Postgres for hosted deployment

Store:

- Orders
- Fills
- Positions
- Agent runs
- Risk decisions
- User confirmations
- Broker responses
- Errors
- Audit logs
- Strategy versions

### 8. Add audit logs

Every live-relevant action should be logged:

- Who requested it
- Timestamp
- IP address
- Agent prompt/input
- Agent output
- Risk engine result
- Human confirmation
- Broker selected
- Raw broker response
- Final status

Audit logs should be append-only and backed up.

### 9. Add monitoring and alerts

Before live:

- Health checks
- Error monitoring
- Broker API failure alerts
- Daily PnL alerts
- Drawdown alerts
- Order rejection alerts
- Kill switch alert
- Server uptime monitor

Suggested tools:

- Uptime Kuma
- Grafana/Prometheus
- Sentry
- Logtail/Datadog/New Relic

### 10. Deployment requirements

Use:

- HTTPS only
- Node.js 18+ or newer
- Process manager such as PM2 or systemd
- Reverse proxy such as Nginx/Caddy
- Firewall
- Environment variables or secret manager
- Daily backup of database and logs

Do not deploy real trading from a local laptop without a plan for:

- Internet outages
- Power outages
- Process crashes
- Clock drift
- Broker downtime
- Emergency stop

### 11. Legal and compliance review

Before offering to other people:

- Review financial regulations in your jurisdiction
- Add Terms of Service
- Add Privacy Policy
- Add risk disclosures
- Clarify that the tool is educational unless licensed otherwise
- Do not promise profits
- Avoid copy-trading or managed-account behavior without legal review
- Keep user consent and approval logs

### 12. Final go-live environment pattern

Only after sandbox testing:

```bash
NODE_ENV=production
PORT=8080

LIVE_TRADING_ENABLED=true
BROKER_SANDBOX=false
ACTIVE_AGENT_ALLOW_PAPER_EXECUTION=true
ACTIVE_AGENT_ALLOW_LIVE_EXECUTION=false

# Choose exactly one broker first
LIVE_BROKER_ADAPTER=alpaca

# Broker credentials go here, backend only
ALPACA_API_KEY=...
ALPACA_API_SECRET=...
```

For Coinbase real live order submission, also set:

```bash
COINBASE_ALLOW_LIVE=true
```

Recommendation: keep `ACTIVE_AGENT_ALLOW_LIVE_EXECUTION=false` permanently unless you intentionally build a fully autonomous trading system with stronger safeguards.

## Sandbox test plan

Run these tests before real money:

1. Start server with sandbox settings
2. Confirm `/api/health`
3. Confirm `/api/brokers`
4. Preview a valid order
5. Preview an invalid order and verify it is blocked
6. Execute a paper/sandbox order
7. Confirm order appears in trade history
8. Test bad credentials
9. Test network failure
10. Test oversized position
11. Test missing stop-loss
12. Test daily loss limit breach
13. Test duplicate order submission
14. Test live mode without confirmation phrase
15. Test emergency kill switch after you implement it

## Commands

Run syntax checks:

```bash
npm run check
```

Run backend:

```bash
npm start
```

Check health:

```bash
curl http://localhost:8080/api/health
```

Check agent status:

```bash
curl http://localhost:8080/api/agent/status
```

Check brokers:

```bash
curl http://localhost:8080/api/brokers
```

Preview order:

```bash
curl -X POST http://localhost:8080/api/order/preview \
  -H "Content-Type: application/json" \
  -d '{
    "tradeMode": "paper",
    "broker": "paper-sim",
    "symbol": "BTCUSD",
    "side": "buy",
    "orderType": "market",
    "quantity": 0.05,
    "entryPrice": 65000,
    "stopLoss": 63000,
    "takeProfit": 69000,
    "accountSize": 10000,
    "maxRiskPercent": 1,
    "maxDailyLossPercent": 3,
    "maxNotional": 7500,
    "requireStopLoss": true,
    "requireHumanApproval": true
  }'
```

## Final recommendation

Use this project in this order:

1. Demo the AI agent and video maker
2. Use free paper trading only
3. Add market data
4. Complete one broker sandbox integration
5. Add database, authentication, logs, monitoring, and kill switch
6. Run a small sandbox pilot for at least several days
7. Only then consider a limited real-money pilot

Do not enable real live trading until the safety, security, broker, and compliance checklist is complete.
