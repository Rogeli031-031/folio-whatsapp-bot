"use strict";

const crypto = require("crypto");

/** Mismo criterio que server.js para dropdown → public.plantas */
const ALIAS_PLANTA_NOMBRE = {
  "gt puebla": "Puebla",
  "gt - puebla": "Puebla",
  "gtm queretaro": "Querétaro",
  "gtm querétaro": "Querétaro",
  "gtm - querétaro": "Querétaro",
  "gtm san luis": "San Luis",
  "gtm san luis p.": "San Luis",
  "gtm - san luis p.": "San Luis",
  "tehuacan": "Tehuacán",
  "tehuacán": "Tehuacán",
};

const PLANTA_EQUIV = {
  1: [1, 11, 12],
  11: [1, 11, 12],
  12: [1, 11, 12],
  2: [2, 14],
  14: [2, 14],
  3: [3, 15],
  15: [3, 15],
  4: [4, 16],
  16: [4, 16],
  5: [5, 18],
  18: [5, 18],
  6: [6, 13],
  13: [6, 13],
  7: [7],
  17: [17],
};

function getPlantaIdsEquivalentes(plantaId) {
  if (plantaId == null) return [];
  const id = parseInt(plantaId, 10);
  if (!Number.isFinite(id)) return [];
  return PLANTA_EQUIV[id] || [id];
}

function getCanonicalPlantaId(plantaId) {
  const ids = getPlantaIdsEquivalentes(plantaId);
  return ids.length ? Math.min(...ids) : plantaId;
}

let deps = {
  sendWhatsApp: null,
  getDashboardBaseUrl: () => "",
  /** Opcional: async (client, usuarioRow) => { kpi: url, folios: url } — JWT firmado en servidor */
  buildDicfNotifDashboardUrls: null,
};

function initDicfAcciones(d) {
  deps = { ...deps, ...d };
}

