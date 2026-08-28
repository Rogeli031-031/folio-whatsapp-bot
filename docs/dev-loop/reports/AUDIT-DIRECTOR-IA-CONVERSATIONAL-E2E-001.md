# AUDIT-DIRECTOR-IA-CONVERSATIONAL-E2E-001

```yaml
task_id: "AUDIT-DIRECTOR-IA-CONVERSATIONAL-E2E-001"
outcome: "DONE_PENDING_REVIEW"
verdict: "FAIL"
mode: "AUDIT / EVALUATION"
implementation: false
code_changes: false
test_changes: false
sql_changes: false
docs_director_ia_changes: false
critical: 0
major: 6
minor: 5
observation: 4
existing_tests_executed: "66/66 pass (plant_diagnosis + conversational-continuity + natural-followup)"
probes: "planner + conversation-state in-process; NOT_REEXECUTED_FULL_SUITE"
next_task_proposed: "ARCH-DIRECTOR-IA-CONVERSATIONAL-EXECUTIVE-LAYER-001"
next_task_authorized: false
next_task_executed: false
global_before: "10.5 / 20 = 52.5%"
global_after: "10.5 / 20 = 52.5%"
gain_pp: 0.0
secrets_check: "none"
```

## 1. Verdict

**FAIL.**

Un director **no** puede hablar con normalidad sin conocer nombres internos. Los cuatro casos de producción se reproducen en código. Hay defectos materiales de routing, composición e inventario de evidencia. No hay CRITICAL (leak, mutación, exposición no autorizada).

La suite verde **no** contradice el FAIL: los tests actuales premián fail-closed de `unknown` aislado y un dump de seis fuentes, no el habla ejecutiva natural.

## 2. Executive summary

Director IA enruta por frases rígidas. La planta del UI **no** entra al planner. «como vamos?» y «¿Qué te preocupa?» aislados son `unknown` + clarificación. «¿Cómo va Acapulco?» sí entra a `plant_diagnosis`, pero el pack es un **SOURCE_DUMP_WITH_PROMPT**: el prompt **ordena** empezar por materialidad de clientes (`kg_mes_real` de dejaron/disminuyeron), no por venta/tendencia. La tendencia CASA existe en `commercial_trend` y **no** se carga. Portátil y Carburación no son canales de runtime. «sin acción» DICF no prueba «no se han tomado medidas». ARR 1212 t es proyección; IGF 1536.54 t es valor almacenado FORECAST: no son comparables. Tras un diagnóstico, el estado hereda **intent + planta**, no la conclusión previa. «¿Y Puebla?» se trata como cliente, no como cambio de planta.

## 3. Manual production evidence

| Caso | Input | UI | Observado | Reproducido |
|------|-------|----|-----------|-------------|
| 1 | Hola | Acapulco | Saludo + lista AR/DICF/bitácora | SÍ — `buildConversationalAnswer` estático |
| 2 | como vamos? | Acapulco | UNKNOWN / clarificación | SÍ — `unknown` / `no_rule_matched` |
| 3 | ¿Qué te preocupa? | (aislado) | UNKNOWN | SÍ si no hay `parent_intent` |
| 4 | ¿Cómo va Acapulco? | — | Diagnóstico; empieza MATERIALIDAD COMERCIAL | SÍ — intent + prompt línea 1404 |

## 4. E2E architecture traced

```
question
  → classifyConversationalIntent (early return: Hola/help/thanks; SIN evidencia; SIN conversation_state)
  → resolveConversationTurn (kind, inherit, entity_hint)
  → planDirectorIaQuestion (detectDirectorIaIntent; inherit solo si unknown + parent inheritable)
  → unknown && !inherit → buildUnknownClarificationResult (sin tools)
  → intent branch (plant_diagnosis | pre_meeting | month_close | commercial_trend | …)
  → loaders del intent
  → prompt / GPT (o respuesta hardcoded)
```

La planta UI (`planta_id`) se usa **después** del intent, como scope de loaders/authz. **No** desambigua «como vamos».

## 5. "Hola" analysis

