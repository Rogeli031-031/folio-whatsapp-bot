"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const {
  createChannelProjection,
  createDefaultPolicyRegistry,
  CHANNELS,
  DEPTHS,
  SEMANTIC_TYPES,
  CONTENT_CLASSES,
  PRIORITIES,
  PROJECTION_MODEL_VERSION,
  OUTPUT_ENVELOPE_VERSION,
} = require("../lib/director-ia-channel-projection");

const FIX_DIR = path.join(__dirname, "..", "fixtures", "director-ia", "channel-projection");
const LIB_PATH = path.join(__dirname, "..", "lib", "director-ia-channel-projection.js");

const MODEL_ROOT = [
  "projection_id",
  "ies_id",
  "ies_version",
  "reasoning_run_id",
  "channel",
  "projection_depth",
  "items",
  "critical_invariants",
  "deferred_items",
  "limitations",
  "audit",
];

const ITEM_FIELDS = [
  "item_id",
  "source_type",
  "source_id",
  "semantic_type",
  "content_class",
  "priority",
  "statement_or_reference",
  "supporting_references",
  "must_preserve",
  "may_summarize",
  "may_defer",
];

const OUTPUT_ROOT = [
  "projection_id",
  "channel",
  "projection_depth",
  "ies_id",
  "reasoning_run_id",
  "content_blocks",
  "deferred_content",
  "critical_invariants",
  "limitations",
  "audit",
];

function loadFix(name) {
  const raw = JSON.parse(fs.readFileSync(path.join(FIX_DIR, name), "utf8"));
  assert.equal(raw.meta.figures, "ILUSTRATIVAS / FICTICIAS");
  assert.equal(raw.meta.not_institutional_coverage, true);
  return raw;
}

function projector(registry) {
  let n = 0;
  return createChannelProjection({
    policyRegistry: registry || createDefaultPolicyRegistry(),
    clock: () => "2026-08-17T13:23:41.000Z",
    idFactory: (prefix) => `${prefix || "id"}_${++n}`,
  });
}

function projectFix(name, overrides) {
  const fix = loadFix(name);
  const args = Object.assign(
    {
      ies: clone(fix.ies),
      reasoningResult: fix.reasoningResult === undefined ? null : clone(fix.reasoningResult),
      reasoningRunId: fix.reasoningRunId === undefined ? null : fix.reasoningRunId,
      channel: fix.channel,
      projectionDepth: fix.projectionDepth,
    },
    overrides || {}
  );
  return projector().project(args);
}

function clone(v) {
  return v === undefined || v === null ? v : JSON.parse(JSON.stringify(v));
}

function assertModelShape(model) {
  for (const key of MODEL_ROOT) {
    assert.ok(Object.prototype.hasOwnProperty.call(model, key), key);
  }
  assert.ok(Array.isArray(model.items));
  assert.ok(Array.isArray(model.deferred_items));
  assert.ok(Array.isArray(model.critical_invariants));
  assert.ok(Array.isArray(model.limitations));
}

function assertItemShape(item) {
  for (const key of ITEM_FIELDS) {
    assert.ok(Object.prototype.hasOwnProperty.call(item, key), key);
  }
  assert.ok(SEMANTIC_TYPES.includes(item.semantic_type), item.semantic_type);
  assert.ok(CONTENT_CLASSES.includes(item.content_class), item.content_class);
  assert.ok(PRIORITIES.includes(item.priority), item.priority);
}

function assertOutputShape(out) {
  for (const key of OUTPUT_ROOT) {
    assert.ok(Object.prototype.hasOwnProperty.call(out, key), key);
  }
  assert.ok(Array.isArray(out.content_blocks));
  assert.ok(Array.isArray(out.deferred_content));
}

function irrenunciable(model) {
  return model.items.filter((i) => i.content_class === "IRRENUNCIABLE");
}

