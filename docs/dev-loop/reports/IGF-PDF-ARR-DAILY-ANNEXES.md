# Anexos ARR e IGF Diario al PDF semanal

Implementacion autorizada por el usuario en este chat: "adelante lo implementamos".
Base: 7e0f4d22a69c5925b5dd56c4efef4a682fe11c34.
Rama: implementation/igf-pdf-arr-daily-annexes.

El PDF por planta agrega Venta CASA y Venta COMISIONISTA en ventana ARR 1M,
con Top 15 por magnitud de variacion y los dos comentarios recientes disponibles.
Despues agrega el detalle diario del mes seleccionado, extraido del XLSX real:
A, B, H, AD, Z, M, U, AF, AG, AI, AJ y AK, en ese orden.
Los gastos M/U se muestran en $/kg, conforme a las celdas del Excel.
El servidor acepta top_limit=15; el valor predeterminado sigue siendo 6.
TODAS y el anexo vectorial 084 conservan su comportamiento.

El lector evalua las formulas usadas por el exportador sin ejecutar JavaScript dinamico.
Conserva ceros, blancos y signos. Formulas desconocidas, formatos historicos con
otras columnas y respuestas incompletas producen error visible; no se entrega
un PDF que parezca completo con anexos faltantes.

Validacion:
- 56 pruebas: anexos, 085, series ARR 018 y descuentos 019.
- 9 pruebas 084, incluido Chrome headless.
- 8 pruebas finales: siete de anexos y una de navegador real, con XLSX real
  generado por el exportador y datos sinteticos, composicion vectorial y casos
  de servidor antiguo, periodos distintos y fallo al obtener Excel.
- Typecheck y compilacion de Next satisfactorios.
- Revision visual de la muestra completa renderizada a PNG: los dos anexos
  ARR incluyen 15 clientes y el detalle de 31 dias cabe en una hoja horizontal.
- Comentarios largos continuan en paginas adicionales, sin truncamiento.

Limites: la muestra usa datos sinteticos; no se verificaron cifras contra una
sesion de produccion. Los anexos ARR usan la ventana 1M del ARR (ultimos 30 dias
segun su fuente); la tabla usa el mes seleccionado del Excel. Se indican ambos
periodos. El formato historico anterior al esquema solicitado se rechaza.
Esta implementacion no incluye merge, deploy manual, migraciones ni escrituras
en DB. Requiere publicar backend y frontend para habilitar Top 15 en produccion.
