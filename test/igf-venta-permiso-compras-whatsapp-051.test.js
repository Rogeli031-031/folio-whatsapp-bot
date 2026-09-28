"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const ExcelJS = require("exceljs");

const igf = require("../lib/igf-diario-puebla");
const forecast = require("../lib/dashboard-arr-forecast");
const permisos = require("../lib/usuario-permisos");
const compras = require("../lib/compras-dashboard");
const { createDashboardToken, encodeDashboardTokenForWhatsAppUrl, verifyDashboardToken } = require("../lib/dashboard-auth");

function igfRow(day) {
  if (day <= 6) return 5 + day;
  if (day <= 13) return 7 + day;
  if (day <= 20) return 8 + day;
  if (day <= 27) return 11 + day;
  return 13 + day;
}

function formula(cell) {
  return cell.value && cell.value.formula ? String(cell.value.formula) : "";
}

function book() {
  const wb = new ExcelJS.Workbook();
  const venta = wb.addWorksheet("Provincia Venta Diaria");
  wb.addWorksheet("Provincia Comisiones");
  const precio = wb.addWorksheet("PRECIO");
  const comprasWs = wb.addWorksheet("CONTROL DE COMPRAS");
  venta.getCell(1, 1).value = "DÍA";
  venta.getCell(1, 2).value = "Tehuacán";
  const channels = {
    Puebla: [8, 9],
    Tehuacán: [10, 11],
    Acapulco: [12, 13],
    Querétaro: [14, 15],
    "San Luis": [16, 17],
    Morelos: [18, 19],
  };
  for (const [name, cols] of Object.entries(channels)) {
    venta.getCell(1, cols[0]).value = `${name}\nCASA`;
    venta.getCell(1, cols[1]).value = `${name}\nCOMISIONISTA`;
  }
  comprasWs.getCell(4, 15).value = "CONSOLIDADO";
  comprasWs.getCell(5, 15).value = "COSTO KG";
  comprasWs.getCell(4, 36).value = "CONSOLIDADO";
  comprasWs.getCell(5, 36).value = "TARIFA";
  for (let day = 1; day <= 30; day += 1) {
    venta.getCell(day + 1, 1).value = day;
    venta.getCell(day + 1, 2).value = 40;
    venta.getCell(day + 1, 10).value = 14.114;
    venta.getCell(day + 1, 11).value = 25.642;
    for (const cols of Object.values(channels)) {
      if (cols[0] === 10) continue;
      venta.getCell(day + 1, cols[0]).value = 1.5;
      venta.getCell(day + 1, cols[1]).value = 2.25;
    }
    precio.getCell(day + 1, 1).value = new Date(Date.UTC(2026, 8, day));
    precio.getCell(day + 1, 2).value = 21;
    comprasWs.getCell(day + 5, 1).value = `${String(day).padStart(2, "0")}/09/2026`;
    comprasWs.getCell(day + 5, 15).value = 12;
    comprasWs.getCell(day + 5, 36).value = 1.2;
  }
  return { wb, venta, channels };
}

function fill(wb, code, human) {
  return igf.fillIgfDiarioPuebla(wb, {
    year: 2026,
    month: 9,
    sheetLabel: code,
    humanName: human,
    plantEquivalent: (label) => forecast.plantsEquivalent(label, code),
    corteYmd: "2026-09-25",
    corporativos: 1000,
    operativos: 2000,
  });
}

test("Tehuacán usa CASA + COMISIONISTA y no el total redondeado de 40", async () => {
  const { wb, venta } = book();
  const ws = fill(wb, "Tehuacan", "Tehuacán");
  const f = formula(ws.getCell(igfRow(26), 2));
  assert.match(f, /J27\+/);
  assert.match(f, /K27\)\*1000/);
  assert.match(f, /AND\(ISNUMBER\(/);
  assert.doesNotMatch(f, /!B27\*/);
  assert.equal(venta.getCell(27, 2).value, 40);
  assert.equal(venta.getCell(27, 10).value, 14.114);
  assert.equal(venta.getCell(27, 11).value, 25.642);
  assert.equal((14.114 + 25.642) * 1000, 39756);
  assert.notEqual(40 * 1000, 39756);
  assert.equal(typeof ws.getCell(igfRow(30), 2).value, "object");
  assert.match(formula(ws.getCell(45, 2)), /B41:B43/);

  const file = path.join(os.tmpdir(), "igf-051-tehuacan.xlsx");
  await wb.xlsx.writeFile(file);
  const again = new ExcelJS.Workbook();
  await again.xlsx.readFile(file);
  fs.unlinkSync(file);
  const re = again.getWorksheet("IGF Diario Tehuacan");
  assert.match(formula(re.getCell(igfRow(26), 2)), /J27\+.*K27\)\*1000/);
  assert.doesNotMatch(formula(re.getCell(igfRow(26), 2)), /!B27\*/);
});

