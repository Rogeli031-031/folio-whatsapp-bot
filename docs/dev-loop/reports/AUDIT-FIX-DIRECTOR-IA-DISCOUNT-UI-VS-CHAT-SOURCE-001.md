# AUDIT-FIX-DIRECTOR-IA-DISCOUNT-UI-VS-CHAT-SOURCE-001

```yaml
task_id: "AUDIT-FIX-DIRECTOR-IA-DISCOUNT-UI-VS-CHAT-SOURCE-001"
outcome: "DONE_PENDING_REVIEW"
mode: "IMPLEMENTATION"
implementation_authorized: YES
merge_authorized: NO
deploy_authorized: NO
schema_changes: false
data_mutation: false
merge: false
deploy: false
base_main_sha: "6094dd9f9b2c84ab9bd767ddfe896d04aec62804"
branch: "fix/director-ia-discount-ui-vs-chat-source-001"
g1_human: "AUTHORIZED + HUMAN + AUTHORIZED_BY_HUMAN intactos; implementer no los escribió"
db_access: "NOT_EXECUTED_NO_DATABASE_ACCESS"
secrets_check: "none"
contracts_modified: []
```

## SHA / rama

- `origin/main` verificado: `6094dd9f9b2c84ab9bd767ddfe896d04aec62804`
- Rama: `fix/director-ia-discount-ui-vs-chat-source-001`
- No PR. No merge. No deploy. No next task.

## DB access

`DATABASE_URL` unset. `PGHOST` unset. `.env` ausente. `.env.local` ausente.

**NOT_EXECUTED_NO_DATABASE_ACCESS.** No se inventaron `monto`, `kg` ni `plant_code` físicos de septiembre. La traza de código es completa. La query reproducible queda abajo.

## Source map — ARR UI

| Paso | Pieza |
|---|---|
| UI | `frontend-dashboard/app/arr/ArrClient.tsx` — tabla **Clientes por mes**, columna `Descuento {mes B}` |
| Campo visible | `row.descB` ← `rB.descuento_kg` |
| Tooltip mes abierto | “Descuento $/kg proyectado” (el valor sigue siendo `descuento_kg` observado) |
| Cliente API | `fetchArrClientesMes` en `frontend-dashboard/lib/api.ts` |
| Endpoint | `GET /api/dashboard/arr-clientes-mes` |
| Handler | `server.js` → `dashboardArrForecast.computeClientesDescuentoMes` |
| Plant_code UI | `resolveArrClientesMesPlantCode`: match accent-insensitive contra `arr.provincia_plants.plant_code`; si hay varios, el **más largo**. Para “Acapulco” eso es el `plant_code` provincia, no un `planta_id`. |
| Función | `lib/dashboard-arr-forecast.js` `computeClientesDescuentoMes` |
| Tablas | `arr.ventas_diarias_cliente` (kg), `arr.descuentos_diarios_cliente` (monto), `arr.cliente_categoria_mes` (canal), `arr.provincia_plants` + `public.plantas` (mapa de planta) |
| `cliente_norm` | `v.cliente_norm` / `d.cliente_norm` (FULL OUTER JOIN por planta+cliente) |
| Fórmula UI | `descKg = kg > 0 ? Math.abs(monto) / kg : null` donde `kg = SUM(v.kg)` y `monto = SUM(d.monto)` del mes. **No** es `SUM(monto)` solo. **No** es promedio de ratios diarios. **No** es el último descuento. |
| Proyección | En mes abierto se escala `kgProy = kg * factor` de planta. `descKg` **no** se recalcula: si existieran monto y kg observados, `(monto×f)/(kg×f) = monto/kg`. |

## Source map — Director IA (antes)

| Campo | Valor |
|---|---|
| Intent | `CLIENT_DISCOUNT_RANKING` |
| Query | `queryMonthlyDiscount` → `SUM(d.monto)` |
| Tabla | solo `arr.descuentos_diarios_cliente` |
| Filtro planta | `UPPER(TRIM(d.plant_code)) = ANY(uniqueCodes)` |
| `uniqueCodes` | códigos hallados en **`arr.ventas_diarias_cliente`** que matchean alias |
| Métrica | `DISCOUNT_TOTAL_MXN` |
| Vacío | “No tengo descuentos observados por cliente cargados para septiembre de 2026.” |

## Fila trazada (código; no DB)

Cliente visible en ARR septiembre Acapulco (captura humana): **YOLI DE ACAPULCO**, columna descuento **3.70**.

```
UI ArrClient.tsx
  → descB = rB.descuento_kg
  → GET /api/dashboard/arr-clientes-mes?year=2026&month=9&empresa=Acapulco
  → computeClientesDescuentoMes(client, 2026, 9, plantCodeProvincia)
  → SQL ventas ⟂ descs  (FULL OUTER JOIN)
  → descKg = |SUM(monto)| / SUM(kg)
  → JSON descuento_kg
  → celda 3.70
```

