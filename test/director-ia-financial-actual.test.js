"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const {
  FINANCE_PROVIDED_FIELDS,
  FINANCIAL_ACTUAL_CODES,
  canViewFinancialActual,
  loadFinancialActualEvidence,
} = require("../lib/director-ia-financial-actual");
const {
  assembleMonthClosePack,
  loadMonthCloseResultForChat,
  isMonthCloseQuestion,
  formatMonthCloseContext,
  buildMonthCloseChatResult,
} = require("../lib/director-ia-month-close-result");
const { detectDirectorIaIntent, planDirectorIaQuestion } = require("../lib/director-ia-planner");

const ROOT = path.join(__dirname, "..");
const LOADER_SRC = fs.readFileSync(path.join(ROOT, "lib", "director-ia-financial-actual.js"), "utf8");
const MONTH_CLOSE_SRC = fs.readFileSync(path.join(ROOT, "lib", "director-ia-month-close-result.js"), "utf8");
const PRE_MEETING_SRC = fs.readFileSync(path.join(ROOT, "lib", "director-ia-pre-meeting.js"), "utf8");

const ALL_FIELDS = [
  "venta_ton",
  "margen_kg",
  "com_desc_kg",
  "gasto_kg",
  "impuesto_kg",
  "hg_pct",
  "hg_kg",
  "bancos_planta_kg",
  "provision_planta_kg",
  "util_oper_kg",
  "util_oper_importe",
  "gtos_apoyos_corp_kg",
  "bancos_corp_kg",
  "otros_programas_kg",
  "inversiones_kg",
  "resultado_final_kg",
  "resultado_final_importe",
];

function storedFields(over = {}) {
  const base = {
    venta_ton: 10,
    margen_kg: 1.1,
    com_desc_kg: 0.2,
    gasto_kg: 0.4,
    impuesto_kg: 0.05,
    hg_pct: 0.1,
    hg_kg: -0.3,
    bancos_planta_kg: 0.01,
    provision_planta_kg: 0.02,
    util_oper_kg: 0.8,
    util_oper_importe: 8000,
    gtos_apoyos_corp_kg: 0.03,
    bancos_corp_kg: 0.04,
    otros_programas_kg: 0.01,
    inversiones_kg: 0.06,
    resultado_final_kg: 0.7,
    resultado_final_importe: 7000,
  };
  return { ...base, ...over };
}

function zpAuth(over = {}) {
  return { role: "ZP", actor_id: 1, ...over };
}

function mockClient({ versions = [], lines = [], fail = false } = {}) {
  return {
    async query(sql, params = []) {
      if (fail) throw new Error("db down");
      const s = String(sql).replace(/\s+/g, " ");
      if (/FROM igf\.versions/i.test(s)) {
        const year = Number(params[0]);
        const month = Number(params[1]);
        return {
          rows: versions.filter(
            (v) =>
              String(v.plant_code) === "GLOBAL" && Number(v.year) === year && Number(v.month) === month
          ),
        };
      }
      if (/FROM igf\.compromiso_lines/i.test(s)) {
        const versionId = Number(params[0]);
        return { rows: lines.filter((l) => Number(l.version_id) === versionId) };
      }
      throw new Error("unexpected sql");
    },
  };
}

function loadOpts(over = {}) {
  return {
    year: 2026,
    month: 7,
    plant: { planta_id: 1, plant_code: "PUE", planta_nombre: "Puebla" },
    auth: zpAuth(),
    ...over,
  };
}

function salesRow(month, cliente, kg, canal = "Casa") {
  return { month, cliente_norm: cliente, canal, subcanal: "", kg };
}

