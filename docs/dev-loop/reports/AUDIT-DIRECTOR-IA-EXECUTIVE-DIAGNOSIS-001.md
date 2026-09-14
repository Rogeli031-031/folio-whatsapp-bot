# AUDIT-DIRECTOR-IA-EXECUTIVE-DIAGNOSIS-001

```yaml
task_id: "AUDIT-DIRECTOR-IA-EXECUTIVE-DIAGNOSIS-001"
outcome: "DONE"
mode: "AUDIT"
implementation: false
code_changes: false
test_changes: false
docs_director_ia_changes: false
reference_main: "4ed43213"
probes: "read-only planner/CEL/month_close/PRE_CLOSE/plant_diagnosis"
next_task_proposed: "IMPL-DIRECTOR-IA-EXECUTIVE-DIAGNOSIS-OBSERVATION-RISK-001"
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
```

## 1. Resultado

**DONE_PENDING_REVIEW. No se implementó DIAGNOSIS.**

Regla física: **detectar que algo está mal ≠ saber por qué**. **Correlación ≠ causalidad.**

Director IA **puede observar** hechos (venta, clientes perdidos, acciones vencidas) y **calcular desviaciones** (vs `igf_meta.venta_ton`, vs mes previo, vs 14d same-weekday). **Puede emitir riesgos tipados** solo en PRE_CLOSE (`deriveRisksAndGaps`). **No puede afirmar causa confirmada** en runtime. El Reasoning Engine N5 (hipótesis) **no está en el chat legado**. IES **no es la entrada** de estas preguntas.

La familia DIAGNOSIS **no existe** como intención. CEL detecta `RISK_FOCUS` / `CAUSE_EXPLANATION` con `implemented: false`. `¿Qué está pasando?` se aplana a `EXECUTIVE_STATUS`.

## 2. Cinco niveles (no equivalentes)

| Nivel | Qué autoriza | Qué prohíbe | ¿Existe runtime? |
|-------|--------------|-------------|------------------|
| **1. OBSERVACIÓN** | Hecho de fuente: “venta to-date X t”, “cliente Y kg=0 este mes”, “N acciones vencidas” | “Eso es el problema” / “por eso estamos mal” | Sí: ARR, AR, DICF, month_close, daily, plant_diagnosis packs |
| **2. DESVIACIÓN** | Diferencia vs referencia física: actual vs `igf_meta.venta_ton`; kg vs mes previo; daily vs 14d | Usar la desviación como explicación | Sí: month_close attainment; M9 deltas; daily deviation; PRE_CLOSE actual vs target/forecast |
| **3. RIESGO** | Condición de **regla explícita** + evidencia | Riesgo subjetivo / “lo que más me preocupa” sin regla | Sí **solo** PRE_CLOSE `risk_code`s. CEL `RISK_FOCUS` no implementado |
| **4. HIPÓTESIS** | Explicación posible etiquetada, anclada a evidencia | Presentarla como hecho | Contrato N5 (`05`). **No** en chat. GPT de plant_diagnosis/month_close tiene prohibido causalidad; residual de prosa |
| **5. CAUSA CONFIRMADA** | Relación causal con evidencia / regla aprobada | Correlación, mover matemático, comentario, desviación vs meta | **No** en runtime. EKE: no hay regla causal formal acción→ARR. Steering `HUMAN_DECLARED_CAUSE` = “X atribuyó Y”, no “Y causó X” |

## 3. Autoridades

Consultados (no modificados): Constitución, EKE, `05-REASONING-ENGINE.md` §11, `04-IES`, `EXECUTIVE-STEERING-CAPTURE-CONTRACT`, `DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md`, `origin/main` `4ed43213`.

IES / RE / Evidence Builder **no** gobiernan el chat legado. `plant_diagnosis` y `financial_diagnosis` **no** son N4/N5.

## 4. Hechos que sí puede observar

- Venta/kg ARR mes o to-date; mix CASA/COMI.
- Descuento ARR `SUM(monto)/SUM(kg)`.
- IGF stored / forecast (como FORECAST, no actual).
- Clientes new/lost/movers (month_close, PRE_CLOSE, daily).
- Comentario DICF/`cliente_comentarios` **si hay `cliente_key`**: texto almacenado.
- Action Register: abiertas, vencidas, responsable **de la acción**.
- Folios/KPIs: conteos, aging, importe.
- Presupuesto semanal: asignado vs seleccionado (carro).
- Proyectos `EN_CURSO`; **derivado** `fecha_cierre_estimada < hoy` (no es estatus `atrasado`).
- Bitácora (bloque plant_diagnosis, sin contenido crudo amplio).

