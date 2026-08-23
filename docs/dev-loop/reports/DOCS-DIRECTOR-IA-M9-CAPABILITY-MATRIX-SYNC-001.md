# Reporte — DOCS-DIRECTOR-IA-M9-CAPABILITY-MATRIX-SYNC-001

```yaml
task_id: "DOCS-DIRECTOR-IA-M9-CAPABILITY-MATRIX-SYNC-001"
outcome: "DONE_PENDING_REVIEW"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"
  - "docs/dev-loop/reports/DOCS-DIRECTOR-IA-M9-CAPABILITY-MATRIX-SYNC-001.md"
files_not_touched:
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md"
  - "docs/director-ia/CONSTITUTION.md"
  - "server.js"
  - "lib/"
  - "frontend-dashboard/"
  - "test/"
  - "scripts/"
  - "sql/"
  - "package.json"
  - "lockfiles"
contracts_consulted:
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M9-DELTAS-READINESS-001.md"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M9-DELTAS-001.md"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "ARCH-DIRECTOR-IA-NEXT-MODULE-PRIORITIZATION-004 (propuesta; no autoriza G1 ni encadena)"
secrets_check: "none"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED."
  - "G2 = N/A (sync de inventario M9; no se redefinió arquitectura)."
  - "G3/G8 = N/A."
  - "El NEXT_TASK no está autorizado ni ejecutado."
```

## Resumen ejecutivo

M9 satisface la definición vigente de **COMPLETA/COMPLETE**. La matriz quedó sincronizada: INDIRECTA → **COMPLETA**.

Porcentaje formal M0–M20 recalculado desde las fichas vigentes: **8.0/20 = 40.0% → 8.5/20 = 42.5%**.

M9 permanece read-only. M19 permanece NO INTEGRADA. El forecast de ingreso con `DELETE`/`INSERT` permanece fuera. No se modificó código, tests ni otros contratos.

## Ejecución

- Rama: `docs/director-ia-m9-capability-matrix-sync-001` (≠ `main`).
- HEAD = `7b3e5a9801f17f1224bf594476e5dfecaa772ce1` (`Merge branch 'implementation/director-ia-m9-deltas-001'`). Ancestro verificado.
- G1 intacto: `HUMAN_APPROVER` / `2026-08-23T12:40:00-06:00`.
- Transición: `AUTHORIZED` → `IN_PROGRESS` (solo `status`) → `DONE_PENDING_REVIEW`.
- `max_attempts: 1`. Sin runtime, sin commit, push, merge ni siguiente tarea.

## Baseline

| Campo | Valor |
|---|---|
| Readiness | ARCH-DIRECTOR-IA-M9-DELTAS-READINESS-001 |
| IMPL | IMPL-DIRECTOR-IA-M9-DELTAS-001 |
| Merge en main | `7b3e5a98` |
| Estado matriz M9 (ficha) | NO INTEGRADA + nota INDIRECTA |
| Estado matriz M9 (Parte 9 + último scoring oficial) | INDIRECTA (0.5) |
| M0–M20 antes | 8.0 / 20 = 40.0% |

## Definición canónica aplicada (sin redefinir)

Parte 1 **COMPLETA** = «Director IA consulta directamente la fuente y puede responder de forma consistente dentro del alcance de esa fuente».

Reglas de la tarea aplicadas:

- COMPLETE exige las tres familias de periodos reales, no una sola.
- COMPLETE no incluye forecast con escritura, M19, weekly LD ni causalidad.
- IGF/ARR snapshot y KPIs M3 no sustituyen M9.
- Un intent/tool declarado no basta: hace falta wiring accesible desde Director IA.

## Evidencia física — Delta Venta

| Requisito | Evidencia |
|---|---|
| Intent | `delta_sales` (`lib/director-ia-planner.js`, dominio solo `delta_venta`) |
| Tool | `get_delta_sales` `available_on_demand` `readOnly: true` |
| Executor | `loadDeltaVentaForChat` |
| Fuente | `arr.ventas_diarias_cliente` (kg) |
| Wiring chat | `askDirectorIa` si `intent === "delta_sales"` **antes** de OpenAI |
| Periodos | `getPeriodosDeltaVenta` + `resolvePeriodPair` |
| Sin side effects | Módulo M9 sin `INSERT`/`UPDATE`/`DELETE`, `fetch(`, `axios` |

