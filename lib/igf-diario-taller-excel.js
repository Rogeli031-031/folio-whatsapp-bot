'use strict';

const { REPORT_SQL, closedCutoff, requireVerifiedSource } = require('./igf-acapulco-productividad');
const { approvedAcapulcoConfig, reportModel, truckTier } = require('./igf-acapulco-productividad-model');
const { appendFileNote, prependProductivity, prependUnavailable } = require('./igf-acapulco-productividad-excel');
const { applyWorkshop } = require('./igf-acapulco-productividad-taller');

const SITES = new Map([
 ['Puebla', { plant:'Puebla', db:'puebla', keys:['PUEBLA','E7'], hash:'sha256', layout:'Puebla-v1', workshopCode:/^T[- ]?0*(\d{1,4})$/i }],
 ['Queretaro', { plant:'Querétaro', db:'queretaro', keys:['QUERETARO','E11'], hash:'sheet_sha256', layout:'Queretaro-v1', workshopCode:/^0*(\d{1,4})$/ }],
 ['Querétaro', { plant:'Querétaro', db:'queretaro', keys:['QUERETARO','E11'], hash:'sheet_sha256', layout:'Queretaro-v1', workshopCode:/^0*(\d{1,4})$/ }],
]);

function plantContext(salesCode, resolvedPlant, actorId) {
 const site=SITES.get(salesCode);
 if(!site||!site.keys.includes(resolvedPlant?.clave)||!Number.isSafeInteger(resolvedPlant.plantaId)||resolvedPlant.plantaId<1)return null;
 return {plantId:resolvedPlant.plantaId,clave:resolvedPlant.clave,actorId};
}

function canonEco(site,value) {
 const m=site.workshopCode.exec(String(value??'').trim());
 if(!m||Number(m[1])<1)return null;
 return 'AT-'+String(Number(m[1])).padStart(3,'0');
}

function workshopUnits(site,rows,date) {
 const units=new Map();
 for(const row of rows) {
  if(row.kind!=='Autotanque')continue;
  const eco=canonEco(site,row.unit_code);
  if(!eco)continue;
  const v=row.observations||{};
  const entry=typeof v.entered==='string'?v.entered:v.entry?.value;
  const exit=typeof v.exit==='string'?v.exit:v.exit?.value;
  // A row with an earlier, non-contradictory recorded exit isn't evidence of
  // presence at this cut. Dates or free text don't certify a full day out.
  if(entry&&entry>date)continue;
  if(exit&&exit<date&&(!entry||exit>=entry))continue;
  const item=[row.section,v.fault,v.status,v.notes]
    .filter(x=>typeof x==='string'&&x.trim())
    .map(s=>s.trim().slice(0,220)).join(' | ');
  const unit=units.get(eco)||{eco,kind:'Pipa',fullDayOut:false,details:new Set()};
  if(item)unit.details.add(item);
  units.set(eco,unit);
 }
 return Array.from(units.values(),({details,...u})=>({...u,comment:[...details].slice(0,4).join('\n')}));
}

const FOLIOS_SQL = `
 WITH keys AS (SELECT DISTINCT * FROM jsonb_to_recordset($1::jsonb) AS k(cut date,eco text)),
 scoped AS (
  SELECT f.numero_folio,
   (f.creado_en AT TIME ZONE 'America/Mexico_City')::date AS created,
   substring(upper(trim(f.unidad)) from '^(?:AT[- ]?|T[- ]?)0*([1-9][0-9]{0,3})$') AS eco_num
  FROM public.folios f
  JOIN public.plantas p ON p.id=f.planta_id AND p.id=$2 AND p.clave=$3
  LEFT JOIN public.categorias c ON c.id=f.categoria_id
  WHERE NOT COALESCE(f.solo_zp_ad,false) AND NOT COALESCE(f.override_planta,false)
   AND f.numero_folio ~ '^F-[0-9]{6}-[0-9]+$'
   AND (lower(c.clave)='taller' OR lower(f.categoria)='taller')
   AND f.creado_en >= (($4::date-90)::timestamp AT TIME ZONE 'America/Mexico_City')
   AND f.creado_en < (($5::date+1)::timestamp AT TIME ZONE 'America/Mexico_City')
 )
 SELECT k.cut::text AS date,k.eco,jsonb_agg(DISTINCT f.numero_folio ORDER BY f.numero_folio) AS folios
 FROM keys k JOIN scoped f ON f.eco_num=ltrim(substr(k.eco,4),'0')
  AND f.created BETWEEN k.cut-90 AND k.cut GROUP BY 1,2`;