**Origen:** `lib/director-ia-chat.js` `classifyConversationalIntent` + `buildConversationalAnswer`. Early return **antes** del planner. Texto fijo. Planta solo como etiqueta (`resolvePlantaLabelForChat`). Cero loaders.

**Clasificación del saludo:** **STALE** / **PARTIAL** / potencialmente **MISLEADING**.

Lista hardcoded: acciones abiertas, vencidas, responsables, riesgos, clientes, DICF, bitácoras.

Omite capacidades físicas existentes: `plant_diagnosis`, `daily_*`, `commercial_trend`, `client_profile`, PRE_CLOSE, `month_close_result`, ACTUAL_FINANCIAL (scope), KPIs, proyectos, IGF/ARR on-demand, Taller Mayor.

No hay capa de capability discovery. Help (`¿qué puedes hacer?`) es otra lista fija distinta (mantenimiento, vencidas, riesgos, dejaron de comprar).

## 6. "Cómo vamos" analysis

**Pipeline aislado (caso 2):**

| Paso | Resultado físico |
|------|------------------|
| input | `como vamos?` |
| normalize | `como vamos?` — **no** quita `?` (`normalizeQuestion`) |
| matcher comercial | `isCommercialTrendQuestion` = false (falta CASA/rango) |
| matcher planta | `como va [nombre]` no aplica (`vamos` ≠ `va`) |
| `estado_ambiguous` | `/^(como\s+vamos)$/` **no** matchea por el `?` |
| planner | `unknown` / `no_rule_matched` / 0.35 / clarification |
| conversation state | vacío tras Hola (el saludo no escribe `parent_intent`) |
| plant context | `planta_id` existe y **no se consulta** |
| tools | ninguno |
| response | clarificación estática (`buildUnknownClarificationResult`) |

**Por qué la planta no basta:** el planner no tiene regla «estado general de la planta del request». La planta es authz/scope, no semántica.

**Tras `plant_diagnosis`:** inherit = true → re-corre `plant_diagnosis` (mismo dump). No es fail-closed.

**Clasificación:** **ROUTING_DEFECT** + **MISSING_CONTEXT_RESOLUTION**. No es SAFETY_CORRECT_FAIL_CLOSED: la ambigüedad «¿qué planta?» ya está resuelta.

## 7. "Qué te preocupa" analysis

**A. Aislada:** `unknown` / `no_rule_matched`. `isPreCloseQuestion` exige `preocup` **y** `planta(s)`, o junta/pre-cierre. «¿Qué te preocupa?» no califica. **UNNECESSARY_CLARIFICATION** / **ROUTING_DEFECT**.

**B. Tras diagnóstico:** inherit `plant_diagnosis`. Requery del pack. El estado **no** guarda previous conclusion, risk ranking ni evidencia. GPT vuelve a enumerar bloques. **PARTIAL** follow-up: conserva intent/planta; no conserva conclusión.

## 8. "Cómo va Acapulco" full trace

1. **Intent:** `plant_diagnosis` (0.84). Regla: `como va` + token `[a-z]{3,}` (Acapulco) y no tema AR.
2. **Domains:** `action_register`, `dicf`, `bitacora`, `arr`, `igf`, `commercial_state`.
3. **Loaders:** `loadPlantDiagnosisForChat` → AR, DICF, bitácora, CS SELECT (`arr.dicf_cliente_mes` latest), IGF+ARR annex (`loadIgfArrSourceBlocksForChat` / `computePronosticoProyByPlant`).
4. **Recibe:** seis bloques + `commercial_materiality` (top-5 dejaron/disminuyeron por `kg_mes_real`) + alignment.
5. **No recibe:** `commercial_trend` (serie/OLS CASA), daily deviation, `igf_meta` TARGET, ACTUAL_FINANCIAL, PRE_CLOSE pack, KPIs/proyectos, canales Portátil/Carburación, steering events.
6. **Prioridad:** **prompt**, no ranking de venta. `buildPlantDiagnosisPrompt`: «Si hay MATERIALIDAD COMERCIAL, señala **primero** los clientes que concentran kg observados…» + «Resume el resto de bloques».
7. **Por qué materialidad primero:** instrucción explícita al modelo (`lib/director-ia-plant-diagnosis.js` ~1404). Tests lo exigen. No es el modelo inventando el orden: el código lo pide.
8. **Composición:** **SOURCE_DUMP_WITH_PROMPT**.

