import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { DISTRICT_NAMES } from "../src/lib/constants.js";
import { districtMapData, mapScale } from "../src/lib/district-map.js";
import { districtPaths } from "../src/lib/map-geometry.js";
import { createDistrictReview, validateDistrictReview, saveDistrictFinding } from "../src/lib/district-review-service.js";

const selection={district:"Gasabo",crop:"Maize",season:"Season B",year:2026,mode:"yield",reason:"Verify the source totals and reporting coverage."};
const row=(indicator,value,year=2026,extra={})=>({id:indicator+"-"+year,domain:"crop",geography:"Gasabo",crop:"Maize",season:"Season B",year,indicator,value,unit:indicator==="production"?"metric tonnes":"hectares",dataset_id:"source-"+year,source_reference:"Official workbook!D5",quality_status:"verified",...extra});
const fixtureRows=[row("production",120),row("harvested_area",40),row("production",100,2025),row("harvested_area",50,2025)];
const detail=rows=>districtMapData(rows,selection).find(d=>d.name==="Gasabo");

test("all real boundary names match the 30 districts and project into finite paths",()=>{
 const geo=JSON.parse(readFileSync(new URL("../src/data/rwanda-districts.geojson",import.meta.url),"utf8"));
 assert.deepEqual(geo.features.map(f=>f.properties.shapeName).sort(),[...DISTRICT_NAMES].sort());
 const paths=districtPaths(geo);
 assert.equal(paths.length,30);
 assert.ok(paths.every(p=>p.path.startsWith("M")&&!/NaN|Infinity/.test(p.path)));
});

test("map values preserve units, exact periods, real zeros and missing-data distinction",()=>{
 const d=detail(fixtureRows);
 assert.equal(d.production,120);assert.equal(d.area,40);assert.equal(d.yield,3);assert.equal(d.changePct,20);assert.equal(d.quality,"complete");
 const zero=detail([row("production",0),row("harvested_area",40),row("production",0,2025)]);
 assert.equal(zero.production,0);assert.equal(zero.yield,0);assert.equal(zero.changePct,null);
 assert.notEqual(mapScale("production",[zero]).color(zero),null);
 const empty=detail([]);
 assert.equal(empty.production,null);assert.equal(mapScale("production",[empty]).color(empty),null);
 const partial=detail([row("production",120),row("harvested_area",40,2025)]);
 assert.equal(partial.yield,null);assert.equal(partial.quality,"incomplete");
 assert.equal(detail([row("production",120,2025)]).quality,"outdated");
 assert.equal(detail([row("production",120,2024)]).changePct,null);
});

test("map rejects duplicate, incompatible, negative and demonstration observations",()=>{
 assert.equal(detail([...fixtureRows,row("production",999)]).production,null);
 assert.equal(detail([row("production",120),row("harvested_area",40,2026,{dataset_id:"other-release"})]).yield,null);
 assert.equal(detail([row("production",120,2026,{unit:"kilograms"})]).production,null);
 assert.equal(detail([row("production",-1)]).production,null);
 assert.equal(detail([row("production",120,2026,{is_demo:true})]).production,null);
});

test("weather stays unavailable without a suitable same-season district rainfall series",()=>{
 assert.equal(detail(fixtureRows).rainfall,null);
 const climate=[{id:"rainfall",domain:"climate",geography:"Gasabo",season:"Season B",year:2026,indicator:"rainfall_mm",unit:"millimetres",value:350}];
 assert.equal(districtMapData(fixtureRows,selection,climate).find(d=>d.name==="Gasabo").rainfall,350);
 const old=[{...climate[0],year:2025}];
 assert.equal(districtMapData(fixtureRows,selection,old).find(d=>d.name==="Gasabo").rainfall,null);
});

test("analysts can compare two explicit seasons and cannot colour a comparison with itself",()=>{
 const rows=[...fixtureRows,row("production",80,2026,{id:"production-2026-a",season:"Season A"}),row("harvested_area",20,2026,{id:"area-2026-a",season:"Season A"})];
 const d=districtMapData(rows,{...selection,compareYear:2026,compareSeason:"Season A"}).find(item=>item.name==="Gasabo");
 assert.equal(d.previous,80);assert.equal(d.previousArea,20);assert.equal(d.changePct,50);assert.equal(d.areaChangePct,100);
 assert.ok(d.warnings.some(w=>w.includes("different agricultural seasons")));
 const self=districtMapData(rows,{...selection,compareYear:2026,compareSeason:"Season B"}).find(item=>item.name==="Gasabo");
 assert.equal(self.changePct,null);assert.equal(self.quality,"incomparable");
});

test("district investigation stores database evidence, is idempotent and rejects public callers",async()=>{
 const sqlite=new DatabaseSync(":memory:");
 sqlite.exec(readFileSync(new URL("../migrations/0002_local_data.sql",import.meta.url),"utf8"));
 for(const r of fixtureRows) sqlite.prepare("INSERT INTO local_records VALUES('AgriculturalObservation',?,?,1)").run(r.id,JSON.stringify(r));
 const db={prepare:sql=>({bind:(...args)=>({all:async()=>({results:sqlite.prepare(sql).all(...args)}),run:async()=>sqlite.prepare(sql).run(...args),first:async()=>sqlite.prepare(sql).get(...args)})})};
 await assert.rejects(createDistrictReview(db,{workspace_role:"public_viewer"},selection),{status:403});
 assert.throws(()=>validateDistrictReview({...selection,production:99999}));
 const user={email:"analyst@example.test",full_name:"Analyst",workspace_role:"agricultural_analyst"};
 const result=await createDistrictReview(db,user,selection);
 assert.equal(result.alreadyExists,false);
 assert.equal(result.record.is_demo,false);
 assert.equal(JSON.parse(result.record.metric_snapshot).production,120);
 assert.equal(JSON.parse(result.record.calculation_snapshot).current[0].source_reference,"Official workbook!D5");
 assert.equal((await createDistrictReview(db,user,selection)).alreadyExists,true);
 assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM local_records WHERE entity='Investigation'").get().n,1);
 const finding=await saveDistrictFinding(db,user,{...selection,compareYear:2025,compareSeason:"Season B"});
 assert.equal(finding.kind,"ReportFinding");assert.equal(finding.record.status,"draft");
 assert.equal(finding.record.previous_period,"2025 Season B");
 assert.equal(JSON.parse(finding.record.metric_snapshot).previous_area,50);
 assert.equal((await saveDistrictFinding(db,user,selection)).alreadyExists,true);
 await assert.rejects(saveDistrictFinding(db,{workspace_role:"public_viewer"},selection),{status:403});
 assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM local_records WHERE entity='ReportFinding'").get().n,1);
 const gap=await createDistrictReview(db,user,{...selection,district:"Kirehe",mode:"quality"});
 assert.equal(JSON.parse(gap.record.metric_snapshot).production,null);
 assert.equal(JSON.parse(gap.record.calculation_snapshot).current.length,0);
});
