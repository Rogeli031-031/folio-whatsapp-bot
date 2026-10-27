"use client";
import { useEffect, useRef, useState } from "react";
import { upsertComprasFleteDiario } from "@/lib/api";
import { parseLocaleNumber } from "@/lib/compras-format";
import ComprasFleteExcelUpload from "@/components/ComprasFleteExcelUpload";

export default function ComprasFleteDiario({ token, plantaId, proveedorId, nombre, year, month, defaultValue, overrides, onSaved }: {
  token: string; plantaId: number; proveedorId: number; nombre: string; year: number; month: number;
  defaultValue: number | null; overrides: { proveedor_id: number; fecha: string; tarifa: number }[]; onSaved: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [drafts, setDrafts] = useState<Record<string,string>>({});
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const lock = useRef(false), alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const values = new Map(overrides.filter(r => r.proveedor_id === proveedorId).map(r => [r.fecha,r.tarifa]));
  const dates = Array.from({length:new Date(year,month,0).getDate()},(_,i)=>`${year}-${String(month).padStart(2,"0")}-${String(i+1).padStart(2,"0")}`);
  function show() {
    setDrafts(Object.fromEntries(dates.map(fecha=>[fecha,String(values.get(fecha) ?? defaultValue ?? "")])));
    setError(null);setMessage(null);setUploadOpen(false);setOpen(true);
  }
  async function save(fecha:string, restore=false) {
    if(lock.current)return;
    const value=restore?null:parseLocaleNumber(drafts[fecha]);
    if(!restore&&(value==null||value<0||value>99999999)){setError("Escribe un flete válido, mayor o igual a cero.");return;}
    lock.current=true;setPending(fecha);setError(null);setMessage(null);
    try {
      await upsertComprasFleteDiario(token,plantaId,{proveedor_id:proveedorId,fecha,tarifa:value});
      if(!alive.current)return;
      await onSaved();
      if(!alive.current)return;
      setDrafts(prev=>({...prev,[fecha]:String(restore?(defaultValue ?? ""):value)}));
      setMessage(`${fecha}: ${restore?"se restauró el flete predeterminado":"flete guardado"}.`);
    } catch(e){if(alive.current)setError(e instanceof Error?e.message:"No se pudo guardar el flete");}
    finally {lock.current=false;if(alive.current)setPending(null);}
  }
  return <>
    <button type="button" onClick={show} className="font-semibold text-sky-800 underline underline-offset-2" aria-label={`Editar FLETE diario ${nombre}`}>FLETE</button>
    {open&&<div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/65 p-4 text-left text-base font-normal normal-case tracking-normal">
      <section role="dialog" aria-modal="true" aria-labelledby={`flete-title-${proveedorId}`} className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-lg border border-slate-600 bg-slate-900 p-5 text-slate-100">
        <h3 id={`flete-title-${proveedorId}`} className="text-lg font-semibold">Flete diario · {nombre}</h3>
        <p className="my-2 text-sm text-slate-300">{String(month).padStart(2,"0")}/{year} · Predeterminado: {defaultValue==null?"sin valor":defaultValue.toLocaleString("es-MX",{maximumFractionDigits:6})} $/kg. El valor manual aplica solo a esta planta, proveedor y fecha.</p>
        <ComprasFleteExcelUpload key={open?"open":"closed"} token={token} plantaId={plantaId} proveedorId={proveedorId} nombre={nombre} year={year} month={month}
          disabled={pending!==null&&pending!=="__import__"} onOpen={setUploadOpen}
          onBusy={busy=>{lock.current=busy;setPending(busy?"__import__":null);}}
          onImported={async rows=>{
            if(!alive.current)return;
            await onSaved();
            if(!alive.current)return;
            setDrafts(prev=>({...prev,...Object.fromEntries(rows.map(row=>[row.fecha,String(row.tarifa)]))}));
            setMessage(`Se importaron ${rows.length} fechas de flete para ${nombre}.`);
          }}/>
        {error&&<p role="alert" className="mb-2 text-sm text-red-300">{error}</p>}
        {message&&<p role="status" className="mb-2 text-sm text-emerald-300">{message}</p>}
        {!uploadOpen&&<div className="overflow-auto"><table className="w-full text-sm"><thead className="sticky top-0 bg-slate-800"><tr><th className="p-2 text-left">Fecha</th><th className="p-2 text-right">Flete ($/kg)</th><th className="p-2">Origen</th><th className="p-2">Acciones</th></tr></thead><tbody>
          {dates.map(fecha=><tr key={fecha} className="border-b border-slate-700"><th className="whitespace-nowrap p-2 font-normal">{fecha}</th><td className="p-2"><input aria-label={`Flete ${fecha}`} value={drafts[fecha]??""} disabled={pending!==null} inputMode="decimal" onChange={e=>setDrafts(prev=>({...prev,[fecha]:e.target.value}))} className="w-28 rounded border border-slate-500 bg-slate-800 px-2 py-1 text-right text-white disabled:opacity-50" /></td><td className="p-2 text-center text-xs">{values.has(fecha)?"Manual":"Predeterminado"}</td><td className="p-2"><div className="flex flex-wrap justify-center gap-2"><button type="button" aria-label={`Guardar flete ${fecha}`} disabled={pending!==null} onClick={()=>void save(fecha)} className="rounded bg-sky-700 px-2 py-1 text-xs disabled:opacity-50">{pending===fecha?"Guardando…":"Guardar"}</button><button type="button" aria-label={`Restaurar flete ${fecha}`} disabled={pending!==null||!values.has(fecha)} onClick={()=>void save(fecha,true)} className="text-xs text-sky-300 underline disabled:opacity-40">Usar predeterminado</button></div></td></tr>)}
        </tbody></table></div>}
        <div className="mt-4 text-right"><button type="button" disabled={pending!==null} onClick={()=>setOpen(false)} className="rounded bg-slate-700 px-4 py-2 disabled:opacity-50">Cerrar</button></div>
      </section>
    </div>}
  </>;
}
