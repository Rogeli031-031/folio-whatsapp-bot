# EXECUTIVE-STEERING-CAPTURE-CONTRACT

## Contrato de dominio — EXECUTIVE_STEERING_CAPTURE / EXECUTIVE_STEERING_EVENT

**Documento:** `docs/director-ia/EXECUTIVE-STEERING-CAPTURE-CONTRACT.md`
**Versión:** 1.0
**Estado:** EXECUTIVE-STEERING-CAPTURE-CONTRACT v1.0 — creado bajo G3 autorizado (`DOCS-DIRECTOR-IA-EXECUTIVE-STEERING-CAPTURE-CONTRACT-001`). **APPROVED_FOR_FREEZE** de semántica. **RUNTIME = PENDING.** **AUTHZ_CONFIRMATION = PENDING.**
**Tipo:** Contrato de dominio / capability. **No** es capa de pipeline. **No** es `07`. **No** es Channel Projection.
**Orden futuro en Index:** `—` (misma convención que `FINANCIAL-ACTUAL-EVIDENCE-CONTRACT.md` y `DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md`).

Fuente normativa transcrita: `docs/dev-loop/reports/ARCH-DIRECTOR-IA-EXECUTIVE-STEERING-CAPTURE-001.md`. Este archivo no rediseña esa arquitectura.

### Dependencia normativa

| Documento | Rol |
|-----------|-----|
| `docs/director-ia/DIRECTOR_IA_CONSTITUTION.md` | Norma superior. Este contrato **no** la modifica. VII: declara que este dominio **aún no produce** ObservationRecords N1 **ni alimenta** el IES. VIII: RECORDED no es hecho del contenido. |
| `docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md` | Meeting statement ≠ verdad. Forecast ≠ commitment. Este contrato **no** edita EKE. G2 posterior. |
| `docs/director-ia/02-EVIDENCE-BUILDER.md` | Compatible. No se toca. Se reusa el patrón de linaje (`content_author_id` nullable; `extracted_by` ≠ autor). |
| `docs/director-ia/03A-OBSERVATION-PIPELINE.md` | Compatible. No se toca. Autor no resoluble = null; no inventar id. |
| `docs/director-ia/04-IES-STANDARD.md` | **IES v1.0 APROBADO PARA CONGELAMIENTO.** Este contrato **no** lo modifica. `IES_REVIEW_REQUIRED` solo si un ciclo futuro proyecta estos eventos a IES. |
| `docs/director-ia/05-REASONING-ENGINE.md` | **RE v1.0 APROBADO PARA CONGELAMIENTO.** Este contrato **no** lo modifica. `RE_REVIEW_REQUIRED` solo si N5 razona sobre estos objetos. |
| `docs/director-ia/06-CHANNEL-PROJECTION.md` | Este contrato no es interfaz. |
| `docs/director-ia/FINANCIAL-ACTUAL-EVIDENCE-CONTRACT.md` | `SUPERSEDED` financiero **no** es la semántica de este dominio. No se toca. |
| `docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md` | Índice. G2 posterior indexará este archivo como `—`. Este contrato **no** modifica el índice. |
| `docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md` | Inventario. G2 posterior. Este contrato **no** lo modifica. |

En conflicto, prevalece la Constitución.
Este documento **no modifica** Constitución, `04` ni `05`.
**No** redefine N1–N5. **No** alimenta el IES oficial. **No** implementa runtime.

---

## 0. Alcance

Gobierna la semántica de **EXECUTIVE_STEERING_CAPTURE**: registro estructurado de lo que **nace durante** una junta o contexto ejecutivo equivalente (propuesta, decisión, compromiso, causa declarada, corrección).

No crea fuente física. No crea schema. No crea SQL. No crea API. No crea UI.
No integra Plaud. No implementa Consejo, post-cierre, what-if ni live copilot.
No decide AUTHZ de confirmación organizacional.

Grain: un `EXECUTIVE_STEERING_EVENT`. Una junta puede originar N events. Un event no exige planta, número, periodo ni responsable.

---

## 1. Identidad de dominio

| Afirmación | Valor |
|------------|--------|
| Nombre de capability | `EXECUTIVE_STEERING_CAPTURE` |
| Objeto canónico | `EXECUTIVE_STEERING_EVENT` |
| Naturaleza | Domain store / capability. No capa numerada del pipeline |
| Verdad que puede afirmar RECORDED | Existencia de una **atestación** con provenance |
| Verdad que NO afirma RECORDED | Veracidad operacional del **contenido** |

