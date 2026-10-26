"use strict";

const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const semantic = require("../lib/director-ia-013-semantic");
const snapshotLoader = require("../lib/director-ia-013-snapshot");

const CUTOFF = "2026-10-26";
const ROOT = path.join(__dirname, "..");

function route(text, extra) {
  return semantic.classifyDirectorIaQuestion(text, { cutoffYmd: CUTOFF, ...extra });
}

function fakeClient(extraRows) {
  const calls = [];
  const client = {
    calls,
    async query(sql, params) {
      calls.push({ sql: String(sql), params });
      const text = String(sql);
      if (/\b(insert|update|delete|create\s+table)\b/i.test(text)) {
        throw new Error(`escritura no permitida: ${text.slice(0, 80)}`);
      }
      if (/FROM public\.plantas/i.test(text)) {
        return { rows: [{ id: params[0], nombre: "Acapulco", clave: "ACAPULCO" }] };
      }
      if (/igf_diario_gastos_desglose/i.test(text)) {
        return { rows: [{ plant_code: "Acapulco", presupuesto_nomina_gastos: 100, presupuesto_imss_sua: 10, extraordinarios: 5, provisiones_planta: 5, gasto_corporativo: 20, inversiones: 8, impuestos_federales: 2 }] };
      }
      if (/igf_diario_gastos_distribucion_manual/i.test(text)) return { rows: [] };
      if (/igf_diario_margen_manual/i.test(text)) return { rows: [] };
      if (/arr\.compras_hg/i.test(text)) return { rows: [{ fecha: "2026-10-20", hg_kilos: 40 }] };
      if (/arr\.compras_documentos/i.test(text)) return { rows: [] };
      if (/arr\.compras\b/i.test(text)) {
        return { rows: extraRows || [
          { id: 1, fecha: "2026-10-26", kg: 100, importe: 1000, proveedor: "PEMEX", excel_kg: null, excel_importe: null, provenance: null },
          { id: 2, fecha: "2026-10-26", kg: 50, importe: 800, proveedor: "TOMZA TEPEJI", excel_kg: null, excel_importe: null, provenance: null },
        ] };
      }
      return { rows: [] };
    },
    release() {},
  };
  return client;
}

