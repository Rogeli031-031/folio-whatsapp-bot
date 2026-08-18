# Reporte — ARCH-DIRECTOR-IA-POST-N4-READINESS-001

```yaml
task_id: "ARCH-DIRECTOR-IA-POST-N4-READINESS-001"
outcome: "DONE"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-POST-N4-READINESS-001.md"
files_not_touched:
  - "docs/director-ia/"
  - "lib/"
  - "test/"
  - "fixtures/"
  - "server.js"
  - "package.json"
  - ".env"
  - "sql/"
  - "AGENTS.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
contracts_consulted:
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md"
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md"
  - "docs/director-ia/02-EVIDENCE-BUILDER.md"
  - "docs/director-ia/03A-OBSERVATION-PIPELINE.md"
  - "docs/director-ia/03-EXECUTIVE-KNOWLEDGE-STORE.md"
  - "docs/director-ia/03B-END-TO-END-REFERENCE-FLOWS.md"
  - "docs/director-ia/04-IES-STANDARD.md"
  - "docs/director-ia/05-REASONING-ENGINE.md"
  - "docs/director-ia/06-CHANNEL-PROJECTION.md"
  - "docs/director-ia/DIRECTOR_IA_V2_FASE_1_VERACIDAD.md"
  - "docs/director-ia/DIRECTOR_IA_V2_FASE_2_PLANNER.md"
  - "docs/director-ia/DIRECTOR_IA_V2_FASE_3_TOOL_ORCHESTRATOR.md"
  - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"
contracts_modified: []
ambiguities_or_contradictions:
  - >
    El índice (DIRECTOR_IA_ARCHITECTURE_INDEX.md) y cabeceras de 03A/04/05/06
    siguen diciendo «runtime pendiente» para OP/EB/EKS/IES/RE/CP, mientras el
    repositorio ya contiene esos runtimes y tests. No es contradicción de
    semántica N1–N5; es desfase documental. No se usó G2 para corregirlo
    (fuera de alcance).
deviations_from_current_task: []
next_task_proposed: "ARCH-DIRECTOR-IA-REAL-INPUT-INTEGRATION-001 (propuesta; no autorizada; este reporte no es G5)"
secrets_check: "none"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED."
  - "G2/G3/G8 permanecen PENDING_IF_REQUIRED; no se usaron."
  - "Autorizar o rechazar el NEXT_TASK propuesto. Esta tarea no lo abre."
```

## Ejecución

- Rama: `architecture/director-ia-post-n4-readiness-001` (≠ `main`; no se cambió de rama).
- G1 intacto: `HUMAN_APPROVER` / `2026-08-17T22:27:00-06:00` / `AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-17`.
- G2/G3/G8: `PENDING_IF_REQUIRED`. **No usados.** Sin modificación de contratos, runtime, tests, fixtures, `server.js` ni `package.json`.
- Transición: `AUTHORIZED` → `IN_PROGRESS` (solo `status`) → este reporte → `DONE_PENDING_REVIEW` (solo `status`).
- `max_attempts: 1`. Sin commit, push, merge. Sin implementación del NEXT_TASK. Sin encadenamiento.

Esta es una **auditoría**. No congela arquitectura nueva. No implementa.

---

## Executive verdict

El pipeline constitucional **OP → EB (N1–N4) → EKS → IES → RE → CP** existe como runtime in-memory, con factories exportadas, tests y fixtures sintéticos. Tras IMPL N3 e IMPL N4, la franja cognitiva **ejecutable hoy** es: ObservationRecord → Fact N2 → Evidence CONTRADICTION no causal → Diagnosis `UNRESOLVED_CONFLICT` no causal, más conflicto compuesto **solo Tipo A OPEN**.

Ese pipeline **no está conectado** a WhatsApp, al chat legado, a `server.js` como producto, ni a un runtime de Tool Execution que emita `MINIMAL_EXECUTION_ENVELOPE`. Las tools con `executor` de Fases 1–3 alimentan `lib/director-ia-chat.js` (LLM / narrativa), no N1–N5. `AGENTS.md` prohíbe tratar ese chat como pipeline constitucional.

El cuello de botella de **capacidad real** no es G8, ni causalidad, ni el clasificador B/C/D/E. Es la **ausencia de entrada productiva 03A** y de un cableado de producto. G8/causal/B–E añaden semántica especulativa sobre datos que todavía no entran al Bundle.

