# 03 — Executive Knowledge Store (EKS)

## Almacén de conocimiento ejecutivo — contrato de persistencia

**Documento:** `docs/director-ia/03-EXECUTIVE-KNOWLEDGE-STORE.md`
**Versión:** 1.4
**Estado:** CONTRATO APROBADO TRAS AUDITORÍA E2E; realización física v1 registrada (D1–D9); `bundle.observations` aclarado (N1); `query_context_metadata` de Snapshot registrada (ARCH-IES-PHYSICAL-DECISIONS-002)
**Tipo:** Especificación de almacén (realización física v1; sin runtime)

### Dependencia normativa

| Documento | Rol |
|-----------|-----|
| `docs/director-ia/DIRECTOR_IA_CONSTITUTION.md` | Norma superior |
| `docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md` | Gobernanza del Motor |
| `docs/director-ia/02-EVIDENCE-BUILDER.md` | Productor del Knowledge Bundle |
| `docs/director-ia/03A-OBSERVATION-PIPELINE.md` | ObservationRecord / AcquisitionStatus (entrada al EB) |
| `docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md` | Índice maestro |

En conflicto, prevalece la Constitución.

---

# 1. Propósito

El **Executive Knowledge Store (EKS)** es el almacén append-only del conocimiento estructurado producido por el Evidence Builder.

### Recibe

Un **Knowledge Bundle** completo de Niveles 1–4 (y estados asociados), **no** únicamente Observaciones.

### Produce

Un **Knowledge Snapshot** versionado, inmutable una vez persistido, apto para proyección futura a IES.

### Qué nunca hace

- No calcula hechos, evidencias ni diagnósticos.
- No clasifica conflictos ni tipifica ausencias de negocio.
- No muta `conflicts[].resolution_status` ni ningún campo de resolución del Bundle (solo persiste lo emitido por el Evidence Builder).
- No transforma, reinterpreta ni “mejora” el Knowledge Bundle.
- No altera identidades de procedencia del Bundle (`content_author_id`, `extracted_by`, `triggered_by`, `source.system` / linaje).
- No calcula, eleva, reduce ni reinterpreta `materiality` / `applied_materiality_rule_id` / `materiality_ruleset_version` (solo persiste lo recibido del Evidence Builder; Motor §7A / EB §11B).
- No reinterpreta `knowledge_coverage`, `source_health` / AcquisitionStatus, tipificaciones de ausencia (`DATA_NOT_FOUND`, `ABSENCE_CONFIRMED`, `TOOL_ERROR`, `SOURCE_*`, etc.) ni las colapsa entre sí.
- No reinterpreta `query_context_metadata` (solo la persiste inmutablemente como metadata de Snapshot; no es Bundle N1–N4).
- No llama al LLM.
- No lee fuentes operacionales para inventar conocimiento.
- No sustituye al Evidence Builder ni al IES.

**Rol único:** validar integridad estructural del Bundle, versionar y persistir (append-only). El linaje de autoría/procedencia se conserva bit-a-bit respecto al Bundle.

---

# 2. Knowledge Bundle (contrato conceptual)

El Knowledge Bundle es la unidad de conocimiento ensamblada por el Evidence Builder y entregada al EKS.

## Campos obligatorios del Bundle

| Campo | Contenido |
|-------|-----------|
| `observations` | Observaciones N1 emitidas por el Evidence Builder, derivadas determinísticamente de ObservationRecords transportables de `03A` (pueden ser lista vacía). No son AcquisitionStatus. |
| `facts` | Hechos N2 (pueden ser lista vacía) |
| `evidence` | Evidencias N3 (pueden ser lista vacía) |
| `diagnoses` | Diagnósticos N4 (pueden ser lista vacía) |
| `conflicts` | Conflictos tipificados A–E (pueden ser lista vacía) |
| `open_questions` | Preguntas abiertas neutrales (pueden ser lista vacía) |
| `knowledge_coverage` | Estado de cobertura: `CONOZCO` \| `CONOZCO_PARCIALMENTE` \| `EXISTE_CONFLICTO` \| `NO_CONOZCO` |
| `source_health` | Resumen de AcquisitionStatus / salud de fuentes del ciclo |
| `ruleset_versions` | Versiones de reglas de ensamblaje aplicadas por el EB |
| `traceability` | Encadenamiento a pregunta, Plan, Tool Plan, ejecución y pipeline |

### Metadatos mínimos de ciclo

