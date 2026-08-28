# AUDIT-ARCH-DIRECTOR-IA-EXECUTIVE-STATUS-COMPLETENESS-001

```yaml
task_id: "AUDIT-ARCH-DIRECTOR-IA-EXECUTIVE-STATUS-COMPLETENESS-001"
outcome: "DONE_PENDING_REVIEW"
verdict: "FAIL"
mode: "AUDIT-ARCH / EVALUATION"
implementation: false
code_changes: false
test_changes: false
sql_changes: false
docs_director_ia_changes: false
deployed_main: "de4513859a17e9bf15aed40cdb2362b018fc9c3d"
routing_cel: "PASS (need + planta + fronteras)"
completeness: "FAIL"
critical: 0
major: 1
minor: 3
observation: 6
casa_comisionista_incorrectly_fused: true
descuento_should_enter_first_slice: false
rentabilidad_should_enter_executive_status: false
seh_status: "NOT_AVAILABLE (directorio diferido; sin loader Director IA)"
folios_status: "PARTIAL specialized; no dump; no exception-elevation"
kpis_proyectos_status: "PARTIAL specialized; exclusión consciente del first slice C"
h3_dependency: "INDEPENDENT"
matrix_increment: false
global_before: "10.5 / 20 = 52.5%"
global_after: "10.5 / 20 = 52.5%"
gain_pp: 0.0
next_task_proposed: "IMPL-DIRECTOR-IA-EXECUTIVE-STATUS-CHANNEL-INDEPENDENCE-001"
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
```

## 1. VERDICT

**FAIL** (completitud). **PASS** (routing / first slice C de need + planta + fronteras de verdad).

CEL ya resuelve `EXECUTIVE_STATUS` y el ancla de planta. La respuesta de producción en Acapulco es coherente con el pack actual y **no** demuestra completitud ejecutiva.

La pregunta de esta auditoría es: ¿el pack representa el conocimiento ejecutivo **ya disponible y autorizado**, o deja capacidades existentes desconectadas?

Respuesta: **deja desconectada, y en un caso contradice, arquitectura ya aprobada.**

- **MAJOR:** TREND colapsa CASA y Comisionista en una sola dirección (`OLS_CASA_COMISIONISTA` + `primary=casa` + copy «motor CASA/comisionista»), aunque el motor carga **dos series independientes** y el registry declara `independent: true`.
- Varias familias están **bien excluidas** (ACTUAL_FINANCIAL, SEH, Steering/Plaud/Council/live, dump de Folios/KPIs/proyectos).
- Otras están **adquiridas y no sintetizadas** (bitácora) o **OPTIONAL de ARCH no cableadas** (`igf_meta` TARGET).
- Descuento/kg existe en modos especializados y en tablas del motor de tendencia; **no** debe entrar al first implementation slice de esta corrección.

No hay CRITICAL (no leak, no mutación, no 0 fabricado, no rentabilidad inferida de ARR/IGF).

La matriz **no se incrementa**: 10.5 / 20 = 52.5%; delta 0.0 pp.

H1/H2/H3 del AUDIT post-deploy permanecen: FAIL, H3 MAJOR abierto, 1656 no es meta ni Steering. Esta tarea no los corrige. H3 es **independiente**.

---

## 2. Definición canónica recuperada de EXECUTIVE_STATUS

No se diseña desde cero. Se recupera de `ARCH-DIRECTOR-IA-CONVERSATIONAL-EXECUTIVE-LAYER-001` + runtime CEL (`lib/director-ia-conversational-executive-layer.js`).

**EXECUTIVE_STATUS** es el semantic need de una pregunta abierta de situación de planta:

- Cues: cómo va/vamos/andamos/estamos; qué está pasando; situación/diagnóstico/estado general.
- Scope: ancla UI si el utterance no nombra otra planta; planta explícita gana (Puebla sobre Acapulco).
- No es daily brief, no es PRE_CLOSE, no es month_close, no es commercial_trend keyword, no es client_profile, no es ACTUAL_FINANCIAL, no es tema AR aislado.
- Composer: **B** — pack determinístico + contrato de composición + wording GPT.
- Jerarquía condicional: `SITUATION → MAGNITUDE → TREND → TARGET/COMMITMENT → DRIVERS → RISKS → EXECUTION → NEXT_DECISION`.
- Un slot entra solo con evidencia. OPTIONAL ausente se omite; no se finge. UNAVAILABLE no se rellena con 0.
- Periodos: `COMPARE_WITH_LABELS` si hay más de un periodo; `fuse=false`.
- Canales: CASA y COMISIONISTA independientes (PARTIAL); Portátil/Carburación NOT_AVAILABLE.
- ACTUAL_FINANCIAL = NOT_APPLICABLE (CLOSE_STATUS only).
- Steering/Plaud/Council/live = NOT_APPLICABLE / PENDING.
- GPT redacta; runtime controla hechos, fechas, authz, provenance y fronteras.
- No mega-intent. Semantic need por encima del planner para intents cedibles (`unknown`, `plant_diagnosis`, `daily_executive_brief`).

