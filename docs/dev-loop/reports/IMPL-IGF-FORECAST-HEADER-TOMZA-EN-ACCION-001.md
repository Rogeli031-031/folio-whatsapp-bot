# IMPL-IGF-FORECAST-HEADER-TOMZA-EN-ACCION-001

```yaml
task_id: "IMPL-IGF-FORECAST-HEADER-TOMZA-EN-ACCION-001"
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
reference_main: "8863f60a897e9025d4227d24ed84f3c1e4aad718"
branch: "implementation/igf-forecast-header-tomza-en-accion-001"
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
human_decision_needed: "Revisar. Este agente no mergea, no abre PR, no despliega y no abre la siguiente tarea."
```

## 1. Estado final

**DONE_PENDING_REVIEW.**

Primera franja de IGF Forecast: EVIDENCIAS junto a PLAN MAESTRO; branding **Tomza en Acción** centrado respecto de todo el header; KPI Financieros a la derecha.

## 2. SHA base

`origin/main` = `8863f60a897e9025d4227d24ed84f3c1e4aad718`

## 3. Rama

`implementation/igf-forecast-header-tomza-en-accion-001`

## 4. Archivo(s) modificados

- `frontend-dashboard/components/IgfForecastClient.tsx` — solo la primera franja (~790–827)
- `docs/dev-loop/CURRENT_TASK.md`
- `docs/dev-loop/reports/IMPL-IGF-FORECAST-HEADER-TOMZA-EN-ACCION-001.md`

No se tocaron backend, APIs, rutas, cálculos IGF, segunda fila ni handlers de Plan Maestro / Evidencias / KPI.

## 5. Layout anterior

Flex + `flex-wrap`:

- IZQUIERDA: `IGF Forecast` + `PLAN MAESTRO`
- CENTRO (`flex-1 justify-center`): `EVIDENCIAS`
- DERECHA: `← KPI Financieros`

El centro era el espacio sobrante, no el centro geométrico del header.

## 6. Layout nuevo

Grid de tres columnas `minmax(0,1fr) / auto / minmax(0,1fr)`:

- IZQUIERDA: `IGF Forecast` + `PLAN MAESTRO` + `EVIDENCIAS`
- CENTRO (columna `auto`): `Tomza` blanco + `en Acción` `text-amber-300 italic` (mismo tono que KPI Financieros)
- DERECHA: `← KPI Financieros`

Una sola línea en desktop. Segunda fila intacta.

## 7. Estrategia de centrado

Las dos columnas `1fr` laterales son simétricas. El branding vive en la columna central `auto`. Eso coloca el título en el **centro real del header**, no en el hueco entre bloques de distinto ancho.

Los bloques laterales llevan `z-10` para que, si el viewport se estrecha, los controles no queden debajo del título.

## 8. Estrategia responsive

- `font-size: clamp(0.8rem, 2.1vw, 2.15rem)`
- `white-space: nowrap` — no se parte “Tomza en Acción”
- El título reduce tamaño antes que los botones
- El cluster izquierdo admite `flex-wrap` solo si el espacio no alcanza, para no superponer controles
- Sin fuentes externas (`font-serif` del tema Tailwind)
- Sin ocultar funcionalidad
- Sin rediseñar botones

EVIDENCIAS conserva `openEvidenciasModal` y las clases rose originales.

## 9. Validación desktop / responsive

- Código: EVIDENCIAS inmediatamente después de PLAN MAESTRO; KPI a la derecha; branding en columna central.
- `npx tsc --noEmit` en `frontend-dashboard`: **pass**
- `npx next build`: **pass** (`/igf-forecast` compiló)
- `npm run lint`: no ejecutable de forma no interactiva (Next pidió configurar ESLint; no hay `.eslintrc` en el frontend). Limitación previa, no introducida por este cambio.
- Navegación local a `/igf-forecast` sin token: **Acceso no autorizado** (esperado). No se usó token de producción.
- Preview HTML aislado en viewport estrecho del browser embebido no cargó Tailwind CDN; no se tomó como evidencia del build real.

Validación visual completa en dashboard autenticado queda para revisión humana.

## 10. Build/test

```
npx tsc --noEmit   → 0
npx next build     → Compiled successfully
npm run lint       → prompt interactivo ESLint (preexistente)
```

## 11. Limitaciones

- Sin token no se puede ver PLAN MAESTRO / EVIDENCIAS en runtime.
- En viewports muy estrechos el cluster izquierdo puede pasar a dos líneas internas antes que ocultar botones.
- No se añadió fuente corporativa nueva.

## 12. Diff conceptual

Antes: Evidencias ocupaba el centro flex.
Ahora: Evidencias en el bloque izquierdo; branding institucional centrado de verdad; KPI sin cambio.

## 13–16. Confirmaciones

- `schema_changes=false`
- `data_mutation=false`
- `merge=false`
- `deploy=false`

## 17. STOP

Fin de implementación. Espera revisión humana.

NO PR. NO merge. NO deploy. NO siguiente tarea.
