# Reporte — AUDIT-DIRECTOR-IA-PLAUD-CLOSE-MEETING-EVAL-001

```yaml
task_id: "AUDIT-DIRECTOR-IA-PLAUD-CLOSE-MEETING-EVAL-001"
outcome: "DONE_PENDING_REVIEW"
mode: "REAL_MEETING_EVALUATION_ONLY"
implementation: false
plaud_runtime: false
plaud_api: false
plaud_ingestion: false
plaud_storage: false
conversation_readiness: "CONVERSATION_BASE_READY_WITH_LIMITS"
conversation_readiness_changed: false
structural_vs_domain: "REMAINING_GAP_IS_EXECUTIVE_DOMAIN_INTELLIGENCE"
single_bottleneck: "close_meeting_month_result_vs_target_not_composed"
failure_class: "MISSING_CAPABILITY"
evaluation_units_N: 26
anticipated: 4
gap_detected: 4
followup_answerable: 1
partially_answerable: 11
missing_capability: 4
missing_data: 2
not_defensible_as_of: 0
anticipated_rate: "4/26 = 15.4%"
prepared_rate: "9/26 = 34.6%"
unsupported_rate: "6/26 = 23.1%"
partially_share: "11/26 = 42.3%"
metrics_are_audit_only: true
permanent_kpi: false
hindsight_leakage_controlled: true
modules_changed: []
global_before: "10.5 / 20 = 52.5%"
global_after: "10.5 / 20 = 52.5%"
gain_pp: 0.0
percentage_policy: "This audit does not measure modules. 0.0 pp."
source_packet_meetings:
  - "Puebla acb82204db845a58c88e77d13ad6c811"
  - "Acapulco 8a4da12596cec82cf21ec66f0c85065a"
  - "Morelos 0580ae51fcdffbb124c3e5f69523c877"
  - "Queretaro_San_Luis 2a2cd8cb5ecc4cb5dd53764ef85c6811"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/AUDIT-DIRECTOR-IA-PLAUD-CLOSE-MEETING-EVAL-001.md"
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
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-PRE-MEETING-READ-MODEL-001.md"
  - "docs/dev-loop/reports/DOCS-DIRECTOR-IA-PRE-MEETING-READ-MODEL-SYNC-001.md"
  - "lib/director-ia-pre-meeting.js"
  - "lib/director-ia-daily-executive-brief.js"
  - "lib/director-ia-commercial-trend.js"
  - "lib/commercial-trend-engine.js"
  - "lib/director-ia-client-profile.js"
  - "lib/director-ia-igf-arr.js"
  - "lib/director-ia-igf-reviewable-supports.js"
  - "lib/director-ia-action-register.js"
  - "lib/director-ia-planner.js"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "ARCH-DIRECTOR-IA-PRE-MEETING-MONTH-CLOSE-RESULT-001"
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
human_decision_needed:
  - "G5 LOOP: HUMAN_APPROVER cierra esta tarea. NEXT_TASK no está autorizada ni ejecutada."
  - "52.5% no cambia (0.0 pp). Las tasas de anticipación son solo de auditoría."
  - "CONVERSATION_BASE_READY_WITH_LIMITS se reafirma. No es PRODUCTION_READY."
```

## Resumen ejecutivo

El SOURCE PACKET de cuatro juntas reales de cierre (Puebla, Acapulco, Morelos, Querétaro/San Luis) se usó como evidencia de demanda. **No** se inventaron preguntas. **No** se conectó Plaud.

`pre_meeting_brief` **sí** habría advertido, antes de entrar, sobre tendencia 90d, mix CASA/comisionista, movers, acciones abiertas/vencidas, IGF abierto sin driver causal, apoyos reviewable y huecos de explicación.

**No** habría entregado el marco con el que esas juntas realmente trabajaron: **resultado del mes vs meta + rentabilidad/margen de ese mes**. El pack actual es ayer + 90d trailing + IGF de mes **abierto**. Las juntas fueron revisiones de **cierre de junio**.

Readiness: se **reafirma** `CONVERSATION_BASE_READY_WITH_LIMITS`. El fallo restante es inteligencia de dominio ejecutivo, no sustrato conversacional.

Cuello único: **`close_meeting_month_result_vs_target_not_composed`**.

