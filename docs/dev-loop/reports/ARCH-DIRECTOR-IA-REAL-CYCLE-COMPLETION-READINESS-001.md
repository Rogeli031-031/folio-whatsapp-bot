# Reporte — ARCH-DIRECTOR-IA-REAL-CYCLE-COMPLETION-READINESS-001

```yaml
task_id: "ARCH-DIRECTOR-IA-REAL-CYCLE-COMPLETION-READINESS-001"
outcome: "DONE"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-REAL-CYCLE-COMPLETION-READINESS-001.md"
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
  - "docs/director-ia/03A-OBSERVATION-PIPELINE.md"
  - "docs/director-ia/02-EVIDENCE-BUILDER.md"
  - "docs/director-ia/03-EXECUTIVE-KNOWLEDGE-STORE.md"
  - "docs/director-ia/04-IES-STANDARD.md"
  - "docs/director-ia/05-REASONING-ENGINE.md"
  - "docs/director-ia/06-CHANNEL-PROJECTION.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-POST-N4-READINESS-001.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-REAL-INPUT-INTEGRATION-001.md"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-REAL-INPUT-ARR-001.md"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "IMPL-DIRECTOR-IA-REAL-CYCLE-COMPOSITION-001 (propuesta; no autoriza G1 ni encadena)"
secrets_check: "none"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED."
  - "G2/G3 permanecen PENDING_IF_REQUIRED; no se usaron."
  - "G8 permanece N/A."
  - "Veredicto CONDITIONAL-GO: el siguiente incremento es COMPOSITION_ONLY de ARR snapshot → IES → RE → CP. Esta auditoría no autoriza esa IMPL."
```

## Ejecución

- Rama: `architecture/director-ia-real-cycle-completion-readiness-001` (≠ `main`).
- G1 intacto: `HUMAN_APPROVER` / `2026-08-17T23:24:33-06:00` / `AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-17`.
- G2/G3: `PENDING_IF_REQUIRED`, **no usados**. G8: `N/A`.
- Transición: `AUTHORIZED` → `IN_PROGRESS` (solo `status`) → este reporte → `DONE_PENDING_REVIEW` (solo `status`).
- `max_attempts: 1`. Sin implementación. Sin commit, push, merge. Sin siguiente tarea.

Auditoría física. Se inspeccionaron runtimes y se **probó** el camino ARR snapshot → IES → RE → CP con los fixtures sintéticos de `IMPL-DIRECTOR-IA-REAL-INPUT-ARR-001` (fuente inyectada, misma forma que `loadArrProyForPlant`). No se escribió ningún runtime, test ni contrato.

---

## 1. Executive verdict

**CONDITIONAL-GO** para un único incremento: **composición física** del ciclo constitucional completo

`ARR real → MINIMAL_EXECUTION_ENVELOPE → OP → EB → EKS → IES → RE → CP → caller dashboard`.

El vertical slice ARR ya termina en Knowledge Snapshot EKS. Los runtimes IES, RE y CP **ya existen** y **ya son compatibles** con ese snapshot si se aplica el mismo overlay de `query_context_metadata` que usa `createDirectorIaE2e`. Persistencia durable y sesión conversacional **no** son prerrequisitos físicos de un ciclo. WhatsApp/chat **no** son necesarios para demostrarlo.

Condiciones (no son G2/G3):

1. **COMPOSITION_ONLY**: fachada nueva (o extensión de orquestación) que, a partir del `snapshot` ARR, adjunta `query_context_metadata`, llama `iesBuilder.build`, `reasoningEngine.reason`, `channelProjection.project({ channel: "DASHBOARD" })` y devuelve el envelope de CP al caller.
2. **No re-ejecutar** OP/EB/EKS vía `createDirectorIaE2e.run` (ese orquestador parte de `executionEnvelope` y vuelve a ensamblar).
3. `modelAdapter` inyectable; el ciclo ARR de un solo `venta_ton` produce **cero Evidence**, así que RE queda fail-closed en `ABSTAIN` / `INSUFFICIENT_EVIDENCE` sin LLM productivo.
4. No cablear `server.js` en ese incremento (candidato D, posterior).
5. No tocar contratos, N1–N5, chat, WhatsApp, persistencia ni sesión.

