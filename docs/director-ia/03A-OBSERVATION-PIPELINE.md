# 03A — Observation Pipeline

## Pipeline de adquisición y contrato ObservationRecord

**Documento:** `docs/director-ia/03A-OBSERVATION-PIPELINE.md`  
**Versión:** 1.1  
**Estado:** CONTRATO APROBADO TRAS AUDITORÍA E2E  
**Tipo:** Especificación de pipeline de entrada a Evidence Builder (sin implementación)

### Dependencia normativa

| Documento | Rol |
|-----------|-----|
| `docs/director-ia/DIRECTOR_IA_CONSTITUTION.md` | Norma superior |
| `docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md` | Gobernanza |
| `docs/director-ia/02-EVIDENCE-BUILDER.md` | Consumidor; aplica reglas de ausencia y ensamblaje |
| `docs/director-ia/03-EXECUTIVE-KNOWLEDGE-STORE.md` | Persistencia posterior (no escribe el OP) |
| `docs/director-ia/DIRECTOR_IA_V2_FASE_1_VERACIDAD.md` | Capacidades |
| `docs/director-ia/DIRECTOR_IA_V2_FASE_2_PLANNER.md` | Plan |
| `docs/director-ia/DIRECTOR_IA_V2_FASE_3_TOOL_ORCHESTRATOR.md` | Tool Plan |
| `docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md` | Índice |

Ortografía canónica: **lineage** (nunca “linage”).

---

# 1. Propósito

El Observation Pipeline (OP) convierte resultados de ejecución de tools (y estados de no-disponibilidad) en:

1. **AcquisitionStatus** — salud técnica de la adquisición (siempre).  
2. **ObservationRecord(s)** — solo cuando hay resultado de negocio transportable (nunca cuando el estado es puramente técnico de fallo/no integración/restricción).

### Qué nunca hace

- No determina `ABSENCE_CONFIRMED` (eso lo aplica el Evidence Builder).  
- No crea hechos, evidencias ni diagnósticos.  
- No interpreta vacío como ausencia de fenómeno.  
- No inventa entidades.  
- No transforma `TOOL_ERROR` / `SOURCE_RESTRICTED` / `SOURCE_NOT_INTEGRATED` en ObservationRecord de negocio.  
- No modifica el payload original.  
- No llama al LLM.  
- No escribe en el EKS.

---

# 2. Separación AcquisitionStatus vs ObservationRecord

| Concepto | Es | No es |
|----------|----|--------|
| **AcquisitionStatus** | Estado técnico de la adquisición de una tool/dominio en el ciclo | Observación de negocio; hecho; evidencia |
| **ObservationRecord** | Registro de Nivel 1 transportable hacia el Evidence Builder | Error técnico; declaración de no integración |

### Estados de AcquisitionStatus (mínimos)

| Estado | Significado | ¿Genera ObservationRecord de negocio? |
|--------|-------------|----------------------------------------|
| `ACQUIRED_OK` | Tool respondió con payload usable | Sí (si hay filas/métricas/eventos transportables) |
| `ACQUIRED_EMPTY` | Tool OK; resultado vacío / sin filas (`DATA_NOT_FOUND` técnico) | Opcional: registro de transporte vacío tipificado **sin** afirmar ausencia de fenómeno; el EB decide `ABSENCE_CONFIRMED` |
| `SOURCE_NOT_INTEGRATED` | Dominio/tool no integrado | **No** |
| `SOURCE_RESTRICTED` | Sin permiso / inaccesible | **No** |
| `TOOL_ERROR` | Error, fallo o tiempo de espera agotado | **No** |
| `QUERY_SCOPE_INCOMPLETE` | Faltan inputs de alcance | **No** (salvo política futura de registro técnico; no hecho de negocio) |
| `ENTITY_UNRESOLVED` | Sujeto no resoluble de forma canónica | **No** ObservationRecord sobre entidad canónica inventada |

`TOOL_ERROR`, `SOURCE_RESTRICTED` y `SOURCE_NOT_INTEGRATED` **no son observaciones de negocio**.

---

# 3. Contrato unificado ObservationRecord

Campos aprobados (obligatorios salvo indicación):

## Identidad y traza

| Campo | Obligatorio | Descripción |
|-------|-------------|-------------|
| `observation_id` | Sí | Identificador único del registro |
| `trace_id` | Sí | Identificador del ciclo de consulta |

## Objeto `source`

| Campo | Obligatorio | Descripción |
|-------|-------------|-------------|
| `source.tool_id` | Sí | Tool del registry |
| `source.domain` | Sí | Dominio del catálogo |
| `source.system` | Sí | Sistema emisor |
| `source.source_instance_id` | Sí | Instancia concreta de origen (p. ej. plant+mes+extractor) |
| `source.source_family` | Sí | Familia de linaje para independencia (corroboración) |
| `source.origin_event_id` | Condicional | Evento/origen primario si aplica |
| `source.author_id` | Sí | Autor o productor del **dato**; si la tool no expone autor humano, id técnico de producción; nunca omitir |
| `source.author_role` | No (opcional) | Rol del autor cuando exista |
| `source.derived_from` | No | Referencias a otros observation_id / origin si es derivado técnico sin reinterpretar |