**NEXT_TASK** (no autorizada, no ejecutada): `ARCH-DIRECTOR-IA-PRE-MEETING-MONTH-CLOSE-RESULT-001`.

---

## Ejecución

- Rama: `audit/director-ia-plaud-close-meeting-eval-001` (≠ `main`).
- HEAD: `f3af122b Merge branch 'docs/director-ia-pre-meeting-read-model-sync-001'`.
- G1 intacto: `HUMAN_APPROVER` / `2026-08-24`. Solo se cambió `status`.
- `max_attempts: 1`. Sin código, tests, Plaud API/ingest/storage, SQL, matriz, commit, push, merge.

---

## Hindsight leakage (control)

| Regla | Aplicación |
|-------|------------|
| Meeting statement ≠ causal truth | Una causa dicha en la junta no se acredita al brief. |
| Comentario ≠ causa | Comments/DICF del profile, si existieran, no prueban el porqué. |
| Hecho que aparece primero en la junta | `NOT_DEFENSIBLE_AS_OF` o, si había movimiento sin explicación, solo `GAP_DETECTED`. |
| Turismo / autoridad / huachicol | Si se verbalizaron en la sala, Director IA **no** recibe crédito por saberlos antes. |
| Crédito correcto | «Veo la caída/tensión y no encuentro evidencia cargada que la explique. Conviene obtener contexto antes de la junta.» = `GAP_DETECTED`. |
| Replay as-of de junio | No se exige. First slice es mes abierto. No se falla la auditoría solo porque no hay replay histórico. |

Nadie recibe `ANTICIPATED` por autoridad, huachicol, turismo, “baja esperada” verbalizada en Morelos, ni por la calidad de un plan dicho en la minuta.

---

## Qué puede cargar físicamente `pre_meeting_brief`

Inspección de `lib/director-ia-pre-meeting.js` (no se ejecutó SQL):

| Sección | Loader reusado | Grano real | No carga |
|---------|----------------|------------|----------|
| commercial.daily | `loadDailyExecutiveBriefForChat` | **ayer** CDMX venta + descuento/kg | mes calendario; meta |
| commercial.trend | `loadCommercialTrendForChat` 90d `both` | trailing 90d anclado a `MAX(fecha)`; OLS sobre **`venta_ton`**; movers; `descuento_mxn` en serie | mes de cierre; meta; OLS de descuento; comments |
| commercial.profiles | `loadClientProfileForChat` | 3 meses calendario; cap **3** movers ya rankeados | listas nuevas/perdidas; ingreso actual |
| IGF | `loadIgfArrSourceBlocksForChat("igf")` | mes **abierto**; forecast/versión vigente | actual de mes cerrado; driver causal; pregunta sintética **no** pide bloque margen vs previo |
| actions | board + `summarizeTopOverdueActions` | abiertas / vencidas / responsable registrado | minuta Plaud; “recuperará volumen”; resultado si no está en AR |
| reviewable | `loadIgfReviewableSupportsForChat` | Folios reviewable mes abierto | gasto/inversión M6; por qué crecieron |
| gaps | `deriveInformationGaps` | movimiento diario sin comentario; mover sin comments/DICF; IGF sin causa; overdue sin resultado; reviewable sin vínculo comercial | causa externa; meta; cartera |

**No** en el pack: Taller Mayor, Mejora Continua, Plaud, bitácora, `commercial_state` (nuevos/perdidos), M6, M9, cartera, meta de venta, punto de equilibrio, CRM/prospectos, capacidad de suministro.

Handoffs canónicos ya cableados: acciones, reviewable, `client_profile`, `commercial_trend`, `taller_mayor`. «Dejaron de comprar / clientes nuevos» es `commercial_state` **standalone** si el usuario lo pregunta con esos tokens; **no** está en el brief inicial ni en los handoffs documentados del compose.

No hay `meta_venta` / `objetivo_venta` / `kg_meta` en `lib/`. Cartera no tiene loader.

---

## Unidades evaluadas (N = 26)

Solo preguntas/intents del SOURCE PACKET. Una fila = una pregunta observada.

