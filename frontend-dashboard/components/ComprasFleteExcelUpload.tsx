"use client";
import {useEffect,useRef,useState} from "react";
import {importComprasFleteExcel,type ComprasFleteExcelPreview} from "@/lib/api";

export default function ComprasFleteExcelUpload({token,plantaId,proveedorId,nombre,year,month,disabled,onBusy,onOpen,onImported}:{
 token:string;plantaId:number;proveedorId:number;nombre:string;year:number;month:number;disabled:boolean;
 onBusy:(busy:boolean)=>void;onOpen:(open:boolean)=>void;onImported:(rows:{fecha:string;tarifa:number}[])=>Promise<void>;
}){
 const first=`${year}-${String(month).padStart(2,"0")}-01`,last=`${year}-${String(month).padStart(2,"0")}-${new Date(year,month,0).getDate()}`;
 const [open,setOpen]=useState(false),[from,setFrom]=useState(first),[to,setTo]=useState(last),[file,setFile]=useState<File|null>(null);
 const [preview,setPreview]=useState<ComprasFleteExcelPreview|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState<string|null>(null);
 const lock=useRef(false),alive=useRef(true);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 const invalidate=()=>{setPreview(null);setError(null);};
 async function run(action:"preview"|"save"){
  if(lock.current||disabled||!file)return;
  lock.current=true;setBusy(true);onBusy(true);setError(null);
  try{
   if(!/\.xlsx$/i.test(file.name)||file.size>5*1024*1024)throw new Error("Selecciona un archivo .xlsx de hasta 5 MB");
   const base64=await new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(",")[1]);r.onerror=()=>reject(new Error("No se pudo leer el archivo"));r.readAsDataURL(file);});
   const result=await importComprasFleteExcel(token,plantaId,{proveedor_id:proveedorId,desde:from,hasta:to,file_base64:base64,action,preview_token:action==="save"?preview?.preview_token:undefined});
   if(!alive.current)return;
   if(action==="preview")setPreview(result);
   else{
    await onImported(result.rows.map(row=>({fecha:row.fecha,tarifa:row.tarifa!})));
    if(!alive.current)return;
    setPreview(null);setFile(null);setOpen(false);onOpen(false);
   }
  }catch(e){if(alive.current){setError(e instanceof Error?e.message:"No se pudo importar el flete");setPreview(null);}}
  finally{lock.current=false;if(alive.current){setBusy(false);onBusy(false);}}
 }
 const input="mt-1 w-full rounded border border-slate-500 bg-slate-800 p-2 text-white disabled:opacity-50";
 const rate=(n:number|null|undefined)=>n==null?"Sin valor":n.toLocaleString("es-MX",{maximumFractionDigits:6});
 return <div className="mb-3 min-h-0 overflow-y-auto text-sm">
  <button type="button" disabled={busy||disabled} className="rounded bg-sky-700 px-3 py-2 disabled:opacity-50" onClick={()=>{const next=!open;setOpen(next);onOpen(next);invalidate();}}>Subir Excel de fletes</button>
  {open&&<div className="mt-3 rounded border border-slate-600 p-3">
   <p className="mb-2 text-slate-300">Hoja DatosPlanta · {nombre}. Solo se reemplazarán las fechas elegidas. Los ceros explícitos también se importan. Se guardan seis decimales. Comprueba que el Excel corresponde a esta planta y está recalculado y guardado.</p>
   <label>Archivo Excel<input type="file" accept=".xlsx" disabled={busy} className={input} onChange={e=>{setFile(e.target.files?.[0]||null);invalidate();}}/></label>
   <div className="my-2 grid grid-cols-2 gap-2"><label>Desde<input type="date" min={first} max={last} value={from} disabled={busy} className={input} onChange={e=>{setFrom(e.target.value);invalidate();}}/></label><label>Hasta<input type="date" min={from||first} max={last} value={to} disabled={busy} className={input} onChange={e=>{setTo(e.target.value);invalidate();}}/></label></div>
   {error&&<p role="alert" className="my-2 text-red-300">{error}</p>}
   {preview&&<div className="my-2"><p className="mb-1 font-semibold">Vista previa · {preview.rows.length} fechas · $/kg</p><div className="max-h-48 overflow-auto"><table className="w-full"><thead className="sticky top-0 bg-slate-800"><tr><th className="p-2 text-left">Fecha</th><th className="p-2 text-right">Actual</th><th className="p-2 text-right">Excel</th></tr></thead><tbody>{preview.rows.map(row=><tr key={row.fecha} className="border-t border-slate-700"><td className="p-2">{row.fecha}</td><td className="p-2 text-right">{rate(row.actual)}</td><td className="p-2 text-right font-semibold">{rate(row.nuevo)}</td></tr>)}</tbody></table></div></div>}
   <div className="mt-2 flex flex-wrap gap-2"><button type="button" disabled={busy||!file||!from||!to||from>to||from<first||to>last} className="rounded bg-sky-700 px-3 py-2 disabled:opacity-50" onClick={()=>void run("preview")}>{busy?"Procesando…":"Revisar Excel"}</button>{preview&&<button type="button" disabled={busy} className="rounded bg-emerald-700 px-3 py-2 disabled:opacity-50" onClick={()=>void run("save")}>Guardar fletes del Excel</button>}<button type="button" disabled={busy} className="rounded bg-slate-700 px-3 py-2 disabled:opacity-50" onClick={()=>{setOpen(false);onOpen(false);invalidate();}}>Cancelar carga</button></div>
  </div>}
 </div>;
}
