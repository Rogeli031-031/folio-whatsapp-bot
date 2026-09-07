# AUDIT-DIRECTOR-IA-GENERIC-FOLIO-SEARCH-COVERAGE-001

```yaml
task_id: "AUDIT-DIRECTOR-IA-GENERIC-FOLIO-SEARCH-COVERAGE-001"
outcome: "DONE_PENDING_REVIEW"
mode: "READ_ONLY_PHYSICAL_TRACE"
implementation: false
docs_director_ia_changed: false
live_db: false
sql_new: false
rejected_sha_reused_as_solution: false
classification: "G. MULTIPLE_BOUNDARIES"
first_bad_boundary: "no existe loader de búsqueda genérica public.folios + planta + mes_cargo + concepto libre sin recorte de categoría o de IGF-reviewable"
can_be_truthful_with_existing_loaders: true
next_task_proposed: "FIX-DIRECTOR-IA-GENERIC-FOLIO-SEARCH-DECLARED-SCOPE-001"
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
contracts_consulted:
  - AGENTS.md
  - docs/dev-loop/LOOP_PROTOCOL.md
  - docs/dev-loop/CURRENT_TASK.md
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
human_decision_needed:
  - "Revisión humana. No implementación. No merge. No deploy. No next task."
  - "Elegir universo: tres familias M4 (GASTOS+INVERSIONES+TALLER) vs todas las filas de public.folios (incluye DYO/COMISIONES/DERECHOS)."
```

CLASIFICACIÓN: G. MULTIPLE_BOUNDARIES

FIRST_BAD_BOUNDARY: no existe un loader de búsqueda genérica sobre `public.folios` (planta + `mes_cargo` + concepto libre) que no recorte a una categoría M6 o al recorte IGF-reviewable

GENERIC_FOLIO_SEARCH_CAN_BE_TRUTHFUL_WITH_EXISTING_LOADERS: YES

GENERIC FOLIO UNIVERSE:
Filas operativas de `public.folios` de la planta. El producto trata como familias de “apoyos” (M4 + detalle server.js) **GASTOS + INVERSIONES + TALLER**. Eso no es IGF-reviewable ni la matriz M4. Hay otras `categoria` en la misma tabla (DYO, COMISIONES, DERECHOS/OBLIGACIONES) que M4 no clasifica como familia de apoyo.

PUBLIC.FOLIOS COVERAGE:
Una tabla. Discriminador: `f.categoria` (a veces `subcategoria`). GASTOS e INVERSIONES son categorías de esa tabla. TALLER también (`LIKE '%TALLER%'`). No hay helper de producto que lea la tabla sin limitar categoría **y** sirva de buscador (el SELECT más ancho ya existente es `queryReviewableSupportFolios`, interno de IGF).

M2 COVERAGE:
Listado por planta/etapa, todas las categorías, sin filtro de `categoria`. SELECT sin `concepto`, `descripcion`, `mes_cargo`. Ordena por `creado_en`. No sirve para search por mes/concepto sin SQL nuevo.

M6 COVERAGE:
`category` **obligatorio**: solo `GASTOS` o `INVERSIONES`. Omitida → 400. GASTOS excluye TALLER e INVERSIONES. Dos llamadas cubren esas dos familias, no TALLER. Proyecta `COALESCE(descripcion, concepto)`, `mes_cargo`, planta, folio, importe, estatus. Periodo YYYY-MM obligatorio. Texto solo con prefijo `partida|subcategoria|concepto`.

TALLER COVERAGE:
Misma tabla. M5 `queryTallerFolios` / `loadTallerAtForChat`: `categoria LIKE '%TALLER%'`, `mes_cargo`, planta; proyecta el mismo COALESCE de concepto. Filtro de texto = unidad, no concepto libre. Taller Mayor reutiliza `queryTallerFolios` y recorta a `matchTallerTipoCol(subcategoria)==='mayor'`.

APOYOS SEMANTICS:
Tres usos distintos: (1) folio operativo / familias M4; (2) matriz de clasificación; (3) IGF reviewable (cancelable + cubo). No unirlos por la palabra.

COMMON MONTH SEMANTICS:
`mes_cargo` es el periodo de M6, M5, M4, IGF y Taller Mayor. M2 no filtra ni proyecta `mes_cargo`.

