# Código para pegar en ChatGPT (endpoint póliza + S3 + helpers)

Pega estos bloques en 2 o 3 mensajes cuando ChatGPT te pida el "endpoint real de póliza" y los helpers.

---

## Bloque 1: Configuración S3 y getBufferFromS3

```javascript
// Configuración S3 (server.js, líneas ~137-152)
const s3BucketName = process.env.S3_BUCKET_NAME || process.env.S3_BUCKET || "";
const s3Enabled =
  !!process.env.AWS_ACCESS_KEY_ID &&
  !!process.env.AWS_SECRET_ACCESS_KEY &&
  !!process.env.AWS_REGION &&
  !!s3BucketName;

const s3 = s3Enabled
  ? new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    })
  : null;

// POLIZA_TEMPLATE_S3_KEY se lee en el endpoint: process.env.POLIZA_TEMPLATE_S3_KEY
// Ejemplo de valor en Render: "Plantillas/formato-poliza.pdf"

/** Descarga un objeto S3 como buffer (para PDF cotización en documento gastos). */
async function getBufferFromS3(s3Key) {
  if (!s3Enabled || !s3) throw new Error("S3 no configurado");
  const command = new GetObjectCommand({ Bucket: s3BucketName, Key: s3Key });
  const resp = await s3.send(command);
  const chunks = [];
  for await (const chunk of resp.Body) chunks.push(chunk);
  return Buffer.concat(chunks);
}
```

---

## Bloque 2: Helper numeroALetra (usado por el endpoint de póliza)

```javascript
/** Convierte importe numérico a letra (es-MX): "SON DOS MIL NOVECIENTOS OCHENTA Y OCHO PESOS 51/100 M.N." */
function numeroALetra(importe) {
  const n = Number(importe);
  if (!Number.isFinite(n) || n < 0) return "SON CERO PESOS 00/100 M.N.";
  const entero = Math.floor(n);
  const centavos = Math.round((n - entero) * 100) % 100;
  const unidades = ["", "UN", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE"];
  const diez = ["", "DIEZ", "ONCE", "DOCE", "TRECE", "CATORCE", "QUINCE", "DIECISÉIS", "DIECISIETE", "DIECIOCHO", "DIECINUEVE"];
  const veintis = ["", "VEINTIUN", "VEINTIDÓS", "VEINTITRÉS", "VEINTICUATRO", "VEINTICINCO", "VEINTISÉIS", "VEINTISIETE", "VEINTIOCHO", "VEINTINUEVE"];
  const decenas = ["", "", "VEINTE", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"];
  const centenas = ["", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINIENTOS", "SEISCIENTOS", "SETECIENTOS", "OCHOCIENTOS", "NOVECIENTOS"];
  function hasta99(num) {
    if (num === 0) return "";
    if (num < 10) return unidades[num];
    if (num < 20) return diez[num - 9];
    const d = Math.floor(num / 10);
    const u = num % 10;
    if (u === 0) return decenas[d];
    if (d === 2) return veintis[u];
    return decenas[d] + " Y " + unidades[u];
  }
  function hasta999(num) {
    if (num === 0) return "";
    if (num === 100) return "CIEN";
    const c = Math.floor(num / 100);
    const rest = num % 100;
    const part = (c === 1 && rest === 0) ? "CIEN" : (centenas[c] + (rest ? " " + hasta99(rest) : ""));
    return part.trim();
  }
  if (entero === 0) return `SON CERO PESOS ${String(centavos).padStart(2, "0")}/100 M.N.`;
  let letra = "";
  const millones = Math.floor(entero / 1000000);
  const miles = Math.floor((entero % 1000000) / 1000);
  const resto = entero % 1000;
  if (millones > 0) letra += (millones === 1 ? "UN MILLÓN" : hasta999(millones) + " MILLONES") + " ";
  if (miles > 0) letra += (miles === 1 ? "MIL" : hasta999(miles) + " MIL") + " ";
  if (resto > 0 || letra === "") letra += hasta999(resto);
  letra = letra.trim();
  if (letra === "UN") letra = "UNO";
  return `SON ${letra} PESOS ${String(centavos).padStart(2, "0")}/100 M.N.`;
}
```

**Nota:** En el endpoint no hay `formatMoney` ni `formatDate` como funciones separadas. Se usa:
- `Number(importeNum).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })` para el importe.
- `ahora.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })` para la fecha.

---

## Bloque 3: Endpoint completo GET /api/folios/:id/poliza/documento