Valores físicos `SUM(monto)` / `SUM(kg)` de esa fila: **no ejecutados**.  
Contrato de la celda: si `descuento_kg = 3.70` entonces `|SUM(monto)| / SUM(kg) = 3.70` con `kg > 0`.

GRUPO MOVE EMPRESARIAL visible en **3.01** es menor $/kg y, por volumen, casi seguro mayor MXN. “Mayor descuento” en esa columna es **YOLI**, no MOVE.

## Primera divergencia

1. **Métrica (canónica de la grilla):** UI = `$/kg`. Chat = `SUM(monto)`. Aunque ambas queries trajeran filas, el ganador puede cambiar.
2. **Filtro de planta (causa del vacío):** UI acepta `plant_code` exacto **o** el mapa nombre/clave/`provincia_plants`. Chat exigía `ANY(códigos vistos en ventas)`. Si descuentos guardan “Acapulco” y `uniqueCodes` solo tiene la clave (`E3` u otra), el chat queda en cero filas y dispara el no-data. No es latencia de la grilla.

`cliente_norm` es el mismo campo. El periodo es el mes calendario. Canal ALL no filtraba. El join a `cliente_categoria_mes` no elimina filas de descuento (LEFT JOIN).

## Decisión de métrica

La columna ejecutiva ARR **Descuento {mes}** es `DISCOUNT_PER_KG`.

Métricas disponibles:

| Token | Fórmula | Uso |
|---|---|---|
| `DISCOUNT_PER_KG` | `SUM(monto) / SUM(kg)` si `kg > 0` | ranking “mayor descuento” (canónica ARR) |
| `DISCOUNT_TOTAL_MXN` | `SUM(monto)` | ya no es la canónica de este ranking |

No se pregunta “¿total o por kg?”: la grilla ejecutiva ya define la métrica.

Rango enero–septiembre: **`SUM(monto) / SUM(kg)`** sobre el intervalo. No `AVG` de ratios mensuales.

Individual `qué descuento tiene GRUPO MOVE` sigue `client_profile`.

## After

- Ranking de descuento lee `computeClientesDescuentoMes` (`historico: true`) — misma función backend que la grilla.
- `plant_code` vía `resolveArrClientesMesPlantCode` (la de `arr-clientes-mes`). `server.js` ahora la llama; no hay mapping paralelo de Director IA.
- `resolvePlantCodes.uniqueCodes` también incluye alias crudos (`nombre`, `clave`, `ap_plant_code`), no solo códigos vistos en ventas.
- Respuesta humana: “descuento por kg observado” + `$X.XX/kg`.
- No-data:
  - sin kg para la tasa: “No tengo datos suficientes para calcular descuento por kg por cliente en septiembre de 2026.”
  - sin descuentos: “No tengo descuentos observados por cliente para septiembre de 2026.”
- Sin forecast de ventas en esas frases.

## Query reproducible (read-only; no ejecutada)

