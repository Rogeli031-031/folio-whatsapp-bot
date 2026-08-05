# DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md

**Tipo:** Arquitectura conceptual del Motor de Conocimiento Ejecutivo (Director IA v2)  
**Fecha:** 2026-08-04  
**Estado:** Diseño normativo (sin implementación)

### Fuentes normativas consultadas

| Documento | Estado en el repositorio |
|-----------|--------------------------|
| `docs/director-ia/DIRECTOR_IA_CONSTITUTION.md` | Disponible — Constitución v1.0 (APROBADA); norma superior |
| `docs/director-ia/02-EVIDENCE-BUILDER.md` | Disponible — ensamblador propietario de contratos N1–N4 |
| `docs/director-ia/DIRECTOR_IA_V2_FASE_1_VERACIDAD.md` | Disponible — catálogo de capacidades y veracidad |
| `docs/director-ia/DIRECTOR_IA_V2_FASE_2_PLANNER.md` | Disponible — plan de intents/dominios |
| `docs/director-ia/DIRECTOR_IA_V2_FASE_3_TOOL_ORCHESTRATOR.md` | Disponible — tool plan declarativo |
| `docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md` | Complemento de inventario de fuentes |

Este documento **no inventa fuentes** fuera del inventario de Fases 1–3. En caso de conflicto, prevalece la Constitución.  
Este documento **no redefine** conceptos constitucionales: los referencia.  
Este documento **no contiene implementación** (ni código, ni APIs, ni esquemas de base de datos).  
Los **contratos de ensamblaje** (campos, linaje, ausencia tipificada, confianza calibrable, conflictos compuestos) son propiedad de `docs/director-ia/02-EVIDENCE-BUILDER.md`.

### Pipeline oficial (Constitución X)

```
Constitution
        ↓
Executive Knowledge Engine   ← este documento (gobernanza del Motor)
        ↓
Evidence Builder             ← ensambla N1–N4 (sin decisiones de política propias)
        ↓
IES                          ← producto oficial del Motor
        ↓
Reasoning Engine             ← Nivel 5 / Hipótesis (subordinado al IES)
        ↓
Interfaces                   ← consumo multiinterfaz sin reescribir el IES
```

### Cadena interna del Motor (obligatoria)

```
Pregunta + Plan + Tool Plan + Resultados de herramientas
        ↓
Evidence Builder:
  Nivel 1  Observaciones
  Nivel 2  Hechos
  Nivel 3  Evidencias
  Nivel 4  Diagnóstico Ejecutivo
        ↓
IES (producto del Motor; inmutable para el Reasoning Engine)
```

El Reasoning Engine (Nivel 5) **no** forma parte del Motor. El Motor **no** genera hipótesis.

---

# 1. Propósito del Motor

El Motor de Conocimiento Ejecutivo convierte resultados de herramientas (y estados de no-disponibilidad) en un **conocimiento estructurado, trazable y honestamente limitado**, apto para producir un IES.

## Qué recibe

- La pregunta del usuario.
- El plan del Planner (intent, dominios, confianza, clarificación).
- El tool plan del Orchestrator (`can_execute`, `executable_tools`, `unavailable_tools`, `missing_inputs`, etc.).
- Resultados de herramientas **cuando existan** (futura ejecución; hoy el orchestrator solo declara).
- Identidad, permisos, planta, periodo y parámetros de reevaluación.

## Qué produce

- Observaciones, hechos, evidencias y diagnósticos estructurados (Niveles 1–4).
- Estado de cobertura del conocimiento (`CONOZCO` / `CONOZCO_PARCIALMENTE` / `EXISTE_CONFLICTO` / `NO_CONOZCO`).
- Conflictos explícitos (Tipos A–E) y preguntas abiertas (que **no** son hipótesis).
- Un **IES oficial** (producto del Motor) y, si aplica, un **IES alternativo** auditado.
- El IES como entrada inmutable al Nivel 5; el Motor **no** genera hipótesis.

## Qué nunca hace

- No invoca al Reasoning Engine en Niveles 1–4 ni para construir el IES.
- No genera hipótesis (Nivel 5 es exclusivo del Reasoning Engine).
- No ejecuta operaciones de escritura (aprobar, mover, cancelar, subir póliza, cambiar permisos).
- No inventa datos de fuentes no integradas (folios/kanban, historial, documentos, presupuestos, etc.).
- No interpreta ausencia como cero.
- No oculta conflictos ni promedia valores contradictorios; no suaviza conflictos Tipo E.
- No afirma causalidad no demostrada por regla.
- No reemplaza silenciosamente un IES oficial por uno alternativo.
- No modifica el histórico real de las fuentes por una reevaluación.

## Relación con componentes

