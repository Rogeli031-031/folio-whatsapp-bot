"use strict";

/**
 * Memoria operativa persistente del chat legado — pending_work_items_only.
 * MEMORY = contexto para retomar trabajo. No es evidencia. No es EKS/IES/N5.
 */

const {
  normalizeText,
  extractEntityHint,
  INHERITABLE_INTENTS,
} = require("./director-ia-conversation-state");

const STATUSES = Object.freeze(["active", "resolved", "superseded", "stale", "dismissed"]);
const ENTITY_TYPE = "client";
const MAX_RETRIEVE = 3;

const GLOBAL_ROLES = new Set(["ZP", "AD", "CF_CDMX"]);

function resolveUserScopeKey(req, user) {
  const auth = req && req.dashboardAuth;
  const candidates = [
    auth && auth.actor_id,
    user && user.actor_id,
    user && user.usuario_id,
    user && user.id,
  ];
  for (const c of candidates) {
    if (c == null || c === "") continue;
    const n = Number(c);
    if (Number.isFinite(n) && n > 0) return `usuario:${n}`;
    const s = String(c).trim();
    if (s) return `usuario:${s}`;
  }
  return null;
}

function isPlantCurrentlyAuthorized(req, plantaId) {
  const auth = req && req.dashboardAuth;
  if (!auth || typeof auth !== "object") return false;
  const role = String(auth.role || "")
    .trim()
    .toUpperCase();
  if (!role) return false;
  const pid = Number(plantaId);
  if (!Number.isFinite(pid) || pid <= 0) return false;
  if (GLOBAL_ROLES.has(role)) return true;
  const allowed = (auth.plantas_permitidas || []).map((x) => Number(x)).filter(Number.isFinite);
  return allowed.includes(pid);
}

function extractResumeEntityHint(question) {
  const raw = String(question || "").trim();
  if (!raw) return null;
  const paso = raw.match(/pas[oó]\s+con\s+(.+?)(?:\s*[?¿!.]*)$/i);
  if (paso && paso[1] && !/^(el|ella|eso|esto|este|esta)\b/i.test(paso[1].trim())) {
    return paso[1].replace(/[?¿!.]+$/g, "").trim();
  }
  const quedoDe = raw.match(/qued[oó]\s+lo\s+de\s+(.+?)(?:\s*[?¿!.]*)$/i);
  if (quedoDe && quedoDe[1]) {
    return quedoDe[1].replace(/[?¿!.]+$/g, "").trim();
  }
  const seguimos = raw.match(/seguimos\s+con\s+(.+?)(?:\s*[?¿!.]*)$/i);
  if (seguimos && seguimos[1] && !/^(el|ella|eso)\b/i.test(seguimos[1].trim())) {
    return seguimos[1].replace(/[?¿!.]+$/g, "").trim();
  }
  const revisando = raw.match(/revisando\s+(.+?)(?:\s*[?¿!.]*)$/i);
  if (revisando && revisando[1]) {
    return revisando[1].replace(/[?¿!.]+$/g, "").trim();
  }
  const loDe = raw.match(/\blo\s+de\s+(.+?)(?:\s*[?¿!.]*)$/i);
  if (loDe && loDe[1]) {
    return loDe[1].replace(/[?¿!.]+$/g, "").trim();
  }
  return extractEntityHint(raw);
}

function classifyPersistentMemoryTurn(question) {
  const q = normalizeText(question);
  if (!q) return { kind: "none", entity_hint: null };

  if (
    /^(olvid(a|e)|olvidalo|olvidalo)\b/.test(q) ||
    /^descarta(r)?( el| este)? pendiente\b/.test(q) ||
    /\bno (lo )?recuerdes\b/.test(q) ||
    /^descarta lo de\b/.test(q)
  ) {
    return { kind: "dismiss", entity_hint: extractResumeEntityHint(question) };
  }

  if (/^recuerdame\b/.test(q) || /^guarda (esto|este pendiente|lo)\b/.test(q)) {
    return { kind: "remember", entity_hint: extractResumeEntityHint(question) };
  }

  if (
    /\bque paso con\b/.test(q) ||
    /\ben que quedo\b/.test(q) ||
    /\bseguimos con\b/.test(q) ||
    /\bque quedo pendiente\b/.test(q) ||
    (/\bretomar\b/.test(q) && /\b(pendiente|lo de)\b/.test(q))
  ) {
    return { kind: "resume", entity_hint: extractResumeEntityHint(question) };
  }

  return { kind: "none", entity_hint: null };
}

