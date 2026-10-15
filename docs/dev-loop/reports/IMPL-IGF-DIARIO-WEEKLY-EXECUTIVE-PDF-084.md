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

No hay migraciones ni escrituras a la base productiva. La descarga productiva no queda validada por este fixture.

## G4

Producto probado: `f67b910248637428e4cfee7321d497465e50254d`. El producto no se modificó en G4.

Controles, una sola corrida, en `frontend-dashboard` salvo las pruebas:

- `node --test` de `test/impl-igf-diario-weekly-executive-pdf-084.test.js`, `test/impl-igf-diario-weekly-executive-chart-081.test.js`, `test/fix-igf-diario-weekly-executive-grid-081-r1.test.js` y `test/fix-igf-diario-weekly-executive-ux-081-r2.test.js`, con `NODE_PATH` hacia `node_modules` de la raíz y de `frontend-dashboard`: 27/27, exit 0.
- `npx tsc --noEmit`: exit 0.
- `npm run build`: exit 0. El script es `next build` y `prepare-standalone`.

El standalone sirvió los chunks separados de la exportación (`472` svg2pdf.js, `614` cargador, `164f4fb6` jsPDF) con HTTP 200. `/igf-forecast` no incluye jsPDF en el first load. `GET /fonts/NotoSans-Regular.ttf` devolvió 27056 bytes y `GET /fonts/NotoSans-Bold.ttf` 27112 bytes, ambos con cabecera TTF.

Chrome headless pulsó el botón real `Descargar PDF` del modal, con fixture local y sin credenciales. Un doble clic produjo un solo blob.

| Caso | Páginas | MediaBox (pt) | Bytes | Texto y vectores |
| --- | --- | --- | --- | --- |
| Acapulco, semanas 41–42 | 1 | 1260 x 1513.5 | 29953 | PÚBLICO, Δ, —, Cobertura parcial, Pendiente, 1,500.50, 1,800.25 |
| TODAS, semanas 41–43 | 1 | 1260 x 1513.5 | 36653 | Todas, semanas 41 a 43, Cobertura parcial, Pendiente |
| Acapulco, semanas 40–45 | 1 | 2002.5 x 1513.5 | 63821 | Semana 40 y Semana 45 presentes |

Los tres PDF incrustan `/BaseFont /NotoSans`, tienen trazos `m`/`l`, rellenos verde `0.204 0.827 0.6` y rojo `0.97 0.44 0.44`, y `/Subtype /Image` = 0. El texto extraído incluye RESULTADO, HG / VOLUMEN, COMISIONES Y DESCUENTOS, PRECIO DE VENTA AL PÚBLICO, GASTOS, FLETE y DESCUENTO COMPRA. El sello lleva la hora de esta corrida, así que el tamaño difiere en unos bytes de la evidencia anterior; la caja de página coincide.

Con `NotoSans-Bold.ttf` retirado solo de la copia standalone, el botón mostró «No se pudo cargar la fuente del PDF», volvió a «Descargar PDF» y conservó las dos semanas y el cierre. La fuente se restauró: HTTP 200 y 27112 bytes.

`npm audit --omit=dev` no reporta hallazgos en `jspdf` 4.2.1, `svg2pdf.js` 2.8.1, `cssesc` 3.0.0, `font-family-papandreou` 0.2.0-patch2, `specificity` 0.4.1 ni `svgpath` 2.6.0. El lockfile fija esas versiones. No se ejecutó `npm audit fix` ni se actualizó ninguna dependencia. Los hallazgos de `next`, `exceljs`, `xlsx` y otras dependencias ya presentes quedan fuera de este cambio.

No se inició un despliegue manual.

## Resolucion administrativa humana 084 y transicion a 085

- Estado de la tarea saliente: CLOSED.
- Decisor humano: Luis rogelio Zaragoza Alvarez.
- Fecha/hora local con zona: 2026-10-14T21:13:50.7827226-06:00.
- Base integrada examinada: c409e3078c636302397557096b118df04a514393.
- Se acepta el cierre administrativo de 084 sobre la publicacion y evidencia G4 reportadas.
- Validacion del PDF productivo: NO comprobada por este instalador; no se declara PRODUCTION PASS.
- No se cerraron ni modificaron las tareas 038/080 del checkout antiguo.
- G1 de 085 y D1-D6 aceptadas mediante confirmacion escrita por el operador humano.
- Alcance 085: implementacion/pruebas y commits/push solo de rama; sin PR/merge/deploy ni DB productiva.
- Registro: docs/dev-loop/authorizations/G1-085.json.
