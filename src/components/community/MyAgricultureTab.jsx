import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/AuthContext";
import { normalizeRole } from "@/lib/rbac";
import { formatNumber, formatSignedPercent } from "@/lib/format";
import {
  Sprout,
  MapPin,
  TrendingUp,
  ArrowRight,
  BookOpen,
  Users,
  Calendar,
  CheckCircle2,
  Sparkles,
  Info,
  Bookmark,
} from "lucide-react";

export function MyAgricultureTab({
  selectedCrop,
  selectedDistrict,
  onSelectCrop,
  onSelectDistrict,
  onNavigateTab,
  overviewData,
  isLoadingObservations,
  savedCrops,
  savedDistricts,
}) {
  const { user } = useAuth();
  const role = normalizeRole(user);

  const cards = overviewData?.cards ?? {};
  const latestPeriod = overviewData?.latestPeriod ?? "Latest available season";
  const productionValue = cards.production?.value;
  const areaValue = cards.harvested_area?.value;
  const yieldValue = cards.yield?.value;
  const prodDelta = cards.production?.deltaPct;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-primary to-primary/85 p-6 text-primary-foreground sm:p-8">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div className="max-w-2xl space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-medium text-primary-foreground">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Personalized Agricultural Dashboard
            </span>
            <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
              From published statistics to everyday farm and business decisions.
            </h2>
            <p className="text-xs leading-relaxed text-primary-foreground/80 sm:text-sm">
              Currently following <span className="font-semibold text-white underline decoration-white/40">{selectedCrop}</span> in{" "}
              <span className="font-semibold text-white underline decoration-white/40">
                {selectedDistrict === "all" ? "All Rwanda" : `${selectedDistrict} District`}
              </span>
              . Every figure below is backed by official NISR Seasonal Agricultural Survey releases.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onNavigateTab("explorer")}
              className="h-9 gap-1.5 text-xs font-medium"
            >
              <TrendingUp className="h-4 w-4" aria-hidden />
              Explore Crop Data
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigateTab("guidance")}
              className="h-9 gap-1.5 border-white/30 bg-white/10 text-xs font-medium text-white hover:bg-white/20 hover:text-white"
            >
              <BookOpen className="h-4 w-4" aria-hidden />
              View Guidance
            </Button>
          </div>
        </div>
      </div>

      {/* Current Crop & District Context Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Active Context Card */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Active Focus
            </span>
            <Sprout className="h-4 w-4 text-primary" aria-hidden />
          </div>
          <div className="mt-2">
            <p className="text-lg font-bold text-foreground">{selectedCrop}</p>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 text-primary" aria-hidden />
              <span>{selectedDistrict === "all" ? "National total (All districts)" : `${selectedDistrict} District`}</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">Period: {latestPeriod}</span>
            <button
              onClick={() => onNavigateTab("explorer")}
              className="font-medium text-primary hover:underline inline-flex items-center gap-0.5"
            >
              Change <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Production Card */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Reported Production
            </span>
            <TrendingUp className="h-4 w-4 text-primary" aria-hidden />
          </div>
          <div className="mt-2">
            {isLoadingObservations ? (
              <p className="text-sm text-muted-foreground">Loading production data…</p>
            ) : productionValue != null ? (
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-foreground">{formatNumber(productionValue)}</span>
                <span className="text-xs font-medium text-muted-foreground">tonnes (t)</span>
              </div>
            ) : (
              <p className="text-sm font-medium text-muted-foreground">Data unavailable</p>
            )}
            {prodDelta != null && (
              <p className="mt-1 text-xs text-muted-foreground">
                <span className={prodDelta >= 0 ? "font-semibold text-emerald-600" : "font-semibold text-amber-600"}>
                  {formatSignedPercent(prodDelta)}
                </span>{" "}
                vs previous year
              </p>
            )}
          </div>
          <p className="mt-3 border-t border-border pt-2 text-[10.5px] text-muted-foreground">
            Official seasonal survey estimate
          </p>
        </div>

        {/* Harvested Area Card */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Harvested Area
            </span>
            <MapPin className="h-4 w-4 text-primary" aria-hidden />
          </div>
          <div className="mt-2">
            {isLoadingObservations ? (
              <p className="text-sm text-muted-foreground">Loading harvested area…</p>
            ) : areaValue != null ? (
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-foreground">{formatNumber(areaValue)}</span>
                <span className="text-xs font-medium text-muted-foreground">hectares (ha)</span>
              </div>
            ) : (
              <p className="text-sm font-medium text-muted-foreground">Data unavailable</p>
            )}
          </div>
          <p className="mt-3 border-t border-border pt-2 text-[10.5px] text-muted-foreground">
            Area harvested during the season
          </p>
        </div>

        {/* Yield Card */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Average Yield
            </span>
            <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden />
          </div>
          <div className="mt-2">
            {isLoadingObservations ? (
              <p className="text-sm text-muted-foreground">Calculating yield…</p>
            ) : yieldValue != null ? (
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-foreground">{formatNumber(yieldValue, 2)}</span>
                <span className="text-xs font-medium text-muted-foreground">t/ha</span>
              </div>
            ) : (
              <p className="text-sm font-medium text-muted-foreground">Yield unavailable</p>
            )}
          </div>
          <p className="mt-3 border-t border-border pt-2 text-[10.5px] text-muted-foreground">
            Production divided by harvested area
          </p>
        </div>
      </div>

      {/* Quick Saved Interests Strip */}
      <div className="rounded-xl border border-border bg-muted/20 p-4">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <Bookmark className="h-4 w-4 text-primary" aria-hidden />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
              My Saved Interests Quick Bar
            </h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigateTab("saved")}
            className="h-7 text-xs text-primary"
          >
            Manage Interests
          </Button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {savedCrops.length === 0 && savedDistricts.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No saved crops or districts yet. Click “Save to Interests” in the Explorer tab to bookmark your farm or business interests.
            </p>
          ) : (
            <>
              {savedCrops.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectCrop(item.value);
                    onNavigateTab("explorer");
                  }}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    selectedCrop === item.value
                      ? "bg-primary text-primary-foreground ring-1 ring-primary"
                      : "bg-background text-foreground hover:bg-muted border border-border"
                  }`}
                >
                  <Sprout className="h-3.5 w-3.5" aria-hidden />
                  {item.value}
                </button>
              ))}
              {savedDistricts.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectDistrict(item.value);
                    onNavigateTab("explorer");
                  }}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    selectedDistrict === item.value
                      ? "bg-primary text-primary-foreground ring-1 ring-primary"
                      : "bg-background text-foreground hover:bg-muted border border-border"
                  }`}
                >
                  <MapPin className="h-3.5 w-3.5" aria-hidden />
                  {item.value}
                </button>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Role-Specific Workflows & Action Cards */}
      <div className="grid gap-5 md:grid-cols-2">
        <DashboardCard
          title={
            role === "farmer"
              ? "Recommended for Farmers"
              : role === "cooperative"
              ? "Recommended for Cooperatives"
              : role === "buyer"
              ? "Recommended for Agricultural Buyers"
              : "Recommended for Agribusinesses"
          }
          subtitle="Direct actions to move from data to operational decisions"
        >
          <div className="space-y-3.5">
            {role === "farmer" && (
              <>
                <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/10 p-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                  <div>
                    <p className="text-xs font-medium text-foreground">Review Seasonal Preparation Guidance</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Check planting dates, spacing standards and basal fertilizer timing for {selectedCrop}.
                    </p>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => onNavigateTab("guidance")}
                      className="h-auto p-0 text-xs text-primary"
                    >
                      Read approved agronomy guidance →
                    </Button>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/10 p-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                  <div>
                    <p className="text-xs font-medium text-foreground">Compare Recent Seasons</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      See how {selectedCrop} production in {selectedDistrict === "all" ? "Rwanda" : selectedDistrict} varied between Season A and B.
                    </p>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => onNavigateTab("compare")}
                      className="h-auto p-0 text-xs text-primary"
                    >
                      Open season comparison →
                    </Button>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/10 p-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                  <div>
                    <p className="text-xs font-medium text-foreground">Subsidies & Crop Insurance</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Explore the National Crop Intensification Programme and NAIS insurance de-risking opportunities.
                    </p>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => onNavigateTab("directory")}
                      className="h-auto p-0 text-xs text-primary"
                    >
                      Browse verified programs →
                    </Button>
                  </div>
                </div>
              </>
            )}

            {role === "cooperative" && (
              <>
                <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/10 p-3">
                  <Users className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                  <div>
                    <p className="text-xs font-medium text-foreground">Collective Aggregation Standards</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Follow RCA and RICA standards for moisture testing (below 13.5%) and batch intake logs.
                    </p>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => onNavigateTab("guidance")}
                      className="h-auto p-0 text-xs text-primary"
                    >
                      Read cooperative guidance →
                    </Button>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/10 p-3">
                  <Users className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                  <div>
                    <p className="text-xs font-medium text-foreground">Commercial Sourcing & Milling Tenders</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Discover verified commercial buyers sourcing bulk grain in your province.
                    </p>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => onNavigateTab("directory")}
                      className="h-auto p-0 text-xs text-primary"
                    >
                      View buyer sourcing calls →
                    </Button>
                  </div>
                </div>
              </>
            )}

            {(role === "buyer" || role === "agribusiness" || role === "super_admin") && (
              <>
                <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/10 p-3">
                  <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                  <div>
                    <p className="text-xs font-medium text-foreground">District Production Ranks & Trends</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Analyze multi-year production volumes for {selectedCrop} across Rwanda districts to identify leading production basins.
                    </p>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => onNavigateTab("explorer")}
                      className="h-auto p-0 text-xs text-primary"
                    >
                      Open district comparison chart →
                    </Button>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/10 p-3">
                  <Users className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                  <div>
                    <p className="text-xs font-medium text-foreground">Connect with Verified Cooperatives</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Browse verified RCA agricultural cooperatives in {selectedDistrict === "all" ? "Rwanda" : selectedDistrict} for direct contracts.
                    </p>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => onNavigateTab("directory")}
                      className="h-auto p-0 text-xs text-primary"
                    >
                      Open cooperative directory →
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </DashboardCard>

        {/* Data Honesty & Provenance Box */}
        <DashboardCard
          title="Information Assessment & Limitations"
          subtitle="How to use published NISR statistics responsibly"
        >
          <div className="space-y-3">
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
              <p className="leading-relaxed">
                <strong className="text-foreground">Official Survey Estimates:</strong> Figures in this workspace reflect published Seasonal Agricultural Survey (SAS) observations from the National Institute of Statistics of Rwanda (NISR).
              </p>
            </div>
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
              <p className="leading-relaxed">
                <strong className="text-foreground">Missing Data Protection:</strong> Where a crop or district was not surveyed or suppressed, values remain explicitly marked as unavailable rather than coerced to zero.
              </p>
            </div>
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
              <p className="leading-relaxed">
                <strong className="text-foreground">Not Live Market Stock:</strong> Historical production statistics describe past seasonal yields; they do not represent current warehouse inventories, live commodity prices, or guaranteed commercial supply.
              </p>
            </div>
          </div>
        </DashboardCard>
      </div>
    </div>
  );
}