function sanitizeGapForPersist(gap) {
  const missing = Array.isArray(gap && gap.missing_fields)
    ? gap.missing_fields.map((x) => String(x)).filter((f) => f && !/SOURCE_RESTRICTED/i.test(f))
    : [];
  const unique = [...new Set(missing)].slice(0, 12);
  return {
    missing_fields: unique,
    why_blocks:
      gap && gap.why_blocks
        ? String(gap.why_blocks).slice(0, 400)
        : "Quedó pendiente un hecho observado que no estaba en las fuentes.",
    physical_source: gap && gap.physical_source ? String(gap.physical_source).slice(0, 120) : null,
  };
}

function isObjectiveGap(gap) {
  const clean = sanitizeGapForPersist(gap);
  return clean.missing_fields.length > 0;
}

function gapFingerprint(gap) {
  const clean = sanitizeGapForPersist(gap);
  return clean.missing_fields
    .map((f) => normalizeText(f))
    .filter(Boolean)
    .sort()
    .join("|");
}

function entityKeyOf(entity) {
  if (!entity) return null;
  if (entity.cliente_key) return String(entity.cliente_key).trim();
  const keys = Array.isArray(entity.cliente_keys) ? entity.cliente_keys : [];
  if (keys[0]) return String(keys[0]).trim();
  const display = String(entity.display || entity.entity_display || "").trim();
  if (!display) return null;
  return `name:${normalizeText(display)}`;
}

function shouldAutoCreate(opts) {
  const intent = opts && opts.parent_intent;
  if (!INHERITABLE_INTENTS.includes(intent)) return false;
  if (!opts.plantaAuthorized) return false;
  if (!opts.userScopeKey) return false;
  if (!opts.entity || opts.entityResolutionStatus !== "unique") return false;
  if (!entityKeyOf(opts.entity)) return false;
  if (!isObjectiveGap(opts.gap)) return false;
  return true;
}

function actionLooksClosed(entity) {
  const a = entity && entity.latest_action;
  if (!a || typeof a !== "object") return false;
  const st = normalizeText(a.estatus || a.status || a.estado || "");
  if (st === "closed" || st === "cerrada" || st === "cerrado" || st === "cerradas") return true;
  return a.cerrada === true || a.closed === true;
}

function revalidateWorkItem(item, opts) {
  const entityStatus = opts && opts.entityResolutionStatus;
  if (entityStatus !== "unique") {
    return { next_status: "stale", reason: "entity_not_unique" };
  }
  if (opts && opts.freshGapClosed) {
    return { next_status: "resolved", reason: "gap_closed_by_current_evidence" };
  }
  if (opts && opts.currentActionClosed) {
    return { next_status: "superseded", reason: "current_data_changed" };
  }
  return { next_status: "active", reason: "still_open" };
}

function freshGapClosesStored(storedGap, freshGap, entity) {
  const stored = sanitizeGapForPersist(storedGap);
  const fresh = sanitizeGapForPersist(freshGap);
  if (!stored.missing_fields.length) return false;
  const still = stored.missing_fields.filter((f) => fresh.missing_fields.includes(f));
  const cov = entity && entity.coverage_status;
  const coverageKnown = cov && cov !== "coverage_unknown" && cov !== "without_action";
  if (coverageKnown && still.length === 0) return true;
  if (still.length === 0 && fresh.missing_fields.length === 0) return true;
  return false;
}

function rowToItem(row) {
  if (!row) return null;
  return {
    id: row.id,
    user_scope_key: row.user_scope_key,
    planta_id: Number(row.planta_id),
    entity_type: row.entity_type || ENTITY_TYPE,
    entity_key: row.entity_key,
    entity_display: row.entity_display,
    parent_intent: row.parent_intent,
    pending_information_gap: row.pending_information_gap,
    gap_fingerprint: row.gap_fingerprint,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
    last_revalidated_at: row.last_revalidated_at,
  };
}

function matchesEntityHint(item, hint) {
  if (!hint) return true;
  const h = normalizeText(hint);
  if (!h) return true;
  const display = normalizeText(item.entity_display);
  const key = normalizeText(item.entity_key);
  const tokens = h.split(" ").filter(Boolean);
  if (display === h || key === h) return true;
  if (tokens.every((t) => display.split(" ").includes(t))) return true;
  if (key.includes(h)) return true;
  return false;
}

function forbiddenPersistKeys(obj) {
  if (!obj || typeof obj !== "object") return [];
  return [
    "raw_history",
    "history",
    "transcript",
    "assistant_answer",
    "evidence_payload",
    "llm_hypothesis",
    "authorization_snapshot",
    "full_context",
  ].filter((k) => Object.prototype.hasOwnProperty.call(obj, k));
}

