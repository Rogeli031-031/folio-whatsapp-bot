# AUDIT-DIRECTOR-IA-EXECUTIVE-CYCLE-NEXT-GAP-001

```yaml
task_id: "AUDIT-DIRECTOR-IA-EXECUTIVE-CYCLE-NEXT-GAP-001"
outcome: "DONE_PENDING_REVIEW"
verdict: "NEXT_GAP_IDENTIFIED"
winning_gap: "EXECUTIVE_STEERING_CAPTURE"
next_task: "ARCH-DIRECTOR-IA-EXECUTIVE-STEERING-CAPTURE-001"
next_task_authorized: false
next_task_executed: false
implementation: false
code_changes: false
test_changes: false
canonical_docs_changes: false
matrix_changes: false
matrix_review_required: false
global_before: "10.5 / 20 = 52.5%"
global_after: "10.5 / 20 = 52.5%"
gain_pp: 0.0
secrets_check: "none"
```

## 1. Executive verdict

**Veredicto:** `NEXT_GAP_IDENTIFIED`

**Ganador único:** `EXECUTIVE_STEERING_CAPTURE`

**Pregunta de la tarea:** ¿cuál es el siguiente cuello **real** del ciclo ejecutivo después de PRE_CLOSE?

No es la siguiente pantalla ni la siguiente reunión. `COUNCIL_FINAL` es un `NEXT_STAGE` de alto valor, pero está bloqueado por un fundamento que aún no existe: un modelo semántico defendible de lo que **nace durante la junta** (propuesta, decisión, compromiso, causa declarada, corrección).

PRE_CLOSE ya puede preparar el tablero **antes** de entrar. EVAL-003 demostró que la sala produce objetos que PRE_CLOSE **correctamente no podía conocer**. Esos objetos no tienen hoy persistencia tipada. Sin ellos:

- Consejo solo compara FINAL oficial vs meta vs IGF, no vs lo que se propuso/comprometió.
- Post-cierre no puede preguntar “qué se comprometió y qué se cumplió”.
- Plaud, aunque entregue una transcripción perfecta, solo puede degradarse a texto libre.
- Live copilot no tiene dónde anclar claims efímeros.
- Un what-if se leería como forecast oficial o como compromiso.

`CLOSED_FINAL` oficial **ya tiene** composición parcial vía `month_close_result` + `ACTUAL_FINANCIAL` si hay FINAL. No es el cuello. Duplicarlo no acerca Consejo a lo que esta junta produjo.

**NEXT_TASK (no autorizada, no ejecutada):** `ARCH-DIRECTOR-IA-EXECUTIVE-STEERING-CAPTURE-001`

Esta auditoría **no** diseña schema, API, UI, truth class constitucional ni G3.

---

## 2. Current proven state

Tratado como hecho. Verificado contra código y contratos, no solo contra reportes.

### Ciclo (SUPPORTED / PARTIAL / MISSING / NOT_DEFENSIBLE / NOT_REQUIRED_NOW)

| Etapa | Clasificación | Evidencia física |
|---|---|---|
| OPEN_MONTH | **SUPPORTED** | ARR to-date, IGF FORECAST, daily, Action Register, reviewable overlay |
| PRE_CLOSE | **SUPPORTED_WITHIN_PRE_CLOSE** | Cadena ARCH→IMPL→AUDIT→FIX→REAUDIT PASS→DOCS SYNC. Composer `lib/director-ia-executive-cycle-composer.js` |
| CLOSED_NOT_FINAL | **PARTIAL** | `month_close_result` sin FINAL: comercial + target + FORECAST + gaps; `financial.actual` no se proyecta como actual |
| CLOSED_FINAL | **PARTIAL** | Mismas capas oficiales + `ACTUAL_FINANCIAL` si FINAL GLOBAL autorizada. **No** compone compromisos/escenarios de junta |
| COUNCIL_FINAL | **MISSING** | Requisito existe (EVAL-003 §17; EKE). `council_runtime=false`. Bitácora admite `tipo=junta_consejo` como texto |
| POST_CLOSE_FOLLOWUP | **MISSING** | No hay store de compromiso vs cumplimiento. AR ≠ compromiso de cierre |

### PRE_CLOSE — demostrado

Puede preparar, multi-planta autorizado, evidence requery:

| Capa | Truth class | Fuente |
|---|---|---|
| CURRENT | `ACTUAL_COMMERCIAL` to-date | ARR |
| TARGET | `TARGET_COMMITMENT` | `igf_meta` YYYY-MM exacto; missing ≠ 0 |
| BASE_FORECAST | `FORECAST` | `loadIgfCommitSnapshot` latest |
| ACTIONS | `ACTION` | Action Register; nota explícita `Action Register != commitment history` |
| REVIEWABLE | `REVIEWABLE` | overlay IGF live en memoria |
| RISK / GAPS / DECISION_NEEDED | seeds de pregunta | no son decisiones tomadas |
| PROVENANCE | sí | requery; pack no persistido |

Prohibido en el composer (claves baneadas no nulas): `proposed_intervention`, `human_commitment`, `closing_scenario`, `what_if_result`, `actual_financial`, `regional_total`. Refs nulos: `commitment_ref`, `scenario_ref`, `lesson_ref`. `council_runtime=false`. `live_copilot_runtime=false`.

No representa decisiones nacidas durante la junta.

### ACTUAL_FINANCIAL — demostrado

- `FINALIZATION_INFRASTRUCTURE` = IMPLEMENTED (`FORECAST` / `FINAL` / `SUPERSEDED` en `igf.versions`).
- Read model = `SUPPORTED_WITHIN_MONTH_CLOSE_RESULT`.
- **No** integrado a PRE_CLOSE. `ARCH-DIRECTOR-IA-PRE-MEETING-FINANCIAL-ACTUAL-001` permanece congelada.

### Consejo / Plaud — punto de partida

- Consejo: REQUIREMENT EXISTS; runtime no demostrado.
- Plaud: puede aportar evidencia de reuniones (bitácora `fuente=plaud`, contenido TEXT). No asumir runtime/live ingestion.

### State / routing

- `structured_conversation_state`: efímero, no DB, no cross-session, history ≠ evidencia (`lib/director-ia-conversation-state.js`).
- State PRE_CLOSE: `cycle_mode`, `portfolio_scope`, periodo, `parent_intent`. Pack no persistido.
- Persistent memory: `pending_work_items_only`. MEMORY ≠ EVIDENCE.

---

## 3. EVAL-003 residual evidence

Fuente: `docs/dev-loop/reports/AUDIT-DIRECTOR-IA-PLAUD-EXECUTIVE-CYCLE-EVAL-003.md`. Cruzada con el composer actual.

EVAL-003 midió **antes** de PRE_CLOSE. El cuello entonces era `pre_close_composition_missing`. Esa cadena ya cerró. El residuo **después** de PRE_CLOSE es exactamente lo que EVAL-003 clasificó como inconocible antes de entrar (§10) y como `MISSING_INFRASTRUCTURE` (§15).

| Ítem EVAL-003 | Tipo de sala | ¿PRE_CLOSE lo cubre ahora? | Residuo |
|---|---|---|---|
| P1 ~863 t Puebla | CURRENT | Sí (ARR to-date) | ninguno de conducción oficial |
| P2 ~1,126 t tendencia | BASE / FORECAST | Parcial (IGF official ≠ “tendencia de sala”) | no es el residuo ganador |
| P3 ~1,177 t / ~775 mil | CLOSING_SCENARIO | No. Clave baneada | **sí** |
| T2 +20 t CASA | INTERVENTION | No | **sí** |
| A1 +40 t / 0.50 terceros | INTERVENTION | No | **sí** |
| A2 canal Acapulco mal | corrección / data quality | No | **sí** |
| A3 acuerdo entre dos cálculos | agreement ≠ truth | Solo gap Finance vs ARR si FINAL | **sí** para canal |
| S1 San Luis “vamos por este cierre” | HUMAN_COMMITMENT | No | **sí** |
| M2 Morelos llamada en vivo | COMMITMENT / validación | No | **sí** |
| W1–W3 what-if | WHAT_IF | Overlay folio ≠ palanca de sala | **sí**, pero no como next foundation |
| Z3 +632 mil zonal | escenario condicionado | No; total regional prohibido | **sí** |
| Q1 / T3 recálculo en sala | resultado recalculado | No | **sí** |

Tasas históricas de EVAL-003 (congeladas; otro ritual): anticipated 1/24=4.2%, prepared 3/24=12.5%, unsupported 11/24=45.8%. No se re-miden aquí. No se usan para elegir el ganador por aritmética.

---

## 4. During-meeting gap analysis

Pregunta 1. Información que apareció **durante o después** de la junta y que PRE_CLOSE **correctamente** no podía conocer.

