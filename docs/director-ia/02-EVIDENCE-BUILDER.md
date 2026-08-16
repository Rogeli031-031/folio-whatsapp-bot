# 02 — Evidence Builder v2.1

## Especificación arquitectónica del ensamblador de conocimiento (Niveles 1–4)

**Documento:** `docs/director-ia/02-EVIDENCE-BUILDER.md`  
**Versión:** 2.1
**Estado:** APROBADO PARA DISEÑO DEL IES; realización física v1 registrada (D1–D15)

### Dependencia normativa (rutas reales)

| Documento | Rol |
|-----------|-----|
| `docs/director-ia/DIRECTOR_IA_CONSTITUTION.md` | Norma superior; propietario de conceptos constitucionales |
| `docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md` | Gobernanza del Motor; política de cobertura e IES |
| `docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md` | Inventario de apoyo (no redefine Constitución) |
| `docs/director-ia/DIRECTOR_IA_V2_FASE_1_VERACIDAD.md` | Entrada de capacidades |
| `docs/director-ia/DIRECTOR_IA_V2_FASE_2_PLANNER.md` | Entrada: Plan |
| `docs/director-ia/DIRECTOR_IA_V2_FASE_3_TOOL_ORCHESTRATOR.md` | Entrada: Tool Plan |
| `docs/director-ia/03A-OBSERVATION-PIPELINE.md` | ObservationRecord / AcquisitionStatus (entrada; no redefinidos) |
| `docs/director-ia/03-EXECUTIVE-KNOWLEDGE-STORE.md` | Consumidor del Knowledge Bundle (no redefinido salvo aclaración de `bundle.observations`) |

En caso de conflicto, prevalece la Constitución.  
Este documento **no redefine** Observación, Hecho, Evidencia, Diagnóstico, IES, Hipótesis, Cobertura, Conflicto ni derechos constitucionales: los **aplica** bajo el Motor.  
Este documento **no toma decisiones de política propias**: solo ensambla de forma determinística según reglas del Motor y de la Constitución.

### Posición en el pipeline oficial (Constitución X)

```
Constitution
        ↓
Executive Knowledge Engine
        ↓
Evidence Builder   ← este documento
        ↓
IES
        ↓
Reasoning Engine
        ↓
Interfaces
```

---

# 1. Propósito general

El **Evidence Builder** es el ensamblador determinístico del Motor de Conocimiento Ejecutivo. Transforma resultados de herramientas (y estados de no-disponibilidad tipificados) en estructuras de:

- Observaciones (Nivel 1);
- Hechos con confianza multidimensional (Nivel 2);
- Evidencias no causales por regla (Nivel 3);
- Diagnósticos ejecutivos deterministas (Nivel 4);
- **Estructuras listas para el IES** (el producto IES lo declara el Motor; este Builder no redefine el IES).

### Qué hace (ensamblaje; no política)

- Aplica el Plan y el Tool Plan como **entradas** (no los inventa).
- Tipifica ausencias, fallos, restricciones y no integración sin colapsarlos.
- Calcula confianza del **hecho** según dimensiones constitucionales y parámetros de calibración pendientes.
- **Clasifica** conflictos compuestos aplicando la taxonomía constitucional A–E (no resuelve política ni declara resolución por ponderación).
- Emite preguntas abiertas **neutrales** cuando el Motor exige registrar huecos (nunca hipótesis).

### Qué nunca hace

- No redefine la Constitución ni el Motor.
- No toma decisiones de política, prioridad entre fuentes, ni excepciones propias.
- No llama al Reasoning Engine (Niveles 1–4).
- No genera hipótesis (Nivel 5 exclusivo del Reasoning Engine).
- No interpreta ausencia como cero.
- No declara “registro no encontrado” como hecho negativo.
- No usa lenguaje causal en Nivel 3 salvo regla causal aprobada por gobernanza del Motor.
- No suaviza conflictos Tipo E.
- No fija definitivamente `k` ni los pesos `wi`.
- No inventa fuentes no integradas.
- No sustituye al documento de producto IES ni al Reasoning Engine.

### Mapa de responsabilidades (este documento)

| Posee | No posee |
|-------|----------|
| Contrato ampliado de Observación | Definiciones constitucionales de niveles |
| Linaje e independencia para Cb | Política de cobertura CONOZCO… |
| Tipificación de estados de ausencia | Naturaleza del IES (Constitución IX / Motor §11) |
| Mecánica calibrable de confianza (`k`, `wi` pendientes) | Modelos mentales ejecutivos (Motor §7) |
| Esquema de conflicto compuesto | Tipos A–E (Constitución) |
| Lenguaje permitido/prohibido de ensamblaje por nivel | Reasoning Engine / Interfaces |
| Estructuras de salida hacia el IES | Implementación en código |
| Realización física v1 (D1–D15); frontera 03A → N1 → `bundle.observations` | Runtime; calibración G8 |

---

# 2. Contrato ampliado de Observación

**Definición constitucional (referencia):** Nivel 1 — datos crudos de las herramientas.  
**Gobernanza:** Motor §3.  
**Contrato de ensamblaje (este documento):**

Una **Observación** es el registro atómico de lo que una herramienta devolvió o de que no pudo devolver, sin interpretación.

## Objeto

