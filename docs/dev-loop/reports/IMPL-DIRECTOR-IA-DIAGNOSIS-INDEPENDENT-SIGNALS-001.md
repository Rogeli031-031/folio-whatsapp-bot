# IMPL-DIRECTOR-IA-DIAGNOSIS-INDEPENDENT-SIGNALS-001

```yaml
task_id: "IMPL-DIRECTOR-IA-DIAGNOSIS-INDEPENDENT-SIGNALS-001"
outcome: "DONE"
mode: "IMPLEMENTATION"
implementation: true
code_changes: true
test_changes: true
docs_director_ia_changes: false
schema_changes: false
sql_changes: false
reference_main: "eb03e794"
source_audit: "docs/dev-loop/reports/AUDIT-DIRECTOR-IA-DIAGNOSIS-EVIDENCE-COVERAGE-001.md"
audit_commit: "743444fa"
branch: "implementation/director-ia-diagnosis-independent-signals-001"
new_risk_codes: false
cause_explanation: false
priority: false
recommendation: false
next_task_proposed: null
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
human_decision_needed: "Revisar este slice. No autoriza PRIORITY, saludo ni Taller."
```

## 1. Resultado

**DONE_PENDING_REVIEW.** DIAGNOSIS ya muestra señales independientes del target cuando falta `igf_meta`.

`TARGET_MISSING_FOR_PERIOD` es **DATA_GAP** secundario. Venta to-date, movers ya calculados y gaps `FORECAST_MISSING` / `SOURCE_UNAVAILABLE` se proyectan sin crear reglas de riesgo.

## 2. Baseline

Acapulco 2026-09 en producción (auditoría `743444fa`):

- Solo `OBSERVATION: TARGET_MISSING_FOR_PERIOD`
- DEVIATION vacía, RISK vacía
- El pack **no se cortaba**; el hueco era el único hallazgo proyectado

Sonda de auditoría: ARR vacío + forecast missing + overdue 0 reproducía ese output.

## 3. Causa raíz heredada

1. Periodo = mes abierto. Sin `igf_meta` de ese YYYY-MM.
2. DIAGNOSIS convertía ese gap en OBSERVATION protagonista.
3. No proyectaba venta to-date, `FORECAST_MISSING`, `SOURCE_UNAVAILABLE`, ni movers positivos/new (estos últimos se tiraban en `loadCurrentSection`).

## 4. Señales proyectadas antes / después

| Señal | Antes | Después |
|-------|-------|---------|
| `TARGET_MISSING_FOR_PERIOD` | OBSERVATION protagonista | DATA_GAP (hueco) |
| Venta to-date | omitida si no había meta | OBSERVATION `SALES_TO_DATE` (no cumplimiento) |
| `FORECAST_MISSING_FOR_PERIOD` | en pack, no en DIAGNOSIS | DATA_GAP |
| `SOURCE_UNAVAILABLE` | en pack, no en DIAGNOSIS | DATA_GAP |
| Lost client | OBSERVATION + RISK tipado existente | igual |
| Mover negativo | DEVIATION | igual |
| Mover positivo / new | calculados, drop en composer | OBSERVATION (no “vamos bien”) |
| RISK vacío | `RISK: (ninguna)` | “No detecto riesgos tipados en este contexto.” |
| `risk_code` nuevos | — | ninguno |

## 5. Tratamiento de DATA_GAP

- Nivel propio, no RISK ni OBSERVATION.
- Sección **Huecos de información**, después de observaciones/desviaciones/riesgos.
- Texto: falta meta o forecast; no sustituye el diagnóstico.
- Sin fallback de meta. Sin usar forecast como target.

## 6. Ejemplo de output

Sin meta, con venta 180 t, lost + drop, forecast missing, sin riesgos IGF:

```
Diagnóstico ejecutivo — Acapulco — septiembre 2026
No afirma causa. Correlación != causalidad. Detectar un hallazgo != saber por qué ocurrió.

Observaciones
- Venta acumulada del periodo: 180 t. ... No evalúa cumplimiento. [SALES_TO_DATE]
- Cliente PERDIDO: 0 kg to-date; 120000 kg el mes previo. ...

Desviaciones
- Cliente BETA: -220000 kg vs el mes calendario previo (to-date vs mes completo). ...

Riesgos
- LOST_HIGH_VOLUME_CLIENT: ... Regla ya tipada. ...

Huecos de información
- No hay meta física (igf_meta) cargada para septiembre 2026. ...
- No hay forecast IGF cargado para septiembre 2026. ...
```

Si no hay `risk_code` tipado:

```
Riesgos
- No detecto riesgos tipados en este contexto.
```

Los `[KIND]` quedan como trazabilidad interna, no como única respuesta.

## 7. Evidencia de no creación de riesgo

- `TYPED_RISK_CODES` intacto (los 6 PRE_CLOSE).
- `deriveRisksAndGaps` no se modificó.
- DATA_GAP kinds no se emiten con `level: RISK`.
- Lost client no añade un `risk_code` nuevo; solo el existente `LOST_HIGH_VOLUME_CLIENT` si el pack ya lo trae.
- Tests: `!findings.some(f => f.level === "RISK" && !TYPED_RISK_CODES.includes(f.risk_code))`.

## 8. Funciones modificadas

| Archivo | Función | Cambio |
|---------|---------|--------|
| `lib/director-ia-executive-cycle-composer.js` | `loadCurrentSection` | Copia `new_clients` y `top_positive_movers` ya calculados por `classifyClients`. |
| `lib/director-ia-executive-diagnosis-observations-risks.js` | `projectFindingsFromCyclePack` | DATA_GAP; `SALES_TO_DATE`; gaps derivados; new/positive movers. |
| mismo | `formatDiagnosisAnswer` / `formatFindingLine` | Redacción ejecutiva; huecos al final; RISK vacío en prosa. |
| mismo | `buildExecutiveDiagnosisChatResult` | Cuenta `data_gap`; levels incluyen DATA_GAP. |

No se tocó CEL routing, month_close, daily brief, planner ni `docs/director-ia/`.

## 9. Tests

```
node --test test/director-ia-executive-diagnosis-observations-risks.test.js
→ 29/29 PASS (incluye 1–13 del slice + regresión DIAGNOSIS)

node --test test/director-ia-conversational-executive-status.test.js
→ PASS (EXECUTIVE_STATUS)

node --test test/director-ia-pre-close-steering.test.js
→ PASS

node --test test/director-ia-month-close-result.test.js test/director-ia-daily-executive-brief.test.js
→ PASS (PERFORMANCE-as-month_close + daily)
```

PERFORMANCE propia no está en `origin/main`; la cobertura de venta vs meta sigue siendo `month_close_result`.

## 10. Diff conceptual

Antes: falta de meta = respuesta de un solo renglón técnico.

Después: falta de meta = hueco. Si ARR u otras señales del pack existen, se leen como observación/desviación/riesgo tipado. Sin segundo motor. Sin causa, prioridad ni recomendación.

## 11. STOP

No merge. No deploy. No PRIORITY. No saludo/identidad. No Taller. Un DONE no autoriza la siguiente tarea.