G2 haría falta solo si se reescribiera `04` §8 / proyección N4, o si se tratara el chat como N1–N5. G3 haría falta solo si HUMAN exigiera un contrato nuevo de orquestación; las factories actuales ya bastan. G8 no aplica.

---

## 2. Baseline after ARR integration

| Hecho | Evidencia |
|-------|-----------|
| Slice ARR implementado | `lib/director-ia-real-input-arr.js` `createDirectorIaArrInput().run` |
| Camino físico actual | `planta_id` → ARR inyectado (`loadArrProyForPlant` signature) → envelope 03A → OP → EB → EKS `append_snapshot` |
| Objeto terminal | Knowledge Snapshot `{ snapshot_id, bundle_id, trace_id, version, persisted_at, bundle, integrity }` |
| Tests ARR | 24 pass; Director IA 292 pass / 0 fail (`IMPL-DIRECTOR-IA-REAL-INPUT-ARR-001`) |
| IES/RE/CP | Existen; E2E sintético ya los encadena desde envelopes, no desde ARR real |
| Chat/Twilio | Fuera de N1–N5; `server.js` no invoca la fachada ARR |
| Fuente | `get_arr_snapshot` / `loadArrProyForPlant` / `venta_ton`; anexo chat **no** usado |

---

## 3. Physical pipeline inspection

```text
HOY (productivo cognitivo hasta EKS):
  authenticated planta_id
    → createDirectorIaArrInput.run
       → arrSource(client, year, month, plant_code)
       → MINIMAL_EXECUTION_ENVELOPE
       → observationPipeline.process
       → evidenceBuilder.assemble
       → eks.validate_structure + append_snapshot
    → { trace_id, envelopes, acquisition_statuses, observation_records, bundle, validation, snapshot }

EXISTE PERO NO ESTÁ CABLEADO AL SLICE ARR:
  createDirectorIaE2e.run({ executionEnvelope, queryContextMetadata, session, channel, projectionDepth })
    → OP → EB → EKS → iesBuilder.build(snapshot+query_context_metadata)
    → reasoningEngine.reason(ies, session)
    → channelProjection.project({ ies, reasoningResult, channel, projectionDepth })

FALTA (COMPOSITION_ONLY):
  arrResult.snapshot + query_context_metadata
    → IES → RE → CP(DASHBOARD)
    → channel_output al caller
```

`server.js` arranca `createEksRuntime` (lifecycle) y expone `/api/director-ia/chat`. **No** llama `createDirectorIaArrInput` ni IES/RE/CP.

---

## 4. D1–D22 findings

### D1 — current real cycle

Punto terminal: **EKS `append_snapshot`**. Objeto: Knowledge Snapshot in-memory (`createEks()`), con Bundle `producer=evidence_builder`. No hay IES/RE/CP en `createDirectorIaArrInput`.

### D2 — EKS → IES

**Compatible con overlay, no con snapshot crudo.** `buildIes` exige `snapshot_id`, `version`, `bundle` y `query_context_metadata`. `toPublicSnapshot` **no** incluye `query_context_metadata`. Sonda: `iesBuilder.build(arrOut.snapshot)` → `MISSING_QUERY_CONTEXT_METADATA`. Con el mismo overlay que E2E, `validate().ok === true` en los cinco fixtures ARR. No hace falta adapter contractual ni reinterpretación.

### D3 — IES projection of ARR N2/N3/N4