| ID | Junta | Pregunta real | Familia | Brief inicial | Follow-up canónico | ¿Gap? | Dato físico | ¿Defendible antes? | Clase |
|----|-------|---------------|---------|---------------|--------------------|-------|-------------|--------------------|-------|
| P1 | Puebla | ¿Cómo salió la venta? | WHAT_HAPPENED | daily + trend 90d | trend / daily | no el mes vs meta | kg diarios/90d; **no meta** | movimiento sí; cierre vs meta no | PARTIALLY_ANSWERABLE |
| P2 | Puebla | ¿La autoridad seguirá afectando el mercado? | WHAT_IS_MISSING | no | bitácora no está en pack | solo si ya hay movimiento sin contexto | inteligencia externa **no** en fuentes | no | MISSING_DATA |
| P3 | Puebla | ¿Esto debe repercutir en la venta? | WHY | no causa | — | sí: movimiento sin explicación | no hay “debe repercutir” | gap sí; causa no | GAP_DETECTED |
| P4 | Puebla | ¿La venta se puede disparar? | WHAT_NEXT | no | no | no | no hay modelo de disparo | no | MISSING_CAPABILITY |
| P5 | Puebla | ¿Cómo andamos de clientes? | WHO_MOVED_IT | movers + 3 profiles | profile; `commercial_state` si se pregunta lista | movers sin comments | DICF listas **fuera** del pack | movers sí; universo no | PARTIALLY_ANSWERABLE |
| P6 | Puebla | ¿Podemos soportar el crecimiento sin quedarnos sin suministro? | WHAT_NEXT | no (Taller ≠ suministro) | `taller_mayor` no responde capacidad | no | no hay read model de suministro | no | MISSING_CAPABILITY |
| P7 | Puebla | ¿Qué quedó de la minuta anterior? | WHAT_IS_OPEN | AR abierto/vencido | `overdue_actions` | overdue sin resultado | minuta Plaud **no** | AR sí; Plaud no | PARTIALLY_ANSWERABLE |
| A1 | Acapulco | ¿Por qué no se alcanzó la meta? | WHY + WHAT_HAPPENED | no hay meta | trend muestra dirección | caída sin causa | **meta no está en fuentes** | no se puede afirmar “no se alcanzó” | MISSING_DATA |
| A2 | Acapulco | ¿La caída es coyuntural o tendencia? | WHAT_CHANGED | OLS 90d | `commercial_trend` | no certifica “coyuntural” | serie 90d | dirección de tendencia sí | ANTICIPATED |
| A3 | Acapulco | ¿Qué clientes explican la pérdida? | WHO_MOVED_IT | top movers | `client_profile` | mover sin comments = gap extra | `venta_ton` delta | quién movió kg sí; causa no | ANTICIPATED |
| A4 | Acapulco | ¿Estamos sacrificando volumen por rentabilidad? | WHY | trend + IGF abierto | IGF / financial | IGF sin driver causal | proyección ≠ actual | tensión de señales sí; “sacrificio” no | PARTIALLY_ANSWERABLE |
| A5 | Acapulco | ¿Por qué crecieron gastos/inversiones? | WHY | no | M6 listado | no el porqué | folios GASTOS/INVERSIONES | listado sí; causa no | PARTIALLY_ANSWERABLE |
| A6 | Acapulco | ¿Qué acciones concretas recuperarán el volumen? | WHAT_NEXT | AR abierto/vencido | actions | resultado ausente | AR no prueba recuperación | lista sí; “recuperarán” no | PARTIALLY_ANSWERABLE |
| A7 | Acapulco | ¿La meta del siguiente mes es defendible? | WHAT_NEXT | no | no | no | no hay modelo de meta siguiente | no | MISSING_CAPABILITY |
| M1 | Morelos | Si vendimos más, ¿por qué cayó la rentabilidad? | WHY | trend + IGF + gap causal | — | **sí (caso de oro)** | volumen 90d + snapshot IGF | tensión + hueco sí; causa no | GAP_DETECTED |
| M2 | Morelos | ¿Qué pasó con comisiones/descuentos? | WHAT_CHANGED | descuento/kg de **ayer**; `descuento_mxn` en serie | daily discount | no vs objetivo de comisión | no hay meta de comisión | movimiento parcial | PARTIALLY_ANSWERABLE |
| M3 | Morelos | ¿Qué canal está erosionando margen? | WHO_MOVED_IT | mix kg CASA/comi | trend compare | no margen por canal | IGF es planta, no canal | mix de volumen sí; margen-canal no | PARTIALLY_ANSWERABLE |
| M4 | Morelos | ¿Qué clientes ganamos y cuáles perdimos? | WHO_MOVED_IT | no | `commercial_state` (dejaron/nuevos) | no en brief | DICF listas **existen** | si se pregunta la lista | FOLLOWUP_ANSWERABLE |
| M5 | Morelos | ¿Cómo compensaremos la baja esperada de un cliente? | WHAT_NEXT | no el plan | `client_profile` si nombra cliente | — | “baja esperada” dicha en junta ≠ evidencia previa | perfil sí; plan no | PARTIALLY_ANSWERABLE |
| M6 | Morelos | ¿Qué debe corregirse antes de la siguiente junta? | WHAT_IS_MISSING | gaps + overdue | inherit brief | sí | gaps del pack | huecos y vencidas sí | GAP_DETECTED |
| Q1 | Qro/SL | ¿Cómo podemos vender más y perder dinero? | WHY | trend + IGF + gap | — | **sí** | mismo que M1 | tensión + hueco sí; causa no | GAP_DETECTED |
| Q2 | Qro/SL | ¿Qué cambió en el mix de canales? | WHAT_CHANGED | 90d both | `commercial_trend` | no | kg CASA vs comi | mix de volumen sí | ANTICIPATED |
| Q3 | Qro/SL | ¿Qué efecto tuvieron descuentos/comisiones? | WHY | descuento parcial | daily discount | no efecto causal | no hay “efecto sobre margen” | movimiento ≠ efecto | PARTIALLY_ANSWERABLE |
| Q4 | Qro/SL | ¿Qué clientes/prospectos pueden cerrar la brecha? | WHAT_NEXT | 3 movers | profile | — | CRM/prospectos **no** | movers sí; prospectos no | PARTIALLY_ANSWERABLE |
| Q5 | Qro/SL | ¿Qué necesitamos vender para llegar al equilibrio? | WHAT_NEXT | no | no | no | no hay read model de equilibrio | no | MISSING_CAPABILITY |
| Q6 | Qro/SL | ¿Qué compromisos deben cumplirse el siguiente mes? | WHAT_IS_OPEN | AR abierto/vencido | actions | resultado ausente | due_date en AR | compromisos registrados sí | ANTICIPATED |

