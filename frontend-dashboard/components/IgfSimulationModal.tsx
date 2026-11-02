"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { getApiUrl, type IgfForecastMiniRow } from "@/lib/api";
import { axisTicks, closestEquilibrium, historyPeriods, mergeWeekColumns, modelFromRow, profit, visibleWeekPoints, weeklyPoints } from "@/lib/igf-simulation";

type Model={q:number;d:number;a:number;fixed:number};
type Point={key:string;label:string;q:number;d:number;z:number;color:string;state?:string};
type Saved={id:string;name:string;volume_ton:number|string;discount_kg:number|string;basis:{a:number;fixed:number;cutoff:string;mode:string;version_as_of:boolean};created_at:string};
type CategoryLine={category:string;subcategory:string;kg:number;discount_amount:number|null;discount_kg:number|null;missing_discount_kg:number};
const num=(v:number|null|undefined,d=2)=>v==null||!Number.isFinite(v)?"—":v.toLocaleString("es-MX",{maximumFractionDigits:d});
const money=(v:number|null|undefined)=>v==null?"—":`$${num(v,0)}`;

function Surface({model,q,d,points}:{model:Model;q:number;d:number;points:Point[]}) {
 const [camera,setCamera]=useState({az:.78,el:.48}),[rotate,setRotate]=useState(false);
 const [zoom,setZoom]=useState(1.15),[viewport,setViewport]=useState({width:1100,height:680});
 const svgRef=useRef<SVGSVGElement|null>(null);
 useEffect(()=>{
  const svg=svgRef.current;if(!svg)return;
  const measure=()=>{const box=svg.getBoundingClientRect();if(box.width>0&&box.height>0)setViewport({width:box.width,height:box.height});};
  measure();const observer=new ResizeObserver(measure);observer.observe(svg);return()=>observer.disconnect();
 },[]);
 const drag=useRef<{id:number;x:number;y:number;az:number;el:number}|null>(null);
 const nearest=closestEquilibrium({...model,q,d});
 const scene=useMemo(()=>{
  const all=[...points,{q,d,z:profit(model,q,d)}];
  if(nearest)all.push({...nearest,z:0});
  const x0=Math.max(0,Math.min(model.q*.4,...all.map(p=>p.q*.8))),x1=Math.max(model.q*1.5,1,...all.map(p=>p.q*1.1));
  const y0=Math.min(0,d-1,...all.map(p=>p.d-.3)),y1=Math.max(5.5,d+1,...all.map(p=>p.d+.5));
  const zValues=[...all.map(p=>p.z),profit(model,x0,y0),profit(model,x0,y1),profit(model,x1,y0),profit(model,x1,y1),0];
  const z0=Math.min(...zValues),z1=Math.max(z0+1,...zValues);
  const axes=[
   {key:"venta",label:"Venta (t/mes)",color:"#93c5fd",min:0,max:x1+(x1-x0)*.18,at:(v:number)=>[v,0,0],format:(v:number)=>`${num(v,0)} t`},
   {key:"descuento",label:"Descuento ($/kg)",color:"#c4b5fd",min:Math.min(0,y0),max:y1+(y1-y0)*.18,at:(v:number)=>[0,v,0],format:(v:number)=>`$${num(v)}/kg`},
   {key:"resultado",label:"Resultado (MXN/mes)",color:"#e2e8f0",min:z0-(z1-z0)*.12,max:z1+(z1-z0)*.12,at:(v:number)=>[0,0,v],format:money},
  ];
  function raw(x:number,y:number,z:number){const u=2*(x-x0)/(x1-x0)-1,v=2*(y-y0)/(y1-y0)-1,w=2*(z-z0)/(z1-z0)-1;
   const rx=u*Math.cos(camera.az)-v*Math.sin(camera.az),ry=u*Math.sin(camera.az)+v*Math.cos(camera.az);
   return [rx,ry*Math.sin(camera.el)-w*Math.cos(camera.el),ry*Math.cos(camera.el)+w*Math.sin(camera.el)];}
  // Fit the actual surface/markers instead of an imaginary full bounding cube.
  const corners=all.map(p=>raw(p.q,p.d,p.z));
  for(const x of [x0,x1])for(const y of [y0,y1]){corners.push(raw(x,y,profit(model,x,y)),raw(x,y,0));}
  for(const axis of axes)for(const value of [axis.min,axis.max]){const at=axis.at(value);corners.push(raw(at[0],at[1],at[2]));}
  const minX=Math.min(...corners.map(c=>c[0])),maxX=Math.max(...corners.map(c=>c[0])),minY=Math.min(...corners.map(c=>c[1])),maxY=Math.max(...corners.map(c=>c[1]));
  const scale=Math.min(Math.max(100,viewport.width-150)/(maxX-minX),Math.max(100,viewport.height-130)/(maxY-minY))*zoom;
  const project=(x:number,y:number,z:number)=>{const r=raw(x,y,z);return [viewport.width/2+(r[0]-(minX+maxX)/2)*scale,viewport.height/2+(r[1]-(minY+maxY)/2)*scale,r[2]];};
  const path=(list:number[][])=>list.map(p=>`${p[0]},${p[1]}`).join(" ");
  const cells=[];for(let i=0;i<28;i++)for(let j=0;j<22;j++){
   const xa=x0+(x1-x0)*i/28,xb=x0+(x1-x0)*(i+1)/28,ya=y0+(y1-y0)*j/22,yb=y0+(y1-y0)*(j+1)/22;
   const vertices=[[xa,ya],[xb,ya],[xb,yb],[xa,yb]].map(([x,y])=>project(x,y,profit(model,x,y)));
   cells.push({path:path(vertices),depth:vertices.reduce((s,p)=>s+p[2],0)/4,positive:profit(model,(xa+xb)/2,(ya+yb)/2)>=0});
  }
  cells.sort((a,b)=>a.depth-b.depth);
  const zero=[];for(let i=0;i<=240;i++){const x=x0+(x1-x0)*i/240;if(x<=0)continue;const y=model.a-model.fixed/(x*1000);if(y>=y0&&y<=y1)zero.push(project(x,y,0));}
  return {project,path,cells,zero,x0,x1,y0,y1,z0,z1,axes};
 },[model,q,d,points,camera,nearest?.q,nearest?.d,zoom,viewport]);
 const p=scene.project(q,d,profit(model,q,d));
 const eq=nearest?scene.project(nearest.q,nearest.d,0):null;
 const trail=points.filter(p=>p.state&&p.state!=="actual").map(p=>scene.project(p.q,p.d,p.z));
 return <>
  <div className="flex flex-wrap items-center gap-2 text-xs"><button type="button" aria-pressed={rotate} onClick={()=>{drag.current=null;setRotate(!rotate);}} className={`rounded px-3 py-2 ${rotate?"bg-cyan-700":"bg-slate-700"}`}>{rotate?"Terminar giro":"Girar gráfica"}</button><button type="button" onClick={()=>{setCamera({az:.78,el:.48});setZoom(1.15);}} className="rounded bg-slate-700 px-3 py-2">Vista inicial</button><button type="button" aria-label="Alejar gráfica" disabled={zoom<=.5} onClick={()=>setZoom(v=>Math.max(.5,v-.25))} className="rounded bg-slate-700 px-3 py-2 disabled:opacity-40">−</button><label className="flex items-center gap-2">Zoom <input aria-label="Zoom de gráfica" type="range" min=".5" max="4" step=".05" value={zoom} onChange={e=>setZoom(Number(e.target.value))} className="w-28 accent-cyan-400"/><output className="w-10 tabular-nums">{Math.round(zoom*100)}%</output></label><button type="button" aria-label="Acercar gráfica" disabled={zoom>=4} onClick={()=>setZoom(v=>Math.min(4,v+.25))} className="rounded bg-slate-700 px-3 py-2 disabled:opacity-40">+</button><button type="button" onClick={()=>setZoom(1)} className="rounded bg-slate-700 px-3 py-2">Ajustar gráfica</button><span className="text-slate-400">{rotate?"Arrastra con el mouse o el dedo. Desactiva el giro para desplazar la página.":"Activa el giro para explorar la superficie."}</span></div>
  <svg ref={svgRef} role="img" aria-label="Superficie de rentabilidad, semanas, tendencia y propuestas" viewBox={`0 0 ${viewport.width} ${viewport.height}`} className="w-full rounded bg-slate-950" style={{height:"clamp(520px,80vh,1100px)",minHeight:420,touchAction:rotate?"none":"auto",cursor:rotate?"grab":"default"}}
   onPointerDown={e=>{if(!rotate||e.button!==0)return;e.currentTarget.setPointerCapture(e.pointerId);drag.current={id:e.pointerId,x:e.clientX,y:e.clientY,...camera};}}
   onPointerMove={e=>{const g=drag.current;if(!g||g.id!==e.pointerId)return;setCamera({az:g.az+(e.clientX-g.x)*.008,el:Math.max(.1,Math.min(1.48,g.el-(e.clientY-g.y)*.006))});}}
   onPointerUp={e=>{drag.current=null;if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);}}
   onPointerCancel={()=>{drag.current=null;}} onLostPointerCapture={()=>{drag.current=null;}}>
   <text x={viewport.width/2} y="25" textAnchor="middle" fill="#cbd5e1" fontSize="15">Altura: resultado mensual equivalente (MXN)</text>
   <polygon points={scene.path([[scene.x0,scene.y0],[scene.x1,scene.y0],[scene.x1,scene.y1],[scene.x0,scene.y1]].map(([x,y])=>scene.project(x,y,0)))} fill="#334155" fillOpacity=".3" stroke="#64748b"/>
   {scene.cells.map((c,i)=><polygon key={i} points={c.path} fill={c.positive?"#168ca0":"#64748b"} fillOpacity=".7" stroke="#cbd5e1" strokeOpacity=".22" strokeWidth=".6"/>)}
   <defs>{scene.axes.map(axis=><marker key={axis.key} id={`igf-axis-${axis.key}`} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="8" markerHeight="8" orient="auto"><path d="M0 0 L8 4 L0 8 Z" fill={axis.color}/></marker>)}</defs>
   {scene.axes.map(axis=>{
    const project=(value:number)=>{const at=axis.at(value);return scene.project(at[0],at[1],at[2]);};
    const start=project(axis.min),end=project(axis.max),length=Math.hypot(end[0]-start[0],end[1]-start[1])||1;
    const dx=(end[0]-start[0])/length,dy=(end[1]-start[1])/length,px=-dy,py=dx;
    const anchor=px>.25?"start":px<-.25?"end":"middle";
    return <g key={axis.key} data-sim-axis={axis.key} aria-label={`Eje ${axis.label}`}>
     <line x1={start[0]} y1={start[1]} x2={end[0]} y2={end[1]} stroke={axis.color} strokeWidth="1.5" markerEnd={`url(#igf-axis-${axis.key})`}/>
     {axisTicks(axis.min,axis.max).map(value=>{const at=project(value);return <g key={value} data-axis-tick={value}><line x1={at[0]-px*4} y1={at[1]-py*4} x2={at[0]+px*5} y2={at[1]+py*5} stroke={axis.color}/><text x={at[0]+px*11} y={at[1]+py*11+4} textAnchor={anchor} fill={axis.color} stroke="#020617" strokeWidth="3" paintOrder="stroke" fontSize="12">{axis.format(value)}</text></g>;})}
     <text x={end[0]+dx*14} y={end[1]+dy*14-8} textAnchor={dx>.3?"start":dx<-.3?"end":"middle"} fill={axis.color} stroke="#020617" strokeWidth="3" paintOrder="stroke" fontSize="14" fontWeight="600">{axis.label}</text>
    </g>;
   })}
   <polyline points={scene.path(scene.zero)} fill="none" stroke="#f8fafc" strokeWidth="3"/>
   {trail.length>1&&<polyline points={scene.path(trail)} fill="none" stroke="#c084fc" strokeWidth="3" strokeDasharray="7 5"/>}
   {eq&&nearest&&<><line x1={p[0]} y1={p[1]} x2={eq[0]} y2={eq[1]} stroke="#fb923c" strokeWidth="3"/><circle cx={eq[0]} cy={eq[1]} r="7" fill="#fb923c" stroke="white"><title>{`Equilibrio: ${num(nearest.q)} t · ${num(nearest.d,4)}/kg`}</title></circle></>}
   {points.map(point=>{const at=scene.project(point.q,point.d,point.z);return <g key={point.key}><circle cx={at[0]} cy={at[1]} r="7" fill={point.state==="proyectada"?"#020617":point.color} stroke={point.state==="proyectada"?point.color:"white"} strokeDasharray={point.state==="parcial"?"3 2":undefined} strokeWidth="2"><title>{`${point.label}: ${num(point.q)} t · ${num(point.d,4)}/kg · ${money(point.z)}${point.state?` · ${point.state}`:""}`}</title></circle><text x={at[0]+10} y={at[1]-9} fill={point.color} stroke="#020617" strokeWidth="3" paintOrder="stroke" fontSize="15">{point.label}</text></g>;})}
   <circle cx={p[0]} cy={p[1]} r="9" fill="#38bdf8" stroke="white" strokeWidth="3"><title>{`Escenario: ${num(q)} t · ${num(d,4)}/kg · ${money(profit(model,q,d))}`}</title></circle>
   <text x="16" y={viewport.height-35} fill="#cbd5e1" fontSize="13">Venta: {num(scene.x0,0)}–{num(scene.x1,0)} t/mes</text><text x="16" y={viewport.height-15} fill="#cbd5e1" fontSize="13">Descuento: ${num(scene.y0)}–${num(scene.y1)}/kg</text>
  </svg>
  <p className="text-xs text-slate-300">Superficie gris: pérdida · Superficie azul: utilidad · Línea blanca: equilibrio. Los tamaños de estas áreas no representan porcentajes ni probabilidades; dependen de los rangos de venta y descuento y de la vista.</p>
  <p className="text-xs text-slate-300">Punto azul: escenario · Morado: semanas y trayectoria (punto hueco: proyectada; borde discontinuo: parcial) · Amarillo: tendencia actual · Verde: propuestas · Naranja: ruta más corta al equilibrio.</p>
  <p className="text-sm text-orange-200">{nearest?`Equilibrio cercano: ${num(nearest.q)} t/mes · $${num(nearest.d,4)}/kg. Cambio: ${num(nearest.q-q)} t y $${num(nearest.d-d,4)}/kg.`:"Sin equilibrio con venta positiva y descuento no negativo."}</p>
  <p className="text-xs text-slate-400">Distancia normalizada: 1,600 t y $4.50/kg por unidad. La línea es geométrica; llegar a cero no mejora un escenario que ya tiene utilidad.</p>
 </>;
}

