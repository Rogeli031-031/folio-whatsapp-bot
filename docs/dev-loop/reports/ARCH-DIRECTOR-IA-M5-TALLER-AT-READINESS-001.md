# Reporte — ARCH-DIRECTOR-IA-M5-TALLER-AT-READINESS-001

```yaml
task_id: "ARCH-DIRECTOR-IA-M5-TALLER-AT-READINESS-001"
outcome: "DONE_PENDING_REVIEW"
determination: "READY"
module: "M5 — Taller por AT"
slice: "query JSON SELECT-only de gasto TALLER por unidad homologada; in-process; sin Excel; sin duplicados; sin AR"
m5_state_this_task: "NO INTEGRADA (sin cambio)"
m5_state_after_future_impl: "PARTIAL"
complete: false
global_this_task: "10.0 / 20 = 50.0%"
global_after_future_impl: "10.5 / 20 = 52.5%"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M5-TALLER-AT-READINESS-001.md"
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
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-007.md"
  - "lib/taller-at-excel.js (lectura)"
  - "lib/unidad-taller.js (lectura)"
  - "server.js GET /api/dashboard/taller-at-excel (lectura)"
  - "lib/director-ia-planner.js / tools / capabilities / chat (lectura)"
  - "lib/director-ia-m6-gastos-inversiones.js / director-ia-m2-folio-status.js (lectura authz/periodo)"
  - "lib/director-ia-m4-clasificacion-query.js (lectura frontera TALLER agregado)"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "IMPL-DIRECTOR-IA-M5-TALLER-AT-001 (propuesta; no autoriza G1 ni encadena)"
secrets_check: "none (se observó priv_clave en el GET Excel; no se copia ni se usa en el slice)"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED."
  - "G2/G3 de esta auditoría: N/A. El IMPL propuesto no exige contrato nuevo."
  - "El NEXT_TASK no está autorizado ni ejecutado."
  - "Esta readiness no cambia M5 ni 50.0%."
  - "Si el IMPL se autoriza después: M5 NO INTEGRADA → PARTIAL; 10.5/20 = 52.5%. COMPLETE de M5 sigue fuera."
```

## Resumen ejecutivo

**READY.** Existe path **SELECT-only, in-process** para consultar **Taller por AT** sin Excel, sin HTTP interno y sin writes.

«Por AT» significa físicamente: agrupar/filtrar filas de `public.folios` con `categoria LIKE '%TALLER%'` por el **token homologado** derivado de `folios.unidad` (`AT-15`, `PT-69`, `U-56`, `C-33`, `S-xx`). **No hay** tabla catálogo, **no hay** `at_id`, **no hay** nombre aparte de la clave.

La fuente estructurada **existe antes del Excel**: el GET arma un `SELECT` y **después** llama `buildTallerAtWorkbook`. El slice reutiliza el SELECT + `expandTallerRows` + `unidad-taller`. Excel **no** es transporte.

TALLER ≠ GASTOS ≠ INVERSIONES ≠ Action Register ≠ agregado M4.

Intent/tool actuales chocan con M6 (`expense_analysis` + stub). El IMPL debe crear intent **`taller_at`** y tool **`get_taller_at`** → `loadTallerAtForChat`.

Esta tarea **no cambia** 10.0 / 20 = **50.0%**.

NEXT_TASK (no autorizada): `IMPL-DIRECTOR-IA-M5-TALLER-AT-001`.

---

## Ejecución

- Rama: `architecture/director-ia-m5-taller-at-readiness-001` (≠ `main`).
- HEAD: `c076566c Merge branch 'architecture/director-ia-global-next-module-prioritization-007'`.
- G1 intacto: `HUMAN_APPROVER` / `2026-08-23`. En `CURRENT_TASK.md` solo se cambió `status`.
- Transición: `AUTHORIZED` → `IN_PROGRESS` → `DONE_PENDING_REVIEW`.
- `max_attempts: 1`. Sin implementación, matriz, código, Excel, commit, push, merge.

