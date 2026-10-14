# IMPL-IGF-DIARIO-WEEKLY-EXECUTIVE-PDF-084

Producto: `f67b910248637428e4cfee7321d497465e50254d`
Base: `15983459a28c5d4327746f612a570977013dd514`
Rama: `implementation/igf-diario-weekly-executive-pdf-084`

El botón de la gráfica ejecutiva semanal descarga un PDF vectorial del mismo SVG que ya está en pantalla. No envuelve el PNG anterior. No recalcula acumulados, deltas ni colores.

## Descarga

- Texto del botón: Descargar PDF. Mientras corre: Generando PDF…
- Archivo `.pdf`, MIME `application/pdf`, una página a la medida del SVG.
- Nombre: `IGF_Diario_Acapulco_2026-10-04_a_2026-10-17.pdf`. TODAS usa `Todas`.
- La instantánea del view se toma antes de cualquier `await`. Un segundo clic no abre otra exportación.
- No se exportan la barra del navegador, los botones, el selector ni el tooltip.
- jsPDF 4.2.1 y svg2pdf.js 2.8.1 se cargan con `import()` solo al pulsar el botón. El build deja esas librerías fuera del first load de `/igf-forecast`.

## Página y texto

La página usa puntos (`72/96` por cada unidad SVG). Si el ancho supera el alto, la orientación es horizontal para que jsPDF no intercambie los lados. Si un lado pasara de 14400 unidades, se reduce la página en proporción. Las selecciones del fixture caben en una página sin ese recorte.

Noto Sans (OFL 1.1), pesos 400 y 700, va incrustada. Cubre á, é, í, ó, ú, ñ, $, % , Δ y el guion de ausencia. ▲ y ▼ no existen en Noto Sans: el SVG los dibuja como polígonos, con la misma dirección y el mismo color.

## Pruebas

Chrome headless ejecutó `svgToExecutivePdf` sobre el SVG real del renderer. 27/27 entre `test/impl-igf-diario-weekly-executive-pdf-084.test.js` y las regresiones 081, 081-R1 y 081-R2. No se tocó código de 083. `npx tsc --noEmit` y `npm run build` terminaron con código 0.

## Evidencia local

Fixture local. No es validación productiva.

| Archivo | Páginas | MediaBox (pt) | Bytes |
| --- | --- | --- | --- |
| IGF_Diario_Acapulco_2026-10-04_a_2026-10-17.pdf | 1 | 1260 x 1513.5 | 29945 |
| IGF_Diario_Todas_2026-10-04_a_2026-10-24.pdf | 1 | 1260 x 1513.5 | 36646 |
| IGF_Diario_Acapulco_2026-09-27_a_2026-11-07.pdf | 1 | 2002.5 x 1513.5 | 63816 |

Las vistas `acapulco-41-42.png`, `todas-tres-semanas.png`, `max-seis-semanas.png` y `acapulco-zoom.png` salen de pdf.js en Chrome. Muestran los cinco marcos, las semanas elegidas, Pendiente, la cobertura y el sello de exportación. HG más negativo queda verde y C&D más negativo queda rojo. No hay imagen de página completa dentro del PDF (`/Subtype /Image` = 0).

No hay PR, merge, deploy, migraciones ni escrituras a la base productiva.
