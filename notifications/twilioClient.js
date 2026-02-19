/**
 * Cliente de envío WhatsApp (Twilio) con validación, logs y resultado estructurado.
 * Uso: sendWhatsApp({ client, from, to, body, meta? })
 * - to: formato "whatsapp:+52..." (ya normalizado por el caller).
 * - meta: { correlationId?, event? } para logs.
 */

const crypto = require("crypto");

function shortId() {
  return crypto.randomBytes(6).toString("hex");
}

/**
 * Envía un mensaje WhatsApp vía Twilio.
 * @param {object} opts
 * @param {object} opts.client - Instancia de twilio(accountSid, authToken)
 * @param {string} opts.from - Número FROM (ej. "whatsapp:+14155238886" o "+14155238886")
 * @param {string} opts.to - Número TO en formato "whatsapp:+52..."
 * @param {string} opts.body - Cuerpo del mensaje
 * @param {object} [opts.meta] - { correlationId?, event? }
 * @returns {Promise<{ ok: boolean, sid?: string, status?: string, errorCode?: number|string, errorMessage?: string, correlationId: string }>}
 */
async function sendWhatsApp(opts) {
  const { client, from: rawFrom, to, body, meta = {} } = opts;
  const correlationId = meta.correlationId || shortId();
  const from = !rawFrom
    ? null
    : rawFrom.startsWith("whatsapp:")
      ? rawFrom
      : `whatsapp:${rawFrom}`;

  const logPrefix = `[NOTIFY ${correlationId}]`;

  if (!client) {
    console.warn(`${logPrefix} SKIP client=null (Twilio client no inicializado)`);
    return { ok: false, errorMessage: "Twilio client no inicializado", correlationId };
  }
  if (!from) {
    console.warn(`${logPrefix} SKIP from vacío (configura TWILIO_WHATSAPP_NUMBER, ej. +14155238886 para sandbox)`);
    return { ok: false, errorMessage: "FROM no configurado (TWILIO_WHATSAPP_NUMBER)", correlationId };
  }
  if (!to || typeof to !== "string") {
    console.warn(`${logPrefix} SKIP to inválido: ${String(to)}`);
    return { ok: false, errorMessage: "TO inválido o vacío", correlationId };
  }
  if (!to.startsWith("whatsapp:")) {
    console.warn(`${logPrefix} SKIP to sin prefijo whatsapp: → ${to}`);
    return { ok: false, errorMessage: "TO debe ser formato whatsapp:+52...", correlationId };
  }
  const bodyStr = typeof body === "string" ? body : String(body || "");
  if (!bodyStr.trim()) {
    console.warn(`${logPrefix} SKIP body vacío`);
    return { ok: false, errorMessage: "Body vacío", correlationId };
  }

  console.log(`${logPrefix} REQUEST to=${to} from=${from} bodyLen=${bodyStr.length}`);

  try {
    const msg = await client.messages.create({
      body: bodyStr,
      from,
      to,
    });
    const sid = msg.sid;
    const status = msg.status || "unknown";
    console.log(`${logPrefix} RESPONSE sid=${sid} status=${status}`);
    return {
      ok: true,
      sid,
      status,
      correlationId,
    };
  } catch (e) {
    const code = e.code ?? e.status ?? null;
    const message = e.message || String(e);
    console.warn(`${logPrefix} ERROR code=${code} message=${message}`);
    if (e.moreInfo) console.warn(`${logPrefix} moreInfo=${e.moreInfo}`);
    return {
      ok: false,
      errorCode: code,
      errorMessage: message,
      correlationId,
    };
  }
}

/**
 * Diagnóstico de configuración Twilio (sin exponer secretos).
 * @returns {object} { hasAccountSid, hasAuthToken, fromValue, fromDisplay, clientOk, message }
 */
function getTwilioDebugInfo() {
  const hasAccountSid = !!(process.env.TWILIO_ACCOUNT_SID || "").trim();
  const hasAuthToken = !!(process.env.TWILIO_AUTH_TOKEN || "").trim();
  const rawFrom = (process.env.TWILIO_WHATSAPP_NUMBER || "").trim();
  const fromValue = rawFrom || "(no definido)";
  const fromDisplay = rawFrom
    ? (rawFrom.startsWith("whatsapp:") ? rawFrom : `whatsapp:${rawFrom}`)
    : "(vacío → notificaciones salientes desactivadas)";
  const clientOk = hasAccountSid && hasAuthToken;
  const missing = [];
  if (!hasAccountSid) missing.push("TWILIO_ACCOUNT_SID");
  if (!hasAuthToken) missing.push("TWILIO_AUTH_TOKEN");
  if (!rawFrom) missing.push("TWILIO_WHATSAPP_NUMBER (ej. +14155238886 para sandbox)");
  const message =
    missing.length > 0
      ? `Faltan: ${missing.join(", ")}. Configura en Render → Environment.`
      : "Credenciales y FROM presentes. Revisa que FROM sea el número de sandbox (ej. +14155238886) si usas sandbox.";
  return {
    hasAccountSid,
    hasAuthToken,
    fromValue: fromValue === "(no definido)" ? null : fromValue,
    fromDisplay,
    clientOk,
    missing,
    message,
  };
}

module.exports = {
  sendWhatsApp,
  getTwilioDebugInfo,
  shortId,
};
