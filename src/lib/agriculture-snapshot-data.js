function isExternalHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

/**
 * Retain only published observations with a linked, non-demonstration dataset
 * and an external source URL. The caller reads the published-only application
 * record API; this helper excludes sample rows and records without traceable
 * dataset metadata from the public-facing snapshot.
 */
export function selectTraceableAgricultureData(observations = [], datasets = []) {
  const datasetById = new Map(datasets.map((dataset) => [dataset.id, dataset]));
  const sourceById = new Map();
  const rows = observations.filter((row) => {
    const source = datasetById.get(row.dataset_id);
    if (!source || row.is_demo === true || row.quality_status === "demonstration" || source.quality_status === "demonstration") return false;
    if (!isExternalHttpUrl(source.source_url)) return false;
    sourceById.set(source.id, {
      id: source.id,
      name: source.name,
      source_url: source.source_url,
      quality_status: source.quality_status,
    });
    return true;
  });
  return { rows, sources: [...sourceById.values()] };
}
