export const WEATHER_DATASETS = {
 merra2: {id:'merra2',label:'NASA POWER · MERRA-2',provider:'NASA POWER',latitudeStep:0.5,longitudeStep:0.625,resolution:'0.5° latitude × 0.625° longitude',delayDays:1,documentation:'https://power.larc.nasa.gov/docs/services/api/temporal/daily/'},
 era5: {id:'era5',label:'Open-Meteo · ERA5',provider:'Open-Meteo',latitudeStep:0.25,longitudeStep:0.25,resolution:'0.25° latitude × 0.25° longitude',delayDays:6,documentation:'https://open-meteo.com/en/docs/historical-weather-api'},
};
export function weatherGrid(latitude,longitude,dataset='merra2') {
 const spec=WEATHER_DATASETS[dataset];
 if(!spec)throw new Error('Unsupported weather dataset');
 const lat=Number((Math.round(latitude/spec.latitudeStep)*spec.latitudeStep).toFixed(6));
 const lon=Number((Math.round(longitude/spec.longitudeStep)*spec.longitudeStep).toFixed(6));
 return {id:`${dataset}:${lat}:${lon}`,dataset,latitude:lat,longitude:lon,resolution:spec.resolution,bounds:{west:lon-spec.longitudeStep/2,east:lon+spec.longitudeStep/2,south:lat-spec.latitudeStep/2,north:lat+spec.latitudeStep/2}};
}
