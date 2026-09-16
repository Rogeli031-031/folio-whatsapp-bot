# IMPL-DIRECTOR-IA-COMMERCIAL-PROCUREMENT-CONTINUITY-001

```yaml
task_id: "IMPL-DIRECTOR-IA-COMMERCIAL-PROCUREMENT-CONTINUITY-001"
outcome: "DONE"
mode: "IMPLEMENTATION"
implementation: true
code_changes: true
schema_changes: false
data_mutation: false
new_tables: false
new_indexes: false
seh_data_mutated: false
folios_mutated: false
merge: false
deploy: false
reference_main: "8863f60a897e9025d4227d24ed84f3c1e4aad718"
branch: "implementation/director-ia-commercial-procurement-continuity-001"
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
human_decision_needed: "Revisar. Este agente no mergea, no abre PR, no despliega y no abre la siguiente tarea."
```

## 1. Estado final

**DONE_PENDING_REVIEW.**

Huecos de producción posteriores a CROSS-DOMAIN-001 cerrados en un loop, con semántica general (no phrasebook):

1. `CLIENT_RANKING` extendido a `DESCUENTO_POR_KG` + fallback de periodo.
2. Movimiento comercial crudo: `AUMENTO` / `DISMINUCION` / `DEJO_DE_COMPRAR` / `NUEVO` / `SIN_CAMBIO` / `INACTIVO`.
3. Historia de transición y movimiento de descuento con valores crudos.
4. Continuidad de entity-set comercial.
5. Evidencia de cliente con `source_type` preservado.
6. Compras por concepto libre: gasto relacionado, beneficiarios, proveedores, unit cost fail-closed.
7. Result-set universal de Folios + sanitización de códigos internos.

## 2. SHA base

