import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { fetchAll } from "@/lib/fetch-all";

/** Dataset descriptions, units, sources and limitations. */
export function useDatasets() {
  return useQuery({
    queryKey: ["datasets"],
    queryFn: async () => {
      const page = await base44.entities.Dataset.list({ sort: "-created_date", limit: 60 });
      return page?.items ?? [];
    },
    staleTime: 120_000,
  });
}

export function useImportLogs() {
  return useQuery({
    queryKey: ["import-logs"],
    queryFn: async () => {
      const page = await base44.entities.ImportLog.list({ sort: "-completed_date", limit: 40 });
      return page?.items ?? [];
    },
    staleTime: 30_000,
  });
}

export function useAlerts({ enabled = true } = {}) {
  return useQuery({
    queryKey: ["alerts"],
    enabled,
    queryFn: async () => {
      const page = await base44.entities.Alert.list({ sort: "-generated_date", limit: 400 });
      return page?.items ?? [];
    },
    staleTime: 30_000,
  });
}

export function useInvestigations({ enabled = true } = {}) {
  return useQuery({
    queryKey: ["investigations"],
    enabled,
    queryFn: async () => {
      return (await fetchAll(base44.entities.Investigation, {}, { pageSize: 500 }))
        .sort((a, b) => (b.created_date ?? "").localeCompare(a.created_date ?? ""));
    },
    staleTime: 20_000,
  });
}

/** All follow-up actions across investigations, used by the officer dashboard. */
export function useAllFollowUps() {
  return useQuery({
    queryKey: ["follow-ups-all"],
    queryFn: async () => {
      return (await fetchAll(base44.entities.FollowUpAction, {}, { pageSize: 500 }))
        .sort((a, b) => (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999"));
    },
    staleTime: 30_000,
  });
}

export function useInvestigation(id) {
  return useQuery({
    queryKey: ["investigation", id],
    enabled: Boolean(id),
    queryFn: () => base44.entities.Investigation.get(id),
    staleTime: 10_000,
  });
}

export function useFollowUps(investigationId) {
  return useQuery({
    queryKey: ["follow-ups", investigationId],
    enabled: Boolean(investigationId),
    queryFn: async () => {
      return (await fetchAll(base44.entities.FollowUpAction, { investigation_id: investigationId }, { pageSize: 500 }))
        .sort((a, b) => (a.created_date ?? "").localeCompare(b.created_date ?? ""));
    },
    staleTime: 10_000,
  });
}

export function useInvestigationNotes(investigationId) {
  return useQuery({
    queryKey: ["investigation-notes", investigationId],
    enabled: Boolean(investigationId),
    queryFn: async () => {
      return (await fetchAll(base44.entities.InvestigationNote, { investigation_id: investigationId }, { pageSize: 500 }))
        .sort((a, b) => (b.created_date ?? "").localeCompare(a.created_date ?? ""));
    },
    staleTime: 10_000,
  });
}
