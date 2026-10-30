import { useState, useMemo } from "react";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  VERIFIED_COOPERATIVES,
  VERIFIED_OPPORTUNITIES,
} from "@/lib/community-data";
import {
  Users,
  Building2,
  Search,
  MapPin,
  Sprout,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Briefcase,
  Layers,
  PhoneCall,
  Info,
} from "lucide-react";

export function DirectoryTab({ selectedCrop, selectedDistrict }) {
  const [activeSubTab, setActiveSubTab] = useState("cooperatives"); // 'cooperatives' | 'opportunities'
  const [searchTerm, setSearchTerm] = useState("");
  const [activeOpportunity, setActiveOpportunity] = useState(null);

  // Filter cooperatives
  const filteredCooperatives = useMemo(() => {
    return VERIFIED_COOPERATIVES.filter((coop) => {
      const term = searchTerm.toLowerCase().trim();
      const matchSearch =
        !term ||
        coop.name.toLowerCase().includes(term) ||
        coop.district.toLowerCase().includes(term) ||
        coop.province.toLowerCase().includes(term) ||
        coop.primaryCrops.some((c) => c.toLowerCase().includes(term)) ||
        coop.activities.some((a) => a.toLowerCase().includes(term));
      return matchSearch;
    });
  }, [searchTerm]);

  // Filter opportunities
  const filteredOpportunities = useMemo(() => {
    return VERIFIED_OPPORTUNITIES.filter((opp) => {
      const term = searchTerm.toLowerCase().trim();
      const matchSearch =
        !term ||
        opp.title.toLowerCase().includes(term) ||
        opp.organization.toLowerCase().includes(term) ||
        opp.crops.some((c) => c.toLowerCase().includes(term)) ||
        opp.districts.some((d) => d.toLowerCase().includes(term)) ||
        opp.summary.toLowerCase().includes(term);
      return matchSearch;
    });
  }, [searchTerm]);

  return (
    <div className="space-y-6">
      {/* Tab Switcher & Search Bar */}
      <DashboardCard
        title="Cooperative & Business Directory"
        subtitle="Discover verified agricultural cooperatives and approved sourcing opportunities in Rwanda"
      >
        <div className="space-y-4">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            {/* Sub-tabs */}
            <div className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 p-1">
              <button
                onClick={() => setActiveSubTab("cooperatives")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  activeSubTab === "cooperatives"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Users className="h-3.5 w-3.5 text-primary" />
                Verified Cooperatives ({VERIFIED_COOPERATIVES.length})
              </button>
              <button
                onClick={() => setActiveSubTab("opportunities")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  activeSubTab === "opportunities"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Briefcase className="h-3.5 w-3.5 text-primary" />
                Approved Opportunities ({VERIFIED_OPPORTUNITIES.length})
              </button>
            </div>

            {/* Verification notice badge */}
            <Badge variant="outline" className="flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              Verified & Moderated Records
            </Badge>
          </div>

          {/* Search box */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder={
                activeSubTab === "cooperatives"
                  ? "Search cooperatives by name, district, crop (e.g. Rice, Maize, Musanze)..."
                  : "Search opportunities by program, crop, organization..."
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-10 pl-9 text-xs"
            />
          </div>
        </div>
      </DashboardCard>

      {/* Content Section: Cooperatives */}
      {activeSubTab === "cooperatives" && (
        <div className="space-y-4">
          {filteredCooperatives.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-12 text-center">
              <Users className="mx-auto h-8 w-8 text-muted-foreground/60" aria-hidden />
              <h3 className="mt-2 text-sm font-semibold text-foreground">No cooperatives found</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                No verified cooperatives match “{searchTerm}”. All listed cooperatives are verified through the Rwanda Cooperative Agency (RCA).
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSearchTerm("")}
                className="mt-4 h-8 text-xs"
              >
                Clear Search
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredCooperatives.map((coop) => (
                <article
                  key={coop.id}
                  className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary font-semibold">
                          {coop.province} Province
                        </Badge>
                        <span className="text-[11px] text-muted-foreground">{coop.registrationNumber}</span>
                      </div>
                      <h3 className="mt-1 font-serif text-base font-bold text-foreground">
                        {coop.name}
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                        <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span>{coop.district} District</span>
                        <span>·</span>
                        <span>{coop.membersCount.toLocaleString()} active members</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {coop.description}
                  </p>

                  <div className="space-y-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Value Chains & Crops:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {coop.primaryCrops.map((c) => (
                        <span
                          key={c}
                          className="inline-flex items-center gap-1 rounded bg-muted/60 px-2 py-0.5 text-[10px] font-medium text-foreground"
                        >
                          <Sprout className="h-2.5 w-2.5 text-primary" />
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Registered Cooperative Activities:
                    </span>
                    <ul className="grid grid-cols-2 gap-1 text-[11px] text-muted-foreground">
                      {coop.activities.map((act) => (
                        <li key={act} className="flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
                          <span className="truncate">{act}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-3 border-t border-border flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <PhoneCall className="h-3.5 w-3.5 text-primary" />
                      <span>{coop.contactChannel}</span>
                    </div>
                    <Badge variant="outline" className="text-[10px] text-emerald-700 bg-emerald-50">
                      RCA Verified
                    </Badge>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Content Section: Opportunities */}
      {activeSubTab === "opportunities" && (
        <div className="space-y-4">
          {filteredOpportunities.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-12 text-center">
              <Briefcase className="mx-auto h-8 w-8 text-muted-foreground/60" aria-hidden />
              <h3 className="mt-2 text-sm font-semibold text-foreground">No approved opportunities found</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                No verified agricultural programs or sourcing notices match “{searchTerm}”.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSearchTerm("")}
                className="mt-4 h-8 text-xs"
              >
                Clear Search
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {filteredOpportunities.map((opp) => (
                <article
                  key={opp.id}
                  className="flex flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-sm space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="outline" className="text-[10px] uppercase font-semibold text-primary">
                        {opp.typeLabel}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px] text-emerald-700 bg-emerald-50">
                        {opp.verificationStatus}
                      </Badge>
                    </div>

                    <h3 className="font-serif text-base font-bold text-foreground">
                      {opp.title}
                    </h3>

                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                      {opp.summary}
                    </p>

                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span>{opp.organization}</span>
                    </div>

                    <div className="flex flex-wrap gap-1 pt-1">
                      {opp.crops.map((c) => (
                        <span
                          key={c}
                          className="rounded bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-foreground"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border flex items-center justify-between text-xs">
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {opp.deadline.split(" ")[0]}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setActiveOpportunity(opp)}
                      className="h-7 text-xs font-medium text-primary hover:text-primary hover:bg-primary/10"
                    >
                      View Details & Instructions →
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Opportunity Detail Modal */}
      <Dialog
        open={Boolean(activeOpportunity)}
        onOpenChange={(open) => !open && setActiveOpportunity(null)}
      >
        {activeOpportunity && (
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] uppercase font-semibold text-primary">
                  {activeOpportunity.typeLabel}
                </Badge>
                <Badge variant="secondary" className="text-[10px] text-emerald-700 bg-emerald-50">
                  {activeOpportunity.verificationStatus}
                </Badge>
              </div>
              <DialogTitle className="font-serif text-base font-bold text-foreground sm:text-lg">
                {activeOpportunity.title}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Managed by {activeOpportunity.organization}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              <div className="rounded-lg bg-muted/40 p-3 leading-relaxed text-foreground font-medium">
                {activeOpportunity.summary}
              </div>

              <div className="space-y-1">
                <span className="font-semibold uppercase tracking-wider text-muted-foreground text-[10px]">
                  Eligibility Requirements:
                </span>
                <p className="leading-relaxed text-foreground">{activeOpportunity.eligibility}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
                <div>
                  <span className="font-semibold text-[10px] uppercase tracking-wider text-muted-foreground block">
                    Target Crops
                  </span>
                  <span className="text-foreground">{activeOpportunity.crops.join(", ")}</span>
                </div>
                <div>
                  <span className="font-semibold text-[10px] uppercase tracking-wider text-muted-foreground block">
                    Districts
                  </span>
                  <span className="text-foreground">{activeOpportunity.districts.join(", ")}</span>
                </div>
              </div>

              <div className="rounded-lg border border-border p-3 space-y-1.5">
                <span className="font-semibold text-[10px] uppercase tracking-wider text-primary block">
                  Application & Contact Instructions:
                </span>
                <p className="text-foreground leading-relaxed font-sans">{activeOpportunity.contactInstructions}</p>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