## 9. Sales evidence inventory

| Necesidad | Clasificación | Evidencia |
|-----------|---------------|-----------|
| Venta actual (kg/t observados del mes) | **AVAILABLE_BUT_NOT_LOADED** en plant_diagnosis; **AVAILABLE_ONLY_IN_OTHER_MODE** (`month_close_result` / PRE_CLOSE ARR actual; daily pack) | ARR del pack es `proy_venta_ton` |
| Tendencia (serie/OLS) | **AVAILABLE_ONLY_IN_OTHER_MODE** `commercial_trend` | `lib/commercial-trend-engine.js` |
| Tendencia diaria | **AVAILABLE_ONLY_IN_OTHER_MODE** `daily_sales_deviation` | no wired |
| Comparación temporal | **AVAILABLE_ONLY_IN_OTHER_MODE** (trend 30/90; month_close mes vs mes; M9) | CS solo estados almacenados |
| Meta / compromiso (`igf_meta`) | **AVAILABLE_ONLY_IN_OTHER_MODE** PRE_CLOSE / month_close | plant_diagnosis no carga meta |
| Forecast IGF stored | **AVAILABLE_AND_LOADED** | composición `valor almacenado` |
| ARR proyección cierre | **AVAILABLE_AND_LOADED** | `venta_ton` = `proy_venta_ton` |
| Actual vs objetivo | **AVAILABLE_ONLY_IN_OTHER_MODE** | no en este pack |
| Evolución del mes | **AVAILABLE_ONLY_IN_OTHER_MODE** | trend/daily |

## 10. Channel evidence inventory

Runtime de tendencia reconoce **solo** CASA vs COMISIONISTA (`LIKE '%comisionista%'` → resto = CASA). No hay tercer canal.

| Canal | Fuente tendencia | En plant_diagnosis |
|-------|------------------|--------------------|
| CASA | `commercial-trend-engine` | **no cargado** |
| COMISIONISTA | idem | **no cargado** |
| PORTÁTIL | no hay filtro | — |
| CARBURACIÓN | no hay filtro | — |

CS puede traer `canal`/`subcanal` por **cliente** (etiqueta almacenada), no serie de canal.

## 11. Casa analysis

**AVAILABLE_ONLY_IN_OTHER_MODE** para tendencia. En «¿Cómo va Acapulco?» **no** se carga.

Pregunta obligatoria: ¿tenía información suficiente de tendencia Casa y no la usó?

**PARTIAL.**

- En **ese** request: **NO** (el pack no incluye serie/OLS Casa).
- En **el sistema**: el motor existe y se activa con «como vamos en casa» → `commercial_trend`. No se dispara sin nombrar Casa/rango.

## 12. Portátil analysis

**NOT_AVAILABLE** como canal de diagnóstico. El token aparece en un regex de temas de chat (`director-ia-chat.js`), no en loaders. Si el valor existe en ARR/`canal`, el engine lo **pliega a CASA**.

## 13. Carburación analysis

**NOT_AVAILABLE** como canal distinto. Misma fusión a CASA.

## 14. Commercial materiality semantics

**Código:** `buildCommercialMateriality` (`lib/director-ia-plant-diagnosis.js`).

Significado real, en lenguaje normal:

Son los clientes **de dos listas ya etiquetadas** en el cache comercial (`arr.dicf_cliente_mes`):

- **dejaron** (`es_recuperable` o estado «dejaron»): se ordenan por `kg_mes_real` del **mes previo** (cuánto pesaban cuando aún compraban).
- **disminuyeron** (estado almacenado): se ordenan por `kg_mes_real` del **mes del cache** (cuánto kg se observó ese mes en esa fila).

Top **N=5** por kg descendente. Share = kg / suma de kg **de esa categoría rankeable**, no de toda la planta.

**No son:**