| Campo | Obligatorio | Descripción |
|-------|-------------|-------------|
| `observation_id` | Sí | Identificador único del ciclo |
| `domain` | Sí | Dominio del catálogo de capacidades |
| `source` | Sí | Objeto de origen (ver abajo) |
| `entity` | Condicional | Entidad referida (planta, cliente, acción…) |
| `metric_or_event` | Sí | Métrica o tipo de evento |
| `value` | Sí (nullable) | Valor bruto o `null` |
| `unit` | No | Unidad si aplica |
| `period` | Condicional | Periodo del dato |
| `timestamp` | Sí | Momento de captura |
| `scope` | Sí | Alcance de la observación |
| `quality` | Sí | Calidad tipificada |
| `absence_state` | Condicional | Uno de los estados de ausencia §10 si aplica |
| `raw_result_ref` | Sí | Referencia al payload bruto |
| `lineage` | Sí | Linaje para independencia (§14) |
| `traceability` | Sí | Encadenamiento a plan + tool_plan + pregunta |

## Objeto `source` (ampliado; identidades poseídas por OP)

El Evidence Builder **consume** ObservationRecords de `03A` y **preserva** las identidades de procedencia **sin reinterpretarlas ni inventarlas**.

| Campo | Obligatorio | Descripción |
|-------|-------------|-------------|
| `tool_id` | Sí | Identificador de herramienta del registry |
| `domain` | Sí | Dominio asociado |
| `system` | Sí | Sistema/repositorio de origen (`source.system`) |
| `content_author_id` | Condicional / nullable | Autor/emisor original del contenido; `null` = no aplicable o no resoluble (**nunca** “autor inexistente”) |
| `author_role` | **No (opcional)** | Rol del autor del contenido cuando exista |
| `author_id` | No (compatibilidad) | Ambiguo históricamente; si aparece, debe alinearse a `content_author_id` y **nunca** a `extracted_by` |
| `channel` | No | Canal de captura si aplica |

Identidades de ciclo (nivel ObservationRecord; no sustituyen a `source.system` ni a `content_author_id`):

| Campo | Obligatorio | Descripción |
|-------|-------------|-------------|
| `extracted_by` | Sí | Componente/tool que realizó la adquisición técnica; **nunca** autor del contenido |
| `triggered_by` | Sí | Actor/proceso que originó la ejecución/consulta; **nunca** fuente de la afirmación |

## Reglas de Nivel 1 (aplicación)

1. No interpretar.  
2. No combinar semánticamente.  
3. No inferir.  
4. No corregir silenciosamente.  
5. Conservar origen y linaje (incl. `content_author_id`, `extracted_by`, `triggered_by`, `source.system`, `source_family`, `source_instance_id`, `trace_id`, `observation_id`, `raw_payload_reference`).
6. Tipificar calidad y ausencia sin convertirlas en valor de negocio.  
7. No presentar `extracted_by` como autor.  
8. No convertir `triggered_by` en fuente de la afirmación.  
9. No inventar `content_author_id` cuando sea `null`.

## Frontera 03A → Observación N1 → `bundle.observations`

**Decisión registrada (D2):** `E1` + `N1_WRAPS_03A`.

El input físico del Evidence Builder mantiene **dos listas hermanas e independientes**: `acquisition_statuses[]` y `observation_records[]`. `AcquisitionStatus` no se fusiona dentro del ObservationRecord ni se presenta como Observación N1.

Cada ObservationRecord **transportable** de `03A` se transforma de forma **determinística** en una Observación N1. La Observación N1:

- preserva identidad, procedencia, lineage y la referencia al payload original del ObservationRecord fuente;
- añade **únicamente** semántica que pertenece contractualmente a este documento (p. ej. `quality`, `absence_state`);
- no reinterpreta de forma libre el payload 03A.

`bundle.observations` contiene estas Observaciones N1. No contiene `AcquisitionStatus`.

**Regla de preservación (no pérdida / no invención / no reinterpretación):** `content_author_id`, `extracted_by`, `triggered_by`, `source.system`, `source_family`, `source_instance_id`, `trace_id`, `observation_id`, `raw_payload_reference` y demás elementos de linaje/procedencia del ObservationRecord fuente. `raw_result_ref` de N1 referencia el mismo payload original que `raw_payload_reference`; no se crea un original distinto.

---

# 3. Línea de ensamblaje

```
Observaciones (N1)
      ↓
Hechos (N2)  ← confianza multidimensional; solo ABSENCE_CONFIRMED afirma ausencia
      ↓
Evidencias (N3)  ← relaciones determinísticas; lenguaje no causal
      ↓
Diagnósticos (N4)  ← clasificación determinista; regla + soporte
      ↓
Estructuras del IES  ← el Motor declara el producto IES; sin hipótesis
      ↓
[Fuera del Evidence Builder] Reasoning Engine — Nivel 5 Hipótesis
      ↓
[Fuera del Evidence Builder] Interfaces
```

No se salta niveles (Constitución III). Ninguna evidencia sin hechos; ningún hecho sin observaciones; ningún diagnóstico sin regla y soporte.

---

# 4. Confianza multidimensional calibrable

**Epistemología (referencia):** Constitución II.  
**Gobernanza:** Motor §4.  
**Mecánica de ensamblaje (este documento):**

```
Confianza del Hecho = f(Fs × R × Cb × Cs × Cb_ov)
```

| Símbolo | Dimensión |
|---------|-----------|
| Fs | Fiabilidad de la fuente |
| R | Recencia |
| Cb | Corroboración (por independencia de linaje; ver §5–§6) |
| Cs | Consistencia (separada de anomalía/plausibilidad/novedad; ver §7) |
| Cb_ov | Cobertura |

