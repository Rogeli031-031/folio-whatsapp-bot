# Reporte — ARCH-DIRECTOR-IA-M4-CLASIFICACION-QUERY-READINESS-001

```yaml
task_id: "ARCH-DIRECTOR-IA-M4-CLASIFICACION-QUERY-READINESS-001"
outcome: "DONE_PENDING_REVIEW"
determination: "READY"
module: "M4 — Clasificación de apoyos + COMPARAR"
slice: "query JSON read-only mes_a vs mes_b (GASTOS / INVERSIONES / TALLER)"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M4-CLASIFICACION-QUERY-READINESS-001.md"
files_not_touched:
  - "docs/director-ia/"
  - "lib/"
  - "server.js"
  - "frontend-dashboard/"
  - "test/"
  - "scripts/"
  - "sql/"
  - "package.json"
  - "lockfiles"
contracts_consulted:
  - "AGENTS.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M4-CLASIFICACION-READINESS-001.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-002.md"
  - "lib/clasificacion-apoyos-excel.js (lectura)"
  - "lib/clasificacion-comparar.js (lectura)"
  - "server.js GET clasificacion-apoyos* / POST clasificacion-comparar* (lectura)"
  - "lib/director-ia-capabilities.js, planner, tools, chat, m6, m2-folio-status (lectura)"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "IMPL-DIRECTOR-IA-M4-CLASIFICACION-QUERY-001 (propuesta; no autoriza G1 ni encadena)"
secrets_check: "none (se vio CLASIFICACION_PRIV_CLAVE / priv_clave en server.js; no se copia)"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED."
  - "G2/G3/G8: N/A. El slice es PARTIAL previsto; no redefine COMPLETE."
  - "El NEXT_TASK no está autorizado ni ejecutado."
  - "Esta tarea no cambia M4 ni 45.0%."
```

## Resumen ejecutivo

**READY.** Existe un path SELECT-only, in-process y separable de COMPARAR/Excel para que Director IA consulte la matriz comparativa M4 (`mes_a` vs `mes_b`) por planta y familia GASTOS / INVERSIONES / TALLER, reutilizando `buildClasificacionMatrix`.

El GET de producto **sí** puede omitir `planta_id` o aceptar un id fuera de `PLANTAS_COMPARATIVO` y caer a las 6 provincias. **Director IA no debe copiar ese fallback.** Debe exigir `planta_id` autorizado, respetar `plantas_permitidas`, bloquear cross-planta y fail-closed o clarificar.

COMPARAR POSTs (`insertFolio`, `UPDATE mes_cargo` y demás writes) **no** son necesarios para producir la matriz. El xlsx **consume/formatea** la misma agregación; **no** es fuente.

Un IMPL futuro de este slice dejaría M4 en **PARTIAL** y el global en **9.5 / 20 = 47.5%**. COMPLETE sigue exigiendo COMPARAR/Excel. Esta readiness: **0.0 pp**.

NEXT_TASK (no autorizada): `IMPL-DIRECTOR-IA-M4-CLASIFICACION-QUERY-001`.

---

## Ejecución

- Rama: `architecture/director-ia-m4-clasificacion-query-readiness-001` (≠ `main`).
- HEAD: `ee0139bc Merge branch 'architecture/director-ia-global-next-module-prioritization-002'`.
- G1 intacto: `HUMAN_APPROVER` / `2026-08-23`. Solo se cambió `status`.
- Transición: `AUTHORIZED` → `IN_PROGRESS` → `DONE_PENDING_REVIEW`.
- `max_attempts: 1`. Sin implementación, matriz, código, commit, push, merge.

---

## Baseline

| Campo | Valor |
|---|---|
| Priorización | `ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-002` (ganador M4 query) |
| Readiness previa | `ARCH-DIRECTOR-IA-M4-CLASIFICACION-READINESS-001` → PARTIAL_ONLY (fuente; no wiring post-M6) |
| Módulo | M4 — Clasificación de apoyos + COMPARAR |
| Estado actual | **NO INTEGRADA** |
| Global actual | **9.0 / 20 = 45.0%** |
| Si IMPL futuro | M4 **PARTIAL**; **9.5 / 20 = 47.5%** (+2.5) |
| COMPLETE | Sigue exigiendo COMPARAR + reconciliación Excel |