- los mayores clientes de base (solo esas categorías);
- «aumentaron» / «nuevos» (existen en CS `clients_shown`, no en el ranking de materialidad);
- caída calculada (forecast − real está **prohibido**);
- clientes que concentran la venta total de la planta.

Periodo = latest `year, month` del cache CS (en producción: julio, distinto de ARR/IGF agosto).

«Clientes que concentran kg observados» = **top de magnitud kg en dejaron/disminuyeron**, no «los que más venden ahora».

## 15. DICF inference audit

`coverage_status = material_without_action` = no hay fila en `arr.dicf_acciones` con `cliente_key` derivado (patrón M11).

**NO_DICF_ACTION → NO_MEASURES_TAKEN: NO soportado.**

Pueden existir Action Register, bitácora, comentarios, seguimiento externo. El addendum del system **lo prohíbe** («Sin acción DICF no prueba negligencia ni que nadie trabaje el caso»). El user prompt pide «con/sin acción» y el modelo de producción **excedió** la evidencia.

**Finding de truth/composition.**

## 16. Period alignment

| Fuente | Cómo se elige | Tipo |
|--------|---------------|------|
| CS / materialidad | latest `year,month` del cache planta | as-of materializado (julio en el caso) |
| ARR / IGF | `resolveYearMonthFromQuestion` default **mes abierto CDMX** | forecast/proyección (agosto) |
| Bitácora | ventana `CHAT_CONTEXT_MONTH_WINDOW` (p.ej. junio) | histórico de sesiones |
| AR / DICF | fechas de acciones, no mes único | ventana operativa |

`buildAlignment`: mismatch **visible**, `silently_aligned: false`, `heterogeneous_windows: true`. GPT recibe bloques heterogéneos y la instrucción de declarar mismatch.

**Status:** **VISIBLE_BUT_NOT_COMPOSED** (flag gobernado; la narrativa no alinea antes). No UNCONTROLLED. No se reconcilia antes de GPT.

## 17. ARR vs IGF semantics

| Cifra | Qué es | Truth class | Periodo |
|-------|--------|-------------|---------|
| ARR ~1212 t | `proy_venta_ton` (`computePronosticoProyByPlant`) | FORECAST / proyección de cierre | YYYY-MM pedido (agosto) |
| IGF ~1536.54 t | línea `venta_ton` stored en `igf.compromiso_lines` | FORECAST almacenado | mismo YYYY-MM pedido |

**No son actual.** **No son meta `igf_meta`.** **No son comparables** como dos actuals. El prompt dice no fusionar fuentes y «ARR proyección…». El usuario puede leer contradicción falsa (1212 vs 1536). No se reconcilió en esta auditoría.

## 18. Executive composition audit

**SOURCE_DUMP_WITH_PROMPT.**

No hay capa 1–7 (situación / magnitud / tendencia / explicación / riesgo / acciones / recomendación). Hay seis bloques + addendum + «señala primero materialidad». GPT enumera.

PRE_CLOSE composer existe **aparte** y no se usa aquí.

## 19. Language/UX audit

| Expresión | Clase | Origen |
|-----------|-------|--------|
| MATERIALIDAD COMERCIAL | INTERNAL_GUARDRAIL_LEAK | prompt/context label |
| kg observados | TECHNICAL_BUT_NECESSARY (si se explica); leak si va solo | prompt + campo |
| cobertura DICF | INTERNAL_GUARDRAIL_LEAK | prompt |
| no se recalcularon clientes | TECHNICAL_BUT_NECESSARY | context CS `live_compute: false` |
| no hay fusión entre fuentes | INTERNAL_GUARDRAIL_LEAK | limitation `no_fusion_entre_fuentes` |
| null no es cero | INTERNAL_GUARDRAIL_LEAK | prompt + payload flag |
| mismatch en los periodos | USER_RELEVANT (el hecho) / leak (el jergón) | alignment.note |

## 20. Follow-up sequences

Probes `resolveConversationTurn` + `planDirectorIaQuestion`. Planta request = 11 (Acapulco). **No** se persistió conclusión.

### Secuencia A

