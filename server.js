const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
let folioCounter = {};
let sesiones = {};



  app.post("/webhook", async (req, res) => {
  const incomingMsg = req.body.Body;
  const message = incomingMsg.toLowerCase();

    if (!incomingMsg.includes("beneficiario") ||
    !incomingMsg.includes("concepto") ||
    !incomingMsg.includes("costo") ||
    !incomingMsg.includes("categoría")) {

  res.set("Content-Type", "text/xml");
  return res.send(`
    <Response>
      <Message>
Información incompleta.
Debe incluir:
Beneficiario
Concepto
Costo
Categoría
      </Message>
    </Response>
  `);
}


  // ===== MANEJO CREAR FOLIO =====
 // ====== MANEJO CREAR FOLIO ======
// Simulación temporal (se pierde si se reinicia)
const drafts = {}; // drafts[from] = { concepto, prioridad, beneficiario, importe, categoria, subcategoria, unidad }

function parseKeyValueLines(text) {
  // acepta líneas tipo "Beneficiario: Juan", "Importe: 12000", etc.
  const out = {};
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  for (const l of lines) {
    const m = l.match(/^([a-záéíóúñ\s]+)\s*:\s*(.+)$/i);
    if (!m) continue;
    const key = m[1].toLowerCase();
    const val = m[2].trim();
    if (key.includes("benefici")) out.beneficiario = val;
    if (key.includes("import")) out.importe = val;
    if (key.includes("categor")) out.categoria = val;
    if (key.includes("sub")) out.subcategoria = val;
    if (key.includes("unidad")) out.unidad = val;
    if (key.includes("concept")) out.concepto = val;
  }
  return out;
}

function missingFields(d) {
  const miss = [];
  if (!d.beneficiario) miss.push("Beneficiario");
  if (!d.importe) miss.push("Importe");
  if (!d.categoria) miss.push("Categoría");
  if (!d.subcategoria) miss.push("Subcategoría");
  if (String(d.categoria || "").toLowerCase().includes("taller") && !d.unidad) miss.push("Unidad (AT-03 / C-03)");
  return miss;
}

app.post("/webhook", async (req, res) => {
  const incomingMsg = req.body.Body || "";
  const from = req.body.From || "unknown";
  const message = incomingMsg.toLowerCase();

  // === CAPTURA GUIADA PARA CREAR FOLIO ===
  if (message.includes("crear folio")) {
    drafts[from] = drafts[from] || {};
    drafts[from].concepto = incomingMsg.replace(/crear folio/i, "").trim() || drafts[from].concepto;
    drafts[from].prioridad = message.includes("urgente") ? "Urgente no programado" : "Normal";

    const miss = missingFields(drafts[from]);
    if (miss.length) {
      res.set("Content-Type", "text/xml");
      return res.send(`
<Response>
  <Message>
Ok. Para crear el folio necesito: ${miss.join(", ")}.
Respóndeme en líneas así:
Beneficiario: ______
Importe: ______
Categoría: Gastos / Inversiones / Derechos y Obligaciones / Taller
Subcategoría: ______
${message.includes("taller") ? "Unidad: AT-03 o C-03\n" : ""}
(Concepto ya lo tomé de tu mensaje)
  </Message>
</Response>`);
    }

    // Aquí todavía NO generamos consecutivo por mes (eso va con DB)
   const now = new Date();
const year = now.getFullYear();
const month = String(now.getMonth() + 1).padStart(2, "0");

const monthKey = `${year}${month}`;

if (!folioCounter[monthKey]) {
  folioCounter[monthKey] = 1;
} else {
  folioCounter[monthKey]++;
}

const correlativo = String(folioCounter[monthKey]).padStart(3, "0");

const folioId = `F-${monthKey}-${correlativo}`;


    res.set("Content-Type", "text/xml");
    return res.send(`
<Response>
  <Message>
Folio ${folioId} creado correctamente.

Estado técnico: Generado
Pendiente: Aprobación Planta
Prioridad: ${drafts[from].prioridad}

Siguiente paso: el Gerente General debe aprobar.
  </Message>
</Response>`);
  }

  // === SI NO ES CREAR FOLIO, PERMITE QUE EL USUARIO COMPLETE DATOS DEL BORRADOR ===
  if (drafts[from]) {
    const kv = parseKeyValueLines(incomingMsg);
    Object.assign(drafts[from], kv);

    const miss = missingFields(drafts[from]);
    if (miss.length) {
      res.set("Content-Type", "text/xml");
      return res.send(`
<Response>
  <Message>
Me faltan: ${miss.join(", ")}.
Respóndeme con los campos faltantes (ej: "Importe: 12000").
  </Message>
</Response>`);
    }

    // ya está completo => crear folio (TEMP por ahora)
    const folioId = "F-TEMP-" + Date.now();
    const prioridad = drafts[from].prioridad || "Normal";
    const concepto = drafts[from].concepto || "(sin concepto)";

    delete drafts[from]; // limpia borrador

    res.set("Content-Type", "text/xml");
    return res.send(`
<Response>
  <Message>
Folio ${folioId} creado correctamente.

Concepto: ${concepto}
Estado técnico: Generado
Pendiente: Aprobación Planta
Prioridad: ${prioridad}

El folio ya fue enviado al flujo de autorización.
  </Message>
</Response>`);
  }

  // === SI NO, OPENAI (tu bloque actual) ===
  // ...
});


  // ===== SI NO ES CREAR FOLIO, USA OPENAI =====


  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Eres un asistente que ayuda a gestionar folios corporativos. Responde claro, profesional y breve."
          },
          {
            role: "user",
            content: incomingMsg
          }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const reply = response.data.choices[0].message.content;

    res.set("Content-Type", "text/xml");
    res.send(`
      <Response>
        <Message>${reply}</Message>
      </Response>
    `);
  } catch (error) {
    console.error(error);
    res.send("<Response><Message>Error procesando solicitud</Message></Response>");
  }
});

app.get("/", (req, res) => {
  res.send("Bot de folios activo 🚀");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Servidor corriendo en puerto " + PORT);
});
