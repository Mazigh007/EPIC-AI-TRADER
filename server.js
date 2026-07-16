const http = require("http");
const fs = require("fs");
const path = require("path");

loadEnvFile();

const { validateOrder, LIVE_CONFIRMATION } = require("./src/risk/riskEngine");
const paperBroker = require("./src/brokers/paperBroker");
const liveBroker = require("./src/brokers/liveBrokerPlaceholder");
const { getAgentStatus, runActiveAgent } = require("./src/agents/activeAgent");
const { listTrades } = require("./src/orders/orderStore");

const PORT = Number(process.env.PORT || 8080);
const PUBLIC_DIR = __dirname;
const JSON_LIMIT_BYTES = 1024 * 1024;

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".zip": "application/zip",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon"
};

function loadEnvFile() {
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;

    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    const rawValue = trimmed.slice(index + 1).trim();
    const value = rawValue.replace(/^['\"]|['\"]$/g, "");
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

function liveTradingEnabled() {
  return process.env.LIVE_TRADING_ENABLED === "true";
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  });
  res.end(JSON.stringify(payload, null, 2));
}

function sendText(res, statusCode, message) {
  res.writeHead(statusCode, {
    "Content-Type": "text/plain; charset=utf-8",
    "X-Content-Type-Options": "nosniff"
  });
  res.end(message);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";

    req.on("data", (chunk) => {
      raw += chunk;
      if (Buffer.byteLength(raw) > JSON_LIMIT_BYTES) {
        reject(new Error("Request body too large"));
        req.destroy();
      }
    });

    req.on("end", () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(new Error("Invalid JSON body"));
      }
    });

    req.on("error", reject);
  });
}

function brokerCatalog() {
  return liveBroker.getBrokerCatalog();
}