| Componente | Rol respecto al Motor |
|------------|------------------------|
| **Planner** | Define *qué* se pretende conocer (intent + dominios). Entrada del Motor. No es el Motor. |
| **Tool Plan / Tool Orchestrator** | Define *con qué herramientas* y si son ejecutables. Entrada del Motor. No es el Motor. |
| **Capabilities / Veracidad** | Acota qué dominios son legibles; alimenta `NO_CONOZCO` / fuentes no integradas. |
| **Evidence Builder** | Mecanismo de ensamblaje N1–N4 bajo gobernanza de este Motor. No toma decisiones de política propias. Propietario de contratos de ensamblaje. |
| **IES** | Producto oficial del Motor; independiente del canal; inmutable para el Reasoning Engine. |
| **Reasoning Engine** | Solo Nivel 5 (Hipótesis), subordinado al IES; nunca crea observaciones, hechos, evidencias, diagnósticos ni altera el IES. |
| **Interfaces** | Consumen el IES sin reescribirlo. |

## Mapa de responsabilidades (este documento)

**Posee:** propósito del Motor; contrato conceptual de entrada/salida; modelos mentales; política de cobertura; producto IES oficial/alternativo; política de preguntas abiertas; principios de fallo de conocimiento; criterios de aceptación del Motor.  
**No posee:** definiciones constitucionales; contratos de ensamblaje del Evidence Builder; esquema de producto IES detallado (documento IES futuro); Reasoning Engine; Interfaces; implementación.

---

# 2. Contrato de Entrada

## Entrada obligatoria

| Campo | Descripción |
|-------|-------------|
| `question` | Pregunta original (o expandida por historial efímero de la solicitud, sin memoria persistente). |
| `plan` | Plan del Planner (versión, intent, dominios, confianza de plan, clarificación). |
| `tool_plan` | Tool Plan (tools, executable_tools, unavailable_tools, missing_inputs, can_execute, can_execute_all). |
| `planta_id` / alcance de planta | Planta autorizada (sin planta no hay conocimiento de negocio). |
| `identity` | Identidad autenticada (usuario/rol/credencial de sesión). |

## Entrada opcional

| Campo | Descripción |
|-------|-------------|
| `tool_results` | Mapa tool_id → payload crudo o error tipificado (cuando exista ejecución). |
| `period` | Año/mes o ventana temporal autorizada por el dominio. |
| `permissions` | Permisos efectivos de la identidad. |
| `entity` | Entidad comercial resuelta (alias → canónico). |
| `folio_id` | Solo si el dominio de folios se integra en el futuro. |
| `confidence_params` | Pesos/umbrales de calibración (sin fórmulas finales aquí; mecánica en Evidence Builder). |
| `reevaluation` | Solicitud de IES alternativo (usuario, motivo, parámetros). |

## Clasificación de entradas especiales

| Situación | Tratamiento en el Motor |
|-----------|-------------------------|
| **Entrada inválida** | Plan o tool plan mal formado; planta ausente; intent vacío → no se generan hechos; cobertura `NO_CONOZCO` o fallo de contrato. |
| **Fuente no integrada** | Tool con `declared_not_integrated` (Fase 3) / dominio `coverage: none` (Fase 1) → observación de *no disponibilidad*, no de valor de negocio. |
| **Herramienta fallida** | Error, tiempo de espera agotado, acceso denegado → observación `TOOL_ERROR` (u homólogo tipificado); no se inventa el dato. |
| **Resultado vacío** | Tool OK pero sin filas → observación `DATA_NOT_FOUND` / `empty`; distinto de “cero” y distinto de afirmación de ausencia (ver Evidence Builder: solo `ABSENCE_CONFIRMED`). |
| **Clarificación pendiente** | `requires_clarification=true` → el Motor no fuerza diagnóstico fuerte; genera preguntas abiertas. |
| **Ejecución parcial** | `can_execute=true` y `can_execute_all=false` → se procesan solo tools listas; el resto queda como cobertura parcial o no conocimiento. |

---

# 3. Nivel 1 — Observaciones (gobernanza)

**Definición constitucional (referencia):** datos crudos de las herramientas (Constitución III).  
**Propietario del contrato de ensamblaje:** `docs/director-ia/02-EVIDENCE-BUILDER.md`.

Una **Observación**, para este Motor, es el registro atómico de lo que una herramienta devolvió o de que no pudo devolver, **sin interpretación**.

## Política del Motor (no esquema)

1. **No interpretar** — no etiquetar “malo/bueno”.
2. **No combinar semánticamente**.
3. **No inferir** — no completar huecos.
4. **No corregir silenciosamente**.
5. **Conservar origen y trazabilidad** a plan + tool_plan + pregunta.
6. Tipificar calidad y ausencia según el Evidence Builder; no convertir tipificaciones en valor de negocio.

El Motor **no** redefine el contrato ampliado de Observación (`source.author_id`, `lineage`, `absence_state`, etc.): lo exige vía Evidence Builder.

---

# 4. Nivel 2 — Hechos (gobernanza)

**Definición constitucional (referencia):** observaciones contextualizadas y verificables con confianza calculada (Constitución II–III).  
**Propietario de mecánica de ensamblaje y tipificación de ausencia:** Evidence Builder.

Un **Hecho** es una declaración verificable derivada de observaciones mediante reglas determinísticas, **sin narrativa**.

## Confianza (referencia constitucional; mecánica en Evidence Builder)

```
Confianza del Hecho = f(Fs × R × Cb × Cs × Cb_ov)
```

