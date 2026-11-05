"use client";
import { useEffect, useState } from "react";
import { getApiUrl, type IgfDiarioSemanalMetrics, type IgfDiarioSemanalCoverageMap } from "@/lib/api";
import { WEEKLY_ROWS, coverageLines, fmtFecha, fmtValue, tone } from "@/lib/igf-diario-weekly-rows";

export type Timeframe = "days" | "weeks" | "months";
export function IgfTimeframeControl({value,onChange}:{value:Timeframe;onChange:(value:Timeframe)=>void}){
 return <label className="flex items-center gap-2 text-sm text-slate-200">Marco de tiempo
  <select aria-label="Marco de tiempo" value={value} onChange={e=>onChange(e.target.value as Timeframe)} className="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-white">
   <option value="days">Días de la semana</option><option value="weeks">Por semanas</option><option value="months">Por mes</option>
  </select></label>;
}
type Column={key:string;label:string;fecha_desde:string;fecha_hasta:string;estado:string;complete:boolean;metrics:IgfDiarioSemanalMetrics & Record<string,number|null>;coverage:IgfDiarioSemanalCoverageMap;forecast_sources?:{empresa:string;version_id:number;version_number:number;fields:string[]}[]};
const MONTHS=["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
function firstWeekStart(year:number,month:number){const date=new Date(Date.UTC(year,month-1,1));date.setUTCDate(date.getUTCDate()-date.getUTCDay());return date.toISOString().slice(0,10);}
function shiftWeekStart(anchor:string,days:number){const date=new Date(`${anchor}T00:00:00Z`);date.setUTCDate(date.getUTCDate()+days);return date.toISOString().slice(0,10);}
export default function IgfDiarioPeriodPanel({token,year,month,plantCode,uploadDay,versionAsOfCorte,mode,refreshKey=0}:{
 token:string;year:number;month:number;plantCode?:string;uploadDay?:string|null;versionAsOfCorte?:boolean;mode:"weeks"|"months";refreshKey?:number;
}){
 const [first,setFirst]=useState(Math.max(1,month-3));
 const [weekStart,setWeekStart]=useState<string|null>(null);
 const initialWeekStart=firstWeekStart(year,month),currentWeekStart=weekStart??initialWeekStart;
 const [source,setSource]=useState<"igf_diario"|"forecast">("igf_diario");
 const selectedSource=mode==="months"?source:"igf_diario";
 const [columns,setColumns]=useState<Column[]>([]),[loading,setLoading]=useState(false),[error,setError]=useState<string|null>(null);
 useEffect(()=>setFirst(Math.max(1,month-3)),[year,month]);
 useEffect(()=>setWeekStart(null),[year,month,plantCode,uploadDay]);
 useEffect(()=>{
  const controller=new AbortController();setLoading(true);setError(null);setColumns([]);
  const params=new URLSearchParams({year:String(year),month:String(month),view:"periods",period_mode:mode,first_month:String(Math.min(first,month))});
  params.set("source",selectedSource);
  if(mode==="weeks"&&weekStart)params.set("period_week_start",weekStart);
  if(plantCode)params.set("plant_code",plantCode);else params.set("todas","1");
  if(uploadDay){params.set("upload_day",uploadDay);if(versionAsOfCorte)params.set("version_as_of_corte","1");}
  fetch(getApiUrl(`/api/dashboard/igf-diario-semanal?${params}`),{headers:{Authorization:`Bearer ${token}`},signal:controller.signal})
   .then(async r=>{const body=await r.json();if(!r.ok)throw new Error(body.error||"No se pudieron cargar los periodos");return body;})
   .then(body=>{if(!controller.signal.aborted)setColumns(body.columns||[]);})
   .catch(e=>{if(!controller.signal.aborted)setError(e.message);})
   .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
  return()=>controller.abort();
 },[token,year,month,plantCode,uploadDay,versionAsOfCorte,mode,first,refreshKey,selectedSource,weekStart]);
 const forecastRows = columns.some(c=>c.forecast_sources?.length) ? [
  {key:"gasto_operativo_forecast_kg",label:"Gasto operativo · IGF Forecast",unit:"per_kg" as const,separatorBefore:true},
  {key:"bancos_planta_forecast_kg",label:"Bancos Planta · IGF Forecast",unit:"per_kg" as const},
  {key:"util_oper_forecast_kg",label:"Utilidad de Operación · IGF Forecast",unit:"per_kg" as const},
 ] : [];
 const forecastKeys=["venta_kg","margen_kg","gasto_corporativo_kg","inversiones_kg","impuestos_federales_kg","provisiones_planta_kg","hg_mxn","com_desc_kg","resultado_kg","resultado_mxn"];
 const rows: {key:string;label:string;unit:"kg"|"mxn"|"per_kg";highlight?:boolean;strongest?:boolean;separatorBefore?:boolean}[]=selectedSource==="forecast"?[...WEEKLY_ROWS.filter(r=>forecastKeys.includes(r.key)),...forecastRows]:WEEKLY_ROWS;
 return <div className="mt-3">
  <div className="mb-3 flex flex-wrap items-center gap-3 text-sm text-slate-300">
   {mode==="weeks"&&<><button type="button" disabled={loading} onClick={()=>setWeekStart(shiftWeekStart(currentWeekStart,-7))} className="rounded bg-slate-700 px-3 py-2 text-white disabled:opacity-40">◀ Semana anterior</button><button type="button" disabled={loading||currentWeekStart>=initialWeekStart} onClick={()=>{const next=shiftWeekStart(currentWeekStart,7);setWeekStart(next>=initialWeekStart?null:next);}} className="rounded bg-slate-700 px-3 py-2 text-white disabled:opacity-40">Semana siguiente ▶</button>{weekStart&&<button type="button" disabled={loading} onClick={()=>setWeekStart(null)} className="text-cyan-300 underline">Volver al mes seleccionado</button>}</>}
   {mode==="months"?<label>Fuente del resultado <select aria-label="Fuente del resultado" value={source} onChange={e=>setSource(e.target.value as "igf_diario"|"forecast")} className="ml-2 rounded border border-slate-600 bg-slate-800 px-3 py-2 text-white"><option value="igf_diario">IGF Diario acumulado</option><option value="forecast">IGF Forecast</option></select></label>:<span>Fuente: IGF Diario acumulado</span>}
   {mode==="months"?<label>Mes inicial <select aria-label="Mes inicial" value={Math.min(first,month)} onChange={e=>setFirst(Number(e.target.value))} className="ml-2 rounded bg-slate-700 px-3 py-2 text-white">{MONTHS.slice(0,month).map((name,i)=><option key={name} value={i+1}>{name} {year}</option>)}</select> · Hasta {MONTHS[month-1]} {year}</label>:<span>Semanas completas de domingo a sábado · {columns.length?`${fmtFecha(columns[0].fecha_desde)}–${fmtFecha(columns[columns.length-1].fecha_hasta)}`:`${MONTHS[month-1]} ${year}`}</span>}
   <span>Importes sumados; valores por kilo ponderados. Corte: {uploadDay?fmtFecha(uploadDay):"sin corte"}.</span>
  </div>
  {loading&&<p role="status" className="text-slate-400">Cargando periodos…</p>}
  {error&&<p role="alert" className="text-red-300">{error}</p>}
  <p className="mb-3 text-xs text-sky-200">{selectedSource==="forecast"?"IGF Forecast: versión cargada de cada mes, respetando la opción Versión ≤ corte. No se mezcla con cifras diarias ni se inventa precio, costo, flete o desglose de nómina/IMSS; se muestran los conceptos disponibles en esta fuente.":"IGF Diario acumulado: datos diarios de cada periodo, con la proyección vigente del mes seleccionado. Los meses anteriores conservan sus capturas reales. No se reemplazan datos faltantes por IGF Forecast ni por cero."}</p>
  {columns.length>0&&<div className="overflow-x-auto rounded border border-slate-700"><table className="w-full min-w-[800px] border-separate border-spacing-0 text-sm">
   <thead><tr className="bg-slate-900 text-slate-200"><th className="sticky left-0 z-10 min-w-[220px] bg-slate-900 p-3 text-left">Concepto</th>{columns.map(c=><th key={c.key} className="min-w-[150px] p-3 text-right"><div>{c.label}</div><div className="text-xs font-normal text-slate-400">{fmtFecha(c.fecha_desde)}–{fmtFecha(c.fecha_hasta)}</div>{selectedSource==="forecast"?<div className="text-xs text-sky-300">{c.forecast_sources?.length?`IGF Forecast · v${c.forecast_sources[0].version_number}`:"Sin versión disponible al corte"}</div>:<><div className="text-xs uppercase">{c.estado}{!c.complete?" · Incompleta":""}</div><div className="text-xs text-sky-300">IGF Diario acumulado</div></>}</th>)}</tr></thead>
   <tbody>{rows.map(row=><tr key={row.key} className={row.highlight?"bg-amber-950/25":""}><th className={`sticky left-0 bg-slate-800 p-3 text-left font-medium text-slate-100 ${row.separatorBefore?"border-t-4 border-slate-400":"border-t border-slate-700"}`}>{row.label}</th>{columns.map(c=><td key={c.key} className={`p-3 text-right tabular-nums ${tone(row.key,c.metrics[row.key])} ${row.separatorBefore?"border-t-4 border-slate-400":"border-t border-slate-700"} ${row.strongest?"font-semibold":""}`}>{fmtValue(c.metrics[row.key],row.unit)}{c.forecast_sources?.some(source=>source.fields.includes(row.key))&&<span title="Fuente: IGF Forecast histórico" className="ml-1 text-sky-300">*</span>}</td>)}</tr>)}</tbody>
  </table></div>}
  {columns.map(c=>coverageLines(c.coverage).map(line=><p key={`${c.key}:${line}`} className="mt-2 text-xs text-amber-200">{c.label}: {line}</p>))}
 </div>;
}