Los dos hallazgos post-N4 **no son blockers**: IES clona Diagnosis (deuda de proyección `04` §8); E2E `type-e-conflict` ahora puede emitir Diagnosis N4 junto a Tipo A (comportamiento esperado del criterio N4 aprobado).

**NEXT_TASK recomendado (uno):** `ARCH-DIRECTOR-IA-REAL-INPUT-INTEGRATION-001`.

---

## Physical pipeline map

```
[Question / canal productivo]
        │
        ├─ Chat legado / WhatsApp Twilio  ──► lib/director-ia-chat.js + tools Fase 1–3
        │     (PRODUCTIVE como bot; NO es N1–N5)
        │
        └─ MINIMAL_EXECUTION_ENVELOPE     ──► AUSENTE en producto
                                              (solo fixtures 03A / E2E / OP-EB-EKS)
                    ↓
         OP  createObservationPipeline().process
              lib/director-ia-observation-pipeline.js
                    ↓  acquisition_statuses[] + observation_records[]
         EB  createEvidenceBuilder().assemble
              to_n1 → to_n2 → to_n3 → tipifyConflicts → to_n4 → emit_bundle
              lib/director-ia-evidence-builder.js
                    ↓  Knowledge Bundle
         EKS validate_structure + append_snapshot
              lib/director-ia-eks.js
              memoria (tests) | pg (createEksRuntime; server start; sin append constitucional)
                    ↓  Knowledge Snapshot
         IES createIesBuilder().build
              lib/director-ia-ies-builder.js
                    ↓  IES OFFICIAL
         RE  createReasoningEngine().reason(ies, session)
              lib/director-ia-reasoning-engine.js  (modelAdapter inyectado; tests = fake)
                    ↓  Reasoning Result / Run
         CP  createChannelProjection().project
              lib/director-ia-channel-projection.js
                    ↓  Projection Model + Channel Output Envelope
         E2E createDirectorIaE2e().run
              lib/director-ia-e2e.js  (orquestador in-memory; no es capa semántica)
```

Encadenadores de prueba (no producto):

- `lib/director-ia-op-eb-eks-integration.js` → `run_op_eb_eks` (OP→EB→EKS; comentario: solo tests/fixtures).
- `lib/director-ia-e2e.js` → OP→EB→EKS→IES→RE→CP.

`server.js` arranca `createEksRuntime` (líneas ~188–192) y expone chat/dashboard/WhatsApp legado. **No** llama `createObservationPipeline`, `assemble`, `createIesBuilder`, `createReasoningEngine`, `createChannelProjection` ni `createDirectorIaE2e`.

---

## Stage-by-stage readiness matrix

Escala usada (de la tarea): `PRODUCTIVE` | `STRUCTURALLY_READY` | `SYNTHETIC_ONLY` | `PARTIAL` | `BLOCKED` | `NOT_PRESENT`.

