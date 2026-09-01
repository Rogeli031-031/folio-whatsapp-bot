# AUDIT-DIRECTOR-IA-HISTORICAL-MARGIN-QUESTIONS-001

```yaml
task_id: "AUDIT-DIRECTOR-IA-HISTORICAL-MARGIN-QUESTIONS-001"
outcome: "DONE_PENDING_REVIEW"
mode: "AUDIT_READ_ONLY"
implementation_authorized: NO
merge_authorized: NO
deploy_authorized: NO
source_code_changed: NO
test_code_changed: NO
db_changed: NO
server_changed: NO
base_main_sha: "fc7767d02a41c6f2e53c30f21ce39d5e03d807db"
branch: "audit/director-ia-historical-margin-questions-001"
g1_human: "AUTHORIZED_BY_HUMAN: Human Approver 2026-09-01T16:42:31-06:00 (authorized_by / authorized_at / human_authorization intactos)"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/AUDIT-DIRECTOR-IA-HISTORICAL-MARGIN-QUESTIONS-001.md"
files_not_touched:
  - "docs/director-ia/"
  - "lib/"
  - "test/"
  - "server.js"
  - "frontend-dashboard/"
  - "sql/"
contracts_consulted:
  - "AGENTS.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/TASK_TEMPLATE.md"
  - "docs/dev-loop/reports/README.md"
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md"
  - "docs/director-ia/FINANCIAL-ACTUAL-EVIDENCE-CONTRACT.md"
  - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"
live_db_validation: "NOT_PROVEN"
secrets_check: "none"
```

## 1. Executive finding

Director IA **no responde** P1–P4 de margen histórico porque la cadena se rompe **antes** de cualquier fuente de margen. No es un único bug.

Hay **dos fallas de punta a punta distintas**. No se colapsan.

**A. FIRST TURN limpio** (`conversation_state` vacío):

`detectDirectorIaIntent` → `unknown` (`no_rule_matched`, 0.35).  
`askDirectorIa` corta en `directorIaPlan.intent === "unknown" && !continuityTurn.inherit` y devuelve `buildUnknownClarificationResult`.  
OpenAI **no** se llama. El anexo IGF **no** se carga. `getMargenKgPorPeriodo` **no** se ejecuta.  
Texto físico: *«No se pudo determinar una intención clara… Indica si quieres el diagnóstico de la planta actual…»*

**B. CONTINUIDAD tras `commercial_trend`** (el síntoma humano):

P1 sigue siendo `unknown` aislado. `commercial_trend` es inheritable. `unknown` + parent válido → `inheritParentIntent`. El planner se reescribe a `commercial_trend`. El handler in-process carga toneladas + pendiente OLS de 30 días CASA/COMISIONISTA. El LLM recibe ese pack, no margen de mayo, y puede decir que no tiene el margen y sustituir con tendencia.

Eso explica físicamente la evidencia humana (toneladas + OLS). No es alucinación de cifras: es el pack de `commercial_trend`.

`financial_diagnosis` **no** reconoce P1–P4. `isPlantFinancialKpiQuestion("margen")` es **false** porque `PLANT_FINANCIAL_KPI_RE` usa `margenes?` (= `margene`/`margenes`), no `margen`. `shouldAttachIgfArrAnnex` sí es true (`/\bmargen\b/`), pero en first-turn nunca se alcanza.

La fuente helper `getMargenKgPorPeriodo` existe y es **PARTIAL** como canónica histórica: lee `igf.versions` GLOBAL `ORDER BY version_number DESC LIMIT 1` + promedio ponderado de `igf.compromiso_lines`. El contrato `FINANCIAL-ACTUAL-EVIDENCE-CONTRACT` dice `latest ≠ FINAL`. Sin DB live no se prueba que mayo 2026 latest sea cierre.

No se implementó nada.

## 2. Evidencia humana

Pregunta observada: *¿Cuál fue el margen en mayo?*

Respuesta observada (síntoma, no hardcodeada):

1. «No tengo información sobre el margen en mayo.»
2. Sustitución por tendencia comercial reciente Acapulco ID 1, 30 días.
3. CASA: toneladas + pendiente OLS.
4. COMISIONISTA: toneladas + pendiente OLS.

