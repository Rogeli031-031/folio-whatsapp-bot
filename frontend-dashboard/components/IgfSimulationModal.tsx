"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { getApiUrl, type IgfForecastMiniRow } from "@/lib/api";
import { axisTicks, closestEquilibrium, historyPeriods, mergeWeekColumns, modelFromRow, modelWithHg, hgPercentContext, hgCostFromPercent, profit, visibleWeekPoints, weeklyPoints } from "@/lib/igf-simulation";

type Model={q:number;d:number;a:number;fixed:number};
type Layer={key:string;label:string;color:string;model:Model};
type Financials={margen_kg:number|null;operativos_mxn:number|null;corporativos_mxn:number|null;gasto_mxn:number|null;impuestos_mxn:number|null};
type Point={key:string;label:string;q:number;d:number;z:number;color:string;state?:string;comments?:string};
type Saved={id:string;name:string;volume_ton:number|string;discount_kg:number|string;basis:{a:number;fixed:number;cutoff:string;mode:string;version_as_of:boolean;hg_kg?:number;hg_pct?:number;hg_price_kg?:number;financials?:Financials;comments?:string;category_lines?:CategoryLine[]};created_at:string};
type CategoryLine={category:string;subcategory:string;kg:number;discount_amount:number|null;discount_kg:number|null;missing_discount_kg:number};
const num=(v:number|null|undefined,d=2)=>v==null||!Number.isFinite(v)?"—":v.toLocaleString("es-MX",{maximumFractionDigits:d});
const money=(v:number|null|undefined)=>v==null?"—":`$${num(v,0)}`;
const proposalColors=["#4ade80","#fb923c","#f472b6","#22d3ee","#a3e635","#818cf8","#fbbf24","#e879f9"];
const proposalColor=(id:string)=>proposalColors[Array.from(String(id)).reduce((n,c)=>(n*10+Number(c))%proposalColors.length,0)];