| Turno | intent | plant | period | inherit | referent | conclusion |
|-------|--------|-------|--------|---------|----------|------------|
| ¿Cómo va Acapulco? | plant_diagnosis | 11 | default IGF/ARR | no | — | no se guarda |
| ¿Qué te preocupa más? | plant_diagnosis | 11 | requery | sí | no | no |
| ¿Por qué? | plant_diagnosis | 11 | requery | sí | no | no |
| ¿Qué harías primero? | plant_diagnosis | 11 | requery | sí | no | no |

State after: `parent_intent=plant_diagnosis`. No previous conclusion. Recomendación GPT no está gobernada (N5 prohibido en addendum).

### Secuencia B

| Turno | intent | plant | hint | Nota |
|-------|--------|-------|------|------|
| ¿Cómo va Acapulco? | plant_diagnosis | 11 | — | |
| ¿Y Puebla? | plant_diagnosis | **11** | entity_hint=`Puebla` | **no** cambia de planta; busca **cliente** Puebla; si no unique → clarificación de entidad |
| Compáralas | plant_diagnosis | 11 | — | no hay compare de plantas |

Plant switch real = `planta_id` del request ≠ echoed (UI), no el nombre en la frase.

### Secuencia C (tras diagnóstico)

| Turno | plan |
|-------|------|
| ¿Cómo vamos contra el compromiso? | inherit plant_diagnosis — **no** month_close / PRE_CLOSE / meta |
| ¿Vamos a cumplir? | inherit plant_diagnosis |

## 21. Natural-language probe table

| PHRASE | EXPECTED_SEMANTIC_NEED | ACTUAL_ROUTE | CONTEXT_USED | RESULT | CLASSIFICATION |
|--------|------------------------|--------------|--------------|--------|----------------|
| ¿Cómo vamos? | estado de la planta del UI | unknown | planta no usada | clarificación | ROUTING_DEFECT |
| ¿Cómo va Acapulco? | mismo, planta nombrada | plant_diagnosis | nombre en texto | dump + materialidad primero | COMPOSITION_DEFECT |
| ¿Qué te preocupa? | riesgos/prioridad | unknown aislado; inherit si hay parent | parent si existe | clarif / re-dump | ROUTING_DEFECT / PARTIAL |
| ¿Qué te preocupa más? | idem | igual | igual | igual | igual |
| ¿Qué está pasando? | situación | unknown | no | clarificación | ROUTING_DEFECT |
| ¿Por qué? | explicación del hilo | unknown aislado; inherit why | parent | re-dump | MISSING_CONTEXT (conclusión) |
| ¿Qué harías? | siguiente paso | unknown / inherit | parent | re-dump; reco no gobernada | COMPOSITION_DEFECT |
| ¿Qué hago primero? | prioridad | igual | igual | igual | igual |
| ¿Y Puebla? | cambiar / añadir planta | entity_intro + inherit | hint cliente | no switch | ROUTING_DEFECT |
| Compáralas | comparar plantas | comparison + inherit | una planta | re-dump | MISSING_CAPABILITY |
| ¿Cómo vamos contra el compromiso? | actual vs meta | unknown / inherit dump | no meta | no compara compromiso | ROUTING_DEFECT |
| ¿Vamos a cumplir? | forecast vs meta | igual | igual | igual | ROUTING_DEFECT |
| ¿Cómo cerramos julio? | cierre de mes | month_close_result | julio si parsea | ruta distinta OK | EXPECTED |
| ¿Qué tengo que resolver hoy? | agenda junta/cierre | unknown | PRE_CLOSE exige junta/resolver+junta | clarificación | ROUTING_DEFECT |
| Prepárame para la junta | brief junta | pre_meeting_brief | — | OK | EXPECTED |
| Prepárame para el pre-cierre | PRE_CLOSE | pre_meeting_brief / pre_close | — | OK | EXPECTED |
| ¿Qué se comprometió Acapulco en la junta? | steering RECORDED | unknown | store no en chat | clarificación genérica | EXPECTED FAIL-CLOSED (UX pobre) |
| como vamos en casa | tendencia Casa | commercial_trend | canal | OK | EXPECTED |

## 22. Fail-closed vs UX classification

