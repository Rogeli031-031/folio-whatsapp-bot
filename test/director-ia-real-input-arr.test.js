"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { createDirectorIaArrInput, TOOL_ID, METRIC } = require("../lib/director-ia-real-input-arr");
const { createObservationPipeline } = require("../lib/director-ia-observation-pipeline");
const { createEvidenceBuilder } = require("../lib/director-ia-evidence-builder");
const { createEks } = require("../lib/director-ia-eks");

const FIX_DIR = path.join(__dirname, "..", "fixtures", "director-ia", "real-input-arr");
const LIB_PATH = path.join(__dirname, "..", "lib", "director-ia-real-input-arr.js");
const CLOCK = () => "2026-08-17T22:27:00.000Z";
const FORBIDDEN_STATUSES = ["SOURCE_RESTRICTED", "SOURCE_NOT_INTEGRATED", "ABSENCE_CONFIRMED"];
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

function arrSourceFromFixture(fix, calls) {
  return async function loadArrProyForPlant(client, year, month, plant_code) {
    calls.push({ client, year, month, plant_code });
    if (fix.arr_source_error) {
      const err = new Error("arr_source_error");
      err.code = fix.arr_source_error.code || "TOOL_ERROR";
      throw err;
    }
    return clone(fix.arr_source_result);
  };
}

function harness(arrSource, extras) {
  const prefixes = [];
  const facadeIdFactory = (prefix) => {
    prefixes.push(prefix);
    const n = prefixes.filter((p) => p === prefix).length;
    return `${prefix}_${n}`;
  };
  let opId = 0;
  let ebId = 0;
  const assembleCalls = [];
  const appendCalls = [];
  const inferCalls = [];
  const projectCalls = [];
  const sendCalls = [];

  const opInner = createObservationPipeline({
    clock: CLOCK,
    idFactory: (prefix) => `${prefix}_op_${++opId}`,
  });
  const ebInner = createEvidenceBuilder({
    produced_at: CLOCK(),
    idFactory: (prefix) => `${prefix}_eb_${++ebId}`,
  });
  const eksInner = createEks();

  const observationPipeline = {
    process(envelopes) {
      return opInner.process(envelopes);
    },
  };
  const evidenceBuilder = {
    assemble(input) {
      assembleCalls.push(clone(input));
      return ebInner.assemble(input);
    },
  };
  const eks = {
    validate_structure(bundle) {
      return eksInner.validate_structure(bundle);
    },
    async append_snapshot(bundle) {
      appendCalls.push(clone(bundle));
      return eksInner.append_snapshot(bundle);
    },
  };

  const reasoningEngine = {
    infer(req) {
      inferCalls.push(req);
      throw new Error("RE_MUST_NOT_RUN");
    },
  };
  const channelProjection = {
    project(req) {
      projectCalls.push(req);
      throw new Error("CP_MUST_NOT_RUN");
    },
  };
  const twilio = {
    send(req) {
      sendCalls.push(req);
      throw new Error("TWILIO_MUST_NOT_RUN");
    },
  };

  const facade = createDirectorIaArrInput({
    arrSource,
    observationPipeline,
    evidenceBuilder,
    eks,
    idFactory: facadeIdFactory,
    clock: CLOCK,
    reasoningEngine,
    channelProjection,
    twilio,
    ...(extras || {}),
  });

  return {
    facade,
    prefixes,
    assembleCalls,
    appendCalls,
    inferCalls,
    projectCalls,
    sendCalls,
    reasoningEngine,
    channelProjection,
    twilio,
  };
}

function publicInput(input) {
  const copy = clone(input);
  delete copy.client;
  return copy;
}

async function runFixture(name, extras) {
  const fix = loadFix(name);
  const calls = [];
  const source = extras && extras.arrSource ? extras.arrSource : arrSourceFromFixture(fix, calls);
  const h = harness(source, extras);
  const input = clone(fix.input);
  if (extras && Object.prototype.hasOwnProperty.call(extras, "client")) {
    input.client = extras.client;
  } else {
    input.client = { kind: "synthetic_pg_client" };
  }
  const before = clone(publicInput(input));
  const result = await h.facade.run(input);
  return { fix, h, input, before, result, arrCalls: calls };
}