El Motor exige exposición dimensional (no score opaco). Pesos, saturación `k` y calibración: **pendientes**; propietarios de detalle operativo en Evidence Builder. Máximo lingüístico permitido en ensamblaje: **confianza alta** (nunca “confianza absoluta”).

## Distinciones obligatorias (alineadas al Evidence Builder)

| Tipo | Significado |
|------|-------------|
| Hecho positivo | Afirma un estado o valor observado |
| Hecho negativo | Afirma que un evento esperado no ocurrió *solo cuando la tipificación lo autoriza* |
| Afirmación de ausencia | **Solo** si el estado de ausencia es `ABSENCE_CONFIRMED` |
| `DATA_NOT_FOUND` | Búsqueda OK sin coincidencias; **no** es por sí sola afirmación de ausencia ni cero |
| Ausencia no comprobable | Fuente no integrada, restringida o en `TOOL_ERROR` |
| Resultado calculado | Derivado por regla; debe marcarse como calculado |
| Dato histórico / vigente | Según periodo cerrado o abierto |

**Prohibiciones:** tratar ausencia no comprobable como hecho negativo o cero; usar “registro no encontrado” como hecho negativo; colapsar `DATA_NOT_FOUND` con `SOURCE_NOT_INTEGRATED`.

---

# 5. Nivel 3 — Evidencias (gobernanza)

**Definición constitucional (referencia):** relaciones determinísticas entre dos o más hechos mediante reglas identificables.  
**Propietario del lenguaje y contrato de evidencia:** Evidence Builder.

## Tipos mínimos (política del Motor)

| Tipo | Uso |
|------|-----|
| correlación | Co-ocurrencia bajo regla (sin causalidad) |
| desviación | Diferencia respecto a referencia/compromiso |
| tendencia | Dirección entre periodos cuando hay hechos comparables |
| ausencia de mitigación | Problema sin acción abierta asociada (si la regla lo define) |
| incumplimiento | Vencimiento / compromiso incumplido según reglas del dominio |
| recuperación / deterioro | Mejora o empeoramiento bajo regla |
| contradicción | Hechos incompatibles |
| riesgo emergente / oportunidad | Patrones definidos por regla |

## Prohibiciones

- Causalidad no demostrada por regla causal formalmente aprobada.
- Lenguaje probabilístico en Niveles 1–4.
- Inferencia del Reasoning Engine dentro del Motor.
- Relación sin regla identificable.

---

# 6. Nivel 4 — Diagnóstico Ejecutivo (gobernanza)

**Definición constitucional (referencia):** clasificación determinística dentro de modelos mentales ejecutivos.  
**Propietario del contrato de diagnóstico:** Evidence Builder.  
**Propietario de modelos mentales:** este Motor (§7).

## Taxonomía mínima

| Categoría |
|-----------|
| riesgo comercial |
| riesgo financiero |
| riesgo operativo |
| falla de ejecución |
| falla de gobernanza |
| riesgo de cumplimiento |
| oportunidad comercial |
| recuperación en curso |
| situación estable |
| información insuficiente |
| conflicto no resuelto |

## Prohibiciones del Nivel 4

- No explicar “causas probables” ni formular hipótesis (Reasoning Engine).
- No emitir recomendaciones desde el Motor (correspondientes al Reasoning Engine bajo Constitución V, subordinado al IES).
- No diagnosticar dominios no observados como cubiertos.
- Todo diagnóstico exige **regla de clasificación y soporte** trazable.

---

# 7. Modelos Mentales Ejecutivos

Los modelos son **vistas de proyección** sobre el mismo grafo de hechos/evidencias; un hecho se referencia, no se duplica.

## Comercial

Clientes, pérdida (dejaron), crecimiento (aumentaron/nuevos), recuperación, competencia (solo si hay dato), demanda, comentarios de cliente, DICF/acciones comerciales.

**Fuentes típicas (integradas):** `commercial_state`, `dicf`, `cliente_comentarios`, `entidades_comerciales`, `bitacora` (contexto de visita).

## Financiero

ARR, IGF, margen, forecast, venta, descuento, ingreso, desviaciones.

**Fuentes típicas (integradas / on-demand):** `arr`, `igf`.  
**No integradas aún como tools UI delta:** `delta_venta`, `delta_descuento`, `delta_ingreso` (declaradas no integradas en Fase 3).

## Operativo

Acciones, responsables, vencimientos, bitácora, seguimiento, mejora continua; proyectos/folios **cuando se integren**.

**Fuentes típicas:** `action_register`, `mejora_continua`, `bitacora`, `folio_comentarios` (solo comentarios).  
**No integradas:** kanban/estatus folio, historial, documentos, presupuestos, proyectos módulo, taller AT Excel, gastos/inversiones Excel.

## Ejecutivo

Riesgos, oportunidades, prioridades, gobernanza, conflictos, cobertura del conocimiento, preguntas abiertas.

Se alimenta de los otros tres modelos **por referencia** a hechos/evidencias/diagnósticos, no por nueva consulta.

## No duplicación

Un hecho `accion_vencida` puede proyectarse al modelo Operativo (ejecución) y al Ejecutivo (riesgo/prioridad) con el mismo `fact_id`.

---

# 8. Conflictos

