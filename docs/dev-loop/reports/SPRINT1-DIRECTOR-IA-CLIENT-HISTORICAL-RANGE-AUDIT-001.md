# SPRINT1-DIRECTOR-IA-CLIENT-HISTORICAL-RANGE-AUDIT-001

```yaml
task_id: SPRINT1-DIRECTOR-IA-CLIENT-HISTORICAL-RANGE-AUDIT-001
mode: DEEP_READ_ONLY_CONTRACT_AND_PHYSICAL_CODE_AUDIT
outcome: AUDIT_COMPLETE_NOT_AN_IMPLEMENTATION
branch_at_audit: main
current_task_at_audit: SPRINT1-DIRECTOR-IA-PERIOD-START-SEMANTICS-001
current_task_status_at_audit: DONE_PENDING_REVIEW
current_task_changed: NO
implementation_authorized: NO
docs_director_ia_changed: NO
code_changed: NO
tests_changed: NO
git_add: NO
commit: NO
push: NO
merge: NO
deploy: NO
client_deep_dive_started: NO
golden_set_implemented: NO
dashboard_behavior_changed: NO
probe_clock: "2026-09-01 America/Mexico_City (Date 2026-09-01T10:00:00-06:00)"
physical_probe: "node -e sobre detectDirectorIaIntent / isClientProfileQuestion / parseExplicitMonths / resolveClientProfileSlots / resolveConversationTurn / alignMonthlyRows / discountPerKg / extractEntityHint / namedCalendarPeriodFromQuestion / classifyTurnKind"
production_db_queried: NO
```

## 1. Executive Summary

En producción, tras un perfil correcto de TORTILLERIA ERICK (Acapulco, jul–sep 2026), el usuario pidió compra y descuento **por cada mes de enero a la fecha**. Director IA respondió solo julio, agosto y septiembre 2026. No proyectó enero–junio.

La traza física demuestra que **el rango explícito nunca se construye**. No se descarta después de detectarse. `parseExplicitMonths` exige **dos o más nombres de mes** y no entiende «a la fecha», «desde», «todo el año» ni «últimos N». «enero a la fecha» contiene un solo nombre de mes → `null`. Entonces `resolveClientProfileSlots` usa `active_period_months` heredado del turno 1 (o, si no hay herencia, `defaultThreeMonths`) = **2026-07, 2026-08, 2026-09**. El loader arma la ventana SQL con el primero y el último de esa lista. El pack y el LLM solo ven esos tres meses.

El default de 3 meses **explica el QUERY_RANGE**, pero **no es el primer punto de divergencia**. El primer punto es el parser de periodo de `client_profile`. El default solo gana porque el parser no produjo rango.

`AVAILABLE_COVERAGE` de Erick en enero–junio **no está demostrada**: esas fechas nunca se consultaron. No se puede afirmar que «no hay datos» ni que «compró 0».

La precedencia contractual hipotética

`EXPLICIT_PERIOD_CURRENT_TURN > VALID_EXPLICIT_PERIOD_FROM_CONTINUITY > DEFAULT_CLIENT_PROFILE_RANGE`

**no existe hoy como rango abierto**. Hoy existe solo:

`parseExplicitMonths (≥2 nombres de mes, sin expandir intervalo) > inherited active_period_months > defaultThreeMonths (CDMX, mes actual + 2 previos)`.

La corrección `explicit client > inherited stale client` **no debe revertirse**. Ampliar el rango no requiere cambiar Forecast, Period Start Semantics, Dashboard, schema, inherit global ni la fórmula de descuento.

Esta auditoría **no autoriza implementación**.

---

## 2. Incident Reproduction

| Campo | Valor |
|-------|--------|
| Ambiente | Producción (relato humano) |
| Planta | Acapulco |
| Cliente | TORTILLERIA ERICK |
| Turno 1 | «¿Qué sabemos de TORTILLERIA ERICK?» |
| Turno 1 observado | Cliente, planta, canal, jul/ago/sep 2026, kg, descuento, comentarios, ausencia acotada DICF. Tratado como PASS de identidad. |
| Turno 2 | «¿cuanto nos compro y con que descuento por cada mes de enero a la fecha TORTILLERIA ERICK?» |
| Turno 2 observado | Julio 2026, Agosto 2026, Septiembre 2026. Sin enero–junio. |
| Reproducción de código | Sonda local 2026-09-01 CDMX. Sin DB de producción. |
| INCIDENT_REPRODUCED | **PARTIAL** — el síntoma de periodo (jul–sep) se reproduce en slots/SQL window. La verbalización LLM y las filas reales de Erick en DB son NOT_PROVEN aquí. |

Turno 1, sonda 2026-09-01:

- intent `client_profile` — PROVEN
- `extractEntityHint` = `TORTILLERIA ERICK` — PROVEN
- `parseExplicitMonths` = `null` — PROVEN
- slots = `2026-07, 2026-08, 2026-09` (sep PARTIAL) — PROVEN

Turno 2, misma sonda, con inherit `active_period_months=['2026-07','2026-08','2026-09']`:

- intent `client_profile` (la frase de incidente incluye «por cada mes» + «compr» + token `TORTILLERIA`) — PROVEN
- `extractEntityHint` = `null` (el nombre va al final; no hay patrón `sabemos de` / `Y Nombre`) — PROVEN
- `parseExplicitMonths` = `null` — PROVEN
- slots inherited = `2026-07, 2026-08, 2026-09` — PROVEN
- slots sin inherit = los mismos tres meses (default) — PROVEN
- `namedCalendarPeriodFromQuestion` (CEL / Forecast) = `{year:null, month:1}` — PROVEN, **fuera de la ruta client_profile**

---

## 3. Existing Contract

Fuente: `docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md` § «Perfil longitudinal de cliente `client_profile`».

Contrato vigente (no reinterpretado):

- Periodo default: mes calendario actual `America/Mexico_City` + 2 meses previos. Actual = PARTIAL.
- **3 meses calendario ≠ 90 días trailing** de `commercial_trend`.
- «Meses explícitos sustituyen el default **si se soportan**.»
- kg/mes = `SUM(kg)` de `arr.ventas_diarias_cliente`.
- descuento/kg = `SUM(monto)/SUM(kg)`. No AVG de ratios. Denominador ausente → null.
- missing ≠ zero.
- Identidad: `cliente_key` obligatorio. Misma planta. Authz fail-closed.
- Continuidad: `parent_intent`, `cliente_key`, `active_period_months`, canal opcional. **Routing, no evidencia.** Requery cada turno.
- Comments / DICF por `cliente_key`. Comentario ≠ causa. Acción ≠ outcome.
- Ingreso actual = UNSUPPORTED_METRIC.
- GPT sintetiza; runtime posee periodo, alineación y matemáticas.

El contrato **no define** parser de «enero a la fecha», «desde enero», «últimos 12 meses» ni rangos cross-year. «Si se soportan» es la cláusula que el runtime actual cumple de forma estrecha: solo ≥2 nombres de mes, sin expandir el intervalo.

Addendum de prompt (`CLIENT_PROFILE_SYSTEM_ADDENDUM`): «3 meses calendario != 90 días trailing». El prompt **asume** la ventana default; no distingue requested vs queried.

---

## 4. End-to-End Trace

Reloj de sonda: `2026-09-01` CDMX. Pregunta de incidente entre comillas.

### 4.1 USER TEXT

- Archivo: n/a (input humano).
- Input: «¿cuanto nos compro y con que descuento por cada mes de enero a la fecha TORTILLERIA ERICK?»
- REQUESTED_RANGE conceptual: 2026-01 → 2026-09 (día 1, mes actual PARTIAL).
- Evidencia: relato + texto.
- Status: **PROVEN** (texto). Semántica de «a la fecha» = hoy CDMX: **INFERRED** alineado a `cdmxTodayParts`.

### 4.2 Normalización

- Archivo: `lib/director-ia-client-profile.js`
- Función: `normalizeQuestion`
- Output: minúsculas, sin acentos, sin `¿?`. «enero» y «mes» sobreviven.
- Status: **PROVEN**