## 5. Desviaciones que sí puede calcular

| Referencia | Métrica | Runtime |
|------------|---------|---------|
| `igf_meta.venta_ton` | venta vs meta | `month_close_result` (y PRE_CLOSE muestra target) |
| Mes calendario previo | kg cliente / mix | month_close movers; M9 deltas |
| 14d same-weekday | venta o $/kg del día | `daily_*_deviation` (`target_date` = día, no meta) |
| Trend 90d OLS | dirección UP/DOWN | `commercial_trend`; PRE_CLOSE `COMMERCIAL_DETERIORATION` |
| Forecast vs target | venta IGF vs `venta_ton` | PRE_CLOSE `FORECAST_BELOW_TARGET` (proyección, no cumplimiento) |
| Forecast vs actual | remanente | PRE_CLOSE `REMAINING_FORECAST_DEPENDENCE` |
| Carro semanal | seleccionado vs asignado | `budget_status` si se nombra presupuesto semanal |

**No:** gasto vs `igf_meta.gasto_kg`; descuento vs `com_desc_kg` (columna TARGET existe, **sin** attainment); “gastando de más” vs presupuesto de planta.

## 6. Reglas de riesgo que existen de verdad

Solo `deriveRisksAndGaps` en `lib/director-ia-executive-cycle-composer.js` (PRE_CLOSE):

| risk_code | Condición física | Nivel correcto |
|-----------|------------------|----------------|
| `FORECAST_BELOW_TARGET` | forecast.venta_ton < target.venta_ton | RISK (forecast vs TARGET, no causa) |
| `FORECAST_RESULT_NEGATIVE` | IGF resultado_final_importe < 0 | RISK (FORECAST, no FINAL) |
| `COMMERCIAL_DETERIORATION` | trend 90d `DOWN` | RISK; “Mover != causa” |
| `LOST_HIGH_VOLUME_CLIENT` | kg prior > 0 y kg to-date = 0 | OBSERVACIÓN + RISK; no por qué se fue |
| `OVERDUE_ACTION` | `actions.overdue > 0` | RISK operativo; acción ≠ causa de venta |
| `REMAINING_FORECAST_DEPENDENCE` | forecast > actual + 0.05 t | RISK; no afirma que el remanente ocurra |

Gaps (no riesgos): `TARGET_MISSING_FOR_PERIOD`, `FORECAST_MISSING`, `SOURCE_UNAVAILABLE`, `ARR_VS_IGF_VENTA`.

Month_close **no** emite `risk_code`. Emite gaps: meta faltante, FINAL ausente, `material_movement_unexplained` (mover sin comentario), `action_missing_result`.

CEL: `isRiskFocusQuestion` exige `que te preocupa` / `que preocupa` / `cual es el riesgo` / `que riesgo`. **No** cubre `preocuparme` ni `qué riesgos ves`. `implemented: false`.

## 7. Dónde hay (y no hay) causalidad

**CAUSE_SUPPORTED: ninguno en chat.**

| Señal | Es | No es |
|-------|----|-------|
| Mover / contribución kg o $/kg | OBSERVACIÓN o DESVIACIÓN cuantificada | Causa empresarial (contrato daily/month_close/trend) |
| Comentario “competencia” | Hecho: “está escrito en `cliente_comentarios`” | Causa confirmada (`plant_diagnosis` addendum) |
| Acción vencida / DICF | Hecho de registro | Causa de la caída ARR |
| Desviación vs meta | DESVIACIÓN | Explicación de por qué |
| `HUMAN_DECLARED_CAUSE` (steering) | “X atribuyó Y en junta” | “Y causó X” |
| N5 hipótesis | Contrato; no runtime | Hecho N2 |

`05` §11: sin causalidad demostrada, prohibido “la causa es”. Una causa probable **nunca** se vuelve hecho.

## 8. Routing físico (sonda `4ed43213`)

