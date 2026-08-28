# ARCH-DIRECTOR-IA-CONVERSATIONAL-EXECUTIVE-LAYER-001

```yaml
task_id: "ARCH-DIRECTOR-IA-CONVERSATIONAL-EXECUTIVE-LAYER-001"
outcome: "DONE_PENDING_REVIEW"
verdict: "READY_WITH_LIMITS"
mode: "ARCH"
implementation: false
code_changes: false
test_changes: false
sql_changes: false
docs_director_ia_changes: false
g2_created: false
g3_created: false
constitution_touched: false
ies_04_touched: false
re_05_touched: false
post_capture_read_executed: false
plaud_implemented: false
council_implemented: false
next_task_proposed: "IMPL-DIRECTOR-IA-CONVERSATIONAL-EXECUTIVE-STATUS-SLICE-001"
next_task_authorized: false
next_task_executed: false
first_slice: "C_semantic_need_ui_anchor_plus_executive_composer_plant_status"
semantic_need: "B_need_layer_over_existing_planner"
composer: "B_deterministic_pack_plus_gpt_wording"
specialized_modes: "C_semantic_need_selects_or_composes_modes"
gates_before_impl: "NO_NEW_GATE"
global_before: "10.5 / 20 = 52.5%"
global_after: "10.5 / 20 = 52.5%"
gain_pp: 0.0
secrets_check: "none"
```

## 1. Executive verdict

**READY_WITH_LIMITS.**

Se diseña una **Conversational Executive Layer** (CEL) sobre el planner existente: necesidad semántica → ancla de contexto autenticado → requisitos de evidencia → modos/loaders ya construidos → pack determinístico → prosa GPT subordinada → estado de referente (no de evidencia).

No es parche de frases. No es mega-intent. No es LLM-only routing. No reemplaza PRE_CLOSE, `month_close_result`, IGF/ARR, Action Register ni el store de Steering.

Límites explícitos: first slice = estado de planta (no Steering/Plaud/Consejo/RE runtime). `POST_CAPTURE_READ` queda pendiente y rastreable. Matriz 52.5% intacta.

## 2. Audit findings accepted

Se aceptan sin reinterpretar: FAIL; CRITICAL 0; MAJOR 6; MINOR 5; OBSERVATION 4; y los 19 hechos de `CURRENT_TASK.starting_state_do_not_reinterpret`.

Causa raíz aceptada: routing por frase + UI plant no ancla + `plant_diagnosis` = SOURCE_DUMP_WITH_PROMPT + evidencia de venta/tendencia en otros modos + estado sin conclusión + jerga interna + colisión planta/cliente.

## 3. Current conversation architecture

```
utterance
  → smalltalk/help hardcoded (Hola)
  → conversation-state inherit (solo si parent inheritable + unknown)
  → detectDirectorIaIntent (regex / keyword)
  → unknown + sin inherit → clarificación
  → intent branch → loaders del intent → prompt/GPT
```

`planta_id` autentica loaders. No resuelve «cómo vamos». Source order ≈ answer order. Suite verde no cubre habla natural.

## 4. Semantic need architecture

**Elegido: B — semantic executive need layer sobre planner existente.**

| Alt | Veredicto |
|-----|-----------|
| A. intent-first | **Rechazada.** Es el defecto actual. |
| B. need layer sobre planner | **Elegida.** Determinista, auditable, reusa execution. |
| C. LLM-only free routing | **Rechazada.** No auditable; riesgo de truth/AUTHZ. |
| D. mega-intent | **Rechazada.** Ambigüedad y colisión con modos. |

Objeto: `ExecutiveNeed` (need_type, subject, scope, period_hint, comparison_set, parent_need). Se resuelve **antes** del intent técnico. No es «frase X → capability Y». Varias frases pueden mapear a un need; un need puede componer varios modos.

## 5. Technical plan relationship

**Boundary:**