## Taxonomía constitucional (Tipos A–E) — referencia; no redefinición

Primero se clasifica el **tipo**; después severidad e impacto. Un conflicto permanece **abierto** hasta evidencia suficiente. No promediar ni conciliar arbitrariamente. **No se declara resuelto por simple ponderación.**

| Tipo | Nombre | Descripción (aplicación del Motor) |
|------|--------|-------------------------------------|
| **A** | Conflicto de datos | Dos hechos incompatibles sobre la misma entidad/métrica/periodo |
| **B** | Conflicto temporal | Mismo concepto, periodos distintos presentados como vigentes |
| **C** | Conflicto de interpretación | Misma observación, reglas distintas (no se elige una en silencio) |
| **D** | Conflicto de cobertura | Un modelo afirma cobertura completa y otro dominio crítico está `NO_CONOZCO` |
| **E** | Conflicto de gobernanza | Responsable/permiso/estado inconsistente; actividad reportada vs verificada; ausencia de acción, responsable o evidencia ante desviación |

## Separación de propiedad

| Aspecto | Documento propietario |
|---------|------------------------|
| Tipos A–E y exigencias Tipo E | Constitución |
| Política: no ocultar / no promediar / cobertura `EXISTE_CONFLICTO` | Este Motor |
| Esquema compuesto (`primary_type`, `secondary_types`, `weight_assessment`, `resolution_status`, `interpretation_constraint`, `governance_escalation`) | Evidence Builder |

**El Motor no oculta, no promedia y no concilia arbitrariamente.** Si hay conflicto material, la cobertura tiende a `EXISTE_CONFLICTO` y el diagnóstico a `conflicto no resuelto` o `información insuficiente` según reglas.

## Conflicto Tipo E — exigencias constitucionales (el Motor no las anula)

Cuando exista Tipo E, el IES debe conservar los elementos necesarios para que el Reasoning Engine cumpla Constitución V, sin suavizar. El Motor **no** puede marcar un Tipo E como resuelto sin evidencia suficiente, ni omitirlo del IES.

---

# 9. Cobertura del Conocimiento

## Estados oficiales

| Estado | Significado |
|--------|-------------|
| `CONOZCO` | Dominios pedidos del plan están cubiertos por observaciones útiles y sin conflicto bloqueante |
| `CONOZCO_PARCIALMENTE` | Hay conocimiento útil, pero faltan dominios, inputs o tools (`can_execute_all=false`) |
| `EXISTE_CONFLICTO` | Hay hechos/evidencias en conflicto abierto material (Tipos A–E) |
| `NO_CONOZCO` | Ver cláusula constitucional abajo |

### Cláusula oficial de NO_CONOZCO (Constitución IV)

“No Conozco: fuente inexistente, no integrada o inaccesible. Confianza 0.00. El sistema detiene el razonamiento sustantivo y emite una declaración controlada de desconocimiento, identificando la fuente faltante y el alcance exacto de la limitación.”

Aplicación en el Motor: cuando el dominio o tool requerido es inexistente, no integrado o inaccesible, la cobertura de ese alcance es `NO_CONOZCO` con confianza 0.00; no se continúa el razonamiento sustantivo sobre ese alcance.

Otras situaciones se tipifican **sin** colapsarlas en `NO_CONOZCO` constitucional. La tipificación operativa de ausencia es propiedad del Evidence Builder:

| Situación | Tipificación | Cobertura típica |
|-----------|--------------|------------------|
| Resultado vacío (`DATA_NOT_FOUND` / `empty`) | No es afirmación de ausencia ni cero; solo `ABSENCE_CONFIRMED` afirma ausencia | Puede coexistir con `CONOZCO` o `CONOZCO_PARCIALMENTE` sobre otros dominios |
| Herramienta fallida (`TOOL_ERROR`, incl. tiempo de espera agotado) | Fallo tipificado | Degrada cobertura; no equivale a “dato inexistente” |
| Fuente restringida (`SOURCE_RESTRICTED`) | Inaccesible → puede activar cláusula `NO_CONOZCO` en ese alcance | Confianza 0.00 en ese alcance |
| Clarificación bloqueante / entrada inválida | Fallo de contrato o preguntas abiertas | Sin diagnóstico fuerte de `CONOZCO` |

## Criterios conceptuales de transición

```
Fuente inexistente / no integrada / inaccesible (alcance requerido)
  → NO_CONOZCO (cláusula constitucional; confianza 0.00; detiene razonamiento sustantivo en ese alcance)

Al menos un dominio con hechos útiles + otros faltantes
  → CONOZCO_PARCIALMENTE

Hechos útiles + conflicto abierto material (A–E)
  → EXISTE_CONFLICTO

Todos los dominios pedidos cubiertos + sin conflicto bloqueante
  → CONOZCO
```

## Distinciones (no colapsar)

| Situación | No es |
|-----------|--------|
| Fuente no integrada (`SOURCE_NOT_INTEGRATED`) | No es “dato no encontrado” (`DATA_NOT_FOUND`) |
| Fuente restringida | No es “no existe el fenómeno” |
| Herramienta fallida | No es vacío de negocio |
| Dato no encontrado (empty ok) | No es cero |
| Periodo incompleto | No es tendencia fiable |
| Entidad ambigua | No es cliente resuelto |
| Información contradictoria | No es promedio |

