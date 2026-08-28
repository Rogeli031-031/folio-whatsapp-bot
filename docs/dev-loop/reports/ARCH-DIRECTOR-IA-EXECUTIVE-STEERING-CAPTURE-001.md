# ARCH-DIRECTOR-IA-EXECUTIVE-STEERING-CAPTURE-001

```yaml
task_id: "ARCH-DIRECTOR-IA-EXECUTIVE-STEERING-CAPTURE-001"
outcome: "DONE_PENDING_REVIEW"
readiness: "READY_WITH_LIMITS"
implementation: false
code_changes: false
test_changes: false
sql_changes: false
canonical_docs_changes: false
g2_created: false
g3_created: false
constitution_touched: false
ies_04_touched: false
re_05_touched: false
matrix_changes: false
authz_decision_required_before_confirm: true
authz_decision_required_before_first_slice_recorded: false
g3_required_before_impl: true
next_task: "DOCS-DIRECTOR-IA-EXECUTIVE-STEERING-CAPTURE-CONTRACT-001"
next_task_authorized: false
next_task_executed: false
global_before: "10.5 / 20 = 52.5%"
global_after: "10.5 / 20 = 52.5%"
gain_pp: 0.0
secrets_check: "none"
```

## 1. Executive verdict

**Readiness:** `READY_WITH_LIMITS`

**Objeto canónico:** un evento genérico `EXECUTIVE_STEERING_EVENT` del cual `PROPOSAL`, `DECISION`, `COMMITMENT`, `HUMAN_DECLARED_CAUSE` y `CORRECTION` son **tipos**, no stores separados ni un blob de junta.

**Principio no negociable:** capturar no es verificar. Un compromiso humano no es venta, ni FORECAST, ni `TARGET_COMMITMENT`, ni Action Register, ni FINAL, ni causa demostrada.

Esta ARCH diseña el fundamento semántico. **No** implementa captura, Consejo, Plaud, live copilot, what-if ni post-cierre.

**First slice futuro (no autorizado):** captura **manual** de los cinco tipos, en estado `RECORDED` (atestación del usuario de sesión), store dedicado. Sin extracción Plaud. Sin confirmación organizacional. Sin evaluación de cumplimiento.

**Siguiente tarea (una, no autorizada):** `DOCS-DIRECTOR-IA-EXECUTIVE-STEERING-CAPTURE-CONTRACT-001` (G3 de dominio). Congela las separaciones antes de cualquier IMPL. No es IMPL.

---

## 2. Contract audit

Inspección read-only. Qué **ya** permite representar origen humano y qué exigiría gates.

| Contrato | Qué ya permite | Qué no cubre | Gate si se toca |
|---|---|---|---|
| Constitución I–V, VIII | Hecho ≠ evidencia ≠ diagnóstico ≠ hipótesis. LLM no inventa hechos. Impugnación (VI): valor anterior/nuevo, usuario, fecha, motivo, sin borrar histórico | No define proposal/decision/commitment de junta | `CONSTITUTION_REVIEW` **no** si no se añade clase de verdad constitucional |
| Constitución VII | Toda **nueva fuente** declara cómo produce observaciones y alimenta el IES | Un store de junta que **no** alimente IES en el first slice debe **declararlo** | Cubierto por G3 de dominio (esta declaración), no por reformar I–V |
| EKE | `Meeting statement ≠ verdad`. `Forecast ≠ commitment`. `DECISION_NEEDED ≠ decisión tomada`. PRE_CLOSE no persiste commitment | No hay objeto persistible de junta | G2 inventario **después** de IMPL; no ahora |
| 02 Evidence Builder | Linaje: `content_author_id` nullable, `extracted_by` ≠ autor, consenso humano ≠ independencia | No tipa PROPOSAL/COMMITMENT | No tocar `02` |
| 03A | Autor no resoluble = `null`, no inventar id. `extracted_by` nunca se presenta como autor | No es store de junta | Reusar el **patrón**, no el runtime |
| 04 IES | Evidencia ancla en observaciones/hechos. Runtime IES **pendiente** | COMMITMENT no es observation N1 automática | `IES_REVIEW` solo si se proyecta a IES |
| 05 RE | Única capa de hipótesis. Causa probable → `hypotheses[]`. Prohibido “la causa es” sin demostración | HUMAN_DECLARED_CAUSE no es hipótesis N5 | `RE_REVIEW` solo si se razona N5 sobre estos objetos |
| Index / CAPACIDADES | PRE_CLOSE `SUPPORTED_WITHIN_PRE_CLOSE`; ACTUAL_FINANCIAL solo en month_close | Capture no inventariado | G2 **después** de IMPL |
| FINANCIAL-ACTUAL-EVIDENCE-CONTRACT | `SUPERSEDED` = versión financiera FINAL sustituida | **Prohibido** reusar como supersession de claims humanos | No tocar |
| Action Register / DICF | Trabajo asignado; “compromiso” DICF = fecha de ejecución | No cantidad/unidad/baseline de cierre | No extender como store |