test("cada planta localiza sus canales y Querétaro acepta el alias", () => {
  const { wb } = book();
  const cases = [
    ["Puebla", "Puebla", "H", "I"],
    ["Acapulco", "Acapulco", "L", "M"],
    ["Queretaro", "Querétaro", "N", "O"],
    ["San Luis", "San Luis", "P", "Q"],
    ["Morelos", "Morelos", "R", "S"],
  ];
  for (const [code, human, casa, com] of cases) {
    const ws = fill(wb, code, human);
    const f = formula(ws.getCell(igfRow(26), 2));
    assert.match(f, new RegExp(`${casa}27\\+.*${com}27\\)\\*1000`), human);
    assert.doesNotMatch(f, /!B27\*/, human);
  }
});

test("acceso_compras: defaults y overrides", () => {
  for (const rol of ["GG", "GO", "ZP", "DIR_ZP", "DIRZP", "DIRECTOR_ZP", "DZP", "DIRECTORZP", "DIR-ZP", "CF_CDMX", "CDMX", "AD"]) {
    assert.equal(permisos.permisosPorRol(rol).acceso_compras, true, rol);
  }
  for (const rol of ["GA", "GV", "SG", "SEH", "XX"]) {
    assert.equal(permisos.permisosPorRol(rol).acceso_compras, false, rol);
  }
  assert.equal(permisos.permisosEfectivos("GG", { acceso_compras: false }).acceso_compras, false);
  assert.equal(permisos.permisosEfectivos("GV", { acceso_compras: true }).acceso_compras, true);
  assert.equal(permisos.permisosEfectivos("GA", null).acceso_compras, false);
  assert.equal(permisos.PERMISOS_CATALOGO.some((p) => p.clave === "acceso_compras" && p.etiqueta === "Acceso a Compras"), true);
  assert.equal(permisos.permisosPorRol("DZC").acceso_compras, false);
  assert.equal(permisos.permisosPorRol("AZP").acceso_compras, false);
});

test("el JWT de WhatsApp incluye solo acceso_compras además de los overrides", () => {
  const gg = permisos.permisosParaTokenDashboard("GG", { rol_clave: "GG" });
  assert.deepEqual(gg, { acceso_compras: true });
  const goComoGg = permisos.permisosParaTokenDashboard("GG", { rol_clave: "GO" });
  assert.equal(goComoGg.acceso_compras, true);
  const sgComoGg = permisos.permisosParaTokenDashboard("GG", { rol_clave: "SG" });
  assert.equal(sgComoGg.acceso_compras, false);
  const quitado = permisos.permisosParaTokenDashboard("GG", { rol_clave: "GG", permisos_json: { acceso_compras: false } });
  assert.equal(quitado.acceso_compras, false);
  const token = createDashboardToken({
    role: "GG",
    actor_id: 7,
    plantas_permitidas: [1],
    permisos: gg,
  });
  const full = createDashboardToken({
    role: "GG",
    actor_id: 7,
    plantas_permitidas: [1],
    permisos: permisos.permisosPorRol("GG"),
  });
  const encoded = encodeDashboardTokenForWhatsAppUrl(token);
  assert.ok(encoded.length < 900, `token largo: ${encoded.length}`);
  assert.ok(encoded.length < encodeDashboardTokenForWhatsAppUrl(full).length);
  const payload = verifyDashboardToken(token);
  assert.equal(payload.permisos.acceso_compras, true);
  assert.equal(Object.keys(payload.permisos).length, 1);
  assert.equal(payload.exp - payload.iat, 20 * 60 * 60);
});

function matchPath(pattern, pathname) {
  const a = pattern.split("/").filter(Boolean);
  const b = pathname.split("/").filter(Boolean);
  if (a.length !== b.length) return false;
  return a.every((part, i) => part.startsWith(":") || part === b[i]);
}

function fakeApp() {
  const routes = [];
  const add = (method) => (routePath, ...handlers) => routes.push({ method, path: routePath, handlers });
  return {
    get: add("GET"),
    post: add("POST"),
    patch: add("PATCH"),
    delete: add("DELETE"),
    async invoke(method, url, { query = {}, body = {}, auth = { actor_id: 1, plantas_permitidas: [1] } } = {}) {
      const [pathname] = url.split("?");
      const hit = routes.find((r) => r.method === method && matchPath(r.path, pathname));
      if (!hit) throw new Error(`no route ${method} ${pathname}`);
      const req = { query, body, params: {}, dashboardAuth: auth };
      let status = 200;
      let payload;
      const res = {
        status(c) { status = c; return this; },
        json(p) { payload = p; return this; },
        send() { return this; },
        setHeader() {},
      };
      for (const h of hit.handlers) {
        let nexted = false;
        await h(req, res, () => { nexted = true; });
        if (!nexted) break;
      }
      return { status, payload };
    },
  };
}

function mount() {
  const app = fakeApp();
  compras.registerComprasRoutes(app, {
    pool: { async connect() { return { query: async () => ({ rows: [{ nombre: "Puebla" }] }), release() {} }; } },
    dashboardAuthMiddleware: (_req, _res, next) => next(),
    assertPlantaAccess: (req, plantaId) => (req.dashboardAuth.plantas_permitidas || []).includes(Number(plantaId)),
    uploadPdfToS3: async () => {},
    getBufferFromS3: async () => Buffer.from("%PDF"),
    deleteFromS3: async () => {},
    s3Enabled: () => false,
  });
  return app;
}

