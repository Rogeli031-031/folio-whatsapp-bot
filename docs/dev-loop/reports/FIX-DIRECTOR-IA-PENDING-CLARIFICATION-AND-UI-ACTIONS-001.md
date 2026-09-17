# FIX-DIRECTOR-IA-PENDING-CLARIFICATION-AND-UI-ACTIONS-001

```yaml
task_id: "FIX-DIRECTOR-IA-PENDING-CLARIFICATION-AND-UI-ACTIONS-001"
outcome: "DONE_PENDING_REVIEW"
mode: "IMPLEMENTATION"
implementation_authorized: YES
merge_authorized: NO
deploy_authorized: NO
schema_changes: false
data_mutation: false
merge: false
deploy: false
base_main_sha: "4161444203ab06b1c06b1025ef721fc6e0a48475"
branch: "fix/director-ia-pending-clarification-ui-actions-001"
g1_human: "AUTHORIZED + HUMAN + AUTHORIZED_BY_HUMAN intactos; implementer no los escribió"
secrets_check: "none"
contracts_modified: []
```

## SHA / rama

- `reference_main` / `origin/main`: `4161444203ab06b1c06b1025ef721fc6e0a48475`
- Rama: `fix/director-ia-pending-clarification-ui-actions-001`
- No PR. No merge. No deploy. No next task.

## Auditoría primero (sin phrasebook)

Se reprodujeron en código las cuatro secuencias pedidas antes de cambiar semántica de fuente ARR.

| Seq | Preguntas | Resultado pre-fix |
|---|---|---|
| 1 | `qué folios son de llantas?` → `de enero a agosto` | LIST sin periodo devolvía aclaración, pero el HTTP 400 previo (ya sustituido a `ok:true` + `pending_period`) y un `pending_information_gap` incompleto no reconstruían el frame. La respuesta corta no forzaba `folio_search`. |
| 2 | `top 5 clientes que más compran?` → `septiembre` | El parent `client_ranking` se heredaba, pero `extractClientRankingSpec` exigía pregunta de ranking o follow-up de entity-set. `septiembre` no era follow-up. Resultado: `No pude determinar el ranking`. |
| 3 | `top 5 clientes que más compran en septiembre` | Spec sí extrae `period=2026-09`, `VENTA_TON`, `TOP`, `limit=5`, canal `ALL`. La fuente es solo observada. |
| 4 | lista → `abre el primero` | Backend emitía `ui_action.OPEN_FOLIO` y decía `Abro el folio…`. `DirectorIaChatPanel` ignoraba `ui_action`. Side effect fingido. |

No se agregó phrasebook de producción. Las 30+30+30+30 viven solo en tests.

## Root cause independiente

### A — Pending clarification completion

Dos fallas distintas, misma familia.

1. **Folios.** `folio_search_spec` no puede persistir LIST incompleto (`sanitizeFolioSearchSpec` exige mes en `SINGLE`). La aclaración de periodo no dejaba un frame rico. La respuesta corta (`de enero a agosto`) se planeaba como unknown o como extractor huérfano (rango sin concepto).
2. **Ranking.** Sí había inherit de parent, pero el extractor rechazaba una respuesta que solo aporta la dimensión pedida.

Contrato implementado: `pending_information_gap.kind=dimension_completion` con `frame` + `missing_fields`. La respuesta corta reemplaza solo `period|plant|channel|entity`. No hardcodea `septiembre` ni `enero a agosto`.

Módulo: `lib/director-ia-pending-completion.js`.

### B — OPEN_FOLIO fingía navegación

Cadena auditada:

`askDirectorIa` → `ui_action { type: OPEN_FOLIO, folio_id, numero_folio }` → API `DirectorIaUiAction` → `DirectorIaChatPanel` → **no consumía** → `FolioDrawer` existía en dashboard pero no en chat modal/shell.

Root cause: el backend afirmaba un side effect que el frontend no ejecutaba.

Corrección: wording truthful `El primer folio es F-…` (nunca `Abro`). Si hay `folio_id` y `onOpenFolio`, el panel abre `FolioDrawer` de verdad. Si no hay handler, el texto sigue siendo factual.

### C — CLIENT_RANKING septiembre / Acapulco

Auditoría de código (sin DB viva en este entorno). No se cambió la fuente antes de clasificar.