| Campo | Descripción |
|-------|-------------|
| `bundle_id` | Identificador único del Bundle |
| `trace_id` | Identificador de traza del ciclo de consulta |
| `produced_at` | Momento de producción por el Evidence Builder |
| `producer` | Siempre `evidence_builder` |

### `observations` (aclaración de frontera)

`bundle.observations` contiene **Observaciones N1** emitidas por el Evidence Builder (`02`, decisión `N1_WRAPS_03A`). Cada elemento deriva de un ObservationRecord transportable de `03A`, con preservación de procedencia, lineage y referencia al payload original. No es una reinterpretación libre del payload 03A. `AcquisitionStatus` no vive en `observations`; se resume en `source_health`.

El EKS **no** reinterpreta esos objetos: solo persiste el Bundle. Esta aclaración **no** redefine `validate_structure`, la realización física D1–D9 de este documento, ni el contrato `03A`.

### Regla de recepción

El EKS **rechaza** un ingreso que pretenda ser “solo observaciones” sin la estructura de Bundle.  
El EKS acepta Bundles con listas vacías en hechos/evidencias/diagnósticos cuando la cobertura y `source_health` lo justifican (p. ej. `NO_CONOZCO`).

---

# 3. Knowledge Snapshot

Tras validación estructural, el EKS materializa un **Knowledge Snapshot**:

| Campo | Descripción |
|-------|-------------|
| `snapshot_id` | Identificador inmutable |
| `bundle_id` | Bundle de origen |
| `version` | Versión monotónica append-only |
| `persisted_at` | Momento de persistencia |
| `bundle` | Copia íntegra del Knowledge Bundle (sin mutación) |
| `integrity` | Digest criptográfico determinista sobre una representación canónica del Bundle persistido. El algoritmo específico **no** se congela en este contrato. **No** es firma digital del IES (`04` §16: huella ≠ firma). |
| `query_context_metadata` | Metadata inmutable de consulta ejecutiva transportada por el Snapshot para que el IES proyecte `query_context`. **No** forma parte del Bundle N1–N4. El EKS la persiste y **no** la interpreta. Ver §8. |

### Snapshot sin diagnósticos (permitido)

Un Knowledge Snapshot **puede existir sin diagnósticos** cuando el estado de cobertura o la salud de fuentes sea uno de:

- `NO_CONOZCO`
- `SOURCE_NOT_INTEGRATED` (vía `source_health` / AcquisitionStatus)
- `SOURCE_RESTRICTED`
- `TOOL_ERROR`

En esos casos:

- `diagnoses` puede ser `[]`;
- no se exige evidencia ni hechos sustantivos de negocio;
- el Snapshot permanece auditable y declara fuente faltante, restringida o fallida;
- el IES puede proyectarse desde este Snapshot **sin diagnósticos**, declarando el límite.

Esto **no** es un error arquitectónico: es el camino válido de desconocimiento controlado (Constitución IV).

---

# 4. Operaciones del EKS

| Operación | Comportamiento |
|-----------|----------------|
| `validate_structure` | Comprueba presencia de campos del Bundle; tipos; `trace_id`; no vacío conceptual del contenedor |
| `append_snapshot` | Persiste una **nueva** versión; no sobrescribe snapshots previos. El EKS asigna `version = max(version)+1` por `trace_id` en transacción con bloqueo (V2). Existe restricción `UNIQUE(trace_id, version)`. `snapshot_id` es opaco e inmutable. Persiste también `query_context_metadata` como metadata inmutable del Snapshot, **sin** interpretarla y **sin** incorporarla al Bundle. |
| `get_snapshot` | Por `snapshot_id`: el Snapshot exacto. Por `trace_id`: la versión monotónica **máxima** de ese ciclo (G_LATEST). No fusiona versiones. |
| `list_versions` | Historial append-only agrupado **solo** por `trace_id` (L_TRACE), ordenado por `version`. |

### Prohibiciones operativas

1. No editar un Snapshot persistido.  
2. No recalcular confianza.  
3. No fusionar Bundles contradictorios en silencio.  
4. No promover AcquisitionStatus a Hecho.  
5. No inventar ObservationRecords.
6. No reinterpretar `query_context_metadata`.

---

# 5. Relación con capas