### Principios de aplicación

- La confianza pertenece al **hecho**, no solamente a la fuente.
- La fórmula final y los pesos requieren calibración (§18).
- Una fuente humana puede ganar confianza mediante corroboración independiente.
- La repetición no equivale automáticamente a independencia.
- Ninguna confianza calculada elimina la trazabilidad.
- No se declara “confianza absoluta”; el máximo lingüístico permitido es **confianza alta**.

Parámetros `wi` y saturación `k`: **pendientes de calibración**; no se fijan en este documento.

---

# 5. Corroboración saturada basada en independencia de linaje

La dimensión **Cb** no cuenta menciones: cuenta **linajes independientes** que sostienen el mismo hecho.

### Independencia de linaje

Dos observaciones son independientes para corroboración solo si sus `lineage` difieren en origen productivo relevante (`source.system`, `extracted_by`, `content_author_id` cuando exista, o cadena de captura), no por mera repetición del mismo payload. `triggered_by` no define por sí solo un linaje de contenido.

### Saturación

- La contribución de corroboración crece con el número de linajes independientes hasta un techo de saturación `k` (**pendiente de calibración**; no fijado).
- Más allá de `k`, linajes adicionales no deben inflar la confianza de forma ilimitada.
- No se usa “confianza absoluta” tras saturar; como máximo, **confianza alta** si el resto de dimensiones lo permiten.

---

# 6. Separación: repetición, propagación, consenso humano y confirmación transaccional

Estos fenómenos **no** son equivalentes y no deben mezclarse en Cb:

| Concepto | Significado | Efecto en Cb |
|----------|-------------|--------------|
| **Repetición** | Misma observación reemitida o duplicada en el mismo linaje | No aumenta Cb |
| **Propagación** | Un dato copiado/reenviado desde un único origen | No cuenta como linaje nuevo |
| **Consenso humano** | Varios humanos afirman lo mismo sin independencia demostrable de captura | No equivale automáticamente a independencia; puede reforzar solo si hay linajes distintos |
| **Confirmación transaccional** | Hecho respaldado por registro de sistema/transacción verificable (tool integrada) | Puede constituir linaje independiente de alta Fiabilidad (Fs), según catálogo de fuentes |

---

# 7. Separación: consistencia, anomalía, plausibilidad y novedad

Estas nociones no se colapsan en una sola etiqueta:

| Concepto | Ámbito | Uso |
|----------|--------|-----|
| **Consistencia (Cs)** | Dimensión de confianza del hecho | ¿Contradice otras observaciones/hechos del ciclo? |
| **Anomalía** | Señal de desviación respecto a referencia o patrón bajo regla | Puede alimentar evidencia de tipo desviación/deterioro; no es por sí sola “error” |
| **Plausibilidad** | Juicio de verosimilitud | **Prohibida en Niveles 1–4** como criterio sustantivo (pertenece al Reasoning Engine si procede) |
| **Novedad** | Primera aparición en el ciclo o periodo | Informa recencia/cobertura; no implica invalidez ni causalidad |

---

# 8. Lenguaje no causal en Nivel 3

**Definición constitucional (referencia):** relaciones determinísticas entre hechos mediante reglas.  
Las evidencias se ensamblan con `applied_rule` identificable.

### Permitido (Nivel 3)

- co-ocurrencia bajo regla;
- desviación respecto a referencia;
- tendencia entre periodos comparables;
- incumplimiento / ausencia de mitigación (si la regla lo define);
- contradicción entre hechos;
- correlación declarada como correlación.

### Prohibido (Nivel 3)

- “por eso”, “causa”, “debido a”, “directamente ligado”, “provoca”, “explica la caída”, u otros términos causales **salvo regla causal formalmente aprobada y versionada** por gobernanza del Motor;
- lenguaje probabilístico del Builder (“probablemente”, “quizá”);
- inferencia del Reasoning Engine;
- relación sin `applied_rule`.

---

# 9. Diagnóstico determinista de Nivel 4

**Definición constitucional (referencia):** clasificación determinística.  
**Taxonomía de categorías y modelos mentales:** Motor §§6–7 (este Builder no las redefine).

### Requisitos de ensamblaje

- `classification_criterion` (regla) obligatorio;
- soporte en hechos y/o evidencias trazables;
- severidad e impacto calculados **después** de tipificar conflictos;
- sin hipótesis;
- sin suavizar Tipo E.

---

# 10. Estados de ausencia y tipificación de no-valor

Los estados tipifican **por qué no hay valor de negocio**, sin colapsarlos.  
**Propietario de esta tipificación operativa:** este documento.  
**AcquisitionStatus (transporte técnico):** Observation Pipeline (`03A`) — el EB **consume**, no redefine.  
**Política de cobertura CONOZCO…:** Motor / Constitución (el EB **aplica**, no redefine).

## 10.1 Mapa AcquisitionStatus → tipificación EB

| AcquisitionStatus (OP) | Tipificación / uso en EB | ¿Afirma ausencia? |
|------------------------|--------------------------|-------------------|
| `ACQUIRED_OK` | Observaciones de negocio; hechos positivos posibles | No (afirmación positiva, no ausencia) |
| `ACQUIRED_EMPTY` | Tipificación `DATA_NOT_FOUND` (vacío técnico) | **No** automáticamente; solo si se eleva a `ABSENCE_CONFIRMED` |
| `SOURCE_NOT_INTEGRATED` | Ausencia no comprobable; límite / pregunta abierta | No |
| `SOURCE_RESTRICTED` | Inaccesible; puede activar `NO_CONOZCO` en alcance | No |
| `TOOL_ERROR` | Fallo tipificado (incl. timeout) | No |
| `QUERY_SCOPE_INCOMPLETE` | Pregunta abierta; no concluir alcance faltante | No |
| `ENTITY_UNRESOLVED` | Sin hechos sobre entidad canónica inferida | No |