Ese texto **no** es el de `buildUnknownClarificationResult`.  
Sí coincide con el handler `commercial_trend` (`lib/director-ia-commercial-trend.js`: rango 30/90, CASA/COMISIONISTA, pendiente OLS).

Conclusión: la evidencia humana es la frontera **B**, no la frontera **A**. Ambas están rotas. Causas distintas.

## 3. P1–P10 route matrix

Probes: `detectDirectorIaIntent`, `planDirectorIaQuestion`, `isPlantFinancialKpiQuestion`, `shouldAttachIgfArrAnnex`, `isCommercialTrendQuestion`, `isHistoricalNewClientsQuestion`, `buildDirectorIaToolPlan`, `resolveYearMonthFromQuestion` (fallback 2026-09), `parseExplicitPeriod` (`now` = 2026-09-01 CDMX), `resolveConversationTurn`, caller real de `askDirectorIa` (corte `unknown` / inherit).  
`currentYearMonthCdmx()` en este runtime = `{ year: 2026, month: 9 }`.

| Q | detect / plan | financialKpi | igfAnnex | trend | first-turn handler | OpenAI | IGF YM | parseExplicitPeriod |
|---|---|---|---|---|---|---|---|---|
| P1 margen en mayo | unknown | false | true | false | unknown_clarification | no | 2026-05 | 2026-05 COMPLETE |
| P2 abril y mayo | unknown | false | true | false | unknown_clarification | no | **2026-04 only** | 2026-04 + 2026-05 |
| P3 mejor del año | unknown | false | true | false | unknown_clarification | no | 2026-09 (fallback) | null |
| P4 menor del año | unknown | false | true | false | unknown_clarification | no | 2026-09 | null |
| P5 mayo 2025 | unknown | false | true | false | unknown_clarification | no | 2025-05 | null (`de mayo` no es cue `en`) |
| P6 mayo 2026 Acapulco | unknown | false | true | false | unknown_clarification | no | 2026-05 | null |
| P7 mejor 2026 Acapulco | unknown | false | true | false | unknown_clarification | no | 2026-09 | null |
| P8 menor 2026 Acapulco | unknown | false | true | false | unknown_clarification | no | 2026-09 | null |
| P9 septiembre | unknown | false | true | false | unknown_clarification | no | 2026-09 abierto | null |
| P10 octubre | unknown | false | true | false | unknown_clarification | no | **2026-10 futuro** | null |
| C1 margen de la planta | financial_diagnosis | false | true | false | financial_diagnosis_inprocess | sí | — | — |
| C2 descuento abril–mayo | delta_discount | true | true | false | delta_discount_inprocess | no | 2026-04 | 2026-04+05 |
| C3 tendencia CASA 30d | commercial_trend | false | false | true | commercial_trend_inprocess | sí | — | — |
| C4 clientes nuevos agosto | historical_new_clients | false | true* | true* | historical_new_clients_inprocess | no | 2026-08 | 2026-08 |
| C5 venta de mayo | unknown | false | false | false | unknown_clarification | no | 2026-05 | null |

\* C4: `isDeltaClientesIgfQuestion` / `isCommercialTrendQuestion` pueden ser true, pero el planner evalúa `historical_new_clients` **antes** de `commercial_trend`. Aislado.

Tool plan P1–P4: `domains=[]`, `can_execute=false`, sin tools.  
`resolveDirectorIaChatRouting` sin contexto: `promptMode=full` / `no_context` (no llega a `igf_arr_focused` porque `isPlantFinancialKpiQuestion` es false).

`financial_diagnosis` solo dispara si `margen` + `(planta|comport|como va|como se)` o caída/diagnóstico. P1–P4 no.

## 4. Fresh-turn vs continuity

```
FIRST_TURN_MARGIN_ROUTE = unknown_clarification
CONTINUITY_AFTER_COMMERCIAL_TREND_ROUTE = commercial_trend_inprocess
CONTINUITY_MARGIN_FOLLOWUP_READINESS = NOT_READY
```

**A. First turn P1**

`resolveConversationTurn` (history=[], echoed=null): `kind=other`, `inherit=false`, `inherit_parent_intent=null`.  
`plan.intent=unknown`.  
`askDirectorIa` L3724–3733: return clarification. `openai_called=false`. `sources=[]`.

**B. Tras** *¿Cómo va la tendencia comercial de CASA y COMISIONISTA?*