## Disparo vs autoría

| Campo | Obligatorio | Descripción |
|-------|-------------|-------------|
| `triggered_by` | Sí | Quién/qué **disparó** la adquisición en este ciclo (usuario, sistema, reevaluación). **Distinto** de `source.author_id`. |

- `author_id` = productor del dato en la fuente.  
- `triggered_by` = actor del request/ciclo.  
No se colapsan.

## Sujeto

| Campo | Obligatorio | Descripción |
|-------|-------------|-------------|
| `subject.entity_type` | Condicional | Tipo (planta, cliente, folio, acción…) |
| `subject.entity_id` | Condicional | Id canónico si `RESOLVED` |
| `subject.entity_label` | Condicional | Etiqueta exhibida (puede ser el valor original) |

## Temporalidad y recepción

| Campo | Obligatorio | Descripción |
|-------|-------------|-------------|
| `effective_period` | Condicional | Periodo de vigencia del dato |
| `extracted_at` | Sí | Momento de extracción en origen/tool |
| `pipeline_received_at` | Sí | Momento de recepción en el OP |

## Payloads (inmutabilidad del original)

| Campo | Obligatorio | Descripción |
|-------|-------------|-------------|
| `normalized_payload` | Sí | Vista normalizada **para procesamiento**; no sustituye al original |
| `raw_payload_reference` | Sí | Referencia al payload original **sin modificar** (auditoría) |

El payload original no se modifica.  
Procesamiento → `normalized_payload`.  
Auditoría → `raw_payload_reference`.

## Alcance y validación

| Campo | Obligatorio | Descripción |
|-------|-------------|-------------|
| `scope_complete` | Sí | `true`/`false` — si el alcance de query estaba completo |
| `validation_state` | Sí | Estado de validación estructural del registro en el OP (p. ej. `VALID` \| `INVALID` \| `PARTIAL`) |

### Lineage

El linaje (`lineage`) se deriva/conserva a partir de `source.*`, `triggered_by`, `trace_id` y referencias `derived_from` para independencia de corroboración en el Evidence Builder. Ortografía: **lineage**.

---

# 4. Resolución de entidades

Toda resolución de sujeto declara uno de:

| Estado | Significado |
|--------|-------------|
| `RESOLVED` | Entidad canónica única |
| `AMBIGUOUS` | Varios candidatos; no se elige en silencio |
| `UNRESOLVED` | No hay canónico usable |

### Debe conservar

| Campo | Descripción |
|-------|-------------|
| `original_value` | Valor tal como vino en la fuente/pregunta |
| `candidates` | Lista de candidatos (si aplica) |
| `resolution_rule` | Regla aplicada (id/versión) |
| `resolution_confidence` | Confianza ordinal/numérica de la resolución (no es confianza del Hecho de negocio) |

Prohibido inventar una entidad canónica cuando el estado no es `RESOLVED`.

---

# 5. Ausencia: OP vs Evidence Builder

| Actor | Responsabilidad |
|-------|-----------------|
| Observation Pipeline | Transporta resultado y cobertura técnica (`ACQUIRED_EMPTY`, scope, AcquisitionStatus). **No** determina `ABSENCE_CONFIRMED`. |
| Evidence Builder | Aplica la regla determinística de ausencia; **solo** `ABSENCE_CONFIRMED` puede generar afirmación de ausencia en Nivel 2. |

Vacío técnico ≠ ausencia de fenómeno ≠ cero.

---

# 6. Entradas y salidas del OP

## Entradas

- Question / `trace_id`
- Plan (Planner)
- Tool Plan (Orchestrator)
- Tool Execution Results (cuando existan)
- Identidad / permisos / planta / periodo

## Salidas

- Lista de `AcquisitionStatus` (una por tool/dominio intentado)
- Lista de `ObservationRecord` (solo negocio transportable)
- Metadatos de cobertura técnica para `source_health` del Bundle

Estas salidas alimentan al Evidence Builder; **no** al EKS directamente.

---

# 7. Invariantes

1. Separación AcquisitionStatus / ObservationRecord.  
2. Sin ObservationRecord de negocio para `TOOL_ERROR`, `SOURCE_RESTRICTED`, `SOURCE_NOT_INTEGRATED`.  
3. OP no determina `ABSENCE_CONFIRMED`.  
4. `author_id` ≠ `triggered_by`.  
5. Payload original inmutable; `normalized_payload` + `raw_payload_reference`.  
6. Entidades: `RESOLVED` \| `AMBIGUOUS` \| `UNRESOLVED` con original, candidatos, regla y confianza.  
7. Ortografía **lineage**.  
8. Sin LLM.  
9. Sin escritura al EKS.

---

# Control documental

| Campo | Valor |
|-------|--------|
| Documento | `03A-OBSERVATION-PIPELINE.md` |
| Versión | 1.1 |
| Estado | CONTRATO APROBADO TRAS AUDITORÍA E2E |
| Implementación | PENDIENTE |
| Nota | Este contrato unifica ObservationRecord; el EB consume estos registros y aplica ausencia/ensamblaje |
