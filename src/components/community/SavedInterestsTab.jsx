import { useState } from "react";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CROPS, DISTRICT_NAMES } from "@/lib/constants";
import {
  Bookmark,
  Sprout,
  MapPin,
  Trash2,
  ExternalLink,
  Plus,
  ArrowRight,
  ShieldCheck,
  Download,
} from "lucide-react";
import { downloadCsv, toCsv } from "@/lib/csv";

export function SavedInterestsTab({
  savedInterests,
  savedCrops,
  savedDistricts,
  onRemoveInterest,
  onSaveInterest,
  onSelectCrop,
  onSelectDistrict,
  onNavigateTab,
  isRemoving,
  isSaving,
}) {
  const [newType, setNewType] = useState("crop");
  const [newValue, setNewValue] = useState(CROPS[0]);
  const [notes, setNotes] = useState("");

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newValue) return;
    await onSaveInterest(newType, newValue, notes);
    setNotes("");
  };

  const handleExport = () => {
    const rows = savedInterests.map((item) => ({
      Type: item.type === "crop" ? "Agricultural Crop" : "District Area",
      Name: item.value,
      Notes: item.notes || "",
      SavedAt: item.createdAt || item.created_at || "",
    }));
    downloadCsv("my-saved-agricultural-interests.csv", toCsv(rows));
  };

  return (
    <div className="space-y-6">
      {/* Overview & Quick Stats */}
      <DashboardCard
        title="Saved Agricultural Interests"
        subtitle="Manage the crops and districts you follow across Rwanda with persistent account synchronization"
      >
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 font-medium text-foreground">
              <Sprout className="h-4 w-4 text-primary" aria-hidden />
              {savedCrops.length} followed crops
            </span>
            <span className="flex items-center gap-1.5 font-medium text-foreground">
              <MapPin className="h-4 w-4 text-primary" aria-hidden />
              {savedDistricts.length} followed districts
            </span>
          </div>

          {savedInterests.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="h-8 gap-1.5 text-xs"
            >
              <Download className="h-3.5 w-3.5" />
              Export Interests CSV
            </Button>
          )}
        </div>
      </DashboardCard>

      {/* Add New Interest Form */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Plus className="h-4 w-4 text-primary" aria-hidden />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
            Bookmark an Additional Crop or District
          </h3>
        </div>

        <form onSubmit={handleAdd} className="grid gap-3 sm:grid-cols-4 items-end">
          <div>
            <label className="text-[11px] font-medium text-muted-foreground block mb-1">
              Interest Type
            </label>
            <select
              aria-label="Interest type"
              value={newType}
              onChange={(e) => {
                setNewType(e.target.value);
                setNewValue(e.target.value === "crop" ? CROPS[0] : DISTRICT_NAMES[0]);
              }}
              className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary h-9"
            >
              <option value="crop">Agricultural Crop</option>
              <option value="district">Rwanda District</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-medium text-muted-foreground block mb-1">
              Select {newType === "crop" ? "Crop" : "District"}
            </label>
            <select
              aria-label={newType === "crop" ? "Select crop" : "Select district"}
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary h-9"
            >
              {newType === "crop"
                ? CROPS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))
                : DISTRICT_NAMES.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-medium text-muted-foreground block mb-1">
              Notes (Optional)
            </label>
            <Input
              type="text"
              placeholder="e.g. Cooperative priority, 2025 focus..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-9 text-xs"
            />
          </div>

          <Button type="submit" disabled={isSaving} className="h-9 gap-1.5 text-xs">
            <Plus className="h-3.5 w-3.5" />
            {isSaving ? "Saving…" : "Save to Interests"}
          </Button>
        </form>
      </div>

      {/* Lists of Saved Crops and Districts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Saved Crops Card */}
        <DashboardCard
          title="Followed Crops"
          subtitle="Quickly open and monitor your priority agricultural commodities"
        >
          {savedCrops.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
              <Sprout className="mx-auto h-6 w-6 text-muted-foreground/60 mb-2" />
              No crops saved yet. Choose a crop above or from the Explorer tab to add it to your followed interests.
            </div>
          ) : (
            <div className="space-y-2">
              {savedCrops.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-card p-3 shadow-xs hover:bg-muted/20 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Sprout className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">{item.value}</p>
                      {item.notes && <p className="text-[11px] text-muted-foreground">{item.notes}</p>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        onSelectCrop(item.value);
                        onNavigateTab("explorer");
                      }}
                      className="h-7 text-xs gap-1 font-medium"
                    >
                      Explore <ArrowRight className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onRemoveInterest(item.id)}
                      disabled={isRemoving}
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                      aria-label={`Remove ${item.value}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DashboardCard>

        {/* Saved Districts Card */}
        <DashboardCard
          title="Followed Districts"
          subtitle="Quickly track production patterns for your operational territories"
        >
          {savedDistricts.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
              <MapPin className="mx-auto h-6 w-6 text-muted-foreground/60 mb-2" />
              No districts saved yet. Select your district in the Explorer tab to bookmark it here.
            </div>
          ) : (
            <div className="space-y-2">
              {savedDistricts.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-card p-3 shadow-xs hover:bg-muted/20 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <MapPin className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">{item.value} District</p>
                      {item.notes && <p className="text-[11px] text-muted-foreground">{item.notes}</p>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        onSelectDistrict(item.value);
                        onNavigateTab("explorer");
                      }}
                      className="h-7 text-xs gap-1 font-medium"
                    >
                      Explore <ArrowRight className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onRemoveInterest(item.id)}
                      disabled={isRemoving}
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                      aria-label={`Remove ${item.value}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DashboardCard>
      </div>

      {/* Security and User Isolation Note */}
      <div className="rounded-xl border border-border bg-muted/20 p-4">
        <div className="flex items-start gap-2.5 text-xs text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
          <p className="leading-relaxed">
            <strong className="text-foreground">User Privacy & Security:</strong> Your followed crops and districts are private to your authenticated user account. One user cannot access or modify another user's saved interests.
          </p>
        </div>
      </div>
    </div>
  );
}
