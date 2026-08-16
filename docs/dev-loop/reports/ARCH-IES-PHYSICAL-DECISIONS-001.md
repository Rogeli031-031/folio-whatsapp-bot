# Reporte — ARCH-IES-PHYSICAL-DECISIONS-001

```yaml
task_id: "ARCH-IES-PHYSICAL-DECISIONS-001"
outcome: "DONE"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-IES-PHYSICAL-DECISIONS-001.md"
files_not_touched:
  - "docs/director-ia/"
  - "lib/"
  - "test/"
  - "fixtures/"
  - "server.js"
  - "package.json"
  - "sql/"
  - "AGENTS.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
contracts_consulted:
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md"
  - "docs/director-ia/02-EVIDENCE-BUILDER.md"
  - "docs/director-ia/03-EXECUTIVE-KNOWLEDGE-STORE.md"
  - "docs/director-ia/03A-OBSERVATION-PIPELINE.md"
  - "docs/director-ia/03B-END-TO-END-REFERENCE-FLOWS.md"
  - "docs/director-ia/04-IES-STANDARD.md"
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md"
contracts_modified: []
ambiguities_or_contradictions:
  - "04 §1 declara entrada única = Knowledge Snapshot, y §3 exige query_context (executive_query_id, requesting_user_id, channel, permission_restrictions, knowledge_effective_date, etc.) que el Snapshot/Bundle vigente no contiene. No se resolvió (G2 REQUIRED)."
  - "04 §5 exige executive_summary_facts con statement_token y prioridad ya proyectada; el Bundle no tiene catálogo de statement_token ni campo priority en facts. Los tokens SUM_* / FACT_* / LIM_* aparecen solo en ejemplos §20 (ILUSTRATIVOS). No se congeló catálogo."
  - "04 §16 declara canonical_representation pendiente de congelar y firma diferida. Cerrar integrity completo exige G2 sobre 04, no inferencia."
  - "02 emite conflicts.primary_type como letra A–E; 04 exige CONF_TYPE_* . El catálogo §24 es 1:1, pero no hay decisión física de proyección registrada."
  - "03 y el Architecture Index aún declaran runtime EKS/EB/OP/IES pendiente; el repositorio ya tiene runtimes OP, EB y EKS. El índice no se reescribió."
  - "Fixtures EKS 03B (case-a/b) no coinciden con emit_bundle del EB vigente (open_questions string vs objeto; N1 incompleto). Son ilustrativos; no se usaron como reglas productivas."
deviations_from_current_task: []
next_task_proposed: "Ninguna autorizada. IMPL-IES-001 no se crea ni se autoriza. Si HUMAN_APPROVER quiere registrar realización física IES, eso exige G2 + G1 nuevos sobre las decisiones listadas en §13–§14. Esta línea no autoriza trabajo."
secrets_check: "none"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED."
  - "G2 REQUIRED para cerrar D5 (query_context vs entrada única), D8 (resumen/tokens), D13 (ALTERNATIVE), D14 (canonicalización) y catálogos statement_token/limitations. Esta tarea no autorizó ni ejecutó G2."
  - "Aprobar, enmendar o rechazar cada RECOMMENDATION D1–D18. Ninguna es APPROVED."
  - "G8 permanece N/A. No se calibró materiality, k, wi, Fs ni firma."
```

## Ejecución

- Rama: `architecture/ies-physical-decisions-001` (≠ `main`; no se cambió de rama).
- G1 intacto: `authorized_by`, `authorized_at`, `human_authorization` no modificados por el implementador.
- G2 leído: `PENDING_IF_REQUIRED`. **G2 REQUIRED** para varios PHYSICAL_UNKNOWN (ver §15). No se editó `docs/director-ia/`. Esas decisiones **no** se resolvieron.
- G3: `N/A`. G8: `N/A`.
- Transición: `AUTHORIZED` → `IN_PROGRESS` (solo `status`) → este reporte → `DONE_PENDING_REVIEW` (solo `status`).
- `max_attempts: 1`. Sin runtime IES. Sin tests/fixtures de implementación IES. Sin calibración. Sin IMPL-IES-001.
- Sin commit. Sin push. Sin merge. Sin encadenar tarea.

Leyenda (obligatoria):

- **CONTRACTUAL:** texto vigente; solo se obedece.
- **PHYSICAL_UNKNOWN:** el contrato exige el resultado, pero falta decisión física/política para implementarlo sin elegir arquitectura.
- **RECOMMENDATION:** opción técnica no vinculante; **no** es `APPROVED`.
- **BLOCKER:** impide IMPL-IES-001 sin decisión humana o contractual previa.

---

# 1. Executive result

El IES v1.0 está **contractualmente congelado** (`04`). El runtime IES **no existe**. La cadena física vigente llega hasta Knowledge Snapshot (OP → EB → EKS, fixtures sintéticos). Esa frontera **no** contiene físicamente todo lo que `04` exige para proyectar un IES raíz completo.

**Puede proyectarse hoy, de forma mecánica y fail-closed, si se inyectan reloj/IDs y se acepta proyección 1:1 ya escrita en `04`:** cobertura constitucional → `COV_*` / `status`; bancos `facts`/`evidence`/`diagnoses`/`conflicts`/`open_questions` como listas (posiblemente vacías); `materiality` copiada (`MATERIALITY_NOT_ASSESSED`); `highest_materiality_detected`; `signature=null` / `NOT_IMPLEMENTED`; Snapshot `NO_CONOZCO` → IES `NO_KNOWLEDGE` con bancos vacíos; referencia `snapshot_id` + `version`; procedencia N1 vía Bundle (sin sustituir autoría).

