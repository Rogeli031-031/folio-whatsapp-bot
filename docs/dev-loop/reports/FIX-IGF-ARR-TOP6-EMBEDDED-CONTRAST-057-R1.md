# FIX-IGF-ARR-TOP6-EMBEDDED-CONTRAST-057-R1

status: DONE_PENDING_REVIEW

base_sha: 4eae27960aab0f2c1fe83f75c78498de9591e912

branch: fix/igf-arr-top6-embedded-contrast-057-r1

## Contraste

El aside embebido pasó de `w-full` a `w-full rounded-lg border border-slate-200 bg-white p-3`. El modal normal sigue con `lg:w-[640px]` y el mismo fondo blanco.

El layout vertical, la gráfica a todo el ancho, las seis columnas, el nombre sin truncate y el doble clic no cambian.

## Tests

057-R1, 057, 056, 056-R1, 018 y 019 pasan. Sin backend, sin writes, sin DDL y sin OpenAI.
