# Reporte — ARCH-EB-PHYSICAL-DECISIONS-002

```yaml
task_id: "ARCH-EB-PHYSICAL-DECISIONS-002"
outcome: "DONE"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-EB-PHYSICAL-DECISIONS-002.md"
files_not_touched:
  - "docs/director-ia/"
  - "docs/dev-loop/reports/ARCH-EB-PHYSICAL-DECISIONS-001.md"
  - "server.js"
  - "package.json"
  - "lib/"
  - "test/"
  - "sql/"
  - "scripts/"
  - "fixtures/"
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
  - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"
  - "docs/director-ia/DIRECTOR_IA_V2_FASE_1_VERACIDAD.md"
  - "docs/director-ia/DIRECTOR_IA_V2_FASE_2_PLANNER.md"
  - "docs/director-ia/DIRECTOR_IA_V2_FASE_3_TOOL_ORCHESTRATOR.md"
  - "docs/dev-loop/reports/ARCH-EB-PHYSICAL-DECISIONS-001.md"
contracts_modified: []
ambiguities_or_contradictions:
  - "02 §2 define un objeto Observación (N1) con campos propios (entity, metric_or_event, value, quality, absence_state, raw_result_ref). 03A posee ObservationRecord (subject, normalized_payload, raw_payload_reference, source_family, source_instance_id, …). 03 §2 nombra bundle.observations como ObservationRecords de negocio. No se reinterpretó: se registra como gap de mapeo (D2, D15)."
  - "03A cabecera declara Versión 1.1; control documental declara Versión 1.3. No se corrigió (exigiría G2)."
  - "Índice §3 y 03 control documental siguen diciendo EKS «runtime pendiente» / «Implementación PENDIENTE». El repositorio ya tiene lib/director-ia-eks.js, sql/015_director_ia_eks.sql y createEksRuntime en server.js. No se actualizó el índice ni 03 (G2; fuera de esta auditoría)."
  - "03B § Distinción de autoría dice que 03A usa source.author_id como productor; 03A declara author_id como compatibilidad ambigua y content_author_id como campo de autoría. EB debe seguir 03A. No se modificó 03B."
  - "Fixtures EKS de 03B usan open_questions como strings; 02 §12 exige objeto (open_question_id, question, reason, …). EKS validate_structure solo exige array. No se redefinió 03 ni 02."
deviations_from_current_task: []
next_task_proposed: "Ninguna autorizada. IMPL-EB-001 no se crea ni se ejecuta. Si HUMAN_APPROVER quiere registrar realización física en 02, eso exige G2 + G1 nuevos. Esta línea no autoriza trabajo."
secrets_check: "none"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED. Este reporte no abre IMPL-EB-001."
  - "Aprobar, enmendar o rechazar cada recomendación D1–D15. Ninguna es decisión vigente."
  - "D15: decidir si las elecciones físicas se quedan como implementación (Constitución I) o se registran en 02 (G2)."
  - "D2/D15: si se quiere congelar contractualmente qué objeto vive en bundle.observations (03A vs N1 de 02), eso es G2. Esta auditoría no lo autoaprueba."
  - "G8 permanece para wi, k, Fs, recencia, umbrales de severidad, ruleset de materialidad y reglas causales. No se calibraron."
  - "G2 de esta tarea sigue PENDING y no se usó. No se autoaprobó."
```

## Ejecución

- Rama: `architecture/eb-physical-decisions-001` (≠ `main`; no se cambió de rama).
- G1 leído: `authorized_by`, `authorized_at`, `human_authorization` presentes; no creados ni modificados por el implementador.
- G2 leído: `PENDING`. No se editó `docs/director-ia/`.
- Transición: `AUTHORIZED` → `IN_PROGRESS` (solo `status`) → este reporte → `DONE_PENDING_REVIEW` (solo `status`).
- `max_attempts: 1`. Sin runtime EB/OP. Sin calibración. Sin IMPL-EB-001.
- Sin commit. Sin push. Sin merge. Sin encadenar tarea.

ARCH-EB-PHYSICAL-DECISIONS-001 se leyó: quedó `BLOCKED` por rama `main`; D1–D15 no estaban respondidas. Esta ejecución las responde.

