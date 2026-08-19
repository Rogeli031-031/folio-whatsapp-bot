"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { createDirectorIaRealCycle, DASHBOARD_CHANNEL } = require("../lib/director-ia-real-cycle");
const { createDirectorIaArrInput } = require("../lib/director-ia-real-input-arr");
const { createObservationPipeline } = require("../lib/director-ia-observation-pipeline");
const { createEvidenceBuilder } = require("../lib/director-ia-evidence-builder");
const { createEks } = require("../lib/director-ia-eks");
const { createIesBuilder } = require("../lib/director-ia-ies-builder");
const { createReasoningEngine } = require("../lib/director-ia-reasoning-engine");
const {
  createChannelProjection,
  createDefaultPolicyRegistry,
} = require("../lib/director-ia-channel-projection");

const FIX_DIR = path.join(__dirname, "..", "fixtures", "director-ia", "real-cycle");
const LIB_PATH = path.join(__dirname, "..", "lib", "director-ia-real-cycle.js");
const IES_LIB = path.join(__dirname, "..", "lib", "director-ia-ies-builder.js");
const CLOCK = () => "2026-08-19T13:06:59.000Z";
const SECRET_MARKERS = [
  "sk-",
  "DATABASE_URL",
  "OPENAI_API_KEY",
  "TWILIO",
  "ACCOUNT_SID",
  "AUTH_TOKEN",
  "password",
  "secret",
  "Bearer ",
];

function loadFix(name) {
  const raw = JSON.parse(fs.readFileSync(path.join(FIX_DIR, name), "utf8"));
  assert.equal(raw.meta.figures, "ILUSTRATIVAS / FICTICIAS");
  assert.equal(raw.meta.not_institutional_coverage, true);
  return raw;
}

function clone(v) {
  return JSON.parse(JSON.stringify(v));
}

function serialized(v) {
  return JSON.stringify(v);
}

function emptyAdapter() {
  return {
    infer(request) {
      const ies = request.reasoning_context.ies;
      return {
        candidate_reasoning_result: {
          interpretation: {
            what_is_known: { references: [] },
            what_can_be_inferred: { references: [] },
            what_cannot_be_concluded: { references: [] },
          },
          hypotheses: [],
          recommendations: [],
          next_verifications: [],
          decision_options: [],
          abstentions: [],
          clarification_requests: [],
          reasoning_limits: {},
          references: [ies.ies_id],
        },
        provider_metadata: {
          provider: "fake",
          model: "fake-v1",
          model_version: "1",
          request_id: "req_fake",
        },
      };
    },
  };
}

function arrSourceFromFixture(fix, calls) {
  return async function loadArrProyForPlant(client, year, month, plant_code) {
    calls.push({ client, year, month, plant_code });
    if (fix.arr_source_error) {
      const err = new Error("arr_source_error");
      err.code = fix.arr_source_error.code || "TOOL_ERROR";
      throw err;
    }
    if (fix.arr_source_result === undefined) return { venta_ton: null, desc_kg: null };
    return clone(fix.arr_source_result);
  };
}

function harness(arrSource) {
  const arrCalls = [];
  const buildCalls = [];
  const reasonCalls = [];
  const projectCalls = [];
  const compositionPrefixes = [];
  const arrPrefixes = [];

  const compositionIdFactory = (prefix) => {
    compositionPrefixes.push(prefix);
    return `comp_${prefix}_${compositionPrefixes.length}`;
  };
  const arrIdFactory = (prefix) => {
    arrPrefixes.push(prefix);
    const n = arrPrefixes.filter((p) => p === prefix).length;
    return `${prefix}_${n}`;
  };
  let n = 0;
  const sharedIds = (prefix) => `${prefix}_x_${++n}`;

  const innerArr = createDirectorIaArrInput({
    arrSource,
    observationPipeline: createObservationPipeline({ clock: CLOCK, idFactory: sharedIds }),
    evidenceBuilder: createEvidenceBuilder({ produced_at: CLOCK(), idFactory: sharedIds }),
    eks: createEks(),
    idFactory: arrIdFactory,
    clock: CLOCK,
  });
  const arrInput = {
    async run(input) {
      arrCalls.push(clone({ ...input, client: input && input.client ? { kind: "present" } : undefined }));
      return innerArr.run(input);
    },
  };

  const iesInner = createIesBuilder({ clock: CLOCK, idFactory: sharedIds });
  const iesBuilder = {
    build(snapshot) {
      buildCalls.push(clone(snapshot));
      return iesInner.build(snapshot);
    },
  };

  const reInner = createReasoningEngine({
    modelAdapter: emptyAdapter(),
    clock: CLOCK,
    idFactory: sharedIds,
  });
  const reasoningEngine = {
    reason(ies, session) {
      reasonCalls.push({ ies: clone(ies), session: clone(session) });
      return reInner.reason(ies, session);
    },
  };

  const cpInner = createChannelProjection({
    policyRegistry: createDefaultPolicyRegistry(),
    clock: CLOCK,
    idFactory: sharedIds,
  });
  const channelProjection = {
    project(args) {
      projectCalls.push({
        channel: args.channel,
        projectionDepth: args.projectionDepth,
        ies_id: args.ies && args.ies.ies_id,
        has_snapshot: Boolean(args.snapshot),
        has_bundle: Boolean(args.bundle),
        has_arr: Boolean(args.arr_cycle || args.arr_source_result),
      });
      return cpInner.project(args);
    },
  };

  const cycle = createDirectorIaRealCycle({
    arrInput,
    iesBuilder,
    reasoningEngine,
    channelProjection,
    clock: CLOCK,
    idFactory: compositionIdFactory,
  });

  return {
    cycle,
    arrCalls,
    buildCalls,
    reasonCalls,
    projectCalls,
    compositionPrefixes,
    arrPrefixes,
  };
}