**No puede completarse sin decisión humana / G2:** `query_context` obligatorio (la mayoría de campos no está en el Snapshot); `executive_summary_facts` (sin regla de selección ni catálogo de `statement_token`); `executive_scope`; `limitations` como banco tokenizado; `ies_type` / `alternative_context`; `expires_at` / política de vigencia; canonicalización de `integrity.canonical_representation`; persistencia/versionado físico del IES; catálogo productivo de tokens `SUM_*`/`FACT_*`/`LIM_*`/`OQ_*` (solo ejemplos §20).

**IMPL-IES-001 está bloqueado** hasta que HUMAN_APPROVER resuelva los blockers de §14. Esta auditoría no implementa, no modifica `04` y no autoaprueba recomendaciones.

---

# 2. Documents and runtime inspected

| Artefacto | Uso |
|-----------|-----|
| Constitución, EKE, `02`, `03`, `03A`, `03B`, `04` v1.0, índice | Solo lectura |
| `lib/director-ia-observation-pipeline.js` | Salida: listas hermanas |
| `lib/director-ia-evidence-builder.js` | `assemble` → Bundle |
| `lib/director-ia-eks.js` | `validate_structure`, `append_snapshot`, `get_snapshot`, `list_versions`; Snapshot in-memory |
| `lib/director-ia-op-eb-eks-integration.js` | Orquesta OP→EB→EKS; **no** produce IES |
| Tests y fixtures OP / EB / EKS / integración | Realidad física sintético-fail-closed |
| Fixtures `fixtures/director-ia/eks/case-*.json` | Ilustrativos 03B; **no** reglas IES |

No se ejecutó suite: la forma física se leyó en fuente y fixtures. No se creó runtime IES.

---

# 3. Current physical reality

## 3.1 Cadena demostrada (no IES)

```
MINIMAL_EXECUTION_ENVELOPE[]
  → OP.process() → acquisition_statuses[] + observation_records[]
  → EB.assemble() → Knowledge Bundle
  → EKS.validate_structure() → append_snapshot() → Knowledge Snapshot
```

No hay `lib/director-ia-ies*.js`. El helper de integración **no** llama un IES Builder. Reasoning Engine y Channel Projection: runtime pendiente (`05` congelado; `06` propuesto).

## 3.2 Knowledge Snapshot físico (EKS `toPublicSnapshot`)

| Campo | Presente | Notas |
|-------|----------|-------|
| `snapshot_id` | YES | Opaco (`snap_` + UUID) |
| `bundle_id` | YES | Copia del Bundle |
| `trace_id` | YES | Clave de versionado EKS |
| `version` | YES | Monotónico por `trace_id` |
| `persisted_at` | YES | `Date` de persistencia; no es `valid_at` IES |
| `bundle` | YES | Copia opaca, sin mutación |
| `integrity` | YES | `sha256:` digest del **Bundle** (I_DIGEST). **No** es firma IES ni `content_fingerprint` del IES |

`get_snapshot({snapshot_id})` = exacto. `get_snapshot({trace_id})` = latest. `list_versions` = historial por `trace_id`.

## 3.3 Knowledge Bundle físico (EB `emit_bundle`)

Campos raíz: `bundle_id`, `trace_id`, `produced_at`, `producer="evidence_builder"`, `observations[]`, `facts[]`, `evidence[]` (hoy `[]`), `diagnoses[]` (hoy `[]`), `conflicts[]`, `open_questions[]`, `knowledge_coverage` (**string** constitucional), `source_health` (**objeto** `clave → AcquisitionStatus`), `ruleset_versions`, `traceability`.

`traceability` vigente: `{ question, plan, tool_plan, acquisition: [{ tool_id, domain, status }], observations: [observation_id] }`.

**No** existen en Bundle/Snapshot: `query_context`, `executive_query_id`, `query_fingerprint`, `requesting_user_id`, `requesting_role`, `channel`, `permission_restrictions`, `knowledge_effective_date`, `executive_scope`, `limitations[]`, `executive_summary_facts`, `ies_*`, `audit` IES, `integrity` IES, `alternative_context`, tokens `COV_*` / `CONF_TYPE_*` / `statement_token`.

## 3.4 Pérdida de campos OP → Bundle

AcquisitionStatus OP puede llevar `execution_id`, `scope_complete`, `entity_resolution_state`, `error.code`, `extracted_at`. El Bundle resume `source_health` por `domain\|\|tool_id` y `traceability.acquisition` a `{ tool_id, domain, status }`. `error_code`, `scope_complete`, `raw_payload_reference` de status **no** se preservan como objeto IES `source_health[]`. `raw_payload_reference` sí vive en N1/`observations` cuando hay record transportable.

## 3.5 Índice vs repo

El Architecture Index §3 aún dice runtime pendiente para EB/OP/EKS/IES. Hecho: OP, EB y EKS existen; IES no. El índice no se modificó.

---

# 4. D1–D18 findings

## D1 — Input boundary

**CONTRACTUAL.** `04` §1: entrada única = Knowledge Snapshot persistido por EKS. `03` §3: Snapshot = metadatos de almacén + Bundle opaco. Índice §5.4: IES consume Snapshot, no fuentes.

**PHYSICAL (hecho).** La entrada física existente es el objeto público de `createEks().get_snapshot` / `append_snapshot`: `{ snapshot_id, bundle_id, trace_id, version, persisted_at, bundle, integrity }`.

**RECOMMENDATION (no aprobada).** Futuro IES Builder acepta exactamente ese objeto (o `get_snapshot` ya materializado), sin reconsultar OP/EB/tools. No es `APPROVED`.

## D2 — Builder interface

**CONTRACTUAL.** Existe el componente nombrado «IES Builder»: determinístico; no consulta fuentes; no ejecuta tools; no crea N2–N5; no LLM; no redacta.

