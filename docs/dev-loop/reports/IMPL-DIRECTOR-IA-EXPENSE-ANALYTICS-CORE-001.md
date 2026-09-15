# IMPL-DIRECTOR-IA-EXPENSE-ANALYTICS-CORE-001

```yaml
task_id: "IMPL-DIRECTOR-IA-EXPENSE-ANALYTICS-CORE-001"
outcome: "DONE"
mode: "IMPLEMENTATION"
implementation: true
code_changes: true
test_changes: true
docs_director_ia_changes: false
schema_changes: false
sql_changes: false
detalle_lineas: false
result_set_continuity: false
proration: false
invented_breakdown: false
reference_main: "eb03e794"
source_audit: "docs/dev-loop/reports/AUDIT-DIRECTOR-IA-TALLER-EXPENSE-ANALYTICS-001.md"
audit_commit: "18d37164"
branch: "implementation/director-ia-expense-analytics-core-001"
next_task_proposed: "IMPL-DIRECTOR-IA-EXPENSE-ANALYTICS-LINE-BREAKDOWN-001"
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
human_decision_needed: "Revisar este slice. No autoriza desglose de partidas, continuidad de result-set, merge ni deploy."
```

## 1. Resultado

**DONE_PENDING_REVIEW.** El núcleo de Expense Analytics responde agregados de Taller, Gastos e Inversiones por dominio, métrica, periodo, estatus y keyword usando solo cabeceras de `public.folios`.

Regla conservada:

**`SUM(folios que contienen "llantas") != gasto exacto en llantas`**

No se leyó desglose de partidas. No se prorrateó. No se parsearon precios desde texto. No se implementó continuidad de result-set.

## 2. Baseline (auditoría `18d37164` sobre `eb03e794`)

Fuente física única de Taller / Gastos / Inversiones en chat: cabeceras de `public.folios`.

| Ruta previa | Intent | Qué hacía |
|-------------|--------|-----------|
| M5 | `taller_at` | Folios Taller **y** token de unidad. |
| M6 | `expense_analysis` / `investment_analysis` | Listado GASTOS (excluye TALLER) o INVERSIONES. |
| `folio_search` | keyword / secuencia | Cabecera por `mes_cargo` + texto. SUM solo si el verbo era `gastamos`/`gastado`. |
| `client_profile` | perfil | `Taller` capitalizado era token de cliente. |

### Preguntas rotas

| Pregunta | Antes | Causa |
|----------|-------|-------|
| ¿Cuánto gasté en Taller en agosto? | `client_profile` | `hasNamedClientToken("Taller")` + periodo explícito |
| ¿Cuánto gasté en apoyos de taller en enero? | `folio_search` LIST, `concepto="apoyos de taller"` | sin descomposición; `gasté` no activaba SUM |
| ¿Cuánto suman los folios que contienen llantas en enero? | lista o SUM de cabeceras | podía venderse como gasto en llantas |
| ¿Cuánto gasté exactamente en llantas? | no existía fail-closed | no hay atribución exclusiva en esta ruta |

## 3. Causa raíz

No había una familia de analítica de gasto. Tres listados y una búsqueda competían por la misma pregunta.

1. El planner evaluaba `folio_search` y luego `client_profile`. `Taller` capitalizado ganaba como cliente.
2. `askedSpendWording` solo reconocía `gastado|gastamos`. `gasté` no disparaba SUM.
3. `extractFolioSearchFilters` pegaba `apoyos de taller` como `concept_query` indivisible.
4. El match de keyword opera sobre cabecera. El importe de cabecera es el folio completo, no la subpartida.

## 4. Nueva descomposición semántica

`lib/director-ia-expense-analytics.js` exporta `extractExpenseAnalyticsSpec`:

| Slot | Valores |
|------|---------|
| dominio | `TALLER` / `GASTOS` / `INVERSIONES` / `null` |
| métrica | `SUM` / `COUNT` / `AVG` / `MAX` / `MIN` / `ATTRIBUTABLE_COMPONENT_COST` |
| periodo | mes único o rango inclusivo (`enero a agosto`, `de enero a agosto`, `enero-agosto`) |
| estatus | `PAGADO` / `PENDIENTE` / `null` |
| keyword | resto semántico (`apoyos`, `llantas`) |