describe("CP — factory y dependencias", () => {
  it("factory expone project", () => {
    const cp = projector();
    assert.equal(typeof cp.project, "function");
  });

  it("dependencias inyectadas obligatorias", () => {
    assert.throws(() => createChannelProjection({}), (err) => err && err.code === "INVALID_DEPENDENCIES");
    assert.throws(
      () => createChannelProjection({ policyRegistry: createDefaultPolicyRegistry() }),
      (err) => err && err.code === "INVALID_DEPENDENCIES"
    );
    assert.throws(
      () =>
        createChannelProjection({
          policyRegistry: createDefaultPolicyRegistry(),
          clock: () => "t",
        }),
      (err) => err && err.code === "INVALID_DEPENDENCIES"
    );
  });

  it("channel inválido falla", () => {
    const fix = loadFix("chat-no-knowledge.json");
    assert.throws(
      () => projector().project({ ies: fix.ies, channel: "TELEGRAM", projectionDepth: "L0_FLASH" }),
      (err) => err && err.code === "INVALID_CHANNEL"
    );
  });

  it("projectionDepth inválido falla", () => {
    const fix = loadFix("chat-no-knowledge.json");
    assert.throws(
      () => projector().project({ ies: fix.ies, channel: "CHAT", projectionDepth: "L9" }),
      (err) => err && err.code === "INVALID_DEPTH"
    );
  });

  it("IES obligatorio", () => {
    assert.throws(
      () => projector().project({ channel: "CHAT", projectionDepth: "L0_FLASH" }),
      (err) => err && err.code === "IES_REQUIRED"
    );
  });

  it("no acepta Snapshot como bypass", () => {
    const fix = loadFix("chat-no-knowledge.json");
    assert.throws(
      () =>
        projector().project({
          ies: fix.ies,
          snapshot: { snapshot_id: "x" },
          channel: "CHAT",
          projectionDepth: "L0_FLASH",
        }),
      (err) => err && err.code === "INVALID_IES"
    );
  });
});

describe("CP — Reasoning opcional y no relleno N5", () => {
  it("Reasoning Result opcional", () => {
    const out = projectFix("chat-no-knowledge.json");
    assert.equal(out.projection_model.reasoning_run_id, null);
    assert.equal(
      out.projection_model.items.some((i) => i.semantic_type === "HYPOTHESIS"),
      false
    );
  });

  it("sin Reasoning Result no se fabrica N5", () => {
    const out = projectFix("whatsapp-type-e.json");
    const types = new Set(out.projection_model.items.map((i) => i.semantic_type));
    assert.equal(types.has("HYPOTHESIS"), false);
    assert.equal(types.has("RECOMMENDATION"), false);
    assert.equal(types.has("DECISION_OPTION"), false);
    assert.equal(out.projection_model.reasoning_run_id, null);
  });
});

describe("CP — Projection Model y Envelope", () => {
  it("Projection Model root completo", () => {
    const out = projectFix("chat-no-knowledge.json");
    assertModelShape(out.projection_model);
    assert.equal(out.projection_model.audit.projection_model_version, PROJECTION_MODEL_VERSION);
  });

  it("Projection Item shape completo", () => {
    const out = projectFix("chat-no-knowledge.json");
    assert.ok(out.projection_model.items.length > 0);
    for (const item of out.projection_model.items.concat(out.projection_model.deferred_items)) {
      assertItemShape(item);
    }
  });

  it("Channel Output Envelope root completo", () => {
    const out = projectFix("chat-no-knowledge.json");
    assertOutputShape(out.channel_output);
    assert.equal(out.channel_output.audit.output_envelope_version, OUTPUT_ENVELOPE_VERSION);
    assert.equal(out.channel_output.projection_id, out.projection_model.projection_id);
  });

  it("semantic_type solo enum autorizado", () => {
    const out = projectFix("dashboard-supported-reasoning.json");
    for (const item of out.projection_model.items.concat(out.projection_model.deferred_items)) {
      assert.ok(SEMANTIC_TYPES.includes(item.semantic_type));
    }
  });

  it("content_class solo enum autorizado", () => {
    const out = projectFix("dashboard-supported-reasoning.json");
    for (const item of out.projection_model.items.concat(out.projection_model.deferred_items)) {
      assert.ok(CONTENT_CLASSES.includes(item.content_class));
    }
  });

  it("priority solo enum autorizado", () => {
    const out = projectFix("report-audit.json");
    for (const item of out.projection_model.items.concat(out.projection_model.deferred_items)) {
      assert.ok(PRIORITIES.includes(item.priority));
    }
  });
});

