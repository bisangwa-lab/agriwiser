import { createFileRoute,redirect } from "@tanstack/react-router";
import WeatherDashboard from "@/components/weather/WeatherDashboard";
import { canReadWeather,WEATHER_LOCATIONS } from "@/lib/weather-model";
import { normalizeRole,panelForRole } from "@/lib/rbac";
export const Route=createFileRoute('/_authed/weather')({
 ssr:false,
 validateSearch:search=>({...(WEATHER_LOCATIONS.some(item=>item.district===search.district)?{district:search.district}:{}),...(Number.isInteger(Number(search.year))&&Number(search.year)>=1982&&Number(search.year)<=2100?{year:Number(search.year)}:{}),...(['Season A','Season B','Season C'].includes(search.season)?{season:search.season}:{})}),
 beforeLoad:({context})=>{if(!canReadWeather(context.user))throw redirect({to:panelForRole(normalizeRole(context.user))});},
 head:()=>({meta:[{title:'Weather & climate · HingaSmart Rwanda'}]}),
 component:WeatherPage,
});
function WeatherPage(){const search=Route.useSearch();return <WeatherDashboard key={JSON.stringify(search)} initialSelection={{district:search.district??'Gasabo',year:search.year??2025,season:search.season??'Season B'}}/>;}