Estado: `parent_intent=commercial_trend`, `last_evidence_bundle_type=commercial_trend`, `active_range_days=30`, `active_channel=both`.  
P1: `isolatedUnknownEarly` + `trendFollowUp` → `inherit=true`, `inherit_parent_intent=commercial_trend`.  
`planDirectorIaQuestion(..., { inheritParentIntent: "commercial_trend" })` → intent `commercial_trend`, evidence `inherit_parent_intent`.  
Handler L4391+: `loadCommercialTrendForChat` con `range_days` y `channel` heredados. GPT ve toneladas + OLS. No ve `margen_kg` de mayo.

P2 y P3 heredan igual (probe físico).

**C. Follow-up margen**

Turno 1: *¿Cuál fue el margen en abril?* → unknown clarification; `financial_diagnosis` **no** es inheritable (`INHERITABLE_INTENTS` no lo incluye).  
Turno 2: *¿Y en mayo?* → `kind=other`, `inherit=false`, `plan=unknown`.  
No hay capacidad de follow-up de margen. No implementar.

## 5. Physical call chain

```
QUESTION
  → normalize (planner / IGF / conversation, cada uno el suyo)
  → detectDirectorIaIntent          [P1–P4: unknown]          ← PRIMERA DIVERGENCIA first-turn
  → resolveConversationTurn
        ├ first-turn: inherit=false
        └ parent commercial_trend: inherit=true               ← PRIMERA DIVERGENCIA síntoma humano
  → planDirectorIaQuestion
        ├ unknown / domains=[]
        └ inherit → commercial_trend / domains=[arr]
  → askDirectorIa corte unknown (L3724)  O  handler commercial_trend
  → [NO se alcanza] tool plan ejecutable de margen
  → [NO se alcanza] loadIgfArrAnnexForChat / getMargenKgPorPeriodo
  → [NO se alcanza] period/plant/source/version/formula/annex/LLM de margen
```

Si el corte unknown se quitara (no implementado), la cadena residual sería:

`isPlantFinancialKpiQuestion=false` → no `igf_arr_focused`.  
`shouldAttachIgfArrAnnex=true` → annex secundario.  
`resolveYearMonthFromQuestion`: un solo mes.  
Addendum: «responde PRIMERO COMPARACION MARGEN mes actual vs mes previo».  
Conflicto con pregunta histórica / anual. El LLM seguiría siendo el builder.

## 6. Margin source lineage

Productores / consumidores físicos de `margen_kg`:

| Superficie | Selección de versión | Match de planta | Semántica institucional |
|---|---|---|---|
| `getMargenKgPorPeriodo` | GLOBAL + year/month + `version_number DESC LIMIT 1` | `empresa ILIKE %nombre%` OR sin tildes; **todas** las filas; promedio ponderado `venta_ton` | latest stored; no lee `financial_state` |
| `loadIgfCommitSnapshot` / annex composición | misma latest | `findIgfRowForPlant` → **una** fila best-score | etiqueta «COMPROMISO / MARGEN» |
| `loadFinancialActualEvidence` | única `financial_state=FINAL` GLOBAL | `findIgfRowForPlant` una fila | `ACTUAL_FINANCIAL` (contrato) |
| Dashboard hoja IGF mes histórico | latest `compromiso_lines` | filas raw | comentario UI: «cierre real» |
| `historical_new_clients` / DICF / M9 delta ingreso | helper latest | ILIKE ponderado | insumo de fórmula, no Q&A de margen |
| `igf_meta` | otra tabla | — | `TARGET_COMMITMENT`, no actual |

Otra fuente de margen histórico más estricta: `lib/director-ia-financial-actual.js`. Solo está cableada dentro de `month_close_result`. No atiende P1–P4.

`plant_code = 'GLOBAL'` = una versión corporativa del mes, no una versión por planta. El grano de planta es la fila `empresa` dentro de `compromiso_lines`.

## 7. Version semantics

```
VERSION_SELECTION_SEMANTICS = latest GLOBAL version_number DESC LIMIT 1; financial_state ignored
```

Demostrado en código:

