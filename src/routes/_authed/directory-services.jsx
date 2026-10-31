import { createFileRoute } from "@tanstack/react-router";
import DirectoryServicesPanel from "@/components/panels/DirectoryServicesPanel";

export const Route = createFileRoute("/_authed/directory-services")({
  head: () => ({ meta: [{ title: "Directory & Services · AgriWiser" }] }),
  component: DirectoryServicesPanel,
});
