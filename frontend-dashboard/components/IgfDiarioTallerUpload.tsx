"use client";
import { useEffect, useState } from "react";
import { requestIgfAcapulcoTaller, requestIgfPueblaTaller, requestIgfQueretaroTaller, type IgfQueretaroTallerPreview, type IgfAcapulcoTallerPreview, type IgfPueblaTallerPreview } from "@/lib/api";

export default function IgfDiarioTallerUpload({ token, compact = false }: { token: string; compact?: boolean }) {
  const [allowed, setAllowed] = useState(false), [open, setOpen] = useState(false), [busy, setBusy] = useState(false);
  const [state,setState] = useState<{xlsx: string; data: IgfAcapulcoTallerPreview} | null>(null);
  const [message,setMessage] = useState("");
  useEffect(() => {
    let active = true;
    setAllowed(false); setState(null); setOpen(false); setMessage("");
    requestIgfAcapulcoTaller<{allowed: boolean}>(token, "acceso").then(r => { if (active) setAllowed(r.allowed === true); }).catch(() => {});
    return () => { active = false; };
  }, [token]);
  if (!allowed) return null;
  const attempt = async (fn: () => Promise<void>) => {
    setBusy(true); setMessage("");
    try { await fn(); } catch (e) { setMessage(e instanceof Error ? e.message : "No se pudo completar."); }
    finally { setBusy(false); }
  };
  return <section className={compact ? "contents" : "my-4 rounded border border-slate-600 p-3"}>
    <button type="button" disabled={busy} aria-expanded={open}
      className={compact ? "inline-flex items-center rounded bg-sky-700 px-2 py-1 text-xs font-semibold text-white hover:bg-sky-600 disabled:opacity-50" : undefined}
      onClick={() => {setOpen(!open);setState(null);setMessage("");}}>Reporte diario de taller</button>
    {open && <div className={compact ? "grid min-w-0 basis-full gap-2 rounded border border-slate-600 p-3" : "mt-2 grid gap-2"}>
      <label>Selecciona un XLSX de Uribe o HidroGas
      <input className={compact ? "block w-full min-w-0" : "block"} disabled={busy} type="file" accept=".xlsx" onChange={ev => {
        const f=ev.currentTarget.files?.[0]; ev.currentTarget.value="";
        if (!f) return; setState(null);
        void attempt(async () => {
          if (f.size>2000000 || !f.name.toLowerCase().endsWith(".xlsx")) throw new Error("Selecciona un archivo XLSX de hasta 2 MB.");
          const xlsx=await new Promise<string>((resolve,reject)=>{
            const r=new FileReader();
            r.onload=()=>resolve(String(r.result).split(",")[1] || "");
            r.onerror=()=>reject(new Error("No se pudo leer el archivo."));
            r.readAsDataURL(f);
          });
          const data=await requestIgfAcapulcoTaller<IgfAcapulcoTallerPreview>(token,"preview",{xlsx});
          setState({xlsx,data});
        });
      }} /></label>
      {state && <div>
        <p>Empresa {state.data.company}, fecha {state.data.date}. {state.data.rowCount} pipas; {state.data.excluded} unidades de otro tipo excluidas.</p>
        <ul className="max-h-24 overflow-auto">{state.data.units.map(u=><li key={u.eco}>{u.eco} ({u.section})</li>)}</ul>
        <button type="button" disabled={busy} onClick={()=>void attempt(async ()=>{
          const r=await requestIgfAcapulcoTaller<{revision:number;duplicate:boolean}>(token,"confirm",{xlsx:state.xlsx,confirm:state.data.confirm});
          setState(null);
          setMessage(r.duplicate ? "Este archivo ya está guardado." : "Reporte guardado. Revisión "+r.revision+".");
        })}>Confirmar y guardar</button>
      </div>}
      {message && <p role="status">{message}</p>}
    </div>}
  </section>;
}