**PHYSICAL_UNKNOWN.** `04` no congela factory, función, opciones ni dependencias inyectables.

**RECOMMENDATION (no aprobada).** Forma candidata de auditoría: `createIesBuilder(dependencies).build(snapshot, options)`. No queda aprobada por aparecer aquí.

## D3 — Snapshot opacity

**CONTRACTUAL.** IES proyecta Snapshot; no reinterpreta conocimiento persistido; no consulta fuentes; EKS no reinterpreta Bundle (`03`).

**RECOMMENDATION (no aprobada).** Leer solo `snapshot.bundle` + metadatos EKS explícitos (`snapshot_id`, `version`, `persisted_at`, `integrity` del Bundle). Prohibido volver a OP/EB/chat para “completar” el IES.

**PHYSICAL_UNKNOWN / BLOCKER colateral.** Si `query_context` no está en el Snapshot, obedecer D3 + «entrada única» deja esos campos sin fuente. Cerrar eso sin extra-input exige G2 (ponerlos en Bundle/Snapshot **o** ampliar la entrada de `04`). **No resuelto.**

## D4 — Root mapping

Ver matriz §5. Resumen: identidad IES, `query_context`, `executive_scope`, `executive_summary_facts`, `limitations`, `audit.engine_version`, `integrity` canónico y `alternative_context` no tienen fuente física completa hoy. Bancos y cobertura constitucional sí.

## D5 — query_context mapping

| Campo 04 §3 | ¿En Snapshot/Bundle hoy? | Clasificación |
|-------------|--------------------------|---------------|
| `executive_query_id` | NO. Distinto de `trace_id` por contrato | PHYSICAL_UNKNOWN + BLOCKER. G2 REQUIRED si debe vivir en Snapshot **o** si 04 admite envelope de proyección |
| `query_fingerprint` | NO (opcional) | PHYSICAL_UNKNOWN. No inventar canonicalización de wording |
| `trace_id` | YES (`snapshot.trace_id` = `bundle.trace_id`) | CONTRACTUAL + YES |
| `original_question` | PARTIAL: `bundle.traceability.question` (string o null) | PARTIAL |
| `intent` | PARTIAL: `bundle.traceability.plan.intent` si el plan es objeto; fixtures 03B usan string | PARTIAL |
| `requesting_user_id` | NO | PHYSICAL_UNKNOWN + BLOCKER |
| `requesting_role` | NO | PHYSICAL_UNKNOWN + BLOCKER |
| `channel` | NO. Contrato: canal no versiona IES; aún es campo obligatorio del contexto | PHYSICAL_UNKNOWN + BLOCKER |
| `plant_or_scope` | PARTIAL: a veces `observations[].entity` / `facts[].entity`; no hay campo de consulta | PARTIAL |
| `period` | PARTIAL: `facts[].period` / N1 `period`; no es periodo *solicitado* | PARTIAL |
| `resolved_entities` | PARTIAL: entidades en N1 si hay observations; vacío en `NO_CONOZCO` | PARTIAL. Forma 04 (resolution_rule, confidence) no siempre presente |
| `permission_restrictions` | NO | PHYSICAL_UNKNOWN + BLOCKER |
| `knowledge_effective_date` | NO. `produced_at` / `persisted_at` no están definidos como este campo | PHYSICAL_UNKNOWN |

**G2 REQUIRED** para reconciliar «entrada única = Snapshot» con campos obligatorios ausentes. Esta auditoría **no** elige envelope extra vs ampliar Bundle.

## D6 — IES identity / time

| Campo | Fuente hoy | Clasificación |
|-------|------------|---------------|
| `ies_id` | No existe | PHYSICAL_UNKNOWN. Inyectable `idFactory` es RECOMMENDATION, no aprobada |
| `ies_version` | No es `snapshot.version` (namespaces distintos: producto IES vs EKS) | PHYSICAL_UNKNOWN. Política monotónica IES no definida en runtime |
| `generated_at` | No. Reloj IES no existe | PHYSICAL_UNKNOWN. Clock inyectable = RECOMMENDATION |
| `valid_at` | No. No hay política = `generated_at` o `persisted_at` | PHYSICAL_UNKNOWN. No inventar |
| `expires_at` | Opcional / política institucional (`04` §2) | PHYSICAL_UNKNOWN. No inventar expiración. `null` en ejemplos §20 **no** es regla productiva |
| `snapshot_reference` | `snapshot.snapshot_id` | YES / CONTRACTUAL |
| `knowledge_snapshot_version` | `snapshot.version` | YES / CONTRACTUAL |
| `schema_version` | Constante contractual `"1.0"` | CONTRACTUAL (no sale del Snapshot) |

## D7 — status projection

**CONTRACTUAL.** `04` §15 tabla:

| coverage_token | coverage_state | status |
|----------------|----------------|--------|
| `COV_FULL_KNOWLEDGE` | `CONOZCO` | `VALIDATED` |
| `COV_PARTIAL_KNOWLEDGE` | `CONOZCO_PARCIALMENTE` | `PARTIAL` |
| `COV_DATA_CONFLICT` | `EXISTE_CONFLICTO` | `CONFLICTED` |
| `COV_NO_KNOWLEDGE` | `NO_CONOZCO` | `NO_KNOWLEDGE` |

Bundle aporta `knowledge_coverage` como **estado constitucional**. El token `COV_*` es proyección 1:1 (`04` §4 y §24). No hay quinto estado.

**PHYSICAL.** YES para el mapeo estado→token→status de **emisión**. Estados de ciclo `BUILDING` / `EXPIRED` / `SUPERSEDED` / `INVALID` no tienen máquina física IES. `EXPIRED`/`SUPERSEDED` dependen de vigencia/versionado IES (D15/D6) → PHYSICAL_UNKNOWN, no bloquean un IES de emisión puntual si se queda en los cuatro status de emisión.

