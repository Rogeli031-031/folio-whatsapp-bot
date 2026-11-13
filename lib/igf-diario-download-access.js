"use strict";

const { canAccessPlant } = require("./igf-dashboard-scope");

function isGA(auth) {
  return String(auth && auth.role || "").trim().toUpperCase() === "GA";
}

// Exception for the three read endpoints used by the IGF Diario button.
// Never changes the general GA financial/write permission.
function requestBlock(auth, query, kind) {
  if (!isGA(auth)) return null;
  const q = query || {};
  const truthy = (value) => /^(1|true|yes)$/i.test(String(value || "").trim());
  const plant = String(kind === "series" ? q.empresa || "" : q.plant_code || "").trim();
  const allowed = Array.isArray(auth.plantas_permitidas) ? auth.plantas_permitidas : [];
  if (!allowed.some((id) => Number.isInteger(Number(id)) && Number(id) > 0)) {
    return { status: 403, error: "No tienes una planta asignada para descargar IGF Diario." };
  }
  if (truthy(q.igf_diario_todas) || truthy(q.todas) || truthy(q.provincia)
    || !plant || /^(provincia|todas)$/i.test(plant)
    || (kind === "excel" && !truthy(q.require_plant))) {
    return { status: 403, error: "GA debe seleccionar una planta autorizada para IGF Diario." };
  }
  return null;
}

function plantBlock(auth, plant) {
  if (!isGA(auth)) return null;
  if (!plant || !canAccessPlant(auth, plant.plantaId)) {
    return "Sin permiso para esta planta";
  }
  return null;
}

module.exports = { isGA, requestBlock, plantBlock };