function formatWorkItemHiloForModel(item) {
  const gap = item && item.pending_information_gap;
  const missing = (gap && gap.missing_fields) || [];
  const lines = [
    "PENDIENTE DE TRABAJO (memoria operativa; NO es evidencia de base de datos; NO afirma el estado actual del cliente, la acción, la venta ni el responsable):",
    `asunto=${item && item.entity_display ? item.entity_display : "entidad"}`,
    `quedó_pendiente=${missing.join(" | ") || "un hecho no observado"}`,
    gap && gap.why_blocks ? `contexto_de_trabajo=${gap.why_blocks}` : null,
    "Reconsulté las fuentes de ESTE turno. El dato actual prevalece sobre este pendiente.",
    "No digas que el cliente «sigue sin comprar» u otro hecho mutable solo porque quedó pendiente ayer.",
    "Si el pendiente sigue abierto puedes decir que la última vez dejamos pendiente conocer X y que revisaste de nuevo.",
    "Persona: solo si aparece con vínculo físico en la evidencia FRESCA de este turno.",
  ];
  return lines.filter(Boolean).join("\n");
}

function createInMemoryStore() {
  const rows = [];
  let seq = 1;

  function findActiveEquivalent(item) {
    return rows.find(
      (r) =>
        r.status === "active" &&
        r.user_scope_key === item.user_scope_key &&
        Number(r.planta_id) === Number(item.planta_id) &&
        r.entity_key === item.entity_key &&
        r.parent_intent === item.parent_intent &&
        r.gap_fingerprint === item.gap_fingerprint
    );
  }

  return {
    kind: "memory",
    _rows: rows,
    async upsertActive(item) {
      const now = new Date().toISOString();
      const existing = findActiveEquivalent(item);
      if (existing) {
        existing.pending_information_gap = item.pending_information_gap;
        existing.entity_display = item.entity_display;
        existing.updated_at = now;
        return rowToItem(existing);
      }
      const row = {
        id: seq++,
        user_scope_key: item.user_scope_key,
        planta_id: Number(item.planta_id),
        entity_type: ENTITY_TYPE,
        entity_key: item.entity_key,
        entity_display: item.entity_display,
        parent_intent: item.parent_intent,
        pending_information_gap: item.pending_information_gap,
        gap_fingerprint: item.gap_fingerprint,
        status: "active",
        created_at: now,
        updated_at: now,
        last_revalidated_at: null,
      };
      rows.push(row);
      return rowToItem(row);
    },
    async listActive(filter) {
      const hint = filter.entityHint;
      return rows
        .filter(
          (r) =>
            r.status === "active" &&
            r.user_scope_key === filter.userScopeKey &&
            Number(r.planta_id) === Number(filter.plantaId) &&
            matchesEntityHint(r, hint)
        )
        .sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)))
        .slice(0, filter.limit || MAX_RETRIEVE)
        .map(rowToItem);
    },
    async updateStatus(id, status, extra) {
      if (!STATUSES.includes(status)) throw new Error("status inválido");
      const row = rows.find((r) => r.id === id);
      if (!row) return null;
      row.status = status;
      row.updated_at = new Date().toISOString();
      if (extra && extra.last_revalidated_at) row.last_revalidated_at = extra.last_revalidated_at;
      else if (status !== "dismissed") row.last_revalidated_at = row.updated_at;
      return rowToItem(row);
    },
    async touchRevalidated(id) {
      const row = rows.find((r) => r.id === id);
      if (!row) return null;
      const now = new Date().toISOString();
      row.last_revalidated_at = now;
      row.updated_at = now;
      return rowToItem(row);
    },
  };
}

function createPgStore(pool) {
  return {
    kind: "pg",
    async upsertActive(item) {
      const sql = `
        INSERT INTO arr.director_ia_pending_work_items (
          user_scope_key, planta_id, entity_type, entity_key, entity_display,
          parent_intent, pending_information_gap, gap_fingerprint, status
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'active')
        ON CONFLICT (user_scope_key, planta_id, entity_key, parent_intent, gap_fingerprint)
          WHERE status = 'active'
        DO UPDATE SET
          pending_information_gap = EXCLUDED.pending_information_gap,
          entity_display = EXCLUDED.entity_display,
          updated_at = now()
        RETURNING *`;
      const r = await pool.query(sql, [
        item.user_scope_key,
        item.planta_id,
        ENTITY_TYPE,
        item.entity_key,
        item.entity_display,
        item.parent_intent,
        item.pending_information_gap,
        item.gap_fingerprint,
      ]);
      return rowToItem(r.rows[0]);
    },
    async listActive(filter) {
      const r = await pool.query(
        `SELECT * FROM arr.director_ia_pending_work_items
         WHERE user_scope_key = $1 AND planta_id = $2 AND status = 'active'
         ORDER BY updated_at DESC
         LIMIT $3`,
        [filter.userScopeKey, filter.plantaId, filter.limit || MAX_RETRIEVE]
      );
      return (r.rows || [])
        .map(rowToItem)
        .filter((item) => matchesEntityHint(item, filter.entityHint))
        .slice(0, filter.limit || MAX_RETRIEVE);
    },
    async updateStatus(id, status, extra) {
      if (!STATUSES.includes(status)) throw new Error("status inválido");
      const r = await pool.query(
        `UPDATE arr.director_ia_pending_work_items
         SET status = $2, updated_at = now(),
             last_revalidated_at = COALESCE($3, now())
         WHERE id = $1
         RETURNING *`,
        [id, status, extra && extra.last_revalidated_at ? extra.last_revalidated_at : null]
      );
      return rowToItem(r.rows[0]);
    },
    async touchRevalidated(id) {
      const r = await pool.query(
        `UPDATE arr.director_ia_pending_work_items
         SET last_revalidated_at = now(), updated_at = now()
         WHERE id = $1
         RETURNING *`,
        [id]
      );
      return rowToItem(r.rows[0]);
    },
  };
}

