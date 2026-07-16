const form = document.querySelector("#agent-form");
const output = document.querySelector("#agent-output");
const outputTitle = document.querySelector("#output-title");
const copyBtn = document.querySelector("#copyBtn");
const randomizeBtn = document.querySelector("#randomizeBtn");

let lastMarkdown = "";

const samples = [
  {
    agentType: "combo",
    topic: "Ethereum ETF momentum into the weekly close",
    audience: "crypto beginners",
    risk: "balanced",
    timeframe: "swing",
    platform: "TikTok / Reels / Shorts",
    tone: "clear and educational",
    notes: "Keep it under 60 seconds and avoid hype."
  },
  {
    agentType: "trading",
    topic: "Gold pullback near support after Fed comments",
    audience: "macro swing traders",
    risk: "conservative",
    timeframe: "swing",
    platform: "YouTube explainer",
    tone: "premium and cinematic",
    notes: "Focus on confirmations before entry."
  },
  {
    agentType: "video",
    topic: "How paper trading protects new traders from revenge trades",
    audience: "new day traders",
    risk: "conservative",
    timeframe: "intraday",
    platform: "TikTok / Reels / Shorts",
    tone: "high-energy",
    notes: "Make the hook strong and practical."
  },
  {
    agentType: "combo",
    topic: "NVDA earnings gap and risk-managed options watchlist",
    audience: "stock market learners",
    risk: "aggressive",
    timeframe: "intraday",
    platform: "YouTube explainer",
    tone: "clear and educational",
    notes: "No direct buy or sell recommendation."
  }
];

const riskProfiles = {
  conservative: {
    label: "Conservative",
    riskPerTrade: "0.25% - 0.50% paper risk",
    exposure: "One idea at a time, confirmation required",
    stopRule: "Stop after 2 invalidated paper setups",
    voice: "protect capital first"
  },
  balanced: {
    label: "Balanced",
    riskPerTrade: "0.50% - 1.00% paper risk",
    exposure: "Scale only after the first target is reached",
    stopRule: "Pause after 3 poor executions or rule breaks",
    voice: "balance opportunity with controlled downside"
  },
  aggressive: {
    label: "Aggressive",
    riskPerTrade: "1.00% - 2.00% paper risk only",
    exposure: "Fast-moving setups require smaller size and hard stops",
    stopRule: "Pause immediately after one oversized loss",
    voice: "move quickly but never without a stop"
  }
};

const timeframeProfiles = {
  intraday: {
    label: "Intraday",
    confirmation: "5m/15m structure, volume expansion, and VWAP reaction",
    invalidation: "A clean break back through the latest intraday pivot",
    review: "Journal screenshots before, during, and after the session"
  },
  swing: {
    label: "Swing / 1-7 days",
    confirmation: "Daily trend, 4h pullback behavior, and close above/below the trigger level",
    invalidation: "A daily close beyond the setup invalidation zone",
    review: "Review the plan at the daily close instead of reacting candle by candle"
  },
  "long-term": {
    label: "Long-term / 1+ months",
    confirmation: "Weekly trend, macro catalyst alignment, and position-building plan",
    invalidation: "A weekly close that breaks the investment thesis",
    review: "Re-check the thesis after major news, earnings, or macro releases"
  }
};

