import { PageHeader } from "@/components/common/PageHeader";
import { FutureWorkspaceNotice, PlannedPageCard } from "@/components/panels/FutureWorkspaceNotice";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { BarChart3, BookOpen, History, MapPin, ShieldCheck, Sprout, TrendingUp, Users } from "lucide-react";

const PAGES = [
  { icon: Sprout, title: "Choose your crop", description: "Focus on the crops you grow, buy or follow." },
  { icon: MapPin, title: "Choose your area", description: "Find information for your district or region." },
  { icon: TrendingUp, title: "What the data says", description: "Read published production and harvested-area trends." },
  { icon: BarChart3, title: "Compare seasons", description: "Compare the same crop and area across reporting seasons." },
  { icon: BookOpen, title: "Useful guidance", description: "Read approved guidance with its source clearly shown." },
  { icon: History, title: "Saved interests", description: "Keep the crops and areas you follow close at hand." },
];

export default function CommunityBusinessPanel() {
  return <div className="space-y-5">
    <PageHeader eyebrow="Panel 4 · Community & business" title="Grow with better information"
      description="A shared workspace for farmers, cooperatives, buyers and agricultural businesses." />
    <div className="overflow-hidden rounded-2xl bg-primary p-6 text-primary-foreground sm:p-8">
      <div className="flex items-start justify-between gap-5">
        <div className="max-w-xl"><span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary-foreground/70">Your community workspace</span>
          <h2 className="mt-3 text-xl font-semibold tracking-tight sm:text-2xl">From agricultural data to everyday decisions.</h2>
          <p className="mt-3 text-[12.5px] leading-relaxed text-primary-foreground/80">Follow local trends, understand the reporting period and see where reliable information can support your next decision.</p>
          <span className="mt-5 inline-flex rounded-full border border-white/25 px-3 py-1 text-[10px] font-medium">In planning · features not yet available</span>
        </div>
        <span className="hidden h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/10 sm:flex"><Sprout className="h-8 w-8" aria-hidden /></span>
      </div>
    </div>
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_290px]">
      <DashboardCard title="Your future toolkit" subtitle="Six planned ways to find and understand agricultural information">
        <section aria-label="Planned pages" className="grid gap-3 sm:grid-cols-2">
          {PAGES.map((page) => <PlannedPageCard key={page.title} {...page} />)}
        </section>
      </DashboardCard>
      <div className="space-y-5">
        <DashboardCard title="Built around your role" subtitle="One place for the agricultural community">
          <ul className="space-y-4">{[
            ["Farmers", "Understand trends for the crops and areas you follow."],
            ["Cooperatives", "Build a shared view of agricultural reporting."],
            ["Buyers & businesses", "Use documented evidence to inform planning."],
          ].map(([title, description]) => <li key={title} className="flex gap-3"><Users className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden /><div><p className="text-[12px] font-medium">{title}</p><p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{description}</p></div></li>)}</ul>
        </DashboardCard>
        <DashboardCard title="Information you can assess" subtitle="Clear sources and honest limits">
          <ShieldCheck className="h-6 w-6 text-primary" aria-hidden />
          <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">Every published figure should include its source, unit, reporting period and coverage. Prices, availability and harvest forecasts will require reliable supporting sources.</p>
        </DashboardCard>
      </div>
    </div>
    <FutureWorkspaceNotice description="These tools are planned. Access, reliable data sources and privacy safeguards must be in place before they are enabled. Your local account can view this workspace; the tools above are not active yet." />
  </div>;
}
