# IMPL-DIRECTOR-IA-EXECUTIVE-DIAGNOSIS-OBSERVATIONS-RISKS-001

```yaml
task_id: "IMPL-DIRECTOR-IA-EXECUTIVE-DIAGNOSIS-OBSERVATIONS-RISKS-001"
outcome: "DONE"
mode: "IMPLEMENTATION"
implementation: true
code_changes: true
test_changes: true
docs_director_ia_changes: false
schema_changes: false
sql_changes: false
reference_main: "4ed43213"
source_audit: "docs/dev-loop/reports/AUDIT-DIRECTOR-IA-EXECUTIVE-DIAGNOSIS-001.md"
audit_commit: "4e89914f"
branch: "implementation/director-ia-executive-diagnosis-observations-risks-001"
cause_explanation: false
hypothesis: false
recommendations: false
priority: false
second_risk_engine: false
next_task_proposed: "IMPL-DIRECTOR-IA-EXECUTIVE-DIAGNOSIS-CAUSE-EXPLANATION-001"
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
human_decision_needed: "Revisar este slice. No autoriza CAUSE_EXPLANATION ni PRIORITY."
```

## 1. Resultado

**DONE_PENDING_REVIEW.** DIAGNOSIS responde únicamente con **OBSERVATION**, **DEVIATION** y **RISK** ya soportados por runtime PRE_CLOSE.

No se implementó HIPÓTESIS, CAUSA CONFIRMADA, `CAUSE_EXPLANATION`, recomendaciones ni PRIORITY.

Regla conservada: **detectar algo malo != saber por qué ocurrió**. **Correlación != causalidad**.

## 2. Baseline (reproducido en `4ed43213` / esta rama antes del cambio)

| Frase | Planner | Need CEL | Ruta |
|-------|---------|----------|------|
| ¿Qué debería preocuparme? | unknown | no_need | callejón |
| ¿Qué me debería preocupar? | unknown | no_need | callejón |
| ¿Dónde estamos fallando? | unknown | no_need | callejón |
| ¿Dónde tenemos problemas? | unknown | no_need | callejón |
| ¿Qué riesgos ves? | unknown | no_need | callejón |
| ¿Qué está funcionando y qué no? | unknown | no_need | callejón |
| ¿Qué te preocupa? | unknown | RISK_FOCUS later | detectado, no implementado |
| ¿Por qué estamos debajo de la meta? | unknown | CAUSE_EXPLANATION later | fuera de este slice |
| ¿Cómo vamos? | unknown | EXECUTIVE_STATUS impl | CEL madre |
| ¿Cómo vamos contra la meta? | month_close_result | specialized | no DIAGNOSIS |
| Dame el resumen de hoy | daily_executive_brief | specialized | no DIAGNOSIS |

## 3. Causa raíz del gap lingüístico de `preocuparme`

`isRiskFocusQuestion` exigía `que te preocupa` / `que preocupa` / `cual es el riesgo` / `que riesgo`.

- `preocuparme` ≠ `preocupa` → no pegaba.
- `qué riesgos ves` → `riesgos ves` ≠ `que riesgo`.
- `implemented: false` (`later_slice`) aunque pegara.

Confirmado físicamente en `lib/director-ia-conversational-executive-layer.js` (detector previo) y en la auditoría `4e89914f`.

## 4. Frontera modificada

| Archivo | Cambio |
|---------|--------|
| `lib/director-ia-executive-diagnosis-observations-risks.js` | Nuevo. Proyecta hallazgos del pack PRE_CLOSE. Formatea OBSERVATION/DEVIATION/RISK. Sin GPT. |
| `lib/director-ia-conversational-executive-layer.js` | Need `DIAGNOSIS_OBSERVATION_RISK` implementada. Causa **antes** que diagnóstico. `shouldHandleDiagnosisObservationRisk` solo cede `unknown` / `plant_diagnosis`. |
| `lib/director-ia-chat.js` | Intercepto CEL antes de EXECUTIVE_STATUS. Reusa injects PRE_CLOSE. |
| `test/director-ia-executive-diagnosis-observations-risks.test.js` | Nuevo. 19 pruebas del contrato. |
| `test/director-ia-conversational-executive-status.test.js` | `¿Qué te preocupa?` ahora DIAGNOSIS implementado (ya no RISK_FOCUS later). |
| `docs/dev-loop/CURRENT_TASK.md` | Solo `status`: AUTHORIZED → IN_PROGRESS → DONE_PENDING_REVIEW. `authorized_*` intactos. |