**Determinación:** los contratos **permiten** un store de dominio de statements humanos **si** no se promocionan a hecho/evidencia/IES/FORECAST/FINAL. **No** definen la taxonomía. Eso es G3 de dominio, no Constitución.

---

## 3. Current physical stores

| Store | Qué guarda | ¿Sirve como capture? |
|---|---|---|
| PRE_CLOSE composer | Pack efímero current/target/forecast/gaps/`DECISION_NEEDED`. Claves `human_commitment` / `proposed_intervention` **baneadas** | Baseline **A**. No captura |
| `month_close_result` + ACTUAL_FINANCIAL | Cierre oficial; FINAL si sello | Capa **E**. No B–D |
| `arr.action_register_items` | `title`, responsable, `due_date`, `closed`, planta, attachments | ACTION. Ver §9 |
| `arr.dicf_acciones` | Acción de cliente; `fecha_compromiso` = deadline operativo; `resultado_cierre` TEXT | No +40 t |
| Bitácora `arr.director_ia_bitacora` | `planta`, `fecha`, `tipo` (incl. `junta_consejo`), `fuente` (incl. `plaud`), `contenido TEXT`, `resumen_ia` | SOURCE EVIDENCE textual. No tipado |
| Conversation state | Efímero; no DB; history ≠ evidencia | No |
| Persistent memory | `pending_work_items_only`; MEMORY ≠ EVIDENCE | No |
| `arr.cliente_comentarios` / `public.comentarios` | Texto de cliente/folio | No |
| IGF `compromiso_lines` / `igf_meta` | FORECAST / TARGET_COMMITMENT | Trampa de nombre. No junta |
| Reviewable overlay | ESCENARIO HIPOTÉTICO en memoria | WHAT_IF de folio. No compromiso |
| Meeting entity | **No existe** `meeting_id` en runtime | Ver §20 |

No se reinterpreta ninguno de estos sistemas.

---

## 4. Canonical object selection

Comparación (Pregunta 1). **No SQL.**

| Opción | Provenance | Corrección | Consejo | Plaud/live | Duplicar verdad | ACTION=COMMITMENT |
|---|---|---|---|---|---|---|
| **A. Evento genérico tipado** | Un envelope | Relación `supersedes` uniforme | Query por tipo | Candidatos del mismo envelope | Baja si tipos son estrictos | Evitable |
| B. Stores por tipo | Repetida | Cinco mecanismos | Cinco joins | Cinco extractores | Alta | Evitable con costo |
| C. Meeting-summary blob | Se pierde por campo | Overwrite típico | Texto | Dump | Alta | Irrelevante y peor |
| D. Extender Action Register | Prestada | `closed` ≠ supersede | Contamina AR | Forzada | **Alta** | **Colapso** |

**Selección: A** — `EXECUTIVE_STEERING_EVENT` + `event_type`.

Criterio causal: corrección, Plaud y live emiten el **mismo** envelope; Consejo filtra por tipo; AR queda fuera.

---

## 5. Taxonomy

Mínimo exigido por EVAL-003. Sin tipos estéticos.

El envelope **es** el statement. **No** se crea tipo `MEETING_STATEMENT` aparte.

| Tipo | Significa | No significa | Origen | ¿Confirmación organizacional? | ¿Puede superseder? | Evaluación posterior |
|---|---|---|---|---|---|---|
| `PROPOSAL` | Intervención o cifra **propuesta** (“subir desc”, “+40 t”) | Decisión, compromiso, forecast, actual | Humano (o candidato extraído) | No para existir como `RECORDED`. Sí para usarse como “aprobada” → eso es `DECISION` | Sí, por `CORRECTION` u otra `PROPOSAL` | Consejo: “qué se propuso”. No se “cumple” una proposal |
| `DECISION` | Aceptación, rechazo o pendiente **explícita** | Proposal, commitment, `DECISION_NEEDED` de PRE_CLOSE | Humano | `RECORDED` atestigua que se registró. `CONFIRMED` (org) diferido | Sí | Consejo capa C. Outcome ∈ {accepted, rejected, pending} |
| `COMMITMENT` | El emisor **asume** un resultado/acción de cierre cuantificable o cualitativa (“Acapulco recupera +40 t”) | Venta, FORECAST, `igf_meta`, ACTION, FINAL, escenario “si…” | Humano | Transcript **nunca** crea `CONFIRMED`. First slice solo `RECORDED` | Sí (cambio de compromiso) | Post-close / Consejo: esperado vs actual **si** hay métrica+periodo+scope |
| `HUMAN_DECLARED_CAUSE` | Explicación **dicha** por humano (“bajamos por turismo”) | Causa evidenciada, hipótesis N5, hecho | Humano | Candidato/RECORDED. Nunca “causa demostrada” por confirmar | Sí | Consejo F: explicación **atribuida**, no demostrada |
| `CORRECTION` | “No eran X, son Y” / “el canal estaba mal” / “la planta era otra” | SUPERSEDED financiero; cierre de acción | Humano | Obligatoria para que el objeto corregido quede `SUPERSEDED` de forma canónica. First slice: el recorder puede corregir **sus** `RECORDED` | Es el vehículo de supersession | Preserva old+new |

