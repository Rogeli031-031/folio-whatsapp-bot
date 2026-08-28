# IMPL-DIRECTOR-IA-CONVERSATIONAL-EXECUTIVE-STATUS-SLICE-001

```yaml
task_id: "IMPL-DIRECTOR-IA-CONVERSATIONAL-EXECUTIVE-STATUS-SLICE-001"
outcome: "DONE_PENDING_REVIEW"
mode: "IMPLEMENTATION"
first_slice: "C_semantic_need_ui_anchor_plus_executive_composer_plant_status"
semantic_need: "B_need_layer_over_existing_planner"
composer: "B_deterministic_pack_plus_gpt_wording"
specialized_modes: "C_semantic_need_selects_or_composes_modes"
gates: "NO_NEW_GATE"
implementation: true
code_changes: true
test_changes: true
sql_changes: false
docs_director_ia_changes: false
g2_created: false
constitution_touched: false
ies_04_touched: false
re_05_touched: false
steering_contract_touched: false
phrase_patch: false
manual_chat_validation: "PENDING"
steering_chat: "PENDING"
post_capture_read: "PENDING"
plaud: "PENDING_INTEGRATION"
council: "PENDING"
live_copilot: "PENDING"
focal_tests: "29/29"
director_ia_suite: "1130/0/0"
git_diff_check: "clean"
next_task_proposed: "AUDIT-DIRECTOR-IA-CONVERSATIONAL-EXECUTIVE-STATUS-SLICE-001"
next_task_authorized: false
next_task_executed: false
global_before: "10.5 / 20 = 52.5%"
global_after: "10.5 / 20 = 52.5%"
gain_pp: 0.0
secrets_check: "none"
```

## 1. Executive result

**DONE_PENDING_REVIEW.**

First slice C implementado: capa de necesidad semántica + ancla de planta UI + composer ejecutivo de estado de planta.

«¿Cómo vamos?» con UI Acapulco ya no es `unknown`. «¿Cómo va Acapulco?» ya no es SOURCE_DUMP_WITH_PROMPT. La causa es `resolveExecutiveNeed` → `EXECUTIVE_STATUS`, no un `if` de frase.

`MANUAL_CHAT_VALIDATION = PENDING`. La suite verde no aprueba UX.

## 2. ARCH conformance

| Decisión ARCH | IMPL |
|---------------|------|
| Need B sobre planner | `lib/director-ia-conversational-executive-layer.js` resuelve need antes del unknown/dump |
| Planner/tools execution | loaders `plant_diagnosis` + `commercial_trend` reusados |
| UI plant anchor | scope underspecified = planta autenticada |
| Periodo/módulo UI no ancla | no usados |
| Composer B | pack determinístico + contrato + wording GPT |
| COMPARE_WITH_LABELS | default; no fusión |
| CASA PARTIAL; Portátil/Carburación NOT_AVAILABLE | registry en pack |
| Specialized C | IGF/ARR/PRE_CLOSE/month_close/trend-casa ganan standalone |
| NO_NEW_GATE | sin G2, sin contrato nuevo |
| First slice C only | RISK_FOCUS/CAUSE/RECO/COMPARISON detectados, no implementados |

## 3. Files changed

Tocados en este IMPL:

- `lib/director-ia-conversational-executive-layer.js` (nuevo)
- `lib/director-ia-chat.js` (saludo + intercept CEL)
- `test/director-ia-conversational-executive-status.test.js` (nuevo)
- `test/director-ia-plant-diagnosis.test.js` (wiring chat: dump → pack CEL)
- `docs/dev-loop/CURRENT_TASK.md` (solo `status`)
- `docs/dev-loop/reports/IMPL-DIRECTOR-IA-CONVERSATIONAL-EXECUTIVE-STATUS-SLICE-001.md` (este)

No tocados: Constitution, `04`, `05`, `EXECUTIVE-STEERING-CAPTURE-CONTRACT`, Index, EKE, CAPACIDADES, planner, conversation-state, SQL.

Working tree previo (PRE_CLOSE / Steering / docs canónicos ya sucios) **preservado**.

## 4. Semantic need implementation

Taxonomía ARCH (8) existe como constantes. Este slice implementa solo `EXECUTIVE_STATUS`.

