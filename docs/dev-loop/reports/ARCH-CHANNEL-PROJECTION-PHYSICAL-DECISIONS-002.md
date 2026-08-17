# Reporte — ARCH-CHANNEL-PROJECTION-PHYSICAL-DECISIONS-002

```yaml
task_id: "ARCH-CHANNEL-PROJECTION-PHYSICAL-DECISIONS-002"
outcome: "DONE"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/director-ia/06-CHANNEL-PROJECTION.md"
  - "docs/dev-loop/reports/ARCH-CHANNEL-PROJECTION-PHYSICAL-DECISIONS-002.md"
files_not_touched:
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md"
  - "docs/director-ia/02-EVIDENCE-BUILDER.md"
  - "docs/director-ia/03-EXECUTIVE-KNOWLEDGE-STORE.md"
  - "docs/director-ia/03A-OBSERVATION-PIPELINE.md"
  - "docs/director-ia/03B-END-TO-END-REFERENCE-FLOWS.md"
  - "docs/director-ia/04-IES-STANDARD.md"
  - "docs/director-ia/05-REASONING-ENGINE.md"
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
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md"
  - "docs/dev-loop/reports/ARCH-CHANNEL-PROJECTION-PHYSICAL-DECISIONS-001.md"
contracts_modified:
  - "docs/director-ia/06-CHANNEL-PROJECTION.md"
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "Ninguna autorizada. Este reporte no es G5. No se crea IMPL-CHANNEL-PROJECTION-001."
secrets_check: "none"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED. Este reporte no abre IMPL-CHANNEL-PROJECTION-001."
  - "G2 usado exclusivamente sobre 06-CHANNEL-PROJECTION.md. No se extendió a 04, 05, Constitución ni Architecture Index."
  - "G3 permanece N/A. 06 ya existía."
  - "G8 permanece N/A."
  - "Veredicto: GO físico para un futuro IMPL-CHANNEL-PROJECTION-001, condicionado a G5 y al alcance D17/D20. Esta tarea no lo crea ni lo autoriza."
```

## Ejecución

- Rama: `architecture/channel-projection-physical-decisions-002` (≠ `main`; no se cambió de rama).
- Encabezado G1+G2 ya coincidía con la autorización humana; el implementador no reescribió `authorized_by`, `authorized_at` ni `human_authorization`.
- G1 intacto: `HUMAN_APPROVER` / `2026-08-17T13:09:41-06:00` / `AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-17`.
- G2: `AUTHORIZED` (humano); usado **solo** para `docs/director-ia/06-CHANNEL-PROJECTION.md` dentro de `g2_contract_changes_authorized_if_approved`.
- G3: `N/A`. G8: `N/A`.
- Transición: `AUTHORIZED` → `IN_PROGRESS` (solo `status`) → registro contractual + este reporte → `DONE_PENDING_REVIEW` (solo `status`).
- `max_attempts: 1`. Sin runtime 06. Sin tests/fixtures Channel Projection. Sin templates, SSML, widgets, prompts ni integración real de canal. Sin LLM renderer. Sin memoria conversacional / WhoAmI / small talk. Sin commit, push, merge. Sin IMPL-CHANNEL-PROJECTION-001.

No se encontró incompatibilidad que exigiera modificar Constitución, `04`, `05`, crear N6, introducir semántica nueva o autorizar LLM renderer productivo. D1–D20 se registraron **sin reinterpretarlos ni ampliarlos**.

---

## 1. D1–D20 registradas

Únicamente `proposed_human_decisions` / `human_approval_scope` de `CURRENT_TASK.md`.

Los IDs D1–D20 de esta tabla son los de `ARCH-CHANNEL-PROJECTION-PHYSICAL-DECISIONS-002`. **No** sustituyen las decisiones semánticas D1–D3 de la cabecera de `06`.