Clasificaciones:

| Código | Significado |
|--------|-------------|
| `EXACT_SUPPORTED` | Agregado de cabeceras de una categoría. Exacto para esa categoría. |
| `FOLIO_TOTAL_ONLY` | Keyword dentro de categoría; suma cabeceras coincidentes. |
| `KEYWORD_MATCH_ONLY` | `TOTAL_FOLIOS_MATCHING_KEYWORD`. Suma importes completos. |
| `BREAKDOWN_MISSING` | Costo exclusivo de subpartida. Fail-closed. |

Cues de SUM en contexto de gasto: `gasté`, `gastamos`, `se gastó`, `cuánto fue`, `cuánto suman`, `total`.

`Taller` dentro de una consulta de gasto se resuelve como categoría, no como cliente. Un cliente real (`Arturo`) sigue yendo a `client_profile`.

## 5. Frontera modificada

| Archivo | Cambio |
|---------|--------|
| `lib/director-ia-expense-analytics.js` | Nuevo. Detector, spec, loader, respuesta. |
| `lib/director-ia-planner.js` | Intent `expense_analytics` **antes** de `taller_mayor` / `folio_search` / `client_profile`. |
| `lib/director-ia-chat.js` | Handler in-process. Sin herencia de result-set. |
| `test/director-ia-expense-analytics-core.test.js` | Nuevo. Casos 1–20. |
| `docs/dev-loop/CURRENT_TASK.md` | Solo `status`: AUTHORIZED → IN_PROGRESS → DONE_PENDING_REVIEW. `authorized_*` intactos. |
| `docs/dev-loop/reports/IMPL-DIRECTOR-IA-EXPENSE-ANALYTICS-CORE-001.md` | Este reporte. |

No se tocó `docs/director-ia/`. No se tocó schema/SQL. No se tocó frontend. No se tocó greeting, DIAGNOSIS ni EXECUTIVE_STATUS.

## 6. Queries / helpers reutilizados

| Helper | Origen | Uso |
|--------|--------|-----|
| `queryReviewableSupportFolios` | `director-ia-igf-reviewable-supports.js` | Lectura de cabeceras por `mes_cargo` + planta. Sin SELECT nuevo. |
| `extractFolioSearchFilters` | `director-ia-folio-search.js` | Periodo único y rango. |
| `textMatchesSearch` | `director-ia-folio-search.js` | Keyword sobre cabecera. |
| `supportFamilyOf` | `director-ia-folio-search.js` | TALLER / GASTOS / INVERSIONES. |
| `assertFolioStatusAccess` / `requirePlantaId` | `director-ia-m2-folio-status.js` | Auth y planta. |

Un mes del rango = una llamada al helper existente. No se mezclan meses. No se mezclan plantas.

## 7. Ejemplos antes / después

### Categoría

`¿Cuánto gasté en Taller en agosto?`

| | Antes | Después |
|--|-------|---------|
| Intent | `client_profile` | `expense_analytics` |
| Spec | cliente `Taller` | `domain=TALLER`, `metric=SUM`, `period=2026-08`, `keyword=null` |
| Respuesta | perfil de cliente | `En agosto 2026, los folios de categoría Taller suman $X MXN.` |

### Apoyos de taller

`¿Cuánto gasté en apoyos de taller en enero?`

| | Antes | Después |
|--|-------|---------|
| Intent | `folio_search` LIST | `expense_analytics` |
| Concepto | `"apoyos de taller"` | `domain=TALLER` + `keyword=apoyos` |
| Métrica | LIST (`gasté` no era SUM) | SUM |

### Keyword vs costo exclusivo

`¿Cuánto suman los folios que contienen llantas en enero?`

```
Los folios coincidentes suman $X MXN.
Ese total corresponde a los importes completos de los folios coincidentes y no necesariamente al gasto exclusivo en llantas.
```

`¿Cuánto gasté exactamente en llantas?`

```
No puedo determinar con exactitud cuánto corresponde exclusivamente a llantas con esta fuente, porque la ruta actual no tiene desglose atribuible usable.
```

`¿Cuánto gasté en refacciones en enero?` → el mismo fail-closed (`BREAKDOWN_MISSING`).