---

## Baseline

| Campo | Valor |
|---|---|
| Priorización | ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-007; ganador M5 query JSON |
| M5 hoy | **NO INTEGRADA** |
| M0–M20 hoy | **10.0 / 20 = 50.0%** |
| Tras IMPL futuro (si se autoriza) | M5 **PARTIAL**; **10.5 / 20 = 52.5%** (+2.5) |
| Esta readiness | **0.0 pp**; M5 no cambia |
| COMPLETE | **no** (Excel + hoja duplicados siguen fuera) |

---

## Definición canónica M5

Ficha vigente (`DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md`):

| Campo | Valor |
|---|---|
| Módulo | Taller por AT |
| Propósito | Excel de gasto taller por unidad AT, con hoja de duplicados |
| Cobertura hoy | NO INTEGRADA |
| Tablas | `public.folios`, `public.plantas` |
| COMPLETE canónico | incluye Export/xlsx y hoja de duplicados |

| Hecho | Consecuencia |
|---|---|
| COMPLETE incluye Excel + duplicados | Un slice JSON **no** es COMPLETE |
| Query SELECT-only es el primer slice de 007 | Tras IMPL: **PARTIAL** |
| «Cómo va Taller» es AR | No es este módulo |

**No se reinterpreta COMPLETE.** G2/G3 no aplican.

---

## ¿Qué significa físicamente «por AT»?

No se inventa un maestro de activos.

| Pregunta | Hecho físico |
|---|---|
| ¿Qué es AT? | Token de **unidad de taller** homologado desde texto `public.folios.unidad` |
| Prefijos | `AT`, `PT`, `S`, `C`, `U` (`T` → `AT`). Ej.: `AT-15`, `PT-69`, `U-56`, `CIL-33` → `C-33` |
| id | **No existe** `at_id` |
| clave | Token canónico (`formatUnit`: `AT-15`) |
| nombre | No hay nombre distinto; la clave **es** la etiqueta |
| catálogo | **No** hay tabla/vista de unidades |
| Relación AT–folio | Campo `folios.unidad` (texto libre; una o varias unidades; importe se parte si hay lista) |
| Relación AT–planta | Solo vía `folios.planta_id`. El mismo token en otra planta **no** es el mismo objeto |
| Repetición | Sí: muchos folios / meses pueden citar `AT-15` |
| Null / no parseable | `normalizeAt` emite etiqueta derivada **`SIN AT`**. No es un AT inventado; es ausencia de token |
| AT = responsable | **No** |
| AT = Action Register | **No** |

Filtrar «AT-15» = homologar el pedido con `parseUnidadesList` / `normalizeUnidadToken` y comparar con `expandTallerRows[].unidad` en la planta y el periodo. **0 filas ≠ «esa AT no existe en el universo»**; significa **no hay gasto TALLER observado** para esa clave en ese scope.

---

## Physical source

`GET /api/dashboard/taller-at-excel` (`server.js` ~5807–5901):

1. JWT `dashboardAuthMiddleware` + `dashboardBlockGVForbidden`.
2. `mes_desde` y `mes_hasta` **obligatorios** `YYYY-MM` o 400. Si vienen invertidos, se intercambian. **Sin default.**
3. `planta_id` **opcional** en el GET. Director IA **debe exigir** `planta_id` del chat.
4. `SELECT` `public.folios` ⋈ `public.plantas`: id, numero_folio, planta_id, planta_nombre, **unidad**, subcategoria, concepto, importe, **detalle_lineas**, mes_cargo, estatus.
5. Predicado: `categoria LIKE '%TALLER%'`, `estatus <> 'CANCELADO'`, `mes_cargo` en rango, scope de planta (`getPlantaIdsEquivalentesForPendientes`).
6. **Después:** `buildTallerAtWorkbook` → xlsx.

Paso 4–5 es la fuente. Paso 6 es presentación.

`expandTallerRows` (`lib/taller-at-excel.js`) opera sobre filas SQL **antes** del workbook. Exportado.