**«¿Cómo vamos?» no significa enumerar módulos.** Significa sintetizar señales **materiales** de las familias **elegibles** del need, declarar gaps relevantes, y omitir el resto con semántica de omisión.

---

## 3. Evidencia histórica que soporta esa definición

| Fuente | Qué congela |
|---|---|
| `ARCH-DIRECTOR-IA-CONVERSATIONAL-EXECUTIVE-LAYER-001` | Need types, EvidenceDemand, jerarquía, trend CONDITIONAL, registry de canales, COMPARE_WITH_LABELS, ledger NO_ORPHAN, first slice C |
| CEL runtime `NEED_TYPES`, `ANSWER_HIERARCHY`, `CHANNEL_REGISTRY`, `AVAILABILITY`, `CAPABILITY_INTEGRATION_LEDGER` | Implementación física del ARCH |
| `AUDIT` / `IMPL` / `FIX` / `REAUDIT` CEL slice C | Routing canónico PASS; «cómo vamos hoy» → CEL no daily (tras FIX) |
| `DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md` | CASA/COMISIONISTA = otro intent `commercial_trend`; SEH diferido; no descuento→causalidad |
| Tests `director-ia-conversational-executive-status.test.js` | Variantes de need; no phrase `text === "como vamos"` |
| AUDIT post-deploy CLOSED | 4 PASS de routing; H3 independiente |

---

## 4. Inventario de familias de evidencia

| Familia | Loader / motor físico | ¿En plant_diagnosis? | ¿En pack CEL? | Semántica |
|---|---|---|---|---|
| commercial_state | `arr.dicf_cliente_mes` SELECT | Sí | SITUATION / DRIVERS | Cache categorías; no causa |
| ARR proyección | `loadIgfArr` | Sí | MAGNITUDE FORECAST_PROJECTION | ≠ actual ≠ financial |
| IGF stored | `loadIgfArr` | Sí | MAGNITUDE FORECAST_STORED | ≠ ARR ≠ actual |
| commercial_trend CASA | `loadCommercialTrendForChat` channel both | No (condicional CEL) | TREND colapsado | OLS independiente |
| commercial_trend COMISIONISTA | mismo, 2.º engine | No | **No emitido** | OLS independiente |
| igf_meta TARGET | existe (`igf-meta-excel`, PRE_CLOSE) | No | TARGET hardcoded UNAVAILABLE | TARGET ≠ forecast |
| Action Register | loader PD | Sí | RISKS / EXECUTION / NEXT_DECISION | overdue ≠ causa |
| DICF | loader PD | Sí | EXECUTION + guardia de wording | no_action ≠ no_medidas |
| bitácora | loader PD | Sí (adquirida) | **No hay slot** | ventana meses |
| clientes / comentarios | PD parcial vía CS/DICF | Parcial | DRIVERS materialidad | ≠ expediente |
| descuento/kg diario | `daily_discount_deviation` | No | No | specialized |
| delta_descuento | M-delta on-demand | No | No | two YYYY-MM |
| ACTUAL_FINANCIAL | month_close + FA | No | NOT_APPLICABLE | CLOSE_STATUS |
| Folios status/hist/docs | M2 on-demand | No | No | specialized |
| Folio financial (cheque/póliza) | tool `declared_not_integrated` | No | No | NOT_AVAILABLE |
| dashboard_kpis | M3 on-demand | No | No | ≠ ARR/IGF/CS |
| proyectos | M3 on-demand | No | No | ≠ AR; no «retrasado» |
| mejora continua | on-demand keyword | No | No | vista AR |
| reviewable IGF | PRE_CLOSE / specialized | No | No | specialized |
| SEH directorio | — | No | No | diferido; sin loader |
| Steering / Plaud / Council / live | store DORMANT / PENDING | No | NOT_APPLICABLE | correcto |
| cliente 1656 conversacional | session only | No | No | no TARGET; no Steering |

---

## 5. CURRENT vs EXPECTED

