/**
 * Regresión: carga ARR de un mes no debe UPSERT fechas de meses anteriores
 * (bug Laynes Puebla: Notas con vencimiento viejo pisaban ene–may al subir junio).
 *
 *   node scripts/test-arr-load-month-guard.js
 */

"use strict";

const XLSX = require("xlsx");
const arrLoad = require("../lib/arr-load");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function excelSerial(ymd) {
  const [y, m, d] = ymd.split("-").map(Number);
  const utc = Date.UTC(y, m - 1, d);
  const epoch = Date.UTC(1899, 11, 30);
  return (utc - epoch) / 86400000;
}

function buildWorkbookBuffer() {
  const wb = XLSX.utils.book_new();

  const total = [
    ["Fecha", "Cliente", "Total kilos", "Comision $", "Comision acumulada $", "DIP $", "Descuento $"],
    [excelSerial("2026-06-10"), "Laynes", 1000, 50, 0, 0, 0],
    [excelSerial("2026-05-15"), "Laynes", 800, 40, 0, 0, 0],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(total), "Total");

  const notas = [
    ["Fecha de vencimiento", "Cliente", "Total firmado"],
    [excelSerial("2026-03-20"), "Laynes", 9999],
    [excelSerial("2026-06-12"), "Laynes", 100],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(notas), "Notas");

  const factura = [["Fecha", "Cliente", "Descuento"]];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(factura), "Factura");

  const ce = [["Fecha", "Cliente", "Comisión extraordinaria"]];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(ce), "Comision Extra");

  const cat = [
    ["Fecha", "Cliente", "Total kilos", "Comisionista", "sub canal com"],
    [excelSerial("2026-06-10"), "Laynes", 1000, false, ""],
    [excelSerial("2026-04-01"), "Laynes", 500, false, ""],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(cat), "Categoria");

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}

function makeMockClient() {
  const inserts = [];
  return {
    inserts,
    async query(sql, params) {
      const s = String(sql);
      if (s.includes("INSERT INTO")) {
        inserts.push({ sql: s, params: params || [] });
      }
      return { rows: [] };
    },
  };
}

async function main() {
  assert(arrLoad.inTargetMonth("2026-06-01", 2026, 6) === true, "inTargetMonth junio");
  assert(arrLoad.inTargetMonth("2026-03-20", 2026, 6) === false, "inTargetMonth marzo vs junio");

  const client = makeMockClient();
  const buf = buildWorkbookBuffer();
  const result = await arrLoad.loadArrFromBuffer(client, "Puebla", buf, {
    targetYear: 2026,
    targetMonth: 6,
    today: "2026-06-28",
  });

  assert(result.year === 2026 && result.month === 6, "mes objetivo junio");
  assert(result.skippedOutOfMonth.descuentos >= 1, "debe omitir nota de marzo");
  assert(result.skippedOutOfMonth.ventas >= 1, "debe omitir ventas fuera de junio");

  const descInserts = client.inserts.filter((i) => i.sql.includes("descuentos_diarios_cliente"));
  const ventasInserts = client.inserts.filter((i) => i.sql.includes("ventas_diarias_cliente"));

  for (const row of descInserts) {
    const fecha = String(row.params[1]);
    assert(fecha.startsWith("2026-06"), `descuento insertado fuera de junio: ${fecha}`);
  }
  for (const row of ventasInserts) {
    const fecha = String(row.params[1]);
    assert(fecha.startsWith("2026-06"), `venta insertada fuera de junio: ${fecha}`);
  }

  const laynesJunDesc = descInserts.filter((i) => String(i.params[2]).includes("LAYNES"));
  assert(laynesJunDesc.length >= 1, "debe insertar descuento Laynes de junio");
  assert(
    !descInserts.some((i) => String(i.params[1]).startsWith("2026-03")),
    "no debe insertar nota marzo (9999) que pisaría histórico"
  );

  console.log("OK test-arr-load-month-guard");
  console.log(JSON.stringify({ result, descInserts: descInserts.length, ventasInserts: ventasInserts.length }, null, 2));
}

main().catch((e) => {
  console.error("FAIL", e.message);
  process.exit(1);
});
