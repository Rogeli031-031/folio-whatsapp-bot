# SPRINT1-DIRECTOR-IA-AUTHORITATIVE-KPI-PARITY-001

task_id: SPRINT1-DIRECTOR-IA-AUTHORITATIVE-KPI-PARITY-001
outcome: DONE
DASHBOARD_BEHAVIOR_CHANGED: NO

Nota: este archivo se actualiza por instrucción humana de la misma `task_id`.
La ejecución anterior quedó BLOCKED por G1 incompleto; G1 fue corregido por HUMAN_APPROVER.

## A. Punto exacto de divergencia

Ruta real:

HTTP chat → `askDirectorIa` → `resolveExecutiveNeed` + `shouldHandleExecutiveStatus`
→ `handleExecutiveStatusForChat`
→ `loadPlantDiagnosisForChat` + `loadDashboardForecastParity` + `loadIgfForecastMiniPayload`
→ `readIgfForecastMiniAuthoritative` → `forecastParity`
→ `buildExecutiveStatusPack` → `buildExecutiveStatusPrompt` → GPT

1. **1488 → 1307 (forecast)**
   En `buildExecutiveStatusPack`, el MAGNITUDE `FORECAST_PROJECTION` tomaba
   `forecastParity.forecast` (`computePronosticoProyByPlant` / ARR) o, si faltaba, `sources.arr.venta_ton`.
   **No leía** `forecastParity.mini.venta_ton` aunque el loader mini hubiera corrido.
   El Dashboard pinta `mini.rows[].ventaTon` (`computeIgfForecastMiniPayload`).

2. **3169502 → 1723201 y 803537 → -642764 (util / resultado)**
   El pack ya podía cargar util/resultado del mini, pero `executiveQuestionFocusLines` ordenaba:
   «prioriza util_oper_importe y resultado_final_importe **FORECAST_STORED**».
   IGF stored / composición competía (o el modelo la prefería) frente al mini AVAILABLE.

3. Fallo de loader no aislado (secundario): si `loadIgfForecastMiniPayload` lanzaba, el `catch` sustituía todo `forecastParity` por `{ reachable: false }`.

Q1–Q3 intención: `EXECUTIVE_STATUS` (CEL). Q4: `commercial_trend` (no CEL).

## B. Causa raíz

La salida autoritativa del Dashboard (mini IGF) se inyectaba, pero **no gobernaba** el MAGNITUDE de venta/desc ni la instrucción de rentabilidad. Un cálculo/fallback ARR-adapter y FORECAST_STORED tenían mayor precedencia en pack y prompt.

No se copió ni se reimplementó `computeIgfForecastMiniPayload`.

## C. Por qué los tests anteriores dieron falso PASS

- Inyectaban `forecastParity.forecast` y `mini` **con las mismas cifras** (p. ej. 1488).
- Nunca enfrentaron adapter/ARR 1307 vs mini distinto.
- No ejecutaban `askDirectorIa` con decoys competidores hasta el prompt final.
- No comprobaban que la línea «prioriza FORECAST_STORED» no pisara el mini.
- Congelaban cifras históricas de UI como fixture, no origen/precedencia.

## D. Fuente autoritativa finalmente consumida

Cuando el mini está AVAILABLE, Director IA consume:

- Venta / desc / utilidad / resultado: `computeIgfForecastMiniPayload` → `mini.rows[]` → `readIgfForecastMiniAuthoritative` → pack `governed_by=dashboard_authoritative_mini`.
- CASA / COMISIONISTA (Q4): `computeClientesDescuentoMes` / agregación ARR (misma familia que `GET /arr-clientes-mes`).
- ACTUAL_TO_DATE: `getVentaRealTonProvinciaByPlant` (sigue separado del forecast).
- IGF stored: permanece etiquetado `FORECAST_STORED`; no gobierna si el mini está AVAILABLE.

## E. Precedencia final

Si MAGNITUDE FORECAST_PROJECTION del mini está AVAILABLE, gobierna venta/desc/util/resultado.
ARR crudo, `computePronosticoProyByPlant` y FORECAST_STORED no lo pisan.
ACTUAL_TO_DATE ≠ forecast. IGF stored ≠ forecast vigente.

## F. Archivos modificados

- `lib/director-ia-conversational-executive-layer.js`
- `lib/director-ia-chat.js`
- `lib/director-ia-dashboard-forecast-adapter.js`
- `test/director-ia-authoritative-kpi-parity.test.js` (nuevo)
- `test/director-ia-sprint1-core-conversational-recovery.test.js` (selector de item)
- `test/director-ia-mini-payload-export.test.js` (selector de item)
- `docs/dev-loop/CURRENT_TASK.md` (solo `status`)
- `docs/dev-loop/reports/SPRINT1-DIRECTOR-IA-AUTHORITATIVE-KPI-PARITY-001.md`

No tocados: body de `computeIgfForecastMiniPayload`, endpoints/payload/UI/fórmulas Dashboard, SQL, `docs/director-ia/`.

## G. Test E2E / ruta conversacional

`test/director-ia-authoritative-kpi-parity.test.js`

Inyecta mini 7011.25 / -4.44 / 555001 / -888002 frente a decoys 1307 / 0.12 / 1723201 / -642764.
Demuestra que esos valores atraviesan `askDirectorIa` → loader → pack → prompt y que el fallback no gana.

## H. Golden Set

16/16 (`test/director-ia-sprint1-core-conversational-recovery.test.js`)
Q1–Q4 routing PASS en el test de paridad.

## I. Suite completa

1183/1183 (`node --test test/director-ia-*.test.js`)

## J. DASHBOARD_BEHAVIOR_CHANGED

NO

## K. Limitaciones reales restantes

- CASA/COMI Q4 siguen la agregación ARR de mes calendario, no el helper de frontend `toneladasCategoriaDesdeClientes` (exclusiones/simulaciones de UI no se copian).
- El modelo aún redacta; se garantiza precedencia en pack y prompt, no obediencia lexical del GPT.
- El lookup del renglón mini depende de etiqueta/código de planta reconocible.
- Year/month salen del periodo ensamblado de plant diagnosis.
- Ejecución sobre rama `main` (LOOP pide rama ≠ `main`). Sin commit / push / merge / deploy.

## Contratos

Consultados: Constitución, contratos Director IA, LOOP_PROTOCOL, CURRENT_TASK.
Modificados: ninguno.

## next_task_proposed

Ninguna. Un DONE no autoriza la siguiente.

## secrets_check

OK. Sin secretos.

## human_decision_needed

Revisión humana: CLOSED o REJECTED. Sin G4.