| Etapa | Readiness | Sustento físico |
|-------|-----------|-----------------|
| Question / Capabilities / Planner / Tool Plan (Fases 1–3) | **PARTIAL** | Runtimes: `lib/director-ia-capabilities.js`, `planner.js`, `tools.js`, `tool-orchestrator.js`. Chat los usa. Índice §3: **no** implementan Constitución/EKE/EB. Tool Orchestrator **no ejecuta** tools (`buildDirectorIaToolPlan`). |
| Tool Execution Results → `MINIMAL_EXECUTION_ENVELOPE` | **NOT_PRESENT** (camino constitucional) | Contrato `03A` D2/D15: OP recibe envelopes ya formados; Tool Execution productivo diferido. Fixtures sí: `fixtures/director-ia/observation-pipeline/*`, `e2e/*.json`, `op-eb-eks-integration/*`. Ningún módulo forma ese envelope desde executors reales. |
| OP (N1 transport) | **STRUCTURALLY_READY** | Export `createObservationPipeline`. Tests `test/director-ia-observation-pipeline.test.js`. Clock default `"unclocked"`. No LLM/DB/red. Cabecera `03A` aún dice implementación PENDIENTE (desfase documental). |
| EB N1 / N2 | **STRUCTURALLY_READY** | `to_n1`, `to_n2`, `assemble`. Tests EB + OP-EB-EKS. Facts con `MATERIALITY_NOT_ASSESSED` y confianza dimensional null (sin G8). |
| EB N3 CONTRADICTION | **STRUCTURALLY_READY** | `RULE_REGISTRY.evidence_rules` = 1 ACTIVE (`N3_CONTRADICTION_SAME_SCOPE_DISTINCT_VALUE` 1.0). Fixtures `fixtures/director-ia/evidence-n3/` (7). Tests en `test/director-ia-evidence-builder.test.js`. |
| EB N4 UNRESOLVED_CONFLICT | **STRUCTURALLY_READY** | `RULE_REGISTRY.diagnostic_rules` = 1 ACTIVE (`N4_UNRESOLVED_CONFLICT_FROM_N3_CONTRADICTION` 1.0). `to_n4` + cableado en `assemble`. Fixtures `fixtures/director-ia/evidence-n4/` (7). Schema `DIAGNOSIS_N4_PHYSICAL_V1`. Placeholders `*_NOT_ASSESSED`. |
| Clasificador conflictos A–E | **PARTIAL** | `tipifyConflicts` solo Tipo A OPEN. Tipo E no se fabrica. Overlay E2E `tipo_e_bundle_overlay.not_from_assemble`. B/C/D **NOT_PRESENT** como clasificador. |
| EKS validate_structure | **STRUCTURALLY_READY** | Exige listas incl. `diagnoses[]` (array; no valida schema N4). Tests `test/director-ia-eks.test.js`. |
| EKS persistencia memoria | **SYNTHETIC_ONLY** | `createEks()` sin pool. Tests y E2E harness (`createEks()` en `test/director-ia-e2e.test.js`). |
| EKS persistencia pg | **PARTIAL** | `sql/015_director_ia_eks.sql` (schema `eks.snapshots` append-only). `createEksRuntime` en `server.js`. Flag `ENABLE_DIRECTOR_IA` + `DATABASE_URL`. Tests `test/director-ia-eks-integration.test.js` (deshabilitado sin flag/URL). **Ningún** append constitucional desde producto. |
| IES | **STRUCTURALLY_READY** con hueco de proyección N4 | `createIesBuilder`. `projectDiagnoses` = `cloneJson`. `validate()` no exige `04` §8 (`primary_classification`, `model`, `coverage_*`, `applied_rule_id`, `validity`). Tests IES + EB downstream N4 verdes. |
| RE (N5) | **SYNTHETIC_ONLY** en producto; **STRUCTURALLY_READY** en gates | `createReasoningEngine` + `modelAdapter.infer` inyectado. Tests: `fakeAdapter`. Session = `{ analysis_mode, canonical_reasoning_language, channel_hint, maximum_semantic_depth }`; E2E usa `session: {}`. Hypotheses exigen evidence; N4 no bypasea. |
| CP | **STRUCTURALLY_READY** | `createChannelProjection`, policies CHAT/VOICE/WHATSAPP/DASHBOARD/REPORT/PRESENTATION. `semantic_type` DIAGNOSIS. Fixture `fixtures/director-ia/channel-projection/whatsapp-type-e.json` = policy, no Twilio. |
| E2E orquestador | **SYNTHETIC_ONLY** | `createDirectorIaE2e`. Fixtures `fixtures/director-ia/e2e/` (6). Harness in-memory + adapter fake. |
| WhatsApp / canal físico | **NOT_PRESENT** para N1–N5; **PRODUCTIVE** para bot legado | `server.js` `/twilio/whatsapp` → comandos/DirectorIA link/narrativa chat. CP `renderWhatsapp` no está cableado a Twilio. |
| Continuidad conversacional constitucional | **NOT_PRESENT** | No hay almacén de IES/Run por sesión de usuario en el pipeline N1–N5. RE no carga historial. |
| Observabilidad constitucional | **PARTIAL** | `console.warn` EKS si falta `DATABASE_URL`. Sin métricas/traces de Bundle/IES/RE. Chat tiene `DIRECTOR_IA_DEBUG`. |
| Fallos / fail-closed de capas | **STRUCTURALLY_READY** | OP/EB/EKS/IES/RE/CP rechazan estructuralmente; RE timeout/error → abstention. Sin runbook operacional N1–N5. |
| Configuración operacional N1–N5 | **PARTIAL** | `ENABLE_DIRECTOR_IA`, `DATABASE_URL`, `EKS_POOL_MAX`. No hay config de adapter N5 productivo ni de envelope 03A. |

