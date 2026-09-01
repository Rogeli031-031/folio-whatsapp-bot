# SPRINT1-DIRECTOR-IA-PERIOD-START-SEMANTICS-AUDIT-001

```yaml
task_id: SPRINT1-DIRECTOR-IA-PERIOD-START-SEMANTICS-AUDIT-001
tipo: AUDIT ONLY / READ-ONLY
outcome: DONE
previous_task_closed: SPRINT1-DIRECTOR-IA-CLIENT-KNOWLEDGE-CONSISTENCY-001
files_touched:
  - docs/dev-loop/CURRENT_TASK.md
  - docs/dev-loop/reports/SPRINT1-DIRECTOR-IA-PERIOD-START-SEMANTICS-AUDIT-001.md
files_not_touched:
  - código de runtime
  - tests
  - prompts / loaders / engine / planner
  - Forecast / ARR / IGF / Dashboard
  - client_profile / commercial trend
  - docs/director-ia/
  - reporte CLOSED de CLIENT-KNOWLEDGE-CONSISTENCY-001
implementation: none
git_write: none
secrets_check: none
CLIENT_HISTORICAL_RANGE_STARTED: NO
TRACK_B_IMPLEMENTATION: NO
```

Clasificación de hallazgos: **PROVEN** | **PROVEN_POSSIBLE** | **NOT_PROVEN** | **OUT_OF_SCOPE**.

Método: lectura de módulos de producción + sonda `node -e` (fórmula `lastClosedDay`, `buildAuthoritativeForecastRunPack`, `buildExecutiveStatusPack` / prompt / language guard, `parseExplicitMonths`). Sin SQL a producción. Sin dump de sesión. Sin cambios de código.

Un informe **no** autoriza implementación.

---

## 1. Resumen ejecutivo

El 0 de «¿Cómo vamos?» el 1-sep-2026 en Acapulco es **matemáticamente correcto** bajo el contrato actual del Pronóstico: TOTAL mes = suma de días **cerrados**; el día de corte está en curso y no se suma. Si el corte es el día 1 del mes, `lastClosedDay = 0`, el bucle no itera y `total_mes_sum = 0` aunque existan ventas del día 1 en el mapa.

Ese 0 **no** significa «hubo actividad observada y fue cero». Significa «todavía no hay día cerrado en el periodo». La fuente diaria **sí** puede distinguir un 0 almacenado de un día ausente; el TOTAL **no** exporta esa distinción. El pack de Director IA recibe solo `venta_ton = 0` con status `AVAILABLE` y el CEL lo verbaliza como «se han vendido 0 t». No existe `NO_CLOSED_DAYS_YET` ni `ZERO_OBSERVED` en esta ruta.

La frase «falta de actividad comercial significativa» **no está** en código, prompt ni language guard. Es síntesis libre del LLM sobre un 0 ya presentado como venta observada. `UNSUPPORTED_INFERENCE_RISK = PROVEN`.

No se debe cambiar el cálculo ni el Dashboard. El cambio mínimo seguro es **etiquetar** el 0 cuando no hay días cerrados y vedar la inferencia de «sin actividad», sin convertir todo 0 en «sin datos».

Hallazgo backlog (no implementado): «enero a la fecha» en `client_profile` cae al default de 3 meses. `CLIENT_HISTORICAL_RANGE_STARTED = NO`.

---

## 2. Reproducción del incidente

| Campo | Valor | Estado |
|---|---|---|
| Planta | Acapulco | PROVEN (humano) |
| Fecha | 1 de septiembre de 2026 | PROVEN (humano) |
| Pregunta | «¿Cómo vamos?» | PROVEN (humano) |
| Respuesta | «Al corte del 1 de septiembre de 2026, se han vendido 0 toneladas, lo que indica una falta de actividad comercial significativa en este periodo.» | PROVEN (humano) |
| Cutoff verbalizado | 2026-09-01 | PROVEN (el texto nombra esa fecha; no se re-consultó `upload_log`) |
| `lastClosedDay` si corte ∈ septiembre día 1 | 0 | PROVEN (fórmula) |
| `total_mes_sum` con ventana 0 | 0 | PROVEN (sonda) |
| Frase «falta de actividad…» en repo | 0 hits | PROVEN |
| COMMENTS-001 / client_profile como causa | no | PROVEN (otra ruta) |

---

## 3. Traza física completa