function cycleInput(fix) {
  const input = clone(fix.input);
  input.query_context_metadata = clone(fix.query_context_metadata);
  input.projectionDepth = fix.projectionDepth;
  input.session = clone(fix.session || {});
  input.client = { kind: "synthetic_pg_client" };
  return input;
}

async function runFixture(name) {
  const fix = loadFix(name);
  const sourceCalls = [];
  const h = harness(arrSourceFromFixture(fix, sourceCalls));
  const input = cycleInput(fix);
  const before = clone({ ...input, client: { kind: "synthetic_pg_client" } });
  const result = await h.cycle.run(input);
  return { fix, h, input, before, result, sourceCalls };
}

function envelope(result) {
  return result.arr_cycle.envelopes[0];
}

describe("Director IA real cycle — factory", () => {
  it("factory expone run", () => {
    const h = harness(async () => ({ venta_ton: 1, desc_kg: null }));
    assert.equal(typeof h.cycle.run, "function");
  });

  it("dependencias inyectadas obligatorias", () => {
    assert.throws(
      () => createDirectorIaRealCycle({}),
      (err) => err && err.code === "INVALID_DEPENDENCIES"
    );
    assert.throws(
      () =>
        createDirectorIaRealCycle({
          arrInput: { run: async () => ({}) },
          clock: CLOCK,
          idFactory: () => "x",
        }),
      (err) => err && err.code === "INVALID_DEPENDENCIES"
    );
  });

  it("exige query_context_metadata y projectionDepth", async () => {
    const h = harness(async () => ({ venta_ton: 1, desc_kg: null }));
    await assert.rejects(
      () => h.cycle.run({ planta_id: 9001, plant_code: "SYN-NTE", year: 2026, month: 7 }),
      (err) => err && err.code === "INVALID_INPUT"
    );
  });
});