| Capa | Dueña de | No dueña de |
|------|----------|-------------|
| CEL (need + composer) | necesidad, ancla, requisitos, orden ejecutivo, prosa, referente | truth contracts, AUTHZ, IES, RE, SQL |
| Planner / tools (Fases 2–3 + in-process) | execution plan, intents especializados, loaders | semántica ejecutiva de «cómo vamos» |
| Contratos (Constitución, EKE, FA, Steering) | clases de verdad | UX |

CEL **declara** qué evidencia pide. El planner/tooling **ejecuta** loaders existentes. CEL **no** sustituye Fases 1–3 ni crea pipeline N6.

Rejected: reescribir el planner como único cerebro; bypasear tools con un GPT que elija SQL.

## 6. UI semantic anchor

**Elegido: ancla autenticada selectiva.**

| Contexto UI | ¿SEMANTIC_ANCHOR? | Regla |
|-------------|-------------------|--------|
| Planta autorizada del request | **SÍ** para needs underspecified (`EXECUTIVE_STATUS`, `RISK_FOCUS`) si el utterance **no** nombra otra planta | No inventa need; solo llena scope |
| Periodo del módulo | **NO** por defecto | Solo si el need lo exige (cierre, mes nombrado) |
| Page/module | **NO** | No imponer Action Register porque el usuario está en Acciones |
| Portfolio | **SÍ** solo si AUTHZ es ZP/AD/GG y el need es portafolio (PRE_CLOSE) | No colapsar a una planta |
| Rol | **AUTHZ**, no semántica | Niega; no interpreta |

«¿Cómo vamos?» + UI Acapulco → `EXECUTIVE_STATUS` + scope=Acapulco. No es «inventar intención»: la intención es estado; el UI aporta **dónde**.

Si no hay planta autenticada resoluble: clarificar. Fail-closed de planta ≠ fail-closed de frase.

## 7. Executive need taxonomy

Taxonomía **mínima** (8) que cubre el AUDIT E2E. No son intents nuevos de producto.

| Need | Ejemplos humanos | No implica |
|------|------------------|------------|
| `EXECUTIVE_STATUS` | cómo vamos / cómo va Acapulco / qué está pasando | `plant_diagnosis` automático |
| `RISK_FOCUS` | qué te preocupa / qué te preocupa más | source dump |
| `CAUSE_EXPLANATION` | por qué | motor causal |
| `RECOMMENDATION` | qué harías / qué hago primero | N5 runtime |
| `COMPARISON` | compáralas | mega-pack |
| `FOLLOW_UP` | residual inheritable | evidencia cacheada |
| `PREPARATION` | prepárame junta / pre-cierre | Consejo |
| `CLOSE_STATUS` | cómo cerramos julio / contra el compromiso / vamos a cumplir | ACTUAL_FINANCIAL global |

Rejected: 30 intents; phrasebook; un need «GENERAL».

## 8. Evidence requirements

Cada need produce un **EvidenceDemand** por clase, no un dump:

`REQUIRED` · `OPTIONAL` · `UNAVAILABLE` · `NOT_AUTHORIZED` · `NOT_APPLICABLE` · `PERIOD_INCOMPATIBLE`

Reglas:

- No cargar todo.
- No rellenar `UNAVAILABLE` con 0 ni con otra clase.
- GPT no inventa huecos `REQUIRED`.
- `OPTIONAL` ausente se omite en la jerarquía (no se finge).

Ejemplo `EXECUTIVE_STATUS` (conceptual, no schema DDL):

| Clase | Demanda |
|-------|---------|
| commercial actual / situación | REQUIRED si hay loader; else UNAVAILABLE |
| trend CASA | CONDITIONAL → REQUIRED si capability reachable; else OPTIONAL/UNAVAILABLE |
| target/commitment (`igf_meta`) | OPTIONAL |
| IGF stored / ARR proy | OPTIONAL, etiquetados FORECAST |
| CS drivers | OPTIONAL |
| AR execution | OPTIONAL |
| ACTUAL_FINANCIAL | NOT_APPLICABLE salvo `CLOSE_STATUS` + FINAL |
| Steering RECORDED | NOT_APPLICABLE hasta POST_CAPTURE_READ |

