# Reporte — ARCH-IES-PHYSICAL-DECISIONS-002

```yaml
task_id: "ARCH-IES-PHYSICAL-DECISIONS-002"
outcome: "DONE"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/director-ia/03-EXECUTIVE-KNOWLEDGE-STORE.md"
  - "docs/director-ia/04-IES-STANDARD.md"
  - "docs/dev-loop/reports/ARCH-IES-PHYSICAL-DECISIONS-002.md"
files_not_touched:
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md"
  - "docs/director-ia/02-EVIDENCE-BUILDER.md"
  - "docs/director-ia/03A-OBSERVATION-PIPELINE.md"
  - "docs/director-ia/03B-END-TO-END-REFERENCE-FLOWS.md"
  - "docs/director-ia/05-REASONING-ENGINE.md"
  - "docs/director-ia/06-CHANNEL-PROJECTION.md"
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md"
  - "docs/dev-loop/reports/ARCH-IES-PHYSICAL-DECISIONS-001.md"
  - "lib/"
  - "test/"
  - "fixtures/"
  - "server.js"
  - "package.json"
  - "sql/"
contracts_consulted:
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md"
  - "docs/director-ia/02-EVIDENCE-BUILDER.md"
  - "docs/director-ia/03-EXECUTIVE-KNOWLEDGE-STORE.md"
  - "docs/director-ia/03A-OBSERVATION-PIPELINE.md"
  - "docs/director-ia/04-IES-STANDARD.md"
  - "docs/dev-loop/reports/ARCH-IES-PHYSICAL-DECISIONS-001.md"
contracts_modified:
  - "docs/director-ia/03-EXECUTIVE-KNOWLEDGE-STORE.md"
  - "docs/director-ia/04-IES-STANDARD.md"
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "IMPL-IES-001 permanece no autorizado. Este reporte no es G5."
secrets_check: "none"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED. Este reporte no abre IMPL-IES-001."
  - "G8 permanece N/A. No se calibró materiality, k, wi, Fs ni firma."
```

## Ejecución

- Rama: `architecture/ies-physical-decisions-002` (≠ `main`; no se cambió de rama).
- G1 intacto: `authorized_by`, `authorized_at`, `human_authorization` no modificados por el implementador.
- G2 leído: `AUTHORIZED` (humano); usado solo para `03` y `04` dentro del scope permitido.
- G3: `N/A`. G8: `N/A`; no se calibró.
- Transición: `AUTHORIZED` → `IN_PROGRESS` (solo `status`) → registro contractual + este reporte → `DONE_PENDING_REVIEW` (solo `status`).
- `max_attempts: 1`. Sin runtime IES. Sin tests. Sin fixtures. Sin persistencia IES. Sin ALTERNATIVE. Sin firma. Sin commit, push, merge. Sin IMPL-IES-001.

No se encontró contradicción con Constitución ni contratos superiores. Las decisiones se registraron **sin reinterpretarlas ni ampliarlas**.

---

## Decisiones registradas

Únicamente `proposed_human_decisions` / `implementation_readiness_decisions` de `CURRENT_TASK.md`.

| ID CURRENT_TASK | Token registrado | Dónde |
|-----------------|------------------|-------|
| D5_query_context_snapshot_boundary | SNAPSHOT_CARRIES_QUERY_CONTEXT_METADATA | `03` §8; `04` §1, §3, §25 |
| D5_snapshot_contract_extension | MINIMAL_QUERY_METADATA_EXTENSION | `03` §3, §8 |
| D14_canonicalization | JCS_LIKE_DETERMINISTIC_CANONICAL_JSON_V1 / CANONICAL_JSON_V1 | `04` §16, §25 |
| D14_content_fingerprint | DETERMINISTIC_DIGEST_IMPLEMENTATION_NOT_SIGNATURE | `04` §16 |
| D14_integrity_verification | RECOMPUTABLE_FINGERPRINT | `04` §16 |
| D14_generated_fields | GENERATE_THEN_FINGERPRINT | `04` §16 |
| builder_interface | FACTORY_WITH_INJECTED_CLOCK_AND_ID_FACTORY | `04` §25 |
| first_runtime_scope | OFFICIAL_IN_MEMORY_PROJECTION_FIRST | `04` §25 |
| ies_version_initial | INITIAL_VERSION_1 | `04` §25 |
| expiration | EXPIRES_AT_NULL_UNTIL_POLICY | `04` §25 |
| alternative_context | OFFICIAL_ONLY_V1 | `04` §25 |
| summary | FAIL_CLOSED_CONTROLLED_REFERENCES | `04` §5, §25 |
| limitations | PROJECT_ONLY_EXPLICIT_LIMITATIONS | `04` §12, §25 |
| executive_scope | PROJECT_FROM_QUERY_METADATA_AND_SNAPSHOT_SCOPE | `04` §25 |

---

## Diff contractual exacto

### `03-EXECUTIVE-KNOWLEDGE-STORE.md` (1.3 → 1.4)

- Cabecera: versión 1.4; estado menciona `query_context_metadata`.
- §1: EKS no reinterpreta `query_context_metadata`.
- §3: campo Snapshot `query_context_metadata`.
- §4: `append_snapshot` la persiste sin interpretarla; prohibición añadida.
- §5: IES consume Snapshot con esa metadata; sin segunda entrada operacional.
- §6: invariante 8.
- §7 **D1–D9: tabla intacta** (P1, R3, V2, G_LATEST, L_TRACE, M1, I_DIGEST, POOL_DEDICATED, O_EKS_FIRST).
- §8 **nuevo:** extensión mínima; campos de `query_context_metadata`; propiedad/tránsito; prohibiciones; D2/R3 no se sustituye; D7 sigue siendo digest del Bundle.