Esta tarea **no** cambia estado ni porcentaje.

---

## Definición canónica M4

Fuente: ficha M4 + Parte 2 de `DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md`.

| Campo | Texto vigente |
|---|---|
| ID / nombre | M4 — **Clasificación de apoyos + COMPARAR** |
| Propósito | Comparativo mensual por planta/categoría; **reconciliación Excel** |
| Cobertura | NO INTEGRADA — «Ninguna» |
| No consulta | Matrices, Excel, inspección/comparar/agregar/rechazar |
| Lectura posible | CONSULTAR / COMPARAR / RESUMIR (tipo de capacidad; no cableadas) |
| Escritura | Actualizar/agregar folios vía comparar — ALTO; no en Director IA |
| Tablas | Lectura/escritura `public.folios` (sin `clasificacion_*`) |

**COMPARAR** (tipo de lectura Parte 1) ≠ **COMPARAR** (flujo POST que puede escribir folios). Este slice es el primero: **query de matriz**. No el segundo.

Query-only = **PARTIAL**. No se reinterpreta COMPLETE.

---

## Source / `buildClasificacionMatrix`

### GET `/api/dashboard/clasificacion-apoyos` (`server.js` 6519–6558)

| Campo | Evidencia |
|---|---|
| Auth | `dashboardAuthMiddleware` + `dashboardBlockGVForbidden` |
| Periodos | `mes_a`, `mes_b` query; regex `YYYY-MM`; ambos obligatorios; `mes_a === mes_b` → 400; **sin default** |
| Planta | `planta_id` **opcional** → `resolvePlantasComparativo` |
| SQL | `SELECT f.planta_id, f.categoria, f.importe, f.mes_cargo FROM public.folios f` |
| Filtros | `mes_cargo = ANY($1)`; `estatus <> CANCELADO`; `planta_id IS NOT NULL`; `planta_id = ANY($2)` |
| Privados | sin `priv_clave` válida: `solo_zp_ad = false`. Con clave: incluye privados |
| Side effects | **Ninguno.** SELECT + helper. Sin INSERT/UPDATE/DELETE |
| Respuesta | `{ ok: true, ...matrix }` |

`GET /clasificacion-apoyos/detalle` (6564–6636): SELECT-only de una celda. **Fuera del primer slice.** No es necesario para afirmar A vs B agregados.

### Helper `buildClasificacionMatrix` (`lib/clasificacion-apoyos-excel.js` 89–167)

Función **pura**, exportada (2075). Recibe filas + `mesA` + `mesB` + `{ plantaId }`.

1. Resuelve plantas vía `resolvePlantasComparativo(options.plantaId)`.
2. Descarta filas cuyo `mes_cargo` no es A ni B.
3. Descarta `planta_id` fuera del grupo canónico.
4. `normalizeCat` → GASTOS / INVERSIONES / TALLER; el resto se descarta.
5. `importe` no finito (null/NaN) se **omite** (no entra a la suma).
6. Celda ausente → `0` (`val()` usa `|| 0`). Round MXN.

**Shape:**

```text
{
  mes_a, mes_b, mes_a_label, mes_b_label, vs_label,
  planta_filtro,
  plantas: [{ key, label, ids, a: {gastos,inversiones,taller,total}, b: {...}, diff }],
  totales: { a, b, diff },
  diffs_categoria: { gastos, inversiones, taller, total }
}
```

`diff` / `diffs_categoria` = **A − B** (absoluto). **No hay porcentaje** en el helper.

### SQL real

No hay vista `clasificacion_*`. Fuente física: `public.folios` columnas `planta_id`, `categoria`, `importe`, `mes_cargo`, más `estatus` y `solo_zp_ad` en el WHERE.