`origin/main` = `8863f60a897e9025d4227d24ed84f3c1e4aad718` (PR #31, CROSS-DOMAIN-001).

## 3. Rama

`implementation/director-ia-commercial-procurement-continuity-001`

## 4. Commit

Se registra en el commit de cierre de esta rama. No se empuja a `main`.

## 5. Causa raíz por familia

| Familia | Causa raíz |
|---|---|
| CLIENT_RANKING descuento | La métrica era solo `VENTA_TON`. No existía `DESCUENTO_POR_KG`. |
| Period fallback | Sin periodo explícito el ranking pedía mes y no usaba ARR seleccionado ni latest seguro. |
| CLIENT_MOVEMENT | “consumir” caía a unknown; `commercial_trend`/`computeDicf` mezclaban DEJO_DE_COMPRAR con DISMINUCION y podían usar forecast/redondeo. |
| INACTIVO | Se equiparaba silenciosamente a churn. No había ventana explícita. |
| TRANSITION | No se persistían previous/current/delta/last_nonzero/first_zero. |
| DISCOUNT_MOVEMENT | Se verbalizaba “disminuyó” sin anterior/actual/delta. |
| Raw vs display | Clasificación usaba valor de presentación (`0.0`) en vez de crudo (`0.018`). |
| Entity-set | `sanitizeActiveEntities` o el follow-up expandían al universo completo. |
| CLIENT_EVIDENCE | Action Register se etiquetaba como DICF. |
| PROCUREMENT | Expense fail-closed exclusivo no ofrecía total relacionado; no había familia de proveedores/beneficiarios/unit cost. |
| Folio result-set | `sanitizeActiveEntities` / spec exigían concepto; un set de pagados no persistía y SUM caía a unknown. |
| E9 | `planta_nombre` crudo o código interno se verbalizaba. |

## 6. Arquitectura

Extensión de familias existentes + módulos nuevos read-only:

- `CLIENT_RANKING` se extiende; no se crea una familia paralela de ranking.
- `client_movement` clasifica con valores crudos ARR actual-vs-actual. No usa forecast para `DEJO_DE_COMPRAR`.
- Planner conserva `commercial_trend` / `plant_diagnosis` / `historical_new_clients` / `delta_discount` / `expediente_comercial` cuando esas familias históricas ya cubren el caso.
- Chat `forceIntent` aplica `client_movement` / `client_evidence` / `procurement_by_concept` solo cuando no hay colisión con esas familias.
- Folios: spec reproducible con `concept_mode=NONE`, status/categoría/beneficiario/`result_count`.
- Capability/tool registry mínima: `get_client_movement`, `get_client_evidence`, `get_procurement_by_concept`.

## 7. CLIENT_RANKING descuento

`metric = VENTA_TON | DESCUENTO_POR_KG`  
`direction = TOP | BOTTOM`  
`limit = N`  
`segment = CASA | COMISIONISTA | ALL` (+ dual casa/comisionista)

Fuente ARR real (`arr.descuentos_diarios_cliente` / `SUM(monto)/SUM(kg)`). No se deriva descuento desde venta.

Respuesta mínima: cliente, descuento_actual, unidad `$/kg`, periodo, segmento, planta. Si hay historia: anterior + delta.

## 8. Customer movement

Estados separados con valor crudo:

- `DEJO_DE_COMPRAR`: previous > 0 AND current == 0
- `DISMINUCION`: previous > current AND current > 0
- `AUMENTO`: current > previous AND previous > 0
- `NUEVO`: previous == 0 AND current > 0
- `SIN_CAMBIO`: iguales

`0.018` redondeado a `0.0` **no** es `DEJO_DE_COMPRAR`.

## 9. Inactivity

`INACTIVO ≠ DEJO_DE_COMPRAR`.

Ventana solo si el usuario la declara (30/60 días, este mes, desde un mes, N periodos). Sin ventana y sin contrato seguro: se aclara. No se inventa en silencio.

## 10. Transition history

Cuando hay evidencia: `previous_period`, `previous_consumption`, `current_period`, `current_consumption`, `delta_ton`, `movement_type`, `last_nonzero_period`, `first_zero_period`.

Granularidad mensual: se muestra mes. No se inventa día.

## 11. Discount movement

`previous_discount` / `current_discount` / `delta_discount` / periodos. Ranking de aumentos y reducciones con valor real.

“cómo cambió el descuento” a nivel planta sigue en `delta_discount`. El movimiento de descuento exige semántica de clientes o comparación temporal de descuento.

## 12. Raw vs display

`classification_value = raw_value`  
`display_value = formatted_value`

Prohibido clasificar con `round(current, 1) == 0`.

## 13. Actual vs forecast

ARR inspeccionado: existen series actual y forecast. Este loop usa **actual-vs-actual** para movement/churn.

Forecast no se presenta como venta real. Forecast no declara `DEJO_DE_COMPRAR`.

`commercial_trend` histórico (DICF/forecast) se preserva para “cómo vamos” / movers de Estado Ejecutivo.

## 14. Entity-set continuity

Tras una respuesta con entidades concretas se persiste `result_entities` + domain/planta/periodo/segmento/métrica.

Follow-ups (`cuánto disminuyeron`, comentarios, descuento, quién cayó más) operan **solo** sobre esas entidades.

Cambio explícito (“ahora todos los que disminuyeron”) sí amplía universo.

## 15. Client evidence / source provenance

`source_type` obligatorio:

- `ARR_COMMENT`
- `CLIENT_COMMENT`
- `DICF`
- `ACTION_REGISTER`
- `BITACORA`

0 recategorizaciones DICF ↔ Action Register.

“qué acciones hay del tema Clientes” permanece Action Register general, no evidencia de un cliente.

Expediente comercial M11 no se secuestra.

## 16. Procurement by concept

Concepto libre. Sin whitelist.

Operaciones: `SPEND` / `SUPPLIERS` / `BENEFICIARIES` / `COUNT` / `LIST` / `LATEST` / `SUM` / `UNIT_COST`.

Gasto relacionado: count + total de folios coincidentes + disclaimer. No afirma gasto exclusivo.

## 17. Supplier vs beneficiary

Campo físico de proveedor **no presente** en la fuente Folios usada.

`beneficiario != proveedor`. Si solo hay beneficiario, se dice que no se puede afirmar que todos sean proveedores. No se renombran campos.

## 18. Unit cost

Solo si existen simultáneamente cantidad atribuible e importe atribuible al mismo concepto.

No se deriva cantidad de folios, palabras, renglones o vehículos.

Folio mezclado (llantas + servicio/alineación/otras piezas) → `NOT_DETERMINABLE`.

Texto inequívoco `COMPRA DE 4 LLANTAS ... $40,000` sí calcula.

## 19. Universal Folio result-set

Toda consulta Folios con set reproducible guarda: domain, semantic_class, plant, period/range, status, concept, category, beneficiary, result_count, filtros, sort.

Follow-ups: COUNT / LIST / SUM / STATUS / DATE / LATEST / OLDEST / HIGHEST_AMOUNT / LOWEST_AMOUNT / FILTER_STATUS / FILTER_CATEGORY / FILTER_BENEFICIARY / GROUP_BY_BENEFICIARY / GROUP_BY_CATEGORY.

Flujo pagados septiembre → suma → mayor → menor → Taller → lista → beneficiarios: mismo set, sin unknown.

## 20. Period fallback

Precedencia:

1. periodo explícito
2. periodo conversacional compatible
3. periodo seleccionado ARR/dashboard
4. latest ARR seguro e inequívoco, informado al usuario
5. aclaración

Ejemplo: `Tomando septiembre 2026, último periodo disponible en ARR`.

## 21. Internal-code sanitization

`lib/director-ia-display-sanitize.js` omite códigos internos (`E9`, `plant_id=`, `status_code=`) cuando no hay label humano resoluble. No inventa traducción.

## 22. Routing

Precedencia relevante:

1. SEH / Folios pagados / existencia
2. Procurement SUPPLIERS / BENEFICIARIES / UNIT_COST
3. Expense Analytics (gasto; exacto exclusivo → BREAKDOWN_MISSING)
4. `historical_new_clients` antes de ranking
5. `CLIENT_RANKING`
6. `commercial_trend` (cómo vamos / movers)
7. `plant_diagnosis` para “por qué dejó de comprar [nombre]”
8. `delta_discount` planta
9. `client_movement`
10. `expediente_comercial` antes de `client_evidence`

Chat no fuerza movement sobre hilo `commercial_trend`, clientes nuevos históricos, ni diagnóstico causal singular.

## 23. Archivos modificados

Nuevos:

- `lib/director-ia-client-movement.js`
- `lib/director-ia-client-evidence.js`
- `lib/director-ia-procurement-by-concept.js`
- `lib/director-ia-display-sanitize.js`
- `test/director-ia-commercial-procurement-continuity-core.test.js`
- `test/director-ia-commercial-procurement-continuity-batteries.test.js`
- `docs/dev-loop/reports/IMPL-DIRECTOR-IA-COMMERCIAL-PROCUREMENT-CONTINUITY-001.md`

Modificados:

- `lib/director-ia-client-ranking.js`
- `lib/director-ia-conversation-state.js`
- `lib/director-ia-folio-search.js`
- `lib/director-ia-expense-analytics.js`
- `lib/director-ia-planner.js`
- `lib/director-ia-chat.js`
- `lib/director-ia-capabilities.js`
- `lib/director-ia-tools.js`
- `docs/dev-loop/CURRENT_TASK.md`

No se commitea `frontend-dashboard/.next`.

## 24. Baterías 30+10+10

13 familias × 50 = 650 casos conceptuales.

1. CLIENT_RANKING_DISCOUNT
2. CLIENT_MOVEMENT
3. CLIENT_INACTIVITY
4. CLIENT_TRANSITION_HISTORY
5. DISCOUNT_MOVEMENT
6. CLIENT_ENTITY_SET_FOLLOWUP
7. CLIENT_EVIDENCE_AND_ACTIONS
8. PROCUREMENT_SPEND
9. PROCUREMENT_SUPPLIERS
10. PROCUREMENT_BENEFICIARIES
11. PROCUREMENT_UNIT_COST
12. FOLIO_UNIVERSAL_RESULT_SET
13. CLIENT_RANKING_PERIOD_FALLBACK

Las frases viven en tests. Producción usa reglas compartidas (`proveedor(?:es)?`, ventanas, raw vs display, etc.).

## 25. Resultados exactos

```
node --test test/director-ia-commercial-procurement-continuity-core.test.js
             test/director-ia-commercial-procurement-continuity-batteries.test.js
→ 47/47 pass
```

## 26. Regresiones ejecutadas

Pass:

- CROSS-DOMAIN-001 (SEH planta explícita, ranking venta, pagados septiembre, result-set, “¿Cuántas estaciones tiene Puebla?”)
- commercial-movers, commercial-trend, conversational-continuity
- client-profile, new-clients P1-P6
- expense-analytics (salvo excepción histórica de refacciones, abajo)
- expense-generic-keyword
- folio truthful / period-range / aggregation follow-up funcional
- SEH operation + follow-up + folio existence
- EXECUTIVE_STATUS, DIAGNOSIS, greeting/smalltalk
- M11 expediente comercial

Validación expresa:

- ¿Cuántas estaciones tiene Puebla? → `seh_operation_status`
- Top 5 clientes de venta casa → `client_ranking` + fallback de periodo
- ¿Qué folios se han pagado hasta ahorita en septiembre? → set persistido
- ¿Existe un folio de extintores? / ¿Cuáles son? → existencia + lista
- ¿Cuánto gastamos en extintores? → expense/procurement, no exclusive inventado

## 27. Excepciones históricas

No se editaron tests históricos. Archivos autorizados en este CURRENT_TASK.

| Test | Expectativa histórica | Archivo cambiado | Por qué está autorizado | Regresión funcional | Resultado |
|---|---|---|---|---|---|
| `expense-analytics-core` 9-10 / 10 refacciones | `¿Cuánto gasté en refacciones en enero?` → `BREAKDOWN_MISSING` aunque no diga “exactamente” | `lib/director-ia-expense-analytics.js` | Este task exige total relacionado útil si no hay cue de exclusividad. `exactamente`/`exclusivamente` sigue `BREAKDOWN_MISSING` (LLANTAS_EXACT pass). | Aceite/llantas exactos y Taller SUM | Funcional pass; refacciones sin cue exacto ahora `FOLIO_TOTAL_ONLY` + disclaimer |
| `folio-search-aggregation-followup` 011 | keys canónicas sin status/categoría/beneficiario/result_count | `lib/director-ia-conversation-state.js`, `lib/director-ia-folio-search.js` | Result-set universal debe persistir esos filtros | Follow-ups SUM/LIST/existencia | Funcional pass |
| `folio-search-aggregation-followup` 087 | no new tool | `lib/director-ia-tools.js` | Registry mínima autorizada | Tools read-only | Diff esperado |
| `folio-search-aggregation-followup` 091 | no planner | `lib/director-ia-planner.js` | Routing autorizado | Familias históricas reruteadas con precedencia | Funcional pass |

## 28. Limitaciones

- No hay campo físico de proveedor en Folios; SUPPLIERS falla cerrado semánticamente.
- Unit cost exige cantidad+importe inequívocos en el mismo concepto.
- Inactividad sin ventana no inventa definición.
- Latest ARR solo si la fuente lo determina de forma inequívoca.
- `commercial_trend` sigue existiendo para Estado Ejecutivo / “cómo vamos”; movement crudo no lo sustituye en ese hilo.
- Sin schema, OCR, embeddings ni catálogo de conceptos.

## 29. Diff conceptual

Antes: ranking solo por toneladas; movement mezclado con forecast/redondeo; evidencia recategorizada; Folios pagados sin continuidad SUM; descuento 0.000 inventado; E9 visible.

Ahora: ranking dual métrica; movement crudo; evidencia por fuente; gasto relacionado veraz; result-set universal; periodo latest informado; códigos internos omitidos.

## 30–33. Confirmaciones

- `schema_changes=false`
- `data_mutation=false`
- `merge=false`
- `deploy=false`

## 34. STOP

Fin de implementación. Espera revisión humana.

NO PR. NO merge. NO deploy. NO siguiente tarea.
