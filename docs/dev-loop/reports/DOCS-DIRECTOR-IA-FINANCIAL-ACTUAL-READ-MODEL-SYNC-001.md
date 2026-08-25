# Reporte — DOCS-DIRECTOR-IA-FINANCIAL-ACTUAL-READ-MODEL-SYNC-001

```yaml
task_id: "DOCS-DIRECTOR-IA-FINANCIAL-ACTUAL-READ-MODEL-SYNC-001"
outcome: "DONE_PENDING_REVIEW"
mode: "DOCS_SYNC"
implementation: false
code_changed: false
sql_changed: false
tests_changed: false
g3_modified: false
g3_version: "1.0"
index_modified: true
index_version: "1.10 → 1.11"
eke_modified: true
eke_version: "sin campo de versión; fecha 2026-08-04 intacta"
capabilities_modified: true
capabilities_version: "sin campo de versión; fecha 2026-08-04 intacta"
matrix_changed: false
runtime_exposure_boundary: "SUPPORTED_WITHIN_MONTH_CLOSE_RESULT"
modules_changed: []
global_before: "10.5 / 20 = 52.5%"
global_after: "10.5 / 20 = 52.5%"
gain_pp: 0.0
percentage_policy: "Read model transversal. No completa M7. 0.0 pp."
next_task_proposed: "ARCH-DIRECTOR-IA-PRE-MEETING-FINANCIAL-ACTUAL-001"
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
```

## 1. Executive summary

Sync documental de la cadena ARCH → IMPL → AUDIT → FIX → REAUDIT **PASS**.

Quedó escrito:

- **FINALIZATION_INFRASTRUCTURE = IMPLEMENTED** (sin cambio)
- **AUTHZ = RESOLVED** (sin `AUTHZ_DECISION_REQUIRED` operativo en Index / EKE / Capacidades)
- **ACTUAL_FINANCIAL READ MODEL = SUPPORTED_WITHIN_MONTH_CLOSE_RESULT**

Director IA consume ACTUAL_FINANCIAL **solo** en `month_close_result`, planta autorizada + YYYY-MM exacto, versión GLOBAL `financial_state = FINAL`. No es soporte general.

`pre_meeting`, IES, RE, Observation Pipeline, Evidence Builder oficial, UI histórica e intent `financial_actual` siguen **PENDING / UNSUPPORTED**.

G3 v1.0 **no** se tocó. Constitución / `04` / `05` **no** se tocaron. Plaud readiness **no** subió.

## 2. Source-of-truth status before sync

| Capa | Antes |
|------|--------|
| Marker FINAL | IMPLEMENTED |
| AUTHZ quién | RESOLVED |
| Loader / `month_close_result.financial.actual` | Documentado PENDING / NOT_YET_SUPPORTED / `UNSUPPORTED_METRIC` |
| Código real | Loader RAW + proyección GPT **ya existían** (REAUDIT PASS) |
| IES / RE / `pre_meeting` | PENDING (correcto) |

El inventario mentía sobre el runtime legado: decía que no había loader.

## 3. Documents inspected

Read-only: G3 v1.0; ARCH / IMPL / AUDIT / FIX / REAUDIT; `lib/director-ia-financial-actual.js`; `lib/director-ia-month-close-result.js` (`formatFinancialActualContext`); planner / pre_meeting / IES builder (cero consumo fuera de month_close).

Autoridad de implementación: **código**, no los reportes.

## 4. Documents changed

| Documento | Por qué |
|-----------|---------|
| `DIRECTOR_IA_ARCHITECTURE_INDEX.md` | Runtime/loader PENDING era falso |
| `DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md` | §7 y excepción (5) decían «no hay loader» |
| `DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md` | Inventario `month_close_result` + fuente ACTUAL_FINANCIAL + matriz de preguntas + scoring |
| `docs/dev-loop/CURRENT_TASK.md` | Loop |
| Este reporte | Obligatorio |

**NOT_TOUCHED:** G3 (sin contradicción normativa; `AUTHZ_DECISION_REQUIRED` es límite de ownership del contrato, no status operativo). Constitución, 02, 03, 03A, 03B, 04, 05, 06. Código, tests, SQL, VBA, UI. Reportes IMPL / AUDIT / FIX / REAUDIT.

## 5. Exact capability boundary

**SUPPORTED** si y solo si:

1. Intent canónico = `month_close_result` (no `financial_actual`)
2. YYYY-MM exacto
3. `igf.versions.plant_code = 'GLOBAL'`
4. `financial_state === 'FINAL'` (única)
5. Actor VIEW autorizado
6. Fila `empresa` resoluble (`findIgfRowForPlant`)

