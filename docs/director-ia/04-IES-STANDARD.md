# 04 — IES Standard

## Informe Ejecutivo de Situación — estándar de producto

**Documento:** `docs/director-ia/04-IES-STANDARD.md`  
**Versión:** 1.0  
**Estado:** APROBADO PARA CONGELAMIENTO CANDIDATO v1.0  
**Tipo:** Esquema y reglas del IES (sin implementación; sin Reasoning Engine; sin Channel Projection detallada)

### Dependencia normativa

| Documento | Rol |
|-----------|-----|
| `docs/director-ia/DIRECTOR_IA_CONSTITUTION.md` | Norma superior; naturaleza del IES (IX); cobertura; conflictos A–E |
| `docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md` | Gobernanza del Motor; política IES oficial/alternativo |
| `docs/director-ia/02-EVIDENCE-BUILDER.md` | Ensamblaje N1–N4; ausencia; confianza mecánica; conflictos compuestos; materiality |
| `docs/director-ia/03-EXECUTIVE-KNOWLEDGE-STORE.md` | Knowledge Bundle; Knowledge Snapshot (entrada del IES) |
| `docs/director-ia/03A-OBSERVATION-PIPELINE.md` | ObservationRecord; AcquisitionStatus |
| `docs/director-ia/03B-END-TO-END-REFERENCE-FLOWS.md` | Flujos de referencia A/B |
| `docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md` | Índice maestro (actualización de estado: pendiente; no modificada aquí) |

En conflicto, prevalece la Constitución.  
Este documento **posee** el esquema y versión de producto IES. **No redefine** niveles, cobertura constitucional, tipos de conflicto ni la epistemología.  
**No** calibra `k` ni `wi`. **No** diseña el Reasoning Engine ni Channel Projection. **No** implementa firma digital.

### Congelamiento

**ESTADO: APROBADO PARA CONGELAMIENTO CANDIDATO v1.0**

El congelamiento definitivo de v1.0 requiere:

1. auditoría contractual;  
2. ejemplo `CONOZCO_PARCIALMENTE`;  
3. ejemplo `NO_CONOZCO`;  
4. validación de referencias internas;  
5. ausencia de no conformidades críticas.

No se declara “100% madurez”.

---

# Índice