async function upsertActiveWorkItem(store, raw) {
  if (!store || typeof store.upsertActive !== "function") return null;
  const gap = sanitizeGapForPersist(raw.pending_information_gap);
  const fp = gapFingerprint(gap);
  if (!fp) return null;
  const item = {
    user_scope_key: raw.user_scope_key,
    planta_id: Number(raw.planta_id),
    entity_key: raw.entity_key,
    entity_display: String(raw.entity_display || "").trim(),
    parent_intent: raw.parent_intent,
    pending_information_gap: gap,
    gap_fingerprint: fp,
  };
  if (forbiddenPersistKeys(item).length) return null;
  if (!item.user_scope_key || !item.entity_key || !item.entity_display) return null;
  if (!INHERITABLE_INTENTS.includes(item.parent_intent)) return null;
  try {
    return await store.upsertActive(item);
  } catch (e) {
    return null;
  }
}

async function retrieveActiveWorkItems(store, filter) {
  if (!store || typeof store.listActive !== "function") return [];
  if (!filter || !filter.userScopeKey || !filter.plantaId) return [];
  try {
    return await store.listActive({
      userScopeKey: filter.userScopeKey,
      plantaId: Number(filter.plantaId),
      entityHint: filter.entityHint || null,
      limit: Math.min(MAX_RETRIEVE, Number(filter.limit) || MAX_RETRIEVE),
    });
  } catch (e) {
    return [];
  }
}

async function updateWorkItemStatus(store, id, status) {
  if (!store || typeof store.updateStatus !== "function") return null;
  try {
    return await store.updateStatus(id, status, { last_revalidated_at: new Date().toISOString() });
  } catch (e) {
    return null;
  }
}

async function markRevalidated(store, id) {
  if (!store || typeof store.touchRevalidated !== "function") return null;
  try {
    return await store.touchRevalidated(id);
  } catch (e) {
    return null;
  }
}

async function dismissMatching(store, filter) {
  const items = await retrieveActiveWorkItems(store, filter);
  const out = [];
  for (const it of items) {
    const updated = await updateWorkItemStatus(store, it.id, "dismissed");
    if (updated) out.push(updated);
  }
  return out;
}

function buildWorkItemFromEntity(opts) {
  const entity = opts.entity;
  const key = entityKeyOf(entity);
  const display = String((entity && entity.display) || "").trim();
  if (!key || !display) return null;
  return {
    user_scope_key: opts.userScopeKey,
    planta_id: opts.plantaId,
    entity_key: key,
    entity_display: display,
    parent_intent: opts.parent_intent,
    pending_information_gap: opts.gap,
  };
}

function prependWorkItemToUserContent(userContent, item) {
  if (!item) return userContent || "";
  return `${formatWorkItemHiloForModel(item)}\n\n${userContent || ""}`;
}

module.exports = {
  STATUSES,
  MAX_RETRIEVE,
  ENTITY_TYPE,
  resolveUserScopeKey,
  isPlantCurrentlyAuthorized,
  extractResumeEntityHint,
  classifyPersistentMemoryTurn,
  sanitizeGapForPersist,
  isObjectiveGap,
  gapFingerprint,
  entityKeyOf,
  shouldAutoCreate,
  actionLooksClosed,
  revalidateWorkItem,
  freshGapClosesStored,
  matchesEntityHint,
  forbiddenPersistKeys,
  formatWorkItemHiloForModel,
  prependWorkItemToUserContent,
  createInMemoryStore,
  createPgStore,
  upsertActiveWorkItem,
  retrieveActiveWorkItems,
  updateWorkItemStatus,
  markRevalidated,
  dismissMatching,
  buildWorkItemFromEntity,
};
