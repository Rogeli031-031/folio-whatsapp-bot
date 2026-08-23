# Reporte — ARCH-DIRECTOR-IA-M6-GASTOS-INVERSIONES-READINESS-001

```yaml
task_id: "ARCH-DIRECTOR-IA-M6-GASTOS-INVERSIONES-READINESS-001"
outcome: "DONE_PENDING_REVIEW"
determination: "SAFE_SELECT_ONLY_PATH"
slice_label: "PARTIAL"
complete: false
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M6-GASTOS-INVERSIONES-READINESS-001.md"
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
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-001.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-NEXT-MODULE-PRIORITIZATION-005.md"
  - "lib/categoria-rango-excel.js (lectura)"
  - "server.js GET /api/dashboard/categoria-rango-excel (lectura)"
  - "lib/director-ia-planner.js, tools, capabilities, chat, igf-arr (lectura)"
  - "lib/director-ia-m2-folio-status.js (lectura authz)"
  - "lib/director-ia-m3-plantas-kpis-proyectos.js (lectura: no reutilizar bloqueo GA de KPIs)"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "IMPL-DIRECTOR-IA-M6-GASTOS-INVERSIONES-001 (propuesta; no autoriza G1 ni encadena)"
secrets_check: "none (se vio CLASIFICACION_PRIV_CLAVE / priv_clave; no se copia)"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED."
  - "G2/G3 de esta auditoría: no. El IMPL propuesto tampoco exige G2/G3."
  - "El NEXT_TASK no está autorizado ni ejecutado."
  - "Esta readiness no cambia M6 ni 42.5%."
  - "Si el IMPL se autoriza después: M6 → PARTIAL; 9.0/20 = 45.0%. COMPLETE de M6 sigue fuera."
```

## Resumen ejecutivo

**Existe path SELECT-only e in-process seguro** para un slice **query JSON** de GASTOS e INVERSIONES. Conclusión **READY**. El slice es **PARTIAL**, no COMPLETE.

La fuente estructurada **existe antes del Excel**: `SELECT` sobre `public.folios` + `expandCategoriaRows`. `buildCategoriaRangoWorkbook` solo formatea xlsx. **No** usar Excel como transporte. **No** HTTP interno. **No** generar archivo.

GASTOS ≠ INVERSIONES ≠ IGF. Intents y tools ya existen (`executor: null`). La colisión «gastos» → IGF se resuelve con reglas de routing **ya presentes** (planner + `PLANT_FINANCIAL_KPI_RE`); no hace falta contrato nuevo ni degradar M7.

Esta tarea **no cambia** 8.5/20 = **42.5%**.

NEXT_TASK (no autorizada): `IMPL-DIRECTOR-IA-M6-GASTOS-INVERSIONES-001`.

---

## Ejecución

- Rama: `architecture/director-ia-m6-gastos-inversiones-readiness-001` (≠ `main`).
- HEAD: `a2d2cd5d Merge branch 'architecture/director-ia-global-next-module-prioritization-001'`.
- G1 intacto: `HUMAN_APPROVER` / `2026-08-23`. Solo se cambió `status`.
- Transición: `AUTHORIZED` → `IN_PROGRESS` → `DONE_PENDING_REVIEW`.
- `max_attempts: 1`. Sin implementación. Sin matriz. Sin xlsx. Sin writes.

---

## Baseline

| Campo | Valor |
|---|---|
| Priorización | ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-001; ganador M6 query JSON |
| M6 hoy | NO INTEGRADA |
| M0–M20 hoy | 8.5 / 20 = **42.5%** |
| Tras IMPL futuro (si se autoriza) | M6 **PARTIAL**; **9.0 / 20 = 45.0%** (+2.5) |
| Esta readiness | **0.0 pp**; M6 no cambia |

---

## Definición canónica M6 / query-only = PARTIAL

Ficha vigente: módulo **«GASTOS / INVERSIONES Excel»**; propósito **«Export por categoría y ventana de meses»**.

| Hecho | Consecuencia |
|---|---|
| COMPLETE canónico incluye Export/xlsx | Un slice JSON **no** es COMPLETE |
| Parte 4 #15/#16 | Hoy NO INTEGRADA |
| 005 / priorización global | Query = PARTIAL; +5.0 rechazado |

**No se reinterpreta COMPLETE.** G2/G3 no aplican.

---

## Backend / source

`GET /api/dashboard/categoria-rango-excel` (`server.js` 5908–6017):

