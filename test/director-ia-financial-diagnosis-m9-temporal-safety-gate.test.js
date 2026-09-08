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
const BASE_MAIN = "a39f6b1bfd02ce2ce5c78b86cb79e30e10c830f5";
const NOW_OPEN = new Date(2026, 8, 8, 12, 0, 0);
const NOW_LATER = new Date(2026, 9, 15, 12, 0, 0);
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
      dejaron: { clientes: [{ cliente: "C" }], totalDeltaKg: 113087.4 },
      mas: { clientes: [{ cliente: "B" }], totalDeltaKg: 3194.1 },
      disminuyeron: { clientes: [{ cliente: "A" }], totalDeltaKg: 1059160.26 },
    }),
    m9Descuento: m9Avail("delta_descuento", "$/kg", {
      dejaron: { clientes: [], totalDeltaRatio: 0 },
      mas: { clientes: [], totalDeltaRatio: 0 },
      disminuyeron: { clientes: [{ cliente: "D" }], totalDeltaRatio: 0.3823 },
    }),
    m9Ingreso: m9Avail("delta_ingreso", "MXN", {
      dejaron: { clientes: [], totalDeltaIngreso: 0 },
      mas: { clientes: [], totalDeltaIngreso: 0 },
      disminuyeron: { clientes: [{ cliente: "A" }], totalDeltaIngreso: 5906844.35 },
    }),
    ...over,
  });
}

function unsafePrompt(question = "¿Por qué cayó el ingreso?") {
  return buildFinancialDiagnosisPrompt(assembleLive(), question, { now: NOW_OPEN });
}

function historicalPrompt(question = "¿Por qué cayó el ingreso?") {
  const assembled = assembleLive({
    m9Venta: m9Avail("delta_venta", "kg", {
      dejaron: { clientes: [{ cliente: "C" }], totalDeltaKg: 113087.4 },
      mas: { clientes: [{ cliente: "B" }], totalDeltaKg: 3194.1 },
      disminuyeron: { clientes: [{ cliente: "A" }], totalDeltaKg: 1059160.26 },
    }, { periodoA: "2026-06", periodoB: "2026-07" }),
    m9Descuento: m9Avail("delta_descuento", "$/kg", emptyDatos("totalDeltaRatio"), {
      periodoA: "2026-06",
      periodoB: "2026-07",
    }),
    m9Ingreso: m9Avail("delta_ingreso", "MXN", {
      dejaron: { clientes: [], totalDeltaIngreso: 0 },
      mas: { clientes: [], totalDeltaIngreso: 0 },
      disminuyeron: { clientes: [{ cliente: "A" }], totalDeltaIngreso: 5906844.35 },
    }, { periodoA: "2026-06", periodoB: "2026-07" }),
  });
  return { assembled, prompt: buildFinancialDiagnosisPrompt(assembled, question, { now: NOW_OPEN }) };
}

function llmEvidence(prompt) {
  return `${prompt.context}\n${prompt.userContent}`;
}