Este dominio **no** es segunda copia de Action Register, IGF, ARR, ACTUAL_FINANCIAL ni de una transcripción.

---

## 2. Objeto canónico

`EXECUTIVE_STEERING_EVENT` es un registro estructurado y auditable de una atestación o evento ejecutivo originado en contexto de junta (o captura gubernada equivalente), con provenance.

`EXECUTIVE_STEERING_EVENT` **no** es prueba automática de que su contenido sea verdadero.

Los cinco tipos son **tipos del mismo objeto**, no stores separados ni un blob de junta:

1. `PROPOSAL`
2. `DECISION`
3. `COMMITMENT`
4. `HUMAN_DECLARED_CAUSE`
5. `CORRECTION`

No existe tipo `MEETING_STATEMENT` aparte: el envelope **es** el statement.
No existe tipo `SCENARIO` en v1.0.
No existe tipo `REJECTION` (es `DECISION` con outcome `rejected`).
No existe tipo `ACTION` en este store.

---

## 3. Invariantes

Congelados. No relabel.

```
STATEMENT (envelope)
≠ PROPOSAL
≠ DECISION
≠ COMMITMENT
≠ ACTION
≠ TARGET / TARGET_COMMITMENT
≠ FORECAST
≠ SCENARIO / WHAT_IF
≠ ACTUAL / ACTUAL_COMMERCIAL / ACTUAL_FINANCIAL
≠ FINAL
≠ MODEL_HYPOTHESIS
≠ EVIDENCE_DERIVED_CAUSE
```

Prohibiciones de colapso:

- `PROPOSAL` = `DECISION`
- `DECISION` = `COMMITMENT`
- `COMMITMENT` = `ACTION`
- `COMMITMENT` = `TARGET` / `TARGET_COMMITMENT` (`igf_meta`)
- `COMMITMENT` = `FORECAST` (`igf.compromiso_lines`)
- `COMMITMENT` = `ACTUAL` / `FINAL`
- `HUMAN_DECLARED_CAUSE` = `EVIDENCE_DERIVED_CAUSE`
- `HUMAN_DECLARED_CAUSE` = `MODEL_HYPOTHESIS`
- `CORRECTION` = overwrite histórico
- extracción de transcripción = evento confirmado
- clasificación LLM = confirmación humana
- `igf.versions.financial_state = SUPERSEDED` = supersession de este dominio

Un evento **no muta** por sí solo IGF, `igf_meta`, ARR, ACTUAL_FINANCIAL, FINAL, ni Action Register.

---

## 4. Semántica de RECORDED

**First-slice attestation state (único estado operativo de v1.0):** `RECORDED`.

### Definición

`RECORDED` significa:

> Existe una atestación estructurada registrada con provenance suficiente para sostener que ese contenido fue capturado o declarado en ese contexto.

La verdad que `RECORDED` permite afirmar es sobre **la existencia de la atestación**, no necesariamente sobre **el contenido** de la atestación.

### Ejemplo de control

Evento: tipo `COMMITMENT`, estado `RECORDED`, raw_text «Acapulco se compromete a recuperar +40 t».

| Defendible | No defendible solo por RECORDED |
|------------|----------------------------------|
| «En la junta quedó registrado que Acapulco se comprometió a +40 t.» | «Acapulco aumentará 40 t.» |
| | «Acapulco vendió 40 t adicionales.» |
| | «El forecast aumentó 40 t.» |
| | «El target aumentó 40 t.» |
| | «Existe una acción automáticamente.» |
| | «El compromiso fue cumplido.» |
| | «El dato fue aprobado organizacionalmente.» |

### RECORDED no significa

`ORGANIZATIONALLY_CONFIRMED` · `APPROVED` · `ACCEPTED` · `EXECUTED` · `FULFILLED` · `VERIFIED_TRUE` · `ACTUAL` · `FINAL`

### Estados futuros (reservados)

`EXTRACTED_CANDIDATE`, `CONFIRMED`, `REJECTED` (de candidato), y cualquier workflow de aprobación:

**FUTURE / `AUTHZ_DECISION_REQUIRED`.**

v1.0 no los implementa ni los exige. Un candidato extraído **no** es `RECORDED` hasta captura humana gubernada.

