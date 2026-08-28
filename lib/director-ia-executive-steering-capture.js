"use strict";

/**
 * EXECUTIVE_STEERING_CAPTURE — first physical slice.
 * Domain store only. No HTTP. No Plaud. No IES. No AR/IGF/ARR/FINAL mutation.
 * RECORDED = attestation exists. Not truth, confirm, forecast, actual, or FINAL.
 */

const EVENT_TYPES = Object.freeze([
  "PROPOSAL",
  "DECISION",
  "COMMITMENT",
  "HUMAN_DECLARED_CAUSE",
  "CORRECTION",
]);
const ATTESTATION_STATE = "RECORDED";
const SCOPE_KINDS = Object.freeze(["PLANT", "MULTI_PLANT", "ZONE", "OTHER_EXPLICIT", "UNKNOWN"]);
const DECLARED_KINDS = Object.freeze(["KNOWN_USER", "KNOWN_ROLE", "FREE_TEXT_SPEAKER", "UNKNOWN"]);
const SOURCE_TYPES = Object.freeze([
  "MANUAL",
  "DIRECTOR_IA_CONVERSATION",
  "PLAUD_FUTURE",
  "UPLOADED_NOTES",
  "BITACORA",
  "OTHER",
]);
const VALUE_MODES = Object.freeze(["ABSOLUTE", "DELTA", "UNKNOWN"]);
const PERIOD_KINDS = Object.freeze(["YYYY_MM", "DATE", "RANGE", "UNKNOWN"]);
const DECISION_OUTCOMES = Object.freeze(["accepted", "rejected", "pending"]);
const RELATION_KINDS = Object.freeze(["REFERS_PROPOSAL", "CORRECTS", "SUPERSEDES"]);
const ZP_ALIASES = Object.freeze(["ZP", "DIR_ZP", "DIRZP", "DIRECTORZP", "DIRECTOR_ZP", "DZP", "DIR-ZP"]);
const STEERING_ROLES = Object.freeze(["ZP", "AD", "GG"]);

const CODES = Object.freeze({
  UNAUTHORIZED: "STEERING_UNAUTHORIZED",
  INVALID_TYPE: "STEERING_INVALID_EVENT_TYPE",
  INVALID_STATE: "STEERING_INVALID_ATTESTATION_STATE",
  INVALID_SCOPE: "STEERING_INVALID_SCOPE",
  INVALID_INPUT: "STEERING_INVALID_INPUT",
  ZONE_UNRESOLVED: "STEERING_ZONE_UNRESOLVED",
  SCOPE_DENIED: "STEERING_SCOPE_DENIED",
  NOT_FOUND: "STEERING_NOT_FOUND",
  DELETE_FORBIDDEN: "STEERING_DELETE_FORBIDDEN",
  UPDATE_FORBIDDEN: "STEERING_UPDATE_FORBIDDEN",
  RELATION_INVALID: "STEERING_RELATION_INVALID",
});

function fail(code, extra) {
  return { ok: false, code, persisted: false, ...(extra || {}) };
}

function roleNorm(raw) {
  return String(raw == null ? "" : raw).replace(/\s+/g, "").toUpperCase();
}

function dashboardAuthRoleNorm(auth) {
  if (!auth || auth.role == null || auth.role === "") return "";
  return roleNorm(auth.role);
}

function isUsuariosAccessKey(auth) {
  if (!auth) return false;
  if (auth.usuarios_admin === true) return true;
  if (String(auth.admin_function || "").toUpperCase() === "USUARIOS") return true;
  if (auth.access_key_usuarios === true) return true;
  if (roleNorm(auth.role) === "USUARIOS") return true;
  return false;
}

/**
 * Steering ZP = documented clave/alias only. actor_nombre never elevates.
 * Dashboard name-heuristic helper is intentionally not imported.
 */
function isGovernedZpClave(clave) {
  return ZP_ALIASES.includes(roleNorm(clave));
}

/**
 * Authority class for this domain. Real rol_clave wins over JWT collapse to GG.
 */
