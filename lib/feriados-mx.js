/**
 * Días feriados federales México (año completo).
 * Solo lista; el forecast aplica factor 0.50 en ventas/descuento esos días.
 */

"use strict";

function feriadosFederalesMexico(year) {
  const y = Number(year);
  if (isNaN(y)) return [];
  return [
    `${y}-01-01`, // Año nuevo
    `${y}-02-05`, // Constitución (primer lunes de febrero = 5 en 2024, puede variar)
    `${y}-03-21`, // Natalicio Benito Juárez (tercer lunes de marzo)
    `${y}-05-01`, // Día del trabajo
    `${y}-09-16`, // Independencia
    `${y}-11-02`, // Día de muertos
    `${y}-11-20`, // Revolución (tercer lunes de noviembre)
    `${y}-12-25`, // Navidad
  ];
}

/** Devuelve Set de fechas YYYY-MM-DD para el año (feriados federales México). */
function feriadosSet(year) {
  const y = Number(year);
  if (isNaN(y)) return new Set();
  return new Set([
    `${y}-01-01`,
    `${y}-02-05`,
    `${y}-03-21`,
    `${y}-05-01`,
    `${y}-09-16`,
    `${y}-11-02`,
    `${y}-11-20`,
    `${y}-12-25`,
  ]);
}

module.exports = { feriadosFederalesMexico, feriadosSet };
