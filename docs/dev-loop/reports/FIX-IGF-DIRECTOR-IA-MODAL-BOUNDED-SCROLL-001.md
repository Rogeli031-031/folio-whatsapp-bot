# FIX-IGF-DIRECTOR-IA-MODAL-BOUNDED-SCROLL-001

```yaml
task_id: "FIX-IGF-DIRECTOR-IA-MODAL-BOUNDED-SCROLL-001"
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
reference_main: "57ad6bc01aaa8fd8586c5cf64a096b63b845de88"
branch: "fix/igf-director-ia-modal-bounded-scroll-001"
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
human_decision_needed: "Revisar. Este agente no mergea, no abre PR, no despliega y no abre la siguiente tarea."
```

## 1. Estado final

**DONE_PENDING_REVIEW.**

El modal `large` de Chat Director IA en IGF queda acotado a tres zonas. Una respuesta larga ya no crece el alto del diálogo, no tapa el composer y no saca de vista el encabezado ni Cerrar.

Action Register (`size="default"`) no cambia.

## 2. SHA base

`origin/main` = `57ad6bc01aaa8fd8586c5cf64a096b63b845de88`

## 3. Rama

`fix/igf-director-ia-modal-bounded-scroll-001`

## 4. Causa raíz

El diálogo large tenía alto CSS (`h-[min(620px,calc(100vh-48px))]`) pero:

1. El diálogo es flex-item del overlay y no tenía `overflow-hidden` / `min-h-0`. Su `min-height: auto` puede crecer con el contenido.
2. `DirectorIaChatPanel` en `chatMode` no acotaba el shell (`h-full overflow-hidden`) cuando `fillAvailable`.
3. El historial no era un scrollport permanente: el empty-state y la lista de mensajes se montaban por separado; la lista no era el único hijo `flex-1 min-h-0 overflow-y-auto`.
4. El área de mensajes usaba `overflow-y: visible` en el camino que no garantizaba scroll. Una respuesta de 20+ líneas pintaba fuera de su caja y **encima del input**.
5. El error era hermano posterior al composer: podía empujar Enviar fuera del body (`overflow-hidden` recortaba el pie).

Reproducción (fixture BEFORE, viewport 730×350, 28 líneas):

| Métrica | Valor |
|---|---|
| `messages.scrollHeight` | 1352 |
| `messages.clientHeight` | 163 |
| `messages.overflowY` | `visible` |
| `panelScrollHeight` | 1352 |
| `bodyClientHeight` | 233 |

El texto largo cubría visualmente el campo de escritura. Header/Cerrar seguían en el recuadro, pero el usuario no podía leer el final ni escribir con el composer libre.

## 5. Layout anterior (solo large)

```
overlay: flex center, p-6
dialog:  flex-col, height min(620px, 100vh-48px), overflow visible
  header: shrink-0
  body:   flex-1 min-h-0 overflow-hidden
    panel: flex-col min-h-0 flex-1     ← sin h-full / overflow-hidden
      empty XOR messages (flex-1; overflow-y-auto solo si hay mensajes)
      composer shrink-0
      error (hermano suelto)
```

Default: `max-w-lg` / `max-h-[85vh]` / panel `min-h-[320px]` / mensajes `min-h-[200px] max-h-[50vh]`.

## 6. Layout nuevo (solo large / fillAvailable)

```
overlay: igual
dialog:  flex-col overflow-hidden min-h-0
         width  min(900px, 100vw-48px)
         height min(560px, 100vh-64px)
  header: shrink-0          ← Cerrar y Cambiar planta siempre visibles
  body:   flex-1 min-h-0 overflow-hidden
    panel: h-full flex-col min-h-0 overflow-hidden
      messages: flex-1 min-h-0 overflow-y-auto   ← único scroll vertical
      composer: shrink-0 (error acotado max-h-16 + input + Enviar)
```

El contenido de una respuesta no aumenta el alto del modal. El scroll automático al final del historial se conserva (`scrollRef` + `messages`/`loading`).

Default: sin `overflow-hidden` extra, sin `h-full` en el shell, error sigue debajo del composer, `min-h-[320px]` / `min-h-[200px] max-h-[50vh]` intactos.

## 7. Dimensiones large

| | Antes | Ahora |
|---|---|---|
| width | `min(900px, 100vw-48px)` | igual |
| height | `min(620px, 100vh-48px)` | `min(560px, 100vh-64px)` |
| overflow diálogo | visible | hidden |
| default | `max-w-lg` / `max-h-[85vh]` | igual |

## 8. Scroll

- Solo la lista de mensajes hace scroll vertical.
- El modal no hace scroll de sí mismo.
- Sin scroll horizontal (`scrollWidth <= clientWidth`).
- Respuesta nueva: el área de mensajes hace `scrollTo` al final.

## 9. Validación

Fixture AFTER (mismas clases que el código) + CDP:

| Caso | Resultado |
|---|---|
| Respuesta corta | 900×560; header/Cerrar/Cambiar planta/input/Enviar visibles; mensajes sin scroll |
| Respuesta 28 líneas | mensajes `scrollHeight` 843–1360 > `clientHeight`; composer libre; diálogo no crece |
| 6 Q/A acumuladas | mensajes 3839px; diálogo sigue 900×560; chrome visible |
| 1700×900 | 900×560; ok |
| 1440×900 | 900×560; ok |
| 1366×768 | 900×560; ok |
| 1024×768 | 900×560 (`min(900, 976)`); ok; sin overflow horizontal |
| Viewport bajo 730×350 | height `min(560, 286)` = 286; chrome visible |

Asserts en todos: header, Cerrar, Cambiar planta, input, Enviar visibles; 0 crecimiento por contenido; 0 overflow horizontal; solo mensajes scroll.

## 10. Action Register

`frontend-dashboard/app/acciones/page.tsx` sigue montando `<DirectorIaChatModal>` sin `size` ni `plantMode`. Default: `max-w-lg`, `max-h-[85vh]`, panel `min-h-[320px]`, mensajes `max-h-[50vh]`. IGF sigue `size="large"` + `plantMode="select"`.

## 11. Archivos

- `frontend-dashboard/modules/director-ia/components/DirectorIaChatModal.tsx`
- `frontend-dashboard/modules/director-ia/components/DirectorIaChatPanel.tsx`
- `test/director-ia-igf-chat-modal-bounded-scroll.test.js`
- `docs/dev-loop/CURRENT_TASK.md`
- `docs/dev-loop/reports/FIX-IGF-DIRECTOR-IA-MODAL-BOUNDED-SCROLL-001.md`

No se tocó `acciones/page.tsx`, planner, ni contratos `docs/director-ia/`.

## 12. Build / tests

```
node --test test/director-ia-igf-chat-modal-bounded-scroll.test.js
→ 6 pass / 0 fail

npx tsc --noEmit → 0
npx next build → Compiled successfully
```

`test/director-ia-igf-to-actions-cutoff-transport.test.js`: los 3 asserts de transporte que leen Modal/Panel pasan. Fallan 2 casos de backend/planner ya presentes en `origin/main` (cutoff explícito; Q2 CEL). Fuera de alcance.

## 13–16. Confirmaciones

- `schema_changes=false`
- `data_mutation=false`
- `merge=false`
- `deploy=false`

## 17. STOP

Fin de la tarea. Espera revisión humana.

NO PR. NO merge. NO deploy. NO siguiente tarea.