**No se crean ahora:**

| Tipo tentado | Por qué no |
|---|---|
| `REJECTION` | Es `DECISION.outcome=rejected` |
| `QUESTION` | Ya existe `DECISION_NEEDED` en PRE_CLOSE (pregunta, no captura) |
| `ASSUMPTION` | Cabe en texto/payload de `PROPOSAL` |
| `SCENARIO_REFERENCE` | Fuera del first model (§19) |
| `ACTION_LINK` | Relación opcional futura, no tipo |

---

## 6. State / confirmation model

Estados de **registro**, no de cumplimiento.

| Estado | Significado | Quién puede crearlo |
|---|---|---|
| `EXTRACTED_CANDIDATE` | Extraído de transcript/live/LLM. No es objeto canónico de Consejo | Extractor automático |
| `RECORDED` | Un humano autenticado **registró** el evento. Atestación, no ratificación institucional | Input manual |
| `CONFIRMED` | Autoridad organizacional acepta el objeto como capture canónico | **No diseñado.** `AUTHZ_DECISION_REQUIRED` |
| `REJECTED` | Un candidato se descarta. ≠ `DECISION.outcome=rejected` | Humano sobre candidato |
| `SUPERSEDED` | Este event_id dejó de ser la versión vigente; el sucesor apunta a él | Vía `CORRECTION` u objeto sucesor |

**¿Una transcripción puede crear un COMMITMENT `CONFIRMED`?**

**No.** Ningún contrato vigente otorga a Plaud ni al LLM autoridad de compromiso.

| Productor | Puede crear | No puede crear |
|---|---|---|
| Input manual humano | `RECORDED` de cualquier tipo | `CONFIRMED` org. en first slice |
| Extracción Plaud | Solo `EXTRACTED_CANDIDATE` | `RECORDED`, `CONFIRMED`, `COMMITMENT` canónico |
| Live copilot futuro | Solo `EXTRACTED_CANDIDATE` | Confirmación |
| Inferencia Director IA | Candidato + clasificación + linkage propuesto + pregunta de confirmación | Compromiso, decisión, actor, cantidad |

Separación (sin nueva truth class constitucional):

- `EXTRACTED_CANDIDATE` — adquisición
- `RECORDED` / futuro `CONFIRMED` — captura humana
- `MODEL_HYPOTHESIS` — solo RE N5, **fuera** de este store

---

## 7. Actor identity

Identidad **física hoy:**

| Concepto | ¿Existe? |
|---|---|
| Usuario autenticado | Sí (`usuarios`, JWT `dashboardAuth`) |
| Rol JWT | ZP / AD / GG / GA / GV / CF_CDMX (colapso; ver DECISION AUTHZ financiera) |
| Responsable AR/DICF | Sí, de **acción** |
| Participante de junta | **No** |
| Speaker / diarización | **No** |
| Gerente de planta como rol de meeting | GG ≈ gerente; **no** es “speaker de Plaud” |

El actor del evento admite **exactamente** estos modos (alineados a 03A: no inventar `content_author_id`):

| Modo | Uso |
|---|---|
| `KNOWN_USER` | `usuario_id` resoluble |
| `KNOWN_ROLE` | Rol conocido, persona no resoluble (“el ZP dijo…”) |
| `FREE_TEXT_SPEAKER` | “Rogelio: vamos por 1,177” sin user id |
| `UNKNOWN` | Se dijo; no hay speaker |

Campos conceptuales: `actor_mode`, `actor_user_id` (null si no KNOWN_USER), `actor_role` (null ok), `actor_display_text` (null ok), `recorded_by_user_id` (siempre el autenticado en input manual).