function envelopeOf(result) {
  assert.ok(Array.isArray(result.envelopes));
  assert.equal(result.envelopes.length, 1);
  return result.envelopes[0];
}

function assertNoSecrets(value) {
  const text = serialized(value);
  for (const marker of SECRET_MARKERS) {
    assert.equal(text.includes(marker), false, marker);
  }
}

function assertNoInventedStatuses(result) {
  const text = serialized(result.envelopes) + serialized(result.acquisition_statuses);
  for (const status of FORBIDDEN_STATUSES) {
    assert.equal(text.includes(status), false, status);
  }
}

describe("Director IA ARR input — factory", () => {
  it("factory expone run", () => {
    const h = harness(async () => ({ venta_ton: 1, desc_kg: null }));
    assert.equal(typeof h.facade.run, "function");
  });

  it("dependencias inyectadas obligatorias", () => {
    assert.throws(
      () => createDirectorIaArrInput({}),
      (err) => err && err.code === "INVALID_DEPENDENCIES"
    );
    assert.throws(
      () =>
        createDirectorIaArrInput({
          arrSource: async () => ({}),
          clock: CLOCK,
          idFactory: () => "x",
        }),
      (err) => err && err.code === "INVALID_DEPENDENCIES"
    );
  });

  it("acepta arrSource.execute además de la firma loadArrProyForPlant", async () => {
    const fix = loadFix("arr-success-one-record.json");
    const executeCalls = [];
    const h = harness({
      execute: async (query) => {
        executeCalls.push(query);
        return clone(fix.arr_source_result);
      },
    });
    const result = await h.facade.run(clone(fix.input));
    assert.equal(envelopeOf(result).status, "ACQUIRED_OK");
    assert.equal(executeCalls.length, 1);
    assert.equal(executeCalls[0].plant_code, "SYN-NTE");
    assert.equal(executeCalls[0].year, 2026);
    assert.equal(executeCalls[0].month, 7);
  });
});

describe("Director IA ARR input — validación de planta_id", () => {
  it("planta_id ausente falla antes de ejecutar ARR", async () => {
    const calls = [];
    const h = harness(async (...args) => {
      calls.push(args);
      return { venta_ton: 1 };
    });
    await assert.rejects(
      () =>
        h.facade.run({
          plant_code: "SYN-NTE",
          year: 2026,
          month: 7,
        }),
      (err) => err && err.code === "INVALID_INPUT" && /planta_id_required/.test(err.message)
    );
    assert.equal(calls.length, 0);
  });

  it("planta_id inválido falla antes de ejecutar ARR", async () => {
    const calls = [];
    const h = harness(async (...args) => {
      calls.push(args);
      return { venta_ton: 1 };
    });
    for (const planta_id of [0, -3, "abc", "", null]) {
      await assert.rejects(
        () => h.facade.run({ planta_id, plant_code: "SYN-NTE", year: 2026, month: 7 }),
        (err) => err && err.code === "INVALID_INPUT"
      );
    }
    assert.equal(calls.length, 0);
  });
});

describe("Director IA ARR input — trace_id y no mutación", () => {
  it("crea exactamente un trace_id por ciclo y no lo regenera", async () => {
    const { h, result } = await runFixture("arr-success-one-record.json");
    const env = envelopeOf(result);
    assert.equal(h.prefixes.filter((p) => p === "trace").length, 1);
    assert.equal(env.trace_id, "trace_1");
    assert.equal(result.trace_id, "trace_1");
    assert.equal(result.acquisition_statuses[0].trace_id, "trace_1");
    assert.equal(result.observation_records[0].trace_id, "trace_1");
    assert.equal(result.bundle.trace_id, "trace_1");
    assert.equal(result.snapshot.trace_id, "trace_1");
  });

  it("no muta el input del caller", async () => {
    const { input, before } = await runFixture("arr-success-one-record.json");
    assert.deepEqual(publicInput(input), before);
  });
});

