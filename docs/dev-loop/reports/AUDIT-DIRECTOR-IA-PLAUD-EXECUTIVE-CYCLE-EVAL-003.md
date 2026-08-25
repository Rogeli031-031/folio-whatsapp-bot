# Reporte — AUDIT-DIRECTOR-IA-PLAUD-EXECUTIVE-CYCLE-EVAL-003

```yaml
task_id: "AUDIT-DIRECTOR-IA-PLAUD-EXECUTIVE-CYCLE-EVAL-003"
outcome: "DONE_PENDING_REVIEW"
mode: "AUDIT / EVALUATION"
implementation: false
code_changes: false
test_changes: false
sql_changes: false
architecture_changes: false
matrix_changes: false
plaud_runtime: false
plaud_ingestion: false
raw_transcript_in_repo: false
sample_independent: true
N: 24
N_eval_001_002_unchanged: 26
conversation_readiness: "CONVERSATION_BASE_READY_WITH_LIMITS"
conversation_readiness_changed: false
anticipated_yes: 1
anticipated_partial: 11
anticipated_no: 12
prepared_yes: 3
prepared_partial: 10
prepared_no: 11
answerable_now: 0
partially_answerable: 8
gap_detectable: 5
unsupported: 11
anticipated_rate: "1/24 = 4.2%"
prepared_rate: "3/24 = 12.5%"
unsupported_rate: "11/24 = 45.8%"
metrics_are_audit_only: true
permanent_kpi: false
eval_001_002_rates_recomputed: false
meeting_class: "PRE_CLOSE / CLOSING-STEERING"
month_august_2026: "OPEN"
not_closed_final: true
cycle_model: "SUPPORTED_WITH_ADJUSTMENTS"
pre_meeting_arch_option: "B"
commitment_store: "MISSING_INFRASTRUCTURE"
scenario_history: "NOT_DEFENSIBLE"
what_if: "unsafe_to_compute as official forecast"
single_bottleneck: "pre_close_composition_missing"
architecture_pending_unexecuted: "ARCH-DIRECTOR-IA-PRE-MEETING-FINANCIAL-ACTUAL-001"
architecture_pending_still_frozen: true
next_task_proposed: "ARCH-DIRECTOR-IA-PRE-CLOSE-STEERING-COMPOSITION-001"
next_task_authorized: false
next_task_executed: false
global_before: "10.5 / 20 = 52.5%"
global_after: "10.5 / 20 = 52.5%"
gain_pp: 0.0
percentage_policy: "This audit does not measure modules. 0.0 pp."
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/AUDIT-DIRECTOR-IA-PLAUD-EXECUTIVE-CYCLE-EVAL-003.md"
files_not_touched:
  - "docs/director-ia/"
  - "lib/"
  - "test/"
  - "sql/"
  - "server.js"
  - "frontend-dashboard/"
  - "package.json"
  - "lockfiles"
  - "docs/dev-loop/reports/AUDIT-DIRECTOR-IA-PLAUD-CLOSE-MEETING-EVAL-001.md"
  - "docs/dev-loop/reports/AUDIT-DIRECTOR-IA-PLAUD-CLOSE-MEETING-EVAL-002.md"
contracts_consulted:
  - "AGENTS.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md"
  - "docs/director-ia/FINANCIAL-ACTUAL-EVIDENCE-CONTRACT.md"
  - "docs/dev-loop/reports/AUDIT-DIRECTOR-IA-PLAUD-CLOSE-MEETING-EVAL-001.md"
  - "docs/dev-loop/reports/AUDIT-DIRECTOR-IA-PLAUD-CLOSE-MEETING-EVAL-002.md"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
secrets_check: "none"
human_decision_needed:
  - "G5 LOOP: HUMAN_APPROVER cierra esta tarea. NEXT_TASK no está autorizada ni ejecutada."
  - "ARCH-DIRECTOR-IA-PRE-MEETING-FINANCIAL-ACTUAL-001 permanece congelada y no es el siguiente paso recomendado."
  - "52.5% no cambia (0.0 pp). Las tasas EVAL-003 son solo de auditoría."
  - "No se crearon truth classes normativas."
```

## 1. Executive verdict

La junta Plaud del 2026-08-25 es **PRE_CLOSE / CLOSING-STEERING**, no `CLOSED_FINAL`. Agosto sigue abierto. El trabajo de la sala no fue “¿cómo cerramos realmente?” sino **mover variables, recalcular y comprometer un escenario de cierre**.

Si Director IA hubiera preparado esa junta con el runtime actual, habría podido llevar, planta por planta y con limitaciones:

- un **FORECAST IGF vigente** (proyección, no actual);
- un **daily de ayer** y una **tendencia comercial 90d**;
- **acciones** del Action Register y **apoyos reviewable**;
- **huecos** (`information_gaps`) y, si se invocaba `month_close_result` con cue de cierre, **venta ARR del mes calendario en periodo PARTIAL**.

No habría podido presentar como hecho:

- el escenario intervenido (Puebla ~1,177 t / ~775 mil; Tehuacán ~440/548 mil; Acapulco ~1,536 t; Querétaro ~773 t; regional ~+632 mil);
- los compromisos humanos nacidos en la sala;
- el what-if de descuento + toneladas + HG;
- la inconsistencia de canal de Acapulco;
- la validación en vivo de Morelos;
- un `ACTUAL_FINANCIAL` de agosto (`NOT_FINAL` mientras el mes está abierto).

`~632 mil` **no** es `ACTUAL_FINANCIAL`. Es `FORECAST / CLOSING_SCENARIO` condicionado a “cuidar que se cumpla”. Toda cifra Plaud es `MEETING_STATEMENT` hasta reconciliarla con evidencia física.

La evidencia **exige** una arquitectura futura que distinga, sin crear aún clases normativas:

`ACTUAL_TO_DATE` → `BASE_FORECAST` → `PROPOSED_INTERVENTION` → `CLOSING_SCENARIO` → `HUMAN_COMMITMENT` → `FINAL_ACTUAL`.

Director IA **no termina en PRE_CLOSE**. El camino que debe quedar abierto es:

`OPEN_MONTH` → `PRE_CLOSE` → `CLOSED_NOT_FINAL` → `CLOSED_FINAL` → `COUNCIL_FINAL` → `POST_CLOSE_FOLLOWUP`

con trazabilidad `TARGET → FORECAST → INTERVENTION/COMMITMENT → FINAL → LESSON/ACTION`.

Cuello único demostrado: **`pre_close_composition_missing`**.

No es `pre_meeting financial actual`. Inyectar `ACTUAL_FINANCIAL` FINAL de otro mes en el brief de esta junta no responde “qué hay que mover para cerrar agosto”.

`ARCH-DIRECTOR-IA-PRE-MEETING-FINANCIAL-ACTUAL-001` permanece **sin ejecutar**. Esta auditoría recomienda **no** tomarla como siguiente paso.

Matriz: **10.5 / 20 = 52.5%**. Delta **0.0 pp**.

## 2. Source packet

### Packet A — junta 2026-08-25

| Campo | Valor |
|---|---|
| Título Plaud | Reunión: Zona Provincia ajusta operaciones y proyecta cierre |
| Fecha | 2026-08-25 |
| Duración | 44m 54s |
| Clasificación humana | PRE_CLOSE / CLOSING-STEERING |
| Mes | agosto 2026 **abierto** |
| CLOSED_FINAL | no |

**Límite de evidencia:** no hay transcripción cruda (VTT/TXT/JSON) en el repositorio. La muestra EVAL-003 se construyó desde los **hechos observados** del packet autorizado en `CURRENT_TASK` / prompt humano. No se inventaron preguntas de Consejo dentro de N. Las preguntas what-if se incluyeron porque el packet afirma que la junta las ejecutó.

Patrón repetido en sala:

`ESTADO ACTUAL → TENDENCIA → CAMBIO PROPUESTO → RECÁLCULO → RESULTADO PROYECTADO → COMPROMISO / ACCIÓN`

Plantas trabajadas: Puebla, Tehuacán, Acapulco, Querétaro, San Luis, Morelos, más cierre regional Zona Provincia.

### Packet B — histórico CLOSE (intacto)

| | EVAL-001 | EVAL-002 |
|---|---|---|
| N | 26 | 26 |
| anticipated | 4/26 = 15.4% | 8/26 = 30.8% |
| prepared | 9/26 = 34.6% | 12/26 = 46.2% |
| unsupported | 6/26 = 23.1% | 5/26 = 19.2% |
| PARTIALLY | 11 | 9 |
| cuello | `close_meeting_month_result_vs_target_not_composed` | `close_meeting_financial_actual_unsupported` |

Esas tasas son **históricas**. No se recomputaron. No se mezclaron con EVAL-003.

## 3. Meeting classification

| Pregunta | Veredicto |
|---|---|
| ¿Es junta de cierre final? | **No.** |
| ¿Es Consejo? | **No.** |
| ¿Agosto está FINAL? | **No.** El mes sigue abierto. |
| Ritual observado | **PRE_CLOSE_STEERING**: conducir el cierre restante, no sellar el mes. |
| Rol de las cifras | Escenario / recálculo / compromiso. No actual financiero final. |
| Implicación runtime | `financial.actual` de agosto, si se invocara `month_close_result`, debe quedar `NOT_FINAL`. IGF vigente = FORECAST. |

`pre_meeting_brief` etiqueta hoy `meeting_type=monthly_close` y el cue `pre-cierre` / `precierre` **enciende** `pre_meeting` y **bloquea** `month_close_result` (`isPrepMeetingCue`). El camino natural de “prepárame el pre-cierre” **no** carga el pack de cierre de mes.

## 4. Executive-cycle taxonomy

| Modo | Pregunta del modo | Evidencia |
|---|---|---|
| MODE 1 `OPEN_MONTH_MONITORING` | ¿Cómo vamos? | Daily + trend + IGF abierto existen. No fueron el ritual de hoy. |
| MODE 2 `PRE_CLOSE_STEERING` | ¿Qué tenemos que mover para cerrar? | **Esta junta.** Seis plantas + zona. |
| MODE 3 `CLOSED_NOT_FINAL` | ¿Qué sabemos y qué falta de sello? | Códigos `PARTIAL` / `NOT_FINAL` ya existen en `month_close_result`. No es esta muestra. |
| MODE 4 `CLOSED_FINAL` | ¿Cómo terminamos realmente? | EVAL-001/002 + `ACTUAL_FINANCIAL` si hay versión FINAL. |
| MODE 5 `COUNCIL_FINAL` | ¿Qué pasó contra meta/forecast/compromisos y qué decidir? | Requisito humano de esta auditoría. No ocurrió hoy. |
| MODE 6 `POST_CLOSE_FOLLOWUP` | ¿Qué quedó y qué aprendimos? | Action Register cubre acciones abiertas. No hay lesson store. |

Veredicto del modelo: **SUPPORTED_WITH_ADJUSTMENTS**.

Ajustes exigidos por la evidencia, no por estética:

- PRE_CLOSE necesita composición de conducción (current / base / gap / decisión), no un dump de KPI.
- COUNCIL necesita historia de compromiso/escenario + FINAL. Sin eso, las 14 preguntas del Consejo no cierran.
- `CLOSED_NOT_FINAL` ya está nombrado en runtime; no debe confundirse con PRE_CLOSE ni con FINAL.
- POST_CLOSE no es solo Action Register: falta lección defendible.

## 5. EVAL-003 sample construction

N propio = **24**. Independiente de N=26.

Criterio: intención realmente preguntada, decidida o necesitada en la junta del packet A. Formulación normalizada. Sin preguntas puramente hipotéticas de Consejo. What-if incluido porque la sala lo ejecutó.

