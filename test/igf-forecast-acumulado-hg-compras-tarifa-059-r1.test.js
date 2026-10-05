"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.join(__dirname, "..");
const CLIENT = fs.readFileSync(path.join(ROOT, "frontend-dashboard", "components", "IgfForecastClient.tsx"), "utf8");
const GRAFICA = fs.readFileSync(path.join(ROOT, "lib", "igf-diario-grafica.js"), "utf8");

const effect = CLIENT.slice(
  CLIENT.indexOf('if (igfTableMode !== "igf_diario"'),
  CLIENT.indexOf("}, [igfTableMode, token, igfForecast, igfMini, uploadDay, versionAsOfCorte]")
);
const applyFn = CLIENT.slice(
  CLIENT.indexOf("function applyIgfDiarioAcumuladoMini"),
  CLIENT.indexOf("export function IgfForecastContent")
);
const catchBlock = effect.slice(effect.indexOf("} catch"), effect.indexOf("} finally"));

test("cada carga acumulada limpia el estado anterior antes del request", () => {
  assert.ok(effect.indexOf("setAcumuladoByPlant(null)") < effect.indexOf("fetchIgfDiarioAcumulado"));
  assert.ok(effect.indexOf("setAcumuladoError(null)") < effect.indexOf("fetchIgfDiarioAcumulado"));
  assert.ok(effect.indexOf("setAcumuladoLoading(true)") < effect.indexOf("fetchIgfDiarioAcumulado"));
  assert.ok(effect.indexOf("setAcumuladoMissing([])") < effect.indexOf("fetchIgfDiarioAcumulado"));
});

test("corte, mes y versión disparan una carga que no reutiliza el acumulado previo", () => {
  assert.match(effect, /uploadDay/);
  assert.match(effect, /igfForecast\.year/);
  assert.match(effect, /igfForecast\.month/);
  assert.match(effect, /versionAsOfCorte/);
  assert.match(CLIENT, /!acumuladoLoading && !acumuladoError && acumuladoMissing\.length === 0 && acumuladoByPlant/);
  assert.match(CLIENT, /Cargando IGF Diario acumulado…/);
});

test("un error no conserva el acumulado anterior", () => {
  assert.match(catchBlock, /setAcumuladoByPlant\(null\)/);
  assert.match(catchBlock, /setAcumuladoMissing\(\[\]\)/);
  assert.match(catchBlock, /setAcumuladoError\(/);
  assert.doesNotMatch(catchBlock, /setAcumuladoByPlant\(next\)/);
});

test("sin margen o sin HG el modo queda incompleto y no mezcla Forecast", () => {
  assert.match(CLIENT, /Number\.isFinite\(hit\.margen\)/);
  assert.match(CLIENT, /Number\.isFinite\(hit\.hg\)/);
  assert.match(applyFn, /if \(missingAcumuladoPlants\(mini\.rows \|\| \[\], byPlant\)\.length\) return null/);
  assert.doesNotMatch(applyFn, /return row/);
  assert.ok(applyFn.indexOf("return null") < applyFn.indexOf('empresa: "Zona Provincia"'));
  assert.match(CLIENT, /IGF Diario acumulado incompleto/);
});

test("volver a Forecast muestra el mini original y la gráfica solo expone acumulado", () => {
  assert.match(CLIENT, /setIgfTableMode\("forecast"\)/);
  assert.match(CLIENT, /igfTableMode === "forecast"/);
  assert.match(CLIENT, /: igfMini/);
  assert.match(GRAFICA, /acumulado: selectedAcumulado/);
  assert.match(GRAFICA, /const publicPoints = points\.map\(\(\{ margen, hg_kg, \.\.\.point \}\) => point\)/);
  assert.doesNotMatch(GRAFICA, /app\.get\(/);
  assert.doesNotMatch(CLIENT, /H48|Y48/);
});
