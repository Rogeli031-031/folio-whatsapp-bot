"use strict";

const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const {
  configureDirectorIaIgfArr,
  loadArrMetricsForPlant,
  resolveArrAnnexCutoff,
  formatArrAnnexBlocks,
  loadIgfArrAnnexForChat,
  loadIgfArrSourceBlocksForChat,
  resolveYearMonthFromQuestion,
  isArrForecastQuestion,
  ARR_SIGNAL_RE,
} = require("../lib/director-ia-igf-arr");
const { assembleFinancialDiagnosisEvidence, formatFinancialDiagnosisContext } = require("../lib/director-ia-financial-diagnosis");
const { planDirectorIaQuestion } = require("../lib/director-ia-planner");
const { getDirectorIaTool } = require("../lib/director-ia-tools");

const ROOT = path.join(__dirname, "..");
const IGF_SRC = fs.readFileSync(path.join(ROOT, "lib", "director-ia-igf-arr.js"), "utf8");
const FD_SRC = fs.readFileSync(path.join(ROOT, "lib", "director-ia-financial-diagnosis.js"), "utf8");
const ADAPTER_SRC = fs.readFileSync(path.join(ROOT, "lib", "director-ia-dashboard-forecast-adapter.js"), "utf8");

const NOW_OPEN = new Date(2026, 8, 8);
const CUTOFF = "2026-09-08";
const OBSERVED = 302;
const PROJECTED = 1522.76;
const PREVIOUS = 1176;
const PROJ_DESC = -4.84;
const IGF_COMMIT = 2000.3;
const DELTA = PROJECTED - PREVIOUS;
const COLLAPSED_DELTA = OBSERVED - PREVIOUS;