---

## Tasas (solo auditoría; no KPI de producto)

| Métrica | Fórmula | Valor |
|---------|---------|-------|
| N | intents reales del packet | **26** |
| anticipated_rate | ANTICIPATED / N | **4/26 = 15.4%** |
| prepared_rate | (ANTICIPATED + GAP_DETECTED + FOLLOWUP_ANSWERABLE) / N | **9/26 = 34.6%** |
| unsupported_rate | (MISSING_CAPABILITY + MISSING_DATA + NOT_DEFENSIBLE_AS_OF) / N | **6/26 = 23.1%** |
| parcialmente (fuera de las tres tasas) | PARTIALLY_ANSWERABLE / N | **11/26 = 42.3%** |

`NOT_DEFENSIBLE_AS_OF` = 0 porque la evaluación es de **cobertura de capability**, no replay as-of de junio.

---

## Familias que se repiten entre plantas

| Familia | Plantas | Demanda | Qué hace el brief hoy |
|---------|---------|---------|------------------------|
| WHAT_HAPPENED | **4/4** | cómo salió la venta; meta vs resultado | ayer + 90d; **no** mes vs meta |
| WHY | **4/4** | rentabilidad; vender más / ganar menos; por qué no se llegó | IGF + gap causal; **no** causa; **no** actual de cierre |
| WHO_MOVED_IT | **4/4** | clientes / canal | movers + mix kg; **nuevos/perdidos fuera** del pack |
| WHAT_CHANGED | **4/4** | descuento/comisión/mix | mix sí; descuento parcial; efecto causal no |
| WHAT_IS_OPEN | **4/4** | minuta / acciones / pendientes | AR sí; Plaud no |
| WHAT_NEXT | **4/4** | meta siguiente; equilibrio; recuperación | **no** hay modelo |
| WHAT_IS_MISSING | **3/4** | contexto externo / qué corregir | gaps de evidencia cargada; no autoridad/turismo |