| ID | Intención normalizada | Familia | Mapa al packet |
|---|---|---|---|
| Z1 | ¿Cuál es la pérdida regional y la presión de liquidez/apoyos/inversiones? | FINANCIAL_RESULT | Apertura >~15 M |
| Z2 | ¿Qué mejoras podemos lograr en las variables? | INTERVENTION | Objetivo explícito de la junta |
| Z3 | ¿Cómo queda el escenario regional (~+632 mil) si se cumple? | CLOSING_SCENARIO | Cierre Zona Provincia |
| P1 | ¿Cuál es la venta acumulada real de Puebla (~863 t)? | CURRENT_STATE | Puebla, día previo |
| P2 | ¿Cuál es la tendencia/base de Puebla (~1,126 t)? | BASE_FORECAST | Puebla |
| P3 | Tras intervención, ¿Puebla queda ~1,177 t / ~775 mil? | CLOSING_SCENARIO | Puebla recálculo |
| P4 | Así como quedaron, ¿cómo está quedando el número? | FINANCIAL_RESULT | Pregunta material Puebla |
| P5 | ¿Cuál es HG actual vs esperado, descuento y margen? | CURRENT_STATE | 6.11 / 6.56 / 4.54 / 6.50 |
| P6 | ¿Se puede recortar más gasto/taller? | EXPENSE | Taller ya ajustado |
| T1 | ¿Cuál es la tendencia de Tehuacán (~820 t)? | BASE_FORECAST | Tehuacán |
| T2 | ¿+20 t CASA y palancas desc/comisión/HG/gasto? | INTERVENTION | Tehuacán |
| T3 | ¿Cómo queda la pérdida Tehuacán (~440 / ~548 mil)? | CLOSING_SCENARIO | Recálculo |
| A1 | ¿Acapulco 1,496 +40 t a desc ~0.50 en terceros? | INTERVENTION | Acapulco |
| A2 | ¿El volumen está mal clasificado de canal? | DATA_QUALITY | Inconsistencia descubierta |
| A3 | Dos cálculos coinciden: ¿eso es verdad? | RECONCILIATION | agreement ≠ truth |
| Q1 | Querétaro 758 +15: ¿resultado después de los cambios? | CLOSING_SCENARIO | Pregunta explícita |
| Q2 | ¿Qué recorte de gasto sigue sin identificar? | EXPENSE | INFORMATION_GAP / OPEN_DECISION |
| S1 | Confirmar el compromiso de cierre de San Luis | COMMITMENT | No solo describir estado |
| M1 | ¿Hay deterioro comercial y riesgo de clientes en Morelos? | RISK | Deterioro + clientes |
| M2 | ¿Cuánto se puede vender realmente? | COMMITMENT | Llamada en la junta |
| M3 | Telolapan / descuentos / HG / número que cambia | CLIENT | Validación iterativa |
| W1 | Si doy más descuento y recupero X t, ¿cómo quedamos? | INTERVENTION | What-if ejecutado |
| W2 | Si quitamos este gasto, ¿cómo cambia? | EXPENSE | What-if ejecutado |
| W3 | Si HG llega a X, ¿qué resultado da? | INTERVENTION | What-if ejecutado |

Familias **no** usadas en N porque no hubo intención extraíble sin inventar: `TARGET`, `WHY_CAUSAL`, `COUNCIL_TRACEABILITY`, `ACTION` (el Action Register no fue el objeto de la sala), `OTHER`.

## 6. Intent-level evaluation

Reglas:

- Evaluar capacidad **antes** de que empezara la junta, contra runtime real.
- Detectar un gap ≠ saber la respuesta.
- `igf.compromiso_lines` = snapshot FORECAST. **No** es `HUMAN_COMMITMENT` de esta junta.
- `igf_meta` = `TARGET_COMMITMENT` gerencial del mes. **No** es “Puebla va por 1,177”.
- Action Register ≠ historial de compromisos de cierre.
- Declaración Plaud = `MEETING_STATEMENT`.

| ID | Capacidad | ANTICIPATED | PREPARED | Fuente física usable | Por qué no es más |
|---|---|---|---|---|---|
| Z1 | PARTIALLY_ANSWERABLE | PARTIAL | PARTIAL | IGF abierto (resultado FORECAST); reviewable (apoyos) | 15 M no es `ACTUAL_FINANCIAL`. Agosto `NOT_FINAL`. `pre_meeting` es una planta, no rollup regional. |
| Z2 | GAP_DETECTABLE | PARTIAL | YES | IGF composición (HG, gasto, desc); plantas en negativo; reviewable; gaps | Puede marcar qué variables pesan en el FORECAST oficial. No calcula “qué mejora logramos”. |
| Z3 | UNSUPPORTED | NO | NO | ninguna | +632 mil nace en la sala y está condicionado. |
| P1 | PARTIALLY_ANSWERABLE | PARTIAL | PARTIAL | ARR mes calendario; `month_close_result` PARTIAL `SUM(kg)` | El brief de pre-cierre **no** carga month_close. Daily = ayer ≠ acumulado. ARR puede existir dentro del bloque IGF, no como `ACTUAL_TO_DATE` de primer orden. |
| P2 | PARTIALLY_ANSWERABLE | PARTIAL | PARTIAL | IGF `venta_ton` latest; ARR/pronóstico | Latest ≠ “tendencia 1,126”. Trend 90d no es run-rate de cierre de agosto. |
| P3 | UNSUPPORTED | NO | NO | ninguna | Escenario intervenido no persistido. |
| P4 | GAP_DETECTABLE | NO | PARTIAL | IGF resultado oficial (base) | La pregunta es post-intervención. Puede llevar el número oficial; no el recálculo “así como quedaron”. Cue “quedando el número” no enciende month_close. |
| P5 | PARTIALLY_ANSWERABLE | PARTIAL | PARTIAL | IGF `hg_kg` / `hg_pct` / `com_desc_kg` / `margen_kg`; ARR desc | Snapshot FORECAST, no par actual-vs-esperado de la sala (6.11 vs 6.56). |
| P6 | GAP_DETECTABLE | PARTIAL | PARTIAL | reviewable + IGF `gasto_kg` | Taller Mayor está **excluido** del first slice. “Ya muy ajustado” es juicio de sala. |
| T1 | PARTIALLY_ANSWERABLE | PARTIAL | PARTIAL | IGF / ARR Tehuacán | Misma reserva que P2. |
| T2 | UNSUPPORTED | NO | NO | mix CASA existe, no el +20 | La intervención no está registrada. |
| T3 | UNSUPPORTED | NO | NO | ninguna | Recálculo de sala. |
| A1 | UNSUPPORTED | NO | NO | ninguna | +40 t / 0.50 / terceros = propuesta de sala. |
| A2 | UNSUPPORTED | NO | NO | CASA/COMISIONISTA comercial | No hay detector de “volumen en canal equivocado”. |
| A3 | UNSUPPORTED | NO | NO | `FINANCIAL_ACTUAL_RECONCILIATION_GAP` solo Finance vs ARR **si** hay FINAL | Acuerdo entre dos cálculos no dispara gap. agreement ≠ truth no está operacionalizado para canal. |
| Q1 | UNSUPPORTED | NO | NO | ninguna | Resultado post-cambios de sala. |
| Q2 | GAP_DETECTABLE | PARTIAL | YES | reviewable abiertos; IGF gasto | Puede marcar “gasto no explicado”. No identifica el recorte buscado. OPEN_DECISION, no causa. |
| S1 | UNSUPPORTED | NO | NO | IGF latest ≠ compromiso nuevo | No hay commitment store. |
| M1 | PARTIALLY_ANSWERABLE | YES | YES | commercial_trend 90d; movers (cap 3); client profile | Puede traer deterioro/movers. No puede afirmar causa (cliente, competencia, etc.). |
| M2 | GAP_DETECTABLE | PARTIAL | PARTIAL | IGF/ARR como supuesto de volumen | La respuesta real nació en una llamada en vivo. |
| M3 | PARTIALLY_ANSWERABLE | PARTIAL | PARTIAL | client profile si Telolapan está nombrado | El número se reescribe en sala. Perfil ≠ compromiso defendible. |
| W1 | UNSUPPORTED | NO | NO | overlay reviewable es cancelar folio, no desc+t | Unsafe como forecast oficial. |
| W2 | PARTIALLY_ANSWERABLE | PARTIAL | PARTIAL | `igf_reviewable_supports` overlay live | Solo si el gasto es folio reviewable. Recorte de línea de planta ≠ overlay. |
| W3 | UNSUPPORTED | NO | NO | `hg_kg` stored; sin palanca what-if | No hay slider HG contractual. |

