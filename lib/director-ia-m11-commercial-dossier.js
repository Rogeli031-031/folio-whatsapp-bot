"use strict";

/**
 * Director IA — M11 slice: expediente comercial factual (read-only).
 * SELECT-only sobre fuente materializada + acciones/comentarios/historial.
 * Join por planta_id + cliente_key. Comentarios sin clave no se unen.
 * Historial y resultado_cierre por acción. Sin causalidad. Sin canal de visitas.
 */

const { DIRECTOR_IA_VERACITY } = require("./director-ia-capabilities");
const { buildClienteKey, getCanonicalPlantaId, getPlantaIdsEquivalentes } = require("./dicf-acciones");

const SEMANTIC_CLASS = "commercial_dossier";
const SOURCE_STATE = "arr.dicf_cliente_mes";
const SOURCE_COMMENTS = "arr.cliente_comentarios";
const SOURCE_ACTIONS = "arr.dicf_acciones";
const SOURCE_HISTORY = "arr.dicf_accion_historial";

const CLIENT_LIMIT = 1;
const COMMENT_LIMIT = 8;
const COMMENT_BODY_MAX_CHARS = 500;
const ACTION_LIMIT = 8;
const HISTORY_LIMIT = 8;

const GRUPO_LABELS = Object.freeze([
  "Dejaron de comprar",
  "Disminuyeron",
  "Aumentaron",
  "Nuevo",
]);

function sourceError(message, status = 500) {
  return {
    ok: false,
    code: DIRECTOR_IA_VERACITY.SOURCE_ERROR,
    status,
    error: message || "Error de fuente del expediente comercial",
  };
}

function requirePlantaId(plantaId) {
  if (!Number.isFinite(Number(plantaId)) || Number(plantaId) <= 0) {
    return sourceError("planta_id es obligatorio", 400);
  }
  return null;
}

function dashboardAuthRoleNorm(auth) {
  if (!auth || auth.role == null || auth.role === "") return "";
  return String(auth.role).replace(/\s/g, "").toUpperCase();
}

/**
 * Intersección fail-closed: GA bloqueado (commercial_state).
 * ZP/AD globales. Resto: plantas_permitidas. Authz ANTES de datos.
 */
function assertCommercialDossierAccess(auth, plantaId) {
  if (!auth || typeof auth !== "object") {
    return {
      ok: false,
      code: DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED,
      status: 403,
      error: "Sin acceso a esta planta",
    };
  }
  const role = dashboardAuthRoleNorm(auth);
  if (!role) {
    return {
      ok: false,
      code: DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED,
      status: 403,
      error: "Sin acceso a esta planta",
    };
  }
  const pid = Number(plantaId);
  if (!Number.isFinite(pid) || pid <= 0) {
    return sourceError("planta_id es obligatorio", 400);
  }
  if (role === "GA") {
    return {
      ok: false,
      code: DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED,
      status: 403,
      error: "GA no tiene acceso a KPIs financieros.",
    };
  }
  if (role === "ZP" || role === "AD") {
    return { ok: true };
  }
  const allowed = (auth.plantas_permitidas || []).map((x) => Number(x)).filter(Number.isFinite);
  if (!allowed.includes(pid)) {
    return {
      ok: false,
      code: DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED,
      status: 403,
      error: "Sin acceso a esta planta",
    };
  }
  return { ok: true };
}