| Pregunta | Planner | Need CEL | Lectura |
|----------|---------|----------|---------|
| ¿Qué está pasando? | unknown | EXECUTIVE_STATUS **impl** + CEL | Madre, no diagnóstico |
| ¿Qué debería preocuparme? | unknown | no_need | No pega `RISK_FOCUS` (`preocuparme` ≠ `preocupa`) |
| ¿Qué te preocupa? | unknown | RISK_FOCUS later | Detectado, no implementado |
| ¿Qué riesgos ves? | unknown | no_need | Plural `riesgos ves` no matchea `que riesgo` |
| ¿Cuál es el riesgo? | unknown | RISK_FOCUS later | |
| ¿Qué está funcionando y qué no? | unknown | — | |
| ¿Dónde estamos fallando? | unknown | — | |
| ¿Dónde tenemos problemas? | unknown | — | |
| ¿Qué está saliendo mal? | unknown | — | |
| ¿Qué se está deteriorando? | unknown | — | |
| ¿Cuál es el principal problema? | unknown | — | Ranking no existe |
| ¿Por qué estamos mal? | unknown | CAUSE later | |
| ¿Por qué estamos debajo de la meta? | unknown | CAUSE later | **No** month_close. Desviación ≠ causa |
| ¿Por qué bajaron las ventas? | unknown | CAUSE later | |
| ¿Por qué? | unknown | CAUSE later | Follow-up `why` si hay parent |
| ¿Qué clientes están empeorando? | unknown | — | Hay movers en month_close/daily si se pregunta bien |
| ¿Qué acciones vencidas tengo? | **overdue_actions** | — | OBSERVACIÓN AR. No diagnóstico de venta |
| ¿Dónde estamos gastando de más? | unknown | — | Sin vs presupuesto/meta gasto |
| ¿Cómo vamos contra la meta? | month_close | specialized | DESVIACIÓN venta. No causa |
| ¿Qué debería preocuparme de la planta? | **pre_meeting_brief** | specialized | Colisión: `planta`+`preocup` → PRE_CLOSE |

No hay intent `diagnosis` / `executive_diagnosis`.

## 9. Matriz dominio | hallazgo | nivel | evidencia | “problema” | “causa”

| dominio | hallazgo posible | nivel de diagnóstico | evidencia | puede decir "problema" | puede decir "causa" | observaciones |
|---------|------------------|----------------------|-----------|------------------------|---------------------|---------------|
| ventas / volumen | kg/t del periodo | OBSERVATION_SUPPORTED | ARR | no (solo el hecho) | no | |
| ventas vs meta | actual − `venta_ton` | DEVIATION_SUPPORTED | month_close / PRE_CLOSE | “abajo de la meta”, no “el problema es” | no | PERFORMANCE ≠ DIAGNOSIS |
| ventas vs mes previo | delta kg | DEVIATION_SUPPORTED | M9 / movers | no | no | Histórico ≠ causa |
| ventas daily | vs 14d DOW | DEVIATION_SUPPORTED | daily_sales_deviation | no | no | `target_date` ≠ meta |
| ingresos | delta M9 | DEVIATION_SUPPORTED | M9 | no | no | |
| descuento | $/kg; vs 14d o mes | DEVIATION_SUPPORTED (patrón); no vs `com_desc_kg` | ARR / daily / M9 | no | no | Sin attainment TARGET descuento |
| ARR trend | OLS DOWN | RISK_RULE_SUPPORTED (PRE_CLOSE) | commercial_trend | riesgo tipado, no “problema raíz” | no | |
| IGF | forecast < target; resultado < 0 | RISK_RULE_SUPPORTED | IGF + igf_meta | riesgo de proyección | no | Forecast ≠ actual |
| clientes / movimiento | lost / top negative | OBSERVATION + contribución | month_close, PRE_CLOSE, daily | “este cliente concentró el delta” | no | Contribución ≠ causa |
| comentarios cliente | texto DICF | OBSERVATION_SUPPORTED (declaración) | `cliente_comentarios` | no | no | Hipótesis humana, no causa |
| Action Register | vencidas / abiertas | OBSERVATION + RISK_RULE (PRE_CLOSE / overdue) | AR | riesgo operativo | no | Responsable de acción ≠ culpable |
| acciones vencidas | listado | OBSERVATION_SUPPORTED | `overdue_actions` | “hay vencidas” | no | |
| proyectos | EN_CURSO; cierre estimado < hoy | OBSERVATION_SUPPORTED (derivado) | `public.proyectos` | no “atrasado” almacenado | no | Capabilities lo advierten |
| presupuesto | carro semanal | DEVIATION_SUPPORTED solo vs asignado semanal | budget_status | no KPI planta | no | “gastando de más” no entra |
| gastos / inversiones | folios GASTOS/INV | OBSERVATION_SUPPORTED | M6 | no vs meta IGF | no | |
| apoyos | mes_a vs mes_b | DEVIATION_SUPPORTED (comparativo) | M4 | no | no | |
| KPIs dashboard | conteo/aging folios | OBSERVATION_SUPPORTED | get_dashboard_kpis | no salud de planta | no | |
| month_close_result | pack + gaps + first_mover | OBSERVATION + DEVIATION | ver §5–6 | gap ≠ problema causal | no | `¿Por qué?` hereda hilo, no causa |
| plant_diagnosis | pack multi-fuente | OBSERVATION_SUPPORTED | AR+DICF+bitácora+ARR+IGF | no | **prohibido** en addendum | No IES/N5 |
| financial_diagnosis | bloques IGF/ARR/M9 | OBSERVATION + DEVIATION | financial_diagnosis | no | no | No N5 |
| IES / RE N5 | hipótesis | HYPOTHESIS_ONLY (contrato) | — | — | no en chat | OUT_OF_SCOPE runtime |
| CEL EXECUTIVE_STATUS | pack madre | AMBIGUOUS como diagnóstico | CEL | no | no | `qué está pasando` se aplana |

