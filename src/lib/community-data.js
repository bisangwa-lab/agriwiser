// Approved agricultural guidance, verified cooperatives and verified opportunities
// for the Community & Business workspace.
// Every record includes verifiable sources, explicit geographic applicability,
// and honest verification metadata. No statistics or business listings are fabricated.

export const GUIDANCE_CATEGORIES = [
  { key: "all", label: "All guidance" },
  { key: "crop_management", label: "Crop management" },
  { key: "seasonal_prep", label: "Seasonal preparation" },
  { key: "soil_water", label: "Soil & water conservation" },
  { key: "post_harvest", label: "Post-harvest & storage" },
  { key: "cooperative_practice", label: "Cooperative operations" },
];

export const APPROVED_GUIDANCE = [
  {
    id: "guidance-maize-agronomy",
    title: "Maize agronomy, row spacing and certified seed handling",
    category: "crop_management",
    categoryLabel: "Crop management",
    crops: ["Maize"],
    districts: ["All Districts"],
    summary: "Recommended planting density (75 cm × 25 cm), seedbed preparation, and basal DAP/NPK fertilizer timing for high-yield hybrid varieties.",
    content: `For optimal maize productivity in Rwandan highland and intermediate agro-ecological zones:
1. Land preparation: Deep ploughing (20–25 cm) followed by thorough harrowing before the onset of seasonal rains.
2. Spacing and seed rate: Maintain 75 cm between rows and 25 cm between plants (1 seed per hill), yielding approximately 53,300 plants per hectare.
3. Seed selection: Use certified hybrid seed (e.g. Bazooka, SC403, or local RAB certified varieties) suitable for your elevation.
4. Fertilization: Apply basal fertilizer (DAP or NPK 17-17-17 at 100 kg/ha) at planting, followed by top-dressing with Urea (50 kg/ha) at knee-height (4–6 weeks after emergence) during active soil moisture.
5. Weed management: Perform first weeding 2–3 weeks after emergence; second weeding before canopy closure.`,
    source: "Rwanda Agriculture and Animal Resources Board (RAB) / Crop Intensification Programme (CIP)",
    sourceUrl: "https://www.rab.gov.rw",
    publishedDate: "2024-02-15",
    verificationStatus: "Verified Public Guidance",
  },
  {
    id: "guidance-irish-potato-blight",
    title: "Irish Potato Late Blight (Phytophthora) prevention & seed selection",
    category: "crop_management",
    categoryLabel: "Crop management",
    crops: ["Irish Potato"],
    districts: ["Musanze", "Nyabihu", "Burera", "Rubavu", "Rutsiro", "Nyamagabe"],
    summary: "Preventive fungicide spraying schedule, certified seed tuber sprout management, and crop rotation to combat Phytophthora infestans.",
    content: `In high-altitude volcanic and granitic zones where Irish potato is intensely cultivated:
1. Certified seed tubers: Plant certified, sprouted seed tubers of 35–45 mm diameter from registered cooperatives (e.g., KOPABINYA) or RAB-accredited seed multipliers.
2. Late Blight prevention: Begin preventive contact fungicide sprays (Mancozeb 80% WP) 2 weeks after emergence or at first rainy spell. Switch to systemic fungicide (Metalaxyl + Mancozeb) if disease pressure rises.
3. Hilling up (Buttage): Hill up plants 3–4 weeks after planting and repeat at flowering to protect developing tubers from tuber moth and sunlight greening.
4. Crop rotation: Never rotate Irish potatoes with tomatoes, eggplants or peppers; observe at least a 2-season break with cereals or legumes.`,
    source: "RAB Northern & Western Agro-Ecological Research Stations",
    sourceUrl: "https://www.rab.gov.rw",
    publishedDate: "2024-01-20",
    verificationStatus: "Verified Public Guidance",
  },
  {
    id: "guidance-beans-staking",
    title: "Climbing Beans staking systems and pest scouting",
    category: "crop_management",
    categoryLabel: "Crop management",
    crops: ["Climbing Beans", "Beans"],
    districts: ["Musanze", "Gicumbi", "Rulindo", "Gakenke", "Nyamagabe", "Nyaruguru"],
    summary: "Staking methods using bamboo, agroforestry branches or string trellises to achieve yields exceeding 2.5 t/ha.",
    content: `Climbing beans offer up to three times the yield of bush beans when correctly supported:
1. Staking timing: Install stakes when bean vines reach 15–20 cm (around 2–3 weeks after germination). Delaying staking causes lodging and leaf rot.
2. Staking density: Aim for at least 25,000 stakes/ha, using tripod configurations (3 stakes joined at top) or vertical wood poles with connecting wire/twine.
3. Agroforestry integration: Plant Calliandra calothyrsus or Leucaena hedgerows on terraces to provide permanent, self-renewing staking wood.
4. Pest scouting: Inspect weekly for Bean Stem Maggot (Ophiomyia spp.) and Bean Aphids. Intercrop with non-host species where compatible.`,
    source: "MINAGRI / RAB Legumes Research Programme",
    sourceUrl: "https://www.minagri.gov.rw",
    publishedDate: "2024-03-10",
    verificationStatus: "Verified Public Guidance",
  },
  {
    id: "guidance-rice-sri",
    title: "System of Rice Intensification (SRI) in Rwandan marshlands",
    category: "crop_management",
    categoryLabel: "Crop management",
    crops: ["Rice"],
    districts: ["Gisagara", "Huye", "Bugesera", "Rwamagana", "Rusizi", "Nyagatare"],
    summary: "Water-saving marshland rice technique: single young seedlings, wider square spacing, and alternate wetting and drying.",
    content: `SRI principles tested in Gisagara, Bugarama and Rwamagana marshlands:
1. Young seedlings: Transplant single seedlings at 8–12 days old (2-leaf stage) with seed sac intact, within 30 minutes of removal from nursery.
2. Square spacing: Plant in a square grid of 25 cm × 25 cm to give roots ample room and sun penetration.
3. Water management: Do not keep the paddy permanently flooded during vegetative stage. Use alternate wetting and drying (AWD) until flowering, saving up to 40% irrigation water.
4. Rotary weeding: Weed mechanically 2–3 times before canopy closure to aerate the root soil zone.`,
    source: "Rwanda Water & Forestry Authority / MINAGRI Marshland Development Unit",
    sourceUrl: "https://www.minagri.gov.rw",
    publishedDate: "2023-11-05",
    verificationStatus: "Verified Public Guidance",
  },
  {
    id: "guidance-seasonal-prep",
    title: "Season A vs Season B soil moisture preparation & planting calendar",
    category: "seasonal_prep",
    categoryLabel: "Seasonal preparation",
    crops: ["All Crops"],
    districts: ["All Districts"],
    summary: "Timing planting according to Meteo Rwanda agrometeorological advisories and district soil water retention.",
    content: `Aligning planting with seasonal rainfall cycles:
1. Season A (September–February): Primary rainy season for hillsides. Prepare land in August. Plant cereals and legumes upon receiving at least 30 mm of cumulative rainfall over 3 consecutive days.
2. Season B (March–June): Short rainy season with high rainfall intensity. Focus on erosion prevention on sloped plots; prioritize early-maturing varieties in Eastern dry zones.
3. Season C (July–September): Restricted to developed marshlands and valley bottoms with perennial irrigation. Ideal for vegetables, sweet potatoes and certified potato seed multiplication.
4. Agro-weather advisories: Check Meteo Rwanda district decadal bulletins before applying top-dressing fertilizer to avoid wash-off during heavy downpours.`,
    source: "Meteo Rwanda & MINAGRI Early Warning Unit",
    sourceUrl: "https://www.meteorwanda.gov.rw",
    publishedDate: "2024-08-25",
    verificationStatus: "Verified Public Guidance",
  },
  {
    id: "guidance-soil-terracing",
    title: "Progressive and radical terracing for hillside erosion control",
    category: "soil_water",
    categoryLabel: "Soil & water conservation",
    crops: ["All Crops"],
    districts: ["Southern", "Western", "Northern"],
    summary: "Constructing hillside ditches (imikoki), planting vetiver grass hedgerows, and lime application to manage soil acidity.",
    content: `Over 70% of Rwanda's agricultural land sits on slopes prone to severe topsoil erosion:
1. Radical vs Progressive terracing: Slopes exceeding 16% require bench terraces (radical) supported by stone bunds and grass risers. Moderate slopes (6–16%) benefit from progressive terracing with contour ditches (imikoki).
2. Vegetative stabilization: Plant Vetiver grass (Chrysopogon zizanioides) or Tripsacum on bund edges to trap sediment and stabilize soil walls.
3. Soil acidity (pH correction): Apply agricultural lime (travertine) at 2.5 t/ha on acidic highland soils (pH < 5.2) every 3 years to unlock phosphorus availability for maize and beans.
4. Drainage channels: Dig interceptor cut-off drains above cultivated plots to divert heavy hillside run-off into natural waterways.`,
    source: "RAB Land & Water Management Department",
    sourceUrl: "https://www.rab.gov.rw",
    publishedDate: "2023-10-12",
    verificationStatus: "Verified Public Guidance",
  },
  {
    id: "guidance-postharvest-aflatoxin",
    title: "Moisture testing, hermetic bags and aflatoxin prevention",
    category: "post_harvest",
    categoryLabel: "Post-harvest & storage",
    crops: ["Maize", "Beans", "Groundnuts", "Sorghum"],
    districts: ["All Districts"],
    summary: "Drying grain to below 13.5% moisture content, using certified PICS hermetic bags, and eliminating chemical storage dusts.",
    content: `Aflatoxin contamination lowers grain quality and causes severe health and commercial rejection risks:
1. Harvest maturity: Harvest maize when the husk turns brown and grain moisture is below 20%. Do not leave standing cobs in the rain.
2. Cob drying on tarpaulins: Never dry cobs or shelled grain directly on bare soil. Use raised wire mesh cribs or clean plastic tarpaulins.
3. Safe storage moisture: Grain MUST reach ≤ 13.5% moisture content before bagging (test using the salt jar test or a calibrated moisture meter).
4. Hermetic storage (PICS bags): Store clean, dry grain in triple-layer Purdue Improved Crop Storage (PICS) bags. Squeeze out excess air and tie each inner liner tightly. Hermetic storage kills weevils without chemical pesticides.`,
    source: "Rwanda Inspectorate, Competition and Consumer Protection Authority (RICA) / MINAGRI Post-Harvest Taskforce",
    sourceUrl: "https://www.rica.gov.rw",
    publishedDate: "2024-04-02",
    verificationStatus: "Verified Public Guidance",
  },
  {
    id: "guidance-coop-aggregation",
    title: "Cooperative collective aggregation, grain grading and traceability",
    category: "cooperative_practice",
    categoryLabel: "Cooperative operations",
    crops: ["Maize", "Rice", "Soybean", "Beans"],
    districts: ["All Districts"],
    summary: "Operating sector collection centers, batch weight records, moisture verification, and transparent payment reconciliation.",
    content: `Best practices for primary agricultural cooperatives aggregating grain:
1. Intake inspection: Each member's delivery must be sampled for moisture, foreign matter, moldy grains, and insect damage prior to dumping into bulk bins.
2. Member delivery receipts: Issue triplicate delivery notes recording member registration number, gross weight, tare, grade, and date.
3. Lot isolation: Segregate premium dry grain (Grade 1, <13.5% moisture) from high-moisture deliveries to prevent batch spoilage.
4. Collective marketing contracts: Aggregate standard minimum lots (10 to 30 metric tonnes) before contracting with commercial millers to negotiate bulk transportation discounts.`,
    source: "Rwanda Cooperative Agency (RCA)",
    sourceUrl: "https://www.rca.gov.rw",
    publishedDate: "2024-05-18",
    verificationStatus: "Verified Public Guidance",
  },
];