Leyenda (obligatoria en cada D):

- **Contrato existente:** texto vigente; no redefinido.
- **Realidad actual del repositorio:** lo observado en código/tests/fixtures.
- **Alternativa técnica:** opción comparativa; no adoptada.
- **Recomendación no vinculante:** no es `APPROVED`; no se escribió en contratos.

---

## Estado real del repositorio (EB / OP / EKS)

| Capa | Contrato (índice / documento) | Realidad del repositorio |
|------|-------------------------------|--------------------------|
| Evidence Builder (`02` v2.0) | Especificación; implementación PENDIENTE; «Ninguno (runtime pendiente)» | **Cero** módulo, SQL, test o fixture de ensamblaje N1–N4 |
| Observation Pipeline (`03A`) | Contrato aprobado; implementación PENDIENTE | **Cero** runtime OP |
| EKS (`03` v1.2) | Realización física D1–D9 registrada; control documental aún dice implementación PENDIENTE | Runtime mínimo: `lib/director-ia-eks.js` (`validate_structure`, `append_snapshot`, `get_snapshot`, `list_versions`, `createEks`, `createEksRuntime`); `sql/015_director_ia_eks.sql`; tests `test/director-ia-eks.test.js` y `test/director-ia-eks-integration.test.js`; `server.js` arranca infra EKS si `ENABLE_DIRECTOR_IA`; **no** produce Bundles |
| IES (`04`) | Esquema congelado; runtime pendiente | Sin runtime IES |
| Fases 1–3 | Entrada parcial; **no** son N1–N4 | `lib/director-ia-capabilities.js`, `lib/director-ia-planner.js`, `lib/director-ia-tools.js`, `lib/director-ia-tool-orchestrator.js` |
| Chat legado | No es pipeline constitucional | `lib/director-ia-chat.js` |

Búsqueda en `lib/director-ia*.js`: no hay `Knowledge Bundle`, `ObservationRecord`, `AcquisitionStatus` de `03A`, ni ensamblaje N1–N4. `DATA_NOT_FOUND` en `lib/director-ia-capabilities.js` es token de **veracidad Fase 1**, no tipificación EB de `02` §10. No se colapsan.

`package.json` tiene `test:eks`. No hay script ni dependencia de Evidence Builder.

---

## Inventario de soporte reutilizable (sin usarlo como EB)

| Activo | Qué aporta al EB futuro | Qué no es |
|--------|-------------------------|-----------|
| `createEks().validate_structure` | Frontera estructural del Bundle (`03` §2/§4) | No valida semántica N1–N4 ni ausencia |
| Fixtures `fixtures/director-ia/eks/case-a-03b.json` y `case-b-03b.json` | Forma ilustrativa de Bundle 03B A/B | No son ObservationRecords 03A completos; cifras ficticias |
| Plan / Tool Plan (Fases 2–3) | Entradas contractuales que EB consume y no inventa | No son AcquisitionStatus ni hechos |
| Catálogo Fase 1 | Límites de integración / veracidad de entrada | No determina `ABSENCE_CONFIRMED` ni cobertura constitucional |
| Pool operacional / bitácora / ARR / IGF | Fuentes de producto | No son EKS ni EB; no se reutilizan como almacén de conocimiento |

---

## Gaps contrato ↔ runtime

1. No existe productor de Knowledge Bundle. EKS solo acepta Bundles ya formados (hoy: fixtures).
2. No existe OP que emita `AcquisitionStatus` + `ObservationRecord`.
3. No existe registry versionado de reglas EB (`applied_rule`, `applied_absence_rule_id`, `applied_resolution_rule_id`, ruleset de materialidad). `02` §18 y 03B A.10 marcan ausencia/calibración pendientes.
4. No hay contrato de tool en el repo que declare que un vacío **prueba inexistencia** (`02` §10.3 condición 5).
5. Mapeo 02 Observación N1 ↔ 03A ObservationRecord ↔ `bundle.observations` no está escrito como realización física.
6. Calibración G8 (`wi`, `k`, Fs, R, severidad, materiality, reglas causales) sigue pendiente. El contrato ya ordena no afirmar precisión y emitir `MATERIALITY_NOT_ASSESSED`.

