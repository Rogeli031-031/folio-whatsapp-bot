/**
 * Hoja EVIDENCIAS del Action Register (fotos embebidas), filtrada por mes calendario.
 * Usado por GET /api/action-register/export-evidencias y export ARR combinado.
 */

const { embedExcelEvidencePhoto } = require("./excel-image-compress");

const ACTION_REGISTER_TEMAS = [
  "Contrataciones",
  "Mantenimiento",
  "General",
  "Clientes",
  "Apoyos",
  "Licencias",
  "Taller",
];

function fmtDate(d) {
  if (!d) return "";
  if (d instanceof Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  const s = String(d);
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : s;
}

function fmtDMY(value) {
  const ymd = fmtDate(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return ymd || "";
  const [y, m, d] = ymd.split("-");
  return `${d}/${m}/${y}`;
}

function monthBounds(year, month) {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const endMonth = month === 12 ? 1 : month + 1;
  const endYear = month === 12 ? year + 1 : year;
  const end = `${endYear}-${String(endMonth).padStart(2, "0")}-01`;
  return { start, end };
}

function buildNumeration(items) {
  const byParent = new Map();
  const sorted = [...items].sort((a, b) => (a.position ?? 0) - (b.position ?? 0) || a.id - b.id);
  for (const it of sorted) {
    const k = it.parent_id == null ? "root" : String(it.parent_id);
    if (!byParent.has(k)) byParent.set(k, []);
    byParent.get(k).push(it);
  }
  const numById = new Map();
  function assign(parentKey, prefix) {
    const list = byParent.get(parentKey) || [];
    list.forEach((it, idx) => {
      const num = prefix ? `${prefix}.${idx + 1}` : String(idx + 1);
      numById.set(it.id, num);
      assign(String(it.id), num);
    });
  }
  assign("root", "");
  return numById;
}

/**
 * @param {import("pg").PoolClient} client
 * @param {{
 *   planta_id: number,
 *   year: number,
 *   month: number,
 *   sheetName?: string,
 *   ExcelJS: typeof import("exceljs"),
 *   ensureActionRegisterTables: (c: import("pg").PoolClient) => Promise<void>,
 *   dicfAccionesLib: { ensureDicfAccionesTables: Function, getPlantaIdsEquivalentes: Function },
 *   getActionRegisterAttachmentBuffer: Function,
 *   getDicfAttachmentBuffer: Function,
 *   getNoteAttachmentBuffer: Function,
 * }} opts
 */
async function buildActionRegisterEvidenciasWorkbook(client, opts) {
  const {
    planta_id,
    year,
    month,
    sheetName = "EVIDENCIAS",
    ExcelJS,
    ensureActionRegisterTables,
    dicfAccionesLib,
    getActionRegisterAttachmentBuffer,
    getDicfAttachmentBuffer,
    getNoteAttachmentBuffer,
  } = opts;

  const { start: monthStart, end: monthEnd } = monthBounds(year, month);

  await ensureActionRegisterTables(client);

  const rev = await client.query(
    `SELECT id, revision_date
     FROM arr.action_register_revisions
     WHERE planta_id = $1
       AND revision_date >= $2::date
       AND revision_date < $3::date
     ORDER BY revision_date DESC`,
    [planta_id, monthStart, monthEnd]
  );
  const revisions = rev.rows || [];
  const revisionIds = revisions.map((r) => r.id);
  if (revisionIds.length === 0) {
    const wbEmpty = new ExcelJS.Workbook();
    wbEmpty.creator = "Folio WhatsApp Bot";
    const wsE = wbEmpty.addWorksheet(sheetName);
    wsE.columns = [
      { header: "#", key: "num", width: 10 },
      { header: "Tema", key: "tema", width: 18 },
      { header: "Acción", key: "title", width: 60 },
      { header: "Foto", key: "foto", width: 40 },
      { header: "Archivo", key: "file", width: 30 },
      { header: "Revisión", key: "rev", width: 14 },
    ];
    wsE.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    wsE.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F2937" } };
    return wbEmpty;
  }

  const r = await client.query(
    `SELECT e.revision_id, e.position,
            i.id, i.tema, i.parent_id, i.title, i.responsable, i.due_date, i.closed,
            i.created_at, i.updated_at
     FROM arr.action_register_entries e
     JOIN arr.action_register_items i ON i.id = e.item_id
     JOIN arr.action_register_revisions rv ON rv.id = e.revision_id
     WHERE rv.planta_id = $1
       AND rv.revision_date >= $2::date
       AND rv.revision_date < $3::date
     ORDER BY rv.revision_date DESC, i.tema ASC, e.position ASC, i.id ASC`,
    [planta_id, monthStart, monthEnd]
  );

  const attRes = await client.query(
    `SELECT a.id, a.item_id, a.file_name, a.content_type, a.s3_key, a.s3_url, a.data
     FROM arr.action_register_attachments a
     JOIN arr.action_register_items i ON i.id = a.item_id
     JOIN arr.action_register_entries e ON e.item_id = i.id
     JOIN arr.action_register_revisions rv ON rv.id = e.revision_id
     WHERE rv.planta_id = $1
       AND rv.revision_date >= $2::date
       AND rv.revision_date < $3::date
     ORDER BY a.item_id ASC, a.created_at ASC, a.id ASC`,
    [planta_id, monthStart, monthEnd]
  );
  const attachmentsByItem = new Map();
  for (const a of attRes.rows || []) {
    if (!attachmentsByItem.has(a.item_id)) attachmentsByItem.set(a.item_id, []);
    attachmentsByItem.get(a.item_id).push(a);
  }

  let dicfAccionesRows = [];
  const dicfAttachmentsByAccion = new Map();
  const ymPrefix = `${year}-${String(month).padStart(2, "0")}`;
  try {
    await dicfAccionesLib.ensureDicfAccionesTables(client);
    const equivPlantas = dicfAccionesLib.getPlantaIdsEquivalentes(planta_id);
    if (equivPlantas.length > 0) {
      const dq = await client.query(
        `SELECT a.id, a.public_code, a.planta_id, a.planta_label, a.grupo_tipo, a.canal, a.subcanal,
                a.cliente_nombre, a.descripcion, a.estado, a.fecha_compromiso, a.compromiso_tarde,
                a.cerrado_at, a.resultado_cierre, a.created_at, a.updated_at,
                to_char((a.created_at AT TIME ZONE 'America/Mexico_City')::date, 'YYYY-MM-DD') AS creada_ymd,
                COALESCE(NULLIF(TRIM(COALESCE(rp.nombre_persona,'')), ''), rp.nombre) AS responsable_nombre
         FROM arr.dicf_acciones a
         LEFT JOIN public.usuarios rp ON rp.id = a.responsable_usuario_id
         WHERE a.planta_id = ANY($1::int[])
           AND to_char((a.created_at AT TIME ZONE 'America/Mexico_City')::date, 'YYYY-MM') = $2
         ORDER BY a.cerrado_at NULLS FIRST, a.created_at DESC`,
        [equivPlantas, ymPrefix]
      );
      dicfAccionesRows = dq.rows || [];

      const dAttRes = await client.query(
        `SELECT a.id, a.dicf_accion_id, a.file_name, a.content_type, a.s3_key, a.s3_url, a.data
         FROM arr.dicf_acciones_attachments a
         JOIN arr.dicf_acciones da ON da.id = a.dicf_accion_id
         WHERE da.planta_id = ANY($1::int[])
           AND to_char((da.created_at AT TIME ZONE 'America/Mexico_City')::date, 'YYYY-MM') = $2
         ORDER BY a.dicf_accion_id ASC, a.created_at ASC, a.id ASC`,
        [equivPlantas, ymPrefix]
      );
      for (const a of dAttRes.rows || []) {
        if (!dicfAttachmentsByAccion.has(a.dicf_accion_id)) dicfAttachmentsByAccion.set(a.dicf_accion_id, []);
        dicfAttachmentsByAccion.get(a.dicf_accion_id).push(a);
      }
    }
  } catch (e) {
    console.error("[ActionRegister evidencias export DICF]", e);
  }

  const notesRes = await client.query(
    `SELECT n.id, n.revision_id, n.body, n.author_name, n.created_at
     FROM arr.action_register_revision_notes n
     JOIN arr.action_register_revisions rv ON rv.id = n.revision_id
     WHERE rv.planta_id = $1
       AND rv.revision_date >= $2::date
       AND rv.revision_date < $3::date
     ORDER BY rv.revision_date DESC, n.created_at ASC, n.id ASC`,
    [planta_id, monthStart, monthEnd]
  );
  const notesByRevisionId = new Map();
  for (const n of notesRes.rows || []) {
    if (!notesByRevisionId.has(n.revision_id)) notesByRevisionId.set(n.revision_id, []);
    notesByRevisionId.get(n.revision_id).push(n);
  }

  const noteAttachmentsByNoteId = new Map();
  try {
    const nAttRes = await client.query(
      `SELECT a.id, a.note_id, a.file_name, a.content_type, a.s3_key, a.s3_url, a.data
       FROM arr.action_register_revision_note_attachments a
       JOIN arr.action_register_revision_notes n ON n.id = a.note_id
       JOIN arr.action_register_revisions rv ON rv.id = n.revision_id
       WHERE rv.planta_id = $1
         AND rv.revision_date >= $2::date
         AND rv.revision_date < $3::date
       ORDER BY a.note_id ASC, a.created_at ASC, a.id ASC`,
      [planta_id, monthStart, monthEnd]
    );
    for (const a of nAttRes.rows || []) {
      if (!noteAttachmentsByNoteId.has(a.note_id)) noteAttachmentsByNoteId.set(a.note_id, []);
      noteAttachmentsByNoteId.get(a.note_id).push(a);
    }
  } catch (e) {
    console.error("[ActionRegister evidencias export note attachments]", e);
  }

  const groups = new Map();
  for (const row of r.rows || []) {
    const revDate = fmtDate(
      row.revision_id ? (revisions.find((x) => x.id === row.revision_id) || {}).revision_date : null
    );
    const key = `${revDate}|${row.tema}`;
    if (!groups.has(key)) groups.set(key, { revDate, tema: row.tema, items: [] });
    groups.get(key).items.push(row);
  }

  const dicfByRevDate = new Map();
  if (revisions.length > 0 && dicfAccionesRows.length > 0) {
    const revsAscForDicf = [...revisions]
      .map((rv) => ({ id: rv.id, ymd: fmtDate(rv.revision_date) }))
      .sort((a, b) => (a.ymd < b.ymd ? -1 : a.ymd > b.ymd ? 1 : 0));
    function pickRevYmdForCreated(createdYmd) {
      let pick = null;
      for (const rv of revsAscForDicf) {
        if (rv.ymd <= createdYmd) pick = rv;
        else break;
      }
      return pick ? pick.ymd : revsAscForDicf[0] ? revsAscForDicf[0].ymd : null;
    }
    for (const a of dicfAccionesRows) {
      const createdYmd = String(a.creada_ymd || "");
      const revYmd = pickRevYmdForCreated(createdYmd);
      if (!revYmd || !revYmd.startsWith(ymPrefix)) continue;
      if (!dicfByRevDate.has(revYmd)) dicfByRevDate.set(revYmd, []);
      dicfByRevDate.get(revYmd).push(a);
      const key = `${revYmd}|Clientes`;
      if (!groups.has(key)) groups.set(key, { revDate: revYmd, tema: "Clientes", items: [] });
    }
  }

  const sortedGroups = Array.from(groups.values()).sort((a, b) => {
    if (a.revDate < b.revDate) return 1;
    if (a.revDate > b.revDate) return -1;
    return ACTION_REGISTER_TEMAS.indexOf(a.tema) - ACTION_REGISTER_TEMAS.indexOf(b.tema);
  });

  const wb = new ExcelJS.Workbook();
  wb.creator = "Folio WhatsApp Bot";
  wb.created = new Date();

  const wsE = wb.addWorksheet(sheetName);
  wsE.columns = [
    { header: "#", key: "num", width: 10 },
    { header: "Tema", key: "tema", width: 18 },
    { header: "Acción", key: "title", width: 60 },
    { header: "Foto", key: "foto", width: 40 },
    { header: "Archivo", key: "file", width: 30 },
    { header: "Revisión", key: "rev", width: 14 },
  ];
  wsE.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  wsE.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F2937" } };
  wsE.getRow(1).alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  wsE.views = [{ state: "frozen", ySplit: 1 }];

  const bestLabelByItem = new Map();
  for (const g of sortedGroups) {
    const numById = buildNumeration(g.items);
    for (const it of g.items) {
      if (!bestLabelByItem.has(it.id)) {
        bestLabelByItem.set(it.id, {
          num: numById.get(it.id) || "",
          tema: g.tema,
          title: it.title || "",
          revDate: g.revDate,
        });
      }
    }
  }

  const itemIds = Array.from(attachmentsByItem.keys()).sort((a, b) => a - b);
  for (const itemId of itemIds) {
    const atts = attachmentsByItem.get(itemId) || [];
    const label = bestLabelByItem.get(itemId) || {
      num: "",
      tema: "",
      title: `Acción #${itemId}`,
      revDate: "",
    };
    for (const a of atts) {
      const row = wsE.addRow({
        num: label.num,
        tema: label.tema,
        title: label.title,
        foto: "",
        file: a.file_name || "",
        rev: label.revDate ? fmtDMY(label.revDate) : "",
      });
      row.height = 140;
      row.alignment = { vertical: "middle", wrapText: true };
      try {
        const buf = await getActionRegisterAttachmentBuffer(client, a);
        await embedExcelEvidencePhoto(wb, wsE, row, buf, a.content_type);
      } catch (e) {
        console.error("[ActionRegister evidencias export image]", e);
        row.getCell("foto").value = "(error al cargar)";
      }
    }
  }

  const dicfInfoById = new Map();
  for (const a of dicfAccionesRows || []) dicfInfoById.set(Number(a.id), a);
  const dicfIds = Array.from(dicfAttachmentsByAccion.keys()).sort((a, b) => a - b);
  for (const accionId of dicfIds) {
    const atts = dicfAttachmentsByAccion.get(accionId) || [];
    const info = dicfInfoById.get(Number(accionId));
    const title = info
      ? `${info.cliente_nombre || "(sin cliente)"} — ${info.descripcion || "(sin descripción)"}`
      : `Acción DICF #${accionId}`;
    const revDate =
      info && info.created_at
        ? (() => {
            try {
              return String(info.created_at).slice(0, 10);
            } catch {
              return "";
            }
          })()
        : "";
    for (const a of atts) {
      const row = wsE.addRow({
        num: info && info.public_code ? info.public_code : "",
        tema: "Clientes (DICF)",
        title,
        foto: "",
        file: a.file_name || "",
        rev: revDate ? fmtDMY(revDate) : "",
      });
      row.height = 140;
      row.alignment = { vertical: "middle", wrapText: true };
      row.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFF6FF" } };
        cell.font = { color: { argb: "FF1E3A8A" } };
      });
      try {
        const buf2 = await getDicfAttachmentBuffer(client, a);
        await embedExcelEvidencePhoto(wb, wsE, row, buf2, a.content_type);
      } catch (e) {
        console.error("[ActionRegister evidencias export DICF image]", e);
        row.getCell("foto").value = "(error al cargar)";
      }
    }
  }

  if (noteAttachmentsByNoteId.size > 0) {
    const noteInfoById = new Map();
    for (const rv of revisions) {
      const arr = notesByRevisionId.get(rv.id) || [];
      for (const n of arr) {
        const dt = n.created_at instanceof Date ? n.created_at : new Date(n.created_at);
        let hora = "";
        try {
          hora = isNaN(dt.getTime())
            ? ""
            : dt.toLocaleTimeString("es-MX", {
                timeZone: "America/Mexico_City",
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              });
        } catch (_) {}
        noteInfoById.set(Number(n.id), {
          revDate: fmtDate(rv.revision_date),
          body: String(n.body || "").trim(),
          author: n.author_name || "—",
          hora,
        });
      }
    }
    const noteIds = Array.from(noteAttachmentsByNoteId.keys()).sort((a, b) => a - b);
    for (const noteId of noteIds) {
      const atts = noteAttachmentsByNoteId.get(noteId) || [];
      const info = noteInfoById.get(Number(noteId)) || {
        revDate: "",
        body: `Comentario #${noteId}`,
        author: "—",
        hora: "",
      };
      const title = info.hora
        ? `[${info.hora}] ${info.body || "(sin texto)"}`
        : info.body || `Comentario #${noteId}`;
      for (const a of atts) {
        const row = wsE.addRow({
          num: "",
          tema: "Comentarios del día",
          title: `${info.author} — ${title}`,
          foto: "",
          file: a.file_name || "",
          rev: info.revDate ? fmtDMY(info.revDate) : "",
        });
        row.height = 140;
        row.alignment = { vertical: "middle", wrapText: true };
        row.eachCell((cell) => {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } };
          cell.font = { color: { argb: "FF78350F" } };
        });
        try {
          const buf3 = await getNoteAttachmentBuffer(client, a);
          await embedExcelEvidencePhoto(wb, wsE, row, buf3, a.content_type);
        } catch (e) {
          console.error("[ActionRegister evidencias export note image]", e);
          row.getCell("foto").value = "(error al cargar)";
        }
      }
    }
  }

  return wb;
}

module.exports = {
  ACTION_REGISTER_TEMAS,
  buildActionRegisterEvidenciasWorkbook,
};
