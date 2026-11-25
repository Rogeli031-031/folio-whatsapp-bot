'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {applyWorkshop}=require('../lib/igf-acapulco-productividad-taller');
test('only actual full business day with no sales reduces divisor',()=>{
 const dates=['2026-11-01','2026-11-02','2026-11-03','2026-11-04'];
 const reports=dates.map((date,i)=>({entity:'E9',date,sha256:'a'.repeat(64),units:[{eco:'AT-101',kind:'Pipa',fullDayOut:i!==1}]}));
 const station=[{label:'SYNTHETIC_STATION'}], litres=[10,0,5,0], cutoff=dates[3];
 const current={plant:'Acapulco',cutoff,allDays:dates,elapsed:3,trucks:[{label:'AT-101',litres,total:15}],stations:station};
 const data=applyWorkshop(current,{plant:'Acapulco',reports},d=>d!==dates[0],()=> 'C').model;
 assert.equal(data.trucks[0].elapsed,2);assert.equal(data.trucks[0].avg,8);assert.equal(data.trucks[0].total,15);assert.equal(data.stations,station);
 assert.equal(applyWorkshop(current,null,()=>true,()=> 'C').model,current);
});
