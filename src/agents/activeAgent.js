const { validateOrder, LIVE_CONFIRMATION } = require("../risk/riskEngine");
const paperBroker = require("../brokers/paperBroker");

const DEFAULT_OLLAMA_BASE_URL = "http://localhost:11434";
const DEFAULT_OLLAMA_MODEL = "llama3.1";
const DEFAULT_OLLAMA_TIMEOUT_MS = 20000;

function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clean(value, fallback = "") {
  const text = String(value || "").trim();
  return text || fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeAgentInput(input = {}) {
  const mode = clean(input.mode || input.agentMode, "research");
  const provider = clean(input.provider || input.aiProvider, process.env.AI_AGENT_PROVIDER || "free-rules");
  const estimatedPrice = toNumber(input.estimatedPrice || input.entryPrice, 65000);
  const stopLoss = toNumber(input.stopLoss, estimatedPrice ? estimatedPrice * 0.97 : 0);
  const takeProfit = toNumber(input.takeProfit, estimatedPrice ? estimatedPrice * 1.06 : 0);
  const accountSize = toNumber(input.accountSize, 10000);
  const maxRiskPercent = toNumber(input.maxRiskPercent, 1);
  const maxDailyLossPercent = toNumber(input.maxDailyLossPercent, 3);
  const maxNotional = toNumber(input.maxNotional, accountSize * 0.75);

  return {
    provider,
    mode,
    idea: clean(input.idea || input.topic, "Bitcoin trend setup after macro news"),
    symbol: clean(input.symbol, "BTCUSD").toUpperCase(),
    assetClass: clean(input.assetClass, "crypto"),
    timeframe: clean(input.timeframe, "swing"),
    riskStyle: clean(input.riskStyle || input.risk, "balanced"),
    direction: clean(input.direction, "auto"),
    broker: clean(input.broker, "paper-sim"),
    tradeMode: clean(input.tradeMode, mode === "live_approval" ? "live" : "paper"),
    orderType: clean(input.orderType, "market"),
    quantity: toNumber(input.quantity, 0),
    estimatedPrice,
    entryPrice: estimatedPrice,
    stopLoss,
    takeProfit,
    accountSize,
    maxRiskPercent,
    maxDailyLossPercent,
    maxNotional,
    requireHumanApproval: input.requireHumanApproval !== false,
    autoExecutePaper: input.autoExecutePaper === true || input.autoExecutePaper === "true",
    confirmation: clean(input.confirmation, ""),
    audience: clean(input.audience, "beginner traders"),
    platform: clean(input.platform, "TikTok / Reels / Shorts"),
    tone: clean(input.tone, "clear and educational"),
    notes: clean(input.notes, "")
  };
}

function detectMarket(idea, assetClass = "") {
  const lower = `${idea} ${assetClass}`.toLowerCase();

  if (/(bitcoin|btc|ethereum|eth|crypto|solana|coinbase|binance|token)/.test(lower)) {
    return {
      name: "Crypto",
      catalysts: ["ETF/news flow", "macro liquidity", "exchange flows", "funding and weekend volatility"],
      indicators: ["VWAP", "volume profile", "RSI divergence", "support/resistance"],
      volatility: "High"
    };
  }

  if (/(nvda|tesla|aapl|msft|stock|equity|earnings|nasdaq|spy|qqq|alpaca)/.test(lower)) {
    return {
      name: "Stocks",
      catalysts: ["earnings", "guidance", "sector rotation", "index trend"],
      indicators: ["relative strength", "gap levels", "moving averages", "volume confirmation"],
      volatility: "Medium-high"
    };
  }

  if (/(eurusd|gbpusd|usdjpy|forex|dollar|yen|euro|pound)/.test(lower)) {
    return {
      name: "Forex",
      catalysts: ["central-bank expectations", "inflation data", "yield spreads", "session liquidity"],
      indicators: ["session range", "liquidity sweep", "market structure", "ATR bands"],
      volatility: "Medium"
    };
  }

  return {
    name: "Multi-asset",
    catalysts: ["trend", "news catalyst", "liquidity", "risk sentiment"],
    indicators: ["support/resistance", "volume", "moving averages", "volatility bands"],
    volatility: "Medium"
  };
}

function scoreIdea(input) {
  const lower = `${input.idea} ${input.notes}`.toLowerCase();
  let score = 52;

  if (/(breakout|trend|momentum|support|pullback|retest|weekly close|daily close)/.test(lower)) score += 13;
  if (/(cpi|fed|inflation|earnings|etf|rate|guidance|report|catalyst)/.test(lower)) score += 8;
  if (/(confirmation|risk|journal|checklist|stop|invalidation|paper)/.test(lower)) score += 8;
  if (/(fomo|moon|guaranteed|all in|revenge|leverage|100x|signal)/.test(lower)) score -= 18;
  if (input.riskStyle === "conservative") score += 4;
  if (input.riskStyle === "aggressive") score -= 6;
  if (input.timeframe === "intraday") score -= 3;
  if (input.timeframe === "long-term") score += 3;

  return clamp(score, 20, 91);
}

function inferSide(input) {
  const lower = input.idea.toLowerCase();
  if (input.direction === "long") return "buy";
  if (input.direction === "short") return "sell";
  if (/(short|sell|bear|breakdown|downtrend|resistance rejection|lower high)/.test(lower)) return "sell";
  return "buy";
}

function decisionFromScore(score, input) {
  if (input.mode === "video") return "content_only";
  if (score >= 72) return "paper_trade_candidate";
  if (score >= 56) return "watchlist_wait_for_confirmation";
  return "no_trade_research_only";
}

function confidenceFromScore(score) {
  if (score >= 76) return "Medium-high";
  if (score >= 55) return "Medium";
  return "Low";
}

function calculateQuantity(input, side) {
  if (input.quantity > 0) return input.quantity;

  const riskPerUnit = side === "buy" ? input.estimatedPrice - input.stopLoss : input.stopLoss - input.estimatedPrice;
  const maxRiskAmount = input.accountSize * (input.maxRiskPercent / 100);
  const maxQuantityByRisk = riskPerUnit > 0 ? maxRiskAmount / riskPerUnit : 0;
  const maxQuantityByNotional = input.estimatedPrice > 0 ? input.maxNotional / input.estimatedPrice : 0;
  const quantity = Math.min(maxQuantityByRisk || maxQuantityByNotional, maxQuantityByNotional || maxQuantityByRisk);

  if (!Number.isFinite(quantity) || quantity <= 0) return 0;
  return Number(quantity.toFixed(quantity < 1 ? 6 : 3));
}

function buildTradeCandidate(input, side) {
  const quantity = calculateQuantity(input, side);
  const orderMode = input.mode === "live_approval" ? "live" : input.tradeMode === "live" ? "live" : "paper";

  return {
    tradeMode: orderMode,
    broker: orderMode === "paper" ? "paper-sim" : input.broker,
    symbol: input.symbol,
    assetClass: input.assetClass,
    side,
    orderType: input.orderType,
    quantity,
    entryPrice: input.estimatedPrice,
    stopLoss: input.stopLoss,
    takeProfit: input.takeProfit,
    accountSize: input.accountSize,
    maxRiskPercent: input.maxRiskPercent,
    maxDailyLossPercent: input.maxDailyLossPercent,
    maxNotional: input.maxNotional,
    requireStopLoss: true,
    requireHumanApproval: true,
    confirmation: input.confirmation
  };
}

function buildVideoPackage(input, analysis) {
  const shortForm = /short|tiktok|reels/i.test(input.platform);
  const duration = shortForm ? "35-60 seconds" : input.platform.includes("Webinar") ? "12-20 minutes" : "4-6 minutes";
  const hook = `Most ${input.audience} want a prediction on ${input.idea}. This agent starts with risk, confirmation, and invalidation first.`;

  return {
    platform: input.platform,
    tone: input.tone,
    duration,
    titleIdeas: [
      `${input.symbol}: AI agent checklist before any trade`,
      `The safer way to analyze ${input.idea}`,
      `What an AI trading agent checks before pressing buy or sell`
    ],
    hook,
    scriptBeats: [
      "Open with the market idea and remind viewers this is educational, not financial advice.",
      `Show the agent score: ${analysis.score}/100 with confidence ${analysis.confidence}.`,
      "Explain the thesis, confirmation trigger, stop-loss, and invalidation level.",
      "Show how the risk engine blocks oversized trades before execution.",
      "Close by asking viewers to paper trade, journal, and avoid hype."
    ],
    visualPrompts: [
      `Futuristic trading dashboard for ${input.symbol}, glowing risk checklist, premium dark interface, ${input.tone} tone.`,
      "Split-screen of AI agent reasoning, chart levels, stop-loss line, and paper trade journal.",
      "Vertical creator video thumbnail with bold text: CHECK RISK FIRST."
    ]
  };
}

function buildFreeRulesPlan(input, aiText = "") {
  const market = detectMarket(input.idea, input.assetClass);
  const score = scoreIdea(input);
  const side = inferSide(input);
  const decision = decisionFromScore(score, input);
  const confidence = confidenceFromScore(score);
  const tradeCandidate = ["paper_trade", "live_approval", "campaign"].includes(input.mode) ? buildTradeCandidate(input, side) : null;

  const analysis = {
    market,
    score,
    confidence,
    decision,
    side,
    thesis: `The active agent treats "${input.idea}" as a ${market.name.toLowerCase()} setup with ${market.volatility.toLowerCase()} volatility. It will not execute real trades by itself; it creates a risk-checked plan first.`,
    confirmations: [
      "Trend and market structure agree with the proposed side.",
      "Volume or volatility confirms the move instead of a weak candle only.",
      "The stop-loss is placed where the thesis is invalidated.",
      "The risk engine approves position size before any paper/live request."
    ],
    invalidation: side === "buy" ? "Long thesis fails if price accepts below the stop or breaks market structure." : "Short thesis fails if price accepts above the stop or reclaims bullish structure.",
    agentNotes: [
      `Primary catalysts to monitor: ${market.catalysts.join(", ")}.`,
      `Evidence tools: ${market.indicators.join(", ")}.`,
      input.notes ? `User instruction: ${input.notes}` : "No extra user instruction provided."
    ],
    aiText: aiText || null
  };

  return {
    analysis,
    tradeCandidate,
    video: ["video", "campaign"].includes(input.mode) ? buildVideoPackage(input, analysis) : null
  };
}

function buildOllamaPrompt(input) {
  return [
    "You are an educational AI trading and video-making agent.",
    "You must not provide financial advice or guarantee profit.",
    "Create a concise analysis with thesis, confirmation, invalidation, risk, and content ideas if relevant.",
    "Do not tell the user to place a real trade. Emphasize paper trading and human approval.",
    "",
    `Mode: ${input.mode}`,
    `Market idea: ${input.idea}`,
    `Symbol: ${input.symbol}`,
    `Asset class: ${input.assetClass}`,
    `Timeframe: ${input.timeframe}`,
    `Risk style: ${input.riskStyle}`,
    `Direction preference: ${input.direction}`,
    `Estimated price: ${input.estimatedPrice}`,
    `Stop loss: ${input.stopLoss}`,
    `Take profit: ${input.takeProfit}`,
    `Audience: ${input.audience}`,
    `Platform: ${input.platform}`,
    `Tone: ${input.tone}`,
    input.notes ? `Extra instructions: ${input.notes}` : "Extra instructions: none",
    "",
    "Return 5-8 bullet points."
  ].join("\n");
}

async function fetchWithTimeout(url, options = {}, timeoutMs = DEFAULT_OLLAMA_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function checkOllama() {
  const baseUrl = process.env.OLLAMA_BASE_URL || DEFAULT_OLLAMA_BASE_URL;
  const timeoutMs = toNumber(process.env.OLLAMA_TIMEOUT_MS, 2500);

  try {
    const response = await fetchWithTimeout(`${baseUrl}/api/tags`, { method: "GET" }, timeoutMs);
    return response.ok;
  } catch (error) {
    return false;
  }
}

async function runOllama(input) {
  const baseUrl = process.env.OLLAMA_BASE_URL || DEFAULT_OLLAMA_BASE_URL;
  const model = process.env.OLLAMA_MODEL || DEFAULT_OLLAMA_MODEL;
  const timeoutMs = toNumber(process.env.OLLAMA_TIMEOUT_MS, DEFAULT_OLLAMA_TIMEOUT_MS);

  const response = await fetchWithTimeout(
    `${baseUrl}/api/generate`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, prompt: buildOllamaPrompt(input), stream: false })
    },
    timeoutMs
  );

  if (!response.ok) {
    throw new Error(`Ollama request failed with status ${response.status}`);
  }

  const payload = await response.json();
  return clean(payload.response, "");
}

