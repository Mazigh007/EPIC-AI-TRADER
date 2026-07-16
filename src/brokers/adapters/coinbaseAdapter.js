const crypto = require("crypto");
const {
  asStringNumber,
  envBool,
  makeClientOrderId,
  normalizeSecret,
  parseBrokerResponse,
  sandboxEnabled,
  toBrokerError
} = require("./adapterUtils");

const id = "coinbase";
const name = "Coinbase";

function getConfig(env = process.env) {
  const apiKeyName = env.COINBASE_API_KEY_NAME || env.COINBASE_API_KEY || (env.LIVE_BROKER_ADAPTER === id ? env.BROKER_API_KEY : "");
  const privateKey = normalizeSecret(
    env.COINBASE_API_PRIVATE_KEY || env.COINBASE_PRIVATE_KEY || (env.LIVE_BROKER_ADAPTER === id ? env.BROKER_API_SECRET : "")
  );
  const sandboxMode = sandboxEnabled(env, "COINBASE_SANDBOX");
  const allowLive = envBool(env, "COINBASE_ALLOW_LIVE", false);
  const host = env.COINBASE_API_HOST || "api.coinbase.com";
  const baseUrl = env.COINBASE_BASE_URL || `https://${host}`;

  return {
    apiKeyName,
    privateKey,
    sandboxMode,
    allowLive,
    host,
    baseUrl,
    configured: Boolean(apiKeyName && privateKey)
  };
}

function getStatus(env = process.env) {
  const config = getConfig(env);
  return {
    id,
    name,
    mode: config.sandboxMode ? "dry-run" : "live",
    configured: config.configured,
    hasApiKey: Boolean(config.apiKeyName),
    hasApiSecret: Boolean(config.privateKey),
    sandboxMode: config.sandboxMode,
    baseUrl: config.baseUrl,
    requiredEnv: ["COINBASE_API_KEY_NAME", "COINBASE_API_PRIVATE_KEY"],
    description: "Coinbase Advanced Trade API. Sandbox mode defaults to a server-side dry run; set COINBASE_ALLOW_LIVE=true and BROKER_SANDBOX=false only when ready."
  };
}

function base64Url(value) {
  return Buffer.from(value).toString("base64url");
}

function signCoinbaseJwt({ method, host, requestPath, apiKeyName, privateKey }) {
  const now = Math.floor(Date.now() / 1000);
  const header = {
    alg: "ES256",
    kid: apiKeyName,
    nonce: crypto.randomBytes(16).toString("hex")
  };
  const payload = {
    iss: "cdp",
    sub: apiKeyName,
    nbf: now,
    exp: now + 120,
    uri: `${method.toUpperCase()} ${host}${requestPath}`
  };

  const signingInput = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(payload))}`;
  const signature = crypto.sign("sha256", Buffer.from(signingInput), {
    key: privateKey,
    dsaEncoding: "ieee-p1363"
  });

  return `${signingInput}.${signature.toString("base64url")}`;
}

function normalizeCoinbaseProductId(symbol) {
  const raw = String(symbol || "").toUpperCase().replace("/", "-").replace("_", "-");
  if (raw.includes("-")) return raw;

  for (const quote of ["USDT", "USDC", "USD", "EUR", "GBP", "BTC", "ETH"]) {
    if (raw.endsWith(quote) && raw.length > quote.length) {
      return `${raw.slice(0, -quote.length)}-${quote}`;
    }
  }

  return raw;
}

function buildOrderPayload(order) {
  const baseSize = asStringNumber(order.quantity);
  const payload = {
    client_order_id: makeClientOrderId("EPIC-CB"),
    product_id: normalizeCoinbaseProductId(order.symbol),
    side: order.side.toUpperCase(),
    order_configuration: {}
  };

  if (order.orderType === "limit") {
    payload.order_configuration.limit_limit_gtc = {
      base_size: baseSize,
      limit_price: asStringNumber(order.entryPrice),
      post_only: false
    };
  } else {
    payload.order_configuration.market_market_ioc = {
      base_size: baseSize
    };
  }

  return payload;
}

async function placeOrder(order) {
  const config = getConfig();
  if (!config.configured) {
    const error = new Error("Coinbase Advanced Trade credentials are not configured on the server.");
    error.code = "LIVE_BROKER_NOT_CONFIGURED";
    error.details = [
      "Set COINBASE_API_KEY_NAME and COINBASE_API_PRIVATE_KEY, or set BROKER_API_KEY/BROKER_API_SECRET with LIVE_BROKER_ADAPTER=coinbase.",
      "The Coinbase private key must remain on the backend and may use escaped newlines in .env."
    ];
    throw error;
  }

  const payload = buildOrderPayload(order);

  if (config.sandboxMode) {
    return {
      id: payload.client_order_id,
      mode: "coinbase-dry-run",
      broker: name,
      status: "DRY_RUN_ACCEPTED",
      symbol: payload.product_id,
      side: order.side,
      orderType: order.orderType,
      quantity: order.quantity,
      entryPrice: order.entryPrice,
      averageFillPrice: null,
      stopLoss: order.stopLoss || null,
      takeProfit: order.takeProfit || null,
      notional: order.quantity * order.entryPrice,
      submittedAt: new Date().toISOString(),
      note: "Coinbase sandbox mode is a backend dry run. No real Coinbase order was sent.",
      raw: payload
    };
  }

  if (!config.allowLive) {
    const error = new Error("Coinbase live order submission requires COINBASE_ALLOW_LIVE=true in addition to LIVE_TRADING_ENABLED=true.");
    error.code = "LIVE_BROKER_NOT_ENABLED";
    error.details = ["Keep COINBASE_ALLOW_LIVE=false until the workflow has been tested and approved."];
    throw error;
  }

  const requestPath = "/api/v3/brokerage/orders";
  const token = signCoinbaseJwt({
    method: "POST",
    host: config.host,
    requestPath,
    apiKeyName: config.apiKeyName,
    privateKey: config.privateKey
  });

  const response = await fetch(`${config.baseUrl}${requestPath}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const responsePayload = await parseBrokerResponse(response);
  if (!response.ok || responsePayload.success === false) {
    throw toBrokerError(name, response.status, responsePayload);
  }

  const successResponse = responsePayload.success_response || responsePayload;
  return {
    id: successResponse.order_id || payload.client_order_id,
    mode: "live",
    broker: name,
    status: responsePayload.success ? "submitted" : "received",
    symbol: payload.product_id,
    side: order.side,
    orderType: order.orderType,
    quantity: order.quantity,
    entryPrice: order.entryPrice,
    averageFillPrice: null,
    stopLoss: order.stopLoss || null,
    takeProfit: order.takeProfit || null,
    notional: order.quantity * order.entryPrice,
    submittedAt: new Date().toISOString(),
    raw: responsePayload
  };
}

module.exports = {
  id,
  name,
  buildOrderPayload,
  getStatus,
  normalizeCoinbaseProductId,
  placeOrder,
  signCoinbaseJwt
};