| Elemento | Estado | Tipo(s) de gap | Evidencia |
|---|---|---|---|
| Cifra propuesta (Puebla 1,177; Acapulco +40; Qro +15; Tehuacán +20) | **MISSING** | STATE_GAP + PERSISTENCE_GAP + COMPOSITION_GAP | Composer prohíbe `proposed_intervention`. No store |
| Intervención propuesta (desc 0.50, CASA, HG, recortes) | **MISSING** | STATE_GAP + PERSISTENCE_GAP | Idem. Overlay reviewable es folio IGF, no palanca de junta |
| Decisión aceptada / rechazada | **MISSING** | STATE_GAP + CONTRACT_GAP | `DECISION_NEEDED` = semilla de pregunta, no decisión humana |
| Compromiso humano (“Acapulco +40 t”) | **MISSING** | STATE_GAP + PERSISTENCE_GAP + CONTRACT_GAP | `igf_meta` ≠ compromiso de junta; `igf.compromiso_lines` = FORECAST |
| Responsable del compromiso | **PARTIAL** | SOURCE_GAP | AR/DICF tienen responsable de **acción**. No de volumen comprometido |
| Periodo del compromiso | **MISSING** | STATE_GAP | AR `due_date` es deadline de tarea, no periodo del +40 t |
| Causa declarada por humano | **MISSING** | CONTRACT_GAP + STATE_GAP | Constitución distingue hecho/evidencia/hipótesis. No hay `HUMAN_DECLARED_CAUSE` operacional |
| Corrección de dato (“no son X, son Y”) | **MISSING** | STATE_GAP + PERSISTENCE_GAP | SUPERSEDED financiero ≠ corrección de claim humano |
| Descubrimiento de error (canal Acapulco) | **MISSING** | SOURCE_GAP + CONTRACT_GAP | Mix CASA existe. No detector de canal inconsistente |
| Escenario discutido | **MISSING** | STATE_GAP + COMPOSITION_GAP | `closing_scenario` baneado. Versiones IGF = uploads, no as-of de junta |
| What-if | **PARTIAL** | CONTRACT_GAP + RUNTIME_GAP | Overlay folio `ESCENARIO HIPOTÉTICO` en memoria. No palanca desc+vol+HG de sala |
| Resultado recalculado en sala | **MISSING** | RUNTIME_GAP + PERSISTENCE_GAP | No hay recálculo de conducción persistido |
| Decisión pendiente (Querétaro recorte incompleto) | **PARTIAL** | COMPOSITION_GAP | PRE_CLOSE puede **preguntar** DECISION_NEEDED. No captura la pendiente **nacida** en sala |
| Acuerdo final | **MISSING** | STATE_GAP + PERSISTENCE_GAP | No objeto de acuerdo |
| Seguimiento posterior | **PARTIAL** | SOURCE_GAP | Solo si alguien abre una acción AR. El compromiso no se convierte solo |

`EXISTS_TODAY` en este ritual: únicamente el **baseline oficial** que PRE_CLOSE ya entrega (current / target / forecast / acciones abiertas / gaps oficiales). Eso no es residuo de junta.

`NOT_DEFENSIBLE`: inferir compromiso, causa o escenario desde Plaud/texto/chat.

`OUT_OF_SCOPE` de esta auditoría: diseñar el store, IES runtime, hardware live.

---

## 5. Action Register vs commitment

Pregunta 2. ¿Puede AR representar de forma defendible “Acapulco se compromete a recuperar +40 toneladas”?

### `arr.action_register_items` (físico, `server.js`)

| Campo pedido | ¿Existe? | Qué es realmente |
|---|---|---|
| acción | SÍ | `title` TEXT |
| responsable | SÍ | `responsable` TEXT + `responsable_usuario_id` |
| fecha | SÍ | `due_date` DATE |
| planta | SÍ | `planta_id` |
| estatus | SÍ | `closed` BOOLEAN |
| evidencia | PARCIAL | attachments de archivo; no evidencia cuantitativa del +40 t |
| cantidad comprometida | **NO** | — |
| unidad | **NO** | — |
| baseline | **NO** | — |
| target | **NO** | — |
| intervention | **NO** | — |
| source meeting | **NO** | — |
| accepted_by | **NO** | — |
| commitment timestamp | **NO** | `created_at` = alta de ítem |
| supersession / correction | **NO** | `closed` ≠ superseded |
| final outcome | **NO** | cerrado ≠ cumplido vs +40 t |

### `arr.dicf_acciones` (físico)

Tiene `estado` (`sin_compromiso`, `vencido`, …), `fecha_compromiso`, `resultado_cierre` TEXT. “Compromiso” aquí = **fecha en que el responsable se compromete a ejecutar la acción DICF**, no un compromiso ejecutivo de toneladas. `resultado_cierre` es texto libre de cierre operativo.

