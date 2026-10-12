# FIX 081-R1 — Retícula de la gráfica ejecutiva

La gráfica deja de compartir una sola línea. Cada semana seleccionada ocupa su columna, con acumulado y mini-gráfica de domingo a sábado. El delta queda en una columna estrecha entre semanas. La primera semana no tiene delta anterior.

Tres semanas usan el ancho completo. A partir de la cuarta el ancho crece y el visor hace scroll horizontal.

GASTO, Descuento Compra, las unidades y el resto del modelo de 081 no se recalcularon.

Los SVG de `docs/dev-loop/reports/evidence-081-r1/` son el render del componente para San Luis y TODAS con tres semanas. Muestran la retícula. No son un extracto de producción.
