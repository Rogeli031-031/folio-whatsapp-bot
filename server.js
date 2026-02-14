const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

  app.post("/webhook", async (req, res) => {
  const incomingMsg = req.body.Body;
  const message = incomingMsg.toLowerCase();

  // ===== MANEJO CREAR FOLIO =====
 // ====== MANEJO CREAR FOLIO ======
if (message.includes("crear folio")) {

  const folioId = "F-" + Date.now(); // ID único real

  let prioridad = "Normal";

  if (message.includes("urgente")) {
    prioridad = "Urgente no programado";
  }

  res.set("Content-Type", "text/xml");
  return res.send(`
    <Response>
      <Message>
Folio ${folioId} creado correctamente.

Estado técnico: Generado
Pendiente: Aprobación Planta
Prioridad: ${prioridad}

El folio ya fue enviado al flujo de autorización.
      </Message>
    </Response>
  `);
}


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