| Fallo | Decisión |
|-------|----------|
| unknown «como vamos» con planta UI | **UNNECESSARY_CLARIFICATION** + **MISSING_CONTEXT_RESOLUTION** + **ROUTING_DEFECT** |
| unknown «qué te preocupa» aislado | **ROUTING_DEFECT** |
| unknown steering junta | **SAFETY_CORRECT_FAIL_CLOSED** (no inventa; no cae a AR) con UX que no declara PENDING |
| plant_diagnosis sin tendencia | **COMPOSITION_DEFECT** + evidencia no cargada |
| DICF → no hay medidas | **COMPOSITION_DEFECT** / truth |
| ¿Y Puebla? como cliente | **ROUTING_DEFECT** |
| isolated unknown sin estado (tests) | fail-closed **intencional** para frases sin ancla; no justifica ignorar planta UI |

## 23. Steering boundary

Frase: «¿Qué se comprometió Acapulco en la junta?»

- Store físico: IMPLEMENTED (fuera de este chat).
- Chat read / capture: PENDING.
- Chat real: **unknown** + clarificación genérica. No reconoce la integración ausente. No cae a Action Register (falta token `accion`). No inventa cifras. No es POST_CAPTURE_READ.

## 24. Existing test coverage

Ejecutado: **66/66 pass**

- `test/director-ia-plant-diagnosis.test.js`
- `test/director-ia-conversational-continuity.test.js`
- `test/director-ia-natural-followup.test.js`

Cubren: «cómo va la planta» / «cómo va Querétaro»; inherit de unknown **con** parent; isolated unknown **debe** clarificar; materialidad `kg_mes_real`; mismatch visible; no causalidad; no M9.

## 25. Coverage gaps

**COVERAGE_GAP** (ausencia de test ≠ defecto por sí sola):

- `como vamos` / `cómo vamos` sin Casa y sin nombre de planta
- `qué te preocupa` aislado
- follow-up `por qué` con aserción de conclusión previa
- `¿Y Puebla?` como **planta**, no cliente
- composición ejecutiva (orden venta → tendencia → clientes)
- channel trend **dentro de** plant_diagnosis
- greeting vs inventario de capacidades

Por eso la suite verde convive con el fallo manual: **los tests no piden el comportamiento que el director espera**.

## 26. Findings table

| ID | SEVERITY | LAYER | REPRODUCTION | EVIDENCE | USER_IMPACT | ROOT_CAUSE | FIX_DIRECTION |
|----|----------|-------|--------------|----------|-------------|------------|---------------|
| F-NL-001 | MAJOR | A ROUTING | `como vamos?` / `¿Qué te preocupa?` / `¿Qué está pasando?` + planta UI | planner `unknown`; planta no entra a detect | El director no puede preguntar en natural | Intent rígido; contexto UI ignorado | Capa semántica planta-scoped; no phrasebook suelto |
| F-COMP-001 | MAJOR | G COMPOSITION | `¿Cómo va Acapulco?` | prompt 1404 + dump 6 bloques | Empieza por clientes DICF, no por cómo va la venta | No hay composer ejecutivo | Composer: situación→tendencia→explicación |
| F-EVID-001 | MAJOR | E/F ACQUISITION | mismo caso | trend engine no llamado | Omite tendencia Casa que el sistema sí sabe en otro modo | Starvation del pack | Incluir trend/actual/meta cuando existan |
| F-TRUTH-001 | MAJOR | G/H TRUTH | «sin acción» → no hay medidas | coverage ≠ AR/bitácora; addendum lo prohíbe | Afirmación falsa de inacción | Prompt leak + over-inference | Atar cobertura al hecho DICF only |
| F-CTX-001 | MAJOR | C CONTEXT | `¿Y Puebla?` tras Acapulco | `entity_intro` + hint cliente; planta 11 | No cambia de planta; busca cliente | Referente planta vs entidad | Resolver nombres de planta antes que cliente |
| F-TRUTH-002 | MAJOR | G TRUTH | ARR 1212 vs IGF 1536 | proy vs stored forecast | Contradicción falsa | Clases de verdad no compuestas | Etiquetar y no comparar como actuals |
| F-UX-001 | MINOR | H UX | Hola | `buildConversationalAnswer` | Inventario viejo | Saludo estático | Discovery no histórico (no este AUDIT) |
| F-UX-002 | MINOR | H UX | jerga en respuesta | labels de prompt | El director lee guardrails | Leak de limitaciones | Capa de lenguaje (después de composer) |
| F-NL-002 | MINOR | A ROUTING | compromiso / cumplir / resolver hoy | unknown o inherit dump | No usa PRE_CLOSE/month_close | Matchers estrechos | Routing semántico a modos ya construidos |
| F-STATE-001 | MINOR | B STATE | ¿Por qué? tras diagnóstico | state sin conclusion | Re-enumera, no explica lo dicho | Estado = intent, no hallazgo | Referent de conclusión (después) |
| F-STEER-001 | MINOR | I/J STEERING | compromiso de junta | unknown genérico | No dice «aún no leo steering» | Chat read PENDING | Mensaje de frontera (no POST_CAPTURE_READ) |
| F-OBS-001 | OBSERVATION | B | inherit tras diagnóstico | probes A | Follow-up técnico funciona | Strategy B | No es el cuello |
| F-OBS-002 | OBSERVATION | J | tests unknown aislado | 66/66 | Suite ≠ UX | Tests alineados al fail-closed | No parchear tests para ocultar F-NL-001 |
| F-OBS-003 | OBSERVATION | D | mismatch junio/julio/agosto | alignment.status | Gobernado pero no compuesto | heterogeneous_windows by design | Composer temporal |
| F-OBS-004 | OBSERVATION | A | `como vamos?` vs `como vamos` | `?` no se strippea | `estado_ambiguous` no dispara | Normalize incompleto | Irrelevante si se resuelve F-NL-001 |