function Surface({model,q,d,points,layers}:{model:Model;q:number;d:number;points:Point[];layers?:Layer[]}) {
 const [camera,setCamera]=useState({az:.78,el:.48}),[view,setView]=useState<"3d"|"top">("3d");
 const rotate=view==="3d";
 const [hiddenLayers,setHiddenLayers]=useState<string[]>([]),[showCurves,setShowCurves]=useState(true),[opacity,setOpacity]=useState(.3);
 const available=layers??[{key:"scenario",label:"Escenario",color:"#38bdf8",model:{...model,q,d}}];
 const visible=available.filter(layer=>!hiddenLayers.includes(layer.key));
 const [zoom,setZoom]=useState(1.15),[viewport,setViewport]=useState({width:1100,height:680});
 const [pan,setPan]=useState({x:0,y:0});
 const svgRef=useRef<SVGSVGElement|null>(null);
 useEffect(()=>{
  const svg=svgRef.current;if(!svg)return;
  const measure=()=>{const box=svg.getBoundingClientRect();if(box.width>0&&box.height>0)setViewport({width:box.width,height:box.height});};
  measure();const observer=new ResizeObserver(measure);observer.observe(svg);return()=>observer.disconnect();
 },[]);
 const drag=useRef<{id:number;x:number;y:number;az:number;el:number;zoom:number;panX:number;panY:number;kind:"rotate"|"zoom"|"pan"}|null>(null);
 const nearest=closestEquilibrium({...model,q,d});
 const scene=useMemo(()=>{
  const all=[...points,{q,d,z:profit(model,q,d)}];
  if(nearest)all.push({...nearest,z:0});
  for(const layer of available){const eq=closestEquilibrium(layer.model);if(eq)all.push({...eq,z:0});}
  const x0=Math.max(0,Math.min(model.q*.4,...all.map(p=>p.q*.8))),x1=Math.max(model.q*1.5,1,...all.map(p=>p.q*1.1));
  const y0=Math.min(0,d-1,...all.map(p=>p.d-.3)),y1=Math.max(5.5,d+1,...all.map(p=>p.d+.5));
  const zValues=[...all.map(p=>p.z),...available.flatMap(layer=>[profit(layer.model,x0,y0),profit(layer.model,x0,y1),profit(layer.model,x1,y0),profit(layer.model,x1,y1)]),0];
  const z0=Math.min(...zValues),z1=Math.max(z0+1,...zValues);
  const axes=[
   {key:"venta",label:"Venta (t/mes)",color:"#93c5fd",min:0,max:x1+(x1-x0)*.18,at:(v:number)=>[v,0,0],format:(v:number)=>`${num(v,0)} t`},
   {key:"descuento",label:"Descuento ($/kg)",color:"#c4b5fd",min:Math.min(0,y0),max:y1+(y1-y0)*.18,at:(v:number)=>[0,v,0],format:(v:number)=>`$${num(v)}/kg`},
   {key:"resultado",label:"Resultado (MXN/mes)",color:"#e2e8f0",min:z0-(z1-z0)*.12,max:z1+(z1-z0)*.12,at:(v:number)=>[0,0,v],format:money},
  ].filter(axis=>view!=="top"||axis.key!=="resultado");
  function raw(x:number,y:number,z:number){const u=2*(x-x0)/(x1-x0)-1,v=2*(y-y0)/(y1-y0)-1,w=2*(z-z0)/(z1-z0)-1;
   if(view==="top")return [u,-v,w];
   const rx=u*Math.cos(camera.az)-v*Math.sin(camera.az),ry=u*Math.sin(camera.az)+v*Math.cos(camera.az);
   return [rx,ry*Math.sin(camera.el)-w*Math.cos(camera.el),ry*Math.cos(camera.el)+w*Math.sin(camera.el)];}
  // Fit the actual surface/markers instead of an imaginary full bounding cube.
  const corners=all.map(p=>raw(p.q,p.d,p.z));
  for(const x of [x0,x1])for(const y of [y0,y1])for(const layer of available){corners.push(raw(x,y,profit(layer.model,x,y)),raw(x,y,0));}
  for(const axis of axes)for(const value of [axis.min,axis.max]){const at=axis.at(value);corners.push(raw(at[0],at[1],at[2]));}
  const minX=Math.min(...corners.map(c=>c[0])),maxX=Math.max(...corners.map(c=>c[0])),minY=Math.min(...corners.map(c=>c[1])),maxY=Math.max(...corners.map(c=>c[1]));
  const scale=Math.min(Math.max(100,viewport.width-150)/(maxX-minX),Math.max(100,viewport.height-130)/(maxY-minY))*zoom;
  const project=(x:number,y:number,z:number)=>{const r=raw(x,y,z);return [viewport.width/2+(r[0]-(minX+maxX)/2)*scale+pan.x,viewport.height/2+(r[1]-(minY+maxY)/2)*scale+pan.y,r[2]];};
  const path=(list:number[][])=>list.map(p=>`${p[0]},${p[1]}`).join(" ");
  const nx=Math.max(6,Math.min(28,Math.floor(Math.sqrt(6000/Math.max(1,visible.length))))),ny=Math.max(5,Math.floor(nx*.8));
  const cells=[];for(let i=0;i<nx;i++)for(let j=0;j<ny;j++){
   const xa=x0+(x1-x0)*i/nx,xb=x0+(x1-x0)*(i+1)/nx,ya=y0+(y1-y0)*j/ny,yb=y0+(y1-y0)*(j+1)/ny;
   for(const layer of visible){const vertices=[[xa,ya],[xb,ya],[xb,yb],[xa,yb]].map(([x,y])=>project(x,y,profit(layer.model,x,y)));
    cells.push({path:path(vertices),depth:vertices.reduce((s,p)=>s+p[2],0)/4,color:layer.color,key:layer.key});}
  }
  cells.sort((a,b)=>a.depth-b.depth);
  const curves=visible.map(layer=>{const zero=[];for(let i=0;i<=240;i++){const x=x0+(x1-x0)*i/240;if(x<=0)continue;const y=layer.model.a-layer.model.fixed/(x*1000);if(y>=y0&&y<=y1)zero.push(project(x,y,0));}return {...layer,zero,eq:closestEquilibrium(layer.model)};});
  return {project,path,cells,curves,x0,x1,y0,y1,z0,z1,axes};
 },[model,q,d,points,camera,nearest?.q,nearest?.d,zoom,viewport,view,available,visible,pan]);
 const p=scene.project(q,d,profit(model,q,d));
 const eq=nearest?scene.project(nearest.q,nearest.d,0):null;
 const trail=points.filter(p=>p.state&&p.state!=="actual").map(p=>scene.project(p.q,p.d,p.z));
 return <>
  <div className="mb-2 flex flex-wrap items-center gap-3 text-xs"><button type="button" aria-pressed={view==="3d"} onClick={()=>{drag.current=null;setView("3d");}} className={`rounded px-3 py-2 ${rotate?"bg-cyan-700":"bg-slate-700"}`}>Vista 3D</button><button type="button" aria-pressed={view==="top"} onClick={()=>{drag.current=null;setView("top");}} className={`rounded px-3 py-2 ${view==="top"?"bg-cyan-700":"bg-slate-700"}`}>Vista superior</button><span className="text-slate-400">{rotate?"Arrastra para girar. ":"Curvas sobre resultado cero. "}Ctrl + botón izquierdo: desplazar. Rueda presionada: arriba acerca, abajo aleja.</span></div>
  <fieldset className="mb-2 flex flex-wrap items-center gap-3 text-xs"><legend>Superficies y equilibrios</legend>{available.map(layer=><label key={layer.key} style={{color:layer.color}}><input type="checkbox" aria-label={`Mostrar superficie ${layer.label}`} checked={!hiddenLayers.includes(layer.key)} onChange={e=>setHiddenLayers(keys=>e.target.checked?keys.filter(key=>key!==layer.key):[...keys,layer.key])}/> {layer.label}</label>)}<label><input type="checkbox" checked={showCurves} onChange={e=>setShowCurves(e.target.checked)}/> Curvas de equilibrio</label><label>Opacidad <input aria-label="Opacidad de superficies" type="range" min=".1" max=".7" step=".05" value={opacity} onChange={e=>setOpacity(Number(e.target.value))}/></label></fieldset>
  <svg ref={svgRef} role="img" aria-label="Superficie de rentabilidad, semanas, tendencia y propuestas" viewBox={`0 0 ${viewport.width} ${viewport.height}`} className="w-full rounded bg-slate-950" style={{height:"clamp(520px,80vh,1100px)",minHeight:420,touchAction:rotate?"none":"auto",cursor:rotate?"grab":"default"}}
   onPointerDown={e=>{const isPan=e.button===0&&e.ctrlKey;if(e.button!==1&&!isPan&&(!rotate||e.button!==0))return;e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);drag.current={id:e.pointerId,x:e.clientX,y:e.clientY,...camera,zoom,panX:pan.x,panY:pan.y,kind:e.button===1?"zoom":isPan?"pan":"rotate"};}}
   onMouseDown={e=>{if(e.button===1)e.preventDefault();}} onAuxClick={e=>{if(e.button===1)e.preventDefault();}}
   onPointerMove={e=>{const g=drag.current;if(!g||g.id!==e.pointerId)return;if(g.kind==="pan"){const box=e.currentTarget.getBoundingClientRect();setPan({x:g.panX+(e.clientX-g.x)*viewport.width/(box.width||viewport.width),y:g.panY+(e.clientY-g.y)*viewport.height/(box.height||viewport.height)});}else if(g.kind==="zoom"){setZoom(Math.max(.5,Math.min(4,g.zoom*Math.exp((g.y-e.clientY)*.006))));}else setCamera({az:g.az+(e.clientX-g.x)*.008,el:Math.max(.1,Math.min(1.48,g.el-(e.clientY-g.y)*.006))});}}
   onPointerUp={e=>{drag.current=null;if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);}}
   onPointerCancel={()=>{drag.current=null;}} onLostPointerCapture={()=>{drag.current=null;}}>
   <text x={viewport.width/2} y="25" textAnchor="middle" fill="#cbd5e1" fontSize="15">{rotate?"Altura: resultado mensual equivalente (MXN)":"Vista superior · venta y descuento · curvas de resultado cero"}</text>
   <polygon points={scene.path([[scene.x0,scene.y0],[scene.x1,scene.y0],[scene.x1,scene.y1],[scene.x0,scene.y1]].map(([x,y])=>scene.project(x,y,0)))} fill="#334155" fillOpacity=".3" stroke="#64748b"/>
   {rotate&&scene.cells.map((c,i)=><polygon key={i} data-surface={c.key} points={c.path} fill={c.color} fillOpacity={opacity} stroke={c.color} strokeOpacity=".25" strokeWidth=".6"/>)}
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
   {showCurves&&scene.curves.map(layer=><g key={layer.key} data-equilibrium={layer.key}><polyline points={scene.path(layer.zero)} fill="none" stroke={layer.color} strokeWidth="3"><title>{`Equilibrio · ${layer.label}`}</title></polyline>{layer.eq&&(()=>{const at=scene.project(layer.eq.q,layer.eq.d,0);return <circle cx={at[0]} cy={at[1]} r="5" fill={layer.color} stroke="white"><title>{`Equilibrio: ${layer.label} · ${num(layer.eq.q)} t · $${num(layer.eq.d,4)}/kg`}</title></circle>;})()}</g>)}
   {trail.length>1&&<polyline points={scene.path(trail)} fill="none" stroke="#c084fc" strokeWidth="3" strokeDasharray="7 5"/>}
   {eq&&nearest&&<><line x1={p[0]} y1={p[1]} x2={eq[0]} y2={eq[1]} stroke="#fb923c" strokeWidth="3"/><circle cx={eq[0]} cy={eq[1]} r="7" fill="#fb923c" stroke="white"><title>{`Equilibrio: ${num(nearest.q)} t · ${num(nearest.d,4)}/kg`}</title></circle></>}
   {points.map(point=>{const at=scene.project(point.q,point.d,point.z);return <g key={point.key} aria-label={point.comments?`${point.label} · ${point.comments}`:point.label}><circle cx={at[0]} cy={at[1]} r="7" fill={point.state==="proyectada"?"#020617":point.color} stroke={point.state==="proyectada"?point.color:"white"} strokeDasharray={point.state==="parcial"?"3 2":undefined} strokeWidth="2"><title>{`${point.label}: ${num(point.q)} t · ${num(point.d,4)}/kg · ${money(point.z)}${point.state?` · ${point.state}`:""}${point.comments?` · ${point.comments}`:""}`}</title></circle><text x={at[0]+10} y={at[1]-9} fill={point.color} stroke="#020617" strokeWidth="3" paintOrder="stroke" fontSize="15">{point.label}</text></g>;})}
   <circle cx={p[0]} cy={p[1]} r="9" fill="#38bdf8" stroke="white" strokeWidth="3"><title>{`Escenario: ${num(q)} t · ${num(d,4)}/kg · ${money(profit(model,q,d))}`}</title></circle>
   <text x="16" y={viewport.height-35} fill="#cbd5e1" fontSize="13">Venta: {num(scene.x0,0)}–{num(scene.x1,0)} t/mes</text><text x="16" y={viewport.height-15} fill="#cbd5e1" fontSize="13">Descuento: ${num(scene.y0)}–${num(scene.y1)}/kg</text>
  </svg>
  <p className="text-xs text-slate-300">Cada color identifica una superficie y su curva de resultado cero. Por encima de cero hay utilidad; por debajo, pérdida. Las áreas no representan porcentajes ni probabilidades.</p>
  <p className="text-xs text-slate-300">Punto azul: escenario · Morado: semanas · Amarillo: tendencia actual · Propuestas: número y comentarios. Cada propuesta usa todos sus supuestos guardados, no solo HG. Las semanas pueden quedar fuera de estas superficies por usar otros supuestos.</p>
  <p className="text-sm text-orange-200">{nearest?`Equilibrio cercano: ${num(nearest.q)} t/mes · $${num(nearest.d,4)}/kg. Cambio: ${num(nearest.q-q)} t y $${num(nearest.d-d,4)}/kg.`:"Sin equilibrio con venta positiva y descuento no negativo."}</p>
  <p className="text-xs text-slate-400">Distancia normalizada: 1,600 t y $4.50/kg por unidad. La línea es geométrica; llegar a cero no mejora un escenario que ya tiene utilidad.</p>
 </>;
}

