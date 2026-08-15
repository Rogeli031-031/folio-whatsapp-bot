/**
 * Executive Knowledge Store — runtime mínimo (03 v1.2, D1–D9).
 * Mecánico y determinista. No LLM. No N1–N4. No tools. No muta Bundles.
 * No se integra a server.js / chat / dashboard en esta tarea.
 */
"use strict";

const crypto = require("crypto");
const { Pool } = require("pg");

const COVERAGE = Object.freeze([
  "CONOZCO",
  "CONOZCO_PARCIALMENTE",
  "EXISTE_CONFLICTO",
  "NO_CONOZCO",
]);

const REQUIRED_LISTS = Object.freeze([
  "observations",
  "facts",
  "evidence",
  "diagnoses",
  "conflicts",
  "open_questions",
]);

const REQUIRED_OBJECTS = Object.freeze(["source_health", "ruleset_versions", "traceability"]);

const REQUIRED_META = Object.freeze(["bundle_id", "trace_id", "produced_at", "producer"]);

/** Digest de realización (no congelado en 03). Huella ≠ firma IES. */
const INTEGRITY_ALG = "sha256";
const INTEGRITY_PREFIX = "sha256:";

function structuredCloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function canonicalJson(value) {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  }
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(value[k])}`).join(",")}}`;
}

function computeIntegrity(bundle) {
  const canonical = canonicalJson(bundle);
  const digest = crypto.createHash(INTEGRITY_ALG).update(canonical, "utf8").digest("hex");
  return `${INTEGRITY_PREFIX}${digest}`;
}

function isNonEmptyString(v) {
  return typeof v === "string" && v.trim().length > 0;
}

/**
 * @param {unknown} bundle
 * @returns {{ ok: boolean, errors: string[] }}
 */
function validate_structure(bundle) {
  const errors = [];
  if (bundle === null || typeof bundle !== "object" || Array.isArray(bundle)) {
    return { ok: false, errors: ["container_not_bundle"] };
  }

  const keys = Object.keys(bundle);
  if (keys.length === 0) {
    errors.push("empty_container");
  }

  const hasObservations = Object.prototype.hasOwnProperty.call(bundle, "observations");
  const missingCore = REQUIRED_LISTS.filter((k) => !Object.prototype.hasOwnProperty.call(bundle, k));
  if (hasObservations && missingCore.length === REQUIRED_LISTS.length - 1) {
    errors.push("observations_only_rejected");
  }

  for (const k of REQUIRED_LISTS) {
    if (!Object.prototype.hasOwnProperty.call(bundle, k)) {
      errors.push(`missing:${k}`);
    } else if (!Array.isArray(bundle[k])) {
      errors.push(`not_array:${k}`);
    }
  }

  for (const k of REQUIRED_OBJECTS) {
    if (!Object.prototype.hasOwnProperty.call(bundle, k)) {
      errors.push(`missing:${k}`);
    } else if (bundle[k] === null || typeof bundle[k] !== "object" || Array.isArray(bundle[k])) {
      errors.push(`not_object:${k}`);
    }
  }

  for (const k of REQUIRED_META) {
    if (!isNonEmptyString(bundle[k])) {
      errors.push(`missing_or_empty:${k}`);
    }
  }

  if (bundle.producer !== "evidence_builder") {
    errors.push("producer_must_be_evidence_builder");
  }

  if (!COVERAGE.includes(bundle.knowledge_coverage)) {
    errors.push("invalid_knowledge_coverage");
  }

  if (!isNonEmptyString(bundle.trace_id)) {
    errors.push("missing_or_empty:trace_id");
  }

  return { ok: errors.length === 0, errors };
}

function opaqueSnapshotId() {
  return `snap_${crypto.randomUUID()}`;
}