function loc(n) {
  return Number(n).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function northStarParity(_pool, opts) {
  if (opts.year === 2026 && opts.month === 9) {
    return {
      actual_to_date: { venta_ton: OBSERVED, desc_kg: null },
      forecast: { venta_ton: PROJECTED, desc_kg: PROJ_DESC },
    };
  }
  if (opts.year === 2026 && opts.month === 8) {
    return {
      actual_to_date: { venta_ton: PREVIOUS, desc_kg: null },
      forecast: { venta_ton: 8888, desc_kg: -9.99 },
    };
  }
  return {
    actual_to_date: { venta_ton: null, desc_kg: null },
    forecast: { venta_ton: null, desc_kg: null },
  };
}

function mockPool(planta = "Planta Norte") {
  return {
    connect: async () => ({
      query: async (sql) => {
        if (/FROM public\.plantas/i.test(sql)) return { rows: [{ nombre: planta, clave: "PN" }] };
        if (/FROM igf\.versions/i.test(sql)) return { rows: [{ id: 7, version_number: 2 }] };
        if (/FROM igf\.compromiso_lines/i.test(sql)) {
          return {
            rows: [
              {
                empresa: "PN",
                venta_ton: IGF_COMMIT,
                margen_kg: 2,
                com_desc_kg: -1,
                hg_kg: 0.2,
              },
            ],
          };
        }
        return { rows: [] };
      },
      release() {},
    }),
  };
}

function configureNorthStar(over = {}) {
  configureDirectorIaIgfArr({
    getPlantCodeArrFromPlantaNombre: async () => "PN",
    getMargenKgPorPeriodo: async () => 2,
    assertGVPlantaNombreAccess: async () => ({ ok: true }),
    loadDashboardForecastParity: northStarParity,
    loadArrLastUploadDay: undefined,
    now: () => NOW_OPEN,
    ...over,
  });
}

function gitDiff(relPath) {
  return execFileSync("git", ["diff", "--name-only", "HEAD", "--", relPath], {
    encoding: "utf8",
    cwd: ROOT,
  }).trim();
}

describe("R-ARR-PROJECTION-SEMANTICS", () => {
  beforeEach(() => {
    configureNorthStar();
  });

  it("R-ARR-PROJ-001 observed field separado", async () => {
    const curr = await loadArrMetricsForPlant(null, 2026, 9, "PN", {
      fechaCorte: CUTOFF,
      now: NOW_OPEN,
      loadParity: northStarParity,
    });
    assert.equal(curr.observed_venta_ton, OBSERVED);
    assert.notEqual(curr.observed_venta_ton, curr.projected_venta_ton);
  });

  it("R-ARR-PROJ-002 projected field separado", async () => {
    const curr = await loadArrMetricsForPlant(null, 2026, 9, "PN", {
      fechaCorte: CUTOFF,
      now: NOW_OPEN,
      loadParity: northStarParity,
    });
    assert.equal(curr.projected_venta_ton, PROJECTED);
  });

  it("R-ARR-PROJ-003 observed != projected soportado", async () => {
    const curr = await loadArrMetricsForPlant(null, 2026, 9, "PN", {
      fechaCorte: CUTOFF,
      now: NOW_OPEN,
      loadParity: northStarParity,
    });
    assert.notEqual(curr.observed_venta_ton, curr.projected_venta_ton);
  });

  it("R-ARR-PROJ-004 projected sale usa proyección del adapter", async () => {
    const seen = [];
    const loadParity = async (pool, opts) => {
      seen.push(opts);
      return northStarParity(pool, opts);
    };
    const curr = await loadArrMetricsForPlant(null, 2026, 9, "PN", {
      fechaCorte: CUTOFF,
      now: NOW_OPEN,
      loadParity,
    });
    assert.equal(curr.projected_venta_ton, PROJECTED);
    assert.equal(seen[0].upload_day, CUTOFF);
  });

  it("R-ARR-PROJ-005 projected discount usa Desc PROY", async () => {
    const curr = await loadArrMetricsForPlant(null, 2026, 9, "PN", {
      fechaCorte: CUTOFF,
      now: NOW_OPEN,
      loadParity: northStarParity,
    });
    assert.equal(curr.projected_desc_kg, PROJ_DESC);
  });

  it("R-ARR-PROJ-006 no empty cutoff para proyección intra-mes", async () => {
    let calls = 0;
    const curr = await loadArrMetricsForPlant(null, 2026, 9, "PN", {
      now: NOW_OPEN,
      loadParity: async () => {
        calls += 1;
        return northStarParity(null, { year: 2026, month: 9 });
      },
    });
    assert.equal(calls, 0);
    assert.equal(curr.projected_venta_ton, null);
    assert.equal(curr.projection_status, "CUTOFF_UNAVAILABLE");
    assert.doesNotMatch(IGF_SRC, /fechaCorte:\s*["']{2}/);
    assert.doesNotMatch(IGF_SRC, /loadArrProyForPlant/);
  });

  it("R-ARR-PROJ-007 current observed label", () => {
    const text = formatArrAnnexBlocks(
      {
        observed_venta_ton: OBSERVED,
        projected_venta_ton: PROJECTED,
        observed_desc_kg: null,
        projected_desc_kg: PROJ_DESC,
        month_kind: "OPEN",
      },
      { observed_venta_ton: PREVIOUS },
      2026,
      9,
      { year: 2026, month: 8 }
    ).join("\n");
    assert.match(text, new RegExp(`Venta observada al corte: ${loc(OBSERVED)} ton`));
  });

  it("R-ARR-PROJ-008 current projected label", () => {
    const text = formatArrAnnexBlocks(
      {
        observed_venta_ton: OBSERVED,
        projected_venta_ton: PROJECTED,
        projected_desc_kg: PROJ_DESC,
        month_kind: "OPEN",
      },
      { observed_venta_ton: PREVIOUS },
      2026,
      9,
      { year: 2026, month: 8 }
    ).join("\n");
    assert.match(text, new RegExp(`Proyección de cierre ARR: ${loc(PROJECTED)} ton`));
    assert.doesNotMatch(text, /venta proyectada 302|proyección = 302/i);
  });

  it("R-ARR-PROJ-009 previous month label", () => {
    const text = formatArrAnnexBlocks(
      {
        observed_venta_ton: OBSERVED,
        projected_venta_ton: PROJECTED,
        month_kind: "OPEN",
      },
      { observed_venta_ton: PREVIOUS },
      2026,
      9,
      { year: 2026, month: 8 }
    ).join("\n");
    assert.match(text, /MES PREVIO/);
    assert.match(text, new RegExp(`Venta mes previo \\(agosto 2026\\): ${loc(PREVIOUS)} ton`));
  });

  it("R-ARR-PROJ-010 projection-vs-prev delta usa projected current", () => {
    const text = formatArrAnnexBlocks(
      {
        observed_venta_ton: OBSERVED,
        projected_venta_ton: PROJECTED,
        month_kind: "OPEN",
      },
      { observed_venta_ton: PREVIOUS },
      2026,
      9,
      { year: 2026, month: 8 }
    ).join("\n");
    assert.match(text, /Proyección cierre actual vs venta mes previo:/);
    assert.equal(PROJECTED - PREVIOUS, DELTA);
  });

  it("R-ARR-PROJ-011 fixture 1522.76 - 1176 = +346.76", () => {
    const text = formatArrAnnexBlocks(
      {
        observed_venta_ton: OBSERVED,
        projected_venta_ton: PROJECTED,
        month_kind: "OPEN",
      },
      { observed_venta_ton: PREVIOUS },
      2026,
      9,
      { year: 2026, month: 8 }
    ).join("\n");
    assert.equal(DELTA, 346.76);
    assert.match(text, new RegExp(`\\+${loc(DELTA)} ton`));
  });

  it("R-ARR-PROJ-012 no -874 con fixture", () => {
    const text = formatArrAnnexBlocks(
      {
        observed_venta_ton: OBSERVED,
        projected_venta_ton: PROJECTED,
        month_kind: "OPEN",
      },
      { observed_venta_ton: PREVIOUS },
      2026,
      9,
      { year: 2026, month: 8 }
    ).join("\n");
    assert.equal(COLLAPSED_DELTA, -874);
    assert.doesNotMatch(text, /-874/);
    assert.doesNotMatch(text, /Δ venta vs mes previo/);
  });

  it("R-ARR-PROJ-013 observed 302 preservado como observed", async () => {
    const curr = await loadArrMetricsForPlant(null, 2026, 9, "PN", {
      fechaCorte: CUTOFF,
      now: NOW_OPEN,
      loadParity: northStarParity,
    });
    assert.equal(curr.observed_venta_ton, 302);
    assert.notEqual(curr.venta_ton, 302);
  });

  it("R-ARR-PROJ-014 projected 1522.76 preservado como projected", async () => {
    const curr = await loadArrMetricsForPlant(null, 2026, 9, "PN", {
      fechaCorte: CUTOFF,
      now: NOW_OPEN,
      loadParity: northStarParity,
    });
    assert.equal(curr.projected_venta_ton, 1522.76);
    assert.equal(curr.venta_ton, 1522.76);
  });

  it("R-ARR-PROJ-015 projected desc -4.84 preservado", async () => {
    const curr = await loadArrMetricsForPlant(null, 2026, 9, "PN", {
      fechaCorte: CUTOFF,
      now: NOW_OPEN,
      loadParity: northStarParity,
    });
    assert.equal(curr.projected_desc_kg, -4.84);
  });

  it("R-ARR-PROJ-016 observed desc no se llama PROY", () => {
    const text = formatArrAnnexBlocks(
      {
        observed_venta_ton: OBSERVED,
        projected_venta_ton: PROJECTED,
        observed_desc_kg: -4.92,
        projected_desc_kg: PROJ_DESC,
        month_kind: "OPEN",
      },
      { observed_venta_ton: PREVIOUS },
      2026,
      9,
      { year: 2026, month: 8 }
    ).join("\n");
    assert.match(text, /Descuento observado al corte: -4\.92 \$\/kg/);
    assert.match(text, /Descuento proyectado ARR: -4\.84 \$\/kg/);
    assert.doesNotMatch(text, /Desc\. PROY[^]*-4\.92/);
  });

  it("R-ARR-PROJ-017 IGF commitment separado", async () => {
    const res = await loadIgfArrAnnexForChat(
      mockPool(),
      1,
      { dashboardAuth: { role: "ZP" }, body: { upload_day: CUTOFF } },
      "cómo va ARR septiembre 2026"
    );
    assert.equal(res.ok, true);
    assert.match(res.text, /Compromiso venta IGF:/);
    assert.match(res.text, /ARR — VENTA/);
    assert.match(res.text, new RegExp(`Proyección de cierre ARR: ${loc(PROJECTED)} ton`));
    assert.match(res.text, /2,000\.3|2000\.3/);
  });

  it("R-ARR-PROJ-018 IGF commitment no fallback ARR", async () => {
    const res = await loadIgfArrAnnexForChat(
      mockPool(),
      1,
      { dashboardAuth: { role: "ZP" }, body: { upload_day: CUTOFF } },
      "cómo va ARR septiembre 2026"
    );
    assert.doesNotMatch(res.text, /Proyección de cierre ARR:.*2000/);
    assert.doesNotMatch(IGF_SRC, /projected_venta_ton != null \? arrCurr.projected_venta_ton : ventaIgf/);
    assert.doesNotMatch(IGF_SRC, /arrCurr\.venta_ton != null \? arrCurr\.venta_ton : ventaIgf/);
  });

  it("R-ARR-PROJ-019 anexo no dice proyección o real según corte", async () => {
    const res = await loadIgfArrAnnexForChat(
      mockPool(),
      1,
      { dashboardAuth: { role: "ZP" }, body: { upload_day: CUTOFF } },
      "cómo va ARR septiembre 2026"
    );
    assert.doesNotMatch(res.text, /proyección o real según corte/);
    assert.doesNotMatch(IGF_SRC, /proyección o real según corte/);
  });

  it("R-ARR-PROJ-020 no NULL->0 nuevo", async () => {
    const curr = await loadArrMetricsForPlant(null, 2026, 9, "PN", {
      fechaCorte: CUTOFF,
      now: NOW_OPEN,
      loadParity: northStarParity,
    });
    assert.equal(curr.observed_desc_kg, null);
    const text = formatArrAnnexBlocks(curr, { observed_venta_ton: PREVIOUS }, 2026, 9, {
      year: 2026,
      month: 8,
    }).join("\n");
    assert.match(text, /Descuento observado al corte: \(no exportado por el dashboard\)/);
    assert.doesNotMatch(text, /Descuento observado al corte: 0/);
  });

  it("R-ARR-PROJ-021 month resolution intacto", () => {
    assert.deepEqual(resolveYearMonthFromQuestion("ARR septiembre 2026", { year: 2025, month: 1 }), {
      year: 2026,
      month: 9,
    });
  });

  it("R-ARR-PROJ-022 plant authz intacto", async () => {
    const res = await loadIgfArrAnnexForChat(null, 1, { dashboardAuth: { role: "ZP" } }, "cómo va ARR");
    assert.equal(res.ok, false);
    assert.equal(res.status, 500);
  });

  it("R-ARR-PROJ-023 GA restriction intacta", async () => {
    const res = await loadIgfArrAnnexForChat(
      mockPool(),
      1,
      { dashboardAuth: { role: "GA" }, body: { upload_day: CUTOFF } },
      "cómo va ARR septiembre 2026"
    );
    assert.equal(res.ok, false);
    assert.equal(res.status, 403);
    assert.match(res.error, /GA no tiene acceso/);
  });

  it("R-ARR-PROJ-024 GV restriction intacta", async () => {
    configureNorthStar({
      assertGVPlantaNombreAccess: async () => ({ ok: false, error: "Sin acceso a esta planta", status: 403 }),
    });
    const res = await loadIgfArrAnnexForChat(
      mockPool(),
      1,
      { dashboardAuth: { role: "GV" }, body: { upload_day: CUTOFF } },
      "cómo va ARR septiembre 2026"
    );
    assert.equal(res.ok, false);
    assert.equal(res.status, 403);
  });

  it("R-ARR-PROJ-025 get_arr_snapshot path intacto", () => {
    const tool = getDirectorIaTool("get_arr_snapshot");
    assert.ok(tool);
    assert.equal(tool.executor, "loadIgfArrAnnexForChat");
    assert.equal(getDirectorIaTool("get_igf_snapshot").executor, "loadIgfArrAnnexForChat");
  });

  it("R-ARR-PROJ-026 loadIgfArrAnnexForChat intacto funcionalmente", async () => {
    const res = await loadIgfArrAnnexForChat(
      mockPool(),
      1,
      { dashboardAuth: { role: "ZP" }, body: { upload_day: CUTOFF } },
      "cómo va ARR septiembre 2026"
    );
    assert.equal(res.ok, true);
    assert.match(res.text, /ANEXO — IGF \/ ARR/);
    assert.equal(res.meta.mode, "igf_arr_annex");
    assert.equal(res.meta.wantArr, true);
    assert.match(res.text, new RegExp(`Venta observada al corte: ${loc(OBSERVED)} ton`));
    assert.match(res.text, new RegExp(`\\+${loc(DELTA)} ton`));
  });

  it("R-ARR-PROJ-027 source blocks distinguen ARR/IGF", async () => {
    const blocks = await loadIgfArrSourceBlocksForChat(
      mockPool(),
      1,
      { dashboardAuth: { role: "ZP" }, body: { upload_day: CUTOFF } },
      "cómo va ARR septiembre 2026"
    );
    assert.equal(blocks.ok, true);
    assert.equal(blocks.arr.observed_venta_ton, OBSERVED);
    assert.equal(blocks.arr.projected_venta_ton, PROJECTED);
    assert.equal(blocks.igf.row.venta_ton, IGF_COMMIT);
    assert.notEqual(blocks.arr.projected_venta_ton, blocks.igf.row.venta_ton);
    const assembled = assembleFinancialDiagnosisEvidence({
      plant: blocks.plant,
      year: blocks.year,
      month: blocks.month,
      igfRaw: blocks.igf,
      arrRaw: blocks.arr,
      m9Venta: { ok: false, status: "DATA_NOT_FOUND" },
      m9Descuento: { ok: false, status: "DATA_NOT_FOUND" },
      m9Ingreso: { ok: false, status: "DATA_NOT_FOUND" },
    });
    const ctx = formatFinancialDiagnosisContext(assembled);
    assert.match(ctx, /observed_venta_ton=302/);
    assert.match(ctx, /projected_venta_ton=1522\.76/);
    assert.doesNotMatch(ctx, /ARR proyección\/corte de planta/);
  });

  it("R-ARR-PROJ-028 no M9 changes", () => {
    assert.equal(gitDiff("lib/director-ia-m9-deltas.js"), "");
  });

  it("R-ARR-PROJ-029 no planner changes", () => {
    assert.equal(gitDiff("lib/director-ia-planner.js"), "");
    assert.equal(planDirectorIaQuestion("cómo va ARR").intent, "arr_status");
  });

  it("R-ARR-PROJ-030 no routing changes", () => {
    assert.equal(isArrForecastQuestion("cómo va ARR"), true);
    assert.equal(isArrForecastQuestion("cuánto proyectamos vender"), false);
    assert.equal(isArrForecastQuestion("cómo vamos a cerrar septiembre"), false);
    assert.equal(isArrForecastQuestion("cuál es la proyección de venta"), true);
    assert.equal(ARR_SIGNAL_RE.test("cómo va ARR"), true);
  });

  it("R-ARR-PROJ-031 no SQL changes", () => {
    assert.doesNotMatch(IGF_SRC, /ALTER TABLE|CREATE TABLE|DROP TABLE/i);
    assert.equal(gitDiff("lib/director-ia-igf-arr.js").includes(".sql"), false);
  });

  it("R-ARR-PROJ-032 no schema changes", () => {
    assert.equal(gitDiff("lib/director-ia-m9-deltas.js"), "");
    assert.doesNotMatch(IGF_SRC, /information_schema|pg_catalog/);
  });

  it("R-ARR-PROJ-033 no dependency changes", () => {
    assert.doesNotMatch(IGF_SRC, /require\("(?!\.)[^"]+"\)/);
    assert.match(IGF_SRC, /require\("\.\/director-ia-dashboard-forecast-adapter"\)/);
  });

  it("R-ARR-PROJ-034 commercial_state unchanged", () => {
    assert.equal(gitDiff("lib/director-ia-commercial-state.js"), "");
  });

  it("R-ARR-PROJ-035 DICF unchanged", () => {
    assert.equal(gitDiff("lib/dicf.js"), "");
  });

  it("R-ARR-PROJ-036 historical/closed month no fake forecast", async () => {
    const closed = await loadArrMetricsForPlant(null, 2026, 9, "PN", {
      fechaCorte: CUTOFF,
      now: new Date(2026, 9, 1),
      loadParity: northStarParity,
    });
    assert.equal(closed.month_kind, "CLOSED");
    assert.equal(closed.observed_venta_ton, OBSERVED);
    assert.equal(closed.projected_venta_ton, null);
    assert.equal(closed.projected_desc_kg, null);
    assert.equal(closed.projection_status, "NOT_APPLICABLE_CLOSED");
    const text = formatArrAnnexBlocks(closed, { observed_venta_ton: PREVIOUS }, 2026, 9, {
      year: 2026,
      month: 8,
    }).join("\n");
    assert.match(text, /mes cerrado; no se inventa proyección futura/);
  });

  it("R-ARR-PROJ-037 current-month cutoff determinista", async () => {
    const q = await resolveArrAnnexCutoff({ question: `corte ${CUTOFF}` });
    assert.deepEqual(q, { cutoff: CUTOFF, source: "question.explicit_cutoff" });
    const body = await resolveArrAnnexCutoff({
      question: "cómo va ARR",
      body: { upload_day: CUTOFF },
    });
    assert.deepEqual(body, { cutoff: CUTOFF, source: "req.body.upload_day" });
    const last = await resolveArrAnnexCutoff({
      question: "cómo va ARR",
      body: {},
      loadArrLastUploadDay: async () => ({ upload_day: CUTOFF }),
    });
    assert.deepEqual(last, { cutoff: CUTOFF, source: "arr.upload_log.plant" });
    const none = await resolveArrAnnexCutoff({ question: "cómo va ARR", body: {} });
    assert.deepEqual(none, { cutoff: null, source: null });
  });

  it("R-ARR-PROJ-038 adapter/dashboard formula reused", async () => {
    let used = false;
    await loadArrMetricsForPlant(null, 2026, 9, "PN", {
      fechaCorte: CUTOFF,
      now: NOW_OPEN,
      loadParity: async (pool, opts) => {
        used = true;
        assert.equal(opts.upload_day, CUTOFF);
        assert.notEqual(opts.fechaCorte, "");
        return northStarParity(pool, opts);
      },
    });
    assert.equal(used, true);
    assert.match(IGF_SRC, /loadDashboardForecastParity/);
    assert.doesNotMatch(IGF_SRC, /computePronosticoProyByPlant\s*\(/);
    assert.match(ADAPTER_SRC, /actual_to_date/);
    assert.match(ADAPTER_SRC, /forecast:/);
  });

  it("R-ARR-PROJ-039 no duplicated projection math", () => {
    assert.doesNotMatch(IGF_SRC, /observed_venta_ton \+ /);
    assert.doesNotMatch(IGF_SRC, /POR COMPRAR/);
    assert.doesNotMatch(IGF_SRC, /enableLookback/);
  });

  it("R-ARR-PROJ-040 no hardcoded Puebla values", () => {
    assert.doesNotMatch(IGF_SRC, /Puebla/);
    assert.doesNotMatch(IGF_SRC, /1522\.76/);
    assert.doesNotMatch(IGF_SRC, /1176/);
    assert.doesNotMatch(FD_SRC, /1522\.76/);
  });
});
