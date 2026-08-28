"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const {
  EVENT_TYPES,
  CODES,
  ZP_ALIASES,
  isGovernedZpClave,
  steeringAuthorityClass,
  recordExecutiveSteeringEvent,
  getExecutiveSteeringEvent,
  listExecutiveSteeringEvents,
  deleteExecutiveSteeringEvent,
  updateExecutiveSteeringEvent,
  validateRecordInput,
} = require("../lib/director-ia-executive-steering-capture");

const ROOT = path.join(__dirname, "..");
const LIB_SRC = fs.readFileSync(path.join(ROOT, "lib", "director-ia-executive-steering-capture.js"), "utf8");
const SQL_SRC = fs.readFileSync(path.join(ROOT, "sql", "020_executive_steering_capture.sql"), "utf8");

function zpAuth(over = {}) {
  return { role: "ZP", actor_id: 10, actor_nombre: "Director ZP", ...over };
}
function adAuth(over = {}) {
  return { role: "AD", actor_id: 11, ...over };
}
function ggAuth(plants, over = {}) {
  return { role: "GG", actor_id: 12, plantas_permitidas: plants, ...over };
}

function clone(x) {
  return JSON.parse(JSON.stringify(x));
}

function createMemoryClient() {
  let events = [];
  let plants = [];
  let rels = [];
  let nextEvent = 1;
  let nextRel = 1;
  let snap = null;
  let failOn = null;

  function snapshot() {
    snap = { events: clone(events), plants: clone(plants), rels: clone(rels), nextEvent, nextRel };
  }
  function restore() {
    if (!snap) return;
    events = snap.events;
    plants = snap.plants;
    rels = snap.rels;
    nextEvent = snap.nextEvent;
    nextRel = snap.nextRel;
    snap = null;
  }

  return {
    failNext(kind) {
      failOn = kind;
    },
    get events() {
      return events;
    },
    async query(sql, params = []) {
      const s = String(sql).replace(/\s+/g, " ").trim();
      if (s === "BEGIN") {
        snapshot();
        return { rows: [] };
      }
      if (s === "COMMIT") {
        snap = null;
        return { rows: [] };
      }
      if (s === "ROLLBACK") {
        restore();
        return { rows: [] };
      }
      if (/INSERT INTO arr\.executive_steering_events/i.test(s)) {
        if (failOn === "insert_event") throw new Error("forced insert_event fail");
        const row = {
          id: nextEvent++,
          event_type: params[0],
          attestation_state: "RECORDED",
          vigor: "CURRENT",
          raw_text: params[1],
          decision_outcome: params[2],
          metric_key: params[3],
          numeric_value: params[4],
          unit: params[5],
          value_mode: params[6],
          period_kind: params[7],
          period_year: params[8],
          period_month: params[9],
          period_start: params[10],
          period_end: params[11],
          scope_kind: params[12],
          scope_label: params[13],
          plant_id: params[14],
          declared_kind: params[15],
          declared_user_id: params[16],
          declared_role_key: params[17],
          declared_display_name: params[18],
          captured_by_usuario_id: params[19],
          extracted_by: null,
          source_type: params[20],
          source_id: params[21],
          source_location: params[22],
          meeting_ref: params[23],
          baseline_ref: params[24],
          baseline_value: params[25],
          baseline_source: params[26],
          declared_at: params[27],
          created_at: "2026-08-26T00:00:00Z",
          captured_at: "2026-08-26T00:00:00Z",
        };
        events.push(row);
        return { rows: [row] };
      }
      if (/INSERT INTO arr\.executive_steering_event_plants/i.test(s)) {
        if (failOn === "insert_plant") throw new Error("forced insert_plant fail");
        plants.push({ event_id: Number(params[0]), planta_id: Number(params[1]) });
        return { rows: [] };
      }
      if (/INSERT INTO arr\.executive_steering_event_relations/i.test(s)) {
        if (failOn === "insert_rel") throw new Error("forced insert_rel fail");
        rels.push({
          id: nextRel++,
          from_event_id: Number(params[0]),
          to_event_id: Number(params[1]),
          relation_kind: /REFERS_PROPOSAL/.test(s)
            ? "REFERS_PROPOSAL"
            : /CORRECTS/.test(s)
              ? "CORRECTS"
              : "SUPERSEDES",
          created_by_usuario_id: Number(params[2]),
          created_at: "2026-08-26T00:00:00Z",
        });
        return { rows: [] };
      }
      if (/UPDATE arr\.executive_steering_events SET vigor/i.test(s)) {
        const id = Number(params[0]);
        const ev = events.find((e) => e.id === id);
        if (ev) ev.vigor = "SUPERSEDED";
        return { rows: [] };
      }
      if (/SELECT \* FROM arr\.executive_steering_events WHERE id/i.test(s)) {
        const ev = events.find((e) => e.id === Number(params[0]));
        return { rows: ev ? [ev] : [] };
      }
      if (/SELECT planta_id FROM arr\.executive_steering_event_plants/i.test(s)) {
        return { rows: plants.filter((p) => p.event_id === Number(params[0])) };
      }
      if (/FROM arr\.executive_steering_event_relations/i.test(s)) {
        const id = Number(params[0]);
        return { rows: rels.filter((r) => r.from_event_id === id || r.to_event_id === id) };
      }
      if (/SELECT id FROM arr\.executive_steering_events/i.test(s)) {
        return { rows: events.map((e) => ({ id: e.id })) };
      }
      throw new Error("unhandled sql: " + s);
    },
  };
}