COMMON CONCEPT SEMANTICS:
`COALESCE(descripcion, concepto)` es común a M6, M5 e IGF. M2 y M4 no lo proyectan.

FIX MÍNIMO RECOMENDADO:
No reutilizar `7879bfc5`. No GASTOS_ONLY + prosa “folios”. Para ser veraz sin SQL nuevo: unir `loadGastosInversionesForChat(GASTOS)` + `(INVERSIONES)` + `queryTallerFolios` y **declarar esas tres familias**, o reutilizar `queryReviewableSupportFolios` **sin** el filtro IGF y declarar “public.folios / planta / mes_cargo”. Nunca `loadIgfReviewableSupportsForChat` como listado genérico.

ARCHIVOS QUE TOCARÍA: helper de composición + planner/chat de `folio_search`; no M6 formula; no SQL; no frontend.

---

## 0. G1

Rama: `audit/director-ia-generic-folio-search-coverage-001` ≠ `main`.

Solo `AUTHORIZED` → `IN_PROGRESS`. Campos humanos intactos. `implementation_authorized: NO`. Sin producto. Sin SQL. Sin LIVE_DB. Sin commit. `7879bfc5` no se usó como solución.

## 1. public.folios

| Hecho | Evidencia |
|---|---|
| Fuente única de folios operativos | Todos los loaders auditados hacen `FROM public.folios f` |
| Discriminador | `f.categoria` (+ `f.subcategoria` en IGF/Taller Mayor) |
| GASTOS e INVERSIONES | Misma tabla; M6 `categoryPredicateSql` |
| TALLER | Misma tabla; M5 `LIKE '%TALLER%'` |
| Otras clases | IGF nombra DYO, COMISIONES, DERECHOS/OBLIGACIONES |
| Helper sin `category = GASTOS` | `queryReviewableSupportFolios` (planta + `mes_cargo`, sin predicado de categoría). M2 listado también, pero sin concepto/mes. |
| Proyección concepto/mes | M6/M5/IGF: sí. M2: no. M4: mes sí, concepto no |

## 2. M6 — `loadGastosInversionesForChat` / `queryGastosInversionesFolios`

| Pregunta | Hecho físico |
|---|---|
| Categorías soportadas | Solo `GASTOS` e `INVERSIONES` (`CATEGORIES` + `normalizeCategory`) |
| `category` obligatorio | Sí. Falsy → 400 `"categoria debe ser GASTOS o INVERSIONES"` |
| `category = GASTOS` | LIKE GASTO, NOT TALLER, NOT INVERSION |
| `category = INVERSIONES` | = INVERSIONES OR LIKE INVERSION |
| Omitida | No soportada. No hay “todas” |
| Ambas sin SQL nuevo | Sí: dos llamadas al mismo helper |
| TALLER vía M6 | No. GASTOS lo excluye; INVERSIONES no lo incluye |
| Periodo | `f.mes_cargo` rango YYYY-MM, obligatorio |
| Texto | `applyPartidaFilter` sobre partida (`subcategoria`) y `concepto` (ya coalescido) |
| Estatus | Excluye CANCELADO |
| Planta | `f.planta_id = ANY(...)` |

## 3. M2 / Kanban / folio_status

`listFoliosByPlanta`: `FOLIO_SELECT` = id, numero, codigo, planta, estatus, categoria, importe, creado_en. **Sin** concepto/descripcion/mes_cargo. Filtro opcional de etapa. `ventana: "0"`. Más amplio en categorías que M6; inútil para “septiembre” + “llantas” sin SQL nuevo.

Kanban no es otra fuente: es etapa derivada del estatus M2.

## 4. Taller

Misma `public.folios`. “llantas” **puede** vivir en `descripcion`/`concepto` de un folio TALLER (mismo COALESCE que M6). Los loaders actuales no buscan texto libre: M5 filtra unidad; Taller Mayor recorta a subcategoría “mayor”. Deben entrar en un genérico **solo si** el universo es las tres familias M4 o toda la tabla; no porque se llamen Folio, sino porque son filas de la misma tabla y M4 las cuenta como familia de apoyo.

## 5. Clasificación de apoyos (M4)

