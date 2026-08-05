# 03B — End-to-End Reference Flows

## Flujos de referencia contractuales (Casos A y B)

**Documento:** `docs/director-ia/03B-END-TO-END-REFERENCE-FLOWS.md`  
**Versión:** 1.1  
**Estado:** APROBADO PARA DISEÑAR EL IES  
**Tipo:** Flujos ilustrativos (sin implementación; sin diseño del Reasoning Engine)

### Dependencia normativa

- `DIRECTOR_IA_CONSTITUTION.md`
- `DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md`
- `02-EVIDENCE-BUILDER.md`
- `03-EXECUTIVE-KNOWLEDGE-STORE.md`
- `03A-OBSERVATION-PIPELINE.md`
- `DIRECTOR_IA_ARCHITECTURE_INDEX.md`
- `DIRECTOR_IA_V2_FASE_1_VERACIDAD.md`
- `DIRECTOR_IA_V2_FASE_2_PLANNER.md`
- `DIRECTOR_IA_V2_FASE_3_TOOL_ORCHESTRATOR.md`

### Aviso de conformidad (obligatorio)

1. **Todas las cifras** de este documento son **ILUSTRATIVAS / FICTICIAS**. No representan cobertura real actual ni datos de producción.  
2. **ARR e IGF** en el producto actual son dominios **parciales / `available_on_demand`**, no “completamente integrados”. Un `ACQUIRED_OK` en un ciclo ilustrativo **no** declara integración total del dominio.  
3. Elementos **futuros ficticios** (no forman parte de estos flujos ni del catálogo vigente como tools ejecutables): `SAP_S4`, `get_sales_metrics`, `get_ledger_status`, inventario ERP genérico u homólogos. Si se mencionan en ejemplos futuros, deben etiquetarse como **FICTICIO / FUTURO**.  
4. **No se incluyen hipótesis de Nivel 5.**

---

# Validaciones transversales (aplican a A y B)

1. Ningún bypass de capas.  
2. Ningún dato crudo llega al IES directamente.  
3. Ningún LLM aparece en N1–N4.  
4. No se interpreta vacío como ausencia.  
5. No se inventa una entidad.  
6. No se transforma error técnico en hecho.  
7. Cada ID conserva trazabilidad (`trace_id`, ids de capa).  
8. El EKS no modifica el Knowledge Bundle.  
9. El IES futuro consume un Snapshot, no las fuentes operacionales.  
10. El camino `NO_CONOZCO` es un resultado válido, no un error arquitectónico.

---

# Distinción de autoría / disparo / extracción

En ObservationRecords y trazas de estos flujos:

| Campo | Significado | Ejemplo ilustrativo |
|-------|-------------|---------------------|
| `content_author_id` | Autor o productor del **contenido de negocio** en origen (humano o sistema de registro) | productor declarado por ARR/IGF (ILUSTRATIVO) |
| `extracted_by` | Componente/tool que **extrajo** el payload en este ciclo | `get_arr_snapshot` / `get_igf_snapshot` |
| `triggered_by` | Quién/qué **disparó** la adquisición en este ciclo (usuario, sistema, reevaluación) | usuario dashboard del request |

Estos tres campos **no se colapsan**.  
Nota de alineación: el contrato unificado 03A usa `source.author_id` para el productor del dato; en estos flujos de referencia, `content_author_id` corresponde a esa semántica de autoría de contenido, y `extracted_by` distingue la tool extractora de `triggered_by`.

---

# CASO A — Conocimiento disponible (parcial / on-demand)

**Pregunta ilustrativa:** «¿Por qué cayó Puebla?»  
**`trace_id`:** `tr_caseA_puebla_ilustrativo`

> Nota: el flujo produce hechos/evidencias/diagnóstico **no causales**. La pregunta usa “por qué” en lenguaje natural; el Motor **no** emite hipótesis causales (Nivel 5 fuera de alcance).  
> Cobertura esperada: **`CONOZCO_PARCIALMENTE`** — no `CONOZCO` pleno — porque ARR/IGF son on-demand parciales y dominios delta UI pueden estar no integrados.

## A.1 Question Request

| Campo | Valor ilustrativo |
|-------|-------------------|
| `question` | ¿Por qué cayó Puebla? |
| `identity` | usuario dashboard autenticado |
| `planta` | Puebla (autorizada) |
| `period` | mes B ilustrativo vs mes A ilustrativo |