describe("CP — IRRENUNCIABLE y priority de exposición", () => {
  it("NO_KNOWLEDGE -> IRRENUNCIABLE/P0", () => {
    const out = projectFix("chat-no-knowledge.json");
    const cov = out.projection_model.items.find((i) => i.semantic_type === "COVERAGE");
    assert.ok(cov);
    assert.equal(cov.content_class, "IRRENUNCIABLE");
    assert.equal(cov.priority, "P0_CRITICAL");
    assert.equal(cov.statement_or_reference, "COV_NO_KNOWLEDGE");
    assert.equal(cov.may_defer, false);
  });

  it("Tipo E -> IRRENUNCIABLE/P0", () => {
    const out = projectFix("whatsapp-type-e.json");
    const conflict = out.projection_model.items.find(
      (i) => i.source_id === "c_cp_wa_e" && i.semantic_type === "CONFLICT"
    );
    assert.ok(conflict);
    assert.equal(conflict.content_class, "IRRENUNCIABLE");
    assert.equal(conflict.priority, "P0_CRITICAL");
    assert.equal(conflict.statement_or_reference, "CONF_TYPE_E_GOVERNANCE");
  });

  it("blocking limitation -> IRRENUNCIABLE/P0", () => {
    const out = projectFix("chat-no-knowledge.json");
    const lim = out.projection_model.items.find((i) => i.source_id === "lim_cp_chat_SOURCE_NOT_INTEGRATED");
    assert.ok(lim);
    assert.equal(lim.content_class, "IRRENUNCIABLE");
    assert.equal(lim.priority, "P0_CRITICAL");
  });

  it("IRRENUNCIABLE prevalece sobre otras clases", () => {
    const out = projectFix("whatsapp-type-e.json");
    const lim = out.projection_model.items.find((i) => i.semantic_type === "LIMITATION");
    assert.ok(lim);
    assert.equal(lim.content_class, "IRRENUNCIABLE");
    const fact = out.projection_model.deferred_items
      .concat(out.projection_model.items)
      .find((i) => i.source_id === "fact_cp_wa_1");
    assert.ok(fact);
    assert.equal(fact.content_class, "DIFERIBLE_BAJO_DEMANDA");
    assert.equal(fact.priority, "P3_DETAIL");
  });

  it("priority no copia materiality/severity/confidence", () => {
    const src = fs.readFileSync(LIB_PATH, "utf8");
    assert.equal(/materiality\s*[:=]/.test(src), false);
    assert.equal(src.includes("hypothesis_strength"), false);
    const out = projectFix("whatsapp-type-e.json");
    for (const item of out.projection_model.items) {
      assert.equal(Object.prototype.hasOwnProperty.call(item, "materiality"), false);
      assert.equal(Object.prototype.hasOwnProperty.call(item, "severity"), false);
      assert.equal(Object.prototype.hasOwnProperty.call(item, "confidence"), false);
    }
  });
});