Ciclo ARR de un registro `venta_ton` (forma física de `loadArrProyForPlant`): **1 Fact, 0 Evidence, 0 Diagnosis**, coverage `CONOZCO` → IES `VALIDATED`. Factos N2 (statement/concept/value/unit/period/traceability) sobreviven por `projectFacts`. N3/N4 no se producen (no hay contradicción). Nada material se pierde para ese caso.

### D4 — N4 projection debt

**DEBT_NON_BLOCKING.** `projectDiagnoses = cloneJson`. Bundle N4 usa `diagnostic_category` / `applied_rule` / `supporting_conflict_ids`; `04` §8 pide `primary_classification`, `model`, `applied_rule_id`, `validity`, `coverage_*`, `related_conflict_ids`. `validateIes` no exige esos campos `04`. RE no lee `primary_classification`. CP proyecta `statementOf(diagnosis)`. En el slice ARR real de un `venta_ton`, `diagnoses=[]` (deuda vacua). No cambia la semántica que RE necesita. Follow-up G2 opcional; **no blocker**.

### D5 — IES → RE

**Sí, directo.** `reason(ies, sessionInput)` clona IES; `session: {}` se normaliza. Sonda: RE acepta el IES ARR y no lanza. Status típico ARR un-hecho: `ABSTAIN` (evidence vacía).

### D6 — reasoning behavior on ARR

Un `venta_ton` comparable no genera N3. `evidence[]` vacío → RE **strips** hypotheses/recommendations y emite abstention `INSUFFICIENT_EVIDENCE`. Eso es fail-closed constitucional, no un hueco de composición. N5 sustantivo exigiría Evidence real (p. ej. contradicción de dos valores) **o** un adapter que alucine; lo segundo está prohibido. El ciclo completo se demuestra con facts IES + abstención RE + CP.

### D7 — RE → CP

**Sí, directo.** `project({ ies, reasoningResult, reasoningRunId, channel, projectionDepth })`. Canal `DASHBOARD` existe (`DASHBOARD_POLICY_V1`). Sonda: cinco casos ARR → `channel_output` sin throw. Reasoning Result es opcional; su ausencia no fabrica N5.

### D8 — CP output

`CHANNEL_OUTPUT_ENVELOPE_V1`: `{ projection_id, channel, projection_depth, ies_id, reasoning_run_id, content_blocks[], deferred_content, critical_invariants, limitations, audit }`. Para caller **no conversacional** (dashboard JSON) es suficiente: bloques `panel` con coverage, facts, limitaciones. No es WhatsApp ni prosa de chat.

### D9 — real full facade

**No existe** una fachada `ARR → … → CP`. Existe `createDirectorIaArrInput` (hasta EKS) y `createDirectorIaE2e` (desde envelope sintético). Falta **solo composición** del snapshot ARR con IES/RE/CP. Reusar `e2e.run` reejecutaría OP/EB/EKS; no es el incremento mínimo.

### D10 — persistence dependency

**No.** IES consume el objeto Snapshot devuelto por `append_snapshot`, no `get_snapshot` ni pg. E2E y la sonda usan `createEks()` memoria. Persistencia durable es supervivencia de proceso, no corrección del ciclo.

### D11 — session dependency

**No.** `normalizeSession({})` basta. No hay `session_id`, WhoAmI ni memoria conversacional en IES/RE/CP. Identidad de dashboard (`requesting_user_id` / role) vive en `query_context_metadata`, no en un store de sesión.

### D12 — historical dependency

**No.** RE razonó sobre el IES del ciclo actual. No hay lookup de snapshots previos.

### D13 — EKS semantics

EKS es **boundary epistemológico** (validate + append-only Snapshot) **y** store. El store puede ser memoria (ciclo/tests) o pg (`createEksRuntime`, flag `ENABLE_DIRECTOR_IA`). La semántica constitucional **no** exige durable para un ciclo. El nombre Knowledge Store no justifica persistencia-first.

### D14 — dashboard return