| Slot / familia | CURRENT | EXPECTED (ARCH ya escrito) | Gap |
|---|---|---|---|
| Need + planta | PASS | PASS | ninguno de routing |
| SITUATION | mixto etiquetado | mixto etiquetado | ninguno |
| MAGNITUDE ARR/IGF | proyecciones etiquetadas | igual; no fusionar | ninguno de verdad |
| TREND | una `direction` (casa) rotulada CASA/comisionista | CASA y COMISIONISTA **separadas** | **MAJOR** |
| TARGET | UNAVAILABLE fijo | OPTIONAL si `igf_meta` reachable | MINOR (no first slice) |
| DRIVERS | materialidad CS | DRIVERS, no SITUATION | correcto |
| RISKS | overdue AR | OPTIONAL | correcto; no es único riesgo |
| EXECUTION | DICF sin acción con guardia | no_medidas prohibido | correcto |
| NEXT_DECISION | «actualizar vencidas» | solo si hay evidencia | estrecho, no falso |
| Descuento | ausente | specialized o OPTIONAL futuro por materialidad | no first slice |
| Financial | NOT_APPLICABLE | NOT_APPLICABLE | exclusión correcta |
| SEH / Steering / Plaud | N/A | N/A | exclusión correcta |
| Folios/KPIs/proyectos | ausentes | no dump; excepción futura trazable | observación |
| Bitácora | adquirida, no slot | omitir con `OMITTED_NOT_MATERIAL` o OPTIONAL | MINOR adquisición huérfana en pack |
| Periodos | COMPARE_WITH_LABELS + fuse=false | igual | correcto |

---

## 6–7. CASA y Comisionista

**Motor físico (`lib/director-ia-commercial-trend.js`):**

- CEL pide `channel: "both"`, `compare: true`, `range_days: 30`.
- `wantBoth` carga **dos** `loadOneChannel` (casa, comisionista).
- `assembled.ols = null` cuando `wantBoth`.
- `assembled.channels.casa` / `.comisionista` conservan OLS propios.
- `primary = casaBlock`.

**Pack CEL (`buildExecutiveStatusPack` TREND):**

```javascript
direction: (trend.ols && trend.ols.direction)
  || (trend.primary && trend.primary.ols && trend.primary.ols.direction)
summary: "Tendencia del motor CASA/comisionista. ..."
truth_semantics: "OLS_CASA_COMISIONISTA"
```

`formatPackForPrompt` emite **una** `tendencia_ols=`.

**Registry ya dice:** `CASA.independent=true`, `COMISIONISTA.independent=true`.

**Producción:** «motor CASA/comisionista muestra descenso» es exactamente este colapso. Si CASA ↓ y COMISIONISTA ↑, el pack puede afirmar descenso (el de CASA) como si fuera el motor conjunto.

**Veredicto:** fusión **incorrecta**. No es un canal único. Distinguir:

| Concepto | Dueño |
|---|---|
| Tendencia CASA | `channels.casa.ols.direction` |
| Tendencia COMISIONISTA | `channels.comisionista.ols.direction` |
| Contribución / top movers | por canal; ≠ causa |
| Venta actual | commercial_state / ARR actual to-date (otros modos) |
| Forecast ARR/IGF | MAGNITUDE etiquetada |
| Target | igf_meta; no OLS |

No confundir tendencia con contribución, actual, forecast ni target.

---

## 8. Descuento / kg

Soporte real:

| Superficie | Status | Periodo | En CEL |
|---|---|---|---|
| `daily_discount_deviation` | IMPLEMENTED specialized | un día (ayer/hoy) | No; «descuento» sin «planta» saca el utterance de EXECUTIVE_STATUS |
| `delta_descuento` | PARTIAL on-demand | dos YYYY-MM | No |
| Tablas del motor trend (`arr.descuentos_diarios_cliente`) | insumo de provenance del engine | trailing N días | No se proyecta $/kg al pack |
| plant_diagnosis | no carga descuento | — | — |

Una desviación **diaria** material pertenece al modo daily/discount, no a «¿Cómo vamos?» abierto.

Una desviación **mensual** material de $/kg **podría** ser OPTIONAL futuro (no causalidad). **No** entra al first implementation slice. Contribución ≠ causa.

---

## 9. Actual financial / rentabilidad

| Hecho | Evidencia |
|---|---|
| Runtime FA existe | `lib/director-ia-financial-actual.js`; month_close |
| Catálogo Fase 1 `capabilities.js` | **no** lista `financial_actual` |
| EvidenceDemand CEL | `actual_financial: NOT_APPLICABLE` |
| ARCH CEL | CLOSE_STATUS only |
| PRE_CLOSE | no ACTUAL_FINANCIAL |