async function getAgentStatus() {
  const ollamaAvailable = await checkOllama();

  return {
    ok: true,
    providers: [
      {
        id: "free-rules",
        name: "Free Rules Agent",
        available: true,
        configured: true,
        cost: "free",
        description: "Runs without API keys using the built-in transparent rules engine."
      },
      {
        id: "ollama",
        name: "Ollama Local LLM",
        available: ollamaAvailable,
        configured: true,
        cost: "free if Ollama is installed locally",
        model: process.env.OLLAMA_MODEL || DEFAULT_OLLAMA_MODEL,
        baseUrl: process.env.OLLAMA_BASE_URL || DEFAULT_OLLAMA_BASE_URL,
        description: "Uses a local Ollama model for reasoning, then still applies the server risk engine."
      }
    ],
    activeProviderDefault: process.env.AI_AGENT_PROVIDER || "free-rules",
    liveTradingEnabled: process.env.LIVE_TRADING_ENABLED === "true",
    paperExecutionAllowed: process.env.ACTIVE_AGENT_ALLOW_PAPER_EXECUTION !== "false",
    liveExecutionAllowed: process.env.ACTIVE_AGENT_ALLOW_LIVE_EXECUTION === "true",
    requiredLiveConfirmation: LIVE_CONFIRMATION
  };
}