| Paso | Hallazgo |
|---|---|
| `planta_id` | El del chat (Acapulco). `resolvePlantByNombre` / planta seleccionada. |
| Códigos ARR | `resolvePlantCodes(Acapulco)` → p. ej. `E3` en fixture. Ranking no inventa códigos. |
| Period | `2026-09` (1..último día). Año del `now` de chat (`2026-09-16`). |
| `upload_day` / corte | **No entra** a la query de ranking. El rango es mes calendario observado. No es pérdida de corte (no es C). |
| SQL | `queryMonthlySales` → `SELECT … SUM(v.kg) FROM arr.ventas_diarias_cliente v … fecha BETWEEN 2026-09-01 AND 2026-09-30`, canal `ambos` (`ALL`). |
| ARR UI | Misma tabla observada. En mes **abierto** la UI multiplica kg observados por factor de proyección (`venta-proyeccion-mes` / `arr.forecast_mensual`). |
| Mezcla | Ranking **nunca** lee forecast. |

**Clasificación: D** (septiembre en UI puede ser forecast/proyección; la tabla observada del mes abierto puede estar vacía o parcial). No A (query mal formada). No B demostrable sin filas vivas. No C.

Decisión contractual: ranking permanece **observado**. Si hay filas, las devuelve etiquetadas `observado parcial (no forecast)` en mes abierto, o `observado` en mes cerrado. Si no hay filas en mes abierto: declara ausencia observada y avisa que el ARR de UI puede mostrar proyección. **No mezcla forecast en el ranking.**

### D — Period fallback

Orden ahora:

1. periodo explícito en la pregunta
2. periodo de `pending_information_gap` completado
3. periodo conversacional compatible (prior spec)
4. periodo seguro ARR/corte (`selectedPeriod` / upload) solo si ya es dimensión usable, no inventada
5. aclaración

Nunca inventar mes. LIST enumerativo (`qué/cuáles/lista/enlista folios de {concepto}`) **no** cae a `ANY` / ALL TIME. EXISTENCE (`¿Existe un folio de…?`, `¿Hay folios de…?`) conserva `period_mode=ANY`.

## Implementación

- `lib/director-ia-pending-completion.js` — gap + patch genérico.
- `lib/director-ia-folio-search.js` — LIST enumerativo pide periodo; `pending_period` + gap; `folioItems` cubre RANGE/SINGLE inyectado; concepto no se pierde cuando el último `de X` es planta (`llantas de Acapulco`).
- `lib/director-ia-client-ranking.js` — `isPeriodOnlyAnswer` es follow-up; cues semánticos de `compran más` / `quiénes`; empty open-month truthful; gap de periodo.
- `lib/director-ia-chat.js` — `completePendingFrame` antes del planner (`forceIntent`); inherit de frame completado; OPEN_FOLIO truthful.
- Frontend: `api.ts` transporta `ui_action`; `DirectorIaChatPanel` llama `onOpenFolio`; modal/shell montan `FolioDrawer`.
- `lib/director-ia-executive-backlog.js` — export de `extractChannel` para el completion genérico.

## Tests

Nuevo: `test/director-ia-pending-clarification-and-ui-actions.test.js`

- 30 Folio asks + 30 cortas
- 30 Ranking asks + 30 cortas
- 30 OPEN_FOLIO
- 30 ranking de periodo explícito
- anti-colisiones
- conversación completa: folios→enero-agosto; ranking→septiembre; ranking explícito septiembre; lista→abre el primero (`ui_action` real + wording truthful)

Nuevo **7/7 pass**.

Regresiones (153/153 pass):

- `test/director-ia-executive-conversational-backlog.test.js` (15/15)
- `test/director-ia-folio-concept-count.test.js`
- `test/director-ia-user-identity-greeting.test.js`
- `test/director-ia-seh-operation-status.test.js`
- `test/director-ia-expense-analytics-core.test.js`
- `test/director-ia-folio-search-truthful.test.js`
- `test/director-ia-new-clients-purchase-discount.test.js`
- `test/director-ia-seh-followup-folio-existence.test.js` (EXISTENCE 30/30 intacto)

## Límites

- No se ejecutó SQL contra ARR productivo. La clasificación C=D es de código y contratos, no un conteo de filas de septiembre Acapulco.
- No se editó `docs/director-ia/`.
- No hay mutación de schema ni datos.
- No PR. No merge. No deploy.

## Cierre

**DONE_PENDING_REVIEW.**

Espera Gate humano. Este reporte no autoriza la siguiente tarea.