```
«¿Cómo vamos?»
  → CEL isExecutiveStatusQuestion / plant_diagnosis pack
  → currentYearMonthCdmx / requested_period → 2026-09
  → resolveDirectorIaEffectiveCutoff (body.upload_day | arr.upload_log)
  → loadDashboardForecastParity(upload_day)
       → getPronosticoPlantDetail(year, month, plant, fechaCorte)
            → buildPronosticoVentaDescMaps
                 ventaMapByPlant[fecha] = ton si v != null && finite
            → isCorteEnMes = corte ∈ year/month
            → lastClosedDay = isCorteEnMes ? max(0, corteDay-1) : corteDay
            → buildVentaPronosticoSheetLike
                 totalMesVenta = [0×7]
                 for day=1..lastClosedDay: suma vm.get(ymd)
                 total_mes_sum = sum(totalMesVenta)
  → adapter.actual_to_date.venta_ton = Number(total_mes_sum)   // 0 es finite
  → buildAuthoritativeForecastRunPack
       emptyActual(0) → venta=0, venta_status=AVAILABLE, semantics=ACTUAL_TO_DATE
  → CEL MAGNITUDE
       availability=OPTIONAL (porque != null)
       summary = «Al corte del 2026-09-01 se han vendido 0 t (ACTUAL_TO_DATE; …)»
  → formatPackForPrompt: venta_ton=0
  → LLM
  → «se han vendido 0 toneladas, lo que indica una falta de actividad comercial significativa»
  → applyExecutiveLanguageGuard: NO toca esa frase
```

Citas:

| Paso | Archivo | Líneas |
|---|---|---|
| Corte en mes / lookback | `lib/dashboard-arr-forecast.js` | ~3375–3381 |
| `lastClosedDay` TOTAL venta | mismo | ~3551–3559, ~3634 |
| `lastClosedDay` TOTAL desc / PROY | mismo | ~2437–2439, ~3752–3758 |
| `getPronosticoPlantDetail` | mismo | ~3647–3700 |
| Adapter copia solo `total_mes_sum` | `lib/director-ia-dashboard-forecast-adapter.js` | ~209–245 |
| `finiteOrNull(0)=0` / AVAILABLE | `lib/director-ia-authoritative-forecast-run-pack.js` | ~30–55, ~188 |
| CEL «se han vendido N t» | `lib/director-ia-conversational-executive-layer.js` | ~1067–1111 |
| Prompt / guard | mismo | ~1496–1564, ~1573–1585, ~1655–1667 |
| Cutoff chat | `lib/director-ia-chat.js` | ~3072–3158 |

`venta_sheet` **no** exporta `lastClosedDay`, `closed_days_count` ni status. `getPronosticoPlantDetail` sí exporta `corte_day`. El adapter no lo usa para semántica de 0.

---

## 4. Semántica de lastClosedDay

Contrato escrito en código (**PROVEN**):

```
// TOTAL mes solo incluye días "cerrados".
// Si el corte está en el mes, el día de corte está "en curso" (azul) y NO se suma.
lastClosedDay = isCorteEnMes ? Math.max(0, corteDt.getDate() - 1) : corteDt.getDate()
```

| Pregunta | Respuesta | Estado |
|---|---|---|
| ¿Qué significa `lastClosedDay = 0`? | No hay ningún día del mes cuyo índice sea ≤ corte−1. El día 1 es el corte; está abierto. La ventana de suma está vacía. | PROVEN |
| ¿Es «no hay ventas»? | No. El mapa puede tener toneladas el día 1; no se leen. | PROVEN (sonda A: mapa `{2026-09-01: 50}` → total 0) |
| Día 2, corte 2026-09-02 | `lastClosedDay = 1`. Solo el 1-sep está cerrado. El 2-sep no entra. | PROVEN |
| Mitad de mes, corte día 15 | `lastClosedDay = 14`. Días 1–14 cerrados; 15 abierto. | PROVEN |
| Corte fuera del mes | `isCorteEnMes=false`; `corteDt` cae al último día del mes; se suman todos los días 1..último. | PROVEN (fórmula) |

`lastClosedDay` **no** consulta si el día tuvo filas ARR. Es un índice de calendario respecto del corte, no un watermark de datos cargados.

---

## 5. Semántica de ACTUAL_TO_DATE

Origen contractual (CUTOFF-AWARE, vigente): `getPronosticoPlantDetail.venta_sheet.total_mes_sum`. No es `getVentaRealTonProvinciaByPlant` (mes completo). No es Forecast. No es IGF stored.

