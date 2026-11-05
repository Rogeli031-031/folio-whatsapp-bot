# Desplazar gráfica con Ctrl y botón izquierdo

Solicitud directa: mantener Ctrl y el botón izquierdo mientras se mueve el mouse para trasladar la gráfica en esa dirección, sin giro ni zoom. Continuación del flujo de integración/publicación autorizado; no se alteran contratos, aprobaciones o CURRENT_TASK.

Base b0232d1755f41430f881c616e2d4a330ac562c90. Rama feat/igf-desplazar-grafica-ctrl.

- Gesto pan independiente de rotate/zoom, habilitado en Vista 3D y Vista superior. Captura de puntero hasta soltar/cancelar.
- El desplazamiento del mouse se convierte a coordenadas del viewBox usando el tamaño visible del SVG, de modo que sigue la dirección y distancia de pantalla.
- La traslación se suma a la proyección de superficies, ejes, curvas y marcadores. No modifica cámara, escala, supuestos ni resultados. El arrastre normal sigue girando en 3D y el botón central sigue controlando el zoom.
- Ayuda visible en la barra: Ctrl + botón izquierdo: desplazar.

Validación: 40 pruebas relacionadas aprobadas. Verifica traslación idéntica de todos los vértices en ambas vistas, relación con tamaño del SVG, regreso a la posición original, fin de gesto/cancelación y ausencia de cambios financieros. Compilación de producción/TypeScript y revisión del diff. Sin cambios al servidor ni a datos guardados.