## D8 — executive_summary_facts

**CONTRACTUAL.** Derivado mecánicamente; referencias controladas; debe incluir hechos prioritarios según materiality/priority **ya proyectados**, diagnósticos principales, conflictos críticos (todo Tipo E), cobertura y límites. Prohibido redactar, calcular materiality, usar ejemplos como regla.

**PHYSICAL.** Bundle no tiene `executive_summary_facts`. Facts no tienen `priority`. Materiality vigente = `MATERIALITY_NOT_ASSESSED` (no hay ranking MAT_*). Evidence/diagnoses = `[]`. No hay catálogo congelado de `statement_token` (SUM_* solo en §20 ilustrativo).

**PHYSICAL_UNKNOWN + BLOCKER.** Construir el resumen exige regla de selección/prioridad o un catálogo tokenizado. **No se inventó.** G2 REQUIRED para tokens/selección, o decisión humana de resumen mínimo fail-closed (p. ej. solo refs a limitation/conflict existentes) — esa opción es RECOMMENDATION, no aprobada.

## D9 — source_health projection

**CONTRACTUAL.** Tabla `04` §11: `ACQUIRED_OK→DATA_AVAILABLE`, `ACQUIRED_EMPTY→DATA_NOT_FOUND`, resto identidad. `ABSENCE_CONFIRMED` no es `execution_status`.

**PHYSICAL.** PARTIAL.

- `bundle.source_health`: mapa `domain|tool_id → AcquisitionStatus` (no array; a menudo sin `tool_id` si la clave es domain).
- `bundle.traceability.acquisition`: `[{ tool_id, domain, status }]` en runtime EB — mejor fuente para `tool_id`+`domain`+status.
- Faltan en Bundle: `scope_complete`, `validation_state`, `error_code`, `latency_ms`, `restrictions`, `raw_payload_reference` a nivel status (este último sí en N1 si hay record).

Mapeo de enum: CONTRACTUAL, aplicable a los status que sí están. Completar el objeto IES `source_health[]` al 100% = PHYSICAL_UNKNOWN (no ampliar OP/EB en esta tarea).

## D10 — Internal reference validation

**CONTRACTUAL.** IES no crea conocimiento; valida que evidence→facts, diagnoses→facts/evidence, conflicts→facts, summary→IDs existentes (`04` invariantes 7–9; §20 nota de ejemplos).

**PHYSICAL / RECOMMENDATION (no aprobada).** Validación estructural posible sobre el IES **ya proyectado**: existencia de IDs, no dangling refs. Hoy `evidence`/`diagnoses` vacíos → vacuamente válidos. `conflicts[].facts_in_tension` apunta a `fact_id` del Bundle cuando hay Tipo A. Summary no existe aún. No se autoriza crear knowledge para “arreglar” refs.

## D11 — Materiality projection

**CONTRACTUAL.** IES solo copia. `highest_materiality_detected` = máximo de `MAT_*` ya evaluados; ignora `MATERIALITY_NOT_ASSESSED`; bancos vacíos → `MATERIALITY_NOT_ASSESSED`. ≠ `MAT_LOW`.

**PHYSICAL.** Facts EB: `materiality: "MATERIALITY_NOT_ASSESSED"`, `applied_materiality_rule_id: null`. Evidence/diagnoses vacíos. Resultado determinista: `MATERIALITY_NOT_ASSESSED`. G8 no se calibra.

## D12 — Conflict Tipo E visibility

**CONTRACTUAL.** `CONF_TYPE_E_GOVERNANCE` no se omite ni se suaviza; debe aparecer en `conflicts` **y** `executive_summary_facts`. IES no muta `resolution_status`.

**PHYSICAL.** EB conserva conflictos en el Bundle; test «Tipo E no se suaviza ni oculta» usa `primary_type: "E"`. Proyección letra→`CONF_TYPE_*` está en `04` §24 (1:1) pero **no** está aplicada en runtime. EB no emite `severity` independiente ni `governance_reason` tipificado más allá de `governance_escalation`.

**PARTIAL** en banco de conflictos. **PHYSICAL_UNKNOWN + BLOCKER** para la obligación de incluir Tipo E en el resumen (depende de D8). No se inventó narrativa.

## D13 — OFFICIAL / ALTERNATIVE

**CONTRACTUAL.** `OFFICIAL` ⇒ `alternative_context=null`. `ALTERNATIVE` exige objeto §14 y nunca sustituye al oficial. Motor §11: reevaluación auditable (usuario, parámetro, valores, motivo, vínculo).

**PHYSICAL.** Snapshot/Bundle no tienen `ies_type`, `alternative_of`, `requested_by`, overrides, comparación. No hay almacén de IES oficiales al que referenciar.

**PHYSICAL_UNKNOWN + BLOCKER** para ALTERNATIVE. OFFICIAL como default de un build sin metadata de reevaluación es RECOMMENDATION, no aprobada. **No se inventaron reglas ALTERNATIVE.** G2 REQUIRED si 04/03 deben declarar dónde vive esa metadata.

## D14 — Integrity

**CONTRACTUAL.** `signature=null`; `signature_status=NOT_IMPLEMENTED`; digest ≠ firma; canonicalización **pendiente de congelar** (`04` §16, §23.5). `03` D7: integrity EKS = digest del Bundle, no firma IES.

**PHYSICAL.** `snapshot.integrity` = `sha256:` del Bundle canónico EKS (`canonicalJson` ordenando claves). Eso **no** satisface `integrity.canonical_representation` ni `content_fingerprint` del **IES**.

