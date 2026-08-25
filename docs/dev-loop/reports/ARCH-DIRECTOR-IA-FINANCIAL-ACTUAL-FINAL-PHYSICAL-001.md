# Reporte — ARCH-DIRECTOR-IA-FINANCIAL-ACTUAL-FINAL-PHYSICAL-001

```yaml
task_id: "ARCH-DIRECTOR-IA-FINANCIAL-ACTUAL-FINAL-PHYSICAL-001"
phase: "physical_finalization_architecture"
outcome: "DONE_PENDING_REVIEW"
mode: "PHYSICAL_FINALIZATION_ARCHITECTURE_ONLY"
implementation: false
schema_executed: false
sql_execution: false
runtime_changes: false
ui_changes: false
vba_changes: false
finalization_option_selected: "A"
canonical_final_grain: "GLOBAL_VERSION"
first_implementation_slice: "B"
historical_gap_class: "BACKEND_SUPPORTED_UI_MISSING"
authz_status: "RESOLVED"
contract_alignment: "IMPL_SLICE_B_READY"
next_task_proposed: "IMPL-DIRECTOR-IA-FINANCIAL-ACTUAL-FINAL-PHYSICAL-001"
next_task_authorized: false
next_task_executed: false
modules_changed: []
global_before: "10.5 / 20 = 52.5%"
global_after: "10.5 / 20 = 52.5%"
gain_pp: 0.0
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-FINANCIAL-ACTUAL-FINAL-PHYSICAL-001.md"
files_not_touched:
  - "lib/"
  - "server.js"
  - "test/"
  - "sql/"
  - "frontend-dashboard/"
  - "vba/"
  - "docs/director-ia/"
secrets_check: "none"
human_decision_needed:
  - "G5 LOOP: HUMAN_APPROVER cierra esta tarea. NEXT_TASK no está autorizada ni ejecutada."
  - "Slice B no expone ACTUAL_FINANCIAL runtime ni IES."
  - "52.5% no cambia (0.0 pp)."
```

## Resultado

Diseño físico de `FINANCIAL_FINAL` **READY** para el first slice **B** (schema + finalize/supersede backend + AUTHZ + guardrails de mutación).

- Opción de finalización: **A** (campos en `igf.versions`). C y D rechazadas.
- Grano: **GLOBAL por versión**. Un FINAL vigente por YYYY-MM. No FINAL por planta.
- Estados: `FORECAST` / `FINAL` / `SUPERSEDED` en un solo campo `financial_state`.
- Histórico: `BACKEND_SUPPORTED_UI_MISSING`.
- Versiones existentes: backfill `FORECAST`. Cero FINAL inferido.
- No se implementó nada.

---

## Ejecución

- Rama: `architecture/director-ia-financial-actual-final-physical-001` (≠ `main`).
- G1 intacto: `HUMAN_APPROVER` / `2026-08-25`. En `AUTHORIZED` → `IN_PROGRESS` solo se cambió `status`.
- Hechos congelados no reabiertos: owner FINANZAS; fuente `igf.versions` + `igf.compromiso_lines`; G3 v1.0; AUTHZ RESOLVED.
- Solo lectura del resto del repo. Sin SQL, schema, código, UI, VBA, commit, push, merge.

---

## 1. Tres ejes (no mezclar)

| Eje | Pregunta | Hallazgo físico | No es |
|-----|----------|-----------------|-------|
| **PERIOD_NAVIGATION** | ¿Se puede consultar un YYYY-MM explícito? | Backend **sí**. UI IGF Forecast **no** (solo deriva mes del `upload_day`). | FINAL; completitud ARR |
| **PERIOD_COMPLETENESS** | ¿ARR comercial está completo para ese YYYY-MM? | `CALENDAR_ELAPSED` es computable. `ARR_COMPLETE` **no** es un predicado defendible hoy. | FINAL; navegación |
| **FINANCIAL_FINALITY** | ¿Qué versión de Finanzas es autoritativa? | **No existe** marcador. Latest / `is_current` / corte / ARR no lo crean. | Completitud; visibilidad UI |