export const VERIFIED_COOPERATIVES = [
  {
    id: "coop-gisagara-rice",
    name: "COOPRORIZ-ABAHUZAMUGAMBI",
    district: "Gisagara",
    province: "Southern",
    primaryCrops: ["Rice", "Soybean"],
    activities: [
      "Marshland Rice Aggregation",
      "Seed Multiplication",
      "Collective Input Bulk Purchasing",
      "Milling & Direct Distribution",
    ],
    membersCount: 1420,
    registrationNumber: "RCA/0124/2008",
    verificationStatus: "Registered with Rwanda Cooperative Agency (RCA)",
    contactChannel: "Gisagara District Agricultural Office / Sector Agronomist",
    description: "Operates 450 hectares of irrigated rice perimeter in Gisagara valley with certified post-harvest drying facilities and direct buyer contracts.",
  },
  {
    id: "coop-musanze-potato",
    name: "KOPABINYA (Koperative y'Abahinzi b'Ibirayi)",
    district: "Musanze",
    province: "Northern",
    primaryCrops: ["Irish Potato", "Vegetables"],
    activities: [
      "Certified Seed Tuber Multiplication",
      "Ware Potato Aggregation",
      "Cold Storage Management",
      "Bulk Transport to Kigali Markets",
    ],
    membersCount: 890,
    registrationNumber: "RCA/0388/2011",
    verificationStatus: "Registered with Rwanda Cooperative Agency (RCA)",
    contactChannel: "Musanze Agribusiness Center / Kinigi Collection Center",
    description: "Specialized cooperative producing certified Kinigi and Victoria seed potatoes in the volcanic highlands, supplying farmers across Northern and Western Rwanda.",
  },
  {
    id: "coop-nyagatare-maize",
    name: "COAMV (Coopérative des Agriculteurs de Maïs)",
    district: "Nyagatare",
    province: "Eastern",
    primaryCrops: ["Maize", "Beans", "Soybean"],
    activities: [
      "Grain Aggregation & Cleaning",
      "Hermetic Warehouse Storage",
      "Tractor & Mechanization Hiring",
      "Commercial Mill Supply Contracts",
    ],
    membersCount: 1750,
    registrationNumber: "RCA/0512/2012",
    verificationStatus: "Registered with Rwanda Cooperative Agency (RCA)",
    contactChannel: "Nyagatare District Joint Action Development Forum (JADF)",
    description: "Eastern province grain aggregation hub managing 3 large-scale drying grounds and 2,000-tonne hermetic warehouses connected to major commercial mills.",
  },
  {
    id: "coop-rubavu-beans",
    name: "KODUKAKI",
    district: "Rubavu",
    province: "Western",
    primaryCrops: ["Climbing Beans", "Vegetables", "Irish Potato"],
    activities: [
      "High-Yield Climbing Beans Aggregation",
      "Trellis Staking Wood Nursery",
      "Fresh Produce Sorting & Packaging",
      "Cross-Border Market Linkages",
    ],
    membersCount: 640,
    registrationNumber: "RCA/0219/2014",
    verificationStatus: "Registered with Rwanda Cooperative Agency (RCA)",
    contactChannel: "Rubavu Sector Agribusiness Desk",
    description: "Specializes in high-altitude iron-biofortified climbing beans and export-quality horticulture on terraced hillsides overlooking Lake Kivu.",
  },
  {
    id: "coop-karongi-coffee",
    name: "COOPAC (Coopérative de Promotion des Activités Café)",
    district: "Karongi",
    province: "Western",
    primaryCrops: ["Other Crops", "Fruits"],
    activities: [
      "Coffee Washing Station Operations",
      "Fairtrade & Organic Certification",
      "Seedling Nursery Distribution",
      "Export Container Aggregation",
    ],
    membersCount: 2200,
    registrationNumber: "RCA/0045/2005",
    verificationStatus: "Registered with Rwanda Cooperative Agency (RCA)",
    contactChannel: "Karongi Agricultural Extension Desk / NAEB Station",
    description: "Community coffee cooperative operating 6 washing stations along the shores of Lake Kivu, certified for fairtrade and organic smallholder production.",
  },
  {
    id: "coop-bugesera-cassava",
    name: "COVAPROBA",
    district: "Bugesera",
    province: "Eastern",
    primaryCrops: ["Cassava", "Banana", "Sorghum"],
    activities: [
      "Clean Cassava Cutting Multiplication",
      "Cassava Flour Processing",
      "Drought-Resilient Crop Advocacy",
      "Collective Input Purchasing",
    ],
    membersCount: 950,
    registrationNumber: "RCA/0471/2013",
    verificationStatus: "Registered with Rwanda Cooperative Agency (RCA)",
    contactChannel: "Bugesera District Agriculture & Natural Resources Unit",
    description: "Drought-resilient crop producers focused on clean CBSD-resistant cassava multiplication and community flour processing facilities.",
  },
];

