const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "..", ".data");
const TRADE_FILE = path.join(DATA_DIR, "paper-trades.json");

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readTrades() {
  try {
    if (!fs.existsSync(TRADE_FILE)) return [];
    const raw = fs.readFileSync(TRADE_FILE, "utf8");
    const trades = JSON.parse(raw);
    return Array.isArray(trades) ? trades : [];
  } catch (error) {
    return [];
  }
}

function writeTrades(trades) {
  ensureDataDir();
  fs.writeFileSync(TRADE_FILE, JSON.stringify(trades.slice(0, 250), null, 2));
}

function addTrade(trade) {
  const trades = readTrades();
  trades.unshift(trade);
  writeTrades(trades);
  return trade;
}

function listTrades(limit = 50) {
  return readTrades().slice(0, limit);
}

module.exports = {
  addTrade,
  listTrades
};
