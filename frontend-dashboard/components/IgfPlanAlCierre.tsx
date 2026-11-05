"use client";
import {useEffect,useMemo,useRef,useState} from "react";
import {getApiUrl} from "@/lib/api";
import {evaluatePlan,readPlanEdits} from "@/lib/igf-plan-al-cierre";

type Anchor={q:number;d:number;a:number;fixed:number;financials?:unknown;hg_kg?:number;hg_pct?:number;hg_price_kg?:number;version_as_of?:boolean};
type Change={rate:number|null;goal:number;selected:boolean};
type PlanRow=Change & {id:string;name:string;real:number;actual:number|null;base:number;continuity:number|null;minimum:number|null;gain:number|null;downside:number|null;reference:string|null;valid:boolean};
type Source={margin:number;rows:PlanRow[];revision:string;origin?:string;through?:string};
type Data={source:Source;edits:Record<string,Change>;version?:number;anchor?:Anchor;comments?:string};
type Props={year:number;month:number;plant:string;cutoff:string;mode:string;token:string;id?:string;anchor:Anchor|null;onSaved:(row:any)=>void};
const show=(v:number|null|undefined,digits=2)=>v==null||!Number.isFinite(v)?"—":v.toLocaleString("es-MX",{maximumFractionDigits:digits});
const amount=(v:number|null|undefined)=>v==null?"—":"$"+show(v,0);
const fields=["Comprador","Venta real (t)","Desc. real ($/kg)","Cierre DICF (t)","Continuidad ($/kg)","Nuevo descuento ($/kg)","Meta de cierre (t)","Mínimo para empatar (t)","Cambio si cumple ($)","Cambio solo forecast ($)"];
function NumberCell({label,value,unit,onCommit}:{label:string;value:number|null;unit:number;onCommit:(v:number|null)=>void}) {
  const [text,setText]=useState(value===null?"":String(value/unit));
  useEffect(()=>setText(value===null?"":String(value/unit)),[value,unit]);
  return <input aria-label={label} className="w-24 rounded border border-amber-600 bg-slate-950 p-1 text-right" type="number" min="0" step="any"
    value={text} onChange={e=>setText(e.target.value)} onBlur={()=>{
      const v=text.trim()===""?null:Number(text)*unit;
      if((v===null&&unit===1000)||(v!==null&&(!Number.isFinite(v)||v<0||v>(unit===1000?1e9:100)))){
        setText(value===null?"":String(value/unit));return;
      }
      if(v!==value)onCommit(v);
    }}
    onKeyDown={e=>{if(e.key==="Enter")e.currentTarget.blur();}}/>;
}
export default function IgfPlanAlCierre({year,month,plant,cutoff,mode,token,id,anchor,onSaved}:Props) {
  const [data,setData]=useState<Data|null>(null),[edits,setEdits]=useState<Record<string,Change>>({});
  const [comments,setComments]=useState(""),[error,setError]=useState(""),[busy,setBusy]=useState(false);
  const [imported,setImported]=useState("");
  const lock=useRef(false),requestId=useRef("");
  const path=getApiUrl("/api/dashboard/igf-simulation-plan");
  const context=useMemo(()=>({plant_code:plant,year,month,cutoff,mode,id}),[plant,year,month,cutoff,mode,id]);
  const headers=useMemo(()=>({Authorization:"Bearer "+token,"Content-Type":"application/json"}),[token]);
  useEffect(()=>{
    const controller=new AbortController();
    requestId.current=crypto.randomUUID();
    setData(null);setError("");setEdits({});setComments("");
    void (async()=>{
      try {
        const res=await fetch(path,{method:"POST",headers,signal:controller.signal,body:JSON.stringify({...context,action:"open"}),cache:"no-store"});
        const body=await res.json();if(!res.ok)throw Error(body.error);
        if(!controller.signal.aborted){setData(body);setEdits(body.edits);setComments(body.comments??"");}
      }catch(e){if(!controller.signal.aborted)setError((e as Error).message);}
    })();
    return ()=>controller.abort();
  },[context,headers,path]);
  const basis=data?.anchor??anchor;
  const plan=useMemo(()=>data&&basis?evaluatePlan(data.source,edits,basis):null,[data,basis,edits]);
  const scenario=plan?.scenario;
  function change(row:PlanRow,update:Partial<Change>) {
    setEdits(all=>({...all,[row.id]:{...(all[row.id]??{rate:row.rate,goal:row.goal,selected:row.selected}),...update}}));
  }
  async function importReviewed(file?:File){
    if(!file||!data||lock.current)return;
    lock.current=true;setBusy(true);setError("");setImported("");
    try{
      if(file.size>10*1024*1024)throw Error("Selecciona un archivo de hasta 10 MB.");
      const XLSX=await import("xlsx");
      const book=XLSX.read(await file.arrayBuffer(),{type:"array",sheetRows:15001});
      const sheets=Object.fromEntries(book.SheetNames.filter(n=>n==="Plan al cierre"||n==="IGF"||n.startsWith("IGF ")).map(n=>[n,
        XLSX.utils.sheet_to_json(book.Sheets[n],{header:1,blankrows:false,raw:true})]));
      const next=readPlanEdits(sheets,data.source,{plant,cutoff,mode});
      setEdits(next);setImported("Se cargaron las metas, los descuentos y la selección de "+file.name+".");
    }catch(e){setError((e as Error).message);}finally{lock.current=false;setBusy(false);}
  }
  async function submit(action:"excel"|"save"){
    if(!data||!basis||!scenario||lock.current)return;
    lock.current=true;setBusy(true);setError("");
    try{
      const res=await fetch(path,{method:"POST",headers,body:JSON.stringify({...context,action,edits,anchor:basis,comments,
        revision:data.source.revision,version:data.version,request_id:requestId.current})});
      if(!res.ok)throw Error((await res.json()).error);
      if(action==="save"){onSaved((await res.json()).row);return;}
      const url=URL.createObjectURL(await res.blob()),a=document.createElement("a");a.href=url;a.download="Plan-al-cierre-"+plant+"-"+cutoff+".xlsx";
      document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
    }catch(e){setError((e as Error).message);}finally{lock.current=false;setBusy(false);}
  }
  return <section className="space-y-3 text-sm" aria-label="Plan al cierre">
    <p>{plant} · {month}/{year} · {mode==="forecast"?"IGF Forecast":"IGF Diario acumulado"} · Corte {cutoff}</p>
    {error&&<p role="alert" className="text-amber-300">{error}</p>}
    {!data&&!error&&<p role="status">Cargando compradores…</p>}
    {data&&plan&&<>
      <div className="flex flex-wrap items-center gap-2">
        <label className="cursor-pointer rounded border border-slate-500 px-3 py-2">Usar plan de Excel<input className="sr-only" type="file" accept=".xlsx" disabled={busy} onChange={e=>{const file=e.target.files?.[0];e.target.value="";void importReviewed(file);}}/></label>
        <button disabled={busy||!scenario} onClick={()=>void submit("excel")} className="rounded bg-sky-800 px-3 py-2 disabled:opacity-40">Descargar Excel</button>
        <button disabled={busy||!scenario||plan.count===0} onClick={()=>void submit("save")} className="rounded bg-emerald-800 px-3 py-2 disabled:opacity-40">{id?"Guardar cambios del punto #"+id:"Agregar punto Plan"}</button>
        <label>Comentario <input className="rounded bg-slate-800 px-2 py-1" maxLength={2000} value={comments} onChange={e=>setComments(e.target.value)}/></label>
      </div>
      {imported&&<p role="status" className="text-emerald-300">{imported}</p>}
      <p>Margen DICF {show(data.source.margin,4)} $/kg · {plan.count} compradores seleccionados. El descuento F aplica desde {cutoff} al cierre. La meta G incluye lo ya vendido.</p>
      {data.source.origin&&<p className="text-xs text-slate-300">{data.source.origin} · ventas y descuentos hasta {data.source.through}</p>}
      <p className="font-semibold text-cyan-200">Cambio comercial de la cartera: {amount(plan.portfolio)} · Selección: {amount(scenario?.commercial)} · Resultado IGF base: {amount(scenario?.baseResult)} · Resultado IGF del plan: {amount(scenario?.result)}</p>
      {scenario&&<p>Venta IGF {show(scenario.kg/1000,3)} t · Descuento {show(scenario.rate,4)} $/kg · Cambio de resultado IGF {amount(scenario.result-scenario.baseResult)} (incluye margen IGF y HG).</p>}
      {plan.pending>0&&<p className="text-amber-300">{plan.pending} filas pendientes de datos. Corrige o desmarca las filas pendientes para guardar.</p>}
      <div className="overflow-x-auto"><table className="w-full text-right text-xs"><thead><tr>{fields.map(h=><th key={h} scope="col" className="p-2">{h}</th>)}</tr></thead>
      <tbody>{(plan.rows as PlanRow[]).map(r=><tr key={r.id} className="border-t border-slate-700">
        <td className="p-2 text-left"><label><input type="checkbox" aria-label={"Incluir en IGF "+r.name} checked={r.selected} onChange={e=>change(r,{selected:e.target.checked})}/> {r.name}</label>
        {r.reference&&<small className="block text-slate-400">Referencia {r.reference.slice(0,7)}</small>}</td>
        <td>{show(r.real/1000,3)}</td><td>{show(r.actual,4)}</td><td>{show(r.base/1000,3)}</td><td>{show(r.continuity,4)}</td>
        <td><NumberCell label={"Nuevo descuento "+r.name} value={r.rate} unit={1} onCommit={rate=>change(r,{rate})}/></td>
        <td><NumberCell label={"Meta de cierre "+r.name} value={r.goal} unit={1000} onCommit={v=>change(r,{goal:v??NaN})}/></td>
        <td>{show(r.minimum==null?null:r.minimum/1000,3)}</td><td>{amount(r.gain)}</td><td>{amount(r.downside)}</td>
      </tr>)}</tbody></table></div>
    </>}
    {data&&!basis&&<p role="alert">El resultado IGF seleccionado requiere una base financiera completa.</p>}
  </section>;
}