Ningún gap de esta lista se «resolvió» inventando parámetros o editando contratos.

---

## D1 — Interfaz física mínima del Evidence Builder

**Contrato existente.** `02` posee ensamblaje N1→N4 y producción del Knowledge Bundle; no posee «Implementación en código». Consume AcquisitionStatus, ObservationRecord, Plan y Tool Plan. No llama al Reasoning Engine. No escribe EKS (`03A` §1; `03` §5). Constitución I: tecnológicamente invariante.

**Realidad.** No hay módulo EB. EKS expone `createEks` / `validate_structure` / `append_snapshot` como consumidor, no como ensamblador.

**Alternativas.**

| ID | Alternativa |
|----|-------------|
| I1 | Una función `assemble(input) → Knowledge Bundle` |
| I2 | Etapas explícitas `toN1 → toN2 → toN3 → toN4 → emitBundle` |
| I3 | Objeto/fábrica con las mismas etapas, inyectando registry de reglas |

**Recomendación no vinculante.** I2 (o I3 equivalente) en un módulo propio, desacoplado de `server.js`, chat, pool operacional y WhatsApp. Entrada mínima: `{ trace_id, plan, tool_plan, acquisition_statuses[], observation_records[] }`. Salida: Bundle con `producer: "evidence_builder"`. El ensamblador **no** llama `append_snapshot`. No se crea el archivo en esta tarea.

---

## D2 — Forma física de entrada AcquisitionStatus + ObservationRecord

**Contrato existente.** `03A` §2: dos objetos distintos. AcquisitionStatus siempre (una por tool/dominio intentado). ObservationRecord solo si hay resultado de negocio transportable; **no** para `TOOL_ERROR`, `SOURCE_RESTRICTED`, `SOURCE_NOT_INTEGRATED`. `ACQUIRED_EMPTY` puede traer registro de transporte vacío **sin** afirmar ausencia. `02` §2: EB consume ObservationRecords y preserva identidades (`content_author_id`, `extracted_by`, `triggered_by`, `source.system`) sin reinterpretarlas.

**Realidad.** Cero emisores 03A. Los fixtures EKS no incluyen AcquisitionStatus ni ObservationRecord 03A (solo stubs de `observations[]`).

**Alternativas.**

| ID | Alternativa |
|----|-------------|
| E1 | Dos listas hermanas en el input de `assemble` (status[] + records[]) |
| E2 | Un envelope por tool `{ status, records[] }` |
| E3 | Fusionar status dentro de cada record |

E3 contradice `03A` (status no es observación). Se descarta como compatible.

**Recomendación no vinculante.** E1 o E2 (equivalentes). No colapsar.status. Mapear 03A → N1 de `02` **conservando** identidades y `raw_payload_reference`; `normalized_payload` es vista de proceso, no sustituto del original. `absence_state` y `quality` son tipificación EB, no AcquisitionStatus. Qué objeto exacto se persiste en `bundle.observations` (record 03A vs N1 de 02) es gap documental: ver D15. Esta auditoría no lo congela en contrato.

---

## D3 — Progresión interna N1 → N2 → N3 → N4

**Contrato existente.** Constitución III y `02` §3/§16: no saltar niveles. Ninguna evidencia sin hechos; ningún hecho sin observaciones; ningún diagnóstico sin regla y soporte. `03` y `03B` Caso B: listas vacías permitidas con `NO_CONOZCO`.

**Realidad.** No hay pipeline interno.

**Alternativas.** Etapas secuenciales con barreras (I2) vs un solo paso que emita N4 directo desde records (salto; incompatible).

**Recomendación no vinculante.** Barreras por nivel. Caso B: N1 vacío → N2/N3/N4 vacíos + cobertura/preguntas; no inventar hechos. No emitir N3 si no hay hechos soporte. No emitir N4 sin `classification_criterion` y soporte. Vacío de lista ≠ salto de nivel.

---

## D4 — Registry / versionado de reglas determinísticas