Alineación conceptual de tipificación (catálogo de capacidades / Evidence Builder): `SOURCE_NOT_INTEGRATED`, `SOURCE_RESTRICTED`, `TOOL_ERROR`, `DATA_NOT_FOUND`, `ABSENCE_CONFIRMED`, `QUERY_SCOPE_INCOMPLETE`, `ENTITY_UNRESOLVED`, y estados de disponibilidad parcial/disponible según catálogo.

---

# 10. Preguntas Abiertas

Nacen cuando el Motor detecta huecos que impiden cerrar el IES con honestidad. Deben ser **neutrales** (sin imputar causa ni culpa).

**Prohibición constitucional:** una pregunta abierta **no** es una hipótesis. El Motor no la convierte en interpretación causal ni probabilística. Solo el Reasoning Engine (Nivel 5) puede formular hipótesis, y únicamente sobre evidencias ya presentes en el IES, declarando su soporte.

## Orígenes

- Evidencia faltante para una regla de evidencia/diagnóstico.
- Conflicto sin resolver.
- Ausencia de explicación operativa (p. ej. caída financiera sin bitácora/DICF) — como hueco de cobertura, no como causa inferida.
- Falta de responsable en acción crítica.
- Falta de periodo / planta / folio_id.
- Fuente no integrada requerida por la pregunta.

## Objeto conceptual

| Campo | Significado |
|-------|-------------|
| `open_question_id` | Identificador |
| `question` | Pregunta concreta |
| `reason` | Motivo |
| `required_data` | Dato que faltaría |
| `expected_source` | Dominio/tool esperado (si existe en catálogo) |
| `impact` | Qué parte del IES queda débil |
| `priority` | Ordinal |
| `status` | abierta / respondida / descartada |

---

# 11. IES Oficial y IES Alternativo

El IES (Constitución IX) es:

- producto oficial del Motor de Conocimiento Ejecutivo;
- representación verificable y reutilizable de la situación;
- **independiente del canal** (consumible por chat, voz, WhatsApp, dashboard, reportes y presentaciones);
- **inmutable para el Reasoning Engine**;
- versionado;
- auditable;
- diferenciable entre oficial y alternativo.

El IES **no** contiene hipótesis. Las hipótesis, si proceden, pertenecen al Reasoning Engine (Nivel 5) y deben declarar sobre qué evidencias del IES se construyen.

## IES oficial

Producto canónico del ciclo de consulta bajo parámetros por defecto (planta, periodo ancla, pesos de calibración vigentes, tools ejecutadas según tool plan).

Contiene, como mínimo:

- pregunta y plan/tool plan de referencia;
- cobertura del conocimiento;
- hechos y evidencias materiales;
- diagnósticos;
- conflictos (incluidos Tipo E sin suavizar);
- preguntas abiertas (no hipótesis);
- límites (“qué no se consultó”);
- trazabilidad.

## IES alternativo (reevaluación / impugnación — Constitución VI)

Una reevaluación **no sustituye** el IES oficial; produce un IES alternativo.

Se genera solo si el usuario solicita reevaluación con parámetros distintos (p. ej. otro periodo, exclusión de un dominio, umbral distinto).

Debe registrar:

| Campo | Obligatorio |
|-------|-------------|
| Usuario solicitante | Sí |
| Parámetro modificado | Sí |
| Valor anterior | Sí |
| Valor nuevo | Sí |
| Fecha | Sí |
| Motivo | Sí |
| Impacto sobre hechos, evidencias y diagnóstico | Sí |
| Vínculo con el IES oficial | Sí (id del oficial) |

**Nunca reemplaza silenciosamente el oficial.** Ambos coexisten; el oficial permanece la referencia auditable por defecto.

**El histórico real de las fuentes nunca se modifica por una reevaluación.**

---

# 12. Reglas de Fallo

| Situación | Comportamiento del Motor |
|-----------|---------------------------|
| Herramienta no integrada | Observación tipificada `SOURCE_NOT_INTEGRATED`; ausencia no comprobable; pregunta abierta si el intent la exigía; sin inventar valor |
| Herramienta restringida | `SOURCE_RESTRICTED`; no elevar a “no existe” |
| Tiempo de espera agotado / error de herramienta | Observación `TOOL_ERROR`; cobertura degradada; no reintentar infinitamente dentro del Motor |
| Resultado vacío | Observación `DATA_NOT_FOUND` / `empty`; **no** afirmación de ausencia salvo elevación a `ABSENCE_CONFIRMED` por regla de la tool |
| Datos inválidos | Rechazo de la observación o calidad degradada; no “limpiar” en silencio |
| Periodo ausente | `QUERY_SCOPE_INCOMPLETE` / pregunta abierta; no asumir periodo |
| Planta ausente | Fallo de contrato; `NO_CONOZCO` |
| Entidad ambigua | `ENTITY_UNRESOLVED`; no afirmar hechos sobre entidad canónica |
| Conflicto irresoluble | Estado `EXISTE_CONFLICTO`; diagnóstico `conflicto no resuelto` |
| Ausencia total de evidencia | `NO_CONOZCO` o `información insuficiente`; IES declara límites |