## 27. Root causes

1. **Routing por frase, no por necesidad ejecutiva.** El UI plant no es ancla semántica.
2. **`plant_diagnosis` = inventario de fuentes + prompt de guardrails**, no un diagnóstico de operación.
3. **Evidencia comercial de alto nivel vive en otros modos** (trend, PRE_CLOSE, month_close) y no se ensambla en la pregunta canónica.
4. **Estado conversacional guarda intent/planta, no hallazgo.**
5. **Fuga de jerga de gobernanza al usuario.**
6. **Referentes de planta y de cliente colisionan** (`¿Y Puebla?`).

No es «solo un prompt». El orden de materialidad **sí** es de prompt; el UNKNOWN de «como vamos» es de planner; la ausencia de Casa es de selección de loaders.

## 28. Recommended correction order

No parchear frase a frase.

1. **ARCH** capa conversacional ejecutiva: pregunta de estado de «la planta del contexto» + follow-ups de preocupación/por qué, sin exigir el nombre de la planta ni el intent interno.
2. **Composer** (reusar loaders existentes: ARR actual si existe, trend CASA, meta si existe, CS, AR) con jerarquía situación → magnitud → tendencia → clientes → riesgos. Periodos etiquetados **antes** de GPT.
3. **Fronteras de verdad:** DICF coverage; ARR vs IGF vs meta vs actual.
4. **Referente de planta** en «¿Y Puebla?» / «Compáralas».
5. Matchers/saludo/lenguaje **al final**.

No ejecutar. No POST_CAPTURE_READ.

## 29. Matrix impact

Before/after: **10.5 / 20 = 52.5%**. Delta **0.0 pp**.

Riesgo documentado (sin tocar matriz): `plant_diagnosis` «Implementado» no cumple una lectura ejecutiva de «cómo va la planta». M13 COMPLETE no se reabre aquí.

## 30. Exactly one NEXT_TASK

`ARCH-DIRECTOR-IA-CONVERSATIONAL-EXECUTIVE-LAYER-001`

Capa de routing + composición para el habla ejecutiva natural sobre la planta del contexto, reutilizando capacidades ya construidas. Un ARCH, no una lista de regex.

POST_CAPTURE_READ permanece pendiente y **no** es el cuello de este FAIL.

No autorizada. No ejecutada.