const platformProfiles = {
  "TikTok / Reels / Shorts": {
    format: "Vertical 9:16",
    duration: "35-60 seconds",
    scenes: 6,
    cta: "Comment 'PLAN' if you want the checklist."
  },
  "YouTube explainer": {
    format: "Horizontal 16:9",
    duration: "4-6 minutes",
    scenes: 8,
    cta: "Subscribe for more risk-managed trading breakdowns."
  },
  "Webinar / course lesson": {
    format: "Slides + screen recording",
    duration: "12-20 minutes",
    scenes: 10,
    cta: "Download the worksheet and complete the paper-trade journal."
  }
};

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function clean(value, fallback) {
  const text = String(value || "").trim();
  return text || fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function detectMarket(topic) {
  const lower = topic.toLowerCase();

  if (/(bitcoin|btc|ethereum|eth|crypto|solana|sol\b)/.test(lower)) {
    return {
      name: "Crypto",
      catalysts: "exchange flows, ETF headlines, macro liquidity, and weekend volatility",
      indicators: "VWAP, volume profile, RSI divergence, funding-rate pressure",
      volatility: "High"
    };
  }

  if (/(gold|xau|silver|oil|crude|commodity)/.test(lower)) {
    return {
      name: "Commodities",
      catalysts: "US dollar strength, real yields, inventory data, and geopolitical headlines",
      indicators: "trend channel, moving averages, support/resistance, dollar index correlation",
      volatility: "Medium-high"
    };
  }

  if (/(forex|eurusd|gbpusd|usdjpy|dxy|dollar|yen|euro|pound)/.test(lower)) {
    return {
      name: "Forex",
      catalysts: "central-bank expectations, inflation data, yield spreads, and session liquidity",
      indicators: "session range, liquidity sweep, market structure, ATR bands",
      volatility: "Medium"
    };
  }

  if (/(stock|nvda|tesla|aapl|msft|earnings|nasdaq|s&p|spy|qqq|options)/.test(lower)) {
    return {
      name: "Stocks / Options",
      catalysts: "earnings, guidance, sector rotation, index trend, and options positioning",
      indicators: "relative strength, gap levels, moving averages, volume confirmation",
      volatility: "Medium-high"
    };
  }

  return {
    name: "Multi-asset",
    catalysts: "trend, news catalysts, liquidity, and risk sentiment",
    indicators: "support/resistance, volume, moving averages, and volatility bands",
    volatility: "Medium"
  };
}

function scoreSetup(topic, risk, timeframe) {
  const lower = topic.toLowerCase();
  let score = 52;

  if (/(breakout|momentum|trend|support|pullback|weekly close|daily close)/.test(lower)) score += 12;
  if (/(cpi|fed|earnings|etf|inflation|rate|report|guidance)/.test(lower)) score += 8;
  if (/(gap|options|meme|leverage|revenge|fomo|all in|moon)/.test(lower)) score -= 10;
  if (/(risk|paper|support|confirmation|checklist|journal)/.test(lower)) score += 7;
  if (risk === "conservative") score += 4;
  if (risk === "aggressive") score -= 6;
  if (timeframe === "intraday") score -= 3;
  if (timeframe === "long-term") score += 3;

  return clamp(score, 25, 88);
}

function getBias(score) {
  if (score >= 70) return "Constructive but confirmation-dependent";
  if (score >= 56) return "Neutral-to-constructive watchlist setup";
  if (score >= 44) return "Neutral; wait for cleaner evidence";
  return "Caution; focus on capital protection";
}

function getConfidence(score) {
  if (score >= 72) return "Medium-high";
  if (score >= 52) return "Medium";
  return "Low until more data confirms the idea";
}

function buildTradingPlan(data) {
  const market = detectMarket(data.topic);
  const risk = riskProfiles[data.risk];
  const timeframe = timeframeProfiles[data.timeframe];
  const score = scoreSetup(data.topic, data.risk, data.timeframe);
  const bias = getBias(score);

  return {
    market,
    score,
    bias,
    confidence: getConfidence(score),
    summary: `The agent treats "${data.topic}" as a ${market.name.toLowerCase()} research idea with ${market.volatility.toLowerCase()} volatility. The safest mode is to ${risk.voice} and only paper trade after the confirmation checklist is satisfied.`,
    checklist: [
      `Confirm the ${timeframe.label.toLowerCase()} context using ${timeframe.confirmation}.`,
      `Mark the invalidation zone first: ${timeframe.invalidation}.`,
      `Check catalysts: ${market.catalysts}.`,
      `Use indicators as evidence, not predictions: ${market.indicators}.`,
      `Write the reason for entry before the simulated order is placed.`
    ],
    riskRules: [
      `Risk per paper trade: ${risk.riskPerTrade}.`,
      `Exposure rule: ${risk.exposure}.`,
      `Stop rule: ${risk.stopRule}.`,
      "Never average down in the demo unless the original plan explicitly allows scaling.",
      "If the setup is unclear, the agent's best action is to do nothing."
    ],
    levels: [
      "Entry trigger: only after price confirms direction with volume or a clean retest.",
      "Invalidation: where your thesis is proven wrong, not where the loss feels uncomfortable.",
      "Target 1: area where partial profits or risk reduction would be logical.",
      "Target 2: trail only if momentum remains healthy and the journal rules are intact."
    ],
    journal: [
      "What did I expect to happen?",
      "What would prove this setup wrong?",
      "Did I follow the risk rule exactly?",
      `Review cadence: ${timeframe.review}.`
    ]
  };
}

function buildVideoPlan(data, tradingPlan) {
  const platform = platformProfiles[data.platform];
  const tone = data.tone;
  const topic = data.topic;
  const audience = data.audience;
  const riskLine = tradingPlan
    ? `Use the trade thesis as an educational example and repeat that it is not financial advice.`
    : `Frame the topic as a practical learning moment, not a guarantee.`;

  return {
    format: platform.format,
    duration: platform.duration,
    titleIdeas: [
      `The safer way to think about ${topic}`,
      `${topic}: a simple agent checklist`,
      `Before you trade ${topic}, watch this`
    ],
    hook: `Most ${audience} ask, "Is ${topic} going up or down?" The better question is: "What evidence would make this a valid plan?"`,
    script: [
      `Hook: ${topic} sounds exciting, but excitement is not a strategy.`,
      `Context: In this demo, the agent separates thesis, confirmation, invalidation, and risk before any paper trade.`,
      `Teaching point: ${riskLine}`,
      `Checklist: trend, catalyst, trigger, stop, target, journal. If one part is missing, the agent waits.`,
      `Close: ${platform.cta}`
    ],
    storyboard: makeStoryboard(topic, audience, platform.scenes, tone),
    promptPack: [
      `AI video prompt: ${tone} ${platform.format} scene showing a futuristic trading desk, clean charts, and risk checklist overlays for ${topic}.`,
      `Thumbnail prompt: bold title text, glowing market chart, human creator pointing at a simple three-step plan, premium dark background.`,
      `Caption prompt: turn the script into short captions with highlighted words: thesis, confirmation, invalidation, risk.`
    ],
    productionChecklist: [
      `Record in ${platform.format}; target length ${platform.duration}.`,
      "Show the checklist visually within the first 5 seconds.",
      "Add captions for every spoken line.",
      "Include a disclaimer: educational content, not financial advice.",
      "End with one clear call to action."
    ]
  };
}

function makeStoryboard(topic, audience, sceneCount, tone) {
  const baseScenes = [
    `Cold open: fast chart movement with text overlay "Don't chase ${topic}".`,
    `Creator on camera: explain the agent's goal for ${audience}.`,
    "Screen capture: show thesis, confirmation, invalidation, risk, and journal boxes.",
    "Chart visual: highlight support/resistance and mark the invalidation area first.",
    "Risk visual: animate position size shrinking when volatility rises.",
    "Agent recap: green checks for rules followed, yellow warning for missing evidence.",
    "CTA card: invite viewers to copy the checklist and paper trade only.",
    "Bonus scene: behind-the-scenes view of prompts becoming captions and B-roll.",
    "Lesson slide: three mistakes to avoid: FOMO, no stop, no journal.",
    "Closing frame: branded EPIC AI Trader Studio end screen."
  ];

  return baseScenes.slice(0, sceneCount).map((scene, index) => `Scene ${index + 1}: ${scene} Tone: ${tone}.`);
}

function toMarkdownList(items) {
  return items.map((item) => `- ${item}`).join("\n");
}

function buildMarkdown(data, tradingPlan, videoPlan) {
  const sections = [`# EPIC AI Agent Demo`, ``, `**Topic:** ${data.topic}`, `**Audience:** ${data.audience}`, `**Mode:** ${data.agentType}`, `**Generated in:** Free browser sandbox`, ``];

  if (tradingPlan) {
    sections.push(
      `## Trading Strategy Agent`,
      `**Bias:** ${tradingPlan.bias}`,
      `**Setup score:** ${tradingPlan.score}/100`,
      `**Confidence:** ${tradingPlan.confidence}`,
      ``,
      tradingPlan.summary,
      ``,
      `### Entry Checklist`,
      toMarkdownList(tradingPlan.checklist),
      ``,
      `### Risk Guardrails`,
      toMarkdownList(tradingPlan.riskRules),
      ``,
      `### Paper-Trade Levels`,
      toMarkdownList(tradingPlan.levels),
      ``,
      `### Journal Prompts`,
      toMarkdownList(tradingPlan.journal),
      ``
    );
  }

  if (videoPlan) {
    sections.push(
      `## Video Maker Agent`,
      `**Format:** ${videoPlan.format}`,
      `**Duration:** ${videoPlan.duration}`,
      ``,
      `### Title Ideas`,
      toMarkdownList(videoPlan.titleIdeas),
      ``,
      `### Hook`,
      videoPlan.hook,
      ``,
      `### Script`,
      toMarkdownList(videoPlan.script),
      ``,
      `### Storyboard`,
      toMarkdownList(videoPlan.storyboard),
      ``,
      `### AI Prompt Pack`,
      toMarkdownList(videoPlan.promptPack),
      ``,
      `### Production Checklist`,
      toMarkdownList(videoPlan.productionChecklist),
      ``
    );
  }

  sections.push(
    `---`,
    `Educational demo only. This is not financial advice, a trading signal, or a promise of profit. The free sandbox does not connect to brokerages or place trades.`
  );

  return sections.join("\n");
}

function card(title, content) {
  return `<article class="output-card"><h4>${escapeHtml(title)}</h4>${content}</article>`;
}

function htmlList(items, ordered = false) {
  const tag = ordered ? "ol" : "ul";
  return `<${tag}>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</${tag}>`;
}

function renderOutput(data, tradingPlan, videoPlan) {
  const parts = [];

  if (tradingPlan) {
    parts.push(`
      <div class="metrics" aria-label="Trading metrics">
        <div class="metric"><small>Setup score</small><strong>${tradingPlan.score}/100</strong></div>
        <div class="metric"><small>Bias</small><strong>${escapeHtml(tradingPlan.bias)}</strong></div>
        <div class="metric"><small>Confidence</small><strong>${escapeHtml(tradingPlan.confidence)}</strong></div>
      </div>
    `);

    parts.push(card("Trading agent summary", `<p>${escapeHtml(tradingPlan.summary)}</p>`));
    parts.push(card("Entry checklist", htmlList(tradingPlan.checklist, true)));
    parts.push(card("Risk guardrails", htmlList(tradingPlan.riskRules)));
    parts.push(card("Paper-trade levels", htmlList(tradingPlan.levels)));
    parts.push(card("Journal prompts", htmlList(tradingPlan.journal)));
  }

  if (videoPlan) {
    parts.push(`
      <div class="metrics" aria-label="Video metrics">
        <div class="metric"><small>Format</small><strong>${escapeHtml(videoPlan.format)}</strong></div>
        <div class="metric"><small>Length</small><strong>${escapeHtml(videoPlan.duration)}</strong></div>
        <div class="metric"><small>Tone</small><strong>${escapeHtml(data.tone)}</strong></div>
      </div>
    `);

    parts.push(card("Title ideas", htmlList(videoPlan.titleIdeas)));
    parts.push(card("Hook", `<p>${escapeHtml(videoPlan.hook)}</p>`));
    parts.push(card("Script beats", htmlList(videoPlan.script, true)));
    parts.push(card("Storyboard", htmlList(videoPlan.storyboard, true)));
    parts.push(card("AI prompt pack", htmlList(videoPlan.promptPack)));
    parts.push(card("Production checklist", htmlList(videoPlan.productionChecklist)));
  }

  if (data.notes) {
    parts.push(card("User instructions considered", `<p>${escapeHtml(data.notes)}</p>`));
  }

  parts.push(
    card(
      "Safety note",
      `<p>Educational demo only. This is not financial advice, a trading signal, or a promise of profit. The free sandbox does not connect to brokerages or place trades.</p>`
    )
  );

  output.classList.remove("empty-state");
  output.innerHTML = parts.join("");
  outputTitle.textContent = `${data.agentType === "combo" ? "Combined" : data.agentType === "video" ? "Video" : "Trading"} agent result`;
}

function getFormData() {
  const formData = new FormData(form);
  return {
    agentType: clean(formData.get("agentType"), "combo"),
    topic: clean(formData.get("topic"), "Bitcoin breakout after CPI report"),
    audience: clean(formData.get("audience"), "beginner traders"),
    risk: clean(formData.get("risk"), "balanced"),
    timeframe: clean(formData.get("timeframe"), "swing"),
    platform: clean(formData.get("platform"), "TikTok / Reels / Shorts"),
    tone: clean(formData.get("tone"), "clear and educational"),
    notes: clean(formData.get("notes"), "")
  };
}

function runAgent(data) {
  const needsTrading = data.agentType === "trading" || data.agentType === "combo";
  const needsVideo = data.agentType === "video" || data.agentType === "combo";
  const tradingPlan = needsTrading ? buildTradingPlan(data) : null;
  const videoPlan = needsVideo ? buildVideoPlan(data, tradingPlan) : null;

  lastMarkdown = buildMarkdown(data, tradingPlan, videoPlan);
  renderOutput(data, tradingPlan, videoPlan);
  localStorage.setItem("epicAgentLastRun", JSON.stringify(data));
}

function showToast(message) {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.appendChild(toast);
  window.setTimeout(() => toast.remove(), 2600);
}

async function copyMarkdown() {
  if (!lastMarkdown) {
    showToast("Generate a demo first");
    return;
  }

  try {
    await navigator.clipboard.writeText(lastMarkdown);
    showToast("Markdown copied");
  } catch (error) {
    const textArea = document.createElement("textarea");
    textArea.value = lastMarkdown;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand("copy");
    textArea.remove();
    showToast("Markdown copied");
  }
}

function randomizeSample() {
  const sample = samples[Math.floor(Math.random() * samples.length)];
  Object.entries(sample).forEach(([key, value]) => {
    const field = form.elements[key];
    if (field) field.value = value;
  });
  runAgent(getFormData());
}

function restoreLastRun() {
  const saved = localStorage.getItem("epicAgentLastRun");
  if (!saved) return;

  try {
    const data = JSON.parse(saved);
    Object.entries(data).forEach(([key, value]) => {
      const field = form.elements[key];
      if (field && value) field.value = value;
    });
  } catch (error) {
    localStorage.removeItem("epicAgentLastRun");
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  runAgent(getFormData());
});

copyBtn.addEventListener("click", copyMarkdown);
randomizeBtn.addEventListener("click", randomizeSample);
restoreLastRun();

// --- Paper/live trading desk -------------------------------------------------
const tradeForm = document.querySelector("#trade-form");
const tradeOutput = document.querySelector("#trade-output");
const tradeOutputTitle = document.querySelector("#trade-output-title");
const apiStatus = document.querySelector("#api-status");
const executeOrderBtn = document.querySelector("#executeOrderBtn");
const refreshTradesBtn = document.querySelector("#refreshTradesBtn");
const tradeHistory = document.querySelector("#trade-history");
const tradeModeSelect = document.querySelector("#tradeMode");
const brokerSelect = document.querySelector("#broker");

const LIVE_CONFIRMATION = "CONFIRM LIVE TRADE";
const LOCAL_TRADES_KEY = "epicPaperTrades";
let apiAvailable = false;
let lastTradePreview = null;
let lastTradeData = null;

function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function formatCurrency(value) {
  if (!Number.isFinite(Number(value))) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: Math.abs(value) < 10 ? 4 : 2
  }).format(Number(value));
}

