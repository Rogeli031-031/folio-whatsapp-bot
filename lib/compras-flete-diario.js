"use strict";
const ENSURE_SQL = `CREATE TABLE IF NOT EXISTS arr.compras_flete_diario (
  planta_id INT NOT NULL REFERENCES public.plantas(id),
  proveedor_id INT NOT NULL REFERENCES arr.compras_proveedores(id),
  fecha DATE NOT NULL,
  tarifa NUMERIC(14,6) NOT NULL CHECK (tarifa >= 0),
  updated_by_usuario_id INT NULL REFERENCES public.usuarios(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (planta_id, proveedor_id, fecha)
)`;
const ymd = v => v instanceof Date ? v.toISOString().slice(0,10) : String(v || "").slice(0,10);
const key = (provider, date) => `${Number(provider)}|${ymd(date)}`;
function index(rows) { return new Map((rows||[]).map(row=>[key(row.proveedor_id,row.fecha),Number(row.tarifa)])); }
function effective(map,provider,date,fallback) { return map.has(key(provider,date)) ? map.get(key(provider,date)) : fallback; }
function parse(body) {
  const proveedor_id=Number(body?.proveedor_id),fecha=body?.fecha,tarifa=body?.tarifa;
  if(!Number.isInteger(proveedor_id)||proveedor_id<=0)return{ok:false,error:"Proveedor inválido"};
  if(typeof fecha!=="string"||!/^20\d{2}-\d{2}-\d{2}$/.test(fecha)||!Number.isFinite(Date.parse(fecha))||new Date(`${fecha}T00:00:00Z`).toISOString().slice(0,10)!==fecha)return{ok:false,error:"Fecha inválida"};
  if(tarifa!==null&&(typeof tarifa!=="number"||!Number.isFinite(tarifa)||tarifa<0||tarifa>99999999))return{ok:false,error:"Flete inválido"};
  return{ok:true,proveedor_id,fecha,tarifa:tarifa===null?null:Math.round(tarifa*1e6)/1e6};
}
async function load(client,plant,from=null,to=null) {
  const probe=await client.query("SELECT to_regclass('arr.compras_flete_diario') AS flete_diario");
  if(!probe.rows?.[0]?.flete_diario)return[];
  const result=await client.query(`SELECT proveedor_id,fecha,tarifa FROM arr.compras_flete_diario
    WHERE planta_id=$1 AND ($2::date IS NULL OR fecha >= $2::date) AND ($3::date IS NULL OR fecha <= $3::date)
    ORDER BY fecha,proveedor_id`,[plant,from,to]);
  return(result.rows||[]).map(row=>({...row,fecha:ymd(row.fecha),proveedor_id:Number(row.proveedor_id),tarifa:Number(row.tarifa)}));
}
async function save(client,plant,spec,actor) {
  if(spec.tarifa===null)await client.query("DELETE FROM arr.compras_flete_diario WHERE planta_id=$1 AND proveedor_id=$2 AND fecha=$3::date",[plant,spec.proveedor_id,spec.fecha]);
  else await client.query(`INSERT INTO arr.compras_flete_diario (planta_id,proveedor_id,fecha,tarifa,updated_by_usuario_id)
    VALUES ($1,$2,$3::date,$4,$5) ON CONFLICT (planta_id,proveedor_id,fecha) DO UPDATE
    SET tarifa=EXCLUDED.tarifa,updated_by_usuario_id=EXCLUDED.updated_by_usuario_id,updated_at=now()`,[plant,spec.proveedor_id,spec.fecha,spec.tarifa,actor||null]);
  return{ok:true,...spec,restored:spec.tarifa===null};
}
module.exports={ENSURE_SQL,index,effective,parse,load,save};