Invariantes preservados: `is_current ≠ FINAL`; `latest ≠ FINAL`; `month elapsed ≠ FINAL`; `ARR complete ≠ FINAL`; `historical month ≠ FINAL`; UI missing month ≠ data missing; version exists ≠ authoritative FINAL.

---

## 2. Auditoría física

### 2.1 `igf.versions` (schema inferido; DDL create **no** está en `sql/`)

Columnas usadas en runtime:

| Columna | Evidencia | Uso actual |
|---------|-----------|------------|
| `id` | PK; `version_id` en líneas y GET | Identidad de versión |
| `plant_code` | Siempre `'GLOBAL'` en lecturas dashboard/chat | Upload mensual global |
| `year`, `month` | Filtro de periodo | YYYY-MM |
| `version_number` | `ORDER BY version_number DESC LIMIT 1` | Latest operativo |
| `is_current` | `igf-handler.js` 158–163, 365–366, 520 | Vista WhatsApp; **no** es el selector del GET dashboard |
| `created_at` | `ALTER TABLE … IF NOT EXISTS` `server.js` 11454–11456 | As-of de carga; no fecha de negocio |

**No existen:** `financial_state`, `is_final`, `finalized_at`, `finalized_by`, `superseded_by_version_id`, filename, hash, `source_owner`.

Grain: una fila GLOBAL por `(year, month, version_number)`. Varias `empresa` viven en `igf.compromiso_lines` de esa versión. Confirmado por G3 §0 y por el INSERT VBA (un `versionId` + N empresas).

`is_current` **no** es siquiera “current” del dashboard: `GET /api/dashboard/igf-forecast` y `loadIgfCommitSnapshot` eligen **mayor `version_number`**, no `is_current`.

### 2.2 `igf.compromiso_lines`

Escritura: VBA `BuildInsertCompromiso` (`vba/ModIgfBuildInsertCompromiso.bas` 106–108). Columnas: `version_id`, `line_key`, `empresa`, `venta_ton`, `margen_kg`, `com_desc_kg`, `gasto_kg`, `impuesto_kg`, `hg_pct`, `hg_kg`, `bancos_planta_kg`, `provision_planta_kg`, `util_oper_kg`, `util_oper_importe`, `gtos_apoyos_corp_kg`, `bancos_corp_kg`, `otros_programas_kg`, `inversiones_kg`, `resultado_final_kg`, `resultado_final_importe`.

No hay HTTP INSERT. El módulo VBA completo de `modIgfUpload` **no está en el repo**.

### 2.3 Lecturas YYYY-MM

| Path | ¿Acepta year/month explícito? | Qué versión elige |
|------|-------------------------------|-------------------|
| `GET /api/dashboard/igf-forecast` | **Sí** (`req.query.year/month`; default = mes reloj) `server.js` 12003–12007 | Latest GLOBAL del mes (`resolveIgfGlobalVersion`) |
| `GET /api/dashboard/igf-forecast-mini` | **Sí** | Misma |
| `GET /api/dashboard/igf-versiones` | Lista periodos distintos en DB | `getMesesDisponibles` + versiones del mes |
| `loadIgfCommitSnapshot` | **Sí** (caller pasa year/month) | Latest `version_number` |
| `fetchIgfCompromisoRawRows` (Excel IGF sheet) | **Sí** | Latest stored (sin overlay) |
| Chat / M9 / month_close FORECAST | Pasan year/month | Latest |

Backend **puede** consultar un YYYY-MM histórico aunque la UI no lo ofrezca.

Restricción menor: `upload_day` si se envía debe ser `>=` primer día del mes pedido (`isIgfUploadDayAllowedForMonth`). No impide pedir agosto con `upload_day=2026-09-01` (cierra agosto).

### 2.4 Frontend IGF Forecast — por qué no hay histórico

