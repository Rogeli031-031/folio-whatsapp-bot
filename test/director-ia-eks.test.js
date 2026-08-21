"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { createEks, validate_structure, computeIntegrity } = require("../lib/director-ia-eks");

const FIXTURE_A = path.join(__dirname, "..", "fixtures", "director-ia", "eks", "case-a-03b.json");
const FIXTURE_B = path.join(__dirname, "..", "fixtures", "director-ia", "eks", "case-b-03b.json");
const LIB_PATH = path.join(__dirname, "..", "lib", "director-ia-eks.js");
const SQL_PATH = path.join(__dirname, "..", "sql", "015_director_ia_eks.sql");

function loadFixture(file) {
  const raw = JSON.parse(fs.readFileSync(file, "utf8"));
  assert.equal(raw.meta.figures, "ILUSTRATIVAS / FICTICIAS");
  assert.equal(raw.meta.not_institutional_coverage, true);
  return structuredClone(raw.bundle);
}

describe("EKS validate_structure", () => {
  it("acepta fixture 03B A (diagnósticos presentes, cifras ficticias)", () => {
    const bundle = loadFixture(FIXTURE_A);
    const r = validate_structure(bundle);
    assert.equal(r.ok, true, r.errors.join(","));
    assert.ok(bundle.diagnoses.length > 0);
    assert.equal(bundle.knowledge_coverage, "CONOZCO_PARCIALMENTE");
  });

  it("acepta fixture 03B B (NO_CONOZCO, sin diagnósticos)", () => {
    const bundle = loadFixture(FIXTURE_B);
    const r = validate_structure(bundle);
    assert.equal(r.ok, true, r.errors.join(","));
    assert.deepEqual(bundle.diagnoses, []);
    assert.deepEqual(bundle.facts, []);
    assert.equal(bundle.knowledge_coverage, "NO_CONOZCO");
    assert.equal(bundle.source_health.get_folio_status, "SOURCE_NOT_INTEGRATED");
  });

  it("rechaza payload que no es Knowledge Bundle (solo observaciones)", () => {
    const r = validate_structure({ observations: [{ id: "x" }] });
    assert.equal(r.ok, false);
    assert.ok(r.errors.includes("observations_only_rejected") || r.errors.some((e) => e.startsWith("missing:")));
  });

  it("rechaza contenedor vacío y no-objeto", () => {
    assert.equal(validate_structure({}).ok, false);
    assert.equal(validate_structure(null).ok, false);
    assert.equal(validate_structure([]).ok, false);
  });
});

describe("EKS append/get/list (memoria de prueba; P1 pg vía SQL M1 aparte)", () => {
  it("persiste A, no muta el Bundle de entrada, integrity estable", async () => {
    const eks = createEks();
    const bundle = loadFixture(FIXTURE_A);
    const original = structuredClone(bundle);
    const snap = await eks.append_snapshot(bundle);
    bundle.facts.push({ injected: true });
    assert.deepEqual(snap.bundle, original);
    assert.equal(snap.bundle_id, "kb_caseA_ilustrativo");
    assert.equal(snap.trace_id, "tr_caseA_puebla_ilustrativo");
    assert.equal(snap.version, 1);
    assert.ok(snap.snapshot_id);
    assert.equal(snap.integrity, computeIntegrity(original));
    const again = await eks.get_snapshot({ snapshot_id: snap.snapshot_id });
    assert.equal(again.integrity, snap.integrity);
    assert.deepEqual(again.bundle, original);
    assert.ok(!JSON.stringify(again.bundle).includes("injected"));
  });

  it("persiste B sin diagnósticos y no convierte SOURCE_NOT_INTEGRATED en hecho", async () => {
    const eks = createEks();
    const bundle = loadFixture(FIXTURE_B);
    const snap = await eks.append_snapshot(bundle);
    assert.deepEqual(snap.bundle.diagnoses, []);
    assert.deepEqual(snap.bundle.facts, []);
    assert.equal(snap.bundle.knowledge_coverage, "NO_CONOZCO");
    assert.equal(snap.bundle.source_health.get_folio_status, "SOURCE_NOT_INTEGRATED");
    assert.equal(snap.bundle.facts.some((f) => JSON.stringify(f).includes("sin etapa")), false);
  });

  it("append v1 y v2 del mismo trace_id; v1 inmutable; get(trace_id)=latest; list ordenado", async () => {
    const eks = createEks();
    const a1 = loadFixture(FIXTURE_A);
    const a2 = loadFixture(FIXTURE_A);
    a2.bundle_id = "kb_caseA_ilustrativo_append2";
    const s1 = await eks.append_snapshot(a1);
    const s2 = await eks.append_snapshot(a2);
    assert.equal(s1.version, 1);
    assert.equal(s2.version, 2);
    assert.equal(s1.trace_id, s2.trace_id);
    assert.notEqual(s1.snapshot_id, s2.snapshot_id);
    const byId1 = await eks.get_snapshot({ snapshot_id: s1.snapshot_id });
    assert.equal(byId1.version, 1);
    assert.equal(byId1.bundle.bundle_id, "kb_caseA_ilustrativo");
    const latest = await eks.get_snapshot({ trace_id: a1.trace_id });
    assert.equal(latest.version, 2);
    assert.equal(latest.snapshot_id, s2.snapshot_id);
    const versions = await eks.list_versions(a1.trace_id);
    assert.deepEqual(versions.map((v) => v.version), [1, 2]);
    assert.equal(versions[0].snapshot_id, s1.snapshot_id);
    assert.equal(versions[1].snapshot_id, s2.snapshot_id);
  });

  it("rechaza append de no-bundle", async () => {
    const eks = createEks();
    await assert.rejects(() => eks.append_snapshot({ observations: [] }), (err) => err.code === "INVALID_BUNDLE");
  });

  it("asignación de version concurrente no duplica version", async () => {
    const eks = createEks();
    const mk = (n) => {
      const b = loadFixture(FIXTURE_B);
      b.bundle_id = `kb_caseB_conc_${n}`;
      return b;
    };
    const results = await Promise.all([eks.append_snapshot(mk(1)), eks.append_snapshot(mk(2))]);
    const versions = results.map((s) => s.version).sort();
    assert.deepEqual(versions, [1, 2]);
    const listed = await eks.list_versions(results[0].trace_id);
    assert.deepEqual(listed.map((v) => v.version), [1, 2]);
  });
});