`SUPERSEDED` (de este dominio) es estado de **vigencia del event**, no de aprobación. Ver §6.

---

## 5. Taxonomía

Para cada tipo: definición, condición mínima, qué permite afirmar, qué no, relaciones, corrección, provenance mínima (además de §8).

### 5.1 PROPOSAL

| Campo | Norma |
|-------|--------|
| Definición | Propuesta formulada en el contexto registrado (intervención, cifra, palanca, recorte). |
| Condición mínima | `raw_text` no vacío + `event_type=PROPOSAL` + provenance de captura + `attestation_state`. |
| Permite afirmar | Que esa propuesta quedó registrada. |
| No permite afirmar | `DECISION`, aprobación, `COMMITMENT`, ejecución, forecast, actual. |
| Relaciones | 0..N `DECISION` posteriores pueden referenciarla. No obligatoria. |
| Corrección | Sí. Sucesor + relación de supersession. |
| Ciclo admitido | Proposal without decision; accepted later; rejected later; corrected/superseded. |

### 5.2 DECISION

| Campo | Norma |
|-------|--------|
| Definición | Decisión **declarada o tomada** en el contexto registrado. |
| Condición mínima | `raw_text` + tipo + provenance + `decision_outcome` ∈ {`accepted`, `rejected`, `pending`}. |
| Permite afirmar | Que esa decisión quedó registrada con ese outcome. |
| No permite afirmar | Ejecución, resultado actual, que todo actor afectado se comprometió, mutación de fuentes operacionales. |
| Relaciones | `proposal_event_ref` **opcional**. No se exige proposal previa. |
| Corrección | Sí. |

`DECISION_NEEDED` de PRE_CLOSE **no** es este tipo. Es semilla de pregunta, no captura.

### 5.3 COMMITMENT

| Campo | Norma |
|-------|--------|
| Definición | Obligación, meta o resultado **futuro** que un actor declara **asumir** en el contexto ejecutivo. |
| Condición mínima | `raw_text` que exprese asunción (no solo «si…») + tipo + provenance + `attestation_state`. Payload numérico **si** la declaración lo trae. |
| Permite afirmar | Que quedó registrado que ese actor (o speaker) asumió ese compromiso. |
| No permite afirmar | Venta, `TARGET_COMMITMENT` (`igf_meta`), FORECAST (`compromiso_lines`), SCENARIO, ACTION, ACTUAL, FINAL, cumplimiento. |
| Relaciones | Futuro: 0..N `ACTION` (Action Register). **No obligatorio** en v1.0. **No** proyección automática. |
| Corrección | Sí. Un cambio de compromiso es sucesor + supersession, no overwrite. |

`COMMITMENT` → 0..N `ACTION`.
`COMMITMENT` ≠ `ACTION`.

### 5.4 HUMAN_DECLARED_CAUSE

| Campo | Norma |
|-------|--------|
| Definición | Explicación causal **declarada por una persona**. Ejemplo: «la caída fue por turismo». |
| Condición mínima | `raw_text` + tipo + provenance. |
| Permite afirmar | Que X atribuyó la causa a Y en ese contexto. |
| No permite afirmar | `EVIDENCE_DERIVED_CAUSE`, `VERIFIED_CAUSE`, `MODEL_HYPOTHESIS`, «Y causó X». |
| Relaciones | Puede referenciar otro event (commitment, proposal) de forma opcional. |
| Corrección | Sí. |

La autoridad del speaker **no** convierte la causa en hecho.

### 5.5 CORRECTION

| Campo | Norma |
|-------|--------|
| Definición | Corrección **explícita** de un objeto o afirmación anterior de este dominio. |
| Condición mínima | `raw_text` + tipo + `corrects_event_ref` (el original) + provenance. |
| Permite afirmar | Que se registró una corrección; el original permanece consultable. |
| No permite afirmar | Borrado del original; que el contenido nuevo es ACTUAL/FINAL; `financial_state=SUPERSEDED`. |
| Relaciones | Ver §6. |
| Corrección | Una corrección puede ser a su vez supersedida. |

---

## 6. Corrección vs supersession

Dos conceptos distintos:

| Concepto | Qué es |
|----------|--------|
| `CORRECTION` | **Tipo de event.** El acto de corregir. |
| Relación de supersession | El original deja de ser la **atestación vigente**; el sucesor lo es. |

Patrón: **nuevo event + referencia al original. Sin overwrite destructivo.**

