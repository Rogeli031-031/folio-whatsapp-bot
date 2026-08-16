# Reporte — ARCH-OP-PHYSICAL-DECISIONS-001

```yaml
task_id: "ARCH-OP-PHYSICAL-DECISIONS-001"
outcome: "DONE"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-OP-PHYSICAL-DECISIONS-001.md"
files_not_touched:
  - "docs/director-ia/"
  - "lib/"
  - "test/"
  - "fixtures/"
  - "server.js"
  - "package.json"
  - "código productivo"
contracts_consulted:
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md"
  - "docs/director-ia/02-EVIDENCE-BUILDER.md"
  - "docs/director-ia/03A-OBSERVATION-PIPELINE.md"
  - "docs/director-ia/03-EXECUTIVE-KNOWLEDGE-STORE.md"
  - "docs/director-ia/03B-END-TO-END-REFERENCE-FLOWS.md"
  - "docs/director-ia/04-IES-STANDARD.md"
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md"
  - "docs/director-ia/DIRECTOR_IA_V2_FASE_1_VERACIDAD.md"
  - "docs/director-ia/DIRECTOR_IA_V2_FASE_2_PLANNER.md"
  - "docs/director-ia/DIRECTOR_IA_V2_FASE_3_TOOL_ORCHESTRATOR.md"
  - "docs/dev-loop/TASK_TEMPLATE.md"
contracts_modified: []
ambiguities_or_contradictions:
  - "03A cabecera declara Versión 1.1; control documental declara Versión 1.3. No se corrigió (G2)."
  - "03B afirma que 03A usa source.author_id como productor; 03A declara author_id como compatibilidad ambigua y content_author_id como autoría. OP debe seguir 03A."
  - "03A no define el objeto físico AcquisitionStatus (solo enum y «una por tool/dominio»). El runtime EB consume { tool_id, domain, status } en fixtures; eso no está congelado en 03A."
  - "03A nombra «Tool Execution Results» como entrada y no describe su schema. Fase 3 declara Tool Plan y no ejecuta."
  - "Fase 1 DIRECTOR_IA_VERACITY.DATA_NOT_FOUND no es AcquisitionStatus ni tipificación EB de 02 §10. No se colapsan."
  - "Tool Plan.status (available / declared_not_integrated / restricted) no es AcquisitionStatus. No hay tabla contractual de proyección 1:1."
deviations_from_current_task: []
next_task_proposed: "IMPL-OP-001 no se crea ni se autoriza. Si HUMAN_APPROVER quiere registrar realización física en 03A, eso exige G2 + G1 nuevos. Esta línea no autoriza trabajo."
secrets_check: "none"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED. Este reporte no abre IMPL-OP-001."
  - "Aprobar, enmendar o rechazar cada RECOMMENDATION D1–D15. Ninguna es APPROVED."
  - "G2 permanece PENDING y no se usó. Registrar realización física en 03A o el schema de Tool Execution Results exigiría G2."
  - "G8 no aplica a esta auditoría. No se calibró."
```

## Ejecución

- Rama: `architecture/op-physical-decisions-001` (≠ `main`; no se cambió de rama).
- G1 leído: `authorized_by`, `authorized_at`, `human_authorization` presentes; no modificados por el implementador.
- G2 leído: `PENDING`. No se editó `docs/director-ia/`.
- Transición: `AUTHORIZED` → `IN_PROGRESS` (solo `status`) → este reporte → `DONE_PENDING_REVIEW` (solo `status`).
- `CURRENT_TASK.md` no declara `task_id` en el YAML; se usó `result_report_path` / pedido humano. No se añadió el campo (solo cabe cambiar `status`).
- `max_attempts: 1`. Sin runtime OP. Sin calibración. Sin IMPL-OP-001.
- Sin commit. Sin push. Sin merge. Sin encadenar tarea.

Leyenda (obligatoria):

- **CONTRACTUAL:** texto vigente; no redefinido.
- **RECOMMENDATION:** opción no vinculante; **no** es `APPROVED`.
- **UNKNOWN:** el contrato o el repo no permiten concluir.

---

## Estado real del repositorio

