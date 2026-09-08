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
const BASE_MAIN = "b99ca2f8fc1638a8763edcdd5058d5bb9168ab37";
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

function gitShow(revPath) {
  return execFileSync("git", ["show", revPath], { encoding: "utf8", cwd: ROOT });
}

function gitDiff(relPath) {
  return execFileSync("git", ["diff", "--name-only", "HEAD", "--", relPath], {
    encoding: "utf8",
    cwd: ROOT,
  }).trim();
}

function extractFn(src, startNeedle, endNeedle) {
  const start = src.indexOf(startNeedle);
  const end = src.indexOf(endNeedle, start + startNeedle.length);
  assert.ok(start >= 0, `missing ${startNeedle}`);
  assert.ok(end > start, `missing end ${endNeedle}`);
  return src.slice(start, end).replace(/\r\n/g, "\n");
}

function plant() {
  return { planta_id: 1, planta_nombre: "Planta Norte", plant_code: "PN" };
}

function igfRaw() {
  return {
    version_id: 9,
    version_number: 2,
    row: { empresa: "PN", venta_ton: 1506.3507, margen_kg: 7.1248 },
    composition: {
      ok: true,
      lines: [
        { line_key: "venta_ton", line_label: "Venta", value: 1506.3507, unit: "ton" },
        { line_key: "margen_kg", line_label: "Margen", value: 7.1248, unit: "$/kg" },
      ],
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
    source_coercion: extra.source_coercion || "Cliente ausente en un mes = 0 kg (COALESCE de la fuente).",
    datos,
    ...extra,
  };
}

function emptyDatos(totalField) {
  return {
    dejaron: { clientes: [], [totalField]: 0 },
    mas: { clientes: [], [totalField]: 0 },
    disminuyeron: { clientes: [], [totalField]: 0 },
  };
}

function assembleLive(over = {}) {
  return assembleFinancialDiagnosisEvidence({
    plant: plant(),
    year: 2026,
    month: 9,
    igfRaw: igfRaw(),
    arrRaw: arrRaw(),
    m9Venta: m9Avail("delta_venta", "kg", {
      dejaron: { clientes: [], totalDeltaKg: 0 },
      mas: { clientes: [{ cliente: "B" }], totalDeltaKg: 80000 },
      disminuyeron: { clientes: [{ cliente: "A" }], totalDeltaKg: 1059160.26 },
    }),
    m9Descuento: m9Avail("delta_descuento", "$/kg", emptyDatos("totalDeltaRatio")),
    m9Ingreso: m9Avail("delta_ingreso", "MXN", {
      dejaron: { clientes: [], totalDeltaIngreso: 0 },
      mas: { clientes: [], totalDeltaIngreso: 0 },
      disminuyeron: { clientes: [{ cliente: "A" }], totalDeltaIngreso: 5906844.3468 },
    }),
    ...over,
  });
}

function livePrompt(question = "¿Por qué cayó el ingreso?") {
  return buildFinancialDiagnosisPrompt(assembleLive(), question);
}

function familySection(ctx, family) {
  const idx = ctx.indexOf("BLOQUE M9");
  const m9 = idx >= 0 ? ctx.slice(idx) : ctx;
  const start = m9.indexOf(`${family}:`);
  if (start < 0) return "";
  const rest = m9.slice(start);
  const next = rest.slice(1).search(/\n(?:delta_venta|delta_descuento|delta_ingreso|Fin de bloques)/);
  return next >= 0 ? rest.slice(0, next + 1) : rest;
}

function bucketLine(ctx, family, name) {
  const section = familySection(ctx, family);
  return (section.split("\n").find((l) => new RegExp(`${name}:`).test(l)) || "").trim();
}

describe("R-GROSS M9 bucket semantic labels", () => {
  it("R-GROSS-001 1059160.26 se etiqueta gross decrease bucket", () => {
    const line = bucketLine(formatFinancialDiagnosisContext(assembleLive()), "delta_venta", "disminuyeron");
    assert.match(line, /totalDeltaKg=1059160\.26/);
    assert.match(line, /GROSS_DECREASE_MAGNITUDE_KG/);
  });

  it("R-GROSS-002 no se etiqueta plant net delta", () => {
    const line = bucketLine(formatFinancialDiagnosisContext(assembleLive()), "delta_venta", "disminuyeron");
    assert.match(line, /NOT_PLANT_NET_DELTA/);
    assert.doesNotMatch(line, /PLANT_NET_DELTA=YES|IS_PLANT_NET/);
  });

  it("R-GROSS-003 no se etiqueta IGF/ARR gap", () => {
    const line = bucketLine(formatFinancialDiagnosisContext(assembleLive()), "delta_venta", "disminuyeron");
    assert.match(line, /NOT_IGF_ARR_GAP/);
    assert.doesNotMatch(line, /IGF_ARR_GAP=1059160|IS_IGF_ARR_GAP/);
  });

  it("R-GROSS-004 disminuyeron magnitude positiva mantiene dirección DECREASE", () => {
    const line = bucketLine(formatFinancialDiagnosisContext(assembleLive()), "delta_venta", "disminuyeron");
    assert.match(line, /totalDeltaKg=1059160\.26/);
    assert.doesNotMatch(line, /totalDeltaKg=-1059160/);
    assert.match(line, /GROSS_DECREASE_MAGNITUDE_KG/);
  });

  it("R-GROSS-005 mas se etiqueta gross increase", () => {
    const line = bucketLine(formatFinancialDiagnosisContext(assembleLive()), "delta_venta", "mas");
    assert.match(line, /totalDeltaKg=80000/);
    assert.match(line, /GROSS_INCREASE_MAGNITUDE_KG/);
  });

  it("R-GROSS-006 mas no es net delta", () => {
    const line = bucketLine(formatFinancialDiagnosisContext(assembleLive()), "delta_venta", "mas");
    assert.match(line, /NOT_PLANT_NET_DELTA/);
  });

  it("R-GROSS-007 dejaron se etiqueta gross stopped buying", () => {
    const line = bucketLine(formatFinancialDiagnosisContext(assembleLive()), "delta_venta", "dejaron");
    assert.match(line, /GROSS_STOPPED_BUYING_MAGNITUDE_KG/);
  });

  it("R-GROSS-008 dejaron no es net delta", () => {
    const line = bucketLine(formatFinancialDiagnosisContext(assembleLive()), "delta_venta", "dejaron");
    assert.match(line, /NOT_PLANT_NET_DELTA/);
  });

  it("R-GROSS-009 M9 plant net delta status = NOT_AVAILABLE", () => {
    const prompt = livePrompt();
    const ctx = formatFinancialDiagnosisContext(assembleLive());
    assert.match(prompt.systemPrompt, /M9_PLANT_NET_DELTA_STATUS=NOT_AVAILABLE/);
    assert.match(ctx, /M9_PLANT_NET_DELTA_STATUS=NOT_AVAILABLE/);
  });

  it("R-GROSS-010 no fórmula net reconstruida", () => {
    assert.doesNotMatch(FD_SRC, /mas\s*-\s*disminuyeron\s*-\s*dejaron/);
    assert.doesNotMatch(FD_SRC, /PLANT_NET_DELTA\s*=/);
    assert.doesNotMatch(livePrompt().systemPrompt, /mas - disminuyeron - dejaron/);
  });

  it("R-GROSS-011 prompt prohíbe Delta Venta disminuyó X desde bucket", () => {
    assert.match(
      livePrompt().systemPrompt,
      /FORBIDDEN:.*Delta Venta disminuyó X/s
    );
  });

  it("R-GROSS-012 prompt prohíbe planta cayó X desde bucket", () => {
    assert.match(livePrompt().systemPrompt, /FORBIDDEN:.*planta cayó X/s);
  });

  it("R-GROSS-013 prompt permite reducción bruta acumulada", () => {
    assert.match(livePrompt().systemPrompt, /reducción bruta acumulada/);
  });

  it("R-GROSS-014 prompt declara posible compensación por otros buckets", () => {
    assert.match(livePrompt().systemPrompt, /otros buckets pueden compensar/);
  });

  it("R-GROSS-015 IGF\/ARR distinto de M9", () => {
    const prompt = livePrompt();
    assert.match(prompt.systemPrompt, /IGF venta y ARR projected_venta_ton no son M9 Delta Venta/);
    assert.match(prompt.context, /ARR observed != projected != IGF commitment\. No es delta M9/);
  });

  it("R-GROSS-016 alignment comparable intacto", () => {
    const assembled = assembleLive();
    assert.equal(assembled.alignment.status, "comparable");
    const prompt = livePrompt();
    assert.match(prompt.systemPrompt, /ALIGNMENT_STATUS=comparable/);
    assert.match(prompt.systemPrompt, /ALIGNMENT_AUTHORITY=buildAlignment/);
    assert.match(prompt.systemPrompt, /FORBIDDEN: period mismatch/);
  });

  it("R-GROSS-017 causality NONE intacto", () => {
    const prompt = livePrompt();
    assert.match(prompt.systemPrompt, /CAUSAL_EVIDENCE=NONE/);
    assert.match(prompt.systemPrompt, /puede estar relacionado/);
    assert.match(prompt.systemPrompt, /no puedes determinar por qué cayó el ingreso ni atribuir causalidad/);
  });

  it("R-GROSS-018 pretruncate 17\/3 intacto", () => {
    const assembled = assembleLive({
      m9Venta: m9Avail("delta_venta", "kg", {
        dejaron: {
          clientes: Array.from({ length: 17 }, (_, i) => ({ cliente: `C${i + 1}` })),
          totalDeltaKg: 10,
        },
        mas: { clientes: [], totalDeltaKg: 0 },
        disminuyeron: { clientes: [], totalDeltaKg: 0 },
      }),
    });
    const bucket = assembled.sources.m9.payload.venta.payload.datos.dejaron;
    assert.equal(bucket.payload_client_count, 17);
    assert.equal(bucket.sample_client_count, 3);
    assert.equal(bucket.clientes.length, 3);
    const line = bucketLine(formatFinancialDiagnosisContext(assembled), "delta_venta", "dejaron");
    assert.match(line, /payload_client_count=17/);
    assert.match(line, /sample_client_count=3/);
    assert.match(line, /truncated=YES/);
  });

  it("R-GROSS-019 null != zero intacto", () => {
    const assembled = assembleLive({
      m9Venta: m9Avail("delta_venta", "kg", {
        dejaron: { clientes: [], totalDeltaKg: null },
        mas: { clientes: [], totalDeltaKg: 0 },
        disminuyeron: { clientes: [], totalDeltaKg: 0 },
      }),
    });
    const dejaron = bucketLine(formatFinancialDiagnosisContext(assembled), "delta_venta", "dejaron");
    const mas = bucketLine(formatFinancialDiagnosisContext(assembled), "delta_venta", "mas");
    assert.match(dejaron, /totalDeltaKg=UNAVAILABLE/);
    assert.doesNotMatch(dejaron, /totalDeltaKg=0/);
    assert.match(mas, /totalDeltaKg=0/);
  });

  it("R-GROSS-020 SOURCE_PARTIAL intacto", () => {
    const assembled = assembleLive({
      m9Ingreso: {
        ok: true,
        family: "delta_ingreso",
        unit: "MXN",
        periodoA: "2026-08",
        periodoB: "2026-09",
        exact_ingreso: false,
        missing_inputs: ["margenA"],
        datos: { exact_ingreso: false, missing_inputs: ["margenA"], ...emptyDatos("totalDeltaIngreso") },
      },
    });
    assert.equal(assembled.sources.m9.payload.ingreso.status, DIRECTOR_IA_VERACITY.SOURCE_PARTIAL);
    const ing = familySection(formatFinancialDiagnosisContext(assembled), "delta_ingreso");
    assert.match(ing, /NO DISPONIBLE exacto \(faltan: margenA\)/);
    assert.doesNotMatch(ing, /state=EMPTY/);
    const prompt = buildFinancialDiagnosisPrompt(assembled, "¿Por qué cayó el ingreso?");
    assert.match(prompt.systemPrompt, /M9_DELTA_INGRESO_STATUS=SOURCE_PARTIAL/);
    assert.match(prompt.systemPrompt, /MISSING_INPUTS=delta_ingreso:margenA/);
  });

  it("R-GROSS-021 numeric zero intacto", () => {
    const line = bucketLine(formatFinancialDiagnosisContext(assembleLive()), "delta_venta", "dejaron");
    assert.match(line, /totalDeltaKg=0/);
    assert.doesNotMatch(line, /totalDeltaKg=UNAVAILABLE/);
  });

  it("R-GROSS-022 formatter no inventa signo", () => {
    const line = bucketLine(formatFinancialDiagnosisContext(assembleLive()), "delta_venta", "disminuyeron");
    assert.match(line, /totalDeltaKg=1059160\.26/);
    assert.doesNotMatch(line, /totalDeltaKg=-/);
  });

  it("R-GROSS-023 no SQL", () => {
    assert.equal(gitDiff("lib/director-ia-m9-deltas.js"), "");
    assert.doesNotMatch(FD_SRC, /ALTER TABLE|CREATE TABLE|DROP TABLE|information_schema/i);
  });

  it("R-GROSS-024 no loaders", () => {
    const frozen = gitShow(`${BASE_MAIN}:lib/director-ia-financial-diagnosis.js`);
    assert.equal(
      extractFn(FD_SRC, "function assembleFinancialDiagnosisEvidence", "function shouldAbortForAuthz"),
      extractFn(frozen, "function assembleFinancialDiagnosisEvidence", "function shouldAbortForAuthz")
    );
    assert.equal(
      extractFn(FD_SRC, "async function loadFinancialDiagnosisForChat", "function statusLine"),
      extractFn(frozen, "async function loadFinancialDiagnosisForChat", "function statusLine")
    );
  });

  it("R-GROSS-025 no ARR", () => {
    assert.equal(gitDiff("lib/director-ia-igf-arr.js"), "");
  });

  it("R-GROSS-026 no buildAlignment", () => {
    const frozen = gitShow(`${BASE_MAIN}:lib/director-ia-financial-diagnosis.js`);
    assert.equal(
      extractFn(FD_SRC, "function buildAlignment", "function collectLimitations"),
      extractFn(frozen, "function buildAlignment", "function collectLimitations")
    );
  });

  it("R-GROSS-027 no post validator", () => {
    assert.doesNotMatch(FD_SRC, /post[-_]?generation|validateAnswer|sanitizeAnswer/i);
  });

  it("R-GROSS-028 no retry OpenAI", () => {
    assert.doesNotMatch(FD_SRC, /retry|maxRetries|openaiDirectorIaChat/i);
  });

  it("R-GROSS-029 no planner", () => {
    assert.equal(gitDiff("lib/director-ia-planner.js"), "");
    assert.equal(planDirectorIaQuestion("¿Por qué cayó el ingreso?").intent, "financial_diagnosis");
  });

  it("R-GROSS-030 no routing", () => {
    assert.equal(gitDiff("lib/director-ia-chat.js"), "");
  });

  it("R-GROSS-031 no server", () => {
    assert.equal(gitDiff("server.js"), "");
  });

  it("R-GROSS-032 no schema", () => {
    assert.doesNotMatch(FD_SRC, /CREATE TABLE|ALTER TABLE|DROP TABLE/i);
  });

  it("R-GROSS-033 no dependencies", () => {
    assert.equal(gitDiff("package.json"), "");
    assert.equal(gitDiff("package-lock.json"), "");
  });

  it("R-GROSS-034 FD tests remain present", () => {
    assert.equal(fs.existsSync(path.join(ROOT, "test", "director-ia-financial-diagnosis.test.js")), true);
  });

  it("R-GROSS-035 M9 tests remain present", () => {
    assert.equal(fs.existsSync(path.join(ROOT, "test", "director-ia-m9-deltas.test.js")), true);
    assert.equal(fs.existsSync(path.join(ROOT, "test", "director-ia-m9-absent-not-zero.test.js")), true);
  });

  it("R-GROSS-036 ARR tests remain present", () => {
    assert.equal(fs.existsSync(path.join(ROOT, "test", "director-ia-arr-projection-cutoff-label.test.js")), true);
  });

  it("R-GROSS-037 prompt status\/alignment tests remain present and addendum frozen", () => {
    assert.equal(
      fs.existsSync(path.join(ROOT, "test", "director-ia-financial-diagnosis-prompt-status-alignment.test.js")),
      true
    );
    assert.equal(FINANCIAL_DIAGNOSIS_SYSTEM_ADDENDUM, ADDENDUM_FROZEN);
    assert.match(livePrompt().systemPrompt, /FINANCIAL_DIAGNOSIS_CONTROL/);
    assert.match(livePrompt().systemPrompt, /ALIGNMENT_STATUS=comparable/);
  });

  it("R-GROSS-038 formatM9Family source frozen so R-PROMPT-030 still matches", () => {
    const frozen = gitShow(`${BASE_MAIN}:lib/director-ia-financial-diagnosis.js`);
    assert.equal(
      extractFn(FD_SRC, "function formatM9Family", "function formatFinancialDiagnosisContext"),
      extractFn(frozen, "function formatM9Family", "function formatFinancialDiagnosisContext")
    );
    assert.equal(
      extractFn(FD_SRC, "function formatFinancialDiagnosisContext", "function isPorQueFinancialQuestion"),
      extractFn(frozen, "function formatFinancialDiagnosisContext", "function isPorQueFinancialQuestion")
    );
  });

  it("R-GROSS-039 descuento\/ingreso no reciben etiquetas kg de venta", () => {
    const desc = familySection(formatFinancialDiagnosisContext(assembleLive()), "delta_descuento");
    const ing = familySection(formatFinancialDiagnosisContext(assembleLive()), "delta_ingreso");
    assert.doesNotMatch(desc, /GROSS_DECREASE_MAGNITUDE_KG|GROSS_INCREASE_MAGNITUDE_KG|GROSS_STOPPED_BUYING_MAGNITUDE_KG/);
    assert.doesNotMatch(ing, /GROSS_DECREASE_MAGNITUDE_KG|GROSS_INCREASE_MAGNITUDE_KG|GROSS_STOPPED_BUYING_MAGNITUDE_KG/);
  });

  it("R-GROSS-040 NEW FAILURE contract ids present", () => {
    const src = fs.readFileSync(__filename, "utf8");
    for (let i = 1; i <= 40; i += 1) {
      assert.match(src, new RegExp(`R-GROSS-${String(i).padStart(3, "0")}`));
    }
  });
});
