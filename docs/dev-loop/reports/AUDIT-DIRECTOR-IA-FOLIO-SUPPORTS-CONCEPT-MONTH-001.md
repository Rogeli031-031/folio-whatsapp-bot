# AUDIT-DIRECTOR-IA-FOLIO-SUPPORTS-CONCEPT-MONTH-001

```yaml
task_id: "AUDIT-DIRECTOR-IA-FOLIO-SUPPORTS-CONCEPT-MONTH-001"
outcome: "DONE_PENDING_REVIEW"
mode: "READ_ONLY_PHYSICAL_TRACE"
implementation: false
docs_director_ia_changed: false
live_db: false
tests_written: false
product_changed: false
classification: "G. MULTIPLE_BOUNDARIES"
first_bad_boundary: "planner detectDirectorIaIntent → unknown / no_rule_matched (A–H)"
next_bad_boundary: "no existe LIST/SEARCH FOLIOS + plant + month + free-text concept"
list_search_capability: "NO"
physical_source: "public.folios"
plant_filter: true
month_filter: "AMBIGUOUS"
concept_filter: "PARTIAL"
delta_gastos_created: false
next_task_proposed: "FIX-DIRECTOR-IA-FOLIO-LIST-BY-MONTH-CONCEPT-001"
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
contracts_consulted:
  - AGENTS.md
  - docs/dev-loop/LOOP_PROTOCOL.md
  - docs/dev-loop/CURRENT_TASK.md
  - docs/director-ia/DIRECTOR_IA_CONSTITUTION.md
  - docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
human_decision_needed:
  - "Revisión humana. No implementación. No merge. No deploy. No next task."
```

CLASIFICACIÓN: G. MULTIPLE_BOUNDARIES

FIRST_BAD_BOUNDARY: planner `detectDirectorIaIntent` → `unknown` / `no_rule_matched` (sondas A–H)

NEXT_BAD_BOUNDARY: no existe capacidad LIST/SEARCH FOLIOS + planta + mes + concepto libre; los loaders más cercanos no extraen `septiembre` ni `llantas` de esta frase

PLANNER ACTUAL: `unknown`, confidence 0.35, clarification, domains=[], tool plan vacío

LIST/SEARCH FOLIOS CAPABILITY: NO

FUENTE FÍSICA: `public.folios` (M2 listado etapa; M6 GASTOS/INVERSIONES)

FILTRO PLANTA: YES

FILTRO MES: AMBIGUOUS

FILTRO CONCEPTO LIBRE: PARTIAL

CAMPO FÍSICO PARA "LLANTAS": `f.descripcion` / `f.concepto` (M6 coalescea ambas); no está en el SELECT de folio_status

SEMÁNTICA TEMPORAL DE "SEPTIEMBRE": en Folios el periodo físico de M6 es `f.mes_cargo` YYYY-MM; el nombre de mes no se parsea en esa ruta

FIX MÍNIMO RECOMENDADO: no una regex de `llantas`. Hace falta un intent de listado + extractor de mes calendario + concepto libre + conectar un loader que ya tenga planta/`mes_cargo`/concepto (M6 es el más cercano, no folio_status). Ver §9.

ARCHIVOS QUE TOCARÍA (FIX futuro, no este turno): planner (intent de listado), extractor mes/concepto, chat inherit de esa ruta, M6 o extensión del listado; no Action Register; no IGF reviewable salvo evidencia nueva.

TESTS QUE ESCRIBIRÍA: A–H; F canónica; anti-confusión IGF/M4/AR; `septiembre` → YYYY-MM; `llantas` sin prefijo `concepto`.

---

## 0. G1

Rama: `audit/director-ia-folio-supports-concept-month-001` ≠ `main`.

Solo `AUTHORIZED` → `IN_PROGRESS`. Campos humanos intactos. `implementation_authorized: NO`. Sin producto. Sin tests permanentes. Sin SQL. Sin LIVE_DB. Sin commit.