Orden SQL: `planta_nombre`, `mes_cargo DESC`, `unidad NULLS LAST`, `id`.

No importar `server.js`. El IMPL copia el SELECT (patrón M6).

---

## Taller semantics

| Campo | Tipo | Notas |
|---|---|---|
| Predicado | observado | `UPPER(TRIM(categoria)) LIKE '%TALLER%'` |
| `estatus` | observado | CANCELADO excluido; el resto se emite tal cual |
| abierto/cerrado de taller | **no existe** | No interpretar PAGADO/CERRADO como «taller cerrado» |
| `mes_cargo` | observado | Periodo del folio |
| `importe` | observado o **repartido** | Multi-AT: `splitImportePorUnidades` (derivado) |
| `concepto` | observado | Fallback `"—"`; líneas de `detalle_lineas` si parsean |
| `tipo` | **derivado** | `matchTallerTipoCol(subcategoria)` → mayor / pasivo / preventivo / otros |
| `unidad` canónica | **derivado** | `parseUnidadesList` / `normalizeAt` |
| `row_kind` | **derivado** | `normal` / `grupo` (importe 0, etiqueta multi-AT) / `parcial` |
| Filas importe 0 | omitidas | `expandTallerRows` hace `continue` si total 0 |

El slice emite filas `normal` y `parcial`. **No** emitir `grupo` como importe (es 0).

---

## Period semantics

El producto Excel **exige** `mes_desde` y `mes_hasta`. No hay default canónico seguro.

Primer slice (como M6):

- `YYYY-MM` obligatorio (un mes o rango de dos).
- Sin periodo → **clarificar**. No inventar mes actual.
- Periodo inválido → error de input, no query.

---

## Query shape (si IMPL)

Puede responder, con evidencia:

- gasto TALLER de la planta en el periodo, **desglosado por unidad**;
- gasto de **una** clave (`AT-15`) en planta+periodo;
- conteo y total **del conjunto consultado** (no del universo);
- folio, concepto, importe, estatus, mes_cargo, tipo derivado.

No responde: causa, responsable, atraso, urgencia, desviación, prioridad, comparación no pedida, acciones AR, Excel, duplicados.

AT no reconocible (parse vacío) → clarificar; no adivinar prefijo salvo la regla ya existente (`15` → `AT-15` vía `defaultPrefix AT`).

---

## Fronteras

### M4

`FAMILIES` incluye TALLER como **total de familia** mes_a vs mes_b. Eso **no** sustituye el detalle por unidad. El copy M4 ya declara que no es Taller por AT.

### M6

GASTOS: `LIKE '%GASTO%' AND NOT LIKE '%TALLER%'`. TALLER está **fuera**. No reutilizar `loadGastosInversionesForChat`.

### Action Register

Planner: «cómo va Taller» → `action_status` si no hay `taller por at` / `unidad`.

`matchesAllowedReadableIntent` deja pasar «cómo va taller» como AR.

Colisión: `AT` = unidad de folio, **no** Action Register. Preguntas de acciones/responsable/vencidas **no** entran a M5.

### Excel

Misma fuente SQL; workbook **después**. No GET, no `buildTallerAtWorkbook`, no `priv_clave`.

### Duplicados

Hoja del Excel; detector propio (umbral concepto 0.55) ≠ M16 `findDuplicatePairs`. **Fuera del slice.** COMPLETE de M5 los sigue exigiendo.

---

## Authz

Reutilizar **authz de folios** (`assertFolioStatusAccess`), no el bloqueo GA de KPIs IGF.

| Regla | Valor |
|---|---|
| JWT/contexto | obligatorio |
| `planta_id` | obligatorio |
| GV | 403 |
| GA | permitido en planta autorizada (`plantas_permitidas`) |
| GG/AD | `plantas_permitidas`; cross-planta 403 |
| fail-closed | sí |
| Privados ZP/AD | **excluir** (`acceso_ver_folios_solo_zp_ad: false`, como M6) |
| `priv_clave` | **no** en chat |

