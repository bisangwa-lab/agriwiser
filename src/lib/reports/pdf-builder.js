import { jsPDF } from "jspdf";

/**
 * AGRIWISER — PROFESSIONAL PAGINATED PDF BUILDER
 *
 * Generates an authoritative, publication-grade PDF report:
 *  - Searchable, selectable text throughout
 *  - Official AgriWiser branding, dark forest green headers, clean styling
 *  - Dynamic pagination with running headers and "Page X of Y" footers
 *  - Formatted tables with right-aligned numeric data
 *  - Vector-rendered charts directly into the PDF (crisp, scalable, no raster blur)
 *  - 5-Question evidence structure and scientific caveats
 */

const COLOR_PRIMARY = [27, 67, 50];       // #1B4332 Forest Green
const COLOR_SECONDARY = [45, 106, 79];    // #2D6A4F
const COLOR_TEXT = [30, 41, 59];          // #1E293B Slate Dark
const COLOR_MUTED = [100, 116, 139];      // #64748B Slate Muted
const COLOR_BG_LIGHT = [248, 250, 248];   // Pale green-tinted background
const COLOR_BORDER = [226, 232, 240];     // #E2E8F0 Border

export async function generatePdfReport(snapshot) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 42;
  const contentWidth = pageWidth - margin * 2;
  let cursorY = margin;

  function checkPageBreak(requiredHeight) {
    if (cursorY + requiredHeight > pageHeight - margin - 30) {
      doc.addPage();
      cursorY = margin + 30; // Leave space for running header
      drawRunningHeader();
    }
  }

  function drawRunningHeader() {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...COLOR_MUTED);
    doc.text("AgriWiser · Evidence-Based Agricultural Statistical Report", margin, margin - 12);
    doc.text(`ID: ${snapshot.id}`, pageWidth - margin, margin - 12, { align: "right" });
    doc.setDrawColor(...COLOR_BORDER);
    doc.setLineWidth(0.5);
    doc.line(margin, margin - 6, pageWidth - margin, margin - 6);
  }

  // 1. Cover / Document Header Block
  drawRunningHeader();

  // Top Title Banner
  doc.setFillColor(...COLOR_PRIMARY);
  doc.rect(margin, cursorY, contentWidth, 54, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(255, 255, 255);
  doc.text(snapshot.title || "Agricultural Statistical Report", margin + 14, cursorY + 24);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(220, 235, 225);
  doc.text(snapshot.subtitle || "Official verified statistical publication", margin + 14, cursorY + 42);

  cursorY += 66;

  // Metadata Grid (2 columns)
  doc.setFillColor(...COLOR_BG_LIGHT);
  doc.rect(margin, cursorY, contentWidth, 38, "F");
  doc.setDrawColor(...COLOR_BORDER);
  doc.setLineWidth(0.5);
  doc.rect(margin, cursorY, contentWidth, 38, "S");

  doc.setFontSize(8.5);
  doc.setTextColor(...COLOR_MUTED);
  doc.text("Geographic Scope:", margin + 10, cursorY + 14);
  doc.text("Agricultural Period:", margin + 10, cursorY + 28);
  doc.text("Approval Status:", margin + 260, cursorY + 14);
  doc.text("Generation Date:", margin + 260, cursorY + 28);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLOR_TEXT);
  doc.text(snapshot.geographicScope || "All Districts", margin + 95, cursorY + 14);
  doc.text(snapshot.agriculturalPeriod || "Observed Seasons", margin + 95, cursorY + 28);
  doc.text(snapshot.approvalStatus || "Approved Evidence", margin + 345, cursorY + 14);
  doc.text(snapshot.generatedAt ? snapshot.generatedAt.slice(0, 10) : "2026-10-30", margin + 345, cursorY + 28);

  cursorY += 48;

  // 2. Executive Summary
  checkPageBreak(70);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...COLOR_PRIMARY);
  doc.text("EXECUTIVE SUMMARY", margin, cursorY);
  cursorY += 14;

  doc.setFont("helvetica", "italic");
  doc.setFontSize(9.5);
  doc.setTextColor(...COLOR_TEXT);
  const summaryLines = doc.splitTextToSize(snapshot.executiveSummary || "", contentWidth - 16);
  const summaryBoxHeight = summaryLines.length * 13 + 14;

  doc.setFillColor(244, 247, 244);
  doc.setDrawColor(200, 220, 205);
  doc.roundedRect(margin, cursorY, contentWidth, summaryBoxHeight, 3, 3, "FD");
  doc.text(summaryLines, margin + 8, cursorY + 14);

  cursorY += summaryBoxHeight + 16;

  // 3. Key Findings (5 Core Questions)
  checkPageBreak(120);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...COLOR_PRIMARY);
  doc.text("KEY VERIFIED FINDINGS", margin, cursorY);
  cursorY += 14;

  for (const f of snapshot.keyFindings || []) {
    checkPageBreak(38);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...COLOR_SECONDARY);
    doc.text(f.question, margin + 6, cursorY);
    cursorY += 12;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...COLOR_TEXT);
    const fLines = doc.splitTextToSize(f.text, contentWidth - 12);
    doc.text(fLines, margin + 6, cursorY);
    cursorY += fLines.length * 11 + 6;
  }

  cursorY += 8;

  // 4. Statistical Performance Table
  checkPageBreak(100);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...COLOR_PRIMARY);
  doc.text("STATISTICAL OBSERVATIONS & FORMULA METRICS", margin, cursorY);
  cursorY += 12;

  const headers = snapshot.tableHeaders || ["Measure", "Unit", "Baseline", "Current", "Delta", "Relative Change"];
  const colWidth = contentWidth / headers.length;

  // Table Header Row
  doc.setFillColor(...COLOR_PRIMARY);
  doc.rect(margin, cursorY, contentWidth, 18, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);

  headers.forEach((h, i) => {
    const x = margin + i * colWidth + 4;
    const align = i >= 2 ? "right" : "left";
    const xPos = align === "right" ? margin + (i + 1) * colWidth - 4 : x;
    doc.text(h, xPos, cursorY + 12, { align });
  });

  cursorY += 18;

  // Table Data Rows
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...COLOR_TEXT);

  const rawRows = snapshot.tableRows || [];
  rawRows.forEach((row, rIdx) => {
    checkPageBreak(16);
    const bg = rIdx % 2 === 0 ? [255, 255, 255] : [248, 250, 248];
    doc.setFillColor(...bg);
    doc.rect(margin, cursorY, contentWidth, 16, "F");
    doc.setDrawColor(...COLOR_BORDER);
    doc.setLineWidth(0.3);
    doc.line(margin, cursorY + 16, margin + contentWidth, cursorY + 16);

    const vals = Object.values(row);
    vals.forEach((v, cIdx) => {
      const align = cIdx >= 2 ? "right" : "left";
      const xPos = align === "right" ? margin + (cIdx + 1) * colWidth - 4 : margin + cIdx * colWidth + 4;
      doc.text(String(v ?? ""), xPos, cursorY + 11, { align });
    });

    cursorY += 16;
  });

  cursorY += 16;

  // 5. Visual Vector Chart (When chartSpec exists)
  if (snapshot.chartSpec && snapshot.chartSpec.data && snapshot.chartSpec.data.length > 0) {
    checkPageBreak(130);
    const chart = snapshot.chartSpec;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(...COLOR_PRIMARY);
    doc.text(`VISUAL ANALYTICS: ${chart.title}`, margin, cursorY);
    cursorY += 12;

    const chartHeight = 85;
    const chartBoxY = cursorY;

    // Draw Chart Background Box
    doc.setFillColor(252, 253, 252);
    doc.setDrawColor(...COLOR_BORDER);
    doc.setLineWidth(0.5);
    doc.roundedRect(margin, chartBoxY, contentWidth, chartHeight, 3, 3, "FD");

    // Draw Vector Bars
    const dataPoints = chart.data.slice(0, 8); // Max 8 bars for clean layout
    const maxVal = Math.max(...dataPoints.map((d) => (typeof d.value === "number" ? d.value : 0)), 1);
    const barAreaWidth = contentWidth - 40;
    const barWidth = Math.min(32, barAreaWidth / dataPoints.length - 12);
    const barSpacing = barAreaWidth / dataPoints.length;

    dataPoints.forEach((d, i) => {
      const v = typeof d.value === "number" ? d.value : 0;
      const barH = (v / maxVal) * (chartHeight - 34);
      const bx = margin + 20 + i * barSpacing + (barSpacing - barWidth) / 2;
      const by = chartBoxY + chartHeight - 18 - barH;

      // Bar
      doc.setFillColor(...COLOR_PRIMARY);
      doc.rect(bx, by, barWidth, barH, "F");

      // Bar Value on top
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...COLOR_TEXT);
      doc.text(String(Math.round(v)), bx + barWidth / 2, by - 3, { align: "center" });

      // Label below bar
      doc.setFontSize(7);
      doc.setTextColor(...COLOR_MUTED);
      const labelText = doc.splitTextToSize(d.name || "", barSpacing - 2);
      doc.text(labelText[0] || "", bx + barWidth / 2, chartBoxY + chartHeight - 8, { align: "center" });
    });

    cursorY += chartHeight + 10;

    // Caption / Natural Explanation
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...COLOR_MUTED);
    doc.text(`Figure 1.1: ${chart.explanation}`, margin, cursorY);
    cursorY += 14;
  }

  // 6. Data Quality, Limitations, and Causality Warning
  checkPageBreak(90);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(...COLOR_PRIMARY);
  doc.text("DATA QUALITY, COVERAGE & SCIENTIFIC SAFEGUARDS", margin, cursorY);
  cursorY += 12;

  for (const lim of snapshot.limitations || []) {
    checkPageBreak(20);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...COLOR_TEXT);
    const lLines = doc.splitTextToSize(`• ${lim}`, contentWidth - 8);
    doc.text(lLines, margin + 4, cursorY);
    cursorY += lLines.length * 10 + 4;
  }

  cursorY += 8;

  // 7. Actionable Next Steps
  checkPageBreak(80);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(...COLOR_PRIMARY);
  doc.text("RECOMMENDED VERIFICATION & RESPONSE ACTIONS", margin, cursorY);
  cursorY += 12;

  for (const rec of snapshot.recommendations || []) {
    checkPageBreak(20);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...COLOR_TEXT);
    const rLines = doc.splitTextToSize(`1. ${rec}`, contentWidth - 8);
    doc.text(rLines, margin + 4, cursorY);
    cursorY += rLines.length * 10 + 4;
  }

  cursorY += 12;

  // 8. Sources and Methodology
  checkPageBreak(60);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...COLOR_PRIMARY);
  doc.text("SOURCES & METHODOLOGY", margin, cursorY);
  cursorY += 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...COLOR_MUTED);
  doc.text(`Publisher: ${snapshot.primaryDataset?.publisher || "NISR"} | Dataset: ${snapshot.primaryDataset?.name || "SAS"} | Version: ${snapshot.primaryDataset?.version || "1.0"}`, margin, cursorY);
  cursorY += 9;
  doc.text(`Calculation Formula: ${snapshot.methodology?.formula || "Standard statistical difference formula."}`, margin, cursorY);
  cursorY += 9;
  doc.text(`Yield Formula: ${snapshot.methodology?.yieldFormula || "Yield = Production / Harvested Area."}`, margin, cursorY);

  // Add Dynamic Page Footers ("Page X of Y")
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...COLOR_MUTED);
    doc.setDrawColor(...COLOR_BORDER);
    doc.setLineWidth(0.5);
    doc.line(margin, pageHeight - margin + 12, pageWidth - margin, pageHeight - margin + 12);
    doc.text(`Report ID: ${snapshot.id} · Generated by ${snapshot.preparedBy}`, margin, pageHeight - margin + 22);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - margin + 22, { align: "right" });
  }

  return doc.output("arraybuffer");
}