## 8. Diferencia category sum vs keyword total

| Tipo | Ejemplo | Qué suma | Etiqueta |
|------|---------|----------|----------|
| Category sum | gasté en Taller en agosto | Importes de folios cuya `categoria` es Taller | `CATEGORY_SUM` / `EXACT_SUPPORTED` |
| Keyword total | folios que contienen llantas | Importes **completos** de cabeceras coincidentes | `TOTAL_FOLIOS_MATCHING_KEYWORD` |
| Costo exclusivo | exactamente en llantas / en refacciones | Nada. No hay atribución usable | `BREAKDOWN_MISSING` |

Category sum es exacto para la categoría. Keyword total no es gasto exclusivo de la palabra.

## 9. Fail-closed de costo exclusivo

Evidencia en `extractExpenseAnalyticsSpec` + `loadExpenseAnalyticsForChat`:

- `llantas` / `refacciones` sin marco `folios que contienen` → `ATTRIBUTABLE_COMPONENT_COST`.
- No consulta filas para inventar un monto.
- No reparte el importe de cabecera.
- Respuesta declara la ausencia de desglose atribuible.

## 10. Tests

`test/director-ia-expense-analytics-core.test.js` (`now=2026-09-15`):

1. Taller SUM agosto
2. Taller SUM enero–agosto
3. Taller COUNT
4. Taller AVG
5. Taller MAX
6. Taller PAGADOS
7. apoyos + Taller + enero
8. llantas + SUM folios coincidentes + limitación
9. llantas exacto → `BREAKDOWN_MISSING`
10. refacciones exacto → `BREAKDOWN_MISSING`
11. Gastos SUM
12. Inversiones SUM
13. Taller no cae a `client_profile` en el planner
14. cliente real (`Arturo`) sigue `client_profile`
15. `folio_search` de listado sigue funcionando
16. no cruce de planta
17. no cruce de periodo
18. EXECUTIVE_STATUS (`¿Cómo vamos?`) no es `expense_analytics`
19. DIAGNOSIS (`qué está fallando`) no es `expense_analytics`
20. greeting (`hola`) sigue `smalltalk`

Regresión ejecutada:

- `test/director-ia-expense-analytics-core.test.js`
- `test/director-ia-folio-search-truthful.test.js`
- `test/director-ia-folio-search-period-range.test.js`
- `test/director-ia-client-profile.test.js`
- `test/director-ia-conversational-executive-status.test.js`
- `test/director-ia-executive-diagnosis-observations-risks.test.js`

## 11. Diff conceptual

```
antes:
  gasté + Taller + mes → client_profile
  gasté + "apoyos de taller" → folio_search LIST, concept_query entero
  folios que contienen llantas → lista/suma de cabeceras sin advertencia de atribución
  exactamente en llantas → sin fail-closed

después:
  gasté/gastamos/se gastó/cuánto fue/cuánto suman/total + dominio
    → expense_analytics
  domain + metric + period + status + keyword
  category sum etiquetado como categoría
  keyword total etiquetado y advertido
  costo exclusivo → BREAKDOWN_MISSING
```

## 12. Contratos consultados / no modificados

Consultados: Constitución Director IA, contratos en `docs/director-ia/`, `origin/main` `eb03e794`, `LOOP_PROTOCOL.md`, `CURRENT_TASK.md`, auditoría `18d37164`.

Modificados en `docs/director-ia/`: ninguno.

## 13. Desvíos respecto a CURRENT_TASK

Ninguno material.

- MIN está implementado en el detector; no tiene caso numerado propio porque la lista obligatoria 1–20 no lo pedía aparte.
- El detector de `client_profile` sigue viendo `Taller` como token de nombre. La protección es de planner (prioridad), no un parche ciego de `NAME_STOP`.

## 14. Fuera de este slice

- Desglose de partidas / costo exclusivo
- Continuidad de result-set (`¿cuál es la suma del mes?`)
- Schema/SQL/frontend
- Merge a `main`
- Deploy

## Control

| Campo | Valor |
|-------|--------|
| Contracciones o ambigüedades | Ninguna que detenga el slice |
| `authorized_*` tocados | No |
| Push a `main` | No |
| Merge | No |
| Siguiente tarea ejecutada | No |
