# Dashboard overlay integration instructions

1. These are **working candidate source files**, not a successful integration into the connected private repo. Review latest source first.
2. Copy `overlay/src/lib/field-ops-model.js` to `src/lib/field-ops-model.js` and run the unit tests provided here. After verifying source, replace/merge `overlay/src/components/dashboard/FieldDashboard.jsx` with `src/components/dashboard/FieldDashboard.jsx`.
3. `OfficerPanel.jsx` already re-exports `FieldDashboard`, so the existing `/field-operations` route should display the replacement without route changes. Verify with the actual application.
4. The overlay uses current `useAlerts`, `useInvestigations`, `useAllFollowUps` hooks and existing `NewInvestigationDialog`/`WeatherContext` components. It does **not** fabricate NISR records.
5. It labels counts as loaded-record counts; production completion requires new backend count APIs or fully paginated hooks. Hook limits of 300/400 may hide results.
6. `usesAppData` deliberately disables the 'Start investigation' button until authenticated local mutations work. Implement P2 backend, then enable it only after tests pass.
7. Existing dialog writes `is_demo: true` indiscriminately; fix based on verified source provenance and app mode, not user-controlled flags.
8. Existing `WeatherContext` creates nested cards and has its own state; evaluate visual nesting and improve selection sync so case context is automatically supplied when available.
9. The present overlay preserves case creation from alert in Supabase mode, **not** field visits, supervisor approvals, file uploads or private scoped data. Those require P4–P7 implementations.
10. Run `npm run lint`, `npm run build` and manual role tests. The unit tests below only exercise the pure view model.

Potential improvement in JSX: `view==='signals'` currently uses the default all-cases queue, while 'assigned' and 'evidence' select specialized case subsets. Agent may introduce distinct selected tabs for signals/tasks with the same summary state, provided they are fully wired and accessible.
