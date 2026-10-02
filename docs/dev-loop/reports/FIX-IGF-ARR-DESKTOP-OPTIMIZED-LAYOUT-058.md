# FIX-IGF-ARR-DESKTOP-OPTIMIZED-LAYOUT-058

status: DONE_PENDING_REVIEW

base_sha: 137574f5cad04585a46b6b34b4fb13772f1e8415

branch: fix/igf-arr-desktop-optimized-layout-058

## Layout

El grid del modal IGF deja de usar `lg:grid-cols-[minmax(0,1.4fr)_minmax(420px,1fr)]` (izquierda ~58 %, derecha ~42 %).

- Por debajo de `xl` (1280 px): una columna. Orden: Rentabilidad + semanas + cierre, luego CASA, luego COMISIONISTA.
- Desde `xl` (incluye 1366): `44fr / 56fr`. Derecha 56 % (≥ 52 %).
- Desde `2xl` (1536 px): `46fr / 54fr`. Derecha 54 %.

Clase: `xl:grid-cols-[minmax(0,44fr)_minmax(0,56fr)] 2xl:grid-cols-[minmax(0,46fr)_minmax(0,54fr)]`.

El gap del grid pasó de `gap-3` a `gap-2`. El scroll sigue solo en ese grid (`overflow-auto`).

## Gráfica ARR embebida

Sigue `ArrVentaSerieView`. `W=980`, `H=460`, `viewBox`, `linearTrend`, ticks, labels, paths y tooltip no cambian.

En `embedded=true` el SVG usa `h-[240px] w-full` y `preserveAspectRatio="none"`. El viewBox se estira al ancho de la columna y a 240 px de alto, dentro del rango 220–260. No hay `overflow:hidden`. El modo normal sigue `h-auto w-full` y `xMidYMid meet`.

CASA y COMISIONISTA usan el mismo wrapper, así que ambas gráficas quedan en 240 px, a todo el ancho, y el Top 6 va debajo. Seis renglones salen de un solo `clientesTop.map`.

## Top 6

Grid de siete columnas desde `xl` (misma anchura que el layout de dos columnas):

`28px | minmax(140px,1.8fr) | minmax(72px,0.7fr) | minmax(78px,0.7fr) | minmax(56px,0.55fr) | minmax(56px,0.55fr) | minmax(150px,1.8fr)`

Cabecera: #, Cliente, Movimiento, Δ venta, Prev, Actual, Últimos comentarios.

El nombre es `whitespace-normal break-words`, sin `truncate`. Los comentarios siguen `slice(0, 2)` y el segundo queda debajo del primero (`space-y-0.5`). Si no hay segundo comentario, la lista no reserva ese renglón.

Densidad: `py-1`, `gap-y-0.5`, `border-b`, sin tarjeta y sin altura fija. Un comentario corto cabe cerca de 42–56 px; dos comentarios alargan la fila para no cortar texto.

## Qué no cambió

- Modal ARR normal: `lg:flex-row` y aside `lg:w-[640px]`.
- Doble clic en toda la fila; clic simple hace `stopPropagation`.
- Provincia, IGF financiero (`#facc15`, semanas, cierre `w-[180px]`), API, motor, writes, DDL y OpenAI.
- `ArrVentaCanalPanel.tsx` no se editó: ya no tenía scroll interno.

## Tests

058, 057, 057-R1, 056, 056-R1, 055, 018 y 019: 65 pass, 0 fail.

`git diff --check` limpio.

057 y 057-R1 se actualizaron solo en las aserciones que fijaban `h-auto` y el grid anterior de seis columnas.

## Desviaciones

- En 1366 se usa 44/56, no 46/54, para que la derecha no quede estrecha. 46/54 entra desde 1536.
- Los mínimos de Cliente y Comentarios bajaron de 180/190 px a 140/150 px. La suma sugerida (672 px) no cabe en la columna derecha a 1280 con 44/56. La suma aplicada es 580 px.
- No hubo verificación en navegador. El alto de 240 px es la clase CSS, no una medida de pantalla.