No se tocó `docs/director-ia/`. No se tocó `deriveRisksAndGaps`. No se creó un segundo motor de riesgo. No se hardcodearon respuestas por frase.

## 5. Señales reutilizadas

Del pack `composeExecutiveCycle` / `deriveRisksAndGaps` (sin duplicar reglas):

| Nivel | Señal | Origen |
|-------|-------|--------|
| DEVIATION | venta to-date vs `igf_meta.venta_ton` mismo YYYY-MM | `current.venta_ton` / `target.venta_ton` |
| DEVIATION | `delta_kg` vs mes previo | `current.top_negative_movers` |
| OBSERVATION | cliente kg prior > 0 y kg to-date = 0 | `current.lost_clients` |
| OBSERVATION | acciones vencidas | `actions.overdue` / `top_overdue` |
| OBSERVATION | hueco de meta | `TARGET_MISSING_FOR_PERIOD` (gap, no risk nuevo) |
| RISK | `FORECAST_BELOW_TARGET` | PRE_CLOSE existente |
| RISK | `FORECAST_RESULT_NEGATIVE` | PRE_CLOSE existente |
| RISK | `COMMERCIAL_DETERIORATION` | PRE_CLOSE existente |
| RISK | `LOST_HIGH_VOLUME_CLIENT` | PRE_CLOSE existente |
| RISK | `OVERDUE_ACTION` | PRE_CLOSE existente |
| RISK | `REMAINING_FORECAST_DEPENDENCE` | PRE_CLOSE existente |

Comentarios humanos y notas de Action Register **no se leen**. Si se inyectan, no aparecen en el output ni se promueven a causa.

## 6. Frases cubiertas

Must-cover (planner sigue `unknown`; need implementada + intercepto chat):

- ¿Qué debería preocuparme?
- ¿Qué me debería preocupar?
- ¿Dónde estamos fallando?
- ¿Dónde tenemos problemas?
- ¿Qué riesgos ves?
- ¿Qué está funcionando y qué no?
- ¿Qué te preocupa? (antes RISK_FOCUS later)
- ¿Qué está saliendo mal? / ¿Qué se está deteriorando? / ¿Cuál es el principal problema? (lista agrupada, **sin** ranking)

Must-not-absorb:

- ¿Por qué estamos debajo de la meta? → `CAUSE_EXPLANATION` `implemented: false`
- ¿Qué tengo que atender?
- ¿Qué es lo más importante?
- ¿Qué tal estás?
- ¿Cómo vamos? → EXECUTIVE_STATUS
- ¿Cómo vamos contra la meta? → month_close_result
- Dame el resumen de hoy → daily_executive_brief
- `preocup` + `planta` → PRE_CLOSE especializado (sin cambio)

## 7. Ejemplos de output

Fixture Puebla 2026-08: venta 863 t vs meta 1200 t; cliente PERDIDO; 1 acción vencida; forecast 1126 t / resultado negativo.

```
Diagnóstico ejecutivo — observaciones, desviaciones y riesgos soportados.
No afirma causa. Correlación != causalidad. Detectar un hallazgo != saber por qué ocurrió.
Planta: Puebla (1)
Periodo: 2026-08

OBSERVATION
- LOST_CLIENT: ... cliente=PERDIDO · valor_observado=0 kg · referencia=120000 kg ...
- OVERDUE_ACTION_COUNT: ... valor_observado=1 · accion=Seguimiento · registro_action_owner=Juan ...

DEVIATION
- SALES_BELOW_TARGET: ... valor_observado=863 t · referencia=1200 t ...
- CLIENT_KG_VS_PRIOR: ... cliente=PERDIDO · valor_observado=-120000 kg ...

RISK
- FORECAST_BELOW_TARGET
- FORECAST_RESULT_NEGATIVE
- LOST_HIGH_VOLUME_CLIENT
- OVERDUE_ACTION
- REMAINING_FORECAST_DEPENDENCE
```