export default function IgfSimulationModal({row,token,year,month,cutoff,versionAsOf,mode,onClose}:{row:IgfForecastMiniRow;token:string;year:number;month:number;cutoff:string;versionAsOf:boolean;mode:"forecast"|"igf_diario";onClose:()=>void}) {
 const model=useMemo(()=>modelFromRow(row) as Model|null,[row]);
 const [q,setQ]=useState(model?.q||0),[d,setD]=useState(model?.d||0),[name,setName]=useState("");
 const [columns,setColumns]=useState<any[]>([]),[saved,setSaved]=useState<Saved[]>([]),[error,setError]=useState("");
 const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[busyId,setBusyId]=useState<string|null>(null);
 const [weekError,setWeekError]=useState("");
 const [monthsBack,setMonthsBack]=useState(1),[hiddenWeeks,setHiddenWeeks]=useState<string[]>([]),[weeksLoading,setWeeksLoading]=useState(true);
 const [categories,setCategories]=useState<CategoryLine[]>([]),[categoryError,setCategoryError]=useState("");
 const saveLock=useRef(false);
 const plant=row.plant_code||row.empresa;
 const params=useMemo(()=>new URLSearchParams({year:String(year),month:String(month),plant_code:plant}),[year,month,plant]);
 async function request(path:string,options:RequestInit={}) {
  const response=await fetch(getApiUrl(path),{...options,headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},cache:"no-store"});
  const data=await response.json();if(!response.ok)throw new Error(data.error||"No se pudo completar la operación");return data;
 }
 useEffect(()=>{let active=true;setLoading(true);
  const requests=[request(`/api/dashboard/igf-simulation-proposals?${params}`).then(data=>{if(active)setSaved(data.rows||[]);}).catch(e=>{if(active)setError(e.message);}),
   request(`/api/dashboard/igf-simulation-categories?${params}&cutoff=${encodeURIComponent(cutoff)}&target_kg=${(row.ventaTon||0)*1000}`).then(data=>{if(active)setCategories(data.rows||[]);}).catch(e=>{if(active)setCategoryError(e.message);})];
  Promise.all(requests).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};
 // Request identity includes the selected cut and plant; modal remounts on context changes.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[params,token,cutoff,versionAsOf]);
 useEffect(()=>{
  const controller=new AbortController();setWeeksLoading(true);setWeekError("");setColumns([]);
  const periods=historyPeriods(year,month,monthsBack);
  const requests=periods.map(period=>{
   const weekly=new URLSearchParams(params);weekly.set("year",String(period.year));weekly.set("month",String(period.month));
   weekly.set("view","periods");weekly.set("period_mode","weeks");weekly.set("upload_day",cutoff);
   if(versionAsOf)weekly.set("version_as_of_corte","1");
   return request(`/api/dashboard/igf-diario-semanal?${weekly}`,{signal:controller.signal});
  });
  void Promise.allSettled(requests).then(results=>{
   if(controller.signal.aborted)return;
   setColumns(mergeWeekColumns(results.filter((r):r is PromiseFulfilledResult<any>=>r.status==="fulfilled").map(r=>r.value.columns||[])));
   const failed=results.flatMap((r,i)=>r.status==="rejected"?[`${periods[i].month}/${periods[i].year}: ${r.reason?.message||"No disponible"}`]:[]);
   setWeekError(failed.join("; "));setWeeksLoading(false);
  });
  return()=>controller.abort();
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[params,token,year,month,cutoff,versionAsOf,monthsBack]);
 useEffect(()=>{const listener=(e:KeyboardEvent)=>{if(e.key==="Escape"&&!saving&&!busyId)onClose();};document.addEventListener("keydown",listener);return()=>document.removeEventListener("keydown",listener);},[onClose,saving,busyId]);
 const weeks=useMemo(()=>weeklyPoints(columns,year,month),[columns,year,month]);
 const points:Point[]=visibleWeekPoints(weeks,hiddenWeeks);
 if(model)points.push({key:"current",label:"Tendencia actual",q:model.q,d:model.d,z:profit(model,model.q,model.d),color:"#facc15",state:"actual"});
 for(const proposal of saved)points.push({key:`proposal-${proposal.id}`,label:proposal.name,q:Number(proposal.volume_ton),d:Number(proposal.discount_kg),z:profit(proposal.basis,Number(proposal.volume_ton),Number(proposal.discount_kg)),color:"#4ade80"});
 async function save(){if(!model||saveLock.current)return;saveLock.current=true;setSaving(true);setError("");try{
  const data=await request("/api/dashboard/igf-simulation-proposals",{method:"POST",body:JSON.stringify({year,month,plant_code:plant,name,volume_ton:q,discount_kg:d,basis:{a:model.a,fixed:model.fixed,cutoff,mode,version_as_of:versionAsOf}})});
  setSaved(rows=>[data.row,...rows].slice(0,200));setName("");
 }catch(e){setError((e as Error).message);}finally{saveLock.current=false;setSaving(false);}}
 async function remove(id:string){setBusyId(id);setError("");try{await request(`/api/dashboard/igf-simulation-proposals?${params}&id=${encodeURIComponent(id)}`,{method:"DELETE"});setSaved(rows=>rows.filter(r=>r.id!==id));}catch(e){setError((e as Error).message);}finally{setBusyId(null);}}
 const field="w-28 rounded border border-slate-600 bg-slate-950 px-2 py-1 text-sm text-white";
 return <div role="dialog" aria-modal="true" aria-labelledby="igf-simulation-title" className="fixed inset-0 z-[80] bg-slate-950/90 p-2 sm:p-4">
  <div className="mx-auto flex max-h-[96vh] w-full flex-col overflow-hidden rounded-xl border border-slate-600 bg-slate-900 text-slate-100">
   <header className="flex items-center justify-between gap-3 border-b border-slate-700 p-3"><div><h2 id="igf-simulation-title" className="text-lg font-semibold">Simulador de rentabilidad · {row.empresa}</h2><p className="text-xs text-slate-400">{month}/{year} · Corte {cutoff} · {mode==="forecast"?"Forecast":"IGF Diario acumulado"}</p></div><button type="button" disabled={saving||!!busyId} onClick={onClose} className="rounded bg-slate-700 px-3 py-2">Cerrar</button></header>
   <div className="overflow-y-auto p-3 sm:p-4">
    <div className="mb-3 rounded border border-slate-700 p-2">
     <label className="flex flex-wrap items-center gap-2 text-xs">Historial de semanas
      <select aria-label="Historial de semanas" value={monthsBack} onChange={e=>setMonthsBack(Number(e.target.value))} className="rounded border border-slate-600 bg-slate-950 px-2 py-1">
       <option value={0}>Solo el mes seleccionado</option><option value={1}>Mes anterior y mes seleccionado</option><option value={2}>Últimos 3 meses hasta el seleccionado</option><option value={5}>Últimos 6 meses hasta el seleccionado</option>
      </select><span className="text-slate-400">El historial usa el mismo corte y la misma planta.</span>
     </label>
     {weeksLoading?<p role="status" className="mt-2 text-xs text-slate-400">Cargando semanas…</p>:<WeekControls weeks={weeks} hidden={hiddenWeeks} onChange={setHiddenWeeks}/>}
    </div>
    {model?<>
     <div className="mb-3 flex flex-wrap items-center gap-4 text-xs"><label>Venta (t/mes) <input aria-label="Venta simulada en toneladas" type="number" min="1" max="1000000" step="1" value={q} onChange={e=>setQ(Math.max(1,Math.min(1000000,Number(e.target.value)||1)))} className={field}/></label><label>Comisión / descuento ($/kg) <input aria-label="Descuento simulado por kilo" type="number" min="-100" max="100" step=".01" value={d} onChange={e=>setD(Math.max(-100,Math.min(100,Number(e.target.value)||0)))} className={field}/></label><strong className="text-base text-cyan-200">Resultado: {money(profit(model,q,d))}</strong><button type="button" onClick={()=>{setQ(model.q);setD(model.d);}} className="rounded bg-slate-700 px-2 py-1">Restaurar actual</button></div>
     <Surface model={model} q={q} d={d} points={points}/>
     <p className="my-3 text-xs text-slate-400">La superficie reproduce el resultado seleccionado y mantiene fijos los gastos e impuestos mensuales: {money(model.fixed)}. Se modifica venta y descuento; no predice la reacción de los clientes. Las semanas se convierten a ritmo mensual (venta y resultado ÷ días del periodo × días del mes) para compararlas. Pueden quedar fuera de la superficie por cambios en margen, HG o gastos. La tendencia actual es el cierre mensual seleccionado, con la proyección que incluya el dashboard.</p>
    </>:<p className="mb-4 rounded border border-amber-700 p-3 text-amber-200">Faltan venta, comisión, impuestos, gastos o resultado final para calcular la superficie. Completa los datos de esta planta; no se sustituye HG faltante por cero. Puedes consultar sus semanas y propuestas guardadas.</p>}
    {loading&&<p role="status" className="text-sm text-slate-400">Cargando propuestas y categorías…</p>}
    {weekError&&<p role="alert" className="text-amber-200">Semanas: {weekError}</p>}
    <h3 className="mt-4 font-semibold">Venta y descuentos por categoría y subcategoría</h3>
    <p className="text-xs text-slate-400">Fuente ARR: mezcla de clientes con venta anterior al corte, distribuida al volumen mensual seleccionado. Clasificación vigente de clientes. El descuento se muestra como costo positivo y se pondera por kilos. Esta tabla es la base de referencia; los cambios globales del simulador no modifican la mezcla ni los descuentos reales de cada grupo.</p>
    {categoryError&&<p role="alert" className="text-amber-200">Categorías: {categoryError}</p>}
    <div className="overflow-x-auto"><table className="w-full text-right text-sm"><thead className="text-xs text-slate-400"><tr>{["Categoría","Subcategoría","Venta mensual (t)","Comisión / descuento ($)","Descuento ponderado ($/kg)"].map(h=><th className="p-2" key={h}>{h}</th>)}</tr></thead><tbody>
     {["CASA","COMISIONISTA"].map(category=>{const lines=categories.filter(c=>c.category===category).sort((a,b)=>a.subcategory.localeCompare(b.subcategory,"es"));const kg=lines.reduce((s,c)=>s+c.kg,0),amount=lines.every(c=>c.discount_amount!=null)?lines.reduce((s,c)=>s+c.discount_amount!,0):null;
      return <CategoryGroup key={category} category={category} lines={lines} kg={kg} amount={amount}/>;})}
     {!!categories.length&&(()=>{const kg=categories.reduce((s,c)=>s+c.kg,0),amount=categories.every(c=>c.discount_amount!=null)?categories.reduce((s,c)=>s+c.discount_amount!,0):null;return <tr className="border-t-2 border-slate-500 font-semibold"><td className="p-2 text-left" colSpan={2}>TOTAL ARR</td><td>{num(kg/1000)}</td><td>{money(amount)}</td><td>{num(amount!=null&&kg>0?amount/kg:null,4)}</td></tr>;})()}
    </tbody></table></div>
    {!loading&&!categoryError&&!categories.length&&<p className="text-sm text-amber-200">Sin ventas de clientes anteriores al corte para distribuir por categoría.</p>}
    {categories.length>0&&model&&(()=>{const kg=categories.reduce((s,c)=>s+c.kg,0),amount=categories.every(c=>c.discount_amount!=null)?categories.reduce((s,c)=>s+c.discount_amount!,0):null;const discount=amount!=null&&kg>0?amount/kg:null;return <p className="mt-2 text-xs text-amber-200">Conciliación con el resultado seleccionado: diferencia de venta {num(kg/1000-model.q)} t; diferencia de descuento {num(discount!=null?discount-model.d:null,4)} $/kg. ARR y el IGF pueden usar fuentes o ponderaciones distintas; no se fuerza la coincidencia del descuento.</p>;})()}
    <h3 className="mt-4 font-semibold">Resultados por semana</h3><p className="text-xs text-slate-400">La tabla conserva todas las semanas cargadas; las casillas superiores controlan cuáles aparecen en la gráfica. Los equivalentes mensuales usan {new Date(year,month,0).getDate()} días del mes seleccionado, también para las semanas históricas.</p><div className="overflow-x-auto"><table className="w-full text-right text-sm"><thead className="text-xs text-slate-400"><tr>{["Semana / estado","Venta del periodo (t)","Descuento ($/kg)","Resultado del periodo","Ritmo mensual (t)","Resultado mensual equivalente"].map(h=><th key={h} className="p-2">{h}</th>)}</tr></thead><tbody>{weeks.map((w:any)=><tr key={w.key} className={`border-t border-slate-700 ${hiddenWeeks.includes(w.key)?"opacity-50":""}`}><td className="p-2 text-left">{w.label} · {w.state}<div className="text-xs text-slate-400">{w.from} – {w.to}{!w.available?" · Cobertura incompleta; sin punto financiero":hiddenWeeks.includes(w.key)?" · Oculta en gráfica":""}</div></td><td>{num(w.actualTon)}</td><td>{num(w.d,4)}</td><td>{money(w.actualResult)}</td><td>{num(w.q)}</td><td>{money(w.z)}</td></tr>)}</tbody></table></div>
    <h3 className="mt-5 font-semibold">Propuestas guardadas · {row.empresa} · {month}/{year}</h3>
    <p className="text-xs text-slate-400">Se guardan en el dashboard y conservan los supuestos y el corte de creación. No cambian el presupuesto ni las comisiones reales.</p>
    {model&&<form className="my-3 flex flex-wrap gap-2" onSubmit={e=>{e.preventDefault();void save();}}><input aria-label="Nombre de propuesta" required maxLength={120} value={name} onChange={e=>setName(e.target.value)} placeholder="Nombre de la propuesta" className="rounded border border-slate-600 bg-slate-950 px-3 py-2 text-sm"/><button type="submit" disabled={saving||loading||!name.trim()} className="rounded bg-emerald-700 px-3 py-2 text-sm disabled:opacity-40">{saving?"Guardando…":"Guardar punto actual"}</button></form>}
    {error&&<p role="alert" className="text-red-300">{error}</p>}
    <div className="overflow-x-auto"><table className="w-full text-right text-sm"><thead className="text-xs text-slate-400"><tr>{["Propuesta","Venta (t)","Descuento ($/kg)","Resultado estimado","Corte / fuente","Acciones"].map(h=><th key={h} className="p-2">{h}</th>)}</tr></thead><tbody>{saved.map(p=><tr key={p.id} className="border-t border-slate-700"><td className="p-2 text-left">{p.name}</td><td>{num(Number(p.volume_ton))}</td><td>{num(Number(p.discount_kg),4)}</td><td>{money(profit(p.basis,Number(p.volume_ton),Number(p.discount_kg)))}</td><td className="text-xs">{p.basis.cutoff} · {p.basis.mode}<div>Guardada {new Date(p.created_at).toLocaleDateString("es-MX")}</div></td><td className="space-x-3 p-2">{model&&<button type="button" className="text-cyan-300 underline" onClick={()=>{setQ(Number(p.volume_ton));setD(Number(p.discount_kg));}}>Usar valores</button>}<button type="button" disabled={!!busyId} className="text-red-300 underline disabled:opacity-40" onClick={()=>void remove(p.id)}>{busyId===p.id?"Eliminando…":"Eliminar"}</button></td></tr>)}</tbody></table></div>
    {!loading&&!saved.length&&<p className="mt-2 text-sm text-slate-400">Aún no hay propuestas guardadas para esta planta y mes.</p>}
   </div>
  </div>
 </div>;
}

type WeekChoice={key:string;label:string;from:string;to:string;state:string;available:boolean};
function WeekControls({weeks,hidden,onChange}:{weeks:WeekChoice[];hidden:string[];onChange:(keys:string[])=>void}) {
 const available=weeks.filter(w=>w.available);
 return <fieldset className="mt-2"><legend className="text-xs text-slate-300">Semanas visibles en gráfica · {available.filter(w=>!hidden.includes(w.key)).length}/{available.length}</legend>
  <div className="my-2 flex gap-3 text-xs"><button type="button" onClick={()=>onChange([])} className="text-cyan-300 underline">Mostrar todas</button><button type="button" onClick={()=>onChange(available.map(w=>w.key))} className="text-cyan-300 underline">Ocultar todas</button></div>
  <div className="flex max-h-28 flex-wrap gap-2 overflow-y-auto">{weeks.map(w=><label key={w.key} title={`${w.from} – ${w.to} · ${w.state}${!w.available?" · Cobertura incompleta; sin punto financiero":""}`} className={`flex items-center gap-1 rounded border border-slate-600 px-2 py-1 text-xs ${w.available?"text-slate-100":"text-slate-500"}`}><input aria-label={`Mostrar ${w.label} del ${w.from}`} type="checkbox" disabled={!w.available} checked={w.available&&!hidden.includes(w.key)} onChange={e=>onChange(e.target.checked?hidden.filter(key=>key!==w.key):[...hidden,w.key])} className="accent-purple-400"/>{w.label} · {w.from.slice(5)}{!w.available?" · incompleta":""}</label>)}</div>
 </fieldset>;
}

function CategoryGroup({category,lines,kg,amount}:{category:string;lines:CategoryLine[];kg:number;amount:number|null}) {
 return <>{lines.map(line=><tr key={line.subcategory} className="border-t border-slate-700"><td className="p-2 text-left text-cyan-200">{category}</td><td className="text-left">{line.subcategory}{line.missing_discount_kg>0&&<span className="block text-xs text-amber-200">Descuento pendiente en {num(line.missing_discount_kg)} kg</span>}</td><td>{num(line.kg/1000)}</td><td>{money(line.discount_amount)}</td><td>{num(line.discount_kg,4)}</td></tr>)}<tr className="border-t border-slate-600 bg-slate-800 font-semibold"><td colSpan={2} className="p-2 text-left">TOTAL {category}</td><td>{lines.length?num(kg/1000):"—"}</td><td>{lines.length?money(amount):"—"}</td><td>{num(amount!=null&&kg>0?amount/kg:null,4)}</td></tr></>;
}