### 4.3 Routing / intent

- Archivo: `lib/director-ia-planner.js` ~436–440
- Orden: `isCommercialTrendQuestion` **antes** de `isClientProfileQuestion`.
- `isCommercialTrendQuestion`: false (tiene «descuento» → early return false; además no es cue de gráfica).
- `isClientProfileQuestion`: true porque `namesMonthlyMetric` («mes» + «compr») y `hasNamedClientToken` (`TORTILLERIA`).
- Output: `client_profile` confidence 0.88
- Status: **PROVEN** (sonda)

### 4.4 Continuidad conversacional

- Archivo: `lib/director-ia-conversation-state.js` `resolveConversationTurn`
- Kind: `other`
- Con parent `client_profile`: inherit true; `entity_hint` null; `invalidate_entity` false
- Chat (`lib/director-ia-chat.js` ~4467–4479): `entity_hint = continuityTurn.entity_hint || active.display` → **TORTILLERIA ERICK** del turno 1
- `active_period_months` del estado echo se pasa al loader
- Status: **PROVEN** para inherit de intent/identidad. Periodo heredado = los 3 meses del pack anterior.

### 4.5 Entity extraction

- `extractEntityHint` del turno 2 = `null` — PROVEN
- Identidad se conserva por `active.display` / `cliente_norm` — PROVEN en wiring
- `explicitClientHintTakesPrecedence` no aplica (hint vacío) — PROVEN

### 4.6 Explicit client detection

- Turno 1: hint explícito «TORTILLERIA ERICK» — PROVEN
- Turno 2: no hay hint nuevo; no se sustituye el cliente — PROVEN
- Status: identidad del incidente **se conserva**. El fallo no es stale-client.

### 4.7 Period extraction — FIRST_DIVERGENCE_POINT

- Archivo: `lib/director-ia-client-profile.js` `parseExplicitMonths` ~119–141
- Inputs: texto + `now`
- Lógica: busca nombres en `MONTH_NAME_TO_NUM`. Si `uniq.length < 2` → **`null`**
- «enero a la fecha»: solo `enero` → `null`
- No hay tokens para «fecha», «desde», «hasta», «año», «últimos»
- No expande intervalos. Si hay ≥2 meses, devuelve **solo esos meses**, no el rango inclusive
- Año: `today.year`; si `month > today.month` entonces `year -= 1`
- Status: **PROVEN**

CEL `namedCalendarPeriodFromQuestion` sí ve `month:1`, pero **no está cableado** a `client_profile`. Vive en Forecast/EE (`lib/director-ia-chat.js` `handleForecastMagnitudeFollowUpForChat`). Status: **PROVEN** que existe y **PROVEN** que no alimenta este handler.

### 4.8 Period precedence

- Archivo: `resolveClientProfileSlots` ~400–413
- `months = explicit?.length ? explicit : inheritedMonths.length ? inheritedMonths : defaultThreeMonths(now)`
- Incidente: explicit null → inherited jul–sep
- Sin inherit: default jul–sep (idéntico el 2026-09-01)
- Status: **PROVEN**

### 4.9 client_profile handler

- Archivo: `lib/director-ia-chat.js` rama `intent === "client_profile"` ~4460
- Llama `loadClientProfileForChat` con question, entity, keys, `active_period_months`, channel
- Status: **PROVEN**

### 4.10 Range construction

- Archivo: `loadClientProfileForChat` ~896–900
- `first = slots.months[0]`; `last = slots.months[slots.months.length-1]`
- `windowStart/End = monthStartEnd(first/last)`
- Incidente: 2026-07-01 → 2026-09-30
- Status: **PROVEN**

### 4.11 Loader / query parameters

- `queryMonthlySales` + `queryMonthlyDiscount` en paralelo
- Params: `codesUpper` (planta ARR), `startStr`, `endStr`, `canalFilter` (`slots.channel || "ambos"`)
- Status: **PROVEN**

### 4.12 SQL / data source

Ver §13. Status: **PROVEN** el SQL. Filas de Erick en prod: **NOT_PROVEN**.

### 4.13 Rows returned

- GROUP BY `YYYY-MM, cliente_norm, canal, subcanal`
- Sin `generate_series`. Mes sin filas de ningún cliente de la planta → el mes no aparece en el result set
- Status: **PROVEN** forma. Contenido prod: **NOT_PROVEN**

### 4.14 Monthly aggregation / pack

- `alignMonthlyRows` solo sobre `slots.months` (3 meses)
- Enero–junio **no existen** como buckets
- Status: **PROVEN**

### 4.15 Partial / current month

- `defaultThreeMonths` / `markPartialMonths`: sep 2026 = PARTIAL
- Status: **PROVEN**

### 4.16 Prompt

- `formatClientProfileContext`: `meses=2026-07,2026-08,2026-09` + markers PARTIAL
- User content incluye la pregunta original («enero a la fecha») **y** solo 3 meses de evidencia
- Status: **PROVEN**

### 4.17 Answer

- `openaiDirectorIaChat` `max_tokens: 1000`, `answer:string`
- Verbalización prod (solo 3 meses): **INFERRED** coherente con el pack. El LLM no recibió enero–junio.

---

## 5. Routing Matrix

Sonda `detectDirectorIaIntent` / `isClientProfileQuestion` / inherit. Reloj 2026-09-01.

| ID | Texto | Isolated intent | isProfile | isProfile+active | inherit desde Erick profile | explicit months | slots (fresh / inherited jul-sep) | Dónde diverge |
|----|-------|-----------------|-----------|------------------|-----------------------------|-----------------|-----------------------------------|---------------|
| R1 | ¿Qué sabemos de TORTILLERIA ERICK? | `client_profile` | true | true | n/a | null | 07-08-09 / 07-08-09 | Default. OK contractual. |
| R2 | ¿Cuánto nos compró TORTILLERIA ERICK por mes de enero a la fecha? | `client_profile` | true | true | n/a | null | 07-08-09 / 07-08-09 | Parser: 1 mes → null. **Misma clase que el incidente.** |
| R3 | ¿Con qué descuento compró TORTILLERIA ERICK por mes desde enero? | `client_profile` | true | true | n/a | null | 07-08-09 / 07-08-09 | Igual: «desde» no parsea. |
| R4 | Dame venta y descuento de Erick de enero a la fecha. | `unknown` | false | false | true (unknown+parent) | null | 07-08-09 / 07-08-09 | Routing aislado: no hay `\bmes` ni `sabemos`. «venta» ≠ `compr`. Con hilo Erick sí hereda perfil; el periodo sigue default. |
| R5 | ¿Cómo ha evolucionado su compra durante 2026? | `unknown` | false | false | true si parent profile | null | 07-08-09 / 07-08-09 | «2026» solo lo ve CEL. Sin «mes». Periodo default. |
| R6 | ¿Qué compró en agosto? | `unknown` | false | false | true si parent | null | 07-08-09 / 07-08-09 | Un mes nombrado → parser null. **No recorta a agosto.** |
| R7 | Compárame julio contra agosto. | `unknown` kind=`comparison` | false | false | true si parent | **[2026-07, 2026-08]** | 07+08 / 07+08 | Único caso de la matriz donde el parser actual **sí** sustituye el default (2 nombres). No expande. Isolated: unknown. Con hilo: SAME_CAPABILITY débil (dos buckets + `monthOverMonth`). |
| R8 | ¿Y desde enero? + contexto Erick | isolated `unknown` | false | false | **inherit true**, hint null | null | 07-08-09 | Cliente Erick se conserva. Periodo **no** pasa a enero→fecha. |
| R9 | ¿Y GRUPO MOVE desde enero? + contexto Erick | isolated `unknown` kind=`entity_intro` | false | false | **inherit true**, hint=`GRUPO` | null | 07-08-09 | Cliente: hint truncado «GRUPO». Periodo: default. ENTITY y PERIOD fallan por caminos distintos. |
| R10 | Ahora dime lo mismo de GRUPO MOVE desde enero. | `unknown` kind=`plant_switch` | false | false | **inherit false** | null | 07-08-09 | `^ahora dime` clasifica plant_switch. Pierde hilo. Riesgo de clarificación / pérdida de Erick **y** de MOVE. |
| R11 | Todo 2026 para Erick. | `unknown` | false | false | posible inherit | null | 07-08-09 | Año no es rango de client_profile. CEL `{year:2026,month:null}`. |
| R12 | Últimos 12 meses de Erick. | `unknown` | false | false | posible inherit | null | 07-08-09 | No hay last-N. `asksTrailingNinetyDays` solo 90. |
| R13 | De noviembre de 2025 a febrero de 2026. | `unknown` | false | false | posible inherit | **[2026-02, 2025-11]** | esos dos, sin dic-ene | Parser no expande. Orden por número de mes. Ventana SQL invertida (start feb-2026 > end nov-2025). |