1. Auth JWT + `dashboardBlockGVForbidden`.
2. `categoria` ∈ {`GASTOS`,`INVERSIONES`} o 400.
3. `mes_desde` / `mes_hasta` obligatorios `YYYY-MM` o 400. Si vienen invertidos, se intercambian. **No hay default.**
4. `planta_id` **opcional** en el GET (sin él, todas las plantas del `buildDashboardWhere`). Director IA **debe exigir** `planta_id` del chat.
5. `SELECT` de `public.folios` (id, numero_folio, beneficiario, subcategoria, concepto, importe, detalle_lineas, mes_cargo, estatus) + `buildDashboardWhere` + filtros de categoría/`mes_cargo`/no `CANCELADO`.
6. **Después:** `buildCategoriaRangoWorkbook` → buffer xlsx.

Paso 5 es la fuente. Paso 6 es presentación. Excel **no** es inseparable.

`expandCategoriaRows` (`lib/categoria-rango-excel.js` 98–154) ya está exportado. Opera sobre filas SQL, **antes** del workbook.

No importar `server.js`. El IMPL copia el SELECT (patrón M2/M9).

---

## Helpers

| Función | ¿SELECT / datos? | ¿Excel? | ¿Reutilizar? |
|---|---|---|---|
| Query en GET (L5977–5991) | sí | no | copiar al loader |
| `expandCategoriaRows` | sí (explota `detalle_lineas` o cae a `importe`/`concepto`) | no | sí |
| `monthsDescending` / `formatMesLabel` | utilidades de ventana | no | opcional |
| `buildCategoriaRangoWorkbook` | no | **sí** | **no** |
| Hoja Duplicados del xlsx | heurística beneficiario+concepto+importe | sí | **no** (≠ M16) |

`importe === 0` se omite en expand. Concepto de línea vacío se omite. Subcategoría vacía se etiqueta `SIN SUBCATEGORÍA` (mismo default del Excel; no es una partida inventada).

---

## GASTOS vs INVERSIONES

Filtros físicos del GET (una categoría por request; **no mezclar**):

| Categoría | Predicado |
|---|---|
| INVERSIONES | `categoria = 'INVERSIONES'` OR `LIKE '%INVERSION%'` |
| GASTOS | `categoria = 'GASTOS'` OR `LIKE '%GASTO%'` AND NOT `%TALLER%` AND NOT `%INVERSION%` |

Ambas: `estatus <> 'CANCELADO'`.

«Inversiones pendientes» **no** es un filtro de estatus almacenado: es la familia INVERSIONES no cancelada. El IMPL no debe afirmar «pendiente» como etapa.

Taller AT (M5) queda fuera del predicado GASTOS. `get_expense_analysis` hoy también mapea `taller_at` — el slice **no** habilita M5.

---

## Period semantics

| Regla | Hecho |
|---|---|
| Formato | `YYYY-MM` |
| Ausencia | 400; **no inventar** mes |
| Invertidos | se intercambian (GET) |
| Vacío | 0 filas = «no hay registros»; no error ficticio |
| Comparación A vs B | **no** soportada como delta; el Excel solo pone meses en columnas del mismo SELECT |
| Default | **ninguno** |

---

## Plant scope

- Chat: `planta_id` obligatorio (fail-closed).
- Equivalentes: `getPlantaIdsEquivalentesForPendientes` (igual que el GET cuando hay `planta_id`).
- Sin `planta_id` el GET lista el universo del where — **prohibido** en Director IA.
- Cross-planta: 403 si `plantas_permitidas` no incluye la planta (GG/GA/AD).

---

## Authz

Superficie actual: JWT + **GV 403** (`dashboardBlockGVForbidden`). **GA no está bloqueado** (es listado de folios, no KPI IGF).

| Rol | M6 GET | Director IA (propuesto) |
|---|---|---|
| GV | 403 | 403 (reutilizar `assertFolioStatusAccess`, **no** `assertM3KpisAccess`) |
| GA | permitido en planta | permitido solo en `plantas_permitidas` |
| GG/AD | `plantas_permitidas` | igual, fail-closed |

**No** usar `assertM3KpisAccess` (bloquea GA por «KPIs financieros»). M6 ≠ IGF.

Privados: el GET pone `acceso_ver_folios_solo_zp_ad` solo si `priv_clave` coincide. El chat **no** recibe ni pide esa clave. Fail-closed: **excluir** `solo_zp_ad` (equivalente a GET sin clave). No es contrato nuevo.

---

## Planner / tools / chat