`IgfForecastClient.tsx` **no** tiene selector de mes. El mes se deriva de `upload_day` vía `resolveIgfYearMonthFromCorte` (L63–81):

- Corte dentro del mes → ese mes (abierto).
- Primera vez que el corte pasa al mes siguiente → se queda en el mes anterior (cerrado).
- Si ya estaba cerrado y el corte sigue en el siguiente → **avanza** a ese mes.

Cuando el calendario entra a septiembre, la vista normal **deja de mostrar agosto**. No es que agosto desaparezca de DB.

Clasificación `HISTORICAL_IGF_PERIOD_NOT_NAVIGABLE`: **`BACKEND_SUPPORTED_UI_MISSING`**.

No se implementa UI en esta tarea ni en el first slice.

### 2.5 Corte, último día y PROY

`isIgfMesCerradoPorCorte` (`server.js` 11393–11406):

- Con `upload_day`: cerrado **solo si** `corte > lastYmd` del mes.
- Último día del mes (p. ej. `2026-08-31` viendo agosto): `31 > 31` es falso → **abierto** → PROY.
- Sin corte: cerrado si year/month < mes calendario del servidor.

`loadProyVentaDescByPlantForIgf` + `computePronosticoProyByPlant`: si el corte está **en** el mes, el día de corte es “en curso”:

- `lastClosedDay = corteDt.getDate() - 1` (`dashboard-arr-forecast.js` 3553).
- `startDay` de “por comprar” = `corteDt.getDate()` (L3589) → el último día **entra a PROY**.

Por eso el último día puede seguir PROY: **el corte igual al último día no cierra el mes** y el día de corte no se trata como ARR cerrado.

Esto **no** prueba FINAL. Es semántica de mes abierto del GET.

### 2.6 Excel vs UI — cutoffs distintos

Tres caminos, no uno:

| Superficie | Condición último día del mes | Qué número usa |
|------------|------------------------------|----------------|
| IGF GET UI | `upload_day == lastYmd` → mes abierto | PROY (`loadProyVentaDescByPlantForIgf`) |
| IGF GET UI | `upload_day > lastYmd` → mes cerrado | ARR `SUM(kg)/1000` (`getVentaRealTonProvinciaByPlant`) |
| ARR Excel hoja A | `cutoffDay = lastDay + 1` si corte = último día (L2719–2723) | **ACUM real** de todos los días del grid (`day < cutoffDay`) |
| Excel hoja «IGF Forecast» | `fetchIgfCompromisoRawRows` | Celdas **stored** latest; sin PROY ni ARR |

Respuesta a “¿Excel y UI usan cutoffs distintos?”: **Sí, en el último día.** No se declara bug de FINAL. El gap `END_OF_MONTH_ARR_FORECAST_VS_EXCEL_ACTUAL` es **inconsistencia de cutoff entre PROY (día de corte abierto) y ACUM/export (último día ya incluido como real)**. Ejes: PERIOD_COMPLETENESS / proyección. No FINANCIAL_FINALITY.

### 2.7 Condición física de ARR

ARR = `ACTUAL_COMMERCIAL` (`arr.ventas_diarias_cliente`). No rows ≠ zero.

| Predicado | ¿Defendible? | Definición física |
|-----------|--------------|-------------------|
| **CALENDAR_ELAPSED** | **Sí** | `upload_day > lastYmd` **o** fecha CDMX > lastYmd. Ya existe como `isIgfMesCerradoPorCorte`. Significa: no queda día calendario futuro. |
| **ARR_COMPLETE** | **No** como gate | No hay flag de ingestión completa. `MAX(fecha) = lastDay` no prueba todas las plantas × todos los días. `arr.upload_log` (`/api/arr/last-upload-day`) es última carga, no censo. Fines de semana / días sin fila no están tipificados. |
| **ARR_INCOMPLETE_OR_UNCONFIRMED** | **Sí (default honesto)** | Todo YYYY-MM que no tenga un predicado de completitud futuro explícito. |

`MAX(fecha)` **no** se adopta como prueba de completeness.

