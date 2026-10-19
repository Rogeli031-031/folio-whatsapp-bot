# IMPL-IGF-DIARIO-WEEKLY-ANALYTICAL-PDF-085

```yaml
task_id: "IMPL-IGF-DIARIO-WEEKLY-ANALYTICAL-PDF-085"
outcome: "DONE_PENDING_REVIEW"
base_sha: "c409e3078c636302397557096b118df04a514393"
product_sha: "73bfa2f3cabd856944b37afbcea4e49b4a8fd26c"
branch: "implementation/igf-diario-weekly-analytical-pdf-085"
files_touched:
  - "frontend-dashboard/components/IgfDiarioWeeklyExecutiveModal.tsx"
  - "frontend-dashboard/lib/igf-diario-weekly-executive-pdf.js"
  - "frontend-dashboard/lib/igf-diario-weekly-analytical-report.js"
  - "frontend-dashboard/lib/igf-diario-weekly-analytical-report.d.ts"
  - "frontend-dashboard/lib/igf-diario-weekly-analytical-pdf.js"
  - "frontend-dashboard/lib/igf-diario-weekly-analytical-pdf.d.ts"
  - "frontend-dashboard/public/fonts/DejaVuSans.ttf"
  - "frontend-dashboard/public/fonts/DejaVuSans-Bold.ttf"
  - "frontend-dashboard/public/fonts/DejaVuSans-LICENSE.txt"
  - "test/impl-igf-diario-weekly-analytical-pdf-085.test.js"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/authorizations/G1-085.json"
  - "docs/dev-loop/reports/IMPL-IGF-DIARIO-WEEKLY-EXECUTIVE-PDF-084.md"
  - "docs/dev-loop/reports/evidence-085/"
files_not_touched:
  - "frontend-dashboard/lib/igf-diario-weekly-executive-chart.js"
  - "lib/igf-diario-weekly-plant.js"
  - "package.json"
  - "package-lock.json"
contracts_consulted:
  - "AGENTS.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/TASK_TEMPLATE.md"
  - "ESPECIFICACION_PDF_SEMANAL_POR_PLANTA.md del paquete G1"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: ""
secrets_check: "none"
human_decision_needed:
  - "Revisión humana del informe y del anexo. No es validación productiva."
```

Producto: `73bfa2f3cabd856944b37afbcea4e49b4a8fd26c`
Base: `c409e3078c636302397557096b118df04a514393`
Rama: `implementation/igf-diario-weekly-analytical-pdf-085`

Un clic en Descargar PDF de una planta produce un solo archivo: páginas A4 del informe analítico y, al final, la página vectorial 084. TODAS sigue llamando a `svgToExecutivePdf` y no agrega páginas analíticas.

## Corrección del maestro

El maestro de 22 páginas usa RESULTADO final después de inversiones. Lo dicen su portada («Cómo leer este reporte») y su página de método. «Utilidad antes de inversiones» no es la medida de ese maestro: el maestro cita otro PDF que sí la usa. El informe nuevo explica el RESULTADO oficial del Dashboard. No importa celdas del Excel ni cifras del maestro.

## Descarga

La copia de planta, semanas, corte y selección se arma antes del primer `await`. El sello `exportedAt` de `America/Mexico_City` es el mismo en el informe y en el anexo. No hay una consulta financiera nueva durante la exportación. Un segundo clic no abre otro archivo. Si DejaVu no carga, el botón muestra «No se pudo cargar la fuente del PDF», vuelve a «Descargar PDF» y no entrega el anexo solo.

## Doce partidas

Orden y signo: precio +1; costo, flete, gasto corporativo, inversiones, impuestos federales, nómina/gastos, IMSS/SUA, extraordinarios, provisiones y HG/XK −1; comisiones y descuentos +1 con el signo del Dashboard. HG/XK es dinero por kilo. No entran margen, sobrantes, gastos en pesos ni Descuento Compra.

El puente completo exige, dentro de cada semana, las doce tasas finitas, Q>0, V presente, Q=V, cobertura de C&D igual a Q, R=Q×r y la suma firmada igual a r, con tolerancia de un centavo. Q puede diferir entre semanas. Si la base no cierra, el texto es «Análisis parcial / No conciliable con el detalle disponible», sin cascada ni efectos presentados como conciliados. El residual no se esconde en Otras partidas.

`LAST_REAL_FALLBACK` se imprime así. La procedencia del resto es «No informada». `week.estado` clasifica el tiempo y no la cobertura.