function plantProposal(over = {}) {
  return {
    event_type: "PROPOSAL",
    raw_text: "propongo revisar descuento",
    scope_kind: "PLANT",
    plant_id: 1,
    declared_kind: "UNKNOWN",
    ...over,
  };
}

describe("executive-steering-capture physical first slice", () => {
  it("1 ZP RECORD PLANT autorizado", async () => {
    const r = await recordExecutiveSteeringEvent(createMemoryClient(), zpAuth(), plantProposal());
    assert.equal(r.ok, true);
    assert.equal(r.event.attestation_state, "RECORDED");
    assert.equal(r.event.captured_by_usuario_id, 10);
  });

  it("2 AD RECORD autorizado", async () => {
    const r = await recordExecutiveSteeringEvent(createMemoryClient(), adAuth(), plantProposal({ plant_id: 9 }));
    assert.equal(r.ok, true);
  });

  it("3 GG RECORD assigned autorizado", async () => {
    const r = await recordExecutiveSteeringEvent(createMemoryClient(), ggAuth([1, 2]), plantProposal({ plant_id: 1 }));
    assert.equal(r.ok, true);
  });

  it("4 GG RECORD unassigned denegado", async () => {
    const r = await recordExecutiveSteeringEvent(createMemoryClient(), ggAuth([1]), plantProposal({ plant_id: 99 }));
    assert.equal(r.ok, false);
    assert.equal(r.code, CODES.SCOPE_DENIED);
    assert.equal(r.persisted, false);
  });

  it("5 rol no autorizado -> deny", async () => {
    for (const role of ["GA", "GV", "CF_CDMX", "CDMX", "ZC", "GO", "SG", "SEH"]) {
      const r = await recordExecutiveSteeringEvent(
        createMemoryClient(),
        { role, actor_id: 3, plantas_permitidas: [1] },
        plantProposal()
      );
      assert.equal(r.ok, false, role);
      assert.equal(r.code, CODES.UNAUTHORIZED, role);
    }
  });

  it("6 USUARIOS ACCESS_KEY no concede RECORD", async () => {
    const a = await recordExecutiveSteeringEvent(
      createMemoryClient(),
      { admin_function: "USUARIOS", actor_id: 1 },
      plantProposal()
    );
    assert.equal(a.ok, false);
    const b = await recordExecutiveSteeringEvent(
      createMemoryClient(),
      { role: "USUARIOS", actor_id: 1, usuarios_admin: true },
      plantProposal()
    );
    assert.equal(b.ok, false);
    assert.equal(steeringAuthorityClass({ admin_function: "USUARIOS" }), "NONE");
    const client = createMemoryClient();
    const created = await recordExecutiveSteeringEvent(client, zpAuth(), plantProposal());
    const view = await getExecutiveSteeringEvent(
      client,
      { admin_function: "USUARIOS", actor_id: 1 },
      created.event.id
    );
    assert.equal(view.ok, false);
    assert.equal(view.code, CODES.UNAUTHORIZED);
  });

  it("JWT collapse GO->GG no concede RECORD", async () => {
    const r = await recordExecutiveSteeringEvent(
      createMemoryClient(),
      { role: "GG", rol_clave: "GO", actor_id: 4, plantas_permitidas: [1] },
      plantProposal()
    );
    assert.equal(r.ok, false);
    assert.equal(r.code, CODES.UNAUTHORIZED);
  });

  it("7 GG MULTI_PLANT all assigned -> allow", async () => {
    const r = await recordExecutiveSteeringEvent(createMemoryClient(), ggAuth([1, 2, 3]), {
      event_type: "DECISION",
      raw_text: "se aprueba recorte compartido",
      decision_outcome: "accepted",
      scope_kind: "MULTI_PLANT",
      plant_ids: [1, 2],
      declared_kind: "UNKNOWN",
    });
    assert.equal(r.ok, true);
    assert.deepEqual(r.event.plant_ids, [1, 2]);
  });

  it("8 GG MULTI_PLANT parcialmente fuera -> deny (Puebla+Acapulco vs assigned Puebla+Queretaro)", async () => {
    const PUEBLA = 1;
    const QUERETARO = 2;
    const ACAPULCO = 3;
    const r = await recordExecutiveSteeringEvent(createMemoryClient(), ggAuth([PUEBLA, QUERETARO]), {
      event_type: "COMMITMENT",
      raw_text: "Puebla y Acapulco",
      scope_kind: "MULTI_PLANT",
      plant_ids: [PUEBLA, ACAPULCO],
      declared_kind: "UNKNOWN",
    });
    assert.equal(r.ok, false);
    assert.equal(r.code, CODES.SCOPE_DENIED);
  });

  it("9 GG MULTI_PLANT deny no deja escritura parcial", async () => {
    const PUEBLA = 1;
    const QUERETARO = 2;
    const ACAPULCO = 3;
    const client = createMemoryClient();
    const r = await recordExecutiveSteeringEvent(client, ggAuth([PUEBLA, QUERETARO]), {
      event_type: "COMMITMENT",
      raw_text: "Puebla+Acapulco",
      scope_kind: "MULTI_PLANT",
      plant_ids: [PUEBLA, ACAPULCO],
      declared_kind: "UNKNOWN",
    });
    assert.equal(r.ok, false);
    assert.equal(client.events.length, 0);
  });

  it("10 GG ZONE fully authorized -> allow", async () => {
    const r = await recordExecutiveSteeringEvent(createMemoryClient(), ggAuth([1, 2]), {
      event_type: "PROPOSAL",
      raw_text: "zona contenida en assigned",
      scope_kind: "ZONE",
      scope_label: "Provincia-parcial",
      plant_ids: [1, 2],
      declared_kind: "UNKNOWN",
    });
    assert.equal(r.ok, true);
  });

  it("11 GG ZONE partial -> deny", async () => {
    const r = await recordExecutiveSteeringEvent(createMemoryClient(), ggAuth([1]), {
      event_type: "PROPOSAL",
      raw_text: "zona parcial",
      scope_kind: "ZONE",
      scope_label: "Provincia",
      plant_ids: [1, 2],
      declared_kind: "UNKNOWN",
    });
    assert.equal(r.ok, false);
    assert.equal(r.code, CODES.SCOPE_DENIED);
  });

  it("11b GG ZONE unresolved (solo label) -> deny", async () => {
    const r = await recordExecutiveSteeringEvent(createMemoryClient(), ggAuth([1, 2]), {
      event_type: "PROPOSAL",
      raw_text: "Zona Provincia",
      scope_kind: "ZONE",
      scope_label: "Provincia",
      declared_kind: "UNKNOWN",
    });
    assert.equal(r.ok, false);
    assert.equal(r.code, CODES.ZONE_UNRESOLVED);
  });

  it("12 VIEW aplica full-scope: GG no ve MULTI ajeno", async () => {
    const client = createMemoryClient();
    const created = await recordExecutiveSteeringEvent(client, zpAuth(), {
      event_type: "PROPOSAL",
      raw_text: "multi zp",
      scope_kind: "MULTI_PLANT",
      plant_ids: [1, 3],
      declared_kind: "UNKNOWN",
    });
    assert.equal(created.ok, true);
    const view = await getExecutiveSteeringEvent(client, ggAuth([1, 2]), created.event.id);
    assert.equal(view.ok, false);
    assert.equal(view.code, CODES.SCOPE_DENIED);
  });

  it("12b ZP VIEW ALL; GA deny VIEW", async () => {
    const client = createMemoryClient();
    const created = await recordExecutiveSteeringEvent(client, adAuth(), plantProposal({ plant_id: 5 }));
    const zp = await getExecutiveSteeringEvent(client, zpAuth(), created.event.id);
    assert.equal(zp.ok, true);
    const ga = await getExecutiveSteeringEvent(client, { role: "GA", actor_id: 8, plantas_permitidas: [5] }, created.event.id);
    assert.equal(ga.ok, false);
  });

  it("13 DECLARED_BY puede diferir de RECORDED_BY", async () => {
    const r = await recordExecutiveSteeringEvent(createMemoryClient(), zpAuth(), {
      ...plantProposal(),
      event_type: "COMMITMENT",
      raw_text: "Acapulco se compromete a recuperar +40 t",
      declared_kind: "FREE_TEXT_SPEAKER",
      declared_display_name: "Gerente Acapulco",
      metric_key: "venta_ton",
      numeric_value: 40,
      unit: "t",
      value_mode: "DELTA",
    });
    assert.equal(r.ok, true);
    assert.equal(r.event.captured_by_usuario_id, 10);
    assert.equal(r.event.declared_kind, "FREE_TEXT_SPEAKER");
    assert.equal(r.event.declared_display_name, "Gerente Acapulco");
    assert.notEqual(r.event.declared_user_id, 10);
  });

  it("14 unknown speaker no se inventa", async () => {
    const r = await recordExecutiveSteeringEvent(createMemoryClient(), zpAuth(), plantProposal());
    assert.equal(r.event.declared_kind, "UNKNOWN");
    assert.equal(r.event.declared_user_id, null);
    assert.equal(r.event.declared_display_name, null);
  });

  it("15-19 tipos contractuales válidos", async () => {
    const client = createMemoryClient();
    const p = await recordExecutiveSteeringEvent(client, zpAuth(), plantProposal());
    assert.equal(p.event.event_type, "PROPOSAL");
    const d = await recordExecutiveSteeringEvent(client, zpAuth(), {
      event_type: "DECISION",
      raw_text: "se aprueba",
      decision_outcome: "accepted",
      scope_kind: "PLANT",
      plant_id: 1,
      declared_kind: "UNKNOWN",
      refers_proposal_id: p.event.id,
    });
    assert.equal(d.ok, true);
    assert.equal(d.event.event_type, "DECISION");
    const c = await recordExecutiveSteeringEvent(client, zpAuth(), {
      event_type: "COMMITMENT",
      raw_text: "vamos por este cierre",
      scope_kind: "PLANT",
      plant_id: 1,
      declared_kind: "UNKNOWN",
    });
    assert.equal(c.event.event_type, "COMMITMENT");
    const h = await recordExecutiveSteeringEvent(client, zpAuth(), {
      event_type: "HUMAN_DECLARED_CAUSE",
      raw_text: "la caida fue por turismo",
      scope_kind: "PLANT",
      plant_id: 1,
      declared_kind: "UNKNOWN",
    });
    assert.equal(h.event.event_type, "HUMAN_DECLARED_CAUSE");
    const corr = await recordExecutiveSteeringEvent(client, zpAuth(), {
      event_type: "CORRECTION",
      raw_text: "no eran 40, son 35",
      scope_kind: "PLANT",
      plant_id: 1,
      declared_kind: "UNKNOWN",
      corrects_event_id: c.event.id,
    });
    assert.equal(corr.ok, true);
    assert.equal(corr.event.event_type, "CORRECTION");
  });

  it("20 tipo no contractual -> reject", () => {
    const v = validateRecordInput({ event_type: "SCENARIO", raw_text: "x", scope_kind: "PLANT", plant_id: 1 });
    assert.equal(v.ok, false);
    assert.equal(v.code, CODES.INVALID_TYPE);
    for (const bad of ["ACTION", "ACTUAL", "FINAL", "FORECAST", "TARGET", "NOTE", "SUMMARY"]) {
      assert.equal(validateRecordInput({ event_type: bad, raw_text: "x", scope_kind: "PLANT", plant_id: 1 }).ok, false);
    }
  });

  it("21 RECORDED-only", () => {
    const v = validateRecordInput({
      event_type: "PROPOSAL",
      raw_text: "x",
      scope_kind: "PLANT",
      plant_id: 1,
      attestation_state: "CONFIRMED",
    });
    assert.equal(v.ok, false);
    assert.equal(v.code, CODES.INVALID_STATE);
    assert.ok(EVENT_TYPES.includes("PROPOSAL"));
  });

  it("22-24 correction preserva original, crea historia, no destruye payload", async () => {
    const client = createMemoryClient();
    const orig = await recordExecutiveSteeringEvent(client, zpAuth(), {
      event_type: "COMMITMENT",
      raw_text: "Acapulco +40 t",
      scope_kind: "PLANT",
      plant_id: 7,
      metric_key: "venta_ton",
      numeric_value: 40,
      unit: "t",
      value_mode: "DELTA",
      declared_kind: "UNKNOWN",
    });
    const corr = await recordExecutiveSteeringEvent(client, zpAuth(), {
      event_type: "CORRECTION",
      raw_text: "no eran 40, son 35",
      scope_kind: "PLANT",
      plant_id: 7,
      metric_key: "venta_ton",
      numeric_value: 35,
      unit: "t",
      value_mode: "DELTA",
      declared_kind: "UNKNOWN",
      corrects_event_id: orig.event.id,
    });
    assert.equal(corr.ok, true);
    const after = await getExecutiveSteeringEvent(client, zpAuth(), orig.event.id);
    assert.equal(after.event.raw_text, "Acapulco +40 t");
    assert.equal(after.event.numeric_value, 40);
    assert.equal(after.event.vigor, "SUPERSEDED");
    assert.equal(after.event.attestation_state, "RECORDED");
    assert.ok(after.event.relations.some((x) => x.relation_kind === "SUPERSEDES"));
    assert.equal(corr.event.vigor, "CURRENT");
    assert.equal(corr.event.meaning.recorded, "attestation_exists_with_provenance");
  });

  it("25 GG no corrige evento fuera de scope", async () => {
    const client = createMemoryClient();
    const orig = await recordExecutiveSteeringEvent(client, zpAuth(), plantProposal({ plant_id: 9 }));
    const corr = await recordExecutiveSteeringEvent(client, ggAuth([1]), {
      event_type: "CORRECTION",
      raw_text: "cambio",
      scope_kind: "PLANT",
      plant_id: 9,
      declared_kind: "UNKNOWN",
      corrects_event_id: orig.event.id,
    });
    assert.equal(corr.ok, false);
    const still = await getExecutiveSteeringEvent(client, zpAuth(), orig.event.id);
    assert.equal(still.event.vigor, "CURRENT");
  });

  it("26-27 null permanece null; missing numeric no es 0", async () => {
    const r = await recordExecutiveSteeringEvent(createMemoryClient(), zpAuth(), {
      event_type: "PROPOSAL",
      raw_text: "hay que revisar el descuento",
      scope_kind: "PLANT",
      plant_id: 1,
      declared_kind: "UNKNOWN",
    });
    assert.equal(r.event.numeric_value, null);
    assert.equal(r.event.unit, null);
    assert.equal(r.event.period_kind, null);
    assert.equal(r.event.baseline_ref, null);
    assert.equal(r.event.declared_at, null);
    assert.notEqual(r.event.numeric_value, 0);
  });

  it("28-30 isolation: no forecast / AF / AR mutation in sources", () => {
    assert.equal(/INSERT INTO\s+igf\./i.test(LIB_SRC), false);
    assert.equal(/UPDATE\s+igf\./i.test(LIB_SRC), false);
    assert.equal(/action_register/i.test(LIB_SRC), false);
    assert.equal(/ventas_diarias/i.test(LIB_SRC), false);
    assert.equal(/financial_state/i.test(LIB_SRC), false);
    assert.equal(/compromiso_lines/i.test(LIB_SRC), false);
  });

  it("31 source/meeting nullable", async () => {
    const r = await recordExecutiveSteeringEvent(createMemoryClient(), zpAuth(), plantProposal());
    assert.equal(r.event.meeting_ref, null);
    assert.equal(r.event.source_id, null);
    assert.equal(r.event.source_type, "MANUAL");
  });

  it("32-33 period/baseline unknown no se inventa", async () => {
    const r = await recordExecutiveSteeringEvent(createMemoryClient(), zpAuth(), {
      ...plantProposal(),
      event_type: "COMMITMENT",
      raw_text: "+40 t",
      metric_key: "venta_ton",
      numeric_value: 40,
      unit: "t",
      value_mode: "DELTA",
    });
    assert.equal(r.event.period_year, null);
    assert.equal(r.event.baseline_value, null);
  });

  it("34 transaction rollback en fallo compuesto", async () => {
    const client = createMemoryClient();
    client.failNext("insert_plant");
    const r = await recordExecutiveSteeringEvent(client, zpAuth(), {
      event_type: "PROPOSAL",
      raw_text: "multi",
      scope_kind: "MULTI_PLANT",
      plant_ids: [1, 2],
      declared_kind: "UNKNOWN",
    });
    assert.equal(r.ok, false);
    assert.equal(client.events.length, 0);
  });

  it("35 historical read conserva original/correction", async () => {
    const client = createMemoryClient();
    const orig = await recordExecutiveSteeringEvent(client, zpAuth(), plantProposal({ raw_text: "original" }));
    await recordExecutiveSteeringEvent(client, zpAuth(), {
      event_type: "CORRECTION",
      raw_text: "corregido",
      scope_kind: "PLANT",
      plant_id: 1,
      declared_kind: "UNKNOWN",
      corrects_event_id: orig.event.id,
    });
    const hist = await listExecutiveSteeringEvents(client, zpAuth(), {});
    assert.equal(hist.events.length, 2);
    const o = hist.events.find((e) => e.id === orig.event.id);
    assert.equal(o.raw_text, "original");
    assert.equal(o.vigor, "SUPERSEDED");
    const current = await listExecutiveSteeringEvents(client, zpAuth(), { vigor: "CURRENT" });
    assert.equal(current.events.length, 1);
    assert.equal(current.events[0].raw_text, "corregido");
    assert.notEqual(current.events[0].meaning.recorded, "truth");
  });

  it("delete/update paths forbidden", () => {
    assert.equal(deleteExecutiveSteeringEvent().code, CODES.DELETE_FORBIDDEN);
    assert.equal(updateExecutiveSteeringEvent().code, CODES.UPDATE_FORBIDDEN);
  });

  it("captured_by comes from auth not body", async () => {
    const r = await recordExecutiveSteeringEvent(createMemoryClient(), zpAuth({ actor_id: 77 }), {
      ...plantProposal(),
      captured_by_usuario_id: 1,
      recorded_by: 1,
    });
    assert.equal(r.event.captured_by_usuario_id, 77);
  });

  it("EVAL-003 probes: types not all COMMITMENT; +632 not auto-commitment", async () => {
    const client = createMemoryClient();
    const puebla = await recordExecutiveSteeringEvent(client, zpAuth(), {
      event_type: "PROPOSAL",
      raw_text: "Puebla cifra intervenida ~1177 t",
      scope_kind: "PLANT",
      plant_id: 1,
      metric_key: "venta_ton",
      numeric_value: 1177,
      unit: "t",
      value_mode: "ABSOLUTE",
      declared_kind: "UNKNOWN",
    });
    const aca = await recordExecutiveSteeringEvent(client, zpAuth(), {
      event_type: "COMMITMENT",
      raw_text: "Acapulco se compromete a recuperar +40 t",
      scope_kind: "PLANT",
      plant_id: 2,
      metric_key: "venta_ton",
      numeric_value: 40,
      unit: "t",
      value_mode: "DELTA",
      declared_kind: "FREE_TEXT_SPEAKER",
      declared_display_name: "Gerente Acapulco",
    });
    const canal = await recordExecutiveSteeringEvent(client, zpAuth(), {
      event_type: "CORRECTION",
      raw_text: "canal Acapulco mal clasificado",
      scope_kind: "PLANT",
      plant_id: 2,
      declared_kind: "UNKNOWN",
      corrects_event_id: aca.event.id,
    });
    const qro = await recordExecutiveSteeringEvent(client, zpAuth(), {
      event_type: "PROPOSAL",
      raw_text: "Querétaro +15 t",
      scope_kind: "PLANT",
      plant_id: 3,
      metric_key: "venta_ton",
      numeric_value: 15,
      unit: "t",
      value_mode: "DELTA",
      declared_kind: "UNKNOWN",
    });
    const morelos = await recordExecutiveSteeringEvent(client, zpAuth(), {
      event_type: "COMMITMENT",
      raw_text: "Morelos volumen defendible",
      scope_kind: "PLANT",
      plant_id: 4,
      declared_kind: "UNKNOWN",
    });
    assert.equal(puebla.event.event_type, "PROPOSAL");
    assert.equal(aca.event.event_type, "COMMITMENT");
    assert.equal(canal.event.event_type, "CORRECTION");
    assert.equal(qro.event.event_type, "PROPOSAL");
    assert.equal(morelos.event.event_type, "COMMITMENT");
    assert.equal(puebla.event.period_kind, null);
    const zona632AsCommitmentDiscouraged = validateRecordInput({
      event_type: "COMMITMENT",
      raw_text: "Zona +632 si se cumple",
      scope_kind: "ZONE",
      scope_label: "Provincia",
    });
    assert.equal(zona632AsCommitmentDiscouraged.ok, true);
    assert.notEqual(puebla.event.event_type, "COMMITMENT");
    assert.ok(!EVENT_TYPES.includes("SCENARIO"));
  });

  it("schema: dedicated arr store, RECORDED-only, no AR/IGF", () => {
    assert.match(SQL_SRC, /arr\.executive_steering_events/);
    assert.match(SQL_SRC, /attestation_state VARCHAR\(16\) NOT NULL DEFAULT 'RECORDED'/);
    assert.match(SQL_SRC, /CHECK \(attestation_state IN \('RECORDED'\)\)/);
    assert.equal(/action_register/i.test(SQL_SRC), false);
    assert.equal(/igf\./i.test(SQL_SRC), false);
    assert.equal(/eks\./i.test(SQL_SRC), false);
  });

  it("ZP aliases VIEW/RECORD class", () => {
    assert.equal(steeringAuthorityClass({ role: "DIR_ZP", actor_id: 1 }), "ZP");
    assert.equal(steeringAuthorityClass({ role: "DIRECTOR_ZP", actor_id: 1 }), "ZP");
    assert.equal(steeringAuthorityClass({ role: "CF_CDMX", actor_id: 1 }), "NONE");
  });

  it("FIX F-AUTHZ-001: nombre libre no eleva authority", async () => {
    const PUEBLA = 1;
    const ACAPULCO = 3;
    const name = "Director ZP";
    const ga = await recordExecutiveSteeringEvent(
      createMemoryClient(),
      { role: "GA", actor_id: 3, actor_nombre: name, plantas_permitidas: [PUEBLA] },
      plantProposal({ plant_id: ACAPULCO })
    );
    assert.equal(ga.ok, false);
    assert.equal(ga.code, CODES.UNAUTHORIZED);
    assert.equal(steeringAuthorityClass({ role: "GA", actor_nombre: name }), "NONE");

    const ggDeny = await recordExecutiveSteeringEvent(
      createMemoryClient(),
      { role: "GG", rol_clave: "GG", actor_id: 12, actor_nombre: name, plantas_permitidas: [PUEBLA] },
      plantProposal({ plant_id: ACAPULCO })
    );
    assert.equal(ggDeny.ok, false);
    assert.equal(ggDeny.code, CODES.SCOPE_DENIED);
    assert.equal(steeringAuthorityClass({ role: "GG", rol_clave: "GG", actor_nombre: name }), "GG");

    const ggAllow = await recordExecutiveSteeringEvent(
      createMemoryClient(),
      { role: "GG", rol_clave: "GG", actor_id: 12, actor_nombre: name, plantas_permitidas: [PUEBLA] },
      plantProposal({ plant_id: PUEBLA })
    );
    assert.equal(ggAllow.ok, true);
    assert.equal(ggAllow.event.plant_id, PUEBLA);

    const seh = await recordExecutiveSteeringEvent(
      createMemoryClient(),
      { role: "SEH", actor_id: 4, actor_nombre: name },
      plantProposal()
    );
    assert.equal(seh.ok, false);
    assert.equal(seh.code, CODES.UNAUTHORIZED);

    const otra = await recordExecutiveSteeringEvent(
      createMemoryClient(),
      { role: "OTRA_CLAVE", actor_id: 5, actor_nombre: "ZP Director" },
      plantProposal()
    );
    assert.equal(otra.ok, false);

    for (const alias of ZP_ALIASES) {
      assert.equal(isGovernedZpClave(alias), true, alias);
      assert.equal(steeringAuthorityClass({ role: alias, actor_id: 1 }), "ZP", alias);
      const spaced = alias.toLowerCase().split("").join(" ");
      assert.equal(steeringAuthorityClass({ role: spaced, actor_id: 1 }), "ZP", spaced);
    }
    assert.equal(steeringAuthorityClass({ role: "AD", actor_id: 1 }), "AD");
    assert.equal(steeringAuthorityClass({ role: "GG", actor_id: 1 }), "GG");
    assert.equal(isGovernedZpClave("NOT_ZP"), false);
    assert.equal(steeringAuthorityClass({ role: "GA", actor_nombre: "director  zp" }), "NONE");
    assert.equal(steeringAuthorityClass({ role: "GA", actor_nombre: "Director de Z.P." }), "NONE");
    assert.equal(/dashboard-es-zp/.test(LIB_SRC), false);
  });

  it("FIX F-CORR-001: supersede_original=false no deja dos CURRENT", async () => {
    const client = createMemoryClient();
    const orig = await recordExecutiveSteeringEvent(client, zpAuth(), plantProposal({ raw_text: "original payload" }));
    const corr = await recordExecutiveSteeringEvent(client, zpAuth(), {
      event_type: "CORRECTION",
      raw_text: "corregido",
      scope_kind: "PLANT",
      plant_id: 1,
      declared_kind: "UNKNOWN",
      corrects_event_id: orig.event.id,
      supersede_original: false,
    });
    assert.equal(corr.ok, true);
    const after = await getExecutiveSteeringEvent(client, zpAuth(), orig.event.id);
    assert.equal(after.event.raw_text, "original payload");
    assert.equal(after.event.vigor, "SUPERSEDED");
    assert.equal(after.event.attestation_state, "RECORDED");
    assert.equal(corr.event.vigor, "CURRENT");
    assert.equal(corr.event.attestation_state, "RECORDED");
    assert.ok(corr.event.meaning.not.includes("ORGANIZATIONALLY_CONFIRMED"));
    assert.ok(corr.event.meaning.not.includes("APPROVED"));
    assert.ok(corr.event.meaning.not.includes("FINAL"));
    const current = await listExecutiveSteeringEvents(client, zpAuth(), { vigor: "CURRENT" });
    assert.equal(current.events.length, 1);
    assert.equal(current.events[0].id, corr.event.id);
    const hist = await listExecutiveSteeringEvents(client, zpAuth(), {});
    assert.equal(hist.events.length, 2);
    const corr2 = await recordExecutiveSteeringEvent(client, zpAuth(), {
      event_type: "CORRECTION",
      raw_text: "segunda correccion",
      scope_kind: "PLANT",
      plant_id: 1,
      declared_kind: "UNKNOWN",
      corrects_event_id: corr.event.id,
    });
    assert.equal(corr2.ok, true);
    const mid = await getExecutiveSteeringEvent(client, zpAuth(), corr.event.id);
    const first = await getExecutiveSteeringEvent(client, zpAuth(), orig.event.id);
    assert.equal(first.event.raw_text, "original payload");
    assert.equal(first.event.vigor, "SUPERSEDED");
    assert.equal(mid.event.vigor, "SUPERSEDED");
    assert.equal(corr2.event.vigor, "CURRENT");
    const all = await listExecutiveSteeringEvents(client, zpAuth(), {});
    assert.equal(all.events.length, 3);
  });

  it("FIX F-CORR-001: GG no corrige MULTI parcialmente fuera", async () => {
    const client = createMemoryClient();
    const orig = await recordExecutiveSteeringEvent(client, zpAuth(), {
      event_type: "PROPOSAL",
      raw_text: "multi",
      scope_kind: "MULTI_PLANT",
      plant_ids: [1, 3],
      declared_kind: "UNKNOWN",
    });
    const corr = await recordExecutiveSteeringEvent(client, ggAuth([1, 2]), {
      event_type: "CORRECTION",
      raw_text: "fuera",
      scope_kind: "MULTI_PLANT",
      plant_ids: [1, 3],
      declared_kind: "UNKNOWN",
      corrects_event_id: orig.event.id,
    });
    assert.equal(corr.ok, false);
    const still = await getExecutiveSteeringEvent(client, zpAuth(), orig.event.id);
    assert.equal(still.event.vigor, "CURRENT");
  });
});
