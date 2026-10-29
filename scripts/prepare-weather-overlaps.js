import {readFile,writeFile} from 'node:fs/promises';
import {districtCellOverlaps} from '../src/lib/weather-overlap.js';
import {WEATHER_DATASETS} from '../src/lib/weather-datasets.js';
const geojson=JSON.parse(await readFile(new URL('../src/data/rwanda-districts.geojson',import.meta.url),'utf8'));
const datasets={};
for(const dataset of Object.keys(WEATHER_DATASETS)) {
 const districts=geojson.features.map(feature=>districtCellOverlaps(feature,dataset));
 const cells=[...new Map(districts.flatMap(d=>d.cells).map(({weight,areaKm2,...cell})=>[cell.id,cell])).values()];
 datasets[dataset]={districts,cells};
 console.log(dataset,`${districts.length} districts, ${cells.length} intersecting cells`);
}
await writeFile(new URL('../src/data/weather-overlaps.json',import.meta.url),JSON.stringify({method:'District/cell polygon intersections in cylindrical equal-area coordinates, including holes and every multipolygon member. Weight = overlap area / full district area.',datasets},null,2)+'\n');
