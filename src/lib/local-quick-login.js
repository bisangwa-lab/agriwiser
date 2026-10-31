import { PANELS } from "./rbac.js";

export const QUICK_LOCAL_ACCOUNTS = {
  administrator: { ...PANELS.admin, email: "admin@hingasmart.local", role: "super_admin", description: "Users, datasets and data quality" },
  analytics: { ...PANELS.analytics, email: "analyst@hingasmart.local", role: "agricultural_analyst", description: "Explore, compare, investigate changes and report" },
  field_operations: { ...PANELS.field_operations, email: "officer@hingasmart.local", role: "agricultural_officer", description: "Assigned investigations and observations" },
  community_business: { ...PANELS.community_business, email: "community@hingasmart.local", role: "farmer", description: "Farmers, cooperatives, buyers and agribusinesses" },
  viewer: { ...PANELS.public_insights, email: "viewer@hingasmart.local", role: "public_viewer", description: "Preview AgriWiser services with a basic-phone menu" },
};

export function quickLoginAllowed({ development, authMode, enabled, hostname }) {
  return development === true && authMode === "local" && enabled === "true"
    && ["localhost", "127.0.0.1", "[::1]"].includes(hostname);
}