---

## Planner / tools

Hoy:

| Pieza | Estado |
|---|---|
| `UNSUPPORTED_RULES.taller_at` | Bloquea **antes** del planner (`detectUnsupportedDirectorIaDomain`) |
| Planner | Mapea a intent `expense_analysis` + `domain_override: ["taller_at","gastos","folios"]` |
| Chat | Si `expense_analysis` y dominio `taller_at` → unsupported |
| Tool | `get_taller_at_analysis`, `declared_not_integrated`, `executor: null` |

Hace falta:

1. Intent propio **`taller_at`** (no `expense_analysis`).
2. Tool **`get_taller_at`** (el stub `get_taller_at_analysis` se alinea/renombra; un solo tool).
3. Executor **`loadTallerAtForChat`**.
4. Sacar las frases de query del unsupported (dejar Excel/xlsx/duplicados como no integrados).
5. Preservar «cómo va Taller» → AR.
6. No mezclar con M4 (`clasificacion_apoyos_query`) ni M6.

Frases que activan M5 (explícitas): `taller por at`, `taller at`, `taller` + `unidad` / `AT-digits` / `por at`. No: `excel taller`, `xlsx`, `duplicados`.

Esto es wiring del patrón M4/M6. **No** contrato nuevo.

---

## Evidence table

| surface | helper_or_route | physical_source | AT_field | plant_field | period_field | select_only | excel_dependency | side_effects | authz | safe_fields | reusable | risk | evidence |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| GET Excel | `GET /taller-at-excel` | `public.folios` | `unidad` texto | `planta_id` | `mes_cargo` | SELECT sí; respuesta es xlsx | workbook **después** | archivo | JWT+GV 403+priv_clave | — | copiar SELECT | medio | `server.js` ~5858 |
| Expand | `expandTallerRows` | filas SQL | `unidad` canónica | `planta_id` | `mes_cargo` | sí | no | no | n/a | folio, unidad, importe, tipo, estatus | **sí** | bajo | `taller-at-excel.js` |
| Homologación | `unidad-taller` | texto | token AT/PT/S/C/U | n/a | n/a | n/a | no | no | n/a | clave | **sí** | medio (parse) | `unidad-taller.js` |
| Workbook | `buildTallerAtWorkbook` | expand | columnas Excel | hoja | meses | no | **sí** | xlsx | GET | — | **no** | Excel | L502+ |
| Duplicados taller | funciones DUP_* | expand | n/a | n/a | n/a | n/a | hoja Excel | no | GET | — | **no** este slice | ≠ M16 | mismo archivo |
| Chat hoy | unsupported | — | — | — | — | — | — | respuesta honesta | — | — | no | colisión M6 | `director-ia-chat.js` 2579 |

---

## Gap table

| gap_id | missing_capability | required_for_query_slice | reusable_component | proposed_change | architecture_change | contract_change | authz_change | complexity | blocking |
|---|---|---|---|---|---|---|---|---|---|
| G1 | Loader chat | sí | SELECT + `expandTallerRows` | `loadTallerAtForChat` | no | no | reutilizar folios | media | no |
| G2 | Intent `taller_at` | sí | planner | nuevo intent; no `expense_analysis` | no | no | no | baja | no |
| G3 | Tool `get_taller_at` | sí | stub | executor + available_on_demand | no | no | no | baja | no |
| G4 | Escape unsupported | sí | `matchesAllowedReadableIntent` | query AT permitida; Excel sigue bloqueado | no | no | no | baja | no |
| G5 | Chat wiring | sí | patrón M6 | rama in-process | no | no | no | baja | no |
| G6 | Periodo | sí | patrón M6 | clarificar si falta | no | no | no | baja | no |
| G7 | Excel | no | workbook | **fuera** | no | no | no | — | no |
| G8 | Duplicados | no | DUP_* | **fuera** | no | no | no | — | no |
| G9 | Catálogo AT | no | — | no inventar | no | no | no | — | no |