El sucesor puede ser:

- un `CORRECTION` (mínimo), o
- un event del mismo tipo que el original (p. ej. nuevo `COMMITMENT` de 35 t) **más** un `CORRECTION` o un `supersedes_event_ref` en el sucesor.

El original pasa a vigencia `SUPERSEDED` (de este dominio). Histórico consultable.
Campos conceptuales: `supersedes_event_ref` / `corrects_event_ref`, actor de corrección, `corrected_at`, `reason_text` (null si no se dijo).

Ejemplos:

| Frase | Norma |
|-------|--------|
| «No eran 40, son 35» | Sucesor con payload 35; original 40 → vigencia SUPERSEDED |
| «La planta correcta es Puebla» | Sucesor con otro scope; original SUPERSEDED |
| «Cambio mi compromiso» | Nuevo `COMMITMENT` + supersession |
| Canal mal clasificado | `CORRECTION` de dato; **no** es `FINANCIAL_ACTUAL_RECONCILIATION_GAP` |

**Prohibido** reutilizar `igf.versions.financial_state = SUPERSEDED` como semántica universal.

Patrón constitucional reusado (VI, impugnación): valor anterior, valor nuevo, quién, cuándo, motivo; el histórico de fuentes no se borra. Esto **no** es un IES alternativo.

---

## 7. Actor e identidad

Separar siempre:

| Rol | Significado |
|-----|-------------|
| `declared_by` | Quién **supuestamente** hizo la declaración (speaker / actor del enunciado) |
| `captured_by` | Quién registró la atestación (usuario autenticado en captura manual) |
| `extracted_by` | Componente que extrajo un candidato (nunca es el autor del contenido) |
| `source` | Origen de evidencia (manual, transcript, bitácora, audio, notas, chat) |

`captured_by` ≠ `declared_by`. El director puede registrar lo que dijo Rogelio.

### Modos de `declared_by` (v1.0)

| Modo | Norma |
|------|--------|
| `KNOWN_USER` | `usuario_id` resoluble. No inventar. |
| `KNOWN_ROLE` | Rol conocido; persona no resoluble. |
| `FREE_TEXT_SPEAKER` | Nombre o etiqueta de transcript («Rogelio») sin user id. |
| `UNKNOWN` | Se declaró; speaker no atribuible. |

Prohibido:

- nombre en transcript → `KNOWN_USER` automático
- role → identidad individual
- `extracted_by` como `declared_by` (patrón 03A)

---

## 8. Provenance mínima para RECORDED

Un event `RECORDED` es defendible solo si existen:

| Elemento | Obligatorio | Null / UNKNOWN |
|----------|-------------|----------------|
| Identidad de event | Sí | No |
| `event_type` | Sí | No |
| `attestation_state` (`RECORDED` en v1.0) | Sí | No |
| `raw_text` | Sí | No |
| `source_type` | Sí | — |
| `captured_by` (captura manual) | Sí | — |
| `captured_at` | Sí | — |
| `extracted_by` | Sí si hubo extracción; en manual = proceso de captura humana | — |
| `declared_by` modo | Sí | User/role/texto pueden ser null |
| `declared_at` | No | Preferible UNKNOWN a inventar |
| `meeting_ref` / context ref | No | Sí (ref externa; no hay meeting store canónico) |
| `source_id` / location-offset | No | Sí |
| Scope / period / quantity | No | UNKNOWN preferible a inventar |
| `corrects` / `supersedes` | Si es corrección o sucesor | — |
| `baseline_ref` | No | No inventar; PRE_CLOSE no se copia solo |

Constitución VII (esta declaración): v1.0 **no** produce ObservationRecord N1 y **no** alimenta IES. Una proyección futura debe preservar este linaje (03A/EB) sin convertir el contenido en hecho.

---

## 9. Value, scope, period, baseline

### 9.1 Quantity payload (opcional)

Cuando la declaración trae métrica estructurable **necesaria** para trazabilidad (p. ej. +40 t), el free text **no** es representación semántica suficiente: debe preservarse payload.

| Campo conceptual | Uso |
|------------------|-----|
| `metric` | venta_ton, descuento, HG, gasto, resultado_importe, other |
| `value` y/o `delta` | Absoluto y/o cambio |
| `unit` | t, $, $/L, etc. |
| `period` | Si se declaró |

Si no hay número («hay que revisar el descuento»): payload null + `raw_text`. No inventar.