`ABSENCE_CONFIRMED` **no** es AcquisitionStatus: es tipificación del EB sobre un vacío ya adquirido.

## 10.2 Catálogo de tipificación (ausencia / no-valor)

| Estado | Significado | ¿Puede generar afirmación de ausencia en Nivel 2? | ¿Hecho sustantivo positivo? |
|--------|-------------|-----------------------------------------------------|-----------------------------|
| `ABSENCE_CONFIRMED` | Fenómeno no presente, vacío comprobado bajo contrato de la tool | **Sí — único** | Solo hecho **negativo** de ausencia autorizado |
| `DATA_NOT_FOUND` | Búsqueda OK; sin filas/coincidencias | No (salvo elevación explícita) | No |
| `SOURCE_NOT_INTEGRATED` | Dominio/tool no integrado | No | No |
| `SOURCE_RESTRICTED` | Inaccesible por permiso/rol | No | No |
| `TOOL_ERROR` | Error / timeout | No | No |
| `QUERY_SCOPE_INCOMPLETE` | Faltan inputs de alcance | No | No |
| `ENTITY_UNRESOLVED` | Entidad ambigua o no resuelta | No | No |

## 10.3 Elevación `DATA_NOT_FOUND` / `ACQUIRED_EMPTY` → `ABSENCE_CONFIRMED`

Todas las condiciones siguientes son **necesarias** (política Motor + mecánica EB; sin umbrales de negocio nuevos aquí):

1. Tool/dominio **integrado** (no `SOURCE_NOT_INTEGRATED`).  
2. Adquisición técnica exitosa con vacío (`ACQUIRED_EMPTY` / `DATA_NOT_FOUND`), **no** `TOOL_ERROR` ni `SOURCE_RESTRICTED`.  
3. Alcance de consulta **completo** para la afirmación (planta, periodo, entidad/filtros exigidos por el contrato de la tool).  
4. Entidad en `RESOLVED` cuando el contrato de la tool lo exige.  
5. El **contrato de la tool** declara que ese vacío, bajo ese alcance, **prueba inexistencia** del fenómeno consultado (consulta exhaustiva en el sentido del contrato).  
6. Existe regla versionada del EB (`applied_absence_rule_id`) que eleva el caso a `ABSENCE_CONFIRMED`.

Si falta cualquiera → permanece `DATA_NOT_FOUND` (o el AcquisitionStatus original).  
**`DATA_NOT_FOUND` ≠ `ABSENCE_CONFIRMED`.**  
**`TOOL_ERROR` ≠ `DATA_NOT_FOUND` ≠ `ABSENCE_CONFIRMED`.**

### Reglas

1. **Solo `ABSENCE_CONFIRMED` puede generar una afirmación de ausencia** en Nivel 2.  
2. En Nivel 2 **no** se usa “registro no encontrado” como hecho negativo.  
3. `DATA_NOT_FOUND` ≠ `SOURCE_NOT_INTEGRATED` ≠ cero ≠ ausencia empresarial.  
4. `TOOL_ERROR` incluye tiempo de espera agotado; no se interpreta como vacío de negocio.  
5. Cobertura del Bundle: aplicar política Motor §9 (agregación multi-fuente); conflictos abiertos **no** se ocultan porque falte otra fuente.  
6. `CONOZCO_PARCIALMENTE` **no** autoriza completar vacíos con LLM ni con inferencia del Builder.

---

# 11. Conflictos compuestos

**Tipos A–E (referencia constitucional; no redefinición).**  
Primero el tipo; después severidad e impacto. No promediar ni conciliar arbitrariamente. Un conflicto permanece `OPEN` (o `UNDER_REVIEW`) hasta evidencia suficiente; **no se declara `RESOLVED` por simple ponderación**.

**Propiedad del estado de resolución:** este documento (Evidence Builder) es el **único propietario** de `resolution_status` y de las transiciones válidas. El EKS solo persiste el valor emitido en el Knowledge Bundle. El IES solo proyecta ese valor; **no** cambia estados de resolución.

## Objeto de conflicto compuesto (propiedad de este documento)

| Campo | Descripción |
|-------|-------------|
| `conflict_id` | Identificador |
| `primary_type` | Tipo A \| B \| C \| D \| E (clasificación principal constitucional) |
| `secondary_types` | Lista opcional de tipos concurrentes |
| `weight_assessment` | Evaluación ponderada de severidad/impacto (**informativa**; **nunca** resuelve ni autoriza transición) |
| `resolution_status` | Exactamente uno de: `OPEN` \| `UNDER_REVIEW` \| `RESOLVED` \| `SUPERSEDED` |
| `applied_resolution_rule_id` | Condicional: **obligatorio** si `resolution_status=RESOLVED` |
| `resolution_supporting_fact_ids` | Condicional: hechos que justifican el cierre (`RESOLVED`) |
| `resolution_supporting_evidence_ids` | Condicional: evidencias nuevas/suficientes que justifican el cierre (`RESOLVED`) |
| `interpretation_constraint` | Restricción de lenguaje/uso para el IES y el Reasoning Engine |
| `governance_escalation` | Obligatoria/contundente cuando `primary_type` o `secondary_types` incluye **E** |