const pueblaWarningText: Record<string, string> = {
  MISSING_ENTRY_DATE: "Falta la fecha de ingreso; no se cuentan días en taller.",
  INVALID_ENTRY_DATE: "Fecha de ingreso no válida.",
  INVALID_ADVANCE_DATE: "Fecha de avance no válida.",
  INVALID_EXIT_DATE: "Fecha de salida no válida.",
  CONFLICTING_UNIT_DATES: "El avance o la salida figura antes del ingreso.",
  UNCONFIRMED_EXIT: "Las observaciones mencionan salida, pero no hay fecha de salida.",
  MISSING_SOURCE_DATE: "No se encontró una fecha válida en la hoja.",
  REPORT_DATE_CONFLICT: "La fecha de la hoja y la del nombre de la pestaña no coinciden.",
};

export function IgfPueblaTallerUpload({ token }: { token: string }) {
  const [allowed,setAllowed] = useState(false), [open,setOpen] = useState(false), [busy,setBusy] = useState(false);
  const [state,setState] = useState<{xlsx:string; data:IgfPueblaTallerPreview} | null>(null);
  const [message,setMessage] = useState("");
  const [reportDate,setReportDate] = useState(""), [dateConfirmed,setDateConfirmed] = useState(false);
  useEffect(() => {
    let active = true;
    setAllowed(false);
    requestIgfPueblaTaller<{allowed:boolean}>(token,"acceso").then(r=>{if(active)setAllowed(r.allowed===true);}).catch(()=>{});
    return ()=>{active=false;};
  },[token]);
  if(!allowed)return null;
  const attempt=async (fn:()=>Promise<void>)=>{
    setBusy(true);setMessage("");
    try{await fn();}catch(e){setMessage(e instanceof Error?e.message:"No se pudo completar.");}
    finally{setBusy(false);}
  };
  return <section className="contents">
    <button type="button" disabled={busy} aria-expanded={open}
      className="inline-flex items-center rounded bg-sky-700 px-2 py-1 text-xs font-semibold text-white hover:bg-sky-600 disabled:opacity-50"
      onClick={()=>{setOpen(!open);setState(null);setMessage("");}}>Reporte diario de taller</button>
    {open && <div className="grid min-w-0 basis-full gap-2 rounded border border-slate-600 p-3">
      <label>Selecciona el XLSX original de Puebla
        <input className="block w-full min-w-0" disabled={busy} type="file" accept=".xlsx" onChange={event=>{
          const file=event.currentTarget.files?.[0];event.currentTarget.value="";
          if(!file)return;
          setState(null);setReportDate("");setDateConfirmed(false);
          void attempt(async()=>{
            if(file.size>2000000||!file.name.toLowerCase().endsWith(".xlsx"))throw new Error("Selecciona un archivo XLSX de hasta 2 MB.");
            const xlsx=await new Promise<string>((resolve,reject)=>{
              const reader=new FileReader();
              reader.onload=()=>resolve(String(reader.result).split(",")[1]||"");
              reader.onerror=()=>reject(new Error("No se pudo leer el archivo."));
              reader.readAsDataURL(file);
            });
            const data=await requestIgfPueblaTaller<IgfPueblaTallerPreview>(token,"preview",{xlsx});
            setReportDate(data.sourceDate&&(!data.tabDate||data.tabDate===data.sourceDate)?data.sourceDate:"");
            setState({xlsx,data});
          });
        }}/>
      </label>
      {state && <div className="grid gap-2">
        <p>Puebla: {state.data.rowCount} registros de {state.data.unitCount} unidades.</p>
        <p>Fecha en la hoja: {state.data.sourceDate??"no encontrada"}. Fecha en el nombre de la pestaña: {state.data.tabDate??"no encontrada"}.</p>
        {state.data.warnings.length>0 && <ul className="max-h-32 overflow-auto text-amber-300" aria-label="Avisos del reporte">
          {state.data.warnings.map((w,i)=><li key={i}>{w.unit?`${w.unit} (fila ${w.row}): `:""}{pueblaWarningText[w.code]??"Revisa los datos del reporte."}</li>)}
        </ul>}
        <ul className="max-h-40 overflow-auto" aria-label="Reparaciones del reporte">
          {state.data.records.map(r=><li key={r.sourceRow}>{r.unit} ({r.kind}, taller {r.section.toLowerCase()}): {r.fault??"sin falla indicada"}{r.repairCost!==null?` · ${new Intl.NumberFormat("es-MX",{style:"currency",currency:"MXN"}).format(r.repairCost)}`:""}</li>)}
        </ul>
        <label>Fecha efectiva del reporte <input className="rounded bg-slate-800 p-1 text-white" type="date" disabled={busy} value={reportDate}
          onChange={e=>{setReportDate(e.target.value);setDateConfirmed(false);}} /></label>
        <label><input type="checkbox" disabled={busy||!reportDate} checked={dateConfirmed}
          onChange={e=>setDateConfirmed(e.target.checked)} /> Confirmo la fecha efectiva para el historial de Puebla.</label>
        <button className="justify-self-start rounded bg-sky-700 px-2 py-1 text-white disabled:opacity-50" type="button" disabled={busy||!reportDate||!dateConfirmed}
          onClick={()=>void attempt(async()=>{
            const r=await requestIgfPueblaTaller<{revision:number;duplicate:boolean}>(token,"confirm",{
              xlsx:state.xlsx,confirm:state.data.confirm,reportDate,dateConfirmed
            });
            setState(null);setReportDate("");setDateConfirmed(false);
            setMessage(r.duplicate?"Este archivo ya está guardado para esa fecha.":`Reporte de Puebla guardado. Revisión ${r.revision}.`);
          })}>Confirmar y guardar</button>
      </div>}
      {message && <p role="status">{message}</p>}
    </div>}
  </section>;
}