**Sí.** CP `DASHBOARD` ya renderiza `content_blocks`. Un caller dashboard puede recibir `channel_output` (+ IES/RE opcionales para auditoría). Chat/WhatsApp no intervienen.

### D15 — server wiring

Mínimo futuro: endpoint autenticado **distinto** de `POST /api/director-ia/chat` que reciba `planta_id` (+ year/month/plant_code), invoque **solo** la fachada full-cycle y devuelva JSON de CP. `server.js` no debe conocer OP/EB/EKS/IES/RE/CP. Eso es candidato D, **después** de A.

### D16 — error propagation

Probado:

| Status ARR | Bundle coverage | IES | source_health | extra | ABSENCE_CONFIRMED |
|------------|-----------------|-----|---------------|-------|-------------------|
| `ACQUIRED_OK` | `CONOZCO` | `VALIDATED` | `DATA_AVAILABLE` | 1 fact | no |
| `ACQUIRED_EMPTY` | `CONOZCO_PARCIALMENTE` | `PARTIAL` | `DATA_NOT_FOUND` | `partial_domains: [arr]` | **no** |
| `TOOL_ERROR` | `CONOZCO_PARCIALMENTE` | `PARTIAL` | `TOOL_ERROR` | limitation + `failed_tools` | no |
| `ENTITY_UNRESOLVED` | `CONOZCO_PARCIALMENTE` | `PARTIAL` | `ENTITY_UNRESOLVED` | limitation + `unresolved_entities` | no |
| `QUERY_SCOPE_INCOMPLETE` | `CONOZCO_PARCIALMENTE` | `PARTIAL` | `QUERY_SCOPE_INCOMPLETE` | `incomplete_scopes: [arr]` (no limitation) | no |

Ninguno se convierte en hecho de negocio ni en `ABSENCE_CONFIRMED`. RE no inventa hipótesis. CP presenta coverage/limitaciones.

### D17 — trace propagation

Probado: `trace_id` ARR = envelope = snapshot = `ies.query_context.trace_id`. RE `reasoning_run.ies_id` = `ies.ies_id`. CP `channel_output.ies_id` = `ies.ies_id`. Los runtimes actuales **no** regeneran `trace_id`.

### D18 — mutation

ARR, OP, EB, EKS, IES, RE y CP clonan entrada. Sonda: input ARR no mutado. E2E ya afirma no-mutación. Composición puede preservar el invariante sin cambio de runtime.

### D19 — candidates

Ver §16. Ganador: **A_FULL_CYCLE_COMPOSITION**.

### D20 — minimum productive completion

Compositor: `arr.run` → overlay `query_context_metadata` → `iesBuilder.build` → `reason` → `project(DASHBOARD)` → devolver `channel_output` (+ artefactos de auditoría). Tests con fixtures ARR existentes. Sin persistencia, sesión, server.js, WhatsApp, G8 ni nueva epistemología.

### D21 — gates

| Candidato | G1 | G2 | G3 | G8 |
|-----------|----|----|----|----|
| A composición | sí (futuro) | no | no | no |
| B persistencia first | sí | no (si no se cambia `03`) | no | no |
| C sesión first | sí | **posible** (memoria/WhoAmI) | posible | no |
| D server wiring first | sí | no si endpoint ≠ chat | no | no |

### D22 — NEXT_TASK

Exactamente uno: **`IMPL-DIRECTOR-IA-REAL-CYCLE-COMPOSITION-001`**. Ver §19. Esta línea **no** es G1.

---

## 5. Pipeline readiness matrix