describe("Director IA real cycle — composition", () => {
  it("invoca el ciclo ARR existente exactamente una vez y no reinterpreta su output", async () => {
    const { h, result, fix } = await runFixture("arr-ok-full-cycle.json");
    assert.equal(h.arrCalls.length, 1);
    assert.equal(envelope(result).status, fix.expected_status);
    assert.equal(result.arr_cycle.envelopes[0].payload.metric_or_event, "venta_ton");
    assert.equal(result.arr_cycle.envelopes[0].payload.value, 95);
  });

  it("añade query_context_metadata con la forma E2E/IES y el trace_id del ciclo ARR", async () => {
    const { h, result, fix } = await runFixture("arr-ok-full-cycle.json");
    assert.equal(h.buildCalls.length, 1);
    const meta = h.buildCalls[0].query_context_metadata;
    assert.equal(meta.executive_query_id, fix.query_context_metadata.executive_query_id);
    assert.equal(meta.intent, "arr_venta_ton");
    assert.equal(meta.channel, "dashboard");
    assert.equal(meta.trace_id, result.trace_id);
    assert.equal(meta.trace_id, result.arr_cycle.trace_id);
    assert.notEqual(meta.trace_id, "replaced_by_arr_facade");
    assert.equal(Object.prototype.hasOwnProperty.call(result.arr_cycle.snapshot, "query_context_metadata"), false);
  });

  it("IES recibe snapshot EKS + metadata, no raw ARR", async () => {
    const { h, result } = await runFixture("arr-ok-full-cycle.json");
    const snap = h.buildCalls[0];
    assert.ok(snap.snapshot_id);
    assert.ok(snap.bundle);
    assert.equal(snap.bundle.producer, "evidence_builder");
    assert.equal(Object.prototype.hasOwnProperty.call(snap, "arr_source_result"), false);
    assert.equal(serialized(snap).includes('"desc_kg"'), false);
    assert.equal(serialized(snap).includes("synthetic_pg_client"), false);
    assert.equal(result.ies.snapshot_reference.snapshot_id, result.arr_cycle.snapshot.snapshot_id);
  });

  it("RE recibe únicamente IES; no hay bypass EKS ni ARR", async () => {
    const { h, result } = await runFixture("arr-ok-full-cycle.json");
    assert.equal(h.reasonCalls.length, 1);
    assert.equal(Object.keys(h.reasonCalls[0]).sort().join(","), "ies,session");
    assert.equal(h.reasonCalls[0].ies.ies_id, result.ies.ies_id);
    assert.equal(h.reasonCalls[0].ies.schema_version, "1.0");
    assert.equal(Object.prototype.hasOwnProperty.call(h.reasonCalls[0], "snapshot"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(h.reasonCalls[0], "bundle"), false);
  });

  it("CP recibe IES/RE y destino DASHBOARD", async () => {
    const { h, result } = await runFixture("arr-ok-full-cycle.json");
    assert.equal(h.projectCalls.length, 1);
    assert.equal(h.projectCalls[0].channel, DASHBOARD_CHANNEL);
    assert.equal(h.projectCalls[0].projectionDepth, "L1_EXECUTIVE");
    assert.equal(h.projectCalls[0].has_snapshot, false);
    assert.equal(h.projectCalls[0].has_bundle, false);
    assert.equal(h.projectCalls[0].has_arr, false);
    assert.equal(result.channel_output.channel, "DASHBOARD");
  });
});

describe("Director IA real cycle — happy path", () => {
  it("ACQUIRED_OK atraviesa IES -> RE -> CP con artefactos requeridos", async () => {
    const { result } = await runFixture("arr-ok-full-cycle.json");
    assert.equal(envelope(result).status, "ACQUIRED_OK");
    assert.ok(result.trace_id);
    assert.ok(result.arr_cycle);
    assert.ok(result.ies);
    assert.ok(result.reasoning_result);
    assert.ok(result.channel_output);
    assert.equal(result.ies.status, "VALIDATED");
    assert.equal(result.ies.facts.length, 1);
    assert.equal(result.channel_output.content_blocks.length > 0, true);
  });

  it("trace_id es idéntico en todas las etapas y la composición no lo regenera", async () => {
    const { h, result } = await runFixture("arr-ok-full-cycle.json");
    const tr = result.trace_id;
    assert.equal(h.arrPrefixes.filter((p) => p === "trace").length, 1);
    assert.equal(h.compositionPrefixes.includes("trace"), false);
    assert.equal(result.arr_cycle.trace_id, tr);
    assert.equal(envelope(result).trace_id, tr);
    assert.equal(result.arr_cycle.snapshot.trace_id, tr);
    assert.equal(result.ies.query_context.trace_id, tr);
    assert.equal(result.query_context_metadata.trace_id, tr);
    assert.equal(result.reasoning_run.ies_id, result.ies.ies_id);
    assert.equal(result.channel_output.ies_id, result.ies.ies_id);
  });

  it("cero hypotheses/recommendations es válido cuando RE no justifica N5", async () => {
    const { result } = await runFixture("arr-ok-full-cycle.json");
    assert.equal(result.arr_cycle.bundle.evidence.length, 0);
    assert.equal(result.ies.evidence.length, 0);
    assert.equal(result.reasoning_result.hypotheses.length, 0);
    assert.equal(result.reasoning_result.recommendations.length, 0);
    assert.equal(result.reasoning_run.status, "ABSTAIN");
  });
});

describe("Director IA real cycle — fail-closed", () => {
  it("ACQUIRED_EMPTY no se convierte en ausencia de negocio ni venta_ton = 0", async () => {
    const { result } = await runFixture("arr-empty-full-cycle.json");
    assert.equal(envelope(result).status, "ACQUIRED_EMPTY");
    assert.equal(result.ies.status, "PARTIAL");
    assert.equal(result.ies.source_health[0].execution_status, "DATA_NOT_FOUND");
    assert.deepEqual(result.ies.knowledge_coverage.partial_domains, ["arr"]);
    assert.equal(result.ies.facts.length, 0);
    assert.equal(serialized(result).includes("ABSENCE_CONFIRMED"), false);
    assert.equal(result.reasoning_result.hypotheses.length, 0);
    assert.equal(result.channel_output.channel, "DASHBOARD");
  });

  it("TOOL_ERROR permanece fallo técnico, no hecho negativo", async () => {
    const { result } = await runFixture("arr-tool-error-full-cycle.json");
    assert.equal(envelope(result).status, "TOOL_ERROR");
    assert.equal(result.ies.status, "PARTIAL");
    assert.equal(result.ies.source_health[0].execution_status, "TOOL_ERROR");
    assert.deepEqual(result.ies.knowledge_coverage.failed_tools, ["get_arr_snapshot"]);
    assert.equal(result.ies.facts.length, 0);
    assert.equal(result.reasoning_result.hypotheses.length, 0);
  });

  it("ENTITY_UNRESOLVED permanece explícito y no inventa entidad", async () => {
    const { result } = await runFixture("arr-entity-unresolved-full-cycle.json");
    assert.equal(envelope(result).status, "ENTITY_UNRESOLVED");
    assert.equal(envelope(result).entity_resolution.state, "UNRESOLVED");
    assert.equal(Object.prototype.hasOwnProperty.call(envelope(result).subject || {}, "entity_id"), false);
    assert.equal(result.ies.knowledge_coverage.unresolved_entities.includes("arr"), true);
    assert.equal(result.ies.knowledge_coverage.unresolved_entities.includes("9001"), true);
    assert.equal(result.ies.knowledge_coverage.unresolved_entities.includes("SYN-NTE"), false);
    assert.equal(result.ies.facts.length, 0);
  });

  it("QUERY_SCOPE_INCOMPLETE permanece parcial/incompleto", async () => {
    const { result } = await runFixture("arr-scope-incomplete-full-cycle.json");
    assert.equal(envelope(result).status, "QUERY_SCOPE_INCOMPLETE");
    assert.equal(envelope(result).scope_complete, false);
    assert.deepEqual(result.ies.knowledge_coverage.incomplete_scopes, ["arr"]);
    assert.equal(result.ies.status, "PARTIAL");
    assert.equal(Object.prototype.hasOwnProperty.call(result.query_context_metadata, "period"), false);
  });

  it("ninguna ruta fail-closed fabrica Evidence/Diagnosis/Hypothesis", async () => {
    const names = [
      "arr-empty-full-cycle.json",
      "arr-tool-error-full-cycle.json",
      "arr-entity-unresolved-full-cycle.json",
      "arr-scope-incomplete-full-cycle.json",
    ];
    for (const name of names) {
      const { result } = await runFixture(name);
      assert.equal(result.ies.evidence.length, 0, name);
      assert.equal(result.ies.diagnoses.length, 0, name);
      assert.equal(result.reasoning_result.hypotheses.length, 0, name);
    }
  });
});

describe("Director IA real cycle — boundaries y no mutación", () => {
  it("no muta input, arr_cycle, IES ni Reasoning Result", async () => {
    const { input, before, result } = await runFixture("arr-ok-full-cycle.json");
    assert.deepEqual(input, before);
    const arrFrozen = serialized(result.arr_cycle);
    const iesFrozen = serialized(result.ies);
    const reFrozen = serialized(result.reasoning_result);
    assert.equal(serialized(result.arr_cycle), arrFrozen);
    assert.equal(serialized(result.ies), iesFrozen);
    assert.equal(serialized(result.reasoning_result), reFrozen);
    assert.equal(result.query_context_metadata.trace_id, result.trace_id);
    assert.equal(before.query_context_metadata.trace_id, "replaced_by_arr_facade");
  });

  it("runtime de composición no crea artefactos N1-N5 ni toca proyección N4", () => {
    const src = fs.readFileSync(LIB_PATH, "utf8");
    const iesSrc = fs.readFileSync(IES_LIB, "utf8");
    assert.equal(/to_n1|to_n2|to_n3|to_n4|assemble\(|append_snapshot|process\(/.test(src), false);
    assert.equal(src.includes("iesBuilder.build"), true);
    assert.equal(src.includes("reasoningEngine.reason"), true);
    assert.equal(src.includes("channelProjection.project"), true);
    assert.equal(iesSrc.includes("function projectDiagnoses"), true);
    assert.equal(iesSrc.includes("return list.map((d) => cloneJson(d));"), true);
  });

  it("no importa Twilio, WhatsApp/chat, SDK LLM, SQL ni server.js", () => {
    const src = fs.readFileSync(LIB_PATH, "utf8");
    assert.equal(/require\(["']twilio["']\)/.test(src), false);
    assert.equal(/whatsapp|director-ia-chat|openai|anthropic/i.test(src), false);
    assert.equal(/server\.js|\bSELECT\b|\bINSERT\b/.test(src), false);
    for (const marker of SECRET_MARKERS) {
      assert.equal(src.includes(marker), false, marker);
    }
  });
});
