"use strict";

const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const grafica = require("../lib/igf-diario-grafica");
const forecastMod = require("../lib/dashboard-arr-forecast");
const semantic = require("../lib/director-ia-013-semantic");
const snapshotLoader = require("../lib/director-ia-013-snapshot");
const { loadIgfDiarioAcumuladoPlantView } = require("../lib/director-ia-013-acumulado");

const CUTOFF = "2026-10-26";
const EXPENSE = {
  plant_code: "Acapulco",
  presupuesto_nomina_gastos: 1611265,
  presupuesto_imss_sua: 390000.03,
  extraordinarios: 234595.16,
  provisiones_planta: 237858.6,
  gasto_corporativo: 100000,
  inversiones: 50000,
  impuestos_federales: 80000,
};

function money(value) {
  return Number(value).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function financials(on) {
  return {
    contract: "066",
    ventaKg: on ? 120000 : 80000,
    ventaTon: on ? 120 : 80,
    margenKg: on ? 7.52 : 4.1,
    comDescKg: on ? 1.25 : 0.1,
    hgKg: on ? 0.8 : 0.2,
    costoKg: 10,
    fleteKg: 2,
    hgDollar: 12,
    hgPct: -0.06,
  };
}

function acumuladoPayload(projection) {
  const on = Boolean(projection && projection.marker === "vigente");
  const fin = financials(on);
  return {
    ok: true,
    rows: [{
      plant_code: "Acapulco",
      empresa: "Acapulco",
      canon: "Acapulco",
      financials: fin,
      margen: fin.margenKg,
      hg: fin.hgKg,
      missing: [],
    }],
  };
}

function clientWith(rows) {
  const calls = [];
  return {
    calls,
    async query(sql, params) {
      const text = String(sql);
      calls.push(text);
      if (/FROM public\.plantas/i.test(text)) return { rows: [{ id: params[0], nombre: "Acapulco", clave: "ACAPULCO" }] };
      if (/igf_diario_gastos_desglose/i.test(text) && /SELECT/i.test(text)) return { rows: [EXPENSE] };
      if (/arr\.compras\b/i.test(text)) return { rows: rows || [] };
      if (/compras_documentos/i.test(text)) return { rows: [] };
      return { rows: [] };
    },
    release() {},
  };
}

describe("DIRECTOR-IA-013-R2 paridad viva", () => {
  const originalLoad = grafica.loadIgfDiarioAcumulado;
  const originalProjection = forecastMod.buildPronosticoProjectionContext;
  let acumuladoCalls;
  let forecastCalls;
  let askDirectorIa;
  let configureDirectorIaChat;
  const previous = process.env.ENABLE_DIRECTOR_IA;

  beforeEach(() => {
    process.env.ENABLE_DIRECTOR_IA = "true";
    acumuladoCalls = [];
    forecastCalls = [];
    grafica.loadIgfDiarioAcumulado = async (_client, opts) => {
      acumuladoCalls.push(opts);
      return acumuladoPayload(opts.projection);
    };
    forecastMod.buildPronosticoProjectionContext = async () => ({ marker: "vigente" });
    ({ askDirectorIa, configureDirectorIaChat } = require("../lib/director-ia-chat"));
  });

  afterEach(() => {
    grafica.loadIgfDiarioAcumulado = originalLoad;
    forecastMod.buildPronosticoProjectionContext = originalProjection;
    configureDirectorIaChat({ pool: null, loadDirectorIa013Snapshot: undefined, loadIgfForecastMiniPayload: undefined });
    if (previous == null) delete process.env.ENABLE_DIRECTOR_IA;
    else process.env.ENABLE_DIRECTOR_IA = previous;
  });

  function install(client, forecastLoader) {
    configureDirectorIaChat({
      loadIgfForecastMiniPayload: forecastLoader,
      loadDirectorIa013Snapshot: (input) => snapshotLoader.loadDirectorIa013Snapshot({ ...input, client }),
    });
  }

  async function ask(question, client, forecastLoader) {
    install(client, forecastLoader);
    const body = {
      planta_id: 7,
      question,
      upload_day: CUTOFF,
      history: [],
      conversation_state: {},
    };
    assert.equal(body.igf_snapshot, undefined);
    return askDirectorIa({ body, dashboardAuth: { role: "ZP" } }, 7, question, {});
  }

  function mini(over) {
    return async () => {
      forecastCalls.push(true);
      return {
        rows: [{
          empresa: "Acapulco",
          plant_code: "Acapulco",
          margen: 6.92,
          ventaTon: 100,
          operativos: 1800000,
          corporativos: 400000,
          gasto: 2200000,
          utilOperImporte: 500000,
          resultadoFinalImporte: 900000,
          hgKg: 0.4,
          comDesc: 0.3,
          impuestos: 0.2,
          ingreso: 700000,
          ...over,
        }],
      };
    };
  }

  it("el acumulado con proyección vigente no usa projection null", async () => {
    const client = clientWith();
    const withProjection = await loadIgfDiarioAcumuladoPlantView(client, {
      year: 2026, month: 10, cutoff: CUTOFF, plant: { plantaId: 7, nombre: "Acapulco", clave: "ACAPULCO", canon: "Acapulco" },
    });
    const without = await loadIgfDiarioAcumuladoPlantView(client, {
      year: 2026, month: 10, cutoff: CUTOFF, plant: { plantaId: 7, nombre: "Acapulco", clave: "ACAPULCO", canon: "Acapulco" }, projection: null,
    });
    assert.notEqual(withProjection.authoritative.margenKg, without.authoritative.margenKg);
    assert.notEqual(withProjection.authoritative.ventaTon, without.authoritative.ventaTon);
    assert.notEqual(withProjection.authoritative.comDescKg, without.authoritative.comDescKg);
    const result = await ask("cual es el margen de octubre", client, mini());
    assert.equal(result.ok, true);
    assert.match(result.answer, /7\.52/);
    assert.match(result.answer, /IGF Diario acumulado/);
    assert.doesNotMatch(result.answer, /4\.10/);
    assert.equal(acumuladoCalls.at(-1).projection.marker, "vigente");
    assert.equal(acumuladoCalls.at(-1).corteYmd, CUTOFF);
    assert.equal(forecastCalls.length, 0);
    assert.equal(withProjection.authoritative.margenKg, 7.52);
    assert.equal(withProjection.authoritative.operativosImporte, 2473718.79);
  });

  it("operativos y resultado igualan la vista del helper, no el margen", async () => {
    const client = clientWith();
    const expected = await loadIgfDiarioAcumuladoPlantView(client, {
      year: 2026, month: 10, cutoff: CUTOFF, plant: { plantaId: 7, nombre: "Acapulco", clave: "ACAPULCO", canon: "Acapulco" },
    });
    const oper = await ask("compara operativos actual vs forecast", client, mini());
    assert.match(oper.answer, new RegExp(money(expected.authoritative.operativosImporte).replace(/[.]/g, "\\.")));
    assert.match(oper.answer, /1,800,000\.00/);
    assert.doesNotMatch(oper.answer, /operativos actual 7\.52/);
    const result = await ask("compara resultado final actual vs forecast", client, mini());
    assert.match(result.answer, new RegExp(money(expected.authoritative.resultadoFinalImporte).replace(/[.]/g, "\\.")));
    assert.match(result.answer, /900,000\.00/);
    assert.match(result.answer, /IGF Diario acumulado/);
    assert.match(result.answer, /IGF Forecast/);
  });

  it("el forecast vivo no se inyecta y distingue dato ausente de loader ausente", async () => {
    const client = clientWith();
    const before = acumuladoCalls.length;
    const live = await ask("margen proyectado de octubre", client, mini());
    assert.match(live.answer, /6\.92/);
    assert.match(live.answer, /IGF Forecast/);
    assert.equal(forecastCalls.length, 1);
    assert.equal(acumuladoCalls.length, before);
    const absent = await ask("margen proyectado de octubre", client, async () => {
      forecastCalls.push("absent");
      return { rows: [] };
    });
    assert.match(absent.answer, /sin cifra/);
    assert.doesNotMatch(absent.answer, /no está configurado/);
    const missing = await ask("margen proyectado de octubre", client, undefined);
    assert.match(missing.answer, /no está configurado/);
    assert.doesNotMatch(missing.answer, /sin cifra/);
  });

  it("margen actual contra forecast muestra las dos cifras de su métrica", async () => {
    const result = await ask("compara margen actual vs forecast", clientWith(), mini());
    assert.match(result.answer, /7\.52/);
    assert.match(result.answer, /6\.92/);
    assert.match(result.answer, /IGF Diario acumulado/);
    assert.match(result.answer, /IGF Forecast/);
  });

  it("la discrepancia vigente usa mapPurchase y no solo los kilos", async () => {
    async function flags(rows) {
      const loaded = await snapshotLoader.loadDirectorIa013Snapshot({
        route: semantic.classifyDirectorIaQuestion("que compras no coinciden con el excel", { cutoffYmd: CUTOFF }),
        plantaId: 7,
        auth: { role: "ZP" },
        client: clientWith(rows),
      });
      return loaded.purchases.map((row) => row.discrepant);
    }
    const captured = { id: 1, fecha: "2026-10-20", kg: 18750, importe: 189281.25, excel_kg: 18750, excel_importe: 188240.625, proveedor: "PEMEX", provenance: "CAPTURED" };
    assert.deepEqual(await flags([captured]), [true]);
    assert.deepEqual(await flags([{ ...captured, importe: 188240.63 }]), [false]);
    assert.deepEqual(await flags([{ ...captured, kg: 10, excel_kg: 11, importe: 100, excel_importe: 100 }]), [true]);
    assert.deepEqual(await flags([{ ...captured, provenance: "EXCEL_ONLY", kg: 1, excel_kg: 9 }]), [false]);
    assert.deepEqual(await flags([{ ...captured, excel_importe: 189281.25 }]), [false]);
    const told = await ask("que compras no coinciden con el excel", clientWith([captured]), undefined);
    assert.match(told.answer, /189,281\.25/);
    assert.match(told.answer, /18,750 kg/);
    assert.match(told.answer, /PEMEX/);
    assert.match(told.answer, /CONTROL DE COMPRAS/);
    assert.equal(acumuladoCalls.length, 0);
  });
});
