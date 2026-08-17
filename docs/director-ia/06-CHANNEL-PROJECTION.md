# 06 — Channel Projection

## Contrato de proyección semántica pura — sin autoridad epistemológica

**Documento:** `docs/director-ia/06-CHANNEL-PROJECTION.md`
**Versión:** 1.0
**Estado:** CHANNEL PROJECTION v1.0 — realización física D1–D20 registrada (`ARCH-CHANNEL-PROJECTION-PHYSICAL-DECISIONS-002`); contrato semántico D1–D3 intacto; runtime pendiente
**Tipo:** Contrato arquitectónico de Interfaces / Channel Projection (sin implementación; sin autoridad epistemológica)

### Dependencia normativa

| Documento | Rol |
|-----------|-----|
| `docs/director-ia/DIRECTOR_IA_CONSTITUTION.md` | Norma superior; Cap. III (N1–N5); VI.4 consistencia multiinterfaz; VII nueva interfaz = mismo IES; IX IES independiente del canal; X capa Interfaces |
| `docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md` | Política: Channel Projection solo consume; no suaviza ni omite `NO_CONOZCO` / `COV_NO_KNOWLEDGE`; no reinterpreta materiality |
| `docs/director-ia/02-EVIDENCE-BUILDER.md` | Tipo E visible en toda proyección de canal; 06 no ensambla N1–N4 |
| `docs/director-ia/03-EXECUTIVE-KNOWLEDGE-STORE.md` | EKS = persistencia N1–N4; 06 no consulta el Knowledge Store para reconstruir N1 |
| `docs/director-ia/03A-OBSERVATION-PIPELINE.md` | AcquisitionStatus técnico; 06 no consume Observation Pipeline directo |
| `docs/director-ia/03B-END-TO-END-REFERENCE-FLOWS.md` | Flujos de referencia; 06 no los reescribe |
| `docs/director-ia/04-IES-STANDARD.md` | **IES v1.0 APROBADO PARA CONGELAMIENTO** — entrada de conocimiento; §17 invariantes de consumo de canal |
| `docs/director-ia/05-REASONING-ENGINE.md` | **RE v1.0 APROBADO PARA CONGELAMIENTO** — entrada semántica opcional (Reasoning Result / Run); D6 y §20: RE = semántica; 06 = presentación |
| `docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md` | Índice de propiedad (este documento no lo modifica) |

En conflicto, prevalece la Constitución.
Este documento **no modifica** el esquema IES v1.0 ni el contrato RE v1.0.
**No** redefine N1–N5. **No** convierte `projection_depth` L0–L3 en N1–N5. **No** calibra `k`/`wi`. **No** fija ruleset de materiality. **No** implementa firma IES. **No** implementa runtime. **No** crea Nivel 6.

### Decisiones D1–D3 (reflejo)

| ID | Decisión adoptada |
|----|-------------------|
| D1 | 06 transforma la forma de exposición, no la verdad. Clasificación: `IRRENUNCIABLE` / `OBLIGATORIO_RESUMIBLE` / `DIFERIBLE_BAJO_DEMANDA` / `ESPECIFICO_DE_CANAL`. |
| D2 | Los canales son políticas de proyección sobre un modelo semántico común (Projection Model). No son pipelines independientes. Seis superficies: Chat, Voz, WhatsApp, Dashboard, Reporte, Presentación. |
| D3 | `projection_depth` L0–L3 es dimensión de presentación. Nunca redefine N1–N5. |

Las decisiones semánticas D1–D3 de esta tabla **no se sustituyen**.
La realización física D1–D20 de `ARCH-CHANNEL-PROJECTION-PHYSICAL-DECISIONS-002` se registra en §18; no redefinen N1–N5, no modifican el esquema IES v1.0 ni el contrato RE v1.0, y no crean autoridad epistemológica.

---

# Índice