---

# 13. Casos de Uso

> Los valores numéricos o nombres concretos marcados como **ILUSTRATIVO** no son datos reales de producción.

## 1. ¿Por qué cayó Puebla?

| Capa | Contenido ilustrativo |
|------|------------------------|
| Plan | `financial_diagnosis` + posible `plant_diagnosis` si el wording es amplio; dominios arr, igf, delta_* (deltas no integrados) |
| Herramientas | `get_arr_snapshot`, `get_igf_snapshot` (on-demand); deltas en `unavailable_tools` |
| Observaciones | Snapshots ARR/IGF **ILUSTRATIVO**; observaciones `not_integrated` para deltas UI |
| Hechos | Desviación de ingreso/margen **ILUSTRATIVO** (calculada si la regla existe); ausencia no comprobable de descomposición delta UI |
| Evidencias | `desviacion` financiera; posible `ausencia_de_mitigacion` si AR/DICF se cargaran en un plan más amplio |
| Diagnóstico | `riesgo financiero` y/o `información insuficiente` si falta descomposición |
| Conflictos | Si ARR e IGF discrepan en el mismo periodo → conflicto de datos |
| Cobertura | `CONOZCO_PARCIALMENTE` (deltas no integrados) |
| Preguntas abiertas | ¿La caída es por venta o descuento? (fuente delta no integrada) |
| IES esperado | Declara desviación observada + límites + no afirma causa raíz |

## 2. ¿Qué clientes preocupan?

| Capa | Contenido ilustrativo |
|------|------------------------|
| Plan | `commercial_state` / `client_analysis` |
| Herramientas | `get_commercial_state`, `get_dicf_context`, `resolve_entidades_comerciales` |
| Observaciones | Listas dejaron/disminuyeron **ILUSTRATIVO**; acciones DICF abiertas |
| Hechos | Cliente C en “dejaron”; N acciones abiertas |
| Evidencias | `riesgo_emergente` comercial; `incumplimiento` si hay DICF vencido |
| Diagnóstico | `riesgo comercial` |
| Conflictos | Alias vs canónico si entidad ambigua |
| Cobertura | `CONOZCO` o `CONOZCO_PARCIALMENTE` (límite de filas) |
| Preguntas abiertas | ¿Hay bitácora reciente del cliente C? |
| IES esperado | Ranking controlado de clientes + límites de top-N |

## 3. ¿Qué está haciendo Juan?

| Capa | Contenido ilustrativo |
|------|------------------------|
| Plan | `responsible_lookup` / `action_status` |
| Herramientas | `get_action_register_context` |
| Observaciones | Acciones con responsable Juan **ILUSTRATIVO** |
| Hechos | Juan tiene K abiertas, M vencidas |
| Evidencias | `incumplimiento` si vencidas > 0 |
| Diagnóstico | `falla de ejecución` o `situación estable` |
| Conflictos | Homónimos de responsable |
| Cobertura | Parcial (top responsables del summarizer) |
| Preguntas abiertas | ¿Es el mismo Juan en otra planta? |
| IES esperado | Lista de acciones atribuidas + advertencia de límite top-N |

## 4. ¿Qué riesgos tiene Tehuacán?

| Capa | Contenido ilustrativo |
|------|------------------------|
| Plan | `plant_diagnosis` |
| Herramientas | AR, DICF, bitácora, ARR, IGF, commercial_state |
| Observaciones | Mix operativo + financiero + comercial **ILUSTRATIVO** |
| Hechos | Vencidas; clientes dejaron; desviación margen |
| Evidencias | Varios tipos (incumplimiento, deterioro, riesgo emergente) |
| Diagnóstico | Múltiples categorías priorizadas por regla |
| Conflictos | Posible tensión bitácora “todo bien” vs lista dejaron |
| Cobertura | `CONOZCO` o parcial si falta question/periodo en on-demand |
| Preguntas abiertas | Priorizar riesgo #1 |
| IES esperado | Tablero de riesgos con cobertura explícita |

## 5. ¿Qué acciones impactan ARR?

| Capa | Contenido ilustrativo |
|------|------------------------|
| Plan | Cruce conceptual AR + ARR (hoy puede resolverse como plant/financial + action_status según wording) |
| Herramientas | `get_action_register_context`, `get_arr_snapshot` si el plan las incluye |
| Observaciones | Acciones de tema comercial/taller; snapshot ARR |
| Hechos | Acciones abiertas en temas ligados a venta; estado ARR |
| Evidencias | Solo `correlacion` si no hay regla causal formal acción→ARR |
| Diagnóstico | `información insuficiente` para causalidad; `riesgo operativo/comercial` si hay vencidas |
| Conflictos | Ninguno o cobertura |
| Cobertura | Parcial: **no hay prueba causal automática acción→ARR** en fuentes actuales |
| Preguntas abiertas | ¿Qué regla de negocio vincula tema X con ARR? |
| IES esperado | Separa correlación de impacto demostrado |

## 6. ¿En qué etapa está el folio 421?