## 9. Executive composer

**Elegido: B — deterministic evidence pack + composition contract + GPT wording.**

| Alt | Veredicto |
|-----|-----------|
| A. GPT sobre raw blocks | **Rechazada.** Estado actual. |
| B. pack + contrato + wording | **Elegida.** |
| C. prosa 100% determinista | **Rechazada.** Frágil e inhumana. |
| D. un composer por fuente | **Rechazada.** Source order = answer order. |

Pack: bloques tipados (truth class, period, as-of, provenance, status). Composer elige **cuáles** entran y **en qué orden**. GPT redacta solo sobre el pack. Una llamada. No IES. No N5.

## 10. Answer hierarchy

Jerarquía **condicional** (no plantilla universal). Source order **no** define answer order.

```
SITUATION → MAGNITUDE → TREND → TARGET/COMMITMENT
  → DRIVERS → RISKS → EXECUTION → NEXT_DECISION
```

Un bloque entra solo con evidencia suficiente. Materialidad de clientes = **DRIVERS**, no SITUATION. El prompt actual que manda «señala primero MATERIALIDAD» queda **arquitectónicamente derogado** para CEL (el código no se toca en este ARCH).

## 11. Sales/trend acquisition

Para `EXECUTIVE_STATUS`: tendencia comercial = **CONDITIONAL**.

- Si `commercial_trend` es reachable (authz + fuente): tratarla como **REQUIRED** del pack de estado (no esperar «en casa»).
- Si no: **UNAVAILABLE**; decirlo en lenguaje ejecutivo, no inventar pendiente OLS.

No implementar. No hardcodear Casa en el utterance.

## 12. Channel availability

**Registry de canales**, no lista de tres nombres.

Hallazgo congelado: CASA = PARTIAL; PORTÁTIL = NOT_AVAILABLE independently; CARBURACIÓN = NOT_AVAILABLE independently.

Respuesta defendible: «puedo hablar de tendencia general / CASA vs comisionista; no tengo separación defendible de Portátil y Carburación». Nuevos canales entran cuando el engine los distinga, no cuando el director los nombre.

## 13. Period composition

**Antes** de la prosa. Estrategia por caso:

| Situación | Acción |
|-----------|--------|
| Misma clase + mismo YYYY-MM | **ALIGN** |
| Misma pregunta, as-of distintos (CS julio vs ARR agosto) | **COMPARE_WITH_LABELS** |
| Clase incompatible (FINAL vs mes abierto) | **EXCLUDE** o NOT_APPLICABLE |
| Usuario nombra periodo irresoluble | **ASK_CLARIFICATION** |

Default del caso E2E: **COMPARE_WITH_LABELS**. Prohibido fusionar junio/julio/agosto. Preservar actual / historical / forecast / target / financial final / commercial actual / as-of.

## 14. DICF truth boundary

**Congelado:** `NO_DICF_ACTION` ≠ `NO_MEASURES_TAKEN`.

Afirmable: «No encontré una acción DICF asociada a ese cliente.»  
No afirmable: «No se han tomado medidas», salvo evidencia multi-fuente explícita (AR + DICF + bitácora) que el pack marque como tal.

## 15. User-language boundary

| Capa | Contenido |
|------|-----------|
| GOVERNANCE_DIAGNOSTICS (interno) | null≠0, no fusion, field_origin, mode names, mismatch codes |
| USER_EXECUTIVE_LANGUAGE | periodos en calendario, «no tengo X», «esto es proyección» |

Exponer limitación técnica **solo si** cambia la decisión (REQUIRED ausente, NOT_AUTHORIZED, COMPARE_WITH_LABELS material, steering no leído). No listar guardrails por deporte.