### Composer

`loadActionsSection` declara `truth_class: "ACTION"` y `note: "Action Register != commitment history"`.

### Determinación

**`SEPARATE_COMMITMENT_SEMANTICS_REQUIRED`**

No `ACTION_REGISTER_SUFFICIENT`.

No `ACTION_REGISTER_EXTENDABLE` como camino defendible: extender AR para guardar +40 t / baseline / accepted_by colapsaría ACTION con HUMAN_COMMITMENT y violaría la separación ya escrita en PRE_CLOSE, EVAL-003 §15 y EKE (“Forecast ≠ commitment”).

Esta auditoría **no** diseña el schema del compromiso.

---

## 6. CLOSED_FINAL analysis

Pregunta 4.

| Concepto | Qué es hoy | Clasificación |
|---|---|---|
| Mes calendario terminado | Hecho de calendario CDMX. **≠** FINAL | No sella verdad financiera |
| ARR comercial | `ACTUAL_COMMERCIAL` del mes en `month_close_result` | **SUPPORTED** (lectura) |
| IGF forecast | latest / vista vigente = `FORECAST`. Nombre `compromiso_lines` es trampa | **SUPPORTED** como FORECAST |
| ACTUAL_FINANCIAL FINAL | Única versión FINAL GLOBAL no usada como SUPERSEDED; loader `lib/director-ia-financial-actual.js` | **SUPPORTED** solo si el sello existe |
| Resultado `month_close_result` | Compone comercial + target + forecast + actual financiero condicionado + acciones + gaps | **PARTIAL** respecto a CLOSED_FINAL de **ciclo** |

¿Puede Director IA responder de forma defendible “¿Cómo cerró realmente julio?”?

| Separación pedida | Hoy |
|---|---|
| commercial actual | **SUPPORTED** vía month_close (ARR del mes) |
| financial actual | **SUPPORTED** si hay FINAL; si no, gap `FINANCIAL_ACTUAL_NOT_FINAL` / `MISSING` (≠ 0, ≠ FORECAST) |
| target | **SUPPORTED** si `igf_meta` del YYYY-MM |
| forecast | **SUPPORTED** etiquetado FORECAST |
| gaps oficiales | **SUPPORTED** (meta vs ARR vs Finance si FINAL) |
| gaps vs compromisos de junta (1,177 / +40 / +632) | **MISSING** |

**Clasificación CLOSED_FINAL de ciclo:** `PARTIAL`

No confundir: que `month_close_result` **pueda leer** ACTUAL_FINANCIAL no implica que CLOSED_FINAL esté compuesto con las capas de junta.

---

## 7. Council prerequisites

Pregunta 3. Un Consejo defendible necesita comparar A–G.

| | Necesidad | ¿Existe físicamente hoy? |
|---|---|---|
| A | Qué sabíamos antes del cierre | **SÍ** — PRE_CLOSE requeryable (current/target/forecast/gaps). Pack no persistido; se puede rearmar |
| B | Qué se propuso | **NO** |
| C | Qué se decidió | **NO** |
| D | Qué se comprometió | **NO** |
| E | Qué ocurrió finalmente | **PARTIAL** — month_close + ACTUAL_FINANCIAL si FINAL |
| F | Qué explicación / evidencia existe | **PARTIAL** — gaps oficiales, reviewable, AR. No causa declarada humana tipada |
| G | Qué queda pendiente | **PARTIAL** — AR abierto/vencido. No compromisos de cierre pendientes |

¿Puede construirse Council correctamente **AHORA**?

**NO**

Prerrequisitos exactos (no diseño de runtime):

1. Semántica persistible de propuesta / decisión / compromiso / corrección / causa declarada, con provenance, **sin** promoverla a hecho constitucional automático.
2. Relación explícita de esos objetos con el baseline PRE_CLOSE (A) y con el FINAL oficial (E), sin overwrite.
3. Composición Council que reuse `month_close_result` para E y **no** reimplemente loaders (EVAL-003 opción B).
4. IES / RE runtime **no** son prerrequisito del primer capture; sí lo serán si Consejo pretende hipótesis N5.
5. Plaud live **no** es prerrequisito.
6. `ARCH-DIRECTOR-IA-PRE-MEETING-FINANCIAL-ACTUAL-001` **no** es prerrequisito (congelada; contaminaría PRE_CLOSE).

---

## 8. Post-close analysis

Pregunta 5.

