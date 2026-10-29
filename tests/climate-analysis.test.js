import test from 'node:test';
import assert from 'node:assert/strict';
import {cropSeason,cropComparison,difference,rankDistricts,sortDistricts,validateClimateAnalysis,findingSchema} from '../src/lib/climate-analysis-model.js';
const scope={district:'Gasabo',crop:'Maize',season:'Season B',year:2026,referenceYear:2025,baselineStart:1991,baselineEnd:2020,includeBaseline:true,dataset:'merra2'};
function rows(year,p,a){return [['production',p,'metric tonnes'],['harvested_area',a,'hectares']].map(([indicator,value,unit])=>({id:year+indicator,domain:'crop',geography:'Gasabo',crop:'Maize',season:'Season B',year,indicator,value,unit,dataset_id:'NISR-'+year,source_reference:'Published!A1'}));}
test('climate comparisons keep zero, missing, duplicate, forecast and incompatible-release records distinct',()=>{
 assert.equal(cropSeason(rows(2026,0,10),scope).yield,0);
 for(const data of [[],rows(2026,10,0),[...rows(2026,20,10),rows(2026,20,10)[0]],rows(2026,20,10).map(r=>({...r,is_demo:true})),rows(2026,20,10).map(r=>({...r,is_forecast:true})),rows(2026,20,10).map((r,i)=>({...r,dataset_id:String(i)})),rows(2026,20,10).map(r=>({...r,unit:'unknown'}))])assert.equal(cropSeason(data,scope).yield,null);
 assert.equal(difference(5,0).percent,null);assert.equal(difference(null,4).absolute,null);assert.equal(difference(0,5).percent,-100);
});
test('area and yield arithmetic contributions exactly recover the production difference',()=>{
 for(const [p,a,q,b]of [[150,60,100,50],[100,40,200,40],[0,30,80,40],[100,100,100,50]]){const result=cropComparison([...rows(2026,p,a),...rows(2025,q,b)],scope);assert.ok(Math.abs(result.decomposition.areaTonnes+result.decomposition.yieldTonnes-(p-q))<1e-8);}
 const missing=cropComparison(rows(2026,150,60),scope);assert.equal(missing.changes.yield.percent,null);assert.equal(missing.decomposition,null);
});
test('district ranking leaves missing weather unavailable and always sorts missing values last',()=>{
 const summary={rainfall:10,temperature:20,expectedDays:122,validDays:{PRECTOTCORR:122,T2M:100}};
 const rank=rankDistricts([...rows(2026,150,50),...rows(2025,100,50)],{districts:[{district:'Gasabo',summary,cache:{status:'stale'}}]},{districts:[{district:'Gasabo',summary:{...summary,rainfall:20}}]},scope);
 const gasabo=rank.find(r=>r.district==='Gasabo');assert.equal(gasabo.yieldChangePct,50);assert.equal(gasabo.rainfallChangePct,-50);assert.equal(gasabo.temperature,null);assert.equal(gasabo.stale,true);assert.equal(rank.length,30);
 for(const direction of ['asc','desc']){const sorted=sortDistricts(rank,'yieldChangePct',direction);assert.equal(sorted[0].district,'Gasabo');assert.equal(sorted.at(-1).yieldChangePct,null);}
});
test('analysis inputs bound periods and datasets and saving accepts notes and snapshot id only',()=>{
 assert.equal(validateClimateAnalysis(scope).year,2026);
 for(const patch of [{referenceYear:2026},{dataset:'invented'},{baselineStart:2010},{district:'invented'},{sourceUrl:'https://example.com'}])assert.throws(()=>validateClimateAnalysis({...scope,...patch}));
 assert.throws(()=>findingSchema.parse({analysisId:crypto.randomUUID(),notes:'Short'}));assert.throws(()=>findingSchema.parse({analysisId:crypto.randomUUID(),notes:'Valid notes for this test',metric_snapshot:'forged'}));
});

test('saved findings use an owned unexpired server snapshot; client notes cannot replace evidence',async()=>{
 const {saveClimateFindingEvidence}=await import('../src/lib/climate-finding.js'),{normalizeFindingEvidence}=await import('../src/lib/finding-evidence.js');
 const id=crypto.randomUUID(),user={id:'analyst-one',email:'test@example.invalid',workspace_role:'agricultural_analyst'},store=new Map(),written=[];
 const crops=cropComparison([...rows(2026,150,50),...rows(2025,100,50)],scope);
 const analysis={analysisId:id,scope,crops,current:{summary:{rainfall:10},sources:[],errors:[]},reference:{sources:[],errors:[]},normal:{rainfallAnomalyPct:-20},normalEvidence:null,limitation:'Test fixture; no causal claim.',trend:[]};
 store.set('climate-analysis|'+id,{owner:user.id,expiresAt:200,result:analysis});
 const adapters={cache:{get:async key=>store.get(key)},write:async record=>{written.push(record);return record;},clock:()=>100};
 const result=await saveClimateFindingEvidence(adapters,user,{analysisId:id,notes:'Review inputs before interpreting the weather association.'});
 assert.equal(written.length,1);assert.deepEqual(JSON.parse(result.record.calculation_snapshot),analysis);assert.equal(JSON.parse(result.record.metric_snapshot).yield,3);
 const evidence=normalizeFindingEvidence(JSON.parse(result.record.calculation_snapshot));assert.equal(evidence.current.length,2);assert.equal(evidence.previous.length,2);assert.equal(evidence.baseline.rainfallAnomalyPct,-20);
 for(const caller of [null,{...user,workspace_role:'public_viewer'},{...user,id:'another-analyst'}])await assert.rejects(saveClimateFindingEvidence(adapters,caller,{analysisId:id,notes:'Notes for the verification fixture.'}));
 await assert.rejects(saveClimateFindingEvidence({...adapters,clock:()=>201},user,{analysisId:id,notes:'Notes for the verification fixture.'}),{code:'ANALYSIS_EXPIRED'});
 assert.equal(written.length,1);
});