Resolución por cues de progreso/situación + exclusión de temas especializados/AR. Puntuación y acentos se normalizan (`¿Cómo vamos?` = misma need que `cómo andamos`).

No mega-intent. No LLM-only. No `if text === "como vamos"`.

## 5. UI plant anchor

`resolveSemanticScope`: si el utterance no nombra otra planta resoluble, `scope_source = ui_plant_anchor`.

Authz de la planta UI se comprueba; ancla ≠ permiso nuevo.

## 6. Explicit plant override

Con catálogo: «¿Cómo va Puebla?» + UI Acapulco → Puebla (id del catálogo) + AUTHZ.

Sin catálogo (tests de continuidad legado): no se inventa un id; se conserva la planta del request para no romper inherit.

Nombre genérico «la planta» no es override.

## 7. Technical planner relationship

Planner sigue detectando `plant_diagnosis` / `unknown` / modos especializados.

CEL intercepta solo si need = `EXECUTIVE_STATUS` **y** intent técnico es `unknown` o `plant_diagnosis`.

Follow-ups de entidad (`¿Y Arturo?`) no entran a CEL.

Keyword IGF/ARR, PRE_CLOSE, month_close, `commercial_trend` (casa/rango) no se interceptan.

## 8. Evidence requirements

Demand `EXECUTIVE_STATUS`:

| Clase | Availability |
|-------|----------------|
| situación comercial | REQUIRED si loader |
| trend | CONDITIONAL → REQUIRED si reachable; si no OPTIONAL/UNAVAILABLE/NOT_AUTHORIZED |
| ARR proy / IGF stored | OPTIONAL, etiquetados FORECAST |
| CS drivers / AR / DICF | OPTIONAL |
| ACTUAL_FINANCIAL | NOT_APPLICABLE |
| Steering RECORDED | NOT_APPLICABLE |
| Plaud / Council / live | NOT_APPLICABLE |

Missing ≠ 0. Missing ≠ forecast.

## 9. Executive status evidence pack

Pack tipado: source, scope, period/as-of, truth semantics, availability, provenance, slot.

Orden de respuesta = jerarquía condicional, no orden de loaders.

`plant_diagnosis` queda leftover de execution; la respuesta canónica de estado es el pack CEL.

## 10. commercial trend integration

Se pide al loader existente con semántica actual (CASA vs comisionista, 30d default, compare).

No se exige «casa» en el utterance. No se amplía el motor.

Si AUTHZ/loader falla: UNAVAILABLE o NOT_AUTHORIZED; el estado ejecutivo no aborta.

## 11. Channel availability

Registry congelado: CASA PARTIAL; PORTÁTIL NOT_AVAILABLE independiente; CARBURACIÓN NOT_AVAILABLE independiente.

Prompt prohíbe inventar separación.

## 12. Period composition

Antes del wording: `evaluatePeriodComposition`. Varios YYYY-MM/ventanas → `COMPARE_WITH_LABELS` + nota natural.

No fusión junio/julio/agosto. ARR proyección ≠ IGF stored ≠ cache CS.

## 13. DICF truth boundary

Pack: `NO_DICF_ACTION` ≠ `NO_MEASURES_TAKEN`.

Permitido en contrato: «No encontré una acción DICF asociada.»

Guard de salida reemplaza «No se han tomado medidas.» si no hay evidencia multi-fuente de medidas.

## 14. Client materiality semantics

Slot DRIVERS. Texto natural: cache «dejaron»/«disminuyeron» por kg observados del periodo de esa categoría. No son lost clients ni causas.

No abre la respuesta por default.

## 15. Executive composer

`buildExecutiveStatusPrompt`: pack + jerarquía + omisión de slots vacíos.

GPT redacta una vez. No IES. No N5.

Títulos internos no son UX.

## 16. User-facing language

Gobernanza interna (availability codes, truth classes) queda en el pack.

Guard quita jerga (`period mismatch`, `null no es cero`, `SOURCE_RESTRICTED`) de la prosa.

Periodos se explican en calendario/lenguaje natural.

## 17. Greeting

STALE list (AR/DICF/bitácoras) eliminada.

