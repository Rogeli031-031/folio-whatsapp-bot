# FIX-IGF-ARR-VISUAL-PARITY-COMMENTS-056-R1

status: DONE_PENDING_REVIEW

base_sha: 3755443cdb962214277a3ce07729d4b9abf3a49d

branch: fix/igf-arr-visual-parity-comments-056-r1

## Visual

`ArrVentaSerieView` vive en `ArrVentaGraficaModal.tsx`. El modal ARR hace el fetch y el shell, y renderiza esa vista. `ArrVentaCanalPanel` hace su propio fetch y renderiza la misma vista en embedded.

El panel ya no tiene `linearTrend`, `W = 320` ni `polyline`. La vista conserva el viewBox 980×460, ticks, área, línea, tendencia verde `#16a34a`, hover, tooltip y Top 6 con comentarios.

CASA sigue `#ca8a04`. COMISIONISTA sigue `#38bdf8`. Embedded no muestra overlay, Cerrar, selector de canal ni botones de rango.

## Comentarios Provincia

`resolveComentarioPlantaIds` toma `engineResult.plant_codes` y hace una sola consulta a `public.plantas`. Aplica el alias existente y `getPlantaIdsEquivalentes`. No resuelve el literal Provincia.

En el fixture, Puebla y Acapulco entran. OTRA (99) no. CLIENTE UNO recibe A y B, no C. El máximo sigue en dos, por `rn <= 2`.

El gate `igfDiarioTodasRequestBlock` sigue antes de `pool.connect()`.

## Intactos

056, 055, 054, 054-R1, 054-R2, 054-R3, 053BC, 053A, 050, 052, 018 y 019 pasan. El cierre 055 no se recalcula. Clientes Nuevos sigue fuera del render y el backend sigue. Sin writes nuevos, sin DDL nuevo, sin ExcelJS nuevo y sin OpenAI.

Cinco pruebas del planner `commercial_trend` fallan igual que en la base 056. No se corrigieron aquí.

## Desviación

La vista compartida quedó exportada desde `ArrVentaGraficaModal.tsx` para no mover las cadenas que exigen 018 y 019. En la columna IGF el SVG escala con el ancho; la matemática es la de 980×460, no una segunda gráfica.