| Capa | Qué transporta | Qué pierde |
|---|---|---|
| `ventaMap` | fecha → ton o ausencia de key | — |
| bucle TOTAL | suma de keys presentes en 1..lastClosedDay | count cerrados, count missing, 0 vs missing |
| `total_mes_sum` | número (0 si ventana vacía o suma 0) | causa del 0 |
| adapter | `{ venta_ton, cutoff_date, truth_semantics: ACTUAL_TO_DATE }` | lastClosedDay |
| auth pack | `venta=0`, `venta_status=AVAILABLE` | 0 treated as dato |
| CEL | «se han vendido 0 t» | interpreta 0 como venta observada |

`finiteOrNull(0) = 0`. Null/unavailable → `UNAVAILABLE` y «Ausencia no es cero». El 0 **nunca** toma esa rama.

---

## 6. Respuestas 1–15

1. **¿El 0 es matemáticamente correcto bajo el contrato actual?**
   **Sí.** VALUE_CORRECTNESS = CORRECT_UNDER_CLOSED_DAYS_CONTRACT. Suma de un conjunto vacío de días cerrados = 0. No es un bug aritmético. **PROVEN.**

2. **¿Qué significa lastClosedDay = 0?**
   Cero días cerrados del mes del corte. El día de corte es el 1 y está excluido. **PROVEN.**

3. **¿La fuente distingue ZERO_OBSERVED de NO_CLOSED_DAYS_YET?**
   En el **mapa diario**, sí de forma implícita: key ausente ≠ key=0; el bucle no corre si `lastClosedDay=0`. En el **TOTAL / pack**, no. No existen esos status en Forecast/CEL. `ZERO_OBSERVED` vive en `client_profile` (otra capacidad). **PROVEN.**

4. **¿El pack transporta esa distinción?**
   **No.** A (día 1, 0) y C (día 2, 0 observado) producen el mismo `venta=0` / AVAILABLE / «se han vendido 0 t». Solo cambia `cutoff_date`. **PROVEN** (sonda PACK_A vs PACK_C).

5. **¿El prompt la conserva o la pierde?**
   La pierde. Dump: `venta_ton=0`. No hay `closed_days` ni veda de «falta de actividad». **PROVEN.**

6. **¿En qué punto aparece «falta de actividad comercial significativa»?**
   En la **respuesta del LLM**, no en pack ni prompt. **PROVEN** (0 hits + guard no la altera).

7. **¿Es síntesis del LLM o hay instrucción que la habilita?**
   Síntesis del LLM (**PROVEN**). Habilitación: el CEL afirma «se han vendido 0 t» como venta al corte y no prohíbe inferir actividad. `PROMPT_INDUCED = PARTIAL`. Guard no remedia. **PROVEN.**

8. **¿Día 2?**
   `lastClosedDay = 1`. Se considera cerrado solo el día 1. Si ese día tiene ventas > 0 → actual > 0 (caso B). Si tiene 0 o falta → actual = 0 (caso C), indistinguible en el pack. **PROVEN.**

9. **¿Ventas = 0 tras uno o más días cerrados?**
   El 0 es un dato válido de la ventana cerrada. No debe relabelarse «sin datos». H y D son VALUE_CORRECTNESS = ZERO_IN_CLOSED_WINDOW. La interpretación «sin actividad» sigue sin estar autorizada, pero el número 0 **sí** es observable. **PROVEN** (sonda D/H).

10. **¿Cómo no confundir «aún no hay día cerrado» con «actividad observada = 0»?**
    Transportar `lastClosedDay` / `closed_days_count` (derivable de `corte_day` + year/month) y un status: `NO_CLOSED_DAYS_YET` vs `ZERO_OBSERVED` / `CLOSED_WINDOW_SUM`. No anular el 0. No usar agosto como actual. **Diseño; no implementado.**

11. **¿Hay semántica reutilizable?**
    Sí, **fuera** de esta ruta: `PARTIAL` (perfil, mes abierto); `ZERO_OBSERVED` vs `DATA_NOT_FOUND` (perfil); `corte_day` / `cutoff_date` / `upload_day` (Forecast/CEL); máscara «día en curso» del sheet (Dashboard, no en pack chat). En ACTUAL_TO_DATE del EE **no** se reutilizan. **PROVEN.**

12. **¿Solo verbalización/prompt?**
    **Insuficiente** para A vs C/D/H: el LLM no ve `lastClosedDay`. Un veto de «falta de actividad» reduce el incidente pero no enseña «aún no hay día cerrado». Prompt-only = mitigación parcial. **PROVEN_POSSIBLE.**