`recorded_by` ≠ `actor`. El director puede registrar lo que dijo Rogelio.

---

## 8. Grain / value semantics

**Grain:** un `event_id` es la unidad. Un meeting puede tener N events. Un event **no** exige planta, número, periodo ni responsable.

| Campo conceptual | Obligatorio | Null/unknown |
|---|---|---|
| `event_id` | Sí | No |
| `event_type` | Sí | No |
| `registration_state` | Sí | No |
| `recorded_by` / `captured_at` | Sí en manual | — |
| `raw_text` | Sí | No (siempre hay enunciado) |
| `meeting_ref` | No | Sí |
| `plant_id` / `scope` | No | `UNKNOWN` / zona / multi explícito |
| `period` | No | Sí |
| `metric` / `value` / `unit` | No | Sí |
| `baseline_ref` | No | Sí (p. ej. PRE_CLOSE requery key) |
| `actor_*` | Modo sí | User/role/texto pueden ser null |
| `declared_at` | No | Distinto de `captured_at` |
| `supersedes_event_id` | No | Sí |

**Valores (Pregunta 6):** free text **solo** no basta para Consejo. Tampoco se fuerzan números.

Estructura conceptual **opcional** por evento (`quantity_payload`):

- `metric` (venta_ton, descuento, HG, gasto, resultado_importe, other)
- `value` / `delta` (uno u otro, o ambos)
- `unit`
- `baseline` (cifra de partida si se declaró)
- `period`

Si no hay número: payload null + `raw_text`. EVAL-003 “cuidar que se cumpla” sin cifra propia de planta = texto, no inventar 632k a nivel planta.

---

## 9. Action Register relationship

**`SEPARATE_COMMITMENT_MODEL_REQUIRED`**

Demostración física (NEXT_GAP + schema):

| | COMMITMENT “Acapulco +40 t” | ACTION “Juan llama al cliente mañana” |
|---|---|---|
| Objeto | Resultado/cierre asumido | Trabajo asignado |
| Cantidad/unidad/baseline | Necesarios para Consejo | No existen en `action_register_items` |
| `due_date` / `closed` | Periodo de compromiso ≠ due de tarea | Deadline y cierre de ítem |
| Evidencia | Provenance de junta | Attachments de archivo |
| Cumplimiento | Vs ARR/FINAL del periodo | `closed=true` |

Relación futura **permitida, no automática:**

`COMMITMENT` → 0..N `ACTION` (`action_link`)

First slice: **no** crea acciones al registrar un compromiso. No se diseña el link como obligatorio.

---

## 10. Proposal / decision semantics

| Enunciado | Tipo | Outcome |
|---|---|---|
| “Propongo subir descuento” | `PROPOSAL` | — |
| “Se aprueba subir descuento” | `DECISION` | `accepted` |
| “No se aprueba” | `DECISION` | `rejected` |
| Recorte Querétaro incompleto | `DECISION` | `pending` |

`DECISION` **puede** referenciar `proposal_event_id`. **No es obligatorio.** Una decisión puede nacer sin proposal capturada.

Lifecycle mínimo de proposal: `RECORDED` → (opcional) referenciada por `DECISION` → (opcional) `SUPERSEDED` por `CORRECTION`.

No colapsar proposal aceptada en commitment. “Se aprueba intentar +40” puede ser `DECISION` + `COMMITMENT` **dos** events, o solo `DECISION` si nadie asumió el número.

---

## 11. Commitment semantics

**Capture (esta ARCH):**

| Fase | ¿En first architecture? |
|---|---|
| created (`RECORDED`) | Sí |
| confirmed (org) | Diferido; AUTHZ |
| changed / superseded | Sí, vía `CORRECTION` + sucesor |
| cancelled | Sí como `CORRECTION`/`DECISION` que anula; el original queda `SUPERSEDED` o referenciado |
| fulfilled / partial / not_fulfilled | **No.** Son POST_CLOSE |

Metadata que **sí** debe poder capturarse ahora para no bloquear post-cierre:

- scope (planta / zona / multi)
- period
- metric / value o delta / unit
- baseline_ref opcional (PRE_CLOSE)
- actor
- raw_text
- provenance

No se eligen “estados de outcome” finales: no hay evidencia de motor de cumplimiento. El evaluador futuro los derivará.

---

## 12. Correction / supersession

Patrón: **nuevo event + relación `supersedes_event_id`**. Sin overwrite. Sin `financial_state=SUPERSEDED`.

El sucesor (`CORRECTION` u objeto del mismo tipo) apunta al original. El original pasa a `SUPERSEDED`. Histórico consultable.