## 7. Quantitative audit metrics

Definiciones EVAL-003 (no son las de EVAL-002):

| Métrica | Definición | Valor |
|---|---|---|
| N | intenciones extraídas de la junta 2026-08-25 | **24** |
| anticipated_rate | `ANTICIPATED_BEFORE_MEETING=YES` / N | **1/24 = 4.2%** |
| prepared_rate | `PREPARED_BEFORE_MEETING=YES` / N | **3/24 = 12.5%** |
| unsupported_rate | `UNSUPPORTED` / N | **11/24 = 45.8%** |
| partially_answerable | count | **8** |
| gap_detectable | count | **5** |
| answerable_now | count | **0** |
| anticipated PARTIAL | count | 11 |
| prepared PARTIAL | count | 10 |

Estas tasas son **AUDIT METRICS**. No KPI. No score de matriz. No se mezclan con 8/26, 12/26, 5/26.

`ANSWERABLE_NOW = 0` no significa “Director IA no tiene fuentes”. Significa: **ninguna** intención de esta junta de conducción se responde de forma completa y con la semántica que la sala usó (actual vs tendencia vs escenario vs compromiso).

## 8. What Director IA could have known before meeting

Contra runtime real, un brief **antes** de entrar habría podido presentar correctamente, si las fuentes existían para cada planta:

| Bloque | Qué sí | Semántica obligatoria |
|---|---|---|
| Venta de ayer | `daily_executive_brief` | Ayer ≠ acumulado de agosto. |
| Acumulado comercial de agosto | ARR mes calendario y/o `month_close_result` PARTIAL | Solo si se invoca cierre de mes, no el cue `pre-cierre`. `ACTUAL_COMMERCIAL` to-date. No financiero final. |
| Tendencia 90d / movers | `commercial_trend` + hasta 3 perfiles | No es la “tendencia 1,126 t” de Puebla. |
| FORECAST oficial | IGF latest del mes abierto (`igf.compromiso_lines`) | FORECAST. Incluye venta, HG, desc, gasto, utilidad, resultado. |
| Meta gerencial | `igf_meta` vía `month_close_result` | `TARGET_COMMITMENT`. **Ausente** del first slice de `pre_meeting`. |
| Resultado financiero vigente | IGF resultado FORECAST | No `ACTUAL_FINANCIAL`. Agosto no FINAL. |
| Apoyos / folios | `igf_reviewable_supports` | reviewable ≠ recorte aprobado ≠ ahorro. |
| Acciones abiertas | Action Register | Acciones ≠ compromiso de cierre 1,177 t. |
| Huecos | `information_gaps` de pre_meeting / month_close | Puede declarar fuente faltante, TARGET missing, actual no FINAL. |

Pregunta central 1, respuesta corta: **sí puede preparar un panorama oficial (ayer + trend + IGF + acciones + reviewable + gaps)**. **No** puede preparar el tablero con el que la sala realmente trabajó (base vs intervención vs escenario vs compromiso).

## 9. What it could only have flagged as a gap

Pregunta central 3. Marcar sin inventar la respuesta:

| Pregunta que sí podía dejar escrita | Evidencia runtime | Intenciones cubiertas |
|---|---|---|
| ¿Qué plantas siguen con resultado FORECAST negativo? | IGF latest por planta | Z2 |
| ¿Qué partidas IGF (HG, gasto, desc, apoyos, inversión) pesan? | catálogo IGF | Z2, P5, P6 |
| ¿Hay ACTUAL_FINANCIAL de agosto? | `NOT_FINAL` / no FINAL | Z1 |
| ¿El acumulado comercial y el IGF venta_ton discrepan? | ARR vs IGF en composición | P1 vs P2 |
| ¿Qué gasto/apoyo reviewable sigue abierto? | reviewable | P6, Q2, W2 |
| ¿Qué forecast depende de volumen no validado? | IGF/ARR sin confirmación de cliente | M2 |
| ¿Qué acciones vencidas no tienen resultado? | AR | no estuvo en N; sí es gap físico |
| ¿Falta META `igf_meta` del YYYY-MM? | `TARGET_MISSING_FOR_PERIOD` en month_close | no preguntado hoy; sí es gap físico |

