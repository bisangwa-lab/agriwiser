import { useAuth } from "@/lib/AuthContext";
import { normalizeRole, roleLabel } from "@/lib/rbac";
import { Badge } from "@/components/ui/badge";
import { Sprout, Users, Building2, ShoppingBag, ShieldCheck, BookOpen } from "lucide-react";
import { CROPS, DISTRICTS } from "@/lib/constants";
import { APPROVED_GUIDANCE, VERIFIED_COOPERATIVES } from "@/lib/community-data";
import { useLanguage } from "@/lib/LanguageContext";

export function CommunityHeader() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const role = normalizeRole(user);

  let title = t("myAgriculturalCommunity");
  let roleIcon = Sprout;

  if (role === "farmer") {
    title = t("myFarmCommunity");
    roleIcon = Sprout;
  } else if (role === "cooperative") {
    title = t("cooperativeIntelligence");
    roleIcon = Users;
  } else if (role === "buyer") {
    title = t("sourcingIntelligence");
    roleIcon = ShoppingBag;
  } else if (role === "agribusiness") {
    title = t("agribusinessIntelligence");
    roleIcon = Building2;
  } else if (role === "super_admin") {
    title = t("communityAdministration");
    roleIcon = ShieldCheck;
  }

  const RoleIcon = roleIcon;

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t("panelFour")}
            </span>
            <Badge variant="outline" className="flex items-center gap-1 text-[11px] font-medium">
              <RoleIcon className="h-3 w-3 text-primary" aria-hidden />
              {roleLabel(user)}
            </Badge>
          </div>
          <h1 className="mt-1 font-serif text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("communityIntro")}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5 rounded-md bg-muted/60 px-2.5 py-1 font-medium text-foreground">
          <Sprout className="h-3.5 w-3.5 text-primary" aria-hidden />
          {CROPS.length} {t("publishedCrops")}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-md bg-muted/60 px-2.5 py-1 font-medium text-foreground">
          <Building2 className="h-3.5 w-3.5 text-primary" aria-hidden />
          {DISTRICTS.length} {t("rwandaDistricts")}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-md bg-muted/60 px-2.5 py-1 font-medium text-foreground">
          <BookOpen className="h-3.5 w-3.5 text-primary" aria-hidden />
          {APPROVED_GUIDANCE.length} {t("approvedGuidance")}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-md bg-muted/60 px-2.5 py-1 font-medium text-foreground">
          <Users className="h-3.5 w-3.5 text-primary" aria-hidden />
          {VERIFIED_COOPERATIVES.length} {t("verifiedCooperatives")}
        </span>
      </div>
    </div>
  );
}
