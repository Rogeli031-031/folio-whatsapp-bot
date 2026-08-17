# Reporte — ARCH-REASONING-PHYSICAL-DECISIONS-002

```yaml
task_id: "ARCH-REASONING-PHYSICAL-DECISIONS-002"
outcome: "DONE"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/director-ia/05-REASONING-ENGINE.md"
  - "docs/dev-loop/reports/ARCH-REASONING-PHYSICAL-DECISIONS-002.md"
files_not_touched:
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md"
  - "docs/director-ia/02-EVIDENCE-BUILDER.md"
  - "docs/director-ia/03-EXECUTIVE-KNOWLEDGE-STORE.md"
  - "docs/director-ia/03A-OBSERVATION-PIPELINE.md"
  - "docs/director-ia/03B-END-TO-END-REFERENCE-FLOWS.md"
  - "docs/director-ia/04-IES-STANDARD.md"
  - "docs/director-ia/06-CHANNEL-PROJECTION.md"
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md"
  - "lib/"
  - "test/"
  - "fixtures/"
  - "server.js"
  - "package.json"
  - "sql/"
contracts_consulted:
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md"
  - "docs/director-ia/04-IES-STANDARD.md"
  - "docs/director-ia/05-REASONING-ENGINE.md"
  - "docs/director-ia/06-CHANNEL-PROJECTION.md"
  - "docs/dev-loop/reports/ARCH-REASONING-PHYSICAL-DECISIONS-001.md"
contracts_modified:
  - "docs/director-ia/05-REASONING-ENGINE.md"
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "Ninguna autorizada. Este reporte no es G5. No se crea IMPL-REASONING-001."
secrets_check: "none"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED. Este reporte no abre IMPL-REASONING-001."
  - "G8 permanece N/A. No se calibró materiality, k, wi, Fs, severity ni probability scoring."
```

## Ejecución

- Rama: `architecture/reasoning-physical-decisions-002` (≠ `main`; no se cambió de rama).
- Encabezado G1+G2 ya coincidía con la autorización humana; el implementador no reescribió `authorized_by`, `authorized_at` ni `human_authorization`.
- G1 intacto: `HUMAN_APPROVER` / `2026-08-17T11:28:14-06:00` / `AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-17`.
- G2: `AUTHORIZED` (humano); usado **solo** para `docs/director-ia/05-REASONING-ENGINE.md` dentro del alcance declarado.
- G3: `N/A`. G8: `N/A`.
- Transición: `AUTHORIZED` → `IN_PROGRESS` (solo `status`) → registro contractual + este reporte → `DONE_PENDING_REVIEW` (solo `status`).
- `max_attempts: 1`. Sin runtime RE. Sin adapter. Sin prompts. Sin tests/fixtures RE. Sin persistencia/SQL. Sin proveedor real. Sin commit, push, merge. Sin IMPL-REASONING-001.

No se encontró incompatibilidad que exigiera modificar Constitución, `04`, `06`, coverage, materiality o Channel Projection. Las decisiones se registraron **sin reinterpretarlas ni ampliarlas**.

---

## Decisiones registradas

Únicamente `proposed_human_decisions` / `human_approval_scope` de `CURRENT_TASK.md`.

Los IDs D1–D16 de esta tabla son los de `ARCH-REASONING-PHYSICAL-DECISIONS-002`. **No** sustituyen las decisiones semánticas D1–D10 de la cabecera de `05`.