Cartera aparece como **tema** en Puebla, Acapulco y Morelos; no hay pregunta literal en el packet y no hay loader → demanda recurrente **sin** capability (no se contó en N para no inventar pregunta).

---

## Prueba crítica: ¿habría advertido antes de la junta?

| Señal pedida | ¿Alerta en el brief inicial? |
|--------------|------------------------------|
| venta / meta | Venta (ayer/90d) **sí**. Meta **no**. |
| tendencia | **Sí** (OLS 90d both). |
| mix CASA/comisionista | **Sí** (compare 90d). |
| descuento | **Parcial** (ayer + `descuento_mxn` en serie; no vs objetivo; no efecto sobre margen). |
| clientes | **Movers sí**. Nuevos/perdidos **no** (sí como follow-up DICF). |
| acciones pendientes | **Sí** (abiertas/vencidas + gap de resultado). |
| IGF | **Sí** como proyección abierta + gap “sin driver causal”. **No** como actual de junio. |
| apoyos reviewable | **Sí** si hay Folios reviewable. |
| falta de explicación | **Sí** (information gaps). |

Eso es exactamente `CONVERSATION_BASE_READY_WITH_LIMITS`: el director llega avisado de **señales y huecos**, no del **cierre del mes contra la meta**.

---

## Readiness conversacional

Se **reafirma** `CONVERSATION_BASE_READY_WITH_LIMITS`.

Las juntas reales **no** revelan un fallo nuevo de planner, inherit, handoff, requery ni de orquestador (ese cuello ya se cerró con `pre_meeting_brief`).

El hueco restante es **inteligencia de dominio ejecutivo** (marco de resultado de mes vs meta + margen), no sustrato conversacional.

---

## Cuello único

**Nombre:** `close_meeting_month_result_vs_target_not_composed`  
**Clase:** `MISSING_CAPABILITY`

### Qué preguntas reales rompe

P1, A1, A4, M1, M3, Q1, Q3 — y el marco implícito de las cuatro juntas: “¿cómo cerramos el mes y por qué el resultado económico no cuadra con el volumen?”

### Frecuencia

**4/4 reuniones.** Puebla (venta del mes / rentabilidad). Acapulco (meta vs resultado). Morelos (venta > meta y rentabilidad ↓). Querétaro/San Luis (más volumen y pérdida operativa).

### Dónde falla físicamente

`loadPreMeetingBriefForChat` fija el grano en:

1. `daily_executive_brief` = **ayer**
2. `commercial_trend` = **90 días trailing** desde `MAX(fecha)`, OLS de `venta_ton`
3. IGF con pregunta sintética `"igf"` = **mes abierto**, forecast, **sin** forzar margen vs previo
4. Profiles = 3 movers, no el mes de cierre ni listas DICF
5. **Cero** fuente de meta/objetivo de venta en `lib/`

Las juntas operaron otro grano: **mes calendario de cierre + meta + rentabilidad de ese mes + mix/descuento de ese mes**.

No se eligió “falta Plaud” (hindsight). No se eligió “no hay replay de junio” como fallo. No se eligió un tema de una sola planta (suministro, CRM).

### Qué desbloquearía

Un marco de **resultado de mes** (MTD o mes de cierre autorizado): kg/canal/descuento del mes de la junta, listas DICF nuevas/perdidas ya existentes, IGF de ese mes si se autoriza, y meta **si** aparece una fuente física.

### Qué NO resolvería

Causa (turismo/autoridad/huachicol). Cartera. Suministro/manifold. Punto de equilibrio. Defendibilidad de la meta siguiente. Plaud. Writes. Que un comentario se vuelva causa.

---

## NEXT_TASK (exactamente una; no autorizada; no ejecutada)

`ARCH-DIRECTOR-IA-PRE-MEETING-MONTH-CLOSE-RESULT-001`

Diseñar (no implementar) el marco de resultado de mes para preparación de junta: grano calendario vs el pack actual ayer+90d+IGF abierto; meta solo si hay fuente física; sin Plaud runtime.

STOP.