### Estados de `resolution_status` (enum exacto; propietario: Evidence Builder)

| Estado | `meaning` | `allowed_transition_from` | `required_evidence` | `required_rule` | `audit_fields` |
|--------|-----------|---------------------------|---------------------|-----------------|----------------|
| `OPEN` | Conflicto tipificado y vigente; no cerrado | *(estado inicial al tipificar)*; también desde `UNDER_REVIEW` si la revisión no cierra | Tipificación A–E con hechos/fuentes en tensión | Regla de tipificación del Builder (no regla de cierre) | `conflict_id`, `primary_type`, `severity`, `facts_in_tension` / equivalentes Bundle |
| `UNDER_REVIEW` | En revisión institucional; **no** reduce severidad; **no** oculta Tipo E | `OPEN` | Registro de apertura de revisión (trazable); sin exigir cierre | Regla/gobernanza de revisión (no de resolución) | `conflict_id`, motivo/trazabilidad de revisión; conserva `severity` y Tipo E |
| `RESOLVED` | Cerrado con evidencia **nueva/suficiente** que justifica el cierre | `OPEN`, `UNDER_REVIEW` | Evidencia nueva/suficiente + referencias a hechos y evidencias que justifican el cierre | `applied_resolution_rule_id` **obligatorio** | `applied_resolution_rule_id`, `resolution_supporting_fact_ids`, `resolution_supporting_evidence_ids`, `conflict_id` |
| `SUPERSEDED` | Superado por evidencia o ciclo posterior; **no equivale** a `RESOLVED` | `OPEN`, `UNDER_REVIEW`, `RESOLVED` | Referencia al conflicto/ciclo/evidencia que lo sustituye | Regla de supersesión (distinta de regla de resolución) | `conflict_id` supersesor o referencia de ciclo; estado previo |

### Prohibiciones de transición (inválidas)

1. `OPEN` → `RESOLVED` **solo** por `weight_assessment` / peso de fuente.  
2. `OPEN` → `SUPERSEDED` para **esconder** un conflicto (sin evidencia/ciclo sucesor trazable).  
3. `UNDER_REVIEW` → `RESOLVED` **sin** evidencia nueva/suficiente y sin `applied_resolution_rule_id`.  
4. Cualquier cambio de `resolution_status` efectuado por **IES** o **EKS** (solo EB emite el estado en el Bundle).  
5. Tratar `SUPERSEDED` como si fuera `RESOLVED`.  
6. Usar `UNDER_REVIEW` para bajar severidad u omitir Tipo E.

### Tipo E

Si hay Tipo E: no minimizar; no suavizar.  
Conflictos Tipo E en `OPEN` o `UNDER_REVIEW` **permanecen obligatoriamente visibles** en el Bundle, en el Snapshot EKS y en toda proyección IES (incluidas proyecciones de canal futuras).  
Conservar en estructuras del IES los elementos exigidos por Constitución V (el Builder no inventa exigencias adicionales ni las suaviza).

### `weight_assessment`

Informativo. Nunca autoriza `RESOLVED`. Nunca oculta ni archiva conflictos.

---

# 11B. Materialidad (mecánica de ensamblaje)

**Política y catálogo `MAT_*` / `MATERIALITY_NOT_ASSESSED`:** Motor (`DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md` §7A).  
**Este documento** aplica la mecánica cuando exista ruleset calibrado; **no** redefine el catálogo ni fija umbrales/`k`/`wi`.

## Separación

- `confidence` ≠ `materiality` ≠ `severity` ≠ `priority`.  
- Prohibido derivar `MAT_*` solo desde confianza alta, severidad crítica o priority sin **regla explícita** del ruleset de materialidad.

## Dónde nace / se asigna

| Objeto | Rol de materiality |
|--------|--------------------|
| N2 Hecho | **Locus primario de evaluación** (si hay ruleset) o `MATERIALITY_NOT_ASSESSED` |
| N3 Evidencia | **Deriva/preserva** desde hechos soporte (p. ej. máximo determinista de `MAT_*` evaluados) o `MATERIALITY_NOT_ASSESSED`; no evaluación libre |
| N4 Diagnóstico | **Deriva** desde facts/evidence soporte bajo regla de rollup del ruleset, o `MATERIALITY_NOT_ASSESSED` |
| Conflicto compuesto | **No** sustituye `severity`; no asignar `MAT_*` por ser Tipo E/`GRAVE` sin regla; puede referenciar materiality de hechos en tensión |
| Pregunta abierta | Usa `priority` (orden); **no** requiere `materiality` |
| Knowledge Bundle | **Preserva** valores emitidos por N2–N4 |
| IES | **Solo proyecta** (ver `04`) |
| EKS | **Solo persiste** |
| Reasoning Engine / Channel Projection | **Solo consumen**; prohibido modificar |

## Campos (cuando el objeto lleva materiality)

| Campo | Obligatorio | Descripción |
|-------|-------------|-------------|
| `materiality` | Sí (si el objeto declara el campo) | Uno de `MAT_LOW` \| `MAT_MEDIUM` \| `MAT_HIGH` \| `MAT_CRITICAL` \| `MATERIALITY_NOT_ASSESSED` |
| `applied_materiality_rule_id` | Condicional | Obligatorio si `materiality` ∈ `MAT_*`; **null** si `MATERIALITY_NOT_ASSESSED` |
| `materiality_ruleset_version` | Condicional | Versión del ruleset si evaluado; **null** / omitido si no evaluado |