## 16. Conversation state

Estado **semántico efímero** (mismo request/echo; no store de hechos):

`executive_need` · `subject` · `plant/portfolio` · `period` · `previous_conclusion_ref` · `evidence_refs` · `comparison_set` · `open_question` · `parent_need`

**STATE ROUTES:** RISK_FOCUS/CAUSE/RECOMMENDATION/COMPARISON/FOLLOW_UP heredan subject/scope si no hay switch.

**EVIDENCE REQUERIES:** siempre fresco. No persistir raw pack.

Intent técnico puede viajar como `execution_hint`, no como semántica.

## 17. Conclusion/referent state

`previous_conclusion` = **referente conversacional**, no evidence store.

Forma: claims estructurados `{slot, text_digest, evidence_ref_ids, period, truth_class}`. El digest no es prueba. Un «por qué» reconsulta refs; si el loader cambia, gana la evidencia. LLM prose no se reinyecta como hecho.

## 18. Entity disambiguation

«¿Y Puebla?» **no** se hardcodea.

Orden:

1. Nombre en **registro de plantas** autorizadas al actor → plant switch / comparison candidate.
2. Si no: entidad activa del hilo (cliente/unidad) con match único.
3. Si no: candidatos en evidencia fresca.
4. 0 o N → clarificar (plant vs cliente). Nunca silent pick.

UI plant actual es default de scope, no veto de un nombre de otra planta autorizada.

## 19. Causal follow-up

`CAUSE_EXPLANATION` no crea motor causal.

| Evidencia | Respuesta |
|-----------|-----------|
| Hecho en pack (mover, gap tipado) | evidence-derived, etiquetado |
| Causa humana RECORDED | **FUTURE** vía Steering + POST_CAPTURE_READ |
| Nada | data gap; no inventar |
| Hipótesis N5 | solo si RE runtime existe (hoy **PENDING**); CEL no es RE |

## 20. Recommendation follow-up

CEL **ROUTE / PROJECT**, no fuente de verdad.

Hoy: puede **COMPOSE** solo ejecución **ya** en evidencia (acciones AR/DICF abiertas, DECISION_NEEDED de PRE_CLOSE). No inventar «yo haría». No hardcodear reco. No modificar `05`. Cuando exista RE, CEL proyecta el Reasoning Result; no lo sustituye.

## 21. Specialized-mode integration

**Elegido: C — semantic need selects/composes modes.**

| Alt | Veredicto |
|-----|-----------|
| A. CEL reemplaza modos | **Rechazada.** Rompe contratos. |
| B. modes siempre preceden | **Rechazada.** «cómo vamos» nunca llegaría. |
| C. need selecciona/compone | **Elegida.** |
| D. sistemas paralelos | **Rechazada.** Orfandad. |

| Need | Modo/composición |
|------|------------------|
| PREPARATION + pre-cierre | PRE_CLOSE composer existente |
| PREPARATION + junta genérica | `pre_meeting_brief` |
| CLOSE_STATUS | `month_close_result` (+ ACTUAL_FINANCIAL si FINAL) |
| EXECUTIVE_STATUS | CEL pack (trend CONDITIONAL + loaders reusados; **no** dump `plant_diagnosis` como respuesta) |
| keyword IGF/ARR/AR explícito | intent especializado gana (standalone) |

## 22. Greeting

**Elegido: minimal neutral + ancla de planta, sin lista fija.**

No queries caras. No prometer PRE_CLOSE/Steering/Plaud. Help on-demand puede citar **needs** («estado de la planta, preparación de junta, cierre de un mes»), no módulos internos. STALE list queda fuera de CEL.

## 23. Steering future integration

Punto de integración **único**: EvidenceDemand class `STEERING_RECORDED`.

Cuando exista `ARCH-DIRECTOR-IA-EXECUTIVE-STEERING-POST-CAPTURE-READ-001` / read model:

- `CAUSE_EXPLANATION` / «qué se comprometió» / «qué decidimos» / «qué se corrigió» entran por CEL (`FOLLOW_UP` o need de steering-read, no path paralelo).
- Tipos: PROPOSAL · DECISION · COMMITMENT · HUMAN_DECLARED_CAUSE · CORRECTION.
- `RECORDED` ≠ truth ≠ forecast ≠ target ≠ actual ≠ acción ≠ FINAL.

Hoy: `NOT_APPLICABLE` + mensaje de frontera («aún no leo compromisos de junta»). **No** implementar POST_CAPTURE_READ. Tarea preservada, no cancelada.

## 24. Plaud dependency

**PENDING_INTEGRATION** (no informal):

```
PLAUD_TRANSCRIPT
  → EXTRACTION_CANDIDATE
  → GOVERNED HUMAN FLOW
  → EXECUTIVE_STEERING_EVENT RECORDED
  → POST_CAPTURE_READ
  → CEL
```

Congelado: transcript ≠ RECORDED; Plaud/LLM/Director IA autónomo ≠ RECORD authority. No diseño físico Plaud aquí.

## 25. Council compatibility

Consejo futuro (no implementar): PRE_CLOSE baseline + Steering events + FINAL + outcomes. CEL será **interfaz** de esa composición, no el Council runtime. `COUNCIL_FINAL` = PENDING. live copilot = PENDING.

## 26. Test contract

Antes de declarar CEL «completa» (más allá del first slice), deben existir probes E2E — **no implementados ahora**:

Hola · ¿Cómo vamos? + UI plant · ¿Qué te preocupa? · ¿Cómo va Acapulco? · ¿Por qué? · ¿Qué harías? · ¿Y Puebla? · Compáralas · ¿Cómo vamos contra el compromiso? · ¿Vamos a cumplir? · ¿Cómo cerramos julio? · ¿Qué tengo que resolver hoy? · Prepárame para la junta · Prepárame para el pre-cierre.

First slice **debe** cubrir al menos: Hola (no STALE promise) · ¿Cómo vamos?+UI · ¿Cómo va Acapulco? (jerarquía ≠ materialidad-first) · no leak DICF→inacción · periodos etiquetados.

## 27. Capability Integration Ledger

Taxonomía `NO_ORPHAN_CAPABILITY`:

`IMPLEMENTED_AND_CONVERSATIONALLY_REACHABLE` · `IMPLEMENTED_BUT_PARTIALLY_REACHABLE` · `IMPLEMENTED_BUT_NOT_CONVERSATIONALLY_REACHABLE` · `SUPPORTED_ONLY_WITHIN_SPECIALIZED_MODE` · `PHYSICAL_INFRASTRUCTURE_ONLY` · `PENDING`