**PHYSICAL_UNKNOWN + BLOCKER** para freeze de canonicalización IES. **G2 REQUIRED** para escribir el algoritmo en `04` (el propio `04` lo deja pendiente). Esta auditoría **no** congela SHA-256 ni JSON canónico como obligación IES.

**CONTRACTUAL (implementable sin G8):** emitir `signature: null` y `signature_status: NOT_IMPLEMENTED`. Copiar `snapshot_reference` coincidente con la raíz.

## D15 — Versioning / lifecycle / persistence

**CONTRACTUAL.** IES emitido inmutable; reproyección = nueva versión / nuevo `ies_id`; histórico append-only **a nivel de versiones de IES** (`04` §13); canal no versiona. No hay tabla, DB ni repositorio IES nombrados.

**PHYSICAL_UNKNOWN.** Construcción en memoria vs persistencia IES no está decidida. **No se infirió SQL/tabla.** `snapshot.version` no es `ies_version`.

**RECOMMENDATION (no aprobada).** IMPL mínimo futuro: construir IES en memoria contra Snapshot in-memory, como EB/EKS de prueba; persistencia IES en tarea posterior. No es `APPROVED`.

**BLOCKER** solo si HUMAN_APPROVER exige persistencia IES en IMPL-IES-001 sin contrato de almacén — hoy el contrato no obliga un motor concreto.

## D16 — Determinism

Ver §7. Repetibilidad contractual: mismo Snapshot + esquema + rulesets (`04` §1), no absoluta.

## D17 — NO_KNOWLEDGE / NO_CONOZCO

**CONTRACTUAL.** IES `COV_NO_KNOWLEDGE` válido con facts/evidence/diagnoses vacíos (`04` §12, invariante 15). `03` §3: Snapshot sin diagnósticos permitido. Constitución IV: `NO_CONOZCO` no es error.

**PHYSICAL.** YES para bancos vacíos + coverage string `NO_CONOZCO`:

- Fixture EKS `case-b-03b.json` (ilustrativo).
- Integración OP-EB-EKS `source-not-integrated.json` → Bundle `NO_CONOZCO`, facts/evidence/diagnoses/observations `[]`, Snapshot válido.
- EB: `SOURCE_NOT_INTEGRATED` no se convierte en hecho; `ACQUIRED_EMPTY` ≠ `ABSENCE_CONFIRMED`.

**PARTIAL** para IES raíz completo: faltan `query_context`, `limitations` tokenizadas, `executive_summary_facts` (ejemplo B usa `SUM_NO_KNOWLEDGE` ilustrativo — no regla). Un IES `NO_KNOWLEDGE` **estructuralmente honesto** es posible solo para los campos que sí tienen fuente; no se completó el resto por inferencia.

## D18 — Runtime gaps

Ver matriz §6.

---

# 5. Mandatory field-source matrix

| field | contract_requirement | physical_source_today | available_today | transformation_allowed | authority_owner | classification | notes |
|-------|----------------------|----------------------|-----------------|------------------------|-----------------|----------------|-------|
| `ies_id` | Obligatorio; único | Ninguna | NO | Generar id opaco; no epistemología | 04; id no congelado | PHYSICAL_UNKNOWN | idFactory inyectable = RECOMMENDATION |
| `ies_type` | OFFICIAL \| ALTERNATIVE | Ninguna | NO | No inferir ALTERNATIVE | 04 §13–14; Motor §11 | PHYSICAL_UNKNOWN | Default OFFICIAL no aprobado |
| `schema_version` | `1.0` | Constante 04 | YES | Copia literal | 04 | CONTRACTUAL | |
| `ies_version` | Monotónica de producto IES | No es `snapshot.version` | NO | No reusar versión EKS en silencio | 04 §1, §15 | PHYSICAL_UNKNOWN | |
| `status` | Ciclo §15 | Derivado de `bundle.knowledge_coverage` para emisión | PARTIAL | Mapeo 1:1 §15; no EXPIRED/SUPERSEDED | 04 §15 | CONTRACTUAL + PARTIAL | Emisión YES; vigencia NO |
| `generated_at` | Momento de proyección | Ningún reloj IES | NO | Clock inyectable; no semántica | 04 §2 | PHYSICAL_UNKNOWN | |
| `valid_at` | Instantánea de validez | No definido vs `produced_at`/`persisted_at` | NO | No igualar por conveniencia | 04 §1 vigencia | PHYSICAL_UNKNOWN | |
| `expires_at` | Opcional / política | Ninguna política | NO | No inventar expiración | 04 §2; institucional | PHYSICAL_UNKNOWN | `null` ilustrativo ≠ regla |
| `snapshot_reference` | `{ snapshot_id, … }` | `snapshot.snapshot_id` | YES | Copia | 03 + 04 | CONTRACTUAL | |
| `knowledge_snapshot_version` | Versión Snapshot EKS | `snapshot.version` | YES | Copia | 03 D3 | CONTRACTUAL | |
| `query_context` | Objeto §3 obligatorio | Solo `trace_id` + question/intent parciales | PARTIAL | No inventar usuario/canal/permisos | 04 §3 vs entrada única | PHYSICAL_UNKNOWN + BLOCKER | G2 REQUIRED |
| `executive_scope` | Planta/periodo/entidades/modelos | No hay objeto; fragmentos en plan/entity | NO | No sintetizar modelos mentales | 04 §2 | PHYSICAL_UNKNOWN | Ejemplo §20 no es schema |
| `knowledge_coverage` | Objeto COV_* + listas | String constitucional; sin listas de dominios estructuradas | PARTIAL | Token 1:1 YES; covered/unavailable/failed lists = inferencia no autorizada | Constitución IV; 04 §4; EB aplica | CONTRACTUAL + PARTIAL | `highest_materiality_detected` YES (NOT_ASSESSED) |
| `executive_summary_facts` | Refs tokenizadas §5 | No existe | NO | No inventar prioridad ni SUM_* | 04 §5 | PHYSICAL_UNKNOWN + BLOCKER | G2 / catálogo |
| `facts` | Lista; puede `[]` | `bundle.facts[]` | PARTIAL | Proyectar campos existentes; no inventar statement_token/priority/validity | 02 + 04 §6 | PARTIAL | N2 mínimo: fact_id, metric, value, entity, supporting_observation_ids, confidence dims null, MATERIALITY_NOT_ASSESSED |
| `evidence` | Lista; puede `[]` | `bundle.evidence[]` = `[]` runtime | YES (vacío fail-closed) | No inventar N3 | 02 D3; 04 §7 | CONTRACTUAL | Registry vacío |
| `diagnoses` | Lista; puede `[]` | `bundle.diagnoses[]` = `[]` runtime | YES (vacío fail-closed) | No inventar N4 | 02; 04 §8; 03 §3 | CONTRACTUAL | |
| `conflicts` | Lista; Tipo E visible | `bundle.conflicts[]` letras A–E | PARTIAL | Mapear catálogo §24 sin mutar resolution_status | 02 §11; 04 §9 | PARTIAL | Faltan severity/impact IES |
| `open_questions` | Lista tokenizada | Objetos EB: question/reason prosa; priority undeclared | PARTIAL | No inventar question_token ni blocks_hypothesis | 02; 04 §10 | PARTIAL | |
| `source_health` | Array §11 | Mapa + acquisition[] | PARTIAL | Enum §11 contractual; objeto completo NO | 03A + 04 §11 | PARTIAL | |
| `limitations` | Banco tokenizado §12 | No hay `limitations[]` | NO | No copiar ejemplos LIM_* | 04 §12 | PHYSICAL_UNKNOWN + BLOCKER | |
| `audit` | generated_by, engine_version, ruleset_version, source_snapshot_ids | `ruleset_versions` Bundle; snapshot_id | PARTIAL | `generated_by=ies_builder` contractual; engine_version Motor no existe | 04 §16 | PARTIAL | previous/supersedes IES: NO |
| `integrity` | canónico + fingerprint + signature null | Digest **Bundle** EKS ≠ IES | PARTIAL | signature null YES; canonical IES NO | 04 §16; 03 D7 | PHYSICAL_UNKNOWN + CONTRACTUAL | G2 para freeze canónico |
| `alternative_context` | Obligatorio si ALTERNATIVE; null si OFFICIAL | Ninguna | NO | No inventar overrides | 04 §14; Constitución VI | PHYSICAL_UNKNOWN | |