function steeringAuthorityClass(auth) {
  if (!auth) return "NONE";
  if (
    isUsuariosAccessKey(auth) &&
    !isGovernedZpClave(auth.rol_clave || auth.role) &&
    dashboardAuthRoleNorm(auth) !== "AD" &&
    dashboardAuthRoleNorm(auth) !== "GG" &&
    !isGovernedZpClave(auth.role)
  ) {
    return "NONE";
  }
  if (isUsuariosAccessKey(auth) && !auth.role && !auth.rol_clave) return "NONE";

  const realClave = auth.rol_clave != null && String(auth.rol_clave).trim() !== "" ? roleNorm(auth.rol_clave) : "";
  if (realClave && !STEERING_ROLES.includes(realClave) && !ZP_ALIASES.includes(realClave)) {
    return "NONE";
  }
  if (isGovernedZpClave(auth.role) || isGovernedZpClave(realClave)) return "ZP";
  const jwtRole = dashboardAuthRoleNorm(auth);
  if (jwtRole === "AD" && (!realClave || realClave === "AD")) return "AD";
  if (jwtRole === "GG" && (!realClave || realClave === "GG")) return "GG";
  if (realClave === "AD") return "AD";
  if (realClave === "GG") return "GG";
  return "NONE";
}

function assignedPlantIds(auth) {
  return (auth && auth.plantas_permitidas ? auth.plantas_permitidas : [])
    .map((x) => Number(x))
    .filter((n) => Number.isFinite(n) && n > 0);
}

function uniquePlantIds(ids) {
  const out = [];
  const seen = new Set();
  for (const raw of ids || []) {
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0 || seen.has(n)) continue;
    seen.add(n);
    out.push(n);
  }
  return out;
}

function eventScopePlantIds(input) {
  const kind = String(input.scope_kind || "");
  if (kind === "PLANT") {
    const pid = Number(input.plant_id);
    return Number.isFinite(pid) && pid > 0 ? [pid] : [];
  }
  return uniquePlantIds(input.plant_ids || input.zone_plant_ids || []);
}

/**
 * Full-scope authorization. Authz before any write.
 * ZONE without a demonstrable plant set is unresolved → GG deny.
 */
function authorizeSteeringScope(auth, input) {
  const klass = steeringAuthorityClass(auth);
  if (klass === "NONE") return { ok: false, code: CODES.UNAUTHORIZED };
  const kind = String(input.scope_kind || "");
  if (!SCOPE_KINDS.includes(kind)) return { ok: false, code: CODES.INVALID_SCOPE };

  if (klass === "ZP" || klass === "AD") return { ok: true, klass, scope: "ALL_PLANTS" };

  const assigned = assignedPlantIds(auth);
  const plants = eventScopePlantIds(input);

  if (kind === "PLANT") {
    if (plants.length !== 1) return { ok: false, code: CODES.INVALID_SCOPE };
    if (!assigned.includes(plants[0])) return { ok: false, code: CODES.SCOPE_DENIED };
    return { ok: true, klass, scope: "ASSIGNED_PLANTS" };
  }

  if (kind === "MULTI_PLANT") {
    if (plants.length < 1) return { ok: false, code: CODES.INVALID_SCOPE };
    if (!plants.every((p) => assigned.includes(p))) return { ok: false, code: CODES.SCOPE_DENIED };
    return { ok: true, klass, scope: "ASSIGNED_PLANTS" };
  }

  if (kind === "ZONE") {
    if (plants.length < 1) return { ok: false, code: CODES.ZONE_UNRESOLVED };
    if (!plants.every((p) => assigned.includes(p))) return { ok: false, code: CODES.SCOPE_DENIED };
    return { ok: true, klass, scope: "ASSIGNED_PLANTS" };
  }

  if (kind === "OTHER_EXPLICIT" || kind === "UNKNOWN") {
    if (plants.length < 1) return { ok: false, code: CODES.ZONE_UNRESOLVED };
    if (!plants.every((p) => assigned.includes(p))) return { ok: false, code: CODES.SCOPE_DENIED };
    return { ok: true, klass, scope: "ASSIGNED_PLANTS" };
  }

  return { ok: false, code: CODES.SCOPE_DENIED };
}