```sql
WITH prov_map AS (
  SELECT DISTINCT p.nombre AS prov_name,
         UPPER(TRIM(p.nombre)) AS key_nombre,
         UPPER(TRIM(COALESCE(p.clave, ''))) AS key_clave,
         TRIM(ap.plant_code) AS ap_plant_code
    FROM public.plantas p
    JOIN arr.provincia_plants ap
      ON UPPER(TRIM(ap.plant_code)) = UPPER(TRIM(p.nombre))
      OR (p.clave IS NOT NULL AND TRIM(p.clave) <> ''
          AND UPPER(TRIM(ap.plant_code)) = UPPER(TRIM(p.clave)))
   WHERE UPPER(TRIM(COALESCE(p.nombre, ''))) != 'CORPORATIVO'
     AND UPPER(TRIM(COALESCE(p.clave, ''))) != 'CORPORATIVO'
),
plant_sel AS (
  SELECT plant_code
    FROM arr.provincia_plants
   WHERE UPPER(TRIM(plant_code)) LIKE '%ACAPULCO%'
   ORDER BY LENGTH(plant_code) DESC
   LIMIT 1
),
ventas AS (
  SELECT COALESCE(pm.prov_name, TRIM(v.plant_code)) AS planta,
         v.cliente_norm AS cliente,
         SUM(v.kg) AS kg
    FROM arr.ventas_diarias_cliente v
    LEFT JOIN prov_map pm
      ON UPPER(TRIM(v.plant_code)) = pm.key_nombre
      OR (pm.key_clave <> '' AND UPPER(TRIM(v.plant_code)) = pm.key_clave)
   WHERE v.fecha >= DATE '2026-09-01' AND v.fecha <= DATE '2026-09-30'
     AND (
       COALESCE(pm.prov_name, '') IN (
         SELECT pmf.prov_name FROM prov_map pmf
          WHERE UPPER(TRIM(pmf.ap_plant_code)) = UPPER(TRIM((SELECT plant_code FROM plant_sel)))
       )
       OR UPPER(TRIM(v.plant_code)) = UPPER(TRIM((SELECT plant_code FROM plant_sel)))
     )
   GROUP BY 1, 2
),
descs AS (
  SELECT COALESCE(pm.prov_name, TRIM(d.plant_code)) AS planta,
         d.cliente_norm AS cliente,
         SUM(d.monto) AS monto,
         MIN(d.fecha) AS min_fecha,
         MAX(d.fecha) AS max_fecha,
         MIN(d.plant_code) AS plant_code
    FROM arr.descuentos_diarios_cliente d
    LEFT JOIN prov_map pm
      ON UPPER(TRIM(d.plant_code)) = pm.key_nombre
      OR (pm.key_clave <> '' AND UPPER(TRIM(d.plant_code)) = pm.key_clave)
   WHERE d.fecha >= DATE '2026-09-01' AND d.fecha <= DATE '2026-09-30'
     AND (
       COALESCE(pm.prov_name, '') IN (
         SELECT pmf.prov_name FROM prov_map pmf
          WHERE UPPER(TRIM(pmf.ap_plant_code)) = UPPER(TRIM((SELECT plant_code FROM plant_sel)))
       )
       OR UPPER(TRIM(d.plant_code)) = UPPER(TRIM((SELECT plant_code FROM plant_sel)))
     )
   GROUP BY 1, 2
)
SELECT COALESCE(v.cliente, d.cliente) AS cliente_norm,
       d.plant_code,
       COALESCE(v.kg, 0) AS sum_kg,
       COALESCE(d.monto, 0) AS sum_monto,
       CASE WHEN COALESCE(v.kg, 0) > 0
            THEN ABS(COALESCE(d.monto, 0)) / v.kg END AS desc_kg,
       d.min_fecha,
       d.max_fecha
  FROM ventas v
  FULL OUTER JOIN descs d
    ON v.planta = d.planta AND v.cliente = d.cliente
 WHERE COALESCE(v.cliente, d.cliente) ILIKE '%YOLI%'
    OR COALESCE(v.cliente, d.cliente) ILIKE '%MOVE%';
```

## Tests

- `test/director-ia-discount-ui-vs-chat-source.test.js`: 50 utterances + 25 anti + 20 follow-ups; mes; rango; Casa/Comisionista/ALL; top 1/5/10; kg=0; monto null; individual GRUPO MOVE; alias planta; misma semántica UI/chat; compute ARR vs query E3-only.
- Actualizados: range-and-no-data, physical-source.

## Regresiones

Pasaron: discount range, physical-source, client_profile, new-clients, pending-clarification, folio-nav/open-month, executive backlog, greeting, SEH, expense, commercial_trend.

`test/director-ia-month-close-resolve-plant-codes-shape.test.js` 037–041/043/054 fallan porque inspeccionan `git status` sucio / “no tocar server.js / commercial-trend-engine”. No es fallo funcional de month-close (001–036 de forma pasaron). El cambio en esos archivos es el alineamiento de planta pedido por esta tarea.

## Limitaciones

- Sin DB no se certificó que YOLI 3.70 = `monto/kg` con los enteros reales de septiembre.
- `computeClientesDescuentoMes` por cada mes del rango (hasta 9 llamadas). Misma función que la UI; no se promedian ratios.
- `DISCOUNT_TOTAL_MXN` deja de ser la métrica del ranking agregado. El perfil individual no se reescribió.

## Archivos tocados

- `lib/dashboard-arr-forecast.js`
- `lib/commercial-trend-engine.js`
- `lib/director-ia-client-ranking.js`
- `lib/director-ia-executive-backlog.js`
- `lib/director-ia-chat.js`
- `server.js`
- `test/director-ia-discount-ui-vs-chat-source.test.js`
- `test/director-ia-client-discount-range-and-no-data.test.js`
- `test/director-ia-client-rankings-physical-source.test.js`
- `docs/dev-loop/CURRENT_TASK.md` (solo `status`)
- `docs/dev-loop/reports/AUDIT-FIX-DIRECTOR-IA-DISCOUNT-UI-VS-CHAT-SOURCE-001.md`

No tocados: `docs/director-ia/`, `.env`, `frontend-dashboard/.next`.

## next_task_proposed

Validar en Postgres read-only la fila YOLI septiembre Acapulco (`sum_kg`, `sum_monto`, `desc_kg`) contra la celda 3.70. No autorizado.

## human_decision_needed

Revisión G2/G4 humana. Merge/deploy/siguiente tarea: no.