### 2.8 Mutaciones actuales

| Path | Qué hace | ¿Toca histórico? |
|------|----------|------------------|
| VBA INSERT | Nueva `versions` + líneas | Crea versión; no UPDATE de líneas viejas (módulo completo fuera de repo) |
| `PATCH /api/dashboard/igf-forecast` | `UPDATE igf.compromiso_lines` HG + util/resultado **en la misma fila** `server.js` 12396–12410 | **Sí.** Resuelve la misma versión que el GET (latest o as-of). Sin chequeo FINAL. |
| HTTP UPDATE `igf.versions` | **No existe** | — |
| `delete_igf_version_5.sql` | DELETE líneas + versión | Script manual no gobernado |
| Chat / loaders | SELECT only | No |

Único UPDATE de aplicación contra `compromiso_lines`: el PATCH HG. Guardrail futuro obligatorio sobre FINAL/SUPERSEDED.

---

## 3. Respuestas directas

1. **¿Backend puede consultar YYYY-MM histórico aunque UI no lo permita?**  
   **Sí.** `GET /api/dashboard/igf-forecast?year=&month=` y los loaders aceptan periodo explícito.

2. **¿La falta de histórico es UI-only o backend?**  
   **UI-only** respecto a consulta. Clasificación: `BACKEND_SUPPORTED_UI_MISSING`.

3. **¿Por qué el último día puede seguir PROY?**  
   Porque `corte > lastYmd` es falso cuando `corte == lastYmd`, y el motor de pronóstico trata el día de corte como abierto.

4. **¿Excel export y UI usan cutoffs/cálculos distintos?**  
   **Sí** el último día: UI/GET = PROY; hoja A Excel = ACUM real de todos los días; hoja IGF Excel = stored Finanzas.

5. **¿Qué condición física permite decir ARR_COMPLETE?**  
   **Ninguna hoy.** Solo `CALENDAR_ELAPSED` es defendible. Completeness queda `ARR_INCOMPLETE_OR_UNCONFIRMED` hasta un proceso futuro.

6. **¿Qué falta para FINAL explícito?**  
   Campo de estado + provenance + unique FINAL + operación atómica de designación/supersession + AUTHZ ZP/AD en backend + bloqueo de PATCH. No falta calendario, ARR, `is_current` ni botón inferido.

---

## 4. Opciones de finalización A/B/C/D

| Opción | Qué es | Veredicto |
|--------|--------|-----------|
| **A — campos en `igf.versions`** | `financial_state` + provenance + FK de supersession en la fila de versión que ya existe. Valores siguen en `compromiso_lines`. | **Seleccionada.** Mínimo explícito. No duplica montos. Identidad = `version_id` GLOBAL. Alineado a G3 y a `ARCH-DIRECTOR-IA-FINANCIAL-ACTUAL-SOURCE-001`. |
| B — registry aparte | Tabla que apunta a `version_id`. | Rechazada. Mismo hecho, más objeto, más join, más riesgo de FINAL huérfano o doble. No aporta semántica que A no cargue. |
| C — reusar `is_current` | Tratar current como FINAL. | **Rechazada.** Viola `is_current ≠ FINAL`. El dashboard ni siquiera usa `is_current` como selector. |
| D — inferir fecha + ARR | Latest + mes transcurrido + ARR. | **Rechazada.** Viola `latest ≠ FINAL`, `month elapsed ≠ FINAL`, `ARR complete ≠ FINAL`. GET el día 31 sigue PROY. No hay `ARR_COMPLETE` defendible. |

No hay evidencia excepcional que salve C o D.

---

## 5. Grano canónico: GLOBAL

El upload es **una versión mensual GLOBAL, múltiples empresas**.

FINAL **también es GLOBAL por versión**. Un FINAL vigente por `(plant_code='GLOBAL', year, month)`.

No se diseña FINAL por planta: no hay versión por planta en esta fuente. La fila `empresa` es el grano de **lectura** autorizada (GG = ASSIGNED_PLANTS), no el grano de **designación**.

