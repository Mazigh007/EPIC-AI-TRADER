const { addTrade } = require("../orders/orderStore");

function makePaperOrder(order, preview) {
  return {
    id: `PAPER-${Date.now()}-${Math.random().toString(16).slice(2, 8).toUpperCase()}`,
    mode: "paper",
    broker: "Paper Simulator",
    status: "FILLED",
    symbol: order.symbol,
    assetClass: order.assetClass,
    side: order.side,
    orderType: order.orderType,
    quantity: order.quantity,
    entryPrice: order.entryPrice,
    averageFillPrice: order.entryPrice,
    stopLoss: order.stopLoss || null,
    takeProfit: order.takeProfit || null,
    notional: preview.notional,
    riskAmount: preview.riskAmount,
    rewardRiskRatio: preview.rewardRiskRatio,
    submittedAt: new Date().toISOString(),
    note: "Simulated fill only. No real order was sent to a broker."
  };
}

async function placeOrder(order, preview) {
  const paperOrder = makePaperOrder(order, preview);
  addTrade(paperOrder);
  return paperOrder;
}

module.exports = {
  placeOrder
};
