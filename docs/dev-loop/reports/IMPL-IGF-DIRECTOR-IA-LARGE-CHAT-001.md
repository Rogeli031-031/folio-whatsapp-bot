# IMPL-IGF-DIRECTOR-IA-LARGE-CHAT-001

```yaml
task_id: "IMPL-IGF-DIRECTOR-IA-LARGE-CHAT-001"
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
reference_main: "1a72336d88172f86293a2a9f57318b079f875c44"
branch: "implementation/igf-director-ia-large-chat-001"
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
human_decision_needed: "Revisar. Este agente no mergea, no abre PR, no despliega y no abre la siguiente tarea."
```

## 1. Estado final

**DONE_PENDING_REVIEW.**

IGF Forecast tiene un botón **Chat Director IA** en la primera cabecera. Abre el mismo `DirectorIaChatModal` / `DirectorIaChatPanel` en modo `large` + `select`. Action Register sigue en default/fixed, sin cambios de llamada.

## 2. SHA base

`origin/main` = `1a72336d88172f86293a2a9f57318b079f875c44`

Pre-flight: `main` = `origin/main` tras fetch/pull.

## 3. Rama

`implementation/igf-director-ia-large-chat-001`

## 4. Archivos modificados

- `frontend-dashboard/modules/director-ia/components/DirectorIaChatModal.tsx` — props opcionales `size` y `plantMode`; picker de planta; reset al cerrar/cambiar
- `frontend-dashboard/modules/director-ia/components/DirectorIaChatPanel.tsx` — prop opcional `fillAvailable` (default `false`)
- `frontend-dashboard/components/IgfForecastClient.tsx` — botón + modal large/select; recalibración de branding
- `docs/dev-loop/CURRENT_TASK.md`
- `docs/dev-loop/reports/IMPL-IGF-DIRECTOR-IA-LARGE-CHAT-001.md`

No se tocó `frontend-dashboard/app/acciones/page.tsx`, backend, planner, ARR, IGF calculations ni schema.

## 5. Reutilización del chat existente

No hay segundo motor. IGF monta el mismo `DirectorIaChatPanel` que Action Register, con `key` nuevo por planta/`chatEpoch`.

`DirectorIaChatModal` defaults:

| Prop | Default | Action Register | IGF |
|---|---|---|---|
| `size` | `"default"` | implícito | `"large"` |
| `plantMode` | `"fixed"` | implícito | `"select"` |
| `plantaId` / `plantaNombre` | los que manda el padre | planta del board | ignorados; UI elige |

## 6. Action Register antes / después

Antes: modal `max-w-lg` / `max-h-[85vh]`, panel `min-h-[320px]`, planta fija del board, `Planta: <nombre>`, sin pregunta extra.

Después: misma llamada, mismos defaults, mismo flujo. Sin cambios en botón, handlers ni conversación.

## 7. Comportamiento IGF

Orden de cabecera: IGF Forecast · PLAN MAESTRO · EVIDENCIAS · **Chat Director IA** · (centro) Tomza en Acción · (derecha) ← KPI Financieros.

Al abrir:

1. Pregunta UI: **¿De qué planta quieres consultar?**
2. Lista solo plantas de `fetchPlantas` filtradas (sin códigos E7/E8/E9/…, sin `E\d+`, sin México).
3. No se monta el panel ni se envía pregunta al backend.
4. Al elegir (p. ej. Acapulco) se monta `DirectorIaChatPanel` con esa planta.
5. Header muestra `Planta: <nombre>`.
6. Si hay una sola planta autorizada, se selecciona sola y el nombre queda visible.

## 8. Selección y reset de planta

- Fuente: `fetchPlantas` + el mismo filtro que Director IA / Action Register.
- Fail closed: id no presente en la lista autorizada → no se monta el panel.
- **Cambiar planta** (si hay más de una): desmonta el panel, vuelve al picker, incrementa `chatEpoch`.
- Cerrar el modal resetea planta seleccionada, lista y epoch. Reabrir no hereda la planta anterior (salvo auto-select de planta única).

## 9. Dimensiones default / large

| Modo | Ancho | Alto | Panel |
|---|---|---|---|
| default | `w-full max-w-lg` (32rem / 512px) | `max-h-[85vh]` | `flex-1 min-h-[320px]`, mensajes `max-h-[50vh]` |
| large | `w-[min(1024px,calc(100vw-32px))]` | `h-[min(780px,calc(100vh-32px))]` | `flex-1 min-h-0` + `fillAvailable` |

Desktop ~2× el ancho default. Alto acotado al viewport (`p-4` del overlay). Tablet/móvil: `calc(100vw-32px)` y `calc(100vh-32px)`. Scroll de mensajes interno; input abajo (`shrink-0`).

## 10. Validación de header

Grid `auto | 1fr | auto` conservado. Branding recalibrado por el botón extra:

`clamp(0.85rem, 2.45vw, 2.85rem)` y `-translate-x-[clamp(0rem,1vw,1.5rem)]`

Medición `getBoundingClientRect` de tracks equivalentes (botones visibles):

| Ancho | gap Chat Director IA → branding | gap branding → KPI | font-size | nowrap | overlap | botón visible |
|---|---|---|---|---|---|---|
| 1700px | 331.8px | 365.8px | 41.6px | sí | no | sí |
| 1440px | 228.4px | 257.2px | 35.3px | sí | no | sí |
| 1366px | 199.0px | 226.3px | 33.5px | sí | no | sí |
| 1024px | 63.0px | 83.5px | 25.1px | sí | no | sí |

## 11. Build/test

```
npx tsc --noEmit   → 0
npx next build     → Compiled successfully
```

`/igf-forecast` 22.3 kB → 23.5 kB (bundle). Action Register sin cambio de archivo.

Pruebas autenticadas de click real (token + plantas live) quedan para revisión humana. Flujo de planta y reset se implementaron en el modal; no se envió “¿De qué planta?” al backend.

## 12. Limitaciones

- Sin token IGF no muestra PLAN MAESTRO / EVIDENCIAS / Chat Director IA (igual que el resto de la cabecera).
- La medición de gaps usó un header equivalente; `/igf-forecast` local sin token no renderiza esos botones.
- No se añadieron tests automatizados de Playwright.

## 13–16. Confirmaciones

- `schema_changes=false`
- `data_mutation=false`
- `merge=false`
- `deploy=false`

## 17. STOP

Fin de la tarea. Espera revisión humana.

NO PR. NO merge. NO deploy. NO siguiente tarea.