1. Un mes puede tener **varias** versiones (`dashboard-arr-forecast.js` lista `ORDER BY version_number`; `financial_actual` distingue 0 / 1 / N FINAL).
2. Una versión **posterior** cambia retrospectivamente la respuesta del helper (siempre toma la última).
3. `latest ≠ FINAL` (contrato §2). `mes transcurrido ≠ FINAL`.
4. `loadFinancialActualEvidence` elige FINAL y **rechaza** latest FORECAST (tests existentes: «elige la única FINAL y no la FORECAST más reciente»).
5. El helper y el annex **no** implementan esa regla.

Sin LIVE_DB no se cuenta cuántas versiones tiene mayo 2026 ni si hay FINAL.

## 8. Plant matching / cardinality

Helper (`lib/director-ia-m9-deltas.js` L299–320):

```
pattern = %plantaNombre%
patternSinTilde = %quitarTildes(plantaNombre)%
WHERE empresa ILIKE $2 OR empresa ILIKE $3
SUM(margen_kg * venta_ton) / NULLIF(SUM(venta_ton), 0)
```

No hay `LIMIT 1` en líneas. Multiplicidad se **promedia**.  
`findIgfRowForPlant` (annex composición / actual) elige **una** fila por score. Totales se saltan.

Probe sintético (no DB): `Acapulco` ILIKE-match → `Acapulco`, `Acapulco Casa`, `Nueva Acapulco Norte`. Weighted = 1.99375. `findIgfRowForPlant` → solo `Acapulco`.  
Mismo nombre, dos magnitudes en el mismo annex si ambas rutas corrieran.

Tildes: Tehuacán/Tehuacan cubierto por el segundo patrón.  
Clave vs nombre: el helper usa `plantaNombre` de `public.plantas.nombre|clave`, no `plant_code` ARR.

Cardinalidad live de Acapulco: **NOT_PROVEN**.  
El matcher es substring-ambiguo por construcción.

```
PLANT_MATCH_CARDINALITY = AMBIGUOUS
```

Multiplicidad no implica bug si las filas son componentes de la misma planta. El helper no distingue componente vs otra empresa con el mismo substring.

## 9. Period semantics

Utilidades físicas, `now` equivalente 2026-09-01 CDMX. No se hardcodeó el mes actual: `currentYearMonthCdmx()` y `cdmxTodayParts(now)`.

| Frase | IGF `resolveYearMonthFromQuestion` | `parseExplicitPeriod` | `resolveRequestedCalendarMonth` (new-clients) |
|---|---|---|---|
| mayo / «en mayo» | 2026-05 | 2026-05 COMPLETE | 2026-05 |
| abril y mayo | **solo abril 2026** (break al primer mes del catálogo) | 2026-04 **y** 2026-05 | un mes o null |
| mayo 2025 | 2025-05 | null (cue `en\|solo\|durante`, no `de`) | 2025-05 named_month_year |
| septiembre | 2026-09 abierto | null (`de septiembre`) | 2026-09 |
| octubre | **2026-10 futuro** (no rollover) | null | **2025-10** (month > today → year-1) |
| mejor/menor del año | 2026-09 fallback | null | null |
| «todo el año» / «este año» | n/a | ene–sep 2026 (sep PARTIAL) | n/a |

No reutilizar el parser de `historical_new_clients` sin contrato propio: rollover de mes futuro, cues `en` vs `de`, y cardinalidad de dos meses son incompatibles con IGF.

Año implícito IGF = año del fallback (hoy). Año implícito `assignYear` = hoy, o año-1 si el mes es futuro.  
Open month = completeness PARTIAL en `monthSpec`. Future IGF no se marca; se pide el YYYY-MM futuro.

```
MONTH_RESOLUTION_MAY_2026 = 2026-05
```

(vía IGF resolver y `parseExplicitPeriod` con «en mayo»)

## 10. Closed / open / future semantics

Contrato superior (`FINANCIAL-ACTUAL-EVIDENCE-CONTRACT` §2):

- `FORECAST` = IGF no FINAL (mes abierto o versión no designada).
- `ACTUAL_FINANCIAL` = solo FINANCE_PROVIDED de la **única** FINAL del YYYY-MM.
- Prohibido relabelar latest / mes transcurrido como FINAL.

Dashboard (`appendHojaIgfMesHistorico`) documenta latest `compromiso_lines` de mes cerrado como «valores reales del IGF de cierre». Eso **contradice** el contrato si latest no es FINAL.