function formatNumber(value) {
  if (!Number.isFinite(Number(value))) return "—";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 6 }).format(Number(value));
}

function setApiStatus(kind, message) {
  if (!apiStatus) return;
  apiStatus.className = `status-pill ${kind}`;
  apiStatus.textContent = message;
}

async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });

  const payload = await response.json().catch(() => ({ message: "Invalid API response" }));
  if (!response.ok) {
    const error = new Error(payload.message || `Request failed with ${response.status}`);
    error.payload = payload;
    throw error;
  }

  return payload;
}

async function checkApiHealth() {
  if (!tradeForm) return;

  try {
    const health = await apiRequest("/api/health", { method: "GET" });
    apiAvailable = true;

    if (health.liveTradingEnabled) {
      setApiStatus("warning", "API online • live flag on");
    } else {
      setApiStatus("success", "API online • paper safe");
    }
  } catch (error) {
    apiAvailable = false;
    setApiStatus("warning", "Static free mode");
  }

  updateTradeModeUi();
  loadTrades();
}

function getTradeData() {
  const formData = new FormData(tradeForm);

  return {
    tradeMode: clean(formData.get("tradeMode"), "paper"),
    broker: clean(formData.get("broker"), "paper-sim"),
    symbol: clean(formData.get("symbol"), "BTCUSD").toUpperCase(),
    assetClass: clean(formData.get("assetClass"), "crypto"),
    side: clean(formData.get("side"), "buy"),
    orderType: clean(formData.get("orderType"), "market"),
    quantity: toNumber(formData.get("quantity")),
    entryPrice: toNumber(formData.get("entryPrice")),
    stopLoss: toNumber(formData.get("stopLoss")),
    takeProfit: toNumber(formData.get("takeProfit")),
    accountSize: toNumber(formData.get("accountSize"), 10000),
    maxRiskPercent: toNumber(formData.get("maxRiskPercent"), 1),
    maxDailyLossPercent: toNumber(formData.get("maxDailyLossPercent"), 3),
    maxNotional: toNumber(formData.get("maxNotional"), 7500),
    requireStopLoss: formData.has("requireStopLoss"),
    requireHumanApproval: formData.has("requireHumanApproval"),
    confirmation: clean(formData.get("confirmation"), "")
  };
}

