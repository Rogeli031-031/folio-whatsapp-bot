# Reporte — ARCH-DIRECTOR-IA-FINANCIAL-ACTUAL-SOURCE-001

```yaml
task_id: "ARCH-DIRECTOR-IA-FINANCIAL-ACTUAL-SOURCE-001"
outcome: "DONE_PENDING_REVIEW"
mode: "ARCHITECTURE_READINESS_ONLY"
implementation: false
sql_execution: false
schema: false
vba: false
runtime: false
permissions: false
contract_changes: false
readiness: "READY_WITH_LIMITS"
finalization_architecture: "A"
rejected_strategies: ["C", "D"]
b_status: "rejected as extra object — same semantics as A, more machinery"
actual_financial_support_today: "UNSUPPORTED"
authz: "AUTHZ_DECISION_REQUIRED"
historical_as_of: "PARTIAL — created_at is upload time, not business as-of"
grain: "igf.versions GLOBAL + row empresa; not per-plant final flag"
g2: "REQUIRED — Index, EKE §7 Financiero, CAPACIDADES_Y_FUENTES"
g3: "REQUIRED — new evidence contract (owner of ACTUAL_FINANCIAL + finalization)"
g8: "N/A"
constitution_edit: false
ies_re_unfreeze_in_first_contract: false
modules_changed: []
global_before: "10.5 / 20 = 52.5%"
global_after: "10.5 / 20 = 52.5%"
gain_pp: 0.0
percentage_policy: "This readiness task does not measure modules. 0.0 pp."
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-FINANCIAL-ACTUAL-SOURCE-001.md"
files_not_touched:
  - "docs/director-ia/"
  - "lib/"
  - "test/"
  - "sql/"
  - "server.js"
  - "vba/"
  - "frontend-dashboard/"
contracts_consulted:
  - "AGENTS.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-FINANCIAL-ACTUAL-SOURCE-GAP-001.md"
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md"
  - "docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md"
  - "docs/director-ia/02-EVIDENCE-BUILDER.md"
  - "docs/director-ia/04-IES-STANDARD.md"
  - "docs/director-ia/05-REASONING-ENGINE.md"
  - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"
  - "vba/ModIgfBuildInsertCompromiso.bas"
  - "server.js (isIgfMesCerradoPorCorte, buildIgfForecastPayload, PATCH, created_at)"
  - "lib/director-ia-igf-arr.js"
  - "lib/usuario-permisos.js"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "ARCH-DIRECTOR-IA-FINANCIAL-ACTUAL-EVIDENCE-CONTRACT-001"
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
human_decision_needed:
  - "G5 LOOP: HUMAN_APPROVER cierra esta tarea. NEXT_TASK no está autorizada ni ejecutada."
  - "AUTHZ_DECISION_REQUIRED: permiso de P&L actual. No heredar acceso_igf_forecast_kpis."
  - "G2+G3 de la NEXT_TASK los autoriza solo el humano."
  - "52.5% no cambia (0.0 pp)."
```

## Respuesta inequívoca

**READY_WITH_LIMITS.**

Arquitectura de finalización: **A** — semántica explícita mínima sobre `igf.versions` existente. No segunda fuente. No duplicar valores.

**C y D rechazadas.** Inferir latest + mes cerrado, o ARR completo + latest, no es garantía física.

Hoy `financial.actual` sigue **UNSUPPORTED**. Esta tarea no implementa.

**NEXT_TASK no es IMPL.** G2 y G3 siguen REQUIRED. Una sola tarea contractual previa.

---

## Ejecución

- Rama: `architecture/director-ia-financial-actual-source-001` (≠ `main`).
- HEAD: `0eb598ca Merge branch 'architecture/director-ia-financial-actual-source-gap-001'`.
- G1 intacto: `HUMAN_APPROVER` / `2026-08-25`. Solo se cambió `status`.
- Hechos de `ARCH-DIRECTOR-IA-FINANCIAL-ACTUAL-SOURCE-GAP-001` no reabiertos.

---

## A / B / C / D

| Opción | Veredicto |
|--------|-----------|
| **A — extender `igf.versions`** | **Seleccionada.** Identidad = la versión que ya existe. Finalización/provenance en el mismo registro. Valores siguen en `igf.compromiso_lines`. |
| B — registry aparte | Rechazada. Mismos datos, más objeto. No aporta semántica que A no pueda cargar. |
| C — latest + mes cerrado | **Rechazada.** `is_current`/`latest` ≠ FINAL. Calendario ≠ FINAL. GET el día 31 sigue PROY. |
| D — ARR completo + latest Finanzas | **Rechazada.** ARR completo ≠ variables financieras finales. Latest sigue sin sello. |