export default function IgfSimulationModal({row,token,year,month,cutoff,versionAsOf,mode,onClose}:{row:IgfForecastMiniRow;token:string;year:number;month:number;cutoff:string;versionAsOf:boolean;mode:"forecast"|"igf_diario";onClose:()=>void}) {
 const baseModel=useMemo(()=>modelFromRow(row) as Model|null,[row]);
 const hgContext=useMemo(()=>hgPercentContext(row),[row]);
 const baseHg=hgContext.percent;
 const [hg,setHg]=useState<number|null>(baseHg);
 const [selected,setSelected]=useState<Saved|null>(null);
 const [editingId,setEditingId]=useState<string|null>(null);
 const [comparisonIds,setComparisonIds]=useState<string[]>([]);
 const anchor=selected?{...selected.basis,q:Number(selected.volume_ton),d:Number(selected.discount_kg)}:baseModel;
 const savedHg=(p:Saved)=>p.basis.hg_pct!=null?p.basis.hg_pct*100:p.basis.hg_kg!=null&&hgContext.price!=null?-p.basis.hg_kg/hgContext.price*100:null;
 const anchorHg=selected?savedHg(selected):baseHg;
 const anchorCost=selected?.basis.hg_kg??hgContext.cost;
 const hgPrice=selected?.basis.hg_price_kg??hgContext.price;
 const model=useMemo(()=>hg===anchorHg?anchor:modelWithHg(anchor,anchorCost,hgCostFromPercent(hg,hgPrice)) as Model|null,[anchor,anchorCost,hg,hgPrice,anchorHg]);
 const [q,setQ]=useState(baseModel?.q||0),[d,setD]=useState(baseModel?.d||0);
 const [columns,setColumns]=useState<any[]>([]),[saved,setSaved]=useState<Saved[]>([]),[error,setError]=useState("");
 const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false);
 const [pendingDelete,setPendingDelete]=useState<Saved|null>(null),[deleting,setDeleting]=useState(false);
 const deleteLock=useRef(false);
 const [weekError,setWeekError]=useState("");
 const [monthsBack,setMonthsBack]=useState(1),[selectedWeeks,setSelectedWeeks]=useState<string[]>([]),[weeksLoading,setWeeksLoading]=useState(true);
 const [categories,setCategories]=useState<CategoryLine[]>([]),[categoryError,setCategoryError]=useState("");
 const [edits,setEdits]=useState<CategoryLine[]|null>(null);
 const [comments,setComments]=useState("");
 const categoryLines=edits??categories;
 const scenarioReady=q>0&&(!edits||edits.every(c=>c.discount_kg!=null));
 function reset(){setEditingId(null);setSelected(null);setQ(baseModel?.q||0);setD(baseModel?.d||0);setHg(baseHg);setEdits(null);setComments("");}
 function editLine(index:number,key:"kg"|"discount_kg",value:number){
  const lines=categoryLines.map((c,i)=>{if(i!==index)return c;const next={...c,[key]:value};return {...next,discount_amount:next.discount_kg==null?null:next.kg*next.discount_kg,missing_discount_kg:next.discount_kg==null?next.kg:0};});
  const kg=lines.reduce((sum,c)=>sum+c.kg,0);if(kg>1e9)return;
  setEdits(lines);setQ(kg/1000);if(lines.every(c=>c.discount_kg!=null)&&kg>0)setD(lines.reduce((sum,c)=>sum+(c.discount_amount||0),0)/kg);
 }
 function choose(p:Saved){setEditingId(null);setComparisonIds(ids=>ids.includes(p.id)?ids:[...ids,p.id]);setSelected(p);setQ(Number(p.volume_ton));setD(Number(p.discount_kg));setHg(savedHg(p));setEdits(p.basis.category_lines??null);setComments(p.basis.comments||p.name);setError("");setPanel(null);}
 function edit(p:Saved){choose(p);setEditingId(p.id);setPanel("categories");}
 const [panel,setPanel]=useState<"weeks"|"categories"|"proposals"|"comparison"|null>(null);
 const [detail,setDetail]=useState<{week:any;field:string}|null>(null),[detailData,setDetailData]=useState<any>(null),[detailError,setDetailError]=useState("");
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
 useEffect(()=>{const listener=(e:KeyboardEvent)=>{if(e.key==="Escape"&&!saving){if(detail)setDetail(null);else if(panel)setPanel(null);else onClose();}};document.addEventListener("keydown",listener);return()=>document.removeEventListener("keydown",listener);},[onClose,saving,panel,detail]);
 useEffect(()=>{
  if(!detail)return;
  const controller=new AbortController();setDetailData(null);setDetailError("");
  const search=new URLSearchParams(params);search.set("year",detail.week.from.slice(0,4));search.set("month",String(Number(detail.week.from.slice(5,7))));search.set("week_anchor",detail.week.from);search.set("upload_day",cutoff);
  if(versionAsOf)search.set("version_as_of_corte","1");
  void request(`/api/dashboard/igf-diario-semanal?${search}`,{signal:controller.signal}).then(data=>{if(!controller.signal.aborted)setDetailData(data);}).catch(e=>{if(!controller.signal.aborted)setDetailError(e.message);});
  return()=>controller.abort();
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[detail,params,token,cutoff,versionAsOf]);
 const weeks=useMemo(()=>weeklyPoints(columns,year,month),[columns,year,month]);
 const hiddenWeeks=weeks.filter((w:any)=>!selectedWeeks.includes(w.key)).map((w:any)=>w.key);
 const points:Point[]=visibleWeekPoints(weeks,hiddenWeeks);
 if(baseModel)points.push({key:"current",label:"Tendencia actual",q:baseModel.q,d:baseModel.d,z:profit(baseModel,baseModel.q,baseModel.d),color:"#facc15",state:"actual"});
 const comparisons=saved.filter(p=>comparisonIds.includes(p.id));
 const baseFinancials:Financials={margen_kg:row.margen??null,operativos_mxn:row.operativos??null,corporativos_mxn:row.corporativos??null,gasto_mxn:row.gasto??(row.operativos!=null&&row.corporativos!=null?row.operativos+row.corporativos:null),impuestos_mxn:baseModel&&row.impuestos!=null?row.impuestos*baseModel.q*1000:null};
 const financials=selected?selected.basis.financials:baseFinancials;
 const layers:Layer[]=[...(baseModel?[{key:"actual",label:"Actual",color:"#38bdf8",model:baseModel}]:[]),...comparisons.map(p=>({key:`proposal-${p.id}`,label:`Punto #${p.id}`,color:proposalColor(p.id),model:{...p.basis,q:Number(p.volume_ton),d:Number(p.discount_kg)}}))];
 if(model&&!layers.some(layer=>Math.abs(layer.model.a-model.a)<1e-10&&Math.abs(layer.model.fixed-model.fixed)<1e-5))layers.push({key:"scenario",label:"Escenario en edición",color:"#f8fafc",model:{...model,q,d}});
 const comparisonData:ComparisonRecord[]=[...(baseModel?[{label:"Actual",model:baseModel,hg:baseHg,price:hgContext.price,financials:baseFinancials,cutoff,mode,comments:"Corte del dashboard"}]:[]),...(model?[{label:"Escenario activo",model:{...model,q,d},hg,price:hgPrice,financials,cutoff:selected?.basis.cutoff??cutoff,mode:selected?.basis.mode??mode,comments}]:[]),...comparisons.map(p=>({label:`Punto #${p.id}`,model:{...p.basis,q:Number(p.volume_ton),d:Number(p.discount_kg)},hg:p.basis.hg_pct!=null?p.basis.hg_pct*100:null,price:p.basis.hg_price_kg??null,financials:p.basis.financials,cutoff:p.basis.cutoff,mode:p.basis.mode,comments:p.basis.comments||p.name}))];
 for(const proposal of comparisons)points.push({key:`proposal-${proposal.id}`,label:`Punto #${proposal.id}`,comments:proposal.basis.comments||proposal.name,q:Number(proposal.volume_ton),d:Number(proposal.discount_kg),z:profit(proposal.basis,Number(proposal.volume_ton),Number(proposal.discount_kg)),color:proposalColor(proposal.id)});
 async function save(){if(!model||!scenarioReady||saveLock.current)return;saveLock.current=true;setSaving(true);setError("");try{
  const data=await request("/api/dashboard/igf-simulation-proposals",{method:editingId?"PUT":"POST",body:JSON.stringify({year,month,plant_code:plant,...(editingId?{id:editingId}:{}),name:editingId&&selected?selected.name:"Punto de simulación",volume_ton:q,discount_kg:d,basis:{a:model.a,fixed:model.fixed,cutoff:selected?.basis.cutoff??cutoff,mode:selected?.basis.mode??mode,version_as_of:selected?.basis.version_as_of??versionAsOf,comments,...(financials?{financials}:{}),...(edits?{category_lines:edits}:{}),...(hg!=null&&hgPrice!=null?{hg_kg:hgCostFromPercent(hg,hgPrice),hg_pct:hg/100,hg_price_kg:hgPrice}:{})}})});
  setSaved(rows=>editingId?rows.map(p=>p.id===editingId?data.row:p):[data.row,...rows].slice(0,200));setComparisonIds(ids=>ids.includes(String(data.row.id))?ids:[...ids,String(data.row.id)]);setSelected(data.row);setPanel(null);
 }catch(e){setError((e as Error).message);}finally{saveLock.current=false;setSaving(false);}}
 async function removePoint(){
  if(!pendingDelete||deleteLock.current||saveLock.current)return;
  const id=pendingDelete.id;deleteLock.current=true;setDeleting(true);setError("");
  try{
   await request(`/api/dashboard/igf-simulation-proposals?${params}&id=${encodeURIComponent(id)}`,{method:"DELETE"});
   setSaved(rows=>rows.filter(p=>p.id!==id));setComparisonIds(ids=>ids.filter(value=>value!==id));
   if(selected?.id===id)reset();setPendingDelete(null);
  }catch(e){setError((e as Error).message);}finally{deleteLock.current=false;setDeleting(false);}
 }
 const field="w-28 rounded border border-slate-600 bg-slate-950 px-2 py-1 text-sm text-white";
 return <div role="dialog" aria-modal="true" aria-labelledby="igf-simulation-title" className="fixed inset-0 z-[80] bg-slate-950/90 p-2 sm:p-4">
  <div className="mx-auto flex max-h-[96vh] w-full flex-col overflow-hidden rounded-xl border border-slate-600 bg-slate-900 text-slate-100">
   <header className="flex items-center justify-between gap-3 border-b border-slate-700 p-3"><div><h2 id="igf-simulation-title" className="text-lg font-semibold">Simulador de rentabilidad · {row.empresa}</h2><p className="text-xs text-slate-400">{month}/{year} · Corte {cutoff} · {mode==="forecast"?"Forecast":"IGF Diario acumulado"}</p></div><button type="button" disabled={saving} onClick={onClose} className="rounded bg-slate-700 px-3 py-2">Cerrar</button></header>
   <div className="overflow-y-auto p-3 sm:p-4">
    <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
     <button type="button" onClick={()=>setPanel("weeks")} className="rounded bg-purple-800 px-3 py-2">Semanas · {weeks.filter((w:any)=>w.available&&!hiddenWeeks.includes(w.key)).length}/{weeks.filter((w:any)=>w.available).length}</button>
     <button type="button" onClick={()=>setPanel("categories")} className="rounded bg-slate-700 px-3 py-2">Categorías del mes</button>
     <button type="button" onClick={()=>setPanel("proposals")} className="rounded bg-emerald-800 px-3 py-2">Puntos guardados ({saved.length})</button>
     <button type="button" onClick={()=>setPanel("comparison")} className="rounded bg-indigo-800 px-3 py-2">Comparación completa</button>
     {weeksLoading&&<span role="status">Cargando semanas…</span>}
    </div>
    <div className="mb-3 overflow-x-auto rounded border border-slate-700"><table className="w-full text-right text-xs"><caption className="p-2 text-left text-slate-400">Base mensual de la superficie · {month}/{year} · Margen bruto del IGF; contribución efectiva antes del descuento: {num(baseModel?.a,4)} $/kg (incluye HG y ajustes del resultado seleccionado).</caption><thead><tr>{["Venta (t)","Margen ($/kg)","Descuento ($/kg)","HG (% venta)","Operativos ($)","Corporativos ($)","Gasto ($)","Resultado ($)"].map(h=><th key={h} className="p-2">{h}</th>)}</tr></thead><tbody><tr className="bg-slate-800"><td className="p-2"><button type="button" className="text-cyan-300 underline" onClick={()=>setPanel("categories")}>{num(row.ventaTon)}</button></td><td>{num(row.margen,4)}</td><td><button type="button" className="text-cyan-300 underline" onClick={()=>setPanel("categories")}>{num(baseModel?.d,4)}</button></td><td>{num(baseHg,4)}</td><td>{money(row.operativos)}</td><td>{money(row.corporativos)}</td><td>{money(row.gasto)}</td><td>{money(row.resultadoFinalImporte)}</td></tr></tbody></table></div>
    {model?<>
     <div className="mb-2 flex flex-wrap items-center gap-3 text-sm"><strong className="text-cyan-200">{selected?`Punto #${selected.id} · `:""}Resultado: {scenarioReady?money(profit(model,q,d)):"Pendiente de completar venta / descuentos"}</strong><button type="button" onClick={reset} className="rounded bg-slate-700 px-2 py-1">Restaurar actual</button>{selected&&<span className="whitespace-pre-wrap text-slate-300">{selected.basis.comments||selected.name}</span>}</div>
     {!!comparisons.length&&<div aria-label="Propuestas comparadas" className="mb-2 flex flex-wrap gap-2 text-xs">{comparisons.map(p=><button type="button" key={p.id} aria-label={`Editar punto #${p.id}`} disabled={saving} onClick={()=>edit(p)} className="max-w-lg rounded border border-slate-600 bg-slate-800 px-3 py-2 text-left hover:border-cyan-400 focus-visible:outline focus-visible:outline-cyan-400"><strong style={{color:proposalColor(p.id)}}>Punto #{p.id} · {money(profit(p.basis,Number(p.volume_ton),Number(p.discount_kg)))}</strong><span className="block whitespace-pre-wrap break-words text-slate-200">{p.basis.comments||p.name}</span><span className="text-slate-400">{num(Number(p.volume_ton))} t · ${num(Number(p.discount_kg),4)}/kg · HG {p.basis.hg_pct==null?"—":`${num(p.basis.hg_pct*100,4)}%`} · Corte {p.basis.cutoff}</span><span className="mt-1 block text-cyan-300">Editar este punto</span></button>)}</div>}
     {scenarioReady?<Surface model={model} q={q} d={d} points={points} layers={layers}/>:<p role="alert" className="p-3 text-amber-200">Completa los descuentos de cada subcategoría y una venta total mayor que cero para calcular el escenario.</p>}
     <p className="my-3 text-xs text-slate-400">La superficie reproduce el resultado seleccionado y mantiene fijos los gastos e impuestos mensuales: {money(model.fixed)}. Se modifican venta, descuento y HG; no predice la reacción de los clientes. Las semanas se convierten a ritmo mensual (venta y resultado ÷ días del periodo × días del mes) para compararlas. Pueden quedar fuera de la superficie por cambios en margen, HG o gastos. La tendencia actual es el cierre mensual seleccionado, con la proyección que incluya el dashboard.</p>
    </>:<p className="mb-4 rounded border border-amber-700 p-3 text-amber-200">Faltan venta, comisión, impuestos, gastos o resultado final para calcular la superficie. Completa los datos de esta planta; no se sustituye HG faltante por cero. Puedes consultar sus semanas y propuestas guardadas.</p>}
    {loading&&<p role="status" className="text-sm text-slate-400">Cargando propuestas y categorías…</p>}
    {weekError&&<p role="alert" className="text-amber-200">Semanas: {weekError}</p>}
    {panel&&<Popup title={panel==="comparison"?"Comparación completa de escenarios":panel==="weeks"?"Semanas · selección y resumen financiero":panel==="categories"?"Venta y descuentos por categoría y subcategoría · mes seleccionado":"Puntos y propuestas"} onClose={()=>setPanel(null)}>
     {panel==="comparison"&&<FullComparison records={comparisonData}/>}
     {panel==="weeks"&&<>
     <label className="flex flex-wrap items-center gap-2 text-xs">Historial de semanas
      <select aria-label="Historial de semanas" value={monthsBack} onChange={e=>setMonthsBack(Number(e.target.value))} className="rounded border border-slate-600 bg-slate-950 px-2 py-1">
       <option value={0}>Solo el mes seleccionado</option><option value={1}>Mes anterior y mes seleccionado</option><option value={2}>Últimos 3 meses hasta el seleccionado</option><option value={5}>Últimos 6 meses hasta el seleccionado</option>
      </select><span className="text-slate-400">El historial usa el mismo corte y la misma planta.</span>
     </label>
     {weeksLoading?<p role="status">Cargando semanas…</p>:<WeekControls weeks={weeks} hidden={hiddenWeeks} onChange={hidden=>setSelectedWeeks(weeks.filter((w:any)=>w.available&&!hidden.includes(w.key)).map((w:any)=>w.key))} onDetail={(week,field)=>setDetail({week,field})}/>}
     <p className="mt-3 text-xs text-slate-400">Importes del periodo de domingo a sábado; margen y descuento ponderados por kilos. Pulsa una cifra para ver sus días. La gráfica convierte venta y resultado a ritmo mensual. Corporativos incluye gasto corporativo, inversiones e impuestos federales, según el IGF semanal. — indica dato no disponible; no se sustituye por cero.</p>
     </>}
     {panel==="categories"&&<>
    {model&&<div className="sticky top-0 z-10 mb-3 bg-slate-900 pb-2">{editingId&&<p className="mb-2 font-semibold">Editando punto #{editingId} · {selected?.name}</p>}<button type="button" disabled={saving||loading||!scenarioReady||!!categoryError} onClick={()=>void save()} className="rounded bg-emerald-700 px-3 py-2 disabled:opacity-40">{saving?"Guardando…":editingId?`Guardar cambios del punto #${editingId}`:"Agregar punto / propuesta"}</button></div>}
    {model&&<>
     <div className="mb-3 flex flex-wrap items-center gap-4 text-xs">{!categoryLines.length&&<><label>Venta (t/mes) <input aria-label="Venta simulada en toneladas" type="number" min="1" max="1000000" step="1" value={q} onChange={e=>setQ(Math.max(1,Math.min(1000000,Number(e.target.value)||1)))} className={field}/></label><label>Comisión / descuento ($/kg) <input aria-label="Descuento simulado por kilo" type="number" min="-100" max="100" step=".01" value={d} onChange={e=>setD(Math.max(-100,Math.min(100,Number(e.target.value)||0)))} className={field}/></label></>}{!!categoryLines.length&&<span>Venta: {num(q)} t · Descuento: {num(d,4)} $/kg</span>}<label>HG (% de venta) <input aria-label="HG simulado como porcentaje de venta" type="number" min="-100" max="100" step=".01" disabled={anchorHg==null} value={hg??""} onChange={e=>setHg(Math.max(-100,Math.min(100,Number(e.target.value)||0)))} className={field}/></label><strong className="text-base text-cyan-200">Resultado: {scenarioReady?money(profit(model,q,d)):"Pendiente de completar venta / descuentos"}</strong><button type="button" onClick={reset} className="rounded bg-slate-700 px-2 py-1">Restaurar actual</button></div>
     <p className="mb-2 text-xs text-slate-400">{anchorHg==null?"Falta HG o su valor por kilo para convertir a porcentaje; su edición está deshabilitada.":`HG base: ${num(baseHg,4)}% · HG simulado: ${num(hg,4)}% de la venta = ${num(Math.abs(q*1000*(hg||0)/100))} kg ${(hg||0)>=0?"generados":"perdidos"} · Importe HG: ${money(q*1000*(hg||0)/100*hgPrice!)}. Valoración: ${num(hgPrice,4)}/kg (gas + flete). Un porcentaje positivo genera kilos y aumenta el resultado; uno negativo representa pérdida. Las semanas y la tendencia actual conservan sus cifras originales.`}</p>
    <label className="mb-3 block text-sm">Comentarios de la propuesta<textarea aria-label="Comentarios de la propuesta" maxLength={2000} value={comments} onChange={e=>setComments(e.target.value)} className="mt-1 block min-h-20 w-full rounded border border-slate-600 bg-slate-950 p-2" placeholder="Describe los cambios y el objetivo de este punto"/></label>
    {error&&<p role="alert" className="text-red-300">{error}</p>}
    </>}

    <h3 className="mt-4 font-semibold">Venta y descuentos por categoría y subcategoría</h3>
    <p className="text-xs text-slate-400">Fuente ARR: mezcla de clientes con venta anterior al corte, distribuida al volumen mensual seleccionado. Clasificación vigente de clientes. El descuento se muestra como costo positivo y se pondera por kilos. Edita venta y descuento de cada subcategoría para simular otra mezcla; el descuento total se pondera por kilos. Los datos reales no se modifican. Hasta editar una fila se conserva el resultado IGF seleccionado; ARR e IGF pueden diferir.</p>
    {categoryError&&<p role="alert" className="text-amber-200">Categorías: {categoryError}</p>}
    <div className="overflow-x-auto"><table className="w-full text-right text-sm"><thead className="text-xs text-slate-400"><tr>{["Categoría","Subcategoría","Venta mensual (t)","Comisión / descuento ($)","Descuento ponderado ($/kg)"].map(h=><th className="p-2" key={h}>{h}</th>)}</tr></thead><tbody>
     {["CASA","COMISIONISTA"].map(category=>{const lines=categoryLines.filter(c=>c.category===category).sort((a,b)=>a.subcategory.localeCompare(b.subcategory,"es"));const kg=lines.reduce((s,c)=>s+c.kg,0),amount=lines.every(c=>c.discount_amount!=null)?lines.reduce((s,c)=>s+c.discount_amount!,0):null;
      return <CategoryGroup key={category} category={category} lines={lines} kg={kg} amount={amount} editable={!!model} onEdit={(line,key,value)=>editLine(categoryLines.indexOf(line),key,value)}/>;})}
     {!!categories.length&&(()=>{const kg=categoryLines.reduce((s,c)=>s+c.kg,0),amount=categoryLines.every(c=>c.discount_amount!=null)?categoryLines.reduce((s,c)=>s+c.discount_amount!,0):null;return <tr className="border-t-2 border-slate-500 font-semibold"><td className="p-2 text-left" colSpan={2}>TOTAL ARR</td><td>{num(kg/1000)}</td><td>{money(amount)}</td><td>{num(amount!=null&&kg>0?amount/kg:null,4)}</td></tr>;})()}
    </tbody></table></div>
    {!loading&&!categoryError&&!categories.length&&<p className="text-sm text-amber-200">Sin ventas de clientes anteriores al corte para distribuir por categoría.</p>}
    {categories.length>0&&model&&(()=>{const kg=categoryLines.reduce((s,c)=>s+c.kg,0),amount=categoryLines.every(c=>c.discount_amount!=null)?categoryLines.reduce((s,c)=>s+c.discount_amount!,0):null;const discount=amount!=null&&kg>0?amount/kg:null;return <p className="mt-2 text-xs text-amber-200">Conciliación con el resultado seleccionado: diferencia de venta {num(kg/1000-model.q)} t; diferencia de descuento {num(discount!=null?discount-model.d:null,4)} $/kg. ARR y el IGF pueden usar fuentes o ponderaciones distintas; no se fuerza la coincidencia del descuento.</p>;})()}
     </>}
     {panel==="proposals"&&<>
      <h3 className="font-semibold">Puntos guardados · {row.empresa} · {month}/{year}</h3>
      <p className="mb-3 text-xs text-slate-400">Marca varios puntos para compararlos al mismo tiempo. Las casillas solo muestran u ocultan propuestas; pulsa su número para cargar una como escenario activo. Cada punto conserva su resultado original. Crea nuevos puntos desde Categorías del mes.</p>
      <div className="mb-3 flex flex-wrap gap-3 text-sm"><button type="button" className="text-cyan-300 underline" onClick={()=>setComparisonIds(saved.map(p=>p.id))}>Mostrar todos los puntos</button><button type="button" className="text-cyan-300 underline" onClick={()=>setComparisonIds([])}>Ocultar todos los puntos</button><span>{comparisons.length} puntos visibles</span></div>
      <div className="overflow-x-auto"><table className="w-full text-right text-sm"><thead><tr>{["Comparar","Punto","Comentarios","Venta (t)","Descuento ($/kg)","HG (%)","Resultado","Corte","Acciones"].map(h=><th key={h} className="p-2">{h}</th>)}</tr></thead><tbody>{saved.map(p=><tr key={p.id} className="border-t border-slate-700"><td className="p-2"><input type="checkbox" aria-label={`Comparar punto #${p.id}`} checked={comparisonIds.includes(p.id)} onChange={e=>setComparisonIds(ids=>e.target.checked?(ids.includes(p.id)?ids:[...ids,p.id]):ids.filter(id=>id!==p.id))} className="accent-emerald-400"/></td><td className="p-2"><button type="button" onClick={()=>choose(p)} style={{color:proposalColor(p.id)}} className="underline">Punto #{p.id}</button></td><td className="max-w-lg whitespace-pre-wrap break-words p-2 text-left">{p.basis.comments||p.name}</td><td>{num(Number(p.volume_ton))}</td><td>{num(Number(p.discount_kg),4)}</td><td>{p.basis.hg_pct==null?"—":num(p.basis.hg_pct*100,4)}</td><td>{money(profit(p.basis,Number(p.volume_ton),Number(p.discount_kg)))}</td><td>{p.basis.cutoff}</td><td className="p-2"><button type="button" aria-label={`Eliminar punto #${p.id}`} disabled={saving||deleting} onClick={()=>{setError("");setPendingDelete(p);}} className="rounded bg-red-900 px-3 py-1 text-red-100 hover:bg-red-700 disabled:opacity-40">Eliminar</button></td></tr>)}</tbody></table></div>
      {!loading&&!saved.length&&<p>Aún no hay puntos guardados para esta planta y mes.</p>}
      {error&&<p role="alert" className="text-red-300">{error}</p>}

     </>}
    </Popup>}
    {detail&&<Popup title={`${detail.week.label} · ${DETAIL_LABELS[detail.field]||detail.field} · ${detail.week.from} – ${detail.week.to}`} onClose={()=>setDetail(null)}>
     {detailError?<p role="alert" className="text-amber-200">{detailError}</p>:!detailData?<p role="status">Cargando detalle diario…</p>:<DailyDetail data={detailData} week={detail.week} field={detail.field}/>}
    </Popup>}
    {pendingDelete&&<Popup title={`Eliminar punto #${pendingDelete.id}`} onClose={()=>{if(!deleting)setPendingDelete(null);}}>
     <p className="mb-2 font-semibold">Punto #{pendingDelete.id} · {pendingDelete.basis.comments||pendingDelete.name}</p>
     <p className="mb-4 text-sm text-slate-300">Se eliminará esta propuesta guardada y se quitará de la comparación. Esta acción no se puede deshacer.</p>
     <div className="flex gap-3"><button type="button" disabled={deleting} onClick={()=>setPendingDelete(null)} className="rounded bg-slate-700 px-3 py-2 disabled:opacity-40">Cancelar</button><button type="button" disabled={deleting} onClick={()=>void removePoint()} className="rounded bg-red-700 px-3 py-2 disabled:opacity-40">{deleting?"Eliminando…":"Eliminar definitivamente"}</button></div>
     {error&&<p role="alert" className="mt-3 text-red-300">{error}</p>}
    </Popup>}
   </div>
  </div>
 </div>;
}

const DETAIL_LABELS:Record<string,string>={venta:"Venta",margen:"Margen bruto",descuento:"Comisión / descuento",operativos:"Gastos operativos",corporativos:"Gastos corporativos",gasto:"Gasto total",hg:"HG",impuestos:"Impuestos federales",resultado:"Resultado"};
type WeekChoice={key:string;label:string;from:string;to:string;state:string;available:boolean;actualTon?:number|null;d?:number|null;actualResult?:number|null;metrics?:any;financials?:any;forecastSources?:any[]};
function WeekControls({weeks,hidden,onChange,onDetail}:{weeks:WeekChoice[];hidden:string[];onChange:(keys:string[])=>void;onDetail?:(week:WeekChoice,field:string)=>void}) {
 const available=weeks.filter(w=>w.available);
 const fields=["venta","margen","descuento","operativos","corporativos","gasto","hg","impuestos","resultado"];
 return <fieldset className="mt-2"><legend className="text-xs text-slate-300">Semanas visibles en gráfica · {available.filter(w=>!hidden.includes(w.key)).length}/{available.length}</legend>
  <div className="my-2 flex gap-3 text-xs"><button type="button" onClick={()=>onChange([])} className="text-cyan-300 underline">Mostrar todas</button><button type="button" onClick={()=>onChange(available.map(w=>w.key))} className="text-cyan-300 underline">Ocultar todas</button></div>
  <div className="overflow-x-auto"><table className="w-full min-w-[1100px] text-right text-xs"><thead><tr><th className="p-2 text-left">Mostrar / semana</th>{fields.map(field=><th key={field} className="p-2">{DETAIL_LABELS[field]} {field==="venta"?"(t)":field==="margen"||field==="descuento"?"($/kg)":"($)"}</th>)}</tr></thead><tbody>
   {weeks.map(w=>{const m=w.metrics||{},f=w.financials||{},values:Record<string,number|null|undefined>={venta:w.actualTon,margen:f.margen,descuento:w.d,operativos:f.operativos,corporativos:f.corporativos,gasto:f.gasto,hg:m.hg_mxn,impuestos:m.venta_kg>0&&m.impuestos_federales_kg!=null?m.venta_kg*m.impuestos_federales_kg:null,resultado:w.actualResult};return <tr key={w.key} className="border-t border-slate-700"><td className="p-2 text-left"><label className="flex items-center gap-2"><input aria-label={`Mostrar ${w.label} del ${w.from}`} type="checkbox" disabled={!w.available} checked={w.available&&!hidden.includes(w.key)} onChange={e=>onChange(e.target.checked?hidden.filter(key=>key!==w.key):[...hidden,w.key])} className="accent-purple-400"/>{w.label}</label><div className="mt-1 text-slate-400">{w.from} – {w.to} · {w.state}{!w.available?" · incompleta":""}{!!w.forecastSources?.length?" · IGF Forecast histórico":""}</div></td>{fields.map(field=><td key={field} className="p-2"><button type="button" aria-label={`${DETAIL_LABELS[field]} de ${w.label} del ${w.from}`} onClick={()=>onDetail?.(w,field)} className="text-cyan-200 underline decoration-dotted underline-offset-4">{field==="venta"||field==="margen"||field==="descuento"?num(values[field],field==="venta"?2:4):money(values[field])}</button></td>)}</tr>;})}
  </tbody></table></div>
 </fieldset>;
}
type ComparisonRecord={label:string;model:Model;hg:number|null;price:number|null;financials?:Financials;cutoff:string;mode:string;comments:string};
function FullComparison({records}:{records:ComparisonRecord[]}) {
 const values=(r:ComparisonRecord)=>{
  const m=r.model,hgKg=r.hg==null?null:m.q*1000*r.hg/100,eq=closestEquilibrium(m);
  return {q:m.q,d:m.d,commission:m.q*1000*m.d,hg:r.hg,hgKg,hgPrice:r.price,hgAmount:hgKg!=null&&r.price!=null?hgKg*r.price:null,
   margin:r.financials?.margen_kg,a:m.a,operating:r.financials?.operativos_mxn,corporate:r.financials?.corporativos_mxn,total:r.financials?.gasto_mxn,taxes:r.financials?.impuestos_mxn,fixed:m.fixed,contribution:m.q*1000*(m.a-m.d),result:profit(m,m.q,m.d),
   eqQ:m.a-m.d>0?m.fixed/(m.a-m.d)/1000:null,eqD:m.q>0?m.a-m.fixed/(m.q*1000):null,closestQ:eq?.q,closestD:eq?.d};
 };
 const fields:{key:keyof ReturnType<typeof values>;label:string;format:(v:number)=>string}[]=[
  {key:"q",label:"Venta mensual (t)",format:v=>num(v)}, {key:"d",label:"Descuento ponderado ($/kg)",format:v=>num(v,4)}, {key:"commission",label:"Comisiones / descuentos ($)",format:money},
  {key:"hg",label:"HG (% de venta)",format:v=>`${num(v,4)}%`}, {key:"hgKg",label:"HG generado / perdido (kg)",format:v=>num(v)}, {key:"hgPrice",label:"Valoración HG ($/kg)",format:v=>num(v,4)}, {key:"hgAmount",label:"Importe HG ($)",format:money},
  {key:"margin",label:"Margen bruto IGF ($/kg)",format:v=>num(v,4)}, {key:"a",label:"Contribución efectiva antes de descuento ($/kg)",format:v=>num(v,4)},
  {key:"operating",label:"Gastos operativos ($)",format:money}, {key:"corporate",label:"Gastos corporativos ($)",format:money}, {key:"total",label:"Gasto operativo + corporativo ($)",format:money}, {key:"taxes",label:"Impuestos mensuales en la base ($)",format:money}, {key:"fixed",label:"Gastos e impuestos fijos del modelo ($)",format:money},
  {key:"contribution",label:"Contribución antes de gastos ($)",format:money}, {key:"result",label:"Resultado final ($)",format:money},
  {key:"eqQ",label:"Venta de equilibrio al mismo descuento (t)",format:v=>num(v)}, {key:"eqD",label:"Descuento de equilibrio a la misma venta ($/kg)",format:v=>num(v,4)}, {key:"closestQ",label:"Equilibrio cercano: venta (t)",format:v=>num(v)}, {key:"closestD",label:"Equilibrio cercano: descuento ($/kg)",format:v=>num(v,4)},
 ];
 const data=records.map(values),base=data[0];
 return <><p className="mb-3 text-xs text-slate-300">Se comparan todas las variables guardadas, sin igualar venta, descuento, HG ni gastos entre propuestas. Δ indica diferencia contra Actual. Cada superficie y equilibrio usa su propia contribución efectiva y gastos fijos.</p><div className="overflow-x-auto"><table className="w-full text-right text-sm"><thead><tr><th className="p-2 text-left">Variable</th>{records.map((r,i)=><th key={i} className="min-w-48 p-2">{r.label}<div className="font-normal text-slate-400">{r.cutoff} · {r.mode}</div><div className="max-w-xs whitespace-pre-wrap break-words font-normal">{r.comments}</div></th>)}</tr></thead><tbody>{fields.map(field=><tr key={field.key} className="border-t border-slate-700"><th className="p-2 text-left font-normal">{field.label}</th>{data.map((r,i)=>{const value=r[field.key],reference=base?.[field.key];return <td key={i} className="p-2">{value==null?"No registrado":field.format(value)}{i>0&&value!=null&&reference!=null&&<div className="text-xs text-slate-400">Δ {field.format(value-reference)}</div>}</td>;})}</tr>)}</tbody></table></div><p className="mt-3 text-xs text-amber-200">Los gastos desglosados no registrados en propuestas antiguas permanecen sin cifra; sus resultados y superficies siguen usando los supuestos originales a y gasto fijo. Un descuento de equilibrio negativo no es viable con descuento no negativo. Los impuestos del modelo se mantienen fijos como en la simulación existente; no se recalculan con la venta simulada. El equilibrio cercano usa la distancia normalizada de la gráfica y no es una recomendación comercial.</p></>;
}
function Popup({title,onClose,children}:{title:string;onClose:()=>void;children:React.ReactNode}) {
 const closeRef=useRef<HTMLButtonElement|null>(null);
 useEffect(()=>{const previous=document.activeElement as HTMLElement|null;closeRef.current?.focus();return()=>previous?.focus();},[]);
 return <div role="dialog" aria-modal="true" aria-label={title} onKeyDown={e=>{if(e.key==="Escape"){e.stopPropagation();onClose();}if(e.key==="Tab"){const controls=Array.from(e.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]'));const first=controls[0],last=controls[controls.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}}} className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/90 p-3"><section className="flex max-h-[90vh] w-full max-w-[1600px] flex-col overflow-hidden rounded-xl border border-slate-600 bg-slate-900"><header className="flex items-center justify-between gap-3 border-b border-slate-700 p-3"><h3 className="font-semibold">{title}</h3><button ref={closeRef} type="button" onClick={onClose} className="rounded bg-slate-700 px-3 py-2">Volver</button></header><div className="overflow-auto p-3">{children}</div></section></div>;
}
function DailyDetail({data,week,field}:{data:any;week:any;field:string}) {
 const days=data.days||[];
 const metrics:Record<string,{key:string;label:string;money?:boolean}[]>={
  venta:[{key:"venta_kg",label:"Venta (kg)"},{key:"venta_casa_kg",label:"Casa (kg)"},{key:"venta_comisionista_kg",label:"Comisionista (kg)"}],
  margen:[{key:"precio_kg",label:"Precio ($/kg)"},{key:"costo_kg",label:"Costo ($/kg)"},{key:"flete_kg",label:"Flete ($/kg)"},{key:"margen_kg",label:"Margen bruto ($/kg)"}],
  descuento:[{key:"venta_kg",label:"Venta (kg)"},{key:"com_desc_kg",label:"Comisión / descuento ($/kg)"}],
  operativos:[{key:"presupuesto_nomina_gastos_kg",label:"Nómina / gastos ($/kg)"},{key:"presupuesto_imss_sua_kg",label:"IMSS / SUA ($/kg)"},{key:"extraordinarios_kg",label:"Extraordinarios ($/kg)"},{key:"provisiones_planta_kg",label:"Provisiones ($/kg)"},{key:"gasto_operativo_mxn",label:"Total operativo ($)",money:true}],
  corporativos:[{key:"gasto_corporativo_kg",label:"Corporativo ($/kg)"},{key:"inversiones_kg",label:"Inversiones ($/kg)"},{key:"impuestos_federales_kg",label:"Impuestos federales ($/kg)"},{key:"gasto_corporativo_mxn",label:"Total corporativo ($)",money:true}],
  gasto:[{key:"gasto_operativo_mxn",label:"Operativos ($)",money:true},{key:"gasto_corporativo_mxn",label:"Corporativos ($)",money:true}],
  hg:[{key:"hg_kilos",label:"HG (kg)"},{key:"hg_kg",label:"HG ($/kg)"},{key:"hg_mxn",label:"HG ($)",money:true}],
  impuestos:[{key:"impuestos_federales_kg",label:"Impuestos federales ($/kg)"}],
  resultado:[{key:"venta_kg",label:"Venta (kg)"},{key:"resultado_kg",label:"Resultado ($/kg)"},{key:"resultado_mxn",label:"Resultado ($)",money:true}],
 };
 const fields=metrics[field]||metrics.resultado;
 return <><p className="mb-3 text-xs text-slate-400">Detalle diario del IGF semanal, con el mismo corte y planta. {week.forecastSources?.length?"El resumen usa IGF Forecast histórico; esa fuente no ofrece todos los detalles diarios. Los datos faltantes permanecen sin cifra.":"Los importes corresponden al periodo; no al equivalente mensual de la gráfica."} Descuento mostrado como costo positivo. — significa dato no disponible.</p><div className="overflow-x-auto"><table className="w-full text-right text-sm"><thead><tr><th className="p-2 text-left">Día / estado</th>{fields.map(f=><th key={f.key} className="p-2">{f.label}</th>)}</tr></thead><tbody>{days.map((day:any)=><tr key={day.fecha} className="border-t border-slate-700"><td className="p-2 text-left">{day.fecha} · {day.estado}</td>{fields.map(f=>{let v=day.metrics?.[f.key]??day[f.key];if(f.key==="com_desc_kg"&&v!=null)v=-v;return <td key={f.key} className="p-2">{f.money?money(v):num(v,4)}</td>;})}</tr>)}</tbody></table></div>{!days.length&&<p>Sin detalle diario disponible para esta semana.</p>}</>;
}

function CategoryGroup({category,lines,kg,amount,editable,onEdit}:{category:string;lines:CategoryLine[];kg:number;amount:number|null;editable?:boolean;onEdit?:(line:CategoryLine,key:"kg"|"discount_kg",value:number)=>void}) {
 return <>{lines.map(line=><tr key={line.subcategory} className="border-t border-slate-700"><td className="p-2 text-left text-cyan-200">{category}</td><td className="text-left">{line.subcategory}{line.missing_discount_kg>0&&<span className="block text-xs text-amber-200">Descuento pendiente en {num(line.missing_discount_kg)} kg</span>}</td><td className="p-1">{editable?<input aria-label={`Venta mensual ${category} ${line.subcategory}`} type="number" min="0" max="1000000" step=".01" value={line.kg/1000} onChange={e=>onEdit?.(line,"kg",Math.max(0,Math.min(1e6,Number(e.target.value)||0))*1000)} className="w-28 rounded border border-slate-600 bg-slate-950 p-1 text-right"/>:num(line.kg/1000)}</td><td>{money(line.discount_amount)}</td><td className="p-1">{editable?<input aria-label={`Descuento ponderado ${category} ${line.subcategory}`} type="number" min="0" max="100" step=".01" value={line.discount_kg??""} onChange={e=>onEdit?.(line,"discount_kg",Math.max(0,Math.min(100,Number(e.target.value)||0)))} className="w-28 rounded border border-slate-600 bg-slate-950 p-1 text-right"/>:num(line.discount_kg,4)}</td></tr>)}<tr className="border-t border-slate-600 bg-slate-800 font-semibold"><td colSpan={2} className="p-2 text-left">TOTAL {category}</td><td>{lines.length?num(kg/1000):"—"}</td><td>{lines.length?money(amount):"—"}</td><td>{num(amount!=null&&kg>0?amount/kg:null,4)}</td></tr></>;
}