describe("CP — L0–L3 y progressive disclosure", () => {
  it("L0 conserva todo IRRENUNCIABLE", () => {
    const out = projectFix("chat-no-knowledge.json", { projectionDepth: "L0_FLASH" });
    assert.ok(irrenunciable(out.projection_model).length >= 2);
    for (const item of irrenunciable(out.projection_model)) {
      assert.equal(item.may_defer, false);
      assert.equal(
        out.projection_model.deferred_items.some((d) => d.source_id === item.source_id),
        false
      );
    }
  });

  it("L1 conserva OBLIGATORIO_RESUMIBLE", () => {
    const out = projectFix("dashboard-supported-reasoning.json", { projectionDepth: "L1_EXECUTIVE" });
    const types = out.projection_model.items.map((i) => i.semantic_type);
    assert.ok(types.includes("DIAGNOSIS"));
    assert.ok(types.includes("HYPOTHESIS"));
    assert.ok(types.includes("RECOMMENDATION"));
    assert.ok(types.includes("EVIDENCE"));
  });

  it("L2 añade soporte", () => {
    const l1 = projectFix("dashboard-supported-reasoning.json", { projectionDepth: "L1_EXECUTIVE" });
    const l2 = projectFix("dashboard-supported-reasoning.json", { projectionDepth: "L2_SUPPORT" });
    const l1Ids = new Set(l1.projection_model.items.map((i) => i.source_id));
    const l2Ids = new Set(l2.projection_model.items.map((i) => i.source_id));
    assert.ok(l2Ids.has("fact_cp_dash_1"));
    assert.ok(l2Ids.has("oq_cp_dash_1"));
    assert.ok(l2.projection_model.items.length >= l1.projection_model.items.length);
    for (const id of l1Ids) assert.ok(l2Ids.has(id), id);
  });

  it("L3 conserva audit/deferred", () => {
    const out = projectFix("report-audit.json", { projectionDepth: "L3_AUDIT" });
    const audit = out.projection_model.items.find((i) => i.semantic_type === "AUDIT_REFERENCE");
    assert.ok(audit);
    assert.equal(out.projection_model.deferred_items.length, 0);
    assert.ok(out.projection_model.items.some((i) => i.source_id === "fact_cp_report_1"));
  });

  it("IRRENUNCIABLE nunca deferred", () => {
    for (const depth of DEPTHS) {
      const out = projectFix("whatsapp-type-e.json", { projectionDepth: depth });
      for (const d of out.projection_model.deferred_items) {
        assert.notEqual(d.content_class, "IRRENUNCIABLE");
        assert.notEqual(d.source_id, "c_cp_wa_e");
      }
      for (const block of out.channel_output.deferred_content) {
        assert.notEqual(block.content_class, "IRRENUNCIABLE");
      }
    }
  });
});

describe("CP — equivalencia crítica y fronteras RE", () => {
  it("critical equivalence detecta omisión", () => {
    const registry = createDefaultPolicyRegistry();
    registry.CHAT = {
      policy_id: "CHAT_POLICY_V1",
      render() {
        return { content_blocks: [], deferred_content: [], limitations: [] };
      },
    };
    const fix = loadFix("chat-no-knowledge.json");
    assert.throws(
      () =>
        projector(registry).project({
          ies: fix.ies,
          channel: "CHAT",
          projectionDepth: "L0_FLASH",
        }),
      (err) => err && err.code === "CRITICAL_EQUIVALENCE_FAILED"
    );
  });

  it("abstention de RE permanece visible", () => {
    const out = projectFix("voice-abstention.json");
    const abs = out.projection_model.items.find((i) => i.source_id === "abs_cp_voice_1");
    assert.ok(abs);
    assert.equal(abs.semantic_type, "ABSTENTION");
    assert.equal(abs.content_class, "IRRENUNCIABLE");
    assert.ok(out.channel_output.content_blocks.some((b) => b.item_id === abs.item_id));
    assert.equal(out.projection_model.items.some((i) => i.semantic_type === "HYPOTHESIS"), false);
  });

  it("Decision Option conserva NOT_EXECUTED", () => {
    const out = projectFix("presentation-decision-option.json");
    const opt = out.projection_model.items.find((i) => i.semantic_type === "DECISION_OPTION");
    assert.ok(opt);
    assert.ok(opt.supporting_references.includes("NOT_EXECUTED"));
    const block = out.channel_output.content_blocks.find((b) => b.item_id === opt.item_id);
    assert.ok(block);
    assert.equal(block.execution_status, "NOT_EXECUTED");
  });

  it("Recommendation no se marca ejecutada", () => {
    const out = projectFix("presentation-decision-option.json");
    const rec = out.projection_model.items.find((i) => i.semantic_type === "RECOMMENDATION");
    assert.ok(rec);
    assert.equal(Object.prototype.hasOwnProperty.call(rec, "execution_status"), false);
    const block = out.channel_output.content_blocks.find((b) => b.item_id === rec.item_id);
    assert.ok(block);
    assert.equal(block.execution_status, undefined);
  });
});

