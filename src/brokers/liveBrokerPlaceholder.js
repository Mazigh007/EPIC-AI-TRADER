const alpaca = require("./adapters/alpacaAdapter");
const binance = require("./adapters/binanceAdapter");
const coinbase = require("./adapters/coinbaseAdapter");

const adapters = {
  [alpaca.id]: alpaca,
  [binance.id]: binance,
  [coinbase.id]: coinbase
};

function normalizeBrokerId(value) {
  const id = String(value || "").trim().toLowerCase();
  if (id === "coinbase-advanced" || id === "coinbase-advanced-trade") return "coinbase";
  if (id === "alpaca-paper") return "alpaca";
  if (id === "binance-spot") return "binance";
  return id;
}

function chooseAdapter(brokerId, env = process.env) {
  const requested = normalizeBrokerId(brokerId);
  if (adapters[requested]) return adapters[requested];

  const configured = normalizeBrokerId(env.LIVE_BROKER_ADAPTER);
  if (adapters[configured]) return adapters[configured];

  return null;
}

function getBrokerCatalog(env = process.env) {
  return [
    {
      id: "paper-sim",
      name: "Paper Simulator",
      mode: "paper",
      configured: true,
      hasApiKey: true,
      hasApiSecret: true,
      sandboxMode: true,
      requiredEnv: [],
      description: "Free simulator. It records paper fills but never sends real broker orders."
    },
    ...Object.values(adapters).map((adapter) => adapter.getStatus(env))
  ];
}

function getLiveBrokerStatus(env = process.env, brokerId = env.LIVE_BROKER_ADAPTER) {
  const adapter = chooseAdapter(brokerId, env);

  if (!adapter) {
    return {
      id: normalizeBrokerId(brokerId || env.LIVE_BROKER_ADAPTER || "placeholder"),
      adapter: normalizeBrokerId(brokerId || env.LIVE_BROKER_ADAPTER || "placeholder"),
      name: "Unsupported broker",
      configured: false,
      hasApiKey: false,
      hasApiSecret: false,
      sandboxMode: true,
      requiredEnv: ["LIVE_BROKER_ADAPTER"],
      description: "Choose alpaca, binance, or coinbase as the live broker adapter."
    };
  }

  const status = adapter.getStatus(env);
  return {
    ...status,
    adapter: adapter.id
  };
}

async function placeOrder(order, preview) {
  const adapter = chooseAdapter(order.broker);

  if (!adapter) {
    const error = new Error("Unsupported live broker. Choose Alpaca, Binance, or Coinbase.");
    error.code = "LIVE_BROKER_NOT_IMPLEMENTED";
    error.details = ["Supported adapters: alpaca, binance, coinbase."];
    throw error;
  }

  const status = adapter.getStatus(process.env);
  if (!status.configured) {
    const error = new Error(`${status.name} credentials are not configured on the server.`);
    error.code = "LIVE_BROKER_NOT_CONFIGURED";
    error.details = [`Required environment variables: ${status.requiredEnv.join(", ")}`];
    throw error;
  }

  return adapter.placeOrder(order, preview);
}

module.exports = {
  getBrokerCatalog,
  getLiveBrokerStatus,
  normalizeBrokerId,
  placeOrder
};
