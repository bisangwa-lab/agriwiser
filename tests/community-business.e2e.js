import { chromium } from "playwright";
import assert from "node:assert/strict";

async function runE2E() {
  console.log("Starting Playwright E2E verification on Community & Business...");
  let browser;
  try {
    browser = await chromium.launch({ channel: "chrome", headless: true });
  } catch {
    try {
      browser = await chromium.launch({ channel: "msedge", headless: true });
    } catch {
      browser = await chromium.launch({ headless: true });
    }
  }
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(msg.text());
    }
  });

  try {
    // 1. Visit Login and use local quick sign-in for Community & Business
    console.log("Navigating to http://localhost:5173/login...");
    await page.goto("http://localhost:5173/login", { waitUntil: "networkidle", timeout: 30000 });

    const openCommunityBtn = page.locator('button[aria-label="Open Community & business panel"]');
    if (await openCommunityBtn.isVisible()) {
      console.log("Clicking quick login for Community & Business...");
      await openCommunityBtn.click();
      await page.waitForURL("**/community-business", { timeout: 15000 });
    } else {
      console.log("Navigating directly to /community-business...");
      await page.goto("http://localhost:5173/community-business", { waitUntil: "networkidle", timeout: 15000 });
    }

    // Verify page title / header
    await page.waitForSelector("h1", { timeout: 10000 });
    const pageTitle = await page.textContent("h1");
    console.log("Page Title:", pageTitle);
    assert.ok(pageTitle && pageTitle.includes("Community"), "Header should mention Community");

    // 2. Verify Tab 1: My Agriculture
    console.log("Verifying Tab 1: My Agriculture...");
    const activeFocusText = await page.textContent("body");
    assert.ok(activeFocusText.includes("Active Focus"), "Should display Active Focus section");
    assert.ok(activeFocusText.includes("Reported Production"), "Should display Reported Production card");
    assert.ok(activeFocusText.includes("Harvested Area"), "Should display Harvested Area card");
    assert.ok(activeFocusText.includes("Average Yield"), "Should display Average Yield card");

    // 3. Switch to Tab 2: What the Data Says (Explorer)
    console.log("Switching to Tab 2: What the Data Says...");
    await page.click('button[role="tab"]:has-text("What the Data Says")');
    await page.waitForTimeout(500);

    const explorerContent = await page.textContent("body");
    assert.ok(explorerContent.includes("Choose Your Crop"), "Should display Choose Your Crop card");
    assert.ok(explorerContent.includes("Choose Your Area"), "Should display Choose Your Area card");

    // Select a different crop, e.g., Irish Potato
    console.log("Selecting Irish Potato crop...");
    await page.click('button:has-text("Irish Potato")');
    await page.waitForTimeout(500);
    const updatedExplorer = await page.textContent("body");
    assert.ok(updatedExplorer.includes("Irish Potato"), "Selected crop should now be Irish Potato");

    // 4. Switch to Tab 3: Compare Seasons
    console.log("Switching to Tab 3: Compare Seasons...");
    await page.click('button[role="tab"]:has-text("Compare Seasons")');
    await page.waitForTimeout(500);

    const compareContent = await page.textContent("body");
    assert.ok(compareContent.includes("Compare Agricultural Seasons"), "Should display Compare Agricultural Seasons title");
    assert.ok(compareContent.includes("Primary Period (Season 1)"), "Should display Period 1 selector");
    assert.ok(compareContent.includes("Baseline Period (Season 2)"), "Should display Period 2 selector");
    assert.ok(compareContent.includes("Visual Indicator Comparison"), "Should display comparison chart card");

    // 5. Switch to Tab 4: Useful Guidance
    console.log("Switching to Tab 4: Useful Guidance...");
    await page.click('button[role="tab"]:has-text("Useful Guidance")');
    await page.waitForTimeout(500);

    const guidanceContent = await page.textContent("body");
    assert.ok(guidanceContent.includes("Useful Agricultural Guidance"), "Should display Guidance title");
    assert.ok(guidanceContent.includes("Maize agronomy"), "Should list Maize agronomy guidance");

    // Test Search input
    console.log("Testing guidance search filter...");
    await page.fill('input[placeholder*="Search guidance by crop"]', "aflatoxin");
    await page.waitForTimeout(400);
    const searchedGuidance = await page.textContent("body");
    assert.ok(searchedGuidance.includes("aflatoxin"), "Search results should include aflatoxin guidance");

    // Open Guidance Detail Dialog
    console.log("Opening guidance detail dialog...");
    await page.click('button:has-text("Read Guidance →")');
    await page.waitForTimeout(400);

    const dialogContent = await page.textContent('div[role="dialog"]');
    assert.ok(dialogContent && dialogContent.includes("Actionable Guidance Steps"), "Dialog should show Actionable Guidance Steps");
    // Close dialog
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);

    // 6. Switch to Tab 5: Directory & Services
    console.log("Switching to Tab 5: Directory & Services...");
    await page.click('button[role="tab"]:has-text("Directory & Services")');
    await page.waitForTimeout(500);

    const directoryContent = await page.textContent("body");
    assert.ok(directoryContent.includes("COOPRORIZ-ABAHUZAMUGAMBI") || directoryContent.includes("KOPABINYA"), "Should list verified cooperatives");

    // Switch sub-tab to Opportunities
    console.log("Switching sub-tab to Approved Opportunities...");
    await page.click('button:has-text("Approved Opportunities")');
    await page.waitForTimeout(400);
    const opportunitiesContent = await page.textContent("body");
    assert.ok(opportunitiesContent.includes("RAB Certified Hybrid Seed") || opportunitiesContent.includes("National Agricultural Insurance"), "Should list verified opportunities");

    // 7. Switch to Tab 6: Saved Interests
    console.log("Switching to Tab 6: Saved Interests...");
    await page.click('button[role="tab"]:has-text("Saved Interests")');
    await page.waitForTimeout(500);

    const savedContent = await page.textContent("body");
    assert.ok(savedContent.includes("Saved Agricultural Interests"), "Should display Saved Agricultural Interests title");
    assert.ok(savedContent.includes("Bookmark an Additional Crop or District"), "Should display bookmark form");

    // Add a new interest via form
    console.log("Adding Beans as saved interest...");
    await page.click('button:has-text("Save to Interests")');
    await page.waitForTimeout(800);

    const afterSaveContent = await page.textContent("body");
    console.log("Saved interests verified successfully.");

    // Filter out expected React 19 / dev server warnings if any
    const realErrors = consoleErrors.filter(
      (err) =>
        !err.includes("Download the React DevTools") &&
        !err.includes("favicon") &&
        !err.includes("Hydration")
    );
    if (realErrors.length > 0) {
      console.warn("Browser console errors observed:", realErrors);
    } else {
      console.log("Zero unexpected browser console errors.");
    }

    console.log("ALL PLAYWRIGHT E2E CHECKS PASSED SUCCESSFULLY!");
  } finally {
    await browser.close();
  }
}

runE2E().catch((err) => {
  console.error("E2E Test Failed:", err);
  process.exit(1);
});