**Contrato existente.** N3 exige `applied_rule`. Ausencia exige `applied_absence_rule_id` para elevar. `RESOLVED` exige `applied_resolution_rule_id`. Materialidad `MAT_*` exige `applied_materiality_rule_id` + `materiality_ruleset_version`. Bundle lleva `ruleset_versions`. Reglas causales: lista vacía por defecto (`02` §18). 03B A.10: `absence_rules: "pendiente-calibracion"`.

**Realidad.** No hay registry. `02` v2.0 no contiene IDs productivos de elevación, cierre ni materialidad.

**Alternativas.**

| ID | Alternativa |
|----|-------------|
| R_MOD | Constantes versionadas en el módulo; conjuntos de elevación/cierre/causal/materiality **vacíos** |
| R_FILE | Archivo de datos versionado (no contrato) |
| R_DB | Tabla de reglas |

**Recomendación no vinculante.** R_MOD con conjuntos vacíos de elevación, resolución, causalidad y materialidad. `ruleset_versions.evidence_builder: "2.0"`. No inventar el contenido de ninguna regla. Llenar el registry es G8 / gobernanza del Motor, no esta tarea.

---

## D5 — IDs y trazabilidad

**Contrato existente.** `03A`: `observation_id`, `trace_id`. `02`: `observation_id`, `conflict_id`, `open_question_id`, `traceability` a plan + tool_plan + pregunta. `03`: `bundle_id`, `trace_id`, `produced_at`, `producer`. 03B ilustra `obs_*`, `fact_*`, `ev_*`, `dx_*`, `kb_*`, `tr_*` (no norma de algoritmo).

**Realidad.** EKS exige strings no vacíos de `bundle_id` / `trace_id` y `producer === "evidence_builder"`. No hay generador EB.

**Alternativas.** Prefijos ilustrativos 03B vs IDs opacos (como `snapshot_id` EKS). Congelar algoritmo en `02` (G2) vs dejarlo como realización.

**Recomendación no vinculante.** Conservar `trace_id` y `observation_id` incoming del OP. Generar IDs de N2–N4 / conflictos / preguntas / `bundle_id` como opacos únicos por ciclo; no reutilizar entre `trace_id`. No congelar UUID/hash en contrato. Trazabilidad del Bundle referencia pregunta, plan, tool_plan, acquisition y observation_ids.

---

## D6 — Lineage e independencia para Cb sin inventar `k`

**Contrato existente.** `02` §5–§6 y §14: Cb cuenta linajes independientes, no menciones. Independencia si difieren origen productivo relevante (`source.system`, `extracted_by`, `content_author_id` cuando exista, cadena de captura). `triggered_by` no define linaje de contenido. Repetición/propagación no aumentan Cb. `k` pendiente; no fijado.

**Realidad.** 03A declara `source_family` / `source_instance_id` como familia/instancia de linaje. `02` §14 no los lista como mínimos, pero 03A los exige en el record. No hay cálculo de Cb.

**Alternativas.** Comparar solo los mínimos de `02` §14 vs incluir también `source_family` / `source_instance_id` de 03A como parte de la cadena de captura.

**Recomendación no vinculante.** Preservar todos los campos de linaje 03A + mínimos `02` §14. Decidir independencia por diferencia de esos orígenes; no por repetición de payload. Exponer la dimensión Cb **sin** aplicar saturación ni `k`. No inventar `k`. No tratar `source_family` como política de fuentes (el catálogo/Motor sigue siendo el dueño de prioridad).

---

## D7 — Confidence sin falsa precisión

**Contrato existente.** Constitución II / `02` §4 / Motor: `f(Fs × R × Cb × Cs × Cb_ov)`; fórmula y `wi` pendientes. Máximo lingüístico: **confianza alta**. Hasta calibrar: exponer dimensiones y tipificaciones; no afirmar precisión numérica definitiva (`02` §18). `NO_CONOZCO` en alcance requerido: confianza **0.00** (Constitución IV / Motor).

**Realidad.** Fixtures 03B no calculan confianza. EKS no la recalcula.

**Alternativas.** Omitir números de dimensión hasta G8 vs inventar `wi`/`k`/ventanas (prohibido).