Sondas: `detectDirectorIaIntent` + `planDirectorIaQuestion` + `buildDirectorIaToolPlan` + `isIgfReviewableSupportsQuestion` + `detectUnsupportedDirectorIaDomain`.

## 1. Traza de F (canónica)

`que apoyos/folios tenemos para septiembre de llantas?`

| Frontera | Estado | Hecho |
|---|---|---|
| QUESTION | PASS | utterance LIVE |
| normalization | PASS | NFD/minúsculas; `/` se conserva; `\bapoyos?\b` y `\bfolios?\b` sí matchean |
| planner intent | FAIL | `unknown` / `no_rule_matched` / 0.35 |
| structured filters | NOT_REACHED | no hay slot mes/concepto en el plan |
| capability/domain | NOT_REACHED | `domains=[]` |
| tool plan | NOT_REACHED | `can_execute=false`, tools=[] |
| executor | NOT_REACHED | chat `unknown` → `buildUnknownClarificationResult` |
| loader | NOT_REACHED | |
| physical Folios | NOT_REACHED | |
| plant / month / concept | NOT_REACHED | |
| response | FAIL | aclaración genérica LIVE |

`detectUnsupportedDirectorIaDomain` = null. No es dominio “no integrado”; es intent no clasificado.

`isIgfReviewableSupportsQuestion` = false. `isM4ClasificacionQuery` no dispara. No cae a Action Register.

La barra `apoyos/folios` **no** es el fallo. El fallo es que ningún detector acepta “listar + mes + concepto”.

## 2. Sondas A–H

Todas: intent=`unknown`, confidence=0.35, clarification=true, reason=`No se pudo determinar una intención clara con las reglas actuales`, domains=[], igf_reviewable=false, unsupported=null, tool_can_execute=false.

| ID | normalized (aprox.) | Por qué no entra |
|---|---|---|
| A | que folios tenemos de llantas | folio_status pide etapa/estatus/tablero/kanban |
| B | que folios tenemos en septiembre | igual; no hay listado por mes |
| C | que folios tenemos en septiembre de llantas | igual |
| D | que apoyos tenemos de llantas | reviewable pide revisar/recortar/cancel/depósito/IGF/riesgo |
| E | que apoyos tenemos en septiembre | igual |
| F | que apoyos/folios tenemos para septiembre de llantas | unión de D+A; ningún detector |
| G | muestrame los folios de llantas de septiembre | “muéstrame” ≠ listar/listado/kanban |
| H | que gastos de llantas tenemos en septiembre | expense_analysis exige gastos **y** folio/categoría/listado |

H tampoco entra. No es un caso “gastos ya funciona”.

## 3. Preguntas 1–10

1. **folio_status** no es solo un folio. `loadFolioStatusForChat` hace single por id/número **o** `mode=list` por planta + etapa opcional. El listado **no** filtra mes ni concepto. SELECT sin `concepto`/`descripcion`/`mes_cargo`.

2. **LIST/SEARCH FOLIOS BY FILTERS (planta+mes+concepto libre): NO.** Hay listado por planta/etapa (M2) y listado GASTOS por planta+YYYY-MM+partida etiquetada (M6). No hay search unificado.

3. **“apoyos” y “folios” no convergen.**
   - folios → M2 etapa/estatus
   - apoyos reviewable → IGF contrafactual
   - clasificación de apoyos → M4 matriz
   - gastos de folios → M6
   F no entra a ninguna.

4. **Extracción estructurada**
   - planta: YES (UI `planta_id`)
   - mes: no en planner; M6 solo `\d{4}-\d{2}`; “septiembre” no
   - concepto libre: no; M6 `parsePartidaFilter` exige `partida|subcategoria|concepto <texto>`

5. **Tool/executor con esos tres filtros: NO.**
   `get_folio_status`: planta + question (refs/etapa).
   `get_expense_analysis`: planta + question; periodo YYYY-MM obligatorio.

6. **Loader reutilizable sin SQL nuevo: PARTIAL.**
   `queryGastosInversionesFolios` ya lee `public.folios` con `planta_id`, `mes_cargo`, `concepto`/`descripcion`, importe, estatus, beneficiario. No está cableado a F y no entiende “septiembre” ni “de llantas”.