```
CLOSED_MONTH_SEMANTICS = LATEST_IGF_COMPROMISO_NOT_PROVEN_FINAL
OPEN_MONTH_SEMANTICS = FORECAST
FUTURE_MONTH_SEMANTICS = NOT_PROVEN
```

Mayo 2026 (cerrado a 2026-09-01): existe helper + annex + actual-FINAL **si** hay versión. Si el claim es «cuál **fue**», el contrato exige FINAL. El helper no lo verifica. **No hay margen histórico defendible como ACTUAL** hasta probar FINAL. Como número stored latest: sí hay loader.

Septiembre 2026 abierto: si existiera versión, es FORECAST/compromiso vigente. No es «margen que fue».

Octubre 2026: IGF pediría 2026-10; helper → null si no hay versión. New-clients resolvería 2025-10 (otro año). No presentar forecast futuro como hecho.

## 11. April–May comparison readiness

Deseado: Abril X.XX, Mayo Y.YY, Δ mayo−abril desde raw.

Hoy:

- First-turn no llega a fuente.
- Continuity hereda trend.
- IGF resolver de P2 = abril vs **marzo** (prev), no abril vs mayo.
- Annex delta = `Number(curr)-Number(prev)` luego `fmtNum` (raw, no redondeo previo). Fórmula útil, **par de meses incorrecto**.
- Dos matchers de planta distintos (ponderado vs una fila).
- Null: `fmtNum(null)="—"`; si falta un lado, no hay delta. `getDeltaIngresoClientes` hace `?? 0` (otro caller; no usar).
- No hay builder determinista de dos meses nombrados.

```
TWO_MONTH_COMPARE_READINESS = NOT_READY
```

`parseExplicitPeriod` **sí** resuelve abril+mayo 2026. Es candidato de resolver futuro, no está cableado a margen.

## 12. Annual max/min readiness

No existe loop ene–dic, ni ranking, ni detector de «mejor/menor».  
P3/P4: unknown → clarification. IGF fallback = septiembre (abierto). Annex, si existiera, compararía agosto vs septiembre. El LLM no debe elegir el máximo leyendo texto; hoy ni siquiera recibe la serie.

Conjunto comparable defendible a 2026-09-01 **solo si** cada mes usa la misma fuente/fórmula/planta y semántica **cerrada**:

| Mes | ¿Entrar? |
|---|---|
| ene–ago 2026 | candidatos **si** hay fuente defendible (FINAL si se afirma ACTUAL; no missing; no error) |
| sep 2026 abierto | **excluir** de max/min «del año» factual |
| oct–dic futuros | **excluir** |
| mes sin versión / sin filas | **excluir** (no 0) |
| SOURCE_ERROR | **excluir** (no 0) |
| margen stored 0 finito | valor real, no missing |

«todo el año» de `parseExplicitPeriod` **incluye** septiembre PARTIAL: no adoptar ese conjunto para ranking factual.

Empate: reportar todos los meses empatados; no dejar que el LLM elija.

```
YEAR_MAX_READINESS = NOT_READY
YEAR_MIN_READINESS = NOT_READY
ANNUAL_COMPARABILITY_RULE = SAME_SOURCE_FORMULA_PLANT; CLOSED_ONLY; EXCLUDE_OPEN_FUTURE_MISSING_ERROR; ZERO_IS_VALUE_NOT_ABSENCE
TIE_RULE_RECOMMENDED = REPORT_ALL_TIED_MONTHS
```

## 13. Null / error semantics

`getMargenKgPorPeriodo`:

| Caso | Retorno |
|---|---|
| sin versión | `null` |
| sin filas / SUM null | `null` |
| `SUM(venta_ton)=0` (`NULLIF`) | `null` |
| margen stored 0 con toneladas | `0` |
| excepción SQL / conexión | `catch` → `null` |

No hay código `DATA_NOT_FOUND` vs `SOURCE_ERROR` en el helper.  
`financial_actual` **sí** los distingue (`MISSING_FOR_PERIOD`, `SOURCE_UNAVAILABLE`, `NOT_FINAL`, …) pero no es caller de P1–P4.  
M9 `getDeltaIngresoClientes` colapsa otra vez: `?? 0`.

