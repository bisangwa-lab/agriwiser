import { useQuery } from '@tanstack/react-query';
import { getFieldDirectory, getFieldFindings } from '@/lib/field-api';

/** Authorized, server-side statistical findings. Filters and paging run on the server. */
export function useFieldFindings(query = {}) {
  const key = JSON.stringify(query);
  return useQuery({
    queryKey: ['field-findings', key],
    queryFn: () => getFieldFindings({ data: query }),
    staleTime: 60_000,
  });
}

/** Active field operations accounts available for case and task assignment. */
export function useFieldDirectory({ enabled = true } = {}) {
  return useQuery({
    queryKey: ['field-directory'],
    enabled,
    queryFn: () => getFieldDirectory(),
    staleTime: 300_000,
  });
}