---

## What is genuinely productive today

1. **Bot WhatsApp / dashboard Director IA legado** (`server.js`, `lib/director-ia-chat.js`): preguntas, tools con executor (ARR/IGF on_demand, Action Register, bitácora, entidades comerciales, etc.), LLM. **No** produce Knowledge Bundle ni IES constitucional.
2. **Algoritmos N2/N3/N4 deterministas** sobre fixtures: contradicción de values comparables → Evidence CONTRADICTION + Tipo A OPEN + Diagnosis `UNRESOLVED_CONFLICT` cuando el criterio N4 coincide.
3. **Infra EKS pg** (schema + runtime dedicado) puede persistir Snapshots **si** algo llama `append_snapshot`; el producto constitucional no lo llama.
4. **Fail-closed** de cobertura `NO_CONOZCO`, `SOURCE_NOT_INTEGRATED`, `TOOL_ERROR`, `ACQUIRED_EMPTY ≠ ABSENCE_CONFIRMED`, sin resolución por peso, sin Tipo E fabricado por assemble.

Nada de lo anterior equivale a un Director IA constitucional sirviendo a un usuario por WhatsApp o dashboard.

---

## What remains synthetic or structural only

- Todos los fixtures Director IA declaran `figures: ILUSTRATIVAS / FICTICIAS` y `not_institutional_coverage: true`.
- E2E/RE usan `fakeAdapter` (`test/director-ia-e2e.test.js`).
- EKS de tests es memoria (`createEks()`).
- `produced_at` / clocks inyectados (`"unclocked"`, timestamps fijos de test).
- Overlay Tipo E en E2E: `not_from_assemble: true`.
- Evidence N5 de `synthetic-reasoning-with-evidence.json`: overlay post-assemble; el happy path real sin evidence produce **cero** hypotheses.
- Índice y cabeceras contractuales aún etiquetan runtimes como PENDIENTE (deuda documental, no bloqueo semántico).

---

## N4 downstream gap reassessment

### 1) IES: manejo/preservación de campos Diagnosis

**Clasificación: DEBT + FOLLOW_UP_CANDIDATE. No BLOCKER. No es solo EXPECTED_BEHAVIOR puro.**

Hechos:

- `projectDiagnoses` en `lib/director-ia-ies-builder.js` (líneas 316–318) clona JSON. No proyecta `04` §8: `primary_classification`, `model`, `applied_rule_id`, `validity`, `coverage_token`, `coverage_state`, `related_conflict_ids`.
- Bundle N4 usa `diagnostic_category`, `applied_rule.{rule_id,rule_version}`, `supporting_conflict_ids`, placeholders `*_NOT_ASSESSED`.
- `02` §21 D6: `DIAGNOSIS_N4_PHYSICAL_V1` **no redefine** `04` §8.
- `validateIes` comprueba dangling `supporting_fact_ids` / `supporting_evidence_ids`; **no** `supporting_conflict_ids`; **no** campos `04` obligatorios.
- Tests EB downstream: IES `validate().ok === true` con Diagnosis N4 clonada (`test/director-ia-evidence-builder.test.js`).

Interpretación: la preservación por clonación es el comportamiento físico **actual y verde**. El dual-schema (`02` Bundle vs `04` producto) es deuda de proyección, no un fallo de N4 ni un requisito G8. Corregirlo exige decisión humana (G2 sobre IES/`04`, no «arreglar» N4).

### 2) E2E `type-e-conflict` coexistiendo con Diagnosis N4

**Clasificación: EXPECTED_BEHAVIOR. FOLLOW_UP_CANDIDATE menor (cobertura de aserción). No BLOCKER. No DEBT de runtime.**

Hechos:

- Fixture `fixtures/director-ia/e2e/type-e-conflict.json`: dos `ACQUIRED_OK` con `venta_t` 95 vs 120, misma entidad/periodo → assemble emite N3 + Tipo A + N4 (criterio D5/D17).
- Test (`test/director-ia-e2e.test.js` ~359–373): afirma `CONF_TYPE_A_DATA`, `OPEN`, **no** `CONF_TYPE_E_GOVERNANCE`. No afirma `diagnoses.length === 0`.
- Tipo E solo vía overlay `emit_bundle` con `n4: []` y `not_from_assemble: true` (~375–424). N4 no fabrica E.

