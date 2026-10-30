import { useQuery } from "@tanstack/react-query";
import { appClient } from "@/api/appClient";

/** Dataset descriptions, units, sources and limitations. */
export function useDatasets() {
  return useQuery({
    queryKey: ["datasets"],
    queryFn: async () => {
      const page = await appClient.entities.Dataset.list({ sort: "-created_date", limit: 60 });
      return page?.items ?? [];
    },
    staleTime: 120_000,
  });
}

export function useImportLogs() {
  return useQuery({
    queryKey: ["import-logs"],
    queryFn: async () => {
      const page = await appClient.entities.ImportLog.list({ sort: "-completed_date", limit: 40 });
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
      const page = await appClient.entities.Alert.list({ sort: "-generated_date", limit: 400 });
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
      const page = await appClient.entities.Investigation.list({ sort: "-created_date", limit: 300 });
      return page?.items ?? [];
    },
    staleTime: 20_000,
  });
}

/** All follow-up actions across investigations, used by the officer dashboard. */
export function useAllFollowUps() {
  return useQuery({
    queryKey: ["follow-ups-all"],
    queryFn: async () => {
      const page = await appClient.entities.FollowUpAction.list({ sort: "due_date", limit: 300 });
      return page?.items ?? [];
    },
    staleTime: 30_000,
  });
}

export function useInvestigation(id) {
  return useQuery({
    queryKey: ["investigation", id],
    enabled: Boolean(id),
    queryFn: () => appClient.entities.Investigation.get(id),
    staleTime: 10_000,
  });
}

export function useFollowUps(investigationId) {
  return useQuery({
    queryKey: ["follow-ups", investigationId],
    enabled: Boolean(investigationId),
    queryFn: async () => {
      const page = await appClient.entities.FollowUpAction.filter(
        { investigation_id: investigationId },
        { sort: "created_date", limit: 100 },
      );
      return page?.items ?? [];
    },
    staleTime: 10_000,
  });
}

export function useInvestigationNotes(investigationId) {
  return useQuery({
    queryKey: ["investigation-notes", investigationId],
    enabled: Boolean(investigationId),
    queryFn: async () => {
      const page = await appClient.entities.InvestigationNote.filter(
        { investigation_id: investigationId },
        { sort: "-created_date", limit: 200 },
      );
      return page?.items ?? [];
    },
    staleTime: 10_000,
  });
}

/** Queries official published agricultural observations for a specific district and crop across all available seasons. */
export function useDistrictCropHistory(district, crop) {
  return useQuery({
    queryKey: ["district-crop-history", district, crop],
    enabled: Boolean(district && crop),
    queryFn: async () => {
      const page = await appClient.entities.AgriculturalObservation.filter(
        { domain: "crop", geography: district, crop },
        { limit: 250, sort: "-year" },
      );
      return page?.items ?? [];
    },
    staleTime: 60_000,
  });
}