---

# 6. Runtime gap matrix

| gap_id | description | blocks_impl_ies_001 | requires_G2 | requires_G8 | recommended_resolution | authority_owner |
|--------|-------------|---------------------|-------------|-------------|------------------------|-----------------|
| G-IES-RT | No existe runtime IES Builder | YES | NO | NO | IMPL solo tras cerrar blockers; factory pura de proyección | 04; HUMAN_APPROVER |
| G-QC | query_context obligatorio ausente del Snapshot | YES | YES | NO | Humano elige: persistir contexto en Bundle/Snapshot **o** ampliar entrada 04. No elegido aquí | 04 §1 vs §3; 02/03 |
| G-SUM | executive_summary_facts sin regla ni catálogo de tokens | YES | YES | NO | Congelar tokens/selección fail-closed; no usar §20 como regla | 04 §5, §24 |
| G-LIM | limitations[] no existe en Bundle | YES | YES | NO | Definir proyección tokenizada desde coverage/source_health **en contrato**, o banco EB | 04 §12 |
| G-SCOPE | executive_scope no tiene objeto físico | YES | YES | NO | Schema mínimo en 04 o trazarlo desde plan/entity con G2 | 04 §2 |
| G-TOK | statement_token / question_token no catalogados productivamente | YES | YES | NO | Catálogo institucional; ejemplos §20 no valen | 04 §24 vs §20 |
| G-IDTIME | ies_id, ies_version, generated_at, valid_at, expires_at | YES (política) | PARTIAL | NO | Inyectar clock/idFactory; política de vigencia/expiración humana | 04 §1–2, §15 |
| G-ALT | Metadata ALTERNATIVE inexistente | YES para ALTERNATIVE; NO para solo OFFICIAL si se aprueba default | YES | NO | No implementar ALTERNATIVE hasta contrato de metadata | 04 §14; Motor §11 |
| G-CANON | Canonicalización IES pendiente | YES para integrity completo | YES | NO | Freeze en 04; no copiar canonicalJson EKS en silencio | 04 §16, §23.5 |
| G-SIG | Firma digital | NO para v1.0 | NO | YES (cuando se congele firma) | signature=null; NOT_IMPLEMENTED | 04 §16; G8 futuro |
| G-MAT | Ruleset materiality / k / wi | NO para proyección NOT_ASSESSED | NO | YES para MAT_* productivo | Copiar NOT_ASSESSED; no calibrar | Motor §7A; 02; G8 |
| G-N34 | evidence/diagnoses vacíos | NO (fail-closed permitido) | NO | NO | Permanecer vacío hasta reglas EB | 02 |
| G-SH | source_health IES array vs mapa Bundle | NO si se acepta proyección parcial desde acquisition[] | NO | NO | Mapear enum §11 desde traceability.acquisition | 04 §11; 02 emit |
| G-CONF | Letra A–E vs CONF_TYPE_* ; campos IES faltantes | NO para visibilidad en conflicts[]; YES para resumen Tipo E | PARTIAL | NO | Proyección §24 si HUMAN_APPROVER la registra; no inventar severity | 02; 04 §9, §24 |
| G-PERS | Persistencia/versionado físico IES | NO si IMPL es solo memoria | YES si se exige almacén | NO | No inferir SQL | 04 §13; 03 no cubre IES |
| G-IDX | Índice declara runtimes pendientes de más capas | NO | NO | NO | Actualizar índice en tarea G2 aparte; no en esta | Índice |
| G-FX | Fixtures EKS 03B ≠ Bundle EB vigente | NO | NO | NO | No tratar 03B JSON como IES productivo | 03B; 03 D9 |
| G-CH | Channel / RE / chat | NO para proyección IES | NO | NO | Fuera de alcance | 05, 06 |

