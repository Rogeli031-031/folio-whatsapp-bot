# Reporte — ARCH-DIRECTOR-IA-PRE-MEETING-READ-MODEL-001

```yaml
task_id: "ARCH-DIRECTOR-IA-PRE-MEETING-READ-MODEL-001"
outcome: "DONE_PENDING_REVIEW"
mode: "READINESS_ONLY"
implementation: false
determination: "READY_WITH_LIMITS"
selected_architecture: "B_structured_pre_meeting_read_model"
selected_architecture_letter: "B"
selected_first_slice_sections: "B_core_executive"
selected_first_slice_letter: "B"
selected_materiality: "B_existing_deviation_signals_plus_GPT"
selected_materiality_letter: "B"
canonical_intent: "pre_meeting_brief"
intent_required: true
plant_diagnosis_overloaded: false
financial_diagnosis_overloaded: false
daily_brief_overloaded: false
phrasebook: false
second_llm_router: false
persistence: false
internal_http: false
plaud_runtime: false
new_sql: false
new_thresholds: false
g2: "N/A"
g3: "N/A"
g8: "N/A"
modules_changed: []
global_before: "10.5 / 20 = 52.5%"
global_after: "10.5 / 20 = 52.5%"
gain_pp: 0.0
expected_impl_effect: "0.0 pp (no es cobertura de módulo)"
percentage_policy: "Pre-meeting compose is not module coverage. M5 remains PARTIAL. 52.5% unchanged."
destination: "chat legado (planner + conversation_state + in-process orchestrator calling existing loaders); NO Motor N1–N5; NO IES; NO Reasoning Engine"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-PRE-MEETING-READ-MODEL-001.md"
files_not_touched:
  - "docs/director-ia/"
  - "lib/"
  - "test/"
  - "sql/"
  - "server.js"
  - "frontend-dashboard/"
  - "package.json"
  - "lockfiles"
contracts_consulted:
  - "AGENTS.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/AUDIT-DIRECTOR-IA-PRODUCTION-CONVERSATION-GAP-012.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-DAILY-EXECUTIVE-BRIEF-001.md"
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md"
  - "docs/director-ia/04-IES-STANDARD.md"
  - "docs/director-ia/05-REASONING-ENGINE.md"
  - "lib/director-ia-daily-executive-brief.js"
  - "lib/director-ia-commercial-trend.js"
  - "lib/director-ia-client-profile.js"
  - "lib/director-ia-igf-arr.js"
  - "lib/director-ia-igf-reviewable-supports.js"
  - "lib/director-ia-action-register.js"
  - "lib/director-ia-action-person.js"
  - "lib/director-ia-taller-mayor.js"
  - "lib/director-ia-mejora-continua.js"
  - "lib/director-ia-plant-diagnosis.js"
  - "lib/director-ia-planner.js"
  - "lib/director-ia-conversation-state.js"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "IMPL-DIRECTOR-IA-PRE-MEETING-READ-MODEL-001"
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
human_decision_needed:
  - "G5 LOOP: HUMAN_APPROVER cierra esta tarea. NEXT_TASK no está autorizada ni ejecutada."
  - "52.5% no cambia (0.0 pp)."
  - "G2/G3 de esta ARCH: N/A. El IMPL no edita docs/director-ia/."
```

## Resumen ejecutivo

**READY_WITH_LIMITS.**

Arquitectura **B**: read model estructurado de preparación de junta. El runtime orquesta loaders **ya existentes**, alinea planta, etiqueta el periodo nativo de cada fuente, deriva huecos por clave canónica y deja que GPT sintetice **una** vez.

First slice de secciones **B — core ejecutivo**: comercial + IGF mes **abierto** + acciones + apoyos reviewable + information gaps.

Materialidad **B**: señales de desviación/ranking/estatus que **ya** produce cada capability + GPT prioriza. **No** umbrales nuevos. **No** score aprendido.