**No debe participar en «¿Cómo vamos?».** Si el director pregunta cierre/utilidad real, es otro need.

Prohibido: inferir rentabilidad de ARR 1260 o IGF 1536.5405. Missing/null ≠ 0. Si no hay FA: UNKNOWN / NOT_AVAILABLE / NOT_APPLICABLE — ya existe.

---

## 10. SEH

Inventario físico:

| Superficie | Qué es | Director IA |
|---|---|---|
| Rol JWT `SEH` / `isSehOnlyAuth` | enlace WhatsApp acotado a `/api/seh` | AUTHZ de canal, no evidencia |
| «directorio SEH» en CAPACIDADES | **diferido** de brief, trend, profile, pre_meeting | sin loader, sin tool, sin capability id |
| `lib/director-ia-*` | **cero** matches SEH | — |

**Status:** NOT_AVAILABLE para síntesis EXECUTIVE_STATUS. No asumir. No crear. Exclusión **consciente y trazable**.

Ninguna señal SEH es elegible hoy. No debe aparecer.

---

## 11. Folios

| Capability / tool | coverage / access | Chat | CEL |
|---|---|---|---|
| `folios` / `get_folio_status` | partial / on_demand | specialized | no |
| `kanban` | partial (etapa derivada) | via folio_status | no |
| `folio_historial` | partial / on_demand | specialized | no |
| `documentos` | metadata only | specialized | no |
| `folio_comentarios` | always-on PD | dump legado, no slot CEL | no |
| `cheques` / `polizas` / `get_folio_financial_status` | **none / not_integrated** | honest unsupported | no |
| `duplicados` | partial heurístico | specialized | no |
| reviewable | specialized / PRE_CLOSE | no en CEL | no |

«¿Cómo vamos?» **no** debe dump de folios. Una elevación futura solo por **excepción material** (p.ej. concentración de vencidos operativos) exigiría regla de materialidad **aún no escrita**. First slice: no.

No afirmar cheque/póliza/cumplimiento documental.

---

## 12. KPIs dashboard

`dashboard_kpis`: partial, on_demand, agregados de folios de GET `/api/dashboard/kpis`. GA/GV bloqueados. **No IGF, no ARR, no commercial_state.**

ARCH CEL: «no en cómo vamos»; planned OPTIONAL CLOSE/STATUS.

Exclusión del pack actual: **consciente**. No first slice. No fusionar con MAGNITUDE ARR/IGF.

---

## 13. Proyectos

`proyectos` / `get_project_status`: EN_CURSO por planta; no es Action Register; **«retrasado» no es estatus almacenado**.

ARCH: OPTIONAL; orphan medio. Exclusión actual consciente. Elevación futura solo con evidencia explícita de la fila, nunca inferir retraso.

---

## 14–16. Clientes / DICF / Action Register

Revalidado contra producción y código.

| Separación | CURRENT | Contrato |
|---|---|---|
| Cliente material | CS categorías + top kg | magnitud de categoría, no causa |
| Acción DICF asociada | `has_dicf_action` / `material_without_action` | «No encontré una acción DICF asociada» |
| Action Register | overdue count | ejecución registrada, no junta |
| Causalidad | prohibida | no «el descuento provocó»; no «no se han tomado medidas» |

Guardia física: `DICF_MEASURES_OVERCLAIM_RE` + `dicf_measures_supported: false`. **Correcto.** No reabrir.

---

## 17–19. ARR / IGF / metas / compromisos

Producción Acapulco: ARR 1260 t y IGF 1536.5405 t **correctamente** como proyecciones.

| Cifra | Verdad | Rol en ES |
|---|---|---|
| ARR | FORECAST_PROJECTION | MAGNITUDE optional |
| IGF stored | FORECAST_STORED | MAGNITUDE optional; ≠ ARR |
| igf_meta | TARGET_COMMITMENT | ARCH OPTIONAL; pack actual UNAVAILABLE |
| Compromiso de junta / Steering | RECORDED pending read | NOT_APPLICABLE |
| 1656 conversacional | session-only | **no** TARGET; **no** Steering; **no** persistir |

No fusionar. PRE_CLOSE es el modo que hoy carga `igf_meta`. Meter TARGET en ES es un slice **posterior** al de canales, sin persistir utterances.

---

## 20. Periodos

`collectPeriodLabels` + `evaluatePeriodComposition`:

