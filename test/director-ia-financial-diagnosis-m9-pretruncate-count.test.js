"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const { DIRECTOR_IA_VERACITY } = require("../lib/director-ia-capabilities");
const { planDirectorIaQuestion } = require("../lib/director-ia-planner");
const {
  assembleFinancialDiagnosisEvidence,
  formatFinancialDiagnosisContext,
  buildFinancialDiagnosisPrompt,
  FINANCIAL_DIAGNOSIS_SYSTEM_ADDENDUM,
} = require("../lib/director-ia-financial-diagnosis");

const ROOT = path.join(__dirname, "..");
const FD_SRC = fs.readFileSync(path.join(ROOT, "lib", "director-ia-financial-diagnosis.js"), "utf8");
const BASE_MAIN = "7686c093724550da184ae3329a56b96a85a1c217";
const REJECTED = "3ef8579ac76e1372ee1a087be4604543e15e0775";
const ADDENDUM_FROZEN = [
  "EVIDENCIA FINANCIERA MULTI-FUENTE (chat legado; no es IES; no es Reasoning Engine N5).",
  "Hay tres bloques separados: IGF, ARR y M9. Cada hecho cita su bloque.",
  "No fusiones cifras de bloques distintos. No sustituyas una fuente con otra.",
  "null no es 0. Ausencia no es cero. Error no es ausencia. SOURCE_RESTRICTED no es missing.",
  "Si alignment.status es mismatch, no trates los cortes como el mismo mes.",
  "Permitido: coincidencias, tensiones y comparación solo de hechos con cortes alineados.",
  "Prohibido: causalidad; «IGF causó ARR»; «el delta prueba la causa»; responsable; impacto causal.",
  "No formules hipótesis N5. No completes vacíos.",
].join(" ");
const USER_TAIL_FROZEN =
  "Resume hechos por bloque. Señala coincidencias o tensiones sin causalidad. Declara limitaciones y period mismatch si existen.";

function gitShow(revPath) {
  return execFileSync("git", ["show", revPath], { encoding: "utf8", cwd: ROOT });
}

function gitDiff(relPath) {
  return execFileSync("git", ["diff", "--name-only", "HEAD", "--", relPath], {
    encoding: "utf8",
    cwd: ROOT,
  }).trim();
}

function plant() {
  return { planta_id: 1, planta_nombre: "Planta Norte", plant_code: "PN" };
}

function igfRaw() {
  return {
    version_id: 9,
    version_number: 2,
    row: { empresa: "PN", venta_ton: 1506.3507, margen_kg: 2.5 },
    composition: {
      ok: true,
      lines: [{ line_key: "venta_ton", line_label: "Venta", value: 1506.3507, unit: "ton" }],
      omitted_null_keys: [],
    },
  };
}

function arrRaw() {
  return {
    observed_venta_ton: 302,
    projected_venta_ton: 1469.36,
    observed_desc_kg: null,
    projected_desc_kg: -4.84,
    venta_ton: 1469.36,
    desc_kg: -4.84,
  };
}

function nClients(n) {
  return Array.from({ length: n }, (_, i) => ({ cliente: `C${i + 1}` }));
}

function m9Avail(family, unit, datos, extra = {}) {
  return {
    ok: true,
    family,
    unit,
    planta_id: 1,
    planta_nombre: "Planta Norte",
    planta_clave: "PN",
    periodoA: extra.periodoA || "2026-08",
    periodoB: extra.periodoB || "2026-09",
    period_source: "default_latest_two",
    source_coercion: extra.source_coercion != null ? extra.source_coercion : "",
    datos,
    ...extra,
  };
}

function emptyBuckets(totalField, totalValue = 0) {
  return {
    dejaron: { clientes: [], [totalField]: totalValue },
    mas: { clientes: [], [totalField]: totalValue },
    disminuyeron: { clientes: [], [totalField]: totalValue },
  };
}

