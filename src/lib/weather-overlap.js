import { WEATHER_DATASETS,weatherGrid } from './weather-datasets.js';

// Clip against each axis-aligned cell edge. Rings are processed separately so
// holes are subtracted and every member of a MultiPolygon contributes.
export function clipRing(ring,bounds) {
 let points=ring.slice(0,-1);
 for(const [axis,edge,sign] of [[0,bounds.west,1],[0,bounds.east,-1],[1,bounds.south,1],[1,bounds.north,-1]]) {
  const output=[];
  for(let i=0;i<points.length;i++) {
   const a=points[(i+points.length-1)%points.length],b=points[i];
   const aIn=sign*(a[axis]-edge)>=0,bIn=sign*(b[axis]-edge)>=0;
   if(aIn!==bIn){const t=(edge-a[axis])/(b[axis]-a[axis]);output.push(axis===0?[edge,a[1]+t*(b[1]-a[1])]:[a[0]+t*(b[0]-a[0]),edge]);}
   if(bIn)output.push(b);
  }
  points=output;
 }
 return points.length>=3?[...points,points[0]]:[];
}
// Equal-area cylindrical projection: x = longitude, y = sin(latitude).
// Project before clipping: straight boundary edges and cell edges partition
// exactly, and the weights account for latitude rather than square degrees.
const radians=Math.PI/180;
const project=([lon,lat])=>[lon*radians,Math.sin(lat*radians)];
function ringArea(ring) {
 if(ring.length<4)return 0;
 const [x0,y0]=ring[0];
 return Math.abs(ring.slice(1).reduce((sum,[x,y],i)=>sum+(ring[i][0]-x0)*(y-y0)-(x-x0)*(ring[i][1]-y0),0))/2;
}
function polygonArea(rings){return Math.max(0,ringArea(rings[0])-rings.slice(1).reduce((sum,ring)=>sum+ringArea(ring),0));}
export function districtCellOverlaps(feature,dataset='merra2') {
 const spec=WEATHER_DATASETS[dataset],polygons=feature.geometry.type==='MultiPolygon'?feature.geometry.coordinates:[feature.geometry.coordinates];
 const projected=polygons.map(polygon=>polygon.map(ring=>ring.map(project)));
 const area=projected.reduce((sum,polygon)=>sum+polygonArea(polygon),0);
 const points=polygons.flat(2),xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
 const cells=[];
 for(let y=Math.floor(Math.min(...ys)/spec.latitudeStep);y<=Math.ceil(Math.max(...ys)/spec.latitudeStep);y++) {
  for(let x=Math.floor(Math.min(...xs)/spec.longitudeStep);x<=Math.ceil(Math.max(...xs)/spec.longitudeStep);x++) {
   const grid=weatherGrid(y*spec.latitudeStep,x*spec.longitudeStep,dataset),b=grid.bounds;
   const bounds={west:b.west*radians,east:b.east*radians,south:Math.sin(b.south*radians),north:Math.sin(b.north*radians)};
   const overlap=projected.reduce((sum,polygon)=>sum+polygonArea(polygon.map(ring=>clipRing(ring,bounds))),0);
   if(overlap>0)cells.push({...grid,weight:overlap/area,areaKm2:overlap*6371.0088**2});
  }
 }
 const covered=cells.reduce((sum,cell)=>sum+cell.weight,0);
 if(!area||Math.abs(covered-1)>1e-7)throw new Error(`Incomplete grid partition for ${feature.properties.shapeName}: ${covered}`);
 return {district:feature.properties.shapeName,areaKm2:area*6371.0088**2,cells};
}