async function handleApi(req, res, url) {
  if (url.pathname === "/api/health" && req.method === "GET") {
    const liveStatus = liveBroker.getLiveBrokerStatus();
    return sendJson(res, 200, {
      ok: true,
      service: "EPIC AI Trader Studio API",
      liveTradingEnabled: liveTradingEnabled(),
      liveBroker: {
        adapter: liveStatus.adapter,
        name: liveStatus.name,
        configured: liveStatus.configured,
        sandboxMode: liveStatus.sandboxMode,
        requiredEnv: liveStatus.requiredEnv
      },
      supportedBrokers: brokerCatalog(),
      requiredLiveConfirmation: LIVE_CONFIRMATION,
      timestamp: new Date().toISOString()
    });
  }

  if (url.pathname === "/api/brokers" && req.method === "GET") {
    return sendJson(res, 200, { ok: true, brokers: brokerCatalog() });
  }

  if (url.pathname === "/api/agent/status" && req.method === "GET") {
    const status = await getAgentStatus();
    return sendJson(res, 200, status);
  }

  if (url.pathname === "/api/agent/run" && req.method === "POST") {
    const body = await readJsonBody(req);
    const result = await runActiveAgent(body);
    return sendJson(res, 200, result);
  }

  if (url.pathname === "/api/trades" && req.method === "GET") {
    const limit = Math.max(1, Math.min(250, Number(url.searchParams.get("limit") || 50)));
    return sendJson(res, 200, { ok: true, trades: listTrades(limit) });
  }

  if (url.pathname === "/api/order/preview" && req.method === "POST") {
    const body = await readJsonBody(req);
    const result = validateOrder(body);
    return sendJson(res, 200, {
      ...result,
      source: "server risk engine",
      message: result.blocked ? "Order preview is blocked by risk rules." : "Order preview passed risk checks."
    });
  }

  if (url.pathname === "/api/order/execute" && req.method === "POST") {
    const body = await readJsonBody(req);
    const result = validateOrder(body);

    if (result.blocked) {
      return sendJson(res, 400, {
        ok: false,
        blocked: true,
        message: "Execution blocked by risk engine.",
        details: result.errors,
        warnings: result.warnings,
        preview: result.preview
      });
    }

    if (result.order.mode === "paper") {
      const order = await paperBroker.placeOrder(result.order, result.preview);
      return sendJson(res, 200, {
        ok: true,
        mode: "paper",
        order,
        message: "Paper order filled by the simulator. No real broker order was sent."
      });
    }

    if (!liveTradingEnabled()) {
      return sendJson(res, 403, {
        ok: false,
        blocked: true,
        message: "Live execution is disabled. Set LIVE_TRADING_ENABLED=true only after a real broker adapter and sandbox testing are complete.",
        details: [
          "Keep broker credentials in server environment variables only.",
          "Start with the broker's sandbox/paper mode.",
          `Require the confirmation phrase: ${LIVE_CONFIRMATION}.`
        ]
      });
    }

    if (result.order.requireHumanApproval && result.order.confirmation !== LIVE_CONFIRMATION) {
      return sendJson(res, 400, {
        ok: false,
        blocked: true,
        message: "Human approval phrase is missing or incorrect.",
        details: [`Type exactly: ${LIVE_CONFIRMATION}`]
      });
    }

    const status = liveBroker.getLiveBrokerStatus(process.env, result.order.broker);
    if (!status.configured) {
      return sendJson(res, 403, {
        ok: false,
        blocked: true,
        message: `${status.name || result.order.broker} credentials are not configured on the server.`,
        details: [
          `Required environment variables: ${(status.requiredEnv || ["BROKER_API_KEY", "BROKER_API_SECRET"]).join(", ")}`,
          "Never put broker credentials in frontend JavaScript."
        ]
      });
    }

    try {
      const order = await liveBroker.placeOrder(result.order, result.preview);
      return sendJson(res, 200, {
        ok: true,
        mode: order.mode || "live",
        order,
        message: order.mode && order.mode !== "live"
          ? "Broker sandbox/test/dry-run response received. No confirmed real-money fill unless your broker mode is live."
          : "Live order response received from broker adapter."
      });
    } catch (error) {
      const statusCode = error.code === "LIVE_BROKER_NOT_IMPLEMENTED" ? 501 : error.code === "LIVE_BROKER_NOT_CONFIGURED" ? 403 : 502;
      return sendJson(res, statusCode, {
        ok: false,
        blocked: true,
        message: error.message,
        details: error.details || [
          "Review the selected broker adapter and credentials.",
          "Keep sandbox mode enabled until the full workflow is tested."
        ]
      });
    }
  }

  return sendJson(res, 404, { ok: false, message: "API route not found" });
}

function serveStatic(req, res, url) {
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === "/") pathname = "/index.html";

  const allowedStaticFiles = new Set([
    "/index.html",
    "/styles.css",
    "/app.js",
    "/GO_LIVE_PAPER.md",
    "/EPIC-AI-TRADER-go-live-package.zip"
  ]);
  if (!allowedStaticFiles.has(pathname)) {
    return sendText(res, 404, "Not found");
  }

  const requestedPath = path.normalize(path.join(PUBLIC_DIR, pathname));
  if (!requestedPath.startsWith(PUBLIC_DIR)) {
    return sendText(res, 403, "Forbidden");
  }

  fs.stat(requestedPath, (statError, stat) => {
    if (statError || !stat.isFile()) {
      return sendText(res, 404, "Not found");
    }

    const ext = path.extname(requestedPath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": contentTypes[ext] || "application/octet-stream",
      "X-Content-Type-Options": "nosniff"
    });
    fs.createReadStream(requestedPath).pipe(res);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    });
    return res.end();
  }

  try {
    if (url.pathname.startsWith("/api/")) {
      return await handleApi(req, res, url);
    }
    return serveStatic(req, res, url);
  } catch (error) {
    return sendJson(res, 500, { ok: false, message: error.message || "Server error" });
  }
});

server.listen(PORT, () => {
  console.log(`EPIC AI Trader Studio running at http://localhost:${PORT}`);
  console.log(`Live trading enabled: ${liveTradingEnabled() ? "yes" : "no"}`);
});