Principio: mecanismo explícito mínimo. Quien designa FINAL es **FINANZAS** (proceso dueño), no el calendario ni el loader.

---

## Identidad del cierre

Grain físico actual: `igf.versions.plant_code = 'GLOBAL'`. Una versión cubre todas las `empresa` de `compromiso_lines`. **No** hay final por planta.

Identidad canónica de un cierre:

| Campo | Uso |
|-------|-----|
| `year` + `month` | Periodo exacto. Sin carry-forward. |
| `igf.versions.id` / `version_number` | Versión designada. |
| `empresa` / planta autorizada | Fila. No salta authz. |
| `source_owner = FINANZAS` | Dueño. |
| estado de finalización | Ver máquina abajo. |

`is_current` **no** entra en la identidad de FINAL.

---

## Estado mínimo

Tres estados. No se inventa workflow extra.

| Estado | Significado |
|--------|-------------|
| `FORECAST` | Default de toda versión no designada. Incluye IGF de mes abierto. |
| `FINAL` | Única versión **autoritativa** del YYYY-MM (GLOBAL). |
| `SUPERSEDED` | Fue FINAL y Finanzas corrigió. Histórico consultable. No es el default. |

Invariantes:

- `is_current` ≠ `is_final`
- latest ≠ FINAL
- mes transcurrido ≠ FINAL
- ARR completo ≠ FINAL
- a lo más un `FINAL` vigente por YYYY-MM
- sin overwrite destructivo de filas históricas
- FINAL **no** convierte outputs de runtime en evidencia de Finanzas

Quién finaliza: proceso **FINANZAS** (designación explícita). `finalized_at` + `finalized_by` o proceso. Esta tarea no define UI ni permiso de escritura.

Provenance mínima: `version_id`, `version_number`, `created_at` (carga), `finalized_at`, owner, referencia al upload si existe. Hash de archivo: deseable, no exigido (VBA completo no está en repo).

---

## Corrección posterior

Si Finanzas corrige julio ya FINAL:

1. Nueva carga = **nueva** `version_number` (no UPDATE in-place del histórico).
2. La nueva se designa `FINAL`.
3. La anterior `FINAL` pasa a `SUPERSEDED`.
4. Director IA lee el `FINAL` vigente.
5. `SUPERSEDED` sigue queryable (auditoría / «qué habíamos cerrado»).
6. PATCH HG sobre una versión `FINAL` **no** es corrección gobernada: o se prohíbe, o se trata como nueva versión + supersession. El PATCH actual (`server.js`) reescribe `hg_*` y util/resultado **en la misma fila**. Eso viola “no overwrite histórico” si se aplica a FINAL.

---

## Campos: stored vs runtime

Finalizar una versión **no** hace FINANCE_PROVIDED al overlay del GET.

| Campo | VBA / stored | GET dashboard | Clase para ACTUAL_FINANCIAL |
|-------|----------------|---------------|-----------------------------|
| `venta_ton` stored | Celda Excel | — | **FINANCE_PROVIDED** (venta del Excel). No pisa ARR. |
| `venta_ton` GET si corte > fin de mes | — | `SUM(ARR.kg)/1000` | **ARR_ACTUAL**. No es evidencia Finanzas. |
| `venta_ton` GET mes abierto | — | PROY | **RUNTIME_COMPUTED** / forecast. |
| `com_desc_kg` stored | Celda Excel | Cerrado: se deja | **FINANCE_PROVIDED**. |
| `com_desc_kg` GET abierto | — | PROY | **RUNTIME_COMPUTED**. |
| `margen_kg` | Celda | No se pisa | **FINANCE_PROVIDED**. |
| `gasto_kg` stored | Celda | — | **FINANCE_PROVIDED**. |
| `gasto_kg` GET | — | presupuesto+folios+depósito | **RUNTIME_COMPUTED**. |
| `impuesto_kg` | Celda | No se pisa | **FINANCE_PROVIDED**. |
| `hg_pct` / `hg_kg` | Celda | signo; PATCH puede reescribir | **FINANCE_PROVIDED** si no mutada post-carga. Tras PATCH: **UNKNOWN** / runtime. |
| `bancos_planta_kg` | Celda | No se pisa | **FINANCE_PROVIDED**. |
| `provision_planta_kg` | Celda | No se pisa | **FINANCE_PROVIDED**. |
| `util_oper_*` stored / `*_igf` | Celda | shadow | **FINANCE_PROVIDED**. |
| `util_oper_*` GET displayed | — | `recalcularUtilYResultado` | **RUNTIME_COMPUTED**. |
| `gtos_apoyos_corp_kg` | Celda | no folios | **FINANCE_PROVIDED**. |
| `bancos_corp_kg` | Celda | No se pisa | **FINANCE_PROVIDED**. |
| `otros_programas_kg` | Celda | No se pisa | **FINANCE_PROVIDED**. |
| `inversiones_kg` stored (mes pasado) | Celda | se deja | **FINANCE_PROVIDED**. |
| `inversiones_kg` GET mes actual | — | Folios | **RUNTIME_COMPUTED**. |
| `resultado_final_*` stored / `*_igf` | Celda | shadow | **FINANCE_PROVIDED**. |
| `resultado_final_*` GET displayed | — | recálculo | **RUNTIME_COMPUTED**. |