**Recomendación no vinculante.** Declarar las cinco dimensiones en el hecho **sin** producto numérico calibrado. No inventar `wi`, `k`, Fs por tool ni ventanas R. Excepción contractual: **0.00** solo en el alcance `NO_CONOZCO`. No usar “confianza absoluta”. No derivar `MAT_*` ni `RESOLVED` desde un score.

---

## D8 — `DATA_NOT_FOUND` → `ABSENCE_CONFIRMED` (rule-driven, fail-closed)

**Contrato existente.** `02` §10.3: seis condiciones **necesarias**. Si falta cualquiera, permanece `DATA_NOT_FOUND` (o el AcquisitionStatus original). OP no determina ausencia. `DATA_NOT_FOUND` ≠ `ABSENCE_CONFIRMED` ≠ `TOOL_ERROR`.

**Realidad.** No hay reglas `applied_absence_rule_id`. No hay contrato de tool en Fases 1–3 / inventario que declare que el vacío prueba inexistencia.

**Alternativas.** Elevar por heurística de vacío (incompatible) vs fail-closed hasta regla + contrato de tool versionados.

**Recomendación no vinculante.** Fail-closed: **nunca** elevar en v1. Tipificar `ACQUIRED_EMPTY` como `DATA_NOT_FOUND`. No afirmar ausencia en N2. No inventar la regla ni el contrato de tool. Cuando exista gobernanza (G8 / Motor), la elevación sigue siendo las seis condiciones, no un umbral inventado aquí.

---

## D9 — `resolution_status` y transiciones

**Contrato existente.** `02` §11: único propietario = EB. Enum: `OPEN` \| `UNDER_REVIEW` \| `RESOLVED` \| `SUPERSEDED`. `RESOLVED` exige evidencia nueva/suficiente + `applied_resolution_rule_id` + refs. `weight_assessment` nunca resuelve. EKS/IES no mutan el estado. Tipo E `OPEN`/`UNDER_REVIEW` permanece visible.

**Realidad.** Fixtures A/B: `conflicts: []`. EKS no toca `resolution_status`.

**Alternativas.** Máquina de estados literal de la tabla `02` vs cierre por peso (prohibido).

**Recomendación no vinculante.** Implementar la tabla de transiciones tal cual. Tipificar → `OPEN`. Sin ruleset de resolución → no emitir `RESOLVED`. `SUPERSEDED` ≠ `RESOLVED`. No suavizar Tipo E. No requiere G2: ya está en `02`.

---

## D10 — Materiality / `MATERIALITY_NOT_ASSESSED`

**Contrato existente.** Motor §7A + `02` §11B: sin ruleset calibrado → `MATERIALITY_NOT_ASSESSED`. ≠ `MAT_LOW`. `applied_materiality_rule_id` null si no evaluado. `NO_CONOZCO` no inventa `MAT_*`. EKS solo persiste; IES solo proyecta.

**Realidad.** Fixtures A ya usan `MATERIALITY_NOT_ASSESSED` en hechos. No hay ruleset.

**Alternativas.** Emitir `MAT_*` ilustrativos como productivos (prohibido) vs token de no evaluación.

**Recomendación no vinculante.** En todo objeto N2–N4 que lleve el campo: `MATERIALITY_NOT_ASSESSED` y rule id null. Bancos vacíos (Caso B): no inventar materialidad. No calibrar umbrales.

---

## D11 — Pureza / inmutabilidad del Builder

**Contrato existente.** `02`: determinista; sin política propia; sin LLM; sin hipótesis; no interpreta ausencia como cero; no inventa fuentes. `03A`: payload original inmutable. `03`: EKS no reinterpreta el Bundle. Constitución: no alucinar, no rellenar vacíos.

**Realidad.** No hay Builder. EKS ya clona el Bundle y valida sin mutar N2–N4.

**Alternativas.** Función pura sobre copias vs escribir DB operacional / llamar chat / mutar records de entrada.

**Recomendación no vinculante.** Función pura: no I/O operacional, no LLM, no mutar inputs, no `append_snapshot` dentro del ensamblador, no Reasoning Engine. Misma entrada + mismo registry versionado → mismo Bundle. Preguntas abiertas neutrales, no hipótesis.

---

## D12 — Validar Bundle contra frontera EKS (`03`) sin redefinir `03`

