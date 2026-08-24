# Reporte — IMPL-DIRECTOR-IA-EXECUTIVE-PRIORITIZATION-001

```yaml
task_id: "IMPL-DIRECTOR-IA-EXECUTIVE-PRIORITIZATION-001"
outcome: "DONE_PENDING_REVIEW"
determination: "IMPLEMENTED"
slice: "commercial_materiality_and_coverage dentro de plant_diagnosis"
destination: "chat legado (OpenAI existente), NO Reasoning Engine oficial N5"
g2: "N/A"
g3: "N/A"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-EXECUTIVE-PRIORITIZATION-001.md"
  - "lib/director-ia-plant-diagnosis.js"
  - "test/director-ia-plant-diagnosis.test.js"
files_not_touched:
  - "lib/director-ia-chat.js"
  - "docs/director-ia/"
  - "lib/director-ia-ies-builder.js"
  - "lib/director-ia-reasoning-engine.js"
  - "lib/director-ia-financial-diagnosis.js"
  - "lib/director-ia-commercial-state.js"
  - "lib/dicf.js"
  - "server.js"
  - "frontend-dashboard/"
  - "sql/"
  - "package.json"
  - "lockfiles"
contracts_consulted:
  - "AGENTS.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-EXECUTIVE-PRIORITIZATION-READINESS-001.md"
  - "docs/director-ia/04-IES-STANDARD.md"
  - "docs/director-ia/05-REASONING-ENGINE.md"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "DOCS-DIRECTOR-IA-EXECUTIVE-PRIORITIZATION-SYNC-001"
secrets_check: "none"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED."
  - "G2/G3/G8: N/A."
  - "El NEXT_TASK no está autorizado ni ejecutado."
  - "52.5% no cambia (0.0 pp)."
```

## Resumen ejecutivo

`plant_diagnosis` ya no se queda en “hay clientes que disminuyeron”. El pack SELECT-only de `arr.dicf_cliente_mes` ahora calcula **materialidad comercial en kg homogéneos**, **concentración top-N con denominador y periodo explícitos**, y **cobertura DICF por `cliente_key`**. El prompt del chat legado puede señalar qué casos revisar primero, con magnitud y cobertura como razones separadas.

Magnitud segura única: **`kg_mes_real`**. `kg_mes_forecast − kg_mes_real` **no** se usa como venta perdida.

Global: **10.5 / 20 = 52.5%** (0.0 pp). Ningún módulo cambia de estado.

NEXT_TASK (no autorizada, no ejecutada): `DOCS-DIRECTOR-IA-EXECUTIVE-PRIORITIZATION-SYNC-001`.

---

## Ejecución

- Rama: `implementation/director-ia-executive-prioritization-001` (≠ `main`).
- HEAD al iniciar: `df7ee03e Merge branch 'architecture/director-ia-executive-prioritization-readiness-001'`.
- G1 intacto: `HUMAN_APPROVER` / `2026-08-23`. Solo se cambió `status`.
- Transición: `AUTHORIZED` → `IN_PROGRESS` → `DONE_PENDING_REVIEW`.
- `max_attempts: 1`. Sin commit, push, merge, IES, RE, matriz, contratos, server.js.
- `lib/director-ia-chat.js` no se modificó: la rama `plant_diagnosis` ya llamaba `loadPlantDiagnosisForChat`.

---

## Auditoría física (antes de codificar)

Fuente: `arr.dicf_cliente_mes` (DDL en `server.js`; productor `computeDicf` en `lib/dicf.js`). Este slice **solo SELECT**.

| Campo físico | Semántica observada | Uso en este slice |
|---|---|---|
| `kg_mes_real` | Suma de kg diarios del **mes calendario de esa fila**. Magnitud observada. | **Única magnitud de materialidad.** |
| `kg_mes_forecast` | Proyección a cierre (`real + extra`). | **No** venta perdida. No se resta contra real. Se expone como `kg_mes_forecast_not_used`. |
| `es_recuperable` | INSERT escribe `r.es_dejaron`. Flag de dejaron, no recuperabilidad económica. | Clasifica categoría `dejaron`. |
| `estado` | INSERT guarda `clientState` (Activo/Latente/…). El label UI «Dejaron de comprar»/«Disminuyeron» se deriva en el payload live, no siempre queda persistido. | Se acepta si el texto almacenado contiene «dejaron»/«disminuy». |
| `es_disminuyeron` | **No persistido.** | No se inventa. Disminuyeron solo si `estado` contiene «disminuy». |
| `kg_mes_anterior` / `ingreso_anterior` | **No persistidos.** | Para dejaron: `kg_mes_real` del **mes previo**, misma identidad `cliente_norm+canal+subcanal`. Ausencia de fila previa ≠ 0. |
| `margen_mes_kg` | Margen IGF de planta (fallback compute a `1`). | Fuera de alcance. |
| `comentario_corto` | Texto almacenado. | Si menciona competencia: declaración, no prueba causal. No se usa como causa. |

Identidad de fila para join mes previo: `normalizeKeyPart(cliente_norm|canal|subcanal)`. PK física es `(plant_code, year, month, cliente_norm)`; canal/subcanal se usan igual para no mezclar identidades.

