'use strict';

const {reportModel,approvedAcapulcoConfig}=require('./igf-acapulco-productividad-model');
const {prependProductivity,prependUnavailable}=require('./igf-acapulco-productividad-excel');
const logo=require('./igf-acapulco-productividad-logo');
function before(ymd) {
 const d=new Date(ymd+'T00:00:00Z');
 if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==ymd) throw Error('Fecha inválida para productividad Acapulco.');
 d.setUTCDate(d.getUTCDate()-1);
 return d.toISOString().slice(0,10);
}
function closedCutoff(year,month,uploadDay,now=new Date()) {
 const y=Number(year),m=Number(month);
 if(!Number.isInteger(y)||y<2000||y>9999||!Number.isInteger(m)||m<1||m>12) throw Error('Mes inválido.');
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{
   timeZone:process.env.FORECAST_BUSINESS_TZ || 'America/Mexico_City',
   year:'numeric',month:'2-digit',day:'2-digit',
 }).formatToParts(now).map(x=>[x.type,x.value]));
 const prior=before([parts.year,parts.month,parts.day].join('-'));
 const ym=String(y)+'-'+String(m).padStart(2,'0');
 const end=ym+'-'+String(new Date(Date.UTC(y,m,0)).getUTCDate()).padStart(2,'0');
 const cap=[end,prior,...(uploadDay?[before(uploadDay)]:[])].sort()[0];
 return cap>=ym+'-01'?cap:null;
}
function unavailable(message) { const e=Error(message);e.code='IGF_PRODUCTIVITY_COVERAGE';return e; }

const REPORT_SQL = `
WITH sales AS (
 SELECT fecha,cliente_norm,canal,subcanal,sum(kg) kg
 FROM arr.ventas_diarias_cliente
 WHERE plant_code=$1 AND fecha BETWEEN $2::date AND $3::date GROUP BY 1,2,3,4
), pdv AS (
 SELECT fecha,cliente_norm,canal,subcanal,pdv_original,unidad_candidata,estado_pdv,kg
 FROM arr.ventas_diarias_pdv
 WHERE plant_code=$1 AND fecha BETWEEN $2::date AND $3::date
), pdv_by_key AS (
 SELECT fecha,cliente_norm,canal,subcanal,sum(kg) kg FROM pdv GROUP BY 1,2,3,4
), audit AS (
 SELECT count(*) FILTER (WHERE s.kg IS DISTINCT FROM p.kg) unmatched_keys,
        count(*) FILTER (WHERE s.fecha IS NOT NULL) legacy_keys,
        count(DISTINCT s.fecha) observed_days
 FROM sales s FULL JOIN pdv_by_key p USING(fecha,cliente_norm,canal,subcanal)
)
SELECT unmatched_keys::int, legacy_keys::int,observed_days::int,
 COALESCE((SELECT jsonb_agg(jsonb_build_object('fecha',p.fecha::text,'canal',p.canal,'subcanal',p.subcanal,
 'pdv_original',p.pdv_original,'unidad_candidata',p.unidad_candidata,'estado_pdv',p.estado_pdv,'kg',p.kg::text)
 ORDER BY p.fecha,p.subcanal,p.pdv_original,p.unidad_candidata,p.estado_pdv) FROM (
 SELECT fecha,canal,subcanal,pdv_original,unidad_candidata,estado_pdv,sum(kg) kg
 FROM pdv WHERE canal='Casa' AND subcanal IN ('Autotanque','Carburación')
 GROUP BY 1,2,3,4,5,6
 ) p),'[]'::jsonb) rows
FROM audit;
`;

function requireVerifiedSource(row,cutoff) {
 if(!row || Number(row.legacy_keys)<=0 || !Array.isArray(row.rows) || !row.rows.length) throw unavailable('Sin ventas verificables de Acapulco para el corte.');
 if(Number(row.unmatched_keys)!==0) throw unavailable('El punto de venta no concilia con ventas ARR al corte; no se publica productividad parcial.');
 if(Number(row.observed_days)!==Number(cutoff.slice(-2))) throw unavailable('La cobertura diaria ARR no está completa al corte; no se estimó productividad.');
 return row.rows;
}
async function fetchAcapulcoProductivity(client,options) {
 const {plant,year,month,cutoff}=options;
 if(plant!=='Acapulco' || !Number.isInteger(year) || !Number.isInteger(month) || !/^\d{4}-\d{2}-\d{2}$/.test(cutoff) || cutoff.slice(0,7)!==String(year)+'-'+String(month).padStart(2,'0')) throw new Error('Alcance inválido para productividad Acapulco.');
 const {rows}=await client.query(REPORT_SQL,[plant,cutoff.slice(0,7)+'-01',cutoff]);
 return reportModel(requireVerifiedSource(rows[0],cutoff),options);
}

async function appendAcapulcoIgfProductivity(wb,client,{plant,year,month,uploadDay,isIgfDiario,now}) {
 if(!isIgfDiario || plant!=='Acapulco') return false;
 const cutoff=closedCutoff(year,month,uploadDay,now);
 try{
  if(!cutoff)throw unavailable('No hay días cerrados en el corte solicitado.');
  const model=await fetchAcapulcoProductivity(client,{plant,year:Number(year),month:Number(month),cutoff,...approvedAcapulcoConfig});
  const foot='Lunes a sábado: '+model.elapsed+' días hábiles al corte. Las ventas de domingo sí suman.';
  const tabs=prependProductivity(wb,model,{logo:{buffer:logo,extension:'png'}});
  for(const [i,extra] of [[0,''],[4,' Metas diarias de referencia: Acapulco, noviembre 2026.']]){
   const c=tabs[i].getCell('B47');
   c.value=foot+extra;c.font={name:'Lato',size:11,italic:true};
  }
 }catch(e){
  if(e.code!=='IGF_PRODUCTIVITY_COVERAGE') throw e;
  prependUnavailable(wb,{year,month,cutoff,message:e.message});
 }
 return true;
}
module.exports={appendAcapulcoIgfProductivity,closedCutoff,fetchAcapulcoProductivity,requireVerifiedSource,REPORT_SQL};