function assembleLive(over = {}) {
  return assembleFinancialDiagnosisEvidence({
    plant: plant(),
    year: 2026,
    month: 9,
    igfRaw: igfRaw(),
    arrRaw: arrRaw(),
    m9Venta: m9Avail(
      "delta_venta",
      "kg",
      emptyBuckets("totalDeltaKg"),
      { source_coercion: "Cliente ausente en un mes = 0 kg (COALESCE de la fuente)." }
    ),
    m9Descuento: m9Avail("delta_descuento", "$/kg", emptyBuckets("totalDeltaRatio")),
    m9Ingreso: m9Avail("delta_ingreso", "MXN", emptyBuckets("totalDeltaIngreso")),
    ...over,
  });
}

function ventaWithDejaron(n, total = 1000) {
  return assembleLive({
    m9Venta: m9Avail("delta_venta", "kg", {
      dejaron: { clientes: nClients(n), totalDeltaKg: total },
      mas: { clientes: [], totalDeltaKg: 0 },
      disminuyeron: { clientes: [], totalDeltaKg: 0 },
    }),
  });
}

function m9Section(ctx) {
  const idx = ctx.indexOf("BLOQUE M9");
  return idx >= 0 ? ctx.slice(idx) : ctx;
}

function familySection(ctx, family) {
  const m9 = m9Section(ctx);
  const start = m9.indexOf(`${family}:`);
  if (start < 0) return "";
  const rest = m9.slice(start);
  const next = rest.slice(1).search(/\n(?:delta_venta|delta_descuento|delta_ingreso|Fin de bloques)/);
  return next >= 0 ? rest.slice(0, next + 1) : rest;
}

function dejaronLine(ctx) {
  const venta = familySection(ctx, "delta_venta");
  const line = venta.split("\n").find((l) => /dejaron:/.test(l));
  return line || "";
}