| ID CURRENT_TASK | Token registrado | Dónde |
|-----------------|------------------|-------|
| D1_runtime_interface | CHANNEL_PROJECTION_FACTORY_V1 | `06` §1, §18 |
| D2_projection_model_schema | SERIALIZED_PROJECTION_MODEL_V1 | `06` §7, §18 |
| D3_semantic_type_catalog | SEMANTIC_TYPE_CATALOG_V1 | `06` §7, §18 |
| D4_content_class_mapping | DETERMINISTIC_CONTENT_CLASS_MAPPING_V1 | `06` §4, §18 |
| D5_priority | PRESENTATION_PRIORITY_V1 | `06` §7, §18 |
| D6_projection_depth | PROJECTION_DEPTH_POLICY_V1 | `06` §8, §18 |
| D7_critical_equivalence | CRITICAL_EQUIVALENCE_VALIDATION_V1 | `06` §7, §18 |
| D8_optional_reasoning | OPTIONAL_REASONING_NO_FILL_V1 | `06` §11, §18 |
| D9_progressive_disclosure | SAFE_PROGRESSIVE_DISCLOSURE_V1 | `06` §12, §18 |
| D10_channel_policy_registry | CHANNEL_POLICY_REGISTRY_V1 | `06` §6, §18 |
| D11_chat_policy | CHAT_POLICY_V1 | `06` §6, §18 |
| D12_voice_policy | VOICE_POLICY_V1 | `06` §6, §18 |
| D13_whatsapp_policy | WHATSAPP_POLICY_V1 | `06` §6, §18 |
| D14_dashboard_policy | DASHBOARD_POLICY_V1 | `06` §6, §18 |
| D15_report_policy | REPORT_POLICY_V1 | `06` §6, §18 |
| D16_presentation_policy | PRESENTATION_POLICY_V1 | `06` §6, §18 |
| D17_rendering_boundary | DETERMINISTIC_PROJECTION_FIRST_V1 | `06` §1, §14, §18 |
| D18_output_shape | CHANNEL_OUTPUT_ENVELOPE_V1 | `06` §1, §17, §18 |
| D19_tone_boundary | TONE_IS_PRESENTATION_ONLY_V1 | `06` §13, §18 |
| D20_first_runtime_scope | PROJECTION_MODEL_PLUS_NEUTRAL_RENDER_V1 | `06` §1, §18 |

---

## 2. Diff contractual conceptual

### `06-CHANNEL-PROJECTION.md` (schema semántico D1–D3 intacto; versión documental 1.0 conservada)

- Cabecera/estado: realización física D1–D20 registrada. No se escribió `APPROVED` ni `AUTHORIZED_BY_HUMAN`.
- Tabla semántica D1–D3 **intacta**; nota de que §18 no la sustituye.
- Índice: §18.
- §1: interfaz futura `createChannelProjection({ policyRegistry, clock? })` / `project({ ies, reasoningResult?, reasoningRunId?, channel, projectionDepth })`. Primer runtime determinístico sin LLM. No es runtime.
- §4: mapeo determinístico de `content_class` + precedencia de clase más estricta.
- §6: registry de seis superficies (`CHAT`/`VOICE`/`WHATSAPP`/`DASHBOARD`/`REPORT`/`PRESENTATION`) como políticas, no pipelines.
- §7: `SERIALIZED_PROJECTION_MODEL_V1` congelado; correspondencia conceptual → serializado (`disclosure` se realiza con `may_defer` + `deferred_items`; `source_reference` con `source_type`+`source_id`). `PRESENTATION_PRIORITY_V1`. `CRITICAL_EQUIVALENCE_VALIDATION_V1`.
- §8: `PROJECTION_DEPTH_POLICY_V1` (L0–L3 físicos). L0–L3 siguen sin ser N1–N5.
- §11: `OPTIONAL_REASONING_NO_FILL_V1`.
- §12 invariante 7: `SAFE_PROGRESSIVE_DISCLOSURE_V1`.
- §13: `TONE_IS_PRESENTATION_ONLY_V1`.
- §14: prohibiciones añadidas — no LLM productivo en primer runtime; no memoria conversacional/WhoAmI/small talk; no N6.
- §16: esquema serializado deja de estar «pendiente»; permanecen diferidos runtime, SSML/widgets/templates, índice, firma IES, G8, LLM conversacional, integración real de canal.
- §17: artefacto = `SERIALIZED_PROJECTION_MODEL_V1`; salida = `CHANNEL_OUTPUT_ENVELOPE_V1`; runtime sigue PENDIENTE; no autoriza IMPL-CHANNEL-PROJECTION-001.
- §18 **nuevo:** tabla D1–D20 + tokens + restricción de ausencia N3/N4/N5 + límites.

Nada de lo anterior crea semántica nueva ni altera verdad. 06 sigue transformando formato, densidad, secuencia, tono e interactividad.

---

## 3. Confirmación N1–N5 e IES/RE intactos

