# TUNE-IGF-FORECAST-TOMZA-EN-ACCION-SIZING-001

```yaml
task_id: "TUNE-IGF-FORECAST-TOMZA-EN-ACCION-SIZING-001"
outcome: "DONE"
mode: "IMPLEMENTATION"
implementation: true
code_changes: true
schema_changes: false
data_mutation: false
new_tables: false
new_indexes: false
merge: false
deploy: false
reference_main: "ea759bbbac0f675500a02c0669ebbd1f219c98b3"
branch: "tune/igf-forecast-tomza-en-accion-sizing-001"
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
human_decision_needed: "Revisar. Este agente no mergea, no abre PR, no despliega y no abre la siguiente tarea."
```

## 1. Estado final

**DONE_PENDING_REVIEW.**

Solo se ajustó el branding **Tomza en Acción** en la primera cabecera de IGF Forecast: más grande en desktop ancho, `clamp` responsive, y un desplazamiento leve hacia el centro geométrico. Layout `auto | 1fr | auto` intacto. Cero overlap en 1700 / 1440 / 1366 / 1024.

## 2. SHA base

`origin/main` = `ea759bbbac0f675500a02c0669ebbd1f219c98b3`

Pre-flight: working tree de la tarea aislado; `main` fast-forward a `origin/main`; SHA coincidente; rama `tune/igf-forecast-tomza-en-accion-sizing-001` creada desde ese SHA.

## 3. Rama

`tune/igf-forecast-tomza-en-accion-sizing-001`

## 4. Archivo(s) modificados

- `frontend-dashboard/components/IgfForecastClient.tsx` — únicamente el `<p>` del branding en la primera franja
- `docs/dev-loop/CURRENT_TASK.md`
- `docs/dev-loop/reports/TUNE-IGF-FORECAST-TOMZA-EN-ACCION-SIZING-001.md`

No se tocaron PLAN MAESTRO, EVIDENCIAS, KPI Financieros, segunda fila, handlers, rutas, lógica IGF ni backend.

## 5. Tamaño anterior

`text-[clamp(0.8rem,1.8vw,2rem)]`

| Viewport | font-size efectivo |
|---|---|
| 1700px | 30.6px |
| 1440px | 25.9px |
| 1366px | 24.6px |
| 1024px | 18.4px |

Tope anterior: 2rem = 32px.

## 6. Tamaño nuevo

`text-[clamp(1rem,2.6vw,3rem)]`

| Viewport | font-size efectivo | Δ vs anterior |
|---|---|---|
| 1700px | 44.2px | +44.4% |
| 1440px | 37.4px | +44.4% |
| 1366px | 35.5px | +44.4% |
| 1024px | 26.6px | +44.4% |

Tope nuevo: 3rem = 48px. En 1700 el valor efectivo (44.2px) queda dentro de 44–48px. Desktop medio/tablet reduce solo.

## 7. Estrategia de centrado

Se conservó `grid-cols-[auto_minmax(0,1fr)_auto]`.

El branding sigue centrado en el track `1fr` (espacio restante). Para acercarlo al centro geométrico del header sin reabrir overlap se añadió:

`-translate-x-[clamp(0rem,2.2vw,2.75rem)]`

Desplazamiento hacia la izquierda (hacia EVIDENCIAS) solo cuando hay viewport: 37.4px @1700, 31.7px @1440, 30.1px @1366, 22.5px @1024. No se intentó el centro geométrico exacto: en 1024 el desbalance izquierdo/derecho (~145px) es mayor que el hueco seguro.

Prioridad aplicada: (1) cero overlap (2) tamaño grande seguro (3) corrección visual pequeña.

## 8. Validación por ancho

Medición `getBoundingClientRect` de tracks equivalentes al header autenticado (botones visibles). `vw` simulado a cada ancho porque el panel del browser local no es 1700px.

| Ancho | gap EVIDENCIAS → branding | gap branding → KPI | font-size | nowrap | overlap |
|---|---|---|---|---|---|
| 1700px | 375.9px | 450.7px | 44.2px | sí | no |
| 1440px | 277.1px | 340.4px | 37.4px | sí | no |
| 1366px | 248.9px | 309.1px | 35.5px | sí | no |
| 1024px | 119.0px | 164.0px | 26.6px | sí | no |

Controles laterales visibles en los cuatro anchos. En 1700/1440 el branding es visiblemente mayor que `clamp(0.8rem,1.8vw,2rem)`.

Altura de la franja: 59–69px (antes ~60px con tope 32px). Sin rediseño de header.

## 9. Build/test

```
npx tsc --noEmit   → 0
npx next build     → Compiled successfully
```

Ejecutados en `frontend-dashboard`.

## 10. Diff conceptual

Antes: branding `clamp(0.8rem,1.8vw,2rem)`, centrado solo dentro del `1fr`, percibido pequeño en desktop ancho.

Ahora: mismo grid; `clamp(1rem,2.6vw,3rem)` (~+44% donde manda `vw`); `translateX` negativo acotado hacia el centro geométrico; laterales y handlers sin cambio.

## 11. Limitaciones

- `/igf-forecast` sin token no muestra PLAN MAESTRO / EVIDENCIAS. La medición de gaps usó un header equivalente con esos controles.
- Tras el nudge el branding sigue un poco a la derecha del centro geométrico. Es deliberado para no acercarse a EVIDENCIAS en 1024.

## 12–15. Confirmaciones

- `schema_changes=false`
- `data_mutation=false`
- `merge=false`
- `deploy=false`

## 16. STOP

Fin de la tarea. Espera revisión humana.

NO PR. NO merge. NO deploy. NO siguiente tarea.