## A.2 Capabilities

- Dominios financieros/comerciales/operativos: legibilidad **según catálogo vigente** (parcial / on-demand donde aplique).  
- No se declara el dominio financiero como “completamente integrado”.  
- No se detecta prohibición total del alcance.  
- Salida: alcance permitido con **límites de integración explícitos** (no inventar cobertura plena).

## A.3 Planner Plan

| Campo | Valor ilustrativo |
|-------|-------------------|
| `intent` | `financial_diagnosis` (y/o `plant_diagnosis` según wording) |
| `domains` | `arr`, `igf`, (deltas UI si el wording los pide → pueden ser no integrados) |
| `requires_clarification` | false |

## A.4 Tool Plan

| tool_id | status | executable | Nota de integración real |
|---------|--------|------------|--------------------------|
| `get_arr_snapshot` | `available_on_demand` | true (con planta/periodo) | **Parcial / on-demand** — no integración completa |
| `get_igf_snapshot` | `available_on_demand` | true | **Parcial / on-demand** — no integración completa |
| `get_delta_*` (si aplica) | `declared_not_integrated` | false | No integrado |

`can_execute=true`, `can_execute_all=false` si hay deltas no integrados → cobertura parcial esperable.  
No aparecen tools futuras ficticias (`SAP_S4`, `get_sales_metrics`, `get_ledger_status`, inventario ERP).

## A.5 Tool Execution Results (ilustrativo)

| tool | resultado | Advertencia |
|------|-----------|-------------|
| ARR (on-demand) | payload OK — venta/margen **ILUSTRATIVO** | No implica cobertura real actual del dominio |
| IGF (on-demand) | payload OK — compromiso/margen **ILUSTRATIVO** | No implica cobertura real actual del dominio |
| deltas UI | no ejecutado (not integrated) | — |

Cifras **FICTICIAS** de ejemplo (no reales; no son cobertura institucional):

- Venta mes A: **120.00 t** (ILUSTRATIVO / FICTICIO)  
- Venta mes B: **95.00 t** (ILUSTRATIVO / FICTICIO)  
- Margen mes A: **ILUSTRATIVO / FICTICIO**  
- Margen mes B: **ILUSTRATIVO / FICTICIO** (menor que A)

## A.6 Acquisition Status

| tool | AcquisitionStatus | Lectura correcta |
|------|-------------------|------------------|
| `get_arr_snapshot` | `ACQUIRED_OK` | Éxito de adquisición **en este ciclo**; ≠ dominio 100% integrado |
| `get_igf_snapshot` | `ACQUIRED_OK` | Ídem |
| deltas | `SOURCE_NOT_INTEGRATED` | Sin ObservationRecord de negocio |

## A.7 Observation Pipeline

- Genera ObservationRecords solo para ARR/IGF (`ACQUIRED_OK`).  
- Para deltas: **solo** AcquisitionStatus `SOURCE_NOT_INTEGRATED`; **sin** ObservationRecord de negocio.  
- No determina `ABSENCE_CONFIRMED`.  
- Autoría / extracción / disparo:
  - `triggered_by` = usuario del request;  
  - `extracted_by` = tool (`get_arr_snapshot` / `get_igf_snapshot`);  
  - `content_author_id` = productor del contenido en origen (alineado a `source.author_id` en 03A).  
- `normalized_payload` + `raw_payload_reference` (original intacto).  
- Entidad planta Puebla: `RESOLVED` con original “Puebla”, candidatos=[], regla ilustrativa, confianza de resolución ilustrativa.

## A.8 Observation Records (resumen)

| observation_id | domain | subject | notas |
|----------------|--------|---------|-------|
| `obs_arr_1` | arr | planta Puebla | métricas venta/margen **ILUSTRATIVAS / FICTICIAS** |
| `obs_igf_1` | igf | planta Puebla | compromiso/margen **ILUSTRATIVOS / FICTICIOS** |

Ambos con `trace_id=tr_caseA_puebla_ilustrativo`, lineage vía `source_family` / `source_instance_id`.

## A.9 Evidence Builder

### Hechos (N2) — ilustrativos