| Capa | Relación con EKS |
|------|------------------|
| Observation Pipeline | No escribe en EKS; produce ObservationRecords / AcquisitionStatus hacia EB |
| Evidence Builder | **Único productor** del Knowledge Bundle |
| EKS | Valida, versiona, persiste |
| IES | Consume **Snapshot** (Bundle opaco + metadatos de almacén + `query_context_metadata`), no fuentes operacionales ni Tool Results crudos (`04-IES-STANDARD.md` v1.0 APROBADO PARA CONGELAMIENTO; runtime pendiente). No recibe una segunda entrada operacional de consulta. |
| Reasoning Engine | No escribe en EKS; lee IES derivado del Snapshot |

---

# 6. Invariantes

1. Entrada = Knowledge Bundle N1–N4 (+ estados), nunca solo observaciones sueltas.  
2. El EKS no calcula, clasifica ni transforma.  
3. Append-only.  
4. Snapshot sin diagnósticos permitido bajo `NO_CONOZCO` / fuente no integrada / restringida / error de tool.  
5. El Bundle persistido es bit-a-bit el producido por el EB (más metadatos de almacén).
6. Campos de materialidad se preservan sin mutación; `MATERIALITY_NOT_ASSESSED` no se “corrige” a `MAT_LOW` en almacén.  
7. Sin LLM.
8. Trazabilidad completa vía `trace_id`.
9. `query_context_metadata` es metadata inmutable de Snapshot; EKS la persiste y no la interpreta; no vive en `bundle.observations` ni cambia N1–N4.

---

# 7. Realización física v1 (D1–D9)

Esta sección **no** redefine N1–N5 ni la Constitución. No introduce epistemología. No autoriza runtime por sí sola. Registra las decisiones físicas aprobadas por HUMAN_APPROVER (tarea `ARCH-EKS-PHYSICAL-DECISIONS-002`, G2). Evidencia: `ARCH-EKS-PHYSICAL-DECISIONS-001`, `IMPL-EKS-READINESS-002`.

Los identificadores P1, R3, V2, G_LATEST, L_TRACE, M1, I_DIGEST, POOL_DEDICATED y O_EKS_FIRST son los de esa aprobación. **Prohibido** sustituirlos en implementación.

| ID | Decisión aprobada | Significado contractual |
|----|-------------------|-------------------------|
| D1 | **P1** | El EKS v1 persiste en el **mismo motor de persistencia ya usado por la aplicación**, en **esquema y/o tablas nuevas**. No reutiliza tablas operacionales (folios, ARR, IGF, `director_ia_bitacora`, Delta Ingreso AI). No eleva un motor a norma constitucional. |
| D2 | **R3** | Snapshot físico = columnas de metadatos de almacén (`snapshot_id`, `bundle_id`, `trace_id`, `version`, `persisted_at`, `integrity`) + **Bundle opaco** (copia íntegra, sin descomponer N2–N4 en tablas de verdad). |
| D3 | **V2 + UNIQUE(trace_id, version)** | El EKS asigna `version` monotónica por `trace_id` (`max+1` bajo bloqueo). Restricción de unicidad `(trace_id, version)`. INSERT only; prohibido UPDATE/DELETE del Snapshot persistido; prohibido upsert que sobrescriba. |
| D4 | **G_LATEST** | `get_snapshot(snapshot_id)` = exacto. `get_snapshot(trace_id)` = versión monotónica máxima de ese `trace_id`. No fusionar. |
| D5 | **L_TRACE** | `list_versions` agrupa solo por `trace_id`. Planta/periodo/pregunta no son clave de almacén v1; viven dentro del Bundle. |
| D6 | **M1** | El esquema EKS se crea con el patrón existente `sql/` + script de aplicación (`CREATE IF NOT EXISTS`) sobre **objetos nuevos**. No ALTER de tablas de producto. No DDL de bootstrap mezclado en el módulo de canal. |
| D7 | **I_DIGEST** | `integrity` exige un **digest criptográfico determinista** sobre una **representación canónica** del Bundle persistido. El **algoritmo criptográfico específico no se congela** en este contrato (decisión de implementación). No es firma digital IES (`04` §16). |
| D8 | **POOL_DEDICATED** | El runtime EKS usa pool o cliente **propio**, no el pool del bot WhatsApp/dashboard. Si D1/P1, puede compartir URL de conexión; no comparte el pool del canal. |
| D9 | **O_EKS_FIRST** | El primer runtime EKS se valida contra **fixtures ilustrativos de `03B`** (cifras ficticias; no cobertura institucional). El Evidence Builder sigue siendo el **único productor** de Bundles de producción. Los fixtures no sustituyen al EB. |

### Límites de esta realización

