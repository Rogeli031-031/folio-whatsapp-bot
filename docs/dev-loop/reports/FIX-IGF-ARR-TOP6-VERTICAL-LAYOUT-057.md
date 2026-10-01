# FIX-IGF-ARR-TOP6-VERTICAL-LAYOUT-057

status: DONE_PENDING_REVIEW

base_sha: 0528b93123aa61c199a75fb4b9048701ac9652f0

branch: fix/igf-arr-top6-vertical-layout-057

## Layout

En `embedded`, `ArrVentaSerieView` queda en columna: la gráfica a `w-full` y el Top 6 debajo, también a `w-full`. Se quitaron `max-h-[320px]` y `lg:w-[240px]`.

Cada cliente es un solo `<li>`. En `md` la fila usa seis columnas: cliente, movimiento, delta, prev, actual y comentarios. El nombre usa `whitespace-normal` y `break-words`. El modal normal sigue con `lg:flex-row` y aside `lg:w-[640px]`, y ahí el nombre puede truncarse.

La matemática de la gráfica no cambió: `W=980`, `H=460`, ticks, paths, tendencia y tooltip.

## Intactos

056, 056-R1, 055, 054-R3, 018 y 019 pasan. Sin backend, sin writes, sin DDL y sin OpenAI.

## Desviación

Los mínimos de columna usan `minmax(0, …)` y anchos de 64–100 px para que la fila quepa en la columna derecha del IGF sin scroll horizontal. En móvil el renglón se apila en un solo bloque.