Incidente ≈ R2 con «por cada mes» (por eso isolated ya es `client_profile`).

---

## 6. Entity Resolution

| Caso | ENTITY_RESOLUTION | Evidencia |
|------|-------------------|-----------|
| Turno 1 Erick | unique via `sabemos de X` → hint completo | PROVEN |
| Turno 2 incidente (nombre al final) | hint null; identidad por `active.display` | PROVEN |
| «¿Y desde enero?» | hint null; Erick se conserva; `invalidate_entity=false` | PROVEN |
| «¿Y GRUPO MOVE desde enero?» | hint=`GRUPO` (un token del regex `Y + [A-Z…]`) | PROVEN |
| hint `GRUPO` vs inherited `TORTILLERIA ERICK` | `explicitClientHintTakesPrecedence` = true | PROVEN (función: hint ≠ inherited) |
| Match exactNorm(`grupo`) vs `GRUPO MOVE EMPRESARIAL` | probablemente 0 hits → identity forzada al hint o not_found | INFERRED |
| «Ahora dime lo mismo de GRUPO MOVE…» | plant_switch; inherit false; hint null | PROVEN |

**CHANNEL_RESOLUTION (incidente):** la pregunta no nombra CASA/COMISIONISTA. `resolveClientProfileSlots` hereda `active_channel` si el echo lo trae. El state de `client_profile` en chat **no escribe** `identity.canal` del pack a `active_channel`; reenvía el echo. Turno 1 «qué sabemos» sin canal → `canalFilter=ambos`. **PROVEN** wiring. Canal stale solo si el hilo anterior era trend/mover con canal.

**No revertir** `explicitClientHintTakesPrecedence`.

---

## 7. Temporal Resolution

Mecanismos que tocan tiempo en Director IA (relevantes):

| Mecanismo | Dónde | Qué acepta | Qué devuelve | ¿client_profile lo usa? |
|-----------|-------|------------|--------------|-------------------------|
| `parseExplicitMonths` | client-profile.js | ≥2 nombres de mes | lista de esos meses (no intervalo) | **SÍ — único parser de periodo del perfil** |
| `defaultThreeMonths` | client-profile.js | `now` | 3 YYYY-MM CDMX | SÍ |
| `sanitizePeriodMonths` | client-profile.js | YYYY-MM[] | objetos mes | SÍ (inherit) |
| `asksTrailingNinetyDays` | client-profile.js | «90 días» / «últimos 90» | flag limitation | SÍ, no cambia ventana |
| `namedCalendarPeriodFromQuestion` | CEL | un mes o YYYY-MM o año | `{year,month}` un slot | NO (Forecast/EE) |
| `namesCommercialRange` | commercial-trend.js | último mes / 3 meses / 30d / 90d | boolean routing | NO |
| `namesCalendarMonth` | commercial-trend.js | «este mes» | boolean | NO |
| `extractExplicitYmd` / `hasHoyDateSignal` | conversation-state | fecha diaria | daily inherit | NO (diario) |
| Period Start / lastClosedDay | forecast adapter | corte | Forecast | NO |

«a la fecha», «hoy», «este año», «desde», «últimos 6/12» **no tienen parser en client_profile**. CEL puede ver un mes suelto («enero») o un año («2026») y **no propaga** a este intent.

---

## 8. Temporal Precedence

| ID | Escenario | Qué gana hoy | Status |
|----|-----------|--------------|--------|
| P1 | Sin periodo explícito | `defaultThreeMonths` o inherit de 3M | PROVEN |
| P2 | Periodo explícito mismo turno tipo «enero a la fecha» | **Se pierde.** Parser null → default/inherit | PROVEN |
| P2b | Dos meses nombrados «julio contra agosto» | Esos dos meses ganan sobre inherit/default | PROVEN |
| P3 | Cliente heredado + «¿Y desde enero?» | Cliente Erick se conserva. Periodo **no** cambia | PROVEN |
| P4 | Cliente explícito nuevo + periodo nuevo «Y GRUPO MOVE desde enero» | Intent hereda profile. Hint truncado. Periodo default | PROVEN |
| P5 | Cliente explícito nuevo sin periodo | Precedencia de hint (si el hint es usable) + default 3M | PROVEN función; hint de `Y + Nombre` es frágil |
| P6 | Mismo cliente + periodo diferente | Solo si el parser ve ≥2 nombres | PROVEN |
| P7 | Periodo heredado + nuevo explícito detectable | Explicit (2 nombres) gana | PROVEN |
| P8 | Cliente stale + cliente explícito + periodo | `explicitClientHintTakesPrecedence` gana el hint; periodo aparte | PROVEN |

Precedencia real de meses:

```
parseExplicitMonths (≥2 month names, no expansion)
  > inherited.active_period_months
    > defaultThreeMonths(CDMX)
```

No hay `VALID_EXPLICIT_PERIOD_FROM_CONTINUITY` como rango semántico. Lo heredado es la lista YYYY-MM del pack anterior, no «enero a la fecha» del usuario.

---

## 9. Default Range

```
DEFAULT_RANGE = mes calendario CDMX actual + 2 meses calendario previos
DEFAULT_RANGE_SOURCE = lib/director-ia-client-profile.js function defaultThreeMonths
DEFAULT_RANGE_HARDCODED = YES (longitud 3; no hay env/config)
DEFAULT_RANGE_CONTRACTUAL = YES (CAPACIDADES_Y_FUENTES: «mes actual + 2 previos»)
DEFAULT_RANGE_INCLUDES_CURRENT_MONTH = YES (completeness PARTIAL)
```

Sonda:

- 2026-09-01 → `2026-07 COMPLETE, 2026-08 COMPLETE, 2026-09 PARTIAL`
- 2026-01-15 → `2025-11 COMPLETE, 2025-12 COMPLETE, 2026-01 PARTIAL` (cruza año)

No depende de corte Forecast, canal ni cliente. Tests focales (`default 3 meses: actual CDMX + 2 previos`) lo fijan.

El default **puede y debe conservarse** cuando no hay periodo explícito soportado.

---

## 10. Calendar / Timezone

| Pieza | Timezone | Status |
|-------|----------|--------|
| `cdmxTodayParts` | `America/Mexico_City` via `Intl.DateTimeFormat` | PROVEN |
| Default / parser year | esas partes | PROVEN |
| `lastDayOfMonth` | `new Date(year, month, 0).getDate()` — calendario local del proceso | PROVEN código. Longitud de mes es estable. Riesgo residual si se usara la Date para wall-clock: **LOW / OBSERVATION** |
| SQL `fecha::date` | fecha de DB, comparada como date | PROVEN. TZ de la columna: **NOT_PROVEN** sin schema live |
| «a la fecha» | no parseado. Si se implementara, el único reloj ya usado por el perfil es CDMX | INFERRED |
| «hoy» / «este mes» / «este año» | no parseados en client_profile | PROVEN ausencia |

Forecast/Period Start **no** gobiernan este reloj.

---

## 11. Cross-Year Behavior

Representación: objetos `{year, month, yyyymm}` y SQL `fecha` date. Grain = `YYYY-MM`.