- commercial_state, ARR, IGF, trend trailing, AR snapshot, DICF action_dates, bitácora window.
- `fuse=false`.
- Nota de usuario si `distinct_periods.length > 1`.
- Kinds no calendario (`snapshot`, `bitacora_window`, …) no se tratan como YYYY-MM.

**Correcto.** No fusionar hoy / ayer / mes / 30d / forecast / snapshot / bitácora. Daily modes siguen specialized.

«¿Cómo vamos hoy?» es CEL (FIX M1), no daily — el `hoy` **no** convierte el need en brief diario.

---

## 21. Materialidad / composición

Política ya elegida (ARCH §8–10), no nueva:

1. Recolectar **solo** familias del EvidenceDemand del need.
2. Conservar provenance y periodo por ítem.
3. Detectar señales materiales (desviación, overdue, sin DICF, trend por canal).
4. Priorizar riesgos / desviaciones / decisiones **del pack**.
5. Sintetizar (GPT wording).
6. Declarar gaps (UNAVAILABLE / NOT_AUTHORIZED / NOT_APPLICABLE).

Omisión permitida si: no hay señal, no hay evidencia, no aplica, specialized mode, AUTHZ.

Taxonomía ya existente en CEL (`AVAILABILITY`) y veracidad Fase 1. Equivalencias a usar, **sin inventar estados contractuales nuevos** en este AUDIT:

| Idea | Equivalente existente |
|---|---|
| OMITTED_NOT_MATERIAL | OPTIONAL ausente + omitir slot |
| NOT_AVAILABLE / UNKNOWN | `UNAVAILABLE` / `DATA_NOT_FOUND` / `SOURCE_NOT_INTEGRATED` |
| AUTHZ_DENIED | `NOT_AUTHORIZED` / `SOURCE_RESTRICTED` |
| SPECIALIZED_MODE | `NOT_APPLICABLE` o `isSpecializedStandaloneQuestion` |

No mega-intent. No LLM-only routing.

---

## 22. Preguntas históricas encontradas

Solo las halladas en tests / ARCH / reportes. No inventadas.

| PREGUNTA | NEED ESPERADO | FAMILIAS ESPERADAS | FUENTE REAL | SOPORTE ACTUAL | GAP |
|---|---|---|---|---|---|
| ¿Cómo vamos? | EXECUTIVE_STATUS | situación, MAGNITUDE, TREND por canal, drivers, AR/DICF | CEL + PD + trend both | Routing PASS; TREND fusionado | canales |
| como vamos / Cómo andamos / qué está pasando / ¿Cómo se ve la planta? / cuál es el estado | EXECUTIVE_STATUS | mismas | tests CEL `STATUS_VARIANTS` | need PASS | mismos |
| ¿cómo estamos? | EXECUTIVE_STATUS | mismas | tests CEL | need PASS | canales |
| ¿Cómo va Acapulco? | EXECUTIVE_STATUS + explicit plant | mismas | CEL / AUDIT E2E | PASS routing | canales |
| ¿Cómo vamos hoy? / cómo estamos hoy | EXECUTIVE_STATUS (no daily) | mismas; `hoy` no es brief | FIX/REAUDIT CEL | PASS | canales |
| ¿Cómo va Puebla? | EXECUTIVE_STATUS / plant_diagnosis; Puebla gana | pack Puebla | tests CEL + continuidad | PASS | — |
| cómo va la planta | plant_diagnosis (planner); CEL si cue | 6 bloques PD | tests PD | leftover dump si no intercepta | composer vs dump |
| ¿Cómo vamos en CASA? / ¿Cómo van los COMISIONISTAS? / últimos 3 meses | commercial_trend | series por canal | tests trend | specialized PASS | no ES |
| ¿Cómo nos fue ayer? | daily_executive_brief | venta+desc día | tests | specialized | no ES |
| ¿Cómo estuvo la venta ayer? | daily_sales_deviation | venta día | tests | specialized | no ES |
| ¿Cómo estuvo el descuento ayer? | daily_discount_deviation | desc/kg día | tests | specialized | no ES |
| Dame el resumen diario | daily_executive_brief | brief | prod PASS + CEL exclusion | PASS | no ES |
| Prepárame para el pre-cierre | PREPARATION / PRE_CLOSE | composer ciclo | prod + tests | PASS apertura; **H3** follow-up | H3 aparte |
| Prepárame para la junta / junta de cierre | pre_meeting_brief | pack junta | tests pre-meeting | specialized | no ES |
| ¿Cómo va mantenimiento? | action_status (tema AR) | AR | CEL exclusion + M12 | no ES | correcto |
| cómo va IGF / ARR | igf_status / arr_status | snapshot | tests PD | specialized | no ES |
| ¿Cómo va el presupuesto semanal? | budget_status | presupuesto | tests | specialized | no ES |
| ¿Cómo cerramos financieramente julio? / ¿Cómo quedamos realmente contra la meta? | month_close / FA | ACTUAL_FINANCIAL | tests FA | specialized | no ES |
| ¿Cómo vamos este mes? | **no** month_close | ES o unknown según cue | tests FA | no FA | no inferir cierre |
| ¿Cómo va Taller? | action_status | AR | M12 | no ES | correcto |
| ¿Qué te preocupa? | RISK_FOCUS (later slice) | — | ARCH CEL | implemented:false | no este slice |
| ¿Por qué? / ¿Qué harías? / Compáralas | CAUSE / RECOMMENDATION / COMPARISON | — | ARCH test contract | later | no este slice |
| ¿Qué tengo que resolver hoy? / Prepárame para la junta | PREPARATION | PRE_CLOSE o pre_meeting | ARCH | specialized | H3 si PRE_CLOSE |