describe("CP — seis policies determinísticas", () => {
  it("CHAT policy determinística", () => {
    const out = projectFix("chat-no-knowledge.json");
    assert.equal(out.channel_output.channel, "CHAT");
    assert.ok(out.channel_output.content_blocks.every((b) => b.block_kind === "paragraph"));
    assert.ok(out.channel_output.content_blocks.some((b) => b.content_class === "IRRENUNCIABLE"));
    assert.ok(out.channel_output.content_blocks.every((b) => b.epistemic_lane));
  });

  it("VOICE policy determinística", () => {
    const out = projectFix("voice-abstention.json");
    assert.equal(out.channel_output.channel, "VOICE");
    assert.ok(out.channel_output.content_blocks.every((b) => b.block_kind === "linear_utterance"));
    const first = out.channel_output.content_blocks[0];
    assert.equal(first.content_class, "IRRENUNCIABLE");
  });

  it("WHATSAPP policy determinística", () => {
    const out = projectFix("whatsapp-type-e.json");
    assert.equal(out.channel_output.channel, "WHATSAPP");
    const firstGroup = out.channel_output.content_blocks.filter((b) => b.first_block_group);
    assert.ok(firstGroup.length > 0);
    assert.ok(firstGroup.every((b) => b.content_class === "IRRENUNCIABLE"));
    assert.ok(out.channel_output.content_blocks.every((b) => b.block_kind === "compact_message"));
  });

  it("DASHBOARD policy determinística", () => {
    const out = projectFix("dashboard-supported-reasoning.json");
    assert.equal(out.channel_output.channel, "DASHBOARD");
    assert.ok(out.channel_output.content_blocks.every((b) => b.block_kind === "panel"));
    assert.ok(out.channel_output.content_blocks.every((b) => b.drill_down === false));
    assert.equal(out.channel_output.ies_id, out.projection_model.ies_id);
    assert.equal(out.channel_output.reasoning_run_id, "run_cp_dash_ilustrativo");
  });

  it("REPORT policy determinística", () => {
    const out = projectFix("report-audit.json");
    assert.equal(out.channel_output.channel, "REPORT");
    assert.ok(out.channel_output.content_blocks.every((b) => b.block_kind === "persistent_section"));
    assert.ok(out.projection_model.items.some((i) => i.semantic_type === "AUDIT_REFERENCE"));
    assert.ok(out.projection_model.items.some((i) => i.content_class === "IRRENUNCIABLE"));
  });

  it("PRESENTATION policy determinística", () => {
    const out = projectFix("presentation-decision-option.json");
    const blocks = out.channel_output.content_blocks;
    assert.ok(blocks.every((b) => b.block_kind === "guided_step"));
    const recIdx = blocks.findIndex((b) => b.semantic_type === "RECOMMENDATION");
    const irrIdx = blocks.findIndex((b) => b.content_class === "IRRENUNCIABLE");
    if (irrIdx >= 0 && recIdx >= 0) assert.ok(irrIdx < recIdx);
    const opt = blocks.find((b) => b.semantic_type === "DECISION_OPTION");
    assert.ok(opt);
    assert.equal(opt.execution_status, "NOT_EXECUTED");
    assert.equal(opt.decision_taken, false);
  });
});