function buildLocalOrderPreview(data) {
  const errors = [];
  const warnings = [];
  const symbolPattern = /^[A-Z0-9._/-]{1,20}$/;
  const hasStopLoss = Number.isFinite(data.stopLoss) && data.stopLoss > 0;
  const hasTakeProfit = Number.isFinite(data.takeProfit) && data.takeProfit > 0;

  if (!symbolPattern.test(data.symbol)) errors.push("Symbol is required and can only contain letters, numbers, dot, dash, slash, or underscore.");
  if (data.quantity <= 0) errors.push("Quantity must be greater than zero.");
  if (data.entryPrice <= 0) errors.push("Estimated / limit price must be greater than zero.");
  if (data.accountSize <= 0) errors.push("Account size must be greater than zero.");
  if (data.maxRiskPercent <= 0) errors.push("Max risk per trade must be greater than zero.");
  if (data.maxDailyLossPercent <= 0) warnings.push("Daily loss limit is set to zero or below; this would stop all new trades in production.");
  if (data.maxNotional <= 0) errors.push("Max notional value must be greater than zero.");

  if (data.requireStopLoss && !hasStopLoss) {
    errors.push("Stop-loss is required by your risk settings.");
  }

  let riskPerUnit = null;
  let rewardPerUnit = null;

  if (hasStopLoss && data.entryPrice > 0) {
    riskPerUnit = data.side === "buy" ? data.entryPrice - data.stopLoss : data.stopLoss - data.entryPrice;
    if (riskPerUnit <= 0) {
      errors.push(data.side === "buy" ? "For long trades, stop-loss must be below entry." : "For short trades, stop-loss must be above entry.");
    }
  } else {
    warnings.push("No stop-loss provided; risk amount cannot be fully measured.");
  }

  if (hasTakeProfit && data.entryPrice > 0) {
    rewardPerUnit = data.side === "buy" ? data.takeProfit - data.entryPrice : data.entryPrice - data.takeProfit;
    if (rewardPerUnit <= 0) {
      warnings.push(data.side === "buy" ? "For long trades, take-profit is usually above entry." : "For short trades, take-profit is usually below entry.");
    }
  }

  const notional = data.quantity * data.entryPrice;
  const riskAmount = riskPerUnit && riskPerUnit > 0 ? riskPerUnit * data.quantity : null;
  const rewardAmount = rewardPerUnit && rewardPerUnit > 0 ? rewardPerUnit * data.quantity : null;
  const maxRiskAmount = data.accountSize * (data.maxRiskPercent / 100);
  const dailyLossLimitAmount = data.accountSize * (data.maxDailyLossPercent / 100);
  const rewardRiskRatio = riskAmount && rewardAmount ? rewardAmount / riskAmount : null;

  if (notional > data.maxNotional) {
    errors.push(`Notional value ${formatCurrency(notional)} exceeds max notional ${formatCurrency(data.maxNotional)}.`);
  }

  if (riskAmount !== null && riskAmount > maxRiskAmount) {
    errors.push(`Trade risk ${formatCurrency(riskAmount)} exceeds allowed risk ${formatCurrency(maxRiskAmount)}.`);
  }

  if (riskAmount !== null && riskAmount > dailyLossLimitAmount) {
    errors.push(`Trade risk ${formatCurrency(riskAmount)} exceeds daily loss limit ${formatCurrency(dailyLossLimitAmount)}.`);
  }

  if (rewardRiskRatio !== null && rewardRiskRatio < 1) {
    warnings.push("Reward-to-risk ratio is below 1.0; review whether the setup is worth taking.");
  }

  if (data.tradeMode === "live") {
    warnings.push("Live execution is locked by default. Backend credentials, broker adapter, and human confirmation are required.");
    if (data.requireHumanApproval && data.confirmation !== LIVE_CONFIRMATION) {
      warnings.push(`Human approval phrase required for live mode: ${LIVE_CONFIRMATION}`);
    }
  }

  const sideLabel = data.side === "buy" ? "BUY / LONG" : "SELL / SHORT";
  const modeLabel = data.tradeMode === "paper" ? "Paper simulator" : "Live preview locked";

  return {
    ok: errors.length === 0,
    blocked: errors.length > 0,
    source: apiAvailable ? "browser fallback" : "local browser",
    errors,
    warnings,
    preview: {
      id: `local-${Date.now()}`,
      summary: `${modeLabel}: ${sideLabel} ${formatNumber(data.quantity)} ${data.symbol} @ ${formatCurrency(data.entryPrice)}`,
      symbol: data.symbol,
      side: data.side,
      orderType: data.orderType,
      broker: data.broker,
      mode: data.tradeMode,
      notional,
      riskAmount,
      maxRiskAmount,
      dailyLossLimitAmount,
      rewardAmount,
      rewardRiskRatio
    }
  };
}