| Pregunta | ¿Hoy? | Dónde viviría la verdad |
|---|---|---|
| ¿Qué se comprometió en la junta de cierre pasada y qué se cumplió? | **MISSING** / **NOT_DEFENSIBLE** | No hay store. Cumplimiento oficial (ARR/FINAL) existe; el lado “comprometido” no |
| ¿Qué compromisos del cierre siguen pendientes? | **MISSING** | AR muestra acciones abiertas, no compromisos de toneladas |

Candidatos inspeccionados:

| Candidato | ¿Persistencia de compromiso? |
|---|---|
| Action Register | No. Trabajo asignado |
| Plaud / transcript | Texto en bitácora si alguien lo pega. No tipado |
| Bitácora | `contenido TEXT` + `resumen_ia`. `tipo` incluye `junta_consejo`. Fuente `plaud` permitida. **Texto libre** |
| Comments / DICF historial | Eventos de acción (`fecha_compromiso`, etc.), no +40 t |
| Conversation state | Efímero. No DB. History ≠ evidencia |
| Persistent memory | Work items. MEMORY ≠ EVIDENCE |
| Meeting summaries | `resumen_ia` de bitácora. No schema de compromiso |
| Database IGF / meta | FORECAST y TARGET de mes. No junta 2026-08-25 |

No se infiere persistencia donde solo hay texto.

**Clasificación POST_CLOSE_FOLLOWUP:** `MISSING`

---

## 9. Plaud dependency analysis

Pregunta 6.

| Papel | ¿Existe? | ¿Falta? |
|---|---|---|
| `PLAUD_AS_POST_MEETING_EVIDENCE` | **PARTIAL** — bitácora acepta `fuente=plaud`; EVAL-003 usó hechos de packet, no VTT crudo en repo | Ingesta automática, vínculo a objetos tipados, authz de uso como evidencia |
| `PLAUD_AS_STRUCTURED_INGESTION_SOURCE` | **MISSING** | Parser + modelo semántico destino |
| `PLAUD_AS_LIVE_SOURCE` | **MISSING** | Streaming. No asumir |

Pregunta clave: si mañana llega una transcripción perfecta, ¿hay ya un modelo semántico/persistente para guardar propuesta, decisión, compromiso, corrección, escenario, causa declarada **sin** degradarlos a texto libre?

**NO.**

Por tanto: **Plaud ingestion no resuelve el cuello fundamental.** Es capa INGESTION. Depende de FOUNDATION (`EXECUTIVE_STEERING_CAPTURE`). Ingesta ahora = bitácora + riesgo de tratar reunión como verdad (EKE: “Meeting statement ≠ verdad”).

---

## 10. Live-copilot dependency analysis

Pregunta 7. Solo dependencias. No diseño.

| Prerrequisito conceptual | Hoy |
|---|---|
| Baseline PRE_CLOSE | **EXISTS** |
| Speaker / meeting context | **MISSING** (bitácora no es speaker diarization) |
| Streaming evidence | **MISSING** |
| Ephemeral claims | **MISSING** (state efímero no es claim store) |
| Human decisions | **MISSING** |
| Commitments | **MISSING** |
| Scenario separation | **MISSING** (claves baneadas; overlay ≠ escenario de sala) |
| Provenance | **PARTIAL** (oficiales sí; claims de sala no) |
| Confidence | **PARTIAL** (IES/RE contratos existen; runtime N5 pendiente; chat legado no es RE) |
| Correction / supersession de claims humanos | **MISSING** |

**Clasificación:** `BLOCKED_BY_FOUNDATION`

No `READY`. No solo `PREMATURE`: está bloqueado por la misma semántica que Consejo y post-cierre.

---

## 11. Scenario / what-if analysis

Pregunta 8.

| Distinción | Objeto hoy |
|---|---|
| WHAT_IF | Overlay folio `ESCENARIO HIPOTÉTICO` en memoria (`lib/director-ia-igf-reviewable-supports.js`). No palanca desc+volumen+HG de EVAL-003 |
| FORECAST | IGF latest |
| COMMITMENT | No existe como objeto de junta |
| FINAL | ACTUAL_FINANCIAL si sello |

EVAL-003: what-if frecuente y de alto valor, **`unsafe_to_compute` como oficial**. “Sin semántica de capas, un calculador de escenarios se leería como IGF oficial.”

¿Se puede introducir what-if ahora sin riesgo de presentarlo como forecast oficial o compromiso humano?

**PREMATURE**