## 10. Matriz pregunta | intención | evidencia | hoy | correcto

| pregunta | intención actual | evidencia requerida | soportada hoy | comportamiento correcto |
|----------|------------------|---------------------|---------------|-------------------------|
| ¿Qué está pasando? | CEL EXECUTIVE_STATUS | Hechos del pack; no causa | parcialmente (madre) | No venderlo como diagnóstico. No causa. |
| ¿Qué debería preocuparme? | unknown | Lista de RISK_RULE + gaps, planta/periodo | **no** | No CEL. Reusar reglas PRE_CLOSE/month_close. Sin ranking inventado. |
| ¿Qué está funcionando y qué no? | unknown | Hechos +/Δ vs referencia | no | OBSERVACIÓN/DESVIACIÓN etiquetadas. Fail-closed si no hay referencia. |
| ¿Dónde estamos fallando? | unknown | Desviación o riesgo tipado | no | No “fallando” moral. Citar métrica y referencia. |
| ¿Qué riesgos ves? | unknown | `risk_code` existentes | no (detector falla) | Solo reglas §6. No riesgo subjetivo. |
| ¿Cuál es el principal problema? | unknown | Una regla de materialidad aprobada | no | Fail-closed o listar riesgos **sin** “el principal es” salvo un solo hallazgo. |
| ¿Por qué estamos debajo de la meta? | CAUSE later | Causa demostrada; si no, contribuyentes | **no** | Declarar desviación (si hay meta). Contribución ≠ causa. Fail-closed a causa confirmada. |
| ¿Por qué bajaron las ventas? | CAUSE later | Igual | no | Movers + gaps. No “bajaron porque…”. |
| ¿Qué clientes están empeorando? | unknown | Movers/lost | no en esa frase | Redirigir a month_close/daily/trend con contribución. |
| ¿Qué acciones vencidas tengo? | overdue_actions | AR | **sí** (hecho) | No como causa de venta. |
| ¿Dónde estamos gastando de más? | unknown | Presupuesto o meta gasto comparable | no | Fail-closed. No inventar vs IGF. |
| ¿Por qué? (tras PERFORMANCE / meta) | CAUSE later o follow-up `why` | Ver §11 | no causa | Ver §11 |

## 11. `¿Por qué?` después de PERFORMANCE

Contrato vigente (month_close / daily / EKE):

1. **La desviación vs meta no se convierte en causa.**
2. Follow-up `why` en `month_close_result` **reconsulta el mismo pack** (actual, target, movers, gaps). El addendum dice “Mover != causa”.
3. Si hay `first_mover` / lost: puede decir **quién concentró el delta** (contribución).
4. Si hay comentario: **declaración almacenada**, hipótesis humana, no causa confirmada.
5. Si hay `material_movement_unexplained`: gap — “no hay evidencia explicativa cargada”.
6. Si no hay contribuyente ni declaración: fail-closed — “puedo mostrar la desviación y los movimientos; no tengo causa demostrada”.
7. CEL `CAUSE_EXPLANATION` `implemented: false` **no** debe improvisar N5.

Prohibido: “estamos debajo de la meta **porque** el cliente X / el descuento / la acción vencida”.

## 12. Continuidad

