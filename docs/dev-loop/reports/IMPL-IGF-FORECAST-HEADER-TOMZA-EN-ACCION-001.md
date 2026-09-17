# IMPL-IGF-FORECAST-HEADER-TOMZA-EN-ACCION-001

```yaml
task_id: "IMPL-IGF-FORECAST-HEADER-TOMZA-EN-ACCION-001"
outcome: "DONE"
mode: "IMPLEMENTATION"
implementation: true
code_changes: true
schema_changes: false
data_mutation: false
new_tables: false
new_indexes: false
merge: false
deploy: false
reference_main: "8863f60a897e9025d4227d24ed84f3c1e4aad718"
branch: "implementation/igf-forecast-header-tomza-en-accion-001"
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
human_decision_needed: "Revisar. Este agente no mergea, no abre PR, no despliega y no abre la siguiente tarea."
```

## 1. Estado final

**DONE_PENDING_REVIEW.**

Primera franja de IGF Forecast: EVIDENCIAS junto a PLAN MAESTRO; branding **Tomza en Acción** centrado en el espacio restante (sin overlap); KPI Financieros a la derecha. Corrección de review aplicada.

## 2. SHA base

`origin/main` = `8863f60a897e9025d4227d24ed84f3c1e4aad718`

## 3. Rama

`implementation/igf-forecast-header-tomza-en-accion-001`

## 4. Archivo(s) modificados

- `frontend-dashboard/components/IgfForecastClient.tsx` — solo la primera franja (~790–827)
- `docs/dev-loop/CURRENT_TASK.md`
- `docs/dev-loop/reports/IMPL-IGF-FORECAST-HEADER-TOMZA-EN-ACCION-001.md`

No se tocaron backend, APIs, rutas, cálculos IGF, segunda fila ni handlers de Plan Maestro / Evidencias / KPI.

## 5. Layout anterior

Flex + `flex-wrap`:

- IZQUIERDA: `IGF Forecast` + `PLAN MAESTRO`
- CENTRO (`flex-1 justify-center`): `EVIDENCIAS`
- DERECHA: `← KPI Financieros`

El centro era el espacio sobrante, no el centro geométrico del header.

## 6. Layout nuevo

Grid de tres tracks físicos `auto / minmax(0,1fr) / auto`:

- IZQUIERDA (`auto`): `IGF Forecast` + `PLAN MAESTRO` + `EVIDENCIAS`
- CENTRO (`1fr`): `Tomza` blanco + `en Acción` `text-amber-300 italic`
- DERECHA (`auto`): `← KPI Financieros`

Una sola línea en desktop. Segunda fila intacta.

## 7. Estrategia de centrado (corrección de review)

Review humana: el grid `1fr / auto / 1fr` no reservaba el ancho real del bloque izquierdo y arriesgaba overlap EVIDENCIAS / branding.

Layout corregido: `grid-cols-[auto_minmax(0,1fr)_auto]`.

- IZQUIERDA `auto`: ancho real de IGF Forecast + PLAN MAESTRO + EVIDENCIAS (`flex-nowrap`)
- CENTRO `minmax(0,1fr)`: espacio restante; branding centrado **dentro de ese hueco** (`min-w-0`, `px-4`)
- DERECHA `auto`: ancho real de KPI Financieros

El título puede quedar ligeramente a la derecha del centro geométrico. Es aceptable. Prioridad: **cero superposición**.

## 8. Estrategia responsive

- `font-size: clamp(0.8rem, 1.8vw, 2rem)`
- `white-space: nowrap`
- `px-4` en el track central
- Cluster izquierdo `flex-nowrap`
- Reduce el branding antes que permitir overlap
- Sin fuentes externas; botones y handlers sin cambio

## 9. Validación desktop / responsive

Medición `getBoundingClientRect` del layout corregido (preview de tracks equivalentes):

| Ancho | gap EVIDENCIAS → branding | gap branding → KPI | nowrap | overlap |
|---|---|---|---|---|
| 1700px | 530px | 530px | sí | no |
| 1366px | 363px | 363px | sí | no |
| 1024px | 192px | 192px | sí | no |

Separación inequívoca en los tres anchos. `npx tsc --noEmit` y `npx next build` repetidos: **pass**.

`/igf-forecast` sin token sigue en acceso no autorizado (esperado). Validación autenticada en producción queda para revisión humana.

## 10. Build/test

```
npx tsc --noEmit   → 0 (tras corrección de review)
npx next build     → Compiled successfully (tras corrección de review)
```

## 11. Limitaciones

- Sin token no se ve PLAN MAESTRO / EVIDENCIAS en `/igf-forecast` local.
- El branding ya no está en el centro geométrico del header; se centra en el espacio restante.
- No se añadió fuente corporativa nueva.

## 12. Diff conceptual

Antes (primer commit): grid simétrico `1fr / auto / 1fr` → riesgo de overlap.
Ahora (review): `auto / 1fr / auto` → laterales con ancho real, branding en el hueco, cero overlap.

## 13–16. Confirmaciones

- `schema_changes=false`
- `data_mutation=false`
- `merge=false`
- `deploy=false`

## 17. Corrección de review

Aplicada en la misma tarea y la misma rama. `CURRENT_TASK` permanece `DONE_PENDING_REVIEW`.

## 18. STOP

Fin de la corrección de review. Espera revisión humana.

NO PR. NO merge. NO deploy. NO siguiente tarea.