### 9.2 Scope

`scope_kind` ∈ {`PLANT`, `MULTI_PLANT`, `ZONE`, `OTHER_EXPLICIT`, `UNKNOWN`}.

Scope del **event** ≠ authz del lector/escritor. No mezclar.
No inventar autoridad de zona ni total financiero regional.

### 9.3 Period

Preservar YYYY-MM, fecha, rango u otro periodo **explícito** en la declaración.
Prohibido inferir el mes de la junta si el contenido habla de otro periodo.

### 9.4 Baseline

Si el enunciado es un cambio (+40 t, bajar descuento), puede guardarse `baseline_ref` **cuando exista**.
No inventar. PRE_CLOSE puede ser fuente futura; **no** se copia automáticamente a este store.

---

## 10. Frontera Action Register

`EXECUTIVE_STEERING_EVENT` **no** vive semánticamente como Action Register.

| | COMMITMENT | ACTION |
|--|------------|--------|
| Semántica | Resultado/cierre asumido | Trabajo asignado |
| Store | Este dominio | `arr.action_register_items` / DICF |
| «compromiso» DICF | — | Fecha de ejecución de la acción |

Linkage futuro `COMMITMENT` → 0..N `ACTION`: permitido, no obligatorio, no automático en v1.0.
`LINK_ACTION` con autoridad organizacional: `AUTHZ_DECISION_REQUIRED`.

---

## 11. Frontera FORECAST / TARGET / ACTUAL / FINAL

Ningún event muta automáticamente:

- IGF FORECAST
- `TARGET_COMMITMENT` / `igf_meta`
- ARR / `ACTUAL_COMMERCIAL`
- `ACTUAL_FINANCIAL`
- FINAL

Ningún `COMMITMENT` se convierte solo en forecast.
Ninguna `DECISION` modifica sola fuentes operacionales.
Esas proyecciones exigirían contratos y runtime propios.

---

## 12. Frontera SCENARIO / WHAT-IF

**Fuera de v1.0.** No se crea tipo `SCENARIO`.

«Si hacemos X podríamos lograr Y» = candidato de escenario / what-if.
**No** es `COMMITMENT` salvo declaración **explícita** de asunción.

Live o Plaud no cambian esta frontera.

---

## 13. Extracción automática y Plaud

```
SOURCE (p. ej. PLAUD_TRANSCRIPT)
  → evidencia de origen
  → EXTRACTED_CANDIDATE   (FUTURE)
  → captura humana gubernada
  → RECORDED
```

Plaud es **una posible fuente**, no el dominio. El modelo canónico no es Plaud-specific. Runtime Plaud = fuera de este contrato.

El modelo (LLM u extractor) **puede:** detectar candidato, clasificar, extraer campos, enlazar evidencia, pedir confirmación.

El modelo **no puede:** atribuir speaker desconocido como `KNOWN_USER`; confirmar autoridad; aprobar decisión; confirmar commitment organizacional; inventar quantity, period, plant o cause.

`LIVE` no otorga mayor autoridad que una fuente asíncrona.

---

## 14. Frontera IES / Evidence Builder

`EXECUTIVE_STEERING_EVENT` **no** es evidencia IES directa.

Vive en **domain store**. Se proyecta o adapta a ObservationRecord / IES **solo** cuando un ciclo constitucional futuro lo use, preservando `declared_by` vs `extracted_by` (03A) y **sin** convertir el contenido en hecho de venta, causa o FINAL.

v1.0: cero IES, cero Evidence Builder runtime.

`IES_REVIEW_REQUIRED` = sí, **antes de** cualquier proyección a IES.
`02` / `04`: **no** se modifican por este archivo.

---

## 15. Frontera Reasoning Engine

| Objeto | Puede ser evidencia de | No es evidencia suficiente de |
|--------|------------------------|-------------------------------|
| `COMMITMENT` RECORDED | «X declaró/registró un compromiso» | «X cumplirá» / «X cumplió» |
| `HUMAN_DECLARED_CAUSE` | «X atribuyó la causa a Y» | «Y causó X» |
| `PROPOSAL` / `DECISION` | Que se registró proponer / decidir | Ejecución o actual |

`MODEL_HYPOTHESIS` solo en N5 (`05`). Guardar un event **no** emite hipótesis.

`RE_REVIEW_REQUIRED` = sí, **antes de** que N5 razone sobre estos objetos.
`05`: **no** se modifica por este archivo.