### `PLANTAS_COMPARATIVO` (L9–16)

| label | ids |
|---|---|
| Puebla | 2, 14 |
| Tehuacán | 3, 15 |
| Acapulco | 1, 11, 12 |
| Querétaro | 4, 16 |
| San Luis Potosí | **5, 17, 18** |
| Morelos | 6, 13 |

`resolvePlantasComparativo` (22–28):

- `plantaId` null/vacío/no numérico → **las 6 provincias**.
- id en algún grupo → **solo ese grupo**.
- id **fuera** de la lista → **otra vez las 6** (fallback global).

Ese fallback es el punto crítico. El GET lo copia. Director IA **no**.

Discrepancia vs M3/M6 `getPlantaIdsEquivalentesForPendientes`: SLP M3 es `5+18` y `17` aislado; M4 agrupa `5+17+18`. El slice M4 debe usar **`PLANTAS_COMPARATIVO`**, no el mapa M3. Planta 7 no está en M4 → fail-closed (el GET la convertiría en las 6).

---

## Period semantics

| Regla | Producto (GET) | Director IA (obligatorio) |
|---|---|---|
| `mes_a` | obligatorio YYYY-MM | igual; no inventar |
| `mes_b` | obligatorio YYYY-MM | igual; no inventar |
| A ≠ B | 400 si iguales | igual |
| Default | no hay | no hay |
| Mes inválido | 400 (`\d{4}-\d{2}`) | más estricto: mes 01–12 (patrón M6) |
| Un solo mes en la pregunta | GET no aplica | clarificación / 400 |
| 0 filas | matriz de ceros | respuesta válida, no error |

No inventar periodo desde “este mes” / “el anterior”.

---

## Familias

`normalizeCat` (55–62):

| Entrada | Familia |
|---|---|
| `GASTOS` o contiene `GASTO` | GASTOS |
| `INVERSIONES` o contiene `INVERSION` | INVERSIONES |
| `TALLER` exacto | TALLER |
| vacío / otra | `null` (descartada) |

La matriz **mantiene las tres separadas** en `a`/`b` y en `diffs_categoria`.

Métricas: suma de `f.importe` (no `expandCategoriaRows`). Totales = GASTOS+INVERSIONES+TALLER.

Director IA **puede afirmar**: valor A, valor B, delta absoluto, qué familia mueve el total **observado**.

**No** afirmar: causa, cumplimiento, desviación presupuestal, problema, mejora, responsable, ni igualdad con totales M6 (helper distinto). Celda TALLER ≠ M5 Taller por AT. «cómo van los gastos» sigue M7.

---

## Comparison semantics

| Hecho | Significado permitido |
|---|---|
| `valor_a`, `valor_b` | Sumas observadas de folios no cancelados en ese mes/familia/grupo |
| `delta = A − B` | Diferencia observada. A > B = el mes izquierdo es mayor |
| % | **No existe en la fuente.** No inventar. Base cero → unknown |
| Ausencia de filas | 0 en la celda de matriz (coalesce del helper) |
| `importe` null | no entra a la suma; no es 0 de línea |
| Cero | no demuestra «no existe el concepto»; demuestra suma vacía/omitida en esa celda |

Reglas:

- comparación ≠ explicación causal
- delta ≠ desviación presupuestal
- aumento ≠ problema
- disminución ≠ mejora
- no inventar baseline distinto de `mes_a`/`mes_b`

---

## Plant scope y fallback global

| Superficie | Comportamiento |
|---|---|
| GET dashboard | `planta_id` opcional; fuera de lista → 6 provincias; **no** revisa `plantas_permitidas` |
| Grupo canónico | un `planta_id` válido expande a su grupo (Acapulco → 1,11,12). Eso es semántica de producto, **no** el fallback global |
| Fallback inseguro | omitir id **o** id desconocido (p. ej. 7) → todas las provincias |

**Director IA (más estricto que el GET):**

