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
  APPROVED_GUIDANCE,
  GUIDANCE_CATEGORIES,
} from "@/lib/community-data";
import {
  BookOpen,
  Search,
  ExternalLink,
  Calendar,
  Building,
  CheckCircle2,
  Filter,
  Sprout,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";

const GUIDANCE_ART = {
  crop_management: { label: "Rows of growing crops", src: "/images/guidance/crop-management.jpg" },
  seasonal_prep: { label: "Open farmland in the growing season", src: "/images/guidance/seasonal-planning.jpg" },
  soil_water: { label: "Watering cultivated crop rows", src: "/images/guidance/soil-water.jpg" },
  post_harvest: { label: "Harvest grain drying in the sun", src: "/images/guidance/post-harvest.jpg" },
  cooperative_practice: { label: "Farmers gathered in a field", src: "/images/guidance/cooperative.jpg" },
};

function GuidanceIllustration({ category }) {
  const art = GUIDANCE_ART[category] || GUIDANCE_ART.crop_management;
  return (
    <img src={art.src} alt={art.label} className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" loading="lazy" />
  );
}

export function GuidanceTab({ selectedCrop, onSelectCrop }) {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [activeItem, setActiveItem] = useState(null);

  const filteredGuidance = useMemo(() => {
    return APPROVED_GUIDANCE.filter((item) => {
      const matchCat =
        selectedCategory === "all" || item.category === selectedCategory;
      const term = searchTerm.toLowerCase().trim();
      const matchSearch =
        !term ||
        item.title.toLowerCase().includes(term) ||
        item.summary.toLowerCase().includes(term) ||
        item.content.toLowerCase().includes(term) ||
        item.crops.some((c) => c.toLowerCase().includes(term));
      return matchCat && matchSearch;
    });
  }, [searchTerm, selectedCategory]);

  return (
    <div className="space-y-6">
      {/* Header and Search Card */}
      <DashboardCard
        title="Useful Agricultural Guidance"
        subtitle="Approved agronomic recommendations, soil management, and post-harvest protocols from RAB and MINAGRI"
      >
        <div className="space-y-4">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder={t("Search guidance by crop (e.g. Maize, Potatoes), practice (e.g. storage, spacing, fertilizer)...")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-10 pl-9 text-xs"
            />
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {GUIDANCE_CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setSelectedCategory(cat.key)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  selectedCategory === cat.key
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </DashboardCard>

      {/* Guidance Cards Grid */}
      {filteredGuidance.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <BookOpen className="mx-auto h-8 w-8 text-muted-foreground/60" aria-hidden />
          <h3 className="mt-2 text-sm font-semibold text-foreground">{t("No guidance articles match your search")}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Try adjusting your search keywords or switching categories.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchTerm("");
              setSelectedCategory("all");
            }}
            className="mt-4 h-8 text-xs"
          >
            Reset Filters
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredGuidance.map((item) => (
            <article
              key={item.id}
              className="group flex flex-col justify-between overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="relative flex min-h-[132px] items-start justify-between overflow-hidden bg-emerald-950 px-4 py-3 sm:min-h-[144px] sm:px-5">
                <GuidanceIllustration category={item.category} />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/65 via-black/20 to-transparent" />
                <div className="relative z-10 flex min-w-0 flex-1 items-start justify-between gap-2">
                <div className="flex items-start justify-between gap-2">
                  <Badge variant="outline" className="border-white/70 bg-white/90 text-[10px] font-semibold uppercase text-emerald-900 shadow-sm">
                    {item.categoryLabel}
                  </Badge>
                  <span className="flex shrink-0 items-center gap-1 rounded-full bg-black/35 px-2 py-1 text-[10px] text-white shadow-sm backdrop-blur-sm">
                    <Calendar className="h-3 w-3" />
                    {item.publishedDate}
                  </span>
                </div>
                </div>
              </div>

              <div className="flex flex-1 flex-col justify-between p-4 sm:p-5">
                <div className="space-y-2.5">
                <h3 className="font-serif text-sm font-bold text-foreground leading-snug">
                  {item.title}
                </h3>

                <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                  {item.summary}
                </p>

                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {item.crops.map((c) => (
                    <span
                      key={c}
                      className="inline-flex items-center gap-1 rounded bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-foreground"
                    >
                      <Sprout className="h-2.5 w-2.5 text-primary" />
                      {c}
                    </span>
                  ))}
                </div>
              </div>
                </div>

              <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-3">
                <span className="truncate text-[10.5px] text-muted-foreground">
                  {item.source.split("/")[0]}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setActiveItem(item)}
                  className="h-7 text-xs font-medium text-primary hover:text-primary hover:bg-primary/10"
                >
                  Read Guidance →
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Guidance Detail Dialog */}
      <Dialog open={Boolean(activeItem)} onOpenChange={(open) => !open && setActiveItem(null)}>
        {activeItem && (
          <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] uppercase font-semibold text-primary">
                  {activeItem.categoryLabel}
                </Badge>
                <Badge variant="secondary" className="text-[10px] flex items-center gap-1 text-emerald-700 bg-emerald-50">
                  <ShieldCheck className="h-3 w-3" />
                  {activeItem.verificationStatus}
                </Badge>
              </div>
              <DialogTitle className="font-serif text-base font-bold text-foreground sm:text-lg">
                {activeItem.title}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Published {activeItem.publishedDate} · {activeItem.source}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="rounded-lg bg-muted/40 p-3 text-xs text-foreground font-medium leading-relaxed">
                {activeItem.summary}
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Actionable Guidance Steps
                </h4>
                <div className="whitespace-pre-line text-xs text-foreground leading-relaxed font-sans">
                  {activeItem.content}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border text-xs text-muted-foreground">
                <div>
                  <span className="font-medium text-foreground block">{t("Applicable Crops")}</span>
                  <span>{activeItem.crops.join(", ")}</span>
                </div>
                <div>
                  <span className="font-medium text-foreground block">{t("Geographic Scope")}</span>
                  <span>{activeItem.districts.join(", ")}</span>
                </div>
              </div>

              <div className="rounded-lg border border-border p-3 flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-foreground block">{t("Official Source")}</span>
                  <span className="text-muted-foreground">{activeItem.source}</span>
                </div>
                {activeItem.sourceUrl && (
                  <a
                    href={activeItem.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
                  >
                    Portal <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
