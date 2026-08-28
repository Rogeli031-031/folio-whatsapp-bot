# SPRINT1-DIRECTOR-IA-CORE-CONVERSATIONAL-RECOVERY-001

task_id: SPRINT1-DIRECTOR-IA-CORE-CONVERSATIONAL-RECOVERY-001
outcome: DONE
DASHBOARD_CHANGED: NO

## Causa raíz por pregunta

1. ¿Cómo vamos?
   CEL `EXECUTIVE_STATUS` ya ganaba (planner `unknown`). El pack no disponía venta al corte, descuento forecast, utilidad operativa ni resultado final. ARR solo emitía `venta_ton`.

2. ¿Cómo va la rentabilidad de Acapulco este mes?
   Routing CEL correcto. El pack no exponía `util_oper_importe` / `resultado_final_importe` de IGF stored. `director-ia-financial-actual.js` no se usó (es FINAL/cierre, no Forecast de mes abierto).

3. ¿Cómo va el descuento de Acapulco este mes?
   `isClientProfileQuestion` trataba «Acapulco» como cliente (`hasNamedClientToken`) y disparaba `queryMonthlyDiscount` con `COALESCE(cat.canal, d.canal, 'Casa')` sobre `arr.descuentos_diarios_cliente d` → `column d.canal does not exist`.

4. ¿Cómo van CASA y Comisionista en Acapulco este mes?
   Ruta correcta ya existente: `commercial_trend` (CEL no secuestra). Se preservó. «Este mes» no es rango comercial nombrado; el motor sigue en trailing 30d por defecto.

## Paths modificados

- `lib/director-ia-dashboard-forecast-adapter.js` (nuevo, read-only)
- `lib/director-ia-conversational-executive-layer.js`
- `lib/director-ia-client-profile.js`
- `lib/director-ia-chat.js`
- `test/director-ia-sprint1-core-conversational-recovery.test.js` (nuevo)

No tocados: `lib/dashboard-arr-forecast.js`, UI/endpoints/cálculos/exportaciones del Dashboard, `docs/director-ia/`.

## Helper Dashboard reutilizado

In-process, sin modificar el motor:

- `computePronosticoProyByPlant`
- `resolveProyFromPlantMap`
- `getVentaRealTonProvinciaByPlant`

ARR de planta ya pasaba por los dos primeros (`loadArrProyForPlant`). El adaptador añade venta al corte y fallback de forecast. IGF `util_oper_importe` / `resultado_final_importe` / `com_desc_kg` se leen stored (`FORECAST_STORED`); no se recalculan.

## Tests

- Focales Golden Set: 12/12
- Suite Director IA (`test/director-ia-*.test.js`): 1168/1168
- Golden Set: PASS

## Limitaciones reales

- TARGET/`igf_meta` sigue UNAVAILABLE en el pack CEL.
- Utilidad/resultado del mes abierto = IGF stored, no fórmula nueva sobre venta forecast (el Dashboard Forecast tampoco recalcula esas líneas desde la proyección).
- Q4 permanece en `commercial_trend` (30d trailing). No se reescribió el motor.
- Nombre propio capitalizado + descuento + mes, sin la palabra «cliente», ya no entra a client_profile (evita el bug de planta-como-cliente).
- Wording GPT no se valida (pack determinista sí).
- Desvío: implementación sobre `main` (LOOP prefiere rama de trabajo). Sin commit/push/merge/deploy/SQL.

## Contratos

Consultados: Constitución / contratos Director IA vía AGENTS + CURRENT_TASK. Modificados: ninguno.

secrets_check: no se escribieron secretos.
next_task_proposed: revisión humana G1/G4; no autorizado.
human_decision_needed: revisar pack en chat real post-deploy; no merge por el agente.

---

## Cierre de aceptación (mismo sprint)

DASHBOARD_CHANGED: NO. No se tocó `lib/dashboard-arr-forecast.js`, `server.js`, UI, endpoints ni fórmulas del Dashboard.

### A. Periodo Q4

«¿Cómo van CASA y Comisionista … este mes?» ya no cae a trailing 30d.

- Superficie Dashboard comparable: columnas CASA/COMI de la tabla ARR (`computeClientesDescuentoMes`, mes calendario; abierto = `kgProy`, cerrado = `kg`).
- La gráfica venta-serie (OLS trailing 30d) no es el periodo de «este mes».
- Director IA: `period_kind=calendar_month`, `range_days=null`. OLS no se inventa para mes calendario.

### B. `util_oper_importe`

El Dashboard IGF Forecast (mes abierto) **no** muestra el stored de `igf.compromiso_lines`.

Ruta display: `buildIgfForecastPayload` (`server.js`) overlay PROY venta/desc → `recalcularUtilYResultado` → UI `getUtilOperImporteFromDisplayedValues` (más GEND).

Director IA reutiliza `recalcularUtilYResultado` (copia lockstep ya existente vs `server.js`) tras overlay PROY de `computePronosticoProyByPlant` + snapshot mini. **No** usa stored como cifra del Dashboard.

### C. `resultado_final_importe`

Misma ruta servidor (`recalcularUtilYResultado`). UI añade CDJZ. Director IA: mismo helper + overlay PROY. No stored.

Limitación real: `buildIgfForecastPayload` no está exportado. No se duplicó overlay live presupuesto/folios ni GEND/CDJZ. Esos deltas de UI/servidor no se reimplementan.

### D. Código adicional (solo Director IA)

- `lib/director-ia-dashboard-forecast-adapter.js` — CASA/COMI mes + economics IGF
- `lib/director-ia-commercial-trend.js` — `este mes` = calendario
- `lib/director-ia-conversational-executive-layer.js` — util/resultado ya no son FORECAST_STORED
- `lib/director-ia-chat.js` — carga economics
- `lib/director-ia-plant-diagnosis.js` — transporta `row` IGF (no recalcula)
- `test/director-ia-sprint1-core-conversational-recovery.test.js`

### Tests (cierre)

- Golden Set (archivo sprint1): 14/14
- 12 originales: PASS
- Suite Director IA: 1170/1170