Identidad de un cierre:

| Campo | Rol |
|-------|-----|
| `igf.versions.id` | Versión designada |
| `year` + `month` | Periodo exacto |
| `financial_state = FINAL` | Autoridad |
| `empresa` | Fila al leer; no crea otro FINAL |
| `source_owner = FINANZAS` | Dueño (constante de proceso) |

`is_current` y `version_number` máximo **no** entran en la identidad de FINAL.

---

## 6. Representación FORECAST / FINAL / SUPERSEDED

Un solo campo `financial_state TEXT NOT NULL`. **No** boolean `is_final` (no representa SUPERSEDED).

| Estado | Significado | Default |
|--------|-------------|---------|
| `FORECAST` | Versión usable como vista/plan. Incluye histórico no designado. | **Sí** (todas las existentes) |
| `FINAL` | Única versión autoritativa vigente del YYYY-MM GLOBAL | Nunca inferido |
| `SUPERSEDED` | Fue FINAL; sustituida. Histórico consultable | Solo vía supersession atómica |

No se introduce `UNCLASSIFIED` como estado persistido: G3 solo tiene tres estados. “No designada” = `FORECAST`.

### 6.1 Columnas mínimas (diseño; no ejecutar)

Sobre `igf.versions`:

| Columna | Tipo | Regla |
|---------|------|--------|
| `financial_state` | `TEXT NOT NULL DEFAULT 'FORECAST'` | `CHECK IN ('FORECAST','FINAL','SUPERSEDED')` |
| `finalized_at` | `TIMESTAMPTZ NULL` | NOT NULL si FINAL o SUPERSEDED (momento en que **esa** fila fue designada FINAL; SUPERSEDED conserva el timestamp original) |
| `finalized_by` | `TEXT NULL` | Actor autenticado (`usuario_id` + rol canónico). NOT NULL si FINAL o SUPERSEDED |
| `superseded_by_version_id` | `INT NULL REFERENCES igf.versions(id)` | NOT NULL iff SUPERSEDED; apunta al nuevo FINAL |
| `source_owner` | `TEXT NOT NULL DEFAULT 'FINANZAS'` | Constante de proceso; no actor de app |

Checks:

- `FORECAST` ⇒ `finalized_at IS NULL` AND `finalized_by IS NULL` AND `superseded_by_version_id IS NULL`
- `FINAL` ⇒ `finalized_at IS NOT NULL` AND `finalized_by IS NOT NULL` AND `superseded_by_version_id IS NULL`
- `SUPERSEDED` ⇒ `finalized_at IS NOT NULL` AND `superseded_by_version_id IS NOT NULL` AND `superseded_by_version_id <> id`

Invariante unique FINAL:

```
UNIQUE (year, month) WHERE plant_code = 'GLOBAL' AND financial_state = 'FINAL'
```

Índices adicionales (diseño):

- `(plant_code, year, month, financial_state)`
- `(superseded_by_version_id)`

`compromiso_lines`: **cero columnas nuevas**. No duplicar values.

### 6.2 Migración / backfill

1. `ADD COLUMN` con default `FORECAST` / nulls de provenance.
2. Backfill: **todas** las filas existentes = `FORECAST`.  
3. **Prohibido** auto-marcar histórico como FINAL (latest, `is_current`, mes cerrado, ARR, `created_at`).
4. Finalización retrospectiva = **misma** operación `FINALIZE` (ZP/AD, `version_id` explícito). No es inferencia.
5. Migration safety: default + check no rompe lecturas actuales (nadie lee `financial_state` hoy).
6. DDL create de `igf.versions` sigue ausente en `sql/`; el IMPL debe ser `ALTER` defensivo, no `CREATE TABLE` que pise la tabla viva.

Filename/hash de upload: **no existen** hoy. No se exigen en el first slice. `created_at` = timestamp de carga, no effective-date.

---

## 7. Operación FINALIZE / SUPERSEDE (diseño)

