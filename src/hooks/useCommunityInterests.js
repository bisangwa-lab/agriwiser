import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { getCommunitySavedInterests, saveCommunityInterest, removeCommunityInterest } from "@/lib/server-fns";
import { toast } from "sonner";
import { useMemo } from "react";

const STORAGE_PREFIX = "agriwiser_saved_interests_";

function getLocalStorageInterests(userId) {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${userId || "anon"}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setLocalStorageInterests(userId, items) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${userId || "anon"}`, JSON.stringify(items));
  } catch {
    // Ignore storage quota
  }
}

export function useCommunityInterests() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id || "anon";

  const {
    data: serverInterests,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["community-saved-interests", userId],
    queryFn: async () => {
      try {
        const result = await getCommunitySavedInterests();
        if (Array.isArray(result)) {
          setLocalStorageInterests(userId, result);
          return result;
        }
      } catch {
        // Fallback to local storage if offline or server function unavailable
      }
      return getLocalStorageInterests(userId);
    },
    initialData: () => getLocalStorageInterests(userId),
    staleTime: 30_000,
  });

  const interests = serverInterests || [];

  const addMutation = useMutation({
    mutationFn: async ({ type, value, notes }) => {
      try {
        return await saveCommunityInterest({ data: { type, value, notes } });
      } catch {
        // Local fallback
        const now = new Date().toISOString();
        const fallbackRecord = {
          id: `local-${userId}-${type}-${encodeURIComponent(value.toLowerCase())}`,
          user_id: userId,
          type,
          value,
          name: value,
          notes: notes || "",
          createdAt: now,
          created_at: now,
        };
        const current = getLocalStorageInterests(userId);
        const exists = current.some((item) => item.type === type && item.value.toLowerCase() === value.toLowerCase());
        if (!exists) {
          const updated = [fallbackRecord, ...current];
          setLocalStorageInterests(userId, updated);
        }
        return fallbackRecord;
      }
    },
    onSuccess: (saved) => {
      queryClient.setQueryData(["community-saved-interests", userId], (prev = []) => {
        const filtered = prev.filter(
          (item) => !(item.type === saved.type && item.value.toLowerCase() === saved.value.toLowerCase())
        );
        const updated = [saved, ...filtered];
        setLocalStorageInterests(userId, updated);
        return updated;
      });
      toast.success(`Saved '${saved.value}' to your followed ${saved.type === "crop" ? "crops" : "districts"}.`);
    },
    onError: (err) => {
      toast.error(err.message || "Could not save interest.");
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (id) => {
      try {
        return await removeCommunityInterest({ data: { id } });
      } catch {
        // Local fallback
        const current = getLocalStorageInterests(userId);
        const updated = current.filter((item) => item.id !== id);
        setLocalStorageInterests(userId, updated);
        return { ok: true, id };
      }
    },
    onSuccess: (_, id) => {
      queryClient.setQueryData(["community-saved-interests", userId], (prev = []) => {
        const updated = prev.filter((item) => item.id !== id);
        setLocalStorageInterests(userId, updated);
        return updated;
      });
      toast.success("Removed from your saved interests.");
    },
    onError: (err) => {
      toast.error(err.message || "Could not remove interest.");
    },
  });

  const isSaved = useMemo(() => {
    return (type, value) => {
      if (!value) return false;
      return interests.some(
        (item) => item.type === type && item.value.toLowerCase() === value.toLowerCase()
      );
    };
  }, [interests]);

  const savedCrops = useMemo(() => {
    return interests.filter((item) => item.type === "crop");
  }, [interests]);

  const savedDistricts = useMemo(() => {
    return interests.filter((item) => item.type === "district");
  }, [interests]);

  return {
    savedInterests: interests,
    savedCrops,
    savedDistricts,
    isLoading,
    error,
    saveInterest: (type, value, notes) => addMutation.mutateAsync({ type, value, notes }),
    removeInterest: (id) => removeMutation.mutateAsync(id),
    isSaved,
    isSaving: addMutation.isPending,
    isRemoving: removeMutation.isPending,
  };
}