## Páginas

A4 595.28 × 841.89 pt, DejaVu Sans y DejaVu Sans Bold solo en el informe. Noto Sans sigue solo en el anexo. La cascada, cuando concilia, tiene extremos anclados en cero y aportes flotantes. El anexo se agrega con `addPage` al tamaño del SVG, sin numeración nueva y sin reducirlo a A4.

## Pruebas

| Comando | Resultado |
| --- | --- |
| `node --test` 085 | 12/12 |
| `node --test` 085 + 084 + 081 + 081-R1 + 081-R2 | 39/39 |
| `npx tsc --noEmit` | 0 |
| `npm run build` del producto, sin la ruta temporal | 0 |

El build emite el aviso EPERM al crear el symlink de `standalone/node_modules` porque `frontend-dashboard/node_modules` de este worktree es un enlace local al instalador ya existente. No se agregó ninguna dependencia. No se ejecutó `npm audit fix`.

El botón real se pulsó en Chrome contra `node .next/standalone/server.js`, con fixtures sintéticos. La ruta temporal que montaba el modal no está en el commit. Resultado del clic:

| Modo | PDFs | Páginas | DejaVu | Noto | Imágenes | Nota |
| --- | --- | --- | --- | --- | --- | --- |
| Tehuacán, dos semanas | 1 | 3 | sí | sí | 0 | A4 + A4 + anexo 1260×1513.5 |
| Una semana | 1 | 2 | sí | sí | 0 | «Sin comparación» y LAST_REAL_FALLBACK |
| Base incompatible | 1 | 2 | sí | sí | 0 | «No conciliable» |
| Tres semanas con salto y cambio de año | 1 | 3 | sí | sí | 0 | «no consecutivos» y «Cambio de año» |
| Puebla | 1 | 3 | sí | sí | 0 | El texto es Puebla, no Tehuacán |
| TODAS | 1 | 1 | no | sí | 0 | Sin «Qué cambió»; MediaBox 1260×1513.5 |
| Doble clic | 1 | 3 | sí | sí | 0 | Un solo archivo |
| DejaVu ausente | 0 | — | — | — | — | Error visible y botón restaurado |

El sello del informe y el del anexo coincidieron en el PDF de Tehuacán. El visor PDF embebido devolvió un cuadro negro, así que no hay PNG de página en la evidencia. El contenido se comprobó por texto ToUnicode, fuentes incrustadas, MediaBox y ausencia de `/Subtype /Image`.

## Evidencia

Fixtures sintéticos en `docs/dev-loop/reports/evidence-085/`. No son cifras productivas ni páginas del maestro.

| Archivo | Bytes |
| --- | --- |
| button-plant-1.pdf | 143101 |
| button-single-1.pdf | 131260 |
| button-partial-1.pdf | 139393 |
| button-nweeks-1.pdf | 147365 |
| button-puebla-1.pdf | 143024 |
| button-todas-1.pdf | 25114 |
| button-double-1.pdf | 143099 |
| button-manifest.json | 8189 |

## R2 — aire bajo la cascada

Producto de este arreglo: `3d5ca8f4b143af3a20c504366dce972c882074da`.
El producto anterior sigue siendo `73bfa2f3cabd856944b37afbcea4e49b4a8fd26c`.

Las etiquetas de dos líneas se medían con un hueco fijo de 30 pt y la segunda línea entraba en el encabezado de la tabla. `drawWaterfall` ahora usa la altura real de esas líneas (`getLineHeight`) y deja 12 pt debajo antes de la tabla. No cambian cifras, signos, el top cinco, Otras partidas, TODAS ni el anexo.

La evidencia R1 conserva los PNG `tehuacan-p*.png`, `puebla-p*.png`, `parcial-p*.png`, `nsemanas-p*.png` y `anexo-084.png`. La evidencia R2 está en `r2-tehuacan.pdf`, `r2-puebla.pdf`, `r2-nsemanas.pdf`, `r2-parcial.pdf` y los PNG `r2-*.png`. El anexo R2 se volvió a renderizar desde la página ya generada, sin recomponerla.

## Límites

No hay PR, merge ni deploy. No hubo escrituras a la base. La descarga productiva no queda validada. El checkout antiguo sigue en su rama con su `CURRENT_TASK` previa sin commit.

## Cierre humano para apertura de 086
CLOSED_BY_HUMAN: Luis Rogelio Zaragoza Alvarez 2026-10-19
La apertura de 086 no constituye una nueva validación productiva de 085.