13. **¿Enriquecer el pack con metadata ya existente?**
    **Sí, mínimo seguro.** `corte_day` ya sale de `getPronosticoPlantDetail`. `cutoff_date` ya está en CEL. Se puede derivar `lastClosedDay` **sin** cambiar `buildVentaPronosticoSheetLike`. **PROVEN.**

14. **¿Cambiar el cálculo?**
    **No, salvo evidencia contractual nueva.** Cambiar `lastClosedDay` o dejar de inicializar el vector en ceros altera TOTAL Dashboard, descuento TOTAL y PROY (`total + por_comprar`). El 0 del día 1 es el contrato de días cerrados. **PROVEN** que el cálculo es coherente; **no** hay evidencia de que el 0 sea la cifra incorrecta.

15. **¿Qué otros consumidores usan este 0?**
    Ver §9. **PROVEN.**

---

## 7. Matriz 0 / null / unavailable / no-closed-days

| Caso | Corte | lastClosedDay | Mapa | total_mes_sum | Pack venta | Pack status | CEL summary | Distinguible hoy |
|---|---|---|---|---|---|---|---|---|
| **A** día 1 | 2026-09-01 | 0 | irrelevante (incluso 50 t el día 1) | 0 | 0 | AVAILABLE | se han vendido 0 t | no vs C/D/H |
| **B** día 2, actual > 0 | 2026-09-02 | 1 | día 1 = 12.5 | 12.5 | 12.5 | AVAILABLE | se han vendido 12.5 t | sí |
| **C** día 2, actual = 0 observado | 2026-09-02 | 1 | día 1 = 0 | 0 | 0 | AVAILABLE | se han vendido 0 t | no vs A |
| **C′** día 2, día 1 missing | 2026-09-02 | 1 | {} | 0 | 0 | AVAILABLE | se han vendido 0 t | no vs C (pérdida extra) |
| **D** mitad, varios cerrados, 0 | 2026-09-15 | 14 | 14×0 | 0 | 0 | AVAILABLE | se han vendido 0 t | no vs A |
| **E** mitad, actual > 0 | 2026-09-15 | 14 | p. ej. 40+10 | 50 | 50 | AVAILABLE | se han vendido 50 t | sí |
| **F** source unavailable | sin pool / error | n/a | n/a | no se calcula | null | UNAVAILABLE | no disponible; ausencia ≠ 0 | colapsa con G |
| **G** null | cutoff puede existir | n/a | n/a | no llega número | null | UNAVAILABLE | igual que F | colapsa con F |
| **H** 0 explícito real | p. ej. día 15 | ≥1 | keys=0 | 0 | 0 | AVAILABLE | se han vendido 0 t | no vs A |

F y G **no** se colapsan con H (**PROVEN**). F y G **sí** se colapsan entre sí en CEL (**PROVEN**). A/C/D/H se colapsan en el mismo 0 verbalizado (**PROVEN**).

No colapsar F/G/H en un fix futuro: null/unavailable ≠ 0 cerrado ≠ 0-por-ventana-vacía.

---

## 8. FIRST_SEMANTIC_LOSS_POINT y UNSUPPORTED_INFERENCE

```
FIRST_SEMANTIC_LOSS_POINT =
  buildVentaPronosticoSheetLike
    lastClosedDay=0 → totalMesVenta=[0×7] → total_mes_sum=0
    SIN closed_days_count / NO_CLOSED_DAYS_YET
  THEN (pérdida confirmada al chat)
  adapter + emptyActual(0) → AVAILABLE
  CEL MAGNITUDE → «se han vendido 0 t»
```

La pérdida **empieza** al emitir el TOTAL sin metadata de ventana. Se **confirma** cuando CEL trata 0 como venta observada. No es pérdida en la DB.

```
UNSUPPORTED_INFERENCE_INTRODUCTION_POINT =
  LLM answer
  (habilitado por CEL «se han vendido 0 t»; no generado por template)
```

`applyExecutiveLanguageGuard` no filtra «falta de actividad» / «sin actividad» / «no vendimos». **PROVEN.**

---

## 9. Consumidores afectados