| fact_id | statement controlado |
|---------|----------------------|
| `fact_venta_baja` | La venta de Puebla en mes B es 95.00 t (ILUSTRATIVO/FICTICIO), menor que mes A 120.00 t (ILUSTRATIVO/FICTICIO). |
| `fact_margen_desvio` | El margen observado en mes B está por debajo del mes A / compromiso IGF según regla R_ilustrativa. |

Confianza dimensional expuesta (Fs,R,Cb,Cs,Cb_ov); **sin** fijar `k`/`wi`.  
Sin afirmación de ausencia (no aplica `ABSENCE_CONFIRMED` aquí).

### Evidencias (N3) — no causales

| evidence_id | type | applied_rule |
|-------------|------|--------------|
| `ev_desviacion_venta` | desviación | `rule_desviacion_periodo_v1` (ILUSTRATIVA) |
| `ev_cobertura_parcial_deltas` | — / soporte de límite | dominio delta `SOURCE_NOT_INTEGRATED` |

Lenguaje: correlación/desviación; **no** “por eso cayó” / no causalidad.

### Diagnóstico (N4)

| diagnosis_id | category | criterion |
|--------------|----------|-----------|
| `dx_riesgo_fin` | riesgo financiero | regla de clasificación ilustrativa + soporte de hechos/evidencias |
| posible | información insuficiente | si la descomposición venta vs descuento no está integrada |

### Conflictos

- Si ARR e IGF discreparan en el mismo periodo → Tipo A abierto (no resuelto por ponderación).  
- En este ejemplo base: sin conflicto de datos; posible Tipo D de cobertura por deltas.

### Preguntas abiertas (neutrales)

- ¿La variación es por venta o por descuento? (fuente delta no integrada)  
- No son hipótesis.

## A.10 Knowledge Bundle

```
bundle_id: kb_caseA_ilustrativo
trace_id: tr_caseA_puebla_ilustrativo
observations: [obs_arr_1, obs_igf_1]
facts: [fact_venta_baja, fact_margen_desvio]
evidence: [ev_desviacion_venta, ...]
diagnoses: [dx_riesgo_fin, ...]
conflicts: [...]
open_questions: [...]
knowledge_coverage: CONOZCO_PARCIALMENTE
source_health: {
  arr: ACQUIRED_OK (on-demand / parcial),
  igf: ACQUIRED_OK (on-demand / parcial),
  deltas: SOURCE_NOT_INTEGRATED
}
ruleset_versions: { evidence_builder: "2.0", absence_rules: "pendiente-calibracion" }
traceability: { question, plan, tool_plan, acquisition, observations }
```

## A.11 EKS append-only

- Valida estructura del Bundle.  
- Persiste Snapshot `snap_caseA_v1` **sin modificar** el Bundle.  
- No calcula ni clasifica.

## A.12 Knowledge Snapshot

| Campo | Valor |
|-------|--------|
| `snapshot_id` | `snap_caseA_v1` |
| `version` | 1 |
| `bundle` | idéntico a kb_caseA_ilustrativo |
| diagnósticos | presentes (permitido) |
| cobertura | `CONOZCO_PARCIALMENTE` (ilustrativo; no cobertura real actual) |

## A.13 Futura proyección IES

El IES se proyecta **desde el Snapshot**:

- incluye hechos/evidencias/diagnóstico/límites/preguntas abiertas;  
- declara ARR/IGF como adquisición on-demand parcial y deltas no integrados;  
- **no** incluye hipótesis Nivel 5;  
- **no** lee ARR/IGF crudos otra vez como verdad paralela;  
- **no** presenta cifras ilustrativas de este documento como cobertura institucional real.

---

# CASO B — Fuente no integrada

**Pregunta:** «¿En qué etapa está el folio 421?»  
**`trace_id`:** `tr_caseB_folio421_ilustrativo`

## B.1 Capabilities

- Detecta dominio folios/kanban / estatus de folio como **no integrado** (o cobertura `none` según catálogo Fase 1).  
- Emite limitación de veracidad: no confundir con “folio inexistente”.

## B.2 Planner Plan

| Campo | Valor |
|-------|--------|
| `intent` | `folio_status` |
| `domains` | folios / kanban |
| `folio_id` | 421 (si parseado; si falta → scope incompleto adicional) |

## B.3 Tool Plan

| tool_id | status | executable |
|---------|--------|------------|
| `get_folio_status` | `declared_not_integrated` | false |

`can_execute=false` (o sin tools ejecutables para el intent).  
No se inventan tools ERP/SAP/inventario como sustituto.

