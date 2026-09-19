# FIX-DIRECTOR-IA-EXECUTIVE-CONTEXT-SALES-AND-ENTITY-INHERITANCE-010

## Identidad

| Campo | Valor |
|---|---|
| task_id | FIX-DIRECTOR-IA-EXECUTIVE-CONTEXT-SALES-AND-ENTITY-INHERITANCE-010 |
| outcome | DONE_PENDING_REVIEW |
| base_sha | 78cb437a2be2a8f283213899366d9d7e0441d1f4 |
| branch | fix/director-ia-executive-context-sales-entity-inheritance-010 |
| schema_changes | false |
| data_mutation | false |
| merge | false |
| deploy | false |
| PR | no |
| frontend | no tocado; `npm run build` no era necesario |

## Contratos consultados

- `docs/director-ia/` no se modificó (sin G2/G3).
- `origin/main` `78cb437a` (merge de 009 / PR #54) como base.
- Fuente de venta: `arr.ventas_diarias_cliente` (`kg > 0`, corte = `MAX(fecha)`).
- Fuente de gasto por keyword: mismos `public.folios` que `folio_search`.
- Semana: lunes–corte físico. Mes: día 1 del mes del corte–corte.

## Contratos modificados

Ninguno.

## Archivos tocados

- `lib/director-ia-executive-context-sales-entity-010.js` (nuevo)
- `lib/director-ia-planner.js`
- `lib/director-ia-conversational-executive-layer.js`
- `lib/director-ia-chat.js`
- `lib/director-ia-conversation-state.js`
- `lib/director-ia-predictive-commercial.js`
- `lib/director-ia-expense-analytics.js`
- `lib/director-ia-seh-operation-status.js`
- `lib/director-ia-seh-taller-purchase-evidence-008.js` (excluye `taller de AT-*` del gasto Taller)
- `test/director-ia-executive-context-sales-entity-010.test.js` (nuevo)
- `test/fixtures/director-ia-executive-context-sales-entity-010.js` (nuevo)
- `docs/dev-loop/reports/FIX-DIRECTOR-IA-EXECUTIVE-CONTEXT-SALES-AND-ENTITY-INHERITANCE-010.md`
- `docs/dev-loop/CURRENT_TASK.md` (solo `status`)

No se commitean `.next`, `node_modules` ni reportes OPS-VERIFY ajenos.

## Causa raíz por familia

### Plant resolution (todas las familias de venta/diagnóstico)

CEL extraía tokens de utterance (`venta`, `actual`, `septiembre contra octubre`) como nombre de planta y preguntaba aclaración antes de heredar la planta de UI. Palabras de negocio/tiempo no son planta. Si hay `planta_id` / `planta_nombre` autorizada, se hereda. Solo se pregunta planta cuando no hay ancla válida. La respuesta corta completa `pending_intent` + pregunta original; no se reclasifica “Acapulco” como consulta nueva.

### SALES_STATUS

“¿Cómo va la venta?” caía a CLIENT_FORECAST / fallback genérico de proyección por cliente. Ahora se clasifica a `executive_sales_context` y se materializa venta observada, corte, forecast/meta solo si existen, y ritmo de 7 días vs 7 previos.

### PLANT_DIAGNOSIS_CURRENT

“diagnóstico de la planta actual”: `actual` se resolvía como planta. El diagnóstico usa la planta seleccionada y señales soportadas. El clasificador no roba SEH, regulación, churn de clientes ni brief diario.

### PERIOD_COMPARISON_EXPLICIT

“septiembre contra octubre” se extraía como planta. Ahora es periodo A vs B: observado vs observado, o observado vs forecast etiquetado. Nunca se presenta forecast como realizado. Rangos “de X a Y” sin contra/vs no son esta familia.

### SAME_PERIOD_PREVIOUS_MONTH

La pregunta se describía en vez de calcularse. Ahora: MTD actual vs mismo día/corte del mes anterior (ton, delta, %). Sin evidencia comparable → `INSUFFICIENT_EVIDENCE`.

### SALES_TODAY_WEEK_MONTH

Caía a SEH. Ahora consulta `arr.ventas_diarias_cliente`: hoy = corte, semana = lunes–corte, mes = inicio de mes–corte. No usa fecha de servidor si hay `MAX(fecha)`.

### LOW_SALES_CARBURATION

Caía a SEH/equipos. Auditoría: `arr.ventas_diarias_cliente` tiene planta/canal/subcanal/cliente_norm, no estación. Respuesta: `INSUFFICIENT_EVIDENCE`. No se inventa ranking.

### SALES_TREND_TO_CLOSE

Caía a forecast por cliente. Ahora separa HECHO / PROYECCIÓN / SEÑAL / ESCENARIO. El escenario lineal no es certeza.

### ACTIVE_CLIENT_ENTITY_INHERITANCE

El follow-up “¿Cuál fue su última compra?” listaba el universo DICF (164 ZAPATA, etc.) porque `sanitizeActiveEntities` exigía `display` y la entidad predictiva solo tenía `ranked_names`. Ahora persiste `kind=CLIENT` + `canonical_name`. Pronombres y LAST_PURCHASE / FREQUENCY / EXPECTED_NEXT / DAYS_SINCE / OVERDUE usan esa entidad y la evidencia enriquecida de 009. Cambio explícito de cliente reemplaza. Cambio de dominio (Taller/folios/SEH/comisión) limpia el cliente.

### KEYWORD_EXPENSE / llantas

“¿Cuánto hemos gastado en llantas…?” caía a commercial forecast, o decía que no podía atribuir aunque `folio_search` ya encontraba folios. Ahora reusa el mismo result set de folios, suma importe registrado, aclara que el folio puede incluir otros conceptos, y distingue pagado vs registrado. LIST ↔ SUM conserva `result_set_family=FOLIO_KEYWORD`. Sinónimos `llanta`/`neumático` por concepto, no phrasebook. “qué folios contienen” sigue siendo LIST/`folio_search`, no SUM.

## Fuente física

| Familia | Fuente | Grano |
|---|---|---|
| SALES_STATUS / comparativos / hoy-semana-mes / tendencia | `arr.ventas_diarias_cliente` | planta + fecha + kg |
| LOW_SALES_CARBURATION | auditada: misma tabla | no hay estación → INSUFFICIENT |
| Plant diagnosis | pack existente de diagnóstico (venta, IGF, SEH, etc. solo si hay evidencia) | planta |
| Cliente activo | 009: computeDicf → `arr.dicf_cliente_mes.last_date` → `MAX(fecha)` ventas | cliente_norm |
| Keyword expense | `public.folios` (mismo matcher que folio_search) | concepto/descripción + periodo + planta |

No se usa SEH para ventas. No se inventan metas ni forecast.

## Fixtures (solo test)

No hay phrasebook de 450 frases en runtime.

| Familia | Count |
|---|---|
| SALES_STATUS | 50 |
| PLANT_DIAGNOSIS_CURRENT | 50 |
| PERIOD_COMPARISON_EXPLICIT | 50 |
| SAME_PERIOD_PREVIOUS_MONTH | 50 |
| SALES_TODAY_WEEK_MONTH | 50 |
| LOW_SALES_CARBURATION | 50 |
| SALES_TREND_TO_CLOSE | 50 |
| ACTIVE_CLIENT_ENTITY_INHERITANCE | 50 |
| KEYWORD_EXPENSE | 50 |
| **TOTAL utterances** | **450** |
| Anti-collisions | **381** (≥350) |
| Multi-turn | **181** (≥180) |

Anti-collisions obligatorias cubiertas: venta vs plant name; actual vs plant name; meses vs plant extract; carburación venta vs SEH; venta hoy vs SEH; diagnóstico vs client forecast; cliente activo vs DICF completo; “su” sin entidad; llantas vs predictive; llantas vs Taller total; LIST vs SUM; registrado vs pagado; cancelado vs pagado; “cuánto suman” vs search nuevo.

Multi-turn obligatorios: venta + planta pendiente; diagnóstico con planta UI; septiembre vs octubre; mismo corte + toneladas + %; TORTILLERIA ERICK y derivados; cambio a CLIENTE B; llantas LIST→SUM e inverso.

## Regresiones existentes (siguen verdes)

- ¿Cómo estamos en regulaciones?
- ¿Qué permisos están vencidos?
- Dame los documentos pendientes de regulación.
- ¿Cuánto gastamos en taller de enero a septiembre?
- ¿Cuánto gastamos en taller? → enero
- ¿Qué comisión tenemos en Casa?
- ¿Qué comisión tenemos en Comisionista?
- abre la venta diaria
- total de clientes nuevos → agosto
- ¿Cuándo esperamos que vuelva a comprar TORTILLERIA ERICK?
- Follow-up “¿Cuál fue su última compra?” contiene TORTILLERIA ERICK y no 164 ZAPATA / 171 COSTA AZUL / 173 SAN AGUSTIN / 209 LA PALMA.

## Frontend

No se modificó `frontend-dashboard` (salvo artefactos locales `.next` no commiteados). El chat ya envía `planta_id` / `planta_nombre` / `conversation_state`. El fix es routing, planner, conversation_state, retrieval y result-set. **Build frontend no era necesario.**

## Tests

```
node --test test/director-ia-executive-context-sales-entity-010.test.js
node --test test/director-ia-purchase-evidence-enrichment-009.test.js
node --test test/director-ia-seh-taller-purchase-evidence-008.test.js
node --test test/director-ia-category-commission-ui-actions-007.test.js
node --test test/director-ia-direct-metrics-context-hardening-006.test.js
node --test test/director-ia-commercial-runtime-hardening-005.test.js
node --test test/director-ia-commercial-runtime-coverage-004.test.js
node --test test/director-ia-predictive-commercial-coverage.test.js
```

Suites relevantes adicionales (verdes en la misma corrida):

- `test/director-ia-expense-analytics-core.test.js`
- `test/director-ia-expense-generic-keyword.test.js`
- `test/director-ia-plant-diagnosis.test.js`
- `test/director-ia-pending-clarification-and-ui-actions.test.js`
- `test/director-ia-conversational-continuity.test.js`

010–003 + relevantes: **218/218**.

## Gate

- [x] tokens de negocio/tiempo no son planta
- [x] planta UI se hereda; pending completa la pregunta original
- [x] SALES_STATUS no es CLIENT_FORECAST
- [x] diagnóstico usa planta actual, no el token “actual”
- [x] septiembre contra octubre es comparación temporal
- [x] mismo periodo mes anterior calcula delta
- [x] hoy/semana/mes no es SEH
- [x] carburación sin grano de estación → INSUFFICIENT_EVIDENCE
- [x] tendencia separa HECHO/PROYECCIÓN/SEÑAL/ESCENARIO
- [x] follow-up de cliente activo no lista DICF
- [x] llantas suma folios y no afirma exclusividad
- [x] LIST ↔ SUM conserva result set
- [x] ≥450 utterances / ≥350 anti-collisions / ≥180 multi-turn
- [x] 010/009/008/007/006/005/004/003 verdes
- [x] no phrasebook de producción
- [x] no hardcode de Acapulco / TORTILLERIA ERICK / meses / cifras en runtime
- [x] frontend no tocado

## Cierre

`CURRENT_TASK` → `DONE_PENDING_REVIEW`.  
Commit + push solo a `fix/director-ia-executive-context-sales-entity-inheritance-010`.  
NO PR. NO merge. NO deploy. NO siguiente tarea.
