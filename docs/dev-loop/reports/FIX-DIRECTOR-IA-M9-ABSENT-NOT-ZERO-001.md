# FIX-DIRECTOR-IA-M9-ABSENT-NOT-ZERO-001

IMPLEMENTATION_SHA:
75f634edd0df2df282cd48fa7389c22324c615af

BEFORE:
B-001 `margenA/B = loadMargen() ?? 0` = true
B-002 row kg null → 0 (post-COALESCE mapper) = true
B-003 row desc null → 0 in ingreso mapper = true (source)
B-004 formatters null → `"0.0"` / `"0.00 $/kg"` / `"$0"` / `"0.0 ton"` = true
B-005 FD declara `null no es 0`, upstream coercía margen ausente a 0 = true
B-006 COALESCE cliente-ausente en FULL OUTER JOIN de `arr.ventas_diarias_cliente` = true (clasificado, no modificado)

COERCION_CLASSIFICATION:

LOCATION: `getDeltaVentaClientes` SQL `COALESCE(a.kg,0)` / `COALESCE(b.kg,0)` + FULL OUTER JOIN
CURRENT_BEHAVIOR: cliente sin filas en un mes del par → 0 kg
CLASSIFICATION: KNOWN_ZERO / STRUCTURAL_ZERO
ACTION: PRESERVE_ZERO
EVIDENCE: fuente transaccional `arr.ventas_diarias_cliente`; el par de periodos solo se usa si `getPeriodosDeltaVenta` demuestra YYYY-MM existente; contrato ya documentado (`Cliente ausente en un mes = 0 kg`). Necesario para “dejó de comprar” (kgA>0, kgB=0) y “cliente nuevo” (kgA=0, kgB>0).

LOCATION: mapper JS `kgA/kgB != null ? Number : 0` (venta/descuento/ingreso kg)
CURRENT_BEHAVIOR: null residual → 0
CLASSIFICATION: KNOWN_ZERO (redundante tras COALESCE SQL)
ACTION: PRESERVE_ZERO

LOCATION: `getDeltaDescuentoClientes` / ingreso SQL `COALESCE(monto,0)` `COALESCE(kg,0)` FULL OUTER JOIN
CURRENT_BEHAVIOR: sin txs de desc/venta en mes disponible → 0
CLASSIFICATION: KNOWN_ZERO / STRUCTURAL_ZERO
ACTION: PRESERVE_ZERO
EVIDENCE: mismas tablas transaccionales; periodos listados desde la fuente.

LOCATION: CASE `kg IS NULL OR kg=0 THEN 0 ELSE monto/kg` (ratio $/kg)
CURRENT_BEHAVIOR: denominador 0 → ratio 0
CLASSIFICATION: dashboard convention for structural kg=0 (KNOWN_ZERO path). kg=0 + monto≠0 sería UNDEFINED_RATIO.
ACTION: PRESERVE (no se cambia). Cambiarlo rompería paridad del modal y exige decisión empresarial / LIVE_DB → no se rediseña.
EVIDENCE: `source_coercion` previo: `kg=0 → ratio 0 en la fuente`. Task: no asumir rediseño; STOP_UNPROVEN si se quisiera alterar esta CASE.

LOCATION: `SQL_PROV_MAP` `COALESCE(p.clave,'')` / nombre
CURRENT_BEHAVIOR: matching de planta
CLASSIFICATION: LEGACY_FORMATTING (no numérico de evidencia)
ACTION: PRESERVE

LOCATION: `getMargenKgPorPeriodo` ya devolvía null si no hay versión / fila
CURRENT_BEHAVIOR: null
CLASSIFICATION: MISSING_SOURCE (correcto)
ACTION: PRESERVE_NULL

LOCATION: `getDeltaIngresoClientes` `margen ?? 0` y periodo inválido → `margenA/B = 0`
CURRENT_BEHAVIOR: margen ausente entra a kg×(margen−|desc|) como 0
CLASSIFICATION: MISSING_INPUT
ACTION: PRESERVE_NULL / PROPAGATE_PARTIAL
EVIDENCE: `getMargenKgPorPeriodo` retorna null; IGF versión/fila ausente no es margen observado 0.

LOCATION: formatters `fmtKg/fmtDescKg/fmtMxn/fmtTon` null → string de cero
CURRENT_BEHAVIOR: ausencia impresa como 0
CLASSIFICATION: LEGACY_FORMATTING of MISSING
ACTION: PRESERVE_NULL → `"n/d"`; `fmt*(0)` sigue siendo cero.

LOCATION: `loadFamilyForChat` / `mapM9Family` `ok:true` ⇒ siempre SOURCE_AVAILABLE
CURRENT_BEHAVIOR: familia con margen missing se pintaba available
CLASSIFICATION: MISSING_INPUT
ACTION: PROPAGATE_PARTIAL (`availability_status=SOURCE_PARTIAL`, `exact_ingreso=false`)

LOCATION: `|| 0` en filtros de buckets de ingreso cuando exacto
CURRENT_BEHAVIOR: kg estructural 0 para clasificar nuevos/dejaron
CLASSIFICATION: KNOWN_ZERO
ACTION: PRESERVE_ZERO (solo corre si `exact_ingreso`)