Interpretación: coexistir Diagnosis N4 + Tipo A OPEN es exactamente `UNRESOLVED_CONFLICT_CRITERION_V1`. El nombre del fixture es histórico (Tipo A de assemble vs overlay E). Un follow-up de test podría afirmar `diagnoses.length === 1`; no es reparación de runtime.

---

## Productization gaps

Separados de los cognitivos:

1. **No hay formador de `MINIMAL_EXECUTION_ENVELOPE`** desde tools con executor (`get_arr_snapshot`, `get_igf_snapshot`, `get_action_register_context`, etc.).
2. **Chat legado ≠ pipeline constitucional** (índice §3; `AGENTS.md`).
3. **`server.js` no orquesta OP/EB/IES/RE/CP.**
4. **WhatsApp Twilio no consume `renderWhatsapp` de CP.**
5. **EKS pg no recibe Bundles constitucionales** en producto (sí se arranca el runtime).
6. **Sin continuidad de sesión N1–N5** (no hay IES previo, no hay Run store; `05` almacén Run pendiente en índice).
7. **N5 sin adapter productivo** (solo fake en tests).
8. **Observabilidad operacional N1–N5 ausente.**
9. **Índice desfasado** («runtime pendiente») respecto del código.

---

## Cognitive/contractual gaps

No se inventa semántica. Quedan diferidos **por contrato**:

| Gap | Contrato | Estado físico |
|-----|----------|---------------|
| Otras evidence rules (ausencia, tendencia, desviación, …) | `02` §8 / §20: solo CONTRADICTION v1 | `absence_rules`/`causal_rules` vacíos |
| Clasificador B/C/D/E | `02` §20 D10 / §21 D13: Tipo E bloqueado hasta criterio futuro | Solo Tipo A |
| Resolution rules | `02` §19 D4 `R_MOD_EMPTY_GOVERNED_SETS` | `resolution_rules: []`; `RESOLVED` revertido a OPEN |
| Diagnósticos distintos de `UNRESOLVED_CONFLICT` | `02` §21 D2 | Una diagnostic rule |
| Causalidad N3/N4 | Constitución + `02` §8; `causal_rules: []` | `NON_CAUSAL` fijo |
| G8: severity/impact/confidence/materiality, `wi`, `k`, Fs | Constitución II/VII; `02` §19 D10; §21 D16 | Placeholders `NOT_ASSESSED` |
| Firma IES | `04`; IES `signature: null`, `NOT_IMPLEMENTED` | G8 |
| Mapping IES `04` §8 vs Bundle N4 | `02` D6 vs `04` §8 | Clonación; ver sección N4 |
| N5 productivo (hypotheses sobre evidence real) | `05` congelado; RE gates listos | Adapter fake; evidence productiva no entra |

Estos **no** son el siguiente incremento de capacidad real mientras no haya observaciones productivas.

---

## G2/G3/G8 dependency map

| Tema | G2 | G3 | G8 | Notas |
|------|----|----|----|-------|
| Cablear Tool Execution → 03A envelope | **Probable** (actualizar 03A D15 / índice «futuro/parcial») | Posible si se crea contrato de Tool Execution | No | Contratos actuales **insuficientes** para IMPL de producto sin decisiones físicas |
| Proyección IES de Diagnosis N4 a `04` §8 | **Sí** (IES y/o `04`) | No si no hay doc nuevo | No | Dual-schema |
| Clasificador B/C/D/E | **Sí** (`02`, posiblemente Constitución/Motor) | No | No | Semántica nueva |
| G8 calibración | No como diseño de rule | No | **Sí** | Thresholds, `MAT_*`, scoring |
| Rules causales | **Sí** (Motor/`02`) | Posible catálogo | Posible | Prohibido inventarlas |
| Persistencia EKS productiva | Menor (03 ya cubre append-only) | No | No | Contrato 03 suficiente para persistir; falta productor |
| Session/Run store | Posible (`05` almacén Run) | Posible | No | Índice: almacén Run pendiente |
| WhatsApp constitucional | **Sí** (frontera legado vs CP) | Posible | No | Mezclar Twilio + CP sin decisión es reinterpretar |
| Sync índice «runtime pendiente» | **Sí** (índice) | No | No | Deuda documental |
| Esta auditoría | N/A | N/A | N/A | G2/G3/G8 no usados |