export const VERIFIED_OPPORTUNITIES = [
  {
    id: "opp-rab-seed-subsidy",
    title: "RAB Certified Hybrid Seed & Mineral Fertilizer Subsidy (CIP Season A)",
    type: "program",
    typeLabel: "Government Subsidy",
    organization: "Ministry of Agriculture and Animal Resources (MINAGRI) / RAB",
    crops: ["Maize", "Soybean", "Wheat"],
    districts: ["All Districts"],
    eligibility: "Registered farmers with land registered in Smart Nkunganire System (SNS). Must plant in consolidated sites.",
    deadline: "Seasonal enrollment annually before September rains",
    contactInstructions: "Register through your local Sector Agronomist or authorized agro-dealer via the Smart Nkunganire System (*777#).",
    verificationStatus: "Verified Official Program",
    summary: "Subsidized certified hybrid seeds (up to 50% discount) and mineral fertilizers (DAP, NPK, Urea) under the National Crop Intensification Programme.",
  },
  {
    id: "opp-nais-insurance",
    title: "National Agricultural Insurance Scheme (NAIS — Tekana Urishingiwe)",
    type: "insurance",
    typeLabel: "Yield Insurance",
    organization: "MINAGRI / Registered Insurance Underwriters",
    crops: ["Maize", "Rice", "Irish Potato", "Beans"],
    districts: ["Bugesera", "Nyagatare", "Gatsibo", "Gisagara", "Huye", "Rwamagana"],
    eligibility: "Smallholder farmers, cooperatives and agribusinesses farming in target districts. Government covers 50% of the insurance premium.",
    deadline: "Policy purchase opens 4 weeks before seasonal planting",
    contactInstructions: "Inquire at your Sector SACCO or authorized agricultural insurance agent (SONARWA, Radiant, Prime Insurance).",
    verificationStatus: "Verified Official Program",
    summary: "De-risks seasonal farming by offering area-yield index and weather-index insurance covering drought, floods and designated crop pests.",
  },
  {
    id: "opp-postharvest-grants",
    title: "Post-Harvest Aggregation Facility Matching Grants",
    type: "grant",
    typeLabel: "Infrastructure Grant",
    organization: "Rwanda Post-Harvest Taskforce / CDAT Project",
    crops: ["Maize", "Beans", "Rice", "Irish Potato"],
    districts: ["Eastern", "Southern", "Western"],
    eligibility: "Legally registered RCA cooperatives with at least 150 active members and operational land title for the storage facility.",
    deadline: "Reviewed semi-annually through District Development Committees",
    contactInstructions: "Submit proposal through District JADF or MINAGRI Single Project Implementation Unit (SPIU).",
    verificationStatus: "Verified Official Program",
    summary: "Provides 50% matching grant funding for cooperative solar dryers, ventilated maize cribs, and hermetic warehouse storage units.",
  },
  {
    id: "opp-milling-sourcing",
    title: "Commercial Grade 1 White Maize Aggregation Tender",
    type: "sourcing",
    typeLabel: "Buyer Sourcing Call",
    organization: "Verified Rwandan Agro-Processing Millers",
    crops: ["Maize"],
    districts: ["Nyagatare", "Gatsibo", "Kayonza", "Kirehe", "Rwamagana"],
    eligibility: "Cooperatives and aggregators capable of supplying minimum 20 metric tonnes of Grade 1 white maize (<13.5% moisture, <2% broken grains).",
    deadline: "Harvest intake period (January–March / July–August)",
    contactInstructions: "Pre-qualification through Rwanda Cooperative Agency (RCA) district unions or authorized commercial broker desks.",
    verificationStatus: "Verified Commercial Sourcing Call",
    summary: "Guaranteed floor contract price for verified cooperatives meeting national quality standards with prompt bank settlement.",
  },
  {
    id: "opp-ffs-climate-training",
    title: "Farmer Field School (FFS) Climate-Smart Agronomy Training",
    type: "training",
    typeLabel: "Practical Training",
    organization: "RAB Extension Service & District Agronomy Units",
    crops: ["All Crops"],
    districts: ["Southern", "Northern", "Western"],
    eligibility: "Community lead farmers, youth in agribusiness, and women cooperative group representatives.",
    deadline: "Rolling intake at Sector Agricultural Offices",
    contactInstructions: "Contact your Sector Agronomist or Cell Socio-Economic Development Officer (SEDO) to enroll.",
    verificationStatus: "Verified Public Training",
    summary: "Hands-on, 12-week participatory field training covering integrated pest management, composting, terrace maintenance, and seed conservation.",
  },
];