No `READY`. `READY_WITH_CONTRACT` solo **después** de que exista captura que separe WHAT_IF ≠ FORECAST ≠ COMMITMENT ≠ FINAL. El contrato no se diseña aquí. No se diseña engine.

---

## 12. Human-declared cause analysis

Pregunta 9.

| Clase | ¿Semántica operacional hoy? |
|---|---|
| `EVIDENCE_DERIVED_CAUSE` | **PARTIAL** — Constitución + RE §11 (causalidad N5 subordinada a IES). Runtime RE **pendiente**. Chat legado no emite causa demostrada |
| `HUMAN_DECLARED_CAUSE` | **MISSING** — no hay tipo. Una frase de gerente en bitácora es texto |
| `MODEL_HYPOTHESIS` | **PARTIAL** — contrato RE (`hypotheses[]`). Runtime pendiente. GPT del chat legado no es N5 |

No se inventa truth class constitucional en esta auditoría.

¿Bloquea?

| Capacidad | ¿Bloqueado por esta ausencia? |
|---|---|
| Commitment capture (primer ARCH) | **No bloquea empezar el ARCH.** El ARCH debe **reservar** la distinción para no colapsar “porque el cliente…” en hecho |
| Council | **Sí** para F (explicación defendible). Consejo sin esta distinción atribuiría causa humana como evidencia |
| Post-close | **Sí** para “por qué no se cumplió” si la explicación fue verbal |
| Live copilot | **Sí** para no narrar causa humana como verdad |

---

## 13. Correction / supersession analysis

Pregunta 10.

Una junta puede decir: “ese dato estaba mal”, “no son X, son Y”, “cambio mi compromiso”.

| Infraestructura | ¿Preserva old/new/who/when/source/reason/superseded? |
|---|---|
| ACTUAL_FINANCIAL / `igf.versions` SUPERSEDED | Solo versiones financieras uploaded. **≠** claim humano |
| Persistent memory `superseded` | Work items cuando cambia dato corriente. **≠** corrección de sala |
| IES `supersedes_ies_id` | Contrato IES. Runtime IES pendiente. No claims de junta |
| Action Register `closed` | Cierre de tarea. No historial old/new del +40 t |
| DICF historial | Eventos de acción (`fecha_compromiso`, etc.) |
| Conversation state | No persistido |

**No hay** supersession universal de claims humanos.

Acapulco A2/A3 (EVAL-003): dos cálculos coincidieron sobre volumen mal canalizado. `agreement_between_calculations != truth` está escrito; **no** está operacionalizado para canal. `FINANCIAL_ACTUAL_RECONCILIATION_GAP` no cubre ese caso.

---

## 14. Candidate comparison matrix

Puntuación 1–5. **No** se suma para declarar ganador. La causalidad está en §16–§17.

| ID | Candidato | EXEC_VAL | DEP_PRI | TRUTH_RDY | ARCH_RDY | REUSE | SEM_CORR_RISK | MISS_INFRA |
|---|---|---|---|---|---|---|---|---|
| A | DURING_MEETING / EXECUTIVE STEERING CAPTURE | 5 | 5 | 2 | 3 | 5 | 4 | 5 |
| B | CLOSED_FINAL COMPOSITION | 4 | 2 | 4 | 4 | 3 | 3 | 2 |
| C | COUNCIL_FINAL | 5 | 2 | 2 | 2 | 2 | 5 | 5 |
| D | POST_CLOSE_FOLLOWUP | 4 | 2 | 1 | 2 | 4 | 4 | 5 |
| E | COMMITMENT HISTORY (solo) | 5 | 4 | 2 | 3 | 4 | 3 | 5 |
| F | SCENARIO / WHAT_IF | 4 | 2 | 2 | 2 | 3 | 5 | 4 |
| G | PLAUD STRUCTURED INGESTION | 3 | 2 | 1 | 2 | 3 | 5 | 4 |
| H | LIVE COPILOT | 5 | 1 | 1 | 1 | 2 | 5 | 5 |

No se añadió candidato extra. Data-quality de canal (Acapulco) es incidente real; no es el cuello de ciclo. ACTUAL_FINANCIAL-en-PRE_CLOSE está congelado y no es cuello.

Lectura (no aritmética):

- A tiene la mayor **prioridad de dependencia** y el mayor **reuso**.
- E es subconjunto de A. Elegir solo historial de compromisos perdería propuesta rechazada, corrección y causa declarada (EVAL-003 A2, Qro OPEN_DECISION, causas verbales).
- B ya está **parcialmente construido**. No es gap de fundamento.
- C/D/G/H dependen de A.
- F depende de A + contrato de separación.