| Capa | Contenido ilustrativo |
|------|------------------------|
| Plan | `folio_status` → dominios folios/kanban |
| Herramientas | `get_folio_status` `declared_not_integrated`; falta `folio_id` si no se entrega |
| Observaciones | `quality=not_integrated` |
| Hechos | Ausencia no comprobable de etapa |
| Evidencias | Ninguna de estatus |
| Diagnóstico | `información insuficiente` / cobertura `NO_CONOZCO` para ese dominio |
| Conflictos | No |
| Cobertura | `NO_CONOZCO` (dominio) |
| Preguntas abiertas | Integrar kanban/folios o consultar dashboard |
| IES esperado | Honesto: fuente no integrada (alineado Fase 1); **no** inventar etapa |

## 7. ¿Cómo va Taller?

| Capa | Contenido ilustrativo |
|------|------------------------|
| Plan | `action_status` (tema AR), **no** `taller_at` Excel |
| Herramientas | `get_action_register_context` (+ MC si aplica) |
| Observaciones | Acciones del tema Taller **ILUSTRATIVO** |
| Hechos | Abiertas/vencidas del tema |
| Evidencias | `incumplimiento` si vencidas |
| Diagnóstico | `riesgo operativo` o `situación estable` |
| Conflictos | Si alguien espera Excel Taller AT → pregunta abierta de ambigüedad de dominio |
| Cobertura | `CONOZCO` para AR; `NO_CONOZCO` para Taller por AT |
| Preguntas abiertas | ¿Preguntaba Action Register o Excel Taller por AT? |
| IES esperado | Responde AR; declara que Taller AT no está integrado |

## 8. ¿Qué cambió desde la semana pasada?

| Capa | Contenido ilustrativo |
|------|------------------------|
| Plan | Depende del wording; puede caer en financial/commercial/unknown |
| Herramientas | Según dominios; **no hay herramienta de “diff semanal universal”** en el registry actual |
| Observaciones | Solo si tools aportan dos anclas temporales comparables |
| Hechos | Comparación solo con periodos explícitos en resultados |
| Evidencias | `tendencia` solo con regla y dos hechos |
| Diagnóstico | Frecuentemente `información insuficiente` |
| Conflictos | Temporal si se mezcla mes vs semana |
| Cobertura | Parcial / NO_CONOZCO |
| Preguntas abiertas | ¿Qué dominio y qué fechas exactas? |
| IES esperado | No inventa “la semana pasada” sin datos |

## 9. ¿Qué información no puede consultar Director IA?

| Capa | Contenido ilustrativo |
|------|------------------------|
| Plan | Meta-pregunta; puede ser `help`/`unknown` + catálogo |
| Herramientas | No requiere tool de negocio; usa catálogo Fase 1/3 |
| Observaciones | Lista declarativa de dominios `none` / tools `declared_not_integrated` |
| Hechos | “El dominio X no está integrado” |
| Evidencias | No aplica relación entre hechos de negocio |
| Diagnóstico | No es diagnóstico de planta; es estado de producto |
| Conflictos | No |
| Cobertura | `CONOZCO` sobre el catálogo |
| Preguntas abiertas | Ninguna crítica |
| IES esperado | Enumera no integrados: kanban, historial, documentos, cheques/pólizas, presupuestos, proyectos, gastos/inversiones Excel, deltas UI, duplicados, usuarios admin, etc. |

## 10. ¿De dónde sacas esa conclusión?

| Capa | Contenido ilustrativo |
|------|------------------------|
| Plan | Cualquiera previo |
| Herramientas | Las del ciclo original |
| Observaciones→Hechos→Evidencias→Diagnóstico | Cadena de `traceability` |
| IES esperado | El IES del Motor ya contiene la cadena tool → observación → hecho → evidencia (regla R) → diagnóstico. En Nivel 5, el Reasoning Engine se subordina a ese IES, no lo altera; si falta eslabón, declara desconocimiento controlado; las hipótesis, si proceden, declaran su soporte en evidencias del IES |

---

# 14. Invariantes del Motor

1. Ninguna evidencia sin hechos.  
2. Ningún hecho sin observaciones verificables.  
3. Ningún diagnóstico sin **regla y soporte** (hechos y/o evidencias trazables).  
4. Ninguna hipótesis dentro de los Niveles 1–4 ni dentro del IES; el Motor no genera hipótesis.  
5. Ninguna fuente sin trazabilidad (tool/dominio/plan).  
6. Ninguna ausencia interpretada como cero.  
7. Ningún conflicto oculto; ningún Tipo E suavizado.  
8. Ningún IES alternativo sin auditoría completa (usuario, parámetro, valor anterior, valor nuevo, fecha, motivo, impacto, vínculo al oficial).  
9. El Reasoning Engine solo interviene en el Nivel 5 (Hipótesis), subordinado al IES.  
10. No se afirman datos de tools no integradas como valores de negocio.  
11. Las preguntas abiertas no se convierten en hipótesis.  
12. El histórico real de las fuentes no se modifica por reevaluación.  
13. Este documento no implementa ni redefine la Constitución; el Evidence Builder no decide política.

---

# 15. Límites de la Primera Versión