---

## Candidate next milestones comparison

### A) Productización / real-input integration

- **Valor:** máximo incremento de capacidad real: facts/evidence/diagnosis sobre adquisiciones verdaderas.
- **Prerequisites:** inventario de tools `available` / `available_on_demand` con executor; contrato `MINIMAL_EXECUTION_ENVELOPE` (`03A` D2); no tratar chat como N1–N5.
- **Gates:** G1 + **G2 probable** (03A D15 / índice). G3 si nace documento de Tool Execution. G8 no.
- **Contratos:** **insuficientes** para IMPL de producto. 03A D15 y el índice dejan Tool Execution «futuro» y OP «fixtures first». Falta congelar: quién forma el envelope, qué payload de ARR/IGF/AR es transportable, y qué canal de salida (dashboard vs WhatsApp) se autoriza primero.
- **Archivos previsibles (futuro IMPL, no ahora):** nuevo formador de envelope; posiblemente `lib/director-ia-tools.js` / executors; tests/fixtures de envelope real-shaped; **no** reescribir chat como EB.
- **Riesgo:** colapsar legado y Constitución; inventar N1 desde narrativa LLM; declarar `ACQUIRED_OK` como integración total de dominio (`03B` aviso ARR/IGF parcial).

### B) N4 downstream normalization

- **Valor:** alinear IES con `04` §8; trazabilidad `related_conflict_ids`.
- **Prerequisites:** N4 Bundle ya existe (listo).
- **Gates:** G2 sobre IES/`04`. G8 no.
- **Contratos:** **tensión explícita** (`02` D6 vs `04` §8). Insuficientes para «solo mapear» sin decisión.
- **Archivos:** `lib/director-ia-ies-builder.js`, tests IES, posiblemente `04`.
- **Riesgo:** redefinir `04` o N4; introducir `model`/severity calibrada de contrabando.

### C) Classifier B/C/D/E

- **Valor:** gobernanza Tipo E productiva, tipos temporales/interpretativos.
- **Prerequisites:** criterio contractual que hoy **no está** (N3 D10, N4 D13).
- **Gates:** G2 (y Constitución/Motor si se toca taxonomía). G8 no para tipificar.
- **Contratos:** **insuficientes**.
- **Archivos:** `lib/director-ia-evidence-builder.js` `tipifyConflicts`; `02`; tests/fixtures.
- **Riesgo:** fabricar Tipo E; semántica especulativa.

### D) G8 materiality/severity calibration

- **Valor:** ordinales reales; deja de ser `NOT_ASSESSED`.
- **Prerequisites:** datos y gobernanza humana; N4 ya emite placeholders válidos.
- **Gates:** **G8 obligatorio**. G2 si cambia ruleset en `02`/Motor.
- **Contratos:** **insuficientes** (parámetros no fijados).
- **Archivos:** EB registry `materiality_rules`; Motor; IES `highest_materiality_detected`.
- **Riesgo:** fingir `LOW`/`NONE`; umbrales sin auditoría.

### E) Causal evidence/diagnosis

- **Valor:** N3/N4 causal bajo rule versionada.
- **Prerequisites:** rule causal aprobada; hoy `causal_rules: []`.
- **Gates:** G2 + gobernanza Motor; G8 posible.
- **Contratos:** **insuficientes** (lista vacía por diseño).
- **Archivos:** EB `causal_rules`; `02` §8.
- **Riesgo:** lenguaje causal informal; violar Constitución.

### F) Persistence / session / operational hardening

- **Valor:** Snapshots reales, Run store, ops.
- **Prerequisites:** algo que produzca Bundles constitucionales (hoy solo tests).
- **Gates:** G1; G2 menor si Run store. G8 no para append EKS.
- **Contratos:** `03` **suficiente** para persistir Bundles; `05` **insuficiente** para almacén Run; no hay contrato de sesión conversacional N1–N5.
- **Archivos:** `lib/director-ia-eks.js`, `sql/015_director_ia_eks.sql`, `server.js` (solo si se autoriza orquestar), futuro store RE.
- **Riesgo:** persistir vacío; acoplar EKS al chat legado; endurecer un camino que no ingiere datos.