Intent canónico: **`pre_meeting_brief`**. `plant_diagnosis` / `financial_diagnosis` / `daily_executive_brief` **no** se sobrecargan.

**NEXT_TASK** (no autorizada, no ejecutada): `IMPL-DIRECTOR-IA-PRE-MEETING-READ-MODEL-001`.

---

## Ejecución

- Rama: `architecture/director-ia-pre-meeting-read-model-001` (≠ `main`).
- HEAD: `1e3c9878 Merge branch 'audit/director-ia-production-conversation-gap-012'`.
- G1 intacto: `HUMAN_APPROVER` / `2026-08-24`. Solo se cambió `status`.
- `max_attempts: 1`. Sin código, tests, contratos, SQL, Plaud, matriz, commit, push, merge.

---

## Fallo actual (confirmado)

| Pregunta | Planner aislado | GPT |
|----------|-----------------|-----|
| Prepárame para la junta de cierre de Puebla. | `unknown` 0.35 | No |
| ¿Qué debo llevar preparado para la junta de cierre? | `unknown` 0.35 | No |
| Dame un pre-cierre ejecutivo. | `unknown` 0.35 | No |
| ¿Qué puntos me van a cuestionar? | `unknown` 0.35 | No |

Si hay un parent inheritable, esas frases **heredan un solo dominio** y no componen. Las piezas existen; el compositor no.

Las frases son **tests semánticos**, no phrasebook.

---

## Inventario: ¿se pueden componer?

Sí. Cada loader es invocable in-process (`pool, plantaId, req, opts`). No HTTP interno. No hay que duplicar SQL.

| Capability | Loader | Grano nativo | Authz | ¿Componible first slice? |
|------------|--------|--------------|-------|---------------------------|
| `daily_executive_brief` | `loadDailyExecutiveBriefForChat` | ayer CDMX (hoy no cerrado) | GA/GV pueden abortar un bloque; brief ya es partial | **Sí** — bloque comercial del día |
| `commercial_trend` | `loadCommercialTrendForChat` | trailing 30/90 anclado a MAX(fecha); CASA/COMISIONISTA; OLS; top-6 | GA/GV abort | **Sí** — default 90d + ambos canales o el del hilo |
| `client_profile` | `loadClientProfileForChat` | 3 meses calendario; exige `cliente_key` | igual | **Sí, recortado**: solo movers que **ya** rankea trend (no todos los clientes) |
| Action Register | `buildActionRegisterBoardPayload` + `summarizeActionRegisterBoard` + `summarizeTopOverdueActions` (ya usados por `plant_diagnosis`) | snapshot as-of hoy; open/closed/vencidas | `assertActionRegisterAccess` | **Sí** — no usar `loadActionPersonBoardForChat` (exige persona) |
| IGF | `loadIgfArrAnnexForChat` / `loadIgfArrSourceBlocksForChat` | YYYY-MM de la pregunta; **última** `igf.versions` | GA 403 | **Sí** — mes **abierto** CDMX. Etiqueta = forecast/versión vigente, **no** cierre real |
| `igf_reviewable_supports` | `loadIgfReviewableSupportsForChat` | `mes_cargo` = mes actual CDMX | folios + IGF | **Sí** |
| `taller_mayor` | `loadTallerMayorForChat` | `mes_cargo` mes actual; agrupado por token | folios | **No first slice.** Handoff de follow-up |
| `mejora_continua` | `loadMejoraContinuaForChat` / `buildMejoraContinuaPayload` | planta + YYYY-MM; temas Plan Maestro (Oficinas, Taller, SCI, ERP, Imagen) | AR | **No first slice.** Ritual distinto (Plan Maestro), no junta de cierre |

Patrón ya probado: `loadDailyExecutiveBriefForChat` llama dos loaders, `safeLoad`, `assembly_status` complete/partial/unavailable, limitations separadas, **una** llamada GPT.

El pre-meeting es el mismo patrón con **más bloques**, no un prompt que pida a GPT reconciliar dumps.