function createMemoryStore() {
  /** @type {Map<string, object>} */
  const byId = new Map();
  /** @type {Map<string, object[]>} */
  const byTrace = new Map();
  /** @type {Map<string, Promise<void>>} */
  const locks = new Map();

  async function withTraceLock(traceId, fn) {
    const prev = locks.get(traceId) || Promise.resolve();
    let release;
    const gate = new Promise((resolve) => {
      release = resolve;
    });
    const running = prev.then(() => gate);
    locks.set(traceId, running);
    await prev;
    try {
      return await fn();
    } finally {
      release();
    }
  }

  return {
    async insertSnapshot(row) {
      return withTraceLock(row.trace_id, async () => {
        const list = byTrace.get(row.trace_id) || [];
        const max = list.reduce((m, s) => Math.max(m, s.version), 0);
        const version = max + 1;
        if (list.some((s) => s.version === version)) {
          const err = new Error("unique_trace_version");
          err.code = "UNIQUE_TRACE_VERSION";
          throw err;
        }
        const stored = {
          snapshot_id: row.snapshot_id,
          bundle_id: row.bundle_id,
          trace_id: row.trace_id,
          version,
          persisted_at: row.persisted_at,
          bundle: structuredCloneJson(row.bundle),
          integrity: row.integrity,
        };
        byId.set(stored.snapshot_id, stored);
        list.push(stored);
        byTrace.set(row.trace_id, list);
        return stored;
      });
    },
    async getBySnapshotId(snapshotId) {
      const row = byId.get(snapshotId);
      return row ? structuredCloneJson(row) : null;
    },
    async getLatestByTraceId(traceId) {
      const list = byTrace.get(traceId) || [];
      if (list.length === 0) return null;
      const latest = list.reduce((a, b) => (a.version >= b.version ? a : b));
      return structuredCloneJson(latest);
    },
    async listByTraceId(traceId) {
      const list = byTrace.get(traceId) || [];
      return list
        .slice()
        .sort((a, b) => a.version - b.version)
        .map((s) => structuredCloneJson(s));
    },
  };
}

function createPgStore(pool) {
  return {
    async insertSnapshot(row) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query("INSERT INTO eks.trace_locks (trace_id) VALUES ($1) ON CONFLICT (trace_id) DO NOTHING", [
          row.trace_id,
        ]);
        await client.query("SELECT trace_id FROM eks.trace_locks WHERE trace_id = $1 FOR UPDATE", [row.trace_id]);
        const maxRes = await client.query("SELECT COALESCE(MAX(version), 0)::int AS max FROM eks.snapshots WHERE trace_id = $1", [
          row.trace_id,
        ]);
        const version = maxRes.rows[0].max + 1;
        const ins = await client.query(
          `INSERT INTO eks.snapshots
            (snapshot_id, bundle_id, trace_id, version, persisted_at, bundle, integrity)
           VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
           RETURNING snapshot_id, bundle_id, trace_id, version, persisted_at, bundle, integrity`,
          [
            row.snapshot_id,
            row.bundle_id,
            row.trace_id,
            version,
            row.persisted_at,
            JSON.stringify(row.bundle),
            row.integrity,
          ]
        );
        await client.query("COMMIT");
        return mapPgRow(ins.rows[0]);
      } catch (err) {
        try {
          await client.query("ROLLBACK");
        } catch (_e) {
          /* ignore */
        }
        throw err;
      } finally {
        client.release();
      }
    },
    async getBySnapshotId(snapshotId) {
      const res = await pool.query(
        `SELECT snapshot_id, bundle_id, trace_id, version, persisted_at, bundle, integrity
           FROM eks.snapshots WHERE snapshot_id = $1`,
        [snapshotId]
      );
      return res.rows[0] ? mapPgRow(res.rows[0]) : null;
    },
    async getLatestByTraceId(traceId) {
      const res = await pool.query(
        `SELECT snapshot_id, bundle_id, trace_id, version, persisted_at, bundle, integrity
           FROM eks.snapshots WHERE trace_id = $1
           ORDER BY version DESC LIMIT 1`,
        [traceId]
      );
      return res.rows[0] ? mapPgRow(res.rows[0]) : null;
    },
    async listByTraceId(traceId) {
      const res = await pool.query(
        `SELECT snapshot_id, bundle_id, trace_id, version, persisted_at, bundle, integrity
           FROM eks.snapshots WHERE trace_id = $1
           ORDER BY version ASC`,
        [traceId]
      );
      return res.rows.map(mapPgRow);
    },
  };
}