Cada ítem lleva planta, periodo, valor/referencia cuando aplica, regla y evidencia. Sin “la causa es”, “se debe a”, “el responsable es”, “recomiendo”, “lo más importante es”.

Si se pregunta “principal problema”: se añade que **no hay regla de materialidad autorizada** y se listan hallazgos agrupados, sin ranking.

## 8. Evidencia de ausencia de causalidad

- `¿Por qué estamos debajo de la meta?` no entra a DIAGNOSIS; need = `CAUSE_EXPLANATION` no implementada.
- Comentario “La causa es competencia” inyectado: no aparece en findings ni en el texto.
- Nota AR “Esto ocurrió porque no visitamos”: no aparece. OVERDUE se reporta como hecho/riesgo tipado, no como causa de venta.
- Guard `containsForbiddenCausalLanguage` sobre el texto emitido.
- `context_meta.cause_claimed = false`, `reasoning_engine = false`, `ies_runtime = false`.
- Sin GPT en esta ruta (respuesta determinística).

## 9. Regresiones verificadas

| Superficie | Resultado |
|------------|-----------|
| EXECUTIVE_STATUS (`¿Cómo vamos?`) | `test/director-ia-conversational-executive-status.test.js` 55/55 PASS |
| PERFORMANCE venta vs meta (en `main` = month_close `contra la meta`) | planner `month_close_result`; DIAGNOSIS no override. Suite month_close PASS |
| daily_executive_brief | `test/director-ia-daily-executive-brief.test.js` PASS |
| month_close_result | `test/director-ia-month-close-result.test.js` PASS |
| PRE_CLOSE composer / riesgos tipados | `test/director-ia-pre-close-steering.test.js` PASS |
| DIAGNOSIS propio | 19/19 PASS |

Nota: `test/director-ia-sprint1-core-conversational-recovery.test.js` Q3 (`¿Cómo va el descuento de Acapulco este mes?`) falla porque el **planner** vigente en `4ed43213` emite `client_profile` (`discount_period`). Este slice **no tocó** `lib/director-ia-planner.js`. No es regresión de DIAGNOSIS.

PERFORMANCE como especialización propia **no está en `origin/main`**; la cobertura de venta vs meta en esta referencia es `month_close_result`.

## 10. Diff conceptual

Antes: frases de preocupación/fallo/riesgo caían a `unknown` + `no_need`, o a `RISK_FOCUS` no implementado.

Después: planner sigue `unknown` (sin phrasebook). CEL reconoce `DIAGNOSIS_OBSERVATION_RISK` y el chat proyecta hallazgos físicos del composer PRE_CLOSE, etiquetados por nivel.

No se afirma por qué ocurrió. No se rankea prioridad. No se recomienda. No se implementa causa.

## 11. Tests ejecutados

```
node --test test/director-ia-executive-diagnosis-observations-risks.test.js
→ 19/19 PASS

node --test test/director-ia-conversational-executive-status.test.js
→ PASS (incluye EXECUTIVE_STATUS)

node --test test/director-ia-month-close-result.test.js test/director-ia-daily-executive-brief.test.js test/director-ia-pre-close-steering.test.js
→ PASS

node --test test/director-ia-sprint1-core-conversational-recovery.test.js
→ 1 fallo preexistente Q3 planner client_profile (fuera de frontera)
```

Pruebas mínimas de la tarea: 1–17 cubiertas (planner unknown + need; parafrasis; venta bajo meta; lost client; overdue; causal; comentario; AR; planta; periodo; EXECUTIVE_STATUS; PERFORMANCE-as-month_close; daily; month_close).

## 12. Contratos consultados (no modificados)

Auditoría DIAGNOSIS `4e89914f`. Constitución / EKE / `05` §11 (consulta de autoridad, sin edición). `origin/main` `4ed43213`.

## 13. Desvíos respecto a CURRENT_TASK

Ninguno material. El planner de las frases DIAGNOSIS permanece `unknown` a propósito (mismo patrón que EXECUTIVE_STATUS). El success metric “deja de caer en unknown” se cumple como **deja de ser callejón `no_need`**: need implementada + intercepto chat.

## 14. STOP

No merge. No deploy. No se inicia PRIORITY. No se implementa `CAUSE_EXPLANATION`. Un DONE no autoriza la siguiente tarea.
