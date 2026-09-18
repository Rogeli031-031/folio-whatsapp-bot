# FIX-DIRECTOR-IA-CLIENT-DISCOUNT-RANGE-AND-NO-DATA-001

```yaml
task_id: "FIX-DIRECTOR-IA-CLIENT-DISCOUNT-RANGE-AND-NO-DATA-001"
outcome: "DONE_PENDING_REVIEW"
mode: "IMPLEMENTATION"
implementation_authorized: YES
merge_authorized: NO
deploy_authorized: NO
schema_changes: false
data_mutation: false
merge: false
deploy: false
base_main_sha: "8cbc4f07f5c8f25325c388032605ffae28eb4563"
branch: "fix/director-ia-client-discount-range-no-data-001"
g1_human: "AUTHORIZED + HUMAN + AUTHORIZED_BY_HUMAN intactos; implementer no los escribió"
secrets_check: "none"
contracts_modified: []
```

## SHA / rama

- `origin/main` verificado: `8cbc4f07f5c8f25325c388032605ffae28eb4563`
- Rama: `fix/director-ia-client-discount-range-no-data-001`
- No PR. No merge. No deploy. No next task.

## Root cause del rango

`extractPeriodYm` (y el loop de `MONTHS_ES`) devolvía el **primer** `YYYY-MM` hallado.

En `que cliente tiene mayor descuento de enero a septiembre`:

1. El diccionario empieza en `enero`.
2. `\benero\b` coincide primero.
3. Se devolvía `2026-01`.
4. `septiembre` nunca se aplicaba.

No es una excepción enero/septiembre: cualquier par de meses colapsaba al primero.

## Spec antes / después

Antes:

- `period: "2026-01"` (mes único)
- sin `period_kind` / `period_start` / `period_end`

Después:

| Campo | Valor para el caso A |
|---|---|
| `DOMAIN` | ARR |
| `OPERATION` | RANK |
| `ENTITY_TYPE` | CLIENT |
| `METRIC` | DISCOUNT |
| `DISCOUNT_METRIC` | DISCOUNT_TOTAL_MXN |
| `DIRECTION` | HIGH |
| `LIMIT` | 1 (singular `qué cliente` / `quién`) |
| `PERIOD_KIND` | RANGE |
| `PERIOD_START` | 2026-01 |
| `PERIOD_END` | 2026-09 |

Mes único sigue usando `period`.

Precedencia: rango explícito > mes único explícito > pending completion > prior compatible > selected period > aclaración.

Parser: reutiliza `extractPeriodRange` (folio-search) más el conector genérico `X hasta Y`. No hay regex fija enero-septiembre.

Rango inválido (`septiembre a enero de 2026`): no se invierten extremos. Aclara.

## Query bounds

Rango `2026-01` … `2026-09`:

- `2026-01-01` → `2026-09-30`
- fuente: `arr.descuentos_diarios_cliente`
- agrupación: cliente
- métrica: `SUM(monto)` sobre las filas del rango (`queryMonthlyDiscount` + `rankByDiscount`)

No se promedian meses. No se suman rankings mensuales ya truncados.

## No-data

Si no hay filas de descuento:

- mes: `No tengo descuentos observados por cliente cargados para septiembre de 2026.`
- rango: `No tengo descuentos observados por cliente cargados de enero a septiembre de 2026.`

No se menciona forecast, proyección ni ARR proyectado. Ese texto queda solo para ranking de **venta**.

## Fallback de descuento

Sí hay `LAST_SAFE_CUT` propio, solo para **mes único**:

- fuente exclusiva: `arr.descuentos_diarios_cliente`
- no reutiliza filas de ventas
- no se aplica a RANGE
- no es silencioso

Wording: `No tengo descuentos observados en septiembre. El último periodo con descuentos registrados es agosto de 2026:`

## 50 variants / anti-collisions / follow-ups

Solo en `test/director-ia-client-discount-range-and-no-data.test.js`.

- 50 range discount
- 20 anti-colisiones
- 15 follow-ups (`METRIC=DISCOUNT`, `DISCOUNT_METRIC=DISCOUNT_TOTAL_MXN`)

## Tests

Nuevo suite 12/12.

Regresiones 0 fallos no explicados:

- client rankings physical source
- pending clarification
- folio navigation / open-month
- executive backlog
- client_profile
- new clients

## Limitaciones

- No se editó `docs/director-ia/`.
- RANGE no hace last-safe-cut.
- La query de descuento sigue agrupando por mes internamente; `rankByDiscount` suma `monto` de todas las filas del rango, equivalente a `SUM(monto)` físico.

## Cierre

**DONE_PENDING_REVIEW.** Este reporte no autoriza la siguiente tarea.