function packOpts(over = {}) {
  return {
    plant: { planta_id: 1, planta_nombre: "Puebla", plant_code: "PUE" },
    planta_id: 1,
    year: 2026,
    month: 6,
    period_status: "COMPLETE",
    generated_at: "2026-08-25T00:00:00.000Z",
    salesRows: [salesRow("2026-06", "ACME", 10000, "Casa")],
    priorSalesRows: [salesRow("2026-05", "ACME", 8000, "Casa")],
    discountRows: [{ month: "2026-06", cliente_norm: "ACME", canal: "Casa", subcanal: "", monto: -100 }],
    target: {
      version_id: 9,
      version_number: 2,
      empresa: "Puebla",
      venta_ton: 12,
      row: { empresa: "Puebla", venta_ton: 12, margen_kg: 1.5, util_oper_importe: 100 },
    },
    forecast: {
      version_id: 3,
      version_number: 9,
      row: { empresa: "Puebla", venta_ton: 11, margen_kg: 1.2 },
      composition: { lines: [] },
    },
    actions: { ok: true, summary: { open: 0, closed: 0, overdue: 0 }, top_overdue: [] },
    comments: [],
    limitations: [],
    ...over,
  };
}

function supportedActual(over = {}) {
  const fields = storedFields(over.fields || {});
  return {
    ok: true,
    status: "SUPPORTED",
    truth_class: "ACTUAL_FINANCIAL",
    source_owner: "FINANZAS",
    source: "igf.compromiso_lines",
    source_persistence: ["igf.versions", "igf.compromiso_lines"],
    year: 2026,
    month: 6,
    version_id: 4,
    version_number: 1,
    financial_state: "FINAL",
    finalized_at: "2026-08-01T00:00:00.000Z",
    finalized_by: "usuario:1|role:ZP",
    created_at: "2026-07-15T00:00:00.000Z",
    created_at_role: "upload_timestamp",
    empresa: "Puebla",
    plant: { planta_id: 1, plant_code: "PUE", planta_nombre: "Puebla" },
    fields,
    field_origin: Object.fromEntries(ALL_FIELDS.map((k) => [k, "FINANCE_PROVIDED"])),
    ...over,
  };
}

