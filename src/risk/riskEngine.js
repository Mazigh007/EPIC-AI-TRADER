const LIVE_CONFIRMATION = "CONFIRM LIVE TRADE";

function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function money(value) {
  if (!Number.isFinite(Number(value))) return "$0.00";
  return `$${Number(value).toLocaleString("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`;
}

function normalizeOrder(input = {}) {
  const symbol = String(input.symbol || "BTCUSD").trim().toUpperCase();
  const mode = String(input.tradeMode || input.mode || "paper").toLowerCase() === "live" ? "live" : "paper";
  const side = String(input.side || "buy").toLowerCase() === "sell" ? "sell" : "buy";
  const orderType = String(input.orderType || "market").toLowerCase() === "limit" ? "limit" : "market";

  return {
    mode,
    tradeMode: mode,
    broker: String(input.broker || (mode === "paper" ? "paper-sim" : "live-placeholder")).trim(),
    symbol,
    assetClass: String(input.assetClass || "crypto").trim().toLowerCase(),
    side,
    orderType,
    quantity: toNumber(input.quantity),
    entryPrice: toNumber(input.entryPrice || input.limitPrice || input.estimatedPrice),
    stopLoss: toNumber(input.stopLoss),
    takeProfit: toNumber(input.takeProfit),
    accountSize: toNumber(input.accountSize, 10000),
    maxRiskPercent: toNumber(input.maxRiskPercent, 1),
    maxDailyLossPercent: toNumber(input.maxDailyLossPercent, 3),
    maxNotional: toNumber(input.maxNotional, 7500),
    requireStopLoss: input.requireStopLoss !== false,
    requireHumanApproval: input.requireHumanApproval !== false,
    confirmation: String(input.confirmation || "").trim()
  };
}

function validateOrder(input = {}) {
  const order = normalizeOrder(input);
  const errors = [];
  const warnings = [];
  const symbolPattern = /^[A-Z0-9._/-]{1,20}$/;
  const hasStopLoss = Number.isFinite(order.stopLoss) && order.stopLoss > 0;
  const hasTakeProfit = Number.isFinite(order.takeProfit) && order.takeProfit > 0;

  if (!symbolPattern.test(order.symbol)) {
    errors.push("Symbol is required and can only contain letters, numbers, dot, dash, slash, or underscore.");
  }
  if (order.quantity <= 0) errors.push("Quantity must be greater than zero.");
  if (order.entryPrice <= 0) errors.push("Estimated / limit price must be greater than zero.");
  if (order.accountSize <= 0) errors.push("Account size must be greater than zero.");
  if (order.maxRiskPercent <= 0) errors.push("Max risk per trade must be greater than zero.");
  if (order.maxDailyLossPercent <= 0) warnings.push("Daily loss limit is zero or below; production trading would stop all new trades.");
  if (order.maxNotional <= 0) errors.push("Max notional value must be greater than zero.");

  if (order.mode === "live" && order.broker === "paper-sim") {
    errors.push("Live mode cannot use the paper simulator broker.");
  }

  if (order.requireStopLoss && !hasStopLoss) {
    errors.push("Stop-loss is required by the risk engine.");
  }

  let riskPerUnit = null;
  let rewardPerUnit = null;

  if (hasStopLoss && order.entryPrice > 0) {
    riskPerUnit = order.side === "buy" ? order.entryPrice - order.stopLoss : order.stopLoss - order.entryPrice;
    if (riskPerUnit <= 0) {
      errors.push(order.side === "buy" ? "For long trades, stop-loss must be below entry." : "For short trades, stop-loss must be above entry.");
    }
  } else {
    warnings.push("No stop-loss provided; exact trade risk cannot be measured.");
  }

  if (hasTakeProfit && order.entryPrice > 0) {
    rewardPerUnit = order.side === "buy" ? order.takeProfit - order.entryPrice : order.entryPrice - order.takeProfit;
    if (rewardPerUnit <= 0) {
      warnings.push(order.side === "buy" ? "For long trades, take-profit is usually above entry." : "For short trades, take-profit is usually below entry.");
    }
  }

  const notional = order.quantity * order.entryPrice;
  const riskAmount = riskPerUnit && riskPerUnit > 0 ? riskPerUnit * order.quantity : null;
  const rewardAmount = rewardPerUnit && rewardPerUnit > 0 ? rewardPerUnit * order.quantity : null;
  const maxRiskAmount = order.accountSize * (order.maxRiskPercent / 100);
  const dailyLossLimitAmount = order.accountSize * (order.maxDailyLossPercent / 100);
  const rewardRiskRatio = riskAmount && rewardAmount ? rewardAmount / riskAmount : null;

  if (notional > order.maxNotional) {
    errors.push(`Notional value ${money(notional)} exceeds max notional ${money(order.maxNotional)}.`);
  }

  if (riskAmount !== null && riskAmount > maxRiskAmount) {
    errors.push(`Trade risk ${money(riskAmount)} exceeds allowed risk ${money(maxRiskAmount)}.`);
  }

  if (riskAmount !== null && riskAmount > dailyLossLimitAmount) {
    errors.push(`Trade risk ${money(riskAmount)} exceeds daily loss limit ${money(dailyLossLimitAmount)}.`);
  }

  if (rewardRiskRatio !== null && rewardRiskRatio < 1) {
    warnings.push("Reward-to-risk ratio is below 1.0; review whether the setup is worth taking.");
  }

  if (order.mode === "live") {
    warnings.push("Live trading is protected by backend feature flags, broker credentials, and human confirmation.");
    if (order.requireHumanApproval && order.confirmation !== LIVE_CONFIRMATION) {
      warnings.push(`Human approval phrase required for live execution: ${LIVE_CONFIRMATION}`);
    }
  }

  const modeLabel = order.mode === "paper" ? "Paper simulator" : "Live preview locked";
  const sideLabel = order.side === "buy" ? "BUY / LONG" : "SELL / SHORT";

  return {
    ok: errors.length === 0,
    blocked: errors.length > 0,
    errors,
    warnings,
    order,
    preview: {
      id: `preview-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      summary: `${modeLabel}: ${sideLabel} ${order.quantity} ${order.symbol} @ ${money(order.entryPrice)}`,
      symbol: order.symbol,
      side: order.side,
      orderType: order.orderType,
      broker: order.broker,
      mode: order.mode,
      notional,
      riskAmount,
      maxRiskAmount,
      dailyLossLimitAmount,
      rewardAmount,
      rewardRiskRatio,
      createdAt: new Date().toISOString()
    }
  };
}

module.exports = {
  LIVE_CONFIRMATION,
  normalizeOrder,
  validateOrder
};