Fuera: no afirmar soporte.

## 6. FINAL-selection semantics

Documentado: year + month + GLOBAL + `FINAL` en JS. **No** latest / MAX / `is_current` / `created_at` / mes cerrado / ARR complete. SUPERSEDED ignorado. Sin FINAL: **no** fallback a FORECAST.

## 7. ACTUAL / TARGET / FORECAST separation

Cinco clases intactas. GET IGF / `recalcularUtilYResultado` / PROY / Folios = RUNTIME_COMPUTED, no FINANCE_PROVIDED.

## 8. Authz resolved state

VIEW: ZP + aliases / AD = ALL_PLANTS; GG = ASSIGNED_PLANTS; resto NONE (antes de SQL).  
FINALIZE/SUPERSEDE: ZP + aliases / AD = ALL_PLANTS; GG y resto NONE.  
USUARIOS ≠ rol. `acceso_igf_forecast_kpis` no hereda.

G3 conserva `AUTHZ_DECISION_REQUIRED` como «este contrato no inventa roles». No se reescribió.

## 9. Reconciliation semantics

`FINANCIAL_ACTUAL_RECONCILIATION_GAP`: Finance `venta_ton` + ARR `venta_ton`; ambos; no overwrite / winner / promedio / tolerancia.

Fallos: NOT_FINAL ≠ FORECAST; MISSING ≠ 0; UNAUTHORIZED ≠ MISSING; AMBIGUOUS; SOURCE_UNAVAILABLE. Sin fields de falso actual.

## 10. Historical backend vs UI

Backend YYYY-MM: **SUPPORTED** (`month_close_result` consulta FINAL de julio si la pregunta nombra julio).  
UI historical selector: **MISSING / PENDING**.

## 11. pre_meeting boundary

Sigue **sin** consumir ACTUAL_FINANCIAL. Pack = IGF abierto (FORECAST). Readiness Plaud **sin cambio** (`CONVERSATION_BASE_READY_WITH_LIMITS`).

## 12. IES / RE boundary

ACTUAL_FINANCIAL **aún no alimenta** IES ni RE. `04` / `05` no se tocaron. No se descongeló nada.

## 13. Version changes

| Documento | Antes | Después |
|-----------|-------|---------|
| Index | 1.10 | **1.11** |
| EKE | sin versión propia | sin bump; fecha 2026-08-04 intacta |
| Capacidades | sin versión propia | sin bump; fecha 2026-08-04 intacta |
| G3 | v1.0 | v1.0 (untouched) |

## 14. Capability matrix evaluation

Regla física: COMPLETE=1.0, PARCIAL/INDIRECTA=0.5, NO INTEGRADA=0.0. `month_close_result` **no es fila M0–M20**.

¿El read model satisface un criterio de fila existente?

- **M7 IGF:** COMPLETE exige UI / PATCH / overlay persistente / recálculo. El loader FINAL de month_close **no** los aporta. M7 sigue PARCIAL (0.5).
- Ninguna otra fila cambia de etiqueta.
- No se inventó módulo.

**10.5 / 20 = 52.5%**. Delta **0.0 pp**. Prohibido subir por «el read model ya funciona».

## 15. Evidence cited, not reexecuted

| Fuente | Números | Nota |
|--------|---------|------|
| REAUDIT | **PASS** | cadena física + GPT context |
| Focal | **50/50** | citados, **no** reejecutados aquí |
| Director IA + finalización | **1056 pass / 0 fail / 0 skipped** | citados, **no** reejecutados aquí |

## 16. git diff --check

Ejecutado al cierre. Limpio.

## 17. Remaining limitations

- `pre_meeting` no consume ACTUAL_FINANCIAL (cuello Plaud)
- IES / RE / EB / OP oficiales
- Selector UI histórico
- Matcher `findIgfRowForPlant` por inclusión (ARCH)
- GG `SELECT *` GLOBAL y filtra
- Fin de mes puede ser PROY ≠ FINAL
- 52.5% intacto

## 18. Final status

**DONE_PENDING_REVIEW.**

Documentación alineada con el código. Baseline **52.5%**. Delta **0.0 pp**.

## 19. Exactly one NEXT_TASK

`ARCH-DIRECTOR-IA-PRE-MEETING-FINANCIAL-ACTUAL-001`

El cuello material restante para evaluación Plaud es que `pre_meeting` **no** consume ACTUAL_FINANCIAL (sigue IGF abierto / FORECAST). Corresponde arquitectura/auditoría **antes** de implementar esa integración. No es IMPL. No sube Plaud por este sync.

No autorizada. No ejecutada.

STOP.
