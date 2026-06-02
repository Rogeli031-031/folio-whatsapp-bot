"use strict";

const dicfAccionesLib = require("./dicf-acciones");

const ACTION_REGISTER_TEMAS = [
  "Contrataciones",
  "Mantenimiento",
  "General",
  "Clientes",
  "Apoyos",
  "Licencias",
  "Taller",
];

function pgCalendarDateToYmd(v) {
  if (v == null || v === "") return "";
  if (typeof v === "string") {
    const m = v.trim().match(/^(\d{4}-\d{2}-\d{2})/);
    return m ? m[1] : "";
  }
  if (v instanceof Date && !isNaN(v.getTime())) {
    try {
      return v.toISOString().slice(0, 10);
    } catch {
      return "";
    }
  }
  const s = String(v).trim();
  const m2 = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return m2 ? m2[1] : "";
}

/**
 * Payload del tablero Action Register (misma lógica que GET /api/action-register/board).
 * @param {import("pg").PoolClient} client
 * @param {number} planta_id
 * @param {{ ensureActionRegisterTables: (c: import("pg").PoolClient) => Promise<void>, includeDicf?: boolean, includeNotes?: boolean }} opts
 */
async function buildActionRegisterBoardPayload(client, planta_id, opts) {
  const ensureActionRegisterTables = opts.ensureActionRegisterTables;
  const includeDicf = opts.includeDicf !== false;
  const includeNotes = opts.includeNotes !== false;

  await ensureActionRegisterTables(client);

  const rev = await client.query(
    `SELECT id, revision_date
     FROM arr.action_register_revisions
     WHERE planta_id = $1
     ORDER BY revision_date DESC`,
    [planta_id]
  );
  const revisions = (rev.rows || []).map((x) => ({ id: x.id, revision_date: x.revision_date }));

  const r = await client.query(
    `SELECT e.revision_id, e.position,
            i.id, i.tema, i.parent_id, i.title, i.responsable, i.due_date, i.closed,
            COALESCE((SELECT COUNT(*)::INT FROM arr.action_register_attachments a WHERE a.item_id = i.id), 0) AS attachments_count
     FROM arr.action_register_entries e
     JOIN arr.action_register_items i ON i.id = e.item_id
     JOIN arr.action_register_revisions rv ON rv.id = e.revision_id
     WHERE rv.planta_id = $1
     ORDER BY rv.revision_date DESC, i.tema ASC, e.position ASC, i.id ASC`,
    [planta_id]
  );

  const byRevisionTema = {};
  for (const row of r.rows || []) {
    const rid = String(row.revision_id);
    const tema = String(row.tema || "");
    if (!byRevisionTema[rid]) byRevisionTema[rid] = {};
    if (!byRevisionTema[rid][tema]) byRevisionTema[rid][tema] = [];
    byRevisionTema[rid][tema].push({
      id: row.id,
      tema,
      parent_id: row.parent_id,
      title: row.title,
      responsable: row.responsable,
      due_date: row.due_date,
      closed: row.closed === true,
      position: row.position,
      attachments_count: Number(row.attachments_count) || 0,
    });
  }

  if (includeDicf && revisions.length > 0) {
    try {
      await dicfAccionesLib.ensureDicfAccionesTables(client);
      const equivPlantas = dicfAccionesLib.getPlantaIdsEquivalentes(planta_id);
      if (equivPlantas.length > 0) {
        const dicfRows = await client.query(
          `SELECT a.id, a.public_code, a.planta_id, a.planta_label, a.grupo_tipo, a.canal, a.subcanal,
                  a.cliente_nombre, a.descripcion, a.estado, a.fecha_compromiso, a.compromiso_tarde,
                  a.cerrado_at, a.resultado_cierre, a.created_at,
                  to_char((a.created_at AT TIME ZONE 'America/Mexico_City')::date, 'YYYY-MM-DD') AS creada_ymd,
                  COALESCE(NULLIF(TRIM(COALESCE(rp.nombre_persona,'')), ''), rp.nombre) AS responsable_nombre,
                  COALESCE((SELECT COUNT(*)::INT FROM arr.dicf_acciones_attachments att WHERE att.dicf_accion_id = a.id), 0) AS attachments_count
           FROM arr.dicf_acciones a
           LEFT JOIN public.usuarios rp ON rp.id = a.responsable_usuario_id
           WHERE a.planta_id = ANY($1::int[])
           ORDER BY a.cerrado_at NULLS FIRST, a.created_at DESC`,
          [equivPlantas]
        );

        function normalizeYmd(v) {
          const y = pgCalendarDateToYmd(v);
          if (y) return y;
          if (!v) return "";
          return String(v).trim();
        }
        const revWithYmd = revisions.map((rv) => ({ id: rv.id, ymd: normalizeYmd(rv.revision_date) }));
        const revAsc = [...revWithYmd].sort((a, b) => (a.ymd < b.ymd ? -1 : a.ymd > b.ymd ? 1 : 0));

        function pickRevisionIdForDate(createdYmd) {
          let pick = null;
          for (const rv of revAsc) {
            if (rv.ymd <= createdYmd) pick = rv;
            else break;
          }
          return pick ? pick.id : revAsc[0] ? revAsc[0].id : null;
        }

        const posCounterByRev = new Map();
        for (const a of dicfRows.rows || []) {
          const ridNum = pickRevisionIdForDate(String(a.creada_ymd || ""));
          if (!ridNum) continue;
          const rid = String(ridNum);
          if (!byRevisionTema[rid]) byRevisionTema[rid] = {};
          if (!byRevisionTema[rid]["Clientes"]) byRevisionTema[rid]["Clientes"] = [];
          const existing = byRevisionTema[rid]["Clientes"];
          if (!posCounterByRev.has(rid)) {
            posCounterByRev.set(rid, existing.reduce((mx, it) => Math.max(mx, it.position ?? 0), -1) + 1);
          }
          const position = posCounterByRev.get(rid);
          posCounterByRev.set(rid, position + 1);

          const estado = String(a.estado || "").toLowerCase();
          const cerrada = !!a.cerrado_at || estado === "hecho";
          const clienteLabel = String(a.cliente_nombre || "").trim();
          const descr = String(a.descripcion || "").trim();
          const title = clienteLabel ? `${clienteLabel} — ${descr}` : descr || `(sin descripción)`;
          existing.push({
            id: -1000000 - Number(a.id || 0),
            tema: "Clientes",
            parent_id: null,
            title,
            responsable: a.responsable_nombre || "",
            due_date: a.fecha_compromiso || null,
            closed: cerrada,
            position,
            attachments_count: Number(a.attachments_count) || 0,
            dicf: true,
            dicf_id: a.id,
            dicf_public_code: a.public_code,
            dicf_estado: estado,
            dicf_grupo_tipo: a.grupo_tipo,
            dicf_canal: a.canal,
            dicf_subcanal: a.subcanal,
            dicf_cliente_nombre: clienteLabel,
            dicf_planta_label: a.planta_label,
            dicf_compromiso_tarde: a.compromiso_tarde === true,
            dicf_resultado_cierre: a.resultado_cierre || null,
          });
        }
      }
    } catch (e) {
      console.error("[ActionRegister board DICF inject]", e);
    }
  }

  const notesByRevision = {};
  if (includeNotes && revisions.length > 0) {
    try {
      const notesRes = await client.query(
        `SELECT n.id, n.revision_id, n.body, n.author_name, n.created_at, n.created_by_usuario_id,
                COALESCE((SELECT COUNT(*)::INT FROM arr.action_register_revision_note_attachments att WHERE att.note_id = n.id), 0) AS attachments_count
         FROM arr.action_register_revision_notes n
         JOIN arr.action_register_revisions rv ON rv.id = n.revision_id
         WHERE rv.planta_id = $1
         ORDER BY n.revision_id ASC, n.created_at ASC, n.id ASC`,
        [planta_id]
      );
      for (const n of notesRes.rows || []) {
        const rid = String(n.revision_id);
        if (!notesByRevision[rid]) notesByRevision[rid] = [];
        notesByRevision[rid].push({
          id: n.id,
          revision_id: n.revision_id,
          body: n.body,
          author_name: n.author_name || "",
          created_at: n.created_at,
          attachments_count: Number(n.attachments_count) || 0,
        });
      }
    } catch (e) {
      console.error("[ActionRegister board notes]", e);
    }
  }

  return {
    temas: ACTION_REGISTER_TEMAS,
    revisions,
    cells: byRevisionTema,
    notes: notesByRevision,
  };
}

module.exports = {
  ACTION_REGISTER_TEMAS,
  buildActionRegisterBoardPayload,
  pgCalendarDateToYmd,
};
