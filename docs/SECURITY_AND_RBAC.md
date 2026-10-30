# AgriWiser — Security & Role-Based Access Control (RBAC)

## 1. Security Architecture Principles

1. **Server-Side Enforcement**: All application access goes through authenticated server functions in `src/lib/intelligence/server-fns.js`. Client-side route guards and hidden buttons are UI conveniences, not authorization barriers.
2. **Supabase Verification**: User identities are verified against Supabase auth tokens on the server, and roles are read from `hingasmart_profiles`. Client `user_metadata` is never trusted for authorization.
3. **No Secret Leaks**: Server secrets, private service keys, and database credentials are kept on the server and never exposed via `VITE_` variables or HTTP response bodies.

---

## 2. Role Permissions Matrix

| Workspace Role | Key Responsibilities | Access Scope | Can Dispatch Investigations? | Can Run Simulations? | Can View Model Governance? |
| :--- | :--- | :--- | :---: | :---: | :---: |
| **Agricultural Officer** (`agricultural_officer`) | Field surveys, local verification, ground truth collection | Sector & District | Yes | Read-only | Read-only |
| **Agricultural Analyst** (`agricultural_analyst`) | Multi-district trend analysis, risk evaluation, AI querying | National | Yes | Yes | Yes |
| **Policy Maker** (`policy_maker`) | Strategic planning, budget allocation simulations, policy dossiers | National | Yes | Yes | Yes |
| **Data Manager** (`data_manager`) | Survey ingestion, quality auditing, dataset publishing | System | Admin | Yes | Yes |
| **Super Admin** (`super_admin`) | System configuration, staff management, audit logging | System | Admin | Yes | Yes |
| **Public Viewer** (`public_viewer`) | Public transparency portal | Aggregates only | No | No | Read-only |

---

## 3. Server Function Guard Examples

All intelligence functions validate the user session before execution:

```javascript
export const dispatchRiskInvestigation = createServerFn({ method: 'POST' })
  .validator((d) => d)
  .handler(async ({ data }) => {
    const user = await requireAuthenticatedUser();
    // Verify user role has field operation dispatch privileges
    assertLocalWriteAccess(user, 'Investigation', 'create');
    // Proceed with verified investigation creation...
  });
```