| CAPABILITY | PHYSICAL_STATUS | CONVERSATIONAL_STATUS | CURRENT_ENTRY | SUPPORTED_SCOPE | TRUTH_OWNER | AUTHZ_OWNER | MISSING_BRIDGE | PLANNED_INTEGRATION_POINT | ORPHAN_RISK |
|------------|-----------------|----------------------|---------------|-----------------|-------------|-------------|----------------|---------------------------|-------------|
| ARR | IMPLEMENTED | IMPLEMENTED_BUT_PARTIALLY_REACHABLE | `arr_status`; dump plant_diagnosis (proy); PRE_CLOSE/month_close actual | keyword / specialized | EKE + CAPACIDADES | plant JWT | CEL demand de situación | EXECUTIVE_STATUS pack | medio si solo keyword |
| IGF | IMPLEMENTED | IMPLEMENTED_BUT_PARTIALLY_REACHABLE | `igf_status`; dump FORECAST stored | keyword / specialized | EKE | plant + GA restrict | etiquetar FORECAST en CEL | EXECUTIVE_STATUS optional | medio |
| Action Register | IMPLEMENTED | IMPLEMENTED_AND_CONVERSATIONALLY_REACHABLE | `action_status` / overdue / packs | planta | CAPACIDADES | gate AR | — | EXECUTION slot | bajo |
| DICF | IMPLEMENTED | IMPLEMENTED_BUT_PARTIALLY_REACHABLE | client_analysis / coverage | planta + cliente_key | CAPACIDADES | plant | truth boundary inacción | DRIVERS | medio (F-TRUTH-001) |
| commercial_state | IMPLEMENTED | IMPLEMENTED_BUT_PARTIALLY_REACHABLE | listas + dump | cache mes | CAPACIDADES | plant / GA | no como SITUATION | DRIVERS | medio |
| commercial_trend | IMPLEMENTED | IMPLEMENTED_BUT_PARTIALLY_REACHABLE | «casa» / rango | CASA vs comisionista | CAPACIDADES | plant / GA-GV deny | **no entra a plant_diagnosis** | EXECUTIVE_STATUS CONDITIONAL | **alto** |
| bitácora | IMPLEMENTED | IMPLEMENTED_AND_CONVERSATIONALLY_REACHABLE | `bitacora_lookup` | ventana meses | CAPACIDADES | plant | no como causa | OPTIONAL | bajo |
| KPIs | IMPLEMENTED | IMPLEMENTED_BUT_PARTIALLY_REACHABLE | `dashboard_kpis` | folios/KPI | CAPACIDADES | plant | no en «cómo vamos» | OPTIONAL CLOSE/STATUS | medio |
| projects | IMPLEMENTED | IMPLEMENTED_BUT_PARTIALLY_REACHABLE | `project_status` | planta | CAPACIDADES | plant | igual | OPTIONAL | medio |
| mejora continua | IMPLEMENTED | IMPLEMENTED_BUT_PARTIALLY_REACHABLE | keyword MC | vista AR | CAPACIDADES | AR gate | no en estado general | OPTIONAL | medio |
| month_close_result | IMPLEMENTED | SUPPORTED_ONLY_WITHIN_SPECIALIZED_MODE | cierre / julio | un mes CDMX | CAPACIDADES | plant | need CLOSE_STATUS | CEL selecciona modo | bajo si C |
| ACTUAL_FINANCIAL | IMPLEMENTED (marker+read) | SUPPORTED_ONLY_WITHIN_SPECIALIZED_MODE | solo month_close + FINAL | contrato FA | FA-CONTRACT | DECISION FA AUTHZ | no en EXECUTIVE_STATUS | CLOSE_STATUS only | bajo (aislado deliberado) |
| PRE_CLOSE | IMPLEMENTED | SUPPORTED_ONLY_WITHIN_SPECIALIZED_MODE | pre-cierre / junta+resolver | portafolio/planta | CAPACIDADES + EKE | ZP/AD/GG | «resolver hoy» sin junta | PREPARATION | medio (F-NL-002) |
| EXECUTIVE_STEERING_CAPTURE | IMPLEMENTED store | PHYSICAL_INFRASTRUCTURE_ONLY | in-process create/read | RECORDED | STEERING-CONTRACT | DECISION Steering AUTHZ | **POST_CAPTURE_READ** | CEL STEERING_RECORDED | **alto si se olvida** |
| POST_CAPTURE_READ | PENDING | PENDING | ninguno | — | STEERING-CONTRACT | same | tarea ARCH-…-POST-CAPTURE-READ-001 | CEL same layer | **rastreado** |
| Plaud | NOT_IMPLEMENTED | PENDING (`PENDING_INTEGRATION`) | ninguno | — | STEERING-CONTRACT | no RECORD | extraction + human RECORD | ledger §24 | **rastreado** |
| Council | NOT_IMPLEMENTED | PENDING | ninguno | — | Constitución/EKE | future | COUNCIL_FINAL | CEL interface | **rastreado** |
| live copilot | NOT_IMPLEMENTED | PENDING | ninguno | — | — | no RECORD | — | out of first slice | **rastreado** |