```
DATA_NOT_FOUND_VS_SOURCE_ERROR = COLLAPSED
COLLAPSE_POINT = getMargenKgPorPeriodo.catch_and_unified_null
```

## 14. Authorization

No se diseñaron atajos. Inspección read-only:

| Rol / caso | Comportamiento físico |
|---|---|
| planta sesión | `askDirectorIa` usa `planta_id` del request; IGF `resolvePlantaNombre(id)` |
| planta nombrada (P6 Acapulco) | **ignorada** por annex/helper; no hay hop de planta en esta ruta |
| GA | IGF annex 403; M9 403; trend 403 |
| GV | `assertGVPlantaNombreAccess` (canon + `assertPlantaAcceso`) |
| GG | `plantas_permitidas` en M9 y trend; IGF annex **no** revalida GG |
| AD | memoria `GLOBAL_ROLES` incluye AD; actual-FINAL AD ve todas |
| `plantas_permitidas` | memory + M9 + trend; no el helper desnudo |

El helper **no** autentica. Depende del caller.  
No consulta otra planta a ciegas (usa la de sesión). Eso preserva auth. No honra planta nombrada.

```
PLANT_AUTH_PRESERVED = YES
```

## 15. Regression boundaries

Una futura `historical_margin` debe **no** apropiarse de:

| Control | Ruta actual | Aislamiento |
|---|---|---|
| C1 ¿Cómo va el margen de la planta? | `financial_diagnosis` in-process | detector histórico exige mes/año/max/min, no «cómo va + planta» |
| C2 ¿Cómo cambió el descuento de abril a mayo? | `delta_discount` (planner **antes** de financial) | métrica descuento, no margen |
| C3 tendencia CASA 30d | `commercial_trend` | trend/rango/canal; `isCommercialTrendQuestion` ya excluye `descuento` |
| C4 clientes nuevos agosto | `historical_new_clients` (antes de trend) | cue clientes nuevos |
| C5 venta de mayo | unknown hoy; annex false | no contener `venta` sin `margen` |

C1 no es P1: es diagnóstico de planta actual, no mes histórico nombrado.

## 16. Root causes

Solo categorías demostradas:

| ID | Categoría | Dónde | Aplica |
|---|---|---|---|
| RC1 | `INTENT_GAP` | `detectDirectorIaIntent`: no hay regla de margen histórico; `financial_diagnosis` no cubre P1–P4; `PLANT_FINANCIAL_KPI_RE` no matchea `margen` | P1–P4 first-turn |
| RC2 | `CONVERSATION_INHERITANCE` | `unknown` + parent `commercial_trend` inheritable → handler OLS/ton | P1–P4 si hay hilo trend (síntoma humano) |
| RC3 | `PERIOD_CARDINALITY_GAP` | IGF toma un mes; P2 necesita dos; P3/P4 ninguno | latente si se llegara a annex |
| RC4 | `ANNUAL_AGGREGATION_GAP` | no hay ranking determinista ni conjunto comparable | P3 P4 |
| RC5 | `SOURCE_SEMANTIC_AMBIGUITY` | latest compromiso vs FINAL actual vs «cierre» de dashboard | fuente |
| RC6 | `VERSION_SEMANTIC_GAP` | latest puede reescribir mes cerrado | fuente |
| RC7 | `PLANT_MATCH_AMBIGUITY` | ILIKE substring vs una fila | fuente |
| RC8 | `ANNEX_SEMANTIC_MISMATCH` | addendum «mes actual vs previo» vs pregunta histórica | latente |
| RC9 | `DATA_NOT_FOUND_SOURCE_ERROR_COLLAPSE` | helper `catch → null` | fuente |
| RC10 | `CONTEXT_EVIDENCE_GAP` | first-turn: sin pack de margen; continuity: pack de trend | narrativa humana |

No usado (no demostrado como causa primaria de P1–P4): `ROUTING_PRECEDENCE` (trend no gana por regex de P1; gana por inherit), `LLM_NARRATIVE_DIVERGENCE` (en continuity el LLM narra el pack que sí recibió), `HISTORICAL_SOURCE_GAP` (el loader existe; no se alcanza).

## 17. Minimal future implementation slice

Recomendado **solo** si el source contract se cierra (FINAL para «fue»; FORECAST etiquetado para abierto; no mezclar).