describe("Director IA ARR input — success one record", () => {
  it("éxito físico { venta_ton, desc_kg } mapea a MINIMAL_EXECUTION_ENVELOPE ACQUIRED_OK", async () => {
    const { result, arrCalls, fix } = await runFixture("arr-success-one-record.json");
    const env = envelopeOf(result);
    assert.equal(fix.expected_status, "ACQUIRED_OK");
    assert.equal(arrCalls.length, 1);
    assert.equal(arrCalls[0].year, 2026);
    assert.equal(arrCalls[0].month, 7);
    assert.equal(arrCalls[0].plant_code, "SYN-NTE");
    assert.equal(env.status, "ACQUIRED_OK");
    assert.equal(env.technical_state, "ACQUIRED_OK");
    assert.equal(env.tool_id, TOOL_ID);
    assert.equal(env.domain, "arr");
    assert.equal(env.metric_or_event, METRIC);
    assert.equal(env.payload.metric_or_event, "venta_ton");
    assert.equal(env.payload.value, 95);
    assert.equal(env.payload.unit, "t");
    assert.equal(env.payload.period, "2026-07");
    assert.equal(Object.prototype.hasOwnProperty.call(env.payload, "desc_kg"), false);
    assert.equal(result.acquisition_statuses[0].status, "ACQUIRED_OK");
    assert.equal(result.observation_records.length, 1);
    assert.equal(result.snapshot.version, 1);
  });
});

describe("Director IA ARR input — success multiple records", () => {
  it("fuente inyectada con rows produce ACQUIRED_OK y varios ObservationRecord vía OP", async () => {
    const { result } = await runFixture("arr-success-multiple-records.json");
    const env = envelopeOf(result);
    assert.equal(env.status, "ACQUIRED_OK");
    assert.ok(Array.isArray(env.payload.rows));
    assert.equal(env.payload.rows.length, 2);
    assert.equal(env.payload.rows[0].metric_or_event, "venta_ton");
    assert.equal(env.payload.rows[1].value, 120);
    assert.equal(result.observation_records.length, 2);
    assert.equal(result.acquisition_statuses.length, 1);
  });
});

describe("Director IA ARR input — empty", () => {
  it("éxito técnico sin venta_ton transportable es ACQUIRED_EMPTY, no ausencia de negocio", async () => {
    const { result } = await runFixture("arr-empty.json");
    const env = envelopeOf(result);
    assert.equal(env.status, "ACQUIRED_EMPTY");
    assert.equal(env.metric_or_event, "venta_ton");
    assert.deepEqual(env.payload, {});
    assert.equal(serialized(env).includes("ABSENCE_CONFIRMED"), false);
    assert.equal(result.acquisition_statuses[0].status, "ACQUIRED_EMPTY");
    assert.equal(result.observation_records.length, 1);
    assert.equal(result.bundle.diagnoses.some((d) => d && d.code === "ABSENCE_CONFIRMED"), false);
    assert.equal(serialized(result.bundle).includes("ABSENCE_CONFIRMED"), false);
  });
});

describe("Director IA ARR input — tool error", () => {
  it("throw/timeout de ARR es TOOL_ERROR, no vacío de negocio", async () => {
    const { result, arrCalls } = await runFixture("arr-tool-error.json");
    const env = envelopeOf(result);
    assert.equal(arrCalls.length, 1);
    assert.equal(env.status, "TOOL_ERROR");
    assert.equal(env.error.code, "TIMEOUT");
    assert.equal(result.observation_records.length, 0);
    assert.equal(result.acquisition_statuses[0].status, "TOOL_ERROR");
    assert.equal(Object.prototype.hasOwnProperty.call(env, "payload"), false);
  });
});