`plant_diagnosis` actual: reachable solo con nombre de planta en texto; **no** es el composer CEL. Queda execution leftover hasta que CEL lo deje de usar como respuesta canónica.

## 28. No-Orphan Capability Gate

Gate futuro (no modifica M0–M20 hoy):

Una capability **no** puede llamarse conversacionalmente complete si no se conoce: cómo se accede; quién AUTHZ; qué needs la alcanzan; qué contrato de verdad; o por qué está **deliberadamente aislada** (p.ej. ACTUAL_FINANCIAL, Steering hasta POST_CAPTURE_READ).

Estados de aislamiento deliberado deben ser explícitos (`SUPPORTED_ONLY_WITHIN_SPECIALIZED_MODE` / `PHYSICAL_INFRASTRUCTURE_ONLY`), nunca olvido silencioso.

## 29. First implementation slice

| Alt | Veredicto |
|-----|-----------|
| A. routing natural only | **Rechazada.** «Cómo va Acapulco» seguiría dump. |
| B. need + UI anchor | **Rechazada.** Arregla routing, no composición. |
| C. B + executive composer plant status | **Elegida.** |
| D. C + conclusion state | Siguiente slice; no bloquea el first turn. |
| E. todo + Steering/Plaud | **Rechazada.** Salta capas. |

**Slice C** debe hacer materialmente mejores, de punta a punta:

- «¿Cómo vamos?» + UI plant
- «¿Cómo va Acapulco?»

Incluye: need `EXECUTIVE_STATUS`, ancla de planta, EvidenceDemand (trend CONDITIONAL), pack + jerarquía, language filter mínimo, DICF boundary, COMPARE_WITH_LABELS. No Steering read. No Plaud. No Council. No 05.

## 30. Contract/gate impact

**Antes de IMPL del slice C: `NO_NEW_GATE`.**

Demostración: CEL es **interface/composición del chat legado**, no capa N del pipeline. No produce ObservationRecords. No alimenta IES. No reabre `04`/`05`. No cambia Constitución. AUTHZ reusa decisiones de planta/FA/Steering. Contratos de dominio siguen dueños.

Patrón PRE_CLOSE: ARCH (este reporte) → IMPL → G2 inventario. **G2_SYNC** después del IMPL, no ahora. **CONTRACT_NEW / CONSTITUTION_REVIEW / IES_REVIEW / RE_REVIEW / AUTHZ_DECISION:** no para slice C.

Si un futuro slice congela taxonomía need como norma constitucional: entonces G3. No es este slice.

## 31. Matrix impact

Before/after: **10.5 / 20 = 52.5%**. Delta **0.0 pp**. Sin cambio.

## 32. Risks/limits

- Slice C no cubre «qué te preocupa» / «Y Puebla» / compromiso (slices D + need CLOSE/PREPARATION).
- `commercial_trend` CONDITIONAL puede fallar authz GA/GV: debe ser UNAVAILABLE visible.
- GPT puede seguir filtrando jerga si el pack no la oculta: el contrato de wording es parte del IMPL.
- No usar CEL para relajar fail-closed de planta o de AUTHZ.

## 33. Readiness

**READY_WITH_LIMITS** para IMPL del slice C. No READY total (Steering/Plaud/Council/RE/conclusion state fuera).

## 34. Exactly one NEXT_TASK

`IMPL-DIRECTOR-IA-CONVERSATIONAL-EXECUTIVE-STATUS-SLICE-001`

Implementar first slice C únicamente.

`ARCH-DIRECTOR-IA-EXECUTIVE-STEERING-POST-CAPTURE-READ-001` **preservada, no ejecutada, no cancelada.** No precede a CEL: el store ya existe; el puente se enchufa al EvidenceDemand `STEERING_RECORDED` cuando se autorice.

No autorizada. No ejecutada.