| Pedido | Parser | Slots | SQL window (first→last del array) | Status |
|--------|--------|-------|-----------------------------------|--------|
| default en enero | n/a | nov–dic año previa + enero | cronológico OK | PROVEN |
| «noviembre a febrero» / «nov 2025 a feb 2026» | [feb 2026, nov 2025] | no dic, no ene | start `2026-02-01` end `2025-11-30` → **vacío** | PROVEN |
| «enero a agosto» | [2026-01, 2026-08] | solo esos dos | `2026-01-01`→`2026-08-31` (SQL sí cubre feb–jul; pack no) | PROVEN |
| «últimos 12 meses» | null | default 3M | 3M | PROVEN |
| «desde diciembre» (un nombre) | null | default 3M | 3M | PROVEN |

CROSS_YEAR_SUPPORTED = **NO** como rango. El default 3M sí cruza año. El parser de dos nombres asigna año con `month > today.month → year-1` y **ordena por número de mes, no por fecha**.

---

## 12. Loader

`loadClientProfileForChat`:

1. Authz planta (GA/GV blocked; GG/AD `plantas_permitidas`).
2. `resolveClientProfileSlots`.
3. Si hint ≠ inherited norm → resetea channel a lo nombrado en la pregunta (o null).
4. Resuelve planta + códigos ARR (`resolvePlantCodes`).
5. Ventana = first/last de `slots.months` (no min/max cronológico).
6. 2 queries agregadas (ventas + descuentos). No N+1 por mes.
7. Identidad (hint / inherit / top volume).
8. Comments: keys + complemento nombre+planta. **Sin filtro de mes de venta.**
9. DICF + historial por keys. **Sin filtro de mes de venta.**
10. `assembleClientProfilePack` alinea **solo** `slots.months`.

Authz no cambia si se alarga la ventana. `planta_id` y códigos ARR siguen iguales.

---

## 13. SQL / Data Source

### Ventas

```sql
SELECT to_char(v.fecha::date, 'YYYY-MM') AS month,
       TRIM(v.cliente_norm) AS cliente_norm,
       TRIM(COALESCE(cat.canal, v.canal, 'Casa')) AS canal,
       TRIM(COALESCE(cat.subcanal, v.subcanal, '')) AS subcanal,
       SUM(v.kg) AS kg
  FROM arr.ventas_diarias_cliente v
  LEFT JOIN arr.cliente_categoria_mes cat
    ON ... year/month/cliente_norm/plant
 WHERE UPPER(TRIM(v.plant_code)) = ANY($1::text[])
   AND v.fecha >= $2::date
   AND v.fecha <= $3::date
   ${canalSql}
 GROUP BY 1, 2, 3, 4
```

### Descuento

Igual sobre `arr.descuentos_diarios_cliente`, `SUM(d.monto) AS monto`.

- Sin `generate_series`, calendar table, COALESCE a 0, ni LEFT JOIN a meses.
- `canalSqlFor("ambos")` = "" (ambos canales).
- Incidente QUERY: `$2=2026-07-01`, `$3=2026-09-30` (si slots son default/inherit sep-2026).

Comments / DICF: `WHERE planta_id` + `cliente_key = ANY(...)`. Sin `fecha` de venta.

---

## 14. Requested vs Queried vs Available Coverage

Incidente, 2026-09-01:

```
REQUESTED_RANGE     = 2026-01 → 2026-09   (INFERRED semántica humana; texto PROVEN)
QUERY_RANGE         = 2026-07-01 → 2026-09-30   (PROVEN)
AVAILABLE_COVERAGE  = NOT_PROVEN para ene–jun (nunca consultados)
                    = INFERRED jul–sep existen en la respuesta de prod (kg/descuento verbalizados)
```

No hay API `EARLIEST_AVAILABLE_MONTH` / `LATEST_AVAILABLE_MONTH` por cliente, planta o tabla. **NOT_PROVEN / no existe.**

«El usuario pidió enero» ≠ «la fuente contiene enero» ≠ «la query pidió enero». Solo lo segundo+tercero coinciden hoy para jul–sep.

---

## 15. Missing Month Semantics

Categorías de auditoría (no son nombres impuestos al código):

| Categoría | SUPPORTED_NOW | EVIDENCE | SAFE_TO_VERBALIZE_AS_ZERO |
|-----------|---------------|----------|---------------------------|
| OBSERVED_NONZERO | YES | fila cliente + `kg>0` → `kg_status=OK` | N/A (no es cero) |
| OBSERVED_ZERO | YES si hay fila SQL `SUM(kg)=0` | `kg=0`, `kg_status=OK` | YES (cero en fuente) |
| NO_ROW cliente + planta **sí** tiene ventas ese mes | YES como `ZERO_OBSERVED` kg=0 | `alignMonthlyRows` 439–441 | El código **sí** lo trata como 0. Contractualmente missing≠0. **Tensión.** No verbalizar como «compró 0» sin decir que es ausencia de fila del cliente en un mes cubierto por la planta. |
| NO_ROW + planta **sin** ventas ese mes | YES como `DATA_NOT_FOUND` kg=null | 436–438 | **NO** |
| DATA_NOT_FOUND | YES | kg=null | **NO** |
| SOURCE_UNAVAILABLE | NO dedicado | 404 planta/códigos; 403 authz | **NO** |
| NULL_VALUE | YES en descuento | `discountPerKg` → null; `NULL_DENOMINATOR` | **NO** (null ≠ 0) |
| PARTIAL_CURRENT_MONTH | YES | `PARTIAL` marker | N/A |
| FUTURE_MONTH | NO | no hay guarda de futuro | NOT_PROVEN |
| OUTSIDE_AVAILABLE_COVERAGE | NO | no hay metadata de cobertura | NOT_PROVEN |

Pregunta crítica: si Erick no tiene filas en enero, ¿Director IA puede decir «compró 0 kg»?

**Hoy enero ni siquiera es bucket.** Solo podría hablar de enero si enero ∈ `slots.months`. Entonces:

- planta sin cobertura enero → `DATA_NOT_FOUND` / null → verbalizar **«no encontré registros para enero en la fuente consultada»**, no 0. **PROVEN**
- planta con ventas de otros clientes y Erick sin fila → código pone `ZERO_OBSERVED` / 0. Eso **no** es una fila 0 de Erick; es inferencia de cobertura de planta. **PROVEN** código. **NO** es demostración de «compró 0 kg» como hecho de cliente.
- fila Erick `SUM(kg)=0` → 0 real `OK`. **PROVEN**

---

## 16. Zero vs No Row

SQL: mes sin ventas del cliente → **ninguna fila** (GROUP BY). No hay fila 0. No hay NULL de mes. **PROVEN**

Alineación posterior:

| Situación | kg | kg_status |
|-----------|----|-----------|
| Mes no está en plantSalesMonths | null | DATA_NOT_FOUND |
| Mes en planta, sin fila cliente | 0 | ZERO_OBSERVED |
| Fila cliente kg=0 | 0 | OK |
| Fila cliente kg>0 | n | OK |

Sonda física ejecutada para las tres primeras. **PROVEN**

Descuento sin fila + planta con descuento: monto=0; per_kg=0 si kg>0 else null (`NULL_DENOMINATOR`).

---

## 17. Discount Contract

```
SOURCE          = arr.descuentos_diarios_cliente SUM(monto) + kg del mismo mes (ventas)
NUMERATOR       = SUM(d.monto)
DENOMINATOR     = SUM(v.kg) del mismo YYYY-MM / misma identidad
FORMULA         = Number(montoSum) / Number(kgSum)   // discountPerKg
UNIT            = monto/kg (unidad de monto la de la tabla; no se convierte)
SIGN            = el de SUM(monto); no se abs()
ROUNDING        = ninguno (IEEE Number)
NULL_BEHAVIOR   = kgSum<=0 o no finito → null; monto no finito → null
ZERO_KG_BEHAVIOR= null (NULL_DENOMINATOR), no 0
```

Sonda: `discountPerKg(20,10)=2`, `discountPerKg(20,0)=null`, `discountPerKg(null,10)=null`. Tests focales. **PROVEN**

DISCOUNT_FORMULA_CHANGE_REQUIRED = **NO**

No «corregir» descuentos negativos. No AVG de ratios.

---

## 18. Current Month Partiality