## Evidencia física — Delta Descuento

| Requisito | Evidencia |
|---|---|
| Intent | `delta_discount` (dominio solo `delta_descuento`) |
| Tool | `get_delta_discount` `available_on_demand` `readOnly: true` |
| Executor | `loadDeltaDescuentoForChat` |
| Fuente | `arr.descuentos_diarios_cliente` + kg de ventas ($/kg) |
| Wiring chat | `askDirectorIa` si `intent === "delta_discount"` |
| Coerción | kg=0 → ratio 0 en la fuente; no es % inventado |
| No es | weekly LD (M10), venta, ingreso |

## Evidencia física — Delta Ingreso

| Requisito | Evidencia |
|---|---|
| Intent | `delta_income` (dominio solo `delta_ingreso`) |
| Tool | `get_delta_income` `available_on_demand` `readOnly: true` |
| Executor | `loadDeltaIngresoForChat` |
| Semántica | `kg × (margen_$/kg − \|desc_$/kg\|)` vía `getDeltaIngresoDatosInternal` |
| Periodos | `getPeriodosDeltaVenta` (igual que el modal) |
| Margen IGF | Insumo de fórmula, no anexo |
| Forecast | `lib/delta-ingreso-forecast.js` líneas 332–336 (`DELETE`/`INSERT`) **no importadas** |
| M19 | `/api/ai/delta-ingreso/test/*` y `delta-ingreso-ai*` **no importados** |

## M9 vs M19

M19 permanece **NO INTEGRADA (sistema paralelo)** en su ficha. Director IA no llama el stack WhatsApp AI test. COMPLETE de M9 no integra M19.

## Forecast con escritura excluido

`lib/delta-ingreso-forecast.js` conserva `DELETE FROM arr.delta_ingreso_forecast_cliente` e `INSERT INTO arr.delta_ingreso_forecast_cliente`. El módulo M9 no lo referencia. Marcado explícitamente fuera de COMPLETE.

## Authz

- GA: 403 (`assertM9DeltasAccess`).
- GV: 403 (forecast/DICF en dashboard; no M9 COMPLETE).
- `plantas_permitidas`: GG/AD fail-closed si `planta_id` no está en la lista.
- `planta_id` ausente: 400.
- No se amplió `plantas_permitidas`. No hay cross-planta.

## Periodos

- A ≠ B; formato `YYYY-MM`.
- Dos periodos en la pregunta → se usan.
- Default = los dos más recientes de la lista existente DESC (B=`[0]`, A=`[1]`).
- <2 periodos o iguales → fail-closed; no se inventan.

## Null / base cero

- `percentChangeOrUnknown`: base 0/null/undefined o delta no finito → `null`.
- Error de fuente → `SOURCE_ERROR`; no se convierte en ceros.
- Periodos insuficientes → `DATA_NOT_FOUND`.

## HTTP interno / mutaciones

- Path in-process. Sin HTTP interno.
- `lib/director-ia-m9-deltas.js`: cero coincidencias de `INSERT`/`UPDATE`/`DELETE`/`fetch(`/`axios`.

## Tests verificados

Reportados en IMPL y **reconfirmados** en esta rama (solo lectura; tests no modificados):

| Evidencia | Resultado |
|---|---|
| `node --test test/director-ia-m9-deltas.test.js` | **23/23** |
| `node scripts/test-director-ia-capabilities.js` | **25/25** |
| `node scripts/test-director-ia-planner.js` | **30/30** |
| `node scripts/test-director-ia-tool-orchestrator.js` | **24/24** |
| `node --test test/director-ia-*.test.js` | **459/459** |
| `git diff --check` en IMPL (reporte) | limpio |
| `git diff --check` en este DOCS | limpio |

## Evaluación COMPLETE

**YES.** Las tres familias canónicas de periodos reales tienen consulta directa, autorizada y cableada en Director IA. No se reinterpretó COMPLETE para incluir forecast, M19, causalidad ni weekly LD.

## Cambios exactos en la matriz

Solo `DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md`:

