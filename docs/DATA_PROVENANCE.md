# AgriWiser — Data Provenance & Cryptographic Traceability

## 1. Provenance Integrity Mandate

In public policy and national agricultural management, unverified assertions erode trust. Every statistic, risk flag, and simulation output produced by AgriWiser retains an unbroken chain of custody back to its primary source publication.

---

## 2. Evidence Tagging & Data Classifications

Every data object processed by the shared intelligence layer is tagged using `tagEvidence(payload, classification, metadata)` from `src/lib/intelligence/classification.js`.

The 8 immutable classifications:
1. `OFFICIAL_OBSERVATION`: NISR Seasonal Agricultural Survey publications.
2. `EXTERNAL_OBSERVATION`: Authorized meteorological ground station records.
3. `MODEL_ESTIMATE`: Gridded satellite reanalysis products (NASA POWER MERRA-2, ECMWF ERA5).
4. `FIELD_OBSERVATION`: Verified field officer notes and localized farm-gate surveys.
5. `DERIVED_STATISTIC`: Deterministic mathematical outputs (percentage changes, yield decomposition).
6. `SCENARIO_OUTPUT`: Digital Twin hypothetical policy simulations.
7. `MODEL_PREDICTION`: Statistical forecasts with 90% confidence intervals.
8. `DEMONSTRATION`: Explicit mock/sample content, strictly excluded from analytics.

---

## 3. Evidence Snapshots & SHA-256 Hashing

When an analyst or policy maker explores a risk assessment, policy scenario, or AI finding, they can create an immutable **Evidence Snapshot** via `EvidenceService.createSnapshot(title, evidenceData, metadata)`.

The snapshot:
- Serializes the exact underlying evidence data.
- Computes an immutable cryptographic SHA-256 content digest (`sha256-...`).
- Records the authenticated creator email, timestamp, and metadata.
- Precludes retro-active modification of evidence after a decision is made.
