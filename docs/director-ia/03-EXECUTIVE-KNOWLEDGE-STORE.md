# 03 — Executive Knowledge Store (EKS)

## Almacén de conocimiento ejecutivo — contrato de persistencia

**Documento:** `docs/director-ia/03-EXECUTIVE-KNOWLEDGE-STORE.md`  
**Versión:** 1.1  
**Estado:** CONTRATO APROBADO TRAS AUDITORÍA E2E  
**Tipo:** Especificación de almacén (sin implementación)

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
- No transforma, reinterpreta ni “mejora” el Knowledge Bundle.
- No llama al LLM.
- No lee fuentes operacionales para inventar conocimiento.
- No sustituye al Evidence Builder ni al IES.

**Rol único:** validar integridad estructural del Bundle, versionar y persistir (append-only).

---

# 2. Knowledge Bundle (contrato conceptual)

El Knowledge Bundle es la unidad de conocimiento ensamblada por el Evidence Builder y entregada al EKS.

## Campos obligatorios del Bundle

| Campo | Contenido |
|-------|-----------|
| `observations` | ObservationRecords de negocio (pueden ser lista vacía) |
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
| `integrity` | Sello/hash o equivalente conceptual de integridad |

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
- el futuro IES puede proyectarse desde este Snapshot **sin diagnósticos**, declarando el límite.

Esto **no** es un error arquitectónico: es el camino válido de desconocimiento controlado (Constitución IV).

---

# 4. Operaciones del EKS

| Operación | Comportamiento |
|-----------|----------------|
| `validate_structure` | Comprueba presencia de campos del Bundle; tipos; `trace_id`; no vacío conceptual del contenedor |
| `append_snapshot` | Persiste nueva versión; no sobrescribe snapshots previos |
| `get_snapshot` | Lectura por `snapshot_id` / `trace_id` |
| `list_versions` | Historial append-only del ciclo o entidad de consulta |

### Prohibiciones operativas

1. No editar un Snapshot persistido.  
2. No recalcular confianza.  
3. No fusionar Bundles contradictorios en silencio.  
4. No promover AcquisitionStatus a Hecho.  
5. No inventar ObservationRecords.

---

# 5. Relación con capas

| Capa | Relación con EKS |
|------|------------------|
| Observation Pipeline | No escribe en EKS; produce ObservationRecords / AcquisitionStatus hacia EB |
| Evidence Builder | **Único productor** del Knowledge Bundle |
| EKS | Valida, versiona, persiste |
| IES (futuro) | Consume **Snapshot**, no fuentes operacionales ni Tool Results crudos |
| Reasoning Engine | No escribe en EKS; lee IES derivado del Snapshot |

---

# 6. Invariantes

1. Entrada = Knowledge Bundle N1–N4 (+ estados), nunca solo observaciones sueltas.  
2. El EKS no calcula, clasifica ni transforma.  
3. Append-only.  
4. Snapshot sin diagnósticos permitido bajo `NO_CONOZCO` / fuente no integrada / restringida / error de tool.  
5. El Bundle persistido es bit-a-bit el producido por el EB (más metadatos de almacén).  
6. Sin LLM.  
7. Trazabilidad completa vía `trace_id`.

---

# Control documental

| Campo | Valor |
|-------|--------|
| Documento | `03-EXECUTIVE-KNOWLEDGE-STORE.md` |
| Versión | 1.1 |
| Estado | CONTRATO APROBADO TRAS AUDITORÍA E2E |
| Implementación | PENDIENTE |
| Calibración k/wi | No aplica (fuera de alcance del EKS) |
