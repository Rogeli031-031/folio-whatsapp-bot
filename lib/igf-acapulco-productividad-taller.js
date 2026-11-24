'use strict';
// Contract only: an authorized adapter must authenticate provenance before calling this module.
// Never take archived as current coverage, and never derive workshop days from a folio.
function makeWorkshopView(source, {plant,from,cutoff,entities}) {
 const date=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
 const day=s=>new Date(s+'T00:00:00Z').getUTCDay();
 const fail=reason=>({available:false,reason});
 if(plant!=='Acapulco'||!date(from)||!date(cutoff)||from>cutoff||!Array.isArray(entities)||!entities.length) return fail('out_of_scope');
 if(!source||source.plant!==plant||!Array.isArray(source.reports)) return fail('missing_verified_source');
 const covered=new Map(), units=new Map(), ambiguous=new Set();
 for(const r of source.reports){
  if(!entities.includes(r.entity)||!date(r.date)||r.date<from||r.date>cutoff) continue;
  if(!/^[a-f0-9]{64}$/i.test(r.sha256||'')||!Array.isArray(r.units)) return fail('invalid_report');
  const reportKey=r.entity+'|'+r.date;
  if(covered.has(reportKey)){if(covered.get(reportKey)!==r.sha256)return fail('conflicting_report');continue;}
  covered.set(reportKey,r.sha256);
  const seen=new Set();
  for(const u of r.units){
   if(!/^AT-\d{3}$/.test(u.eco||'')||u.kind!=='Pipa'||seen.has(u.eco))return fail('invalid_unit');
   seen.add(u.eco);
   const old=units.get(u.eco)||{entity:r.entity,days:new Set(),wholeDays:new Set(),latest:null};
   if(old.entity!==r.entity){ambiguous.add(u.eco);continue;}
   old.days.add(r.date);
   if(u.fullDayOut===true)old.wholeDays.add(r.date);
   if(!old.latest||old.latest.reportDate<r.date) old.latest={...u,reportDate:r.date};
   units.set(u.eco,old);
  }
 }
 if(!covered.size)return fail('missing_verified_source');
 const missing=[];
 for(let d=new Date(from+'T00:00:00Z');d.toISOString().slice(0,10)<=cutoff;d.setUTCDate(d.getUTCDate()+1)){
  const iso=d.toISOString().slice(0,10);
  for(const e of entities)if(!covered.has(e+'|'+iso))missing.push({entity:e,date:iso});
 }
 function perUnit(eco,litersByDate,base){
  const u=units.get(eco);
  if(!u)return null;
  const confirmedDays=[...u.days].sort();
  const conflicts=confirmedDays.filter(d=>Number(litersByDate[d]||0)!==0);
  const divisor=base-confirmedDays.filter(d=>day(d)!==0).length;
  const liters=Object.entries(litersByDate).filter(([d])=>d>=from&&d<=cutoff).reduce((s,[,n])=>s+Number(n),0);
  return {confirmedDays,conflicts,liters,divisor,daily:divisor>0?Math.round(liters/divisor):null,latest:u.latest};
 }
 for(const eco of ambiguous)units.delete(eco);
 return {available:true,missing,ambiguous:[...ambiguous].sort(),units,perUnit};
}
const WARN='Sin fuente de taller verificable; no se aplicaron descuentos de días ni se asociaron folios.';
function applyWorkshop(model, source, isBusinessDay, tier) {
 const v=makeWorkshopView(source,{plant:model.plant,from:model.cutoff.slice(0,7)+'-01',cutoff:model.cutoff,entities:['E9','E10']});
 if(!v.available)return {model,warn:WARN};
 const trucks=new Map(model.trucks.map(x=>[x.label,x]));
 for(const eco of v.units.keys())if(!trucks.has(eco))trucks.set(eco,{label:eco,sourceLabels:[],goal:null,litres:model.allDays.map(d=>d<=model.cutoff?0:null),total:0});
 for(const [eco,x] of trucks){
  const u=v.units.get(eco);if(!u)continue;
  const days=[...u.days].sort(), elapsed=model.elapsed-days.filter(d=>isBusinessDay(d)&&u.wholeDays.has(d)&&!x.litres[Number(d.slice(-2))-1]).length;
  trucks.set(eco,{...x,elapsed,avg:elapsed>0?Math.round(x.total/elapsed):null,tier:elapsed>0?tier(x.total/elapsed):null,workshop:{days,wholeDays:[...u.wholeDays],latest:u.latest}});
 }
 const order=[...trucks.values()].sort((a,b)=>(b.avg??-1)-(a.avg??-1)||a.label.localeCompare(b.label));
 return {model:{...model,trucks:order,workshopMissing:v.missing,workshopAmbiguous:v.ambiguous},warn:null};
}
module.exports={makeWorkshopView,applyWorkshop,WARN};