describe("EKS query_context_metadata sibling (columna JSONB, no Bundle, no D7)", () => {
  function sampleMeta(tag) {
    return {
      executive_query_id: "eq_test",
      trace_id: "tr_meta_" + tag,
      original_question: "venta_ton",
      intent: "arr_venta_ton",
      requesting_user_id: "user_1",
      requesting_role: "ZP",
      channel: "dashboard",
      resolved_entities: [],
      permission_restrictions: [],
      knowledge_effective_date: "2026-08-21T00:00:00.000Z",
    };
  }

  it("sql incluye columna JSONB nullable y ALTER idempotente; no tabla 1:1 ni backfill", () => {
    const sql = fs.readFileSync(SQL_PATH, "utf8");
    assert.match(sql, /query_context_metadata JSONB/);
    assert.match(
      sql,
      /ALTER TABLE eks\.snapshots\s+ADD COLUMN IF NOT EXISTS query_context_metadata JSONB/
    );
    assert.equal(/query_context_metadata JSONB NOT NULL/.test(sql), false);
    assert.equal(/CREATE TABLE IF NOT EXISTS eks\.snapshot_query/.test(sql), false);
    assert.equal(/\bDEFAULT\b/i.test(sql), false);
    assert.equal(/\bUPDATE\b/i.test(sql), false);
    assert.equal(/\bDELETE\b/i.test(sql), false);
    assert.equal(/\bDROP\b/i.test(sql), false);
    assert.equal(/\bTRUNCATE\b/i.test(sql), false);
    assert.equal(/CREATE INDEX IF NOT EXISTS eks_snapshots_query_context/.test(sql), false);
  });

  it("append con metadata la persiste como sibling; bundle no la contiene", async () => {
    const eks = createEks();
    const bundle = loadFixture(FIXTURE_A);
    const meta = sampleMeta("a");
    const snap = await eks.append_snapshot(bundle, meta);
    assert.deepEqual(snap.query_context_metadata, meta);
    assert.equal(Object.prototype.hasOwnProperty.call(snap.bundle, "query_context_metadata"), false);
    const again = await eks.get_snapshot({ snapshot_id: snap.snapshot_id });
    assert.deepEqual(again.query_context_metadata, meta);
    assert.equal(Object.prototype.hasOwnProperty.call(again.bundle, "query_context_metadata"), false);
  });

  it("append sin metadata persiste NULL y get_snapshot histórico sigue legible", async () => {
    const eks = createEks();
    const bundle = loadFixture(FIXTURE_B);
    const snap = await eks.append_snapshot(bundle);
    assert.equal(snap.query_context_metadata, null);
    const again = await eks.get_snapshot({ snapshot_id: snap.snapshot_id });
    assert.equal(again.query_context_metadata, null);
    assert.ok(again.bundle);
    assert.equal(again.integrity, computeIntegrity(bundle));
  });

  it("mismo bundle con distinta metadata conserva el mismo integrity D7", async () => {
    const eks = createEks();
    const bundle = loadFixture(FIXTURE_A);
    const s1 = await eks.append_snapshot(structuredClone(bundle), sampleMeta("one"));
    const s2 = await eks.append_snapshot(structuredClone(bundle), sampleMeta("two"));
    assert.equal(s1.integrity, s2.integrity);
    assert.equal(s1.integrity, computeIntegrity(bundle));
    assert.notDeepEqual(s1.query_context_metadata, s2.query_context_metadata);
  });

  it("list_versions no incluye query_context_metadata ni bundle", async () => {
    const eks = createEks();
    const bundle = loadFixture(FIXTURE_A);
    const snap = await eks.append_snapshot(bundle, sampleMeta("list"));
    const versions = await eks.list_versions(snap.trace_id);
    assert.equal(versions.length, 1);
    assert.equal(Object.prototype.hasOwnProperty.call(versions[0], "query_context_metadata"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(versions[0], "bundle"), false);
    assert.equal(versions[0].snapshot_id, snap.snapshot_id);
    assert.equal(versions[0].integrity, snap.integrity);
  });

  it("PG insert escribe metadata en el mismo INSERT transaccional que bundle", async () => {
    const inserts = [];
    const pool = {
      async connect() {
        return {
          async query(sql, params) {
            const text = String(sql);
            if (/^BEGIN/i.test(text) || /^COMMIT/i.test(text) || /^ROLLBACK/i.test(text)) return { rows: [] };
            if (/INSERT INTO eks\.trace_locks/i.test(text)) return { rows: [] };
            if (/FROM eks\.trace_locks/i.test(text)) return { rows: [{ trace_id: params[0] }] };
            if (/MAX\(version\)/i.test(text)) return { rows: [{ max: 0 }] };
            if (/INSERT INTO eks\.snapshots/i.test(text)) {
              inserts.push({ text, params });
              const meta =
                params[7] == null ? null : typeof params[7] === "string" ? JSON.parse(params[7]) : params[7];
              const bundle = typeof params[5] === "string" ? JSON.parse(params[5]) : params[5];
              return {
                rows: [
                  {
                    snapshot_id: params[0],
                    bundle_id: params[1],
                    trace_id: params[2],
                    version: params[3],
                    persisted_at: params[4],
                    bundle,
                    integrity: params[6],
                    query_context_metadata: meta,
                  },
                ],
              };
            }
            throw new Error("unexpected_sql");
          },
          release() {},
        };
      },
    };
    const eks = createEks({ pool });
    const bundle = loadFixture(FIXTURE_A);
    const meta = sampleMeta("pg");
    const snap = await eks.append_snapshot(bundle, meta);
    assert.equal(inserts.length, 1);
    assert.match(inserts[0].text, /query_context_metadata/);
    assert.equal(inserts[0].params.length, 8);
    assert.deepEqual(JSON.parse(inserts[0].params[7]), meta);
    assert.equal(Object.prototype.hasOwnProperty.call(JSON.parse(inserts[0].params[5]), "query_context_metadata"), false);
    assert.equal(snap.integrity, computeIntegrity(bundle));
    assert.deepEqual(snap.query_context_metadata, meta);
  });
});

describe("EKS append-only source guards", () => {
  it("sql M1 no muta filas de snapshots", () => {
    const sql = fs.readFileSync(SQL_PATH, "utf8");
    assert.match(sql, /CREATE TABLE IF NOT EXISTS eks\.snapshots/);
    assert.match(sql, /UNIQUE \(trace_id, version\)/);
    assert.equal(/\bUPDATE\b/i.test(sql), false);
    assert.equal(/\bDELETE\b/i.test(sql), false);
    assert.equal(/ON CONFLICT DO UPDATE/i.test(sql), false);
  });

  it("runtime no hace ON CONFLICT DO UPDATE ni mutación de snapshots", () => {
    const src = fs.readFileSync(LIB_PATH, "utf8");
    assert.equal(/ON CONFLICT DO UPDATE/i.test(src), false);
    assert.equal(/eks\.snapshots[\s\S]{0,80}\bUPDATE\b/i.test(src), false);
    assert.equal(/\bDELETE FROM eks\.snapshots\b/i.test(src), false);
    assert.match(src, /INSERT INTO eks\.snapshots/);
  });
});