async function previewTrade(event) {
  if (event) event.preventDefault();
  const data = getTradeData();
  lastTradeData = data;

  try {
    if (apiAvailable) {
      const result = await apiRequest("/api/order/preview", {
        method: "POST",
        body: JSON.stringify(data)
      });
      lastTradePreview = result;
      renderTradePreview(result);
      return result;
    }
  } catch (error) {
    setApiStatus("warning", "API fallback");
    apiAvailable = false;
  }

  const result = buildLocalOrderPreview(data);
  lastTradePreview = result;
  renderTradePreview(result);
  return result;
}

function renderTradePreview(result) {
  if (!tradeOutput || !tradeOutputTitle || !executeOrderBtn) return;

  const preview = result.preview || {};
  const errors = result.errors || result.risk?.errors || [];
  const warnings = result.warnings || result.risk?.warnings || [];
  const blocked = Boolean(result.blocked || errors.length);
  const mode = lastTradeData?.tradeMode || preview.mode || "paper";

  tradeOutput.classList.remove("empty-state");
  tradeOutputTitle.textContent = blocked ? "Order blocked by risk engine" : "Order preview approved";
  executeOrderBtn.disabled = blocked;
  executeOrderBtn.textContent = mode === "live" ? "Request live execution" : "Execute paper trade";

  const riskValue = preview.riskAmount === null || preview.riskAmount === undefined ? "Not measurable" : formatCurrency(preview.riskAmount);
  const rrValue = preview.rewardRiskRatio ? `${preview.rewardRiskRatio.toFixed(2)}R` : "—";

  const alertItems = [
    ...errors.map((message) => `<li class="blocked">${escapeHtml(message)}</li>`),
    ...warnings.map((message) => `<li>${escapeHtml(message)}</li>`)
  ];

  tradeOutput.innerHTML = `
    <div class="preview-summary">
      <div class="metric"><small>Order</small><strong>${escapeHtml(preview.summary || "Preview")}</strong></div>
      <div class="metric"><small>Broker</small><strong>${escapeHtml(preview.broker || lastTradeData?.broker || "paper-sim")}</strong></div>
      <div class="metric"><small>Notional</small><strong>${formatCurrency(preview.notional || 0)}</strong></div>
      <div class="metric"><small>Risk</small><strong>${riskValue}</strong></div>
      <div class="metric"><small>Max allowed risk</small><strong>${formatCurrency(preview.maxRiskAmount || 0)}</strong></div>
      <div class="metric"><small>Reward / risk</small><strong>${escapeHtml(rrValue)}</strong></div>
    </div>
    ${card("Risk engine decision", `<p>${blocked ? "Blocked. Fix the items below before any execution." : "Approved for paper execution. Live execution still requires backend configuration and confirmation."}</p>`)}
    ${alertItems.length ? card("Alerts", `<ul class="alert-list">${alertItems.join("")}</ul>`) : card("Alerts", "<p>No blocking alerts. Continue to paper execution only if this matches your plan.</p>")}
    ${card("Execution safety", "<p>Paper trading is simulated. Live trading cannot run from static frontend code and must be handled by the backend broker adapter with server-side credentials.</p>")}
  `;
}

function getLocalTrades() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_TRADES_KEY) || "[]");
  } catch (error) {
    localStorage.removeItem(LOCAL_TRADES_KEY);
    return [];
  }
}

function saveLocalTrades(trades) {
  localStorage.setItem(LOCAL_TRADES_KEY, JSON.stringify(trades.slice(0, 25)));
}

function createLocalPaperOrder(data, preview) {
  const order = {
    id: `PAPER-${Date.now()}`,
    mode: "paper",
    broker: "Local Paper Simulator",
    status: "FILLED",
    symbol: data.symbol,
    side: data.side,
    orderType: data.orderType,
    quantity: data.quantity,
    averageFillPrice: data.entryPrice,
    notional: data.quantity * data.entryPrice,
    stopLoss: data.stopLoss || null,
    takeProfit: data.takeProfit || null,
    riskAmount: preview.preview?.riskAmount || null,
    submittedAt: new Date().toISOString()
  };

  const trades = getLocalTrades();
  trades.unshift(order);
  saveLocalTrades(trades);
  return order;
}

async function executeOrder() {
  if (!tradeForm) return;

  if (!lastTradePreview || !lastTradeData) {
    await previewTrade();
  }

  const data = getTradeData();
  lastTradeData = data;

  try {
    if (apiAvailable) {
      const result = await apiRequest("/api/order/execute", {
        method: "POST",
        body: JSON.stringify(data)
      });
      renderExecutionResult(result);
      loadTrades();
      return;
    }

    if (data.tradeMode === "live") {
      renderTradeError("Live trading is not available in static mode.", [
        "Run the Node backend with `npm start`.",
        "Connect a real broker adapter on the server.",
        "Keep credentials in environment variables only."
      ]);
      return;
    }

    if (lastTradePreview?.blocked) {
      renderTradePreview(lastTradePreview);
      return;
    }

    const order = createLocalPaperOrder(data, lastTradePreview);
    renderExecutionResult({ ok: true, mode: "paper", order, message: "Local paper order filled in the browser simulator." });
    loadTrades();
  } catch (error) {
    renderTradeError(error.message, error.payload?.details || error.payload?.errors || []);
  }
}