1. Runtime **PENDIENTE**. Esta sección no implementa EKS.
2. No nombra algoritmo de digest (D7).
3. No congela un encoding de documento (p. ej. un tipo JSON de motor) como epistemología.
4. No autoriza IMPL-EKS-001 ni ninguna tarea posterior.

---

# 8. Extensión mínima de metadata ejecutiva (ARCH-IES-PHYSICAL-DECISIONS-002)

Esta sección **no** redefine N1–N5, Constitución, Bundle N1–N4 ni las decisiones D1–D9 de §7. No introduce epistemología. No autoriza runtime IES ni persistencia IES. No cambia append-only, `get_snapshot`, `list_versions`, versionado EKS ni integrity EKS (D7 permanece digest del **Bundle**). Registra las decisiones físicas aprobadas por HUMAN_APPROVER (tarea `ARCH-IES-PHYSICAL-DECISIONS-002`, G2). Evidencia: `ARCH-IES-PHYSICAL-DECISIONS-001`.

Los identificadores SNAPSHOT_CARRIES_QUERY_CONTEXT_METADATA y MINIMAL_QUERY_METADATA_EXTENSION son los de esa aprobación. **Prohibido** sustituirlos en implementación.

| ID | Decisión aprobada | Significado contractual |
|----|-------------------|-------------------------|
| — | **SNAPSHOT_CARRIES_QUERY_CONTEXT_METADATA** | La regla «entrada única = Knowledge Snapshot» permanece intacta. El IES Builder **no** recibe una segunda entrada operacional para `query_context`. El Knowledge Snapshot expone, en su representación persistida, `query_context_metadata` inmutable necesaria para proyectar `query_context` del IES. |
| — | **MINIMAL_QUERY_METADATA_EXTENSION** | Extensión mínima del Snapshot para transportar esa metadata. Bundle opaco intacto. Snapshot inmutable. Append-only intacto. Versionado EKS intacto. Integrity EKS (D7, Bundle) intacta. `AcquisitionStatus` no se mezcla dentro de `observations`. |

### Propiedad y tránsito

La metadata se origina upstream conforme a sus propietarios contractuales, atraviesa el Evidence Builder **sin reinterpretación** y queda persistida por el EKS como metadata inmutable del Snapshot. El IES **únicamente** la proyecta.

### Campos mínimos de `query_context_metadata`

| Campo | Obligatorio | Notas |
|-------|-------------|-------|
| `executive_query_id` | Sí | Identificador de la consulta ejecutiva concreta |
| `query_fingerprint` | No | Nullable/opcional |
| `trace_id` | Sí | Ejecución técnica del ciclo |
| `original_question` | Sí | Pregunta tal como se formuló |
| `intent` | Sí | Intent del Planner (o equivalente tipificado) |
| `requesting_user_id` | Sí | Id interno; no secreto |
| `requesting_role` | Sí | Rol ejecutivo / permiso |
| `channel` | Sí | Canal de la consulta; **no** versiona el IES |
| `plant_or_scope` | Condicional | Cuando aplique |
| `period` | Condicional | Cuando aplique |
| `resolved_entities` | Sí | Lista (puede vacía) |
| `permission_restrictions` | Sí | Lista (puede vacía); sin tokens de sesión |
| `knowledge_effective_date` | Sí | Fecha/hora efectiva del conocimiento |

### Prohibiciones

- El IES Builder no consulta Planner, chat ni request runtime para completar `query_context`.
- El IES Builder no inventa usuario, rol ni canal.
- El IES Builder no re-resuelve entidades ni recalcula permisos.
- El EKS no reinterpreta `query_context_metadata`.
- `query_context_metadata` no forma parte del Bundle N1–N4 ni de `bundle.observations`.
- Esta sección **no** autoriza IMPL-IES-001.

### Relación con D2 / R3

D2 (**R3**) no se sustituye. `query_context_metadata` es metadata de Snapshot **adicional** e inmutable, persistida junto a las columnas de almacén; no descompone el Bundle; no entra en el digest D7 del Bundle.

---

# Control documental

| Campo | Valor |
|-------|--------|
| Documento | `03-EXECUTIVE-KNOWLEDGE-STORE.md` |
| Versión | 1.4 |
| Estado | CONTRATO APROBADO TRAS AUDITORÍA E2E; realización física v1 registrada (D1–D9); `query_context_metadata` registrada (ARCH-IES-PHYSICAL-DECISIONS-002) |
| Implementación | PENDIENTE |
| Calibración k/wi | No aplica (fuera de alcance del EKS) |
| Firma digital IES | Fuera de alcance (`04`; D7 = huella, no firma) |
