/**
 * AGRIWISER — STRICT DATA CLASSIFICATION SYSTEM
 *
 * Implements the mandatory real-data classification standards specified
 * in the Master Implementation Directive.
 */

export const DATA_CLASSIFICATIONS = Object.freeze({
  OFFICIAL_OBSERVATION: 'OFFICIAL_OBSERVATION',
  EXTERNAL_OBSERVATION: 'EXTERNAL_OBSERVATION',
  MODEL_ESTIMATE: 'MODEL_ESTIMATE',
  FIELD_OBSERVATION: 'FIELD_OBSERVATION',
  DERIVED_STATISTIC: 'DERIVED_STATISTIC',
  SCENARIO_OUTPUT: 'SCENARIO_OUTPUT',
  MODEL_PREDICTION: 'MODEL_PREDICTION',
  DEMONSTRATION: 'DEMONSTRATION',
});

export const CLASSIFICATION_DESCRIPTIONS = Object.freeze({
  [DATA_CLASSIFICATIONS.OFFICIAL_OBSERVATION]:
    'Actual source observation from NISR or another verified statistical authority.',
  [DATA_CLASSIFICATIONS.EXTERNAL_OBSERVATION]:
    'Actual externally supplied observation, such as authorized station measurements.',
  [DATA_CLASSIFICATIONS.MODEL_ESTIMATE]:
    'Value originating from environmental reanalysis, remote sensing, or identified estimation products (e.g. ERA5, MERRA-2).',
  [DATA_CLASSIFICATIONS.FIELD_OBSERVATION]:
    'Genuine observation recorded by authorized field personnel.',
  [DATA_CLASSIFICATIONS.DERIVED_STATISTIC]:
    'Mathematically calculated result derived from valid, compatible real evidence.',
  [DATA_CLASSIFICATIONS.SCENARIO_OUTPUT]:
    'Hypothetical result calculated from explicit assumptions and a documented simulation model.',
  [DATA_CLASSIFICATIONS.MODEL_PREDICTION]:
    'Output from a scientifically evaluated predictive model, clearly separated from actual observations.',
  [DATA_CLASSIFICATIONS.DEMONSTRATION]:
    'Explicit sample content, excluded from real analytical results.',
});

/**
 * Returns whether a classification represents a real, observed fact.
 */
export function isObservedEvidence(classification) {
  return [
    DATA_CLASSIFICATIONS.OFFICIAL_OBSERVATION,
    DATA_CLASSIFICATIONS.EXTERNAL_OBSERVATION,
    DATA_CLASSIFICATIONS.FIELD_OBSERVATION,
  ].includes(classification);
}

/**
 * Ensures an analytical payload is tagged with an immutable classification badge.
 */
export function tagEvidence(data, classification, provenance = {}) {
  if (!DATA_CLASSIFICATIONS[classification]) {
    throw new Error(`Invalid data classification: "${classification}". Must be one of ${Object.keys(DATA_CLASSIFICATIONS).join(', ')}`);
  }
  return {
    ...data,
    classification,
    classificationDescription: CLASSIFICATION_DESCRIPTIONS[classification],
    isSimulated: classification === DATA_CLASSIFICATIONS.SCENARIO_OUTPUT,
    isPredictive: classification === DATA_CLASSIFICATIONS.MODEL_PREDICTION,
    isOfficial: classification === DATA_CLASSIFICATIONS.OFFICIAL_OBSERVATION,
    provenance: {
      ...provenance,
      classifiedAt: provenance.classifiedAt || new Date().toISOString(),
    },
  };
}