| Capa | Contrato / índice | Realidad |
|------|-------------------|----------|
| Observation Pipeline (`03A`) | Implementación PENDIENTE; índice «Ninguno (runtime pendiente)» | **Cero** `lib/director-ia-observation-pipeline.js` |
| Tool Orchestrator (Fase 3) | Plan declarativo; no ejecuta | `lib/director-ia-tool-orchestrator.js` + `lib/director-ia-tools.js`: Tool Plan; `executor` es nombre de catálogo, no se invoca |
| Evidence Builder (`02` v2.1) | Realización física D1–D15 | `lib/director-ia-evidence-builder.js`: consume `acquisition_statuses[]` + `observation_records[]` |
| EKS (`03` v1.3) | Persistencia de Bundle | Runtime existe; **no** recibe OP |
| Fixtures EB | Entradas 03A ilustrativas | `fixtures/director-ia/evidence-builder/*` (sintéticos; no son runtime OP) |

---

## D1 — Interfaz física mínima

**CONTRACTUAL.** `03A` §6: entradas = Question/`trace_id`, Plan, Tool Plan, Tool Execution Results (cuando existan), identidad/permisos/planta/periodo. Salidas = `AcquisitionStatus[]` (una por tool/dominio intentado), `ObservationRecord[]` (solo negocio transportable), metadatos técnicos para `source_health`. No LLM. No escribe EKS. No produce N2–N5. `02` D2: EB consume dos listas hermanas (`E1`). `03` §5: OP no escribe EKS.

`03A` **no** elige función pura, factory ni servicio.

**UNKNOWN.** Estado interno permitido (si hay cache, reloj, registry). Dependencias inyectables no nombradas.

**RECOMMENDATION.** Módulo puro/factory análogo a I2 del EB: `to_status` / `to_records` / `emit` o `run(input) → { acquisition_statuses, observation_records }`. Sin `server.js`, chat, pool operacional ni `append_snapshot`. Timestamps inyectables (`extracted_at`, `pipeline_received_at`). No es `APPROVED`.

---

## D2 — Frontera Tool Execution

**CONTRACTUAL.** `03A` §6 nombra «Tool Execution Results (cuando existan)» y estados de no-disponibilidad. Fase 3: el Tool Plan **no ejecuta** tools (`DIRECTOR_IA_V2_FASE_3_TOOL_ORCHESTRATOR.md`; `lib/director-ia-tool-orchestrator.js`).

**Realidad.** No hay runtime de Tool Execution Results. El registry declara `executor` como string; no hay objeto de resultado hacia OP.

**UNKNOWN.** Schema físico del resultado de ejecución (payload, error, timeout, filas). Congelarlo en un contrato exigiría G2/G3; esta tarea no lo inventa.

**RECOMMENDATION.** IMPL-OP futuro puede arrancar con **fixtures** de resultados técnicos (como `02` D14 / EB fixtures-first). Tool Execution productivo **después**. No integrar chat que hoy llama loaders de producto como si fueran OP.

---

## D3 — Construcción de AcquisitionStatus

**CONTRACTUAL.** Enum mínimo `03A` §2: `ACQUIRED_OK`, `ACQUIRED_EMPTY`, `SOURCE_NOT_INTEGRATED`, `SOURCE_RESTRICTED`, `TOOL_ERROR`, `QUERY_SCOPE_INCOMPLETE`, `ENTITY_UNRESOLVED`. `ABSENCE_CONFIRMED` **prohibido** como status. Timeout → `TOOL_ERROR`, no vacío. Una entrada por tool/dominio intentado. Motor: AcquisitionStatus ≠ coverage ≠ ausencia EB.

**UNKNOWN.** Campos obligatorios del **objeto** status (03A no tiene tabla de campos). Cómo se decide `ACQUIRED_OK` vs `ACQUIRED_EMPTY` si el schema de Tool Execution no existe.

**RECOMMENDATION.** Forma mínima compatible con fixtures EB y `02` D2: `{ tool_id, domain, status }`. Mapear Tool Plan `declared_not_integrated` → `SOURCE_NOT_INTEGRATED` y `restricted` → `SOURCE_RESTRICTED` **solo** como realización, no como tabla nueva en 03A hasta G2. `missing_inputs` del Tool Plan → `QUERY_SCOPE_INCOMPLETE` es realización tentativa; 03A no la escribe. No es `APPROVED`.