Chat `loadIgfCommitSnapshot` lee **stored**. Eso es la base correcta de ACTUAL_FINANCIAL, **solo** si la versión es `FINAL`.

---

## Definición de ACTUAL_FINANCIAL

**ACTUAL_FINANCIAL** = campos **FINANCE_PROVIDED** de la fila `compromiso_lines` de la única versión `FINAL` de ese YYYY-MM, para la `empresa` autorizada.

No incluye: overlay GET, util/resultado recalculados, PROY, Folios, presupuesto, `forecast_mensual`, `igf_meta`, latest no FINAL.

**ACTUAL_COMMERCIAL** sigue siendo ARR. Si `venta_ton` FINANCE_PROVIDED ≠ ARR del mismo mes: `FINANCIAL_ACTUAL_RECONCILIATION_GAP`. No elegir en silencio.

---

## Futuro `month_close_result` / `pre_meeting`

| Bloque | Fuente |
|--------|--------|
| `sales.actual` | ARR |
| `sales.target` | `igf_meta` |
| `sales.forecast` | IGF no FINAL / histórico si se pide |
| `financial.actual` | ACTUAL_FINANCIAL (solo FINAL) |
| `financial.target` | `igf_meta` |
| `financial.forecast` | IGF `FORECAST` / SUPERSEDED-as-forecast |

Mes abierto: TARGET vs FORECAST vs ARR to-date. Sin `financial.actual`.

Mes cerrado sin FINAL: `NOT_FINAL`. No presentar actual.

Mes FINAL: TARGET vs ACTUAL_FINANCIAL vs ARR. FORECAST histórico solo si se pide y hay versiones anteriores.

Cada output: `truth_class`, periodo, `version_id`, estado, provenance, `provided` vs `computed`.

---

## Timestamps e histórico

`igf.versions.created_at` existe (ALTER en `server.js`). `version_as_of_corte` usa `(created_at AT TIME ZONE 'America/Mexico_City')::date <= corte`.

| Pregunta futura | ¿Defendible? |
|-----------------|--------------|
| ¿Qué forecast había **antes del cierre**? | **Sí**, si existen versiones `FORECAST`/`SUPERSEDED` anteriores al `FINAL`. Comparar stored. |
| ¿Cuánto cambió vs resultado final? | **Sí**, mismo requisito + `FINAL`. Solo campos FINANCE_PROVIDED. No GET util. |
| ¿Cómo proyectábamos el **15**? | **Parcial.** Solo si hay versión con `created_at` (carga) ≤ ese día. `created_at` es hora de INSERT, no “vigente de negocio al 15”. Un Excel del 15 subido el 16 **no** aparece as-of 15. |
| ¿Cuándo empezó a deteriorarse? | **No prometido.** Haría falta serie de versiones + semántica effective-date que **no** existe. |

No se promete as-of de calendario de negocio.

---

## AUTHZ

`acceso_igf_forecast_kpis`: AD/ZP/GG/CF_CDMX/GV = true; GA = false.

P&L actual es más sensible. **No heredar** ese permiso.

**AUTHZ_DECISION_REQUIRED.** Fail closed; una planta; sin cross-plant. La matriz la decide el humano (contrato o tarea posterior). Esta tarea no inventa roles.

---

## Códigos (solo justificados)