```
DEDICATED_CAPABILITY_RECOMMENDED = historical_margin
MINIMAL_IMPLEMENTATION_SLICE = detector + period_resolver + plant_auth + loader + source_adapter + deterministic_calculator + response_builder + veracity + tests
```

Operaciones deterministas: `single_month`, `compare_months`, `year_max`, `year_min`.

| Pieza | Contrato mínimo (no código) |
|---|---|
| Detector | `margen` + (mes nombrado \| dos meses \| mejor/menor + año); **después** new-clients / delta_discount / commercial_trend / financial_diagnosis «cómo va planta»; no `venta` sola |
| Period resolver | CDMX; un mes; dos meses; año explícito; año implícito; rollover documentado; open vs future; **no** copiar new-clients a ciegas |
| Plant/auth | sesión + nombrada con assert existente; GA deny; GV assert; GG `plantas_permitidas`; no cross-plant |
| Loader | `igf.versions` + `compromiso_lines`; closed → FINAL si se afirma ACTUAL; open → latest etiquetado FORECAST; future → DATA_NOT_FOUND |
| Source adapter | un matcher de planta; cardinalidad explícita; no mezclar ponderado y best-row |
| Calculator | misma fórmula; delta desde raw; max/min sobre conjunto comparable; empates múltiples; null/error ≠ 0 |
| Response builder | determinista; sin aritmética LLM |
| Veracity | `DATA_NOT_FOUND` ≠ `SOURCE_ERROR` ≠ `NOT_FINAL` ≠ `SOURCE_RESTRICTED` |
| Tests | P1–P10, A/B continuity, C1–C5 hold-outs, null/error, FINAL vs latest, Acapulco cardinality, tie |

```
LLM_REQUIRED_FOR_SINGLE_VALUE = NO
LLM_REQUIRED_FOR_COMPARISON = NO
LLM_REQUIRED_FOR_RANKING = NO
LLM_REQUIRED_FOR_VALUE = NO
```

## 18. OUT_OF_SCOPE

- Implementar `historical_margin` o follow-up.
- Editar regex, planner, annex, helper, prompts, tests.
- Elegir G2/G3 de contrato (latest vs FINAL).
- LIVE_DB (env `DATABASE_URL` no visible en este proceso).
- Merge, deploy, Render, siguiente tarea.
- IES / Reasoning Engine / Channel Projection.
- Reescribir `docs/director-ia/`.

## 19. Exact final state

```
P1_CURRENT_ROUTE = unknown_clarification | commercial_trend_inherit_if_parent
P2_CURRENT_ROUTE = unknown_clarification | commercial_trend_inherit_if_parent
P3_CURRENT_ROUTE = unknown_clarification | commercial_trend_inherit_if_parent
P4_CURRENT_ROUTE = unknown_clarification | commercial_trend_inherit_if_parent

P1_FIRST_DIVERGENCE = INTENT_GAP
P2_FIRST_DIVERGENCE = INTENT_GAP
P3_FIRST_DIVERGENCE = INTENT_GAP
P4_FIRST_DIVERGENCE = INTENT_GAP

FIRST_TURN_MARGIN_ROUTE = unknown_clarification
CONTINUITY_AFTER_COMMERCIAL_TREND_ROUTE = commercial_trend_inprocess
CONTINUITY_MARGIN_FOLLOWUP_READINESS = NOT_READY

HISTORICAL_MARGIN_CANONICAL_SOURCE = PARTIAL
MARGIN_SOURCE_TABLES = igf.versions + igf.compromiso_lines
MARGIN_SOURCE_FORMULA = SUM(margen_kg * venta_ton) / NULLIF(SUM(venta_ton), 0)
VERSION_SELECTION_SEMANTICS = latest GLOBAL version_number DESC LIMIT 1; financial_state ignored

CLOSED_MONTH_SEMANTICS = LATEST_IGF_COMPROMISO_NOT_PROVEN_FINAL
OPEN_MONTH_SEMANTICS = FORECAST
FUTURE_MONTH_SEMANTICS = NOT_PROVEN

MONTH_RESOLUTION_MAY_2026 = 2026-05
TWO_MONTH_COMPARE_READINESS = NOT_READY
YEAR_MAX_READINESS = NOT_READY
YEAR_MIN_READINESS = NOT_READY
ANNUAL_COMPARABILITY_RULE = SAME_SOURCE_FORMULA_PLANT; CLOSED_ONLY; EXCLUDE_OPEN_FUTURE_MISSING_ERROR; ZERO_IS_VALUE_NOT_ABSENCE
TIE_RULE_RECOMMENDED = REPORT_ALL_TIED_MONTHS

PLANT_MATCH_CARDINALITY = AMBIGUOUS
PLANT_AUTH_PRESERVED = YES

DATA_NOT_FOUND_VS_SOURCE_ERROR = COLLAPSED
COLLAPSE_POINT = getMargenKgPorPeriodo.catch_and_unified_null

LLM_REQUIRED_FOR_SINGLE_VALUE = NO
LLM_REQUIRED_FOR_COMPARISON = NO
LLM_REQUIRED_FOR_RANKING = NO
LLM_REQUIRED_FOR_VALUE = NO

DEDICATED_CAPABILITY_RECOMMENDED = historical_margin
MINIMAL_IMPLEMENTATION_SLICE = detector + period_resolver + plant_auth + loader + source_adapter + deterministic_calculator + response_builder + veracity + tests

LIVE_DB = NOT_PROVEN

RUNTIME_CHANGED = NO
TESTS_CHANGED = NO
DB_CHANGED = NO
SERVER_CHANGED = NO
MERGE_AUTHORIZED = YES
DEPLOY_AUTHORIZED = NO
```