1. [Identidad de Channel Projection](#1-identidad-de-channel-projection)
2. [Frontera de entrada](#2-frontera-de-entrada)
3. [D1 — Contrato de transformación](#3-d1--contrato-de-transformación)
4. [Clasificación de contenido](#4-clasificación-de-contenido)
5. [D2 — Modelo de proyecciones por canal](#5-d2--modelo-de-proyecciones-por-canal)
6. [Seis superficies ejecutivas](#6-seis-superficies-ejecutivas)
7. [Projection Model](#7-projection-model)
8. [D3 — Projection Depth](#8-d3--projection-depth)
9. [L0–L3 no son N1–N5](#9-l0l3-no-son-n1n5)
10. [Consumo de invariantes IES §17](#10-consumo-de-invariantes-ies-17)
11. [RE vs Channel Projection](#11-re-vs-channel-projection)
12. [Doce invariantes](#12-doce-invariantes)
13. [Test de Pureza](#13-test-de-pureza)
14. [Prohibiciones](#14-prohibiciones)
15. [Criterios de aceptación](#15-criterios-de-aceptación)
16. [Riesgos pendientes](#16-riesgos-pendientes)
17. [Control documental](#17-control-documental)
18. [Realización física v1 (D1–D20)](#18-realización-física-v1-d1d20)

---

# 1. Identidad de Channel Projection

## Qué es

**Channel Projection (06)** es la capa **Interfaces** del pipeline constitucional (Constitución X).
Es un **proyector semántico puro**: describe y aplica cómo se expone un IES ya emitido y, cuando exista, un Reasoning Result ya producido, sobre políticas de canal, **sin crear, alterar ni resolver conocimiento**.

06 transforma la **forma de exposición**, no la verdad.

## Qué no es

| 06 no es | Porque |
|----------|--------|
| Fuente de verdad empresarial | La verdad vive en Snapshot → IES (Constitución IX; `04`) |
| Evidence Builder / Motor | No ensambla N1–N4 |
| Reasoning Engine / Nivel 5 | No formula hipótesis; no interpreta causalidad |
| Knowledge Store | No persiste Bundles/Snapshots; no reconstruye N1 desde EKS |
| Observation Pipeline | No consume AcquisitionStatus directo |
| Ejecutor de tools / SQL / APIs / loaders | Invariante de no-ejecución |
| Taxonomía epistemológica | `projection_depth` L0–L3 ≠ N1–N5 |
| “Nivel 6” | Constitución fija cinco niveles |

## Declaraciones explícitas

1. **06 no tiene autoridad epistemológica.**
2. **06 no modifica IES, Snapshot, Bundle ni Reasoning Result.**
3. **06 no crea N1–N4 ni N5.**
4. **06 no ejecuta tools**, no consulta bases operacionales, no llama loaders y no genera conocimiento nuevo.
5. **06 no consulta el Knowledge Store** para reconstruir N1.
6. **06 no crea, eleva, reduce ni reinterpreta** cobertura, `confidence`, `severity`, `materiality` ni `hypothesis_strength`.
7. **06 no suaviza ni omite** `NO_CONOZCO` / `COV_NO_KNOWLEDGE`.
8. **06 no resuelve conflictos** ni oculta Tipo E.
9. **Cambiar de canal no crea un nuevo `ies_id`** ni una nueva verdad.

## Entrada / salida

| Dirección | Contenido |
|-----------|-----------|
| **Entrada de conocimiento** | Un IES emitido (`04`) |
| **Entrada semántica opcional** | Reasoning Result y, cuando exista, `reasoning_run_id` (`05`) |
| **Entrada de proyección** | Canal destino + `projection_depth` (L0–L3) |
| **Artefacto intermedio** | Projection Model serializado `SERIALIZED_PROJECTION_MODEL_V1` (§7, §18 D2) |
| **Salida de canal** | `CHANNEL_OUTPUT_ENVELOPE_V1` (§18 D18) — representación de `content_blocks` sin semántica nueva |

### Realización física de interfaz (no es runtime)

Token: **CHANNEL_PROJECTION_FACTORY_V1** (§18 D1).
Interfaz futura mínima: `createChannelProjection({ policyRegistry, clock? })` y `project({ ies, reasoningResult?, reasoningRunId?, channel, projectionDepth })`.
El IES es la entrada epistemológica primaria. El Reasoning Result es opcional y de solo lectura. `policyRegistry` aplica `CHANNEL_POLICY_REGISTRY_V1` (§18 D10). El primer runtime es `DETERMINISTIC_PROJECTION_FIRST_V1` + `PROJECTION_MODEL_PLUS_NEUTRAL_RENDER_V1` (§18 D17, D20): Projection Model y representación neutral por canal, sin LLM de redacción. Esta subsección **no** implementa runtime.

## Relaciones

```
IES (determinista, inmutable para 06)
        ↓ solo lectura
Reasoning Engine (N5; opcional; Reasoning Result / Run)
        ↓ solo lectura
Channel Projection (06 — presentación)
        ↓
Superficie de canal (política de proyección; no pipeline independiente)
```

La ausencia legítima de N5 **nunca se rellena**. 06 puede proyectar un IES sin Reasoning Result.

---

# 2. Frontera de entrada

## Entrada de conocimiento

Un **IES** proyectado conforme a `04-IES-STANDARD.md` v1.0, en estado de emisión:

`VALIDATED` | `PARTIAL` | `CONFLICTED` | `NO_KNOWLEDGE`

06 **no** consume `BUILDING` ni `INVALID` como situación presentable.
Si el artefacto disponible no es un IES emitido presentable, 06 **declara la limitación** (fallo seguro); no improvisa contenido.

`EXPIRED` / `SUPERSEDED` no se presentan como situación vigente. Si un canal debe mostrar historial, 06 expone el estado de ciclo de vida **tal como está en el IES** y no lo reconvierte en emisión vigente.

## Entrada semántica opcional

| Artefacto | Uso |
|-----------|-----|
| Reasoning Result | Conclusión esencial N5, hipótesis, reservas, recomendaciones, abstenciones — **solo si existen legítimamente** (`05`) |
| Reasoning Run (`reasoning_run_id`) | Trazabilidad de inferencia; no es hecho; no es Snapshot; no es IES |

06 **no** usa `channel_hint` del RE como autorización para crear reglas de formato desde el Reasoning Engine (`05` §20). Las reglas de canal viven en este documento.

## Parámetros de proyección (no alteran el IES)

| Parámetro | Uso |
|-----------|-----|
| Canal destino | Una de las seis superficies (§6) |
| `projection_depth` | `L0_FLASH` \| `L1_EXECUTIVE` \| `L2_SUPPORT` \| `L3_AUDIT` (§8) |

## Prohibido en entrada

SQL; PostgreSQL directo; tools; loaders; raw payloads; APIs operacionales; ObservationRecords fuera del IES; Knowledge Bundle/Snapshot como bypass del IES; secretos; JWT; tokens de sesión; reconstrucción de N1 desde EKS.

---

# 3. D1 — Contrato de transformación

06 transforma la **forma de exposición**, no la verdad.

## Regla de oro D1

> El canal puede reducir el detalle, pero nunca reducir el significado crítico ni la veracidad.

## Alcance de la transformación

| 06 puede | 06 no puede |
|----------|-------------|
| Cambiar formato, densidad, secuencia de presentación, tono e interactividad | Añadir, eliminar o alterar significado del IES o del Reasoning Result |
| Comprimir contenido `OBLIGATORIO_RESUMIBLE` | Omitir `IRRENUNCIABLE` |
| Diferir `DIFERIBLE_BAJO_DEMANDA` con mecanismo proporcional al canal | Esconder verdad crítica detrás de revelación progresiva |
| Adaptar representación por canal | Crear semántica nueva, hechos, hipótesis o resoluciones |

Constitución V.15 define **orden semántico** de respuesta del LLM Analista, no diseño visual ni reglas de canal (`05` §20). 06 puede adaptar secuencia de presentación (`ESPECIFICO_DE_CANAL`) **sin colapsar** hecho, evidencia, diagnóstico, hipótesis, recomendación y limitación.

---

# 4. Clasificación de contenido

Todo contenido proyectable se clasifica en exactamente una de estas cuatro clases.
La clase es atributo de **exposición**. No es un nivel epistemológico.

## 4.1 `IRRENUNCIABLE`

- Conflictos Tipo E.
- `NO_CONOZCO` / `COV_NO_KNOWLEDGE`.
- Limitaciones materiales.
- Contradicciones críticas.
- Cualquier elemento cuya omisión cambie la interpretación ejecutiva.

**Regla:** nunca puede omitirse ni quedar detrás de revelación progresiva.
Un elemento `IRRENUNCIABLE` atraviesa L0–L3.

## 4.2 `OBLIGATORIO_RESUMIBLE`

- Conclusión esencial.
- Diagnóstico N4.
- Evidencia principal.
- Hipótesis N5, **solo si existe legítimamente**.

**Regla:** debe aparecer, pero puede comprimirse.
Comprimir no autoriza eliminar una condición, contradicción o reserva que cambie la interpretación ejecutiva.

## 4.3 `DIFERIBLE_BAJO_DEMANDA`

- Evidencia ampliada.
- Hechos N2.
- Referencias técnicas.
- Linaje autorizado disponible.

**Regla:** puede diferirse mediante clic, drill-down, «dime más», anexo u otro mecanismo proporcional al canal.
El detalle diferido permanece accesible. La verdad crítica no se difiere.

## 4.4 `ESPECIFICO_DE_CANAL`

- Formato.
- Densidad.
- Secuencia.
- Tono de presentación.
- Interactividad.

**Regla:** adaptación pura; nunca semántica nueva.

### Realización física — DETERMINISTIC_CONTENT_CLASS_MAPPING_V1 (§18 D4)

La clase de exposición se asigna de forma determinística según el mapeo congelado en §18 D4.
Si un ítem cae en más de una categoría, prevalece la clase más estricta:

`IRRENUNCIABLE` > `OBLIGATORIO_RESUMIBLE` > `DIFERIBLE_BAJO_DEMANDA` > `ESPECIFICO_DE_CANAL`.

Este mapeo **no** redefine la lista nunca omitible de `04` §17. Esa lista sigue aplicándose en §10.

---

# 5. D2 — Modelo de proyecciones por canal

Los canales son **políticas de proyección** sobre un modelo semántico común.
**No** son pipelines independientes.

- Todos los canales consumen el **mismo** `ies_id` (`04` independencia de canal).
- Una proyección de canal **no** crea una nueva versión del IES ni un nuevo `ies_id`.
- Cambiar de canal **no** crea una nueva verdad ni modifica artefactos fuente.
- Los canales deben preservar **equivalencia crítica** aunque la representación sea diferente.

```
IES (+ Reasoning Result opcional)
        ↓
Projection Model (qué comunicar y con qué prioridad)
        ↓
Política de canal (cómo representarlo)
```

---

# 6. Seis superficies ejecutivas

| Superficie | Características generales |
|------------|---------------------------|
| Chat | Interactivo / equilibrado / explicación y exploración |
| Voz | Secuencial / baja densidad / carga cognitiva mínima |
| WhatsApp | Rápido / baja densidad / alerta, acción y consulta |
| Dashboard | Alta densidad / visual / exploratorio / drill-down |
| Reporte | Alta densidad / persistente / documental / auditable |
| Presentación | Media-alta densidad / guiada / conducción de decisión |

Estas características gobiernan **densidad y mecanismo de revelación**, no el conjunto de significados críticos.

Si un canal no puede representar fielmente un contenido obligatorio, **declara la limitación**; nunca omite ni improvisa (fallo seguro).

La tabla de consumo de `04` §17 (qué puede resumirse por canal y qué lista obligatoria se conserva) **se aplica**; este documento no la redefine.

### Realización física — CHANNEL_POLICY_REGISTRY_V1 (§18 D10–D16)

Las seis superficies se identifican con los tokens de canal `CHAT`, `VOICE`, `WHATSAPP`, `DASHBOARD`, `REPORT`, `PRESENTATION`.
Son políticas sobre el **mismo** Projection Model. No son seis pipelines epistemológicos.
Políticas iniciales: `CHAT_POLICY_V1`, `VOICE_POLICY_V1`, `WHATSAPP_POLICY_V1`, `DASHBOARD_POLICY_V1`, `REPORT_POLICY_V1`, `PRESENTATION_POLICY_V1` (§18).
Esta subsección **no** crea SSML, widgets, plantillas productivas, límites de caracteres ni integración real de canal.

---

# 7. Projection Model

06 define un artefacto intermedio llamado **Projection Model**.

Su función es describir **qué debe comunicarse y con qué prioridad** antes de decidir **cómo** se representa en cada canal.

El Projection Model **no** crea inteligencia, **no** crea hechos y **no** ejecuta tools.
Es el contrato de exposición **antes** del render de canal.

### Realización física — SERIALIZED_PROJECTION_MODEL_V1 (§18 D2)

El runtime construye primero el Projection Model serializado; después aplica la política de canal.
Campos raíz congelados: `projection_id`, `ies_id`, `ies_version`, `reasoning_run_id`, `channel`, `projection_depth`, `items`, `critical_invariants`, `deferred_items`, `limitations`, `audit`.
Campos de ítem congelados: `item_id`, `source_type`, `source_id`, `semantic_type`, `content_class`, `priority`, `statement_or_reference`, `supporting_references`, `must_preserve`, `may_summarize`, `may_defer`.

Correspondencia con los campos conceptuales de esta sección (no crea semántica nueva):

| Conceptual | Realización serializada |
|------------|-------------------------|
| `content_class` | `items[].content_class` |
| `semantic_type` | `items[].semantic_type` (`SEMANTIC_TYPE_CATALOG_V1`, §18 D3) |
| `priority` | `items[].priority` (`PRESENTATION_PRIORITY_V1`, §18 D5) |
| `disclosure` | `may_defer` + pertenencia a `items` vs `deferred_items`. `DEFERRED` prohibido si `content_class = IRRENUNCIABLE` |
| `source_reference` | `source_type` + `source_id` |
| `ies_id` | raíz `ies_id` (el mismo de entrada) |
| `reasoning_run_id` | raíz `reasoning_run_id` (obligatorio solo si se consume Reasoning Result / Run) |

Catálogo cerrado de `semantic_type`: §18 D3. **No** inventa nivel epistemológico.

## Campos conceptuales

| Campo | Obligatorio | Significado |
|-------|-------------|-------------|
| `content_class` | Sí | `IRRENUNCIABLE` \| `OBLIGATORIO_RESUMIBLE` \| `DIFERIBLE_BAJO_DEMANDA` \| `ESPECIFICO_DE_CANAL` |
| `semantic_type` | Sí | Tipo distinguible ya existente en IES o Reasoning Result (hecho, evidencia, diagnóstico, hipótesis, recomendación, limitación, conflicto, cobertura, abstención, u otro tipo **ya** presente en la entrada). **No** inventa un nivel epistemológico nuevo. |
| `priority` | Sí | Orden de exposición dentro de la clase; no es `materiality`, `severity`, `confidence` ni `hypothesis_strength` |
| `disclosure` | Sí | `IMMEDIATE` (aparece en la capa útil vigente) o `DEFERRED` (solo para `DIFERIBLE_BAJO_DEMANDA`) |
| `source_reference` | Sí | Referencia al elemento de entrada (ID de IES o de Reasoning Result) |
| `ies_id` | Sí | Mismo `ies_id` de entrada; cambiar de canal no lo cambia |
| `reasoning_run_id` | Condicional | Obligatorio cuando la proyección consume un Reasoning Result / Run existente |

`disclosure = DEFERRED` está **prohibido** para `IRRENUNCIABLE`.
`priority` no recalcula ni sustituye `materiality` / `MAT_*`.

### Realización física — PRESENTATION_PRIORITY_V1 (§18 D5)

`priority` es exclusivamente prioridad de **exposición**. Tokens: `P0_CRITICAL` \| `P1_HIGH` \| `P2_NORMAL` \| `P3_DETAIL`.
No equivale a `materiality`, `severity`, `confidence` ni `hypothesis_strength`. El runtime no inventa prioridad empresarial nueva.
Asignación por defecto: `IRRENUNCIABLE` → `P0_CRITICAL`; `OBLIGATORIO_RESUMIBLE` → `P1_HIGH`; `DIFERIBLE_BAJO_DEMANDA` → `P3_DETAIL`.

## Equivalencia crítica

Dos proyecciones del mismo Projection Model sobre canales distintos deben preservar el mismo conjunto de significados críticos.
La representación puede diferir; el conjunto crítico no.

### Realización física — CRITICAL_EQUIVALENCE_VALIDATION_V1 (§18 D7)

Antes de emitir una proyección, el runtime compara IES / Reasoning Result (si existe) con el Projection Model y verifica que todos los elementos `IRRENUNCIABLE` estén presentes y semánticamente intactos. Lista de checks: §18 D7.

---

# 8. D3 — Projection Depth

`projection_depth` es una **dimensión de presentación**, no una taxonomía epistemológica.

**Nunca redefine N1–N5.**

## Capas

### `L0_FLASH`

- Irrenunciables.
- Conclusión esencial.

### `L1_EXECUTIVE`

- L0.
- Diagnóstico N4.
- Evidencia principal.
- Hipótesis N5 solo si existe legítimamente.
- Reservas relevantes.

### `L2_SUPPORT`

- L1.
- Evidencia ampliada.
- Conflictos detallados.
- Limitaciones.
- Soporte adicional.

### `L3_AUDIT`

- L2.
- Hechos N2.
- Referencias.
- Linaje autorizado y disponible.

## Reglas D3

1. Profundizar **agrega detalle**; nunca sustituye ni contradice capas previas.
2. Un elemento `IRRENUNCIABLE` **atraviesa** L0–L3.
3. Ningún contenido crítico requiere profundización para descubrirse.
4. La ausencia legítima de N5 **nunca se rellena**.
5. 06 **no consulta** directamente el Knowledge Store para reconstruir N1.
6. Si L3 requiere detalle adicional, 06 **solo expone** referencias o rutas autorizadas hacia el sistema propietario.

`L0_FLASH` no es un permiso para omitir Tipo E, `NO_CONOZCO`, limitaciones materiales ni contradicciones críticas.

### Realización física — PROJECTION_DEPTH_POLICY_V1 (§18 D6)

Política física por capa (presentación, no epistemología):

| Capa | Incluye | Difiere |
|------|---------|---------|
| `L0_FLASH` | Todo `IRRENUNCIABLE`; conclusión esencial disponible; máximo 1 recommendation si existe legítimamente | Detalle técnico; evidencia ampliada; audit trail |
| `L1_EXECUTIVE` | Todo `IRRENUNCIABLE`; `OBLIGATORIO_RESUMIBLE`; recommendations legítimas; abstentions relevantes | Detalle auditivo/técnico |
| `L2_SUPPORT` | Todo L1; hechos/evidencia de soporte; open questions; source health relevante | — |
| `L3_AUDIT` | Todo lo proyectable; references; audit; `deferred_items`; lineage disponible permitido | — |

Prohibición de L0: no omitir `IRRENUNCIABLE`.

---

# 9. L0–L3 no son N1–N5

| Dimensión | Qué es | Qué no es |
|-----------|--------|-----------|
| N1–N5 | Taxonomía epistemológica constitucional | Presentación |
| L0–L3 | Profundidad de exposición en canal | Niveles de conocimiento |
| Projection Model | Qué comunicar y con qué prioridad | Intelligence nueva |
| Canal | Política de representación | Pipeline de verdad |

Prohibido:

- tratar `L0_FLASH` como «solo N5» o «solo conclusión sin conflictos»;
- tratar `L3_AUDIT` como autorización para reconstruir observaciones N1 desde EKS u Observation Pipeline;
- numerar L0–L3 como si fueran N1–N5 o un Nivel 6.

---

# 10. Consumo de invariantes IES §17

`04` §17 **no diseña** Channel Projection; fija invariantes de consumo. Este documento las **aplica** y no las redefine.

- La proyección **no modifica** el IES.
- **No** crea `ies_version` nueva.
- Todos los canales consumen el **mismo** `ies_id`.
- **No** crea, eleva, reduce ni reinterpreta `materiality`.
- **No** suaviza ni omite `COV_NO_KNOWLEDGE` / `NO_CONOZCO`.
- **No** colapsa `TOOL_ERROR`, `DATA_NOT_FOUND` o `SOURCE_*` entre sí.

### Nunca omitible (`04` §17)

Cuando apliquen:

1. `COV_NO_KNOWLEDGE` / `NO_CONOZCO`.
2. `CONF_TYPE_E_GOVERNANCE`.
3. Diagnóstico principal (si existe).
4. Cobertura parcial crítica (`COV_PARTIAL_KNOWLEDGE`).
5. Limitaciones bloqueantes.

Estos elementos se clasifican según D1 (`IRRENUNCIABLE` u `OBLIGATORIO_RESUMIBLE` según corresponda). En ningún caso se omiten ni se postergan detrás de revelación progresiva.

Conflictos Tipo E en `OPEN` o `UNDER_REVIEW` **permanecen obligatoriamente visibles** (`02`; Constitución V).

---

# 11. RE vs Channel Projection

Aplicación de `05` D6 y §20. Este documento no redefine el RE.

| Reasoning Engine (`05`) | Channel Projection (`06`) |
|-------------------------|---------------------------|
| Conclusión semántica | Idioma final de canal |
| Interpretation | Tono, longitud |
| Hypotheses + strength + rivales | Voz / formato conversacional |
| Recommendations / Next verifications / Options | WhatsApp / densidad corta |
| Abstentions / Clarifications | Dashboard UI / markdown |
| References a IDs IES | Presentación ejecutiva |
| Semántica | Presentación |

`channel_hint` del RE **no** autoriza emitir reglas de presentación desde el RE.
06 **no** formula hipótesis. Si no hay Reasoning Result legítimo, no hay N5 que proyectar.

Hipótesis de un Run previo **sigue siendo N5**, nunca hecho (`05` Caso 14). 06 no la relabela como N2.

### Realización física — OPTIONAL_REASONING_NO_FILL_V1 (§18 D8)

Si el Reasoning Result no existe, 06 proyecta **solo** el IES.
Si el RE se abstuvo, 06 puede proyectar abstention/limits presentes en el Result o en el IES; **no** fabrica N5.
La ausencia de N5 **nunca** se interpreta como error de Projection.

---

# 12. Doce invariantes

1. **Fidelidad semántica.** Ninguna proyección añade, elimina o altera significado del IES o Reasoning Result.
2. **Criticidad.** Todo contenido irrenunciable aparece en la primera capa útil.
3. **Separación epistemológica.** Hechos, evidencias, diagnósticos, hipótesis, recomendaciones y limitaciones permanecen distinguibles.
4. **No-reinterpretación.** 06 no resuelve conflictos, recalcula cobertura, materiality, confidence, severity o hypothesis_strength.
5. **Trazabilidad.** Toda proyección conserva `ies_id` y, cuando aplique, referencia al Reasoning Result o Reasoning Run.
6. **Compresión controlada.** Resumir nunca elimina una condición, contradicción o reserva que cambie la interpretación ejecutiva.
7. **Revelación progresiva.** El detalle puede diferirse. La verdad crítica no. Token físico: **SAFE_PROGRESSIVE_DISCLOSURE_V1** (§18 D9): solo `DIFERIBLE_BAJO_DEMANDA` puede ocultarse inicialmente; `IRRENUNCIABLE` nunca queda detrás de click, drill-down, «dime más» o anexo.
8. **Independencia de canal.** Cambiar de canal no crea una nueva verdad ni modifica artefactos fuente.
9. **No-ejecución.** 06 no ejecuta tools, no consulta bases, no llama loaders y no genera conocimiento nuevo.
10. **Equivalencia crítica multiinterfaz.** Dos canales distintos deben preservar el mismo conjunto de significados críticos.
11. **Accesibilidad del soporte.** Todo soporte resumido debe ser accesible por un mecanismo proporcional al canal.
12. **Fallo seguro.** Si un canal no puede representar fielmente un contenido obligatorio, debe declarar la limitación; nunca omitir ni improvisar.

Estas invariantes aplican Constitución I (líneas rojas), VI.4 (consistencia multiinterfaz), VIII (regla de oro) y IX (IES independiente del canal), sin redefinirlas.

---

# 13. Test de Pureza

> Una proyección es válida solo si, al eliminar sus decisiones puramente visuales o conversacionales, no queda ninguna afirmación que no pueda rastrearse al IES o al Reasoning Result de entrada.

## Aplicación

| Resultado | Significado |
|-----------|-------------|
| Pasa | Toda afirmación restante cita `source_reference` al IES o al Reasoning Result |
| Falla | Quedó semántica nueva, omisión crítica, suavizado, relleno de N5 ausente, o relabel epistemológico |

El Test de Pureza es **criterio de validez de proyección**, no un test de runtime en esta versión. Runtime pendiente.

### Realización física — TONE_IS_PRESENTATION_ONLY_V1 (§18 D19)

El tono puede ser claro, cálido, conversacional o ejecutivo según canal, siempre que no cambie certeza, causalidad, límites, ausencia, conflictos, recommendations ni estado de ejecución.
Permitido: cortesía, claridad, naturalidad, transiciones conversacionales, preguntas de seguimiento.
Prohibido: simular certeza inexistente; prometer resultados no soportados; fingir emoción/experiencia propia; convertir hypothesis en fact; suavizar `NO_KNOWLEDGE`.
Esta tarea **no** autoriza memoria conversacional, WhoAmI, small talk ni personalidad persistente.

---

# 14. Prohibiciones

1. Reinterpretar o corregir contratos superiores.
2. Inventar niveles epistemológicos o un “Nivel 6”.
3. Convertir `projection_depth` L0–L3 en N1–N5.
4. Crear un nuevo `ies_id` o `ies_version` por cambio de canal.
5. Consultar EKS, Observation Pipeline, tools, loaders o APIs operacionales.
6. Rellenar la ausencia legítima de N5.
7. Suavizar u omitir Tipo E, `NO_CONOZCO` / `COV_NO_KNOWLEDGE`, limitaciones materiales o contradicciones críticas.
8. Colapsar `TOOL_ERROR`, `DATA_NOT_FOUND` y `SOURCE_*`.
9. Fusionar silenciosamente IES `OFFICIAL` y `ALTERNATIVE`.
10. Presentar hipótesis como hecho.
11. Recalcular `k`/`wi`, materiality, confidence, severity o hypothesis_strength.
12. Implementar runtime, reglas de Cursor o ejecución de canal en este documento.
13. Autorizar un renderer LLM productivo en el primer runtime (§18 D17 / D20). Un renderer LLM conversacional, si alguna vez se autoriza en tarea futura, permanece subordinado al Projection Model y sin autoridad epistemológica.
14. Crear memoria conversacional, WhoAmI, small talk, personalidad persistente u orquestador conversacional.
15. Crear Nivel 6 o semántica nueva.

---

# 15. Criterios de aceptación

Checklist verificable **antes** de implementación productiva de 06. No constituyen autoaprobación de gates.

| # | Criterio | Prueba conceptual |
|---|----------|-------------------|
| 1 | D1: forma ≠ verdad | Cambio de canal no altera IES ni Reasoning Result |
| 2 | `IRRENUNCIABLE` visible en L0 | Tipo E / `NO_CONOZCO` / limitación material no quedan detrás de «dime más» |
| 3 | `OBLIGATORIO_RESUMIBLE` aparece | Diagnóstico N4 y evidencia principal presentes, aunque comprimidos |
| 4 | N5 ausente no se rellena | IES sin Reasoning Result → ninguna hipótesis proyectada |
| 5 | L0–L3 ≠ N1–N5 | Profundizar agrega detalle y no sustituye capas previas |
| 6 | Mismo `ies_id` en seis canales | Chat/Voz/WhatsApp/Dashboard/Reporte/Presentación citan el mismo IES |
| 7 | Equivalencia crítica | El conjunto crítico coincide entre dos canales distintos |
| 8 | No-ejecución | Ninguna llamada a tool, loader, EKS u OP desde 06 |
| 9 | Test de Pureza | Tras quitar formato, no queda afirmación sin ancla de entrada |
| 10 | Fallo seguro | Canal incapaz de representar un obligatorio declara limitación; no omite |
| 11 | Consumo `04` §17 | Lista nunca omitible conservada |
| 12 | Separación epistemológica | Hecho / evidencia / diagnóstico / hipótesis / limitación distinguibles |

---

# 16. Riesgos pendientes

1. Runtime de Channel Projection — **PENDIENTE**. Interfaz física registrada en §18; esta sección no implementa.
2. Mecanismos concretos por canal (SSML, widgets, plantillas WhatsApp productivas, límites de caracteres) — **no inventados**; fuera del primer runtime.
3. Actualización del índice arquitectónico para registrar este documento — requiere Gate G2 humano **sobre el índice**; **fuera de alcance** de `ARCH-CHANNEL-PROJECTION-PHYSICAL-DECISIONS-002`.
4. Almacén del Reasoning Run (`05`) — 06 solo referencia `reasoning_run_id` cuando exista.
5. Firma IES — `04` v1.0 `NOT_IMPLEMENTED`; 06 no la implementa.
6. Calibración `k`/`wi` y ruleset de materiality — 06 solo consume.
7. Renderer LLM conversacional — diferido a tarea futura; si se autoriza, subordinado al Projection Model y sin autoridad epistemológica.
8. Integración real de canal (WhatsApp/Chat/Voice/Dashboard/Report/Presentation productivos) — fuera del primer runtime (§18 D20).
9. Memoria conversacional / WhoAmI / small talk / personalidad persistente — no autorizados.

---

# 17. Control documental

| Campo | Valor |
|-------|--------|
| Documento | `06-CHANNEL-PROJECTION.md` |
| Versión | 1.0 |
| Estado | **CHANNEL PROJECTION v1.0** — realización física D1–D20 registrada (`ARCH-CHANNEL-PROJECTION-PHYSICAL-DECISIONS-002`); contrato semántico D1–D3 intacto |
| Dependencias | Constitución; EKE; EB; EKS (límites); 03A/03B (límites); IES v1.0 congelado; RE v1.0 congelado |
| Entrada | IES emitido + Reasoning Result opcional + canal + `projection_depth` |
| Artefacto intermedio | `SERIALIZED_PROJECTION_MODEL_V1` |
| Salida | `CHANNEL_OUTPUT_ENVELOPE_V1` |
| Autoridad epistemológica | **Ninguna** |
| Runtime | **PENDIENTE** (interfaz física registrada en §18; esta sección no implementa) |
| Índice arquitectónico | No modificado por este documento |

### Resultado de registro contractual

**Realización física D1–D20:** registrada.
(**Runtime:** PENDIENTE. Esta sección no autoriza IMPL-CHANNEL-PROJECTION-001 por sí sola.)

Este documento **no** escribe `APPROVED` ni `AUTHORIZED_BY_HUMAN`.
La revisión, el cierre G5 y cualquier actualización de contratos distintos de este archivo corresponden exclusivamente a HUMAN_APPROVER.

---

# 18. Realización física v1 (D1–D20)

Esta sección **no** redefine N1–N5 ni la Constitución. No cambia el esquema IES v1.0. No cambia el contrato RE v1.0. No crea Nivel 6. No convierte hipótesis en hechos. No recalcula coverage, materiality, confidence, severity ni hypothesis_strength. No resuelve conflictos. No fabrica Reasoning cuando no existe. No suaviza `NO_KNOWLEDGE`. No omite Tipo E. No autoriza LLM renderer productivo. No crea memoria conversacional, WhoAmI, small talk ni personalidad persistente. No implementa runtime. No autoriza IMPL-CHANNEL-PROJECTION-001 por sí sola.

Registra las decisiones físicas aprobadas por HUMAN_APPROVER (tarea `ARCH-CHANNEL-PROJECTION-PHYSICAL-DECISIONS-002`, G1+G2). Evidencia: `ARCH-CHANNEL-PROJECTION-PHYSICAL-DECISIONS-001`.

Los identificadores D1–D20 de **esta sección** son los de `CURRENT_TASK` / `ARCH-CHANNEL-PROJECTION-PHYSICAL-DECISIONS-002`. **No** sustituyen las decisiones semánticas D1–D3 de la cabecera de este documento.

Tokens: `CHANNEL_PROJECTION_FACTORY_V1`, `SERIALIZED_PROJECTION_MODEL_V1`, `SEMANTIC_TYPE_CATALOG_V1`, `DETERMINISTIC_CONTENT_CLASS_MAPPING_V1`, `PRESENTATION_PRIORITY_V1`, `PROJECTION_DEPTH_POLICY_V1`, `CRITICAL_EQUIVALENCE_VALIDATION_V1`, `OPTIONAL_REASONING_NO_FILL_V1`, `SAFE_PROGRESSIVE_DISCLOSURE_V1`, `CHANNEL_POLICY_REGISTRY_V1`, `CHAT_POLICY_V1`, `VOICE_POLICY_V1`, `WHATSAPP_POLICY_V1`, `DASHBOARD_POLICY_V1`, `REPORT_POLICY_V1`, `PRESENTATION_POLICY_V1`, `DETERMINISTIC_PROJECTION_FIRST_V1`, `CHANNEL_OUTPUT_ENVELOPE_V1`, `TONE_IS_PRESENTATION_ONLY_V1`, `PROJECTION_MODEL_PLUS_NEUTRAL_RENDER_V1`. **Prohibido** sustituirlos en implementación.

| ID | Decisión aprobada | Significado contractual |
|----|-------------------|-------------------------|
| D1 | **CHANNEL_PROJECTION_FACTORY_V1** | Factory pura/testeable. Interfaz futura mínima: `createChannelProjection({ policyRegistry, clock? })` y `project({ ies, reasoningResult?, reasoningRunId?, channel, projectionDepth })`. El IES es la entrada epistemológica primaria. El Reasoning Result es opcional y de solo lectura. `policyRegistry` no crea semántica. Esta interfaz no ejecuta tools, no consulta EKS/OP y no muta IES ni Reasoning Result. |
| D2 | **SERIALIZED_PROJECTION_MODEL_V1** | El runtime construye primero un Projection Model neutral, serializable, antes de cualquier render específico de canal. Campos raíz: `projection_id`, `ies_id`, `ies_version`, `reasoning_run_id`, `channel`, `projection_depth`, `items`, `critical_invariants`, `deferred_items`, `limitations`, `audit`. Campos de ítem: `item_id`, `source_type`, `source_id`, `semantic_type`, `content_class`, `priority`, `statement_or_reference`, `supporting_references`, `must_preserve`, `may_summarize`, `may_defer`. `ies_id` es el de entrada. `reasoning_run_id` es obligatorio solo cuando se consume un Reasoning Result/Run existente; si no hay Result, no se fabrica. Los ítems no contienen semántica nueva: `statement_or_reference` cita o reproduce contenido ya presente en IES/RE. |
| D3 | **SEMANTIC_TYPE_CATALOG_V1** | Enum cerrado: `COVERAGE`, `FACT`, `EVIDENCE`, `DIAGNOSIS`, `CONFLICT`, `OPEN_QUESTION`, `SOURCE_HEALTH`, `LIMITATION`, `ABSTENTION`, `INTERPRETATION_KNOWN`, `INTERPRETATION_INFERRED`, `INTERPRETATION_NOT_CONCLUDED`, `HYPOTHESIS`, `RECOMMENDATION`, `NEXT_VERIFICATION`, `DECISION_OPTION`, `CLARIFICATION_REQUEST`, `AUDIT_REFERENCE`. `semantic_type` describe un tipo **ya existente** en IES/RE. No crea nivel epistemológico ni semántica nueva. Derivación sobre bancos existentes (no inventa tipos): `knowledge_coverage`/`COV_*` → `COVERAGE`; `facts[]` → `FACT`; `evidence[]` → `EVIDENCE`; `diagnoses[]` → `DIAGNOSIS`; `conflicts[]` → `CONFLICT`; `open_questions[]` → `OPEN_QUESTION`; `source_health[]` → `SOURCE_HEALTH`; `limitations[]` / `reasoning_limits` → `LIMITATION`; `abstentions[]` → `ABSTENTION`; `interpretation.what_is_known` → `INTERPRETATION_KNOWN`; `interpretation.what_can_be_inferred` → `INTERPRETATION_INFERRED`; `interpretation.what_cannot_be_concluded` → `INTERPRETATION_NOT_CONCLUDED`; `hypotheses[]` → `HYPOTHESIS`; `recommendations[]` → `RECOMMENDATION`; `next_verifications[]` → `NEXT_VERIFICATION`; `decision_options[]` → `DECISION_OPTION`; `clarification_requests[]` → `CLARIFICATION_REQUEST`; `audit` / references de linaje → `AUDIT_REFERENCE`. Un objeto sin banco de origen no recibe un `semantic_type` nuevo; no se proyecta como semántica inventada. |
| D4 | **DETERMINISTIC_CONTENT_CLASS_MAPPING_V1** | Mapeo de clase de exposición: `NO_KNOWLEDGE` → `IRRENUNCIABLE`; `TYPE_E_CONFLICT` → `IRRENUNCIABLE`; `BLOCKING_LIMITATION` → `IRRENUNCIABLE`; `CRITICAL_CONTRADICTION` → `IRRENUNCIABLE`; `DIAGNOSIS` → `OBLIGATORIO_RESUMIBLE`; `PRIMARY_EVIDENCE` → `OBLIGATORIO_RESUMIBLE`; `LEGITIMATE_HYPOTHESIS` → `OBLIGATORIO_RESUMIBLE`; `RECOMMENDATION` → `OBLIGATORIO_RESUMIBLE`; `FACT_DETAIL` → `DIFERIBLE_BAJO_DEMANDA`; `EVIDENCE_DETAIL` → `DIFERIBLE_BAJO_DEMANDA`; `AUDIT_REFERENCE` → `DIFERIBLE_BAJO_DEMANDA`; `PRESENTATION_FORMAT` → `ESPECIFICO_DE_CANAL`. Si un ítem cae en más de una categoría, prevalece la clase más estricta: `IRRENUNCIABLE` > `OBLIGATORIO_RESUMIBLE` > `DIFERIBLE_BAJO_DEMANDA` > `ESPECIFICO_DE_CANAL`. Este mapeo no deroga `04` §17 ni §10 de este documento: `COV_PARTIAL_KNOWLEDGE` crítica y la lista nunca omitible siguen sin poder omitirse ni diferirse detrás de revelación progresiva. |
| D5 | **PRESENTATION_PRIORITY_V1** | Enum de exposición: `P0_CRITICAL`, `P1_HIGH`, `P2_NORMAL`, `P3_DETAIL`. `priority` es solo de exposición. No equivale a `materiality`, `severity`, `confidence` ni `hypothesis_strength`. Asignación: `IRRENUNCIABLE` → `P0_CRITICAL`; `OBLIGATORIO_RESUMIBLE` → `P1_HIGH` por defecto; `DIFERIBLE_BAJO_DEMANDA` → `P3_DETAIL` por defecto. El runtime no inventa prioridad empresarial nueva. `P2_NORMAL` pertenece al enum; ninguna clase tiene default `P2_NORMAL`; no se inventa un mapeo adicional. |
| D6 | **PROJECTION_DEPTH_POLICY_V1** | `L0_FLASH`: incluye todo `IRRENUNCIABLE`, la conclusión esencial disponible y máximo 1 recommendation si existe legítimamente; difiere detalle técnico, evidencia ampliada y audit trail; prohibido omitir `IRRENUNCIABLE`. `L1_EXECUTIVE`: incluye todo `IRRENUNCIABLE`, `OBLIGATORIO_RESUMIBLE`, recommendations legítimas y abstentions relevantes; difiere detalle auditivo/técnico. `L2_SUPPORT`: todo L1 más hechos/evidencia de soporte, open questions y source health relevante. `L3_AUDIT`: todo lo proyectable, references, audit, `deferred_items` y lineage disponible permitido. Profundizar agrega detalle; no sustituye capas previas. L0–L3 no son N1–N5. |
| D7 | **CRITICAL_EQUIVALENCE_VALIDATION_V1** | Antes de emitir una proyección, el runtime compara IES/Reasoning Result con el Projection Model y verifica que todos los elementos `IRRENUNCIABLE` estén presentes y semánticamente intactos. Checks: `NO_KNOWLEDGE` preservado; Tipo E preservado; blocking limitations preservadas; critical contradictions preservadas; abstentions relevantes preservadas; recommendations no presentadas como decisiones ejecutadas; Decision Option conserva `NOT_EXECUTED`. Fallo → no emitir proyección que omita o altere el conjunto crítico; declarar limitación de presentación (fallo seguro). |
| D8 | **OPTIONAL_REASONING_NO_FILL_V1** | Si el Reasoning Result no existe, 06 proyecta solo IES. Si el RE se abstuvo, 06 puede proyectar abstention/limits, pero no fabrica N5. La ausencia de N5 nunca se interpreta como error de Projection. Un Run `REJECT` / `TIMEOUT` / `ERROR` / `MALFORMED` / `ABSTAIN` no autoriza rellenar hipótesis ni recommendations. |
| D9 | **SAFE_PROGRESSIVE_DISCLOSURE_V1** | Solo `DIFERIBLE_BAJO_DEMANDA` puede ocultarse inicialmente. `IRRENUNCIABLE` nunca queda detrás de click, drill-down, «dime más» o anexo. `may_defer=true` está prohibido para `IRRENUNCIABLE`. Progressive disclosure no esconde Tipo E, `NO_KNOWLEDGE`, blocking limitations ni contradicciones críticas. |
| D10 | **CHANNEL_POLICY_REGISTRY_V1** | Las seis superficies se implementan como políticas sobre el mismo Projection Model. No son pipelines independientes. Canales: `CHAT`, `VOICE`, `WHATSAPP`, `DASHBOARD`, `REPORT`, `PRESENTATION`. Cambiar de canal no crea `ies_id` nuevo ni verdad nueva. |
| D11 | **CHAT_POLICY_V1** | Tono natural y directo; puede usar párrafos cortos; puede ofrecer profundización; no omite `IRRENUNCIABLE`; separación visible entre hecho/inferencia/límite; no finge emociones ni experiencias propias. No inventa longitud máxima ni widgets. |
| D12 | **VOICE_POLICY_V1** | Secuencia lineal; baja densidad; `IRRENUNCIABLE` primero; detalle diferible se resume y ofrece bajo demanda; si algo no puede expresarse fielmente, declarar limitación. No inventa SSML ni política de voz de proveedor. |
| D13 | **WHATSAPP_POLICY_V1** | Mensajes compactos; `IRRENUNCIABLE` visible en el primer bloque; puede fragmentar en varios mensajes; detalle diferible se ofrece bajo demanda; no promete acciones no ejecutadas; no oculta abstention. No inventa plantillas productivas ni límites de caracteres. |
| D14 | **DASHBOARD_POLICY_V1** | Alta densidad; `IRRENUNCIABLE` visible sin drill-down; detalle `DIFERIBLE` puede ir a drill-down; mismo `ies_id`/`reasoning_run_id`; la visualización no altera semántica. No inventa widgets. |
| D15 | **REPORT_POLICY_V1** | Representación persistente; incluye audit/reference suficiente; L2/L3 preferentes; no elimina contradicciones o límites. |
| D16 | **PRESENTATION_POLICY_V1** | Secuencia guiada; `IRRENUNCIABLE` aparece antes de recomendación; Decision Option no se presenta como decisión tomada; puede resumir detalle técnico. |
| D17 | **DETERMINISTIC_PROJECTION_FIRST_V1** | IMPL-CHANNEL-PROJECTION-001 inicial construye Projection Model y una representación neutral/determinística por canal **sin** LLM de redacción. Un renderer LLM conversacional puede evaluarse en tarea posterior, subordinado al Projection Model y sin autoridad epistemológica. Esta sección **no** autoriza ese renderer. |
| D18 | **CHANNEL_OUTPUT_ENVELOPE_V1** | Forma de salida de canal. Campos: `projection_id`, `channel`, `projection_depth`, `ies_id`, `reasoning_run_id`, `content_blocks`, `deferred_content`, `critical_invariants`, `limitations`, `audit`. `content_blocks` son representación del Projection Model. No contienen semántica nueva. |
| D19 | **TONE_IS_PRESENTATION_ONLY_V1** | Tono puede ser claro, cálido, conversacional o ejecutivo según canal, siempre que no cambie certeza, causalidad, límites, ausencia, conflictos, recommendations o estado de ejecución. Permitido: cortesía, claridad, naturalidad, transiciones conversacionales, preguntas de seguimiento. Prohibido: simular certeza inexistente; prometer resultados no soportados; fingir emoción/experiencia propia; convertir hypothesis en fact; suavizar `NO_KNOWLEDGE`. Naturalidad y cortesía son presentación únicamente. No autoriza memoria conversacional, WhoAmI, small talk ni personalidad persistente. |
| D20 | **PROJECTION_MODEL_PLUS_NEUTRAL_RENDER_V1** | Primera implementación puede ser totalmente in-memory y determinística, con policies puras y fixtures sintéticos, sin integración real de canal. Sin networking. Sin templates productivos. Sin SSML. Sin widgets. Sin LLM renderer. |

### Restricción física vigente (ausencia productiva N3/N4/N5)

Mientras el Evidence Builder real no produzca `evidence[]`/`diagnoses[]` con reglas autorizadas, un futuro IMPL-CHANNEL-PROJECTION-001 debe proyectar esa ausencia como cobertura, limitaciones y, si el RE se abstuvo, abstenciones. **No** fabrica N3, N4 ni N5. Cero evidencia autorizada no es permiso para improvisar conclusión.

### Límites de esta realización

1. Runtime de Channel Projection **PENDIENTE**. Esta sección no implementa factory, Projection Model, envelope, tests ni fixtures.
2. No calibra materias G8 (`wi`, `k`, `Fs`, materiality ruleset, severity productiva).
3. No autoriza IMPL-CHANNEL-PROJECTION-001.
4. No redefine Constitución, Motor, `02`, `03`, `03A`, `03B`, `04`, `05` ni el índice.
5. N1–N5, coverage, conflictos, materiality, IES v1.0 y RE v1.0 **no** cambian.
6. SSML, widgets, plantillas WhatsApp productivas, límites de caracteres e integración real de canal permanecen diferidos.
7. Renderer LLM conversacional permanece fuera.
8. Memoria conversacional / WhoAmI / small talk / personalidad persistente permanecen fuera.

---

*Fin del documento. Sin implementación. Sin modificación de IES v1.0 ni RE v1.0. Sin autoridad epistemológica.*