**Comparación de valor ahora:** A ≫ F (F sin A no alimenta EKS) > B (higiene de esquema) ≫ C/D/E (semántica especulativa).

---

## Recommended NEXT_TASK

**`ARCH-DIRECTOR-IA-REAL-INPUT-INTEGRATION-001`**

Auditoría/decisiones físicas (no IMPL) para la primera franja de **entrada real** al OP, sin reinterpretar el chat legado como N1–N5 y sin G8/causal/B–E.

Debe decidir, con evidencia de `lib/director-ia-tools.js` y `03A` D2/D15:

1. Qué tools `available` / `available_on_demand` pueden emitir envelope 03A sin nueva epistemología.
2. Quién forma el envelope (capa nueva vs extensión de Tool Orchestrator, que hoy **no ejecuta**).
3. Si hace falta G2 sobre `03A`/índice o G3 (contrato Tool Execution).
4. Canal de salida mínimo autorizado (p. ej. orquestador de prueba o dashboard), **excluyendo** por defecto reescribir Twilio.
5. Criterio GO/NO-GO para un IMPL posterior de formador de envelope + un caso sintético-realista, no de producto WhatsApp.

**Por qué este y no G8/causal/B–E:** el runtime N3/N4 ya clasifica contradicción no resuelta. Sin envelopes 03A productivos esa capacidad no opera sobre la institución. Calibrar severity o inventar Tipo E no cambia eso.

Este reporte **no autoriza** esa tarea.

---

## Deferred follow-ups

Máximo dos:

1. **`ARCH-IES-DIAGNOSIS-N4-PROJECTION-001`** (o IMPL solo tras G2): proyección explícita Bundle N4 → campos `04` §8 / `related_conflict_ids`. Deuda dual-schema. No bloquea entrada real.
2. **`ARCH-EKS-SESSION-OPS-001`** o IMPL de append constitucional + almacén Run **después** de existir productor de Bundles. Endurecer persistencia ahora persiste el vacío.

No se propone como follow-up el clasificador B/C/D/E ni G8 ni causalidad.

---

## Explicit non-goals

- No implementar el NEXT_TASK.
- No modificar contratos ni índice (G2 no autorizado).
- No cablear WhatsApp/Twilio al CP.
- No tratar Fases 1–3 / chat como N1–N5.
- No inventar thresholds, materiality, severity, rules causales ni tipos B–E.
- No firmar IES.
- No commit/push/merge.

---

## Files inspected

Contratos: Constitución, EKE, índice, `02`, `03A`, `03`, `03B`, `04`, `05`, `06`, Fases 1–3, capacidades.

Runtime: `lib/director-ia-observation-pipeline.js`, `evidence-builder.js`, `eks.js`, `ies-builder.js`, `reasoning-engine.js`, `channel-projection.js`, `e2e.js`, `op-eb-eks-integration.js`, `tools.js`, `tool-orchestrator.js`, `chat.js`, `server.js` (EKS start + rutas Director IA / Twilio), `sql/015_director_ia_eks.sql`, `package.json`.

Tests: `test/director-ia-*.test.js` (9 archivos).

Fixtures: `fixtures/director-ia/**` (OP, EB, N3, N4, EKS, IES, RE, CP, E2E, OP-EB-EKS).

Reportes: `IMPL-EVIDENCE-N4-001.md`, `ARCH-EVIDENCE-N4-RULES-PHYSICAL-DECISIONS-002.md`.

---

## Validation evidence

- Inspección de exports: `createObservationPipeline`, `createEvidenceBuilder` (`to_n1`–`to_n4`, `RULE_REGISTRY.diagnostic_rules.length === 1`), `createEks` / `createEksRuntime`, `createIesBuilder`, `createReasoningEngine`, `createChannelProjection`, `createDirectorIaE2e`.
- `server.js` no referencia esas factories constitucionales salvo `createEksRuntime`.
- IES `projectDiagnoses` = clone; `04` §8 no exigido por `validateIes`.
- E2E `type-e-conflict`: aserciones Tipo A; overlay E separado.
- `03A` D15 y índice §1: Tool Execution futuro/parcial; OP fixtures-first.
- `git diff --check` ejecutado al cierre; solo `CURRENT_TASK.md` y este reporte.

STOP. No commit. No push. No merge. No siguiente tarea.
