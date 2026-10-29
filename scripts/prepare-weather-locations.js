import { readFile,writeFile } from "node:fs/promises";
import { representativePoint,powerGrid } from "../src/lib/weather-geometry.js";
const source=JSON.parse(await readFile(new URL('../src/data/rwanda-districts.geojson',import.meta.url),'utf8'));
const locations=source.features.map(feature=>{
 const [longitude,latitude]=representativePoint(feature);
 return {district:feature.properties.shapeName,latitude:Number(latitude.toFixed(6)),longitude:Number(longitude.toFixed(6)),grid:powerGrid(latitude,longitude)};
}).sort((a,b)=>a.district.localeCompare(b.district));
await writeFile(new URL('../src/data/weather-locations.json',import.meta.url),JSON.stringify({method:"Centroid of the largest district polygon, with an interior scan-line fallback for concave polygons. Not a station or district-wide average.",boundary_source:"geoBoundaries / Open Data Rwanda, ADM2 2012; see migration/rwanda-boundaries-source.json",locations},null,2));
console.log(`${locations.length} districts; ${new Set(locations.map(item=>item.grid.id)).size} distinct meteorological grid cells`);