Campos conceptuales: `supersedes_event_id`, `corrected_by` (recorded_by o actor), `corrected_at`, `source`, `reason_text` (null si no se dijo).

Casos:

| Frase | Representación |
|---|---|
| “No eran 40, son 35” | Nuevo `COMMITMENT` o `PROPOSAL` con payload 35; `supersedes` el de 40 |
| “Esa cifra estaba mal” | `CORRECTION` sobre el event de la cifra; payload nuevo si se da |
| “Cambio mi compromiso” | Nuevo `COMMITMENT` + supersede |
| “La planta correcta era otra” | Sucesor con otro scope + supersede |
| Canal Acapulco mal clasificado | `CORRECTION` de **dato** (claim de calidad). No es commitment. No usa `FINANCIAL_ACTUAL_RECONCILIATION_GAP` |

Constitución VI (impugnación) ya exige old/new/quién/cuándo/motivo sin borrar histórico. Se **reusa el patrón**, no el IES alternativo.

---

## 13. Human-declared cause

| Clase | Dónde vive |
|---|---|
| `HUMAN_DECLARED_CAUSE` | Este store. Claim atribuido |
| `EVIDENCE_DERIVED_CAUSE` | Solo si IES+regla causal (hoy no en chat legado) |
| `MODEL_HYPOTHESIS` | Solo RE N5 |

“Bajamos por turismo” = `HUMAN_DECLARED_CAUSE` + provenance de junta. **No** se promociona a causal truth. **No** entra a `hypotheses[]` por el hecho de guardarse.

¿Evidence-backed claim? Es **source-backed** (reunión), no evidence-backed en sentido EB (hecho←observación).

¿Nueva semantic contract? **G3 de dominio** para fijar que este tipo ≠ causa N3/N5. No se reforma Constitución: VIII ya prohíbe hipótesis como hecho.

---

## 14. Provenance

Reusar patrón 03A/EB, no inventar familia nueva de ids.

| Campo | Origen del patrón |
|---|---|
| `source_type` | manual / plaud_transcript / meeting_audio / director_ia_chat / uploaded_notes / bitacora / other |
| `source_id` | id de bitácora, packet, etc. Nullable |
| `source_location` | offset/ts de transcript si existe; si no, null |
| `captured_at` | Siempre en manual |
| `extractor` | = `extracted_by`. En manual: `human_ui` / equivalente. Nunca es el autor del contenido |
| `extraction_confidence` | Solo si `EXTRACTED_CANDIDATE`. No en `RECORDED` |
| `content_author_*` | Actor del enunciado; null permitido |

Bitácora/Plaud = `source`, no el objeto.

---

## 15. Automatic extraction boundary

Flujo futuro (no implementar):

```
transcript / audio / notes
  → EXTRACTED_CANDIDATE (tipo tentativo)
  → humano acepta o REJECTED
  → RECORDED (first slice) o futuro CONFIRMED
```

| Tipo | ¿Confirmación humana para salir de CANDIDATE? |
|---|---|
| `PROPOSAL` | Sí para canónico. Candidato visible como “detectado, no registrado” |
| `DECISION` | **Sí** |
| `COMMITMENT` | **Sí** |
| `HUMAN_DECLARED_CAUSE` | **Sí** para atribuir. Candidato no se cita como explicación de Consejo |
| `CORRECTION` | **Sí** si supersede; si no, se reescribe historia |

First slice **no** incluye extractor.

---

## 16. LLM authority limits

| Permitido | Prohibido |
|---|---|
| Detectar candidato | Confirmar commitment |
| Clasificar tipo tentativo | Aprobar decision |
| Proponer linkage (proposal↔decision, commitment↔action) | Override de corrección |
| Pedir confirmación | Inventar actor (`KNOWN_USER`) |
| Señalar campos missing/unknown | Inventar quantity/unit/period |
| Negarse a colapsar scenario↔commitment | Tratar acuerdo entre cálculos como truth |

El chat legado actual **no** es Reasoning Engine. Un GPT de captura no emite hipótesis N5.

---

## 17. Council traceability

Sin runtime de Consejo. Cadena conceptual:

```
PRE_CLOSE (requery A)
  → PROPOSAL (B)
  → DECISION (C)
  → COMMITMENT (D)
  → FINAL oficial month_close / ACTUAL_FINANCIAL (E)
  → OUTCOME futuro (evaluación; no este store)
  → HUMAN_DECLARED_CAUSE + gaps oficiales (F)
  → ACTIONS abiertas + commitments no SUPERSEDED (G)
```

