import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { readLocalRecords, validateLocalRead } from "../src/lib/local-data-service.js";
import { toNumber, computeYield, percentageChange, totalsForPeriod } from "../src/lib/metrics.js";
import { sourceProvenance } from "../src/lib/source-provenance.js";

function fixture() {
 const sqlite = new DatabaseSync(":memory:");
 sqlite.exec(readFileSync(new URL("../migrations/0002_local_data.sql", import.meta.url), "utf8"));
 const insert = sqlite.prepare("INSERT INTO local_records VALUES(?,?,?,?)");
 for (const [id,year,crop,value,published] of [["a",2025,"Maize",100,1],["b",2026,"Maize",120,1],["c",2026,"Rice",10,1],["private",2026,"Maize",9999,0]]) {
  insert.run("AgriculturalObservation",id,JSON.stringify({id,domain:"crop",geography:"Gasabo",crop,year,season:"Season B",indicator:"production",value}),published);
 }
 insert.run("SourceArchive","source",JSON.stringify({id:"source",name:"Local archive"}),0);
 const db={prepare:(sql)=>({bind:(...args)=>({all:async()=>({results:sqlite.prepare(sql).all(...args)})})})};
 return {db,sqlite};
}
const analyst={workspace_role:"agricultural_analyst"};
const viewer={workspace_role:"public_viewer"};
const manager={workspace_role:"super_admin",role:"admin"};

test("published local observations filter and paginate without exposing unpublished rows",async()=>{
 const {db}=fixture();
 const query={domain:"crop",crop:"Maize",season:"Season B"};
 const first=await readLocalRecords(db,analyst,{entity:"AgriculturalObservation",query,options:{sort:"-year",limit:1}});
 assert.equal(first.items[0].value,120);
 assert.equal(first.has_more,true);
 const second=await readLocalRecords(db,analyst,{entity:"AgriculturalObservation",query,options:{sort:"-year",limit:1,cursor:first.next_cursor}});
 assert.equal(second.items[0].year,2025);
 assert.equal(second.has_more,false);
 const publicPage=await readLocalRecords(db,viewer,{entity:"AgriculturalObservation",query:{year:2026}});
 assert.deepEqual(publicPage.items.map(r=>r.id),["b","c"]);
});

test("authentication and role checks protect archive and private work collections",async()=>{
 const {db}=fixture();
 await assert.rejects(readLocalRecords(db,null,{entity:"Dataset"}),{status:401});
 for(const entity of ["SourceArchive","SurveyFile","ImportLog","Investigation","InvestigationNote","FollowUpAction","Alert","ReportFinding"])
  await assert.rejects(readLocalRecords(db,viewer,{entity}),{status:403});
 await assert.rejects(readLocalRecords(db,analyst,{entity:"SourceArchive"}),{status:403});
 assert.equal((await readLocalRecords(db,manager,{entity:"SourceArchive"})).items.length,1);
});

test("full source tables and report pages expose published records only; metric projections retain values",async()=>{
 const {db,sqlite}=fixture();
 const insert=sqlite.prepare("INSERT INTO local_records VALUES(?,?,?,?)");
 for(const entity of ["SourceTableIndex","SourceTable","SourceReportIndex","SourceReportPage"]){
  insert.run(entity,"approved",JSON.stringify({id:"approved",rows:[["published"]]}),1);
  insert.run(entity,"draft",JSON.stringify({id:"draft",rows:[["unpublished"]]}),0);
  const page=await readLocalRecords(db,viewer,{entity});
  assert.deepEqual(page.items.map(row=>row.id),["approved"]);
  await assert.rejects(readLocalRecords(db,null,{entity}),{status:401});
 }
 const metrics=await readLocalRecords(db,analyst,{entity:"AgriculturalObservation",query:{measure_group:"production_area"},options:{view:"metrics"}});
 assert.equal(metrics.items.length,3);
 assert.equal(metrics.items.find(row=>row.id==="b").value,120);
 assert.throws(()=>validateLocalRead({entity:"AgriculturalObservation",query:{measure_group:"anything"}}));
 assert.throws(()=>validateLocalRead({entity:"SourceTable",options:{view:"metrics"}}));
});

test("local queries reject invalid identifiers, ordering and page bounds",async()=>{
 for(const input of [
  {entity:"local_users"},{entity:"Dataset",query:{"name') OR 1=1 --":"x"}},
  {entity:"Dataset",options:{sort:"name; DROP TABLE local_records"}},{entity:"Dataset",options:{limit:9000}},
  {entity:"Dataset",options:{cursor:"-1"}},{entity:"Dataset",query:{year:"not a year"}},
 ]) assert.throws(()=>validateLocalRead(input));
 const {db}=fixture();
 assert.equal((await readLocalRecords(db,analyst,{entity:"AgriculturalObservation",query:{crop:"Maize' OR 1=1 --"}})).items.length,0);
});

test("missing values stay unavailable and seasonal totals never average yields",()=>{
 assert.equal(toNumber(null),null); assert.equal(toNumber(""),null); assert.equal(toNumber(false),null);
 assert.equal(computeYield(null,10),null); assert.equal(computeYield(10,0),null);
 assert.equal(computeYield(0,10),0);
 assert.equal(percentageChange(null,10).reason,"missing");
 assert.equal(percentageChange(10,0).reason,"zero_baseline");
 const rows=[
  {year:2026,season:"Season A",indicator:"production",value:100},
  {year:2026,season:"Season B",indicator:"production",value:60},
  {year:2026,season:"Season B",indicator:"harvested_area",value:20},
 ];
 assert.equal(totalsForPeriod(rows,{year:2026,season:"Season B",indicator:"production"}).value,60);
 assert.equal(totalsForPeriod(rows,{year:2026,season:"Season B",indicator:"yield"}).value,3);
});

test("report provenance includes the selected releases and excludes unrelated older sources",()=>{
 const sources=[2024,2025,2026].map(year=>({id:"source-"+year,name:"NISR "+year,reporting_period:String(year),quality_status:"verified",publisher:"NISR"}));
 const result=sourceProvenance(sources,[{dataset_id:"source-2025"},{dataset_id:"source-2026"}]);
 assert.equal(result.sources.length,2);
 assert.doesNotMatch(result.dataset.name,/2024/);
 assert.match(result.dataset.name,/2025/);assert.match(result.dataset.name,/2026/);
 assert.equal(result.dataset.quality_status,"verified");
 assert.equal(sourceProvenance(sources,[]).dataset,null);
});
