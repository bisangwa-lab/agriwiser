import assert from "node:assert/strict";
import { fromCrossJSON, toJSONAsync } from "seroval";
import { readFile } from "node:fs/promises";
const report=JSON.parse(await readFile(new URL("../migration/real-data-import-report.json",import.meta.url),"utf8"));
const origin="http://127.0.0.1:5174";
const ids={};
for(const module of ["local-auth","local-data"]) {
 const source=await (await fetch(origin+"/src/lib/"+module+".js")).text();
 for(const match of source.matchAll(/export const (\w+) = [\s\S]*?createClientRpc\("([^"]+)"\)/g)) ids[match[1]]=match[2];
}
let cookie="";
async function rpc(name,method,data) {
 const encoded=data===undefined?undefined:JSON.stringify(await toJSONAsync({data}));
 const headers={accept:"application/json","x-tsr-serverFn":"true",Origin:origin,...(cookie?{Cookie:cookie}:{})};
 if(method==="POST"&&encoded) headers["content-type"]="application/json";
 const response=await fetch(origin+"/_serverFn/"+ids[name]+(method==="GET"&&encoded?"?payload="+encodeURIComponent(encoded):""),{method,headers,...(method==="POST"&&encoded?{body:encoded}:{})});
 if(response.headers.get("set-cookie")) cookie=response.headers.get("set-cookie").split(";")[0];
 const payload=await response.json();
 const decoded=response.headers.get("x-tss-serialized")?fromCrossJSON(payload,{refs:new Map()}):payload;
 if(decoded.error) throw decoded.error;
 return decoded.result;
}
assert.ok(ids.localReadCollection,"Data RPC found");
await rpc("localQuickLogin","POST",{account:"analytics"});
const all=[];
let cursor;
do {
 const page=await rpc("localReadCollection","GET",{entity:"AgriculturalObservation",query:{domain:"crop"},options:{limit:1000,...(cursor?{cursor}:{})}});
 all.push(...page.items); cursor=page.next_cursor;
} while(cursor);
assert.equal(all.length,report.observation_count);
assert.equal(new Set(all.map(row=>row.id)).size,report.observation_count);
assert.deepEqual([...new Set(all.map(row=>row.year))].sort(),report.years);
assert.equal(new Set(all.map(row=>row.geography)).size,30);
const maize=await rpc("localReadCollection","GET",{entity:"AgriculturalObservation",query:{crop:"Maize",geography:"Gasabo",season:"Season B",year:2026}});
assert.equal(maize.items.length,4);
assert.ok(maize.items.every(row=>row.source_reference&&row.source_url.startsWith("https://statistics.gov.rw/")));
await assert.rejects(rpc("localReadCollection","GET",{entity:"SourceArchive"}));
await rpc("localQuickLogin","POST",{account:"administrator"});
assert.equal((await rpc("localReadCollection","GET",{entity:"SourceArchive",options:{limit:100}})).items.length,32);
assert.equal((await rpc("localReadCollection","GET",{entity:"ImportLog"})).items.length,report.datasets);
await rpc("localQuickLogin","POST",{account:"viewer"});
const reviewRequest={district:"Gasabo",crop:"Maize",season:"Season B",year:2026,mode:"production",reason:"Check the published source before recording a finding."};
assert.ok(ids.localCreateDistrictReview,"District-review RPC found");
await assert.rejects(rpc("localCreateDistrictReview","POST",reviewRequest));
await assert.rejects(rpc("localSaveDistrictFinding","POST",reviewRequest));
await assert.rejects(rpc("localReadCollection","GET",{entity:"ReportFinding"}));
const crossOriginReview=await fetch(origin+"/_serverFn/"+ids.localCreateDistrictReview,{method:"POST",headers:{Origin:"https://example.com",Cookie:cookie}});
assert.equal(crossOriginReview.status,403);
assert.equal((await rpc("localReadCollection","GET",{entity:"AgriculturalObservation",query:{year:2026},options:{limit:2000}})).items.length,2000);
assert.deepEqual([...new Set(all.map(row=>row.crop))].sort(),report.crops);
assert.ok(all.some(row=>row.season==="Season C"));
assert.ok(all.some(row=>row.crop==="Sorghum"&&row.year===2026));
assert.equal((await rpc("localReadCollection","GET",{entity:"SourceTableIndex",options:{limit:2000}})).items.length,report.table_count);
const reports=await rpc("localReadCollection","GET",{entity:"SourceReportIndex"});
assert.equal(reports.items.length,report.report_count);
const foodReport=reports.items.find(item=>item.family==="CFSVA"&&item.year===2024);
assert.ok(foodReport,"Full food-security report indexed");
const foodPages=await rpc("localReadCollection","GET",{entity:"SourceReportPage",query:{report_id:foodReport.id}});
assert.equal(foodPages.items.length,foodReport.page_count);
assert.ok(foodPages.items.some(item=>item.text.includes("food security")));
const sourceTable=await rpc("localReadCollection","GET",{entity:"SourceTable",query:{id:"nisr-sas-2015-annual-table-tables-a"}});
assert.ok(sourceTable.items[0].rows.length>900,"Large original worksheet retained without truncation");
await assert.rejects(rpc("localReadCollection","GET",{entity:"SurveyFile"}));
await assert.rejects(rpc("localReadCollection","GET",{entity:"SourceArchive"}));
await rpc("localLogout","POST");
await assert.rejects(rpc("localReadCollection","GET",{entity:"Dataset"}));
for(const path of ["/@fs/C:/Users/uses/Documents/Share/Project/.local-accounts.json","/@fs/C:/Users/uses/Documents/Share/Project/data/private/local-records.json","/@fs/C:/Users/uses/Documents/Share/Project/Track%201%20-%20Agricultural%20Productivity/T1%20Agriculture%20-%20Seasonal%20Agriculture%20Survey%202025.zip"]) {
 assert.equal((await fetch(origin+path)).status,403,"Raw local files are not served");
}
console.log(`Real-data HTTP checks passed: ${all.length} observations, ${report.crops.length} categories/subtypes, ${report.table_count} full tables, pagination, all seasons, provenance, public aggregate access, private dictionary access control, CSRF, anonymous denial and raw-file protection.`);
