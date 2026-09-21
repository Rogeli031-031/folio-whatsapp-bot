# OPS-VERIFY-REDEPLOY-CURRENT-MAIN-001

## Identidad

| Campo | Valor |
|---|---|
| task_id | OPS-VERIFY-REDEPLOY-CURRENT-MAIN-001 |
| expected SHA | dad5b3e43d212f230822de0898bce0318fa33b88 |
| origin/main | dad5b3e43d212f230822de0898bce0318fa33b88 |
| resultado | FAILED_WITH_EVIDENCE |
| schema_changes | false |
| data_mutation | false |
| code_changes | false |
| commit | false |
| PR | no |
| merge | false |
| patch | no |

## Preflight Git

`git fetch origin` → `origin/main == dad5b3e43d212f230822de0898bce0318fa33b88`.

Mensaje: `Merge pull request #46 from Rogeli031-031/fix/igf-forecast-client-crash-open-pronostico-001`.

`frontend-dashboard/next.config.js` en origin/main:

`exceljs: path.dirname(require.resolve("exceljs/package.json"))`

`frontend-dashboard/package.json` declara `"exceljs": "^4.4.0"`.

## Render source

Servicio: `folio-dashboard` (`srv-d6h78mh5pdvs73dck980`)

| Campo | Valor |
|---|---|
| repo | https://github.com/Rogeli031-031/folio-whatsapp-bot |
| branch | main |
| rootDir | frontend-dashboard |
| autoDeploy | commit |

No se disparó un redeploy manual adicional. Auto-deploy de `new_commit` ya había intentado `dad5b3e4`.

## Build local

Directorio: `frontend-dashboard`. Node local: `v24.14.0`. No se cambió Node.

`npm ci`: OK (486 packages). Avisos de audit **no** se trataron (`npm audit fix` no ejecutado).

`npm run build`:

- webpack: `Compiled successfully` (exceljs resuelto)
- lint: skipped
- types: **FAIL**

Primer error:

```
./components/IgfForecastClient.tsx:737:15
Type error: 'igfForecast' is possibly 'null'.
        year: igfForecast.year,
```

`prepare-standalone`: no se alcanzó.

## Deploy Render de dad5b3e4

| Campo | Valor |
|---|---|
| deploy id | dep-damkugmk1f9s7389f2k0 |
| trigger | new_commit |
| status | build_failed |
| startedAt | 2026-09-18T14:48:34Z |
| finishedAt | 2026-09-18T14:49:34Z |
| checkout | Checking out commit dad5b3e43d212f230822de0898bce0318fa33b88 in branch main |
| Node | 18.20.8 via frontend-dashboard/.nvmrc |
| Node warning | EOL — deuda separada; no es la causa del fallo |
| npm ci | added 487 packages — OK |
| next build webpack | Compiled successfully |
| next build types | Failed to compile |
| prepare-standalone | no se alcanzó |
| deploy live | no |

Primer error Render (fase typecheck, no webpack):

- archivo: `./components/IgfForecastClient.tsx:737:15`
- módulo: `IgfForecastClient`
- mensaje: `Type error: 'igfForecast' is possibly 'null'.`
- línea: `year: igfForecast.year`
- import trace: typecheck de `openPronosticoMiniRow` (no exceljs)

`canOpenPronosticoMiniRow(...)` no es type guard; TypeScript no estrecha `igfForecast`.

## exceljs

En `dad5b3e4` webpack compiló. El fallo de `Can't resolve 'exceljs'` de `5a3be93` **no** se reprodujo.

## Live actual (no es el SHA objetivo)

Sigue live: `168c4f7fe3bb225258af26d3948c6b1609495f58` (deploy manual `dep-damkjt0u01pc73akbd30`).

`dad5b3e4` no está live.

## Smoke test

No aplica sobre `dad5b3e4` (build failed).

`NOT_TESTED_NO_AUTH_RUNTIME` / `NOT_TESTED_DEPLOY_FAILED`.

No se inventó resultado de `/igf-forecast?t=` ni de «abre el pronóstico».

## Node 18 EOL

Advertencia Render documentada. Fuera de alcance. No se actualizó Node.

## Limitaciones

- No se creó un segundo deploy (el auto-deploy ya falló con evidencia).
- Esta tarea no parcheó el type error.
- El reporte no se commitea en esta tarea.

## Recomendación (no implementada)

Siguiente FIX propuesta (G5 humano):

`FIX-IGF-FORECAST-CLIENT-TS-NULL-001`

Estrechar `igfForecast`/`token` en `openPronosticoMiniRow` (type predicate o `if (!igfForecast \|\| !token) return;`) para que `next build` typecheck pase. Sin alias exceljs extra. Sin upgrade de Node.

## Cierre

CURRENT_TASK → DONE_PENDING_REVIEW.

NO PR. NO merge. NO siguiente tarea. NO código.
