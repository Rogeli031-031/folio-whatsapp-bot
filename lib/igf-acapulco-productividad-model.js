'use strict';
const GOALS = Object.freeze({
  'ORGANOS':250,'OMETEPEC 2':150,'PETAQUILLAS':320,'PIE DE LA CUESTA':700,'TEXCA':250,'VACACIONAL':480,'ZAPATA':230,'RENACIMIENTO 2':500,'BOULEVARD':350,'CRUZ GRANDE':280,'LIBERTAD':350,'LIBERTADORES':600,'MANGOS':670,'PEDREGOSO':1000,'RETORNO':180,'SAN AGUSTIN':1000,'SAN LUIS ACATLAN':120,'SAN MARCOS':800,'TECOANAPA':150,'TOLVA':700,'VENTA':800,'COLOSO':1150,'COLOSIO':150,'COLOSO GRAN VIA':250,'RENACIMIENTO':200,'COLOSIO 2':320,'CONSTITUYENTES':150,'PALMAR':850,'BONFIL':1150,'LLANO LARGO':600,'RUIZ CORTINEZ':1500,'ZAPATA 2':420
});
const ALIASES = Object.freeze({
 'CRUZ GRANDE (HIDROGAS)':'CRUZ GRANDE','OMETEPEC II':'OMETEPEC 2','OMETEPEC 2':'OMETEPEC 2','LA LIBERTAD':'LIBERTAD','LA VENTA':'VENTA','LOS ORGANOS':'ORGANOS','REAL PALMAR':'PALMAR','SAN LUIS':'SAN LUIS ACATLAN','RUIZ CORTINES':'RUIZ CORTINEZ','RENACIOMIENTO':'RENACIMIENTO','RENACIOMIENTO 2':'RENACIMIENTO 2','COLOSO I':'COLOSO','COLOSIO I':'COLOSIO','COLOSIO II':'COLOSIO 2','RENACIMIENTO II':'RENACIMIENTO 2'
});
const kgPerLitre = 0.54;
const monToSat=(date)=>new Date(date+'T00:00:00Z').getUTCDay()!==0;
const goalAttainment=({unroundedAvg,dailyGoal,totalUnits,elapsed})=>{
 if(totalUnits!==undefined){
  const target=dailyGoal*5400*elapsed;
  return totalUnits>=target?'A':5*totalUnits>=4*target?'B':'C';
 }
 return unroundedAvg>=dailyGoal?'A':unroundedAvg>=dailyGoal*0.8?'B':'C';
};
const dailyToMonthlyLitres=(daily,businessDays)=>daily*businessDays;
const approvedAcapulcoConfig=Object.freeze({isBusinessDay:monToSat,stationTier:goalAttainment,stationToLitres:dailyToMonthlyLitres});
const nameKey = (value) => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036F]/g,'').toUpperCase().replace(/Ι/g,'I').replace(/\s+/g,' ').trim();
const has = (object,key) => Object.prototype.hasOwnProperty.call(object,key);
function stationKey(label, goals=GOALS) {
 const raw = nameKey(label).replace(/ B1$/, '');
 const key = has(ALIASES,raw) ? ALIASES[raw] : raw;
 return has(goals,key) ? key : null;
}
function truckTier(avg) {
 const liters = Math.round(avg);
 return liters >= 2000 ? 'A' : liters >= 1500 ? 'B' : 'C';
}
function reportModel(rows,{plant,year,month,cutoff,isBusinessDay,stationGoals,stationTier,stationToLitres,localPlant=false}) {
 if (plant !== 'Acapulco' && !(localPlant && ['Puebla','Querétaro'].includes(plant))) throw Error('Alcance de productividad no habilitado para esta planta');
 if (!Number.isInteger(year)||!Number.isInteger(month)||month<1||month>12||typeof isBusinessDay!=='function'||typeof stationTier!=='function'||typeof stationToLitres!=='function') throw Error('Faltan reglas de calendario/metas');
 const days = new Date(Date.UTC(year,month,0)).getUTCDate();
 const yymm = String(year)+'-'+String(month).padStart(2,'0');
 const allDays = Array.from({length:days},(_,i)=>yymm+'-'+String(i+1).padStart(2,'0'));
 if (!allDays.includes(cutoff)) throw Error('Corte fuera del mes');

 const elapsed = allDays.filter(day=>day <= cutoff && isBusinessDay(day)).length;
 const fullBusinessDays = allDays.filter(isBusinessDay).length;
 const stationElapsed=elapsed;
 if (elapsed<=0 || fullBusinessDays<elapsed) throw Error('No hay días hábiles al corte');
 const goals = stationGoals ?? (localPlant ? {} : GOALS);
 const make=(label,goal=null)=>({label,goal,kg:Array(days).fill(0),sourceLabels:new Set()});
 const trucks=new Map(),stations=new Map(Object.entries(goals).map(([k,v])=>[k,make(k,v)]));
 const unresolved=[];
 for(const row of rows) {
  if (!allDays.includes(row.fecha) || row.fecha>cutoff) continue;
  const unit = row.estado_pdv === 'unidad_candidata'
   ? /^AT-0*(\d+)$/i.exec(String(row.unidad_candidata??'')) : null;
  // Acapulco atribuye el volumen a la pipa por PDV, no por el subcanal del cliente.
  const isTruckSale = plant === 'Acapulco' && !localPlant && unit &&
   (row.canal === 'Casa' || row.canal === 'Comisionista');
  if (row.canal !== 'Casa' && !isTruckSale) continue;
  const kg=Number(row.kg);
  if (!Number.isFinite(kg) || row.kg===null || row.kg==='') throw Error('Dato sin kilos verificables');
  const units=Math.round(kg*10000);
  if(!Number.isSafeInteger(units) || Math.abs(units-kg*10000)>1e-5) throw Error('Precisión de kilos no admitida.');
  const day=Number(row.fecha.slice(-2))-1;
  const raw=String(row.pdv_original??'');
  if (isTruckSale || (row.canal === 'Casa' && row.subcanal === 'Autotanque' && unit)) {
   const label='AT-'+unit[1].padStart(3,'0');
   if(!trucks.has(label)) trucks.set(label,make(label));
   const e=trucks.get(label); e.kg[day]+=units; e.sourceLabels.add(raw);
  }
  if (row.canal !== 'Casa') continue;
  if (row.subcanal === 'Autotanque' && !unit) {
   unresolved.push({kind:'AT',raw,day,kg});
  } else if (row.subcanal === 'Carburación') {
   const rawKey = nameKey(raw);
   const withoutB1 = rawKey.replace(/ B1$/, '');
   const key = row.estado_pdv === 'unidad_candidata' ? null : localPlant
      ? (has(goals, withoutB1) ? withoutB1 : rawKey)
      : stationKey(raw,goals);
   if (!key) {unresolved.push({kind:'EST',raw,day,kg});continue;}
   if (localPlant && !stations.has(key)) stations.set(key,make(raw.trim()));
   const e=stations.get(key);e.kg[day]+=units;e.sourceLabels.add(raw);
  }
 }
 const finish=(items,kind)=>Array.from(items.values()).map(e=>{
   const litres=e.kg.map((x,i)=>allDays[i]>cutoff?null:x/5400);
   const totalUnits=e.kg.reduce((a,b)=>a+b,0);
   const total=totalUnits/5400;
   const unroundedAvg=total/(kind==='EST'?stationElapsed:elapsed);
   const avg=kind==='EST'?unroundedAvg:Math.round(unroundedAvg);
   const hasStationGoal=kind==='EST' && (!localPlant || (Number.isFinite(e.goal) && e.goal>0));
   const goal=hasStationGoal ? stationToLitres(e.goal,fullBusinessDays,days) : null;
   if (hasStationGoal && !Number.isFinite(goal)) throw Error('Meta de estación inválida');
   const tier=kind==='AT'?truckTier(avg):!hasStationGoal?null:stationTier({goal,dailyGoal:e.goal,total,totalUnits,avg,unroundedAvg,days,fullBusinessDays,elapsed:stationElapsed});
   if (!(localPlant && tier===null) && !['A','B','C'].includes(tier)) throw Error('Tipo de productividad no autorizado');
   return { label:e.label, sourceLabels:[...e.sourceLabels], dailyGoal:e.goal, litres, total, avg, goal, tier };
 }).sort((a,b)=>b.avg-a.avg || (a.label<b.label?-1:a.label>b.label?1:0));
 return {plant,year,month,cutoff,allDays,elapsed,fullBusinessDays,stationElapsed,stationFullDays:fullBusinessDays,trucks:finish(trucks,'AT'),stations:finish(stations,'EST'),unresolved};
}
module.exports={GOALS,stationKey,truckTier,reportModel,kgPerLitre,approvedAcapulcoConfig,goalAttainment};