---

## 16. Constitución

`CONSTITUTION_CHANGE_NOT_REQUIRED.`

Compatible con: hecho ≠ evidencia ≠ hipótesis; no fabricación; impugnación sin borrar histórico; VII (esta declaración de no-alimentación IES).

No se añade truth class constitucional. `COMMITMENT` / `HUMAN_DECLARED_CAUSE` son tipos de **dominio**, no clases N1.

---

## 17. AUTHZ (límite, no matriz)

**`AUTHZ_DECISION_REQUIRED`** para autoridad **superior** a la mera atestación `RECORDED` del first slice futuro:

`CONFIRM` · `APPROVE` · `CORRECT` / `SUPERSEDE` de terceros · `LINK_ACTION` organizacional

Captura/atestación ≠ autoridad organizacional.

No se inventa quién confirma.
No se asume que ZP/AD heredan permisos de ACTUAL_FINANCIAL.
`acceso_igf_forecast_kpis` no autoriza commitment.
Speaker ≠ authenticated actor.

VIEW / CREATE `RECORDED` de first slice físico futuro: fuera de este archivo (ARCH física + authz de planta existente). Este contrato no abre runtime.

---

## 18. Compatibilidad Consejo / post-cierre / live

Sin implementar.

Cadena futura consultable:

```
PRE_CLOSE baseline (externo, requery)
  → PROPOSAL → DECISION → COMMITMENT
  → FINAL / ACTUAL (externos: month_close / ACTUAL_FINANCIAL / ARR)
  → OUTCOME (evaluación futura; no este store)
```

Post-cierre puede comparar expected (payload + period + scope) contra actual/final **externo**.
**No** se crea `FULFILLED` automáticamente.

Live: mismos tipos y estados; fuente live ≠ mayor autoridad.

---

## 19. Shape conceptual (no SQL)

Normativo para que una ARCH física no reinterprete semántica. **No** son columnas PostgreSQL.

```
EXECUTIVE_STEERING_EVENT
  event_identity
  event_type                    # uno de los cinco
  attestation_state             # v1.0: RECORDED
  vigor                         # current | SUPERSEDED (dominio)
  raw_text
  declared_by { mode, user_id?, role?, display_text? }
  captured_by
  extracted_by?
  captured_at
  declared_at?
  source { type, id?, location? }
  meeting_ref?
  scope { kind, plant_ids?, label? }
  period?
  quantity_payload? { metric, value?, delta?, unit? }
  baseline_ref?
  proposal_event_ref?           # solo DECISION, opcional
  corrects_event_ref?           # CORRECTION / sucesor
  supersedes_event_ref?
  reason_text?
  decision_outcome?             # solo DECISION
```

UNKNOWN / null **obligatorio** cuando el dato no está demostrado.
No hay meeting store canónico: `meeting_ref` es referencia externa.

---

## 20. Implementation gate (este contrato no lo abre)

Cerrado hasta, como mínimo:

1. Este archivo v1.0 congelado por humano (G3 / revisión de esta tarea)
2. ARCH física de persistencia (sin reinterpretar esta semántica)
3. G2 Index (`—`) y G2 inventario / EKE **después** de existir runtime o cuando HUMAN_APPROVER lo autorice
4. `AUTHZ_DECISION` **antes** de `CONFIRMED` organizacional o SUPERSEDE ajeno
5. `IES_REVIEW` **antes** de proyectar a IES
6. `RE_REVIEW` **antes** de N5 sobre estos objetos

Sin schema, API, UI, Plaud, Consejo, what-if, live ni proyección a Action Register por este documento.

G2 posteriores **no** forman parte de este archivo.

---

# Control documental

| Campo | Valor |
|-------|--------|
| Documento | `EXECUTIVE-STEERING-CAPTURE-CONTRACT.md` |
| Versión | 1.0 |
| Estado | Creado bajo G3 autorizado; APPROVED_FOR_FREEZE de semántica; RUNTIME PENDING; AUTHZ_CONFIRMATION PENDING; IES no alimentado |
| Tipo | Contrato de dominio / capability |
| Orden Index (futuro G2) | `—` |
| Dependencia | Constitución; EKE; compatible con `02`, `03A`, `04` congelado, `05` congelado; no reusa SUPERSEDED financiero |
| Implementación | PROHIBIDA por este documento |
