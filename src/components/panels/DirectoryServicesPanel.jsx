import { PageHeader } from "@/components/common/PageHeader";
import { DirectoryTab } from "@/components/community/DirectoryTab";

export default function DirectoryServicesPanel() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-5">
      <PageHeader
        eyebrow="Panel 4 · Community & business"
        title="Directory & Services"
        description="Find verified agricultural cooperatives and approved sourcing opportunities across Rwanda."
      />
      <DirectoryTab />
    </div>
  );
}