## Sin ruleset calibrado

Emitir `MATERIALITY_NOT_ASSESSED`.  
No usar ejemplos ilustrativos como regla productiva.  
No degradar a `MAT_LOW`.

## `NO_CONOZCO`

Sin hechos/evidencias evaluables: no inventar `MAT_*`. Bancos vacíos sin materialidad ficticia.

## Impugnación

No mutar materialidad histórica del Bundle/Snapshot persistido; nueva evaluación = nuevo ensamblaje versionado trazable (Constitución VI / Motor §7A).
---

# 12. Preguntas abiertas neutrales

**Política (Motor §10):** registrar huecos.  
**Aplicación aquí:** estructura mínima y neutralidad.

Las preguntas abiertas son **neutrales**: no imputan causa, culpa ni hipótesis.

### Prohibiciones

- No convertirlas en hipótesis (Reasoning Engine).
- No usar tono acusatorio.
- No afirmar hechos faltantes como si existieran.

### Campos mínimos

`open_question_id`, `question`, `reason`, `required_data`, `expected_source` (si existe en catálogo), `impact`, `priority`, `status`.

---

# 13. Principios de confianza

1. Confianza del hecho, no solo de la fuente (Constitución II).  
2. Multidimensionalidad explícita (Fs, R, Cb, Cs, Cb_ov).  
3. Corroboración por linaje independiente, no por repetición.  
4. Saturación calibrable (`k` pendiente).  
5. Pesos `wi` pendientes; no fijados aquí.  
6. Máximo lingüístico: **confianza alta** (nunca “confianza absoluta”).  
7. Trazabilidad irrenunciable.  
8. Contundencia del ensamblado proporcional a confianza/severidad/impacto (aplicación de Constitución V.12 al ensamblaje; sin redefinir la regla).  
9. Prioridad entre fuentes: la define el Motor/catálogo; el Builder solo la aplica.

---

# 14. Linaje e independencia

Cada observación declara `lineage` suficiente para decidir independencia **según reglas de este documento** (mecánica; no política de fuentes).

### Elementos mínimos de linaje

- `tool_id`;
- `system` (`source.system`);
- `content_author_id` (nullable; no inventar);
- `extracted_by`;
- `triggered_by`;
- `author_role` (opcional);
- `source_family` y `source_instance_id` (preservados de `03A`; no inventar);
- `trace_id` (preservado de `03A`);
- identificadores de captura/periodo;
- `raw_payload_reference` del ObservationRecord fuente y `raw_result_ref` de N1 (mismo payload original).

### Reglas

- Mismo `content_author_id` + mismo `extracted_by` + mismo payload → un solo linaje (repetición/propagación), salvo independencia demostrable de `source.system`/cadena.  
- `extracted_by` no cuenta como autor del contenido.  
- `triggered_by` no cuenta como fuente de la afirmación.  
- Confirmación transaccional de sistema distinto puede ser linaje independiente.  
- Consenso humano sin independencia de captura no multiplica Cb.  
- `content_author_id = null` se preserva tal cual (sistema sin autor humano, o humano no resoluble).

---

# 15. Lenguaje permitido y prohibido por niveles

| Nivel | Permitido | Prohibido |
|-------|-----------|-----------|
| N1 Observaciones | Descripción bruta tipificada | Juicios, causas, “bueno/malo” |
| N2 Hechos | Declaraciones verificables; ausencia solo si `ABSENCE_CONFIRMED` | “Registro no encontrado” como hecho negativo; cero por ausencia no comprobada; hipótesis |
| N3 Evidencias | Relaciones no causales bajo regla; correlación/desviación/tendencia/contradicción… | Causalidad informal; “directamente ligado” sin regla causal aprobada; probabilidad del Builder |
| N4 Diagnóstico | Categoría + severidad + criterio + soporte (categorías del Motor) | Causas probables; hipótesis; suavizar Tipo E |
| Estructuras IES | Hechos, evidencias, diagnósticos, conflictos, límites, preguntas abiertas | Hipótesis; narrativa que oculte conflicto; redefinir el IES |
| Reasoning Engine (fuera) | Hipótesis subordinadas al IES | Presentar hipótesis como hecho |

---

# 16. Invariantes arquitectónicas

1. Ninguna evidencia sin hechos.  
2. Ningún hecho sin observaciones verificables.  
3. Ningún diagnóstico sin regla y soporte.  
4. El Evidence Builder no genera hipótesis.  
5. Solo `ABSENCE_CONFIRMED` afirma ausencia.  
6. `DATA_NOT_FOUND` ≠ `SOURCE_NOT_INTEGRATED` ≠ cero ≠ `ABSENCE_CONFIRMED`; `TOOL_ERROR` ≠ vacío.  
7. Conflictos compuestos no se resuelven por `weight_assessment` solo.  
8. Tipo E no se omite ni se suaviza; Tipo E `OPEN`/`UNDER_REVIEW` permanece visible.  
9. Preguntas abiertas neutrales ≠ hipótesis.  
10. Estructuras del IES sin hipótesis; IES inmutable para el Reasoning Engine.  
11. No inventar fuentes no integradas.  
12. Identidades de procedencia: `content_author_id` (nullable), `extracted_by`, `triggered_by`, `source.system` — distintas; EB las preserva sin reinterpretar.  
13. Tiempo de espera agotado tipificado como `TOOL_ERROR`, no como vacío.  
14. Conformidad arquitectónica con Constitución y Motor.  
15. Sin decisiones de política propias; sin redefinir conceptos constitucionales.  
16. `resolution_status` ∈ {`OPEN`,`UNDER_REVIEW`,`RESOLVED`,`SUPERSEDED`}; único propietario = Evidence Builder.  
17. `RESOLVED` exige evidencia + `applied_resolution_rule_id` + refs a hechos/evidencias; `SUPERSEDED` ≠ `RESOLVED`.  
18. EKS/IES no cambian `resolution_status`.
19. `bundle.observations` = Observaciones N1 (`N1_WRAPS_03A`); `AcquisitionStatus` permanece en lista hermana / `source_health`, no dentro de N1.