function renderExecutionResult(result) {
  if (!tradeOutput || !tradeOutputTitle) return;
  const order = result.order || {};

  tradeOutput.classList.remove("empty-state");
  tradeOutputTitle.textContent = result.mode === "live" ? "Live execution response" : "Paper order executed";
  tradeOutput.innerHTML = `
    ${card("Execution result", `<p>${escapeHtml(result.message || "Order response received.")}</p>`)}
    <div class="preview-summary">
      <div class="metric"><small>Status</small><strong>${escapeHtml(order.status || "RECEIVED")}</strong></div>
      <div class="metric"><small>Order ID</small><strong>${escapeHtml(order.id || "—")}</strong></div>
      <div class="metric"><small>Symbol</small><strong>${escapeHtml(order.symbol || "—")}</strong></div>
      <div class="metric"><small>Filled price</small><strong>${formatCurrency(order.averageFillPrice || order.entryPrice || 0)}</strong></div>
    </div>
    ${card("Next step", "<p>Journal the reason for the trade, screenshot the setup, and review whether the agent plan was followed.</p>")}
  `;
}

function renderTradeError(message, details = []) {
  if (!tradeOutput || !tradeOutputTitle) return;
  const detailItems = Array.isArray(details) ? details : [String(details)];
  tradeOutput.classList.remove("empty-state");
  tradeOutputTitle.textContent = "Execution blocked";
  tradeOutput.innerHTML = `
    ${card("Blocked", `<p>${escapeHtml(message || "Execution blocked by safety settings.")}</p>`)}
    ${detailItems.length ? card("Details", `<ul class="alert-list">${detailItems.map((item) => `<li class="blocked">${escapeHtml(item)}</li>`).join("")}</ul>`) : ""}
  `;
}

async function loadTrades() {
  if (!tradeHistory) return;

  try {
    if (apiAvailable) {
      const result = await apiRequest("/api/trades", { method: "GET" });
      renderTrades(result.trades || []);
      return;
    }
  } catch (error) {
    apiAvailable = false;
    setApiStatus("warning", "Static free mode");
  }

  renderTrades(getLocalTrades());
}

function renderTrades(trades) {
  if (!tradeHistory) return;

  if (!trades.length) {
    tradeHistory.className = "trade-history empty-history";
    tradeHistory.textContent = "No paper trades yet.";
    return;
  }

  tradeHistory.className = "trade-history";
  tradeHistory.innerHTML = trades
    .slice(0, 8)
    .map((trade) => {
      const date = trade.submittedAt ? new Date(trade.submittedAt).toLocaleString() : "Just now";
      const side = String(trade.side || "").toUpperCase();
      return `
        <div class="trade-row">
          <div>
            <strong>${escapeHtml(side)} ${escapeHtml(String(trade.quantity ?? "—"))} ${escapeHtml(trade.symbol || "—")}</strong>
            <small>${escapeHtml(trade.broker || "Paper Simulator")} • ${escapeHtml(date)} • ${formatCurrency(trade.averageFillPrice || trade.entryPrice || 0)}</small>
          </div>
          <span class="trade-status">${escapeHtml(trade.status || "FILLED")}</span>
        </div>
      `;
    })
    .join("");
}

function updateTradeModeUi() {
  if (!tradeModeSelect || !brokerSelect || !executeOrderBtn) return;
  const mode = tradeModeSelect.value;

  if (mode === "paper") {
    brokerSelect.value = "paper-sim";
    executeOrderBtn.textContent = "Execute paper trade";
  } else {
    if (brokerSelect.value === "paper-sim") brokerSelect.value = "alpaca";
    executeOrderBtn.textContent = "Request live execution";
  }

  lastTradePreview = null;
  executeOrderBtn.disabled = true;
}

function invalidateTradePreview() {
  lastTradePreview = null;
  if (executeOrderBtn) executeOrderBtn.disabled = true;
}

if (tradeForm) {
  tradeForm.addEventListener("submit", previewTrade);
  tradeForm.addEventListener("input", invalidateTradePreview);
  tradeForm.addEventListener("change", invalidateTradePreview);
  executeOrderBtn.addEventListener("click", executeOrder);
  refreshTradesBtn.addEventListener("click", loadTrades);
  tradeModeSelect.addEventListener("change", updateTradeModeUi);
  checkApiHealth();
}

// --- Active AI agent runner --------------------------------------------------
const activeAgentForm = document.querySelector("#active-agent-form");
const activeAgentOutput = document.querySelector("#active-agent-output");
const activeAgentOutputTitle = document.querySelector("#active-agent-output-title");
const agentStatus = document.querySelector("#agent-status");
const activeAgentSampleBtn = document.querySelector("#activeAgentSampleBtn");
const copyAgentJsonBtn = document.querySelector("#copyAgentJsonBtn");

let activeAgentApiAvailable = false;
let lastActiveAgentJson = "";

const activeAgentSamples = [
  {
    provider: "free-rules",
    mode: "campaign",
    idea: "Bitcoin breakout retest after CPI, create a safe paper-trade plan and short video angle",
    symbol: "BTCUSD",
    assetClass: "crypto",
    direction: "auto",
    timeframe: "swing",
    riskStyle: "balanced",
    broker: "binance",
    estimatedPrice: "65000",
    stopLoss: "63000",
    takeProfit: "69000",
    quantity: "0",
    accountSize: "10000",
    maxRiskPercent: "1",
    maxNotional: "7500",
    audience: "beginner crypto traders",
    platform: "TikTok / Reels / Shorts",
    notes: "Avoid hype. Paper trade only after confirmation."
  },
  {
    provider: "ollama",
    mode: "research",
    idea: "NVDA earnings gap continuation with strict invalidation and no live execution",
    symbol: "NVDA",
    assetClass: "stocks",
    direction: "auto",
    timeframe: "intraday",
    riskStyle: "conservative",
    broker: "alpaca",
    estimatedPrice: "125",
    stopLoss: "121",
    takeProfit: "133",
    quantity: "0",
    accountSize: "10000",
    maxRiskPercent: "0.5",
    maxNotional: "5000",
    audience: "stock market learners",
    platform: "YouTube explainer",
    notes: "Explain what would invalidate the thesis."
  },
  {
    provider: "free-rules",
    mode: "paper_trade",
    idea: "Ethereum support retest with confirmation checklist and journal prompt",
    symbol: "ETHUSD",
    assetClass: "crypto",
    direction: "long",
    timeframe: "swing",
    riskStyle: "balanced",
    broker: "coinbase",
    estimatedPrice: "3300",
    stopLoss: "3200",
    takeProfit: "3550",
    quantity: "0",
    accountSize: "10000",
    maxRiskPercent: "1",
    maxNotional: "5000",
    audience: "beginner traders",
    platform: "TikTok / Reels / Shorts",
    notes: "Auto paper execution can be enabled after reviewing the preview."
  }
];