`requires_G2: PARTIAL` = G2 solo si se quiere congelar esa proyección **dentro** de un contrato; la auditoría no la congela.

---

# 7. Determinism and injected-dependency analysis

Dependencias que **romperían** repetibilidad verificable si se toman del ambiente:

| Dependencia | ¿Existe hoy? | ¿Debe ser inyectable? | Clasificación |
|-------------|--------------|----------------------|---------------|
| Reloj (`generated_at` / `valid_at`) | No | Sí, si se implementa proyección temporal | PHYSICAL_UNKNOWN + RECOMMENDATION |
| `idFactory` (`ies_id`) | No | Sí | RECOMMENDATION |
| Asignación `ies_version` | No | Política humana | PHYSICAL_UNKNOWN |
| Política `expires_at` | No | No inventar | PHYSICAL_UNKNOWN |
| Rulesets EB | Sí, vacíos / version string | Ya en Bundle `ruleset_versions` | CONTRACTUAL copia |
| Canonicalización IES | No congelada | No implementar algoritmo propio | PHYSICAL_UNKNOWN; G2 |
| UUID EKS `snapshot_id` | Sí (crypto.randomUUID) | Ya persistido; IES lo copia | Hecho EKS; no re-generar |
| Digest EKS Bundle | Sí, determinista sobre Bundle | Distinto del fingerprint IES | CONTRACTUAL separación |
| Selección de resumen | No | No inyectar heurística | BLOCKER |
| Canal / usuario | No en Snapshot | Extra-input = G2 | BLOCKER D5 |
| LLM | Prohibido | N/A | CONTRACTUAL |

`04` exige repetibilidad bajo **mismo Snapshot, esquema y rulesets**, no absoluta. Un reloj no inyectado viola esa cláusula.

---

# 8. OFFICIAL / ALTERNATIVE physical readiness

| Requisito | ¿Listo? |
|-----------|---------|
| Distinción de tipos en contrato | YES (CONTRACTUAL) |
| `alternative_context=null` en OFFICIAL | YES como regla; NO como campo persistido |
| `alternative_of` + auditoría Motor | NO fuente física |
| Almacén de IES oficial referenciable | NO |
| Impugnación no altera procedencia N1 | CONTRACTUAL; N1 en Snapshot sí preserva autoría si se proyecta sin sustituir |
| Canal no crea versión | CONTRACTUAL; no hay runtime de canal IES |

**Readiness:** OFFICIAL no implementable de extremo a extremo sin D5/D6/D8. ALTERNATIVE **no** implementable. No se inventaron reglas.

---

# 9. Integrity / canonicalization readiness

| Pieza | Estado |
|-------|--------|
| `signature: null` | CONTRACTUAL; implementable sin G8 |
| `signature_status: NOT_IMPLEMENTED` | CONTRACTUAL |
| Digest ≠ firma | CONTRACTUAL (`04` + `03` D7) |
| `snapshot.integrity` | Huella del **Bundle**; reutilizable solo como dato de almacén, no como fingerprint IES |
| `canonical_representation` IES | PHYSICAL_UNKNOWN; 04 §23.5 diferida; **G2 REQUIRED** para freeze |
| Algoritmo de firma | Diferido; G8 futuro |

Prohibido afirmar firma digital implementada. Esta auditoría no congela canonicalización.

---

# 10. Fail-closed and NO_KNOWLEDGE readiness

| Invariante | ¿Demostrado en cadena actual? | ¿Proyectable a IES hoy? |
|------------|-------------------------------|-------------------------|
| `NO_CONOZCO` válido | YES (EB + EKS + integración) | PARTIAL (bancos vacíos + token COV YES; query_context/summary/limitations NO) |
| SOURCE_NOT_INTEGRATED ≠ hecho | YES | YES si se copia facts `[]` y source_health |
| ACQUIRED_EMPTY ≠ ABSENCE_CONFIRMED | YES | YES (no elevar) |
| TOOL_ERROR ≠ hecho | YES | YES |
| MATERIALITY_NOT_ASSESSED ≠ MAT_LOW | YES en facts | YES `highest_materiality_detected` |
| Sin RESOLVED inventado | YES (registry vacío) | YES (copiar resolution_status) |
| Tipo E no oculto en Bundle | YES (test EB) | PARTIAL (conflicts sí; summary no) |
| Sin hipótesis | YES | YES (no generar) |
| Procedencia N1 hasta Snapshot | YES | YES referenciar; no sustituir `content_author_id` |

Un Snapshot `NO_CONOZCO` **puede** originar un IES `NO_KNOWLEDGE` válido **en los campos de bancos/cobertura/status**. No es un IES raíz §2 completo sin cerrar D5/D8/limitations.

---

# 11. Contractual facts