**Contrato existente.** `03` §2 campos obligatorios + metadatos. `validate_structure`: presencia, tipos, `trace_id`, no contenedor vacío, rechazo de “solo observaciones”. `producer` siempre `evidence_builder`. Cobertura ∈ {`CONOZCO`,`CONOZCO_PARCIALMENTE`,`EXISTE_CONFLICTO`,`NO_CONOZCO`}. EKS no recalcula conocimiento.

**Realidad.** `validate_structure` en `lib/director-ia-eks.js` comprueba listas, objetos, meta y coverage. **No** comprueba semántica 02 (ausencia, transiciones, materiality, objetos de pregunta). Fixtures A/B pasan esa frontera estructural.

**Alternativas.** Reusar `validate_structure` como chequeo de emisión vs redefinir 03 vs duplicar un esquema distinto.

**Recomendación no vinculante.** El Bundle emitido debe pasar `validate_structure` **sin** cambiar `03`. La validez semántica (N1–N4, §10–§11B) es del EB, no del EKS. No cablear persistencia en esta frontera. No ampliar `validate_structure` desde esta tarea.

---

## D13 — Fixtures iniciales contractuales

**Contrato existente.** 03B Casos A/B: flujos ilustrativos; cifras ficticias; no cobertura institucional; sin N5. `03` D9 (O_EKS_FIRST): EKS se validó contra esos fixtures; EB sigue siendo el único productor de Bundles de producción.

**Realidad.** Existen `fixtures/director-ia/eks/case-a-03b.json` y `case-b-03b.json` (stubs estructurales). No hay fixtures de **entrada** OP (AcquisitionStatus + ObservationRecord 03A) ni de elevación/conflicto/materiality.

**Alternativas.** Reusar solo A/B vs añadir mínimos 02/03A etiquetados ilustrativos (vacío, error, no integrado, entidad no resuelta, conflicto `OPEN`).

**Recomendación no vinculante.** Conservar A/B como Bundles esperados ilustrativos. Para un futuro IMPL-EB (no abierto): fixtures de **entrada** 03A para A y B, más casos mínimos `ACQUIRED_EMPTY`/`DATA_NOT_FOUND` (sin elevar), `TOOL_ERROR`, `SOURCE_RESTRICTED`, `ENTITY_UNRESOLVED`, conflicto `OPEN`, `MATERIALITY_NOT_ASSESSED`. No crearlos aquí. No usar cifras 03B como cobertura real. No inventar reglas de elevación “para que el fixture pase”.

---

## D14 — Orden OP runtime vs EB runtime (EKS ya existe)

**Contrato existente.** Índice: Question → Fases 1–3 → Tool Results → OP (03A) → EB → Bundle → EKS. `03` D9: EKS-first contra fixtures; EB único productor productivo. OP no escribe EKS. Fases 1–3 no son N1–N4.

**Realidad.** EKS runtime + integración infra existen. OP no. EB no. Tool Orchestrator declara Tool Plan; no ejecuta.

**Alternativas.**

| ID | Orden |
|----|--------|
| O1 | OP runtime primero; luego EB contra salidas OP reales |
| O2 | EB primero contra fixtures 03A/03B; OP después; cableado productivo al final |
| O3 | Cablear EB a `server.js`/chat ahora |

O3 está fuera de alcance y salta capas.

**Recomendación no vinculante.** O2 para el **ensamblador** (testeable sin OP real, análogo a O_EKS_FIRST). OP runtime **antes** de cualquier Bundle de producción o escritura EKS no-fixture. No ejecutar ninguno de esos pasos en esta tarea. No abrir IMPL-EB-001.

---

## D15 — Qué requiere G2 antes de implementación

Esta **auditoría** se completó **sin** modificar contratos y **sin** usar G2. G2 sigue `PENDING`.

### No requieren G2 (ya están en contrato)

- Línea N1→N2→N3→N4 sin saltos.
- Mapa AcquisitionStatus → tipificación EB y fail-closed de ausencia (`02` §10).
- Enum y transiciones de `resolution_status` (`02` §11).
- `MATERIALITY_NOT_ASSESSED` sin ruleset (Motor §7A / `02` §11B).
- Frontera estructural del Bundle (`03` §2/§4).
- Prohibición de calibrar `wi`/`k`/Fs/R/severidad/reglas causales aquí (G8, no G2).

