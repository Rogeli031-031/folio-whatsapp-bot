# FIX-IGF-DIRECTOR-IA-MODAL-PHYSICAL-BOUNDS-001

```yaml
task_id: "FIX-IGF-DIRECTOR-IA-MODAL-PHYSICAL-BOUNDS-001"
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
reference_main: "c320d4b45a06fb391c3c59924fd54dc9d150eff7"
branch: "fix/igf-director-ia-modal-physical-bounds-001"
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
human_decision_needed: "Revisar. Este agente no mergea, no abre PR, no despliega y no abre la siguiente tarea."
```

## 1. Estado final

**DONE_PENDING_REVIEW.**

El modal `large` de IGF ya tiene dimensiones físicas medibles: `getBoundingClientRect()` da **900×560** en viewports de escritorio, y no cambia al inyectar 32 líneas.

Action Register default, selector de planta, conversation state y backend: sin cambios.

`DirectorIaChatPanel` no se reescribió. El layout de tres zonas se preservó.

## 2. SHA base

`origin/main` = `c320d4b45a06fb391c3c59924fd54dc9d150eff7`

## 3. Rama

`fix/igf-director-ia-modal-physical-bounds-001`

## 4. Causa raíz

Las clases en JSX **no existían en el CSS compilado**. Dos fallos, ambos evidentes al compilar Tailwind del proyecto:

1. `frontend-dashboard/tailwind.config.ts` no incluía `./modules/**`. `DirectorIaChatModal.tsx` vive en `modules/director-ia/`. Las arbitrary classes únicas de ese archivo nunca se emitían.
2. `w-[min(900px,calc(100vw-48px))]` y `h-[min(560px,calc(100vh-64px))]` usan coma. Tailwind JIT trata la coma como separador de clases; esas utilities no se generan aunque el archivo se escanee.

Compilación **antes** (config sin `modules/`, clases `min()` en JSX):

- no hay `100vw - 48px`
- no hay `100vh - 64px`
- no hay `max-width:900px`
- no hay `min(900px`

El diálogo quedaba como `flex flex-col` sin ancho/alto efectivo. El overlay `flex items-center` lo dejaba crecer con el contenido → ocupa casi todo el viewport; header y composer salen de pantalla.

Medida BEFORE (CSS real pre-fix, respuesta 32 líneas, ~1366×768):

| | px |
|---|---|
| viewport | 1348×672 |
| `dialog.width` | 494.9 (sin tope 900; encoge/crece con contenido) |
| `dialog.height` | **914** (> 560 y > viewport 672) |

Eso coincide con la captura de producción: el alto declarado no limita el diálogo.

## 5. Clases

Anteriores (large):

```
flex flex-col overflow-hidden min-h-0
w-[min(900px,calc(100vw-48px))]
h-[min(560px,calc(100vh-64px))]
max-w-full
```

Nuevas (large):

```
flex flex-col min-h-0 overflow-hidden
w-[calc(100vw-48px)]
max-w-[900px]
h-[calc(100vh-64px)]
max-h-[560px]
```

Sin `min()` en arbitrary values.

Default: `w-full max-w-lg max-h-[85vh]` — intacto.

Para que las nuevas classes existan en el bundle se añadió `./modules/**/*.{js,ts,jsx,tsx,mdx}` al `content` de Tailwind. Sin eso, el cambio en JSX seguiría siendo cosmética.

Compilación **después**:

```
.w-\[calc\(100vw-48px\)\]{width:calc(100vw - 48px)}
.max-w-\[900px\]{max-width:900px}
.h-\[calc\(100vh-64px\)\]{height:calc(100vh - 64px)}
.max-h-\[560px\]{max-height:560px}
```

## 6. Layout interno

Preservado:

- header `shrink-0`
- mensajes `flex-1 min-h-0 overflow-y-auto`
- composer `shrink-0`

No se tocó el panel.

## 7. Medidas DOM reales (`getBoundingClientRect`)

Chrome headless, CSS compilado del proyecto (no CDN), respuesta corta vs 32 líneas.

| Viewport pedido | Viewport real | short W×H | long W×H | mensajes scrollHeight/clientHeight |
|---|---|---|---|---|
| 1700×900 | 1682×804 | 900×560 | 900×560 | 768 / 414 |
| 1440×900 | 1422×804 | 900×560 | 900×560 | 768 / 414 |
| 1366×768 | 1348×672 | 900×560 | 900×560 | 768 / 414 |
| 1024×768 | 1006×672 | 900×560 | 900×560 | 768 / 414 |

Asserts:

- `widthBefore == widthAfter`
- `heightBefore == heightAfter`
- desktop width ≤ 900
- desktop height ≤ 560
- width ≤ innerWidth − 48
- height ≤ innerHeight − 64
- header, Cerrar, Cambiar planta, input, Enviar visibles
- `scrollHeight > clientHeight` solo en mensajes

## 8. Action Register

`acciones/page.tsx` sigue sin `size="large"` ni `plantMode="select"`. Default `max-w-lg` / `max-h-[85vh]` / `min-h-[320px]` sin cambios.

## 9. Archivos

- `frontend-dashboard/modules/director-ia/components/DirectorIaChatModal.tsx`
- `frontend-dashboard/tailwind.config.ts` (`./modules/**` en `content`; evidencia de no-emisión)
- `test/director-ia-igf-chat-modal-physical-bounds.test.js`
- `test/director-ia-igf-chat-modal-bounded-scroll.test.js` (asserts de clase actualizados)
- `docs/dev-loop/CURRENT_TASK.md`
- `docs/dev-loop/reports/FIX-IGF-DIRECTOR-IA-MODAL-PHYSICAL-BOUNDS-001.md`

No se tocó `DirectorIaChatPanel.tsx`, planner, conversation state ni backend.

## 10. Build / tests

```
node --test test/director-ia-igf-chat-modal-physical-bounds.test.js
→ 3 pass / 0 fail  (incluye getBoundingClientRect en 4 viewports)

node --test test/director-ia-igf-chat-modal-bounded-scroll.test.js
→ 6 pass / 0 fail

npx tsc --noEmit → 0
npx next build → Compiled successfully
```

## 11–14. Confirmaciones

- `schema_changes=false`
- `data_mutation=false`
- `merge=false`
- `deploy=false`

## 15. STOP

Fin de la tarea. Espera revisión humana.

NO PR. NO merge. NO deploy. NO siguiente tarea.