Para poder decir después “se comprometieron +40 t; se lograron +32 t” el `COMMITMENT` debe tener (cuando existan) scope, period, metric, value/delta, unit. El +32 sale de ARR/FINAL **externo**, no del store de capture. Si falta payload numérico, Consejo solo puede citar `raw_text`, no un delta inventado.

Identity mínima para esa frase: `event_id`, `event_type=COMMITMENT`, scope, period, quantity_payload, `registration_state`, `supersedes` chain.

---

## 18. Post-close prerequisites

El motor de outcome **no** se diseña. Para no bloquearlo, first capture debe poder persistir:

| Metadata | ¿Ahora? |
|---|---|
| expected value / delta | Sí, si se declaró |
| period | Sí, si se declaró |
| scope | Sí, si se declaró |
| metric / unit | Sí, si se declaró |
| actual comparator | **No** (vive en month_close/ARR/FINAL) |
| evaluation status | **No** |

---

## 19. Scenario boundary

`SCENARIO` / WHAT_IF **fuera** de este modelo.

| Frase | Clasificación |
|---|---|
| “Si damos 10 centavos, podríamos ganar 15 t” | Escenario. No se persiste como tipo de esta ARCH |
| “Nos comprometemos a +15 t” | `COMMITMENT` |

Zona +632 mil “si se cumple” = escenario condicionado, **no** commitment. First slice no crea `SCENARIO_REFERENCE`. Si alguien lo registra mal como commitment, una `CORRECTION` puede re-tipar vía sucesor (el sucesor sería… no hay tipo scenario; se registra como `PROPOSAL` condicional o se deja fuera). Recomendación: **no capturar +632 como COMMITMENT**.

---

## 20. Meeting entity

Hoy: no hay `meeting_id`. Bitácora es nota por planta/fecha/tipo/fuente.

| Opción | Veredicto |
|---|---|
| **A. Refs externas** (`source_id` / bitácora / packet) | **Seleccionada** |
| B. Meeting entity mínima | Prematura; duplicaría bitácora |
| C. Full meeting runtime | Fuera de alcance |

Los events **pueden** compartir un `meeting_ref` opaco externo. No se crea store de reuniones.

---

## 21. Multi-plant scope

| Scope | Cómo |
|---|---|
| Una planta | `plant_id` |
| Multi-planta | lista explícita; cada id filtrado por authz |
| Zona | `scope_kind=zone` + etiqueta; **no** suma financiera regional (PRE_CLOSE la prohíbe) |
| Unknown | `scope_kind=unknown` |

Lectura/escritura futura: **filtro de planta antes de devolver events**, mismo espíritu que PRE_CLOSE (`ZP`/`AD` ALL_PLANTS; `GG` ASSIGNED_PLANTS). Fail closed. Sin cross-plant leakage. GA/GV: no asumir VIEW; no hay permiso de capture hoy.

No se asigna a ZP autoridad de **confirmar** compromisos de todas las plantas por el hecho de ver PRE_CLOSE.

---

## 22. Authz

Roles físicos: JWT colapsa a ZP / AD / GG / GA / GV / CF. Permisos de catálogo (`acceso_acciones_dicf`, `acceso_igf_forecast_kpis`, …) **no** incluyen confirmación de junta. `acceso_igf_forecast_kpis` no autoriza P&L actual; tampoco autoriza commitment.

| Capacidad | ¿Hay regla física hoy? | First slice |
|---|---|---|
| VIEW | Plant authz PRE_CLOSE / month_close | Reutilizar: ZP/AD ALL; GG ASSIGNED; resto deny |
| CREATE_CANDIDATE | No | Fuera de first slice |
| CREATE `RECORDED` | Análogo bitácora: usuario con acceso a la planta | Permitido **solo** si VIEW de ese scope |
| CONFIRM org | **No existe** | Fuera. `AUTHZ_DECISION_REQUIRED` |
| CORRECT / SUPERSEDE propio `RECORDED` | No existe; razonable como dueño del registro | First slice: solo `recorded_by` |
| SUPERSEDE de terceros | No existe | `AUTHZ_DECISION_REQUIRED` |
| LINK_ACTION | No | Diferido |

**`AUTHZ_DECISION_REQUIRED`:** sí, **antes de implementar CONFIRM / SUPERSEDE ajeno**.
**No** bloquea el first slice `RECORDED` ni esta ARCH.

No se propone `DECISION-…-AUTHZ-001` como NEXT_TASK: el G3 debe congelar semántica primero; el DECISION de confirmación organizacional queda como prerrequisito de un slice **posterior**.

---

## 23. Contract gates

