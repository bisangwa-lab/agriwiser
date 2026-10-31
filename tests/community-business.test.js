import test from "node:test";
import assert from "node:assert/strict";
import {
  APPROVED_GUIDANCE,
  GUIDANCE_CATEGORIES,
  VERIFIED_COOPERATIVES,
  VERIFIED_OPPORTUNITIES,
} from "../src/lib/community-data.js";
import {
  addUserSavedInterest,
  fetchUserSavedInterests,
  deleteUserSavedInterest,
  clearMemoryInterestsForTesting,
} from "../src/lib/community-interests.server.js";
import {
  canOpenPanel,
  normalizeRole,
  panelForRole,
  ROLES,
} from "../src/lib/rbac.js";
import { CROPS, DISTRICT_NAMES } from "../src/lib/constants.js";

test("Community & Business — Approved Guidance Catalog", () => {
  assert.ok(APPROVED_GUIDANCE.length >= 8, "Expected at least 8 approved guidance articles");

  for (const item of APPROVED_GUIDANCE) {
    assert.ok(item.id, "Guidance must have a unique id");
    assert.ok(item.title && item.title.length > 5, "Guidance must have a descriptive title");
    assert.ok(item.category, "Guidance must specify a category");
    assert.ok(
      GUIDANCE_CATEGORIES.some((c) => c.key === item.category),
      `Unknown category '${item.category}' in guidance ${item.id}`
    );
    assert.ok(item.summary && item.summary.length > 20, "Guidance must have an understandable summary");
    assert.ok(item.content && item.content.length > 50, "Guidance must contain detailed actionable steps");
    assert.ok(item.source, "Guidance must have a verified institutional source");
    assert.ok(item.publishedDate, "Guidance must have a publication date");
    assert.equal(item.verificationStatus, "Verified Public Guidance");
    assert.ok(Array.isArray(item.crops) && item.crops.length > 0, "Guidance must specify applicable crops");
  }

  // Category filtering
  const postHarvest = APPROVED_GUIDANCE.filter((g) => g.category === "post_harvest");
  assert.ok(postHarvest.length >= 1, "Must have post-harvest guidance");
  assert.ok(postHarvest.some((g) => g.title.toLowerCase().includes("aflatoxin")));
});

test("Community & Business — Verified Cooperatives and Opportunities", () => {
  assert.ok(VERIFIED_COOPERATIVES.length >= 6, "Expected at least 6 verified cooperatives");

  for (const coop of VERIFIED_COOPERATIVES) {
    assert.ok(coop.id, "Cooperative must have an id");
    assert.ok(coop.name, "Cooperative must have a name");
    assert.ok(DISTRICT_NAMES.includes(coop.district), `District '${coop.district}' must be a valid Rwanda district`);
    assert.ok(coop.primaryCrops.length > 0, "Cooperative must have primary crops");
    assert.ok(coop.activities.length > 0, "Cooperative must list registered activities");
    assert.ok(coop.registrationNumber.startsWith("RCA/"), "Cooperative must have official RCA registration number");
    assert.ok(coop.membersCount > 0, "Cooperative must have registered members");
  }

  assert.ok(VERIFIED_OPPORTUNITIES.length >= 5, "Expected at least 5 verified agricultural opportunities");
  for (const opp of VERIFIED_OPPORTUNITIES) {
    assert.ok(opp.id, "Opportunity must have an id");
    assert.ok(opp.title, "Opportunity must have a title");
    assert.ok(opp.type, "Opportunity must have a type");
    assert.ok(opp.organization, "Opportunity must specify an organization");
    assert.ok(opp.eligibility, "Opportunity must specify eligibility requirements");
    assert.ok(opp.contactInstructions, "Opportunity must specify contact/application instructions");
    assert.ok(opp.verificationStatus.includes("Verified"), "Opportunity must be marked verified");
  }
});

test("Community & Business — User Saved Interests Persistence and Isolation", async () => {
  clearMemoryInterestsForTesting();

  const farmerUser = { id: "user-farmer-001", workspace_role: "farmer" };
  const buyerUser = { id: "user-buyer-002", workspace_role: "buyer" };

  // 1. Validation checks
  await assert.rejects(
    () => addUserSavedInterest(farmerUser, { type: "crop", value: "InventedCrop" }),
    /not in the recognized agricultural crop catalog/
  );

  await assert.rejects(
    () => addUserSavedInterest(farmerUser, { type: "district", value: "NonExistentDistrict" }),
    /not recognized among Rwanda's 30 official districts/
  );

  await assert.rejects(
    () => addUserSavedInterest(null, { type: "crop", value: "Maize" }),
    /Authentication required/
  );

  // 2. Add valid interests for Farmer
  const savedMaize = await addUserSavedInterest(farmerUser, {
    type: "crop",
    value: "Maize",
    notes: "Main season crop",
  });
  assert.equal(savedMaize.value, "Maize");
  assert.equal(savedMaize.userId, farmerUser.id);

  const savedMusanze = await addUserSavedInterest(farmerUser, {
    type: "district",
    value: "Musanze",
    notes: "Family farm plot",
  });
  assert.equal(savedMusanze.value, "Musanze");

  // 3. Add interest for Buyer
  await addUserSavedInterest(buyerUser, {
    type: "crop",
    value: "Irish Potato",
    notes: "Commercial sourcing",
  });

  // 4. Verify User Isolation: Farmer sees only Farmer's interests
  const farmerInterests = await fetchUserSavedInterests(farmerUser);
  assert.equal(farmerInterests.length, 2);
  assert.ok(farmerInterests.some((i) => i.value === "Maize"));
  assert.ok(farmerInterests.some((i) => i.value === "Musanze"));
  assert.ok(!farmerInterests.some((i) => i.value === "Irish Potato"));

  // Buyer sees only Buyer's interests
  const buyerInterests = await fetchUserSavedInterests(buyerUser);
  assert.equal(buyerInterests.length, 1);
  assert.equal(buyerInterests[0].value, "Irish Potato");

  // 5. Cross-user deletion isolation: Farmer cannot delete Buyer's interest
  const buyerPotatoId = buyerInterests[0].id;
  await deleteUserSavedInterest(farmerUser, buyerPotatoId);

  // Buyer's interest must remain intact
  const buyerCheck = await fetchUserSavedInterests(buyerUser);
  assert.equal(buyerCheck.length, 1, "Buyer interest must not be deleted by Farmer");

  // Farmer deletes own interest
  await deleteUserSavedInterest(farmerUser, savedMaize.id);
  const farmerAfterDelete = await fetchUserSavedInterests(farmerUser);
  assert.equal(farmerAfterDelete.length, 1);
  assert.equal(farmerAfterDelete[0].value, "Musanze");
});

test("Community & Business — Role-Based Access Control and Panel Mapping", () => {
  const communityRoles = ["farmer", "cooperative", "buyer", "agribusiness"];

  for (const roleKey of communityRoles) {
    const user = { workspace_role: roleKey };
    assert.equal(normalizeRole(user), roleKey);
    assert.equal(panelForRole(roleKey), "/community-business");
    assert.ok(canOpenPanel(user, "community_business"), `Role ${roleKey} should be able to open its assigned workspace`);
    for (const panel of ["admin", "analytics", "field_operations", "public_insights"]) assert.ok(!canOpenPanel(user, panel));
  }

  // Super Admin can open any panel including community_business
  const superAdmin = { workspace_role: "super_admin" };
  for (const panel of ["admin", "analytics", "field_operations", "community_business", "public_insights"]) assert.ok(canOpenPanel(superAdmin, panel));
});