1. `planta_id` obligatorio del scope (`requirePlantaId`).
2. `assertFolioStatusAccess` (GV 403; GG/GA/AD + `plantas_permitidas` → 403 si no incluye la planta).
3. Resolver grupo **solo** si el id está en `PLANTAS_COMPARATIVO`. Si no: fail-closed / clarificación. **Nunca** devolver las 6.
4. Intersectar ids del grupo con `plantas_permitidas` cuando el rol las trae.
5. Si la intersección ≠ grupo completo: **fail-closed o clarificación**. No emitir en silencio un «Acapulco» distinto al dashboard.
6. Cross-planta pedido explícito: 403.
7. No HTTP interno al GET (el GET reintroduce el fallback).

Grupo canónico ≠ fallback global. El primero se usa **después** de authz; el segundo está prohibido.

---

## Authz

| Control | GET dashboard | Director IA (slice) |
|---|---|---|
| JWT / contexto | sí | sí |
| GV | 403 | 403 (`assertFolioStatusAccess` / mismo bloqueo) |
| GA | lectura permitida | permitida **en planta autorizada** (patrón M6; no el bloqueo GA de KPIs IGF) |
| `planta_id` | opcional | **obligatorio** |
| `plantas_permitidas` | **no** | **sí** |
| Cross-planta | posible vía fallback | bloqueado |
| `priv_clave` / `solo_zp_ad` | query opcional | **fail-closed sin clave de chat**; no ampliar privados; no aceptar `priv_clave` del usuario |
| Fail-closed | no (fallback) | sí |

---

## Planner / tools / capabilities

| Pieza | Estado físico |
|---|---|
| Capability `clasificacion_apoyos` | `coverage: none`, `canRead: false`, `canWrite: false`. Texto: «Matrices y comparación Excel» |
| `UNSUPPORTED_RULES.clasificacion_apoyos` | Bloquea «clasificación de apoyos» / «comparar clasificación» → `SOURCE_NOT_INTEGRATED` |
| Chat | `detectUnsupportedDirectorIaDomain` corre **antes** del planner (L2477). Hoy corta el slice |
| Planner | **Cero** intents `clasificacion*` (`byDomain` no mapea `clasificacion_apoyos`) |
| Tools | **Cero** `get_clasificacion*`. `get_expense_analysis` / `get_investment_analysis` = M6. `get_taller_at_analysis` = M5 stub. `get_budget_status` = M18 stub |
| Executor | null |

Falta (wiring, no contrato):

- recortar `UNSUPPORTED_RULES` **solo** para lectura de matriz (no habilitar COMPARAR write)
- intent nuevo p. ej. `clasificacion_apoyos_query` (no reusar `expense_analysis` / `investment_analysis` / `taller_at`)
- tool read-only + executor `loadClasificacionApoyosForChat`
- rama chat in-process **después** de retirar el gate, **antes** de OpenAI
- capability `canRead: true`, coverage partial, limitaciones: no Excel, no COMPARAR, no COMPLETE

Sin colisión si el intent es propio. Colisión si se despacha M6 o M5.

---

## COMPARAR boundary

| Ruta | Método | ¿Write? | ¿Necesaria para la matriz? |
|---|---|---|---|
| `/clasificacion-comparar/inspeccionar` | POST | no (parsea Excel) | **no** |
| `/clasificacion-comparar` | POST | no (exige `fileBase64`; diffs vs Excel) | **no** |
| `/clasificacion-comparar/agregar` | POST | **sí** `insertFolio` + `UPDATE mes_cargo` (6232–6233) | **no** |
| `/clasificacion-comparar/rechazar` | POST | **sí** `UPDATE mes_cargo = NULL` | **no** |
| `/clasificacion-comparar/confirmar-mismo` | POST | **sí** UPDATE `mes_cargo` / estatus | **no** |
| `/clasificacion-comparar/son-distintos` | POST | **sí** `insertFolio` + UPDATE | **no** |

`lib/clasificacion-comparar.js`: parser/compare en memoria. **No** SQL de mutación. Las writes están en `server.js`.