function canViewSteeringScope(auth, input) {
  return authorizeSteeringScope(auth, input).ok === true;
}

function canRecordSteeringScope(auth, input) {
  return authorizeSteeringScope(auth, input).ok === true;
}

function capturedByUsuarioId(auth) {
  const id = auth && (auth.actor_id != null ? auth.actor_id : auth.usuario_id);
  const n = Number(id);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function validateRecordInput(input) {
  const body = input && typeof input === "object" ? input : {};
  const event_type = String(body.event_type || "");
  if (!EVENT_TYPES.includes(event_type)) return fail(CODES.INVALID_TYPE, { event_type });
  if (body.attestation_state != null && String(body.attestation_state) !== ATTESTATION_STATE) {
    return fail(CODES.INVALID_STATE);
  }
  const raw_text = String(body.raw_text || "").trim();
  if (!raw_text) return fail(CODES.INVALID_INPUT, { field: "raw_text" });

  const scope_kind = String(body.scope_kind || "");
  if (!SCOPE_KINDS.includes(scope_kind)) return fail(CODES.INVALID_SCOPE);

  let plant_id = body.plant_id != null ? Number(body.plant_id) : null;
  if (plant_id != null && (!Number.isFinite(plant_id) || plant_id <= 0)) plant_id = null;
  const plant_ids = uniquePlantIds(body.plant_ids || body.zone_plant_ids || []);

  if (scope_kind === "PLANT") {
    if (!plant_id) return fail(CODES.INVALID_SCOPE, { reason: "plant_id_required" });
  } else {
    plant_id = null;
  }
  if (scope_kind === "MULTI_PLANT" && plant_ids.length < 1) {
    return fail(CODES.INVALID_SCOPE, { reason: "plant_ids_required" });
  }

  let decision_outcome = body.decision_outcome != null ? String(body.decision_outcome) : null;
  if (event_type === "DECISION") {
    if (!DECISION_OUTCOMES.includes(decision_outcome)) return fail(CODES.INVALID_INPUT, { field: "decision_outcome" });
  } else {
    decision_outcome = null;
  }

  let declared_kind = body.declared_kind != null ? String(body.declared_kind) : "UNKNOWN";
  if (!DECLARED_KINDS.includes(declared_kind)) return fail(CODES.INVALID_INPUT, { field: "declared_kind" });
  let declared_user_id = body.declared_user_id != null ? Number(body.declared_user_id) : null;
  if (declared_kind !== "KNOWN_USER") declared_user_id = null;
  else if (!Number.isFinite(declared_user_id) || declared_user_id <= 0) {
    return fail(CODES.INVALID_INPUT, { field: "declared_user_id" });
  }

  const source_type = body.source_type != null ? String(body.source_type) : "MANUAL";
  if (!SOURCE_TYPES.includes(source_type)) return fail(CODES.INVALID_INPUT, { field: "source_type" });

  let numeric_value = body.numeric_value;
  if (numeric_value === "" || numeric_value === undefined) numeric_value = null;
  if (numeric_value != null) {
    const n = Number(numeric_value);
    if (!Number.isFinite(n)) return fail(CODES.INVALID_INPUT, { field: "numeric_value" });
    numeric_value = n;
  }
  let value_mode = body.value_mode != null ? String(body.value_mode) : null;
  if (numeric_value == null) value_mode = value_mode || null;
  else if (!value_mode) return fail(CODES.INVALID_INPUT, { field: "value_mode" });
  if (value_mode != null && !VALUE_MODES.includes(value_mode)) return fail(CODES.INVALID_INPUT, { field: "value_mode" });

  let period_kind = body.period_kind != null ? String(body.period_kind) : null;
  if (period_kind != null && !PERIOD_KINDS.includes(period_kind)) return fail(CODES.INVALID_INPUT, { field: "period_kind" });

  const refers_proposal_id = body.refers_proposal_id != null ? Number(body.refers_proposal_id) : null;
  const corrects_event_id = body.corrects_event_id != null ? Number(body.corrects_event_id) : null;
  if (event_type === "CORRECTION" && (!Number.isFinite(corrects_event_id) || corrects_event_id <= 0)) {
    return fail(CODES.RELATION_INVALID, { field: "corrects_event_id" });
  }

  return {
    ok: true,
    normalized: {
      event_type,
      attestation_state: ATTESTATION_STATE,
      raw_text,
      decision_outcome,
      metric_key: body.metric_key != null && String(body.metric_key).trim() !== "" ? String(body.metric_key).trim() : null,
      numeric_value,
      unit: body.unit != null && String(body.unit).trim() !== "" ? String(body.unit).trim() : null,
      value_mode,
      period_kind,
      period_year: body.period_year != null ? Number(body.period_year) : null,
      period_month: body.period_month != null ? Number(body.period_month) : null,
      period_start: body.period_start || null,
      period_end: body.period_end || null,
      scope_kind,
      scope_label: body.scope_label != null && String(body.scope_label).trim() !== "" ? String(body.scope_label).trim() : null,
      plant_id,
      plant_ids: scope_kind === "PLANT" ? [plant_id] : plant_ids,
      declared_kind,
      declared_user_id,
      declared_role_key: body.declared_role_key != null ? String(body.declared_role_key).trim() || null : null,
      declared_display_name: body.declared_display_name != null ? String(body.declared_display_name).trim() || null : null,
      extracted_by: null,
      source_type,
      source_id: body.source_id != null ? String(body.source_id) : null,
      source_location: body.source_location != null ? String(body.source_location) : null,
      meeting_ref: body.meeting_ref != null ? String(body.meeting_ref) : null,
      baseline_ref: body.baseline_ref != null ? String(body.baseline_ref) : null,
      baseline_value: body.baseline_value != null && body.baseline_value !== "" ? Number(body.baseline_value) : null,
      baseline_source: body.baseline_source != null ? String(body.baseline_source) : null,
      declared_at: body.declared_at || null,
      refers_proposal_id: Number.isFinite(refers_proposal_id) && refers_proposal_id > 0 ? refers_proposal_id : null,
      corrects_event_id: Number.isFinite(corrects_event_id) && corrects_event_id > 0 ? corrects_event_id : null,
      supersede_original: true,
    },
  };
}

function scopeFromRow(row, plantRows) {
  const plant_ids =
    row.scope_kind === "PLANT" && row.plant_id
      ? [Number(row.plant_id)]
      : (plantRows || []).map((p) => Number(p.planta_id));
  return {
    scope_kind: row.scope_kind,
    plant_id: row.plant_id != null ? Number(row.plant_id) : null,
    plant_ids,
    scope_label: row.scope_label || null,
    zone_plant_ids: row.scope_kind === "ZONE" ? plant_ids : undefined,
  };
}

function mapEventRow(row, plantRows, relations) {
  return {
    id: Number(row.id),
    event_type: row.event_type,
    attestation_state: row.attestation_state,
    vigor: row.vigor,
    raw_text: row.raw_text,
    decision_outcome: row.decision_outcome,
    metric_key: row.metric_key,
    numeric_value: row.numeric_value == null ? null : Number(row.numeric_value),
    unit: row.unit,
    value_mode: row.value_mode,
    period_kind: row.period_kind,
    period_year: row.period_year,
    period_month: row.period_month,
    period_start: row.period_start,
    period_end: row.period_end,
    scope_kind: row.scope_kind,
    scope_label: row.scope_label,
    plant_id: row.plant_id != null ? Number(row.plant_id) : null,
    plant_ids: scopeFromRow(row, plantRows).plant_ids,
    declared_kind: row.declared_kind,
    declared_user_id: row.declared_user_id != null ? Number(row.declared_user_id) : null,
    declared_role_key: row.declared_role_key,
    declared_display_name: row.declared_display_name,
    captured_by_usuario_id: Number(row.captured_by_usuario_id),
    extracted_by: row.extracted_by,
    source_type: row.source_type,
    source_id: row.source_id,
    source_location: row.source_location,
    meeting_ref: row.meeting_ref,
    baseline_ref: row.baseline_ref,
    baseline_value: row.baseline_value == null ? null : Number(row.baseline_value),
    baseline_source: row.baseline_source,
    created_at: row.created_at,
    captured_at: row.captured_at,
    declared_at: row.declared_at,
    relations: relations || [],
    meaning: {
      recorded: "attestation_exists_with_provenance",
      not: [
        "VERIFIED_TRUE",
        "ORGANIZATIONALLY_CONFIRMED",
        "APPROVED",
        "EXECUTED",
        "FULFILLED",
        "TARGET",
        "FORECAST",
        "ACTUAL",
        "FINAL",
      ],
    },
  };
}

async function loadEventBundle(client, eventId) {
  const ev = await client.query(`SELECT * FROM arr.executive_steering_events WHERE id = $1`, [eventId]);
  if (!ev.rows || !ev.rows[0]) return null;
  const plants = await client.query(
    `SELECT planta_id FROM arr.executive_steering_event_plants WHERE event_id = $1 ORDER BY planta_id`,
    [eventId]
  );
  const rels = await client.query(
    `SELECT from_event_id, to_event_id, relation_kind, created_by_usuario_id, created_at
     FROM arr.executive_steering_event_relations
     WHERE from_event_id = $1 OR to_event_id = $1
     ORDER BY id`,
    [eventId]
  );
  return mapEventRow(ev.rows[0], plants.rows || [], rels.rows || []);
}

async function recordExecutiveSteeringEvent(client, auth, input) {
  if (isUsuariosAccessKey(auth) && steeringAuthorityClass(auth) === "NONE") {
    return fail(CODES.UNAUTHORIZED, { reason: "usuarios_access_key" });
  }
  const captured_by = capturedByUsuarioId(auth);
  if (!captured_by) return fail(CODES.UNAUTHORIZED, { reason: "captured_by_missing" });

  const validated = validateRecordInput(input);
  if (!validated.ok) return validated;
  const n = validated.normalized;

  const authz = authorizeSteeringScope(auth, n);
  if (!authz.ok) return fail(authz.code);

  if (n.corrects_event_id) {
    const original = await loadEventBundle(client, n.corrects_event_id);
    if (!original) return fail(CODES.NOT_FOUND, { field: "corrects_event_id" });
    const origAuth = authorizeSteeringScope(auth, original);
    if (!origAuth.ok) return fail(origAuth.code, { reason: "original_scope_denied" });
    if (n.corrects_event_id === n.refers_proposal_id) return fail(CODES.RELATION_INVALID);
  }

  try {
    await client.query("BEGIN");
    const ins = await client.query(
      `INSERT INTO arr.executive_steering_events (
         event_type, attestation_state, vigor, raw_text, decision_outcome,
         metric_key, numeric_value, unit, value_mode,
         period_kind, period_year, period_month, period_start, period_end,
         scope_kind, scope_label, plant_id,
         declared_kind, declared_user_id, declared_role_key, declared_display_name,
         captured_by_usuario_id, extracted_by,
         source_type, source_id, source_location, meeting_ref,
         baseline_ref, baseline_value, baseline_source, declared_at
       ) VALUES (
         $1,'RECORDED','CURRENT',$2,$3,
         $4,$5,$6,$7,
         $8,$9,$10,$11,$12,
         $13,$14,$15,
         $16,$17,$18,$19,
         $20,NULL,
         $21,$22,$23,$24,
         $25,$26,$27,$28
       ) RETURNING *`,
      [
        n.event_type,
        n.raw_text,
        n.decision_outcome,
        n.metric_key,
        n.numeric_value,
        n.unit,
        n.value_mode,
        n.period_kind,
        n.period_year,
        n.period_month,
        n.period_start,
        n.period_end,
        n.scope_kind,
        n.scope_label,
        n.plant_id,
        n.declared_kind,
        n.declared_user_id,
        n.declared_role_key,
        n.declared_display_name,
        captured_by,
        n.source_type,
        n.source_id,
        n.source_location,
        n.meeting_ref,
        n.baseline_ref,
        n.baseline_value,
        n.baseline_source,
        n.declared_at,
      ]
    );
    const row = ins.rows[0];
    const eventId = Number(row.id);
    const linkPlants = n.scope_kind === "PLANT" ? [] : n.plant_ids;
    for (const pid of linkPlants) {
      await client.query(
        `INSERT INTO arr.executive_steering_event_plants (event_id, planta_id) VALUES ($1,$2)`,
        [eventId, pid]
      );
    }
    if (n.refers_proposal_id) {
      if (n.refers_proposal_id === eventId) {
        await client.query("ROLLBACK");
        return fail(CODES.RELATION_INVALID);
      }
      await client.query(
        `INSERT INTO arr.executive_steering_event_relations
           (from_event_id, to_event_id, relation_kind, created_by_usuario_id)
         VALUES ($1,$2,'REFERS_PROPOSAL',$3)`,
        [eventId, n.refers_proposal_id, captured_by]
      );
    }
    if (n.corrects_event_id) {
      if (n.corrects_event_id === eventId) {
        await client.query("ROLLBACK");
        return fail(CODES.RELATION_INVALID);
      }
      await client.query(
        `INSERT INTO arr.executive_steering_event_relations
           (from_event_id, to_event_id, relation_kind, created_by_usuario_id)
         VALUES ($1,$2,'CORRECTS',$3)`,
        [eventId, n.corrects_event_id, captured_by]
      );
      if (n.supersede_original) {
        await client.query(
          `INSERT INTO arr.executive_steering_event_relations
             (from_event_id, to_event_id, relation_kind, created_by_usuario_id)
           VALUES ($1,$2,'SUPERSEDES',$3)`,
          [eventId, n.corrects_event_id, captured_by]
        );
        await client.query(`UPDATE arr.executive_steering_events SET vigor = 'SUPERSEDED' WHERE id = $1`, [
          n.corrects_event_id,
        ]);
      }
    }
    await client.query("COMMIT");
    const bundle = await loadEventBundle(client, eventId);
    return { ok: true, persisted: true, event: bundle };
  } catch (e) {
    try {
      await client.query("ROLLBACK");
    } catch (_) {
      /* ignore */
    }
    return fail(CODES.INVALID_INPUT, { error: e.message || "transaction_failed" });
  }
}

async function getExecutiveSteeringEvent(client, auth, eventId) {
  const id = Number(eventId);
  if (!Number.isFinite(id) || id <= 0) return fail(CODES.INVALID_INPUT);
  const bundle = await loadEventBundle(client, id);
  if (!bundle) return fail(CODES.NOT_FOUND);
  const authz = authorizeSteeringScope(auth, bundle);
  if (!authz.ok) return fail(authz.code);
  return { ok: true, event: bundle };
}

async function listExecutiveSteeringEvents(client, auth, filters) {
  const f = filters || {};
  const res = await client.query(`SELECT id FROM arr.executive_steering_events ORDER BY id ASC`);
  const out = [];
  for (const row of res.rows || []) {
    const got = await getExecutiveSteeringEvent(client, auth, row.id);
    if (!got.ok) continue;
    const ev = got.event;
    if (f.event_type && ev.event_type !== f.event_type) continue;
    if (f.vigor && ev.vigor !== f.vigor) continue;
    if (f.meeting_ref && ev.meeting_ref !== f.meeting_ref) continue;
    if (f.plant_id) {
      const pid = Number(f.plant_id);
      if (!ev.plant_ids.includes(pid) && Number(ev.plant_id) !== pid) continue;
    }
    out.push(ev);
  }
  return { ok: true, events: out };
}

function deleteExecutiveSteeringEvent() {
  return fail(CODES.DELETE_FORBIDDEN);
}

function updateExecutiveSteeringEvent() {
  return fail(CODES.UPDATE_FORBIDDEN);
}

module.exports = {
  EVENT_TYPES,
  ATTESTATION_STATE,
  SCOPE_KINDS,
  ZP_ALIASES,
  CODES,
  isGovernedZpClave,
  steeringAuthorityClass,
  authorizeSteeringScope,
  canViewSteeringScope,
  canRecordSteeringScope,
  validateRecordInput,
  recordExecutiveSteeringEvent,
  getExecutiveSteeringEvent,
  listExecutiveSteeringEvents,
  deleteExecutiveSteeringEvent,
  updateExecutiveSteeringEvent,
  isUsuariosAccessKey,
};