---

## 23. Capability status real

Declarar AVAILABLE solo con runtime + canRead. Docs solos no bastan. Helper ≠ COMPLETE.

Catálogo Fase 1 (`capabilities.js`) es **parcial** respecto al runtime (no lista `commercial_trend`, daily_*, FA, client_profile, PRE_CLOSE). El inventario conversacional vive en CAPACIDADES + tools + loaders.

| id / dominio | coverage runtime | access | canRead | En ES |
|---|---|---|---|---|
| action_register | partial | always | sí | sí (OPTIONAL) |
| dicf | partial | always | sí | sí |
| bitacora | partial | always | sí | adquirida, no slot |
| commercial_state | partial | on_demand | sí | sí |
| arr / igf | partial | on_demand | sí | MAGNITUDE |
| commercial_trend | IMPLEMENTED (doc+loader) | on_demand; GA-GV deny | sí | CONDITIONAL; **mal proyectado** |
| daily_* | IMPLEMENTED | specialized | sí | excluido |
| financial actual | IMPLEMENTED specialized | restricted FA | sí en month_close | NOT_APPLICABLE |
| folios / hist / docs | partial | on_demand | sí | excluido |
| cheques / polizas | none | not_integrated | no | NOT_AVAILABLE |
| dashboard_kpis / proyectos | partial | on_demand | sí | excluido |
| mejora_continua | partial | on_demand | sí | excluido |
| SEH | none en Director IA | — | no | NOT_AVAILABLE |
| Steering chat | DORMANT | — | store only | NOT_APPLICABLE |
| Plaud / Council / live | NOT_IMPLEMENTED | — | no | PENDING |

---

## 24. NO-ORPHAN ledger

NO_ORPHAN ≠ «todo en ¿cómo vamos?». La exclusión debe ser consciente.

| Capability | Conectada a ES | Otro modo | Exclusión | Estado |
|---|---|---|---|---|
| commercial_state | SÍ (SITUATION/DRIVERS) | PD, daily, profile | — | reachable |
| CASA | SÍ loader; **NO síntesis fiel** | commercial_trend | — | **huérfana de proyección** |
| Comisionista | SÍ loader; **NO síntesis** | commercial_trend | — | **huérfana de proyección** |
| descuento | NO | daily_discount, delta_descuento | specialized consciente | no huérfana |
| financial | NO | month_close | deliberada NOT_APPLICABLE | no huérfana |
| SEH | NO | — | diferida; no existe | no huérfana (no hay qué conectar) |
| Folios | NO | M2 intents | no dump; excepción no diseñada | parcialmente reachable; no huérfana de ES |
| KPIs | NO | dashboard_kpis | ARCH: no en cómo vamos | consciente |
| proyectos | NO | project_status | consciente | consciente |
| Action Register | SÍ | action_status | — | reachable |
| DICF | SÍ | client/dossier | — | reachable |
| bitácora | NO slot | bitacora_lookup | implícita | **adquisición huérfana en pack** |
| mejora continua | NO | keyword MC | consciente | consciente |
| Steering | NO | DORMANT | deliberada | rastreada |
| Plaud / Council / live | NO | PENDING | deliberada | rastreada |
| PRE_CLOSE | NO | specialized | deliberada | no huérfana |
| commercial_trend keyword | cede a specialized | «en CASA» | correcto | no huérfana |
| 1656 session | NO | futuro pending PRE_CLOSE | no persistir | H3 aparte |