| Consumidor | Usa el 0 | ¿Debe cambiarse en un fix? |
|---|---|---|
| Hoja Pronóstico / Excel TOTAL mes | mismo `lastClosedDay` + vector | **NO** (Dashboard) |
| `frontend-dashboard` `IgfForecastClient` `total_mes_sum` | muestra el TOTAL | **NO** |
| `computePronosticoProyByPlant` PROY = total + por_comprar | día 1: total=0, PROY = lookback | **NO** (fórmula Forecast) |
| TOTAL descuento dinero | mismo `lastClosedDay` | **NO** |
| Director IA adapter `actual_to_date` | copia el número | etiquetar, no recalcular |
| Authoritative forecast run pack | `emptyActual(0)` AVAILABLE | status/metadata |
| CEL MAGNITUDE + prompt | «se han vendido 0 t» | verbalización |
| IGF stored / mini Forecast | no es este 0 | **NO** |
| Commercial Movers / trend 30d | otra ventana (puede ser agosto) | **NO**; no usarlos como «actual» |
| client_profile | otra capacidad; `ZERO_OBSERVED` mensual | **NO** tocar ahora; solo analogía |

Coexistencia 0 de septiembre + movers de agosto **no es bug**. Confundirlos verbalmente **sí** es riesgo. **PROVEN** (auditoría previa; se confirma).

---

## 10. Riesgos de tocar el cálculo

Cambiar `lastClosedDay`, incluir el día de corte, o no inicializar en ceros:

- Dashboard TOTAL mes y descuento TOTAL cambian.
- PROY Forecast cambia (total entra a la suma).
- Paridad Excel / modal / mini snapshot se rompe.
- Tests y contratos CUTOFF-AWARE / authoritative pack asumen `total_mes_sum` numérico.

`FORECAST_FORMULA_CHANGE_REQUIRED = NO`.

Convertir 0→null en el adapter el día 1 fingiría UNAVAILABLE y colapsaría A con F/G. Rechazado.

Usar agosto como actual. Rechazado.

---

## 11. Mínimo cambio seguro recomendado (no implementar)

1. Derivar `lastClosedDay` / `closed_days_count` de `cutoff_date` + year/month ya existentes (o exponerlos en el adapter **sin** editar la fórmula del sheet).
2. Status en ACTUAL_TO_DATE: `NO_CLOSED_DAYS_YET` si `lastClosedDay===0`; si `lastClosedDay≥1` y suma=0 → `ZERO_IN_CLOSED_WINDOW` (no afirmar ZERO_OBSERVED por día si no se cuenta missing vs 0).
3. CEL: si `NO_CLOSED_DAYS_YET`, no decir «se han vendido 0 t». Decir que el acumulado del mes aún no tiene día cerrado; el 0 no es actividad observada.
4. Vedar: «falta de actividad», «sin actividad», «no vendimos», «caída», «mal desempeño» a partir de ACTUAL_TO_DATE cuando no hay días cerrados.
5. Conservar 0 numérico en Dashboard / PROY. Conservar 0 verbalizable cuando `lastClosedDay≥1`.
6. No tocar Forecast, IGF, movers, comentarios, client_profile, engine, Dashboard UI.

Prompt-only es mitigación; el pack debe llevar la etiqueta.

---

## 12. Archivos que eventualmente requerirían cambio

- `lib/director-ia-dashboard-forecast-adapter.js` (metadata; no recalcular)
- `lib/director-ia-authoritative-forecast-run-pack.js` (status ACTUAL_TO_DATE)
- `lib/director-ia-conversational-executive-layer.js` (summary MAGNITUDE + addendum + tests EE)
- `test/director-ia-conversational-executive-status.test.js` y/o test nuevo de period-start

Opcional, solo si se decide exportar el campo: `getPronosticoPlantDetail` / `venta_sheet` **añadiendo** `lastClosedDay` sin cambiar `total_mes_sum`.

---

## 13. Archivos que NO deben tocarse

- `lib/dashboard-arr-forecast.js` fórmula `lastClosedDay` / PROY / TOTAL
- `frontend-dashboard` / Excel / Dashboard
- `lib/director-ia-client-profile.js`
- commercial-trend-engine / movers / comentarios
- IGF stored / mini fórmula
- planner / IES / EKS / Reasoning / Constitución
- Action Register / DICF
- CLIENT HISTORICAL RANGE

---

## 14. Tests futuros necesarios

- A: corte día 1 → pack `NO_CLOSED_DAYS_YET`; prompt no «se han vendido 0» como actividad; no «falta de actividad».
- B: día 2 + ventas día 1 > 0 → número > 0.
- C: día 2 + día 1 = 0 → 0 conservado; no «sin datos».
- D/H: mitad de mes, 0 con días cerrados → 0 conservado.
- E: mitad de mes, actual > 0 intacto.
- F/G: null/unavailable ≠ 0; «ausencia no es cero».
- Forecast / IGF stored / movers / Dashboard no cambian.
- Language guard o addendum: veto de inferencia de actividad sobre `NO_CLOSED_DAYS_YET`.