---

## D4 — Cuándo crear ObservationRecord

**CONTRACTUAL.** `03A` §2:

| Status | Record de negocio |
|--------|-------------------|
| `ACQUIRED_OK` | Sí, si hay filas/métricas/eventos transportables |
| `ACQUIRED_EMPTY` | Opcional: transporte vacío **sin** afirmar ausencia |
| `SOURCE_NOT_INTEGRATED` / `SOURCE_RESTRICTED` / `TOOL_ERROR` | **No** |
| `QUERY_SCOPE_INCOMPLETE` | **No** (salvo «política futura» de registro técnico; no hecho) |
| `ENTITY_UNRESOLVED` | **No** sobre entidad canónica inventada |

`DATA_NOT_FOUND` **no** es AcquisitionStatus: es tipificación EB (`02` §10) sobre `ACQUIRED_EMPTY`.

**UNKNOWN.** La «política futura» de registro técnico para `QUERY_SCOPE_INCOMPLETE`.

**RECOMMENDATION.** v1: ningún record para estados no transportables; `ACQUIRED_EMPTY` puede emitir un record vacío tipificable por EB como `DATA_NOT_FOUND`, como el fixture `acquired-empty.json`. No es `APPROVED`.

---

## D5 — Cardinalidad y correlación

**CONTRACTUAL.** 1 AcquisitionStatus por tool/dominio **intentado**. Records: 0..N por adquisición transportable (`ACQUIRED_OK` con varias filas). N:1 (varios status desde un record) no está autorizado.

**UNKNOWN.** Clave canónica de correlación (solo `tool_id`, solo `domain`, o ambas). `02` runtime actual empareja `tool_id` y, si no, `domain` — es realización EB, no norma 03A.

**RECOMMENDATION.** Conservar `tool_id` + `domain` en ambos objetos. Un status por tool intentada del Tool Plan; N records bajo el mismo `tool_id`/`trace_id`. No es `APPROVED`.

---

## D6 — Identificadores

**CONTRACTUAL.** Record: `observation_id` (único), `trace_id` (ciclo). `source.source_instance_id` obligatorio. `source.tool_id` obligatorio. Algoritmo UUID/hash **no** congelado (`02` D5 para IDs de ensamblaje; 03A tampoco congela).

**UNKNOWN.** Quién emite `trace_id` (request vs OP). Forma de `source_instance_id` más allá del ejemplo «plant+mes+extractor».

**RECOMMENDATION.** Preservar `trace_id` incoming. Generar `observation_id` opaco inyectable/determinista (como EB). `source_instance_id` compuesto de system + sujeto declarado + extractor **sin** inventar sujeto. No congelar algoritmo en 03A sin G2.

---

## D7 — Procedencia

**CONTRACTUAL.** Distintos y no sustituibles: `source.system`, `content_author_id` (nullable), `extracted_by`, `triggered_by`, `source_family`, `source_instance_id`. `null` ≠ «autor inexistente». Prohibido rellenar autor con extractor/tool. `author_id` solo compatibilidad alineada a `content_author_id`. Lineage se deriva/conserva; no se reinterpreta (`03A` §3; `02` D2/D6).

**UNKNOWN.** Catálogo de `source_family` / `source.system` por tool.

**RECOMMENDATION.** Copiar identidades desde el resultado técnico o el Tool Plan **sin** completar huecos. Si el autor no es resoluble: `null` + metadato de no resolución. Seguir 03A, no la nota 03B sobre `author_id`.

---

## D8 — Payload crudo y normalizado

**CONTRACTUAL.** Original inmutable. `raw_payload_reference` = auditoría. `normalized_payload` = vista de proceso; no sustituye al original (`03A` §3). EB no interpreta el payload libremente (`02` D2).

**UNKNOWN.** Encoding/serialización determinística del original. Dónde vive el blob referenciado (memoria de fixture vs almacén). Eso no está en 03A; nombrarlo en contrato sería G2 y no debe elevar un motor a norma (Constitución I).