### Requieren G2 **solo si** HUMAN_APPROVER quiere escribirlas en `docs/director-ia/`

| Cambio exacto | Archivo | Gate |
|---------------|---------|------|
| Añadir sección «Realización física» del EB (interfaz I2, no I/O, no `append_snapshot`) | `02-EVIDENCE-BUILDER.md` | G2 |
| Congelar que `bundle.observations` es ObservationRecord 03A, u objeto N1 de 02, o N1 que envuelve 03A | `02` y/o `03` | G2 |
| Alinear cabecera 03A v1.1 vs control v1.3 | `03A` | G2 |
| Actualizar índice/`03` para reflejar runtime EKS ya existente | índice y/o `03` | G2 (fuera del objetivo EB; no bloquea esta auditoría) |
| Corregir nota 03B sobre `source.author_id` vs `content_author_id` | `03B` | G2 |

Ninguno de esos cambios es **necesario** para cerrar esta auditoría. Por eso el estado terminal es `DONE_PENDING_REVIEW`, no `BLOCKED`.

Si una futura implementación **redefine** `02`/`03A`/`03` en lugar de aplicarlos, esa implementación exigiría G2 **antes** de editar contratos. Implementar un módulo JS que obedezca `02`/`03A`/`03` vigentes, sin editarlos, no es por sí mismo un cambio arquitectónico de documentos (Constitución I). HUMAN_APPROVER decide la vía.

### G8 (no G2; no calibrado)

`wi`, `k`, umbrales de severidad, escalado Fs, ventanas R, ruleset de materialidad, reglas causales, contratos de tool que prueben inexistencia. Hasta entonces: fail-closed + `MATERIALITY_NOT_ASSESSED` + dimensiones sin falsa precisión.

---

## Riesgos

1. Tratar Fase 1 `DATA_NOT_FOUND` / `SOURCE_*` como tipificación EB o como AcquisitionStatus.
2. Emitir `ABSENCE_CONFIRMED` sin las seis condiciones.
3. Saltar N2/N3 porque EKS acepta listas vacías (vacío permitido ≠ salto).
4. Resolver conflictos por peso o marcar `RESOLVED` sin regla.
5. Derivar `MAT_*` desde confianza/severidad.
6. Cablear EB a chat/`server.js` o escribir EKS desde el ensamblador.
7. Usar fixtures 03B como cobertura institucional o como ObservationRecords 03A completos.
8. Inventar `k`/`wi` «para que compile la confianza».
9. Confundir actualización pendiente del índice (EKS ya existe) con autorización de EB.

---

## Evaluación GO / BLOCKED para una futura IMPL-EB-001

**No se crea ni se ejecuta IMPL-EB-001.**

Evaluación **no vinculante**:

- **Esta auditoría:** GO (completa; sin cambio contractual).
- **Implementar EB ahora:** **no GO**. Falta G5 de esta tarea, G1 nuevo, y decisión humana sobre D1–D15 (en especial D2/D15 y si hay G2 para registrar realización en `02`).
- Calibración G8 **no** es prerrequisito de un ensamblador fail-closed; **sí** lo es de cualquier número de confianza, `MAT_*`, elevación a `ABSENCE_CONFIRMED` o `RESOLVED`.

---

## Orden recomendado (no ejecutado)

1. Cierre humano G5 de esta tarea.
2. (Opcional) G2 solo si se registran decisiones físicas o el mapeo `bundle.observations` en contratos.
3. OP runtime (salidas 03A reales) **o**, en paralelo no productivo, EB contra fixtures de entrada 03A.
4. EB ensamblador + tests contra A/B y casos fail-closed.
5. Recién después: emitir Bundles hacia EKS (sin chat). Ningún paso está autorizado.

---

## Verificaciones

- `docs/director-ia/`, `server.js`, `package.json`, `lib/`, `test/`: no modificados.
- Únicos writes: `CURRENT_TASK.md` (solo `status`) y este reporte.
- `git diff --check` se ejecuta al cerrar.
