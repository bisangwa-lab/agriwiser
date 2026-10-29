import test from "node:test";
import assert from "node:assert/strict";
import { fetchAll } from "../src/lib/fetch-all.js";
import { CROPS, MAIN_CROPS, CROP_PARENTS, SEASONS } from "../src/lib/constants.js";
import { seriesByYear, totalsForPeriod, yieldFromRows } from "../src/lib/metrics.js";

test("full catalogue includes historical categories and subtypes without overlap in main totals", () => {
  for (const crop of ["Sorghum","Sweet Potato","Soybean","Groundnuts","Vegetables","Chia Seeds"]) assert.ok(CROPS.includes(crop));
  assert.ok(SEASONS.includes("Season C"));
  assert.ok(MAIN_CROPS.every(crop=>!CROP_PARENTS[crop]));
  assert.equal(CROP_PARENTS["Cooking Banana"],"Banana");
  assert.equal(CROP_PARENTS["Climbing Beans"],"Beans");
});
test("pagination loads beyond the previous silent 8,000-record cutoff", async () => {
  const rows=Array.from({length:10501},(_,id)=>({id}));
  const result=await fetchAll({filter:async (_,options)=>{
    const offset=Number(options.cursor??0),next=offset+options.limit;
    return {items:rows.slice(offset,next),has_more:next<rows.length,next_cursor:next<rows.length?String(next):null};
  }});
  assert.equal(result.length,10501);
  await assert.rejects(fetchAll({filter:async()=>({items:[],has_more:true,next_cursor:"1"})}),/repeated/);
  await assert.rejects(fetchAll({filter:async()=>({items:[],has_more:true})}),/incomplete/);
});
test("published yield rates are never summed, cultivated area is retained, derived yield requires matched releases", () => {
  const rows=[
    {year:2026,season:"Season B",crop:"Sorghum",geography:"Gasabo",dataset_id:"source",indicator:"production",value:100},
    {year:2026,season:"Season B",crop:"Sorghum",geography:"Gasabo",dataset_id:"source",indicator:"harvested_area",value:50},
    {year:2026,season:"Season B",crop:"Sorghum",geography:"Gasabo",dataset_id:"source",indicator:"cultivated_area",value:60},
    {year:2026,season:"Season B",crop:"Sorghum",geography:"Gasabo",dataset_id:"source",indicator:"reported_yield",value:2000},
  ];
  assert.equal(seriesByYear(rows)[0].cultivated_area,60);
  assert.equal(seriesByYear(rows)[0].reported_yield,2000);
  assert.equal(totalsForPeriod(rows,{year:2026,season:"Season B",indicator:"cultivated_area"}).value,60);
  assert.equal(yieldFromRows(rows),2);
  assert.equal(yieldFromRows(rows.map(row=>row.indicator==="harvested_area"?{...row,dataset_id:"other"}:row)),null);
  assert.equal(seriesByYear([...rows,{...rows[3],geography:"Kirehe"}])[0].reported_yield,null);
});