- Nace en `defaultThreeMonths` / `parseExplicitMonths` (`current → PARTIAL`) y se reafirma en `markPartialMonths`.
- `PARTIAL` si el mes es el actual CDMX y `today.day < last_day` **o** si `maxF` de planta `< end` del mes.
- `maxByMonth` usa placeholder `${month}-28`, no el MAX(fecha) real. **PROVEN** (limitación: la segunda guarda de maxF es débil).
- No usa `lastClosedDay` ni Period Start Semantics.
- No depende de existencia de filas del cliente (un mes actual sin filas puede ser PARTIAL + DATA_NOT_FOUND/ZERO_OBSERVED).
- enero…agosto COMPLETE + septiembre PARTIAL **pueden coexistir** sin tocar Forecast. **PROVEN** (el default ya lo hace)

NO reabrir `SPRINT1-DIRECTOR-IA-PERIOD-START-SEMANTICS-001`.

---

## 19. Client / Channel Continuity

Turno 1 Erick → Turno 2 «¿Y GRUPO MOVE desde enero?»

```
ENTITY_RESOLUTION  = hint "GRUPO" (truncado); precedence de hint dispara; match exacto improbable
PERIOD_RESOLUTION  = default/inherit 3M (enero no parsea)
CHANNEL_RESOLUTION = si el hilo no tenía canal, ambos; si venía de trend CASA, se hereda salvo hintTakesPrecedence que resetea a channelNamedInQuestion (null)
```

Arreglar periodo **no** debe reintroducir stale entity. `explicitClientHintTakesPrecedence` se conserva. El truncado «GRUPO» es hallazgo **adyacente** (entity extract), no ROOT_CAUSE del incidente de rango.

«¿Y desde enero?» conserva Erick. **PROVEN**

---

## 20. Authorization / Isolation

`assertClientProfileAccess`: mismo fail-closed que ARR (GA/GV 403; GG/AD planta permitida; planta_id obligatorio). Queries filtran `plant_code` de la planta resuelta. Comments `planta_id`. DICF `planta_id = ANY(equivalentes)`.

Ampliar el rango **no** cambia authz, `planta_id`, GA/GV ni scope.

Riesgos:

| Riesgo | Clasificación | Nota |
|--------|---------------|------|
| cross-plant leakage por rango más largo | LOW | mismos códigos de planta |
| same-name collision | preexistente | exactNorm; homónimos → clarification |
| channel leakage | POSSIBLE | inherit de `active_channel` de un hilo trend |
| CROSS_PLANT_RISK | LOW para esta capacidad | |

---

## 21. Pack

`assembleClientProfilePack.period` / `monthly_rows`:

| Campo | ¿Presente? |
|-------|------------|
| requested range | **NO** |
| query range (start/end date) | **NO** (solo lista de slots) |
| months returned | YES `period.months` = slots |
| completeness / PARTIAL | YES `period.markers` |
| missing months vs requested | **NO** |
| source metadata | YES `provenance` |
| kg_status / discount_status | YES por mes alineado |
| comments filtrados por mes | NO (lista global, cap 8 en prompt) |
| DICF filtrado por mes | NO |

El LLM **no** recibe requested≠queried.

---

## 22. Prompt / Verbalization

Puede:

- listar meses del pack y PARTIAL — YES
- kg_status / desc_status — YES
- missing≠0 y NOT_FOUND≠ABSENCE — YES (addendum)

No puede de forma estructural:

- declarar rango solicitado vs consultado
- listar meses faltantes respecto al pedido
- saber que el usuario dijo «enero a la fecha»

El user content **repite la pregunta humana**. Riesgo: el modelo lea «enero a la fecha» y complete. En el incidente **no** lo hizo (respondió 3 meses). Eso es verbalización conservadora, no prueba de guarda.

---

## 23. False Completeness Risk

```
FALSE_COMPLETENESS_RISK = POSSIBLE
  (pregunta en el prompt + pack de 3 meses; no hay campo requested_range)
FALSE_ZERO_RISK         = PROVEN en código para ZERO_OBSERVED (no-row cliente + planta cubierta)
                          = POSSIBLE en verbalización futura si se alarga el rango
FALSE_ABSENCE_RISK      = POSSIBLE en comments/DICF (ya mitigado por NO_ENCONTRADO_EN_ESTA_RUTA)
                          = NOT_PROVEN para meses (el incidente omitió ene–jun; no dijo «no compró»)
```

---

## 24. Performance

Incidente / default:

- 1 query ventas agregada + 1 descuentos + comments + DICF + historial
- No N+1 por mes

Si el rango futuro es 12–24 meses: **sigue siendo 2 queries de hechos** (misma forma). Volumen de filas GROUP BY crece con clientes×meses×canales de la **planta** (la query no filtra cliente en SQL; filtra en memoria).

```
PERFORMANCE_RISK_3M   = LOW
PERFORMANCE_RISK_12M  = MEDIUM (planta completa en memoria; no N+1)
PERFORMANCE_RISK_N+1  = NO (no es N+1)
```

No optimizar en esta auditoría.

`max_tokens` chat = 1000. 12–24 meses caben en `answer:string` y en el pack. Límite práctico: tokens de respuesta, no el contrato. **No cambiar max_tokens.** OBSERVATION: 24 líneas mensuales + comments + DICF pueden apretar 1000 tokens. NOT_PROVEN que hoy falle.

Comparaciones «julio vs agosto» en el mismo pack: `monthOverMonth` ya existe. SAME_CAPABILITY si el parser entrega esos dos meses y el intent es client_profile (hilo). Isolated R7 = unknown. ADJACENT, no OUT_OF_SCOPE total. No es Forecast ni Commercial Movers.

---

## 25. Physical Test Matrix

Sonda 2026-09-01. No se adaptaron tests. Suite existente no se reescribió.

| ID | Resultado REAL |
|----|----------------|
| A1 Qué sabemos de TORTILLERIA ERICK | intent `client_profile`; hint completo; slots 07-08-09 |
| A2 Cuánto nos compró de enero a la fecha TORTILLERIA ERICK | **unknown** isolated (falta «mes»); slots 07-08-09; CEL month=1 |
| A3 Cuánto nos compró TORTILLERIA ERICK desde enero | **unknown**; slots 07-08-09 |
| A4 venta y descuento de Erick de enero a la fecha | **unknown**; slots 07-08-09 |
| A5 Todo 2026 de Erick | **unknown**; slots 07-08-09; CEL year=2026 |
| A6 Últimos 6 meses de Erick | **unknown**; slots 07-08-09 |
| A7 Últimos 12 meses de Erick | **unknown**; slots 07-08-09 |
| A8 Erick en agosto | **unknown**; explicit null; slots 07-08-09 (no recorta) |
| A9 Erick de enero a agosto | isolated **unknown**; explicit **[2026-01, 2026-08]**; SQL window ene–ago; pack solo ene+ago |
| A10 Erick nov 2025–feb 2026 | isolated **unknown**; explicit [2026-02, 2025-11]; SQL invertido |
| B1 Erick → ¿Y desde enero? | inherit profile; hint null; Erick conservable; periodo 07-08-09 |
| B2 Erick → ¿Y GRUPO MOVE desde enero? | inherit; hint `GRUPO`; periodo 07-08-09 |
| B3 Erick → Ahora dime lo mismo de GRUPO MOVE desde enero | plant_switch; inherit **false** |
| B4 MOVE → ¿Y solo agosto? | inherit profile; explicit null; **no** recorta a agosto |

Incidente de producción ≈ A2 **más** la cláusula «por cada mes», que **sí** dispara isolated `client_profile` (como R2).

Tests existentes cubren default 3M, missing≠zero (DATA_NOT_FOUND), descuento SUM/SUM, precedence de hint. **No** cubren «enero a la fecha».

---

## 26. Regression Surface

No tocar / no reabrir:

- Forecast / IGF / PROM / lastClosedDay / Period Start
- Dashboard / 1M-3M gráfica
- commercial-trend-engine / movers / Top 6 / 2+2
- schema / migrations
- inherit global (`resolveConversationTurn`) salvo evidencia nueva
- `explicitClientHintTakesPrecedence`
- fórmula descuento
- semántica comments / DICF acotada
- Client Deep Dive / IES / EKS / Reasoning / Plaud / juntas / voz / Channel Projection

`monthOverMonth` / first-vs-last del perfil: si se alargan slots, las tendencias cambian de significado (first=enero no julio). Documentar; no es Forecast.

---

## 27. Reusable Helpers

| Helper | Vive | Acepta | Devuelve | TZ | Meses | Años | Cross-year | Side effects | Contractual | Reuse |
|--------|------|--------|----------|----|-------|------|------------|--------------|-------------|-------|
| `cdmxTodayParts` | client-profile | Date | y/m/d | CDMX | n/a | n/a | n/a | no | implícito perfil | **SAFE_TO_REUSE** |
| `addMonths` / `ymKey` / `monthStartEnd` | client-profile | y,m | YYYY-MM / start-end | lastDay local | sí | sí | sí (aritmética) | no | implícito | **SAFE_TO_REUSE** |
| `defaultThreeMonths` | client-profile | now | 3 meses | CDMX | sí | sí | sí | no | SÍ | **SAFE_TO_REUSE** (conservar default) |
| `sanitizePeriodMonths` | client-profile | YYYY-MM | objetos | n/a | sí | sí | sí | no | SÍ | **SAFE_TO_REUSE** |
| `parseExplicitMonths` | client-profile | texto | ≥2 nombres o null | CDMX | nombres | heurística | roto | no | «si se soportan» | **NOT_SAFE_TO_REUSE as-is** para rangos abiertos |
| `markPartialMonths` | client-profile | months, today | PARTIAL | CDMX | sí | sí | sí | no | SÍ | **SAFE_TO_REUSE** |
| `namedCalendarPeriodFromQuestion` | CEL | texto | 1 mes/año | n/a | primer nombre | opcional | no rango | no | Forecast/EE | **NOT_SAFE_TO_REUSE** (un slot; otro dominio) |
| `namesCommercialRange` | commercial-trend | texto | bool 30/90/3M | n/a | no YYYY-MM | no | no | no | trend | **NOT_SAFE_TO_REUSE** |
| `extractExplicitYmd` | conversation-state | daily | YMD | daily | no | no | n/a | inherit daily | diario | **NOT_SAFE_TO_REUSE** |

REUSABLE_TEMPORAL_HELPER = `cdmxTodayParts` + `addMonths` + `defaultThreeMonths` + `monthStartEnd` + `markPartialMonths`. **No** el parser actual de rangos. **No** CEL.

---

## 28. FIRST_DIVERGENCE_POINT

```
FIRST_DIVERGENCE_POINT =
  lib/director-ia-client-profile.js
  parseExplicitMonths(question)
  para «… por cada mes de enero a la fecha …»
  → null
  porque uniq(nombres_de_mes).length < 2
  y no existe gramática de rango abierto / «a la fecha» / «desde»
```

Es el **primer** punto. No el SQL. No el pack. No el LLM. No el default.

Hipótesis A (nunca detectado): **PROVEN**  
Hipótesis B (detectado y descartado): **REFUTED** — nunca hubo objeto de rango  
Hipótesis C (handler no acepta rango): parcialmente — el handler acepta cualquier `slots.months`; el parser no se lo da  
Hipótesis D (loader impone ventana): la ventana sigue a slots; no recorta un rango más largo que no existe  
Hipótesis E (SQL impone 3M): **REFUTED** — SQL usa $2/$3 que el loader calcula  
Hipótesis F (pack elimina meses): el pack no recibe ene–jun  
Hipótesis G (prompt solo 3 meses): síntoma, no causa  
Hipótesis H (cobertura limitada): **NOT_PROVEN**  
Hipótesis I (combinación): el default/inherit **rellena** después del parser; es causa **segunda**, no primera

---

## 29. ROOT_CAUSE

```
WHAT_USER_REQUESTED        = kg y descuento por cada mes de enero 2026 a la fecha (2026-09-01)
WHAT_ROUTER_UNDERSTOOD     = client_profile (frase de incidente)
WHAT_PERIOD_PARSER_PRODUCED= null
WHAT_HANDLER_RECEIVED      = slots.months = [2026-07, 2026-08, 2026-09]
WHAT_LOADER_REQUESTED      = fecha 2026-07-01 .. 2026-09-30
WHAT_SQL_QUERIED           = arr.ventas_diarias_cliente + arr.descuentos_diarios_cliente en esa ventana, plant_code IN (Acapulco), canal ambos salvo inherit
WHAT_ROWS_RETURNED         = NOT_PROVEN (sin DB). Forma: GROUP BY mes, sin calendar fill
WHAT_PACK_CONTAINED        = monthly_rows solo 07/08/09; sin requested_range
WHAT_LLM_SAW               = pregunta humana + meses=2026-07,2026-08,2026-09 + PARTIAL sep
```

ROOT_CAUSE (PROVEN):

El parser de periodo de `client_profile` no reconoce rangos abiertos ni un solo mes ancla («enero a la fecha», «desde enero»). Devuelve null. La precedencia cae a `active_period_months` heredado o a `defaultThreeMonths` (3 meses calendario CDMX, actual inclusive). SQL, pack y LLM ejecutan esa ventana. Enero–junio no se consultan.

No es un bug de Forecast. No es Period Start. No es schema. No es que SQL «borre» enero.

---

## 30. MINIMUM_SAFE_CHANGE

Solo después de ROOT_CAUSE. **No implementado. No autorizado.**

Cambio mínimo posterior, si un humano lo autoriza en otra tarea:

1. Extender **localmente** la resolución de periodo en `lib/director-ia-client-profile.js` (`parseExplicitMonths` / sucesor local + `resolveClientProfileSlots`).
2. Reutilizar `cdmxTodayParts`, `addMonths`, `monthStartEnd`, `defaultThreeMonths`, `markPartialMonths`.
3. Gramática mínima: «desde &lt;mes&gt;», «&lt;mes&gt; a la fecha», «&lt;mes1&gt; a &lt;mes2&gt;» **inclusive**, «todo &lt;año&gt;», «últimos N meses», un mes suelto («en agosto», «solo agosto») que **reemplace** inherit/default.
4. Precedencia: explicit current turn (rango expandido) > inherited YYYY-MM > default 3M. Conservar default sin periodo.
5. Ventana SQL = min cronológico → max cronológico de los meses **expandidos** (corregir first/last invertido).
6. Pack: alinear **todos** los meses del requested range; añadir `requested_range` vs `query_range`; no rellenar no-row con 0 de más; no verbalizar DATA_NOT_FOUND como 0.
7. Prompt: prohibir falsa completitud («de enero a septiembre» si el pack no cubre esos meses o hay DATA_NOT_FOUND).
8. No tocar inherit global, Forecast, Dashboard, schema, movers, fórmula descuento, comments/DICF windows, `explicitClientHintTakesPrecedence`.
9. Entity «GRUPO» truncado: **fuera** del mínimo de rango, salvo que el humano lo meta en la misma tarea. Documentado aquí.

Si la evidencia exigiera más: un parser temporal compartido con CEL/Forecast **no** es el mínimo; contaminaría Period Start / Forecast. No forzar ese rediseño.

---

## 31. Future Implementation File Set

