# Presupuesto: periodos, comparación y nivel detalle

## Periodos (YYYY-MM)

- Los presupuestos subidos corresponden a **marzo 2026 (2026-03)**.
- El periodo por defecto para consulta y para el seed es **2026-03** (configurable con `PRESUPUESTO_PERIODO_DEFAULT` en env).
- En base de datos, `presupuesto_asignacion_detalle.periodo` guarda un valor `YYYY-MM` por mes/año.
- Puedes subir presupuestos de **diferentes meses y años**; cada carga/seed puede usar un periodo distinto (por ahora el seed usa el periodo por defecto; más adelante se puede parametrizar por archivo o comando).

## Comandos

- **Mi presupuesto**  
  Muestra el presupuesto de una planta para el **periodo por defecto** (ej. 2026-03). Se puede extender para que el usuario elija periodo de una lista.

- **Comparar presupuesto**  
  Flujo: elegir planta → periodo inicial (A) → periodo a comparar (B). Muestra totales y cambios por categoría (A → B, delta en $).

  Frases que activan el flujo: *comparar presupuesto*, *qué cambió presupuesto*, *cambios presupuesto*, *presupuesto comparar*.

## Nivel detalle (Nóminas, Rentas)

- Hoy la estructura es: **Categoría** (ej. NOMINA, RENTAS) → **Subcategoría** (ej. SLDOS. Y SALR. ADMINISTRATIVOS N1) → monto en `presupuesto_asignacion_detalle`.
- Está preparada la tabla **`presupuesto_linea_detalle`** para un **nivel debajo** de la subcategoría:
  - `planta_id`, `periodo`, `categoria`, `subcategoria`, `linea_detalle`, `monto`
  - Útil para desglose extra en Nóminas, Rentas, etc., cuando tengas el detalle por línea.
- Cuando tengas el formato de esas líneas (ej. columnas o nombres), se pueden definir las consultas y el flujo en el bot para mostrarlas.
