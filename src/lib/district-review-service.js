import { CROPS, DISTRICT_NAMES, SEASONS, YEARS } from "./constants.js";
import { normalizeRole } from "./rbac.js";
import { districtMapData } from "./district-map.js";
import { readLocalRecords } from "./local-data-service.js";

export function validateDistrictReview(input) {
 if(!input || typeof input!=="object" || Object.keys(input).some(key=>!["district","crop","season","year","reason","mode","compareYear","compareSeason"].includes(key))) throw new Error("Invalid district review.");
 if(!DISTRICT_NAMES.includes(input.district)||!CROPS.includes(input.crop)||!SEASONS.includes(input.season)||!YEARS.includes(input.year)) throw new Error("Choose a supported district, crop, season and year.");
 if(typeof input.reason!=="string"||input.reason.trim().length<10||input.reason.length>2000) throw new Error("Describe what needs checking in 10–2000 characters.");
 if(!["production","yield","trend","quality","weather"].includes(input.mode)) throw new Error("Choose a map measure.");
 const compareYear=input.compareYear??input.year-1;
 const compareSeason=input.compareSeason??input.season;
 if(!Number.isInteger(compareYear)||compareYear<1900||compareYear>2100||!SEASONS.includes(compareSeason)) throw new Error("Choose a valid baseline reporting period.");
 return {...input,compareYear,compareSeason,reason:input.reason.trim()};
}

async function persistDistrictRecord(db,user,input,entity) {
 const data=validateDistrictReview(input);
 if(!["super_admin","data_manager","agricultural_analyst","policy_maker","agricultural_officer","field_investigator","field_supervisor"].includes(normalizeRole(user))) throw Object.assign(new Error("Your role cannot create an investigation."),{status:403});
 const read=input=>db.readRecords?db.readRecords(input):readLocalRecords(db,user,input);
 const page=await read({entity:"AgriculturalObservation",query:{domain:"crop",crop:data.crop,geography:data.district},options:{limit:1000}});
 const climate=data.mode==="weather" ? await read({entity:"AgriculturalObservation",query:{domain:"climate",geography:data.district},options:{limit:1000}}) : {items:[]};
 const detail=districtMapData(page.items,data,climate.items).find(item=>item.name===data.district);
 if(data.mode==="weather"&&detail.rainfall===null) throw new Error("No compatible rainfall source exists for this period.");
 const id=[entity==="ReportFinding"?"map-finding":"district-review",data.district,data.crop,data.season,data.year,data.compareSeason,data.compareYear,data.mode,entity==="ReportFinding"?user.id??user.email:""].join("-").replaceAll(" ","-").toLowerCase();
 const now=new Date().toISOString();
 const record={
  id,title:(entity==="ReportFinding"?"Finding: ":"Review ")+data.crop+" in "+data.district+" · "+data.year+" "+data.season,
  description:data.reason,reason:data.reason,questions:data.reason,crop:data.crop,district:data.district,season:data.season,year:data.year,period:data.year+" "+data.season,
  previous_period:data.compareYear+" "+data.compareSeason,map_mode:data.mode,summary:data.reason,
  indicator:data.mode==="yield"?"yield":"production",status:entity==="ReportFinding"?"draft":"open",priority:"standard",
  assignee_name:"",assignee_email:"",requested_by:user.email,requested_by_name:user.full_name,
  dataset_id:detail.records[0]?.dataset_id??"",dataset_name:detail.records[0]?.dataset_name??"No source available for selected period",
  evidence:"Created from the district map. Published source cells and their reporting periods are preserved in the evidence snapshot.",
  metric_snapshot:JSON.stringify({production:detail.production,harvested_area:detail.area,yield:detail.yield,previous_production:detail.previous,previous_area:detail.previousArea,previous_yield:detail.previousYield,production_change_pct:detail.changePct,area_change_pct:detail.areaChangePct,rainfall_mm:detail.rainfall}),
  calculation_snapshot:JSON.stringify({method:"Production change compares the selected current and baseline periods for the same district and crop. Different seasons are explicitly labelled. Yield uses compatible production / positive harvested area.",current_period:data.year+" "+data.season,baseline_period:data.compareYear+" "+data.compareSeason,current:detail.records,previous:detail.previousRecords,rainfall:detail.rainfallRecords,warnings:detail.warnings}),
  is_demo:false,created_date:now,updated_date:now,
 };
 if(db.insertOnce)return db.insertOnce(entity,record);
 const inserted=await db.prepare("INSERT OR IGNORE INTO local_records(entity,id,data,published) VALUES(?,?,?,0)").bind(entity,id,JSON.stringify(record)).run();
 const saved=await db.prepare("SELECT data FROM local_records WHERE entity=? AND id=?").bind(entity,id).first();
 return {record:JSON.parse(saved.data),kind:entity,alreadyExists:(inserted.meta?.changes??inserted.changes)===0};
}

export const createDistrictReview=(db,user,input)=>persistDistrictRecord(db,user,input,"Investigation");
export const saveDistrictFinding=(db,user,input)=>persistDistrictRecord(db,user,input,"ReportFinding");