### Semántica de periodo (no colapsar)

`meeting_period` first slice = YYYY-MM **abierto** CDMX. Eso **no** reescribe el grano de cada fuente.

| Bloque | Periodo que conserva | Cómo se etiqueta |
|--------|----------------------|------------------|
| Brief diario | ayer | `period_kind=calendar_day` |
| Trend | 90d trailing | `period_kind=trailing_days` |
| Profile | 3M calendario del mover | `period_kind=calendar_months` |
| IGF / reviewable / Taller (si handoff) | YYYY-MM abierto / `mes_cargo` | `period_kind=open_month` |
| AR | as-of hoy | `period_kind=board_snapshot` |

Prohibido: forzar trend/profile a un solo `mes_cargo`. Prohibido: tratar la última versión IGF como «mayo cerró así».

Mes cerrado explícito: **limitation** (`TEMPORAL_SEMANTICS_GAP`). No inventar actual. No cambiar first slice a histórico.

Una planta. Sin merge cross-plant. Planta = `planta_id` del request (Puebla si el selector/request lo es). El texto «de Puebla» no inventa otra planta.

Junta genérica vs junta de cierre: **el mismo** first slice. `meeting_type` es **slot** (`monthly_close` default), no un intent por tipo.

---

## Arquitectura A/B/C/D

| | Qué es | Veredicto |
|--|--------|-----------|
| **A** prompt-only | Llamar tools y pedir a GPT que arme la junta | **No.** El principio de composición lo prohíbe: packs desalineados + reconciliación silenciosa. Prompt gigante. |
| **B** read model estructurado | Runtime orquesta loaders, alinea planta, estructura hechos/gaps, GPT sintetiza | **Seleccionado.** Read-only. Fresh queries. Shared loaders. Sin persistir. |
| **C** snapshot persistido | Tabla/derived meeting snapshot | **No.** Verdad stale. Write. Fuera de invariante. |
| **D** reglas fijas de junta | Checklist + umbrales por reunión | **No.** Phrasebook operativo. G8. Overprogramming. |

---

## Secciones first slice A/B/C/D

| | Contenido | Veredicto |
|--|-----------|-----------|
| **A** commercial only | daily + trend + clients | Insuficiente para cierre: falta dinero, decisiones y huecos |
| **B** core ejecutivo | comercial + IGF abierto + AR + reviewable + **information gaps** | **Seleccionado.** Es lo que una junta de cierre ya puede defender con fuentes vivas |
| **C** B + Taller + MC | + unidades Mayor + Plan Maestro | Taller es **follow-up** canónico. MC es otra reunión (5 áreas). Meterlos infla el pack y tienta a GPT a mezclar operación con IGF |
| **D** everything | todos los módulos | **No.** Brief gigante. 52.5% no se vuelve COMPLETE por pegar módulos |

### Pack mínimo (B)

```text
identity: plant, meeting_period (open YYYY-MM CDMX), meeting_type=monthly_close, generated_at
commercial:
  daily_executive_brief (ayer; sales+discount; gaps nativos)
  commercial_trend (90d; canales; OLS; top-6 movers)
  client_profile[]  — SOLO cliente_key de movers ya rankeados; no catálogo
financial:
  IGF open-month snapshot (versión más reciente; label=forecast/vigente)
actions:
  AR summary + top_overdue (helpers existentes; resultado_cierre solo si existe)
supports:
  reviewable / not_cancellable / sums (loader existente)
information_gaps:  — crítico; ver abajo
suggested_requests:  — texto read-only; no envío
limitations[] + provenance[]  — por fuente
assembly_status: complete | partial | unavailable
```

Hechos, desviaciones, compromisos abiertos, candidatos a revisar, huecos, limitations, provenance. **No** agenda inventada. **No** «el Consejo preguntará».

---

## Information gaps (crítico)

El valor ejecutivo puede ser **lo que no se puede explicar todavía**.