### Tests / probes ejecutados

- Caller real: `detectDirectorIaIntent`, `planDirectorIaQuestion`, `resolveConversationTurn`, `buildUnknownClarificationResult`, `isPlantFinancialKpiQuestion`, `shouldAttachIgfArrAnnex`, `isCommercialTrendQuestion`, `resolveYearMonthFromQuestion`, `parseExplicitPeriod`, `resolveRequestedCalendarMonth`, `findIgfRowForPlant`, `buildDirectorIaToolPlan`, `currentYearMonthCdmx`, `cdmxTodayParts`.
- `node --test` (existentes, sin editar): `director-ia-conversational-continuity`, `director-ia-natural-followup`, `director-ia-financial-actual`, `director-ia-m7-igf-composition`, `director-ia-financial-diagnosis`, `director-ia-commercial-trend` → **113 pass / 0 fail**.
- DB: `HAS_DB_ENV=false` en este proceso → `LIVE_DB=NOT_PROVEN`. No SELECT.

### Preflight

- Rama: `audit/director-ia-historical-margin-questions-001`
- Working tree pre-auditoría: limpio
- `merge-base HEAD origin/main` = `fc7767d02a41c6f2e53c30f21ce39d5e03d807db`
- G1 intacto; `implementation_authorized=NO`; `merge_authorized=NO`; `deploy_authorized=NO`; `max_attempts=1`

## Human final review

AUDIT_REVIEW = APPROVED
INTENT_GAP = PROVEN
CONVERSATION_INHERITANCE = PROVEN
HUMAN_OLS_SYMPTOM_EXPLAINED = YES

HISTORICAL_MARGIN_CANONICAL_SOURCE = PARTIAL
FINANCIAL_FINAL_SOURCE_EXISTS = YES

CLOSED_MONTH_FINAL_REQUIRED = RECOMMENDED
OPEN_MONTH_FORECAST_LABEL_REQUIRED = RECOMMENDED
FUTURE_MONTH_HISTORICAL_ANSWER = NO

COMPARE_MONTHS = IMPLEMENTABLE_DETERMINISTICALLY
YEAR_MAX_MIN = IMPLEMENTABLE_DETERMINISTICALLY

PLANT_MATCH_AMBIGUITY = MUST_NOT_BE_IGNORED
SOURCE_ERROR_COLLAPSE_LEGACY = MUST_NOT_BE_REUSED

TESTS_REPORTED = 113 pass / 0 fail
LIVE_DB = NOT_PROVEN

AUDIT_ACCEPTED = YES
MERGE_AUTHORIZED = YES
IMPLEMENTATION_AUTHORIZED = NO
DEPLOY_AUTHORIZED = NO
CLOSED_BY_HUMAN = YES

Esta aprobación humana autoriza únicamente cerrar e integrar esta auditoría a main.
No autoriza implementación de historical_margin.
No autoriza deploy.
No autoriza la siguiente tarea.