describe("CP — tono, no mutación, determinismo, no LLM", () => {
  it("tone no altera statement/reference", () => {
    const fix = loadFix("chat-no-knowledge.json");
    const out = projectFix("chat-no-knowledge.json");
    for (const block of out.channel_output.content_blocks) {
      const item = out.projection_model.items.find((i) => i.item_id === block.item_id);
      assert.ok(item);
      assert.equal(block.statement_or_reference, item.statement_or_reference);
    }
    const cov = out.projection_model.items.find((i) => i.semantic_type === "COVERAGE");
    assert.equal(cov.statement_or_reference, fix.ies.knowledge_coverage.coverage_token);
  });

  it("input IES no mutado", () => {
    const fix = loadFix("whatsapp-type-e.json");
    const ies = clone(fix.ies);
    const before = JSON.stringify(ies);
    projector().project({
      ies,
      channel: "WHATSAPP",
      projectionDepth: "L1_EXECUTIVE",
    });
    assert.equal(JSON.stringify(ies), before);
  });

  it("input Reasoning Result no mutado", () => {
    const fix = loadFix("voice-abstention.json");
    const ies = clone(fix.ies);
    const rr = clone(fix.reasoningResult);
    const beforeIes = JSON.stringify(ies);
    const beforeRr = JSON.stringify(rr);
    projector().project({
      ies,
      reasoningResult: rr,
      reasoningRunId: fix.reasoningRunId,
      channel: "VOICE",
      projectionDepth: "L1_EXECUTIVE",
    });
    assert.equal(JSON.stringify(ies), beforeIes);
    assert.equal(JSON.stringify(rr), beforeRr);
  });

  it("runtime no importa LLM/provider SDK", () => {
    const src = fs.readFileSync(LIB_PATH, "utf8");
    assert.equal(src.includes("openai"), false);
    assert.equal(src.includes("anthropic"), false);
    assert.equal(src.includes("require(\"axios\")"), false);
    assert.equal(src.includes("require(\"twilio\")"), false);
    assert.equal(src.includes("require(\"pg\")"), false);
    assert.equal(/require\([\"']http[\"']\)/.test(src), false);
    assert.equal(/require\([\"']net[\"']\)/.test(src), false);
  });

  it("runtime no contiene networking/tool calls", () => {
    const src = fs.readFileSync(LIB_PATH, "utf8");
    assert.equal(src.includes("fetch("), false);
    assert.equal(src.includes("http.request"), false);
    assert.equal(src.includes("net.connect"), false);
    assert.equal(src.includes("execTool"), false);
    assert.equal(src.includes("WhoAmI"), false);
    assert.equal(src.includes("small talk"), false);
  });

  it("mismo input/policy produce misma estructura salvo IDs/timestamps inyectados", () => {
    const fix = loadFix("dashboard-supported-reasoning.json");
    const a = projector().project({
      ies: clone(fix.ies),
      reasoningResult: clone(fix.reasoningResult),
      reasoningRunId: fix.reasoningRunId,
      channel: "DASHBOARD",
      projectionDepth: "L2_SUPPORT",
    });
    const b = projector().project({
      ies: clone(fix.ies),
      reasoningResult: clone(fix.reasoningResult),
      reasoningRunId: fix.reasoningRunId,
      channel: "DASHBOARD",
      projectionDepth: "L2_SUPPORT",
    });
    function stripIds(obj) {
      const copy = JSON.parse(JSON.stringify(obj));
      delete copy.projection_id;
      delete copy.audit.generated_at;
      for (const item of copy.items || []) delete item.item_id;
      for (const inv of copy.critical_invariants || []) delete inv.item_id;
      for (const d of copy.deferred_items || []) delete d.item_id;
      for (const block of copy.content_blocks || []) {
        delete block.block_id;
        delete block.item_id;
      }
      for (const d of copy.deferred_content || []) delete d.item_id;
      return copy;
    }
    assert.deepEqual(stripIds(a.projection_model), stripIds(b.projection_model));
    assert.deepEqual(stripIds(a.channel_output), stripIds(b.channel_output));
  });

  it("seis canales y cuatro depths proyectan el mismo ies_id", () => {
    const fix = loadFix("report-audit.json");
    for (const channel of CHANNELS) {
      for (const depth of DEPTHS) {
        const out = projector().project({
          ies: clone(fix.ies),
          channel,
          projectionDepth: depth,
        });
        assert.equal(out.projection_model.ies_id, fix.ies.ies_id);
        assert.equal(out.channel_output.ies_id, fix.ies.ies_id);
        assert.ok(irrenunciable(out.projection_model).length > 0);
      }
    }
  });
});
