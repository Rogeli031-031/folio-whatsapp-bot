# IMPL 081 — Gráfica ejecutiva semanal IGF Diario

El botón Gráfica abre un visor a pantalla completa. En TODAS el botón queda junto a la navegación de semana. Cerrar no cambia el ancla de la tabla.

El visor carga las semanas que ya publica `/api/dashboard/igf-diario-semanal` y selecciona por defecto las últimas tres. Cada indicador tiene su escala. GASTO suma los siete componentes de gasto ya resueltos y los pondera con la venta cubierta. Descuento Compra se muestra como Pendiente. Venta Casa y Venta Comisionista salen de los kilos de canal ya resueltos, sumados en TODAS.

La descarga es PNG de la misma visualización. No hay PDF.

Los SVG de `docs/dev-loop/reports/evidence-081/` son un specimen del renderer para revisar columnas, deltas y recuadros. No son un extracto de producción de San Luis ni de TODAS.

No se modificó la tabla, el Excel, ni el cálculo de 077, 078-R2, 079 u 080.