Origen, en este orden:

1. **Gaps nativos** de cada loader (`information_gaps` / `pending_information_gap` / limitations). No reescribir su semántica.
2. **Joins deterministas same-key, same-plant** (no fuzzy, no nombre):
   - mover `cliente_key` + sin comentario/DICF reciente en el profile de esa key → «movimiento material sin explicación registrada»
   - acción vencida válida + sin `resultado_cierre` → «vencida sin resultado»
   - presión en partida IGF del snapshot (campo físico no nulo / desviación vs mes previo **ya** calculada por annex) + sin evidencia causal en packs → «hay presión; el driver no está establecido» (**no** causa)
   - Folio reviewable + sin evidencia de riesgo comercial ligada → «reviewable sin contexto comercial»

Prohibido: inventar causa, inventar responsable, pedir explicación si el pack **ya** trae comentario/DICF no conflictivo, tratar missing como 0.

Lenguaje seguro del modelo: «Esto falta explicar antes de la junta.» No «esto causó el IGF».

---

## Materialidad A/B/C/D

| | Qué es | Veredicto |
|--|--------|-----------|
| **A** everything | meter todo lo disponible | Pack ingente. No. |
| **B** señales existentes + GPT | top-6, first mover, `assembly_status`, vencidas ya filtradas, reviewable vs not_cancellable, gaps nativos | **Seleccionado.** Mínimo seguro. |
| **C** umbrales nuevos | «caída > X%» | **No.** G8. Arbitrario. |
| **D** learned meeting score | modelo que rankea temas de junta | **No.** No hay verdad de entrenamiento. Plaud fuera. |

GPT prioriza **dentro** de lo que el runtime ya marcó. No crea un score.

---

## Anticipación de preguntas

Permitido: «Conviene estar preparado para explicar X.» / «Falta evidencia para responder con seguridad a…»

Prohibido: «El Consejo te va a preguntar X.» / «Sé que preguntarán Y.»

La anticipación sale de **hechos + gaps** del pack fresco, no de un script de junta.

---

## Sugerencia proactiva (first slice)

Sí, como **sugerencia read-only** en el pack (`suggested_requests[]`: entidad canónica, campo faltante, por qué bloquea).

Ejemplo defendible: «El cliente X (key) se movió en trend y no hay comentario reciente. Antes de la junta hace falta contexto comercial.»

Prohibido en este slice: enviar mensaje, escribir comentario, crear/editar acción, cancelar Folio, mutar IGF, notificar.

---

## Read-only absoluto

No crea/edita acción. No cancela Folio. No escribe comentario. No cambia IGF. No envía. No persiste snapshot de junta. Director IA sigue interfaz de lectura.

---

## Follow-ups / handoff

El pack de pre-meeting es **entrada + síntesis**. No es verdad almacenada.

| Follow-up | Destino | Requery |
|-----------|---------|---------|
| ¿Qué me preocupa más? / ¿Qué falta explicar? | inherit `pre_meeting_brief` (attention / gap) | **Sí** — recomponer; no reusar el pack anterior como hecho |
| ¿Qué cliente debo revisar? / Háblame del cliente X. | `client_profile` (handoff; `cliente_key` si unique) | Sí |
| ¿Qué acciones están vencidas? | AR / `action_status` si hay persona | Sí |
| ¿Qué apoyos puedo revisar? | `igf_reviewable_supports` standalone | Sí |
| ¿Qué unidades tienen Taller Mayor? | `taller_mayor` standalone | Sí |

`pre_meeting_brief` entra a `INHERITABLE_INTENTS`. Standalone de dominio **gana**. Al handoff: `previous_frame` = pre-meeting. Conservar planta y `meeting_period` si el destino lo admite; **no** arrastrar el pack compuesto.

---

## Partial data

Igual que el brief diario:

- Una fuente falla → `assembly_status=partial` + limitation de **esa** fuente.
- Todas las financieras abortan (p. ej. GA) → abort authz o brief solo operativo si AR sigue.
- missing ≠ 0. unsupported (ingreso cliente) **sigue** unsupported.
- Error de fuente ≠ hallazgo de negocio.

---

## Por qué no sobrecargar intents existentes

| Intent | Por qué no es el parent |
|--------|-------------------------|
| `plant_diagnosis` | «Cómo va la planta»: AR+DICF+bitácora+ARR+IGF+CS. **No** trae brief diario, OLS 90d, profile 3M, reviewable, Taller. Inherit atraparía la junta en diagnóstico |
| `financial_diagnosis` | IGF+ARR+M9. Sin comercial diario/trend/reviewable/AR |
| `daily_executive_brief` | Solo ayer. Una junta de cierre no es el día |

Un parent semántico. Tipo y periodo = slots.

---

## Plaud (fuera del runtime; contrato de eval futura)

Esta tarea: **cero** ingestión, API o persistencia de transcripciones.

Uso **posterior** (otra tarea, G1 propio):

1. Elegir juntas históricas de cierre (Plaud) como **eval**, no como fuente de negocio.
2. Extraer preguntas/intenciones ejecutivas (declaraciones).
3. Correr el pre-meeting **as-of** solo si hay datos versionados comparables. Si no hay as-of, **no** reconstruir el pasado con el corte de hoy (hindsight leakage).
4. Medir: qué se anticipó como hueco vs qué se preguntó; qué fuente faltó.
5. **No** convertir las preguntas reales en phrasebook ni en umbrales.

Meeting statement ≠ causal truth. Un comentario en junta es declaración registrada, igual que un comment DICF.

---

## G2 / G3 / G8

| Gate | Determinación | Por qué |
|------|---------------|---------|
| **G2** | **N/A** | No se edita `docs/director-ia/`. Compose en chat legado, misma clase que `daily_executive_brief` / `plant_diagnosis`. No redefine Constitución, EKE, IES ni N5. Las interfaces no alteran el IES (Const. X). |
| **G3** | **N/A** | No se crea contrato arquitectónico nuevo (`04`, `05`, EKE). El IMPL no abre un `06-…`. |
| **G8** | **N/A** | No hay `k`/`wi` ni ruleset de materialidad nuevo. Se reúsan top-6, vencidas ya filtradas, reviewable existente. |

Si un IMPL futuro quisiera umbrales nuevos o IES: **STOP** y gate humano. Este first slice no lo pide.

---

## Límites (por eso WITH_LIMITS, no READY puro)

- IGF cerrado actual vs forecast as-of: **fuera**. Limitation honesta.
- Ingreso real de cliente: `UNSUPPORTED_METRIC` se propaga.
- SEH / directorio: no entra.
- Plaud: no entra al runtime.
- Taller Mayor y mejora continua: handoff, no first slice.
- Granos de periodo distintos: se etiquetan; no se unifican.
- Authz: brief puede nacer parcial.

Nada de eso bloquea un first slice defendible de **junta ejecutiva / cierre mensual / una planta / mes abierto**.

---

## IMPL — alcance esperado (propuesta; no autorizada)

`IMPL-DIRECTOR-IA-PRE-MEETING-READ-MODEL-001`

- Intent `pre_meeting_brief` (tokens de preparación / junta / pre-cierre / qué llevar; **no** phrasebook de las 6 canónicas).
- `lib/director-ia-pre-meeting.js`: orquesta loaders existentes; `safeLoad` por bloque; pack B; gaps same-key; `suggested_requests` read-only.
- Planner + `INHERITABLE_INTENTS` + rama in-process + **una** llamada OpenAI.
- Handoff documentado arriba.
- Tests semánticos + hold-outs (no «el Consejo preguntará»; no mes cerrado inventado; no write).
- **No** Plaud. **No** SQL nuevo. **No** snapshot. **No** HTTP interno. **No** contratos. **No** matriz. **0.0 pp.**

STOP.
