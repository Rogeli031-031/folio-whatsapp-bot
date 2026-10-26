"use strict";

const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const desglose = require("../lib/igf-diario-gastos-desglose");
const grafica = require("../lib/igf-diario-grafica");
const forecastMod = require("../lib/dashboard-arr-forecast");
const monthly = require("../lib/igf-diario-monthly-financials");
const semantic = require("../lib/director-ia-013-semantic");
const snapshotLoader = require("../lib/director-ia-013-snapshot");
const { loadIgfDiarioAcumuladoPlantView } = require("../lib/director-ia-013-acumulado");

const CUTOFF = "2026-10-26";
const PLANT = { plantaId: 7, nombre: "Acapulco", clave: "ACAPULCO", canon: "Acapulco" };
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

function isWrite(sql) {
  const text = String(sql).replace(/\/\*[\s\S]*?\*\//g, " ").trim();
  return /^(?:create|alter|drop|insert|update|delete|truncate)\b/i.test(text)
    || /;\s*(?:create|alter|drop|insert|update|delete|truncate)\b/i.test(text);
}

function series(overrides) {
  const spec = {
    "2026-10-05": { precio: 14, costoKg: 8, fleteKg: 2, ventaKg: 100 },
    "2026-10-10": { precio: 20, costoKg: 8, fleteKg: 2, ventaKg: 1000 },
    "2026-10-11": { precio: 20, costoKg: 8, fleteKg: null, ventaKg: 500 },
    "2026-10-12": { precio: 16, costoKg: 8, fleteKg: 2, ventaKg: 200 },
    "2026-10-20": { precio: 18, costoKg: 8, fleteKg: 2, ventaKg: 400 },
    "2026-10-25": { precio: 20, costoKg: 8, fleteKg: 2, ventaKg: 1000 },
    "2026-10-26": { precio: 30, costoKg: 8, fleteKg: 2, ventaKg: 3000 },
    "2026-10-27": { precio: 40, costoKg: 8, fleteKg: 2, ventaKg: 9000 },
    "2026-10-28": { precio: 50, costoKg: 8, fleteKg: 2, ventaKg: 9000 },
  };
  const manual = (overrides || []).find((row) => String(row.fecha).slice(0, 10) === "2026-10-10");
  if (manual && manual.precio != null) spec["2026-10-10"] = { ...spec["2026-10-10"], precio: Number(manual.precio) };
  return spec;
}

function detailFrom(overrides) {
  const spec = series(overrides);
  const financial_days = Object.entries(spec).map(([fecha, day]) => ({ fecha, ...day, cdKg: 0 }));
  const days = financial_days.map((day) => ({
    fecha: day.fecha,
    precio: day.precio,
    costo_kg: day.costoKg,
    flete_kg: day.fleteKg,
    margen_bruto: day.fleteKg == null ? null : day.precio - day.costoKg - day.fleteKg,
  }));
  return { days, financial_days };
}

function weighted(financialDays, from, to) {
  const days = financialDays.filter((day) => day.fecha >= from && day.fecha <= to);
  return monthly.weightedByVenta(days, (day) => monthly.margenOf(day), (day) => day.ventaKg);
}

function clientWith(opts = {}) {
  const calls = [];
  return {
    calls,
    async query(sql, params) {
      const text = String(sql);
      calls.push(text);
      if (/FROM public\.plantas/i.test(text)) return { rows: [{ id: params[0], nombre: "Acapulco", clave: "ACAPULCO" }] };
      if (/igf_diario_gastos_desglose/i.test(text)) {
        if (opts.missingDesglose) {
          const error = new Error("relation arr.igf_diario_gastos_desglose does not exist");
          error.code = "42P01";
          throw error;
        }
        return { rows: [{ ...EXPENSE, updated_at: "2026-10-26" }] };
      }
      if (/igf_diario_margen_manual/i.test(text)) return { rows: opts.overrides || [] };
      if (/arr\.compras\b/i.test(text)) return { rows: opts.purchases || [] };
      if (/compras_hg/i.test(text)) return { rows: opts.hg || [] };
      if (/compras_documentos/i.test(text)) return { rows: [] };
      return { rows: [] };
    },
    release() {},
  };
}

function acumuladoPayload(projection) {
  const on = Boolean(projection && projection.marker === "vigente");
  return {
    ok: true,
    rows: [{
      plant_code: "Acapulco",
      empresa: "Acapulco",
      canon: "Acapulco",
      financials: {
        contract: "066",
        ventaKg: on ? 120000 : 80000,
        ventaTon: on ? 120 : 80,
        margenKg: on ? 7.52 : 4.1,
        comDescKg: on ? 1.25 : 0.1,
        hgKg: on ? 0.8 : 0.2,
      },
      missing: [],
    }],
  };
}

describe("DIRECTOR-IA-013-R3 lectura estricta y margen parcial", () => {
  const originalLoad = grafica.loadIgfDiarioAcumulado;
  const originalDetail = grafica.loadMarginDetail;
  const originalProjection = forecastMod.buildPronosticoProjectionContext;
  let acumuladoCalls;
  let detailCalls;
  let overrideRows;
  let askDirectorIa;
  let configureDirectorIaChat;
  const previous = process.env.ENABLE_DIRECTOR_IA;

  beforeEach(() => {
    process.env.ENABLE_DIRECTOR_IA = "true";
    acumuladoCalls = [];
    detailCalls = [];
    overrideRows = [];
    grafica.loadIgfDiarioAcumulado = async (_client, opts) => {
      acumuladoCalls.push(opts);
      return acumuladoPayload(opts.projection);
    };
    grafica.loadMarginDetail = async (_client, opts) => {
      detailCalls.push(opts);
      return { year: 2026, month: 10, ...detailFrom(opts.marginOverrides) };
    };
    forecastMod.buildPronosticoProjectionContext = async () => ({ marker: "vigente" });
    ({ askDirectorIa, configureDirectorIaChat } = require("../lib/director-ia-chat"));
  });

  afterEach(() => {
    grafica.loadIgfDiarioAcumulado = originalLoad;
    grafica.loadMarginDetail = originalDetail;
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
    const body = { planta_id: 7, question, upload_day: CUTOFF, history: [], conversation_state: {} };
    assert.equal(body.igf_snapshot, undefined);
    return askDirectorIa({ body, dashboardAuth: { role: "ZP" } }, 7, question, {});
  }

  function writes(client) {
    return client.calls.filter(isWrite);
  }

  it("listMonthReadOnly solo selecciona y la tabla ausente no crea", async () => {
    const client = clientWith();
    const rows = await desglose.listMonthReadOnly(client, 2026, 10);
    assert.equal(rows.length, 1);
    assert.equal(writes(client).length, 0);
    assert.equal(client.calls.some((sql) => /CREATE/i.test(sql)), false);
    const missing = clientWith({ missingDesglose: true });
    assert.equal(await desglose.listMonthReadOnly(missing, 2026, 10), null);
    assert.equal(writes(missing).length, 0);
    assert.equal(isWrite("SELECT updated_at FROM arr.igf_diario_margen_manual"), false);
    assert.equal(isWrite("UPDATE arr.igf_diario_margen_manual SET precio = 1"), true);
  });

  it("el mes sigue en el acumulado con proyección vigente y no carga el detalle", async () => {
    const client = clientWith();
    const result = await ask("margen de octubre", client);
    assert.equal(result.ok, true);
    assert.match(result.answer, /7\.52/);
    assert.doesNotMatch(result.answer, /4\.10/);
    assert.equal(detailCalls.length, 0);
    assert.equal(acumuladoCalls.length, 1);
    assert.equal(acumuladoCalls[0].projection.marker, "vigente");
    assert.equal(acumuladoCalls[0].uploadDay, CUTOFF);
    assert.equal(acumuladoCalls[0].corteYmd, CUTOFF);
    assert.ok(Array.isArray(acumuladoCalls[0].marginOverrides));
    assert.equal(writes(client).length, 0);
    const view = await loadIgfDiarioAcumuladoPlantView(client, {
      year: 2026, month: 10, cutoff: CUTOFF, plant: PLANT,
    });
    assert.equal(view.authoritative.margenKg, 7.52);
    const absent = clientWith({ missingDesglose: true });
    const still = await ask("margen de octubre", absent);
    assert.match(still.answer, /7\.52/);
    assert.equal(writes(absent).length, 0);
  });

  it("el día, la semana, el rango y los últimos 7 salen de loadMarginDetail", async () => {
    const client = clientWith();
    const detail = await grafica.loadMarginDetail(client, {
      projection: { marker: "vigente" },
      marginOverrides: [],
      includeFinancialDays: true,
    });
    const day10 = detail.days.find((day) => day.fecha === "2026-10-10");
    const day = await ask("margen del 10 de octubre", client);
    assert.match(day.answer, new RegExp(money(day10.margen_bruto).replace(".", "\\.")));
    assert.equal(day.answer.includes("2026-10-10"), true);
    assert.doesNotMatch(day.answer, /2026-10-11/);
    assert.equal(acumuladoCalls.length, 0);
    assert.equal(detailCalls.at(-1).projection.marker, "vigente");
    assert.equal(detailCalls.at(-1).corteYmd, CUTOFF);
    assert.equal(detailCalls.at(-1).uploadDay, CUTOFF);
    assert.equal(detailCalls.at(-1).includeFinancialDays, true);

    const weekExpected = weighted(detail.financial_days, "2026-10-25", CUTOFF);
    const week = await ask("margen de esta semana", client);
    assert.match(week.answer, new RegExp(money(weekExpected).replace(".", "\\.")));
    assert.notEqual(money(weekExpected), money((10 + 20) / 2));

    const rangeExpected = weighted(detail.financial_days, "2026-10-05", "2026-10-12");
    const range = await ask("margen del 5 al 12 de octubre", client);
    assert.match(range.answer, new RegExp(money(rangeExpected).replace(".", "\\.")));
    assert.doesNotMatch(range.answer, /7\.52/);

    const last7 = weighted(detail.financial_days, "2026-10-20", CUTOFF);
    const rolling = await ask("margen de los ultimos 7 dias", client);
    assert.match(rolling.answer, new RegExp(money(last7).replace(".", "\\.")));

    const capped = weighted(detail.financial_days, "2026-10-25", CUTOFF);
    const future = await ask("margen del 25 al 31 de octubre", client);
    assert.match(future.answer, new RegExp(money(capped).replace(".", "\\.")));
    assert.match(future.answer, /2026-10-26/);
    assert.doesNotMatch(future.answer, /2026-10-31/);
    assert.equal(writes(client).length, 0);
    assert.equal(acumuladoCalls.length, 0);
  });

  it("el override manual entra y al quitarlo vuelve el precio automático", async () => {
    overrideRows = [{ plant_code: "Acapulco", year: 2026, month: 10, fecha: "2026-10-10", precio: 25, costo_kg: 8, flete_kg: 2 }];
    const manualClient = clientWith({ overrides: overrideRows });
    const manualDetail = await grafica.loadMarginDetail(null, { marginOverrides: overrideRows, includeFinancialDays: true });
    const manual = await ask("margen del 10 de octubre", manualClient);
    assert.equal(detailCalls.at(-1).marginOverrides[0].precio, 25);
    assert.match(manual.answer, new RegExp(money(manualDetail.days.find((day) => day.fecha === "2026-10-10").margen_bruto).replace(".", "\\.")));
    const autoDetail = await grafica.loadMarginDetail(null, { marginOverrides: [], includeFinancialDays: true });
    const restored = await ask("margen del 10 de octubre", clientWith());
    assert.deepEqual(detailCalls.at(-1).marginOverrides, []);
    assert.match(restored.answer, new RegExp(money(autoDetail.days.find((day) => day.fecha === "2026-10-10").margen_bruto).replace(".", "\\.")));
    assert.notEqual(
      manualDetail.days.find((day) => day.fecha === "2026-10-10").margen_bruto,
      autoDetail.days.find((day) => day.fecha === "2026-10-10").margen_bruto
    );
  });

  it("un día incompleto queda sin cifra y el puente usa esa fila", async () => {
    const client = clientWith();
    const empty = await ask("margen del 11 de octubre", client);
    assert.match(empty.answer, /sin cifra/);
    assert.doesNotMatch(empty.answer, /\bnull\b/);
    assert.doesNotMatch(empty.answer, /0\.00/);
    const bridge = await ask("precio costo flete y margen del 10 de octubre", client);
    assert.match(bridge.answer, /10\.00/);
    assert.match(bridge.answer, /20\.00/);
    assert.match(bridge.answer, /8\.00/);
    assert.match(bridge.answer, /2\.00/);
    const after = await ask("margen del 27 de octubre", client);
    assert.match(after.answer, /después del corte/);
  });

  it("el HG parcial no usa el HG del mes y las rutas de lectura no escriben", async () => {
    const client = clientWith();
    const hg = await ask("hg financiero de esta semana", client);
    assert.match(hg.answer, /detalle diario/);
    assert.doesNotMatch(hg.answer, /0\.80/);
    assert.equal(acumuladoCalls.length, 0);
    const forecast = await ask("margen proyectado de octubre", client, async () => ({
      rows: [{ empresa: "Acapulco", plant_code: "Acapulco", margen: 6.92 }],
    }));
    assert.match(forecast.answer, /6\.92/);
    assert.match(forecast.answer, /IGF Forecast/);
    const compare = await ask("compara margen actual vs forecast", client, async () => ({
      rows: [{ empresa: "Acapulco", plant_code: "Acapulco", margen: 6.92 }],
    }));
    assert.match(compare.answer, /7\.52/);
    assert.match(compare.answer, /6\.92/);
    const captured = { id: 1, fecha: "2026-10-20", kg: 18750, importe: 189281.25, excel_kg: 18750, excel_importe: 188240.625, proveedor: "PEMEX", provenance: "CAPTURED" };
    const discrepant = await ask("que compras no coinciden con el excel", clientWith({ purchases: [captured] }));
    assert.match(discrepant.answer, /18,750 kg/);
    assert.match(discrepant.answer, /PEMEX/);
    const gas = await ask("cuanto gas lp compre en octubre", clientWith());
    const physical = await ask("hg fisico de octubre", clientWith());
    assert.equal(gas.ok, true);
    assert.equal(physical.ok, true);
    assert.equal(writes(client).length, 0);
    await assert.rejects(
      () => snapshotLoader.loadDirectorIa013Snapshot({
        route: semantic.classifyDirectorIaQuestion("margen de octubre", { cutoffYmd: CUTOFF }),
        plantaId: 9,
        auth: { role: "GG", plantas_permitidas: [7] },
        client: clientWith(),
      }),
      (error) => error.status === 403
    );
    await assert.rejects(
      () => snapshotLoader.loadDirectorIa013Snapshot({
        route: semantic.classifyDirectorIaQuestion("margen de octubre", { cutoffYmd: CUTOFF }),
        plantaId: 7,
        auth: { role: "GA", plantas_permitidas: [7] },
        client: clientWith(),
      }),
      (error) => error.status === 403 && /GA no tiene acceso/.test(error.message)
    );
  });
});