Esto es `PREPARED / GAP_DETECTED`. No es respuesta. Z2 y Q2 se contaron `PREPARED=YES` por esta vía.

No puede marcar, porque no tiene detector:

- “el canal de Acapulco está mal clasificado”;
- “dos hojas coinciden porque comparten el error”;
- “el recorte de Querétaro es este folio concreto” (salvo que ya esté en reviewable y alguien lo pida).

## 10. What remained unknowable before meeting

Pregunta central 2. Inconocible antes de entrar, aunque el brief fuera perfecto:

| Clase | Ejemplos de esta junta |
|---|---|
| Propuesta de intervención no registrada | Puebla 1,177; Acapulco +40; Querétaro +15; Tehuacán +20 CASA |
| Compromiso humano nuevo | San Luis “vamos por este cierre”; Morelos volumen defendible; “cuidar que se cumpla” el +632 mil |
| Recorte decidido / incompleto en sala | Querétaro OPEN_DECISION |
| Llamada / negociación nueva | Morelos, Telolapan, validación en vivo |
| Error de clasificación recién descubierto | canal Acapulco |
| Causalidad verbal no persistida | cualquier “porque el cliente / descuento / HG / huachicol” |
| Escenario what-if no materializado | W1, W3, recálculos P3/T3/Q1/Z3 |
| ACTUAL_FINANCIAL de agosto | mes abierto |

Ninguna de estas ausencias se cura poniendo julio FINAL en `pre_meeting`.

## 11. Current / base / intervention / scenario / commitment / final distinction

La sala usó **seis capas distintas** en la misma hora. El runtime actual tiene nombres para **algunas**, y las colapsa o las omite para otras.

| Capa observada | ¿Existe objeto físico hoy? | Qué hay realmente | Riesgo si se colapsa |
|---|---|---|---|
| 1. `ACTUAL_TO_DATE` | PARCIAL | ARR / month_close PARTIAL venta | Confundir ayer, MTD y IGF `venta_ton` |
| 2. `BASE_FORECAST` | PARCIAL | IGF latest = FORECAST oficial | Tratar latest como “tendencia de sala” o como escenario ya intervenido |
| 3. `PROPOSED_INTERVENTION` | NO | no hay store de palancas | El what-if se pierde |
| 4. `CLOSING_SCENARIO` | NO | overlay reviewable ≠ este objeto | +632 mil se leería como actual o como IGF oficial |
| 5. `HUMAN_COMMITMENT` | NO | `igf_meta` es meta del mes; AR es acción | “Puebla va por 1,177” no queda |
| 6. `FINAL_ACTUAL` | SÍ, si FINAL | `ACTUAL_FINANCIAL` + ARR del mes cerrado | Usarlo en agosto abierto = violación de contrato |

**Veredicto:** la evidencia **exige** arquitectura futura que las distinga. Esta tarea **no** crea truth classes normativas.

Regla de esta auditoría, ya operativa en espíritu de contratos vigentes:

- IGF ≠ actual.
- `igf_meta` ≠ compromiso de intervención de la junta.
- `igf.compromiso_lines` ≠ `HUMAN_COMMITMENT`.
- Plaud ≠ verdad física.
- `agreement_between_calculations != truth`.

## 12. Plant-by-plant evidence

| Planta | Actual to-date (sala) | Base / tendencia (sala) | Intervención | Escenario | Compromiso / gap | ¿Director IA antes de entrar? |
|---|---|---|---|---|---|---|
| Puebla | ~863 t | ~1,126 t | desc, vol, HG 6.11→6.56, margen 6.50, recortes | ~1,177 t; pérdida ~775 mil | “¿cómo está quedando el número?” | Acumulado y IGF oficiales: parcial. Escenario: no. |
| Tehuacán | no citado como acumulado | ~820 t | +~20 t CASA; desc/comisión/HG/gasto | op ~440 mil; monetario ~548 mil | distingue tendencia vs post-intervención | Base IGF: parcial. Recálculo: no. |
| Acapulco | no citado como acumulado | ~1,496 t | +40 t; desc ~0.50/L; terceros | ~1,536 t | **data quality de canal** | Escenario: no. Canal mal clasificado: no. |
| Querétaro | no citado como acumulado | ~758 t | +15 t; comisión/desc/gasto/apoyos/inversión | ~773 t + “resultado después” | recorte incompleto = OPEN_DECISION | Resultado post-cambio: no. Gap de gasto: sí marcar. |
| San Luis | tendencia de venta | tendencia | HG/comisión/margen/gastos/apoyos/bonos | no se dio un número regional propio en el packet | **confirmar compromiso de cierre** | Describir IGF: parcial. Confirmar compromiso nuevo: no. |
| Morelos | número móvil | deterioro | descuentos, Telolapan, HG, recortes | utilidad/pérdida que se reescribe | ASSUMPTION→VALIDATION→COMMITMENT | Deterioro/movers: sí. Volumen defendible en vivo: no. |
| Zona Provincia | pérdida >~15 M (statement) | IGF/ops de sala | suma de intervenciones | **~+632 mil condicionado** | “cuidar que se cumpla” | 15 M como actual: no. +632 mil: no. Rollup regional de conducción: no. |

## 13. Data-quality / reconciliation findings

Caso de prueba: **Acapulco**. Dos participantes llegaron al mismo número porque ambos usaban el mismo volumen mal canalizado.

| Capacidad pedida | ¿Hoy? | Evidencia física |
|---|---|---|
| 1. Detectar discrepancias entre fuentes | PARCIAL | `FINANCIAL_ACTUAL_RECONCILIATION_GAP`: Finance `venta_ton` vs ARR `venta_ton` **solo** cuando existe `ACTUAL_FINANCIAL` FINAL. No aplica a agosto abierto. No compara canales. |
| 2. Identificar canal inconsistente | NO | Mix CASA/COMISIONISTA existe. No hay cruce “estaciones de terceros” vs clasificación persistida. |
| 3. Preservar ambas evidencias | SÍ, en el gap financiero existente | Finance y ARR se conservan. No se elige ganador. |
| 4. Marcar `DATA_QUALITY_GAP` | SOLO la clase financiera existente | No hay clase de canal. Esta tarea no crea una. |
| 5. Evitar elegir ganador | SÍ en el gap financiero | El caso Acapulco **no** entra a ese código. |