describe("R-PRECOUNT formatter pretruncate count", () => {
  it("R-PRECOUNT-001 base ambiguity reproduced", () => {
    const base = gitShow(`${BASE_MAIN}:lib/director-ia-financial-diagnosis.js`);
    assert.match(base, /dejaron\/mas\/disminuyeron presentes/);
  });

  it("R-PRECOUNT-002 rejected post-truncate count defect reproduced/reference-proved", () => {
    const rejected = gitShow(`${REJECTED}:lib/director-ia-financial-diagnosis.js`);
    assert.match(rejected, /const count = hasClientes \? bucket\.clientes\.length/);
    assert.doesNotMatch(rejected, /payload_client_count/);
  });

  it("R-PRECOUNT-003 17 payload clients -> payload_count=17", () => {
    const assembled = ventaWithDejaron(17);
    const post = assembled.sources.m9.payload.venta.payload.datos.dejaron;
    assert.equal(post.payload_client_count, 17);
    assert.match(dejaronLine(formatFinancialDiagnosisContext(assembled)), /payload_client_count=17/);
  });

  it("R-PRECOUNT-004 17 payload clients -> sample_count=3", () => {
    const assembled = ventaWithDejaron(17);
    const post = assembled.sources.m9.payload.venta.payload.datos.dejaron;
    assert.equal(post.sample_client_count, 3);
    assert.equal(post.clientes.length, 3);
    assert.match(dejaronLine(formatFinancialDiagnosisContext(assembled)), /sample_client_count=3/);
  });

  it("R-PRECOUNT-005 17 payload clients -> truncated=YES", () => {
    const assembled = ventaWithDejaron(17);
    assert.equal(assembled.sources.m9.payload.venta.payload.datos.dejaron.clientes_truncated, true);
    assert.match(dejaronLine(formatFinancialDiagnosisContext(assembled)), /truncated=YES/);
  });

  it("R-PRECOUNT-006 17 payload clients -> state=NONEMPTY", () => {
    assert.match(dejaronLine(formatFinancialDiagnosisContext(ventaWithDejaron(17))), /state=NONEMPTY/);
  });

  it("R-PRECOUNT-007 output never represents 3 as full payload count", () => {
    const line = dejaronLine(formatFinancialDiagnosisContext(ventaWithDejaron(17)));
    assert.match(line, /payload_client_count=17/);
    assert.doesNotMatch(line, /payload_client_count=3/);
    assert.doesNotMatch(line, /(?:^|[^-])clientes=3(?:\D|$)/);
  });

  it("R-PRECOUNT-008 output never calls 17 universe total", () => {
    const ctx = formatFinancialDiagnosisContext(ventaWithDejaron(17));
    assert.doesNotMatch(ctx, /total_clientes=17|universo|UNIVERSE_CLIENT_COUNT|total de clientes=17/i);
  });

  it("R-PRECOUNT-009 4 payload clients -> payload_count=4", () => {
    const assembled = ventaWithDejaron(4);
    assert.equal(assembled.sources.m9.payload.venta.payload.datos.dejaron.payload_client_count, 4);
    assert.match(dejaronLine(formatFinancialDiagnosisContext(assembled)), /payload_client_count=4/);
  });

  it("R-PRECOUNT-010 4 payload clients -> sample_count=3", () => {
    const assembled = ventaWithDejaron(4);
    const post = assembled.sources.m9.payload.venta.payload.datos.dejaron;
    assert.equal(post.sample_client_count, 3);
    assert.equal(post.clientes_truncated, true);
    assert.match(dejaronLine(formatFinancialDiagnosisContext(assembled)), /sample_client_count=3/);
    assert.match(dejaronLine(formatFinancialDiagnosisContext(assembled)), /truncated=YES/);
  });

  it("R-PRECOUNT-011 3 payload clients -> payload_count=3", () => {
    const assembled = ventaWithDejaron(3);
    assert.equal(assembled.sources.m9.payload.venta.payload.datos.dejaron.payload_client_count, 3);
    assert.match(dejaronLine(formatFinancialDiagnosisContext(assembled)), /payload_client_count=3/);
  });

  it("R-PRECOUNT-012 3 payload clients -> sample_count=3", () => {
    const assembled = ventaWithDejaron(3);
    assert.equal(assembled.sources.m9.payload.venta.payload.datos.dejaron.sample_client_count, 3);
    assert.match(dejaronLine(formatFinancialDiagnosisContext(assembled)), /sample_client_count=3/);
  });

  it("R-PRECOUNT-013 3 payload clients -> truncated=NO", () => {
    const assembled = ventaWithDejaron(3);
    assert.equal(assembled.sources.m9.payload.venta.payload.datos.dejaron.clientes_truncated, false);
    assert.match(dejaronLine(formatFinancialDiagnosisContext(assembled)), /truncated=NO/);
  });

  it("R-PRECOUNT-014 2 payload clients -> 2/2", () => {
    const line = dejaronLine(formatFinancialDiagnosisContext(ventaWithDejaron(2)));
    assert.match(line, /payload_client_count=2/);
    assert.match(line, /sample_client_count=2/);
    assert.match(line, /truncated=NO/);
    assert.match(line, /state=NONEMPTY/);
  });

  it("R-PRECOUNT-015 1 payload client -> 1/1", () => {
    const line = dejaronLine(formatFinancialDiagnosisContext(ventaWithDejaron(1)));
    assert.match(line, /payload_client_count=1/);
    assert.match(line, /sample_client_count=1/);
    assert.match(line, /truncated=NO/);
  });

  it("R-PRECOUNT-016 0 payload clients -> 0/0 EMPTY", () => {
    const ctx = formatFinancialDiagnosisContext(assembleLive());
    const line = dejaronLine(ctx);
    assert.match(line, /payload_client_count=0/);
    assert.match(line, /sample_client_count=0/);
    assert.match(line, /state=EMPTY/);
    assert.match(line, /truncated=NO/);
  });

  it("R-PRECOUNT-017 missing bucket -> exists=NO", () => {
    const assembled = assembleLive({
      m9Venta: m9Avail("delta_venta", "kg", {
        mas: { clientes: [], totalDeltaKg: 0 },
        disminuyeron: { clientes: [], totalDeltaKg: 0 },
      }),
    });
    assert.match(dejaronLine(formatFinancialDiagnosisContext(assembled)), /exists=NO/);
  });

  it("R-PRECOUNT-018 missing bucket -> payload count unavailable", () => {
    const assembled = assembleLive({
      m9Venta: m9Avail("delta_venta", "kg", {
        mas: { clientes: [], totalDeltaKg: 0 },
        disminuyeron: { clientes: [], totalDeltaKg: 0 },
      }),
    });
    const line = dejaronLine(formatFinancialDiagnosisContext(assembled));
    assert.match(line, /payload_client_count=UNAVAILABLE/);
    assert.doesNotMatch(line, /payload_client_count=0/);
  });

  it("R-PRECOUNT-019 bucket exists distinct from bucket nonempty", () => {
    const empty = dejaronLine(formatFinancialDiagnosisContext(assembleLive()));
    const nonempty = dejaronLine(formatFinancialDiagnosisContext(ventaWithDejaron(1)));
    assert.match(empty, /exists=YES, state=EMPTY/);
    assert.match(nonempty, /exists=YES, state=NONEMPTY/);
  });

  it("R-PRECOUNT-020 EMPTY does not claim global sin cambios", () => {
    assert.doesNotMatch(m9Section(formatFinancialDiagnosisContext(assembleLive())), /sin cambios/i);
  });

  it("R-PRECOUNT-021 no literal ambiguous presentes", () => {
    assert.doesNotMatch(m9Section(formatFinancialDiagnosisContext(assembleLive())), /presentes/);
  });

  it("R-PRECOUNT-022 no literal presentan cambios", () => {
    assert.doesNotMatch(m9Section(formatFinancialDiagnosisContext(assembleLive())), /presentan cambios/);
  });

  it("R-PRECOUNT-023 no literal ausencia de clientes from formatter", () => {
    assert.doesNotMatch(m9Section(formatFinancialDiagnosisContext(assembleLive())), /ausencia de clientes/);
  });

  it("R-PRECOUNT-024 source_coercion labeled CONVENCION_ESTRUCTURAL", () => {
    assert.match(
      formatFinancialDiagnosisContext(assembleLive()),
      /CONVENCION_ESTRUCTURAL: Cliente ausente en un mes = 0 kg \(COALESCE de la fuente\)\./
    );
  });

  it("R-PRECOUNT-025 coercion explicitly not DATA_NOT_FOUND", () => {
    assert.match(formatFinancialDiagnosisContext(assembleLive()), /NO significa DATA_NOT_FOUND/);
  });

  it("R-PRECOUNT-026 coercion explicitly not period-without-clients", () => {
    const ctx = formatFinancialDiagnosisContext(assembleLive());
    assert.match(ctx, /NO significa que el periodo completo no tenga clientes/);
    assert.match(ctx, /NO significa ausencia de evidencia/);
  });

  it("R-PRECOUNT-027 venta correct numeric total field", () => {
    const venta = familySection(formatFinancialDiagnosisContext(assembleLive()), "delta_venta");
    assert.match(venta, /totalDeltaKg=/);
    assert.doesNotMatch(venta, /totalDeltaRatio=|totalDeltaIngreso=/);
  });

  it("R-PRECOUNT-028 descuento correct numeric total field", () => {
    const desc = familySection(formatFinancialDiagnosisContext(assembleLive()), "delta_descuento");
    assert.match(desc, /totalDeltaRatio=/);
    assert.doesNotMatch(desc, /totalDeltaKg=|totalDeltaIngreso=/);
  });

  it("R-PRECOUNT-029 ingreso correct numeric total field", () => {
    const ing = familySection(formatFinancialDiagnosisContext(assembleLive()), "delta_ingreso");
    assert.match(ing, /totalDeltaIngreso=/);
    assert.doesNotMatch(ing, /totalDeltaKg=|totalDeltaRatio=/);
  });

  it("R-PRECOUNT-030 numeric total 0 preserved", () => {
    const line = dejaronLine(formatFinancialDiagnosisContext(assembleLive()));
    assert.match(line, /totalDeltaKg=0/);
    assert.doesNotMatch(line, /totalDeltaKg=UNAVAILABLE/);
  });

  it("R-PRECOUNT-031 numeric total null not zero", () => {
    const assembled = assembleLive({
      m9Venta: m9Avail("delta_venta", "kg", {
        dejaron: { clientes: [], totalDeltaKg: null },
        mas: { clientes: [], totalDeltaKg: 0 },
        disminuyeron: { clientes: [], totalDeltaKg: 0 },
      }),
    });
    const line = dejaronLine(formatFinancialDiagnosisContext(assembled));
    assert.match(line, /totalDeltaKg=UNAVAILABLE/);
    assert.doesNotMatch(line, /totalDeltaKg=0/);
  });

  it("R-PRECOUNT-032 SOURCE_PARTIAL preserved", () => {
    const assembled = assembleLive({
      m9Ingreso: {
        ok: true,
        family: "delta_ingreso",
        unit: "MXN",
        periodoA: "2026-08",
        periodoB: "2026-09",
        exact_ingreso: false,
        missing_inputs: ["margenA"],
        datos: { exact_ingreso: false, missing_inputs: ["margenA"], ...emptyBuckets("totalDeltaIngreso") },
      },
    });
    assert.equal(assembled.sources.m9.payload.ingreso.status, DIRECTOR_IA_VERACITY.SOURCE_PARTIAL);
    const ing = familySection(formatFinancialDiagnosisContext(assembled), "delta_ingreso");
    assert.match(ing, /NO DISPONIBLE exacto \(faltan: margenA\)/);
    assert.doesNotMatch(ing, /state=EMPTY/);
  });

  it("R-PRECOUNT-033 partial missing_inputs preserved", () => {
    const assembled = assembleLive({
      m9Ingreso: {
        ok: true,
        family: "delta_ingreso",
        unit: "MXN",
        periodoA: "2026-08",
        periodoB: "2026-09",
        exact_ingreso: false,
        missing_inputs: ["margenA", "margenB"],
        datos: { exact_ingreso: false, missing_inputs: ["margenA", "margenB"] },
      },
    });
    assert.match(familySection(formatFinancialDiagnosisContext(assembled), "delta_ingreso"), /faltan: margenA, margenB/);
  });

  it("R-PRECOUNT-034 DATA_NOT_FOUND preserved", () => {
    const assembled = assembleLive({
      m9Venta: { ok: false, code: DIRECTOR_IA_VERACITY.DATA_NOT_FOUND, error: "sin periodos" },
      m9Descuento: { ok: false, code: DIRECTOR_IA_VERACITY.DATA_NOT_FOUND, error: "sin periodos" },
      m9Ingreso: { ok: false, code: DIRECTOR_IA_VERACITY.DATA_NOT_FOUND, error: "sin periodos" },
    });
    assert.equal(assembled.sources.m9.status, DIRECTOR_IA_VERACITY.DATA_NOT_FOUND);
    assert.match(familySection(formatFinancialDiagnosisContext(assembled), "delta_venta"), /NO DISPONIBLE\. null no es 0/);
  });

  it("R-PRECOUNT-035 SOURCE_ERROR preserved", () => {
    const assembled = assembleLive({
      m9Venta: { ok: false, code: DIRECTOR_IA_VERACITY.SOURCE_ERROR, error: "db down" },
    });
    assert.match(familySection(formatFinancialDiagnosisContext(assembled), "delta_venta"), /status=SOURCE_ERROR/);
    assert.match(familySection(formatFinancialDiagnosisContext(assembled), "delta_venta"), /NO DISPONIBLE/);
  });

  it("R-PRECOUNT-036 SOURCE_RESTRICTED preserved", () => {
    const assembled = assembleLive({
      m9Venta: { ok: false, code: DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED, error: "GA" },
      m9Descuento: { ok: false, code: DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED, error: "GA" },
      m9Ingreso: { ok: false, code: DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED, error: "GA" },
    });
    assert.equal(assembled.sources.m9.status, DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED);
    assert.match(familySection(formatFinancialDiagnosisContext(assembled), "delta_venta"), /SOURCE_RESTRICTED/);
  });

  it("R-PRECOUNT-037 no invented clients", () => {
    const assembled = assembleLive({
      m9Venta: m9Avail("delta_venta", "kg", {
        mas: { clientes: [], totalDeltaKg: 0 },
        disminuyeron: { clientes: [], totalDeltaKg: 0 },
      }),
    });
    const line = dejaronLine(formatFinancialDiagnosisContext(assembled));
    assert.match(line, /exists=NO/);
    assert.doesNotMatch(line, /payload_client_count=0/);
  });

  it("R-PRECOUNT-038 no invented totals", () => {
    const assembled = assembleLive({
      m9Descuento: m9Avail("delta_descuento", "$/kg", {
        dejaron: { clientes: [] },
        mas: { clientes: [] },
        disminuyeron: { clientes: [] },
      }),
    });
    const desc = familySection(formatFinancialDiagnosisContext(assembled), "delta_descuento");
    assert.match(desc, /dejaron:[^\n]*totalDeltaRatio=UNAVAILABLE/);
    assert.doesNotMatch(desc, /dejaron:[^\n]*totalDeltaRatio=0/);
  });

  it("R-PRECOUNT-039 no causal wording", () => {
    const m9 = m9Section(formatFinancialDiagnosisContext(assembleLive()));
    assert.doesNotMatch(m9, /causó|provocó|explica|afectó el ingreso|responsable de/i);
  });

  it("R-PRECOUNT-040 alignment comparable unchanged", () => {
    const assembled = assembleLive();
    assert.equal(assembled.alignment.status, "comparable");
    assert.match(formatFinancialDiagnosisContext(assembled), /alignment\.status=comparable/);
  });

  it("R-PRECOUNT-041 alignment mismatch unchanged", () => {
    const assembled = assembleLive({
      m9Venta: m9Avail("delta_venta", "kg", emptyBuckets("totalDeltaKg"), {
        periodoA: "2026-06",
        periodoB: "2026-07",
      }),
      m9Descuento: m9Avail("delta_descuento", "$/kg", emptyBuckets("totalDeltaRatio"), {
        periodoA: "2026-06",
        periodoB: "2026-07",
      }),
      m9Ingreso: m9Avail("delta_ingreso", "MXN", emptyBuckets("totalDeltaIngreso"), {
        periodoA: "2026-06",
        periodoB: "2026-07",
      }),
    });
    assert.equal(assembled.alignment.status, "mismatch");
  });

  it("R-PRECOUNT-042 ARR Root1 regression PASS", () => {
    const ctx = formatFinancialDiagnosisContext(assembleLive());
    assert.match(ctx, /observed_venta_ton=302/);
    assert.match(ctx, /projected_venta_ton=1469\.36/);
    assert.match(ctx, /ARR observed != projected != IGF commitment/);
  });

  it("R-PRECOUNT-043 M9 Root2 missing-not-zero PASS", () => {
    const assembled = assembleLive({
      m9Venta: { ok: false, code: DIRECTOR_IA_VERACITY.DATA_NOT_FOUND, error: "sin periodos" },
    });
    const venta = familySection(formatFinancialDiagnosisContext(assembled), "delta_venta");
    assert.match(venta, /NO DISPONIBLE\. null no es 0/);
    assert.doesNotMatch(venta, /totalDeltaKg=0/);
  });

  it("R-PRECOUNT-044 known structural zero PASS", () => {
    assert.equal(gitDiff("lib/director-ia-m9-deltas.js"), "");
  });

  it("R-PRECOUNT-045 planner unchanged", () => {
    assert.equal(gitDiff("lib/director-ia-planner.js"), "");
    assert.equal(planDirectorIaQuestion("¿Por qué cayó el ingreso?").intent, "financial_diagnosis");
  });

  it("R-PRECOUNT-046 routing unchanged", () => {
    assert.equal(gitDiff("lib/director-ia-chat.js"), "");
  });

  it("R-PRECOUNT-047 server unchanged", () => {
    assert.equal(gitDiff("server.js"), "");
  });

  it("R-PRECOUNT-048 SQL/schema/dependencies unchanged", () => {
    assert.equal(gitDiff("package.json"), "");
    assert.equal(gitDiff("package-lock.json"), "");
    assert.doesNotMatch(FD_SRC, /ALTER TABLE|CREATE TABLE|DROP TABLE|information_schema/i);
  });

  it("R-PRECOUNT-049 no post-generation validator", () => {
    assert.doesNotMatch(FD_SRC, /post[-_]?generation|validateAnswer|sanitizeAnswer/i);
    assert.equal(gitDiff("lib/director-ia-chat.js"), "");
  });

  it("R-PRECOUNT-050 no prompt redesign", () => {
    assert.equal(FINANCIAL_DIAGNOSIS_SYSTEM_ADDENDUM, ADDENDUM_FROZEN);
    const prompt = buildFinancialDiagnosisPrompt(assembleLive(), "¿Por qué cayó el ingreso?");
    assert.match(prompt.userContent, new RegExp(USER_TAIL_FROZEN.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  });

  it("R-PRECOUNT-051 existing financial diagnosis tests remain present", () => {
    assert.equal(fs.existsSync(path.join(ROOT, "test", "director-ia-financial-diagnosis.test.js")), true);
  });

  it("R-PRECOUNT-052 existing M9 tests remain present", () => {
    assert.equal(fs.existsSync(path.join(ROOT, "test", "director-ia-m9-deltas.test.js")), true);
    assert.equal(fs.existsSync(path.join(ROOT, "test", "director-ia-m9-absent-not-zero.test.js")), true);
  });

  it("R-PRECOUNT-053 existing ARR tests remain present", () => {
    assert.equal(fs.existsSync(path.join(ROOT, "test", "director-ia-arr-projection-cutoff-label.test.js")), true);
  });

  it("R-PRECOUNT-054 focal >3 cannot pass if count occurs post-truncate", () => {
    const assembled = ventaWithDejaron(17);
    const post = assembled.sources.m9.payload.venta.payload.datos.dejaron;
    assert.equal(post.clientes.length, 3);
    assert.equal(post.payload_client_count, 17);
    const line = dejaronLine(formatFinancialDiagnosisContext(assembled));
    assert.match(line, /payload_client_count=17/);
    assert.notEqual(Number(line.match(/payload_client_count=(\d+)/)[1]), post.clientes.length);
    const fn = FD_SRC.slice(FD_SRC.indexOf("function formatM9Bucket"), FD_SRC.indexOf("function formatM9StructuralConvention"));
    assert.doesNotMatch(fn, /bucket\.clientes\.length/);
    assert.match(fn, /payload_client_count/);
  });

  it("R-PRECOUNT-055 NEW FAILURE contract ids present", () => {
    const src = fs.readFileSync(__filename, "utf8");
    for (let i = 1; i <= 55; i += 1) {
      assert.match(src, new RegExp(`R-PRECOUNT-${String(i).padStart(3, "0")}`));
    }
  });
});
