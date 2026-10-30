import { useState, useMemo } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useObservations } from "@/hooks/useObservations";
import { useOverviewData } from "@/hooks/useOverviewData";
import { useCommunityInterests } from "@/hooks/useCommunityInterests";
import { CommunityHeader } from "@/components/community/CommunityHeader";
import { MyAgricultureTab } from "@/components/community/MyAgricultureTab";
import { AgriInfoTab } from "@/components/community/AgriInfoTab";
import { CompareSeasonsTab } from "@/components/community/CompareSeasonsTab";
import { GuidanceTab } from "@/components/community/GuidanceTab";
import { DirectoryTab } from "@/components/community/DirectoryTab";
import { SavedInterestsTab } from "@/components/community/SavedInterestsTab";
import {
  Sprout,
  TrendingUp,
  BarChart2,
  BookOpen,
  Users,
  Bookmark,
} from "lucide-react";

export default function CommunityBusinessPanel() {
  const [activeTab, setActiveTab] = useState("home");
  const [selectedCrop, setSelectedCrop] = useState("Maize");
  const [selectedDistrict, setSelectedDistrict] = useState("all");

  // Query real NISR observations for chosen crop and district
  const { data: rawObservations = [], isLoading: isLoadingObservations } =
    useObservations({
      domain: "crop",
      crop: selectedCrop,
      district: selectedDistrict !== "all" ? selectedDistrict : undefined,
      view: "metrics",
    });

  // Calculate high-level summary overview cards and trends using the shared metric engine
  const overviewFilters = useMemo(
    () => ({
      crop: selectedCrop,
      district: selectedDistrict,
      season: "all",
      indicator: "production",
    }),
    [selectedCrop, selectedDistrict]
  );

  const overviewData = useOverviewData(overviewFilters);

  // Authenticated user saved interests
  const {
    savedInterests,
    savedCrops,
    savedDistricts,
    saveInterest,
    removeInterest,
    isSaved,
    isSaving,
    isRemoving,
  } = useCommunityInterests();

  const isCropSaved = isSaved("crop", selectedCrop);
  const isDistrictSaved =
    selectedDistrict !== "all" ? isSaved("district", selectedDistrict) : false;

  const handleToggleSaveCrop = async () => {
    if (isCropSaved) {
      const match = savedCrops.find(
        (c) => c.value.toLowerCase() === selectedCrop.toLowerCase()
      );
      if (match) await removeInterest(match.id);
    } else {
      await saveInterest("crop", selectedCrop);
    }
  };

  const handleToggleSaveDistrict = async () => {
    if (selectedDistrict === "all") return;
    if (isDistrictSaved) {
      const match = savedDistricts.find(
        (d) => d.value.toLowerCase() === selectedDistrict.toLowerCase()
      );
      if (match) await removeInterest(match.id);
    } else {
      await saveInterest("district", selectedDistrict);
    }
  };

  return (
    <div className="space-y-6">
      <CommunityHeader />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 h-auto p-1 bg-muted/70 gap-1 rounded-xl">
          <TabsTrigger
            value="home"
            className="flex items-center gap-1.5 py-2 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-lg"
          >
            <Sprout className="h-3.5 w-3.5" aria-hidden />
            <span>My Agriculture</span>
          </TabsTrigger>

          <TabsTrigger
            value="explorer"
            className="flex items-center gap-1.5 py-2 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-lg"
          >
            <TrendingUp className="h-3.5 w-3.5" aria-hidden />
            <span>What the Data Says</span>
          </TabsTrigger>

          <TabsTrigger
            value="compare"
            className="flex items-center gap-1.5 py-2 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-lg"
          >
            <BarChart2 className="h-3.5 w-3.5" aria-hidden />
            <span>Compare Seasons</span>
          </TabsTrigger>

          <TabsTrigger
            value="guidance"
            className="flex items-center gap-1.5 py-2 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-lg"
          >
            <BookOpen className="h-3.5 w-3.5" aria-hidden />
            <span>Useful Guidance</span>
          </TabsTrigger>

          <TabsTrigger
            value="directory"
            className="flex items-center gap-1.5 py-2 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-lg"
          >
            <Users className="h-3.5 w-3.5" aria-hidden />
            <span>Directory & Services</span>
          </TabsTrigger>

          <TabsTrigger
            value="saved"
            className="flex items-center gap-1.5 py-2 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-lg"
          >
            <Bookmark className="h-3.5 w-3.5" aria-hidden />
            <span>Saved Interests ({savedInterests.length})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="home" className="focus-visible:outline-none">
          <MyAgricultureTab
            selectedCrop={selectedCrop}
            selectedDistrict={selectedDistrict}
            onSelectCrop={setSelectedCrop}
            onSelectDistrict={setSelectedDistrict}
            onNavigateTab={setActiveTab}
            overviewData={overviewData}
            isLoadingObservations={isLoadingObservations}
            savedCrops={savedCrops}
            savedDistricts={savedDistricts}
          />
        </TabsContent>

        <TabsContent value="explorer" className="focus-visible:outline-none">
          <AgriInfoTab
            selectedCrop={selectedCrop}
            selectedDistrict={selectedDistrict}
            onSelectCrop={setSelectedCrop}
            onSelectDistrict={setSelectedDistrict}
            overviewData={overviewData}
            isLoadingObservations={isLoadingObservations}
            isCropSaved={isCropSaved}
            isDistrictSaved={isDistrictSaved}
            onToggleSaveCrop={handleToggleSaveCrop}
            onToggleSaveDistrict={handleToggleSaveDistrict}
            observationsData={rawObservations}
          />
        </TabsContent>

        <TabsContent value="compare" className="focus-visible:outline-none">
          <CompareSeasonsTab
            selectedCrop={selectedCrop}
            selectedDistrict={selectedDistrict}
            observationsData={rawObservations}
          />
        </TabsContent>

        <TabsContent value="guidance" className="focus-visible:outline-none">
          <GuidanceTab
            selectedCrop={selectedCrop}
            onSelectCrop={setSelectedCrop}
          />
        </TabsContent>

        <TabsContent value="directory" className="focus-visible:outline-none">
          <DirectoryTab
            selectedCrop={selectedCrop}
            selectedDistrict={selectedDistrict}
          />
        </TabsContent>

        <TabsContent value="saved" className="focus-visible:outline-none">
          <SavedInterestsTab
            savedInterests={savedInterests}
            savedCrops={savedCrops}
            savedDistricts={savedDistricts}
            onRemoveInterest={removeInterest}
            onSaveInterest={saveInterest}
            onSelectCrop={setSelectedCrop}
            onSelectDistrict={setSelectedDistrict}
            onNavigateTab={setActiveTab}
            isRemoving={isRemoving}
            isSaving={isSaving}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