Actor: **solo ZP o AD** (aliases ZP: `DIR_ZP`, `DIRZP`, `DIRECTOR_ZP`, `DZP`, `DIR-ZP`, nombre director+zp — `lib/dashboard-es-zp.js`). No inventar otro actor. USUARIOS no es rol y no obtiene autoridad.

GG: VIEW futuro only. **No** FINALIZE. **No** SUPERSEDE.

### 7.1 FINALIZE

Entrada: `version_id` existente GLOBAL del YYYY-MM, estado `FORECAST`.

Reglas:

- No requiere `is_current`.
- Una versión histórica no current **puede** finalizarse si ZP/AD la nombra.
- `CALENDAR_ELAPSED` / ARR **pueden** devolverse como flags informativos. **No** son autoridad. **No** son hard-gate del first slice (mezclaría ejes; `ARR_COMPLETE` no es defendible).
- Si ya hay FINAL en ese YYYY-MM: esta llamada **no** pisa. Debe usarse SUPERSEDE (nueva versión + atómico).
- Transacción: lock de filas GLOBAL de ese year/month → set FINAL + `finalized_at`/`finalized_by`.

### 7.2 SUPERSEDE (corrección)

1. Nueva carga VBA = **nueva** `version_number` (ya ocurre).
2. En una transacción:
   - Lock periodo GLOBAL.
   - Nueva versión debe existir y estar `FORECAST`.
   - FINAL vigente (si hay) → `SUPERSEDED`, `superseded_by_version_id = nueva`.
   - Nueva → `FINAL` + provenance.
3. Historia conservada. Cero UPDATE destructivo de líneas FINANCE_PROVIDED.
4. `is_current` **no** se mueve por esta operación (sigue siendo flag de upload/vista; distinto de FINAL).

Prohibido: SUPERSEDED → FINAL. FORECAST → SUPERSEDED (sin haber sido FINAL). Re-finalizar la misma fila.

### 7.3 Guardrails PATCH (diseño; no implementar aquí)

`PATCH /api/dashboard/igf-forecast` y cualquier UPDATE futuro de `compromiso_lines` / `versions` metadata financiera:

- Si `financial_state IN ('FINAL','SUPERSEDED')` → fail closed (`409` o `403`). Mensaje: corrección = nueva versión + SUPERSEDE.
- Frontend hide **no basta**.
- Script `delete_igf_version_5.sql`: documentar como path no gobernado; el IMPL no lo legaliza.

---

## 8. AUTHZ (enforcement conceptual)

Decisión ya RESOLVED. No se reabre.

| Acción | Quién | Scope | Dónde se exige |
|--------|-------|-------|----------------|
| VIEW ACTUAL_FINANCIAL | ZP/AD; GG | ALL_PLANTS; ASSIGNED_PLANTS | Backend del **loader futuro** (fuera del slice B) |
| FINALIZE | ZP/AD only | ALL_PLANTS (versión GLOBAL) | Backend del endpoint finalize |
| SUPERSEDE | ZP/AD only | ALL_PLANTS | Backend del endpoint supersede |
| REST | deny | NONE | Fail closed |

Representación first slice: **chequeo de rol canónico** (misma familia que `dashboardBlockGAFinancialKpis` / `isDirectorZPForDashboard`). La matriz AUTHZ es por rol, no por flag nuevo.

No heredar `acceso_igf_forecast_kpis`. No crear flags en esta arquitectura como requisito del slice B. Un flag explícito (`finalize_financial_version`) es opcional posterior si HUMAN_APPROVER quiere administrarlo vía USUARIOS; **no** es el mecanismo del first slice.

JWT hoy colapsa roles a ZP/AD/CF_CDMX/GA/GV/GG. El chequeo debe usar el `role` ya normalizado **y** aliases ZP al emitir/validar. Fail closed si rol ausente o no autorizado.

---

## 9. ARR y validación vs autoridad

