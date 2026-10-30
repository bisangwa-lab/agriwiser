import {useQuery} from '@tanstack/react-query';
import {accountConfiguration} from '@/lib/local-auth';
export function useAccountConfiguration(){return useQuery({queryKey:['account-configuration'],queryFn:()=>accountConfiguration(),staleTime:60000,retry:false});}