async function runActiveAgent(rawInput = {}) {
  const input = normalizeAgentInput(rawInput);
  const warnings = [];
  const steps = [
    "Received user goal and normalized inputs.",
    "Selected AI brain provider.",
    "Created educational market thesis.",
    "Generated risk-checked order candidate when the mode required trading.",
    "Kept live execution locked behind human approval."
  ];

  let providerUsed = "free-rules";
  let aiText = "";

  if (input.provider === "ollama") {
    try {
      aiText = await runOllama(input);
      providerUsed = "ollama";
      steps.push("Ollama returned local LLM reasoning.");
    } catch (error) {
      warnings.push(`Ollama unavailable or failed (${error.message}). Falling back to the free rules agent.`);
      providerUsed = "free-rules-fallback";
    }
  }

  const plan = buildFreeRulesPlan(input, aiText);
  let risk = null;
  let execution = null;

  if (plan.tradeCandidate) {
    risk = validateOrder(plan.tradeCandidate);

    if (input.mode === "paper_trade" || input.mode === "campaign") {
      const shouldExecute = input.autoExecutePaper && plan.analysis.decision === "paper_trade_candidate";
      const allowed = process.env.ACTIVE_AGENT_ALLOW_PAPER_EXECUTION !== "false";

      if (shouldExecute && allowed && !risk.blocked && plan.tradeCandidate.tradeMode === "paper") {
        const order = await paperBroker.placeOrder(risk.order, risk.preview);
        execution = {
          ok: true,
          mode: "paper",
          action: "paper_order_filled",
          order,
          message: "The active agent executed a paper trade only. No real broker order was sent."
        };
        steps.push("Paper order executed because auto paper execution was enabled and risk passed.");
      } else {
        execution = {
          ok: !risk.blocked,
          mode: "paper",
          action: risk.blocked ? "blocked_by_risk" : "preview_only",
          message: risk.blocked
            ? "Paper trade blocked by risk engine."
            : shouldExecute && !allowed
              ? "Paper execution is disabled by ACTIVE_AGENT_ALLOW_PAPER_EXECUTION=false."
              : "Paper trade preview created. Enable auto paper execution to simulate an order."
        };
      }
    }

    if (input.mode === "live_approval") {
      execution = {
        ok: !risk.blocked,
        mode: "live_approval_required",
        action: "preview_only",
        message: `Live order was not sent. Human approval and backend live configuration are required. Confirmation phrase: ${LIVE_CONFIRMATION}`
      };
    }
  }

  return {
    ok: true,
    providerRequested: input.provider,
    providerUsed,
    mode: input.mode,
    input: {
      idea: input.idea,
      symbol: input.symbol,
      assetClass: input.assetClass,
      timeframe: input.timeframe,
      riskStyle: input.riskStyle,
      broker: input.broker
    },
    steps,
    warnings,
    analysis: plan.analysis,
    trade: plan.tradeCandidate
      ? {
          candidate: plan.tradeCandidate,
          risk,
          execution
        }
      : null,
    video: plan.video,
    safety: {
      educationalOnly: true,
      liveExecutionByAgent: false,
      humanApprovalRequired: true,
      requiredLiveConfirmation: LIVE_CONFIRMATION
    },
    generatedAt: new Date().toISOString()
  };
}

module.exports = {
  getAgentStatus,
  normalizeAgentInput,
  runActiveAgent
};