| Gate | ¿Esta ARCH? | ¿Antes de IMPL? | ¿Después? |
|---|---|---|---|
| `NO_CONTRACT_CHANGE` | Sí (este reporte) | — | — |
| `G3_DOMAIN_CONTRACT` | No se escribe | **Sí** — NEXT_TASK | — |
| `G2_SYNC` | No | No | Tras IMPL, inventario/Index/EKE mínimo |
| `IES_REVIEW` | No | No | Solo si se proyecta a IES |
| `RE_REVIEW` | No | No | Solo si N5 usa estos objects |
| `CONSTITUTION_REVIEW` | No | No | Solo si se propusiera truth class constitucional |

Qué puede diseñarse sin tocar contratos: **esta ARCH completa.**
Qué requiere G3: persistir tipos con nombres que parecen verdad (COMMITMENT, CAUSE) sin un contrato que prohíba colapsarlos.
IES: **no** acepta human-origin como observation en first slice.
RE: **no** distingue commitment todavía; no debe hacerlo el chat.

---

## 24. IES / EB boundary

¿Un COMMITMENT `CONFIRMED` (o `RECORDED`) se convierte en observation/evidence IES?

**No automáticamente.**

Vive en **domain store**. Se proyecta a ObservationRecord/IES **solo** cuando un ciclo constitucional futuro lo use, declarando `content_author_id` / `extracted_by` según 03A, **sin** convertir el commitment en hecho de venta.

First slice: cero IES, cero Evidence Builder runtime.

---

## 25. Storage options

| Opción | Integridad | Provenance | Supersession | Consejo/Plaud/live | Authz | Query | Migración |
|---|---|---|---|---|---|---|---|
| A. Extender AR | Mala | Prestada | `closed` | Contamina | AR | Por ítem | Alta corrupción |
| **B. Store de eventos de steering** | **Alta** | Nativa | Relación | Un modelo | Acotable | Por tipo/scope/period | Media (tabla nueva futura) |
| C. Claims/evidence genérico | Media | Buena | Posible | Mezcla con EB/IES | Difusa | Genérica | Riesgo de truth class |
| D. Meeting blob | Mala | Mala | Overwrite | Texto | Por nota | Mala | Falsa facilidad |
| E. DB existente (bitácora/IGF/meta) | Mala | Texto o forecast | No | No | Prestada | No | **Alta** |

**Selección: B.** Store dedicado de `EXECUTIVE_STEERING_EVENT`. No SQL en esta tarea. No se asume nombre de tabla.

---

## 26. First implementation slice

| Opción | Contenido | Veredicto |
|---|---|---|
| A | Manual PROPOSAL/DECISION/COMMITMENT/CORRECTION | Insuficiente: EVAL-003 exige causas verbales y es el mismo envelope |
| **B** | **A + HUMAN_DECLARED_CAUSE** | **Seleccionada** |
| C | A + Plaud candidates | Prematuro (sin confirmación ni extractor) |
| D | A + post-close evaluation | Mezcla capture con outcome |
| E | Everything | Fuera de mínimo |

B desbloquea B/C/D/F de Consejo y deja Plaud/live como el mismo envelope después.

Límites del slice: solo `RECORDED`; VIEW plant-scoped; sin CONFIRMED org; sin links AR; sin IES; sin UI de Consejo.

---

## 27. EVAL-003 validation

Clasificación **conceptual**. Las cifras **no** se copian a contratos.

| Hecho de sala | Tipo | Estado | No es |
|---|---|---|---|
| Puebla ~1,177 t / ~775 mil “cómo está quedando” | `PROPOSAL` de cifra intervenida (+ raw_text). No commitment salvo frase de asunción | `RECORDED` si un humano lo registra | FORECAST, FINAL, COMMITMENT automático |
| Acapulco +40 t / desc ~0.50 / terceros | `PROPOSAL` de intervención; `COMMITMENT` **solo** si el enunciado asume el +40 | Idem | ACTION, venta +40 |
| Canal Acapulco mal | `CORRECTION` (data claim) | Idem | `FINANCIAL_ACTUAL_RECONCILIATION_GAP`, commitment |
| Acuerdo entre dos cálculos | No es tipo de este store. Invariante: agreement ≠ truth | — | Truth |
| Querétaro +15 t | `PROPOSAL` | Idem | Commitment automático |
| Querétaro recorte incompleto | `DECISION` `pending` | Idem | Cierre |
| Morelos volumen que se reescribe | `COMMITMENT` + `CORRECTION`/sucesor | Cadena supersede | Un único número eterno |
| San Luis “vamos por este cierre” | `COMMITMENT` cualitativo (payload numérico unknown) | Idem | IGF latest |
| Zona +632 mil si se cumple | **Fuera** (scenario). Si alguien lo registra: como mucho `PROPOSAL` condicional, **no** `COMMITMENT` | — | Actual regional, FINAL |
| “Bajamos por turismo” / causas verbales | `HUMAN_DECLARED_CAUSE` | Idem | Causa N3/N5 |