---

## 15. Backlog — CLIENT HISTORICAL RANGE (NO IMPLEMENTAR)

Validación humana: «¿cuánto nos compró y con qué descuento por cada mes de enero a la fecha TORTILLERIA ERICK?» → solo julio, agosto y septiembre.

Sonda 2026-09-01:

```
parseExplicitMonths("...enero a la fecha...") = null
  (exige ≥2 nombres de mes; «fecha» no cuenta)
defaultThreeMonths = [2026-07, 2026-08, 2026-09]
```

«de enero a septiembre» no expande el rango: solo enero y septiembre.

Principio futuro: una petición explícita («enero a la fecha», «todo el año», «mes por mes desde enero», «últimos 12 meses») no debe reducirse en silencio a la ventana longitudinal default.

`CLIENT_HISTORICAL_RANGE_STARTED = NO`. No mezclar con Track B.

---

## 16. Conclusión contractual

| Campo | Valor |
|---|---|
| VALUE_CORRECTNESS | El 0 es correcto como suma de días cerrados. No es cifra Dashboard «equivocada». |
| VALUE_INTERPRETATION | «Se han vendido 0 t» ya interpreta ventana vacía como venta. «Falta de actividad» no está autorizada. |
| Cálculo | No cambiar. |
| Pack/prompt | Sí, etiquetar y vedar inferencia. |
| Implementación | **NO autorizada** por esta auditoría. |

---

## 17. Hallazgos clasificados

| ID | Hallazgo | Clase |
|---|---|---|
| B1 | lastClosedDay=0 el día 1 del mes si corte ∈ mes | PROVEN |
| B2 | total_mes_sum=0 por vector vacío, no por SUM de filas | PROVEN |
| B3 | Ventas del día 1 no entran (sonda 50 t → 0) | PROVEN |
| B4 | Pack/CEL no distinguen A vs C vs D vs H | PROVEN |
| B5 | F/G → UNAVAILABLE ≠ H | PROVEN |
| B6 | F y G colapsan entre sí en CEL | PROVEN |
| B7 | «falta de actividad» = LLM | PROVEN |
| B8 | Guard no la quita | PROVEN |
| B9 | Corte producción = 2026-09-01 | PROVEN (texto humano) |
| B10 | Valor exacto last-upload DB | NOT_PROVEN (innecesario: el corte verbalizado basta) |
| B11 | Filas ARR reales Acapulco 1-sep | NOT_PROVEN (irrelevantes si lastClosedDay=0) |
| B12 | Fix solo prompt alcanza A vs H | PROVEN_POSSIBLE (parcial) |
| B13 | Metadata derivable sin tocar fórmula | PROVEN |
| B14 | Cambiar cálculo rompe Dashboard/PROY | PROVEN |
| B15 | Historical range 3 meses default | PROVEN (backlog; OUT_OF_SCOPE de Track B) |

---

```
AUDIT_STATUS = DONE_PENDING_REVIEW
ROOT_CAUSE = EMPTY_CLOSED_WINDOW_SUM_EXPORTED_AS_OBSERVED_SALE
VALUE_CORRECTNESS = CORRECT_UNDER_CLOSED_DAYS_CONTRACT
VALUE_INTERPRETATION = UNSUPPORTED_FOR_NO_CLOSED_DAYS (LLM + CEL «se han vendido 0 t»)
FIRST_SEMANTIC_LOSS_POINT = buildVentaPronosticoSheetLike total_mes_sum=0 without closed_days metadata → CEL «se han vendido 0 t»
UNSUPPORTED_INFERENCE_INTRODUCTION_POINT = LLM answer (enabled by CEL MAGNITUDE; not templated)
MINIMUM_SAFE_CHANGE = label NO_CLOSED_DAYS_YET from existing cutoff + forbid activity inference; do not change 0 formula
FORECAST_FORMULA_CHANGE_REQUIRED = NO
DASHBOARD_BEHAVIOR_CHANGED = NO
IMPLEMENTATION_AUTHORIZED = NO
CLIENT_HISTORICAL_RANGE_STARTED = NO
```

STOP. Esta auditoría no autoriza implementación. Un DONE no autoriza Track B ni historical range.