describe("DIRECTOR-IA-013-R1 server routing", () => {
  let askDirectorIa;
  let configureDirectorIaChat;
  const previous = process.env.ENABLE_DIRECTOR_IA;

  beforeEach(() => {
    process.env.ENABLE_DIRECTOR_IA = "true";
    ({ askDirectorIa, configureDirectorIaChat } = require("../lib/director-ia-chat"));
  });

  afterEach(() => {
    configureDirectorIaChat({ pool: null, loadDirectorIa013Snapshot: undefined, forecast013: undefined });
    if (previous == null) delete process.env.ENABLE_DIRECTOR_IA;
    else process.env.ENABLE_DIRECTOR_IA = previous;
  });

  it("A-D el endpoint responde sin igf_snapshot y carga solo la fuente de la ruta", async () => {
    const panel = fs.readFileSync(path.join(ROOT, "frontend-dashboard/modules/director-ia/components/DirectorIaChatPanel.tsx"), "utf8");
    const api = fs.readFileSync(path.join(ROOT, "frontend-dashboard/modules/director-ia/lib/api.ts"), "utf8");
    assert.equal(panel.includes("igf_snapshot"), false);
    assert.equal(api.includes("igf_snapshot"), false);
    const seen = [];
    configureDirectorIaChat({
      loadDirectorIa013Snapshot: async (input) => {
        seen.push(input.route.domain);
        assert.equal(input.plantaId, 7);
        if (input.route.domain === "FINANCIAL") {
          return {
            plant: "Acapulco",
            financial: {
              days: [{ fecha: "2026-10-26", ventaKg: 1000, precio: 20, costoKg: 10, fleteKg: 2, cdKg: 0, hgKg: 0 }],
              components: { presupuesto_nomina_gastos: 10, presupuesto_imss_sua: 1, extraordinarios: 1, provisiones_planta: 1, gasto_corporativo: 1, inversiones: 1, impuestos_federales: 1 },
              calendar: [],
              overrides: {},
            },
          };
        }
        if (input.route.domain === "HG_PHYSICAL") return { plant: "Acapulco", hgPhysical: [{ fecha: "2026-10-20", kg: 40 }] };
        return { plant: "Acapulco", purchases: [{ fecha: "2026-10-26", kg: 10, importe: 100, proveedor: "PEMEX", excel_kg: null, excel_importe: null }] };
      },
    });
    const body = { question: "cual es el margen de octubre", planta_id: 7, upload_day: CUTOFF, history: [], conversation_state: { parent_intent: "rentabilidad" } };
    assert.equal(body.igf_snapshot, undefined);
    const margin = await askDirectorIa({ body, dashboardAuth: { role: "AD" } }, 7, body.question, { id: 1 });
    assert.equal(margin.ok, true);
    assert.match(margin.answer, /IGF Diario acumulado/);
    assert.equal(seen[0], "FINANCIAL");
    const hg = await askDirectorIa({ body: { ...body, question: "cuanto hg en kilos llevamos en octubre" }, dashboardAuth: { role: "AD" } }, 7, "cuanto hg en kilos llevamos en octubre", { id: 1 });
    assert.match(hg.answer, /arr\.compras_hg/);
    assert.equal(seen[1], "HG_PHYSICAL");
    const gas = await askDirectorIa({ body: { ...body, question: "cuanto compramos de gas LP esta semana" }, dashboardAuth: { role: "AD" } }, 7, "cuanto compramos de gas LP esta semana", { id: 1 });
    assert.match(gas.answer, /CONTROL DE COMPRAS/);
    assert.equal(seen[2], "GAS_LP_PURCHASES");
    assert.equal(margin.conversation_state.parent_intent, "rentabilidad");
  });

  it("E-H fechas y rangos explícitos no se vuelven el mes completo", () => {
    assert.equal(route("margen del 10 de octubre").period.from, "2026-10-10");
    assert.equal(route("margen del 10 de octubre").time_scope, "DAY");
    assert.equal(route("compras del 20/10/2026").period.from, "2026-10-20");
    assert.equal(route("margen del 2026-10-20").time_scope, "DAY");
    assert.equal(route("el día 20").time_scope, "DAY");
    assert.equal(route("el 20").period.from, "2026-10-20");
    const range = route("margen del 1 al 15 de octubre");
    assert.equal(range.time_scope, "RANGE");
    assert.equal(range.period.from, "2026-10-01");
    assert.equal(range.period.to, "2026-10-15");
    assert.equal(route("del 5 al 12").time_scope, "RANGE");
    assert.equal(route("entre el 3 y el 10 de octubre").period.from, "2026-10-03");
    assert.equal(route("del 2026-10-05 al 2026-10-12").period.to, "2026-10-12");
    assert.equal(route("del 15 al 1 de octubre").period.invalid, true);
    assert.equal(route("semana pasada").time_scope, "PREVIOUS_WEEK");
    assert.equal(route("ultimos 7 dias").time_scope, "LAST_7");
    assert.equal(route("ultima semana").time_scope, "LAST_DATA_WEEK");
    assert.notEqual(route("semana pasada").period.from, route("ultimos 7 dias").period.from);
  });

  it("el endpoint compara Tuxpan y Tepeji con porcentajes y solo lecturas", async () => {
    const client = fakeClient([
      { id: 1, fecha: CUTOFF, kg: 200, importe: 2000, proveedor: "TOMZA TUXPAN" },
      { id: 2, fecha: CUTOFF, kg: 300, importe: 3000, proveedor: "TOMZA TEPEJI" },
      { id: 3, fecha: CUTOFF, kg: 500, importe: 5000, proveedor: "PEMEX TUXPAN" },
    ]);
    configureDirectorIaChat({ pool: { totalCount: 1, connect: async () => client } });
    const question = "cuanto compramos de tuxpan y cuanto de tepeji y que porcentaje de cada uno?";
    const got = await askDirectorIa({
      body: { question, upload_day: CUTOFF }, dashboardAuth: { role: "AD" },
    }, 7, question, { id: 1 });
    assert.equal(got.ok, true);
    assert.match(got.answer, /Tuxpan \(TOMZA\): 200 kg \(20\.00%/);
    assert.match(got.answer, /Tepeji \(TOMZA\): 300 kg \(30\.00%/);
    assert.match(got.answer, /todos los proveedores: 1,000 kg/);
    assert.equal(got.conversation_state.purchase_domain, "GAS_LP");
    assert.ok(client.calls.every(({ sql }) => /^SELECT\b/i.test(sql.trim())));
    assert.ok(client.calls.every(({ sql }) => !/igf_diario/.test(sql)));
  });

  it("I-K el proveedor filtra y el ranking usa sus filas", () => {
    const rows = [
      { fecha: "2026-10-26", kg: 100, importe: 1000, proveedor: "PEMEX", excel_kg: null, excel_importe: null },
      { fecha: "2026-10-25", kg: 50, importe: 900, proveedor: "TOMZA TEPEJI", excel_kg: null, excel_importe: null },
      { fecha: "2026-10-26", kg: 10, importe: 100, proveedor: "TOMZA TUXPAN", excel_kg: null, excel_importe: null },
      { fecha: "2026-10-26", kg: 0, importe: 80, proveedor: "NOTA DE CARGO", excel_kg: null, excel_importe: null },
    ];
    const pemex = semantic.purchaseTotals(rows, route("cuanto compramos a pemex esta semana").period, "PEMEX");
    assert.equal(pemex.physicalKg, 100);
    const tepeji = semantic.purchaseTotals(rows, route("cuanto compramos a tepeji ayer").period, "TOMZA_TEPEJI");
    assert.equal(tepeji.physicalKg, 50);
    const answer = semantic.turnDirectorIa013({
      text: "cual proveedor fue mas barato",
      cutoffYmd: CUTOFF,
      snapshot: { plant: "Acapulco", purchases: rows },
    }).answer;
    assert.match(answer, /PEMEX/);
    assert.match(answer, /más barato/);
  });

  it("L-P paridad de métrica, HG del mismo periodo y diagnóstico semanal", () => {
    const snap = {
      plant: "Acapulco",
      forecast: { margen: 9, operativos: 40, resultado_final: 7 },
      financial: {
        days: [
          { fecha: "2026-10-25", ventaKg: 1000, precio: 20, costoKg: 10, fleteKg: 2, cdKg: 0, hgKg: 0.2 },
          { fecha: "2026-10-26", ventaKg: 1000, precio: 22, costoKg: 10, fleteKg: 2, cdKg: 0, hgKg: 0.4 },
        ],
        components: { presupuesto_nomina_gastos: 3000, presupuesto_imss_sua: 300, extraordinarios: 150, provisiones_planta: 75, gasto_corporativo: 30, inversiones: 15, impuestos_federales: 3 },
        calendar: [{ fecha: "2026-10-01", inhabil: false }, { fecha: "2026-10-02", inhabil: false }, { fecha: "2026-10-26", inhabil: false }],
        overrides: {},
      },
      hgPhysical: [{ fecha: "2026-10-01", kg: 999 }, { fecha: "2026-10-26", kg: 12 }],
    };
    const oper = semantic.turnDirectorIa013({ text: "compara operativos actual vs forecast", cutoffYmd: CUTOFF, snapshot: snap }).answer;
    assert.match(oper, /operativos actual/);
    assert.doesNotMatch(oper, /margen actual/);
    const result = semantic.turnDirectorIa013({ text: "compara resultado final actual vs forecast", cutoffYmd: CUTOFF, snapshot: snap }).answer;
    assert.match(result, /resultado_final actual/);
    const both = semantic.turnDirectorIa013({ text: "HG de esta semana", cutoffYmd: CUTOFF, snapshot: snap }).answer;
    assert.match(both, /HG físico: 12 kg/);
    assert.doesNotMatch(both, /999/);
    const week = semantic.turnDirectorIa013({ text: "por que subieron los operativos esta semana", cutoffYmd: CUTOFF, snapshot: snap }).answer;
    assert.match(week, /nómina y gastos/);
    assert.doesNotMatch(week, /nómina y gastos 3,000/);
  });

  it("Q-S la aclaración sobrevive a otro tema y el follow-up hereda el dominio", async () => {
    configureDirectorIaChat({
      loadDirectorIa013Snapshot: async (input) => ({ plant: "Acapulco", purchases: [{ fecha: "2026-10-18", kg: 3, importe: 30, proveedor: "PEMEX", excel_kg: null, excel_importe: null }] }),
    });
    const prior = await askDirectorIa({
      body: { question: "como van las compras", upload_day: CUTOFF, history: [{ role: "user", content: "cual es el margen de octubre" }], conversation_state: { parent_intent: "margen" } },
      dashboardAuth: { role: "AD" },
    }, 7, "como van las compras", { id: 1 });
    assert.equal(prior.answer, semantic.CLARIFICATION);
    const gas = await askDirectorIa({
      body: { question: "y la semana pasada?", upload_day: CUTOFF, conversation_state: { purchase_domain: "GAS_LP" } },
      dashboardAuth: { role: "AD" },
    }, 7, "y la semana pasada?", { id: 1 });
    assert.equal(gas.conversation_state.purchase_domain, "GAS_LP");
    assert.match(gas.answer, /CONTROL DE COMPRAS/);
    const client = route("ahora las compras de clientes", { purchaseDomain: "GAS_LP" });
    assert.equal(client.domain, "CLIENT_PURCHASES");
    assert.equal(client.purchase_domain, "CLIENT_PURCHASES");
  });

  it("T-W corpus natural, expectativas y auditoría sin fuente falsa", () => {
    const cases = semantic.directorIa013Corpus();
    const families = [...new Set(cases.map((item) => item.family))];
    assert.ok(families.length >= 23);
    assert.equal(cases.filter((item) => /\bcaso \d+\b/i.test(item.text)).length, 0);
    for (const family of families) assert.ok(cases.filter((item) => item.family === family).length >= 40, family);
    for (const item of cases) {
      const got = route(item.text);
      for (const key of ["domain", "metric", "truth", "source", "unit", "time_scope", "dimension"]) {
        assert.equal(got[key], item.expect[key], `${item.text} ${key}`);
      }
    }
    const audit = semantic.turnDirectorIa013({ text: "de donde sale ese dato", cutoffYmd: CUTOFF, snapshot: null }).answer;
    assert.equal(audit, "En el hilo actual no tengo una fuente previa identificada.");
    const named = semantic.turnDirectorIa013({ text: "de donde sale ese dato", cutoffYmd: CUTOFF, lastSource: "CONTROL_DE_COMPRAS" }).answer;
    assert.match(named, /CONTROL DE COMPRAS/);
  });

  it("X-Z no escribe, respeta planta y no usa un día posterior al corte", async () => {
    const files = ["lib/director-ia-013-semantic.js", "lib/director-ia-013-snapshot.js", "lib/director-ia-013-corpus.js", "lib/director-ia-013-acumulado.js"];
    for (const file of files) {
      const source = fs.readFileSync(path.join(ROOT, file), "utf8");
      assert.doesNotMatch(source, /\b(INSERT|UPDATE|DELETE)\s+/);
    }
    await assert.rejects(
      () => snapshotLoader.loadDirectorIa013Snapshot({ route: route("cual es el margen de octubre"), plantaId: 9, auth: { role: "GG", plantas_permitidas: [7] }, client: fakeClient() }),
      (error) => error.status === 403
    );
    await assert.rejects(
      () => snapshotLoader.loadDirectorIa013Snapshot({ route: route("cual es el margen de octubre"), plantaId: 7, auth: { role: "GA", plantas_permitidas: [7] }, client: fakeClient() }),
      (error) => error.status === 403 && /GA no tiene acceso/.test(error.message)
    );
    const client = fakeClient();
    const loaded = await snapshotLoader.loadDirectorIa013Snapshot({
      route: route("cuanto compramos a pemex esta semana"),
      plantaId: 7,
      auth: { role: "AD" },
      client,
    });
    assert.equal(loaded.loaded.financial, false);
    assert.equal(loaded.loaded.purchases, true);
    const purchaseCall = client.calls.find((call) => /FROM arr\.compras c/i.test(call.sql));
    assert.equal(purchaseCall.params[0], 7);
    assert.ok(purchaseCall.params[1] <= purchaseCall.params[2]);
    const future = semantic.turnDirectorIa013({
      text: "margen del 2026-10-27",
      cutoffYmd: CUTOFF,
      snapshot: { plant: "Acapulco", financial: { days: [{ fecha: "2026-10-27", ventaKg: 1, precio: 99, costoKg: 1, fleteKg: 1 }], components: { presupuesto_nomina_gastos: 1 }, calendar: [] } },
    }).answer;
    assert.match(future, /después del corte 2026-10-26/);
    assert.doesNotMatch(future, /99/);
  });
});