## B.4 No se ejecuta consulta falsa

- No hay Tool Execution Result inventado.  
- No se consulta DB de kanban “como si” estuviera integrada.

## B.5 Acquisition Status

| tool | AcquisitionStatus |
|------|-------------------|
| `get_folio_status` | `SOURCE_NOT_INTEGRATED` |

## B.6 Observation Pipeline

- **No** crea ObservationRecords de negocio.  
- Transporta AcquisitionStatus + cobertura técnica.  
- No determina `ABSENCE_CONFIRMED`.  
- No inventa entidad/etapa del folio.  
- Si hubiera traza de ciclo: `triggered_by` = usuario; sin `extracted_by` de negocio ni `content_author_id` de etapa (no hubo extracción de estatus).

## B.7 Evidence Builder

- No crea hechos sustantivos de etapa.  
- No crea evidencias de estatus.  
- No crea diagnósticos sustantivos de negocio de folio.  
- Puede registrar pregunta abierta: integrar kanban/folios o consultar dashboard.  
- `knowledge_coverage` = `NO_CONOZCO` para el alcance requerido.  
- Confianza 0.00 en ese alcance (cláusula constitucional).

## B.8 Knowledge Bundle

```
bundle_id: kb_caseB_ilustrativo
trace_id: tr_caseB_folio421_ilustrativo
observations: []
facts: []
evidence: []
diagnoses: []
conflicts: []
open_questions: [ "¿Fuente de estatus de folio integrada?", ... ]
knowledge_coverage: NO_CONOZCO
source_health: { get_folio_status: SOURCE_NOT_INTEGRATED }
ruleset_versions: { evidence_builder: "2.0" }
traceability: { question, plan, tool_plan, acquisition: SOURCE_NOT_INTEGRATED }
```

## B.9 EKS

- Persiste Snapshot auditable de desconocimiento.  
- Snapshot **sin diagnósticos** — permitido.  
- No modifica el Bundle.  
- No convierte `SOURCE_NOT_INTEGRATED` en hecho “folio sin etapa”.

## B.10 Futuro IES

- Puede existir **sin diagnósticos**.  
- Debe declarar la fuente faltante y el alcance exacto.  
- Consume el Snapshot; no las fuentes operacionales.  
- `NO_CONOZCO` = resultado válido.

---

# Invariantes verificadas en A y B

| # | Invariante | Caso A | Caso B |
|---|------------|--------|--------|
| 1 | Sin bypass de capas | Sí | Sí |
| 2 | Sin dato crudo al IES | Sí | Sí |
| 3 | Sin LLM en N1–N4 | Sí | Sí |
| 4 | Vacío ≠ ausencia | Sí (N/A vacío) | Sí |
| 5 | Sin inventar entidad | Sí (RESOLVED planta) | Sí (no inventa etapa) |
| 6 | Error/no integración ≠ hecho | Sí (deltas) | Sí |
| 7 | Trazabilidad de IDs | Sí | Sí |
| 8 | EKS no modifica Bundle | Sí | Sí |
| 9 | IES ← Snapshot | Sí | Sí |
| 10 | NO_CONOZCO válido | N/A (parcial) | Sí |
| 11 | On-demand ≠ integración completa | Sí | N/A |
| 12 | Cifras ilustrativas ≠ cobertura real | Sí | Sí |
| 13 | `content_author_id` ≠ `extracted_by` ≠ `triggered_by` | Sí | Sí (cuando aplica) |

---

# Dictamen de conformidad

No se detectaron nuevas no conformidades críticas tras las correcciones de esta versión 1.1.

**Resultado:** APROBADO PARA DISEÑAR EL IES (`04-IES-STANDARD`).

---

# Control documental

| Campo | Valor |
|-------|--------|
| Documento | `03B-END-TO-END-REFERENCE-FLOWS.md` |
| Versión | 1.1 |
| Estado | APROBADO PARA DISEÑAR EL IES |
| Cifras | Solo ILUSTRATIVAS / FICTICIAS |
| Integración ARR/IGF | Parcial / on-demand (no completa) |
| Elementos futuros ficticios | `SAP_S4`, `get_sales_metrics`, `get_ledger_status`, inventario ERP — excluidos / etiquetados |
| Hipótesis N5 | Excluidas |
| Siguiente | Diseño de `04-IES-STANDARD` |