---

# 17. Declaración de preparación para IES

El Evidence Builder v2.0 se declara **preparado para el diseño del IES** cuando:

1. La línea N1→N2→N3→N4→estructuras IES está especificada sin saltos.  
2. Los estados de ausencia §10 están tipificados y no colapsados.  
3. Los conflictos compuestos §11 incluyen Tipo E con `governance_escalation`.  
4. El lenguaje por niveles §15 prohíbe causalidad informal en N3 y hipótesis en el Builder.  
5. La confianza §4–§6 es multidimensional, saturada por linaje, con `k` y `wi` explícitamente pendientes.  
6. Las estructuras resultantes pueden alimentar un IES consumible por cualquier interfaz sin reescribir hechos (Constitución IX).  
7. Existe **conformidad arquitectónica** con Constitución y Motor, bajo jerarquía Constitución → Motor → Evidence Builder → IES → Reasoning Engine → Interfaces.  
8. El Builder no redefine el IES ni el Reasoning Engine.

v2.1 registra la realización física D1–D15; **no** altera esta declaración ni calibra §18.

La implementación de código permanece **PENDIENTE**. Queda prohibido implementar si se violan invariantes críticas de la Constitución. Esta sección no autoriza IMPL-EB-001.

---

# 18. Parámetros pendientes de calibración

No fijados en v2.1; requieren calibración y auditoría (Constitución II y VII). **G8** permanece pendiente; esta versión no calibra:

| Parámetro | Descripción |
|-----------|-------------|
| `wi` | Pesos de Fs, R, Cb, Cs, Cb_ov dentro de `f(...)` |
| `k` | Techo de saturación de corroboración por linajes independientes |
| Umbrales de severidad | Mapeo ordinal de impacto por tipo de conflicto y diagnóstico |
| Escalado de Fs por tool/dominio | Tabla de fiabilidad por fuente del catálogo |
| Ventanas de recencia (R) | Criterios por dominio |
| Reglas causales aprobadas | Lista vacía por defecto; toda regla causal futura debe versionarse explícitamente en gobernanza del Motor |

Hasta calibrar: el Builder expone dimensiones y tipificaciones; no afirma precisión numérica definitiva de la confianza.

---

# 19. Realización física v1 (D1–D15)

Esta sección **no** redefine N1–N5 ni la Constitución. No introduce epistemología. No autoriza runtime por sí sola. No calibra materias reservadas a G8. Registra las decisiones físicas aprobadas por HUMAN_APPROVER (tarea `ARCH-EB-PHYSICAL-DECISIONS-003`, G2). Evidencia: `ARCH-EB-PHYSICAL-DECISIONS-002`.

Los identificadores I2, E1, N1_WRAPS_03A, SEQUENTIAL_BARRIERS, R_MOD_EMPTY_GOVERNED_SETS, OPAQUE_TRACEABLE_IDS, PRESERVE_FULL_03A_LINEAGE_NO_K, DIMENSIONS_WITHOUT_FALSE_PRECISION, FAIL_CLOSED, LITERAL_STATE_MACHINE, NOT_ASSESSED_UNTIL_G8, PURE_NO_SIDE_EFFECTS, EB_SEMANTICS_PLUS_EKS_STRUCTURE, 03B_PLUS_MINIMAL_03A_FAIL_CLOSED_CASES, EB_FIXTURES_FIRST_OP_BEFORE_PRODUCTION y REGISTER_MINIMUM_PHYSICAL_BOUNDARY son los de esa aprobación. **Prohibido** sustituirlos en implementación.

