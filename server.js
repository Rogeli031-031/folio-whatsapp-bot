const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// ===== Memoria temporal en RAM (se borra si Render reinicia) =====
const drafts = {}; // drafts[from] = { concepto, prioridad, beneficiario, importe, categoria, subcategoria, unidad }
const folioCounter = {}; // folioCounter["YYYYMM"] = consecutivo

function parseKeyValueLines(text) {
  const out = {};
  const lines = String(text || "").split("\n").map(l => l.trim()).filter(Boolean);

  for (const l of lines) {
    const m = l.match(/^([a-záéíóúñ\s]+)\s*:\s*(.+)$/i);
    if (!m) continue;

    const key = m[1].toLowerCase();
    const val = m[2].trim();

    if (key.includes("benefici")) out.beneficiario = val;
    if (key.includes("import") || key.includes("costo")) out.importe = val; // acepta Importe o Costo
    if (key.includes("categor")) out.categoria = val;
    if (key.includes("sub")) out.subcategoria = val;
    if (key.includes("unidad")) out.unidad = val;
    if (key.includes("concept")) out.concepto = val;
  }
  return out;
}

function missingFields(d) {
  const miss = [];
  if (!d.concepto) miss.push("Concepto");
  if (!d.beneficiario) miss.push("Beneficiario");
  if (!d.importe) miss.push("Importe (o Costo)");
  if (!d.categoria) miss.push("Categoría");
  if (!d.subcategoria) miss.push("Subcategoría");

  if (String(d.categoria || "").toLowerCase().includes("taller") && !d.unidad) {
    miss.push("Unidad (AT-03 / C-03)");
  }
  return miss;
}

function buildMonthlyFolioId() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const key = `${year}${month}`; // YYYYMM

  folioCounter[key] = (folioCounter[key] || 0) + 1;
  const correlativo = String(folioCounter[key]).padStart(3, "0"); // 001, 002...
  return `F-${key}-${correlativo}`;
}

function twiml(msg) {
  // Ojo: Twilio/TwiML es XML; evitamos caracteres raros rompiendo la etiqueta
  const safe = String(msg || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<Response><Message>${safe}</Message></Response>`;
}

app.post("/webhook", async (req, res) => {
  const incomingMsg = (req.body.Body || "").trim();
  const from = req.body.From || "unknown";
  const message = incomingMsg.toLowerCase();

  // ===== 1) Si el usuario quiere crear folio =====
  if (message.includes("crear folio")) {
    drafts[from] = drafts[from] || {};

    // Prioridad
    drafts[from].prioridad = message.includes("urgente") ? "Urgente no programado" : "Normal";

    // Concepto: lo que venga después de "crear folio"
    const concepto = incomingMsg.replace(/crear folio/i, "").trim();
    if (concepto) drafts[from].concepto = concepto;

    // Si ya metió datos en el mismo mensaje, intentamos parsear
    Object.assign(drafts[from], parseKeyValueLines(incomingMsg));

    const miss = missingFields(drafts[from]);
    if (miss.length) {
      res.set("Content-Type", "text/xml");
      return res.send(
        twiml(
          `Ok. Para crear el folio me falta: ${miss.join(", ")}.\n` +
          `Respóndeme en líneas así:\n` +
          `Beneficiario: ____\n` +
          `Importe: ____\n` +
          `Categoría: Gastos / Inversiones / Derechos y Obligaciones / Taller\n` +
          `Subcategoría: ____\n` +
          (String(drafts[from].categoria || "").toLowerCase().includes("taller") ? `Unidad: AT-03 o C-03\n` : "") +
          `(Concepto y prioridad ya los tomé)`
        )
      );
    }

    // ✅ Ya cumple reglas => generamos folio consecutivo mensual
    const folioId = buildMonthlyFolioId();
    const d = drafts[from];

    // Limpia borrador (ya quedó "creado")
    delete drafts[from];

    res.set("Content-Type", "text/xml");
    return res.send(
      twiml(
        `Folio ${folioId} creado.\n\n` +
        `Beneficiario: ${d.beneficiario}\n` +
        `Concepto: ${d.concepto}\n` +
        `Costo: ${d.importe}\n` +
        `Categoría: ${d.categoria}\n` +
        `Subcategoría: ${d.subcategoria}\n` +
        (d.unidad ? `Unidad: ${d.unidad}\n` : "") +
        `\nEstado técnico: Generado\n` +
        `Pendiente: Aprobación Planta\n` +
        `Prioridad: ${d.prioridad}\n\n` +
        `Siguiente paso: Aprobación de Gerente General.`
      )
    );
  }

  // ===== 2) Si hay borrador abierto, el usuario está completando datos =====
  if (drafts[from]) {
    Object.assign(drafts[from], parseKeyValueLines(incomingMsg));
    const miss = missingFields(drafts[from]);

    res.set("Content-Type", "text/xml");
    if (miss.length) {
      return res.send(twiml(`Me falta: ${miss.join(", ")}.\nRespóndeme solo esos campos (ej: "Importe: 25000").`));
    }

    // Ya quedó completo => crear folio
    const folioId = buildMonthlyFolioId();
    const d = drafts[from];
    delete drafts[from];

    return res.send(
      twiml(
        `Folio ${folioId} creado.\n\n` +
        `Beneficiario: ${d.beneficiario}\n` +
        `Concepto: ${d.concepto}\n` +
        `Costo: ${d.importe}\n` +
        `Categoría: ${d.categoria}\n` +
        `Subcategoría: ${d.subcategoria}\n` +
        (d.unidad ? `Unidad: ${d.unidad}\n` : "") +
        `\nEstado técnico: Generado\nPendiente: Aprobación Planta\nPrioridad: ${d.prioridad || "Normal"}`
      )
    );
  }

  // ===== 3) Si no es crear folio ni completar borrador, usamos OpenAI =====
  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Eres un asistente que ayuda a gestionar folios corporativos. Si el usuario pide estatus, pide el folio. Responde claro, profesional y breve."
          },
          { role: "user", content: incomingMsg }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const reply = response.data.choices?.[0]?.message?.content || "Ok.";
    res.set("Content-Type", "text/xml");
    return res.send(twiml(reply));
  } catch (error) {
    console.error("OpenAI error:", error?.response?.data || error.message);
    res.set("Content-Type", "text/xml");
    return res.send(twiml("Error procesando solicitud. Intenta de nuevo en 1 minuto."));
  }
});

app.get("/", (req, res) => res.send("Bot de folios activo 🚀"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Servidor corriendo en puerto " + PORT));