Separación obligatoria (no implementar):

- `FINANCIAL_ACTUAL_RECONCILIATION_GAP` (ya existe; tons Finance vs ARR; FINAL).
- `COMMERCIAL_CHANNEL_DATA_QUALITY_GAP` **potencial** (Acapulco; no normativa aquí).

Invariante a preservar: **`agreement_between_calculations != truth`**.

## 14. What-if / scenario analysis findings

La junta hizo what-if en **6/6 plantas** y en el rollup zonal. Frecuencia alta. Valor ejecutivo alto: es el método de conducción.

| Pregunta de sala | ¿Defendible hoy? |
|---|---|
| Si doy más descuento y recupero X t, ¿cómo quedamos? | No. |
| Si quitamos este gasto, ¿cómo cambia? | Solo overlay de folio reviewable, hipotético, no oficial. |
| Si HG llega a X, ¿qué resultado da? | No. |

Clasificación de requerimientos (no implementar):

| Requerimiento | Veredicto |
|---|---|
| `existing_formula_reusable` | **PARCIAL.** `recalcularUtilYResultado` + fila IGF + overlay de folios ya existen. No cubren palanca desc+volumen+HG de conducción. |
| `new_model_required` | **Sí**, si se quiere ese what-if como capacidad. |
| `new_contract_required` | **Sí.** `CLOSING_SCENARIO` / what-if debe vivir **separado** del FORECAST oficial y del `ACTUAL_FINANCIAL`. |
| `human_input_required` | **Sí.** Las X t, los 10 centavos y el HG objetivo son supuestos humanos. |
| `unsafe_to_compute` | **Sí** si el resultado se presenta como forecast oficial, como actual, o como causa. |

WHAT_IF / SCENARIO_ANALYSIS es capacidad futura. No se implementa. No es el cuello único elegido: sin composición y sin semántica de verdad, un calculador what-if sería un segundo IGF informal.

## 15. Commitment-history audit

Objetos que la sala generó y que un Consejo futuro necesitará:

- “Puebla va por ~1,177 t”
- “Acapulco buscará +40 t”
- “Querétaro +15 t y recortes”
- “Morelos no puede comprometer más de X”
- “se quitará este gasto”
- “Zona Provincia ~+632 mil si se cumple”

| Candidato a fuente | ¿Sirve? |
|---|---|
| Action Register | **No.** Es trabajo asignado, no historial de compromiso de cierre. |
| `igf.compromiso_lines` | **No.** Es FORECAST uploaded. El nombre “compromiso” es trampa semántica. |
| `igf_meta` | **No.** Es meta gerencial del mes, no la intervención del 25-ago. |
| Persistent memory / conversation | **No.** Work items / requery. No commitment history. |
| Plaud / pre_meeting | **No.** Plaud está excluido. Reunión ≠ verdad. |
| Tabla SQL de commitment/scenario | **No existe** (búsqueda en `sql/` sin matches). |

Veredicto: **MISSING_INFRASTRUCTURE**.

No es `EXISTS`. No es solo `MISSING_PHYSICAL_DATA` (los humanos sí dijeron los números; falta el store defendible que no convierta Plaud en verdad física).

Crítico para `COUNCIL_FINAL`.

## 16. Scenario-history audit

¿Las versiones IGF actuales permiten reconstruir de forma defendible “cómo proyectábamos antes”, “qué escenario se aprobó”, “cuál cambió después”?

| Hecho físico | Implicación |
|---|---|
| Hay versiones IGF (latest / históricas / SUPERSEDED) | Hay **uploads**, no as-of de negocio. |
| `created_at` = timestamp de carga | **≠** business effective timestamp. |
| No hay sello “escenario aprobado en junta 2026-08-25” | No se puede afirmar qué versión es pre-intervención vs post. |
| Overlay reviewable es live en memoria | No historial de escenarios. |

Veredicto: **NOT_DEFENSIBLE**.

No inventar as-of. Una versión más nueva no es “el escenario de la junta”.

## 17. Council / final readiness

Pregunta central 4. Aunque la muestra de hoy es PRE_CLOSE, Director IA debe poder preparar `CLOSED_FINAL` / `COUNCIL_FINAL` cuando existan fuentes.

| # | Pregunta del Consejo | Clasificación |
|---|---|---|
| 1 | ¿Cómo cerramos realmente? | **SUPPORTED_AFTER_FINAL** — `month_close_result` + `ACTUAL_FINANCIAL` si GLOBAL FINAL |
| 2 | ¿Contra qué meta? | **SUPPORTED_NOW** — `igf_meta` / `TARGET_COMMITMENT` si existe el YYYY-MM |
| 3 | ¿Contra qué forecast? | **SUPPORTED_NOW** — IGF latest como FORECAST **oficial**. No contra el escenario de la junta. |
| 4 | ¿Contra qué compromisos/intervenciones del mes? | **REQUIRES_COMMITMENT_HISTORY** |
| 5 | ¿Qué se cumplió? | **REQUIRES_COMMITMENT_HISTORY** |
| 6 | ¿Qué no se cumplió? | **REQUIRES_COMMITMENT_HISTORY** |
| 7 | ¿Dónde estuvo la desviación? | **SUPPORTED_AFTER_FINAL** vs meta/forecast oficiales (comercial + financiero). No vs 1,177 / +40 / +632 mil. |
| 8 | ¿Qué explicación está respaldada por evidencia? | **REQUIRES_CAUSAL_EVIDENCE** |
| 9 | ¿Qué sigue sin explicación? | **SUPPORTED_NOW** en forma débil (gaps). No grado Consejo. |
| 10 | ¿Qué decisiones anteriores funcionaron? | **REQUIRES_COMMITMENT_HISTORY** + FINAL |
| 11 | ¿Qué decisiones no funcionaron? | **REQUIRES_COMMITMENT_HISTORY** + FINAL |
| 12 | ¿Qué acciones siguen abiertas? | **SUPPORTED_NOW** — Action Register |
| 13 | ¿Qué debe decidir el Consejo? | **UNSUPPORTED_PHYSICAL_DATA** (no hay objeto DECISION_NEEDED) |
| 14 | ¿Qué aprendemos para el siguiente mes? | **UNSUPPORTED_PHYSICAL_DATA** (no lesson store) |