| ID CURRENT_TASK | Token registrado | Dónde |
|-----------------|------------------|-------|
| D1_runtime_interface | REASONING_ENGINE_FACTORY_V1 | `05` §1, §2, §26 |
| D2_model_adapter | PROVIDER_NEUTRAL_MODEL_ADAPTER_V1 | `05` §19, §26 |
| D3_reasoning_result_envelope | STRUCTURED_REASONING_RESULT_V1 | `05` §3, §26 |
| D4_interpretation_shape | THREE_PART_INTERPRETATION_V1 | `05` §3.1, §26 |
| D5_post_model_validation | DETERMINISTIC_POST_VALIDATION_REQUIRED / REJECT_OR_ABSTAIN | `05` §3, §26 |
| D6_hypothesis_strength | MODEL_PROPOSES_VALIDATOR_BOUNDS_V1 | `05` §5, §26 |
| D7_rival_hypotheses | RIVAL_GROUP_WITHOUT_AUTORANK_V1 | `05` §6, §26 |
| D8_abstention | DETERMINISTIC_ABSTENTION_GATE_V1 | `05` §7, §26 |
| D9_recommendation | SUPPORTED_CONDITIONAL_RECOMMENDATION_V1 | `05` §12, §26 |
| D10_next_verification | EPISTEMIC_ACTION_ONLY_V1 | `05` §13, §26 |
| D11_decision_option | NON_EXECUTED_DECISION_OPTION_V1 | `05` §14, §26 |
| D12_clarification_request | IES_ANCHORED_CLARIFICATION_V1 | `05` §15, §26 |
| D13_reasoning_run | IN_MEMORY_REASONING_RUN_FIRST | `05` §18, §26 |
| D14_replay_auditability | AUDITABLE_NOT_BITWISE_REPLAY_V1 | `05` §18, §26 |
| D15_provider_failure | PROVIDER_FAILURE_FAIL_CLOSED_V1 | `05` §19, §26 |
| D16_first_runtime_scope | ABSTENTION_CAPABLE_PROVIDER_INJECTED_RUNTIME_V1 | `05` §19, §26 |

---

## Diff contractual exacto

### `05-REASONING-ENGINE.md` (schema semántico v1.0 intacto)

- Cabecera/estado: realización física D1–D16 registrada. Versión documental **1.0** conservada.
- Tabla semántica D1–D10 **intacta**; nota de que §26 no la sustituye.
- Índice: §26.
- §1: interfaz futura `createReasoningEngine({ modelAdapter, clock, idFactory, policy })` / `reason(ies, session)`. No es runtime.
- §2: campos físicos de `session`; default `es-MX`; sesión no epistemológica.
- §3: `STRUCTURED_REASONING_RESULT_V1` (arrays siempre presentes; `references` solo IDs IES; sin probability/confidence/materiality N5 inventados); `DETERMINISTIC_POST_VALIDATION_REQUIRED`.
- §3.1: `THREE_PART_INTERPRETATION_V1` (`what_is_known` / `what_can_be_inferred` / `what_cannot_be_concluded`).
- §5: `MODEL_PROPOSES_VALIDATOR_BOUNDS_V1` + hard bounds. Techos cualitativos del §5 **permanecen** (máximo `WEAK` o abstención si el conflicto tensiona el claim).
- §6: `RIVAL_GROUP_WITHOUT_AUTORANK_V1`.
- §7: `DETERMINISTIC_ABSTENTION_GATE_V1`.
- §12–§15: campos mínimos físicos D9–D12; separación Recommendation / Next Verification / Decision Option / Clarification conservada.
- §18: `IN_MEMORY_REASONING_RUN_FIRST` + `AUDITABLE_NOT_BITWISE_REPLAY_V1`. Persistencia durable diferida.
- §19: adapter provider-neutral; fail-closed de proveedor; primer runtime con adapter fake / sin networking.
- §22: invariantes 26–29 (post-validación; fail-closed evidence; provider failure; no autoranking).
- §24: persistencia Run y proveedor real diferidos; `evidence[]` vacío como fail-closed, no como permiso de fabricar evidencia. Riesgo 4 deja de afirmar «runtime IES inexistente» (la proyección OFFICIAL in-memory existe fuera de este documento); **no** se modificó `04`.
- §25: runtime sigue PENDIENTE; no autoriza IMPL-REASONING-001.
- §26 **nuevo:** tabla D1–D16 + tokens + restricción `evidence[]` + límites.

---

## Comprobación de compatibilidad constitucional

