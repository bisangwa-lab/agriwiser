const inRing=([x,y],ring)=>{
  let inside=false;
  for(let i=0,j=ring.length-1;i<ring.length;j=i++) {
    const [xi,yi]=ring[i],[xj,yj]=ring[j];
    if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi) inside=!inside;
  }
  return inside;
};
export const inPolygon=(point,rings)=>inRing(point,rings[0])&&!rings.slice(1).some(ring=>inRing(point,ring));
export function insideRwanda(latitude,longitude,geojson) {
  return geojson.features.some(feature=>(feature.geometry.type==="MultiPolygon"?feature.geometry.coordinates:[feature.geometry.coordinates]).some(polygon=>inPolygon([longitude,latitude],polygon)));
}
export function representativePoint(feature) {
  const polygons=feature.geometry.type==="MultiPolygon"?feature.geometry.coordinates:[feature.geometry.coordinates];
  const area=ring=>ring.reduce((sum,p,i)=>i?sum+ring[i-1][0]*p[1]-p[0]*ring[i-1][1]:sum,0);
  const polygon=[...polygons].sort((a,b)=>Math.abs(area(b[0]))-Math.abs(area(a[0])))[0];
  const ring=polygon[0];let x=0,y=0,a=0;
  for(let i=1;i<ring.length;i++) {const p=ring[i-1],q=ring[i],cross=p[0]*q[1]-q[0]*p[1];a+=cross;x+=(p[0]+q[0])*cross;y+=(p[1]+q[1])*cross;}
  const centre=[x/(3*a),y/(3*a)];
  if(inPolygon(centre,polygon)) return centre;
  // A scan-line midpoint provides an interior representative for concave rings.
  const ys=ring.map(p=>p[1]),target=(Math.min(...ys)+Math.max(...ys))/2,intersections=[];
  for(let i=1;i<ring.length;i++){const p=ring[i-1],q=ring[i];if((p[1]>target)!==(q[1]>target))intersections.push(p[0]+(target-p[1])*(q[0]-p[0])/(q[1]-p[1]));}
  intersections.sort((a,b)=>a-b);
  for(let i=0;i<intersections.length-1;i+=2){const point=[(intersections[i]+intersections[i+1])/2,target];if(inPolygon(point,polygon))return point;}
  throw new Error("A district representative point could not be resolved.");
}
export function powerGrid(latitude,longitude) {
  const lat=Number((Math.round(latitude/0.5)*0.5).toFixed(4)),lon=Number((Math.round(longitude/0.625)*0.625).toFixed(4));
  return {latitude:lat,longitude:lon,id:`merra2:${lat}:${lon}`,resolution:"0.5° latitude × 0.625° longitude"};
}