describe("R-TEMP M9 temporal safety gate", () => {
  it("R-TEMP-001 current M9 period B -> OBSERVED_MTD", () => {
    assert.match(unsafePrompt().systemPrompt, /M9_CURRENT_PERIOD_MODE=OBSERVED_MTD/);
    assert.match(unsafePrompt().context, /M9_CURRENT_PERIOD_MODE=OBSERVED_MTD/);
  });

  it("R-TEMP-002 current M9 cutoff parity -> NO", () => {
    assert.match(unsafePrompt().systemPrompt, /M9_CUTOFF_PARITY=NO/);
    assert.match(unsafePrompt().context, /M9_CUTOFF_PARITY=NO/);
  });

  it("R-TEMP-003 current M9 temporal comparability -> UNSAFE", () => {
    assert.match(unsafePrompt().systemPrompt, /M9_TEMPORAL_COMPARABILITY=UNSAFE/);
    assert.match(unsafePrompt().context, /M9_TEMPORAL_COMPARABILITY=UNSAFE/);
  });

  it("R-TEMP-004 label alignment can remain comparable", () => {
    const assembled = assembleLive();
    assert.equal(assembled.alignment.status, "comparable");
    assert.match(unsafePrompt().systemPrompt, /ALIGNMENT_STATUS=comparable/);
    assert.match(unsafePrompt().systemPrompt, /PERIOD_LABEL_ALIGNMENT=comparable/);
  });

  it("R-TEMP-005 comparable label != temporal comparable", () => {
    const prompt = unsafePrompt();
    assert.match(prompt.systemPrompt, /PERIOD_LABEL_ALIGNMENT=comparable/);
    assert.match(prompt.systemPrompt, /TEMPORAL_WINDOW_ALIGNMENT=UNSAFE/);
    assert.match(prompt.systemPrompt, /not temporal-window parity/);
  });

  it("R-TEMP-006 unsafe M9 bucket numbers withheld from LLM context", () => {
    const ev = llmEvidence(unsafePrompt());
    assert.doesNotMatch(ev, /totalDeltaKg=1059160/);
    assert.doesNotMatch(ev, /totalDeltaKg=3194/);
    assert.doesNotMatch(ev, /totalDeltaKg=113087/);
    assert.doesNotMatch(ev, /totalDeltaIngreso=5906844/);
  });

  it("R-TEMP-007 1059160.26 not exposed in unsafe prompt context", () => {
    assert.doesNotMatch(llmEvidence(unsafePrompt()), /1059160\.26/);
  });

  it("R-TEMP-008 113087.4 not exposed in unsafe prompt context", () => {
    assert.doesNotMatch(llmEvidence(unsafePrompt()), /113087\.4/);
  });

  it("R-TEMP-009 3194.1 not exposed in unsafe prompt context", () => {
    assert.doesNotMatch(llmEvidence(unsafePrompt()), /3194\.1/);
  });

  it("R-TEMP-010 M9 delta ingreso bucket total not exposed unsafe", () => {
    assert.doesNotMatch(llmEvidence(unsafePrompt()), /5906844\.35/);
  });

  it("R-TEMP-011 internal M9 payload unchanged", () => {
    const assembled = assembleLive();
    const datos = assembled.sources.m9.payload.venta.payload.datos;
    assert.equal(datos.disminuyeron.totalDeltaKg, 1059160.26);
    assert.equal(datos.mas.totalDeltaKg, 3194.1);
    assert.equal(datos.dejaron.totalDeltaKg, 113087.4);
    assert.equal(assembled.sources.m9.payload.ingreso.payload.datos.disminuyeron.totalDeltaIngreso, 5906844.35);
    unsafePrompt();
    assert.equal(datos.disminuyeron.totalDeltaKg, 1059160.26);
  });

  it("R-TEMP-012 historical closed pair not automatically called MTD", () => {
    const { prompt } = historicalPrompt();
    assert.match(prompt.systemPrompt, /M9_CURRENT_PERIOD_MODE=HISTORICAL/);
    assert.doesNotMatch(prompt.systemPrompt, /M9_CURRENT_PERIOD_MODE=OBSERVED_MTD/);
    assert.doesNotMatch(prompt.systemPrompt, /M9_TEMPORAL_COMPARABILITY=UNSAFE/);
  });

  it("R-TEMP-013 date injectable", () => {
    const open = buildFinancialDiagnosisPrompt(assembleLive(), "cómo va", { now: NOW_OPEN });
    const later = buildFinancialDiagnosisPrompt(assembleLive(), "cómo va", { now: NOW_LATER });
    assert.match(open.systemPrompt, /M9_CURRENT_PERIOD_MODE=OBSERVED_MTD/);
    assert.match(later.systemPrompt, /M9_CURRENT_PERIOD_MODE=HISTORICAL/);
  });

  it("R-TEMP-014 no wall-clock-dependent fixture", () => {
    const src = fs.readFileSync(__filename, "utf8");
    assert.match(src, /NOW_OPEN = new Date\(2026, 8, 8/);
    assert.match(src, /now: NOW_OPEN/);
  });

  it("R-TEMP-015 ARR projected preserved", () => {
    assert.match(unsafePrompt().context, /projected_venta_ton=1469\.36/);
  });

  it("R-TEMP-016 ARR observed preserved", () => {
    assert.match(unsafePrompt().context, /observed_venta_ton=302/);
  });

  it("R-TEMP-017 1469.36 cannot be labeled observed when projected field", () => {
    const ctx = unsafePrompt().context;
    assert.match(ctx, /projected_venta_ton=1469\.36/);
    assert.doesNotMatch(ctx, /observed_venta_ton=1469\.36/);
  });

  it("R-TEMP-018 IGF commitment distinct", () => {
    const ctx = unsafePrompt().context;
    assert.match(ctx, /1506\.3507/);
    assert.match(ctx, /ARR observed != projected != IGF commitment/);
  });

  it("R-TEMP-019 no IGF-ARR=M9 equivalence", () => {
    assert.match(unsafePrompt().systemPrompt, /IGF venta y ARR projected_venta_ton no son M9 Delta Venta/);
  });

  it("R-TEMP-020 buildAlignment unchanged", () => {
    const frozen = gitShow(`${BASE_MAIN}:lib/director-ia-financial-diagnosis.js`);
    assert.equal(
      extractFn(FD_SRC, "function buildAlignment", "function collectLimitations"),
      extractFn(frozen, "function buildAlignment", "function collectLimitations")
    );
  });

  it("R-TEMP-021 no M9 SQL change", () => {
    assert.equal(gitDiff("lib/director-ia-m9-deltas.js"), "");
    assert.doesNotMatch(FD_SRC, /FROM arr\.ventas_diarias_cliente/);
  });

  it("R-TEMP-022 no M9 loader change", () => {
    const frozen = gitShow(`${BASE_MAIN}:lib/director-ia-financial-diagnosis.js`);
    assert.equal(
      extractFn(FD_SRC, "async function loadFinancialDiagnosisForChat", "function statusLine"),
      extractFn(frozen, "async function loadFinancialDiagnosisForChat", "function statusLine")
    );
  });

  it("R-TEMP-023 no same-day implementation", () => {
    assert.doesNotMatch(FD_SRC, /same_day|same-day|day_of_month|al mismo día/i);
  });

  it("R-TEMP-024 no client forecast", () => {
    assert.doesNotMatch(FD_SRC, /kgProy|client.?level.?forecast|forecast por cliente/i);
  });

  it("R-TEMP-025 no net delta reconstruction", () => {
    assert.doesNotMatch(FD_SRC, /mas\s*-\s*disminuyeron\s*-\s*dejaron/);
    assert.match(unsafePrompt().systemPrompt, /M9_PLANT_NET_DELTA_STATUS=NOT_AVAILABLE/);
  });

  it("R-TEMP-026 gross labels intact", () => {
    const ctx = formatFinancialDiagnosisContext(assembleLive());
    assert.match(ctx, /GROSS_DECREASE_MAGNITUDE_KG/);
    assert.match(ctx, /GROSS_INCREASE_MAGNITUDE_KG/);
    assert.match(ctx, /GROSS_STOPPED_BUYING_MAGNITUDE_KG/);
  });

  it("R-TEMP-027 pretruncate intact", () => {
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
  });

  it("R-TEMP-028 SOURCE_PARTIAL intact", () => {
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
    const prompt = buildFinancialDiagnosisPrompt(assembled, "¿Por qué cayó el ingreso?", { now: NOW_OPEN });
    assert.match(prompt.systemPrompt, /M9_DELTA_INGRESO_STATUS=SOURCE_PARTIAL/);
  });

  it("R-TEMP-029 null != zero intact", () => {
    const assembled = assembleLive({
      m9Venta: m9Avail("delta_venta", "kg", {
        dejaron: { clientes: [], totalDeltaKg: null },
        mas: { clientes: [], totalDeltaKg: 0 },
        disminuyeron: { clientes: [], totalDeltaKg: 0 },
      }),
    });
    const ctx = formatFinancialDiagnosisContext(assembled);
    assert.match(ctx, /dejaron:[^\n]*totalDeltaKg=UNAVAILABLE/);
    assert.doesNotMatch(ctx, /dejaron:[^\n]*totalDeltaKg=0/);
  });

  it("R-TEMP-030 CAUSAL_EVIDENCE NONE intact", () => {
    assert.match(unsafePrompt().systemPrompt, /CAUSAL_EVIDENCE=NONE/);
  });

  it("R-TEMP-031 no causal use of unsafe M9", () => {
    assert.match(unsafePrompt().systemPrompt, /FORBIDDEN: usar M9 para explicar la caída del ingreso/);
    assert.match(unsafePrompt().systemPrompt, /puede estar relacionado/);
  });

  it("R-TEMP-032 no tension using unsafe M9 numbers", () => {
    assert.match(unsafePrompt().systemPrompt, /FORBIDDEN: usar M9 como tensión contra IGF\/ARR/);
    assert.match(unsafePrompt().systemPrompt, /FORBIDDEN: comparar magnitudes M9 con IGF\/ARR/);
  });

  it("R-TEMP-033 prompt explicitly explains temporal limitation", () => {
    assert.match(
      unsafePrompt().systemPrompt,
      /M9 compara el mes previo con observación MTD del mes abierto sin paridad de corte/
    );
  });

  it("R-TEMP-034 context explicitly explains temporal limitation", () => {
    assert.match(unsafePrompt().context, /observación MTD/);
    assert.match(unsafePrompt().context, /sin paridad de corte/);
    assert.match(unsafePrompt().context, /No se usa para explicar el resultado financiero/);
  });

  it("R-TEMP-035 no post-generation validator", () => {
    assert.doesNotMatch(FD_SRC, /post[-_]?generation|validateAnswer|sanitizeAnswer/i);
  });

  it("R-TEMP-036 no OpenAI retry", () => {
    assert.doesNotMatch(FD_SRC, /retry|maxRetries|openaiDirectorIaChat/i);
  });

  it("R-TEMP-037 no planner", () => {
    assert.equal(gitDiff("lib/director-ia-planner.js"), "");
    assert.equal(planDirectorIaQuestion("¿Por qué cayó el ingreso?").intent, "financial_diagnosis");
  });

  it("R-TEMP-038 no routing", () => {
    assert.equal(gitDiff("lib/director-ia-chat.js"), "");
  });

  it("R-TEMP-039 no server", () => {
    assert.equal(gitDiff("server.js"), "");
  });

  it("R-TEMP-040 no schema", () => {
    assert.doesNotMatch(FD_SRC, /CREATE TABLE|ALTER TABLE|DROP TABLE/i);
  });

  it("R-TEMP-041 no dependencies", () => {
    assert.equal(gitDiff("package.json"), "");
    assert.equal(gitDiff("package-lock.json"), "");
  });

  it("R-TEMP-042 FD tests remain present", () => {
    assert.equal(fs.existsSync(path.join(ROOT, "test", "director-ia-financial-diagnosis.test.js")), true);
  });

  it("R-TEMP-043 prompt-status tests remain present", () => {
    assert.equal(
      fs.existsSync(path.join(ROOT, "test", "director-ia-financial-diagnosis-prompt-status-alignment.test.js")),
      true
    );
    assert.equal(FINANCIAL_DIAGNOSIS_SYSTEM_ADDENDUM, ADDENDUM_FROZEN);
  });

  it("R-TEMP-044 gross-bucket tests remain present", () => {
    assert.equal(
      fs.existsSync(path.join(ROOT, "test", "director-ia-financial-diagnosis-m9-gross-bucket-labels.test.js")),
      true
    );
  });

  it("R-TEMP-045 M9 tests remain present", () => {
    assert.equal(fs.existsSync(path.join(ROOT, "test", "director-ia-m9-deltas.test.js")), true);
  });

  it("R-TEMP-046 ARR Root1 tests remain present", () => {
    assert.equal(fs.existsSync(path.join(ROOT, "test", "director-ia-arr-projection-cutoff-label.test.js")), true);
  });

  it("R-TEMP-047 ARR tests remain present", () => {
    assert.equal(fs.existsSync(path.join(ROOT, "test", "director-ia-real-input-arr.test.js")), true);
  });

  it("R-TEMP-048 formatter and alignment functions stay frozen", () => {
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

  it("R-TEMP-049 historical pair still exposes M9 numbers", () => {
    const { prompt } = historicalPrompt();
    assert.match(llmEvidence(prompt), /1059160\.26/);
  });

  it("R-TEMP-050 NEW FAILURE contract ids present", () => {
    const src = fs.readFileSync(__filename, "utf8");
    for (let i = 1; i <= 50; i += 1) {
      assert.match(src, new RegExp(`R-TEMP-${String(i).padStart(3, "0")}`));
    }
  });
});