| ID | Decisión aprobada | Significado contractual |
|----|-------------------|-------------------------|
| D1 | **I2** | Módulo puro con etapas explícitas N1 → N2 → N3 → N4 → `emitBundle`, desacoplado de `server.js`. No llama `append_snapshot`. |
| D2 | **E1** + **N1_WRAPS_03A** | Input: listas hermanas `acquisition_statuses[]` y `observation_records[]` (sin fusionar). Cada ObservationRecord transportable de `03A` se transforma determinísticamente en Observación N1. `bundle.observations` contiene esas Observaciones N1. Preservación de procedencia/linaje según §2. |
| D3 | **SEQUENTIAL_BARRIERS** | N1 → N2 → N3 → N4 con barreras explícitas. Ningún hecho sin observación; ninguna evidencia sin hechos; ningún diagnóstico sin regla y soporte. Listas vacías son válidas y no equivalen a salto de nivel. |
| D4 | **R_MOD_EMPTY_GOVERNED_SETS** | Registry versionado en implementación. Conjuntos de elevación de ausencia, resolución, causalidad y materiality **vacíos** mientras no exista gobernanza/calibración autorizada. No se inventan reglas para completar tests. |
| D5 | **OPAQUE_TRACEABLE_IDS** | Se preservan `trace_id` y `observation_id` del OP. N2–N4, conflictos, preguntas y `bundle_id` usan identificadores opacos únicos y trazables. No se congela algoritmo UUID/hash como obligación arquitectónica. |
| D6 | **PRESERVE_FULL_03A_LINEAGE_NO_K** | Se preserva el lineage de `03A` y los mínimos de este documento. Independencia por origen productivo/cadena de captura, no por repetición. No se aplica saturación `k` mientras G8 siga pendiente. |
| D7 | **DIMENSIONS_WITHOUT_FALSE_PRECISION** | Se exponen Fs, R, Cb, Cs y Cb_ov sin producto numérico calibrado ni pesos `wi` inventados. `NO_CONOZCO` puede expresar 0.00 únicamente donde ya lo exija la autoridad contractual. |
| D8 | **FAIL_CLOSED** | `DATA_NOT_FOUND` / `ACQUIRED_EMPTY` no se elevan a `ABSENCE_CONFIRMED` mientras falte cualquiera de las condiciones de §10.3, incluido contrato de tool y `applied_absence_rule_id` versionado. |
| D9 | **LITERAL_STATE_MACHINE** | `resolution_status` aplica literalmente `OPEN`, `UNDER_REVIEW`, `RESOLVED` y `SUPERSEDED`. Sin ruleset de resolución no se emite `RESOLVED`. `weight_assessment` nunca cierra un conflicto. |
| D10 | **NOT_ASSESSED_UNTIL_G8** | Sin ruleset calibrado, los objetos que declaran materiality emiten `MATERIALITY_NOT_ASSESSED` y `applied_materiality_rule_id` null. Nunca se degrada silenciosamente a `MAT_LOW`. |
| D11 | **PURE_NO_SIDE_EFFECTS** | No muta inputs, no hace I/O operacional, no usa LLM, no escribe EKS y no llama Reasoning Engine. Misma entrada + mismos rulesets versionados → mismo resultado determinístico. |
| D12 | **EB_SEMANTICS_PLUS_EKS_STRUCTURE** | El EB posee validación semántica N1–N4. El Bundle emitido debe además pasar `validate_structure` de EKS. Esta sección no amplía ni redefine `validate_structure`. |
| D13 | **03B_PLUS_MINIMAL_03A_FAIL_CLOSED_CASES** | La implementación futura usará A/B de `03B` como referencia ilustrativa y podrá crear entradas 03A mínimas para `ACQUIRED_EMPTY`, `TOOL_ERROR`, `SOURCE_RESTRICTED`, `ENTITY_UNRESOLVED`, conflicto `OPEN` y `MATERIALITY_NOT_ASSESSED`, sin inventar reglas productivas. Esta sección no crea fixtures. |
| D14 | **EB_FIXTURES_FIRST_OP_BEFORE_PRODUCTION** | El EB puede implementarse y probarse primero contra fixtures contractuales 03A/03B. El Observation Pipeline runtime debe existir antes de producir Bundles de producción o alimentar EKS con conocimiento no-fixture. Esta sección no autoriza esas implementaciones. |
| D15 | **REGISTER_MINIMUM_PHYSICAL_BOUNDARY** | Este documento registra D1–D14. `03` registra únicamente que `bundle.observations` contiene Observaciones N1 derivadas de ObservationRecords 03A. No se reabre epistemología, coverage, EKS append-only ni otros contratos. |

### Límites de esta realización

1. Runtime **PENDIENTE**. Esta sección no implementa Evidence Builder.
2. No calibra `wi`, `k`, Fs productivo, ventanas R, umbrales de severidad, ruleset productivo de materiality, reglas causales ni contratos de tool que prueben inexistencia (G8).
3. No autoriza IMPL-EB-001 ni ninguna tarea posterior.
4. No redefine `03A` ni `validate_structure` de `03`.

---

# Control documental

| Campo | Valor |
|-------|--------|
| Documento | `02-EVIDENCE-BUILDER.md` |
| Versión | 2.1 |
| Estado | APROBADO PARA DISEÑO DEL IES; realización física v1 registrada (D1–D15) |
| Tipo | Especificación arquitectónica (ensamblaje) |
| Dependencia normativa | `docs/director-ia/DIRECTOR_IA_CONSTITUTION.md`; `docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md` |
| Fuentes de apoyo | `docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md`; `docs/director-ia/DIRECTOR_IA_V2_FASE_1_VERACIDAD.md`; `docs/director-ia/DIRECTOR_IA_V2_FASE_2_PLANNER.md`; `docs/director-ia/DIRECTOR_IA_V2_FASE_3_TOOL_ORCHESTRATOR.md`; `docs/director-ia/03A-OBSERVATION-PIPELINE.md`; `docs/director-ia/03-EXECUTIVE-KNOWLEDGE-STORE.md` |
| Implementación | PENDIENTE |
| Parámetros de calibración | PENDIENTES (G8) |
| Auditoría | 2026-08-15: realización física D1–D15 (`ARCH-EB-PHYSICAL-DECISIONS-003`); sin redefinición constitucional; sin calibración G8 |

---

*Fin de `02-EVIDENCE-BUILDER.md` v2.1. No se modificó código.*