M9_ABSENCE_MODEL:
Familia no cargable (periodos insuficientes / planta / error / restricted) → `ok:false` + DATA_NOT_FOUND / SOURCE_ERROR / SOURCE_RESTRICTED.
Delta Ingreso con kg/desc conocidos pero margen IGF null → `ok:true` + SOURCE_PARTIAL + `missing_inputs` + sin ingreso/delta exactos.
Aggregate: todos NOT_FOUND → DATA_NOT_FOUND; mezcla → SOURCE_PARTIAL; todos AVAILABLE → AVAILABLE.

KNOWN_ZERO_MODEL:
En periodo fuente disponible, cliente sin filas de `ventas_diarias_cliente` / `descuentos_diarios_cliente` = 0 transaccional. Preserva dejó de comprar y cliente nuevo.

MISSING_MARGIN_HANDLING:
`finiteOrNull(loadMargen())`. null ≠ 0. Si falta margenA o margenB: no ingresoA/B, no deltaIngreso, `exact_ingreso=false`.
Margen real 0 permanece 0 y sí calcula.

DELTA_VENTA_HANDLING:
COALESCE cliente-ausente PRESERVED. Periodo/fuente ausente sigue DATA_NOT_FOUND. Formatters no pintan null como 0.0.

DELTA_DESCUENTO_HANDLING:
COALESCE monto/kg de mes disponible PRESERVED. CASE ratio kg=0 PRESERVED (paridad modal; no rediseño). Formatter null → n/d.

DELTA_INGRESO_HANDLING:
Fórmula kg×(margen−|desc|) solo con ambos márgenes conocidos (0 válido). Missing → SOURCE_PARTIAL / NO DISPONIBLE. No `margen ?? 0`.

FORMATTER_NULL_HANDLING:
null/undefined/non-finite → `n/d`
0 → `0.0` / `0.00 $/kg` / `$0` / `0.0 ton`

FINANCIAL_DIAGNOSIS_CONTEXT:
`mapM9Family` respeta PARTIAL. `formatM9Family` imprime NO DISPONIBLE (no 0 / no “sin cambios”). Addendum `null no es 0` + no causalidad intactos.

NORTH_STAR_MISSING_CONTEXT:
Delta Venta / Descuento / Ingreso: NO DISPONIBLE (o NO DISPONIBLE exacto si partial).
Nunca 0 / $0 / 0.00 $/kg / “sin cambios” como sustituto de missing.

001..048:
48/48 PASS (`test/director-ia-m9-absent-not-zero.test.js`)

SUITES:
R-M9-ABSENT-NOT-ZERO 48/48 PASS
M9 existentes PASS
financial diagnosis PASS
ARR Root1 40/40 PASS post-commit
ARR existentes 24/24 PASS
IGF PASS
planner 61/61 PASS
capabilities 57/57 PASS
tool-orchestrator 27/28; 1 preexistente vs `base_main_sha` `b3e1b031` (planner/orchestrator sin diff; `dejaron de comprar` → `commercial_trend`)
commercial_state routing PASS
continuity PASS
TIER 1 8/8 PASS
PRE-DEPLOY `--gate` PASS
HTTP 5xx = 0
NEW FAILURE = 0

FILES:
- lib/director-ia-m9-deltas.js
- lib/director-ia-financial-diagnosis.js (`mapM9Family` / `formatM9Family`)
- test/director-ia-m9-absent-not-zero.test.js
- docs/dev-loop/CURRENT_TASK.md (status only)
- this report

No `lib/director-ia-igf-arr.js`. No planner. No routing. No DICF. No commercial_state. No server.js.

RISKS:
- CASE ratio kg=0 → 0 se preservó a propósito (paridad dashboard). No se demostró si kg=0+monto≠0 debe ser undefined; no se cambió.
- `venta_ton` COALESCE en weighted average de margen IGF no se tocó (peso, no colapso de margen).
- Familia ingreso con margen missing queda PARTIAL (ok:true) en vez de DATA_NOT_FOUND para no borrar kg conocidos; el contexto dice NO DISPONIBLE exacto.

STRUCTURAL_ZERO_PRESERVED: YES
MISSING_COLLAPSES_TO_ZERO: NO
SQL_EXPRESSION_CHANGED: NO
SCHEMA_CHANGED: NO
PLANNER_CHANGED: NO
ROUTING_CHANGED: NO
ARR_ROOT1_CHANGED: NO
DICF_CHANGED: NO
COMMERCIAL_STATE_CHANGED: NO
DEPENDENCY_CHANGED: NO
LIVE_DB_USED: NO

FINAL: PASS

```yaml
task_id: "FIX-DIRECTOR-IA-M9-ABSENT-NOT-ZERO-001"
outcome: "DONE_PENDING_REVIEW"
mode: "REGRESSION_FIRST"
implementation: true
docs_director_ia_changed: false
live_db: false
sql_expression_changed: false
sql_new: false
tier1_after: "8/8 PASS"
predeploy_after: "PASS"
http_5xx: 0
new_failure: 0
next_task_proposed: "FIX-DIRECTOR-IA-ARR-PROJECTION-QUESTION-ROUTE-001"
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
contracts_consulted:
  - AGENTS.md
  - docs/dev-loop/LOOP_PROTOCOL.md
  - docs/dev-loop/CURRENT_TASK.md
  - docs/dev-loop/reports/AUDIT-DIRECTOR-IA-ARR-PROJECTION-SEMANTICS-001.md
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
human_decision_needed:
  - "Revisión humana. No merge. No push main. No deploy. No LIVE_DB. No next task."
```