- Tras `¿Cómo vamos contra la meta?`: heredar planta, YYYY-MM, métrica venta. `¿Qué debería preocuparme?` puede listar riesgos/gaps **de ese** periodo. No inventar causas.
- Tras “ventas abajo” + `¿Por qué?`: §11.
- `¿Qué clientes están empeorando?` → `¿Cuál pesa más?`: **sí hay cuantificación** (`delta_kg`, share, daily contrib). Eso es contribución, no causa.
- `parent_intent` inheritable: `month_close_result`, `pre_meeting_brief`, `plant_diagnosis`, diarios, trend. **No** hay `executive_status` persistible.
- Colisión: `preocup` + `planta` abre PRE_CLOSE (junta), no DIAGNOSIS suelto.

## 13. Preguntas que deben fallar cerrado

- Cualquier “por qué / causa / principal problema” **como causa confirmada**.
- `¿Qué debería preocuparme?` sin planta/periodo y sin reglas aplicables → clarificar o lista vacía + gap, no inventar.
- `¿Dónde estamos gastando de más?` sin referencia presupuestal comparable.
- Riesgo no tipado (“veo un riesgo de clima/turismo”) sin fuente.
- Hipótesis N5 en este slice (RE no está en chat).
- Aplanar DIAGNOSIS a CEL madre.

## 14. Comentarios, notas, Action Register

| Fuente | Hecho | Hipótesis | Causa confirmada |
|--------|-------|-----------|------------------|
| `cliente_comentarios` / DICF texto | Que el texto existe, fecha, cliente_key | El contenido (p. ej. “competencia”) | Nunca automático |
| Bitácora | Que hubo sesión / entidad | Narrativa | No |
| Action Register | Tema, dueño, vencida, resultado vacío | “por eso cayó la venta” | No. Dueño ≠ culpable |
| Steering `HUMAN_DECLARED_CAUSE` | Atribución en junta | — | No (contrato: autoridad del speaker ≠ hecho) |
| Plaud | PENDING | — | Meeting statement ≠ causal truth |

## 15. ¿Especialización de EXECUTIVE_STATUS o intención subordinada?

**Subordinada, no aplanada a la madre.**

`EXECUTIVE_STATUS` ya absorbe `¿Qué está pasando?` y no implementa riesgo/causa. DIAGNOSIS debe **reutilizar** loaders (month_close, PRE_CLOSE risks, AR, movers) con **etiquetas de nivel**. No es IES/N5. No es `plant_diagnosis` (otro pack, otra pregunta). No es PRIORITY ni recomendación.

## 16. Slice mínimo implementable (propuesto, no autorizado)

`IMPL-DIRECTOR-IA-EXECUTIVE-DIAGNOSIS-OBSERVATION-RISK-001`

Valor real **sin inventar causalidad**:

1. Reconocer preguntas de preocupación / qué está mal / riesgos (semántica, no phrasebook). No absorber `¿Estamos cumpliendo?` ni `¿Cómo vamos?`.
2. Requerir planta + periodo (heredar de month_close / PRE_CLOSE / UI).
3. Emitir lista etiquetada:
   - OBSERVACIÓN (hechos)
   - DESVIACIÓN (solo si hay referencia física)
   - RIESGO (solo `risk_code` ya existentes + overdue + lost client + meta missing como **gap**)
4. Cada ítem: hallazgo, evidencia, nivel, `causa=NO`.
5. `¿Por qué?` / `¿Por qué estamos debajo de la meta?`: mostrar desviación + top contribuyentes + comentarios como declaración + gap si no hay explicación. **Prohibido** “la causa es”.
6. No ranking “principal problema” salvo 0 o 1 hallazgo.
7. No N5. No recomendaciones. No PRIORITY. No gasto-vs-presupuesto. No CEL override.

Fuera: hipótesis rivales, IES, Plaud, causalidad formal.

## 17. Archivos leídos (no tocados)

`lib/director-ia-planner.js`, `lib/director-ia-conversational-executive-layer.js`, `lib/director-ia-executive-cycle-composer.js`, `lib/director-ia-month-close-result.js`, `lib/director-ia-plant-diagnosis.js`, `lib/director-ia-conversation-state.js`, `lib/director-ia-daily-deviation.js`, `lib/director-ia-m3-plantas-kpis-proyectos.js`, contratos EKE / `05` / steering / capacidades.

## 18. STOP

DIAGNOSIS no implementada. PRIORITY no se inicia. `next_task_proposed` no autorizado.