**RECOMMENDATION.** OP no muta el original; `normalized_payload` solo proyección estructural (campos ya presentes), no semántica de negocio. Referencia opaca estable por `observation_id`. No es `APPROVED`.

---

## D9 — Resolución de entidades

**CONTRACTUAL.** `RESOLVED` \| `AMBIGUOUS` \| `UNRESOLVED`. Conservar `original_value`, `candidates`, `resolution_rule`, `resolution_confidence` (no es confianza del Hecho). Prohibido inventar canónico si no es `RESOLVED`. Status `ENTITY_UNRESOLVED` sin record sobre entidad inventada.

**UNKNOWN.** Catálogo de `resolution_rule`. Si existe un resolver externo. `resolution_confidence` no está calibrada (no es G8 de `wi`/`k` del hecho).

**RECOMMENDATION.** Fail-closed: sin regla versionada de resolución → `UNRESOLVED` o `AMBIGUOUS`, nunca inventar `entity_id`. No es `APPROVED`.

---

## D10 — Error, vacío y equivalentes

**CONTRACTUAL.**

| Situación | Status OP | Record | Llega al EB | Jamás significa |
|-----------|-----------|--------|-------------|-----------------|
| Payload usable | `ACQUIRED_OK` | Sí (si transportable) | status + records | — |
| Vacío técnico | `ACQUIRED_EMPTY` | Opcional | status ± record vacío | `ABSENCE_CONFIRMED` / cero |
| Timeout/error | `TOOL_ERROR` | No | solo status | `ACQUIRED_EMPTY` / ausencia |
| No integrado | `SOURCE_NOT_INTEGRATED` | No | solo status | «no existe» |
| Restringido | `SOURCE_RESTRICTED` | No | solo status | «no existe» |
| Entidad no canónica | `ENTITY_UNRESOLVED` | No (canónico inventado) | solo status | entidad inventada |

`DATA_NOT_FOUND` lo tipifica el **EB**, no el OP.

**RECOMMENDATION.** Emitir solo lo de la tabla. No proyectar Fase 1 `DATA_NOT_FOUND` como status OP.

---

## D11 — Deduplicación y retries

**CONTRACTUAL.** 03A **no** autoriza deduplicación, idempotencia ni retries. `source.derived_from` es opcional para derivado técnico sin reinterpretar. Independencia de linaje para Cb es del **EB** (`02` §5–§6), no una orden de colapsar records en OP.

**UNKNOWN.** Si un futuro Tool Execution reintenta; qué haría OP.

**RECOMMENDATION.** v1: no deduplicar en silencio; emitir un record por resultado transportable recibido; retries = nuevos status/records correlacionados por `trace_id` si llegan. Añadir política de dedup a 03A sería **G2**. No es `APPROVED`.

---

## D12 — Orden y determinismo

**CONTRACTUAL.** Misma semántica de separación y preservación. No mutar payload original. Ortografía `lineage`.

**UNKNOWN.** Orden estable de las listas. Si `pipeline_received_at` / `extracted_at` pueden inyectarse o exigen reloj. 03A los marca obligatorios.

**RECOMMENDATION.** No mutar inputs. Preservar orden de tools del Tool Plan en `acquisition_statuses`. Orden de records = orden de filas transportables. Timestamps inyectables (sin reloj ambiental para semántica), análogo a `produced_at` del EB. IDs inyectables. No es `APPROVED`.

---

## D13 — Validación: OP vs EB

**CONTRACTUAL.**

| Tema | OP (`03A`) | EB (`02`) |
|------|------------|-----------|
| Estructura ObservationRecord / status | Sí | Consume |
| Transportabilidad (qué status genera record) | Sí | No crea records |
| Procedencia / lineage (conservar, no inventar) | Sí | Preserva en N1 |
| Semántica empresarial / hechos | **No** | N2 |
| `ABSENCE_CONFIRMED` | **No** | Sí, fail-closed §10.3 |
| Confidence `wi`/`k` | **No** | Expone dimensiones; G8 pendiente |
| Materiality | **No** | `MATERIALITY_NOT_ASSESSED` hasta G8 |
| Knowledge Coverage `CONOZCO…` | **No** | Aplica política Motor |
| Bundle / `validate_structure` | **No** | Emite; EKS valida estructura |