| stage | runtime exists | input physically compatible | output physically compatible | trace preserved | persistence required | session required | adapter required | blocker |
|-------|----------------|-----------------------------|------------------------------|-----------------|----------------------|------------------|------------------|---------|
| ARR source | yes (`loadArrProyForPlant` via injection) | yes (`planta_id`+`plant_code`+year/month) | yes `{ venta_ton, desc_kg }` | n/a | no (client inyectado) | no | no | no |
| MINIMAL_EXECUTION_ENVELOPE | yes (ARR facade/adapter) | yes | yes 03A enum | yes (facade owner) | no | no | no | no |
| OP | yes | yes (envelope array) | yes statuses+records | yes | no | no | no | no |
| EB | yes | yes (OP output) | yes Knowledge Bundle | yes | no | no | no | no |
| EKS | yes (`createEks` / runtime) | yes (valid Bundle) | yes Snapshot | yes | **no for one cycle** | no | no | no |
| IES | yes | yes **if** `query_context_metadata` overlay | yes OFFICIAL IES | yes (`query_context.trace_id`) | no | no | no (overlay = composition) | no |
| RE | yes | yes (IES + session `{}`) | yes result+run; ARR 1-fact → ABSTAIN | yes via ies_id | no | **no** | `modelAdapter` inject (empty ok) | no |
| CP | yes | yes (IES + optional RE; `DASHBOARD`) | yes `CHANNEL_OUTPUT_ENVELOPE_V1` | yes via ies_id | no | no | no | no |
| caller | dashboard auth exists; **no** full-cycle route | CP JSON is sufficient | n/a | n/a | no | no | server wiring = later | no |

Clasificación del gap de cierre: **COMPOSITION_ONLY**.

---

## 6. Artifact flow matrix

| artifact | producer | consumer | real ARR cycle currently produces it | schema/contract | fields preserved | fields lost | blocking loss |
|----------|----------|----------|--------------------------------------|-----------------|------------------|-------------|---------------|
| ARR `{ venta_ton, desc_kg }` | `loadArrProyForPlant` | ARR adapter | only via injection in facade | physical ARR | `venta_ton`; `desc_kg` ignored by slice | `desc_kg` | no |
| MINIMAL_EXECUTION_ENVELOPE | ARR adapter | OP | **yes** | 03A D2 | provenance, status, payload | secrets/`client` (by design) | no |
| AcquisitionStatus | OP | EB traceability | yes | 03A | status enum | not in N1 | no |
| ObservationRecord | OP | EB N1 | yes (OK/empty) | 03A | provenance, `venta_ton` | none material | no |
| Knowledge Bundle | EB | EKS | yes | 02 | N1–N4 produced | N3/N4 empty on 1-record | no |
| Knowledge Snapshot | EKS | IES (intended) | **yes** | 03 | bundle+ids+integrity | `query_context_metadata` not stored on snapshot | **no** (E2E overlay already defined) |
| IES | IES Builder | RE, CP | **not in ARR facade** | 04 | facts/health/coverage when composed | N4 `04` §8 dual-schema if diagnoses exist | no (DEBT_NON_BLOCKING) |
| Reasoning Result/Run | RE | CP | not in ARR facade | 05 | abstentions on empty evidence | no hypotheses without N3 | no |
| Channel Output | CP | caller | not in ARR facade | 06 | coverage/facts/limitations | WhatsApp not used | no |

---

## 7. EKS → IES compatibility

**Probado.** Snapshot ARR tiene `snapshot_id`, `version`, `bundle`. Falta `query_context_metadata` en el objeto EKS (contrato `04`: el IES lo proyecta desde metadata del snapshot; E2E ya la inyecta post-append). Overlay → IES `validate().ok === true` en OK/empty/error/unresolved/incomplete. Sin reinterpretación de facts. Sin contrato nuevo.

---

## 8. IES → RE compatibility

**Probado.** `reason(ies, {})` no rechaza IES ARR `VALIDATED`/`PARTIAL`. Evidence vacía → `ABSTAIN` + `INSUFFICIENT_EVIDENCE`, 0 hypotheses, 0 recommendations. Consume IES only. No tools, no DB, no historial.

---

## 9. RE → CP compatibility