Vista **agregada** mes_a vs mes_b. Familias fijas: `["GASTOS", "INVERSIONES", "TALLER"]`. SELECT: `planta_id, categoria, importe, mes_cargo`. Sin folio, sin concepto. No es un listado. Es la definición de producto de las tres familias de “apoyo” operativo. server.js detalle de clasificación usa el mismo corte de tres categorías.

## 6. IGF reviewable

`queryReviewableSupportFolios`: **todas** las filas de la planta y `mes_cargo` (concepto coalescido). El **loader** luego recorta: no CANCELADO, `categoryFeedsIgfSupportCalc`, grupos reviewable vs no cancelable. “Apoyos” aquí = cancelables para contrafactual IGF. No es el listado genérico. Reutilizar el **query** sin el recorte IGF no es SQL nuevo; reutilizar el **loader** sí mezcla semántica.

## 7. Matriz

| UNIVERSO | SOURCE | LOADER | PLANTA | MES | CONCEPTO | ¿GENERIC SEARCH? | POR QUÉ |
|---|---|---|---|---|---|---|---|
| Folios operativos (todas las `categoria`) | public.folios | no hay search loader; query más ancho = `queryReviewableSupportFolios` | sí | `mes_cargo` | COALESCE desc/concepto en IGF/M6/M5 | NO como loader; query reusable | SELECT ancho existe; loader IGF recorta |
| GASTOS | public.folios | `loadGastosInversionesForChat` category GASTOS | sí | `mes_cargo` | sí (prefijo partida/concepto) | parcial | 7879bfc5 falló al presentarlo como todos |
| INVERSIONES | public.folios | mismo helper, category INVERSIONES | sí | `mes_cargo` | sí | parcial | M6 no une solo |
| TALLER | public.folios | `queryTallerFolios` / `loadTallerAtForChat` | sí | `mes_cargo` | proyectado; filtro = unidad | parcial | misma tabla; M6 lo excluye |
| Taller Mayor | public.folios | `loadTallerMayorForChat` → `queryTallerFolios` | sí | `mes_cargo` | proyectado | NO | subconjunto “mayor” |
| M2 list / Kanban | public.folios | `listFoliosByPlanta` | sí | no (`creado_en`) | no | NO | falta mes y concepto |
| Clasificación apoyos | public.folios | `queryClasificacionFolios` | grupo comparativo | `mes_cargo` (dos meses) | no | NO | matriz, no listado |
| IGF reviewable | public.folios + overlay IGF | `loadIgfReviewableSupportsForChat` | sí | `mes_cargo` | sí, luego recorte IGF | NO | otro significado de “apoyo” |

## 8. Clasificación arquitectónica

No es solo A: no hay loader all-folios de búsqueda.

No es solo B: M6 no omite category y no cubre TALLER.

C aplica **si** el universo es las tres familias M4: unión M6×2 + `queryTallerFolios`, sin SQL nuevo. Concepto TALLER = filtro en memoria sobre campo ya proyectado.

D aplica **si** se exige “todas las categorias” y no se reutiliza el query IGF: M6+M5 deja fuera DYO/COMISIONES/DERECHOS.

E no es necesario para las tres familias ni para “todas las filas de un mes” si se reutiliza `queryReviewableSupportFolios`.

F: “apoyo” es ambiguo entre (1)(2)(3); “folio operativo” no.

Por eso **G**: FIRST = no hay search loader genérico; NEXT = “apoyos” sobrecargado; NEXT = M6 no es all-folios.

## 9. ¿Puede ser veraz con loaders existentes?

**YES**, si la respuesta nombra el universo realmente leído.

Loaders/scopes:

1. Universo M4 (apoyos operativos): `loadGastosInversionesForChat` GASTOS + INVERSIONES + `queryTallerFolios`. Declarar las tres familias.
2. Universo tabla completa del mes: `queryReviewableSupportFolios` **sin** `categoryFeedsIgfSupportCalc` / reviewable. Declarar `public.folios` + planta + `mes_cargo`.

**NO** es veraz: solo GASTOS + texto “folios”. **NO**: `loadIgfReviewableSupportsForChat` como listado genérico.

Falta para un único loader de producto: un compositor (no SQL) que elija 1 o 2 y **escriba el scope en la prosa**.

## 10. FIX futuro (no este turno)

Impedir GASTOS_ONLY → “folios”. Elegir universo 1 o 2. Concepto libre sin catálogo. Mes = `mes_cargo`. No Action Register. No 7879bfc5.
