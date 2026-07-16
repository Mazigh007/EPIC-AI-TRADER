const crypto = require("crypto");

function envBool(env, key, defaultValue = false) {
  if (env[key] === undefined || env[key] === "") return defaultValue;
  return String(env[key]).toLowerCase() === "true";
}

function sandboxEnabled(env, brokerSpecificKey) {
  if (env.BROKER_SANDBOX !== undefined && env.BROKER_SANDBOX !== "") {
    return envBool(env, "BROKER_SANDBOX", true);
  }
  return envBool(env, brokerSpecificKey, true);
}

function normalizeSecret(value = "") {
  return String(value).replace(/\\n/g, "\n").trim();
}

function makeClientOrderId(prefix = "EPIC") {
  return `${prefix}-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`.slice(0, 48);
}

function toBrokerError(adapter, responseStatus, responsePayload) {
  const error = new Error(`${adapter} broker request failed with status ${responseStatus}`);
  error.code = "BROKER_REQUEST_FAILED";
  error.details = responsePayload;
  return error;
}

async function parseBrokerResponse(response) {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch (error) {
    return { raw: text };
  }
}

function asStringNumber(value) {
  return String(value);
}

module.exports = {
  asStringNumber,
  envBool,
  makeClientOrderId,
  normalizeSecret,
  parseBrokerResponse,
  sandboxEnabled,
  toBrokerError
};