| Norma superior | ¿Compatible? | Nota |
|----------------|--------------|------|
| Constitución III (cinco niveles; LLM solo en N5) | SÍ | Factory/adapter no crean Nivel 6 |
| Constitución V (LLM subordinado al IES; Tipo E; recomendaciones trazables) | SÍ | Post-validación + fail-closed |
| Constitución VIII (hipótesis declara evidencias) | SÍ | Sin `supporting_evidence_ids` → no hipótesis / no recommendation sustantiva |
| Constitución IX (IES inmutable para el LLM) | SÍ | Adapter no muta IES |
| EKE (RE fuera del Motor; no crea N1–N4) | SÍ | |
| `04` §15/§18 (gate lifecycle; entrada IES) | SÍ | D8 copia consumibles/no consumibles |
| `05` semántico D1–D10 | SÍ | No sustituidos |
| `05` §5 techo máximo WEAK por conflicto que tensiona el claim | SÍ | D6 solo dice «impide STRONG»; el techo más estricto del §5 permanece; D6 no lo relaja |
| `05` §12 diagnosis **o** evidence | SÍ | D9 añade fail-closed físico: sin evidence suficiente no hay recommendation **sustantiva**. No fabrica evidencia. `supporting_diagnosis_ids` conceptual de §12 no se deroga |
| `06` Channel Projection | SÍ | No diseñado ni modificado |
| Independencia de proveedor | SÍ | Ningún proveedor como norma |

Ortografía: en D12, `CURRENT_TASK` escribió «alcanze»; se registró «alcance». No es cambio semántico.

---

## Confirmaciones de no-cambio

| Superficie | ¿Cambió? |
|------------|----------|
| Constitución / EKE / `02` / `03` / `03A` / `04` / `06` / índice | NO |
| Cinco niveles / N1–N4 | NO |
| Schema IES v1.0 | NO |
| Coverage / `COV_*` | NO |
| Taxonomía `CONF_TYPE_*` | NO |
| Materiality / `MAT_*` / `k` / `wi` / `Fs` | NO |
| IES Builder / OP / EB / EKS | NO |
| `server.js` / `package.json` | NO |
| Runtime RE / adapter / prompts / tests / fixtures | NO |
| Persistencia Run / SQL | NO |
| Proveedor LLM real | NO |

Provider-neutral: confirmado (`PROVIDER_NEUTRAL_MODEL_ADAPTER_V1`).  
Post-validation: obligatoria (`DETERMINISTIC_POST_VALIDATION_REQUIRED` + `REJECT_OR_ABSTAIN`).  
Abstention gates: `DETERMINISTIC_ABSTENTION_GATE_V1`.  
`hypothesis_strength`: enum + hard bounds; sin scores/probabilidades.  
Reasoning Run: in-memory first; persistencia diferida.  
Auditabilidad: sin promesa de replay bitwise.

---

## Gaps aún diferidos

1. Runtime RE (esta tarea no lo implementa).  
2. Persistencia durable de Reasoning Run.  
3. Proveedor LLM real / networking / API keys.  
4. Evidencias N3 productivas (`evidence[]` vacío en EB vigente).  
5. Persistencia IES / `ALTERNATIVE`.  
6. Channel Projection runtime.  
7. Calibración cualitativa futura de «tensión material del claim» — no G8; no fórmula.  
8. Memoria conversacional vs Run.

---

## GO/NO-GO para IMPL-REASONING-001

**GO físico** respecto de los blockers de `ARCH-REASONING-PHYSICAL-DECISIONS-001` (interfaz, adapter, envelope, post-validación, `hypothesis_strength`), **condicionado** a:

1. G5 humano sobre esta tarea (este reporte **no** autoriza IMPL-REASONING-001).  
2. Fail-closed: mientras `evidence[]` no contenga soporte autorizado, **cero** hipótesis sustantivas y **cero** recommendations sustantivas.  
3. Primer IMPL: adapter fake, sin networking, sin API keys, gates/validación/abstención demostrables.  
4. Sin persistencia Run, sin Channel Projection, sin G8, sin proveedor real.

`05` §26 y §25 declaran explícitamente que **esta sección no autoriza IMPL-REASONING-001**.

---

## STOP

ARCH-REASONING-PHYSICAL-DECISIONS-002 cerrado. Espera revisión humana. Este reporte no autoriza otra tarea.
