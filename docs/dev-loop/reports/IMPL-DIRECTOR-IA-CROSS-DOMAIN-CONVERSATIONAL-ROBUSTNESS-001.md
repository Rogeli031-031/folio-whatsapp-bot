# IMPL-DIRECTOR-IA-CROSS-DOMAIN-CONVERSATIONAL-ROBUSTNESS-001

```yaml
task_id: "IMPL-DIRECTOR-IA-CROSS-DOMAIN-CONVERSATIONAL-ROBUSTNESS-001"
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
reference_main: "3aec1fbf"
branch: "implementation/director-ia-cross-domain-conversational-robustness-001"
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
human_decision_needed: "Revisar. Este agente no mergea, no abre PR, no despliega y no abre la siguiente tarea."
```

## 1. Estado final

**DONE_PENDING_REVIEW.**

Cuatro huecos de producción cerrados en un loop, con semántica general (no phrasebook):

1. Planta explícita SEH resuelve `planta_id` real antes del query.
2. `CLIENT_RANKING` por `VENTA_TON`.
3. Folios pagados separan STATUS / PERIOD / CUTOFF / CONCEPT.
4. Continuidad de result-set de Folios.

## 2. SHA base

`origin/main` = `3aec1fbf` (PR #30, follow-up SEH + existencia Folios).

## 3. Rama

`implementation/director-ia-cross-domain-conversational-robustness-001`

## 4. Commit final

Se registra en el commit de cierre de esta rama. No se empuja a `main`.

## 5. Causa raíz SEH

`extractPlantLabel` ya devolvía `Puebla`, pero `loadSehOperationStatusForChat` usaba siempre el `planta_id` del dashboard. Auth, `SELECT` y `conversation_state` iban a Acapulco. `plant_display` usaba el label extraído → `plant_label=Puebla` + datos de Acapulco.

`querySehEquipos` además no se invocaba sin `pool` (tests/inyección).

## 6. Causa raíz Client Ranking

`top 5 clientes de venta casa` no tenía familia semántica. Caía a unknown / plant_diagnosis / CEL y devolvía Bitácora, Action Register o riesgo. `isTopVolumeQuestion` del perfil de cliente es demasiado estrecho y no construye un ranking.

## 7. Causa raíz Folios pagados

`locateConceptSpan` / `extractConceptModel` tomaban el residuo `se han pagado hasta ahorita` como concepto. No había capa de STATUS/CUTOFF. El loader listaba con `concepto se han pagado hasta ahorita` y respondía vacío.

## 8. Causa raíz Folio result-set

`isFolioExistenceFollowUp` solo reconocía COUNT / LATEST / PAGADO / SUM. `¿Cuáles son?` y `¿En qué etapa están y qué fecha tienen?` no forzaban `folio_search` ni heredaban filtros → unknown.

## 9. Arquitectura implementada

- Precedencia de planta: explícita → heredada compatible → dashboard → aclarar.
- Identidad física única para query, auth, state y display.
- Nueva familia `CLIENT_RANKING` sobre `arr.ventas_diarias_cliente` (reusa `queryMonthlySales` / `canalSqlFor` / `resolvePlantCodes`).
- Parser Folios: STATUS + CUTOFF se restan del concepto.
- `conversation_state.folio_search_spec` como result-set reproducible (ANY + concepto).
- Chat `forceIntent` para follow-ups SEH / Folios / ranking.

## 10. Explicit plant resolution

`resolveSehPlantIdentity`:

1. Label explícito igual al seleccionado → usa `selectedId` (sin DB).
2. Label explícito distinto → `resolvePlantByNombre` / catálogo inyectado / `public.plantas`.
3. Si no resuelve → no consulta otra planta.
4. Auth sobre el ID final. Deny 403 sin query.

Estaciones/pipas: `COUNT DISTINCT` de `locacion` no vacía. Extintores: semántica vigente.

## 11. CLIENT_RANKING

Campos: `TOP|BOTTOM`, `limit` dinámico, `CASA|COMISIONISTA|ALL`, `VENTA_TON`, planta, periodo.

Periodo: explícito → heredado → `arr_period` / selected → aclarar.

Descuento: fail closed si no hay evidencia.

Fuente: `arr.ventas_diarias_cliente`. No segunda verdad comercial.

## 12. status / period / concept

`hasPaidStatusSemantics` (tokens pagad/liquid/cubier/se pago…).  
`hasCutoffLanguage` (hasta ahorita/hoy/a la fecha/en lo que va/al corte).

Tras extraer periodo se limpia el residuo de estado/corte.  
`¿Qué folios se han pagado hasta ahorita en septiembre?` → `status=PAGADO`, `period=2026-09`, `concept=null`, `cutoff=TODAY`, `operation=LIST`.

Limitación: no hay fecha real de pago en `public.folios`. El corte “hasta hoy” se declara; el filtro físico es `mes_cargo` + `estatus PAGADO`.

## 13. result-set continuity

Follow-ups semánticos: COUNT, LIST, STATUS, DATE, LATEST, OLDEST, SUM, HIGHEST/LOWEST, FILTER_STATUS.

Secuencia existencial de extintores opera sobre el mismo conjunto.  
Cambio explícito: `ahora los de aceite` cambia concepto.  
`solo <mes>` solo se aplica si el spec heredado es `ANY` (no rompe C5 `¿y solo julio?` de aggregation-followup).  
`¿Cuánto gastamos en aceite?` → Expense Analytics.

## 14. Routing precedence

1. SEH físico/estatus  
2. Existencia Folios  
3. Folios pagados (status/period)  
4. Expense Analytics  
5. CLIENT_RANKING  
6. folio_search restante  
7. EXECUTIVE_STATUS (CEL)

Ejemplos:

| Pregunta | Intent |
|----------|--------|
| ¿Cuál extintor está vencido? | SEH |
| ¿Cuántas estaciones tiene Puebla? | SEH + Puebla real |
| ¿Existe un folio de extintores? | FOLIOS |
| ¿Cuáles son? (tras existencia) | FOLIOS continuation |
| ¿Cuánto gastamos en extintores? | EXPENSE |
| ¿Qué folios se han pagado hasta ahorita en septiembre? | FOLIOS paid |
| Top 5 clientes de venta casa | CLIENT_RANKING |
| ¿Cómo vamos este mes? | EXECUTIVE_STATUS |

## 15. Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `lib/director-ia-seh-operation-status.js` | Resolución de planta + query inyectable |
| `lib/director-ia-client-ranking.js` | Familia nueva |
| `lib/director-ia-folio-search.js` | Parser status/period + result-set |
| `lib/director-ia-conversation-state.js` | Follow-ups Folios + `client_ranking` entity |
| `lib/director-ia-planner.js` | Precedencia paid + ranking |
| `lib/director-ia-chat.js` | forceIntent, planta resuelta, handler ranking |
| `lib/director-ia-capabilities.js` | capability `client_ranking` |
| `lib/director-ia-tools.js` | tool `get_client_ranking` |
| `test/director-ia-cross-domain-conversational-robustness.test.js` | 30+10+10 × 4 |
| `docs/dev-loop/CURRENT_TASK.md` | solo `status` |
| `docs/dev-loop/reports/IMPL-DIRECTOR-IA-CROSS-DOMAIN-CONVERSATIONAL-ROBUSTNESS-001.md` | este reporte |

## 16. Suites 30+10+10

Archivo: `test/director-ia-cross-domain-conversational-robustness.test.js`

Las 30 viven en tests. Producción usa reglas compartidas, no lista cerrada.

## 17. Resultados exactos

| Familia | Directas | Follow-ups | Anti-colisión |
|---------|----------|------------|---------------|
| SEH plant | 30/30 | 10/10 | 10/10 |
| CLIENT_RANKING | 30/30 | 10/10 | 10/10 |
| Folios pagados | 30/30 | 10/10 | 10/10 |
| Folio result-set | 30/30 | secuencia 8 pasos + 30 | 10/10 |

Total nuevo ≥ 200. Suite dedicada: **14/14**.

E2E: dashboard Acapulco + `¿Cuántas estaciones tiene Puebla?` → query `planta_id=20`, display Puebla.

Deny: GG solo planta 10 + pregunta Puebla → 403, 0 queries.

## 18. Regresiones

PASS: SEH_OPERATION_STATUS, SEH follow-up + folio existence, folio truthful, folio period/range, Expense core + keyword, DIAGNOSIS, greeting, smalltalk script.

## 19. Excepciones documentadas

No se editaron tests históricos.

| Test | Expectativa histórica | Por qué el cambio está autorizado | Evidencia funcional |
|------|----------------------|-----------------------------------|---------------------|
| aggregation 091 | planner no cambia | Esta tarea autoriza planner (precedencia SEH/Folios/Ranking) | Folio T1/T2 aggregation sigue PASS |
| aggregation 087 | tools.js no cambia | Registry mínima de `CLIENT_RANKING` está in_scope | `get_folio_search` y aggregation funcional intactos |

## 20. Limitaciones

- No hay fecha de pago real: cutoff = mes_cargo + estatus PAGADO.
- Descuento de ranking: fail closed sin evidencia.
- Ranking ALL mezcla CASA+COMISIONISTA solo porque la fuente lo permite con `canalSqlFor("ambos")`.
- `solo <mes>` como cambio de periodo solo si el spec heredado es ANY.
- IDs de planta no hardcodeados en producción; tests inyectan catálogo.

## 21. Diff conceptual

```
SEH:
  antes: query(dashboardId) + display(extractedLabel)
  ahora: resolve(explicit|inherited|selected) → auth(id) → query(id) → display(id)

CLIENT_RANKING:
  antes: unknown → Bitácora/AR
  ahora: TOP/BOTTOM N + segmento + VENTA_TON

Folios pagados:
  antes: concept="se han pagado hasta ahorita"
  ahora: status=PAGADO, period=mes, concept=null

Result-set:
  antes: solo cuantos/suman/pagados/reciente
  ahora: LIST/STATUS/DATE/LATEST/OLDEST/SUM/HIGH/LOW + shift explícito
```

## 22. Confirmación

`schema_changes=false`  
`data_mutation=false`  
`merge=false`  
`deploy=false`

## 23. STOP

No PR. No merge. No deploy. No siguiente tarea.