describe("Director IA ARR input — entity unresolved", () => {
  it("sin plant_code no inventa entidad y no ejecuta ARR", async () => {
    const { result, arrCalls } = await runFixture("arr-entity-unresolved.json");
    const env = envelopeOf(result);
    assert.equal(arrCalls.length, 0);
    assert.equal(env.status, "ENTITY_UNRESOLVED");
    assert.equal(env.entity_resolution.state, "UNRESOLVED");
    assert.equal(env.entity_resolution.original_value, "9001");
    assert.deepEqual(env.entity_resolution.candidates, []);
    assert.equal(Object.prototype.hasOwnProperty.call(env.subject || {}, "entity_id"), false);
    assert.equal(result.observation_records.length, 0);
  });
});

describe("Director IA ARR input — scope incomplete", () => {
  it("year/month incompletos son QUERY_SCOPE_INCOMPLETE demostrable y no invocan ARR", async () => {
    const { result, arrCalls } = await runFixture("arr-scope-incomplete.json");
    const env = envelopeOf(result);
    assert.equal(arrCalls.length, 0);
    assert.equal(env.status, "QUERY_SCOPE_INCOMPLETE");
    assert.equal(env.scope_complete, false);
    assert.equal(env.metric_or_event, "venta_ton");
    assert.equal(result.acquisition_statuses[0].scope_complete, false);
    assert.equal(result.observation_records.length, 0);
  });
});

describe("Director IA ARR input — provenance", () => {
  it("preserva source.system, source_instance_id, extracted_by, triggered_by, raw_payload_reference y planta", async () => {
    const { result } = await runFixture("arr-success-one-record.json");
    const env = envelopeOf(result);
    assert.equal(env.source.system, "arr");
    assert.equal(env.source.source_family, "arr_snapshot");
    assert.equal(env.source.source_instance_id, "arr:SYN-NTE:execution_1");
    assert.equal(env.extracted_by, "get_arr_snapshot");
    assert.equal(env.triggered_by, "dashboard_auth_ilustrativo");
    assert.equal(env.raw_payload_reference, "raw://trace_1/get_arr_snapshot/execution_1/0");
    assert.equal(env.subject.entity_type, "planta");
    assert.equal(env.subject.entity_id, "SYN-NTE");
    const obs = result.observation_records[0];
    assert.equal(obs.source.system, "arr");
    assert.equal(obs.source.source_instance_id, env.source.source_instance_id);
    assert.equal(obs.extracted_by, "get_arr_snapshot");
    assert.equal(obs.triggered_by, "dashboard_auth_ilustrativo");
    assert.equal(obs.raw_payload_reference, env.raw_payload_reference);
    assert.equal(result.bundle.observations[0].source.system, "arr");
    assert.equal(result.bundle.observations[0].raw_payload_reference, env.raw_payload_reference);
  });

  it("content_author_id permanece null y no se inventa", async () => {
    const { result } = await runFixture("arr-success-one-record.json");
    const env = envelopeOf(result);
    assert.equal(env.source.content_author_id, null);
    assert.equal(result.observation_records[0].source.content_author_id, null);
    assert.equal(result.bundle.observations[0].source.content_author_id, null);
    assert.equal(result.bundle.observations[0].lineage.content_author_id, null);
  });
});