1. IES v1.0 APROBADO PARA CONGELAMIENTO; runtime pendiente.
2. Productor = IES Builder; entrada = Knowledge Snapshot; no fuentes, no tools, no N2–N5 nuevos, no LLM, no prosa.
3. IES ≠ Bundle ≠ Snapshot. Canal no versiona. OFFICIAL ≠ ALTERNATIVE.
4. `COV_*` ↔ cuatro estados constitucionales, 1:1. Sin `COV_TOTAL_IGNORANCE`.
5. Materiality solo se proyecta. `MATERIALITY_NOT_ASSESSED` ≠ `MAT_LOW`.
6. `ABSENCE_CONFIRMED` es la única ausencia que permite hecho negativo; no es `execution_status`.
7. Tipo E no se suaviza ni se omite del resumen.
8. `resolution_status` se proyecta; IES no lo muta. Namespace `status` IES ≠ `conflicts[].resolution_status`.
9. `signature=null`; `signature_status=NOT_IMPLEMENTED`; huella ≠ firma.
10. Correlación ≠ causalidad.
11. Snapshot `NO_CONOZCO` / sin diagnósticos es camino válido (`03` §3).
12. Cadena física OP→EB→EKS está demostrada con fixtures sintéticos; procedencia y fail-closed se preservan hasta Snapshot.

---

# 12. Physical unknowns

1. Cómo obtener `query_context` obligatorio sin violar entrada única (D5). **G2 REQUIRED.**
2. Forma de `executive_scope`.
3. Regla mecánica de `executive_summary_facts` y catálogo `statement_token`. **G2 REQUIRED.**
4. Banco `limitations[]` tokenizado. **G2 REQUIRED.**
5. Origen de `ies_id` / `ies_version` / `generated_at` / `valid_at` / `expires_at`.
6. Default `ies_type=OFFICIAL` y metadata ALTERNATIVE. **G2** si se congela.
7. Canonicalización IES. **G2 REQUIRED** (`04` ya lo declara pendiente).
8. Persistencia física de IES (si aplica).
9. Compleción de `knowledge_coverage` listas (covered/unavailable/failed/unresolved) sin inferir dominios no listados.
10. Proyección letra A–E → `CONF_TYPE_*` como realización registrada.
11. Campos IES de fact/open_question/conflict no presentes en Bundle (`priority`, `validity`, `blocks_hypothesis`, `severity` IES, etc.).
12. `engine_version` del Motor (no hay runtime Motor).

---

# 13. Recommendations requiring approval

Ninguna queda APPROVED.

1. Factory `createIesBuilder(deps).build(snapshot, options)` pura, inyectable, sin `server.js`.
2. Leer solo Snapshot público EKS + Bundle opaco (D3).
3. Mapear `bundle.knowledge_coverage` → `COV_*` → `status` según `04` §15.
4. Mapear `traceability.acquisition[].status` → `execution_status` según `04` §11.
5. Copiar `materiality` y calcular `highest_materiality_detected` como max vacío → `MATERIALITY_NOT_ASSESSED`.
6. Emitir `signature: null` / `NOT_IMPLEMENTED`.
7. Clock e `idFactory` inyectables.
8. IMPL mínimo en memoria; persistencia IES después.
9. No implementar ALTERNATIVE en el primer IMPL.
10. Resumen fail-closed mínimo (solo refs a conflicts Tipo E y open_questions existentes) **si** HUMAN_APPROVER lo aprueba — hoy es BLOCKER sin esa aprobación.

---

# 14. Blockers for IMPL-IES-001

1. **G-QC / D5:** `query_context` incompleto vs entrada única. **G2 REQUIRED. Detenido; no resuelto.**
2. **G-SUM / D8 / D12:** no hay proyección mecánica del resumen ni garantía contractual implementable de Tipo E **en** `executive_summary_facts` sin catálogo/regla.
3. **G-LIM:** `limitations` obligatorio sin fuente.
4. **G-SCOPE:** `executive_scope` sin fuente.
5. **G-TOK:** tokens de statement/pregunta/limitación no congelados (ejemplos ≠ reglas).
6. **G-IDTIME:** identidad y vigencia IES sin política física.
7. **G-CANON / D14:** canonicalización IES pendiente en `04`. **G2 REQUIRED. Detenido; no resuelto.**
8. **G-ALT:** ALTERNATIVE sin metadata (bloquea ese tipo, no necesariamente un OFFICIAL mínimo si los demás blockers se cierran).

G8 **no** bloquea un IES fail-closed con `MATERIALITY_NOT_ASSESSED` y `signature=null`. Calibrar MAT_* o firma **sí** exigiría G8.

---

# 15. Gate assessment

| Gate | Estado en CURRENT_TASK | Hallazgo de esta auditoría |
|------|------------------------|----------------------------|
| G1 | AUTHORIZED (humano) | Usado. Campos G1 no tocados |
| G2 | PENDING_IF_REQUIRED | **REQUIRED** para D5, D8/tokens, D13 (si ALTERNATIVE), D14 canonicalización, y posiblemente executive_scope/limitations. **No ejecutado. No autoaprobado.** Decisiones no resueltas |
| G3 | N/A | No se creó contrato nuevo |
| G8 | N/A | No se calibró. Gaps G-MAT y G-SIG reportados |

Esta tarea **no** autoriza G2. El implementador se detuvo respecto de esas decisiones.

---

# 16. Proposed next task — informational only

No se crea ni autoriza IMPL-IES-001.

Informativo: HUMAN_APPROVER podría, con **G1+G2 nuevos**, registrar realización física IES en `04` (y si aplica `02`/`03`) cerrando D5, D8, limitations/scope, identidad temporal y canonicalización. Solo **después** un G1 distinto podría autorizar IMPL-IES-001. Esta línea **no** es G5.

---

# 17. STOP

Auditoría ARCH-IES-PHYSICAL-DECISIONS-001 cerrada. Espera revisión humana.  
Sin runtime IES. Sin modificación de contratos. Sin recomendaciones autoaprobadas. Sin commit, push, merge ni siguiente tarea.
