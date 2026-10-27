"use strict";
const forecast = require("./dashboard-arr-forecast");
const number = value => value == null || value === "" || !Number.isFinite(Number(value)) ? null : Number(value);
const total = values => values.every(value => value != null) ? values.reduce((a,b)=>a+b,0) : null;

// Read the historical uploaded IGF, without recalculating it using today's budgets or folios.
async function loadHistoricalForecast(client, year, month, opts) {
 const asOf = Boolean(opts.versionAsOfCorte && opts.corteYmd);
 const version = await client.query(`SELECT id, version_number FROM igf.versions
  WHERE plant_code='GLOBAL' AND year=$1 AND month=$2
  ${asOf ? "AND (created_at AT TIME ZONE 'America/Mexico_City')::date <= $3::date" : ""}
  ORDER BY version_number DESC, id DESC LIMIT 1`, asOf ? [year,month,opts.corteYmd] : [year,month]);
 const selected=version.rows[0];
 if (!selected) return null;
 const rows=await client.query("SELECT * FROM igf.compromiso_lines WHERE version_id=$1 ORDER BY empresa",[selected.id]);
 return {...selected,rows:rows.rows};
}

function emptyHistoricalMonth(summary, period, opts) {
 return opts.periodMode === "months" && period.fecha_hasta < `${opts.year}-${String(opts.month).padStart(2,"0")}-01`
  && (!opts.corteYmd || period.fecha_hasta < opts.corteYmd)
  && !(summary.metrics.venta_kg > 0) && summary.metrics.precio_kg == null
  && summary.metrics.ingreso_mxn == null && summary.metrics.resultado_mxn == null;
}

function fillFromForecast(summary, snapshot, plant) {
 if (!snapshot) return summary;
 const labels=[plant.nombre,plant.canon,plant.igfLabel].filter(Boolean);
 const matches=snapshot.rows.filter(row=>labels.some(label=>forecast.plantsEquivalent(row.empresa,label)));
 if (matches.length !== 1) return summary;
 const row=matches[0],kg=number(row.venta_ton)==null?null:number(row.venta_ton)*1000;
 if (!(kg>0)) return summary;
 const read=key=>number(row[key]);
 const corp=total([read("gtos_apoyos_corp_kg"),read("bancos_corp_kg"),read("otros_programas_kg")]);
 const candidates={venta_kg:kg,margen_kg:read("margen_kg"),
  com_desc_kg:read("com_desc_kg")==null?null:-Math.abs(read("com_desc_kg")),
  gasto_corporativo_kg:corp,inversiones_kg:read("inversiones_kg"),impuestos_federales_kg:read("impuesto_kg"),
  provisiones_planta_kg:read("provision_planta_kg"),hg_kg:read("hg_kg"),
  hg_mxn:read("hg_kg")==null?null:read("hg_kg")*kg,
  resultado_kg:read("resultado_final_kg"),resultado_mxn:read("resultado_final_importe"),
  gasto_operativo_forecast_kg:read("gasto_kg"),bancos_planta_forecast_kg:read("bancos_planta_kg"),
  util_oper_forecast_kg:read("util_oper_kg")};
 const metrics={...summary.metrics},fields=[];
 for(const [key,value] of Object.entries(candidates)){
  if(value!=null && (metrics[key]==null || key==="venta_kg" && metrics[key]===0)) {metrics[key]=value;fields.push(key);}
 }
 if(!fields.length)return summary;
 // Monthly snapshots have no daily coverage. Supply only the known kilo denominator for consolidation.
 const coverage={...summary.coverage};
 for(const [metric,key] of [["com_desc_kg","com_desc_kg"],["resultado_mxn","resultado"]])if(fields.includes(metric))
  coverage[key]={kg_total:kg,kg_covered:kg,coverage_kg_pct:100,days_with_sales:null,days_covered:null,coverage_days_pct:null,covered_real_kg:kg,covered_projected_kg:0};
 return {...summary,metrics,coverage,forecast_source:{empresa:row.empresa,version_id:snapshot.id,version_number:snapshot.version_number,fields}};
}
module.exports={loadHistoricalForecast,emptyHistoricalMonth,fillFromForecast};