describe("financial actual loader contract", () => {
  it("tiene exactamente 17 campos FINANCE_PROVIDED", () => {
    assert.deepEqual([...FINANCE_PROVIDED_FIELDS], ALL_FIELDS);
  });

  it("no usa HTTP, latest, MAX, is_current ni GET overlay", () => {
    assert.equal(/axios|fetch\(|\/api\/dashboard\/igf-forecast/.test(LOADER_SRC), false);
    assert.equal(/ORDER BY version_number/i.test(LOADER_SRC), false);
    assert.equal(/MAX\s*\(\s*version_number/i.test(LOADER_SRC), false);
    assert.equal(/is_current/.test(LOADER_SRC), false);
    assert.equal(/recalcularUtilYResultado/.test(LOADER_SRC), false);
    assert.equal(/presupuesto_kg|folios_|deposito_cierre_kg/.test(LOADER_SRC), false);
    assert.match(LOADER_SRC, /financial_state = 'FINAL'|=== "FINAL"/);
    assert.equal(/director-ia-financial-actual/.test(PRE_MEETING_SRC), false);
    assert.match(MONTH_CLOSE_SRC, /loadFinancialActualEvidence/);
  });
});

describe("financial actual VIEW authz", () => {
  it("ZP y aliases ven todas las plantas", () => {
    assert.equal(canViewFinancialActual({ role: "ZP" }, 99), true);
    assert.equal(canViewFinancialActual({ role: "DIR_ZP" }, 99), true);
    assert.equal(canViewFinancialActual({ role: "DIRZP" }, 99), true);
    assert.equal(canViewFinancialActual({ role: "DIRECTORZP" }, 4), true);
    assert.equal(canViewFinancialActual({ role: "DIRECTOR_ZP" }, 2), true);
    assert.equal(canViewFinancialActual({ role: "DZP" }, 8), true);
    assert.equal(canViewFinancialActual({ role: "DIR-ZP" }, 8), true);
    assert.equal(canViewFinancialActual({ role: "GG", actor_nombre: "Director ZP" }, 3), true);
  });

  it("AD ve todas las plantas", () => {
    assert.equal(canViewFinancialActual({ role: "AD" }, 99), true);
    assert.equal(canViewFinancialActual({ role: "AD", plantas_permitidas: [1] }, 99), true);
  });

  it("GG solo plantas asignadas", () => {
    assert.equal(canViewFinancialActual({ role: "GG", plantas_permitidas: [1, 2] }, 1), true);
    assert.equal(canViewFinancialActual({ role: "GG", plantas_permitidas: [1, 2] }, 9), false);
    assert.equal(canViewFinancialActual({ role: "GG", plantas_permitidas: [] }, 1), false);
  });

  it("resto deny", () => {
    for (const role of ["GA", "GV", "CF_CDMX", "CDMX", "GO", "SG", "SEH", "ZC", ""]) {
      assert.equal(canViewFinancialActual({ role }, 1), false, role);
    }
    assert.equal(canViewFinancialActual(null, 1), false);
  });
});

describe("financial actual FINAL selection", () => {
  it("elige la única FINAL y no la FORECAST más reciente", async () => {
    const out = await loadFinancialActualEvidence(
      mockClient({
        versions: [
          {
            id: 1,
            plant_code: "GLOBAL",
            year: 2026,
            month: 7,
            version_number: 1,
            financial_state: "FINAL",
            finalized_at: "2026-08-02T00:00:00Z",
            finalized_by: "usuario:1|role:ZP",
            created_at: "2026-07-10T00:00:00Z",
          },
          {
            id: 9,
            plant_code: "GLOBAL",
            year: 2026,
            month: 7,
            version_number: 9,
            financial_state: "FORECAST",
            finalized_at: null,
            finalized_by: null,
            created_at: "2026-07-20T00:00:00Z",
          },
        ],
        lines: [
          {
            version_id: 1,
            empresa: "Puebla",
            ...storedFields({ venta_ton: 8.5, hg_kg: 0.4 }),
            presupuesto_kg: 99,
            folios_carro_kg: 88,
            deposito_cierre_kg: 77,
          },
          { version_id: 9, empresa: "Puebla", ...storedFields({ venta_ton: 1 }) },
        ],
      }),
      loadOpts()
    );
    assert.equal(out.ok, true);
    assert.equal(out.status, FINANCIAL_ACTUAL_CODES.SUPPORTED);
    assert.equal(out.truth_class, "ACTUAL_FINANCIAL");
    assert.equal(out.source_owner, "FINANZAS");
    assert.equal(out.version_id, 1);
    assert.equal(out.version_number, 1);
    assert.equal(out.financial_state, "FINAL");
    assert.equal(out.finalized_by, "usuario:1|role:ZP");
    assert.equal(out.created_at_role, "upload_timestamp");
    assert.equal(out.empresa, "Puebla");
    assert.equal(out.fields.venta_ton, 8.5);
    assert.equal(out.fields.hg_kg, 0.4);
    assert.equal(out.field_origin.util_oper_kg, "FINANCE_PROVIDED");
    assert.equal(out.fields.presupuesto_kg, undefined);
    assert.equal(out.fields.folios_carro_kg, undefined);
    assert.equal(out.fields.deposito_cierre_kg, undefined);
    for (const key of ALL_FIELDS) {
      assert.equal(Object.prototype.hasOwnProperty.call(out.fields, key), true, key);
      assert.equal(out.field_origin[key], "FINANCE_PROVIDED", key);
    }
  });

  it("SUPERSEDED no sustituye FINAL ausente", async () => {
    const out = await loadFinancialActualEvidence(
      mockClient({
        versions: [
          {
            id: 2,
            plant_code: "GLOBAL",
            year: 2026,
            month: 7,
            version_number: 2,
            financial_state: "SUPERSEDED",
          },
          {
            id: 3,
            plant_code: "GLOBAL",
            year: 2026,
            month: 7,
            version_number: 3,
            financial_state: "FORECAST",
          },
        ],
        lines: [{ version_id: 3, empresa: "Puebla", ...storedFields() }],
      }),
      loadOpts()
    );
    assert.equal(out.status, FINANCIAL_ACTUAL_CODES.NOT_FINAL);
    assert.equal(out.fields, null);
  });

  it("sin versions -> MISSING; sin FINAL -> NOT_FINAL; >1 FINAL -> AMBIGUOUS", async () => {
    const missing = await loadFinancialActualEvidence(mockClient({ versions: [], lines: [] }), loadOpts());
    assert.equal(missing.status, FINANCIAL_ACTUAL_CODES.MISSING_FOR_PERIOD);

    const notFinal = await loadFinancialActualEvidence(
      mockClient({
        versions: [{ id: 1, plant_code: "GLOBAL", year: 2026, month: 7, version_number: 1, financial_state: "FORECAST" }],
        lines: [],
      }),
      loadOpts()
    );
    assert.equal(notFinal.status, FINANCIAL_ACTUAL_CODES.NOT_FINAL);

    const ambiguous = await loadFinancialActualEvidence(
      mockClient({
        versions: [
          { id: 1, plant_code: "GLOBAL", year: 2026, month: 7, version_number: 1, financial_state: "FINAL" },
          { id: 2, plant_code: "GLOBAL", year: 2026, month: 7, version_number: 2, financial_state: "FINAL" },
        ],
        lines: [],
      }),
      loadOpts()
    );
    assert.equal(ambiguous.status, FINANCIAL_ACTUAL_CODES.VERSION_AMBIGUOUS);
    assert.equal(ambiguous.ok, false);
  });

  it("error de fuente y unauthorized no se disfrazan de missing", async () => {
    const down = await loadFinancialActualEvidence(mockClient({ fail: true }), loadOpts());
    assert.equal(down.status, FINANCIAL_ACTUAL_CODES.SOURCE_UNAVAILABLE);

    const denied = await loadFinancialActualEvidence(mockClient({ versions: [] }), loadOpts({ auth: { role: "GA" } }));
    assert.equal(denied.status, FINANCIAL_ACTUAL_CODES.UNAUTHORIZED);
    assert.equal(denied.status !== FINANCIAL_ACTUAL_CODES.MISSING_FOR_PERIOD, true);
  });

  it("GG assigned carga; GG otra planta y resto no leen SQL de negocio", async () => {
    let queries = 0;
    const counting = {
      async query() {
        queries += 1;
        return { rows: [] };
      },
    };
    const allowed = await loadFinancialActualEvidence(counting, loadOpts({ auth: { role: "GG", plantas_permitidas: [1] } }));
    assert.equal(allowed.status, FINANCIAL_ACTUAL_CODES.MISSING_FOR_PERIOD);
    assert.ok(queries >= 1);

    queries = 0;
    const ggDeny = await loadFinancialActualEvidence(counting, loadOpts({ auth: { role: "GG", plantas_permitidas: [2] } }));
    assert.equal(ggDeny.status, FINANCIAL_ACTUAL_CODES.UNAUTHORIZED);
    assert.equal(queries, 0);

    const gv = await loadFinancialActualEvidence(counting, loadOpts({ auth: { role: "GV", plantas_permitidas: [1] } }));
    assert.equal(gv.status, FINANCIAL_ACTUAL_CODES.UNAUTHORIZED);
  });
});

describe("month_close financial.actual composition", () => {
  it("actual FINAL convive con target y forecast sin mezclar clases", () => {
    const pack = assembleMonthClosePack(
      packOpts({
        financial_actual: supportedActual({ fields: storedFields({ venta_ton: 10, util_oper_importe: 111 }) }),
      })
    );
    assert.equal(pack.financial.actual.status, "SUPPORTED");
    assert.equal(pack.financial.actual.truth_class, "ACTUAL_FINANCIAL");
    assert.equal(pack.financial.actual.fields.util_oper_importe, 111);
    assert.equal(pack.financial.target.truth_class, "TARGET_COMMITMENT");
    assert.equal(pack.financial.forecast.truth_class, "FORECAST");
    assert.equal(pack.sales.actual_class, "ACTUAL");
    assert.equal(pack.financial.actual.fields.venta_ton, 10);
    assert.equal(pack.sales.actual_ton, 10);
    assert.equal(pack.financial.actual.reconciliation.status, "OK");
    assert.equal(pack.information_gaps.some((g) => g.kind === "FINANCIAL_ACTUAL_UNSUPPORTED"), false);
  });

  it("actual + target missing y actual + forecast missing no tiran el pack", () => {
    const noTarget = assembleMonthClosePack(
      packOpts({ target: null, financial_actual: supportedActual({ fields: storedFields({ venta_ton: 10 }) }) })
    );
    assert.equal(noTarget.financial.actual.truth_class, "ACTUAL_FINANCIAL");
    assert.equal(noTarget.sales.target_status, "TARGET_MISSING_FOR_PERIOD");
    assert.equal(noTarget.sales.actual_ton, 10);

    const noForecast = assembleMonthClosePack(
      packOpts({ forecast: { missing: true }, financial_actual: supportedActual({ fields: storedFields({ venta_ton: 10 }) }) })
    );
    assert.equal(noForecast.financial.actual.truth_class, "ACTUAL_FINANCIAL");
    assert.equal(noForecast.financial.forecast, null);
    assert.ok(noForecast.limitations.includes("igf_forecast_missing_for_period"));
  });

  it("NOT_FINAL no se convierte en forecast; MISSING no se convierte en cero", () => {
    const notFinal = assembleMonthClosePack(
      packOpts({
        financial_actual: { ok: false, status: FINANCIAL_ACTUAL_CODES.NOT_FINAL, year: 2026, month: 6 },
      })
    );
    assert.equal(notFinal.financial.actual.status, FINANCIAL_ACTUAL_CODES.NOT_FINAL);
    assert.equal(notFinal.financial.actual.truth_class, null);
    assert.equal(notFinal.financial.forecast.truth_class, "FORECAST");
    assert.equal(notFinal.financial.actual.fields, undefined);

    const missing = assembleMonthClosePack(
      packOpts({
        financial_actual: { ok: false, status: FINANCIAL_ACTUAL_CODES.MISSING_FOR_PERIOD },
      })
    );
    assert.equal(missing.financial.actual.status, FINANCIAL_ACTUAL_CODES.MISSING_FOR_PERIOD);
    assert.equal(missing.financial.actual.fields, undefined);
    assert.equal(missing.sales.actual_ton, 10);
  });

  it("venta Finance = ARR no marca gap; distinta conserva ambos", () => {
    const same = assembleMonthClosePack(
      packOpts({ financial_actual: supportedActual({ fields: storedFields({ venta_ton: 10 }) }) })
    );
    assert.equal(same.financial.actual.reconciliation.status, "OK");
    assert.equal(same.limitations.includes(FINANCIAL_ACTUAL_CODES.RECONCILIATION_GAP), false);

    const gap = assembleMonthClosePack(
      packOpts({ financial_actual: supportedActual({ fields: storedFields({ venta_ton: 7.2 }) }) })
    );
    assert.equal(gap.financial.actual.reconciliation.status, FINANCIAL_ACTUAL_CODES.RECONCILIATION_GAP);
    assert.equal(gap.financial.actual.reconciliation.finance_venta_ton, 7.2);
    assert.equal(gap.financial.actual.reconciliation.arr_venta_ton, 10);
    assert.equal(gap.financial.actual.reconciliation.overwrite, false);
    assert.equal(gap.financial.actual.fields.venta_ton, 7.2);
    assert.equal(gap.sales.actual_ton, 10);
    assert.ok(gap.information_gaps.some((g) => g.kind === FINANCIAL_ACTUAL_CODES.RECONCILIATION_GAP));
  });

  it("loadMonthClose consume el loader inyectado", async () => {
    const pack = await loadMonthCloseResultForChat(
      {},
      1,
      { dashboardAuth: zpAuth() },
      {
        now: new Date("2026-08-24T18:00:00-06:00"),
        question: "¿Cómo cerró 2026-06?",
        plant: { planta_id: 1, planta_nombre: "Puebla", plant_code: "PUE" },
        plantCodesUpper: ["PUE"],
        salesRows: [salesRow("2026-06", "ACME", 10000)],
        priorSalesRows: [salesRow("2026-05", "ACME", 8000)],
        discountRows: [{ month: "2026-06", cliente_norm: "ACME", canal: "Casa", subcanal: "", monto: -100 }],
        loadTarget: async () => ({
          version_id: 1,
          version_number: 1,
          empresa: "Puebla",
          venta_ton: 12,
          row: { empresa: "Puebla", venta_ton: 12 },
        }),
        loadForecast: async () => ({ missing: true }),
        loadFinancialActual: async ({ year, month }) =>
          supportedActual({ year, month, fields: storedFields({ venta_ton: 10 }) }),
        loadActions: async () => ({ ok: true, summary: { open: 0, closed: 0, overdue: 0 }, top_overdue: [] }),
        comments: [],
      }
    );
    assert.equal(pack.financial.actual.truth_class, "ACTUAL_FINANCIAL");
    assert.equal(pack.financial.forecast, null);
    assert.equal(pack.sales.actual_ton, 10);
  });
});

describe("month_close financial routing", () => {
  it("cierre financiero real va a month_close_result sin intent nuevo", () => {
    const questions = [
      "¿Cuál fue la utilidad operativa real de julio?",
      "¿Cuál fue la utilidad real de julio?",
      "¿Cuál fue el resultado final real?",
      "¿Cómo cerramos financieramente julio?",
      "¿Cómo quedamos realmente contra la meta?",
      "¿Qué diferencia hubo entre forecast y cierre?",
    ];
    for (const q of questions) {
      assert.equal(isMonthCloseQuestion(q), true, q);
      assert.equal(detectDirectorIaIntent(q).intent, "month_close_result", q);
      assert.equal(planDirectorIaQuestion(q).intent, "month_close_result", q);
    }
    assert.equal(detectDirectorIaIntent(questions[0]).intent !== "financial_actual", true);
  });

  it("mes abierto / IGF vigente no se sobrecarga", () => {
    assert.equal(detectDirectorIaIntent("cómo va IGF").intent, "igf_status");
    assert.equal(planDirectorIaQuestion("¿Cómo proyectamos cerrar el IGF de Puebla este mes?").intent, "igf_status");
    assert.equal(isMonthCloseQuestion("¿Cómo vamos este mes?"), false);
    assert.equal(detectDirectorIaIntent("¿Cómo vamos este mes?").intent !== "month_close_result", true);
  });
});

describe("FIX context projection + adversarial loader", () => {
  it("formatMonthCloseContext proyecta sentinels FINANCE_PROVIDED y provenance FINAL", () => {
    const pack = assembleMonthClosePack(
      packOpts({
        target: {
          version_id: 9,
          version_number: 2,
          empresa: "Puebla",
          venta_ton: 555.111,
          row: { empresa: "Puebla", venta_ton: 555.111, margen_kg: 1.5 },
        },
        forecast: {
          version_id: 3,
          version_number: 9,
          row: { empresa: "Puebla", venta_ton: 333.222, margen_kg: 1.2 },
          composition: { lines: [{ line_key: "venta_ton", value: 333.222 }] },
        },
        financial_actual: supportedActual({
          fields: storedFields({
            venta_ton: 987.654,
            margen_kg: 7.321,
            util_oper_importe: 123456.78,
            resultado_final_importe: -45678.9,
            impuesto_kg: null,
          }),
        }),
      })
    );
    const ctx = formatMonthCloseContext(pack);
    assert.match(ctx, /truth_class=ACTUAL_FINANCIAL/);
    assert.match(ctx, /field_origin=FINANCE_PROVIDED/);
    assert.match(ctx, /source_owner=FINANZAS/);
    assert.match(ctx, /financial_state=FINAL/);
    assert.match(ctx, /financial\.actual\.version_id=4/);
    assert.match(ctx, /financial\.actual\.version_number=1/);
    assert.match(ctx, /finalized_by=usuario:1\|role:ZP/);
    assert.match(ctx, /fields\.venta_ton=987\.654 origin=FINANCE_PROVIDED/);
    assert.match(ctx, /fields\.margen_kg=7\.321 origin=FINANCE_PROVIDED/);
    assert.match(ctx, /fields\.util_oper_importe=123456\.78 origin=FINANCE_PROVIDED/);
    assert.match(ctx, /fields\.resultado_final_importe=-45678\.9 origin=FINANCE_PROVIDED/);
    assert.match(ctx, /fields\.impuesto_kg=null origin=FINANCE_PROVIDED/);
    assert.match(ctx, /created_at=.*role=upload_timestamp/);
    assert.equal(/business as-of|as-of de negocio/.test(ctx), false);
    assert.equal(ctx.includes("presupuesto_kg"), false);
    assert.equal(ctx.includes("folios_carro_kg"), false);
    assert.match(ctx, /financial\.target\.venta_ton=555\.111 class=TARGET_COMMITMENT/);
    assert.match(ctx, /financial\.forecast\.venta_ton=333\.222 class=FORECAST/);
    assert.equal(pack.financial.actual.fields.venta_ton !== 555.111, true);
    assert.equal(pack.financial.actual.fields.venta_ton !== 333.222, true);
    const chat = buildMonthCloseChatResult(pack, { answer: "ok", planta_id: 1 });
    assert.equal(chat.context_meta.month_close.financial_actual.fields.util_oper_importe, 123456.78);
  });

  it("contexto de gap conserva Finance y ARR; NOT_FINAL no proyecta actual falso", () => {
    const gap = assembleMonthClosePack(
      packOpts({
        financial_actual: supportedActual({ fields: storedFields({ venta_ton: 7.2 }) }),
      })
    );
    const gapCtx = formatMonthCloseContext(gap);
    assert.match(gapCtx, /FINANCIAL_ACTUAL_RECONCILIATION_GAP/);
    assert.match(gapCtx, /finance_venta_ton=7\.2 class=ACTUAL_FINANCIAL/);
    assert.match(gapCtx, /arr_venta_ton=10 class=ACTUAL_COMMERCIAL/);
    assert.match(gapCtx, /No elijas un ganador/);

    const notFinal = assembleMonthClosePack(
      packOpts({
        financial_actual: { ok: false, status: FINANCIAL_ACTUAL_CODES.NOT_FINAL, year: 2026, month: 6 },
      })
    );
    const nfCtx = formatMonthCloseContext(notFinal);
    assert.match(nfCtx, /FINANCIAL_ACTUAL_NOT_FINAL/);
    assert.equal(/fields\.util_oper_importe=/.test(nfCtx), false);
    assert.match(nfCtx, /financial\.forecast=FORECAST/);

    const missing = assembleMonthClosePack(
      packOpts({
        financial_actual: { ok: false, status: FINANCIAL_ACTUAL_CODES.MISSING_FOR_PERIOD },
      })
    );
    const missCtx = formatMonthCloseContext(missing);
    assert.match(missCtx, /FINANCIAL_ACTUAL_MISSING_FOR_PERIOD/);
    assert.equal(/fields\.venta_ton=/.test(missCtx), false);
    assert.equal(/fields\.venta_ton=0 /.test(missCtx), false);
  });

  it("SUPERSEDED + FINAL del mismo YYYY-MM usa solo la FINAL", async () => {
    const out = await loadFinancialActualEvidence(
      mockClient({
        versions: [
          {
            id: 5,
            plant_code: "GLOBAL",
            year: 2026,
            month: 7,
            version_number: 5,
            financial_state: "SUPERSEDED",
            finalized_at: "2026-08-01T00:00:00Z",
            finalized_by: "usuario:1|role:ZP",
          },
          {
            id: 6,
            plant_code: "GLOBAL",
            year: 2026,
            month: 7,
            version_number: 6,
            financial_state: "FINAL",
            finalized_at: "2026-08-10T00:00:00Z",
            finalized_by: "usuario:2|role:AD",
          },
        ],
        lines: [
          { version_id: 5, empresa: "Puebla", ...storedFields({ venta_ton: 1, util_oper_importe: 1 }) },
          { version_id: 6, empresa: "Puebla", ...storedFields({ venta_ton: 22.5, util_oper_importe: 9001 }) },
        ],
      }),
      loadOpts()
    );
    assert.equal(out.status, "SUPPORTED");
    assert.equal(out.version_id, 6);
    assert.equal(out.version_number, 6);
    assert.equal(out.financial_state, "FINAL");
    assert.equal(out.fields.venta_ton, 22.5);
    assert.equal(out.fields.util_oper_importe, 9001);
  });

  it("isola empresas de una FINAL GLOBAL y GG no ve la no asignada", async () => {
    const client = mockClient({
      versions: [
        {
          id: 6,
          plant_code: "GLOBAL",
          year: 2026,
          month: 7,
          version_number: 6,
          financial_state: "FINAL",
          finalized_at: "2026-08-10T00:00:00Z",
          finalized_by: "usuario:1|role:ZP",
        },
      ],
      lines: [
        { version_id: 6, empresa: "Puebla", ...storedFields({ venta_ton: 11, util_oper_importe: 111 }) },
        { version_id: 6, empresa: "Querétaro", ...storedFields({ venta_ton: 44, util_oper_importe: 444 }) },
      ],
    });
    const puebla = await loadFinancialActualEvidence(
      client,
      loadOpts({ plant: { planta_id: 1, plant_code: "PUE", planta_nombre: "Puebla" } })
    );
    const qro = await loadFinancialActualEvidence(
      client,
      loadOpts({ plant: { planta_id: 2, plant_code: "Querétaro", planta_nombre: "Querétaro" } })
    );
    assert.equal(puebla.empresa, "Puebla");
    assert.equal(puebla.fields.venta_ton, 11);
    assert.equal(qro.empresa, "Querétaro");
    assert.equal(qro.fields.venta_ton, 44);
    assert.equal(puebla.fields.util_oper_importe !== 444, true);

    const ggA = await loadFinancialActualEvidence(
      client,
      loadOpts({
        plant: { planta_id: 1, plant_code: "PUE", planta_nombre: "Puebla" },
        auth: { role: "GG", plantas_permitidas: [1] },
      })
    );
    const ggB = await loadFinancialActualEvidence(
      client,
      loadOpts({
        plant: { planta_id: 2, plant_code: "Querétaro", planta_nombre: "Querétaro" },
        auth: { role: "GG", plantas_permitidas: [1] },
      })
    );
    assert.equal(ggA.status, "SUPPORTED");
    assert.equal(ggA.fields.venta_ton, 11);
    assert.equal(ggB.status, FINANCIAL_ACTUAL_CODES.UNAUTHORIZED);

    const none = await loadFinancialActualEvidence(
      client,
      loadOpts({ plant: { planta_id: 9, plant_code: "XXX", planta_nombre: "Inexistente" } })
    );
    assert.equal(none.status, FINANCIAL_ACTUAL_CODES.LINE_NOT_FOUND_FOR_PLANT);
    assert.equal(none.fields, null);
  });

  it("month_close e2e histórico julio no usa el mes corriente", async () => {
    const seen = [];
    const pack = await loadMonthCloseResultForChat(
      {},
      1,
      { dashboardAuth: zpAuth() },
      {
        now: new Date("2026-08-25T18:00:00-06:00"),
        question: "¿Cuál fue la utilidad real de julio?",
        plant: { planta_id: 1, planta_nombre: "Puebla", plant_code: "PUE" },
        plantCodesUpper: ["PUE"],
        salesRows: [salesRow("2026-07", "ACME", 10000)],
        priorSalesRows: [salesRow("2026-06", "ACME", 8000)],
        discountRows: [{ month: "2026-07", cliente_norm: "ACME", canal: "Casa", subcanal: "", monto: -100 }],
        loadTarget: async ({ year, month }) => ({
          version_id: 1,
          version_number: 1,
          empresa: "Puebla",
          venta_ton: 12,
          row: { empresa: "Puebla", venta_ton: 12 },
        }),
        loadForecast: async () => ({
          version_id: 8,
          version_number: 2,
          row: { empresa: "Puebla", venta_ton: 9 },
          composition: { lines: [{ line_key: "venta_ton", value: 9 }] },
        }),
        loadFinancialActual: async ({ year, month }) => {
          seen.push(`${year}-${month}`);
          return supportedActual({
            year,
            month,
            version_id: 70,
            version_number: 3,
            fields: storedFields({ venta_ton: 77.7, util_oper_importe: 70707 }),
          });
        },
        loadActions: async () => ({ ok: true, summary: { open: 0, closed: 0, overdue: 0 }, top_overdue: [] }),
        comments: [],
      }
    );
    assert.deepEqual(seen, ["2026-7"]);
    assert.equal(pack.month, "2026-07");
    assert.equal(pack.year, 2026);
    assert.equal(pack.month_number, 7);
    assert.equal(pack.financial.actual.version_id, 70);
    assert.equal(pack.financial.actual.fields.util_oper_importe, 70707);
    const ctx = formatMonthCloseContext(pack);
    assert.match(ctx, /financial\.actual\.month=7/);
    assert.match(ctx, /fields\.util_oper_importe=70707 origin=FINANCE_PROVIDED/);
    assert.equal(ctx.includes("upload_day"), false);
  });
});
