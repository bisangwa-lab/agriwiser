import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { AgriculturalSolutionsLayout } from "@/components/agricultural-solutions/AgriculturalSolutionsLayout";
import { agriScopeSearch, parseAgriScope } from "@/lib/agricultural-solutions-search.js";

export const Route = createFileRoute("/_authed/agricultural-solutions")({
  validateSearch: parseAgriScope,
  component: AgriculturalSolutionsPage,
});

/**
 * The shared crop / district / season / year scope lives in the URL, so a refresh,
 * a direct link or an activity switch all describe the same evidence view.
 */
function AgriculturalSolutionsPage() {
  const scope = Route.useSearch();
  const navigate = useNavigate();

  const setContext = (update) => {
    const next = typeof update === "function" ? update(scope) : { ...scope, ...update };
    navigate({ search: agriScopeSearch(next), replace: true });
  };

  return (
    <AgriculturalSolutionsLayout scope={scope} setContext={setContext}>
      <Outlet />
    </AgriculturalSolutionsLayout>
  );
}