`buildNeutralGreeting`: «Hola. Estoy en {planta}. ¿Qué quieres revisar?»

Sin queries caras. Sin prometer Steering/Plaud/PRE_CLOSE.

## 18. Conversation-state impact

Mínimo: `parent_intent` / bundle siguen `plant_diagnosis` para inherit legado.

No se persiste raw pack. Evidence requery.

Need posteriores (por qué / preocupa / Puebla comparada) no se cierran; el diseño no las bloquea.

## 19. AUTHZ behavior

Ancla no concede acceso. `assertOperationalPlantAccess` sobre la planta resuelta.

GA con planta 1 pidiendo Puebla → 403 / SOURCE_RESTRICTED. Sin leak.

## 20. Specialized-mode regression

Preservados por exclusion + tests: PRE_CLOSE, month_close_result, IGF, ARR, commercial_state, Action Register, DICF, ACTUAL_FINANCIAL (solo month_close), KPIs/proyectos/MC no cargados por default en el pack.

## 21. No-Orphan preservation

`CAPABILITY_INTEGRATION_LEDGER` exportado con: commercial_trend, ACTUAL_FINANCIAL, PRE_CLOSE, Steering Capture, POST_CAPTURE_READ, Plaud, Council, live copilot.

Ningún bridge extra implementado. Ninguno borrado.

## 22. Steering boundary

Physical store intacto. Chat read/capture **PENDING**. Pregunta de junta → frontera honesta, sin leer el store.

## 23. Plaud boundary/path

`PENDING_INTEGRATION`. Path preservado en ledger:

transcript → candidate → governed human record → Steering → POST_CAPTURE_READ → CEL

Transcript ≠ RECORDED.

## 24. Council/live boundary

Council PENDING. Live PENDING. No declarados soportados.

## 25. Tests

`test/director-ia-conversational-executive-status.test.js`: **29 pass / 0 fail / 0 skipped**.

Cubre los 16 casos obligatorios + no phrase-patch + ledger.

Wiring `plant_diagnosis` actualizado al composer CEL (una llamada OpenAI, sin «señala primero»).

## 26. Full regression

`node --test test/director-ia-*.js`

| Área | pass | fail | skipped |
|------|------|------|---------|
| CEL / Executive Status | 29 | 0 | 0 |
| plant_diagnosis | pass (en suite) | 0 | 0 |
| planner / chat / conversation-state | pass | 0 | 0 |
| commercial_trend | pass | 0 | 0 |
| ARR / IGF | pass | 0 | 0 |
| Action Register / DICF | pass | 0 | 0 |
| month_close_result | pass | 0 | 0 |
| ACTUAL_FINANCIAL | pass | 0 | 0 |
| PRE_CLOSE | pass | 0 | 0 |
| Steering Capture | pass | 0 | 0 |
| **Director IA full suite** | **1130** | **0** | **0** |

## 27. Known limits

- RISK_FOCUS / CAUSE / RECOMMENDATION / COMPARISON / «Y Puebla» como switch: no implementados (slices posteriores).
- Trend CONDITIONAL puede ser UNAVAILABLE (GA/GV).
- Override explícito requiere catálogo inyectado o `public.plantas`.
- GPT wording sigue pudiendo filtrar mal si ignora el pack; el guard cubre DICF/jerga mínima.
- `buildPlantDiagnosisPrompt` leftover conserva «señala primero» para callers unitarios no-CEL.

## 28. MANUAL_CHAT_VALIDATION

**PENDING.**

Primera prueba humana posterior:

UI = Acapulco

«¿Cómo vamos?»

Los tests automáticos no constituyen aceptación UX.

## 29. Matrix impact

Before: **10.5 / 20 = 52.5%**  
After: **10.5 / 20 = 52.5%**  
Delta: **0.0 pp**

Sin promoción de filas.

## 30. Exactly one NEXT_TASK

`AUDIT-DIRECTOR-IA-CONVERSATIONAL-EXECUTIVE-STATUS-SLICE-001`

No autorizada. No ejecutada.

`ARCH-DIRECTOR-IA-EXECUTIVE-STEERING-POST-CAPTURE-READ-001` permanece preservada, no ejecutada, no cancelada.
