"use strict";

// Only the expression vocabulary emitted by the IGF export is accepted. Never eval
// workbook text as JavaScript; unknown formulas stop the export instead of becoming 0.
function workbookReader(workbook) {
  const cache = new Map();
  const active = new Set();
  const numeric = (v) => typeof v === "number" && Number.isFinite(v);
  const number = (v) => {
    if (v == null || v === "") return 0; // Excel arithmetic on blank references.
    if (!numeric(v)) throw new Error("Valor no numérico en fórmula IGF");
    return v;
  };
  function read(sheet, address) {
    const key = `${sheet}!${address.replace(/\$/g, "")}`;
    if (cache.has(key)) return cache.get(key);
    if (active.has(key)) throw new Error("Referencia circular en Excel IGF");
    const ws = workbook.getWorksheet(sheet);
    if (!ws) throw new Error(`Falta hoja de soporte: ${sheet}`);
    active.add(key);
    try {
      const cell = ws.getCell(address.replace(/\$/g, ""));
      const value = cell.value;
      let result = value;
      if (cell.formula) result = expression(sheet, cell.formula);
      else if (value && typeof value === "object" && !(value instanceof Date)) {
        if (value.error) throw new Error(`Error de Excel en ${key}`);
        if (value.richText) result = value.richText.map((part) => part.text).join("");
        else if (value.text != null) result = value.text;
        else throw new Error(`Celda no compatible: ${key}`);
      }
      if (typeof result === "number" && !Number.isFinite(result)) throw new Error(`Resultado no finito: ${key}`);
      cache.set(key, result);
      return result;
    } finally { active.delete(key); }
  }
  function expression(sheet, source) {
    const tokens = [];
    let rest = String(source).replace(/^=/, "");
    const pattern = /^(\s+|"(?:[^"]|"")*"|'(?:[^']|'')*'!\$?[A-Z]+\$?\d+|[A-Za-z_][\w.]*!\$?[A-Z]+\$?\d+|\$?[A-Z]+\$?\d+|(?:\d+(?:\.\d*)?|\.\d+)(?:[Ee][+-]?\d+)?|[A-Za-z_][\w.]*|<>|>=|<=|[()+\-*/=<>:,])/;
    while (rest) {
      const match = rest.match(pattern);
      if (!match) throw new Error("Fórmula de Excel no compatible con el anexo");
      if (match[0].trim()) tokens.push(match[0]);
      rest = rest.slice(match[0].length);
    }
    let pos = 0;
    const expect = (t) => { if (tokens[pos++] !== t) throw new Error("Fórmula IGF incompleta"); };
    const levels = { "=": 1, "<>": 1, "<": 1, ">": 1, "<=": 1, ">=": 1, "+": 2, "-": 2, "*": 3, "/": 3 };
    function atom() {
      const t = tokens[pos++];
      if (t === "(") { const a = parse(0); expect(")"); return a; }
      if (t === "+" || t === "-") { const a = atom(); return () => (t === "-" ? -1 : 1) * number(a()); }
      if (t?.startsWith('"')) return () => t.slice(1, -1).replace(/""/g, '"');
      if (/^(?:\d|\.\d)/.test(t || "")) return () => Number(t);
      if (/^(?:(?:'(?:[^']|'')*'|[A-Za-z_][\w.]*)!)?\$?[A-Z]+\$?\d+$/.test(t || "")) {
        const bang = t.lastIndexOf("!");
        const target = bang < 0 ? sheet : t.slice(0, bang).replace(/^'|'$/g, "").replace(/''/g, "'");
        const addr = t.slice(bang + 1);
        if (tokens[pos] === ":") {
          pos++;
          const end = tokens[pos++];
          if (!/^\$?[A-Z]+\$?\d+$/.test(end || "")) throw new Error("Rango IGF inválido");
          return () => {
            const ws = workbook.getWorksheet(target);
            if (!ws) throw new Error("Falta hoja de soporte IGF");
            const a = ws.getCell(addr.replace(/\$/g, "")), b = ws.getCell(end.replace(/\$/g, ""));
            if ((b.row - a.row + 1) * (b.col - a.col + 1) > 10000) throw new Error("Rango IGF demasiado grande");
            const values = [];
            for (let r = a.row; r <= b.row; r++) for (let c = a.col; c <= b.col; c++) values.push(read(target, ws.getCell(r, c).address));
            return values;
          };
        }
        return () => read(target, addr);
      }
      const name = String(t).toUpperCase();
      if (name === "TRUE" || name === "FALSE") return () => name === "TRUE";
      const supported = ["IF", "AND", "OR", "NOT", "ISNUMBER", "SUM", "COUNT", "ABS", "ROUND"];
      if (!supported.includes(name)) throw new Error(`Función de Excel no compatible: ${name}`);
      expect("(");
      const args = [];
      if (tokens[pos] !== ")") {
        do { if (args.length) expect(","); args.push(parse(0)); } while (tokens[pos] === ",");
      }
      expect(")");
      return () => {
        if (name === "IF") return args[0]() ? args[1]() : args[2] ? args[2]() : false;
        if (name === "AND") return args.every((a) => Boolean(a()));
        if (name === "OR") return args.some((a) => Boolean(a()));
        if (name === "NOT") return !args[0]();
        if (name === "ISNUMBER") return numeric(args[0]());
        if (name === "ABS") return Math.abs(number(args[0]()));
        if (name === "ROUND") { const factor = 10 ** number(args[1]()); const v = number(args[0]()); return Math.sign(v) * Math.round(Math.abs(v) * factor) / factor; }
        const values = args.flatMap((a) => a()).filter(numeric);
        return name === "COUNT" ? values.length : values.reduce((a, b) => a + b, 0);
      };
    }
    function parse(min) {
      let left = atom();
      while (levels[tokens[pos]] >= min) {
        const op = tokens[pos++], first = left, right = parse(levels[op] + 1);
        left = () => {
          const a = first(), b = right();
          if (op === "=") return a === b;
          if (op === "<>") return a !== b;
          if (op === "<") return a < b;
          if (op === ">") return a > b;
          if (op === "<=") return a <= b;
          if (op === ">=") return a >= b;
          const x = number(a), y = number(b);
          if (op === "+") return x + y;
          if (op === "-") return x - y;
          if (op === "*") return x * y;
          if (!y) throw new Error("División entre cero en Excel IGF");
          return x / y;
        };
      }
      return left;
    }
    const result = parse(0);
    if (pos !== tokens.length) throw new Error("Fórmula IGF no reconocida completamente");
    return result();
  }
  return read;
}