- ARR = `ACTUAL_COMMERCIAL`. Nunca crea FINAL.
- `CALENDAR_ELAPSED` = posible **información** al finalizar. No sello.
- `ARR_COMPLETE` = **no** se define como gate.
- `ARR_INCOMPLETE_OR_UNCONFIRMED` = default de completeness.

Lectura futura (no slice B):

| Situación | Código |
|-----------|--------|
| Hay FINAL vigente | FINANCE_PROVIDED de esa versión + provenance; ARR aparte; gap si contradicen |
| Hay versiones, ninguna FINAL | `FINANCIAL_ACTUAL_NOT_FINAL` |
| No hay versión del YYYY-MM | `FINANCIAL_ACTUAL_MISSING_FOR_PERIOD` |
| Dos FINAL (invariante rota) | `FINANCIAL_ACTUAL_VERSION_AMBIGUOUS` |

---

## 10. First implementation slice A/B/C/D

| Slice | Incluye | Veredicto |
|-------|---------|-----------|
| A schema only | Migración, estado, constraints, guards PATCH | Insuficiente como first slice: deja FINAL unsettable salvo pgAdmin (ZP técnico ≠ operación gobernada). |
| **B schema + backend finalize** | A + endpoints finalize/supersede + AUTHZ ZP/AD + guards | **Seleccionada.** Materializa FINAL sin fingir capability de lectura ACTUAL_FINANCIAL. |
| C + read / month_close | B + loader + integración `month_close_result` | Rechazada ahora. Eso es exposición runtime de actual. G3 §13/§15 y Capabilities: runtime P&L / IES siguen pendientes. |
| D everything | C + UI histórica + export + gaps de corte | Rechazada. Mezcla ejes. UI histórica y END_OF_MONTH no son FINAL. |

Slice B **no** implementa: UI histórica, cambio de cutoff ARR/Excel, loader ACTUAL_FINANCIAL, IES, VBA, botón inferido, auto-final.

---

## 11. Alineación contractual

| Documento | Estado vs este diseño |
|-----------|------------------------|
| G3 v1.0 | Máquina, grano GLOBAL, stored≠GET, unique FINAL, PATCH, provenance: **compatible**. Este diseño no reabre G3. |
| Index v1.9 | Ya indexa el contrato; dice finalización física / AUTHZ pendientes. AUTHZ ya RESOLVED; la física la abre el IMPL. El índice no se edita aquí. |
| EKE v1.1 | Clase ACTUAL_FINANCIAL reconocida. Texto `AUTHZ_DECISION_REQUIRED` quedó **desfasado** respecto a AUTHZ RESOLVED. No bloquea el marker. Sí sigue bloqueando IES / P&L como capability. |
| CAPACIDADES_Y_FUENTES | Sync ya dice fuente existe, runtime `NOT_YET_SUPPORTED`. Slice B no contradice: no crea capability de lectura. |
| AUTHZ | RESOLVED. Slice B aplica FINALIZE/SUPERSEDE. VIEW se aplica cuando exista loader (C+). |

G3 §15 pedía G3 + G2 Index + G2 EKE + G2 inventario + AUTHZ **antes de exponer actual en runtime**. Esos gates de **exposición P&L** no se abren con el slice B.

**¿Falta otro gate antes de IMPL del marker?**  
**No** para el slice B. No se propone otra tarea contractual. Un G2 documental posterior (Index/EKE/Capabilities: reemplazar `AUTHZ_DECISION_REQUIRED` por puntero a AUTHZ RESOLVED) es **recomendado**, no bloqueante del schema+finalize.

Constitución / `04` / `05`: no se tocan. IES no se alimenta.

---

## 12. Porcentaje

10.5 / 20 = **52.5%**. **0.0 pp.** Arquitectura; cero módulos runtime.

---

## 13. NEXT_TASK (no autorizada, no ejecutada)

`IMPL-DIRECTOR-IA-FINANCIAL-ACTUAL-FINAL-PHYSICAL-001`

Alcance esperado (diseño; el humano autoriza): slice **B** únicamente.

STOP.