| Pieza | Estado físico |
|---|---|
| Intent `expense_analysis` | existe (gastos + folio/excel/categoria/export/listad/rango) |
| Intent `investment_analysis` | existe |
| Clarificación «gastos» ambiguos | existe (`financial_diagnosis` + reason IGF vs folios) |
| Tools | `get_expense_analysis` / `get_investment_analysis`; `declared_not_integrated`; `executor: null` |
| Capabilities | `gastos` / `inversiones` `canRead: false` |
| `UNSUPPORTED_RULES` | bloquean listados; **antes** del planner |
| Chat | `detectUnsupported` → no hay rama in-process; IGF annex es del path LLM |

Delta de wiring (IMPL, no ahora):

1. `matchesAllowedReadableIntent` solo para listar GASTOS/INVERSIONES de **folios** (sin `igf`/`margen`/`rentabilidad`).
2. Conservar `UNSUPPORTED` / IGF para «cómo van los gastos», KPI, margen.
3. Conservar clarificación si falta folio/categoría vs wording IGF.
4. Tools → `available_on_demand`, executor `loadGastosInversionesForChat`.
5. Rama chat **después** de `detectUnsupported`, **antes** de OpenAI/annex IGF.
6. Intents **separados**; loader común con `category` explícita.
7. **No** despachar `taller_at` por `get_expense_analysis`.

---

## Colisión IGF (M7)

`PLANT_FINANCIAL_KPI_RE` incluye `gasto(?:s)?` (`lib/director-ia-igf-arr.js` 50–51). `shouldAttachIgfArrAnnex` adjunta M7/M8 en el path LLM.

| Frase | Hoy | IMPL |
|---|---|---|
| qué gastos de folios / listar gastos / rango de meses | `SOURCE_NOT_INTEGRATED` | M6 in-process |
| cómo van los gastos / margen / rentabilidad | annex IGF (M7) | **igual** (no romper M7) |
| gastos de la planta (sin folio/excel) | clarificación planner | clarificación; no forzar M6 |
| qué inversiones hay / listar | `SOURCE_NOT_INTEGRATED` | M6 INVERSIONES |

Cualquier «gastos» **no** va a M6. No se cambia la semántica de IGF. No se toca `loadIgfArrAnnexForChat`.

---

## Contrato de respuesta (si se implementa)

Observados: `folio_id`, `numero_folio`, `planta_id`, `periodo` (rango pedido), `categoria` (GASTOS\|INVERSIONES), `subcategoria`, `concepto`, `importe`, `estatus`, `beneficiario`, `source` = `public.folios`.

Derivados seguros: `count`, `total` = suma de filas **después** de expand (mismo criterio que el Excel: líneas o `f.importe`; ceros omitidos).

Prohibido: inventar partidas/importes/meses; mezclar categorías; afirmar desviación sin baseline; afirmar causa por importe; afirmar «pendiente» como estatus; adjuntar IGF; generar xlsx; duplicados heurísticos del Excel.

Cero filas: «no hay registros de {GASTOS\|INVERSIONES} en el rango».

---

## Excel boundary

| Superficie | ¿En el slice? |
|---|---|
| SELECT + `expandCategoriaRows` | sí |
| `buildCategoriaRangoWorkbook` / xlsx | **no** |
| GET `/categoria-rango-excel` como HTTP interno | **no** |
| Export / COMPLETE | **fuera** |
| M5 Taller AT | **fuera** |
| M16 duplicados | **fuera** |

---

## Evidence table

| surface | helper_or_route | physical_source | category | query_type | select_only | excel_dependency | side_effects | authz | plant_scope | period_semantics | safe_fields | reusable | risk | evidence |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Query GET | `server.js` 5977–5991 | `public.folios` | GASTOS xor INVERSIONES | SELECT | sí | no | no | JWT+GV 403 | opcional en GET; IA exige | YYYY-MM obligatorio | id, folio, mes, cat, importe, estatus | copiar | medio (planta opcional) | L5908 |
| Expand | `expandCategoriaRows` | filas SQL | n/a | transform | sí | no | no | n/a | n/a | filtra `mes_cargo` | línea o folio | sí | bajo | lib 98–154 |
| Workbook | `buildCategoriaRangoWorkbook` | filas expandidas | label | xlsx | no | **sí** | archivo | n/a | n/a | columnas mes | — | **no** | alto si se usa | lib 161+ |
| IGF annex | `PLANT_FINANCIAL_KPI_RE` | `igf.*` | n/a | annex | n/a | no | no | GA 403 IGF | planta | mes IGF | — | no mezclar | **alto** si se enruta mal | igf-arr 50–51 |
| Tools | `get_expense/investment_analysis` | — | separado | declared | n/a | n/a | no | — | — | — | — | cablear | no mezclar M5 | tools 293–315 |

---

## Gap table