1. [Identidad del IES](#1-identidad-del-ies)  
2. [Contrato raíz](#2-contrato-raíz)  
3. [Contexto de consulta](#3-contexto-de-consulta)  
4. [Cobertura del conocimiento](#4-cobertura-del-conocimiento)  
5. [Resumen fáctico ejecutivo](#5-resumen-fáctico-ejecutivo)  
6. [Banco de hechos](#6-banco-de-hechos)  
7. [Banco de evidencias](#7-banco-de-evidencias)  
8. [Diagnósticos](#8-diagnósticos)  
9. [Conflictos](#9-conflictos)  
10. [Preguntas abiertas](#10-preguntas-abiertas)  
11. [Salud de fuentes](#11-salud-de-fuentes)  
12. [Limitaciones y desconocimiento](#12-limitaciones-y-declaraciones-de-desconocimiento)  
13. [IES oficial](#13-ies-oficial)  
14. [IES alternativo](#14-ies-alternativo)  
15. [Ciclo de vida](#15-ciclo-de-vida)  
16. [Integridad y auditoría](#16-integridad-y-auditoría)  
17. [Proyecciones de canal](#17-proyecciones-de-canal)  
18. [Contrato para Reasoning Engine](#18-contrato-para-reasoning-engine)  
19. [Casos extremos](#19-casos-extremos)  
20. [Ejemplos completos](#20-ejemplos-completos)  
21. [Invariantes](#21-invariantes)  
22. [Criterios de aceptación](#22-criterios-de-aceptación)  
23. [Declaración de conformidad](#declaración-de-conformidad)  
24. [Catálogo de tokens institucionales](#24-catálogo-de-tokens-institucionales)

---

# 1. Identidad del IES

## Propósito

El **Informe Ejecutivo de Situación (IES)** es la proyección oficial, versionada, auditable e inmutable de un **Knowledge Snapshot**.  
Representa la situación operativa verificable para consumo ejecutivo y para el Reasoning Engine (Nivel 5), **sin** reinterpretar el conocimiento persistido.

## Qué es / qué no es

| El IES es | El IES no es |
|-----------|--------------|
| Producto oficial del Motor (Constitución IX) | El almacén de conocimiento (EKS) |
| Proyección desde un Knowledge Snapshot | El Knowledge Bundle ni el Snapshot mismos |
| Independiente del canal | Un mensaje de chat, voz o WhatsApp |
| Entrada inmutable al Reasoning Engine | Un contenedor de hipótesis |
| Versionado y auditable | Editable por LLM |
| Repetible de forma **verificable** bajo el mismo Snapshot, esquema y rulesets | “Repetibilidad absoluta” |

## Productor

**IES Builder** — componente determinístico del Motor que proyecta un Knowledge Snapshot al esquema de este estándar.  
No consulta fuentes. No ejecuta tools. No transforma Observaciones en Hechos. No crea Evidencias. No produce Hipótesis. No contiene interpretación del LLM. **No redacta explicaciones.**

## Entrada única

Un **Knowledge Snapshot** persistido por el Executive Knowledge Store (`03`).

## Consumidores

| Consumidor | Uso |
|------------|-----|
| **Reasoning Engine** | Única capa de hipótesis (Nivel 5), subordinada al IES (diseño futuro) |
| **Interfaces** | Chat, Voz, WhatsApp, Dashboard, Reportes, Presentaciones — consumen el mismo `ies_id` |

## Diferencias

| Artefacto | Rol |
|-----------|-----|
| **Knowledge Bundle** | Unidad ensamblada por el Evidence Builder (N1–N4 + estados) |
| **Knowledge Snapshot** | Copia inmutable del Bundle + metadatos de almacén (EKS) |
| **IES** | Proyección oficial de producto desde el Snapshot hacia consumidores |

Cadena: `Evidence Builder → Bundle → EKS Snapshot → IES Builder → IES → Reasoning Engine / Interfaces`.

## Independencia de canal y versionado

- Chat, Voz, WhatsApp, Dashboard, Reporte y Presentación **consumen el mismo `ies_id`**.  
- Una proyección de canal **no** crea una nueva versión del IES ni un nuevo `ies_id`.  
- Solo generan otro IES: (a) un **nuevo Snapshot**, (b) una **reproyección formal** del IES Builder sobre Snapshot/rulesets distintos o regeneración versionada, o (c) un **IES alternativo** (`ies_type=ALTERNATIVE`).

## Carácter oficial o alternativo

| `ies_type` | Significado |
|------------|-------------|
| `OFFICIAL` | Parámetros institucionales vigentes; referencia por defecto |
| `ALTERNATIVE` | Reevaluación/impugnación auditada; nunca sustituye en silencio al oficial |

## Vigencia

Definida por `valid_at`, `expires_at` y estado de ciclo de vida (`EXPIRED`, `SUPERSEDED`).  
Una nueva generación formal produce una **nueva versión** (`ies_version` / nuevo `ies_id`), no una edición in-place ni un cambio de canal.

## Inmutabilidad

Una vez en estado de emisión (`VALIDATED`, `PARTIAL`, `CONFLICTED`, `NO_KNOWLEDGE`), el contenido del IES **no se edita**.  
Supersesión = nuevo IES que referencia al anterior.

## Trazabilidad

Todo IES declara `snapshot_reference`, `knowledge_snapshot_version`, `executive_query_id`, `trace_id`, opcionalmente `query_fingerprint`, rulesets y encadenamiento de IDs.

## Repetibilidad

Se exige **repetibilidad verificable bajo el mismo Snapshot, esquema y rulesets**.  
No se declara “repetibilidad absoluta”.

---

# 2. Contrato raíz

## Objeto conceptual (completo; no eliminar campos)

```
{
  ies_id,
  ies_type,
  schema_version,
  ies_version,
  status,
  generated_at,
  valid_at,
  expires_at,
  snapshot_reference,
  knowledge_snapshot_version,
  query_context,
  executive_scope,
  knowledge_coverage,
  executive_summary_facts,
  facts,
  evidence,
  diagnoses,
  conflicts,
  open_questions,
  source_health,
  limitations,
  audit,
  integrity,
  alternative_context
}
```

**Prohibido en el contrato raíz:** hipótesis, recomendaciones del LLM, SQL, JWT, secretos, tokens de sesión, payloads crudos completos, conexiones a fuentes, redacción narrativa libre, firma digital presentada como implementada.

## Obligatoriedad de campos

| Campo | Obligatorio | Condicional / opcional | Notas |
|-------|-------------|------------------------|-------|
| `ies_id` | Sí | — | Identificador único del IES |
| `ies_type` | Sí | — | `OFFICIAL` \| `ALTERNATIVE` |
| `schema_version` | Sí | — | Versión de este estándar (`1.0`) |
| `ies_version` | Sí | — | Versión monotónica del producto IES |
| `status` | Sí | — | Ver §15 |
| `generated_at` | Sí | — | Momento de proyección |
| `valid_at` | Sí | — | Instantánea de validez |
| `expires_at` | No | Opcional / política | Si falta, vigencia por política institucional |
| `snapshot_reference` | Sí | — | `{ snapshot_id, … }` |
| `knowledge_snapshot_version` | Sí | — | Versión del Snapshot EKS proyectado |
| `query_context` | Sí | — | Ver §3 |
| `executive_scope` | Sí | — | Planta/periodo/entidades/modelos en alcance |
| `knowledge_coverage` | Sí | — | Ver §4 (tokens + estados constitucionales) |
| `executive_summary_facts` | Sí | — | Referencias controladas (§5) |
| `facts` | Sí | Lista puede ser `[]` | Banco de hechos |
| `evidence` | Sí | Lista puede ser `[]` | Banco de evidencias |
| `diagnoses` | Sí | Lista puede ser `[]` | Permitido vacío bajo §12 |
| `conflicts` | Sí | Lista puede ser `[]` | `CONF_TYPE_E_GOVERNANCE` no omitible del resumen si existe |
| `open_questions` | Sí | Lista puede ser `[]` | — |
| `source_health` | Sí | — | Ver §11 |
| `limitations` | Sí | — | Ver §12 |
| `audit` | Sí | — | Ver §16 |
| `integrity` | Sí | — | Ver §16 (`signature: null` en v1.0) |
| `alternative_context` | Condicional | Obligatorio si `ALTERNATIVE` | null en `OFFICIAL` |

---

# 3. Contexto de consulta

Objeto `query_context`:

| Campo | Obligatorio | Descripción |
|-------|-------------|-------------|
| `executive_query_id` | Sí | Identificador de la **consulta ejecutiva concreta** |
| `query_fingerprint` | No | Representación canónica **opcional** de preguntas equivalentes |
| `trace_id` | Sí | Identificador de la **ejecución técnica** del ciclo |
| `original_question` | Sí | Pregunta tal como se formuló |
| `intent` | Sí | Intent del Planner (o equivalente tipificado) |
| `requesting_user_id` | Sí | Usuario solicitante (id interno; no secreto) |
| `requesting_role` | Sí | Rol ejecutivo / permiso |
| `channel` | Sí | Canal de consumo; **no** versiona el IES |
| `plant_or_scope` | Condicional | Planta u otro alcance |
| `period` | Condicional | Periodo efectivo solicitado |
| `resolved_entities` | Sí | Lista (puede vacía) |
| `permission_restrictions` | Sí | Restricciones aplicadas (sin tokens) |
| `knowledge_effective_date` | Sí | Fecha/hora efectiva del conocimiento proyectado |

### Separación de IDs de consulta

| ID | Qué identifica | No implica |
|----|----------------|------------|
| `executive_query_id` | La consulta ejecutiva concreta | Un Snapshot fijo |
| `query_fingerprint` | Equivalencia canónica opcional de wording | Obligación de reutilizar el mismo Snapshot |
| `trace_id` | Ejecución técnica (pipeline) | Identidad del IES |

**Regla:** el mismo `query_fingerprint` **no obliga** a usar el mismo Snapshot si cambian tiempo, alcance, permisos o fuentes.

### Prohibiciones

No incluir JWT, secretos, API keys, cookies, connection strings ni tokens de sesión.

### Entidades resueltas (mínimo por ítem)

`entity_type`, `original_value`, `resolution_state` (`RESOLVED` \| `AMBIGUOUS` \| `UNRESOLVED`), `entity_id` (si `RESOLVED`), `candidates`, `resolution_rule`, `resolution_confidence`.

---

# 4. Cobertura del conocimiento

## Estados constitucionales (Constitución IV)

- `CONOZCO`
- `CONOZCO_PARCIALMENTE`
- `EXISTE_CONFLICTO`
- `NO_CONOZCO`

## Tokens institucionales → estados constitucionales

| Token institucional | Estado constitucional |
|---------------------|----------------------|
| `COV_FULL_KNOWLEDGE` | `CONOZCO` |
| `COV_PARTIAL_KNOWLEDGE` | `CONOZCO_PARCIALMENTE` |
| `COV_DATA_CONFLICT` | `EXISTE_CONFLICTO` |
| `COV_NO_KNOWLEDGE` | `NO_CONOZCO` |

**Prohibido:** `COV_TOTAL_IGNORANCE` (no existe en este estándar).

En el IES:

- `coverage_token` = token institucional;  
- `coverage_state` = estado constitucional mapeado.

## Objeto `knowledge_coverage`

| Campo | Obligatorio | Descripción |
|-------|-------------|-------------|
| `coverage_token` | Sí | Uno de `COV_FULL_KNOWLEDGE` \| `COV_PARTIAL_KNOWLEDGE` \| `COV_DATA_CONFLICT` \| `COV_NO_KNOWLEDGE` |
| `coverage_state` | Sí | Estado constitucional mapeado |
| `coverage_score` | No | Si disponible (calibración pendiente); **no** por conteo de fuentes |
| `covered_domains` | Sí | Dominios con hechos útiles en alcance |
| `partial_domains` | Sí | Dominios parciales / on-demand / incompletos |
| `unavailable_domains` | Sí | No integrados o inexistentes en alcance |
| `restricted_domains` | Sí | Restringidos por permiso |
| `failed_tools` | Sí | Tools con fallo tipificado |
| `unresolved_entities` | Sí | Entidades `AMBIGUOUS` / `UNRESOLVED` |
| `incomplete_scopes` | Sí | Alcances incompletos |
| `blocking_limitations` | Sí | Limitaciones que bloquean razonamiento sustantivo |

### Regla

La cobertura **no** se calcula por simple conteo de fuentes.  
`available_on_demand` / adquisición parcial **no** equivale a `COV_FULL_KNOWLEDGE` / `CONOZCO`.

---

# 5. Resumen fáctico ejecutivo

Sección `executive_summary_facts`: alta densidad, **derivada mecánicamente** del Snapshot.  
El IES **no redacta explicaciones**.

## Forma permitida (referencias controladas)

Cada ítem del resumen usa únicamente:

| Campo | Uso |
|-------|-----|
| `statement_token` | Token institucional de afirmación controlada |
| `statement_reference` | Referencia a `fact_id` / `evidence_id` / `diagnosis_id` / `conflict_id` / `limitation_id` |
| `supporting_fact_ids` | Hechos de soporte |
| `supporting_evidence_ids` | Evidencias de soporte |

**Prohibido:** `raw_summary_reference` como prosa libre; narrativa causal; texto LLM.

## Debe incluir referencias a

- hechos prioritarios (según `materiality` / `priority` proyectados);  
- diagnósticos deterministas principales;  
- desviaciones verificadas;  
- conflictos críticos (incluye todo `CONF_TYPE_E_GOVERNANCE`);  
- cobertura y límites bloqueantes.

## Prohibido

- hipótesis;  
- recomendaciones;  
- lenguaje causal no aprobado;  
- suavizar u omitir `CONF_TYPE_E_GOVERNANCE`;  
- presentar cifras ilustrativas como datos institucionales.

---

# 6. Banco de hechos

Cada elemento de `facts[]`:

| Campo | Obligatorio | Descripción |
|-------|-------------|-------------|
| `fact_id` | Sí | Identificador |
| `statement_token` | Sí | Token de declaración controlada |
| `statement_reference` | Condicional | Referencia canónica al statement ensamblado en Snapshot |
| `entity` | Condicional | Entidad del hecho |
| `concept` | Sí | Concepto/métrica tipificada |
| `period` | Condicional | Periodo del hecho |
| `confidence` | Sí | Confianza del hecho (nunca “absoluta”) |
| `confidence_dimensions` | Sí | Fs, R, Cb, Cs, Cb_ov (calibración puede estar pendiente) |
| `supporting_observation_ids` | Sí | ≥1 salvo régimen de ausencia tipificada con soporte |
| `absence_state` | Condicional | Solo tipificación de ausencia |
| `validity` | Sí | Vigencia del hecho en el IES |
| `priority` | Sí | Ordinal proyectado |
| `materiality` | Sí | Materialidad **proyectada** (calculada antes del IES) |
| `applied_materiality_rule_id` | Sí | Regla determinista aplicada en EB/diagnóstico |
| `materiality_ruleset_version` | Sí | Versión del ruleset de materialidad |
| `traceability` | Sí | Encadenamiento a Bundle/Snapshot/reglas |
| `model_projections` | No | Modelos mentales que lo referencian |

### Materiality

`materiality` se **calcula antes del IES**, mediante reglas deterministas del Evidence Builder / diagnóstico.  
El IES **únicamente proyecta**:

- `materiality`  
- `applied_materiality_rule_id`  
- `materiality_ruleset_version`

El IES no recalcula materialidad.

### Regla de ausencia

**Solo `ABSENCE_CONFIRMED` permite un hecho negativo** de ausencia de fenómeno.  
`DATA_NOT_FOUND`, `SOURCE_NOT_INTEGRATED`, `TOOL_ERROR`, vacío técnico ≠ hecho negativo.

---

# 7. Banco de evidencias

Cada elemento de `evidence[]`:

| Campo | Obligatorio | Descripción |
|-------|-------------|-------------|
| `evidence_id` | Sí | Identificador |
| `relation_type` | Sí | correlación, desviación, tendencia, contradicción, … (Motor §5) |
| `statement_token` | Sí | Token de relación controlada |
| `statement_reference` | Condicional | Referencia al statement ensamblado |
| `supporting_fact_ids` | Sí | Debe apuntar a `fact_id` **existentes** en `facts[]` |
| `applied_rule_id` | Sí | Regla versionada |
| `confidence` | Sí | Confianza de la relación ensamblada |
| `temporal_alignment` | Condicional | Alineación temporal |
| `explained_variance_pct` | No | Si aplica y está cuantificado por regla |
| `scope` | Sí | Alcance |
| `causal_status` | Sí | Ver abajo |
| `materiality` | Sí | Proyectada (no recalculada) |
| `applied_materiality_rule_id` | Sí | Regla previa |
| `materiality_ruleset_version` | Sí | Versión |
| `traceability` | Sí | Encadenamiento |

### `causal_status`

| Valor | Significado |
|-------|-------------|
| `NON_CAUSAL` | Relación no causal (default seguro) |
| `CORRELATED` | Correlación declarada como tal |
| `CONTRIBUTION_QUANTIFIED` | Contribución cuantificada por regla |
| `CAUSAL_RULE_APPROVED` | Solo con regla causal formalmente aprobada y versionada |

Correlación **no** se presenta como causalidad.  
El IES no usa lenguaje causal libre.

---

# 8. Diagnósticos

Cada elemento de `diagnoses[]`:

| Campo | Obligatorio | Descripción |
|-------|-------------|-------------|
| `diagnosis_id` | Sí | Identificador |
| `primary_classification` | Sí | Categoría Motor §6 |
| `secondary_classifications` | No | Clasificaciones adicionales |
| `severity` | Sí | Severidad (**atributo independiente**; no es tipo de conflicto) |
| `impact` | Sí | Impacto tipificado |
| `confidence` | Sí | Confianza del diagnóstico ensamblado |
| `model` | Sí | Modelo mental |
| `supporting_evidence_ids` | Condicional | Debe apuntar a `evidence_id` existentes |
| `supporting_fact_ids` | Condicional | Debe apuntar a `fact_id` existentes; al menos evidence o facts según regla |
| `applied_rule_id` | Sí | Criterio/regla de clasificación |
| `validity` | Sí | Vigencia |
| `coverage_token` | Sí | Token de cobertura bajo el cual se emite |
| `coverage_state` | Sí | Estado constitucional mapeado |
| `materiality` | Sí | Proyectada |
| `applied_materiality_rule_id` | Sí | Regla previa |
| `materiality_ruleset_version` | Sí | Versión |
| `related_conflict_ids` | No | Conflictos asociados |

### Taxonomía de diagnóstico (referencia; no redefinición)

riesgo comercial; riesgo financiero; riesgo operativo; falla de ejecución; falla de gobernanza; riesgo de cumplimiento; oportunidad comercial; recuperación en curso; situación estable; información insuficiente; conflicto no resuelto.

### Prohibiciones

No explicar causas probables. No recomendaciones. No hipótesis. No narrativa libre.

---

# 9. Conflictos

## Taxonomía constitucional restaurada (tokens exactos)

| Token | Equivalencia constitucional | Significado (referencia; no redefinición) |
|-------|----------------------------|-------------------------------------------|
| `CONF_TYPE_A_DATA` | Tipo A | Conflicto de datos |
| `CONF_TYPE_B_TEMPORAL` | Tipo B | Conflicto temporal |
| `CONF_TYPE_C_INTERPRETATION` | Tipo C | Conflicto de interpretación |
| `CONF_TYPE_D_COVERAGE` | Tipo D | Conflicto de cobertura |
| `CONF_TYPE_E_GOVERNANCE` | Tipo E | Conflicto de gobernanza |

**Prohibiciones:**

- No usar `GRAVE` (ni homólogo) como **tipo** de conflicto.  
- La **severidad** es un atributo independiente (`severity`).  
- No redefinir C ni D.

## Objeto `conflicts[]`

| Campo | Obligatorio | Descripción |
|-------|-------------|-------------|
| `conflict_id` | Sí | Identificador |
| `primary_type` | Sí | Uno de `CONF_TYPE_A_DATA` … `CONF_TYPE_E_GOVERNANCE` |
| `secondary_types` | No | Tokens concurrentes de la misma taxonomía |
| `facts_in_tension` | Sí | `fact_id` existentes en tensión |
| `sources_in_tension` | Condicional | Fuentes/tools en tensión |
| `severity` | Sí | Severidad independiente del tipo |
| `impact` | Sí | Impacto |
| `confidence` | Sí | Confianza de la tipificación |
| `weight_assessment` | No | Informativo; **no resuelve** |
| `resolution_status` | Sí | Ver abajo |
| `interpretation_constraint` | Sí | Restricción de uso |
| `governance_escalation` | Condicional | Obligatoria si hay `CONF_TYPE_E_GOVERNANCE` |
| `governance_reason` | Condicional | Motivo tipificado de escalamiento |
| `missing_resolution_evidence` | Condicional | Qué falta para resolver |

### Estados de resolución (`resolution_status`)

| Estado | Significado |
|--------|-------------|
| `OPEN` | Abierto |
| `UNDER_REVIEW` | En revisión institucional |
| `RESOLVED` | Resuelto con evidencia suficiente |
| `SUPERSEDED` | Superado por evidencia/ciclo posterior |

**Conflicto ponderado ≠ resuelto.**  
**`CONF_TYPE_E_GOVERNANCE` jamás puede omitirse** de `executive_summary_facts` ni suavizarse.

---

# 10. Preguntas abiertas

Cada elemento de `open_questions[]`:

| Campo | Obligatorio | Descripción |
|-------|-------------|-------------|
| `open_question_id` | Sí | Identificador |
| `question_token` | Sí | Token de pregunta controlada (neutral) |
| `question_reference` | Condicional | Referencia al texto controlado en Snapshot |
| `reason_token` | Sí | Motivo tipificado del hueco |
| `required_data` | Sí | Dato requerido |
| `expected_source` | Condicional | Dominio/tool esperado si existe en catálogo |
| `impact_token` | Sí | Impacto tipificado (sin narrativa causal) |
| `priority` | Sí | Ordinal |
| `status` | Sí | `OPEN` \| `ANSWERED` \| `DISCARDED` |
| `blocks_hypothesis` | Sí | Si bloquea hipótesis en RE |
| `related_fact_ids` | No | Solo `fact_id` existentes |
| `related_evidence_ids` | No | Solo `evidence_id` existentes |
| `related_diagnosis_ids` | No | Solo `diagnosis_id` existentes |

### Prohibiciones

No asumir culpa, responsable ni solución.  
No son hipótesis.  
No lenguaje causal libre.

---

# 11. Salud de fuentes

Cada elemento de `source_health[]`:

| Campo | Obligatorio | Descripción |
|-------|-------------|-------------|
| `tool_id` | Sí | Tool del registry / declaración |
| `domain` | Sí | Dominio |
| `execution_status` | Sí | Estado de ejecución/adquisición |
| `coverage_token` | Condicional | Token COV_* si aplica al dominio |
| `coverage_state` | Condicional | Estado constitucional mapeado |
| `scope_complete` | Condicional | Alcance completo |
| `validation_state` | Condicional | Validación estructural |
| `records_considered` | No | Conteo considerado |
| `latency_ms` | No | Latencia |
| `error_code` | Condicional | Si hay fallo |
| `restrictions` | Condicional | Restricciones de permiso |
| `raw_payload_reference` | Condicional | Referencia auditável; **no** payload completo en el IES |

### Estados a distinguir (no colapsar)

| Estado | Significado breve |
|--------|-------------------|
| `DATA_AVAILABLE` | Datos de negocio disponibles/transportados |
| `DATA_NOT_FOUND` | Búsqueda OK; sin filas; ≠ ausencia afirmada |
| `SOURCE_NOT_INTEGRATED` | No integrado |
| `SOURCE_RESTRICTED` | Inaccesible por permiso |
| `TOOL_ERROR` | Fallo / timeout |
| `QUERY_SCOPE_INCOMPLETE` | Faltan inputs de alcance |
| `ENTITY_UNRESOLVED` | Entidad no canónica |
| `ABSENCE_CONFIRMED` | Ausencia confirmada por regla (EB) |

El IES **declara** la salud resultante; no reejecuta tools.

---

# 12. Limitaciones y declaraciones de desconocimiento

| Situación | Salida mínima del IES |
|-----------|------------------------|
| `COV_NO_KNOWLEDGE` / `NO_CONOZCO` | Declaración controlada; fuente faltante; alcance exacto; confianza 0.00; sin razonamiento sustantivo |
| `COV_PARTIAL_KNOWLEDGE` | Dominios parciales/faltantes listados |
| Entidad ambigua | `ENTITY_UNRESOLVED` / `AMBIGUOUS`; sin hechos canónicos inventados |
| Herramienta fallida | `TOOL_ERROR`; no = “dato inexistente” |
| Fuente restringida | `SOURCE_RESTRICTED`; no = “no existe” |
| Fuente no integrada | `SOURCE_NOT_INTEGRATED`; pregunta abierta si el intent la exigía |

Un IES `COV_NO_KNOWLEDGE` **es válido** con `facts`/`evidence`/`diagnoses` vacíos.

Limitaciones usan `statement_token` + `statement_reference` + alcance tipificado; no prosa libre.

---

# 13. IES oficial

| Propiedad | Regla |
|-----------|-------|
| Parámetros | Parámetros institucionales vigentes |
| Entrada | Un Knowledge Snapshot (`snapshot_reference` + `knowledge_snapshot_version`) |
| Histórico | Append-only a nivel de versiones de IES |
| LLM | No editable por LLM |
| Sobrescritura | Prohibida |
| Regeneración formal | Nueva versión / nuevo `ies_id` |
| Canal | No genera versión |

`ies_type = OFFICIAL`  
`alternative_context` = null.

---

# 14. IES alternativo

`alternative_context` (obligatorio si `ies_type=ALTERNATIVE`):

| Campo | Obligatorio |
|-------|-------------|
| `alternative_of` | Sí |
| `requested_by` | Sí |
| `requested_at` | Sí |
| `reason` | Sí |
| `parameter_overrides` | Sí |
| `previous_values` | Sí |
| `new_values` | Sí |
| `affected_facts` | Sí |
| `affected_evidence` | Sí |
| `affected_diagnoses` | Sí |
| `comparison_with_official` | Sí |

**Nunca reemplaza silenciosamente al oficial.**  
El histórico real de las fuentes no se modifica por reevaluación.

---

# 15. Ciclo de vida

## Estados

| Estado | Significado |
|--------|-------------|
| `BUILDING` | Proyección en curso (no consumible por RE) |
| `VALIDATED` | Emisión válida con `COV_FULL_KNOWLEDGE` / `CONOZCO` |
| `PARTIAL` | Emisión válida con `COV_PARTIAL_KNOWLEDGE` |
| `CONFLICTED` | Emisión válida con `COV_DATA_CONFLICT` |
| `NO_KNOWLEDGE` | Emisión válida con `COV_NO_KNOWLEDGE` |
| `EXPIRED` | Fuera de vigencia |
| `SUPERSEDED` | Reemplazado por versión posterior |
| `INVALID` | Falló validación estructural/integridad |

## Transiciones permitidas

```
BUILDING → VALIDATED | PARTIAL | CONFLICTED | NO_KNOWLEDGE | INVALID
VALIDATED | PARTIAL | CONFLICTED | NO_KNOWLEDGE → EXPIRED | SUPERSEDED
cualquier emisión válida → SUPERSEDED (nueva versión formal)
INVALID → terminal (nueva generación = nuevo ies_id)
```

## Transiciones prohibidas

- Mutación in-place.  
- Canal → nueva versión.  
- `NO_KNOWLEDGE` → `VALIDATED` sin nuevo Snapshot/ciclo.  
- `EXPIRED` / `SUPERSEDED` / `INVALID` → reedición del mismo registro.

| `coverage_token` | `coverage_state` | `status` típico |
|------------------|------------------|-----------------|
| `COV_FULL_KNOWLEDGE` | `CONOZCO` | `VALIDATED` |
| `COV_PARTIAL_KNOWLEDGE` | `CONOZCO_PARCIALMENTE` | `PARTIAL` |
| `COV_DATA_CONFLICT` | `EXISTE_CONFLICTO` | `CONFLICTED` |
| `COV_NO_KNOWLEDGE` | `NO_CONOZCO` | `NO_KNOWLEDGE` |

---

# 16. Integridad y auditoría

## Objeto `audit`

| Campo | Obligatorio | Descripción |
|-------|-------------|-------------|
| `generated_by` | Sí | `ies_builder` |
| `engine_version` | Sí | Versión del Motor |
| `ruleset_version` | Sí | Rulesets aplicados |
| `source_snapshot_ids` | Sí | Snapshots de origen |
| `previous_ies_id` | Condicional | Cadena previa |
| `supersedes_ies_id` | Condicional | Supersesión explícita |

## Objeto `integrity` (v1.0 — conceptual; sin firma digital)

| Campo | Obligatorio | Valor / regla v1.0 |
|-------|-------------|--------------------|
| `canonical_representation` | Sí | Forma canónica (especificación de canonicalización pendiente de congelar) |
| `content_fingerprint` | Sí | Huella del contenido canónico |
| `snapshot_reference` | Sí | Debe coincidir con la raíz |
| `signature` | Sí | **`null`** en v1.0 |
| `signature_status` | Sí | **`NOT_IMPLEMENTED`** |

### Aclaraciones obligatorias

1. En v1.0 **no** hay firma digital implementada.  
2. Un digest tipo SHA-256 (si se usa para `content_fingerprint`) es una **huella**, **no** una firma digital.  
3. El algoritmo criptográfico de firma **continúa diferido** hasta congelar el esquema canónico.  
4. Prohibido afirmar “firma digital implementada” en este estándar v1.0.

---

# 17. Proyecciones de canal

> Este documento **no diseña** Channel Projection. Solo fija invariantes de consumo.

- La proyección **no modifica** el IES.  
- **No** crea `ies_version` nueva.  
- Todos los canales consumen el **mismo** `ies_id`.

| Canal | Puede resumir por referencias controladas | Debe conservar siempre |
|-------|-------------------------------------------|------------------------|
| Chat | Resumen ejecutivo + diagnóstico + límites | Lista obligatoria |
| Voz | Resumen ultra-corto + límites bloqueantes | Lista obligatoria |
| WhatsApp | Resumen corto + cobertura + pregunta abierta crítica | Lista obligatoria |
| Dashboard | Bancos + salud de fuentes + conflictos | Lista obligatoria |
| Reporte | IES casi completo estructurado | Lista obligatoria |
| Presentación | Resumen ejecutivo + diagnóstico + `CONF_TYPE_E_GOVERNANCE` | Lista obligatoria |

### Nunca omitible

1. `COV_NO_KNOWLEDGE` / `NO_CONOZCO` (si aplica).  
2. `CONF_TYPE_E_GOVERNANCE` (si existe).  
3. Diagnóstico principal (si existe).  
4. Cobertura parcial crítica (`COV_PARTIAL_KNOWLEDGE`).  
5. Limitaciones bloqueantes.

---

# 18. Contrato para Reasoning Engine

> Este documento **no diseña** el Reasoning Engine; solo el contrato de entrada.

## Recibe

- IES en `VALIDATED` \| `PARTIAL` \| `CONFLICTED` \| `NO_KNOWLEDGE`;  
- reglas constitucionales Nivel 5;  
- modo de análisis;  
- canal;  
- extensión permitida.

## No recibe

SQL; payloads crudos completos; secretos; herramientas; conexiones; fuentes operacionales directas.

## Hipótesis

Toda hipótesis futura debe citar IDs del IES.  
El IES no contiene hipótesis.

---

# 19. Casos extremos

| # | Caso | Resultado esperado |
|---|------|--------------------|
| 1 | `COV_FULL_KNOWLEDGE` | `VALIDATED` |
| 2 | `COV_PARTIAL_KNOWLEDGE` | `PARTIAL`; dominios parciales listados |
| 3 | `COV_DATA_CONFLICT` | `CONFLICTED`; conflictos `OPEN` |
| 4 | `COV_NO_KNOWLEDGE` | `NO_KNOWLEDGE`; bancos vacíos permitidos |
| 5 | Herramienta fallida | `TOOL_ERROR`; no “inexistencia” |
| 6 | Fuente restringida | `SOURCE_RESTRICTED` |
| 7 | Entidad ambigua | sin hechos canónicos inventados |
| 8 | `CONF_TYPE_E_GOVERNANCE` | en conflicts + resumen; sin suavizar |
| 9 | IES expirado | `EXPIRED` |
| 10 | IES alternativo | `ALTERNATIVE` + `alternative_context`; oficial intacto |
| 11 | Cambio de canal | mismo `ies_id` / misma `ies_version` |

---

# 20. Ejemplos completos

> Cifras e ids: **ILUSTRATIVOS / FICTICIOS**.  
> ARR/IGF: **parciales / on-demand**.  
> Sin hipótesis. Sin narrativa causal libre.  
> Referencias internas validadas: toda evidencia → `fact_id` existente; todo diagnóstico → evidence/facts existentes.

## Ejemplo A — `COV_PARTIAL_KNOWLEDGE` / `CONOZCO_PARCIALMENTE`

Pregunta ilustrativa: «¿Por qué cayó Puebla?» (el IES no responde causalmente; proyecta desviación verificada + límites).

```
{
  "ies_id": "ies_caseA_puebla_v1_ilustrativo",
  "ies_type": "OFFICIAL",
  "schema_version": "1.0",
  "ies_version": 1,
  "status": "PARTIAL",
  "generated_at": "2026-08-05T12:00:00Z",
  "valid_at": "2026-08-05T12:00:00Z",
  "expires_at": null,
  "snapshot_reference": { "snapshot_id": "snap_caseA_v1" },
  "knowledge_snapshot_version": 1,

  "query_context": {
    "executive_query_id": "eq_caseA_puebla_ilustrativo",
    "query_fingerprint": "qfp_plant_financial_deviation_puebla_ilustrativo",
    "trace_id": "tr_caseA_puebla_ilustrativo",
    "original_question": "¿Por qué cayó Puebla?",
    "intent": "financial_diagnosis",
    "requesting_user_id": "user_ilustrativo",
    "requesting_role": "director",
    "channel": "dashboard",
    "plant_or_scope": "Puebla",
    "period": { "a": "mes_A_ilustrativo", "b": "mes_B_ilustrativo" },
    "resolved_entities": [{
      "entity_type": "planta",
      "original_value": "Puebla",
      "resolution_state": "RESOLVED",
      "entity_id": "planta_puebla",
      "candidates": [],
      "resolution_rule": "rule_plant_name_v1_ilustrativa",
      "resolution_confidence": "high_illustrative"
    }],
    "permission_restrictions": [],
    "knowledge_effective_date": "2026-08-05"
  },

  "executive_scope": {
    "models": ["financiero", "ejecutivo"],
    "plant": "Puebla"
  },

  "knowledge_coverage": {
    "coverage_token": "COV_PARTIAL_KNOWLEDGE",
    "coverage_state": "CONOZCO_PARCIALMENTE",
    "coverage_score": null,
    "covered_domains": ["arr", "igf"],
    "partial_domains": ["arr", "igf"],
    "unavailable_domains": ["delta_venta", "delta_descuento", "delta_ingreso"],
    "restricted_domains": [],
    "failed_tools": [],
    "unresolved_entities": [],
    "incomplete_scopes": [],
    "blocking_limitations": ["lim_deltas"]
  },

  "executive_summary_facts": [
    {
      "statement_token": "SUM_PRIORITY_FACT",
      "statement_reference": "fact_venta_baja",
      "supporting_fact_ids": ["fact_venta_baja"],
      "supporting_evidence_ids": ["ev_desviacion_venta"]
    },
    {
      "statement_token": "SUM_PRIORITY_FACT",
      "statement_reference": "fact_margen_desvio",
      "supporting_fact_ids": ["fact_margen_desvio"],
      "supporting_evidence_ids": ["ev_desviacion_margen"]
    },
    {
      "statement_token": "SUM_PRIMARY_DIAGNOSIS",
      "statement_reference": "dx_riesgo_fin",
      "supporting_fact_ids": ["fact_venta_baja", "fact_margen_desvio"],
      "supporting_evidence_ids": ["ev_desviacion_venta", "ev_desviacion_margen"]
    },
    {
      "statement_token": "SUM_COVERAGE_LIMIT",
      "statement_reference": "lim_deltas",
      "supporting_fact_ids": [],
      "supporting_evidence_ids": []
    }
  ],

  "facts": [
    {
      "fact_id": "fact_venta_baja",
      "statement_token": "FACT_VENTA_MES_B_LT_MES_A",
      "statement_reference": "snap_caseA_v1#fact_venta_baja",
      "entity": { "type": "planta", "id": "planta_puebla" },
      "concept": "venta_toneladas",
      "period": "mes_B_vs_mes_A_ilustrativo",
      "confidence": "high_illustrative",
      "confidence_dimensions": {
        "Fs": "pending_calibration",
        "R": "pending_calibration",
        "Cb": "pending_calibration",
        "Cs": "pending_calibration",
        "Cb_ov": "pending_calibration"
      },
      "supporting_observation_ids": ["obs_arr_1"],
      "absence_state": null,
      "validity": "valid_in_snapshot",
      "priority": 1,
      "materiality": "HIGH",
      "applied_materiality_rule_id": "mat_rule_financial_deviation_v1_ilustrativa",
      "materiality_ruleset_version": "mat_rs_ilustrativo_1",
      "traceability": {
        "snapshot_id": "snap_caseA_v1",
        "bundle_id": "kb_caseA_ilustrativo"
      },
      "model_projections": ["financiero", "ejecutivo"],
      "illustrative_values": {
        "venta_mes_A_t": 120.0,
        "venta_mes_B_t": 95.0,
        "note": "FICTICIO / ILUSTRATIVO"
      }
    },
    {
      "fact_id": "fact_margen_desvio",
      "statement_token": "FACT_MARGEN_MES_B_BELOW_REF",
      "statement_reference": "snap_caseA_v1#fact_margen_desvio",
      "entity": { "type": "planta", "id": "planta_puebla" },
      "concept": "margen",
      "period": "mes_B_vs_mes_A_ilustrativo",
      "confidence": "medium_illustrative",
      "confidence_dimensions": {
        "Fs": "pending_calibration",
        "R": "pending_calibration",
        "Cb": "pending_calibration",
        "Cs": "pending_calibration",
        "Cb_ov": "pending_calibration"
      },
      "supporting_observation_ids": ["obs_arr_1", "obs_igf_1"],
      "absence_state": null,
      "validity": "valid_in_snapshot",
      "priority": 2,
      "materiality": "HIGH",
      "applied_materiality_rule_id": "mat_rule_financial_deviation_v1_ilustrativa",
      "materiality_ruleset_version": "mat_rs_ilustrativo_1",
      "traceability": { "snapshot_id": "snap_caseA_v1" },
      "model_projections": ["financiero"],
      "illustrative_values": { "note": "FICTICIO / ILUSTRATIVO" }
    }
  ],

  "evidence": [
    {
      "evidence_id": "ev_desviacion_venta",
      "relation_type": "desviacion",
      "statement_token": "EV_DESVIACION_VENTA_PERIODO",
      "statement_reference": "snap_caseA_v1#ev_desviacion_venta",
      "supporting_fact_ids": ["fact_venta_baja"],
      "applied_rule_id": "rule_desviacion_periodo_v1",
      "confidence": "medium_illustrative",
      "temporal_alignment": "comparable_periods_illustrative",
      "explained_variance_pct": null,
      "scope": { "plant": "Puebla", "domain": "arr" },
      "causal_status": "NON_CAUSAL",
      "materiality": "HIGH",
      "applied_materiality_rule_id": "mat_rule_financial_deviation_v1_ilustrativa",
      "materiality_ruleset_version": "mat_rs_ilustrativo_1",
      "traceability": { "snapshot_id": "snap_caseA_v1" }
    },
    {
      "evidence_id": "ev_desviacion_margen",
      "relation_type": "desviacion",
      "statement_token": "EV_DESVIACION_MARGEN_REF",
      "statement_reference": "snap_caseA_v1#ev_desviacion_margen",
      "supporting_fact_ids": ["fact_margen_desvio", "fact_venta_baja"],
      "applied_rule_id": "rule_desviacion_margen_v1_ilustrativa",
      "confidence": "medium_illustrative",
      "temporal_alignment": "comparable_periods_illustrative",
      "explained_variance_pct": null,
      "scope": { "plant": "Puebla", "domain": "igf" },
      "causal_status": "NON_CAUSAL",
      "materiality": "HIGH",
      "applied_materiality_rule_id": "mat_rule_financial_deviation_v1_ilustrativa",
      "materiality_ruleset_version": "mat_rs_ilustrativo_1",
      "traceability": { "snapshot_id": "snap_caseA_v1" }
    }
  ],

  "diagnoses": [
    {
      "diagnosis_id": "dx_riesgo_fin",
      "primary_classification": "riesgo financiero",
      "secondary_classifications": ["informacion insuficiente"],
      "severity": "MEDIUM",
      "impact": "PARTIAL_SCOPE",
      "confidence": "medium_illustrative",
      "model": "financiero",
      "supporting_evidence_ids": ["ev_desviacion_venta", "ev_desviacion_margen"],
      "supporting_fact_ids": ["fact_venta_baja", "fact_margen_desvio"],
      "applied_rule_id": "rule_dx_riesgo_fin_v1_ilustrativa",
      "validity": "valid_in_snapshot",
      "coverage_token": "COV_PARTIAL_KNOWLEDGE",
      "coverage_state": "CONOZCO_PARCIALMENTE",
      "materiality": "HIGH",
      "applied_materiality_rule_id": "mat_rule_financial_deviation_v1_ilustrativa",
      "materiality_ruleset_version": "mat_rs_ilustrativo_1",
      "related_conflict_ids": []
    }
  ],

  "conflicts": [],

  "open_questions": [
    {
      "open_question_id": "oq_venta_vs_descuento",
      "question_token": "OQ_VARIATION_SALES_OR_DISCOUNT",
      "question_reference": "snap_caseA_v1#oq_venta_vs_descuento",
      "reason_token": "REASON_DELTA_DOMAINS_NOT_INTEGRATED",
      "required_data": "descomposicion_delta_venta_descuento",
      "expected_source": "delta_venta|delta_descuento",
      "impact_token": "IMPACT_BLOCKS_DECOMPOSITION",
      "priority": 1,
      "status": "OPEN",
      "blocks_hypothesis": true,
      "related_fact_ids": ["fact_venta_baja"],
      "related_evidence_ids": ["ev_desviacion_venta"],
      "related_diagnosis_ids": ["dx_riesgo_fin"]
    }
  ],

  "source_health": [
    {
      "tool_id": "get_arr_snapshot",
      "domain": "arr",
      "execution_status": "DATA_AVAILABLE",
      "coverage_token": "COV_PARTIAL_KNOWLEDGE",
      "coverage_state": "CONOZCO_PARCIALMENTE",
      "scope_complete": true,
      "validation_state": "VALID",
      "records_considered": 1,
      "latency_ms": null,
      "error_code": null,
      "restrictions": [],
      "raw_payload_reference": "rawref_arr_caseA_ilustrativo"
    },
    {
      "tool_id": "get_igf_snapshot",
      "domain": "igf",
      "execution_status": "DATA_AVAILABLE",
      "coverage_token": "COV_PARTIAL_KNOWLEDGE",
      "coverage_state": "CONOZCO_PARCIALMENTE",
      "scope_complete": true,
      "validation_state": "VALID",
      "records_considered": 1,
      "raw_payload_reference": "rawref_igf_caseA_ilustrativo"
    },
    {
      "tool_id": "get_delta_*",
      "domain": "deltas_ui",
      "execution_status": "SOURCE_NOT_INTEGRATED",
      "coverage_token": "COV_NO_KNOWLEDGE",
      "coverage_state": "NO_CONOZCO",
      "scope_complete": false,
      "validation_state": null,
      "records_considered": 0,
      "error_code": "SOURCE_NOT_INTEGRATED",
      "raw_payload_reference": null
    }
  ],

  "limitations": [
    {
      "limitation_id": "lim_deltas",
      "kind": "SOURCE_NOT_INTEGRATED",
      "statement_token": "LIM_DELTA_DOMAINS_NOT_INTEGRATED",
      "statement_reference": "snap_caseA_v1#lim_deltas",
      "exact_scope": "deltas_ui / planta Puebla / periodo ilustrativo",
      "blocks_substantive_reasoning": true
    }
  ],

  "audit": {
    "generated_by": "ies_builder",
    "engine_version": "eke_design",
    "ruleset_version": "eb_2.0",
    "source_snapshot_ids": ["snap_caseA_v1"],
    "previous_ies_id": null,
    "supersedes_ies_id": null
  },

  "integrity": {
    "canonical_representation": "pending_canonical_freeze",
    "content_fingerprint": "fingerprint_ilustrativo_sha256_is_digest_not_signature",
    "snapshot_reference": { "snapshot_id": "snap_caseA_v1" },
    "signature": null,
    "signature_status": "NOT_IMPLEMENTED"
  },

  "alternative_context": null
}
```

**Nota de canal:** el mismo objeto es consumible por Chat/Voz/WhatsApp/Dashboard **sin** cambiar `ies_id` ni `ies_version`.

## Ejemplo B — `COV_NO_KNOWLEDGE` / `NO_CONOZCO`

Pregunta: «¿En qué etapa está el folio 421?»

```
{
  "ies_id": "ies_caseB_folio421_v1_ilustrativo",
  "ies_type": "OFFICIAL",
  "schema_version": "1.0",
  "ies_version": 1,
  "status": "NO_KNOWLEDGE",
  "generated_at": "2026-08-05T12:05:00Z",
  "valid_at": "2026-08-05T12:05:00Z",
  "expires_at": null,
  "snapshot_reference": { "snapshot_id": "snap_caseB_v1" },
  "knowledge_snapshot_version": 1,

  "query_context": {
    "executive_query_id": "eq_caseB_folio421_ilustrativo",
    "query_fingerprint": "qfp_folio_status_421_ilustrativo",
    "trace_id": "tr_caseB_folio421_ilustrativo",
    "original_question": "¿En qué etapa está el folio 421?",
    "intent": "folio_status",
    "requesting_user_id": "user_ilustrativo",
    "requesting_role": "director",
    "channel": "dashboard",
    "plant_or_scope": null,
    "period": null,
    "resolved_entities": [{
      "entity_type": "folio",
      "original_value": "421",
      "resolution_state": "UNRESOLVED",
      "entity_id": null,
      "candidates": [],
      "resolution_rule": "none_without_integrated_source",
      "resolution_confidence": "n/a"
    }],
    "permission_restrictions": [],
    "knowledge_effective_date": "2026-08-05"
  },

  "executive_scope": {
    "models": ["operativo", "ejecutivo"],
    "intent": "folio_status"
  },

  "knowledge_coverage": {
    "coverage_token": "COV_NO_KNOWLEDGE",
    "coverage_state": "NO_CONOZCO",
    "coverage_score": 0.0,
    "covered_domains": [],
    "partial_domains": [],
    "unavailable_domains": ["folios_kanban_status"],
    "restricted_domains": [],
    "failed_tools": [],
    "unresolved_entities": ["folio:421"],
    "incomplete_scopes": [],
    "blocking_limitations": ["lim_folio_status"]
  },

  "executive_summary_facts": [
    {
      "statement_token": "SUM_NO_KNOWLEDGE",
      "statement_reference": "lim_folio_status",
      "supporting_fact_ids": [],
      "supporting_evidence_ids": []
    }
  ],

  "facts": [],
  "evidence": [],
  "diagnoses": [],
  "conflicts": [],

  "open_questions": [
    {
      "open_question_id": "oq_integrar_folio_status",
      "question_token": "OQ_FOLIO_STATUS_SOURCE",
      "question_reference": "snap_caseB_v1#oq_integrar_folio_status",
      "reason_token": "REASON_TOOL_NOT_INTEGRATED",
      "required_data": "etapa_kanban_folio",
      "expected_source": "get_folio_status",
      "impact_token": "IMPACT_CONFIDENCE_ZERO_SCOPE",
      "priority": 1,
      "status": "OPEN",
      "blocks_hypothesis": true,
      "related_fact_ids": [],
      "related_evidence_ids": [],
      "related_diagnosis_ids": []
    }
  ],

  "source_health": [
    {
      "tool_id": "get_folio_status",
      "domain": "folios_kanban_status",
      "execution_status": "SOURCE_NOT_INTEGRATED",
      "coverage_token": "COV_NO_KNOWLEDGE",
      "coverage_state": "NO_CONOZCO",
      "scope_complete": false,
      "validation_state": null,
      "records_considered": 0,
      "latency_ms": null,
      "error_code": "SOURCE_NOT_INTEGRATED",
      "restrictions": [],
      "raw_payload_reference": null
    }
  ],

  "limitations": [
    {
      "limitation_id": "lim_folio_status",
      "kind": "SOURCE_NOT_INTEGRATED",
      "statement_token": "LIM_FOLIO_STATUS_NOT_INTEGRATED",
      "statement_reference": "snap_caseB_v1#lim_folio_status",
      "exact_scope": "etapa del folio 421",
      "missing_source": "get_folio_status",
      "blocks_substantive_reasoning": true
    }
  ],

  "audit": {
    "generated_by": "ies_builder",
    "engine_version": "eke_design",
    "ruleset_version": "eb_2.0",
    "source_snapshot_ids": ["snap_caseB_v1"],
    "previous_ies_id": null,
    "supersedes_ies_id": null
  },

  "integrity": {
    "canonical_representation": "pending_canonical_freeze",
    "content_fingerprint": "fingerprint_ilustrativo_b_digest_not_signature",
    "snapshot_reference": { "snapshot_id": "snap_caseB_v1" },
    "signature": null,
    "signature_status": "NOT_IMPLEMENTED"
  },

  "alternative_context": null
}
```

### Validación de referencias internas (ejemplos)

| Ejemplo | Regla | Resultado |
|---------|-------|-----------|
| A | Toda evidencia → `fact_id` en `facts[]` | OK (`fact_venta_baja`, `fact_margen_desvio`) |
| A | Diagnóstico → evidence/facts existentes | OK |
| A | Resumen → solo references existentes | OK |
| B | Bancos vacíos bajo `COV_NO_KNOWLEDGE` | OK |
| A/B | `signature: null`, `signature_status: NOT_IMPLEMENTED` | OK |

---

# 21. Invariantes

1. El IES se construye solo desde un Knowledge Snapshot.  
2. El IES no contiene hipótesis.  
3. El IES no consulta fuentes ni ejecuta herramientas.  
4. El IES no contiene secretos.  
5. El IES oficial no se sobrescribe.  
6. El IES alternativo no sustituye al oficial.  
7. Los hechos apuntan a observaciones (vía Snapshot/Bundle).  
8. Las evidencias apuntan a hechos existentes.  
9. Los diagnósticos apuntan a reglas y a evidence/facts existentes.  
10. Los conflictos abiertos permanecen visibles.  
11. La proyección de canal no modifica ni versiona el IES.  
12. Ausencia no se infiere de un vacío.  
13. Correlación no se presenta como causalidad.  
14. Confianza alta no elimina trazabilidad.  
15. `COV_NO_KNOWLEDGE` / `NO_CONOZCO` es resultado válido.  
16. `CONF_TYPE_E_GOVERNANCE` nunca se suaviza ni se omite del resumen.  
17. Severidad ≠ tipo de conflicto.  
18. Materiality se proyecta; no se recalcula en el IES.  
19. Sin LLM en la construcción del IES.  
20. Repetibilidad verificable bajo mismo Snapshot, esquema y rulesets (no absoluta).  
21. `signature` v1.0 = `null`; huella ≠ firma digital.

---

# 22. Criterios de aceptación

1. Contrato raíz completo (§2) sin campos eliminados.  
2. Taxonomía de conflictos exacta `CONF_TYPE_A_DATA` … `CONF_TYPE_E_GOVERNANCE`.  
3. Mapeo COV_* ↔ estados constitucionales; sin `COV_TOTAL_IGNORANCE`.  
4. `knowledge_snapshot_version` presente.  
5. Separación `executive_query_id` / `query_fingerprint` / `trace_id`.  
6. Canal no crea nueva versión.  
7. Materiality solo proyectada con `applied_materiality_rule_id` + `materiality_ruleset_version`.  
8. Resumen y statements vía tokens/referencias controladas; sin prosa causal libre.  
9. Integridad: `signature: null`, `signature_status: NOT_IMPLEMENTED`.  
10. Ejemplos A (`CONOZCO_PARCIALMENTE`) y B (`NO_CONOZCO`) con referencias internas válidas.  
11. Banco de hechos presente en JSON ilustrativo A.  
12. Sin declaración de madurez 100% ni firma digital implementada.  
13. Estado documental: **APROBADO PARA CONGELAMIENTO CANDIDATO v1.0**.

---

# 24. Catálogo de tokens institucionales

## Cobertura

| Token | Estado constitucional |
|-------|----------------------|
| `COV_FULL_KNOWLEDGE` | `CONOZCO` |
| `COV_PARTIAL_KNOWLEDGE` | `CONOZCO_PARCIALMENTE` |
| `COV_DATA_CONFLICT` | `EXISTE_CONFLICTO` |
| `COV_NO_KNOWLEDGE` | `NO_CONOZCO` |

Prohibido: `COV_TOTAL_IGNORANCE`.

## Conflictos

| Token | Tipo constitucional |
|-------|---------------------|
| `CONF_TYPE_A_DATA` | A — datos |
| `CONF_TYPE_B_TEMPORAL` | B — temporal |
| `CONF_TYPE_C_INTERPRETATION` | C — interpretación |
| `CONF_TYPE_D_COVERAGE` | D — cobertura |
| `CONF_TYPE_E_GOVERNANCE` | E — gobernanza |

Prohibido: usar severidad (`GRAVE`, etc.) como tipo.

## Integridad

| Token / campo | Valor v1.0 |
|---------------|------------|
| `signature` | `null` |
| `signature_status` | `NOT_IMPLEMENTED` |
| `content_fingerprint` | huella (digest ≠ firma) |

---

# Declaración de conformidad

Este estándar se declara conforme a:

- `DIRECTOR_IA_CONSTITUTION.md`  
- `DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md`  
- `02-EVIDENCE-BUILDER.md`  
- `03-EXECUTIVE-KNOWLEDGE-STORE.md`  
- `03A-OBSERVATION-PIPELINE.md`  
- `03B-END-TO-END-REFERENCE-FLOWS.md`

### Pendientes reportados (sin modificación fuera de alcance)

1. **Architecture Index:** aún puede declarar `04-IES-STANDARD` como pendiente/no creado. **No se tocó** (esta auditoría solo permite modificar `04-IES-STANDARD.md`). Actualización del índice: **pendiente**.  
2. Calibración `k`/`wi` — diferida.  
3. Firma criptográfica final — diferida (`NOT_IMPLEMENTED`).  
4. Diseño de Reasoning Engine y Channel Projection — fuera de alcance.  
5. Canonicalización exacta — pendiente de congelamiento definitivo.

### Resultado de auditoría

No conformidades críticas de la lista obligatoria: **corregidas en este documento**.  
Ejemplos `CONOZCO_PARCIALMENTE` y `NO_CONOZCO`: presentes.  
Referencias internas de ejemplos: validadas.

**APROBADO PARA CONGELAMIENTO CANDIDATO v1.0**

(El congelamiento **definitivo** v1.0 queda sujeto a la lista de requisitos del encabezado.)

---

# Control documental

| Campo | Valor |
|-------|--------|
| Documento | `04-IES-STANDARD.md` |
| Versión | 1.0 |
| Estado | APROBADO PARA CONGELAMIENTO CANDIDATO v1.0 |
| Productor | IES Builder (diseño) |
| Entrada | Knowledge Snapshot |
| Hipótesis | Excluidas |
| Firma digital | `signature: null` / `NOT_IMPLEMENTED` |
| Calibración k/wi | Diferida |
| Architecture Index | Pendiente de actualización (no modificado) |
| Implementación | PENDIENTE |
| Commit | No realizado |
