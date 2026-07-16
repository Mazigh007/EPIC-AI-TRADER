const crypto = require("crypto");
const {
  asStringNumber,
  envBool,
  parseBrokerResponse,
  sandboxEnabled,
  toBrokerError
} = require("./adapterUtils");

const id = "binance";
const name = "Binance";

function getConfig(env = process.env) {
  const apiKey = env.BINANCE_API_KEY || (env.LIVE_BROKER_ADAPTER === id ? env.BROKER_API_KEY : "");
  const apiSecret = env.BINANCE_API_SECRET || (env.LIVE_BROKER_ADAPTER === id ? env.BROKER_API_SECRET : "");
  const sandboxMode = sandboxEnabled(env, "BINANCE_TESTNET");
  const baseUrl = env.BINANCE_BASE_URL || (sandboxMode ? "https://testnet.binance.vision" : "https://api.binance.com");
  const useTestOrder = sandboxMode && !envBool(env, "BINANCE_CREATE_SANDBOX_ORDER", false);

  return {
    apiKey,
    apiSecret,
    sandboxMode,
    baseUrl,
    useTestOrder,
    configured: Boolean(apiKey && apiSecret)
  };
}

function getStatus(env = process.env) {
  const config = getConfig(env);
  return {
    id,
    name,
    mode: config.sandboxMode ? (config.useTestOrder ? "test order" : "testnet") : "live",
    configured: config.configured,
    hasApiKey: Boolean(config.apiKey),
    hasApiSecret: Boolean(config.apiSecret),
    sandboxMode: config.sandboxMode,
    baseUrl: config.baseUrl,
    requiredEnv: ["BINANCE_API_KEY", "BINANCE_API_SECRET"],
    description: "Binance Spot API. Sandbox defaults to the testnet/test-order endpoint unless BINANCE_CREATE_SANDBOX_ORDER=true."
  };
}

function normalizeBinanceSymbol(symbol) {
  let normalized = String(symbol || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (normalized.endsWith("USD") && !normalized.endsWith("USDT")) {
    normalized = `${normalized.slice(0, -3)}USDT`;
  }
  return normalized;
}

function signParams(params, secret) {
  const query = new URLSearchParams(params).toString();
  const signature = crypto.createHmac("sha256", secret).update(query).digest("hex");
  return `${query}&signature=${signature}`;
}

function buildOrderParams(order) {
  const params = {
    symbol: normalizeBinanceSymbol(order.symbol),
    side: order.side.toUpperCase(),
    type: order.orderType.toUpperCase(),
    quantity: asStringNumber(order.quantity),
    recvWindow: "5000",
    timestamp: String(Date.now())
  };

  if (order.orderType === "limit") {
    params.timeInForce = "GTC";
    params.price = asStringNumber(order.entryPrice);
  }

  return params;
}

async function placeOrder(order) {
  const config = getConfig();
  if (!config.configured) {
    const error = new Error("Binance credentials are not configured on the server.");
    error.code = "LIVE_BROKER_NOT_CONFIGURED";
    error.details = ["Set BINANCE_API_KEY and BINANCE_API_SECRET, or set BROKER_API_KEY/BROKER_API_SECRET with LIVE_BROKER_ADAPTER=binance."];
    throw error;
  }

  const endpoint = config.useTestOrder ? "/api/v3/order/test" : "/api/v3/order";
  const signedQuery = signParams(buildOrderParams(order), config.apiSecret);

  const response = await fetch(`${config.baseUrl}${endpoint}?${signedQuery}`, {
    method: "POST",
    headers: {
      "X-MBX-APIKEY": config.apiKey
    }
  });

  const payload = await parseBrokerResponse(response);
  if (!response.ok) throw toBrokerError(name, response.status, payload);

  return {
    id: payload.orderId ? String(payload.orderId) : `BINANCE-TEST-${Date.now()}`,
    mode: config.sandboxMode ? (config.useTestOrder ? "broker-test" : "broker-testnet") : "live",
    broker: name,
    status: payload.status || (config.useTestOrder ? "ACCEPTED_TEST_ORDER" : "submitted"),
    symbol: payload.symbol || normalizeBinanceSymbol(order.symbol),
    side: String(payload.side || order.side).toLowerCase(),
    orderType: String(payload.type || order.orderType).toLowerCase(),
    quantity: Number(payload.origQty || order.quantity),
    entryPrice: order.entryPrice,
    averageFillPrice: Number(payload.price || order.entryPrice) || null,
    stopLoss: order.stopLoss || null,
    takeProfit: order.takeProfit || null,
    notional: order.quantity * order.entryPrice,
    submittedAt: payload.transactTime ? new Date(payload.transactTime).toISOString() : new Date().toISOString(),
    raw: payload
  };
}

module.exports = {
  id,
  name,
  buildOrderParams,
  getStatus,
  placeOrder
};