| gap_id | missing_capability | required_for_query_slice | reusable_component | proposed_change | architecture_change | contract_change | authz_change | complexity | blocking |
|---|---|---|---|---|---|---|---|---|---|
| G1 | executor | sí | SELECT + expand | `loadGastosInversionesForChat(category)` | no | no | no (reutilizar folio) | media | no |
| G2 | rama chat | sí | patrón M2/M9 | intent → loader **antes** de IGF | no | no | no | baja | no |
| G3 | levantar unsupported | sí | `matchesAllowedReadableIntent` | solo listar folios; conservar IGF | no | no | no | media | no |
| G4 | periodo en pregunta | sí | parse YYYY-MM | fail-closed si falta | no | no | no | baja | no |
| G5 | priv_clave | sí (política) | GET sin clave | nunca pedir clave; excluir privados | no | no | no (más estricto) | baja | no |
| G6 | tool M5 en expense | sí (no habilitar) | — | no despachar taller_at | no | no | no | baja | no |
| G7 | Excel export | no | workbook | **fuera** | no | no | no | — | no |

---

## Implementation hypothesis (no implementada)

```text
expense_analysis | investment_analysis
  → detectUnsupported no corta listados de folios
  → get_expense_analysis | get_investment_analysis
  → loadGastosInversionesForChat(pool, planta_id, req, { question, category })
       → assertFolioStatusAccess (GV 403; GA en plantas_permitidas)
       → parse YYYY-MM o 400
       → SELECT public.folios (copia del GET; categoria xor)
       → expandCategoriaRows
       → evidencia (sin xlsx)
  → respuesta; openai_called false
```

In-process. Sin HTTP. Sin Excel. Sin writes. Sin dispatcher nuevo. Sin contrato nuevo. Categoría explícita; no mezclar.

---

## Tests (si IMPL)

gastos por planta; inversiones por planta; por mes; filtro partida/subcategoría; múltiples filas; cero filas; totales = suma expandida; nulls/`SIN SUBCATEGORÍA`; periodo inválido; planta no autorizada; cross-planta; `plantas_permitidas`; GA permitido; GV 403; intents; tools/executor; clarificación IGF vs folios; «cómo van los gastos» sigue M7; no xlsx; no HTTP; no writes; no M5; M6 queda PARTIAL.

---

## Gates

| Gate | Esta auditoría | IMPL futuro |
|---|---|---|
| G2 | no | no (PARTIAL ya previsto) |
| G3 | no | no |
| G8 | N/A | N/A |
| G1 | vigente | hace falta uno nuevo para IMPL |

---

## Estado / porcentaje (futuro vs ahora)

| | Readiness (ahora) | Tras IMPL (si se autoriza) |
|---|---|---|
| M6 | NO INTEGRADA | **PARTIAL** |
| COMPLETE M6 | no | **sigue no** (Export fuera) |
| Global | **42.5%** (8.5/20) | **45.0%** (9.0/20) |

---

## Riesgos

- Enrutar «cómo van los gastos» a M6 y romper M7.
- Inventar `mes_desde`/`mes_hasta`.
- Usar GET xlsx o `buildCategoriaRangoWorkbook`.
- Habilitar Taller AT vía `get_expense_analysis`.
- Usar `assertM3KpisAccess` (bloquea GA indebidamente).
- Pedir `priv_clave` al chat.
- Afirmar desviación/causa/«pendiente» de etapa.
- Marcar COMPLETE o +5.0.

---

## NEXT_TASK propuesta (no autorizada)

`IMPL-DIRECTOR-IA-M6-GASTOS-INVERSIONES-001`

Debe implementar solo el path SELECT + expand, intents separados, routing IGF intacto, authz de folios, periodo fail-closed, sin Excel. Documentar M6 PARTIAL y 45.0% **solo** al cerrar ese IMPL + sync. Este reporte no autoriza ni ejecuta esa tarea.

---

## Acciones no realizadas

- No se implementó el loader ni se tocó código/tests/runtime/matriz/contratos.
- No se generó Excel. No HTTP interno. No writes.
- No commit / push / merge.
- No se cambió 42.5%. No se marcó M6 COMPLETE.

## secrets_check

none

## git diff --check

limpio (exit 0)

## git status

Al cierre (sin commit):

```text
On branch architecture/director-ia-m6-gastos-inversiones-readiness-001
Changes not staged for commit:
  modified:   docs/dev-loop/CURRENT_TASK.md

Untracked files:
  docs/dev-loop/reports/ARCH-DIRECTOR-IA-M6-GASTOS-INVERSIONES-READINESS-001.md
```

Solo los dos archivos autorizados.

## STOP