function normalizeQuestion(raw) {
  return String(raw || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function normalizeName(raw) {
  return String(raw || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function isCommercialStateListWording(question) {
  const q = normalizeQuestion(question);
  if (!q) return false;
  return (
    /\bdejaron\s+de\s+comprar\b/.test(q) ||
    /\bdisminuyeron\b/.test(q) ||
    (/\baumentaron\b/.test(q) && /\bclientes?\b/.test(q)) ||
    /\bclientes?\s+nuev/.test(q) ||
    /\bnuev[oa]s?\s+clientes?\b/.test(q)
  );
}

function isExpedienteComercialQuestion(question) {
  const q = normalizeQuestion(question);
  if (!q) return false;
  if (isCommercialStateListWording(q)) return false;
  if (/\bbitacora\b/.test(q) || /\bplaud\b/.test(q)) return false;
  if (/\bacciones?\b/.test(q) && /\b(vencid|atrasad|overdue)\b/.test(q)) return false;
  if (/\bexpediente comercial\b/.test(q)) return true;
  if (/\bexpediente\b/.test(q) && /\b(cliente|comercial)\b/.test(q)) return true;
  if (/\bestado\b/.test(q) && /\bcomentarios?\b/.test(q) && /\bacciones?\b/.test(q)) return true;
  if (/\bque\s+sabemos\s+comercialmente\b/.test(q)) return true;
  if (/\bque\s+esta\s+pasando\s+con\b/.test(q) && /\bacciones?\b/.test(q)) return true;
  return false;
}

function extractClientHint(question) {
  const raw = String(question || "").trim();
  if (!raw) return null;
  const quoted = raw.match(/["«»“”']([^"«»“”']{2,})["«»“”']/);
  if (quoted && quoted[1].trim()) return quoted[1].trim();

  const q = raw.replace(/[?¿!.]+$/g, "").trim();
  const patterns = [
    /expediente comercial(?:\s+de)?\s+(.+)$/i,
    /expediente(?:\s+comercial)?\s+de\s+(.+)$/i,
    /pasando con\s+(.+?)(?:\s+y\s+qu[eé]|\s*$)/i,
    /sabemos comercialmente de\s+(.+)$/i,
    /acciones de\s+(.+)$/i,
    /cliente\s+(.+)$/i,
  ];
  for (const re of patterns) {
    const m = q.match(re);
    if (m && m[1]) {
      let hint = m[1].trim();
      hint = hint.replace(/\s+y\s+qu[eé]\s+acciones.+$/i, "").trim();
      hint = hint.replace(/^(el|la|los|las)\s+/i, "").trim();
      hint = hint.replace(/^cliente\s+/i, "").trim();
      if (hint && !/^(de|del|la|el)$/i.test(hint)) return hint;
    }
  }
  return null;
}

function truncateBody(text, maxChars) {
  const raw = text == null ? "" : String(text);
  if (raw.length <= maxChars) {
    return { text: raw, truncated: false, original_length: raw.length };
  }
  return { text: raw.slice(0, maxChars), truncated: true, original_length: raw.length };
}

function formatTs(value) {
  if (value == null || value === "") return null;
  if (value instanceof Date && !isNaN(value.getTime())) return value.toISOString();
  return String(value);
}

function deriveClienteKeys(plantaId, canal, subcanal, clienteNombre, estado) {
  const groups = new Set(GRUPO_LABELS);
  if (estado) groups.add(String(estado).trim());
  const keys = [];
  for (const grupo of groups) {
    keys.push(buildClienteKey(plantaId, grupo, canal || "", subcanal || "", clienteNombre || ""));
  }
  return [...new Set(keys.filter(Boolean))];
}

function clarification(code, error, status = 400) {
  return {
    ok: false,
    code: DIRECTOR_IA_VERACITY.SOURCE_ERROR,
    status,
    clarification: true,
    clarification_code: code,
    error,
  };
}

async function resolvePlantaRow(client, plantaId) {
  const r = await client.query(`SELECT id, nombre, clave FROM public.plantas WHERE id = $1 LIMIT 1`, [
    plantaId,
  ]);
  return r.rows[0] || null;
}

async function queryPlantCode(client, planta) {
  const nombre = String((planta && planta.nombre) || "").trim();
  const clave = String((planta && planta.clave) || "").trim();
  if (!nombre && !clave) return null;
  const r = await client.query(
    `SELECT plant_code
       FROM arr.dicf_cliente_mes
      WHERE ($1 <> '' AND UPPER(TRIM(plant_code)) = UPPER(TRIM($1)))
         OR ($2 <> '' AND UPPER(TRIM(plant_code)) = UPPER(TRIM($2)))
      ORDER BY year DESC, month DESC
      LIMIT 1`,
    [nombre, clave]
  );
  if (r.rows[0] && r.rows[0].plant_code) return String(r.rows[0].plant_code);
  const r2 = await client.query(
    `SELECT plant_code
       FROM arr.provincia_plants
      WHERE ($1 <> '' AND UPPER(TRIM(plant_code)) = UPPER(TRIM($1)))
         OR ($2 <> '' AND UPPER(TRIM(plant_code)) = UPPER(TRIM($2)))
      LIMIT 1`,
    [nombre, clave]
  );
  return r2.rows[0] && r2.rows[0].plant_code ? String(r2.rows[0].plant_code) : nombre || clave || null;
}

async function queryEntities(client, plantaId) {
  const r = await client.query(
    `SELECT e.id, e.nombre_canonico
       FROM arr.comercial_entidad e
      WHERE e.planta_id = $1 AND e.is_active = true
      ORDER BY e.id ASC`,
    [plantaId]
  );
  const aliases = await client.query(
    `SELECT a.entidad_id, a.alias_nombre
       FROM arr.comercial_entidad_alias a
       JOIN arr.comercial_entidad e ON e.id = a.entidad_id
      WHERE e.planta_id = $1 AND e.is_active = true AND a.verificado = true`,
    [plantaId]
  );
  const byId = new Map();
  for (const row of r.rows || []) {
    byId.set(Number(row.id), {
      id: Number(row.id),
      nombre_canonico: String(row.nombre_canonico || "").trim(),
      aliases: [],
    });
  }
  for (const row of aliases.rows || []) {
    const ent = byId.get(Number(row.entidad_id));
    if (ent && row.alias_nombre) ent.aliases.push(String(row.alias_nombre).trim());
  }
  return [...byId.values()];
}

async function queryCommercialStateRows(client, plantCode) {
  if (!plantCode) return [];
  const latest = await client.query(
    `SELECT year, month
       FROM arr.dicf_cliente_mes
      WHERE UPPER(TRIM(plant_code)) = UPPER(TRIM($1))
      ORDER BY year DESC, month DESC
      LIMIT 1`,
    [plantCode]
  );
  if (!latest.rows[0]) return [];
  const year = Number(latest.rows[0].year);
  const month = Number(latest.rows[0].month);
  const r = await client.query(
    `SELECT plant_code, year, month, cliente_norm, canal, subcanal, estado,
            window_days, last_date, kg_mes_real, kg_mes_forecast, ingreso_forecast,
            es_nuevo, es_recuperable
       FROM arr.dicf_cliente_mes
      WHERE UPPER(TRIM(plant_code)) = UPPER(TRIM($1))
        AND year = $2 AND month = $3
      ORDER BY cliente_norm ASC`,
    [plantCode, year, month]
  );
  return r.rows || [];
}

async function queryCommentsByKeys(client, plantaId, keys) {
  if (!keys.length) return [];
  const r = await client.query(
    `SELECT id, planta_id, cliente_key, cliente_nombre, canal, subcanal, body,
            author_name, created_at
       FROM arr.cliente_comentarios
      WHERE planta_id = $1
        AND is_active = true
        AND cliente_key IS NOT NULL
        AND TRIM(cliente_key) <> ''
        AND cliente_key = ANY($2::text[])
      ORDER BY created_at DESC, id DESC`,
    [plantaId, keys]
  );
  return r.rows || [];
}

async function queryActionsByKeys(client, plantaIds, keys) {
  if (!keys.length || !plantaIds.length) return [];
  const r = await client.query(
    `SELECT a.id, a.public_code, a.planta_id, a.cliente_key, a.cliente_nombre,
            a.canal, a.subcanal, a.grupo_tipo, a.descripcion, a.estado,
            a.fecha_compromiso, a.resultado_cierre, a.cerrado_at, a.created_at,
            COALESCE(NULLIF(TRIM(COALESCE(rp.nombre_persona,'')), ''), rp.nombre) AS responsable
       FROM arr.dicf_acciones a
       LEFT JOIN public.usuarios rp ON rp.id = a.responsable_usuario_id
      WHERE a.planta_id = ANY($1::int[])
        AND a.cliente_key = ANY($2::text[])
      ORDER BY a.created_at DESC, a.id DESC`,
    [plantaIds, keys]
  );
  return r.rows || [];
}

async function queryActionKeysByNombre(client, plantaIds, clienteNombre) {
  const r = await client.query(
    `SELECT DISTINCT cliente_key, cliente_nombre, canal, subcanal
       FROM arr.dicf_acciones
      WHERE planta_id = ANY($1::int[])`,
    [plantaIds]
  );
  const want = normalizeName(clienteNombre);
  return (r.rows || []).filter((row) => normalizeName(row.cliente_nombre) === want);
}

async function queryHistorialForActions(client, actionIds) {
  const ids = [...new Set((actionIds || []).map((x) => Number(x)).filter(Number.isFinite))];
  if (!ids.length) return new Map();
  const r = await client.query(
    `SELECT h.accion_id, h.evento, h.detalle, h.creado_en,
            COALESCE(NULLIF(TRIM(COALESCE(u.nombre_persona,'')), ''), u.nombre) AS actor_nombre
       FROM arr.dicf_accion_historial h
       LEFT JOIN public.usuarios u ON u.id = h.actor_usuario_id
      WHERE h.accion_id = ANY($1::int[])
      ORDER BY h.accion_id ASC, h.creado_en ASC, h.id ASC`,
    [ids]
  );
  const map = new Map();
  for (const row of r.rows || []) {
    const id = Number(row.accion_id);
    if (!map.has(id)) map.set(id, []);
    map.get(id).push(row);
  }
  return map;
}

function namesForEntity(ent) {
  return [ent.nombre_canonico, ...(ent.aliases || [])].filter(Boolean);
}

function entityMatchesHint(ent, hintNorm) {
  if (!hintNorm) return false;
  return namesForEntity(ent).some((n) => {
    const nn = normalizeName(n);
    return nn === hintNorm || hintNorm.includes(nn) || nn.includes(hintNorm);
  });
}

function rowMatchesNames(row, names) {
  const cliente = normalizeName(row.cliente_norm || row.cliente_nombre);
  return names.some((n) => cliente === normalizeName(n));
}

async function resolveUniqueClient(opts) {
  const {
    hint,
    entities,
    stateRows,
    queryActionNames,
    plantaIds,
    canonPlantaId,
  } = opts;

  const mentioned = (entities || []).filter((e) => {
    if (hint) return entityMatchesHint(e, normalizeName(hint));
    return false;
  });

  if (!hint && mentioned.length === 0) {
    const allMentioned = entities || [];
    if (allMentioned.length > 1) {
      return clarification(
        "ambiguous_client",
        "Hay más de un cliente posible. Indica el nombre exacto. No elijo en silencio."
      );
    }
    if (allMentioned.length === 0) {
      return clarification(
        "missing_client",
        "Indica un solo cliente para armar el expediente comercial. No elijo un cliente."
      );
    }
  }

  if (mentioned.length > 1) {
    return clarification(
      "ambiguous_client",
      "El nombre coincide con más de una entidad comercial. Precisa el cliente. No elijo en silencio."
    );
  }

  const resolvedName = mentioned.length === 1 ? mentioned[0].nombre_canonico : hint;
  if (!resolvedName) {
    return clarification(
      "missing_client",
      "Indica un solo cliente para armar el expediente comercial. No elijo un cliente."
    );
  }

  const nameList = mentioned.length === 1 ? namesForEntity(mentioned[0]) : [resolvedName];
  const stateHits = (stateRows || []).filter((row) => rowMatchesNames(row, nameList));
  if (stateHits.length > 1) {
    return clarification(
      "ambiguous_client",
      "El cliente aparece más de una vez (canal/subcanal distintos). Precisa canal o nombre. No elijo en silencio."
    );
  }

  if (stateHits.length === 1) {
    const row = stateHits[0];
    const keys = deriveClienteKeys(
      canonPlantaId,
      row.canal,
      row.subcanal,
      row.cliente_norm || resolvedName,
      row.estado
    );
    return {
      ok: true,
      cliente_nombre: String(row.cliente_norm || resolvedName).trim(),
      canal: String(row.canal || ""),
      subcanal: String(row.subcanal || ""),
      cliente_keys: keys,
      state_row: row,
    };
  }

  const actionNameRows = await queryActionNames(plantaIds, resolvedName);
  const distinctKeys = [...new Set(actionNameRows.map((r) => String(r.cliente_key || "").trim()).filter(Boolean))];
  if (distinctKeys.length > 1) {
    return clarification(
      "ambiguous_client",
      "Hay más de una cliente_key DICF para ese nombre. Precisa el cliente. No elijo en silencio."
    );
  }
  if (distinctKeys.length === 1) {
    const hit = actionNameRows.find((r) => String(r.cliente_key) === distinctKeys[0]);
    return {
      ok: true,
      cliente_nombre: String((hit && hit.cliente_nombre) || resolvedName).trim(),
      canal: String((hit && hit.canal) || ""),
      subcanal: String((hit && hit.subcanal) || ""),
      cliente_keys: distinctKeys,
      state_row: null,
    };
  }

  const keys = deriveClienteKeys(canonPlantaId, "", "", resolvedName, "");
  return {
    ok: true,
    cliente_nombre: String(resolvedName).trim(),
    canal: "",
    subcanal: "",
    cliente_keys: keys,
    state_row: null,
  };
}

function mapComment(row) {
  const cut = truncateBody(row.body, COMMENT_BODY_MAX_CHARS);
  return {
    comment_id: Number(row.id),
    cliente_key: String(row.cliente_key),
    cliente_nombre: String(row.cliente_nombre || ""),
    body: cut.text,
    author: row.author_name != null ? String(row.author_name) : "",
    created_at: formatTs(row.created_at),
    truncated: cut.truncated,
    original_length: cut.original_length,
    source: SOURCE_COMMENTS,
  };
}

function mapAction(row, historyRows) {
  const events = (historyRows || []).slice(0, HISTORY_LIMIT).map((h) => ({
    event: String(h.evento || ""),
    created_at: formatTs(h.creado_en),
    actor: h.actor_nombre != null ? String(h.actor_nombre) : null,
    source: SOURCE_HISTORY,
  }));
  return {
    action_id: Number(row.id),
    public_code: String(row.public_code || ""),
    cliente_key: String(row.cliente_key || ""),
    descripcion: String(row.descripcion || ""),
    estado: String(row.estado || ""),
    responsable: row.responsable != null ? String(row.responsable) : null,
    fecha_compromiso: row.fecha_compromiso != null ? String(row.fecha_compromiso).slice(0, 10) : null,
    created_at: formatTs(row.created_at),
    cerrado_at: formatTs(row.cerrado_at),
    resultado_cierre: row.resultado_cierre != null ? String(row.resultado_cierre).trim() || null : null,
    history: events,
    history_omitted: Math.max(0, (historyRows || []).length - HISTORY_LIMIT),
    source: SOURCE_ACTIONS,
  };
}

function mapState(row) {
  if (!row) return null;
  const year = Number(row.year);
  const month = Number(row.month);
  return {
    cliente_nombre: String(row.cliente_norm || ""),
    canal: String(row.canal || ""),
    subcanal: String(row.subcanal || ""),
    estado_observado: row.estado != null ? String(row.estado) : null,
    periodo: Number.isFinite(year) && Number.isFinite(month) ? `${year}-${String(month).padStart(2, "0")}` : null,
    last_date: row.last_date != null ? String(row.last_date).slice(0, 10) : null,
    kg_mes_real: row.kg_mes_real != null ? Number(row.kg_mes_real) : null,
    kg_mes_forecast: row.kg_mes_forecast != null ? Number(row.kg_mes_forecast) : null,
    ingreso_forecast: row.ingreso_forecast != null ? Number(row.ingreso_forecast) : null,
    es_nuevo: Boolean(row.es_nuevo),
    source: SOURCE_STATE,
  };
}

async function loadCommercialDossierForChat(pool, plantaId, req, opts = {}) {
  const auth = (req && req.dashboardAuth) || opts.auth || {};
  const missing = requirePlantaId(plantaId);
  if (missing) return missing;
  const denied = assertCommercialDossierAccess(auth, Number(plantaId));
  if (!denied.ok) return denied;

  const question = opts.question != null ? String(opts.question) : String((req && req.body && req.body.question) || "");
  const hint = extractClientHint(question);
  const canonPlantaId = getCanonicalPlantaId(Number(plantaId));
  const plantaIds = getPlantaIdsEquivalentes(Number(plantaId));

  const resolvePlanta = opts.resolvePlanta || resolvePlantaRow;
  const resolveCode = opts.queryPlantCode || queryPlantCode;
  const loadEntities = opts.queryEntities || queryEntities;
  const loadState = opts.queryCommercialStateRows || queryCommercialStateRows;
  const loadComments = opts.queryCommentsByKeys || queryCommentsByKeys;
  const loadActions = opts.queryActionsByKeys || queryActionsByKeys;
  const loadActionNames = opts.queryActionKeysByNombre || queryActionKeysByNombre;
  const loadHist = opts.queryHistorialForActions || queryHistorialForActions;

  async function run(client) {
    const planta = await resolvePlanta(client, Number(plantaId));
    const plantaNombre = planta && planta.nombre ? String(planta.nombre) : null;
    const plantCode = await resolveCode(client, planta || {});
    const entities = await loadEntities(client, Number(plantaId));
    const stateRows = await loadState(client, plantCode);

    const resolved = await resolveUniqueClient({
      hint,
      entities,
      stateRows,
      queryActionNames: (ids, name) => loadActionNames(client, ids, name),
      plantaIds,
      canonPlantaId,
    });
    if (!resolved.ok) return resolved;

    const keys = resolved.cliente_keys || [];
    const commentsRaw = await loadComments(client, Number(plantaId), keys);
    const commentsLinked = (commentsRaw || []).filter(
      (c) => c.cliente_key != null && String(c.cliente_key).trim() !== ""
    );
    const commentsMapped = commentsLinked.map(mapComment);
    const comments = commentsMapped.slice(0, COMMENT_LIMIT);

    const actionsRaw = await loadActions(client, plantaIds, keys);
    const actionsCut = (actionsRaw || []).slice(0, ACTION_LIMIT);
    const histMap = await loadHist(
      client,
      actionsCut.map((a) => a.id)
    );
    const actions = actionsCut.map((a) => mapAction(a, histMap.get(Number(a.id)) || []));

    const anyTrunc = comments.some((c) => c.truncated);
    return {
      ok: true,
      found: true,
      planta_id: Number(plantaId),
      planta_nombre: plantaNombre,
      client_identity: {
        cliente_nombre: resolved.cliente_nombre,
        cliente_keys: keys,
        canal: resolved.canal,
        subcanal: resolved.subcanal,
        source: "planta_id+cliente_key",
      },
      commercial_state: mapState(resolved.state_row),
      comments,
      comments_count: commentsMapped.length,
      comments_omitted: Math.max(0, commentsMapped.length - COMMENT_LIMIT),
      dicf_actions: actions,
      actions_count: (actionsRaw || []).length,
      actions_omitted: Math.max(0, (actionsRaw || []).length - ACTION_LIMIT),
      truncated: anyTrunc || commentsMapped.length > COMMENT_LIMIT || (actionsRaw || []).length > ACTION_LIMIT,
      retrieved_at: new Date().toISOString(),
      sources: [SOURCE_STATE, SOURCE_COMMENTS, SOURCE_ACTIONS, SOURCE_HISTORY],
      semantic_class: SEMANTIC_CLASS,
      limits: {
        clients: CLIENT_LIMIT,
        comments: COMMENT_LIMIT,
        chars_per_comment: COMMENT_BODY_MAX_CHARS,
        actions: ACTION_LIMIT,
        history_events: HISTORY_LIMIT,
      },
    };
  }

  if (typeof opts.run === "function") {
    return opts.run(run);
  }
  if (
    opts.queryEntities ||
    opts.queryCommercialStateRows ||
    opts.queryCommentsByKeys ||
    opts.queryActionsByKeys
  ) {
    return run({ query: async () => ({ rows: [] }) });
  }
  if (!pool) return sourceError("Pool no configurado");
  const client = await pool.connect();
  try {
    return await run(client);
  } catch (e) {
    return sourceError(e.message || "Error al cargar expediente comercial");
  } finally {
    client.release();
  }
}

function buildCommercialDossierAnswer(payload) {
  if (!payload || payload.ok !== true) {
    return (payload && payload.error) || "No pude armar el expediente comercial.";
  }
  const name = payload.client_identity && payload.client_identity.cliente_nombre;
  const scope = payload.planta_nombre || `planta ${payload.planta_id}`;
  const lines = [
    `Expediente comercial factual de ${name} en ${scope}.`,
    "Hechos observados por fuente. No infiero causa, motivo, solución ni responsable del desempeño.",
  ];

  const st = payload.commercial_state;
  if (!st) {
    lines.push(
      "Estado comercial: no hay fila materializada para este cliente en el periodo consultado. Eso no implica que el cliente esté inactivo."
    );
  } else {
    lines.push(
      `El estado observado es ${st.estado_observado || "sin estado almacenado"}` +
        (st.periodo ? ` (periodo ${st.periodo}` : "") +
        (st.last_date ? `; datos hasta ${st.last_date}` : "") +
        (st.periodo ? ")" : "") +
        `. Fuente ${SOURCE_STATE}.`
    );
  }

  if (!payload.comments.length) {
    lines.push(
      `Comentarios: no se encontraron comentarios enlazables con cliente_key. Eso no significa que nadie haya comentado jamás. Fuente ${SOURCE_COMMENTS}.`
    );
  } else {
    const overflow =
      payload.comments_omitted > 0
        ? ` Se omitieron ${payload.comments_omitted} por el límite de ${COMMENT_LIMIT}.`
        : "";
    lines.push(`Comentarios registrados (${payload.comments.length}).${overflow} Fuente ${SOURCE_COMMENTS}.`);
    payload.comments.forEach((c, i) => {
      const trunc = c.truncated ? " [texto truncado]" : "";
      const author = c.author ? c.author : "(autor no almacenado)";
      lines.push(`${i + 1}. Hay un comentario registrado (${c.created_at || "sin fecha"}; ${author}): ${c.body}${trunc}`);
    });
  }

  if (!payload.dicf_actions.length) {
    lines.push(
      `Acciones DICF: no se encontraron acciones para la cliente_key consultada. Eso no significa que no exista seguimiento fuera de DICF. Fuente ${SOURCE_ACTIONS}.`
    );
  } else {
    const overflow =
      payload.actions_omitted > 0
        ? ` Se omitieron ${payload.actions_omitted} por el límite de ${ACTION_LIMIT}.`
        : "";
    lines.push(`Acciones DICF registradas (${payload.dicf_actions.length}).${overflow} Fuente ${SOURCE_ACTIONS}.`);
    payload.dicf_actions.forEach((a, i) => {
      lines.push(
        `${i + 1}. Existe una acción registrada ${a.public_code || a.action_id} (${a.estado || "sin estado"}; responsable de la acción: ${a.responsable || "no almacenado"}): ${a.descripcion}`
      );
      if (a.resultado_cierre) {
        lines.push(`   El resultado de cierre registrado es: ${a.resultado_cierre}`);
      } else {
        lines.push("   Sin resultado_cierre almacenado. Eso no se interpreta como fracaso.");
      }
      if (!a.history.length) {
        lines.push("   Historial: no se encontraron eventos físicos para esta acción.");
      } else {
        a.history.forEach((h) => {
          lines.push(`   Historial ${h.created_at || ""} ${h.event}${h.actor ? ` (${h.actor})` : ""}`);
        });
      }
    });
  }

  return lines.join("\n");
}

function buildCommercialDossierChatResult(payload, opts = {}) {
  const planta_id = opts.planta_id != null ? Number(opts.planta_id) : payload && payload.planta_id;
  const okPayload = payload && payload.ok === true;
  const answer = buildCommercialDossierAnswer(payload);
  let veracity = DIRECTOR_IA_VERACITY.SOURCE_AVAILABLE;
  if (!okPayload) {
    if (payload && payload.code === DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED) {
      veracity = DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED;
    } else {
      veracity = DIRECTOR_IA_VERACITY.SOURCE_ERROR;
    }
  }
  return {
    ok: true,
    answer,
    sources: okPayload ? payload.sources : [],
    context_meta: {
      mode: "expediente_comercial",
      requested_domain: "commercial_dossier",
      openai_called: false,
      veracity,
      semantic_class: SEMANTIC_CLASS,
      planta_id,
      timestamp: new Date().toISOString(),
    },
    commercial_dossier: okPayload
      ? {
          semantic_class: payload.semantic_class,
          client_identity: payload.client_identity,
          commercial_state: payload.commercial_state,
          comments: payload.comments,
          dicf_actions: payload.dicf_actions,
          limits: payload.limits,
          truncated: payload.truncated,
          sources: payload.sources,
          retrieved_at: payload.retrieved_at,
        }
      : null,
    limitation:
      !okPayload && veracity !== DIRECTOR_IA_VERACITY.SOURCE_AVAILABLE
        ? { code: veracity, domain: "commercial_dossier", label: "Expediente comercial" }
        : undefined,
  };
}

module.exports = {
  SEMANTIC_CLASS,
  SOURCE_STATE,
  SOURCE_COMMENTS,
  SOURCE_ACTIONS,
  SOURCE_HISTORY,
  CLIENT_LIMIT,
  COMMENT_LIMIT,
  COMMENT_BODY_MAX_CHARS,
  ACTION_LIMIT,
  HISTORY_LIMIT,
  GRUPO_LABELS,
  assertCommercialDossierAccess,
  isCommercialStateListWording,
  isExpedienteComercialQuestion,
  extractClientHint,
  deriveClienteKeys,
  truncateBody,
  loadCommercialDossierForChat,
  buildCommercialDossierAnswer,
  buildCommercialDossierChatResult,
};
