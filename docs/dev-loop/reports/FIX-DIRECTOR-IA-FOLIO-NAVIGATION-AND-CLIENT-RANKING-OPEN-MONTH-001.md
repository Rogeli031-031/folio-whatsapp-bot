# FIX-DIRECTOR-IA-FOLIO-NAVIGATION-AND-CLIENT-RANKING-OPEN-MONTH-001

```yaml
task_id: "FIX-DIRECTOR-IA-FOLIO-NAVIGATION-AND-CLIENT-RANKING-OPEN-MONTH-001"
outcome: "DONE_PENDING_REVIEW"
mode: "IMPLEMENTATION"
implementation_authorized: YES
merge_authorized: NO
deploy_authorized: NO
schema_changes: false
data_mutation: false
merge: false
deploy: false
base_main_sha: "9a0a18fe70bbd2ee5b486a1a04371e70988ce229"
branch: "fix/director-ia-folio-navigation-client-ranking-open-month-001"
g1_human: "AUTHORIZED + HUMAN + AUTHORIZED_BY_HUMAN intactos; implementer no los escribió"
secrets_check: "none"
contracts_modified: []
```

## SHA / rama

- `origin/main` verificado: `9a0a18fe70bbd2ee5b486a1a04371e70988ce229` (incluye PR #39 pending-clarification)
- Rama: `fix/director-ia-folio-navigation-client-ranking-open-month-001`
- No PR. No merge. No deploy. No next task.

## Root cause — Folio navigation

`extractOrdinal` ya resolvía `abre el 10` (INDEX) y `F-######-###` (ID), pero:

1. El planner no clasificaba esas frases como `folio_search` (faltan las palabras `folios/apoyos`). Caían a `unknown`.
2. `forceIntent` de Folios solo cubría follow-ups de existencia, no navegación.
3. OPEN_FOLIO exigía `folio_result_set` previo. ID explícito sin lista no resolvía `folio_id` interno.
4. Fuera de rango (`abre el 17` con 16) no respondía bounds: caía a búsqueda o unknown.
5. Puntuación `abre . F-…` no se extraía con `\bF-` cuando el token anterior era `.`.

No se creó arquitectura paralela. Se generalizó `REFERENCE_TYPE=INDEX|ORDINAL|EXPLICIT_ID` sobre `extractOrdinal` / `selectFromDisplayedResultSet`.

## Root cause — Ranking septiembre

Auditoría de código (sin SQL vivo de ARR productivo):

| Pregunta | Evidencia |
|---|---|
| ¿Hay observado parcial por cliente? | Sí, si `arr.ventas_diarias_cliente` tiene filas del mes. Ranking ya leía esa tabla. Si está vacía, el ARR de UI **no** puede construir kg proyectado por cliente (factor = target / Σ kg real; Σ=0 → factor 0). |
| ¿Hay forecast por cliente? | No. `arr.forecast_mensual` es planta/canal/subcanal, no cliente. |
| ¿La UI proyecta cada cliente o solo el total? | Cada cliente: `kgProy = kg_observado × factor` con **factor uniforme por planta**. |
| ¿Hay materialización de venta proyectada por cliente? | No hay tabla contractual por cliente. Es cálculo en `dashboard-arr-forecast` / hoja clientes. |
| ¿Proyección por cliente defendible? | Solo si hay observado parcial **y** factor uniforme conocido. El orden se conserva (Camino C). |
| ¿upload_day/corte? | Ranking usa mes calendario. No pierde corte: no lo usa. UI usa corte como nota, no como filtro del ranking. |

Clasificación: **Camino C si hay filas observadas**; **Camino D si no hay filas**. No se inventa ranking forecast por cliente.

## Source map ARR UI vs ranking

- Observado: `arr.ventas_diarias_cliente` (ambos).
- Forecast planta: `arr.forecast_mensual`.
- Factor UI mes abierto: `targetKg(forecast_mensual o IGF) / Σ kg real clientes`.
- `venta-proyeccion-mes`: proyección de planta por DOW, no ranking por cliente.

## Semántica implementada

- Filas en mes abierto → `OBSERVED_PARTIAL` (no cierre). Si hay `uniformProjectionFactor`, se etiqueta `PROJECTED_ESTIMATE` y se declara que el orden no cambia.
- Sin filas → `NO_ROWS_OBSERVED` + `CLIENT_FORECAST_UNAVAILABLE`. Si existe último mes cerrado con filas → `LAST_SAFE_CUT` explícito (no fallback silencioso).
- Nunca se distribuye forecast total de planta.

Pending completion conserva `limit`, `metric`, `direction`, `segment`, planta.

## Result-set / ID / UI

- INDEX: `displayed_result_set[n-1]`. No reordena.
- Lista truncada a 40: no abre el 41.
- Sin lista: INDEX aclara; EXPLICIT_ID valida existencia/planta/acceso y emite `OPEN_FOLIO`.
- Wording factual. `DirectorIaChatPanel` → `onOpenFolio` → `FolioDrawer` (ya cableado).

## Tests

Nuevo `test/director-ia-folio-navigation-and-client-ranking-open-month.test.js` — 9/9:

- 50 navegación Folios
- 50 ranking
- 20 follow-ups
- 15 bounds
- 15 anti-colisiones Folios
- 15 anti-colisiones ranking
- e2e: lista → `abre el 10` = F-202602-148; `abre F-…` y `abre . F-…` sin result-set; `abre el 17` bounds; ranking `top 10` → `septiembre` conserva N=10

Regresiones: pending-clarification 7/7; backlog 15/15; folio COUNT/LIST/EXISTENCE; greeting; SEH; Expense; Folio truthful; new clients.

## Límites

- Sin conteo de filas ARR de septiembre Acapulco en DB viva.
- Proyección por cliente solo si el caller inyecta factor uniforme; no se consulta `forecast_mensual` en este slice.
- No se editó `docs/director-ia/`.

## Cierre

**DONE_PENDING_REVIEW.** Este reporte no autoriza la siguiente tarea.