---

## 15. Dependency graph

Grafo **descubierto**, no el ejemplo del prompt.

```
FOUNDATION
  official sources (ARR, igf_meta, IGF FORECAST, AR, reviewable)
        │
        ▼
  PRE_CLOSE                         ACTUAL_FINANCIAL FINAL
  SUPPORTED_WITHIN_PRE_CLOSE        SUPPORTED_WITHIN_MONTH_CLOSE_RESULT
        │                                 │
        │                                 ▼
        │                           CLOSED_FINAL oficial  (PARTIAL; ya compuesto)
        │
        ▼
  ★ EXECUTIVE_STEERING_CAPTURE ★     ← NEXT GAP (FOUNDATION)
    propuesta / decisión / compromiso /
    causa declarada / corrección
    (sin promover a hecho constitucional)
        │
        ├──────────── COMPOSITION ────────────┐
        │                                     │
        ▼                                     ▼
  POST_CLOSE_FOLLOWUP                 COUNCIL_FINAL
  (D vs E oficial)                    (A + B/C/D + E + F + G)
        │
        ▼
INGESTION
  PLAUD structured  (después del modelo; no al revés)
        │
        ▼
INTERFACE
  LIVE COPILOT
  (baseline PRE_CLOSE + capture + ephemeral claims)

WHAT_IF / SCENARIO
  rama lateral: solo después de capture + contrato
  WHAT_IF ≠ FORECAST ≠ COMMITMENT ≠ FINAL
```

Capas:

| Capa | Qué es | Estado |
|---|---|---|
| FOUNDATION | PRE_CLOSE + capture de eventos de junta | PRE_CLOSE hecho; capture **faltante** |
| COMPOSITION | month_close / Council / post-close | month_close parcial; Council/post-close bloqueados |
| INGESTION | Plaud estructurado | Bloqueado por foundation |
| INTERFACE | Live copilot / UI Consejo | Bloqueado por foundation |

`NEXT_STAGE` (Consejo, live) ≠ `NEXT_ARCHITECTURAL_PREREQUISITE` (capture).

---

## 16. Winning next gap

**Nombre:** `EXECUTIVE_STEERING_CAPTURE`

**Por qué este, y por qué ahora**

1. EVAL-003 residual: P3, T2, A1, A2, S1, M2, Q1, Z3 y las causas/correcciones **siguen** sin objeto después de PRE_CLOSE. El composer las prohíbe a propósito.
2. Es prerrequisito de Consejo (B,C,D,F,G), post-cierre, Plaud estructurado y live copilot.
3. Respeta Evidence Builder / IES / RE: reunión ≠ hecho; no se crea truth class constitucional aquí; no se mete a IES.
4. Evita convertir lenguaje humano en hecho: el ARCH siguiente debe exigir provenance, accepted/rejected/pending, y no overwrite de CURRENT/TARGET/FORECAST/FINAL.
5. Acerca a Consejo: sin B–D no hay Consejo defendible, aunque E oficial exista.
6. Acerca a live copilot: el live necesita el mismo modelo (claims + corrección + commitment), primero persistible, después efímero/streaming.
7. No duplica PRE_CLOSE ni `month_close_result`.

**Qué debe ser capaz de representar** (requisitos de representación; **no** schema):

- cifra / intervención **propuesta**
- decisión humana: aceptada / rechazada / pendiente
- compromiso humano: cantidad, unidad, planta, periodo, responsable
- relación con baseline PRE_CLOSE (current / target / forecast) **sin** sustituirlos
- causa **declarada por humano**, distinta de causa derivada de evidencia y de hipótesis de modelo
- corrección / supersession de un claim humano previo (old, new, quién, cuándo, fuente, razón)
- provenance de reunión / actor / timestamp
- no identidad con ACTION, TARGET_COMMITMENT, FORECAST, ACTUAL_FINANCIAL

**Qué no decide esta auditoría:** tabla, columnas, JSON, API, UI, tokens definitivos, nueva truth class, nuevo G3.

**Contratos que un ARCH posterior debería revisar** (lectura, no edición): EKE (meeting statement ≠ verdad), CAPACIDADES (límites PRE_CLOSE), Index (ciclo), FINANCIAL-ACTUAL (no mezclar SUPERSEDED), Constitución VIII (hecho vs hipótesis), IES/RE solo si se propone entrada a N3/N5.

---

## 17. Why alternatives are later