function setAgentStatus(kind, message) {
  if (!agentStatus) return;
  agentStatus.className = `status-pill ${kind}`;
  agentStatus.textContent = message;
}

async function checkActiveAgentStatus() {
  if (!activeAgentForm) return;

  try {
    const status = await apiRequest("/api/agent/status", { method: "GET" });
    activeAgentApiAvailable = true;
    const ollama = (status.providers || []).find((provider) => provider.id === "ollama");
    setAgentStatus(ollama?.available ? "success" : "warning", ollama?.available ? "API + Ollama ready" : "API + free rules ready");
  } catch (error) {
    activeAgentApiAvailable = false;
    setAgentStatus("warning", "Static free rules");
  }
}

function getActiveAgentData() {
  const formData = new FormData(activeAgentForm);

  return {
    provider: clean(formData.get("provider"), "free-rules"),
    mode: clean(formData.get("mode"), "research"),
    idea: clean(formData.get("idea"), "Bitcoin trend setup after macro news"),
    symbol: clean(formData.get("symbol"), "BTCUSD").toUpperCase(),
    assetClass: clean(formData.get("assetClass"), "crypto"),
    direction: clean(formData.get("direction"), "auto"),
    timeframe: clean(formData.get("timeframe"), "swing"),
    riskStyle: clean(formData.get("riskStyle"), "balanced"),
    broker: clean(formData.get("broker"), "binance"),
    estimatedPrice: toNumber(formData.get("estimatedPrice"), 65000),
    stopLoss: toNumber(formData.get("stopLoss"), 63000),
    takeProfit: toNumber(formData.get("takeProfit"), 69000),
    quantity: toNumber(formData.get("quantity"), 0),
    accountSize: toNumber(formData.get("accountSize"), 10000),
    maxRiskPercent: toNumber(formData.get("maxRiskPercent"), 1),
    maxDailyLossPercent: 3,
    maxNotional: toNumber(formData.get("maxNotional"), 7500),
    audience: clean(formData.get("audience"), "beginner traders"),
    platform: clean(formData.get("platform"), "TikTok / Reels / Shorts"),
    notes: clean(formData.get("notes"), ""),
    autoExecutePaper: formData.has("autoExecutePaper"),
    requireHumanApproval: formData.has("requireHumanApproval")
  };
}

function buildStaticActiveAgentResult(data) {
  const agentType = data.mode === "video" ? "video" : data.mode === "campaign" ? "combo" : "trading";
  const topicData = {
    agentType,
    topic: data.idea,
    audience: data.audience,
    risk: data.riskStyle,
    timeframe: data.timeframe,
    platform: data.platform,
    tone: "clear and educational",
    notes: data.notes
  };
  const tradingPlan = agentType !== "video" ? buildTradingPlan(topicData) : null;
  const videoPlan = agentType !== "trading" ? buildVideoPlan(topicData, tradingPlan) : null;
  const side = data.direction === "short" ? "sell" : "buy";
  const quantity = data.quantity || Math.min(
    data.maxNotional / data.estimatedPrice,
    (data.accountSize * (data.maxRiskPercent / 100)) / Math.max(1, Math.abs(data.estimatedPrice - data.stopLoss))
  );

  const candidate = tradingPlan
    ? {
        tradeMode: data.mode === "live_approval" ? "live" : "paper",
        broker: data.mode === "live_approval" ? data.broker : "paper-sim",
        symbol: data.symbol,
        assetClass: data.assetClass,
        side,
        orderType: "market",
        quantity: Number(quantity.toFixed(quantity < 1 ? 6 : 3)),
        entryPrice: data.estimatedPrice,
        stopLoss: data.stopLoss,
        takeProfit: data.takeProfit,
        accountSize: data.accountSize,
        maxRiskPercent: data.maxRiskPercent,
        maxDailyLossPercent: 3,
        maxNotional: data.maxNotional,
        requireStopLoss: true,
        requireHumanApproval: true,
        confirmation: ""
      }
    : null;
  const risk = candidate ? buildLocalOrderPreview(candidate) : null;

  return {
    ok: true,
    providerRequested: data.provider,
    providerUsed: "static-free-rules",
    mode: data.mode,
    steps: [
      "Static fallback received the mission.",
      "Generated an educational plan using browser rules.",
      "Created a risk preview when the mode required trading.",
      "Did not execute any paper or live broker order from static mode."
    ],
    warnings: ["Backend API is not running, so this is a local browser fallback."],
    analysis: tradingPlan
      ? {
          market: tradingPlan.market,
          score: tradingPlan.score,
          confidence: tradingPlan.confidence,
          decision: tradingPlan.score >= 72 ? "paper_trade_candidate" : "watchlist_wait_for_confirmation",
          side,
          thesis: tradingPlan.summary,
          confirmations: tradingPlan.checklist,
          invalidation: tradingPlan.levels[1],
          agentNotes: tradingPlan.riskRules
        }
      : {
          score: 70,
          confidence: "Medium",
          decision: "content_only",
          side: "none",
          thesis: `Create educational content for ${data.idea}.`,
          confirmations: [],
          invalidation: "No trade candidate in video-only mode.",
          agentNotes: []
        },
    trade: candidate ? { candidate, risk, execution: { action: "static_preview_only", message: "Run npm start to enable backend paper execution." } } : null,
    video: videoPlan
      ? {
          platform: data.platform,
          tone: "clear and educational",
          duration: videoPlan.duration,
          titleIdeas: videoPlan.titleIdeas,
          hook: videoPlan.hook,
          scriptBeats: videoPlan.script,
          visualPrompts: videoPlan.promptPack
        }
      : null,
    safety: {
      educationalOnly: true,
      liveExecutionByAgent: false,
      humanApprovalRequired: true
    },
    generatedAt: new Date().toISOString()
  };
}