function normalizeKeyPart(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function buildClienteKey(plantaId, grupoTipo, canal, subcanal, clienteNombre) {
  const p = getCanonicalPlantaId(plantaId);
  return [
    String(p),
    normalizeKeyPart(grupoTipo),
    normalizeKeyPart(canal),
    normalizeKeyPart(subcanal),
    normalizeKeyPart(clienteNombre),
  ].join("|");
}

async function resolvePlantaId(client, plantaNombre) {
  const raw = (plantaNombre || "").trim();
  if (!raw) return null;
  const resolved = ALIAS_PLANTA_NOMBRE[raw.toLowerCase()] || raw;
  const r = await client.query(
    `SELECT id FROM public.plantas WHERE UPPER(TRIM(COALESCE(nombre,''))) = UPPER(TRIM($1)) LIMIT 1`,
    [resolved]
  );
  if (r.rows[0]) return r.rows[0].id;
  const r2 = await client.query(
    `SELECT id FROM public.plantas WHERE UPPER(TRIM(COALESCE(clave,''))) = UPPER(TRIM($1)) LIMIT 1`,
    [raw]
  );
  return r2.rows[0] ? r2.rows[0].id : null;
}

function roleNorm(auth) {
  if (!auth || auth.role == null || auth.role === "") return "";
  let r = String(auth.role).replace(/\s/g, "").toUpperCase();
  // Tokens antiguos o claves de rol extendidas → mismo tratamiento que ZP en assertPlantaAcceso
  const zAliases = ["DIR_ZP", "DIRZP", "DIRECTORZP", "DIRECTOR_ZP", "DZP", "DIR-ZP"];
  if (zAliases.includes(r)) r = "ZP";
  return r;
}

function isDicfAccionesRole(auth) {
  const r = roleNorm(auth);
  return r === "ZP" || r === "GG" || r === "GV";
}

/** GG/GV: planta debe estar en plantas_permitidas (equiv). ZP: todo. */
function assertPlantaAcceso(auth, plantaId) {
  const r = roleNorm(auth);
  if (r === "ZP") return true;
  const canon = getCanonicalPlantaId(plantaId);
  const allowed = (auth.plantas_permitidas || []).map((x) => getCanonicalPlantaId(Number(x)));
  const equiv = getPlantaIdsEquivalentes(canon);
  return equiv.some((id) => allowed.some((a) => Number(a) === Number(id)));
}

async function ensureDicfAccionesTables(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS arr.dicf_acciones (
      id SERIAL PRIMARY KEY,
      public_code VARCHAR(12) NOT NULL UNIQUE,
      planta_id INT NOT NULL REFERENCES public.plantas(id),
      planta_label TEXT NOT NULL,
      grupo_tipo VARCHAR(32) NOT NULL,
      canal TEXT NOT NULL DEFAULT '',
      subcanal TEXT NOT NULL DEFAULT '',
      cliente_nombre TEXT NOT NULL,
      cliente_key TEXT NOT NULL,
      descripcion TEXT NOT NULL,
      responsable_usuario_id INT NOT NULL REFERENCES public.usuarios(id),
      creado_por_usuario_id INT NOT NULL REFERENCES public.usuarios(id),
      estado VARCHAR(24) NOT NULL DEFAULT 'sin_compromiso',
      compromiso_deadline_at TIMESTAMPTZ NOT NULL,
      fecha_compromiso DATE NULL,
      fecha_compromiso_registrada_at TIMESTAMPTZ NULL,
      compromiso_tarde BOOLEAN NOT NULL DEFAULT false,
      cerrado_at TIMESTAMPTZ NULL,
      cerrado_por_usuario_id INT NULL REFERENCES public.usuarios(id),
      twilio_sid_1 TEXT NULL,
      twilio_sid_2 TEXT NULL,
      notify_error TEXT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `).catch(() => {});
  await client.query(`
    CREATE TABLE IF NOT EXISTS arr.dicf_accion_historial (
      id SERIAL PRIMARY KEY,
      accion_id INT NOT NULL REFERENCES arr.dicf_acciones(id) ON DELETE CASCADE,
      actor_usuario_id INT REFERENCES public.usuarios(id),
      evento VARCHAR(64) NOT NULL,
      detalle JSONB,
      creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `).catch(() => {});
  await client.query(`CREATE INDEX IF NOT EXISTS idx_dicf_acc_planta_cliente ON arr.dicf_acciones(planta_id, cliente_key);`).catch(() => {});
  await client.query(`CREATE INDEX IF NOT EXISTS idx_dicf_acc_hist_accion ON arr.dicf_accion_historial(accion_id);`).catch(() => {});
  await client.query(`ALTER TABLE arr.dicf_acciones ADD COLUMN IF NOT EXISTS resultado_cierre TEXT`).catch(() => {});
}

const MIN_RESULTADO_CIERRE_LEN = 20;

function genPublicCode() {
  return crypto.randomBytes(5).toString("hex").toUpperCase().slice(0, 10);
}

async function insertHistorial(client, accionId, actorId, evento, detalle) {
  await client.query(
    `INSERT INTO arr.dicf_accion_historial (accion_id, actor_usuario_id, evento, detalle) VALUES ($1,$2,$3,$4)`,
    [accionId, actorId, evento, detalle ? JSON.stringify(detalle) : null]
  );
}

/** Actualiza vencido y atraso en plazo de compromiso (3h). CDMX = America/Mexico_City. */
async function refreshEstados(client, accionIds = null) {
  const setCase = `
      estado = CASE
        WHEN a.estado = 'hecho' OR a.cerrado_at IS NOT NULL THEN 'hecho'
        WHEN a.fecha_compromiso IS NULL AND now() > a.compromiso_deadline_at THEN 'compromiso_atrasado'
        WHEN a.fecha_compromiso IS NULL THEN 'sin_compromiso'
        WHEN (NOW() AT TIME ZONE 'America/Mexico_City')::date > a.fecha_compromiso THEN 'vencido'
        ELSE 'pendiente'
      END,
      updated_at = now()`;
  try {
    if (accionIds && accionIds.length) {
      await client.query(`UPDATE arr.dicf_acciones a SET ${setCase} WHERE a.id = ANY($1::int[])`, [accionIds]);
    } else {
      await client.query(`UPDATE arr.dicf_acciones a SET ${setCase} WHERE a.cerrado_at IS NULL AND a.estado <> 'hecho'`);
    }
  } catch (_) {}
}

async function loadAccion(client, id) {
  const r = await client.query(`SELECT * FROM arr.dicf_acciones WHERE id = $1`, [id]);
  return r.rows[0] || null;
}

async function loadAccionByPublicCode(client, code) {
  const r = await client.query(`SELECT * FROM arr.dicf_acciones WHERE UPPER(TRIM(public_code)) = UPPER(TRIM($1))`, [code]);
  return r.rows[0] || null;
}

async function getUsuarioRol(client, usuarioId) {
  const r = await client.query(
    `SELECT u.id, u.planta_id, u.telefono, u.nombre, r.clave AS rol_clave, r.nombre AS rol_nombre
     FROM public.usuarios u
     LEFT JOIN public.roles r ON r.id = u.rol_id
     WHERE u.id = $1`,
    [usuarioId]
  );
  return r.rows[0] || null;
}

async function validateResponsablePlanta(client, responsableId, plantaIdCanon) {
  const u = await getUsuarioRol(client, responsableId);
  if (!u) return { ok: false, error: "Responsable no encontrado" };
  const clave = (u.rol_clave || "").toUpperCase();
  if (clave !== "GG" && clave !== "GV") return { ok: false, error: "El responsable debe ser usuario GG o GV" };
  const equivTarget = new Set(getPlantaIdsEquivalentes(plantaIdCanon));
  if (u.planta_id == null || !equivTarget.has(u.planta_id)) {
    return { ok: false, error: "El responsable no pertenece a esta planta" };
  }
  return { ok: true, usuario: u };
}

async function notifyResponsable(client, accionRow, responsableUser) {
  if (!deps.sendWhatsApp || !responsableUser || !responsableUser.telefono) {
    return { ok: false, error: "Sin teléfono o Twilio" };
  }
  let webBlock = "";
  try {
    if (client && deps.buildDicfNotifDashboardUrls) {
      const urls = await deps.buildDicfNotifDashboardUrls(client, responsableUser, {
        public_code: accionRow.public_code,
      });
      /** Una sola liga: pantalla para compromiso + resultado + cierre (no KPI ni folios). */
      if (urls && urls.accion) {
        webBlock = `\n🔗 Contestar acción (registro DICF, válido 5 h):\n${urls.accion}\n`;
      }
    }
  } catch (e) {
    webBlock = "";
  }
  const msg =
    `📋 Nueva acción DICF\n` +
    `Código: ${accionRow.public_code}\n` +
    `Planta: ${accionRow.planta_label}\n` +
    `Cliente: ${accionRow.cliente_nombre}\n` +
    `Grupo: ${accionRow.grupo_tipo}\n` +
    `${accionRow.descripcion.slice(0, 400)}${accionRow.descripcion.length > 400 ? "…" : ""}\n\n` +
    `Define tu fecha compromiso en 3h (CDMX).\n` +
    `WhatsApp: COMPROMISO ${accionRow.public_code} AAAA-MM-DD\n` +
    `Cerrar: DICF CERRAR ${accionRow.public_code} <resultado: qué pasó, qué dijo el cliente, qué sigue> (mín. ${MIN_RESULTADO_CIERRE_LEN} caracteres)` +
    webBlock;
  let r1 = await deps.sendWhatsApp(responsableUser.telefono, msg, { event: "dicf_accion_nueva" });
  let sid1 = r1.ok ? r1.sid : null;
  if (!r1.ok) {
    r1 = await deps.sendWhatsApp(responsableUser.telefono, msg, { event: "dicf_accion_nueva_retry" });
    sid1 = r1.ok ? r1.sid : null;
  }
  return { ok: r1.ok, sid1, error: r1.ok ? null : r1.error };
}

async function createAccion(client, auth, payload) {
  const body = payload || {};
  /** Dashboard/API envían snake_case; compatibilidad con camelCase. */
  const plantaNombre = body.plantaNombre ?? body.planta;
  const grupoTipo = body.grupoTipo ?? body.grupo_tipo;
  const canal = body.canal;
  const subcanal = body.subcanal;
  const clienteNombre = body.clienteNombre ?? body.cliente_nombre;
  const descripcion = body.descripcion;
  const responsable_usuario_id = body.responsable_usuario_id;
  if (!plantaNombre || !grupoTipo || !clienteNombre || !descripcion || !responsable_usuario_id) {
    return { error: "Faltan planta, grupo, cliente, descripción o responsable" };
  }
  const rawPid = await resolvePlantaId(client, plantaNombre);
  if (!rawPid) return { error: "Planta no encontrada" };
  const plantaId = getCanonicalPlantaId(rawPid);
  if (!assertPlantaAcceso(auth, plantaId)) return { error: "Sin acceso a esta planta" };

  const vResp = await validateResponsablePlanta(client, parseInt(responsable_usuario_id, 10), plantaId);
  if (!vResp.ok) return { error: vResp.error };

  const creadoPor = auth.actor_id;
  if (!creadoPor) return { error: "Token sin actor_id" };

  const clienteKey = buildClienteKey(plantaId, grupoTipo, canal, subcanal, clienteNombre);
  let publicCode = genPublicCode();
  for (let i = 0; i < 5; i++) {
    const chk = await client.query(`SELECT 1 FROM arr.dicf_acciones WHERE public_code = $1`, [publicCode]);
    if (!chk.rows.length) break;
    publicCode = genPublicCode();
  }

  const deadlineRes = await client.query(`SELECT (NOW() + interval '3 hours') AS t`);
  const compromisoDeadline = deadlineRes.rows[0].t;

  const ins = await client.query(
    `INSERT INTO arr.dicf_acciones (
      public_code, planta_id, planta_label, grupo_tipo, canal, subcanal, cliente_nombre, cliente_key,
      descripcion, responsable_usuario_id, creado_por_usuario_id, estado, compromiso_deadline_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'sin_compromiso',$12)
    RETURNING *`,
    [
      publicCode,
      plantaId,
      plantaNombre.trim(),
      String(grupoTipo).trim(),
      String(canal || "").trim(),
      String(subcanal || "").trim(),
      String(clienteNombre).trim(),
      clienteKey,
      String(descripcion).trim(),
      vResp.usuario.id,
      creadoPor,
      compromisoDeadline,
    ]
  );
  const row = ins.rows[0];
  await insertHistorial(client, row.id, creadoPor, "creada", {
    descripcion: row.descripcion,
    responsable_id: row.responsable_usuario_id,
  });

  const notif = await notifyResponsable(client, row, vResp.usuario);
  await client.query(
    `UPDATE arr.dicf_acciones SET twilio_sid_1 = $2, twilio_sid_2 = $3, notify_error = $4 WHERE id = $1`,
    [row.id, notif.sid1 || null, null, notif.ok ? null : String(notif.error || "")]
  );

  return { accion: row, notificacion: notif };
}

async function listAcciones(client, auth, query) {
  const plantaNombre = (query.planta || "").trim();
  const clienteKey = (query.cliente_key || "").trim();
  if (!plantaNombre && roleNorm(auth) !== "ZP") return { error: "Falta planta" };
  let plantaId = null;
  if (plantaNombre) {
    const raw = await resolvePlantaId(client, plantaNombre);
    if (!raw) return { error: "Planta no encontrada" };
    plantaId = getCanonicalPlantaId(raw);
    if (!assertPlantaAcceso(auth, plantaId)) return { error: "Sin acceso a esta planta" };
  } else if (roleNorm(auth) === "ZP") {
    plantaId = null;
  }

  const params = [];
  let where = "1=1";
  if (plantaId != null) {
    params.push(getPlantaIdsEquivalentes(plantaId));
    where += ` AND a.planta_id = ANY($${params.length}::int[])`;
  }
  if (clienteKey) {
    params.push(clienteKey);
    where += ` AND a.cliente_key = $${params.length}`;
  }

  const r = await client.query(
    `SELECT a.*,
            rp.nombre AS responsable_nombre,
            cr.nombre AS creador_nombre,
            cp.nombre AS cerrado_por_nombre
     FROM arr.dicf_acciones a
     LEFT JOIN public.usuarios rp ON rp.id = a.responsable_usuario_id
     LEFT JOIN public.usuarios cr ON cr.id = a.creado_por_usuario_id
     LEFT JOIN public.usuarios cp ON cp.id = a.cerrado_por_usuario_id
     WHERE ${where}
     ORDER BY a.created_at DESC
     LIMIT 500`,
    params
  );
  const ids = (r.rows || []).map((x) => x.id);
  if (ids.length) await refreshEstados(client, ids);
  const r2 = await client.query(
    `SELECT a.*,
            rp.nombre AS responsable_nombre,
            cr.nombre AS creador_nombre,
            cp.nombre AS cerrado_por_nombre
     FROM arr.dicf_acciones a
     LEFT JOIN public.usuarios rp ON rp.id = a.responsable_usuario_id
     LEFT JOIN public.usuarios cr ON cr.id = a.creado_por_usuario_id
     LEFT JOIN public.usuarios cp ON cp.id = a.cerrado_por_usuario_id
     WHERE ${where}
     ORDER BY a.created_at DESC
     LIMIT 500`,
    params
  );
  return { acciones: r2.rows || [] };
}

/** Una acción por código público (enlace profundo GG/ZP/GV con acceso a planta). */
async function lookupAccionPorPublicCode(client, auth, publicCode) {
  const code = String(publicCode || "").trim();
  if (!code) return { error: "Falta código" };
  const sel = `
     SELECT a.*,
            rp.nombre AS responsable_nombre,
            cr.nombre AS creador_nombre,
            cp.nombre AS cerrado_por_nombre
     FROM arr.dicf_acciones a
     LEFT JOIN public.usuarios rp ON rp.id = a.responsable_usuario_id
     LEFT JOIN public.usuarios cr ON cr.id = a.creado_por_usuario_id
     LEFT JOIN public.usuarios cp ON cp.id = a.cerrado_por_usuario_id
     WHERE UPPER(TRIM(a.public_code)) = UPPER(TRIM($1))
     LIMIT 1`;
  const r = await client.query(sel, [code]);
  const row = r.rows[0];
  if (!row) return { error: "Acción no encontrada" };
  if (!assertPlantaAcceso(auth, row.planta_id)) return { error: "Sin acceso" };
  await refreshEstados(client, [row.id]);
  const r2 = await client.query(sel, [code]);
  return { accion: r2.rows[0] || row };
}

async function listAssignableUsers(client, plantaNombre) {
  const raw = await resolvePlantaId(client, plantaNombre);
  if (!raw) return { error: "Planta no encontrada" };
  const plantaId = getCanonicalPlantaId(raw);
  const equiv = getPlantaIdsEquivalentes(plantaId);
  const r = await client.query(
    `SELECT u.id, u.nombre, u.telefono, r.clave AS rol_clave
     FROM public.usuarios u
     INNER JOIN public.roles r ON r.id = u.rol_id
     WHERE u.planta_id = ANY($1::int[])
       AND (UPPER(TRIM(COALESCE(r.clave,''))) IN ('GG','GV') OR UPPER(TRIM(COALESCE(r.nombre,''))) IN ('GG','GV','GERENTE DE VENTAS'))
       AND (u.activo IS NULL OR u.activo = true)
     ORDER BY r.clave, u.nombre`,
    [equiv]
  );
  return { usuarios: r.rows || [] };
}

async function getHistorial(client, auth, accionId) {
  const a = await loadAccion(client, accionId);
  if (!a) return { error: "Acción no encontrada" };
  if (!assertPlantaAcceso(auth, a.planta_id)) return { error: "Sin acceso" };
  const h = await client.query(
    `SELECT h.*, u.nombre AS actor_nombre
     FROM arr.dicf_accion_historial h
     LEFT JOIN public.usuarios u ON u.id = h.actor_usuario_id
     WHERE h.accion_id = $1
     ORDER BY h.creado_en ASC`,
    [accionId]
  );
  return { historial: h.rows || [] };
}

async function setFechaCompromiso(client, auth, accionId, fechaStr, actorUserIdOverride) {
  const a = await loadAccion(client, accionId);
  if (!a) return { error: "Acción no encontrada" };
  if (!assertPlantaAcceso(auth, a.planta_id)) return { error: "Sin acceso" };
  const m = String(fechaStr || "").trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return { error: "Fecha inválida (usa AAAA-MM-DD)" };
  const y = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10);
  const d = parseInt(m[3], 10);
  const fd = new Date(Date.UTC(y, mo - 1, d));
  if (fd.getUTCFullYear() !== y || fd.getUTCMonth() !== mo - 1 || fd.getUTCDate() !== d) return { error: "Fecha inválida" };

  const actorId = actorUserIdOverride != null ? actorUserIdOverride : auth.actor_id;
  if (!actorId) return { error: "Sin actor" };

  const responsable = await getUsuarioRol(client, a.responsable_usuario_id);
  const rAct = await getUsuarioRol(client, actorId);
  const rn = (rAct && rAct.rol_clave) ? String(rAct.rol_clave).toUpperCase() : "";
  const puede =
    actorId === a.responsable_usuario_id ||
    rn === "ZP" ||
    rn === "GG" ||
    rn === "GV";
  if (!puede) return { error: "No autorizado" };
  if (rn === "GG" || rn === "GV") {
    if (!assertPlantaAcceso(auth, a.planta_id)) return { error: "Sin acceso" };
  }

  const lateRes = await client.query(`SELECT (now() > a.compromiso_deadline_at) AS late FROM arr.dicf_acciones a WHERE a.id = $1`, [accionId]);
  const late = !!(lateRes.rows[0] && lateRes.rows[0].late);

  await client.query(
    `UPDATE arr.dicf_acciones SET
      fecha_compromiso = $2::date,
      fecha_compromiso_registrada_at = now(),
      compromiso_tarde = $3,
      estado = 'pendiente',
      updated_at = now()
     WHERE id = $1`,
    [accionId, `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`, late]
  );
  await insertHistorial(client, accionId, actorId, "fecha_compromiso", { fecha: fechaStr, tarde: late });
  await refreshEstados(client, [accionId]);
  return { ok: true, accion: await loadAccion(client, accionId) };
}

async function cerrarAccion(client, auth, accionId, resultadoTexto) {
  const resultado = String(resultadoTexto || "").trim();
  if (resultado.length < MIN_RESULTADO_CIERRE_LEN) {
    return {
      error: `Describe el resultado del cierre (mín. ${MIN_RESULTADO_CIERRE_LEN} caracteres): qué hiciste, qué dijo el cliente, qué sigue, próxima acción.`,
    };
  }
  const a = await loadAccion(client, accionId);
  if (!a) return { error: "Acción no encontrada" };
  if (!assertPlantaAcceso(auth, a.planta_id)) return { error: "Sin acceso" };
  if (!a.fecha_compromiso) return { error: "Debes registrar fecha compromiso antes de cerrar" };
  const rAct = await getUsuarioRol(client, auth.actor_id);
  const rn = (rAct && rAct.rol_clave) ? String(rAct.rol_clave).toUpperCase() : "";
  if (!["ZP", "GG", "GV"].includes(rn)) return { error: "No autorizado" };

  await client.query(
    `UPDATE arr.dicf_acciones SET estado = 'hecho', cerrado_at = now(), cerrado_por_usuario_id = $2,
      resultado_cierre = $3, updated_at = now() WHERE id = $1`,
    [accionId, auth.actor_id, resultado.slice(0, 8000)]
  );
  await insertHistorial(client, accionId, auth.actor_id, "cerrada", { resultado_cierre: resultado.slice(0, 8000) });
  await refreshEstados(client, [accionId]);
  return { ok: true, accion: await loadAccion(client, accionId) };
}

/**
 * WhatsApp: COMPROMISO CODE AAAA-MM-DD
 * actor = fila getActorByPhone (id, rol_clave, planta_id, …)
 */
async function handleCompromisoWhatsApp(client, actor, bodyTrim) {
  const m = bodyTrim.match(/^COMPROMISO\s+(\w+)\s+(\d{4}-\d{2}-\d{2})\s*$/i);
  if (!m) return { handled: false };
  if (!actor || !actor.id) return { handled: true, reply: "No te encuentro como usuario." };
  const code = m[1];
  const fecha = m[2];

  const a = await loadAccionByPublicCode(client, code);
  if (!a) return { handled: true, reply: `No existe acción con código ${code}.` };
  if (a.responsable_usuario_id !== actor.id) {
    return { handled: true, reply: "Solo el responsable de la acción puede registrar el compromiso por WhatsApp." };
  }
  const auth = {
    actor_id: actor.id,
    role: (actor.rol_clave || "GG").toUpperCase(),
    plantas_permitidas: getPlantaIdsEquivalentes(actor.planta_id),
  };
  const r = await setFechaCompromiso(client, auth, a.id, fecha, actor.id);
  if (r.error) return { handled: true, reply: r.error };
  return {
    handled: true,
    reply: `✅ Compromiso registrado: ${fecha} (código ${a.public_code}). Estado: pendiente hasta la fecha.`,
  };
}

/**
 * WhatsApp: DICF CERRAR CODE texto del resultado (mín. 20 caracteres).
 * Cierra quien tenga rol ZP/GG/GV con acceso a la planta de la acción.
 */
async function handleCerrarDicfWhatsApp(client, actor, bodyTrim) {
  const m = bodyTrim.match(/^DICF\s+CERRAR\s+(\w+)\s+([\s\S]+)$/i);
  if (!m) return { handled: false };
  if (!actor || !actor.id) return { handled: true, reply: "No te encuentro como usuario." };
  const code = m[1].trim();
  const resultado = m[2].trim();
  if (resultado.length < MIN_RESULTADO_CIERRE_LEN) {
    return {
      handled: true,
      reply: `El resultado debe tener al menos ${MIN_RESULTADO_CIERRE_LEN} caracteres. Indica: qué hiciste, qué dijo el cliente, qué sigue.\nEj: DICF CERRAR ${code} Llamé al cliente, no contestó; dejar nota y reintentar viernes.`,
    };
  }
  const a = await loadAccionByPublicCode(client, code);
  if (!a) return { handled: true, reply: `No existe acción con código ${code}.` };
  const auth = {
    actor_id: actor.id,
    role: (actor.rol_clave || "GG").toUpperCase(),
    plantas_permitidas: getPlantaIdsEquivalentes(actor.planta_id),
  };
  const r = await cerrarAccion(client, auth, a.id, resultado);
  if (r.error) return { handled: true, reply: r.error };
  return {
    handled: true,
    reply: `✅ Acción cerrada (${a.public_code}). Quedó registrado el resultado.`,
  };
}

async function exportExcelRows(client, auth, plantaNombre) {
  let where = "1=1";
  const params = [];
  if ((plantaNombre || "").trim()) {
    const raw = await resolvePlantaId(client, plantaNombre.trim());
    if (!raw) return { error: "Planta no encontrada" };
    const plantaId = getCanonicalPlantaId(raw);
    if (!assertPlantaAcceso(auth, plantaId)) return { error: "Sin acceso" };
    params.push(getPlantaIdsEquivalentes(plantaId));
    where += ` AND a.planta_id = ANY($1::int[])`;
  } else if (roleNorm(auth) !== "ZP") {
    return { error: "ZP puede exportar sin filtro; GG/GV deben indicar planta" };
  }

  const r = await client.query(
    `SELECT a.id, a.public_code, a.planta_label, a.grupo_tipo, a.canal, a.subcanal, a.cliente_nombre, a.descripcion, a.estado,
            a.compromiso_deadline_at, a.fecha_compromiso, a.compromiso_tarde, a.created_at, a.cerrado_at,
            a.resultado_cierre,
            rp.nombre AS responsable, cr.nombre AS creador, cp.nombre AS cerrado_por, a.notify_error
     FROM arr.dicf_acciones a
     LEFT JOIN public.usuarios rp ON rp.id = a.responsable_usuario_id
     LEFT JOIN public.usuarios cr ON cr.id = a.creado_por_usuario_id
     LEFT JOIN public.usuarios cp ON cp.id = a.cerrado_por_usuario_id
     WHERE ${where}
     ORDER BY a.created_at DESC`,
    params
  );
  return { rows: r.rows || [] };
}

module.exports = {
  initDicfAcciones,
  ensureDicfAccionesTables,
  ALIAS_PLANTA_NOMBRE,
  buildClienteKey,
  resolvePlantaId,
  getCanonicalPlantaId,
  getPlantaIdsEquivalentes,
  isDicfAccionesRole,
  assertPlantaAcceso,
  roleNorm,
  createAccion,
  listAcciones,
  lookupAccionPorPublicCode,
  listAssignableUsers,
  getHistorial,
  setFechaCompromiso,
  cerrarAccion,
  handleCompromisoWhatsApp,
  handleCerrarDicfWhatsApp,
  exportExcelRows,
  refreshEstados,
};
