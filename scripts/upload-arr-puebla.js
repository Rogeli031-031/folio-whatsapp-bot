/**
 * Sube un archivo ARR al esquema arr y calcula el forecast del mes.
 * La planta se detecta del nombre del archivo: "ARR Puebla.xlsm" -> Puebla, "ARR Acapulco.xlsm" -> Acapulco.
 * Uso (desde la raíz del proyecto):
 *   set DATABASE_URL=postgresql://... && node scripts/upload-arr-puebla.js
 *   node scripts/upload-arr-puebla.js "ruta\ARR Acapulco.xlsm"
 *
 * Requiere DATABASE_URL en el entorno (la misma que usa el bot en Render).
 */

"use strict";

const path = require("path");
const fs = require("fs");
const { Pool } = require("pg");
const arrLoad = require("../lib/arr-load");
const forecastMensual = require("../lib/forecast-mensual");

const defaultPath = path.join(
  __dirname,
  "..",
  "..",
  "IGF_Postgres_Upload",
  "excel",
  "ARR-IA",
  "ARR Puebla.xlsm"
);

/** Extrae plant_code del nombre del archivo: "ARR Puebla.xlsm" -> "Puebla", "ARR Acapulco.xlsm" -> "Acapulco" */
function plantFromFileName(filePath) {
  const base = path.basename(filePath, path.extname(filePath));
  const match = base.replace(/^\s+/, "").match(/^ARR\s+(.+)$/i);
  const name = match ? match[1].trim() : base.trim();
  return name || "Puebla";
}

async function main() {
  const filePath = process.argv[2] || defaultPath;
  if (!fs.existsSync(filePath)) {
    console.error("No se encontró el archivo:", filePath);
    console.error("Uso: node scripts/upload-arr-puebla.js [ruta/al/ARR NombrePlanta.xlsm]");
    process.exit(1);
  }

  const plantCode = plantFromFileName(filePath);
  console.log("Planta detectada del nombre del archivo:", plantCode);

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("Falta DATABASE_URL. Ejemplo:");
    console.error('  set DATABASE_URL=postgresql://user:pass@host:5432/dbname && node scripts/upload-arr-puebla.js');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes("render.com") ? { rejectUnauthorized: false } : false,
  });

  const buffer = fs.readFileSync(filePath);
  console.log("Leyendo archivo:", filePath, "(" + buffer.length + " bytes)");

  const client = await pool.connect();
  try {
    const result = await arrLoad.loadArrFromBuffer(client, plantCode, buffer, {});
    console.log("Carga ARR OK:", result);

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const forecastResult = await forecastMensual.calcularForecastMensual(client, plantCode, year, month);
    console.log("Forecast", year + "/" + month, "OK:", forecastResult);
  } catch (e) {
    console.error("Error:", e.message);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
}

main();