7. **Campo para “llantas”:** `f.descripcion` o `f.concepto` (M6: `COALESCE(descripcion, concepto)`). También `subcategoria` si el needle cae ahí. M2 no proyecta esos campos.

8. **Fecha de “septiembre”:** en M6, `f.mes_cargo`. En M2 list, `f.creado_en` solo ordena; no filtra mes. Año no está en la frase (LIVE 2026 por contexto humano).

9. **Datos físicos posibles (M6, no M2):** folio, concepto/descripcion, importe, `mes_cargo`, estatus, beneficiario (proveedor), categoría, partida. M2 list: folio, estatus, etapa, categoría, importe; sin concepto ni mes_cargo.

10. **¿“apoyos” se confunde con reviewable/M4?** No. Esas rutas no disparan. El síntoma es `unknown`, no un intent equivocado.

## 4. Capacidad LIST/SEARCH

Requisito: LIST/SEARCH + plant + month + free-text.

| Pieza | ¿Existe? |
|---|---|
| Listar folios por planta | YES (M2, etapa) |
| Listar por mes calendario en lenguaje natural | NO |
| Filtrar concepto libre (`de llantas`) | NO |
| Filtrar concepto etiquetado (`concepto llantas`) en GASTOS | PARTIAL (M6) |
| Intent que una esas tres | NO |

Sustitutos rechazados (sin evidencia de que correspondan a F):

- folio_status individual
- Action Register
- igf_reviewable_supports
- clasificacion_apoyos

M6 es el **loader más cercano**, no el contrato de F. “apoyos/folios” no está definido como categoría GASTOS en el planner.

## 5. Filtros

FILTRO PLANTA: YES — `planta_id` del chat; M2/M6 acotan `f.planta_id`.

FILTRO MES: AMBIGUOUS — existe `mes_cargo` en M6 si el texto trae `YYYY-MM`. “septiembre” no se resuelve. M2 no filtra mes.

FILTRO CONCEPTO: PARTIAL — M6 `applyPartidaFilter` sobre partida/concepto si hay prefijo `concepto|partida|subcategoria`. “de llantas” no extrae.

## 6. Clasificación

No es solo A. Si se parcheara el planner hacia folio_status, T4-equivalente seguiría ciego a mes/concepto. Si se mandara a expense_analysis, M6 pediría YYYY-MM y no vería “llantas”.

Por eso **G. MULTIPLE_BOUNDARIES**:

1. FIRST: planner `no_rule_matched`
2. NEXT: no hay LIST/SEARCH + mes + concepto libre

## 7. FIX mínimo (propuesta; no implementado)

No regex `/llantas/`.

1. Intent de **listado filtrado** (no etapa, no reviewable, no M4).
2. Extraer mes calendario → `YYYY-MM` (año del contexto/now).
3. Extraer concepto libre sin exigir la palabra `concepto`.
4. Ejecutar contra loader existente de `public.folios` que ya tenga planta + `mes_cargo` + texto (M6 es el candidato; hay que decidir si “apoyos” = GASTOS).
5. Responder lista factual (folio, concepto, importe, mes, estatus, beneficiario). Sin AR. Sin causalidad.

Si “apoyos” no es GASTOS, STOP: hace falta decisión humana de categoría/fuente.

## 8. Qué NO hacer

- Regex de `llantas`
- Forzar F a folio_status / reviewable / M4 / AR
- SQL nuevo antes de agotar M6
- LIVE_DB / frontend / merge

## 9. Archivos / tests de un FIX futuro

- `lib/director-ia-planner.js`
- extractor mes/concepto (módulo Folios o M6)
- `lib/director-ia-m6-gastos-inversiones.js` solo si se reutiliza
- `lib/director-ia-chat.js` ruta de ese intent
- tests A–H + F + anti-confusión

No tocados en esta auditoría: producto, planner, frontend, SQL.
