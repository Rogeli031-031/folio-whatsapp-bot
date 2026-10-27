"use strict";
const XLSX=require("xlsx"),crypto=require("node:crypto");
const daily=require("./compras-flete-diario");
const normalize=v=>String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase().trim().replace(/\s+/g," ");
const COLUMNS={"PEMEX TUXPAN":"TUXPAN PEMEX","TOMZA TUXPAN":"TUXPAN IMPOR.","TOMZA TEPEJI":"TEPEJI PEMEX"};
function fail(message,status=400){const e=new Error(message);e.status=status;throw e;}
function validDate(v){return typeof v==="string"&&/^20\d{2}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(`${v}T00:00:00Z`).toISOString().slice(0,10)===v;}
function parseRequest(body){
 const provider=Number(body.proveedor_id),from=body.desde,to=body.hasta;
 if(!Number.isInteger(provider)||provider<=0)fail("Selecciona un proveedor válido");
 if(!validDate(from)||!validDate(to)||from>to||(Date.parse(to)-Date.parse(from))/86400000>365)fail("Selecciona una ventana de fechas válida de hasta un año");
 const text=body.file_base64;
 if(typeof text!=="string"||!text||text.length>7*1024*1024||!/^[A-Za-z0-9+/]+={0,2}$/.test(text))fail("Selecciona un archivo Excel válido de hasta 5 MB");
 const buffer=Buffer.from(text,"base64");if(!buffer.length||buffer.length>5*1024*1024)fail("El archivo excede 5 MB");
 return{proveedor_id:provider,from,to,buffer};
}
function cellDate(cell){
 if(!cell||cell.t==="e")return null;
 if(typeof cell.v==="number"){
  const date=XLSX.SSF.parse_date_code(cell.v);if(!date||date.H||date.M||date.S)return null;
  const key=`${date.y}-${String(date.m).padStart(2,"0")}-${String(date.d).padStart(2,"0")}`;
  return validDate(key)?key:null;
 }
 return validDate(cell.v)?cell.v:null;
}
function parseWorkbook(buffer,provider,from,to){
 const label=COLUMNS[normalize(provider)];if(!label)fail("Este proveedor no tiene una columna de flete reconocida en DatosPlanta");
 let wb;try{wb=XLSX.read(buffer,{type:"buffer",sheetRows:5000});}catch{fail("No se pudo leer el Excel");}
 if(wb.Workbook?.WBProps?.date1904)fail("Convierte el archivo al calendario estándar de Excel");
 const sheet=wb.Sheets.DatosPlanta;if(!sheet?.["!ref"])fail("El archivo no contiene la hoja DatosPlanta");
 const range=XLSX.utils.decode_range(sheet["!ref"]);if(range.e.r>=4999||range.e.c>200)fail("DatosPlanta excede el tamaño permitido");
 const at=(r,c)=>sheet[XLSX.utils.encode_cell({r,c})];
 let heading=null;
 for(let r=0;r<=Math.min(range.e.r,20);r++)for(let c=0;c<=range.e.c;c++)if(normalize(at(r,c)?.v)==="FLETE (TARIFA)"){
  if(heading)fail("Hay más de un bloque FLETE (TARIFA) en DatosPlanta");
  const cols=[];for(let j=c;j<=Math.min(c+2,range.e.c);j++)if(normalize(at(r+1,j)?.v)===label)cols.push(j);
  const dates=[];for(let j=0;j<=range.e.c;j++)if(normalize(at(r+1,j)?.v)==="FECHA")dates.push(j);
  if(cols.length!==1||dates.length!==1)fail("No se pudo identificar una sola fecha y columna de flete del proveedor");
  heading={row:r+1,date:dates[0],rate:cols[0]};
 }
 if(!heading)fail("No se encontró el bloque FLETE (TARIFA) de DatosPlanta");
 const rows=new Map();
 for(let r=heading.row+1;r<=range.e.r;r++){
  const date=cellDate(at(r,heading.date));if(!date){if(at(r,heading.rate)?.v!=null)fail(`Fecha inválida en DatosPlanta, fila ${r+1}`);continue;}
  if(date<from||date>to)continue;
  if(rows.has(date))fail(`Fecha duplicada: ${date}`);
  const cell=at(r,heading.rate),address=XLSX.utils.encode_cell({r,c:heading.rate});
  if(!cell||cell.t==="e"||typeof cell.v!=="number"||!Number.isFinite(cell.v)||cell.v<0||cell.v>99999999)fail(`Flete vacío o inválido en DatosPlanta!${address}. Recalcula y guarda el Excel si contiene fórmulas.`);
  rows.set(date,Math.round(cell.v*1e6)/1e6);
 }
 for(let d=new Date(`${from}T00:00:00Z`);d.toISOString().slice(0,10)<=to;d.setUTCDate(d.getUTCDate()+1))if(!rows.has(d.toISOString().slice(0,10)))fail(`Falta la fecha ${d.toISOString().slice(0,10)} en DatosPlanta`);
 return[...rows].sort(([a],[b])=>a.localeCompare(b)).map(([fecha,tarifa])=>({fecha,tarifa}));
}
async function preview(client,spec){
 const dailyRows=await daily.load(client,spec.planta_id,spec.from,spec.to);
 const monthly=await client.query(`SELECT year,month,tarifa FROM arr.compras_flete_tarifas WHERE planta_id=$1 AND proveedor_id=$2
   AND year*100+month BETWEEN $3 AND $4 ORDER BY year,month`,[spec.planta_id,spec.proveedor_id,Number(spec.from.slice(0,7).replace("-","")),Number(spec.to.slice(0,7).replace("-",""))]);
 const own=new Map(dailyRows.filter(r=>r.proveedor_id===spec.proveedor_id).map(r=>[r.fecha,r.tarifa]));
 const base=new Map((monthly.rows||[]).map(r=>[`${r.year}-${String(r.month).padStart(2,"0")}`,Number(r.tarifa)]));
 const rows=spec.rows.map(r=>({fecha:r.fecha,actual:own.has(r.fecha)?own.get(r.fecha):(base.get(r.fecha.slice(0,7))??null),nuevo:r.tarifa,origen:own.has(r.fecha)?"Manual":"Predeterminado"}));
 const preview_token=crypto.createHash("sha256").update(JSON.stringify({plant:spec.planta_id,provider:spec.proveedor_id,from:spec.from,to:spec.to,rows})).digest("hex");
 return{ok:true,proveedor_id:spec.proveedor_id,desde:spec.from,hasta:spec.to,rows,preview_token};
}
async function save(client,spec,expected,actor){
 if(typeof expected!=="string"||!/^[a-f0-9]{64}$/.test(expected))fail("Primero revisa la vista previa");
 await client.query("BEGIN");
 try{
  await client.query("SELECT pg_advisory_xact_lock(hashtext($1))",[`compras-flete:${spec.planta_id}:${spec.proveedor_id}`]);
  const current=await preview(client,spec);
  if(current.preview_token!==expected)fail("El flete cambió desde la vista previa. Vuelve a revisar el Excel.",409);
  for(const row of spec.rows)await daily.save(client,spec.planta_id,{proveedor_id:spec.proveedor_id,...row},actor);
  await client.query("COMMIT");return{ok:true,updated:spec.rows.length,rows:spec.rows};
 }catch(error){try{await client.query("ROLLBACK");}catch(rollbackError){error.rollbackError=rollbackError;}throw error;}
}
function allProviders(buffer,providers,from,to){
 const groups=Object.keys(COLUMNS).map(name=>{
  const matches=providers.filter(p=>normalize(p.nombre)===name);
  if(matches.length!==1)fail(`Debe existir un solo proveedor ${name} en esta planta`);
  const provider=matches[0];
  return{proveedor_id:Number(provider.id),nombre:provider.nombre,rows:parseWorkbook(buffer,name,from,to)};
 });
 return groups.sort((a,b)=>a.proveedor_id-b.proveedor_id);
}
async function previewAll(client,spec){
 const rows=[];
 for(const provider of spec.providers){
  const current=await preview(client,{...spec,...provider});
  rows.push(...current.rows.map(row=>({...row,proveedor_id:provider.proveedor_id,proveedor:provider.nombre})));
 }
 const preview_token=crypto.createHash("sha256").update(JSON.stringify({plant:spec.planta_id,from:spec.from,to:spec.to,rows})).digest("hex");
 return{ok:true,rows,preview_token};
}
async function saveAll(client,spec,expected,actor){
 if(typeof expected!=="string"||!/^[a-f0-9]{64}$/.test(expected))fail("Primero revisa la vista previa");
 await client.query("BEGIN");
 try{
  for(const provider of [...spec.providers].sort((a,b)=>a.proveedor_id-b.proveedor_id))
   await client.query("SELECT pg_advisory_xact_lock(hashtext($1))",[`compras-flete:${spec.planta_id}:${provider.proveedor_id}`]);
  const current=await previewAll(client,spec);
  if(current.preview_token!==expected)fail("El flete cambió desde la vista previa. Vuelve a revisar el Excel.",409);
  const rows=[];
  for(const provider of spec.providers)for(const row of provider.rows){
   await daily.save(client,spec.planta_id,{proveedor_id:provider.proveedor_id,...row},actor);
   rows.push({...row,proveedor_id:provider.proveedor_id});
  }
  await client.query("COMMIT");return{ok:true,updated:rows.length,rows};
 }catch(error){try{await client.query("ROLLBACK");}catch(rollbackError){error.rollbackError=rollbackError;}throw error;}
}
module.exports={COLUMNS,parseRequest,parseWorkbook,preview,save,allProviders,previewAll,saveAll};