async function runActiveAgentUi(event) {
  if (event) event.preventDefault();
  const data = getActiveAgentData();

  activeAgentOutput.classList.remove("empty-state");
  activeAgentOutputTitle.textContent = "Agent is running…";
  activeAgentOutput.innerHTML = card("Active run", "<p>The agent is analyzing the mission, checking risk, and preparing output.</p>");

  try {
    const result = await apiRequest("/api/agent/run", { method: "POST", body: JSON.stringify(data) });
    activeAgentApiAvailable = true;

    lastActiveAgentJson = JSON.stringify(result, null, 2);
    renderActiveAgentResult(result);
    if (result.trade?.execution?.action === "paper_order_filled") loadTrades();
  } catch (error) {
    const fallback = buildStaticActiveAgentResult(data);
    fallback.warnings.unshift(`Backend agent failed: ${error.message}. Displaying static fallback.`);
    lastActiveAgentJson = JSON.stringify(fallback, null, 2);
    renderActiveAgentResult(fallback);
  }
}

function renderActiveAgentResult(result) {
  if (!activeAgentOutput || !activeAgentOutputTitle) return;
  const analysis = result.analysis || {};
  const trade = result.trade || null;
  const video = result.video || null;
  const warnings = result.warnings || [];

  activeAgentOutput.classList.remove("empty-state");
  activeAgentOutputTitle.textContent = `${escapeHtml(result.providerUsed || "Agent")} run complete`;

  const blocks = [];
  blocks.push(`
    <div class="metrics">
      <div class="metric"><small>Provider</small><strong>${escapeHtml(result.providerUsed || "free-rules")}</strong></div>
      <div class="metric"><small>Mode</small><strong>${escapeHtml(result.mode || "research")}</strong></div>
      <div class="metric"><small>Decision</small><strong>${escapeHtml(analysis.decision || "research")}</strong></div>
    </div>
  `);

  blocks.push(card("Agent steps", `<ul class="agent-step-list">${(result.steps || []).map((step) => `<li>${escapeHtml(step)}</li>`).join("")}</ul>`));

  if (warnings.length) {
    blocks.push(card("Warnings", `<ul class="alert-list">${warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join("")}</ul>`));
  }

  blocks.push(card("Market analysis", `
    <p>${escapeHtml(analysis.thesis || "No thesis generated.")}</p>
    <div class="preview-summary" style="margin-top: 1rem;">
      <div class="metric"><small>Score</small><strong>${escapeHtml(String(analysis.score ?? "—"))}/100</strong></div>
      <div class="metric"><small>Confidence</small><strong>${escapeHtml(analysis.confidence || "—")}</strong></div>
      <div class="metric"><small>Side</small><strong>${escapeHtml(String(analysis.side || "—").toUpperCase())}</strong></div>
      <div class="metric"><small>Volatility</small><strong>${escapeHtml(analysis.market?.volatility || "—")}</strong></div>
    </div>
  `));

  if (analysis.confirmations?.length) {
    blocks.push(card("Confirmation checklist", htmlList(analysis.confirmations, true)));
  }

  if (analysis.agentNotes?.length) {
    blocks.push(card("Agent notes", htmlList(analysis.agentNotes)));
  }

  if (analysis.aiText) {
    blocks.push(card("Local LLM reasoning", `<p class="ai-text-block">${escapeHtml(analysis.aiText)}</p>`));
  }

  if (trade) {
    const preview = trade.risk?.preview || trade.risk?.preview?.preview || {};
    const errors = trade.risk?.errors || [];
    const riskWarnings = trade.risk?.warnings || [];
    const execution = trade.execution || {};
    blocks.push(card("Trade candidate", `
      <div class="preview-summary">
        <div class="metric"><small>Order</small><strong>${escapeHtml(preview.summary || `${trade.candidate?.side || ""} ${trade.candidate?.symbol || ""}`)}</strong></div>
        <div class="metric"><small>Risk decision</small><strong>${trade.risk?.blocked ? "Blocked" : "Passed"}</strong></div>
        <div class="metric"><small>Notional</small><strong>${formatCurrency(preview.notional || 0)}</strong></div>
        <div class="metric"><small>Risk</small><strong>${preview.riskAmount === null || preview.riskAmount === undefined ? "—" : formatCurrency(preview.riskAmount)}</strong></div>
      </div>
    `));

    if (errors.length || riskWarnings.length) {
      blocks.push(card("Risk alerts", `<ul class="alert-list">${errors.map((item) => `<li class="blocked">${escapeHtml(item)}</li>`).join("")}${riskWarnings.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`));
    }

    blocks.push(card("Execution status", `<p>${escapeHtml(execution.message || execution.action || "Preview only.")}</p>`));
  }

  if (video) {
    blocks.push(card("Video package", `
      <p><strong>${escapeHtml(video.platform || "Video")}</strong> • ${escapeHtml(video.duration || "")}</p>
      <p>${escapeHtml(video.hook || "")}</p>
    `));
    if (video.titleIdeas?.length) blocks.push(card("Video title ideas", htmlList(video.titleIdeas)));
    if (video.scriptBeats?.length) blocks.push(card("Script beats", htmlList(video.scriptBeats, true)));
    if (video.visualPrompts?.length) blocks.push(card("Visual prompts", htmlList(video.visualPrompts)));
  }

  blocks.push(card("Safety", "<p>Educational output only. The agent does not execute live trades by itself. Use paper mode first and require human approval for live broker requests.</p>"));
  activeAgentOutput.innerHTML = blocks.join("");
}

function loadActiveAgentSample() {
  const sample = activeAgentSamples[Math.floor(Math.random() * activeAgentSamples.length)];
  Object.entries(sample).forEach(([key, value]) => {
    const field = activeAgentForm.elements[key];
    if (field) field.value = value;
  });
}

async function copyActiveAgentJson() {
  if (!lastActiveAgentJson) {
    showToast("Run the active agent first");
    return;
  }

  try {
    await navigator.clipboard.writeText(lastActiveAgentJson);
    showToast("Agent JSON copied");
  } catch (error) {
    const textArea = document.createElement("textarea");
    textArea.value = lastActiveAgentJson;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand("copy");
    textArea.remove();
    showToast("Agent JSON copied");
  }
}

if (activeAgentForm) {
  activeAgentForm.addEventListener("submit", runActiveAgentUi);
  activeAgentSampleBtn.addEventListener("click", loadActiveAgentSample);
  copyAgentJsonBtn.addEventListener("click", copyActiveAgentJson);
  checkActiveAgentStatus();
}
