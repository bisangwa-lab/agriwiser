export function mapProjection(geojson, width=700, height=460) {
 const all=geojson.features.flatMap(feature=>feature.geometry.type==="MultiPolygon"?feature.geometry.coordinates.flat(2):feature.geometry.coordinates.flat());
 const xs=all.map(point=>point[0]),ys=all.map(point=>point[1]);
 const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
 const longitudeScale=Math.cos((minY+maxY)/2*Math.PI/180);
 const scale=Math.min((width-70)/((maxX-minX)*longitudeScale),(height-40)/(maxY-minY));
 const offsetX=(width-(maxX-minX)*longitudeScale*scale)/2,offsetY=(height-(maxY-minY)*scale)/2;
 const project=point=>[(offsetX+(point[0]-minX)*longitudeScale*scale).toFixed(2),(offsetY+(maxY-point[1])*scale).toFixed(2)];
 return project;
}
export function geometryPath(geometry,project){
 const polygons=geometry.type==="MultiPolygon"?geometry.coordinates:[geometry.coordinates];
 return polygons.flatMap(polygon=>polygon.map(ring=>ring.map((point,index)=>(index?"L":"M")+project(point).join(",")).join("")+"Z")).join("");
}
export function districtPaths(geojson,width=700,height=460){
 const project=mapProjection(geojson,width,height);
 return geojson.features.map(feature=>{
  const path=geometryPath(feature.geometry,project);
  return {name:feature.properties.shapeName,path};
 });
}