**Confirmado:** ningún POST COMPARAR, `insertFolio` ni `UPDATE mes_cargo` es necesario para `buildClasificacionMatrix`. Quedan **fuera** del slice. Clase C. No cablear.

---

## Excel boundary

| Pieza | Rol |
|---|---|
| `GET /clasificacion-apoyos-excel` (5592+) | Workbook xlsx; mismos `mes_a`/`mes_b`/`planta_id`/`priv_clave`; **mismo** `resolvePlantasComparativo` |
| `buildClasificacionApoyosWorkbook` | Formatea; hoja COMPARATIVOS = misma suma que la matriz; **añade** hojas de detalle + Movimientos |
| Fuente primaria | `public.folios` + `buildClasificacionMatrix`, no el xlsx |

**Confirmado:** el xlsx consume/formatea la matriz; **no** es fuente necesaria. Fuera del slice. No `buildClasificacionApoyosWorkbook`. No HTTP al GET excel.

---

## Evidence table

| surface | helper_or_route | physical_source | query_type | select_only | side_effects | period_rules | category_rules | authz | plant_scope | safe_fields | reusable | risk | evidence |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Matriz JSON | GET `clasificacion-apoyos` + `buildClasificacionMatrix` | `public.folios` | SELECT | **sí** | no | A≠B YYYY-MM obligatorios | GASTOS/INV/TALLER vía `normalizeCat` | JWT+GV; priv opcional; sin `plantas_permitidas` | opcional; fallback 6 | mes, planta, a/b, diffs absolutos | **sí** (helper puro) | fallback global; ≠ M6 | L6520; L89–167 |
| Detalle celda | GET `.../detalle` | `public.folios` | SELECT | sí | no | un `mes` | una familia o TOTAL | igual | label de `PLANTAS_COMPARATIVO` | folios[] / importe null | opcional 2º slice | bajo | L6564 |
| Excel | GET excel + `buildClasificacionApoyosWorkbook` | folios (+ historial en hojas extra) | SELECT + xlsx | lectura sí | export archivo | igual A≠B | igual + detalle | igual + priv | mismo fallback | no cablear | no como fuente | Excel | L5592; L175 |
| COMPARAR inspect/diff | POST comparar* | Excel + folios | POST | inspect/diff sí | no write | `mes_cargo` | hojas Excel | GV; fileBase64 | hojas | no | no | semántica «COMPARAR» | L6023–6154 |
| COMPARAR write | POST agregar/rechazar/confirmar/son-distintos | `public.folios` | INSERT/UPDATE | **no** | **writes** | `mes_cargo` | item | `acceso_crear_folios` / GA 403 | item.planta_id | prohibido | no | **C** | L6166–6512 |

---

## Gap table

| gap_id | missing_capability | required_for_query_slice | reusable_component | proposed_change | architecture_change | contract_change | authz_change | complexity | blocking |
|---|---|---|---|---|---|---|---|---|---|
| G-SRC | — | no | `buildClasificacionMatrix` + SELECT | reutilizar in-process | no | no | no | bajo | no |
| G-FALL | no copiar fallback 6 plantas | **sí** | `PLANTAS_COMPARATIVO` + fail-closed | no llamar `resolvePlantasComparativo` a ciegas | no | no | más restrictivo que GET | bajo | no (preservable) |
| G-AUTH | `plantas_permitidas` + intersección de grupo | **sí** | `assertFolioStatusAccess` / `requirePlantaId` | patrón M6 | no | no | sí (endurecer) | bajo | no |
| G-INT | intent/tool/executor/chat | **sí** | capability id existente | intent `clasificacion_apoyos_query` + loader + rama chat | no | no | no | medio | no |
| G-UNSUP | gate `SOURCE_NOT_INTEGRATED` | **sí** | `UNSUPPORTED_RULES` | recortar solo lectura; no COMPARAR write | no | no | no | bajo | no |
| G-SEM | no chocar M6/M5/M7 | **sí** | reglas chat | no reusar `expense_analysis` / `taller_at`; no IGF | no | no | no | bajo | no |
| G-DET | detalle de celda | no | GET detalle | fuera del primer slice | no | no | no | — | no |
| G-XLS | Excel | no | workbook | **no integrar** | no | no | no | — | no |
| G-CMP | COMPARAR writes | no | POSTs | **prohibido** | no | no | C | — | no para query |
| G-CMPL | COMPLETE M4 | no | propósito canónico | **no declarar** | — | reinterpretaría | — | — | no (fuera) |