1. Ficha **M9**: INDIRECTA/NO INTEGRADA → **COMPLETA**; sí/no consulta; archivos/tools/helpers; escritura forecast y M19 siguen no integradas; observaciones + scoring 40.0% → 42.5%.
2. Parte 3: fuentes Delta Venta, Delta Descuento y Delta Ingreso actualizadas a COMPLETA de periodos reales; forecast/M19 explícitamente fuera en Delta Ingreso.
3. Parte 4 #4 y #5: se eliminó el gap obsoleto «modal/endpoints no cableados»; la cobertura de esas preguntas **sigue PARCIAL** porque piden causalidad, no el COMPLETE M9.
4. Parte 9 §1, §2, §4, §6, §7 y apéndice: M9 a COMPLETA; retirado de INDIRECTA; M19 sigue en NO INTEGRADA.

No se reescribió la ficha de M0–M8 ni M10–M20. No se reescribió la historia de M3/M16. No se tocó `DIRECTOR_IA_ARCHITECTURE_INDEX.md`.

## Recálculo M0–M20

Fórmula vigente: COMPLETE=1.0, PARCIAL=0.5, INDIRECTA=0.5, NOT_STARTED/NO INTEGRADA=0.0. Denominador 20 (convención vigente del loop).

Antes de este sync, la ficha M9 decía «NO INTEGRADA» con nota INDIRECTA, pero Parte 9 y el último scoring oficial (M3) la contaban como **INDIRECTA = 0.5**, lo que reproduce **8.0/20 = 40.0%**. No se usó 0.0 para M9: eso rompería el numerador oficial vigente.

| ID | Etiqueta vigente | Puntos antes | Puntos después |
|---|---|---|---|
| M0 | PARCIAL | 0.5 | 0.5 |
| M1 | PARCIAL | 0.5 | 0.5 |
| M2 | PARCIAL | 0.5 | 0.5 |
| M3 | COMPLETA | 1.0 | 1.0 |
| M4 | NO INTEGRADA | 0.0 | 0.0 |
| M5 | NO INTEGRADA | 0.0 | 0.0 |
| M6 | NO INTEGRADA | 0.0 | 0.0 |
| M7 | PARCIAL | 0.5 | 0.5 |
| M8 | PARCIAL | 0.5 | 0.5 |
| **M9** | **INDIRECTA → COMPLETA** | **0.5** | **1.0** |
| M10 | NO INTEGRADA | 0.0 | 0.0 |
| M11 | PARCIAL | 0.5 | 0.5 |
| M12 | PARCIAL | 0.5 | 0.5 |
| M13 | COMPLETA | 1.0 | 1.0 |
| M14 | NO INTEGRADA | 0.0 | 0.0 |
| M15 | NO INTEGRADA | 0.0 | 0.0 |
| M16 | COMPLETA | 1.0 | 1.0 |
| M17 | PARCIAL | 0.5 | 0.5 |
| M18 | NO INTEGRADA | 0.0 | 0.0 |
| M19 | NO INTEGRADA | 0.0 | 0.0 |
| M20 | INDIRECTA | 0.5 | 0.5 |
| **Total** | | **8.0** | **8.5** |

**Antes: 8.0/20 = 40.0%.**  
**Después: 8.5/20 = 42.5%.**

El 42.5% no se asumió: se obtuvo del recuento anterior +0.5 por el cambio de etiqueta de M9.

## Acciones no realizadas

- No se modificó código, tests, scripts, runtime, frontend ni SQL.
- No se modificó M19 ni se marcó forecast como integrado.
- No se redefinió arquitectura.
- No commit / push / merge.
- No NEXT_TASK ejecutada ni autorizada.

## Gates

- G1: vigente, no alterado.
- G2/G3/G8: N/A (sync de inventario; el humano listó la matriz como writable).
- G5: pendiente humano.

## secrets_check

none

## git diff --check

limpio (exit 0, sin output)

## git status

Al cierre (sin commit):

```text
On branch docs/director-ia-m9-capability-matrix-sync-001
Changes not staged for commit:
  modified:   docs/dev-loop/CURRENT_TASK.md
  modified:   docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md

Untracked files:
  docs/dev-loop/reports/DOCS-DIRECTOR-IA-M9-CAPABILITY-MATRIX-SYNC-001.md
```

Solo archivos autorizados en `in_scope.writable`.

## NEXT_TASK propuesta (no autorizada)

`ARCH-DIRECTOR-IA-NEXT-MODULE-PRIORITIZATION-004`

Este reporte no es G5. No autoriza ni ejecuta esa tarea.

## STOP
