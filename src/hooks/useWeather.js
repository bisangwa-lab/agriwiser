import { useQuery } from "@tanstack/react-query";
import { getWeather,getWeatherMap,getWeatherBaseline,getWeatherStatus,getMeteoCatalogue,getMeteoWeather } from "@/lib/weather";
async function unwrap(promise){const result=await promise;if(!result.ok)throw Object.assign(new Error(result.error.message),result.error);return result.data;}
export function useWeather(input,{enabled=true}={}){return useQuery({queryKey:['weather',input],enabled,queryFn:({signal})=>unwrap(getWeather({data:input,signal})),staleTime:300000,retry:false});}
export function useWeatherMap(input,{enabled=true}={}){return useQuery({queryKey:['weather-map',input],enabled,queryFn:({signal})=>unwrap(getWeatherMap({data:input,signal})),staleTime:300000,retry:false});}
export function useWeatherBaseline(input,{enabled=false}={}){return useQuery({queryKey:['weather-baseline',input],enabled,queryFn:({signal})=>unwrap(getWeatherBaseline({data:input,signal})),staleTime:300000,retry:false});}
export function useWeatherStatus(){return useQuery({queryKey:['weather-status'],queryFn:({signal})=>unwrap(getWeatherStatus({signal})),staleTime:30000,retry:false});}
export function useMeteoCatalogue({enabled=true}={}){return useQuery({queryKey:['meteo-catalogue'],enabled,queryFn:({signal})=>unwrap(getMeteoCatalogue({signal})),staleTime:60000,retry:false});}
export function useMeteoWeather(input,{enabled=false}={}){return useQuery({queryKey:['meteo-weather',input],enabled,queryFn:({signal})=>unwrap(getMeteoWeather({data:input,signal})),staleTime:300000,retry:false});}
