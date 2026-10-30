import { createFileRoute } from "@tanstack/react-router";

// A server route: a raw HTTP endpoint that lives next to the pages. Handlers get
// `context.getAppClient()` like server functions do. Never define routes under
// Reserved infrastructure endpoints are handled outside application routes.
export const Route = createFileRoute("/api/time")({
  server: {
    handlers: {
      GET: async () => Response.json({ now: new Date().toISOString() }, { headers: { "cache-control": "no-store" } }),
    },
  },
});
