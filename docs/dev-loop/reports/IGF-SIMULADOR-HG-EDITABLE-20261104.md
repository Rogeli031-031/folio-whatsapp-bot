# HG editable en simulador de rentabilidad

Petición del usuario: agregar HG editable y que mueva el resultado final. Continuación de implementación, integración y publicación autorizadas en el chat. No se modifican CURRENT_TASK ni campos de aprobación.

Base: b8bd1535af5c1af0fae33b30e2fbadfaff95a6f3. Rama: feat/igf-simulador-hg-editable.

Se agrega HG simulado ($/kg) con signo de costo igual al dashboard. El modelo usa a_sim = a_base + HG_base - HG_sim. Por ello, variar HG en delta cambia el resultado en -venta_simulada_kg * delta. La superficie, escenario, curva cero y ruta al equilibrio usan el modelo ajustado; tendencia actual y semanas conservan sus resultados originales. Restaurar actual recupera venta, descuento y HG de la base. Si el HG base es desconocido, se deshabilita su edición y no se inventa cero.

Propuestas permite editar/guardar HG junto con la contribución efectiva y gastos originales en basis JSONB; sin migración. El servidor valida HG numérico finito en [-100,100] y mantiene compatibilidad con propuestas anteriores sin HG explícito. Esas propuestas muestran No registrado; su resultado conserva la base ya guardada. Usar valores aplica HG conocido al modelo del corte actual. No cambia presupuestos, capturas, comisiones ni HG reales.

Validación: 29 pruebas relacionadas correctas, incluyendo efecto monetario a volúmenes diferentes, HG positivo/cero/negativo, equilibrio, marcador real inalterado, restauración, HG desconocido, guardado/reutilización y rechazo de entradas inválidas. Compilación de producción/TypeScript antes de publicar. Se excluyen .next y cambios ajenos; sin secretos. Despliegue y navegador se verifican en el PR.
