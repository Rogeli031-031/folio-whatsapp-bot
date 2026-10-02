# FIX-IGF-ARR-EMBEDDED-ASPECT-LABELS-058-R1

status: DONE_PENDING_REVIEW

base_sha: e6f6246330f1364006fb0a7e8d91653df5018280

branch: fix/igf-arr-embedded-aspect-labels-058-r1

## Geometría

El chart de `ArrVentaSerieView` usa:

- W = 980 en normal y embedded.
- H = 460 cuando `embedded` es false.
- H = 330 cuando `embedded` es true.
- `embedded` está en las dependencias del `useMemo`: `[series, range, isCliente, embedded]`.

`innerH`, `yOf`, `yOfDesc`, ticks, tendencia y paths usan ese H. El SVG queda con `preserveAspectRatio="xMidYMid meet"` y `className="h-auto w-full"`. Ya no hay `preserveAspectRatio="none"` ni `h-[240px]`.

Con columna de unos 700 px el alto visual es 700 × 330 / 980 ≈ 236 px. Con 760 px, ≈ 256 px.

## Labels

Los prefijos de fila pasaron de `md:hidden` a `xl:hidden` en Prev y Actual. Por debajo de `xl` se leen «Prev» y «Actual». Desde `xl` el header tabular los cubre y la fila muestra solo el número.

## Layout 058

`IgfDiarioGraficaModal.tsx` no se editó. Siguen 44/56 desde `xl` y 46/54 desde `2xl`. El Top 6 conserva las siete columnas, el nombre completo, los comentarios y el doble clic.

## Tests

058-R1, 058, 057, 057-R1, 056, 056-R1, 018 y 019: 61 pass, 0 fail.

`git diff --check` limpio.

## Desviación

`test/igf-arr-visual-parity-comments-056-r1.test.js` no estaba en `in_scope`, pero fijaba `const H = 460`. Esa línea ya no existe: ahora es `const H = embedded ? 330 : 460`. Se actualizó solo esa aserción para que 056-R1 siga comprobando el alto del viewBox. El modo normal conserva 460.
