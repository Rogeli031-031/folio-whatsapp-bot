"use client";
import { useEffect, useState } from "react";
import { requestIgfAcapulcoTaller, type IgfAcapulcoTallerPreview } from "@/lib/api";

export default function IgfDiarioTallerUpload({ token }: { token: string }) {
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
  return <section className="my-4 rounded border border-slate-600 p-3">
    <button type="button" disabled={busy} onClick={() => {setOpen(!open);setState(null);setMessage("");}}>Reporte diario de taller</button>
    {open && <div className="mt-2 grid gap-2">
      <label>Selecciona un XLSX de Uribe o HidroGas
      <input className="block" disabled={busy} type="file" accept=".xlsx" onChange={ev => {
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
