# FIX-DIRECTOR-IA-GREETING-AND-GENERIC-EXPENSE-KEYWORD-001

```yaml
task_id: "FIX-DIRECTOR-IA-GREETING-AND-GENERIC-EXPENSE-KEYWORD-001"
outcome: "DONE"
mode: "FIX"
implementation: true
code_changes: true
schema_changes: false
db_nombre_persona_modified: false
keyword_catalog_added: false
reference_main: "9c6a5381"
branch: "fix/director-ia-greeting-generic-expense-keyword-001"
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
human_decision_needed: "Revisar y mergear. No autoriza deploy por este agente."
```

## 1. Resultado

**DONE_PENDING_REVIEW.**

- Saludo: `Ing. Luis Rogelio Zaragoza` persistido se muestra como `Hola, Luis Rogelio Zaragoza. ¿En qué te ayudo?`
- Gasto: `cuanto gastamos en aceite en febrero` entra a Expense Analytics sin catálogo de conceptos.

## 2. Causa raíz del "Ing."

`usuarios.nombre_persona` ya trae el honorífico. El vocativo usaba `sanitizeNombrePersona` literal. No era un invento de role/puesto; era eco del campo persistido.

## 3. Causa raíz de "aceite"

`isExpenseAnalyticsQuestion` solo aceptaba dominio Taller/Gastos/Inversiones, frame de folios coincidentes o tokens especiales `llantas/refacciones`. Un concepto libre extraíble no bastaba.

## 4. Cambio mínimo

| Archivo | Cambio |
|---------|--------|
| `lib/director-ia-authenticated-user.js` | Vocativo: `nombrePersonaForGreeting` quita honorífico **solo al inicio**. Lookup y persistido no cambian. |
| `lib/director-ia-expense-analytics.js` | Gate: cue de métrica + `extractKeyword`. Exacto/exclusivo de concepto libre → `BREAKDOWN_MISSING`. Disclaimer en totales por coincidencia textual. |
| `test/director-ia-user-identity-greeting.test.js` | Honoríficos + persistido intacto |
| `test/director-ia-expense-generic-keyword.test.js` | Aceite y equivalentes, veracidad |
| `docs/dev-loop/CURRENT_TASK.md` | Solo `status` |
| `docs/dev-loop/reports/FIX-DIRECTOR-IA-GREETING-AND-GENERIC-EXPENSE-KEYWORD-001.md` | Este reporte |

## 5. Before / after

```
hola + nombre_persona="Ing. Luis Rogelio Zaragoza"
antes: Hola, Ing. Luis Rogelio Zaragoza. ¿En qué te ayudo?
después: Hola, Luis Rogelio Zaragoza. ¿En qué te ayudo?
DB: sigue "Ing. Luis Rogelio Zaragoza"

cuanto gastamos en aceite en febrero
antes: intención no determinada
después: expense_analytics, keyword=aceite, febrero, FOLIO_TOTAL_ONLY + disclaimer
```

Lic./Dr./Dra./Arq. y formas largas se quitan igual. `Ingrid` / `Draco` no se mutilan.

## 6. Veracidad preservada

- Coincidencia textual: suma importes completos de folios + "no necesariamente al gasto exclusivo".
- `exactamente` / `exclusivamente` / `solo [concepto]` sin desglose: falla cerrado.
- Sin `detalle_lineas`. Sin catálogo de aceite/baterías/pintura/uniformes/extintores.

## 7. Pruebas

- Identidad + Expense core + keyword genérico + CEL + DIAGNOSIS: **134/134**
- `scripts/test-director-ia-smalltalk.js`: OK

Cubre honoríficos, fallback, cross-user, aceite/baterías/pintura/filtros/uniformes/extintores, periodo y rango, IGF/excel/Taller Mayor rechazados, EXECUTIVE_STATUS, DIAGNOSIS, PERFORMANCE.

## 8. Diff conceptual

```
saludo:
  persistido = sanitize(nombre_persona)
  vocativo  = stripLeadingHonorific(persistido)   // solo presentación

gasto:
  gate = metricCue && (domain || folioFrame || llantas/refacciones || extractKeyword)
  no whitelist de conceptos
```

## 9. Contratos

`authorized_*` intactos. Sin schema. Sin merge. Sin deploy. Sin siguiente tarea.