Trazabilidad PRE_CLOSE → FINAL pedida:

| Compromiso de sala | Pregunta futura | Hoy |
|---|---|---|
| Puebla ~1,177 t | ¿cuánto terminó realmente? | FINAL comercial sí (después). Compromiso no persistido. |
| Acapulco +40 t | ¿se materializaron? | Idem. |
| Querétaro +15 t y recortes | ¿se realizaron? | Idem. |
| Morelos volumen defendible | ¿qué pasó? | Idem. |
| Zona ~+632 mil | ¿cuál fue `ACTUAL_FINANCIAL` FINAL? | FINAL sí, si hay sello. El 632 mil no queda como baseline. |

Sin commitment/scenario history, el Consejo solo puede comparar **FINAL vs meta vs IGF oficial**. Eso es necesario y **insuficiente** frente a lo que esta junta produjo.

## 18. Pre-close vs council architecture implications

Opciones evaluadas (no por estética):

| Opción | Qué es | Fuentes | Estado temporal | Truth | Reuso | Follow-ups | Duplicación |
|---|---|---|---|---|---|---|---|
| A | un `pre_meeting_brief` con `meeting_mode` interno | Mezclaría OPEN IGF y FINAL actual en el mismo intent | Alto riesgo de colapsar PRE_CLOSE con COUNCIL | Peligro: el modo “council” metería `ACTUAL_FINANCIAL` en el mismo pack que el mes abierto | Bajo | Confusos | Baja cantidad de intents, alta contaminación |
| B | `pre_meeting_brief` para preparación + composición canónica close/council compartida | Cada ritual usa las mismas fuentes con capas legales distintas | OPEN/PARTIAL vs FINAL se seleccionan por periodo, no por nombre de junta | Correcto: PRE_CLOSE no proyecta FINAL; COUNCIL no degrada FINAL a IGF | Alto (`month_close_result` ya es el kernel close/final) | pre_meeting follow-ups ≠ month_close follow-ups, ya separados | Evita un tercer dump |
| C | intents separados por ritual | Copia de loaders | Claro pero rígido | Claro | Bajo | Muchos | Alta |

**Selección: B**, con ajuste:

1. `pre_meeting_brief` sigue siendo preparación de mes **abierto** / PRE_CLOSE: current to-date (si se declara), FORECAST, gaps, acciones, reviewable. Sin Plaud. Sin vender IGF como actual.
2. `month_close_result` sigue siendo la composición canónica de `CLOSED_NOT_FINAL` / `CLOSED_FINAL` y la base de `COUNCIL_FINAL` cuando hay FINAL.
3. Un kernel compartido de capas (actual comercial, target, forecast, actual financiero, más adelante commitment/scenario) evita reimplementar loaders.
4. `meeting_mode` **dentro** de pre_meeting, solo, no basta: hoy `meeting_type=monthly_close` ya nombra mal el ritual de hoy.
5. No crear intents `pre_close` / `council` que dupliquen month_close.

`ARCH-DIRECTOR-IA-PRE-MEETING-FINANCIAL-ACTUAL-001` (meter FINAL en pre_meeting) **no** resuelve PRE_CLOSE de agosto abierto y **sí** empuja hacia la contaminación de la opción A. Debe permanecer congelada.

## 19. EVAL-001 / EVAL-002 / EVAL-003 comparison

Comparación **cualitativa**. No forzar pp entre rituales distintos.

| | EVAL-001 / 002 | EVAL-003 |
|---|---|---|
| Ritual | CLOSE de mes (minutas de cierre) | PRE_CLOSE de conducción (agosto abierto) |
| Pregunta dominante | ¿Cómo cerramos / vs meta / vs actual? | ¿Qué movemos para cerrar? |
| N | 26 (misma muestra) | 24 (muestra nueva) |
| Qué mejoró `month_close_result` | Venta/mix/descuento/clientes del mes calendario (5 filas en EVAL-002) | Ayuda al **acumulado** si se invoca, no al escenario de sala |
| Qué mejoró `ACTUAL_FINANCIAL` | Cierra el cuello económico de EVAL-002 **cuando hay FINAL** | **No aplica** a esta junta. Agosto no FINAL. |
| Qué sigue abierto por ser PRE_CLOSE | — | Escenario, what-if, compromiso, rollup condicionado |
| Qué aparece nuevo | WHAT_NEXT / supply / causal de cierre | Intervención, what-if, data quality de canal, commitment history, validación en vivo |

No se declara que EVAL-003 “empeoró” respecto de 30.8% / 46.2%. Son **otro ritual**. Las tasas 4.2% / 12.5% / 45.8% miden preparación de **conducción**, no de **sello**.

## 20. Physical / runtime bottlenecks

| Bottleneck | ¿Demostrado hoy? | Frecuencia en EVAL-003 |
|---|---|---|
| `pre_close_composition_missing` | **Sí.** El brief no estructura current / base / target / gap / decisión / escenario. Cue `pre-cierre` excluye month_close y no sustituye esa composición. | 6/6 plantas + zona usan el patrón de conducción |
| `scenario_analysis_missing` | Sí, como método de sala | W1–W3 + recálculos P3/T3/Q1/Z3 |
| `commitment_history_missing` | Sí, para el ciclo hacia Consejo | S1, M2, Z3, P3, A1, Q1 |
| reconciliation / data quality de canal | Sí, un caso | A2, A3 (1 incidente) |
| `council_traceability_missing` | Sí, como requisito de ciclo | Fuera de N; sección 17 |
| `pre_meeting financial actual` | **No** como cuello de esta junta | Agosto abierto; FINAL de otro mes no conduce el cierre |