---

## 28. Limitations

- Pack PRE_CLOSE no es acta sellada; `baseline_ref` es requery, no snapshot inmutable.
- EVAL-003 no depositó VTT crudo; la taxonomía usa clases, no timestamps de speaker.
- Identidad de speaker no resoluble: `FREE_TEXT_SPEAKER` / `UNKNOWN`.
- JWT no modela “participante de junta”.
- First slice no produce objeto canónico de Consejo (`CONFIRMED` org ausente).
- Zona / multi-planta sin total financiero (invariante PRE_CLOSE).
- Esta ARCH no congela el contrato G3; solo lo exige como NEXT_TASK.
- No se diseñó SQL, API, UI, extractor ni outcome engine.

---

## 29. Matrix impact

| | |
|---|---|
| Baseline | 10.5 / 20 = 52.5% |
| Después | 10.5 / 20 = 52.5% |
| Delta | **0.0 pp** |
| Matriz modificada | **No** |
| `MATRIX_REVIEW_REQUIRED` | **No** |

---

## 30. Final readiness

**`READY_WITH_LIMITS`**

| # | Output | Valor |
|---|---|---|
| 1 | Canonical object | `EXECUTIVE_STEERING_EVENT` (A) |
| 2 | Taxonomy | PROPOSAL, DECISION, COMMITMENT, HUMAN_DECLARED_CAUSE, CORRECTION |
| 3 | Confirmation | EXTRACTED_CANDIDATE / RECORDED / CONFIRMED(deferred) / REJECTED / SUPERSEDED |
| 4 | Actor | KNOWN_USER / KNOWN_ROLE / FREE_TEXT_SPEAKER / UNKNOWN |
| 5 | Grain | `event_id`; campos de negocio opcionales |
| 6 | Value | `quantity_payload` opcional + `raw_text` obligatorio |
| 7 | vs AR | `SEPARATE_COMMITMENT_MODEL_REQUIRED` |
| 8 | Proposal/decision | Tipos distintos; link opcional |
| 9 | Commitment lifecycle | Capture + supersession; outcome = POST_CLOSE |
| 10 | Correction | Nuevo event + `supersedes`; ≠ SUPERSEDED financiero |
| 11 | Cause | HUMAN_DECLARED_CAUSE; no causal truth |
| 12 | Provenance | Patrón 03A |
| 13 | Extraction | Solo CANDIDATE; humano para canónico |
| 14 | LLM | Detecta/clasifica/pregunta; no confirma |
| 15 | Council | Cadena A–G; E oficial externa |
| 16 | Post-close | Capturar expected/period/scope/metric |
| 17 | Scenario | Fuera |
| 18 | Meeting | Ref externa (A) |
| 19 | Multi-plant | Scope explícito; filter-first |
| 20 | AUTHZ | VIEW/RECORDED reusan planta; CONFIRM = decisión futura |
| 21 | Gates | G3 antes de IMPL; G2 tras IMPL; sin Constitución/IES/RE ahora |
| 22 | IES/EB | Domain first; no auto-observation |
| 23 | Storage | Store dedicado (B) |
| 24 | First slice | B (manual + cause, `RECORDED`) |
| 25 | Readiness | **READY_WITH_LIMITS** |

No `READY` (hace falta G3; CONFIRMED/Plaud/Council diferidos).
No `STOPPED` (no falta una decisión humana para **cerrar esta ARCH**).
No `BLOCKED` (no hay contradicción contractual).

---

## 31. Exactly one NEXT_TASK

**`DOCS-DIRECTOR-IA-EXECUTIVE-STEERING-CAPTURE-CONTRACT-001`**

| Campo | Valor |
|---|---|
| Tipo | **G3 / DOCS de dominio** |
| Por qué no IMPL | Persistible COMMITMENT/CAUSE sin contrato congela el colapso semántico |
| Por qué no DECISION AUTHZ | CONFIRM org no es el first slice; VIEW/RECORDED reusan authz de planta |
| Por qué no G2 | El inventario se sincroniza **después** de existir runtime |
| Alcance propuesto | Escribir el contrato de dominio que congele tipos, estados, provenance, anti-colapso, frontera IES/RE, y que first slice sea `RECORDED` only. Sin SQL, sin IMPL, sin Plaud |
| Autorizada | **No** |
| Ejecutada | **No** |

STOP. No commit. No push. No merge.