La primera versión del Motor **no** hará:

- Ejecución transaccional (mutaciones de folio, presupuesto, permisos, ARR load, etc.).
- Memoria conversacional persistente (solo `history` efímero del request, si existe).
- Voz.
- Integración completa de folios/kanban/historial/documentos/cheques/pólizas.
- Análisis documental (PDF/medios).
- Causalidad automática acción→ARR o ingreso.
- Aprendizaje autónomo de reglas o pesos.
- Modificación automática de pesos de confianza.
- Sustitución del routing actual del chat hasta que se decida gobernarlo explícitamente.
- Uso de endpoints Delta UI o Excel Taller/GASTOS/INVERSIONES como si estuvieran integrados.

---

# 16. Criterios de Aceptación Arquitectónica

El futuro Motor se considerará **aprobable arquitectónicamente** solo si cumple:

1. **Cadena completa auditables:** toda afirmación del IES oficial se reduce a observación → hecho → (evidencia) → diagnóstico o a un estado explícito de no conocimiento.  
2. **Reasoning Engine solo en Nivel 5:** Niveles 1–4 y el IES no invocan el Reasoning Engine.  
3. **Respeto al catálogo de capacidades:** ningún dominio no integrado produce hechos de valor de negocio.  
4. **Ausencia tipificada:** `DATA_NOT_FOUND` ≠ `SOURCE_NOT_INTEGRATED` ≠ `TOOL_ERROR` ≠ cero; solo `ABSENCE_CONFIRMED` afirma ausencia.  
5. **Conflictos visibles:** un conflicto material obliga estado `EXISTE_CONFLICTO` o diagnóstico `conflicto no resuelto`; no resolución por ponderación sola.  
6. **Ejecución parcial coherente:** con `can_execute=true` y `can_execute_all=false`, el IES marca `CONOZCO_PARCIALMENTE` y lista faltantes.  
7. **Clarificación:** si el plan exige clarificación bloqueante, no se emite diagnóstico fuerte de cobertura `CONOZCO`.  
8. **IES alternativo auditable:** toda reevaluación deja traza y no pisa el oficial.  
9. **Sin escritura:** el Motor no ejecuta operaciones transaccionales.  
10. **Casos de folio/taller:** “etapa de folio” → no inventa; “cómo va Taller” → Action Register, no Excel AT, con límite declarado.  
11. **Pregunta de trazabilidad:** “¿de dónde sacas esa conclusión?” puede reconstruirse solo con metadatos del IES.  
12. **Calibración explícita:** dimensiones de confianza documentadas; no score opaco; `k`/`wi` pendientes en Evidence Builder.  
13. **Sin implementación en este documento:** la implementación posterior debe mapear a esta gobernanza y al Evidence Builder sin alterar semántica.  
14. **Constitución:** conformidad con `DIRECTOR_IA_CONSTITUTION.md` sin rebajar invariantes ni redefinir conceptos.  
15. **IES inmutable para el Reasoning Engine** e independiente del canal.  
16. **Unicidad de propiedad:** contratos de ensamblaje en Evidence Builder; este Motor no los redefine.  
17. **Prohibición de implementación** mientras existan no conformidades críticas abiertas (ver §17).

---

## Apéndice — Pipeline oficial y entradas previas

```
Constitution
  → Executive Knowledge Engine (este documento)
      ← entradas: Planner, Tool Plan, Capabilities/Veracidad, resultados de tools (futuro)
  → Evidence Builder (N1–N4; sin decisiones de política propias)
  → IES (producto del Motor)
  → Reasoning Engine (Nivel 5 / Hipótesis)
  → Interfaces (consumo multiinterfaz)
```

Las Fases 1–3 son **productores de entrada** al Motor; no son el Motor ni el Evidence Builder.

---

# 17. Declaración de Conformidad Constitucional

| Campo | Valor |
|-------|--------|
| Constitución usada | `docs/director-ia/DIRECTOR_IA_CONSTITUTION.md` |
| Versión | 1.0 |
| Fecha de revisión | 2026-08-04 |
| Documento auditado | `docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md` |
| Resultado | **Conforme tras auditoría empresarial** (jerarquía Constitución→Motor→Evidence Builder→IES→Reasoning Engine→Interfaces; ausencia tipificada; sin redefinición constitucional; sin implementación; propiedad de contratos en Evidence Builder). |
| Excepciones pendientes | (1) Calibración numérica Fs/R/Cb/Cs/Cb_ov — diferida. (2) Documento de producto IES detallado — pendiente de creación. (3) Documento del Reasoning Engine — pendiente. (4) Ejecución real de tools e integración de dominios no integrados — fuera de este diseño. |
| Prohibición de implementación | Queda **prohibido implementar** el Motor si reaparecen no conformidades críticas (Reasoning Engine antes del Nivel 5; Motor/Evidence Builder generando hipótesis; IES mutable; suavización de Tipo E; ausencia como cero; colapso `SOURCE_NOT_INTEGRATED`/`DATA_NOT_FOUND`; IES alternativo sin auditoría; Evidence Builder tomando decisiones de política). |

---

*Fin del documento. Auditoría de arquitectura aplicada. No se modificó código.*