function mapPgRow(row) {
  return {
    snapshot_id: row.snapshot_id,
    bundle_id: row.bundle_id,
    trace_id: row.trace_id,
    version: Number(row.version),
    persisted_at: row.persisted_at,
    bundle: row.bundle,
    integrity: row.integrity,
  };
}

/**
 * Pool lógico dedicado (D8). No es el Pool de server.js.
 * @param {string} connectionString
 * @param {object} [opts]
 */
function createDedicatedPool(connectionString, opts = {}) {
  if (!connectionString) {
    throw new Error("missing_connection_string");
  }
  const sslFalse = opts.ssl === false || opts.databaseSsl === false;
  const max = Number.isFinite(opts.max) && opts.max > 0 ? opts.max : 5;
  return new Pool({
    connectionString,
    ssl: sslFalse ? false : { rejectUnauthorized: false },
    max,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: Number.isFinite(opts.connectionTimeoutMillis)
      ? opts.connectionTimeoutMillis
      : 15000,
  });
}

function toPublicSnapshot(row) {
  const bundle = structuredCloneJson(row.bundle);
  const expected = computeIntegrity(bundle);
  if (expected !== row.integrity) {
    const err = new Error("integrity_mismatch");
    err.code = "INTEGRITY_MISMATCH";
    throw err;
  }
  return {
    snapshot_id: row.snapshot_id,
    bundle_id: row.bundle_id,
    trace_id: row.trace_id,
    version: row.version,
    persisted_at: row.persisted_at,
    bundle,
    integrity: row.integrity,
  };
}

/**
 * @param {{ pool?: import("pg").Pool }} [options]
 *   Sin `pool`: almacén en memoria (solo pruebas locales; no es P4 de producto).
 *   Con `pool`: persistencia P1 en el motor de la aplicación, objetos eks.*.
 */
function createEks(options = {}) {
  const store = options.pool ? createPgStore(options.pool) : createMemoryStore();

  return {
    validate_structure,

    async append_snapshot(bundle) {
      const inputCopy = structuredCloneJson(bundle);
      const check = validate_structure(inputCopy);
      if (!check.ok) {
        const err = new Error("invalid_bundle");
        err.code = "INVALID_BUNDLE";
        err.errors = check.errors;
        throw err;
      }
      const persistedBundle = structuredCloneJson(inputCopy);
      const integrity = computeIntegrity(persistedBundle);
      const persisted_at = new Date();
      const row = await store.insertSnapshot({
        snapshot_id: opaqueSnapshotId(),
        bundle_id: persistedBundle.bundle_id,
        trace_id: persistedBundle.trace_id,
        persisted_at,
        bundle: persistedBundle,
        integrity,
      });
      return toPublicSnapshot(row);
    },

    async get_snapshot(query) {
      if (!query || typeof query !== "object") {
        const err = new Error("invalid_query");
        err.code = "INVALID_QUERY";
        throw err;
      }
      if (isNonEmptyString(query.snapshot_id)) {
        const row = await store.getBySnapshotId(query.snapshot_id);
        return row ? toPublicSnapshot(row) : null;
      }
      if (isNonEmptyString(query.trace_id)) {
        const row = await store.getLatestByTraceId(query.trace_id);
        return row ? toPublicSnapshot(row) : null;
      }
      const err = new Error("invalid_query");
      err.code = "INVALID_QUERY";
      throw err;
    },

    async list_versions(trace_id) {
      if (!isNonEmptyString(trace_id)) {
        const err = new Error("invalid_trace_id");
        err.code = "INVALID_TRACE_ID";
        throw err;
      }
      const rows = await store.listByTraceId(trace_id);
      return rows.map((row) => ({
        snapshot_id: row.snapshot_id,
        bundle_id: row.bundle_id,
        trace_id: row.trace_id,
        version: row.version,
        persisted_at: row.persisted_at,
        integrity: row.integrity,
      }));
    },
  };
}

module.exports = {
  createEks,
  createDedicatedPool,
  validate_structure,
  computeIntegrity,
  canonicalJson,
  INTEGRITY_ALG,
};