```javascript
/** Documento Póliza Cheque (formato oficial). Genera PDF con datos del folio. */
app.get("/api/folios/:id/poliza/documento", dashboardAuthMiddleware, async (req, res) => {
  const folioId = parseInt(req.params.id, 10);
  if (!Number.isFinite(folioId)) return res.status(400).json({ error: "id inválido" });
  const format = (req.query.format || "pdf").toLowerCase();
  if (format !== "pdf") return res.status(400).json({ error: "Solo format=pdf" });
  const client = await pool.connect();
  try {
    const r = await client.query(
      `SELECT f.id, f.planta_id, f.solo_zp_ad, f.numero_folio, f.folio_codigo, f.beneficiario, f.concepto, f.importe, f.creado_en, f.mes_cargo,
              p.nombre AS planta_nombre, p.clave AS planta_clave
       FROM public.folios f
       LEFT JOIN public.plantas p ON p.id = f.planta_id
       WHERE f.id = $1`,
      [folioId]
    );
    const folio = r.rows[0] || null;
    if (!folio) return res.status(404).json({ error: "Folio no encontrado" });
    const esZPDoc = (req.dashboardAuth.role && String(req.dashboardAuth.role).toUpperCase()) === "ZP";
    const esADDoc = (req.dashboardAuth.role && String(req.dashboardAuth.role).toUpperCase()) === "AD";
    if (folio.solo_zp_ad && !esZPDoc && !esADDoc) return res.status(404).json({ error: "Folio no encontrado" });
    if ((req.dashboardAuth.role === "GG" || req.dashboardAuth.role === "GA") && req.dashboardAuth.plantas_permitidas?.length > 0) {
      const folioPlantaId = folio.planta_id != null ? folio.planta_id : null;
      if (folioPlantaId == null || !req.dashboardAuth.plantas_permitidas.includes(folioPlantaId)) {
        return res.status(403).json({ error: "Sin permiso para este folio" });
      }
    }
    const numeroFolio = (folio.numero_folio || folio.folio_codigo || `F-${folioId}`).toString().trim();
    const importeNum = folio.importe != null ? Number(folio.importe) : 0;
    const importeStr = Number(importeNum).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const importeLetra = numeroALetra(importeNum);
    const beneficiario = (folio.beneficiario || "").trim() || "—";
    const concepto = (folio.concepto || "").trim() || "—";
    const plantaDisplay = (folio.planta_clave || folio.planta_nombre || "").toString().trim() || "—";
    const ahora = new Date();
    const fechaTexto = ahora.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
    const mesCargo = (folio.mes_cargo || "").toString().trim();
    const mesesAbr = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    let recursoTexto = "—";
    if (/^\d{4}-\d{2}$/.test(mesCargo)) {
      const [yr, mo] = mesCargo.split("-").map(Number);
      recursoTexto = `${mesesAbr[mo - 1] || ""} ${yr}`;
    }

    let pdfBytes;
    let templateBuf = null;
    let templateSource = null;
    const s3TemplateKey = process.env.POLIZA_TEMPLATE_S3_KEY;
    if (s3Enabled && s3TemplateKey) {
      try {
        templateBuf = await getBufferFromS3(s3TemplateKey);
        templateSource = "S3:" + s3TemplateKey;
      } catch (e) {
        const isNoSuchKey = e.name === "NoSuchKey" || e.Code === "NoSuchKey" || (e.message && e.message.includes("NoSuchKey"));
        if (!isNoSuchKey) console.warn("[poliza/documento] Plantilla S3 no cargada:", e.message);
      }
    }
    if (!templateBuf) {
      const templatePath = process.env.POLIZA_TEMPLATE_PATH || path.join(__dirname, "templates", "formato-poliza.pdf");
      try {
        templateBuf = await fsPromises.readFile(templatePath);
        templateSource = "local:" + templatePath;
      } catch (e) {
        if (e.code === "ENOENT") {
          console.warn("[poliza/documento] Plantilla local no encontrada:", templatePath);
        } else {
          console.warn("[poliza/documento] Plantilla local no usada:", e.message);
        }
      }
    }
    if (templateBuf) {
      try {
        const pdfDoc = await PDFDocument.load(templateBuf);
        const page = pdfDoc.getPage(0);
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        const draw = (text, x, y, size = 9, bold = false) => { page.drawText(String(text).substring(0, 100), { x, y, size, font: bold ? fontBold : font }); };
        draw(`FOLIO - ${numeroFolio}`, 400, 760, 10, true);
        draw(beneficiario, 55, 658, 9);
        draw("ADMINISTRADOR", 220, 658, 8);
        draw(recursoTexto, 220, 635, 9);
        draw(importeLetra, 50, 578, 9);
        draw(fechaTexto, 50, 538, 9);
        draw(`${beneficiario}  ${importeStr}`, 50, 518, 9);
        draw(importeLetra, 50, 488, 8);
        draw(concepto, 115, 448, 9);
        draw(plantaDisplay, 50, 398, 9);
        draw(fechaTexto, 170, 398, 9);
        draw(beneficiario, 50, 378, 9);
        draw(importeStr, 430, 378, 9);
        pdfBytes = await pdfDoc.save();
        if (templateSource) console.log("[poliza/documento] Póliza generada con plantilla:", templateSource);
      } catch (e) {
        console.warn("[poliza/documento] Error al cargar o rellenar plantilla (se usa formato por código):", e.message);
        templateBuf = null;
        pdfBytes = undefined;
      }
    }
    if (!templateBuf || pdfBytes === undefined) {
      console.log("[poliza/documento] Generando póliza desde cero (sin plantilla)");
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([612, 792]);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const marginLeft = 50;
      const marginRight = 562;
      const width = marginRight - marginLeft;
      let y = 760;
      const th = 1;
      const drawLine = (x1, y1, x2, y2) => {
        page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: th });
      };
      const txt = (str, x, yPos, size = 10, bold = false) => {
        const f = bold ? fontBold : font;
        page.drawText(String(str).substring(0, 120), { x, y: yPos, size, font: f });
      };
      txt("POLIZA CHEQUE", marginLeft, y, 16, true);
      txt(`FOLIO - ${numeroFolio}`, 400, y, 10, true);
      y -= 24;
      txt("CTA:", marginLeft, y, 10);
      y -= 20;
      const tabW = width / 3;
      const x1 = marginLeft;
      const x2 = marginLeft + tabW;
      const x3 = marginLeft + tabW * 2;
      drawLine(x1, y, marginRight, y);
      txt("PARCIAL", x1 + 4, y - 12, 9, true);
      txt("DEBE", x2 + 4, y - 12, 9, true);
      txt("HABER", x3 + 4, y - 12, 9, true);
      drawLine(x1, y - 14, marginRight, y - 14);
      drawLine(x1, y, x1, y - 14);
      drawLine(x2, y, x2, y - 14);
      drawLine(x3, y, x3, y - 14);
      drawLine(marginRight, y, marginRight, y - 14);
      y -= 28;
      drawLine(x1, y, marginRight, y);
      drawLine(x1, y + 14, x1, y);
      drawLine(x2, y + 14, x2, y);
      drawLine(x3, y + 14, x3, y);
      drawLine(marginRight, y + 14, marginRight, y);
      txt("HECHO POR:", x1 + 4, y - 12, 8);
      txt("AUTORIZADO:", x2 + 4, y - 12, 8);
      txt("*RESPONSABLE A COMPROBAR EL GASTO:", x3 + 4, y - 12, 8);
      y -= 18;
      drawLine(x1, y, marginRight, y);
      txt("NOMBRE", x1 + 4, y - 10, 8);
      txt("ADMINISTRADOR", x2 + 4, y - 10, 8);
      txt(beneficiario, x1 + 4, y - 22, 9);
      y -= 26;
      drawLine(x1, y, marginRight, y);
      txt("RECURSO:", x1 + 4, y - 10, 8);
      txt(recursoTexto, x2 + 4, y - 10, 9);
      y -= 22;
      txt("Recibí cheque original (Nombre completo, fecha y firma)", marginLeft, y, 8);
      y -= 18;
      const importeLetraLines = importeLetra.length > 70 ? [importeLetra.substring(0, 70), importeLetra.substring(70)] : [importeLetra];
      importeLetraLines.forEach((line) => { txt(line, marginLeft, y, 9); y -= 14; });
      y -= 8;
      txt("SUMAS IGUALES", marginLeft, y, 9);
      txt("REVISADO", marginLeft + 180, y, 9);
      txt("MESA DE", marginLeft + 320, y, 9);
      txt("CONTROL.", marginLeft + 320, y - 12, 9);
      y -= 28;
      txt(fechaTexto, marginLeft, y, 9);
      txt(`${beneficiario}  ${importeStr}`, marginLeft, y - 14, 9);
      y -= 28;
      txt(importeLetra, marginLeft, y, 8);
      y -= 22;
      txt("NO. CHEQUE:", marginLeft, y, 8);
      y -= 18;
      txt("CONCEPTO:", marginLeft, y, 8);
      txt(concepto, marginLeft + 65, y, 9);
      y -= 22;
      txt("NOMBRE", marginLeft, y, 8);
      txt("COPIA DEL CHEQUE", marginLeft + 200, y, 8);
      y -= 22;
      txt(plantaDisplay, marginLeft, y, 9);
      txt(fechaTexto, marginLeft + 120, y, 9);
      txt(beneficiario, marginLeft, y - 14, 9);
      txt(importeStr, marginLeft + 380, y - 14, 9);
      y -= 28;
      txt("RECIBI CHEQUE", marginLeft, y, 9);
      pdfBytes = await pdfDoc.save();
    }
    if (!pdfBytes) throw new Error("No se pudo generar el PDF de póliza");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="Poliza-Cheque-${(folio.numero_folio || folioId).replace(/\s/g, "-")}.pdf"`);
    return res.send(Buffer.from(pdfBytes));
  } catch (e) {
    console.error("[poliza/documento]", e);
    res.status(500).json({ error: e.message || "Error al generar documento de póliza" });
  } finally {
    client.release();
  }
});
```

**Dependencias del endpoint (ya en server.js):** `path`, `fs`, `fsPromises`, `PDFDocument`, `StandardFonts` de `pdf-lib`, `pool` (PostgreSQL), `dashboardAuthMiddleware`, `getBufferFromS3`, `numeroALetra`.