Ningún gap bloquea READY. Los requeridos son wiring + authz más estricta, no contrato nuevo.

---

## Implementation hypothesis

```text
pregunta clasificación / comparativo de apoyos + mes_a + mes_b
  → UNSUPPORTED ya no corta la lectura JSON
  → intent clasificacion_apoyos_query
  → tool get_clasificacion_apoyos_query (readOnly)
  → executor loadClasificacionApoyosForChat(mes_a, mes_b, planta_id)
       → JWT/contexto
       → requirePlantaId + assertFolioStatusAccess
       → planta en PLANTAS_COMPARATIVO (si no: fail-closed / clarificación)
       → intersección plantas_permitidas (si incompleta: fail-closed / clarificación)
       → YYYY-MM A≠B extraídos de la pregunta; no inventar
       → SELECT public.folios (mismo predicado que el GET, ids ya restringidos)
       → buildClasificacionMatrix(rows, mes_a, mes_b, { plantaId })
       → privados excluidos (sin priv_clave de chat)
  → evidencia: planta, mes_a, mes_b, familias, valor_a, valor_b, delta absoluto, source
  → openai_called false
```

In-process. Sin HTTP interno. Sin COMPARAR. Sin Excel. Sin writes. Sin contrato nuevo.

Campos seguros: `planta_id`, label del grupo, `mes_a`/`mes_b`, familia, `valor_a`/`valor_b`, `delta`, `source=public.folios` + helper.

Prohibido en respuesta: causa, responsable, desviación presupuestal, cumplimiento, recomendación automática, «ya reconciliado», % inventado, afirmaciones COMPARAR/Excel.

### Archivos que tocaría un IMPL (no tocados ahora)

| Archivo | Cambio probable |
|---|---|
| `lib/director-ia-m4-clasificacion.js` (nuevo) | loader SELECT + `buildClasificacionMatrix` + authz estricta |
| `lib/director-ia-chat.js` | rama intent; no OpenAI |
| `lib/director-ia-planner.js` | intent `clasificacion_apoyos_query` |
| `lib/director-ia-tools.js` | tool read-only + executor |
| `lib/director-ia-capabilities.js` | `canRead`/coverage PARCIAL; recortar UNSUPPORTED de lectura |
| `server.js` | **no** reusar GET HTTP; no COMPARAR |
| `test/director-ia-m4-*.test.js` (nuevo) | tests del slice |
| Matriz | **no** en el IMPL de código; sync documental aparte si el humano lo autoriza |

---

## Tests a diseñar (si IMPL)

No hay `test/*clasificacion*` hoy.

- `mes_a` vs `mes_b`; YYYY-MM inválido; `mes_a` ausente; `mes_b` ausente; A == B
- GASTOS / INVERSIONES / TALLER separados
- delta positivo; delta negativo
- base cero → no inventar %
- ausencia / 0 filas = matriz de ceros
- `importe` null no se vuelve 0 de línea
- planta autorizada; no autorizada; `plantas_permitidas`; cross-planta
- planta fuera de `PLANTAS_COMPARATIVO` → **no** 6 provincias
- `planta_id` omitido → 400 / clarificación
- grupo incompleto vs `plantas_permitidas` → fail-closed / clarificación
- GA permitido en planta; GV 403
- intent/tool/executor/chat wiring
- no COMPARAR; no Excel; no HTTP interno; sin writes
- no despachar M6 ni M5 ni M7
- M4 sigue PARTIAL (no test de COMPLETE)