test("sin acceso_compras todas las rutas de compras responden 403", async () => {
  const app = mount();
  const calls = [
    ["GET", "/api/compras", { query: { planta_id: "1", year: "2026", month: "9" } }],
    ["POST", "/api/compras", { body: { planta_id: 1 } }],
    ["PATCH", "/api/compras/4", { body: { planta_id: 1, kg: 1 } }],
    ["DELETE", "/api/compras/4", { query: { planta_id: "1" } }],
    ["GET", "/api/compras/excel", { query: { planta_id: "1", year: "2026", month: "9" } }],
    ["POST", "/api/compras/4/factura", { body: { planta_id: 1, fileBase64: "JVBERi0=", file_name: "a.pdf" } }],
  ];
  for (const [method, url, extra] of calls) {
    const res = await app.invoke(method, url, extra);
    assert.equal(res.status, 403, `${method} ${url}`);
    assert.equal(res.payload.error, "No tienes permiso de Compras.");
  }
});

test("con permiso la planta ajena sigue en 403 y la propia no es el rechazo de permiso", async () => {
  const app = mount();
  const other = await app.invoke("GET", "/api/compras", {
    query: { planta_id: "2", year: "2026", month: "9" },
    auth: { actor_id: 3, plantas_permitidas: [1], permisos: { acceso_compras: true }, role: "GG" },
  });
  assert.equal(other.status, 403);
  assert.equal(other.payload.error, compras.USER_ERRORS.PLANT);

  const own = await app.invoke("GET", "/api/compras/proveedores", {
    query: { planta_id: "1" },
    auth: { actor_id: 3, plantas_permitidas: [1], permisos: { acceso_compras: true }, role: "GG" },
  });
  assert.notEqual(own.payload && own.payload.error, "No tienes permiso de Compras.");
  assert.notEqual(own.status, 403);
});

test("comprasT exacto, planta, global, denegación y nivel 6", () => {
  assert.equal(compras.isExactComprasT("comprasT"), true);
  assert.equal(compras.isExactComprasT("ComprasT"), true);
  assert.equal(compras.isExactComprasT("COMPRast"), true);
  assert.equal(compras.isExactComprasT("comprasTotal"), false);
  assert.equal(compras.isExactComprasT("miscomprasT"), false);
  assert.equal(compras.isExactComprasT("compras T"), false);

  assert.equal(compras.comprasTDenyText(null), "No estás dado de alta. Contacta al administrador.");
  assert.equal(compras.comprasTDenyText({ rol_clave: "GV" }), "⛔ No tienes permiso de Compras.");

  const gg = { rol_clave: "GG", planta_id: 11, rol_nombre: "Gerente General" };
  assert.equal(compras.comprasActorIsGlobal(gg), false);
  assert.equal(compras.comprasPlantaIdForLink(gg, 1), 1);
  const ggLink = compras.appendComprasPlanta("https://dash.example/compras?t=abc", 1);
  assert.equal(ggLink, "https://dash.example/compras?t=abc&planta_id=1");
  assert.match(compras.comprasTSuccessText(ggLink), /🛒 Compras/);
  assert.match(compras.comprasTSuccessText(ggLink), /válido 20 horas/);
  assert.match(compras.comprasTSuccessText(ggLink), /planta_id=1/);

  const go = { rol_clave: "GO", planta_id: 2, rol_nombre: "Gerente Operaciones" };
  assert.equal(compras.comprasPlantaIdForLink(go, 2), 2);
  assert.equal(compras.nivel6CommandAllowed("GO", "comprasT"), true);
  assert.equal(compras.nivel6CommandAllowed("GO", "ComprasT"), true);
  assert.equal(compras.nivel6CommandAllowed("GO", "crear folio"), false);
  assert.equal(compras.nivel6CommandAllowed("SG", "comprasT"), false);
  assert.equal(compras.nivel6CommandAllowed("SEH", "COMPRast"), false);
  assert.equal(compras.nivel6CommandAllowed("SG", "AR"), true);
  assert.equal(compras.nivel6CommandAllowed("SEH", "DirectorIA"), true);

  const zp = { rol_clave: "ZP", planta_id: null, rol_nombre: "Director ZP" };
  const ad = { rol_clave: "AD", rol_nombre: "Asistente Dirección" };
  const cdmx = { rol_clave: "CF_CDMX", rol_nombre: "Contralor CDMX" };
  assert.equal(compras.comprasActorIsGlobal(zp), true);
  assert.equal(compras.comprasActorIsGlobal(ad), true);
  assert.equal(compras.comprasActorIsGlobal(cdmx), true);
  assert.equal(compras.comprasPlantaIdForLink(zp, null), null);
  assert.equal(compras.appendComprasPlanta("https://dash.example/compras?t=abc", null), "https://dash.example/compras?t=abc");

  const server = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
  assert.match(server, /isExactComprasT\(bodyForCmd\)/);
  assert.match(server, /nivel6CommandAllowed\(rolClaveRestr, bodyForCmd\)/);
  assert.match(server, /comprasTSuccessText\(link\)/);
});