const DAILY_COLUMNS = Object.freeze([
  { col: "A", title: "FECHA", kind: "date", width: 58 },
  { col: "B", title: "VENTA KG", kind: "kg", width: 55 },
  { col: "H", title: "MARGEN BRUTO\n$/kg", kind: "rate", width: 52 },
  { col: "AD", title: "C&D\n$/kg", kind: "rate", width: 43 },
  { col: "Z", title: "HG\n$/kg", kind: "rate", width: 43 },
  { col: "M", title: "GASTOS CORPORATIVOS\n$/kg", kind: "rate", width: 63 },
  { col: "U", title: "GASTOS OPERATIVOS\n$/kg", kind: "rate", width: 59 },
  { col: "AF", title: "RESULTADO POR KG", kind: "rate", width: 57 },
  { col: "AG", title: "RESULTADO\n$", kind: "money", width: 64 },
  { col: "AI", title: "COMENTARIO DEL DÍA", kind: "text", width: 111 },
  { col: "AJ", title: "CLIENTES NUEVOS", kind: "text", width: 91 },
  { col: "AK", title: "DESCUENTOS", kind: "text", width: 90 },
]);

function extractDailyWorkbook(workbook, { year, month }) {
  const sheets = workbook.worksheets.filter((ws) => /^IGF Diario(?: |$)/i.test(ws.name) && !/Provincia/i.test(ws.name));
  if (sheets.length !== 1) throw new Error("El Excel debe contener una sola hoja IGF Diario de la planta seleccionada");
  const ws = sheets[0];
  // Older layouts use different letters: reject rather than silently export wrong data.
  for (const [col, label] of [["H", "MARGEN BRUTO"], ["AD", "C&D"], ["AF", "RESULTADO POR KG"], ["AG", "RESULTADO"], ["AI", "COMENTARIO DEL DIA"], ["AK", "DESCUENTOS"]]) {
    if (String(ws.getCell(`${col}5`).text).trim().toUpperCase() !== label) throw new Error("El formato de este Excel no corresponde a las columnas aprobadas del anexo IGF");
  }
  const read = workbookReader(workbook), rows = [];
  for (let r = 6; r <= ws.rowCount; r++) {
    const date = ws.getCell(`A${r}`).value;
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) continue;
    if (date.getUTCFullYear() !== year || date.getUTCMonth() + 1 !== month) continue;
    const values = DAILY_COLUMNS.map(({ col, kind }) => {
      const v = read(ws.name, `${col}${r}`);
      if (["kg", "rate", "money"].includes(kind) && v != null && v !== "" && !(typeof v === "number" && Number.isFinite(v))) throw new Error(`Valor no numérico en ${col}${r}`);
      return v instanceof Date ? v.toISOString().slice(0, 10) : v;
    });
    rows.push(values);
  }
  if (!rows.length) throw new Error("El Excel IGF no contiene fechas del mes seleccionado");
  return { sheet: ws.name, year, month, rows };
}

module.exports = { workbookReader, DAILY_COLUMNS, extractDailyWorkbook };