## 21. Exactly one demonstrated primary bottleneck

**Nombre:** `pre_close_composition_missing`

**Por qué uno solo, y por qué este:**

1. **Frecuencia.** El patrón ESTADO → TENDENCIA → CAMBIO → RECÁLCULO → ESCENARIO → COMPROMISO recorre **todas** las plantas y el cierre zonal. Es el trabajo de la junta.
2. **Antes de entrar.** El fallo principal no es “faltó julio FINAL”. Es que el Director no recibe un tablero de conducción: qué es actual to-date, qué es base, qué está en blanco (decisión / gap), qué no se puede afirmar.
3. **What-if no es el siguiente ladrillo.** Sin semántica de capas, un calculador de escenarios se leería como IGF oficial. Inseguro.
4. **Commitment history es crítica para Consejo**, pero es el objeto que se persistiría **después** de tener composición. Hoy no hay ni el marco para saber qué persistir sin convertir Plaud en verdad.
5. **Data quality de canal** es invariante real y debe preservarse; es 1 incidente, no el cuello de la hora.
6. **No** se eligió `pre_meeting financial actual`. La evidencia nueva **cambia** ese boundary.

## 22. Architectural implication

1. Director IA debe soportar el **ciclo completo**, no un intent `pre_meeting`.
2. PRE_CLOSE y COUNCIL no son el mismo pack con otro título.
3. Opción **B**: preparación (`pre_meeting_brief`) + composición canónica de cierre/consejo (`month_close_result` + capas futuras), sin duplicar intents por ritual.
4. Distinguir en diseño futuro, sin legislar ahora: `ACTUAL_TO_DATE`, `BASE_FORECAST`, `PROPOSED_INTERVENTION`, `CLOSING_SCENARIO`, `HUMAN_COMMITMENT`, `FINAL_ACTUAL`.
5. What-if vive **fuera** del forecast oficial.
6. Commitment/scenario store es infraestructura nueva; no reusar AR ni `compromiso_lines`.
7. Reunión = `MEETING_STATEMENT` (hypothesis / commitment / decision / action / explanation claim). Nunca causal truth automática.
8. Preservar `FINANCIAL_ACTUAL_RECONCILIATION_GAP` tal como está. No mezclarla con un gap de canal.
9. Camino no negociable: `CLOSED_FINAL` + `COUNCIL_FINAL` + `POST_CLOSE_FOLLOWUP` y trazabilidad `TARGET → FORECAST → INTERVENTION/COMMITMENT → FINAL → LESSON/ACTION`.
10. `ARCH-DIRECTOR-IA-PRE-MEETING-FINANCIAL-ACTUAL-001` **no** es el diseño que esta evidencia pide.

## 23. Matrix impact = none

| | |
|---|---|
| Baseline | 10.5 / 20 = 52.5% |
| Después | 10.5 / 20 = 52.5% |
| Delta | **0.0 pp** |

No se modificó la matriz. Esta auditoría no mide módulos.

## 24. Final verdict

| Campo | Valor |
|---|---|
| Clasificación de la junta | PRE_CLOSE / CLOSING-STEERING |
| ¿Podría haber contestado la junta? | Parcialmente el estado oficial. No la conducción. |
| ¿Podría haber preparado al Director antes? | Un brief de fuentes abiertas. No el tablero que usaron. |
| ¿Podría detectar inconsistencias? | Solo el gap financiero FINAL ya existente. No el canal de Acapulco. |
| ¿Podría distinguir hecho / proyección / escenario / compromiso? | No de forma explícita. La evidencia exige esa arquitectura futura. |
| ¿Podría acompañar el cierre? | No el recálculo ni el compromiso. Sí gaps y FORECAST oficial. |
| ¿Podría explicar después al Consejo qué ocurrió? | FINAL vs meta vs IGF oficial: sí, cuando haya FINAL. Vs intervenciones de esta junta: no. |
| ¿Podría comparar comprometido vs logrado? | **No.** `MISSING_INFRASTRUCTURE`. |
| ¿Podría convertir decisiones en seguimiento? | Solo si alguien abre una acción de AR. El compromiso de cierre no se convierte solo. |
| Modelo de ciclo | **SUPPORTED_WITH_ADJUSTMENTS** |
| Opción de brief | **B** |
| Commitment store | **MISSING_INFRASTRUCTURE** |
| Scenario history | **NOT_DEFENSIBLE** |
| What-if | futuro; `unsafe_to_compute` como oficial |
| Cuello | **`pre_close_composition_missing`** |
| Matriz | 52.5%, 0.0 pp |
| Readiness | `CONVERSATION_BASE_READY_WITH_LIMITS` |

Director IA **no** se reduce a `pre_meeting`. **No** termina en PRE_CLOSE.

## 25. Exactly one NEXT_TASK

**`ARCH-DIRECTOR-IA-PRE-CLOSE-STEERING-COMPOSITION-001`**

| Campo | Valor |
|---|---|
| Tipo | **ARCH** |
| ¿Por qué no AUDIT? | La evidencia de ritual ya está en EVAL-001/002/003. |
| ¿Por qué no IMPL? | Hay que fijar boundary y capas antes de código. |
| ¿Por qué no G2/G3 ahora? | No se legislan truth classes en esta tarea. G2 entra si el ARCH propone clases nuevas. |
| ¿Por qué no DECISION aislada? | La decisión de ritual (B vs A/C) es el contenido del ARCH, no un gate previo. |
| Alcance propuesto | Diseñar la composición PRE_CLOSE (current / target / base forecast / gap / decision needed / provenance) y su relación con `month_close_result` para CLOSED_FINAL / COUNCIL_FINAL / POST_CLOSE, **sin** implementar, **sin** meter `ACTUAL_FINANCIAL` en el brief de mes abierto, **sin** convertir Plaud en verdad. |
| Autorizada | **No.** |
| Ejecutada | **No.** |

`ARCH-DIRECTOR-IA-PRE-MEETING-FINANCIAL-ACTUAL-001` permanece congelada.

STOP. No commit. No push. No merge.