**Probado.** `project` con `channel: "DASHBOARD"`, `projectionDepth: "L1_EXECUTIVE"`, IES ARR + reasoning result → `channel_output` con `content_blocks` (6–8 en la sonda). CP no crea verdad. No exige WhatsApp. Policy `DASHBOARD` ya está en `createDefaultPolicyRegistry`.

---

## 10. N4 projection debt reassessment

Clasificación **actualizada tras ARR real: DEBT_NON_BLOCKING.**

- Sigue siendo dual-schema `02` DIAGNOSIS vs `04` §8.
- El slice ARR de `venta_ton` único **no emite Diagnosis**; la deuda no opera.
- Aunque hubiera contradicción (dos valores comparables), RE/CP no dependen de `primary_classification`.
- No es blocker del ciclo. No exige G8. Corregirlo seguiría siendo G2 opcional, no el NEXT_TASK.

---

## 11. Failure/status propagation

Fail-closed se conserva hasta CP si la composición no reinterpreta coverage:

- Empty → `DATA_NOT_FOUND` / `PARTIAL` / open question EB `DATA_NOT_FOUND` ≠ ausencia de ventas.
- Tool error → limitation `TOOL_ERROR` + `failed_tools`.
- Entity unresolved → limitation + `unresolved_entities` (IES lista el dominio/`arr`, no inventa `entity_id`).
- Scope incomplete → `incomplete_scopes` (no entra en `LIMITATION_STATUSES`; no se afirma cobertura).

Prohibido en la futura IMPL: mapear cualquiera de estos a hecho N2 de negocio o a `ABSENCE_CONFIRMED`.

---

## 12. Trace propagation

Owner: fachada ARR (`idFactory("trace")`). Overlay de metadata **debe copiar el mismo** `trace_id` (como E2E). Sonda: igualdad ARR → envelope → snapshot → `ies.query_context.trace_id`. RE/CP referencian `ies_id`, no regeneran trace.

---

## 13. Persistence dependency

**Disproven as prerequisite.** Un ciclo funciona con `createEks()` memoria. `createEksRuntime` + `DATABASE_URL` es infra de servidor ya existente y **no** es leída por IES/RE/CP. Recomendar persistencia-first solo porque el componente se llama Store **viola** las decision rules de esta tarea.

---

## 14. Session dependency

**Disproven.** Session RE = cuatro hints opcionales. E2E usa `{}`. Dashboard stateless puede pasar `requesting_user_id` en metadata de query. Memoria conversacional / WhoAmI / small talk están fuera y no desbloquean el ciclo ARR.

---

## 15. Dashboard/server boundary

- Auth dashboard ya existe (`dashboardAuthMiddleware`).
- Ruta cognitiva actual: `POST /api/director-ia/chat` (LLM legado) — **no** usar para demostrar N1–N5.
- Caller productivo no conversacional: JSON de `channel_output` DASHBOARD.
- Wiring de `server.js` no es necesario para demostrar el pipeline en tests de composición.
- Futuro wiring: un endpoint distinto que solo llame la fachada full-cycle.

---

## 16. Candidate comparison

| candidate | user/product value unlocked | architectural prerequisite | runtime prerequisite | G2 | G3 | G8 | risk | recommended |
|-----------|-----------------------------|----------------------------|----------------------|----|----|----|------|-------------|
| **A_FULL_CYCLE_COMPOSITION** | Ciclo constitucional demostrable con ARR real hasta CP dashboard | ninguno nuevo; overlay metadata ya definido por E2E/`04` | factories IES/RE/CP + ARR facade + `modelAdapter` inyectable | no | no | no | reusar `e2e.run` y duplicar OP/EB/EKS; meter chat | **YES** |
| B_PERSISTENCE_FIRST | Supervivencia de snapshots entre procesos | ninguna para un ciclo | pool EKS ya existe | no | no | no | retrasa valor cognitivo; no prueba IES/RE/CP | no |
| C_SESSION_FIRST | Continuidad multi-turno | posible contrato de sesión | no exigido por RE | posible | posible | no | inventa WhoAmI/memoria; mezcla chat | no |
| D_SERVER_WIRING_FIRST | HTTP productivo | fachada full-cycle **aún ausente** | `server.js` + auth | no si ≠ chat | no | no | cablea un compositor que no existe; riesgo de usar `/chat` | no (después de A) |