const queretaroMonths="ENERO FEBRERO MARZO ABRIL MAYO JUNIO JULIO AGOSTO SEPTIEMBRE OCTUBRE NOVIEMBRE DICIEMBRE".split(" ");
function queretaroMonthFromName(name:string){
  const m=/\b([A-Z]+)[ _-]+(20\d{2})\b/.exec(name.toUpperCase());
  const n=m?queretaroMonths.indexOf(m[1])+1:0;
  return n&&m?m[2]+"-"+String(n).padStart(2,"0"):"";
}
const queretaroWarnings:Record<string,string> = {
  ...pueblaWarningText,
  AFTER_CUT_ENTRY_DATE:"El ingreso figura después del corte; verifica la fecha.",
  AFTER_CUT_ADVANCE_DATE:"El avance figura después del corte.",
  AFTER_CUT_EXIT_DATE:"La salida figura después del corte.",
  DAYS_DIFFER_FROM_CALENDAR:"Los días informados no coinciden con los días corridos; se conserva el dato original.",
};

export function IgfQueretaroTallerUpload({ token }:{token:string}){
  const [allowed,setAllowed]=useState(false),[open,setOpen]=useState(false),[busy,setBusy]=useState(false);
  const [file,setFile]=useState<File|null>(null),[period,setPeriod]=useState(""),[confirmed,setConfirmed]=useState(false);
  const [preview,setPreview]=useState<{xlsx:string;data:IgfQueretaroTallerPreview}|null>(null),[message,setMessage]=useState("");
  useEffect(()=>{
    let active=true;
    requestIgfQueretaroTaller<{allowed:boolean}>(token,"acceso").then(r=>{if(active)setAllowed(r.allowed===true);}).catch(()=>{});
    return ()=>{active=false;};
  },[token]);
  if(!allowed)return null;
  async function attempt(fn:()=>Promise<void>){
    setBusy(true);setMessage("");
    try{await fn();}catch(e){setMessage(e instanceof Error?e.message:"No se pudo completar.");}
    finally{setBusy(false);}
  }
  const clearPreview=()=>{setPreview(null);setConfirmed(false);setMessage("");};
  return <section className="contents">
    <button type="button" disabled={busy} aria-expanded={open}
      className="inline-flex items-center rounded bg-sky-700 px-2 py-1 text-xs font-semibold text-white hover:bg-sky-600 disabled:opacity-50"
      onClick={()=>{setOpen(!open);setFile(null);setPeriod("");clearPreview();}}>Reporte diario de taller</button>
    {open&&<div className="grid min-w-0 basis-full gap-2 rounded border border-slate-600 p-3">
      <label>Selecciona el XLSX mensual original de Querétaro
        <input className="block w-full min-w-0" type="file" accept=".xlsx" disabled={busy} onChange={e=>{
          const next=e.currentTarget.files?.[0]??null;e.currentTarget.value="";
          setFile(next);setPeriod(next?queretaroMonthFromName(next.name):"");clearPreview();
        }} />
      </label>
      {file&&<p>{file.name}</p>}
      <label>Mes y año de los cortes <input className="rounded bg-slate-800 p-1 text-white" type="month" value={period} disabled={busy}
        onChange={e=>{setPeriod(e.target.value);clearPreview();}} /></label>
      <button type="button" disabled={busy||!file||!/^20\d\d-(0[1-9]|1[0-2])$/.test(period)}
        className="justify-self-start rounded bg-sky-700 px-2 py-1 text-white disabled:opacity-50" onClick={()=>void attempt(async()=>{
          if(!file)return;
          clearPreview();
          if(file.size>2000000||!file.name.toLowerCase().endsWith(".xlsx"))throw new Error("Selecciona un archivo XLSX de hasta 2 MB.");
          const xlsx=await new Promise<string>((resolve,reject)=>{
            const reader=new FileReader();
            reader.onload=()=>resolve(String(reader.result).split(",")[1]||"");
            reader.onerror=()=>reject(new Error("No se pudo leer el archivo."));
            reader.readAsDataURL(file);
          });
          const data=await requestIgfQueretaroTaller<IgfQueretaroTallerPreview>(token,"preview",{xlsx,period});
          setPreview({xlsx,data});
        })}>Ver cortes</button>
      {preview&&<div className="grid gap-2">
        <p>Querétaro: {preview.data.cuts.length} cortes, {preview.data.rowCount} registros históricos.</p>
        <p>Solo se guardan las fechas del listado; no se agregan días faltantes.</p>
        <ul className="max-h-56 overflow-auto" aria-label="Cortes del reporte">
          {preview.data.cuts.map(c=><li key={c.date}><details>
            <summary>{c.date}: {c.rowCount} registros de {c.unitCount} unidades; {c.warnings.length} avisos.</summary>
            <ul className="pl-3 text-amber-300">{c.warnings.map((w,i)=><li key={i}>{w.unit} (fila {w.sourceRow}): {queretaroWarnings[w.code]??"Revisa la fecha."}</li>)}</ul>
          </details></li>)}
        </ul>
        <label><input type="checkbox" checked={confirmed} disabled={busy} onChange={e=>setConfirmed(e.target.checked)}/> Confirmo el mes y año de los cortes de Querétaro.</label>
        <button type="button" disabled={busy||!confirmed} className="justify-self-start rounded bg-sky-700 px-2 py-1 text-white disabled:opacity-50"
          onClick={()=>void attempt(async()=>{
            const r=await requestIgfQueretaroTaller<{inserted:number;duplicates:number}>(token,"confirm",{
              xlsx:preview.xlsx,period:preview.data.period,confirm:preview.data.confirm,periodConfirmed:confirmed
            });
            clearPreview();setFile(null);
            setMessage(`Querétaro: ${r.inserted} cortes guardados o revisados; ${r.duplicates} ya estaban guardados.`);
          })}>Confirmar y guardar historial</button>
      </div>}
      {message&&<p role="status">{message}</p>}
    </div>}
  </section>;
}