---

## 25. Gaps de composición

1. TREND no emite dos direcciones. **MAJOR.**
2. Copy «CASA/comisionista» niega independencia del registry.
3. TARGET siempre UNAVAILABLE vs ARCH OPTIONAL.
4. NEXT_DECISION solo «actualizar vencidas» — estrecho, no falso.
5. Bitácora no tiene política de omisión explícita en el pack.
6. No hay elevación por excepción de Folios/KPIs/proyectos (no es gap del first slice).

---

## 26. Gaps de adquisición

- CEL **sí** adquiere trend both; falla al **proyectar**.
- CEL **no** adquiere `igf_meta`, descuento, FA, folios, KPIs, proyectos, SEH — en su mayoría a propósito.
- plant_diagnosis **sí** adquiere bitácora y CEL no la usa.

---

## 27. Gaps de authz

- Trend: GA/GV deny → `NOT_AUTHORIZED` ya mapeado.
- FA: decisión AUTHZ propia; no abrirla en ES.
- KPIs: GA/GV bloqueados en capability.
- SEH token no es evidencia.
- No se encontró gap de authz que impida separar CASA/COMISIONISTA para un rol que ya puede ver trend.

---

## 28. Impacto CEL

Cambio de **proyección del pack TREND**, no de need routing. Preservar `resolveExecutiveNeed`, ancla UI, specialized exclusions, DICF guard, COMPARE_WITH_LABELS, ledger.

`CHANNEL_REGISTRY` ya es la norma; el pack debe obedecerlo.

---

## 29. Impacto composer PRE_CLOSE

Ninguno en el first slice. PRE_CLOSE ya trata CASA/COMISIONISTA en current to-date por planta, no este OLS de 30d. No mezclar. H3 no se toca.

---

## 30. Impacto planner / tools

Ninguno para routing. `cómo vamos en CASA` sigue `commercial_trend`. No phrasebook. No nuevo intent. Tools no se despachan en CEL.

---

## 31. Impacto tests

Hoy CEL exige greeting, routing, no daily, Puebla, no dump, no «no se han tomado medidas». **No** exige dos direcciones de canal.

Futuro (no escritos aquí): CASA↓ + COMISIONISTA↑ no puede resumirse como un solo descenso; `payload` debe llevar ambos OLS; no phrase «CASA/comisionista».

---

## 32. Relación H1 / H2 / H3

| Hallazgo | Relación con ES Completeness | Acción aquí |
|---|---|---|
| H1 greeting sin nombre | ninguna | preservar MINOR |
| H2 `reviewable` | PRE_CLOSE copy; no ES | preservar MINOR |
| H3 pending clarification PRE_CLOSE | **independiente** | no corregir; 1656 session-only |

H3 no bloquea ni es bloqueado por la independencia de canales. Pending clarification es orquestación PRE_CLOSE, no composición ES.

---

## 33. Riesgos de regresión

Preservar:

- 4 PASS de producción (CEL, hoy≠daily, daily brief, Puebla)
- CEL REAUDIT / 1141 tests
- `null != 0`; ARR ≠ IGF ≠ FA
- DICF no_medidas
- Specialized modes
- Steering DORMANT; SQL 020
- H3 abierto (no phrase-patch 1656)
- Matriz 52.5%

Riesgo de una corrección de canales: GPT sigue fusionando si el pack no **prohíbe** una sola `tendencia_ols` y no entrega ambos OLS.

---

## 34. FIRST IMPLEMENTATION SLICE

**Nombre propuesto:** `IMPL-DIRECTOR-IA-EXECUTIVE-STATUS-CHANNEL-INDEPENDENCE-001`

Alcance:

1. Proyectar `channels.casa.ols` y `channels.comisionista.ols` en el slot TREND.
2. Prohibir una dirección única rotulada «CASA/comisionista».
3. Si un canal falta: UNAVAILABLE de **ese** canal; no inventar el otro.
4. Distinguir tendencia ≠ contribución (top movers siguen por canal).
5. Tests de divergencia CASA vs COMISIONISTA.
6. Preservar routing, periodos, DICF guard, MAGNITUDE etiquetada.

Es implementación de ARCH CEL ya aprobado (registry + trend CONDITIONAL), no contrato nuevo.

---

## 35. Qué NO debe incluir ese first slice