---

## Gates

| Gate | ¿Requerido? | Nota |
|---|---|---|
| G2 | **N/A** | Wiring de lectura PARTIAL prevista. No redefine M4. |
| G3 | **N/A** | No hace falta contrato nuevo. |
| G8 | **N/A** | |
| G1 del IMPL | sí, humano, tarea aparte | Esta tarea no lo autoriza. |

Cycle: no.

---

## State / percentage after future slice

| | Esta readiness | Tras IMPL futuro (si se autoriza y pasa) |
|---|---|---|
| M4 | NO INTEGRADA | **PARTIAL** |
| Global | **9.0 / 20 = 45.0%** | **9.5 / 20 = 47.5%** |
| COMPLETE M4 | no | **sigue fuera** (COMPARAR/Excel) |

---

## Riesgos

- Copiar `resolvePlantasComparativo` y filtrar 6 provincias.
- Usar mapa M3 (SLP 17) en vez de `PLANTAS_COMPARATIVO`.
- Igualar totales M4 a M6 (`importe`+`normalizeCat` ≠ `expandCategoriaRows`).
- Tratar celda TALLER como M5 o como AR «Taller».
- Inventar % o causa a partir del delta.
- Inventar `mes_a`/`mes_b`.
- Aceptar `priv_clave` desde el chat.
- Cablear COMPARAR write o xlsx.
- Declarar COMPLETE o +5.0.
- Dejar `UNSUPPORTED_RULES` intacto (el chat cortaría el slice).

Dependencias del IMPL: `public.folios`, `buildClasificacionMatrix`, `PLANTAS_COMPARATIVO`, JWT. Sin S3, Twilio, migration.

---

## Decisión READY

| Criterio `ready` | ¿Cumple? |
|---|---|
| `buildClasificacionMatrix` reutilizable | **sí** (pura, exportada) |
| fuente SELECT-only | **sí** |
| `mes_a`/`mes_b` claros | **sí** |
| familias claras | **sí** |
| scope planta preservable | **sí** (más estricto que GET) |
| authz preservable | **sí** (patrón M6) |
| fallback global evitable | **sí** (fail-closed / clarificación) |
| COMPARAR separable | **sí** (writes no alimentan la matriz) |
| Excel separable | **sí** (formatea; no es fuente) |
| path in-process posible | **sí** |
| tests determinísticos | **sí** |

STOPPED no aplica: la matriz no depende de writes; el scope inseguro del GET es evitable. BLOCKED no aplica: no falta gate para *esta* auditoría.

---

## NEXT_TASK (una, no autorizada)

**`IMPL-DIRECTOR-IA-M4-CLASIFICACION-QUERY-001`**

Primer slice: query JSON `mes_a` vs `mes_b`, una planta/grupo canónico autorizado, `buildClasificacionMatrix`, SELECT-only. No COMPARAR. No Excel. No COMPLETE. No sync de matriz dentro del IMPL salvo que el humano lo pida en otra tarea.

---

## Acciones no realizadas

- No se implementó nada. No código, tests, runtime, frontend, SQL, matriz, contratos.
- No se ejecutó COMPARAR ni se generó Excel ni se escribieron folios.
- No commit / push / merge.
- No se autorizó ni ejecutó NEXT_TASK.
- 45.0% y M4 NO INTEGRADA no cambian.

## secrets_check

none en el reporte. `CLASIFICACION_PRIV_CLAVE` / `priv_clave` existen en `server.js`; no se reproducen.

## git diff --check

limpio (exit 0)

## git status

Al cierre (sin commit):

```text
On branch architecture/director-ia-m4-clasificacion-query-readiness-001
Changes not staged for commit:
  modified:   docs/dev-loop/CURRENT_TASK.md

Untracked files:
  docs/dev-loop/reports/ARCH-DIRECTOR-IA-M4-CLASIFICACION-QUERY-READINESS-001.md
```

Solo los dos archivos autorizados.

## STOP