---

## 17. Gate requirements

- **G1:** requerido para la IMPL de A (humano; esta auditoría no lo otorga).
- **G2:** no para A. Sí si se proyecta N4 a `04` §8 o se declara chat=N1.
- **G3:** no para A. Las factories actuales cubren la orquestación.
- **G8:** N/A. Placeholders `*_NOT_ASSESSED` ya operan.

---

## 18. Minimum productive completion

Incremento mínimo que transforma el slice ARR en ciclo cognitivo completo **demostrable**:

1. Runtime nuevo de composición (nombre preferido: `lib/director-ia-real-cycle.js`).
2. Dependencias: ARR facade (o sus deps), `iesBuilder`, `reasoningEngine`, `channelProjection`, `idFactory`, `clock`, `modelAdapter`.
3. `run(input)`: ciclo ARR existente → overlay `query_context_metadata` desde input autenticado + `trace_id` del ciclo → IES → RE(`session` default `{}`) → CP(`DASHBOARD`, depth inyectable) → resultado estructurado.
4. Tests: fixtures `fixtures/director-ia/real-input-arr/*` hasta `channel_output`; fail-closed; trace; no mutación; no RE/CP desde ARR facade actual (el compositor sí los llama); no Twilio/chat.
5. Intactos: `docs/director-ia/`, OP, EB, EKS semantics, IES/RE/CP internals, `server.js`, `package.json`, chat.

No hace falta exportar `loadArrProyForPlant` ni cambiar semántica ARR.

---

## 19. Exactly one NEXT_TASK

**`IMPL-DIRECTOR-IA-REAL-CYCLE-COMPOSITION-001`**

Scope cerrado:

- Componer ARR → EKS snapshot existente con IES → RE → CP dashboard.
- Clasificación: **COMPOSITION_ONLY**.
- Canal de demostración: `DASHBOARD` (no WhatsApp, no chat legado).
- `query_context_metadata` ensamblado de campos de ciclo ya conocidos (trace, pregunta, planta, periodo, usuario/rol/canal del caller).
- `modelAdapter` inyectable; admitir adapter vacío fail-closed.
- Conservar fail-closed de `ACQUIRED_EMPTY`, `TOOL_ERROR`, `ENTITY_UNRESOLVED`, `QUERY_SCOPE_INCOMPLETE`.
- Gates: G1 humano futuro; G2/G3/G8 no requeridos si no se tocan contratos ni N4/`04`.
- Fuera: persistencia nueva, sesión, `server.js`, WhatsApp, Twilio, chat, G8, causalidad, B/C/D/E, nueva fuente/métrica.

Propuesta. **No autoriza** ejecución. **No encadena.**

---

## 20. GO / CONDITIONAL-GO / NO-GO

**CONDITIONAL-GO.**

No es GO incondicional: el snapshot EKS no alimenta IES sin overlay de metadata, y no hay fachada full-cycle. Esas condiciones están **físicamente definidas** por E2E/`04` y se resuelven con composición, no con arquitectura nueva.

No es NO-GO: EKS→IES, IES→RE y RE→CP fueron **probados** con output ARR real-shaped. Persistencia y sesión no bloquean. El debt N4 no bloquea. Chat/WhatsApp no son el camino.

---

## 21. STOP

Sin implementación. Sin modificación de contratos ni runtimes. Sin commit, push, merge. Sin siguiente tarea. `git diff --check` y `git status` verifican alcance = `CURRENT_TASK.md` + este reporte.