| Superficie | ¿Cambió? |
|------------|----------|
| Constitución / EKE / `02` / `03` / `03A` / `03B` / `04` / `05` / índice | NO |
| Cinco niveles / N1–N5 | NO |
| Nivel 6 | NO creado |
| Schema IES v1.0 | NO |
| Contrato RE v1.0 / D1–D10 semánticos / §26 físico | NO |
| Coverage / `COV_*` | NO |
| Taxonomía `CONF_TYPE_*` | NO |
| Materiality / `MAT_*` / `k` / `wi` / `Fs` | NO |
| IES Builder / Reasoning Engine / OP / EB / EKS | NO |
| `server.js` / `package.json` | NO |
| Runtime Channel Projection / tests / fixtures | NO |
| LLM renderer productivo | NO autorizado |
| Memoria conversacional / WhoAmI / small talk | NO autorizado |

Channel Projection permanece capa Interfaces (Constitución X). No modifica N1–N5. No convierte hipótesis en hechos. No recalcula coverage/materiality/confidence/severity. No resuelve conflictos. No fabrica Reasoning.

---

## 4. Projection Model final (`SERIALIZED_PROJECTION_MODEL_V1`)

Campos raíz: `projection_id`, `ies_id`, `ies_version`, `reasoning_run_id`, `channel`, `projection_depth`, `items`, `critical_invariants`, `deferred_items`, `limitations`, `audit`.

Campos de ítem: `item_id`, `source_type`, `source_id`, `semantic_type`, `content_class`, `priority`, `statement_or_reference`, `supporting_references`, `must_preserve`, `may_summarize`, `may_defer`.

`IRRENUNCIABLE` no puede tener `may_defer=true` ni quedar en revelación progresiva.

---

## 5. `semantic_type` final (`SEMANTIC_TYPE_CATALOG_V1`)

Enum cerrado: `COVERAGE`, `FACT`, `EVIDENCE`, `DIAGNOSIS`, `CONFLICT`, `OPEN_QUESTION`, `SOURCE_HEALTH`, `LIMITATION`, `ABSTENTION`, `INTERPRETATION_KNOWN`, `INTERPRETATION_INFERRED`, `INTERPRETATION_NOT_CONCLUDED`, `HYPOTHESIS`, `RECOMMENDATION`, `NEXT_VERIFICATION`, `DECISION_OPTION`, `CLARIFICATION_REQUEST`, `AUDIT_REFERENCE`.

Describe tipos ya existentes en IES/RE. No crea nivel epistemológico.

La derivación banco existente → token (p. ej. `facts[]` → `FACT`) es aplicación del catálogo cerrado, no una lista nueva de tipos.

---

## 6. `priority` final (`PRESENTATION_PRIORITY_V1`)

Enum: `P0_CRITICAL`, `P1_HIGH`, `P2_NORMAL`, `P3_DETAIL`.

Solo exposición. No es `materiality`, `severity`, `confidence`, `hypothesis_strength` ni ranking empresarial.

Defaults: `IRRENUNCIABLE` → `P0_CRITICAL`; `OBLIGATORIO_RESUMIBLE` → `P1_HIGH`; `DIFERIBLE_BAJO_DEMANDA` → `P3_DETAIL`. `P2_NORMAL` existe en el enum; ninguna clase tiene default `P2_NORMAL`; no se inventó mapeo.

---

## 7. L0–L3 final (`PROJECTION_DEPTH_POLICY_V1`)

| Capa | Incluye | Difiere |
|------|---------|---------|
| `L0_FLASH` | Todo `IRRENUNCIABLE`; conclusión esencial disponible; máximo 1 recommendation si existe legítimamente | Detalle técnico; evidencia ampliada; audit trail |
| `L1_EXECUTIVE` | Todo `IRRENUNCIABLE`; `OBLIGATORIO_RESUMIBLE`; recommendations legítimas; abstentions relevantes | Detalle auditivo/técnico |
| `L2_SUPPORT` | Todo L1; hechos/evidencia de soporte; open questions; source health relevante | — |
| `L3_AUDIT` | Todo lo proyectable; references; audit; `deferred_items`; lineage disponible permitido | — |

L0 no omite `IRRENUNCIABLE`. L0–L3 ≠ N1–N5.

---

## 8. Channel policies final

Registry: `CHAT`, `VOICE`, `WHATSAPP`, `DASHBOARD`, `REPORT`, `PRESENTATION` sobre el mismo Projection Model.