`injectAccionesAbiertas` de `commercial_state` (join por nombre) **no** se usa. Cobertura: `buildClienteKey` + labels M11 + `arr.dicf_acciones.cliente_key` con `getPlantaIdsEquivalentes`.

---

## Comportamiento implementado

### Concentración

- Unidad: kg únicamente.
- Campo: `kg_mes_real`.
- Dejaron: magnitud = kg del **mes previo**; periodo = YYYY-MM previo; denominador = suma de kg finitos de esa categoría.
- Disminuyeron: magnitud = kg del **mes vigente**; periodo = YYYY-MM vigente.
- Top-N = 5 (empate: kg desc, luego nombre/canal/subcanal `localeCompare("es")`).
- `null` no entra al ranking ni al denominador. Motivos: `prior_month_row_absent`, `prior_month_kg_mes_real_null`, `current_month_kg_mes_real_null`.
- `share_of_observed_magnitude` y `top_n_share` son ratios sobre el denominador declarado.
- Provenance: `arr.dicf_cliente_mes`. Se preservan `cliente_key`s, magnitud, unidad, periodo, denominador.

### Cobertura DICF

- Join: `cliente_key` únicamente.
- Claves derivadas con el mismo patrón M11 (`buildClienteKey` + `Dejaron de comprar` / `Disminuyeron` / `Aumentaron` / `Nuevo` + `estado` almacenado).
- Acción abierta vs cerrada (`hecho` o `cerrado_at`).
- Vencimiento si `fecha_compromiso` < hoy CDMX y la acción no está cerrada.
- Responsable: `usuarios.nombre_persona`/`nombre` ligado a `responsable_usuario_id` de **esa** acción.
- Etiquetas runtime (no contrato): `material_without_action`, `material_with_open_action`, `material_with_overdue_action`, `material_with_action`, `coverage_unknown`.
- Sin `cliente_key` derivable: `has_dicf_action = null` (no se afirma ausencia).
- 0 acciones ≠ negligencia. Responsable de acción ≠ culpable de la caída.

### Texto al modelo

El addendum y el user prompt piden señalar primero clientes que concentran kg y su cobertura, como razones separadas. Prohibido: causalidad, score, forecast-real como pérdida, N5, MAT_*, asignar responsable, recuperar por volumen.

Si no hay explicación: el modelo puede decir que no hay evidencia suficiente y conviene validar el motivo. Si no hay responsable físico, no se inventa.

---

## Preservado

- Seis fuentes de `plant_diagnosis`.
- `commercial_state` SELECT-only; sin `computeDicf`; sin writes; sin HTTP.
- Una llamada OpenAI.
- Authz actual (abort 403; GA `SOURCE_RESTRICTED` en IGF/ARR/CS sin abortar el pack).
- Partial failures (`TOOL_ERROR` ≠ absence; `SOURCE_RESTRICTED` ≠ missing).
- `financial_diagnosis` intacto.
- Sin M9, IES, Reasoning Engine, Recommendation N5, MAT_*, trade-off recuperar/no recuperar, margen por cliente, agenda Director, before→after, daily deviations, notificaciones, persistencia nueva.

Evidencia futura (no implementada): `cliente_key`, magnitud, unidad, periodo, denominador, provenance quedan en el objeto para `explanation_of_deviations` / `evidence_gap_closure`.

---

## Tests

```text
node --test test/director-ia-plant-diagnosis.test.js     28 pass
node scripts/test-director-ia-capabilities.js            56 pass
node scripts/test-director-ia-planner.js                 49 pass
node scripts/test-director-ia-tool-orchestrator.js       26 pass
node --test test/director-ia-*.test.js                   722 pass / 0 fail
```

Focales nuevos: magnitud homogénea; forecast no es pérdida; null ≠ 0; concentración/denominador/top-N/empate; dejaron sin mes previo; `cliente_key` M11; con acción vencida + responsable de acción; sin acción; no join por nombre; coverage_unknown si no hay key; prompt sin causalidad; seis fuentes / SELECT-only / no computeDicf / no M9.

---

## Percentage

**10.5 / 20 = 52.5%.** Gain **0.0 pp.** Ningún módulo cambia de estado. Inteligencia transversal no suma 0.5.

---

## Acciones no realizadas

No IES/RE, no matriz, no contratos, no server.js, no frontend, no SQL, no commit, no push, no merge. NEXT_TASK no autorizada ni ejecutada. No trade-off económico, no M9, no writes.

## Gates

G1 intacto. G2/G3/G8 N/A.

## secrets_check

none

## git diff --check

Limpio.

## git status

```text
On branch implementation/director-ia-executive-prioritization-001
 modified: docs/dev-loop/CURRENT_TASK.md
 modified: lib/director-ia-plant-diagnosis.js
 modified: test/director-ia-plant-diagnosis.test.js
 untracked: docs/dev-loop/reports/IMPL-DIRECTOR-IA-EXECUTIVE-PRIORITIZATION-001.md
```

## NEXT_TASK

Propuesta exacta (no autoriza G1; no encadena; no ejecutar):

**DOCS-DIRECTOR-IA-EXECUTIVE-PRIORITIZATION-SYNC-001**