| Código | Conservar |
|--------|-----------|
| `FINANCIAL_ACTUAL_MISSING_FOR_PERIOD` | Sí. No hay versión de ese YYYY-MM. |
| `FINANCIAL_ACTUAL_NOT_FINAL` | Sí. Hay versiones, ninguna `FINAL`. Default actual. |
| `FINANCIAL_ACTUAL_VERSION_AMBIGUOUS` | Sí. Dos `FINAL` o designación incompleta. |
| `FINANCIAL_ACTUAL_RECONCILIATION_GAP` | Sí. Excel venta vs ARR. |
| `FINANCIAL_ACTUAL_UNAUTHORIZED` | Sí. Fail closed / decisión de permiso. |
| `FINANCIAL_ACTUAL_SOURCE_UNAVAILABLE` | Omitir como código de producto. La fuente es local; error de BD ≠ semántica de cierre. |

`FINANCIAL_ACTUAL_UNSUPPORTED` del inventario vigente permanece **hasta** el contrato G2 del inventario. No es un estado de lectura futuro; es el default de hoy.

Sin fallback a FORECAST, TARGET ni latest.

---

## G2 / G3 / G8 — qué cambia, por qué, en qué orden

Constitución I–V: **no se edita.** VII ya obliga: *toda nueva fuente declara cómo produce observaciones y alimenta el IES*. Cumplir = escribir esa declaración. No retocar el núcleo.

`04` y `05` están **congelados**. No se descongelan en el primer contrato. El contrato nuevo declara: ACTUAL_FINANCIAL **no** entra al pipeline IES/N5 hasta un G2 futuro; RE **no** infiere utilidad real desde IGF FORECAST ni desde `NOT_FINAL` (ya cubierto por `05` §8 / EKE: RE no fabrica hipótesis sobre `NO_CONOZCO` / fuente no mapeada).

| Orden | Gate | Documento | Qué | Por qué |
|------:|------|-----------|-----|---------|
| 1 | **G3** | **Nuevo** contrato de evidencia (nombre lo fija la NEXT_TASK; p. ej. bajo `docs/director-ia/`) | Dueño de: clase ACTUAL_FINANCIAL; arquitectura A; estados FORECAST/FINAL/SUPERSEDED; mapa de campos; reconciliación ARR; no-fallback; grain GLOBAL; stored vs GET; as-of limitado; declaración IES = *no mapeado aún* | Nueva clase de evidencia. No cabe como nota en M7. |
| 2 | **G2** | `DIRECTOR_IA_ARCHITECTURE_INDEX.md` | Indexar el contrato nuevo. El índice no redefine. | Cadena documental. |
| 3 | **G2** | EKE §7 Financiero (~L265–270) | Hoy: «ARR, IGF, margen, forecast». Distinguir IGF FORECAST vs ACTUAL_FINANCIAL. `NOT_FINAL` ≠ `NO_CONOZCO` constitucional (la fuente existe; no está designada). | El Motor no debe tratar latest IGF como actual. |
| 4 | **G2** | `DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md` | `month_close_result` / `pre_meeting` / clases de verdad (~L1005–1064, L1952–1960, L2646, L2710, L2753): `financial.actual` deja de ser UNSUPPORTED *permanente*; pasa a SUPPORTED **solo** si `FINAL`. Invariante de cinco clases. | Inventario vigente contradice A si no se actualiza **antes** de cualquier loader. |
| — | no ahora | Constitución | — | VII se cumple por el contrato nuevo. |
| — | no ahora | `04` / `05` | — | Congelados. Mapeo IES/N5 = G2 posterior. |
| — | no ahora | `02` / `03A` | Observation ya tiene `source.system` / lineage. Campos de FINAL cuando exista path N1. | Runtime IES pendiente. |
| — | **G8** | — | **N/A.** No hay pesos/firma nuevos. | |

**Prohibido:** IMPL de columna, loader o `month_close_result` **antes** de 1–4.

---

## Límites de READY_WITH_LIMITS

- Authz de lectura de P&L actual: decisión humana pendiente.
- As-of de negocio el día 15: no garantizado.
- FINAL es GLOBAL, no por planta.
- Módulo VBA completo de upload no está en este repo.
- PATCH actual puede mutar stored HG/util.

No BLOCKED: A es físicamente viable sobre la fuente ya cargada.

---

## Porcentaje

10.5 / 20 = **52.5%**. **0.0 pp.**

---

## NEXT_TASK (exactamente una; no autorizada; no ejecutada)

`ARCH-DIRECTOR-IA-FINANCIAL-ACTUAL-EVIDENCE-CONTRACT-001`

Escribir (con G2+G3 humanos) el contrato de evidencia + índice + EKE §7 + inventario. Sin schema, SQL, VBA, runtime, permisos, 04/05, IMPL.

No autorizar. No ejecutar.

STOP.