```
FILES_READ =
  lib/director-ia-client-profile.js
  lib/director-ia-chat.js (rama client_profile + openaiDirectorIaChat + namedPeriod Forecast)
  lib/director-ia-planner.js
  lib/director-ia-conversation-state.js
  lib/director-ia-commercial-trend.js (guards)
  lib/director-ia-conversational-executive-layer.js (namedCalendarPeriodFromQuestion)
  lib/commercial-trend-engine.js (canalSqlFor)
  lib/cliente-comentarios.js (sin filtro de mes)
  test/director-ia-client-profile.test.js
  docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md (§ client_profile)
  docs/dev-loop/CURRENT_TASK.md (lectura; no escrito)
  docs/dev-loop/LOOP_PROTOCOL.md
  docs/dev-loop/reports/SPRINT1-DIRECTOR-IA-CLIENT-KNOWLEDGE-CONSISTENCY-001.md (formato)

FILES_RELEVANT =
  lib/director-ia-client-profile.js
  lib/director-ia-chat.js (solo wiring de slots/hint ya existente)
  test/director-ia-client-profile.test.js
  docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md (cláusula «si se soportan»; no editar sin G2/G3)

FILES_MINIMUM_FUTURE_IMPLEMENTATION =
  lib/director-ia-client-profile.js
  test/director-ia-client-profile.test.js
  docs/dev-loop/CURRENT_TASK.md          (solo si un humano autoriza OTRA tarea)
  docs/dev-loop/reports/<impl-task-id>.md

FILES_MUST_NOT_CHANGE = ver §32
```

Leer un archivo en esta auditoría **no** lo pone in_scope futuro.

---

## 32. Must-Not-Touch File Set

- `docs/director-ia/**` sin G2/G3 humano
- `lib/dashboard-arr-forecast.js`
- `lib/director-ia-dashboard-forecast-adapter.js`
- `lib/director-ia-authoritative-forecast-run-pack.js`
- `lib/director-ia-conversational-executive-layer.js` (Period Start / Forecast)
- `lib/commercial-trend-engine.js`
- `lib/director-ia-commercial-trend.js` (salvo lectura)
- Dashboard UI / 1M-3M
- schema / migrations
- IES / EKS / Reasoning / Plaud / juntas / Channel Projection / voz
- `lib/director-ia-conversation-state.js` inherit global (no requerido por ROOT_CAUSE)
- este reporte (append-only; no reescribir para «arreglar»)
- `CURRENT_TASK.md` de Period Start (sigue DONE_PENDING_REVIEW)

---

## 33. Future Tests

Diseño. **NO implementados.**

| ID | Caso |
|----|------|
| T1 | explicit enero→fecha → slots 01..mes actual; sep PARTIAL |
| T2 | explicit enero→agosto → 01..08 inclusive, no solo 01 y 08 |
| T3 | todo el año → 01..12 o 01..actual si año corriente |
| T4 | últimos 6 meses |
| T5 | últimos 12 meses (cross-year en enero) |
| T6 | nov 2025–feb 2026: 4 meses; SQL no invertido |
| T7 | mes individual («en agosto», «solo agosto») sustituye default |
| T8 | sin periodo → default 3M **igual** |
| T9 | inherited Erick + «¿Y desde enero?» → misma identity; periodo nuevo |
| T10 | «Y GRUPO MOVE desde enero» — periodo nuevo; entity no debe ser «GRUPO» silencioso (si se incluye entity; si no, test de no-regresión de precedence) |
| T11 | stale entity no gana vs hint usable |
| T12 | stale channel no gana vs canal nombrado; hint nuevo resetea canal |
| T13 | no row + planta sin cobertura ≠ 0 (`DATA_NOT_FOUND`) |
| T14 | observed zero (`SUM(kg)=0`) se preserva `OK` |
| T15 | null descuento / NULL_DENOMINATOR se preserva |
| T16 | mes actual PARTIAL con histórico COMPLETE |
| T17 | comments no se filtran por el nuevo rango (salvo contrato futuro explícito) |
| T18 | DICF ausencia acotada igual |
| T19 | planta 2 no ve planta 1 |
| T20 | Forecast regression (suite; no cambiar adapter) |
| T21 | Period Start regression |
| T22 | Commercial Movers regression |
| T23 | suite `test/director-ia*.js` |

---

## 34. Human Acceptance Questions

1. ¿Acepta que ROOT_CAUSE es el parser (no el default, no SQL, no cobertura)?
2. ¿El default 3M permanece cuando no hay periodo explícito?
3. ¿«¿Y desde enero?» debe conservar Erick y cambiar solo el periodo?
4. ¿Un mes sin fila de Erick, con ventas de planta, puede decirse 0 (`ZERO_OBSERVED`) o debe decirse «sin fila del cliente»?
5. ¿«últimos 12 meses» entra en el first slice o se difiere?
6. ¿El truncado «GRUPO» se atiende en la misma tarea o aparte?
7. ¿Se autoriza una tarea de implementación distinta? (esta auditoría no lo hace)

---

## 35. Golden Set Candidates

Registro. **GOLDEN_SET_IMPLEMENTED = NO**

| Pregunta | Relación con esta capacidad |
|----------|-----------------------------|
| ¿Qué sabemos de TORTILLERIA ERICK? | Default 3M + identidad. Baseline. |
| ¿Cuánto nos compró por mes desde enero? | Rango abierto + cliente heredado o nombrado. |
| ¿Con qué descuento? | Misma ventana; fórmula SUM/SUM. |
| ¿Y desde enero? | Continuidad cliente + periodo nuevo. |
| Ahora dime lo mismo de GRUPO MOVE. | Entity switch (hoy plant_switch). Adyacente. |
| ¿Qué meses no tienes? | requested vs coverage; no falsa completitud. |
| ¿Agosto fue mejor que julio? | Comparación 2 meses en el mismo perfil. |

No implementar Golden Set Maestro ahora.

---

## 36. Open Questions / NOT_PROVEN

- Filas reales de Erick ene–jun 2026 en `arr.ventas_diarias_cliente` Acapulco.
- TZ exacta de `v.fecha` en DB.
- Si el LLM de prod omitió ene–jun por el pack o por instrucción de 3 meses del addendum.
- Homónimos Erick / canal Casa vs Comisionista en Acapulco.
- EARLIEST/LATEST month por planta (no hay query).
- Si `maxByMonth` placeholder `-28` ha marcado mal PARTIAL en prod.
- Volumen de filas planta×12 meses (performance MEDIUM no medido).
- Si «Ahora dime lo mismo» debe ser entity switch y no `plant_switch` (fuera de historical range).

Hallazgos adyacentes (documentados, no corregidos):

| Hallazgo | Tag | Severidad |
|----------|-----|-----------|
| Parser ≥2 nombres, sin «a la fecha»/«desde» | PROVEN | **BLOCKER** para el incidente |
| Default/inherit 3M rellena tras null | PROVEN | **MAJOR** (segunda causa) |
| Dos nombres ≠ intervalo (ene–ago = 2 buckets) | PROVEN | **MAJOR** para T2 |
| Ventana first/last no cronológica (nov–feb invertida) | PROVEN | **MAJOR** cross-year |
| Isolated routing exige «mes»+métrica (A2/A3/A4 unknown) | PROVEN | **MAJOR** si se quieren first-turn sin «mes» |
| Un mes nombrado no recorta (R6, B4) | PROVEN | **MAJOR** |
| hint `Y + primer token` = «GRUPO» | PROVEN | **MAJOR** entity (no ROOT_CAUSE de rango) |
| `ahora dime` = plant_switch | PROVEN | **MAJOR** continuidad |
| ZERO_OBSERVED = no-row cliente + planta cubierta | PROVEN | **MAJOR** semántica 0 |
| Pack sin requested vs query | PROVEN | **MAJOR** falsa completitud |
| CEL ve enero y no se usa | PROVEN | **MINOR** / OBSERVATION |
| `maxByMonth` usa `-28` | PROVEN | **MINOR** |
| Comments/DICF independientes del rango de venta | PROVEN | **OBSERVATION** (correcto salvo contrato futuro) |
| Cobertura prod ene–jun Erick | NOT_PROVEN | — |

---

## 37. Final Contract Matrix

Hipótesis a evaluar (no implementable hasta esta revisión):

`EXPLICIT_PERIOD_CURRENT_TURN > VALID_EXPLICIT_FROM_CONTINUITY > DEFAULT`

