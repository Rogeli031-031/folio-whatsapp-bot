# SPRINT1-DIRECTOR-IA-IGF-TO-ACTIONS-CUTOFF-TRANSPORT-001

task_id: SPRINT1-DIRECTOR-IA-IGF-TO-ACTIONS-CUTOFF-TRANSPORT-001
outcome: DONE_PENDING_REVIEW
DASHBOARD_BEHAVIOR_CHANGED: NO

Desvío de loop: ejecución sobre rama `main`. No git add/commit/push/merge/deploy.

## A. Causa raíz

El enlace Acciones en IGF Forecast era:

`/acciones?t=…&back=1`

No incluía el `upload_day` que el usuario ya tenía seleccionado. `/acciones` solo entrega corte al chat si el query param existe. Al perderlo, Director IA caía a last-upload plant-aware o UNAVAILABLE, no a la corrida visible en Forecast.

## B. Navegación anterior

```
<Link href={token ? `/acciones?t=${token}&back=1` : "/acciones"} />
```

ARR / ARR Plan ya preservaban `upload_day`. Acciones no.

El enlace desde IGF hacia acciones (`IgfForecastClient` ~864) era el único salto relevante.

## C. Navegación corregida

```
buildIgfForecastAccionesHref({ token, upload_day })
→ /acciones?t=…&back=1&upload_day=YYYY-MM-DD
```

`upload_day` solo si es YMD válido. Sin token: `/acciones`. Sin corte: `t` + `back=1` sin inventar fecha.

## D. Parámetros preservados

- `t`
- `back=1`
- `upload_day` añadido, no sustituye a los anteriores

No se reinterpreta planta ni token.

## E. Traza upload_day end-to-end

```
IGF Forecast uploadDay state (selector vigente)
  → buildIgfForecastAccionesHref
  → /acciones?...&upload_day=D
  → acciones/page.tsx searchParams.get("upload_day")
  → DirectorIaChatModal.uploadDay
  → DirectorIaChatPanel (prop + URL)
  → buildDirectorIaChatBody.upload_day = D
  → POST /api/director-ia/chat
  → resolveDirectorIaEffectiveCutoff → req.body.upload_day
  → cutoff_origin = REQUEST_UPLOAD_DAY
  → loadIgfForecastMiniPayload({ upload_day: D })
```

Precedencia backend intacta: explícito → request → plant-aware last-upload → UNAVAILABLE.

## F. Archivos modificados

- `frontend-dashboard/lib/igf-to-acciones-href.js` (+ `.d.ts`) — helper de transporte
- `frontend-dashboard/components/IgfForecastClient.tsx` — solo el `href` de Acciones
- `test/director-ia-igf-to-actions-cutoff-transport.test.js`
- `docs/dev-loop/CURRENT_TASK.md` (solo `status`)
- `docs/dev-loop/reports/SPRINT1-DIRECTOR-IA-IGF-TO-ACTIONS-CUTOFF-TRANSPORT-001.md`

No tocados: fórmulas, PROM, selector de fecha, persistencia, Excel, fallback backend, `GET /api/arr/last-upload-day`.

## G. Tests focales

`test/director-ia-igf-to-actions-cutoff-transport.test.js`: **12/12 PASS**

Incluye regression: IGF `D=2026-08-27` → href → body → `REQUEST_UPLOAD_DAY` y mini con `upload_day=D`. Last-upload no se llama. Corte explícito en pregunta gana sobre D.

## H. Golden Set

`test/director-ia-sprint1-core-conversational-recovery.test.js` incluido en la suite: **PASS** (Q1–Q4 routing y pack).

## I. Suite completa

`node --test test/director-ia-*.test.js` (+ recovery): **1249/1249 PASS**, fail 0.

## J. Ausencia sin cutoff

Sin `upload_day` vigente el href no añade el param. No se inventa 27/08 ni 31/08. `/acciones` directo sigue fail-closed.

## K. DASHBOARD_BEHAVIOR_CHANGED

**NO**

Solo cambió el `href` del botón Acciones. El selector de corte, mini, Guardar PROM, tablas y Excel no se modificaron.

## L. Riesgos / residuales

1. Validación manual de producción (flujo IGF → Acciones → «¿Cómo vamos?» → «¿Qué fecha de corte usaste?») queda pendiente de deploy. Esta tarea no despliega.
2. Abrir `/acciones` sin venir de IGF y sin query `upload_day` sigue siendo UNAVAILABLE o plant-aware last-upload. Fuera de alcance.
3. Rama `main`. Un DONE no autoriza la siguiente tarea.
