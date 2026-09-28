"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const permisos = require("../lib/usuario-permisos");
const compras = require("../lib/compras-dashboard");

function actor(extra) {
  return {
    rol_clave: "GA",
    rol_nombre: "Gerente Administrativo",
    nombre: "Gerente Administrativo",
    nombre_persona: "Persona Ejemplo",
    planta_id: 1,
    permisos_json: null,
    ...extra,
  };
}

function permiso(row) {
  return permisos.permisosEfectivos(row.rol_clave, row.permisos_json).acceso_compras === true;
}

function urlFor(row) {
  if (!permiso(row)) return compras.comprasTDenyText(row);
  const planta = compras.comprasPlantaIdForLink(row, row.planta_id);
  const link = compras.appendComprasPlanta("https://dash.example/compras?t=TOKEN", planta);
  return compras.comprasTSuccessText(link);
}

test("A: Asistente Dirección técnico GA con permiso es global y no fuerza planta", () => {
  const row = actor({
    nombre: "Asistente Direccion",
    permisos_json: { acceso_compras: true },
    planta_id: 1,
  });
  assert.equal(permiso(row), true);
  assert.equal(compras.isAsistenteDireccion(row), true);
  assert.equal(compras.comprasActorIsGlobal(row), true);
  assert.equal(compras.comprasPlantaIdForLink(row, 1), null);
  const url = urlFor(row);
  assert.match(url, /https:\/\/dash\.example\/compras\?t=TOKEN/);
  assert.doesNotMatch(url, /planta_id/);
  assert.equal(permisos.permisosPorRol("GA").acceso_compras, false);
});

test("B: Asistente Dirección técnico GA sin permiso queda denegado", () => {
  for (const permisos_json of [null, { acceso_compras: false }]) {
    const row = actor({ nombre: "Asistente Dirección", permisos_json, planta_id: 1 });
    assert.equal(permiso(row), false);
    assert.equal(compras.comprasActorIsGlobal(row), true);
    assert.equal(urlFor(row), "⛔ No tienes permiso de Compras.");
  }
});

test("C: GA genérico con permiso sigue ligado a su planta", () => {
  const row = actor({
    nombre: "Gerente Administrativo",
    permisos_json: { acceso_compras: true },
    planta_id: 1,
  });
  assert.equal(permiso(row), true);
  assert.equal(compras.isAsistenteDireccion(row), false);
  assert.equal(compras.comprasActorIsGlobal(row), false);
  assert.equal(compras.comprasPlantaIdForLink(row, 1), 1);
  assert.match(urlFor(row), /planta_id=1/);
});

test("D/E/F: AD, ZP y CDMX son globales; GG y GO conservan planta", () => {
  const ad = actor({ rol_clave: "AD", rol_nombre: "Asistente Dirección", nombre: "Asistente Dirección" });
  const zp = actor({ rol_clave: "ZP", rol_nombre: "Director ZP", nombre: "Director ZP", planta_id: null });
  const cdmx = actor({ rol_clave: "CF_CDMX", rol_nombre: "Contralor CDMX", nombre: "Contralor CDMX", planta_id: null });
  const gg = actor({ rol_clave: "GG", rol_nombre: "Gerente General", nombre: "Gerente General", planta_id: 11 });
  const go = actor({ rol_clave: "GO", rol_nombre: "Gerente Operaciones", nombre: "Gerente Operaciones", planta_id: 2 });
  assert.equal(compras.comprasActorIsGlobal(ad), true);
  assert.equal(compras.comprasPlantaIdForLink(ad, 1), null);
  assert.equal(compras.comprasActorIsGlobal(zp), true);
  assert.equal(compras.comprasPlantaIdForLink(zp, null), null);
  assert.equal(compras.comprasActorIsGlobal(cdmx), true);
  assert.equal(compras.comprasPlantaIdForLink(cdmx, null), null);
  assert.equal(compras.comprasActorIsGlobal(gg), false);
  assert.equal(compras.comprasPlantaIdForLink(gg, 1), 1);
  assert.equal(compras.comprasActorIsGlobal(go), false);
  assert.equal(compras.comprasPlantaIdForLink(go, 2), 2);
});

test("variantes de puesto y el nombre personal no autorizan", () => {
  for (const nombre of ["Asistente Dirección", "ASISTENTE DIRECCION", "asistente   dirección"]) {
    const row = actor({ nombre, permisos_json: { acceso_compras: true } });
    assert.equal(compras.isAsistenteDireccion(row), true, nombre);
    assert.equal(compras.comprasActorIsGlobal(row), true, nombre);
    assert.doesNotMatch(urlFor(row), /planta_id/, nombre);
  }
  const porRol = actor({
    rol_nombre: "Asistente Dirección",
    nombre: "Gerente Administrativo",
    permisos_json: { acceso_compras: true },
  });
  assert.equal(compras.isAsistenteDireccion(porRol), true);
  const soloPersona = actor({
    nombre: "Gerente Administrativo",
    nombre_persona: "Asistente Dirección",
    permisos_json: { acceso_compras: true },
  });
  assert.equal(compras.isAsistenteDireccion(soloPersona), false);
  assert.equal(compras.comprasActorIsGlobal(soloPersona), false);
  assert.match(urlFor(soloPersona), /planta_id=1/);
});

test("el JWT de Compras usa la misma detección y no lista plantas si es AD", () => {
  const server = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
  const fn = server.slice(server.indexOf("async function buildDashboardSignedUrlForUsuario"));
  const body = fn.slice(0, fn.indexOf("async function buildActionRegisterUrl"));
  assert.match(body, /comprasDashboard\.isAsistenteDireccion\(usuarioRow\)/);
  assert.match(body, /esAD \? "AD"/);
  assert.match(body, /!\(esZP \|\| esAD \|\| esCFCDMX\)/);
  assert.match(body, /const esAD = comprasDashboard\.isAsistenteDireccion\(usuarioRow\)/);
});