Ningún gap bloquea READY.

---

## Implementation hypothesis

```text
taller_at
  → get_taller_at
  → loadTallerAtForChat(planta_id, question)
  → assertFolioStatusAccess + requirePlantaId
  → parse YYYY-MM (clarificar si falta; no inventar)
  → parse unidad opcional (homologar; si no parsea, clarificar)
  → SELECT TALLER + mes + planta (copia GET; privados excluidos)
  → expandTallerRows
  → filtrar por clave si se pidió; omitir row_kind grupo
  → recorte + totales del conjunto
  → evidencia (source=public.folios, unidad, planta, periodo)
  → respuesta
```

In-process. SELECT-only. Sin HTTP interno. Sin Excel. Sin writes. Sin AR. Sin M4/M6.

Campos emitibles: `planta_id`, `planta_nombre`, clave AT (`unidad`), `folio_id`, `numero_folio`, `mes_cargo`, `concepto`, `importe`, `estatus`, `tipo` (derivado, declarado), `count`, `total`, `source`.

**No** `at_id`. **No** causa/responsable/atraso/urgencia/desviación/prioridad.

---

## Tests a diseñar (si IMPL)

- consulta por AT; AT con filas; AT sin filas (0 ≠ inexistencia de catálogo)
- token no parseable → clarificar
- por planta; por periodo; sin periodo → clarificar; periodo inválido
- TALLER ≠ GASTOS ≠ INVERSIONES ≠ AR («cómo va Taller») ≠ M4
- folio, importe, estatus, null/`SIN AT`, conteo, total
- 0 registros del periodo
- planta autorizada / no autorizada / `plantas_permitidas` / cross-planta
- GA permitido en planta; GV 403
- intent `taller_at`; tool `get_taller_at`; executor; wiring chat
- Excel/xlsx sigue unsupported; duplicados fuera; no HTTP interno; sin writes

---

## Gates

| Gate | Valor |
|---|---|
| G1 | AUTHORIZED (esta tarea) |
| G2 | N/A (no redefine arquitectura) |
| G3 | N/A (no contrato nuevo) |
| G8 | N/A |
| G5 | pendiente humano |

---

## Estado / porcentaje tras IMPL futuro

| | Esta tarea | Tras IMPL (si se autoriza) |
|---|---|---|
| M5 | NO INTEGRADA | **PARTIAL** |
| Global | **10.0 / 20 = 50.0%** | **10.5 / 20 = 52.5%** (+2.5 pp) |
| COMPLETE | no | **sigue no** |

---

## Riesgos

- «Cómo va Taller» absorbido como M5.
- `expense_analysis` ejecutando TALLER como GASTOS.
- Inventar mes.
- Tratar `SIN AT` como unidad real de negocio.
- Afirmar que un AT «no existe» por 0 filas.
- Traer workbook / GET / `priv_clave` / duplicados.
- Unir a IGF `gasto_kg` o a M6 sin predicado.
- Presentar `tipo` / importe partido como columna cruda de DB.
- AT = responsable.

---

## NEXT_TASK propuesta (no autorizada)

`IMPL-DIRECTOR-IA-M5-TALLER-AT-001`

---

## Acciones no realizadas

- No se implementó nada. No código, tests, runtime, matriz, contratos, Excel.
- No commit / push / merge.
- No se cambió 50.0%.
- No se autorizó ni ejecutó la NEXT_TASK.

## secrets_check

none (priv_clave observado en GET; no copiado)

## git diff --check

limpio (exit 0)

## git status

Al cierre (sin commit):

```text
On branch architecture/director-ia-m5-taller-at-readiness-001
Changes not staged for commit:
  modified:   docs/dev-loop/CURRENT_TASK.md

Untracked files:
  docs/dev-loop/reports/ARCH-DIRECTOR-IA-M5-TALLER-AT-READINESS-001.md
```

Solo los dos archivos autorizados.

## STOP