- H1 greeting / H2 reviewable / H3 PRE_CLOSE
- Persistencia de 1656 / igf_meta / Steering
- ACTUAL_FINANCIAL / rentabilidad
- SEH
- Dump Folios / KPIs / proyectos / MC / bitácora
- Descuento/kg como slot nuevo
- TARGET igf_meta (slice posterior)
- Mega-intent, phrase patches, LLM-only routing
- Incremento de matriz M0–M20
- SQL / deploy / docs/director-ia

---

## 36. NEXT_TASK (exactamente una; no autorizada; no ejecutada)

```yaml
next_task_proposed: "IMPL-DIRECTOR-IA-EXECUTIVE-STATUS-CHANNEL-INDEPENDENCE-001"
next_task_authorized: false
next_task_executed: false
```

H3 sigue propuesta aparte (`ARCH-DIRECTOR-IA-PRE-CLOSE-PENDING-CLARIFICATION-001`) y **no** queda autorizada.

---

## Hallazgos por severidad

| ID | Sev | Resumen |
|---|---|---|
| ES-TREND-FUSE | **MAJOR** | CASA y Comisionista fusionados en una tendencia |
| ES-TARGET-OPTIONAL | **MINOR** | TARGET ARCH-OPTIONAL hardcoded UNAVAILABLE |
| ES-BITACORA-ORPHAN | **MINOR** | Bitácora adquirida y no sintetizada/omitida |
| ES-LEDGER-NARROW | **MINOR** | Ledger CEL no lista CASA/COMISIONISTA/descuento/SEH/folios/KPIs (sí en ARCH §27) |
| ES-DISC-LATER | **OBSERVATION** | Descuento existe; no first slice |
| ES-FA-EXCL | **OBSERVATION** | FA bien excluido |
| ES-SEH-EXCL | **OBSERVATION** | SEH bien excluido (no existe) |
| ES-FOLIO-NODUMP | **OBSERVATION** | Folios bien no-dump |
| ES-KPI-PROJ-EXCL | **OBSERVATION** | KPIs/proyectos bien fuera del first slice |
| ES-H3-INDEP | **OBSERVATION** | H3 independiente |

CRITICAL = 0.

---

## Confirmaciones

- Rama de referencia: `main` `de4513859a17e9bf15aed40cdb2362b018fc9c3d`.
- Código, tests, SQL, `docs/director-ia/`, producción: no modificados.
- No commit / push / merge / deploy / SQL.
- `authorized_by` / `authorized_at` / `human_authorization` no alterados.
- `secrets_check: none`.

```yaml
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/AUDIT-ARCH-DIRECTOR-IA-EXECUTIVE-STATUS-COMPLETENESS-001.md"
files_not_touched:
  - "lib/**"
  - "test/**"
  - "sql/**"
  - "docs/director-ia/**"
  - "frontend-dashboard/**"
contracts_consulted:
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md"
  - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"
  - "docs/director-ia/EXECUTIVE-STEERING-CAPTURE-CONTRACT.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-CONVERSATIONAL-EXECUTIVE-LAYER-001.md"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "IMPL-DIRECTOR-IA-EXECUTIVE-STATUS-CHANNEL-INDEPENDENCE-001"
human_decision_needed:
  - "Revisar este AUDIT-ARCH. No autoriza IMPL."
  - "H3 permanece abierto y separado."
```

---

## G5 CLOSE (humano 2026-08-27)

HUMAN_APPROVER cerró esta tarea: `DONE_PENDING_REVIEW` → `CLOSED`.

Hallazgos preservados, no reinterpretados:

- VERDICT = FAIL de completitud
- Routing CEL / planta / fronteras = PASS
- MAJOR: CASA y Comisionista incorrectamente fusionados; dos OLS independientes; EXECUTIVE_STATUS no puede representar CASA ↓ + COMISIONISTA ↑ como «CASA/comisionista ↓»
- MINOR: TARGET igf_meta OPTIONAL no entra al pack; bitácora se adquiere y no entra; ledger CEL más estrecho que ARCH

Exclusiones deliberadas (no huérfanas):

- ACTUAL_FINANCIAL, SEH, dump Folios, dump KPIs, dump proyectos
- Steering, Plaud, Council, live
- descuento/kg como slot general de «¿Cómo vamos?»

H3 sigue independiente. 1656 = evidencia de sesión; no meta oficial; no Steering.

G5 abre por separado, con G1 propio:
`IMPL-DIRECTOR-IA-EXECUTIVE-STATUS-CHANNEL-INDEPENDENCE-001` (AUTHORIZED; no ejecutada en el turno de transición).