| Pregunta | Respuesta |
|----------|-----------|
| 1. ¿Por qué enero→fecha devolvió julio→septiembre? | El parser no construyó el rango; slots cayeron a inherit/default 3M CDMX; SQL y pack solo vieron jul–sep. |
| 2. ¿«enero a la fecha» se detecta hoy? | **No** en client_profile. CEL detecta `month=1` y no se usa. |
| 3. Si se detecta, ¿dónde se pierde? | No se pierde: no se produce. |
| 4. FIRST_DIVERGENCE_POINT | `parseExplicitMonths` → null |
| 5. ROOT_CAUSE | Parser NULL + fallback 3M; no SQL discard |
| 6. ¿Dónde nace el default? | `defaultThreeMonths` |
| 7. ¿Qué significa? | Actual CDMX + 2 previos; actual PARTIAL; 3 calendarios ≠ 90d |
| 8. ¿Se conserva sin periodo explícito? | **Sí, debe** |
| 9. ¿Parser temporal reutilizable? | Helpers de calendario SÍ. `parseExplicitMonths` NO as-is. CEL NO. |
| 10. Precedencia hoy | ≥2 nombres > inherit YYYY-MM > default 3M |
| 11. ¿«¿Y desde enero?» conserva Erick? | **Sí** (intent+entity). Periodo no. |
| 12. ¿«GRUPO MOVE desde enero» sustituye Erick y periodo? | Periodo no. Entity: hint «GRUPO», no MOVE completo. |
| 13. ¿Canal heredado incorrecto? | POSSIBLE si el hilo traía CASA/COMISIONISTA de trend. Incidente: probable ambos. |
| 14. ¿SQL real? | Ver §13; ventana 2026-07-01..2026-09-30 |
| 15. ¿Mes sin fila es 0? | SQL: no hay fila. Align: 0 solo si la planta cubre el mes. |
| 16. ¿0 real? | Fila `SUM(kg)=0` → OK |
| 17. ¿NULL? | kg/descuento null + DATA_NOT_FOUND / NULL_DENOMINATOR |
| 18. ¿Unavailable? | 403/404 loader; no hay status de mes SOURCE_UNAVAILABLE |
| 19. ¿PARTIAL? | Mes actual CDMX (y guarda débil maxF) |
| 20. ¿Cruza años? | Default sí. Rangos nombrados no de forma segura. |
| 21. ¿Timezone? | America/Mexico_City para el reloj del perfil |
| 22. ¿Fórmula descuento? | SUM(monto)/SUM(kg) |
| 23. ¿Cambiarla? | **NO** |
| 24. ¿Forecast? | **NO** |
| 25. ¿Period Start? | **NO** |
| 26. ¿Dashboard? | **NO** |
| 27. ¿Schema? | **NO** |
| 28. ¿Inherit global? | **NO** (no requerido) |
| 29. ¿Client explicit precedence? | **NO cambiar** (preservar) |
| 30. ¿Cambio mínimo seguro? | Parser/slots/pack metadata **local** en client_profile + tests. Ver §30. |

El periodo explícito futuro no debe alterar identidad, planta, authz, canal (salvo nombrado), comments, acciones, Forecast, Movers ni otros dominios.

---

## Hallazgos (índice)

1. **PROVEN / BLOCKER** — `parseExplicitMonths` no detecta «enero a la fecha».
2. **PROVEN / MAJOR** — fallback inherit/default 3M produce QUERY_RANGE jul–sep.
3. **PROVEN / MAJOR** — dos nombres de mes no expanden intervalo; SQL first/last puede invertir cross-year.
4. **PROVEN / MAJOR** — un mes solo nunca gana (R6, B4, «solo agosto»).
5. **PROVEN / MAJOR** — routing isolated sin «mes»+métrica → unknown (A2–A4).
6. **PROVEN / MAJOR** — ZERO_OBSERVED ≠ fila 0 de cliente.
7. **PROVEN / MAJOR** — pack/prompt sin requested vs query (FALSE_COMPLETENESS POSSIBLE).
8. **PROVEN / MAJOR** — hint `Y GRUPO MOVE` = `GRUPO`; `ahora dime` = plant_switch.
9. **NOT_PROVEN** — cobertura física ene–jun de Erick.
10. **PROVEN / OBSERVATION** — comments/DICF no siguen el rango de venta (no cambiar).

---

```
AUDIT_STATUS = COMPLETE
INCIDENT_REPRODUCED = PARTIAL
FIRST_DIVERGENCE_POINT = parseExplicitMonths → null (enero a la fecha; uniq month names < 2)
ROOT_CAUSE = El parser de periodo de client_profile no construye rangos abiertos; el fallback inherit/defaultThreeMonths consulta solo 3 meses CDMX (2026-07..2026-09). SQL/pack/LLM no reciben enero–junio.

REQUESTED_RANGE = 2026-01 → 2026-09 (INFERRED from user text + CDMX clock 2026-09-01)
QUERY_RANGE = 2026-07-01 → 2026-09-30
AVAILABLE_COVERAGE = NOT_PROVEN for 2026-01..2026-06; INFERRED present for 2026-07..2026-09 in production verbalization

EXPLICIT_PERIOD_CURRENTLY_SUPPORTED = ONLY ≥2 named month tokens (no open range, no last-N, no year, no single month)
EXPLICIT_PERIOD_CURRENTLY_PROPAGATED = NO for the incident text
DEFAULT_RANGE = current CDMX calendar month + 2 previous calendar months (current = PARTIAL)
DEFAULT_RANGE_SOURCE = lib/director-ia-client-profile.js defaultThreeMonths
DEFAULT_RANGE_PRESERVED_POSSIBLE = YES

CONTINUITY_CLIENT_PRESERVED = YES for «¿Y desde enero?»
EXPLICIT_NEW_CLIENT_PRECEDENCE_PRESERVED = YES (do not revert); hint extract for «Y GRUPO MOVE» is truncated
CHANNEL_INHERITANCE_RISK = POSSIBLE

CROSS_YEAR_SUPPORTED = NO (named ranges); default 3M YES
TIMEZONE = America/Mexico_City (cdmxTodayParts)

MISSING_MONTH_SEMANTICS = only for months inside slots; outside slots = invisible
NO_ROW_EQUALS_ZERO = NO at SQL; YES in align if plant month covered (ZERO_OBSERVED)
OBSERVED_ZERO_PRESERVED = YES (SQL SUM(kg)=0 → kg=0 OK)
NULL_PRESERVED = YES (DATA_NOT_FOUND / NULL_DENOMINATOR)
UNAVAILABLE_PRESERVED = loader 403/404 only; no per-month SOURCE_UNAVAILABLE
PARTIAL_CURRENT_MONTH_PRESERVED = YES (independent of Forecast / Period Start)

DISCOUNT_FORMULA = SUM(monto)/SUM(kg)
DISCOUNT_FORMULA_CHANGE_REQUIRED = NO

FORECAST_CHANGE_REQUIRED = NO
PERIOD_START_CHANGE_REQUIRED = NO
DASHBOARD_CHANGE_REQUIRED = NO
SCHEMA_CHANGE_REQUIRED = NO
GLOBAL_INHERIT_CHANGE_REQUIRED = NO

REUSABLE_TEMPORAL_HELPER = cdmxTodayParts + addMonths + defaultThreeMonths + monthStartEnd + markPartialMonths
FALSE_COMPLETENESS_RISK = POSSIBLE
FALSE_ZERO_RISK = PROVEN (ZERO_OBSERVED path) / POSSIBLE (verbalization if range expands)
CROSS_PLANT_RISK = LOW

MINIMUM_SAFE_CHANGE = Local period parser + slot expansion + chronological SQL window + pack requested/query metadata in client_profile only; keep default 3M; keep explicit-client precedence; do not fill missing months with zero
FILES_MINIMUM_FUTURE_IMPLEMENTATION = lib/director-ia-client-profile.js; test/director-ia-client-profile.test.js; future CURRENT_TASK + impl report only if human authorizes

CLIENT_DEEP_DIVE_STARTED = NO
GOLDEN_SET_IMPLEMENTED = NO
IMPLEMENTATION_AUTHORIZED = NO
CURRENT_TASK_CHANGED = NO
DASHBOARD_BEHAVIOR_CHANGED = NO

STOP.
```

Esta auditoría no autoriza implementación.
Un hallazgo no autoriza una corrección.
Una auditoría completa no autoriza la siguiente tarea.
