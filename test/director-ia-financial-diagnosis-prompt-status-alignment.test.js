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
  buildFinancialDiagnosisChatResult,
  FINANCIAL_DIAGNOSIS_SYSTEM_ADDENDUM,
} = require("../lib/director-ia-financial-diagnosis");

const ROOT = path.join(__dirname, "..");
const FD_SRC = fs.readFileSync(path.join(ROOT, "lib", "director-ia-financial-diagnosis.js"), "utf8");
const BASE_MAIN = "952ba1b5a44e1c9410a15643d1c7d7feb30b4905";
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
      mas: { clientes: [], totalDeltaKg: 0 },
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

function mismatchAssembled() {
  return assembleLive({
    m9Venta: m9Avail("delta_venta", "kg", emptyDatos("totalDeltaKg"), {
      periodoA: "2026-06",
      periodoB: "2026-07",
    }),
    m9Descuento: m9Avail("delta_descuento", "$/kg", emptyDatos("totalDeltaRatio"), {
      periodoA: "2026-06",
      periodoB: "2026-07",
    }),
    m9Ingreso: m9Avail("delta_ingreso", "MXN", emptyDatos("totalDeltaIngreso"), {
      periodoA: "2026-06",
      periodoB: "2026-07",
    }),
  });
}

describe("R-PROMPT status/alignment contract", () => {
  it("R-PROMPT-001 comparable genera contrato REQUIRED comparable", () => {
    const prompt = livePrompt();
    assert.match(prompt.systemPrompt, /FINANCIAL_DIAGNOSIS_CONTROL/);
    assert.match(prompt.systemPrompt, /ALIGNMENT_STATUS=comparable/);
    assert.match(prompt.systemPrompt, /REQUIRED: tratar IGF 2026-09 \/ ARR 2026-09 \/ M9 2026-08->2026-09 como comparables/);
  });

  it("R-PROMPT-002 comparable genera FORBIDDEN mismatch", () => {
    assert.match(livePrompt().systemPrompt, /FORBIDDEN: period mismatch/);
  });

  it("R-PROMPT-003 comparable prohíbe periodo diferente que limita", () => {
    assert.match(livePrompt().systemPrompt, /FORBIDDEN: periodo diferente que limita comparación/);
    assert.match(livePrompt().userContent, /PROHIBIDO afirmar period mismatch, periodo diferente que limita comparación/);
  });

  it("R-PROMPT-004 mismatch genera REQUIRED mismatch", () => {
    const assembled = mismatchAssembled();
    assert.equal(assembled.alignment.status, "mismatch");
    const prompt = buildFinancialDiagnosisPrompt(assembled, "¿Por qué cayó el ingreso?");
    assert.match(prompt.systemPrompt, /ALIGNMENT_STATUS=mismatch/);
    assert.match(prompt.systemPrompt, /REQUIRED: declarar period mismatch/);
  });

  it("R-PROMPT-005 mismatch no genera REQUIRED comparable", () => {
    const prompt = buildFinancialDiagnosisPrompt(mismatchAssembled(), "cómo va el ingreso");
    assert.doesNotMatch(prompt.systemPrompt, /REQUIRED: tratar IGF .* como comparables/);
    assert.match(prompt.systemPrompt, /FORBIDDEN: tratar los bloques como comparables/);
  });

  it("R-PROMPT-006 alignment.status tratado como authoritative", () => {
    assert.match(livePrompt().systemPrompt, /ALIGNMENT_AUTHORITY=buildAlignment/);
    assert.match(livePrompt().systemPrompt, /alignment\.status es autoritativo/);
  });

  it("R-PROMPT-007 IGF status incluido en contrato", () => {
    assert.match(livePrompt().systemPrompt, /IGF_STATUS=SOURCE_AVAILABLE/);
  });

  it("R-PROMPT-008 ARR status incluido en contrato", () => {
    assert.match(livePrompt().systemPrompt, /ARR_STATUS=SOURCE_AVAILABLE/);
  });

  it("R-PROMPT-009 M9 aggregate status incluido", () => {
    assert.match(livePrompt().systemPrompt, /M9_STATUS=SOURCE_AVAILABLE/);
  });

  it("R-PROMPT-010 delta_venta status incluido", () => {
    assert.match(livePrompt().systemPrompt, /M9_DELTA_VENTA_STATUS=SOURCE_AVAILABLE/);
  });

  it("R-PROMPT-011 delta_descuento status incluido", () => {
    assert.match(livePrompt().systemPrompt, /M9_DELTA_DESCUENTO_STATUS=SOURCE_AVAILABLE/);
  });

  it("R-PROMPT-012 delta_ingreso status incluido", () => {
    assert.match(livePrompt().systemPrompt, /M9_DELTA_INGRESO_STATUS=SOURCE_AVAILABLE/);
  });

  it("R-PROMPT-013 SOURCE_AVAILABLE no puede describirse como missing", () => {
    assert.match(livePrompt().systemPrompt, /SOURCE_AVAILABLE MUST NOT be rewritten as missing or unavailable/);
  });

  it("R-PROMPT-014 SOURCE_PARTIAL usa missing_inputs", () => {
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
    const prompt = buildFinancialDiagnosisPrompt(assembled, "¿Por qué cayó el ingreso?");
    assert.match(prompt.systemPrompt, /M9_DELTA_INGRESO_STATUS=SOURCE_PARTIAL/);
    assert.match(prompt.systemPrompt, /MISSING_INPUTS=delta_ingreso:margenA/);
    assert.match(prompt.systemPrompt, /solo según missing_inputs físicos/);
  });

  it("R-PROMPT-015 SOURCE_PARTIAL no inventa missing reason", () => {
    assert.match(livePrompt().systemPrompt, /MUST NOT invent missing reason outside missing_inputs/);
  });

  it("R-PROMPT-016 structural convention no significa periodo sin clientes", () => {
    assert.match(livePrompt().systemPrompt, /el periodo no tiene clientes/);
    assert.match(livePrompt().systemPrompt, /CONVENCION_ESTRUCTURAL MUST NOT mean/);
  });

  it("R-PROMPT-017 structural convention no significa DATA_NOT_FOUND", () => {
    assert.match(livePrompt().systemPrompt, /or DATA_NOT_FOUND/);
  });

  it("R-PROMPT-018 no causal evidence queda explícito", () => {
    assert.match(livePrompt().systemPrompt, /CAUSAL_EVIDENCE=NONE/);
  });

  it("R-PROMPT-019 por qué exige declaración de no causa probada", () => {
    const why = livePrompt("¿Por qué cayó el ingreso?");
    const other = livePrompt("cómo va el ingreso");
    assert.match(why.systemPrompt, /no puedes determinar por qué cayó el ingreso ni atribuir causalidad/);
    assert.doesNotMatch(other.systemPrompt, /no puedes determinar por qué cayó el ingreso ni atribuir causalidad/);
  });

  it("R-PROMPT-020 Delta Venta y Delta Ingreso pueden coexistir descriptivamente", () => {
    assert.match(livePrompt().systemPrompt, /describir simultáneamente Delta Ingreso disminuyó y Delta Venta disminuyó/);
  });

  it("R-PROMPT-021 coexistencia no autoriza causalidad", () => {
    assert.match(livePrompt().systemPrompt, /Coexistencia no autoriza causalidad/);
  });

  it("R-PROMPT-022 prohíbe puede estar relacionado", () => {
    assert.match(livePrompt().systemPrompt, /puede estar relacionado/);
  });

  it("R-PROMPT-023 prohíbe podría indicar la causa", () => {
    assert.match(livePrompt().systemPrompt, /podría indicar la causa/);
  });

  it("R-PROMPT-024 prohíbe debido a como atribución causal", () => {
    assert.match(livePrompt().systemPrompt, /debido a \(atribución causal\)/);
  });

  it("R-PROMPT-025 tensión queda definida como diferencia descriptiva", () => {
    assert.match(livePrompt().systemPrompt, /TENSION=descriptive_difference_only/);
    assert.match(livePrompt().systemPrompt, /Tensión solo significa diferencia descriptiva/);
  });

  it("R-PROMPT-026 tensión no es driver", () => {
    assert.match(livePrompt().systemPrompt, /Tensión no es driver/);
  });

  it("R-PROMPT-027 no hipótesis N5", () => {
    assert.match(livePrompt().systemPrompt, /No formules hipótesis N5/);
  });

  it("R-PROMPT-028 no responsable", () => {
    assert.match(livePrompt().systemPrompt, /No nombres responsable/);
  });

  it("R-PROMPT-029 no impacto causal inventado", () => {
    assert.match(livePrompt().systemPrompt, /No inventes impacto causal/);
  });

  it("R-PROMPT-030 formatter output unchanged", () => {
    const frozen = gitShow(`${BASE_MAIN}:lib/director-ia-financial-diagnosis.js`);
    assert.equal(
      extractFn(FD_SRC, "function formatM9Family", "function formatFinancialDiagnosisContext"),
      extractFn(frozen, "function formatM9Family", "function formatFinancialDiagnosisContext")
    );
    assert.equal(
      extractFn(FD_SRC, "function formatFinancialDiagnosisContext", "function isPorQueFinancialQuestion"),
      extractFn(frozen, "function formatFinancialDiagnosisContext", "function buildFinancialDiagnosisPrompt")
    );
  });

  it("R-PROMPT-031 truncate/count semantics unchanged", () => {
    const frozen = gitShow(`${BASE_MAIN}:lib/director-ia-financial-diagnosis.js`);
    assert.equal(
      extractFn(FD_SRC, "function truncateM9Datos", "function mapM9Family"),
      extractFn(frozen, "function truncateM9Datos", "function mapM9Family")
    );
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

  it("R-PROMPT-032 buildAlignment unchanged", () => {
    const frozen = gitShow(`${BASE_MAIN}:lib/director-ia-financial-diagnosis.js`);
    assert.equal(
      extractFn(FD_SRC, "function buildAlignment", "function collectLimitations"),
      extractFn(frozen, "function buildAlignment", "function collectLimitations")
    );
  });

  it("R-PROMPT-033 assemble evidence unchanged", () => {
    const frozen = gitShow(`${BASE_MAIN}:lib/director-ia-financial-diagnosis.js`);
    assert.equal(
      extractFn(FD_SRC, "function assembleFinancialDiagnosisEvidence", "function shouldAbortForAuthz"),
      extractFn(frozen, "function assembleFinancialDiagnosisEvidence", "function shouldAbortForAuthz")
    );
  });

  it("R-PROMPT-034 M9 loaders unchanged", () => {
    assert.equal(gitDiff("lib/director-ia-m9-deltas.js"), "");
  });

  it("R-PROMPT-035 ARR loaders unchanged", () => {
    assert.equal(gitDiff("lib/director-ia-igf-arr.js"), "");
  });

  it("R-PROMPT-036 Root1 ARR observed/projected PASS", () => {
    const ctx = formatFinancialDiagnosisContext(assembleLive());
    assert.match(ctx, /observed_venta_ton=302/);
    assert.match(ctx, /projected_venta_ton=1469\.36/);
  });

  it("R-PROMPT-037 Root2 M9 missing-not-zero PASS", () => {
    const assembled = assembleLive({
      m9Venta: { ok: false, code: DIRECTOR_IA_VERACITY.DATA_NOT_FOUND, error: "sin periodos" },
    });
    assert.match(formatFinancialDiagnosisContext(assembled), /NO DISPONIBLE\. null no es 0/);
  });

  it("R-PROMPT-038 17/3 pretruncate regression PASS", () => {
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
    assert.equal(bucket.clientes.length, 3);
  });

  it("R-PROMPT-039 no post-generation validator", () => {
    assert.doesNotMatch(FD_SRC, /post[-_]?generation|validateAnswer|sanitizeAnswer/i);
    assert.equal(gitDiff("lib/director-ia-chat.js"), "");
  });

  it("R-PROMPT-040 no retry OpenAI", () => {
    assert.doesNotMatch(FD_SRC, /retry|maxRetries|openaiDirectorIaChat/i);
  });

  it("R-PROMPT-041 no nueva llamada OpenAI", () => {
    assert.doesNotMatch(FD_SRC, /axios\.post|chat\/completions/);
  });

  it("R-PROMPT-042 buildFinancialDiagnosisChatResult unchanged", () => {
    const frozen = gitShow(`${BASE_MAIN}:lib/director-ia-financial-diagnosis.js`);
    assert.equal(
      extractFn(FD_SRC, "function buildFinancialDiagnosisChatResult", "module.exports"),
      extractFn(frozen, "function buildFinancialDiagnosisChatResult", "module.exports")
    );
    const assembled = assembleLive();
    const result = buildFinancialDiagnosisChatResult(assembled, { answer: "Hechos.", planta_id: 1 });
    assert.equal(result.answer, "Hechos.");
    assert.equal(result.context_meta.openai_call_count, 1);
  });

  it("R-PROMPT-043 planner unchanged", () => {
    assert.equal(gitDiff("lib/director-ia-planner.js"), "");
    assert.equal(planDirectorIaQuestion("¿Por qué cayó el ingreso?").intent, "financial_diagnosis");
  });

  it("R-PROMPT-044 routing unchanged", () => {
    assert.equal(gitDiff("lib/director-ia-chat.js"), "");
  });

  it("R-PROMPT-045 server unchanged", () => {
    assert.equal(gitDiff("server.js"), "");
  });

  it("R-PROMPT-046 SQL/schema/dependencies unchanged", () => {
    assert.equal(gitDiff("package.json"), "");
    assert.doesNotMatch(FD_SRC, /ALTER TABLE|CREATE TABLE|DROP TABLE/i);
  });

  it("R-PROMPT-047 existing financial diagnosis tests remain present", () => {
    assert.equal(fs.existsSync(path.join(ROOT, "test", "director-ia-financial-diagnosis.test.js")), true);
  });

  it("R-PROMPT-048 existing M9 formatter/pretruncate tests remain present", () => {
    assert.equal(
      fs.existsSync(path.join(ROOT, "test", "director-ia-financial-diagnosis-m9-pretruncate-count.test.js")),
      true
    );
  });

  it("R-PROMPT-049 existing M9 tests remain present", () => {
    assert.equal(fs.existsSync(path.join(ROOT, "test", "director-ia-m9-deltas.test.js")), true);
  });

  it("R-PROMPT-050 existing ARR tests remain present", () => {
    assert.equal(fs.existsSync(path.join(ROOT, "test", "director-ia-arr-projection-cutoff-label.test.js")), true);
  });

  it("R-PROMPT-051 addendum export frozen so pretruncate 050 still matches", () => {
    assert.equal(FINANCIAL_DIAGNOSIS_SYSTEM_ADDENDUM, ADDENDUM_FROZEN);
  });

  it("R-PROMPT-052 control block is prompt-only and not in formatter context", () => {
    const assembled = assembleLive();
    const ctx = formatFinancialDiagnosisContext(assembled);
    const prompt = buildFinancialDiagnosisPrompt(assembled, "¿Por qué cayó el ingreso?");
    assert.doesNotMatch(ctx, /FINANCIAL_DIAGNOSIS_CONTROL/);
    assert.match(prompt.systemPrompt, /FINANCIAL_DIAGNOSIS_CONTROL/);
    assert.match(prompt.userContent, /Declara limitaciones y period mismatch si existen/);
  });

  it("R-PROMPT-053 NEW FAILURE contract ids present", () => {
    const src = fs.readFileSync(__filename, "utf8");
    for (let i = 1; i <= 53; i += 1) {
      assert.match(src, new RegExp(`R-PROMPT-${String(i).padStart(3, "0")}`));
    }
  });
});