| Token | Reglas congeladas (sin inventar SSML/widgets/límites de caracteres) |
|-------|---------------------------------------------------------------------|
| `CHAT_POLICY_V1` | Natural/directo; párrafos cortos; profundización; no omite IRRENUNCIABLE; hecho/inferencia/límite visibles; no finge emoción |
| `VOICE_POLICY_V1` | Lineal; baja densidad; IRRENUNCIABLE primero; diferible bajo demanda; limitación si no es fiel |
| `WHATSAPP_POLICY_V1` | Compacto; IRRENUNCIABLE en primer bloque; puede fragmentar; no promete acciones no ejecutadas; no oculta abstention |
| `DASHBOARD_POLICY_V1` | Alta densidad; IRRENUNCIABLE sin drill-down; diferible a drill-down; mismo `ies_id`/`reasoning_run_id` |
| `REPORT_POLICY_V1` | Persistente; audit/reference suficiente; L2/L3 preferentes; no elimina contradicciones/límites |
| `PRESENTATION_POLICY_V1` | Secuencia guiada; IRRENUNCIABLE antes de recomendación; Decision Option ≠ decisión tomada |

---

## 9. Critical equivalence checks (`CRITICAL_EQUIVALENCE_VALIDATION_V1`)

Antes de emitir:

1. `NO_KNOWLEDGE` preservado.
2. Tipo E preservado.
3. Blocking limitations preservadas.
4. Critical contradictions preservadas.
5. Abstentions relevantes preservadas.
6. Recommendations no presentadas como decisiones ejecutadas.
7. Decision Option conserva `NOT_EXECUTED`.

Fallo → no emitir proyección que omita o altere el conjunto crítico; declarar limitación (fallo seguro).

`04` §17 (lista nunca omitible, incluido `COV_PARTIAL_KNOWLEDGE`) permanece aplicado por `06` §10; D4 no la deroga.

---

## 10. Tone boundary (`TONE_IS_PRESENTATION_ONLY_V1`)

Permitido: cortesía, claridad, naturalidad, transiciones conversacionales, preguntas de seguimiento.

Prohibido: simular certeza inexistente; prometer resultados no soportados; fingir emoción/experiencia propia; convertir hypothesis en fact; suavizar `NO_KNOWLEDGE`.

Naturalidad y tono son presentación. No se autorizó memoria conversacional, WhoAmI, small talk ni personalidad persistente.

---

## 11. Gaps diferidos

1. Runtime Channel Projection (esta tarea no lo implementa).
2. Tests/fixtures de Channel Projection.
3. SSML, widgets, plantillas WhatsApp productivas, límites de caracteres.
4. Integración real de las seis superficies.
5. Renderer LLM conversacional (tarea futura; si se autoriza, subordinado al Projection Model).
6. Memoria conversacional / WhoAmI / small talk / orquestador conversacional.
7. Actualización del Architecture Index (G2 distinto; fuera de esta tarea).
8. Firma IES (`04` `NOT_IMPLEMENTED`).
9. Persistencia durable del Reasoning Run (`05`).
10. Evidencias/diagnósticos productivos (`evidence[]`/`diagnoses[]` vacíos en EB vigente): el futuro IMPL proyecta la ausencia; no fabrica N3/N4/N5.
11. Default de clase para `P2_NORMAL`: no existe; no se inventó.
12. G8 / calibración `k`/`wi`/materiality.

---

## 12. GO/NO-GO para IMPL-CHANNEL-PROJECTION-001

**GO físico** respecto de los blockers de `ARCH-CHANNEL-PROJECTION-PHYSICAL-DECISIONS-001` (factory, schema serializado, catálogo `semantic_type`, `priority`, L0–L3, políticas de canal, equivalencia crítica), **condicionado** a:

1. G5 humano sobre esta tarea (este reporte **no** autoriza IMPL-CHANNEL-PROJECTION-001).
2. Primer IMPL: `DETERMINISTIC_PROJECTION_FIRST_V1` + `PROJECTION_MODEL_PLUS_NEUTRAL_RENDER_V1` — in-memory, policies puras, fixtures sintéticos, **sin** LLM renderer, **sin** integración real de canal.
3. `OPTIONAL_REASONING_NO_FILL_V1`: ausencia de Reasoning Result no se rellena; abstención RE no fabrica N5.
4. `IRRENUNCIABLE` imposible de omitir; progressive disclosure solo sobre `DIFERIBLE_BAJO_DEMANDA`.
5. `priority` solo de exposición.
6. Sin G8, sin memoria conversacional, sin modificar `04`/`05`.

`06` §17 y §18 declaran explícitamente que **esta sección no autoriza IMPL-CHANNEL-PROJECTION-001**.

---

## STOP

ARCH-CHANNEL-PROJECTION-PHYSICAL-DECISIONS-002 cerrado. Espera revisión humana. Este reporte no autoriza otra tarea.