describe("Director IA ARR input — fronteras OP / EB / EKS", () => {
  it("adapter emite envelope, no ObservationRecord", async () => {
    const { result } = await runFixture("arr-success-one-record.json");
    const env = envelopeOf(result);
    assert.equal(Object.prototype.hasOwnProperty.call(env, "observation_id"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(env, "normalized_payload"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(env, "facts"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(env, "evidence"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(env, "diagnoses"), false);
  });

  it("OP es el único owner de AcquisitionStatus y ObservationRecord", async () => {
    const { result } = await runFixture("arr-success-one-record.json");
    const env = envelopeOf(result);
    assert.equal(Object.prototype.hasOwnProperty.call(env, "status"), true);
    assert.equal(result.acquisition_statuses[0].status, "ACQUIRED_OK");
    assert.ok(result.observation_records[0].observation_id);
    assert.equal(Object.prototype.hasOwnProperty.call(result.observation_records[0], "status"), false);
    assert.equal(serialized(result.bundle.observations).includes("ACQUIRED_OK"), false);
    assert.equal(result.bundle.traceability.acquisition[0].status, "ACQUIRED_OK");
  });

  it("EB consume solo salida OP, nunca raw ARR", async () => {
    const { h, result } = await runFixture("arr-success-one-record.json");
    assert.equal(h.assembleCalls.length, 1);
    const args = h.assembleCalls[0];
    assert.deepEqual(args.acquisition_statuses, result.acquisition_statuses);
    assert.deepEqual(args.observation_records, result.observation_records);
    assert.equal(Object.prototype.hasOwnProperty.call(args, "arr_source_result"), false);
    assert.equal(serialized(args).includes('"desc_kg"'), false);
    assert.equal(serialized(args).includes("synthetic_pg_client"), false);
  });

  it("solo Knowledge Bundle válido llega a EKS y trace_id sobrevive al snapshot", async () => {
    const { h, result } = await runFixture("arr-success-one-record.json");
    assert.equal(result.validation.ok, true);
    assert.equal(h.appendCalls.length, 1);
    assert.equal(h.appendCalls[0].producer, "evidence_builder");
    assert.equal(h.appendCalls[0].trace_id, result.trace_id);
    assert.equal(result.snapshot.trace_id, result.trace_id);
    assert.equal(result.snapshot.bundle.producer, "evidence_builder");
    assert.equal(result.snapshot.version, 1);
  });
});

describe("Director IA ARR input — vertical slice y guards", () => {
  it("ruta de éxito no invoca RE ni CP ni chat/Twilio", async () => {
    const { h } = await runFixture("arr-success-one-record.json");
    assert.equal(h.inferCalls.length, 0);
    assert.equal(h.projectCalls.length, 0);
    assert.equal(h.sendCalls.length, 0);
  });

  it("empty y tool error siguen fail-closed hasta EB/EKS", async () => {
    const empty = await runFixture("arr-empty.json");
    const error = await runFixture("arr-tool-error.json");
    assert.equal(empty.result.validation.ok, true);
    assert.equal(error.result.validation.ok, true);
    assert.equal(empty.result.snapshot.trace_id, empty.result.trace_id);
    assert.equal(error.result.snapshot.trace_id, error.result.trace_id);
    assert.equal(empty.result.bundle.producer, "evidence_builder");
    assert.equal(error.result.bundle.producer, "evidence_builder");
    assertNoInventedStatuses(empty.result);
    assertNoInventedStatuses(error.result);
  });

  it("no inventa SOURCE_RESTRICTED ni SOURCE_NOT_INTEGRATED", async () => {
    const names = [
      "arr-success-one-record.json",
      "arr-success-multiple-records.json",
      "arr-empty.json",
      "arr-tool-error.json",
      "arr-entity-unresolved.json",
      "arr-scope-incomplete.json",
    ];
    for (const name of names) {
      const { result } = await runFixture(name);
      assertNoInventedStatuses(result);
      assertNoSecrets(result.envelopes);
      assertNoSecrets(result.bundle);
    }
  });

  it("runtime nuevo no importa SDK de LLM/Twilio ni hardcodea credenciales", () => {
    const src = fs.readFileSync(LIB_PATH, "utf8");
    assert.equal(/require\(["']twilio["']\)/.test(src), false);
    assert.equal(/whatsapp/i.test(src), false);
    assert.equal(/openai|anthropic|@google-cloud|@aws-sdk/i.test(src), false);
    assert.equal(/director-ia-chat|director-ia-reasoning-engine|director-ia-channel-projection/.test(src), false);
    assert.equal(/director-ia-igf-arr/.test(src), false);
    for (const marker of SECRET_MARKERS) {
      assert.equal(src.includes(marker), false, marker);
    }
  });

  it("no contiene semántica SQL propia; solo invoca la abstracción ARR inyectada", () => {
    const src = fs.readFileSync(LIB_PATH, "utf8");
    assert.equal(/\bSELECT\b|\bINSERT\b|\bFROM igf\b|\bcomputePronosticoProyByPlant\b/.test(src), false);
    assert.equal(src.includes("invokeArrSource"), true);
    assert.equal(src.includes("loadArrProyForPlant"), true);
  });
});