| Candidato | Por qué no gana |
|---|---|
| B CLOSED_FINAL COMPOSITION | Ya existe kernel oficial. El hueco es la capa de junta, no otro month_close |
| C COUNCIL_FINAL | `NEXT_STAGE`. Runtime ahora = **NO**. Construirlo hoy compararía solo A y E parcial |
| D POST_CLOSE | Pregunta “comprometido vs cumplido” no tiene lado comprometido |
| E COMMITMENT HISTORY solo | Necesario pero estrecho. EVAL-003 también exige propuesta, rechazo, corrección, causa. E queda **dentro** de A |
| F WHAT_IF | Alto valor de sala; `PREMATURE` y riesgo 5 de corrupción semántica |
| G PLAUD INGESTION | No hay destino tipado. Texto ≠ capture |
| H LIVE COPILOT | `BLOCKED_BY_FOUNDATION` |

Ranking (no empate): **A > E > D > C > B > F > G > H**

---

## 18. Contract impact

Para el ganador, el **siguiente paso** (la ARCH) requiere:

**`NO_CONTRACT_CHANGE`**

| Ruta | ¿Ahora? |
|---|---|
| NO_CONTRACT_CHANGE | **Sí** — la ARCH diseña representación; no edita contratos |
| G2_SYNC | No ahora. Posible **después** de un IMPL futuro, inventario/Index |
| G3_DOMAIN_CONTRACT | **No ahora.** La ARCH puede **concluir** que hace falta. No se crea aquí |
| CONSTITUTION_REVIEW | **No indicado** si los eventos siguen siendo statements humanos, no hechos N1 |
| IES_REVIEW | No primero. Solo si un diseño futuro mete esos objetos al IES |
| RE_REVIEW | No primero. Solo si se pretenden hipótesis N5 sobre esos statements |

Prohibido en la ARCH siguiente: legislar una truth class constitucional por analogía con ACTUAL_FINANCIAL.

---

## 19. Matrix impact

| | |
|---|---|
| Baseline | 10.5 / 20 = 52.5% |
| Después | 10.5 / 20 = 52.5% |
| Delta | **0.0 pp** |
| Matriz modificada | **No** |
| `MATRIX_REVIEW_REQUIRED` | **No** |

PRE_CLOSE no es fila M0–M20. Esta auditoría no encontró evidencia para reabrir una fila. No se tocó la matriz.

---

## 20. Risks / limitations

- **Corrupción semántica:** guardar +40 t como acción AR, como `igf.compromiso_lines`, o como `igf_meta`.
- **Plaud-as-truth:** pegar transcripción y tratarla como hecho.
- **What-if prematuro:** motor de sala sin captura se leerá como FORECAST.
- **Council prematuro:** UI de Consejo sobre A+E oficiales fingiría trazabilidad B–D.
- **SUPERSEDED financiero** usado como historial de correcciones humanas.
- **Nueva truth class** colada como constitucional sin G3 humano.
- **Pack PRE_CLOSE no persistido:** “qué sabíamos antes” se rearma por requery; no es acta sellada. El ARCH de capture no debe fingir que PRE_CLOSE ya es un snapshot inmutable.
- **EVAL-003** no tenía VTT crudo en repo; la muestra es del packet autorizado. Suficiente para el residuo de clases; no para diseñar parser Plaud.
- Esta tarea no reejecutó tests. No modificó código. El estado PRE_CLOSE/ACTUAL_FINANCIAL se tomó de runtime + reportes PASS ya existentes.

Limitación de alcance: no se diseñó el gap ganador.

---

## 21. Exactly one NEXT_TASK

**`ARCH-DIRECTOR-IA-EXECUTIVE-STEERING-CAPTURE-001`**

| Campo | Valor |
|---|---|
| Tipo | **ARCH** |
| ¿Por qué no IMPL? | Hay que fijar qué se representa y qué **no** se colapsa, antes de tabla/API |
| ¿Por qué no AUDIT? | El residuo ya está demostrado (EVAL-003 + composer + AR + bitácora) |
| ¿Por qué no G2/G3 ahora? | Esta auditoría prohíbe legislar. La ARCH decide si recomienda G3 |
| Alcance propuesto | Diseñar **únicamente** la captura semántica de eventos de conducción nacidos en junta: propuesta, decisión, compromiso, causa declarada, corrección/supersession humana, provenance. Relación con PRE_CLOSE y con CLOSED_FINAL oficial. Sin schema SQL definitivo, sin UI, sin Plaud parser, sin Council runtime, sin what-if engine, sin live copilot, sin nueva truth class constitucional |
| Autorizada | **No** |
| Ejecutada | **No** |

STOP. No commit. No push. No merge.