**RECOMMENDATION.** OP: validar campos 03A y la tabla de transportabilidad. No llamar `assemble` ni `append_snapshot` desde OP v1.

---

## D14 — Fixtures y tests (futuros; no creados aquí)

**CONTRACTUAL.** 03B A/B ilustran OP. `02` D13/D14: fixtures 03A/03B primero; OP runtime antes de Bundles de producción. Fixtures EB existentes ya modelan **salidas** 03A sintéticas.

**RECOMMENDATION.** Una futura IMPL-OP (no abierta) usaría fixtures de **entrada** (Tool Plan + resultado técnico o no-disponibilidad) que produzcan salidas alineadas a:

- negocio adquirido (Caso A)
- `ACQUIRED_EMPTY` / candidato `DATA_NOT_FOUND` en EB
- `TOOL_ERROR`
- `SOURCE_RESTRICTED`
- `ENTITY_UNRESOLVED`
- `SOURCE_NOT_INTEGRATED` (Caso B)
- preservación de provenance / `content_author_id = null`

No crear esos fixtures en esta tarea. Compatibilidad: el EB actual acepta `{ tool_id, domain, status }` + records 03A; campos extra `metric_or_event`/`value` en fixtures EB **no** son obligatorios en 03A (**UNKNOWN** si OP debe emitirlos; EB los copia solo si vienen explícitos).

---

## D15 — Orden e integración

**CONTRACTUAL.** Índice: Tool Results → OP → EB → EKS. `03` / `03A`: OP no escribe EKS. `02` D14: EB ya puede probarse con fixtures; OP runtime **antes** de Bundles productivos. Chat/dashboard/Fases 1–3 no son N1–N4.

**RECOMMENDATION (no autoriza trabajo).**

1. Cierre G5 de esta auditoría.
2. (Opcional) G2: registrar realización física en `03A` y/o schema de Tool Execution Results.
3. IMPL-OP-001 (G1 nuevo): runtime contra fixtures; sin `server.js`, chat, DB productiva ni EKS.
4. Tool Execution productivo después.
5. Recién después: OP → EB para Bundles no-fixture.

EKS no recibe OP. `server.js` / chat / dashboard fuera hasta tarea autorizada.

---

## Decisiones que requerirían G2

Solo si HUMAN_APPROVER quiere **escribirlas** en `docs/director-ia/`:

| Cambio | Archivo | Gate |
|--------|---------|------|
| Sección «Realización física» OP (interfaz, IDs, timestamps, no-dedup v1) | `03A` | G2 |
| Schema de Tool Execution Results | `03A` u otro contrato | G2 o G3 |
| Tabla formal de campos de AcquisitionStatus | `03A` | G2 |
| Alinear cabecera 03A v1.1 vs control v1.3 | `03A` | G2 |
| Corregir nota 03B `author_id` | `03B` | G2 |

Ninguno es necesario para **cerrar esta auditoría**. Por eso el estado es `DONE_PENDING_REVIEW`, no `BLOCKED`.

## G8

No se calibra. OP no posee `wi`, `k`, Fs, R, severidad, materiality ni reglas causales. `resolution_confidence` de entidad ≠ confianza del Hecho.

---

## GO / NO-GO para una futura IMPL-OP-001

**No se crea IMPL-OP-001.**

| Evaluación | Dictamen | Motivo |
|------------|----------|--------|
| Esta auditoría | **GO** | D1–D15 respondidas sin modificar contratos ni inventar APPROVED |
| Abrir IMPL-OP-001 ahora | **NO-GO** | Falta G5 + G1 nuevo; recomendaciones no son decisiones |
| Implementar OP contra fixtures (si se autoriza después) | Condicionado | Posible sin Tool Execution productivo; G2 opcional si se quiere congelar realización en 03A |

---

## Verificaciones

- `docs/director-ia/`, `lib/`, `test/`, `fixtures/`, `server.js`, `package.json`: no modificados.
- Únicos writes: `CURRENT_TASK.md` (solo `status`) y este reporte.
- `git diff --check` se ejecuta al cerrar.
