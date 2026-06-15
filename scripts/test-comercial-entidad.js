"use strict";

/**
 * Pruebas Sprint 2C — Entidades comerciales (sin BD; lógica pura + mock opcional).
 * node scripts/test-comercial-entidad.js
 */

const {
  normalizeCommercialName,
  ALIAS_TIPOS,
  ALIAS_FUENTES,
} = require("../lib/comercial-entidad");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(normalizeCommercialName("  Carlos Juárez  ") === "carlos juarez", "normaliza acentos");
assert(normalizeCommercialName("Tiberio González") === "tiberio gonzalez", "normaliza gonzález");
assert(ALIAS_TIPOS.includes("operativo"), "tipo operativo");
assert(ALIAS_TIPOS.includes("razon_social"), "tipo razon_social");
assert(ALIAS_FUENTES.includes("manual"), "fuente manual");
assert(ALIAS_FUENTES.includes("bitacora"), "fuente bitacora");

async function testWithMockDb() {
  const queries = [];
  const mockClient = {
    query: async (sql, params) => {
      queries.push({ sql: String(sql).trim().slice(0, 80), params });
      if (sql.includes("CREATE TABLE")) return { rows: [] };
      if (sql.includes("CREATE INDEX")) return { rows: [] };
      if (sql.includes("CREATE SCHEMA")) return { rows: [] };
      if (sql.includes("FROM arr.comercial_entidad e") && sql.includes("WHERE e.planta_id")) {
        return {
          rows: [
            {
              id: 1,
              planta_id: 5,
              nombre_canonico: "Tiberio González",
              notas: null,
              created_at: new Date(),
              updated_at: new Date(),
              planta_nombre: "Oaxaca",
            },
          ],
        };
      }
      if (sql.includes("FROM arr.comercial_entidad_alias a") && sql.includes("WHERE e.planta_id = $1")) {
        return {
          rows: [
            {
              id: 10,
              entidad_id: 1,
              alias_nombre: "Carlos Juárez",
              alias_tipo: "operativo",
              fuente: "manual",
              verificado: true,
              created_at: new Date(),
              matched_alias_id: 10,
              matched_alias: "Carlos Juárez",
              nombre_canonico: "Tiberio González",
              planta_id: 5,
              planta_nombre: "Oaxaca",
            },
          ],
        };
      }
      if (sql.includes("WHERE a.entidad_id = $1")) {
        return {
          rows: [
            {
              id: 10,
              entidad_id: 1,
              alias_nombre: "Carlos Juárez",
              alias_tipo: "operativo",
              fuente: "manual",
              verificado: true,
              created_at: new Date(),
            },
          ],
        };
      }
      return { rows: [] };
    },
  };

  const { resolveCommercialEntity, findCommercialAliases, ensureComercialEntidadTables } = require("../lib/comercial-entidad");

  await ensureComercialEntidadTables(mockClient);

  const resolved = await resolveCommercialEntity(mockClient, 5, "Carlos Juárez");
  assert(resolved && resolved.nombre_canonico === "Tiberio González", "resolve alias → canónico");
  assert(resolved.matched_alias === "Carlos Juárez", "matched_alias presente");

  const canonical = await resolveCommercialEntity(mockClient, 5, "Tiberio González");
  assert(canonical && canonical.nombre_canonico === "Tiberio González", "resolve canónico directo");

  const matches = await findCommercialAliases(mockClient, 5, "carlos");
  assert(matches.length >= 0, "findCommercialAliases no lanza");
}

testWithMockDb()
  .then(() => {
    console.log("OK Sprint 2C — entidades comerciales (normalización + resolve mock)");
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