### `04-IES-STANDARD.md` (esquema raíz v1.0 intacto)

- Cabecera/estado: realización física D5/D14/readiness registrada.
- Índice: §25.
- §1 entrada única: Snapshot incluye `query_context_metadata`; sin segunda entrada operacional.
- §3: origen físico de `query_context` (tabla de campos §3 **no** cambió).
- §5: readiness FAIL_CLOSED_CONTROLLED_REFERENCES (tokens `SUM_*` de §20 siguen ilustrativos).
- §12: PROJECT_ONLY_EXPLICIT_LIMITATIONS (`LIM_*` de §20 siguen ilustrativos).
- §16: CANONICAL_JSON_V1 congelada; alcance include/exclude; digest ≠ firma; `signature=null`; `signature_status=NOT_IMPLEMENTED`.
- §21: invariantes 22–23.
- §23 pendientes: canonicalización ya no diferida; se añaden persistencia IES / ALTERNATIVE / expiración como diferidos.
- §24 integridad: token `CANONICAL_JSON_V1`.
- §25 **nuevo:** tabla D5/D14 + readiness R1–R8. No autoriza IMPL-IES-001.

---

## Confirmaciones de no-cambio

| Superficie | ¿Cambió? |
|------------|----------|
| Schema raíz IES v1.0 (§2 objeto) | NO |
| Coverage / tokens `COV_*` | NO |
| Taxonomía `CONF_TYPE_*` | NO |
| Materiality / `MAT_*` | NO |
| Bundle N1–N4 | NO |
| EKS D1–D9 | NO |
| Append-only / get / list / versionado EKS | NO (solo persiste metadata adicional) |
| Integrity EKS D7 (digest del Bundle) | NO |
| `signature` / `signature_status` | Siguen `null` / `NOT_IMPLEMENTED` |

---

## Definición final de `query_context_metadata`

Metadata **inmutable** de Snapshot, **fuera** del Bundle N1–N4. EKS persiste y no interpreta. IES proyecta `query_context` solo desde ahí.

Campos mínimos: `executive_query_id`, `query_fingerprint` (nullable/opcional), `trace_id`, `original_question`, `intent`, `requesting_user_id`, `requesting_role`, `channel`, `plant_or_scope` (cuando aplique), `period` (cuando aplique), `resolved_entities[]`, `permission_restrictions[]`, `knowledge_effective_date`.

Entrada única = Knowledge Snapshot: **preservada**.

---

## Definición final CANONICAL_JSON_V1

Token: `CANONICAL_JSON_V1`. Objetos con claves lexicográficas; arrays con orden contractual preservado; JSON UTF-8 determinístico sin espacios insignificantes; `null` explícito si el contrato lo exige; `undefined` prohibido; `NaN`/`Infinity` prohibidos; no inventar campos; no normalizar strings ni convertir números; no reordenar bancos.

### Alcance del fingerprint

**Incluye:** contenido semántico raíz del IES; `audit`; `integrity.snapshot_reference`; `integrity.signature_status`.

**Excluye:** `integrity.content_fingerprint`; `integrity.canonical_representation`; `integrity.signature`.

`content_fingerprint` = digest determinista recomputable de ese material. Algoritmo: nivel implementación. **No** es firma digital. Campos de identidad/`status`/tiempo se fijan **antes** de hashear (GENERATE_THEN_FINGERPRINT).

---

## Materias aún diferidas

- Runtime IES (IMPL-IES-001 no creado).
- Persistencia / almacén IES; supersesión durable.
- `ALTERNATIVE` productivo.
- Política institucional de expiración (`expires_at=null` hasta entonces).
- Catálogos productivos `SUM_*` / `FACT_*` / `LIM_*` / `OQ_*` (ejemplos §20 no son reglas).
- G8: `wi`, `k`, `Fs`, ventanas R, severity productiva, materiality ruleset, reglas causales, firma digital.
- Reasoning Engine / Channel Projection.

---

## Evaluación GO / NO-GO para IMPL-IES-001

**Esta tarea no crea ni autoriza IMPL-IES-001.**

| Antes (ARCH-IES-PHYSICAL-DECISIONS-001) | Ahora |
|-----------------------------------------|--------|
| NO-GO por D5 y D14 | D5 y D14 **cerrados en contrato** |

**GO contractual condicionado** (informativo): un futuro IMPL-IES-001 *podría* limitarse a proyección `OFFICIAL` en memoria desde Snapshot con `query_context_metadata`, factory con clock/`idFactory`, `ies_version=1`, `expires_at=null`, `alternative_context=null`, resumen/limitaciones fail-closed y CANONICAL_JSON_V1, **solo si** HUMAN_APPROVER emite un G1 nuevo.

Sigue **NO-GO** para: persistencia IES, ALTERNATIVE, firma, G8, canales, tools productivas.

---

## STOP

Registro ARCH-IES-PHYSICAL-DECISIONS-002 cerrado. Espera revisión humana.  
Sin runtime IES. Sin IMPL-IES-001. Sin commit, push, merge ni siguiente tarea.