async function readLocalWorkshop(db,site,from,cutoff,context) {
 const root='arr.igf_'+site.db+'_taller';
 try {
  const {rows}=await db.query(`
   WITH versions AS (
    SELECT DISTINCT ON(report_date) id,report_date,revision,${site.hash} AS sha256,row_count
    FROM ${root}_revision WHERE source_layout=$3 AND report_date BETWEEN $1::date AND $2::date
    ORDER BY report_date,revision DESC
   )
   SELECT v.report_date::text AS date,v.revision,v.sha256,v.row_count,
    coalesce(jsonb_agg(jsonb_build_object('kind',d.kind,'unit_code',d.unit_code,'section',d.section,'observations',d.observations)
      ORDER BY d.source_row) FILTER (WHERE d.source_row IS NOT NULL),'[]'::jsonb) AS details
   FROM versions v LEFT JOIN ${root}_detalle d ON d.revision_id=v.id
   GROUP BY 1,2,3,4 ORDER BY 1`,[from,cutoff,site.layout]);
  if(!rows.length||rows.some(r=>r.row_count!==r.details.length))return null;
  const reports=rows.map(r=>({entity:site.plant,date:r.date,revision:r.revision,sha256:r.sha256,
   units:workshopUnits(site,r.details,r.date)}));
  const refs=reports.flatMap(r=>r.units.map(u=>({cut:r.date,eco:u.eco})));
  const actor=Number(context.actorId);
  if(refs.length&&Number.isSafeInteger(actor)&&actor>0) {
   const allow=await db.query(`SELECT 1 FROM ${root}_operador o JOIN public.usuarios u
    ON o.usuario_id=u.id WHERE o.usuario_id=$1 AND u.activo=true`,[actor]);
   if(allow.rows.length===1) {
    const {rows:found}=await db.query(FOLIOS_SQL,[JSON.stringify(refs),context.plantId,context.clave,from,cutoff]);
    const candidates=new Map(found.map(r=>[r.date+'|'+r.eco,r.folios.slice(0,12)]));
    for(const r of reports)for(const u of r.units)u.folioCandidates=candidates.get(r.date+'|'+u.eco)||[];
   }
  }
  // These sources don't link economic numbers to a specific repair folio.
  // Preserve candidate numbers separately; never infer a charge or deposit.
  for(const r of reports)for(const u of r.units)u.comment='Corte '+r.date+' · Rev. '+r.revision+(u.comment?'\n'+u.comment:'');
  return {plant:site.plant,reports};
 } catch(e) {
  if(e.code==='42P01'||e.code==='42703')return null;
  throw e;
 }
}

function workshopCutoff(cutoff,uploadDay,now) {
 const today=new Intl.DateTimeFormat('en-CA',{
  timeZone:process.env.FORECAST_BUSINESS_TZ||'America/Mexico_City',
  year:'numeric',month:'2-digit',day:'2-digit'
 }).format(now);
 const first=cutoff.slice(0,7)+'-01';
 const [y,m]=cutoff.split('-').map(Number);
 const monthEnd=new Date(Date.UTC(y,m,0)).toISOString().slice(0,10);
 const through=[uploadDay||cutoff,monthEnd,today].sort()[0];
 return through<first?cutoff:through;
}

async function appendLocalProductivity(wb,db,{salesCode,year,month,uploadDay,context,now=new Date()}) {
 const site=SITES.get(salesCode);
 if(!site||!plantContext(salesCode,{clave:context?.clave,plantaId:context?.plantId},context?.actorId))return false;
 const cutoff=closedCutoff(year,month,uploadDay,now);
 try {
  if(!cutoff)throw Object.assign(Error('No hay días de venta cerrados en el corte solicitado.'),{code:'IGF_PRODUCTIVITY_COVERAGE'});
  const from=cutoff.slice(0,7)+'-01';
  if(cutoff===from&&!approvedAcapulcoConfig.isBusinessDay(from)) {
   throw Object.assign(Error('Todavía no hay días hábiles cerrados al corte de ventas.'),{code:'IGF_PRODUCTIVITY_COVERAGE'});
  }
  const r=await db.query(REPORT_SQL,[salesCode,from,cutoff]);
  // Do not assume that a point with sales has a target. The approved target
  // table for Acapulco must not be used for another plant.
  const model=reportModel(requireVerifiedSource(r.rows[0],cutoff),{
   ...approvedAcapulcoConfig,plant:site.plant,year:Number(year),month:Number(month),cutoff,localPlant:true
  });
  const through=workshopCutoff(cutoff,uploadDay,now);
  const workshop=await readLocalWorkshop(db,site,from,through,context);
  const adjusted=applyWorkshop(model,workshop,approvedAcapulcoConfig.isBusinessDay,truckTier,{entities:[site.plant],cutoff:through});
  const sheets=prependProductivity(wb,adjusted.model);
  const missing=adjusted.model.workshopMissing?.length;
  appendFileNote(sheets[0], 'Ventas cerradas al '+cutoff+'. Taller hasta '+through+'. '+
   (adjusted.warn||(missing+' fecha(s) sin reporte de taller. Una marca amarilla no confirma jornada completa.')));
  appendFileNote(sheets.find(s=>s.name==='EST RESUMEN'),'Sin meta: se incluyen los litros; no se asigna un tipo sin una meta diaria verificada de esta planta.');
 } catch(e) {
  if(e.code!=='IGF_PRODUCTIVITY_COVERAGE'&&e.code!=='42P01')throw e;
  const message=e.code==='42P01'?'No está disponible la fuente de ventas por punto de venta de esta planta.':
   e.message.replace(/ de Acapulco/g,' de esta planta');
  prependUnavailable(wb,{year,month,cutoff,plant:site.plant,message});
 }
 return true;
}

module.exports={plantContext,appendLocalProductivity};
