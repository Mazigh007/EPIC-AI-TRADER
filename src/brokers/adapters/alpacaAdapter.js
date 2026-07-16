const {
  asStringNumber,
  makeClientOrderId,
  parseBrokerResponse,
  sandboxEnabled,
  toBrokerError
} = require("./adapterUtils");

const id = "alpaca";
const name = "Alpaca";

function getConfig(env = process.env) {
  const keyId = env.ALPACA_API_KEY || (env.LIVE_BROKER_ADAPTER === id ? env.BROKER_API_KEY : "");
  const secretKey = env.ALPACA_API_SECRET || (env.LIVE_BROKER_ADAPTER === id ? env.BROKER_API_SECRET : "");
  const sandboxMode = sandboxEnabled(env, "ALPACA_PAPER");
  const baseUrl = env.ALPACA_BASE_URL || (sandboxMode ? "https://paper-api.alpaca.markets" : "https://api.alpaca.markets");

  return {
    keyId,
    secretKey,
    sandboxMode,
    baseUrl,
    configured: Boolean(keyId && secretKey)
  };
}

function getStatus(env = process.env) {
  const config = getConfig(env);
  return {
    id,
    name,
    mode: config.sandboxMode ? "paper/sandbox" : "live",
    configured: config.configured,
    hasApiKey: Boolean(config.keyId),
    hasApiSecret: Boolean(config.secretKey),
    sandboxMode: config.sandboxMode,
    baseUrl: config.baseUrl,
    requiredEnv: ["ALPACA_API_KEY", "ALPACA_API_SECRET"],
    description: "Stocks and crypto through Alpaca's Trading API. Uses Alpaca paper endpoint while sandbox mode is enabled."
  };
}

function normalizeAlpacaSymbol(order) {
  const raw = String(order.symbol || "").trim().toUpperCase();
  if (order.assetClass === "crypto") {
    if (raw.includes("/")) return raw;
    if (raw.endsWith("USDT")) return `${raw.slice(0, -4)}/USDT`;
    if (raw.endsWith("USD")) return `${raw.slice(0, -3)}/USD`;
  }
  return raw.replace("/", "");
}

function buildOrderPayload(order) {
  const payload = {
    symbol: normalizeAlpacaSymbol(order),
    qty: asStringNumber(order.quantity),
    side: order.side,
    type: order.orderType,
    time_in_force: order.assetClass === "crypto" ? "gtc" : "day",
    client_order_id: makeClientOrderId("EPIC-ALPACA")
  };

  if (order.orderType === "limit") {
    payload.limit_price = asStringNumber(order.entryPrice);
  }

  return payload;
}

async function placeOrder(order) {
  const config = getConfig();
  if (!config.configured) {
    const error = new Error("Alpaca credentials are not configured on the server.");
    error.code = "LIVE_BROKER_NOT_CONFIGURED";
    error.details = ["Set ALPACA_API_KEY and ALPACA_API_SECRET, or set BROKER_API_KEY/BROKER_API_SECRET with LIVE_BROKER_ADAPTER=alpaca."];
    throw error;
  }

  const response = await fetch(`${config.baseUrl}/v2/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "APCA-API-KEY-ID": config.keyId,
      "APCA-API-SECRET-KEY": config.secretKey
    },
    body: JSON.stringify(buildOrderPayload(order))
  });

  const payload = await parseBrokerResponse(response);
  if (!response.ok) throw toBrokerError(name, response.status, payload);

  return {
    id: payload.id || payload.client_order_id,
    mode: config.sandboxMode ? "broker-paper" : "live",
    broker: name,
    status: payload.status || "submitted",
    symbol: payload.symbol || normalizeAlpacaSymbol(order),
    side: payload.side || order.side,
    orderType: payload.type || order.orderType,
    quantity: Number(payload.qty || order.quantity),
    entryPrice: order.entryPrice,
    averageFillPrice: Number(payload.filled_avg_price || 0) || null,
    stopLoss: order.stopLoss || null,
    takeProfit: order.takeProfit || null,
    notional: order.quantity * order.entryPrice,
    submittedAt: payload.submitted_at || new Date().toISOString(),
    raw: payload
  };
}

module.exports = {
  id,
  name,
  buildOrderPayload,
  getStatus,
  placeOrder
};
