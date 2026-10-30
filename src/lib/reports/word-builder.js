import {
  Document,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  HeadingLevel,
  WidthType,
  BorderStyle,
  AlignmentType,
  ShadingType,
  Packer,
  PageNumber,
  Footer,
  Header,
} from "docx";

/**
 * AGRIWISER — PROFESSIONAL WORD (.DOCX) BUILDER
 *
 * Generates an editable Microsoft Word document (.docx) containing:
 *  - Official Document Header & Metadata Table
 *  - Executive Summary Callout Box
 *  - 5-Question Key Findings Section
 *  - Structured Agricultural Performance Table
 *  - Chart Summary & Interpretation
 *  - Scientific Limitations & Practical Recommendations
 *  - Source Attribution & Methodology
 *  - Running Headers & Paginated Footers ("Page X of Y")
 */

const BRAND_GREEN = "1B4332";
const BRAND_LIGHT_BG = "F4F6F4";
const BORDER_COLOR = "D0D7DE";

export async function generateWordReport(snapshot) {
  const title = snapshot.title || "Agricultural Statistical Report";
  const subtitle = snapshot.subtitle || "Evidence-based analysis";
  const scope = snapshot.geographicScope || "National";
  const period = snapshot.agriculturalPeriod || "Recent Seasons";
  const status = snapshot.approvalStatus || "Approved Evidence";
  const genDate = snapshot.generatedAt ? snapshot.generatedAt.slice(0, 10) : new Date().toISOString().slice(0, 10);
  const publisher = snapshot.primaryDataset?.publisher || "National Institute of Statistics of Rwanda (NISR)";

  // Metadata Table Rows
  const metaRows = [
    new TableRow({
      children: [
        new TableCell({
          width: { size: 25, type: WidthType.PERCENTAGE },
          shading: { fill: BRAND_LIGHT_BG, type: ShadingType.CLEAR },
          children: [new Paragraph({ children: [new TextRun({ text: "Geographic Scope", bold: true, size: 20 })] })],
        }),
        new TableCell({
          width: { size: 25, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ children: [new TextRun({ text: scope, size: 20 })] })],
        }),
        new TableCell({
          width: { size: 25, type: WidthType.PERCENTAGE },
          shading: { fill: BRAND_LIGHT_BG, type: ShadingType.CLEAR },
          children: [new Paragraph({ children: [new TextRun({ text: "Agricultural Period", bold: true, size: 20 })] })],
        }),
        new TableCell({
          width: { size: 25, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ children: [new TextRun({ text: period, size: 20 })] })],
        }),
      ],
    }),
    new TableRow({
      children: [
        new TableCell({
          width: { size: 25, type: WidthType.PERCENTAGE },
          shading: { fill: BRAND_LIGHT_BG, type: ShadingType.CLEAR },
          children: [new Paragraph({ children: [new TextRun({ text: "Approval Status", bold: true, size: 20 })] })],
        }),
        new TableCell({
          width: { size: 25, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ children: [new TextRun({ text: status, size: 20 })] })],
        }),
        new TableCell({
          width: { size: 25, type: WidthType.PERCENTAGE },
          shading: { fill: BRAND_LIGHT_BG, type: ShadingType.CLEAR },
          children: [new Paragraph({ children: [new TextRun({ text: "Generation Date", bold: true, size: 20 })] })],
        }),
        new TableCell({
          width: { size: 25, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ children: [new TextRun({ text: genDate, size: 20 })] })],
        }),
      ],
    }),
  ];

  const metaTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR },
      left: { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR },
      right: { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR },
      insideVertical: { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR },
    },
    rows: metaRows,
  });

  // Observations / Data Table
  const headers = snapshot.tableHeaders || ["Indicator", "Unit", "Baseline", "Current", "Delta", "Relative Change"];
  const obsTableRows = [
    new TableRow({
      tableHeader: true,
      children: headers.map(
        (h) =>
          new TableCell({
            shading: { fill: BRAND_GREEN, type: ShadingType.CLEAR },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: h, bold: true, color: "FFFFFF", size: 19 })],
              }),
            ],
          }),
      ),
    }),
  ];

  for (const row of snapshot.tableRows || []) {
    const vals = Object.values(row);
    obsTableRows.push(
      new TableRow({
        children: vals.map(
          (v) =>
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: String(v ?? ""), size: 19 })],
                }),
              ],
            }),
        ),
      }),
    );
  }

  const obsTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR },
      left: { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR },
      right: { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR },
      insideVertical: { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR },
    },
    rows: obsTableRows,
  });

  // Key findings paragraphs
  const keyFindingParagraphs = [];
  for (const f of snapshot.keyFindings || []) {
    keyFindingParagraphs.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 140, after: 60 },
        children: [new TextRun({ text: f.question, bold: true, color: BRAND_GREEN, size: 21 })],
      }),
      new Paragraph({
        spacing: { after: 120 },
        children: [new TextRun({ text: f.text, size: 21 })],
      }),
    );
  }

  // Limitations paragraphs
  const limitationParagraphs = (snapshot.limitations || []).map(
    (lim) =>
      new Paragraph({
        bullet: { level: 0 },
        spacing: { after: 80 },
        children: [new TextRun({ text: lim, size: 20 })],
      }),
  );

  // Recommendations paragraphs
  const recommendationParagraphs = (snapshot.recommendations || []).map(
    (rec) =>
      new Paragraph({
        bullet: { level: 0 },
        spacing: { after: 80 },
        children: [new TextRun({ text: rec, size: 20 })],
      }),
  );

  const doc = new Document({
    sections: [
      {
        properties: {},
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: "AgriWiser · Evidence-Based Statistical Dossier",
                    size: 16,
                    color: "888888",
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({ text: `Report ID: ${snapshot.id} | Page `, size: 16, color: "888888" }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 16, color: "888888" }),
                  new TextRun({ text: " of ", size: 16, color: "888888" }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: "888888" }),
                ],
              }),
            ],
          }),
        },
        children: [
          // Header / Title block
          new Paragraph({
            heading: HeadingLevel.TITLE,
            spacing: { before: 100, after: 80 },
            children: [new TextRun({ text: title, bold: true, color: BRAND_GREEN, size: 36, font: "Georgia" })],
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [new TextRun({ text: subtitle, italics: true, color: "555555", size: 22 })],
          }),

          // Metadata Table
          metaTable,

          new Paragraph({ spacing: { after: 240 } }),

          // Executive Summary Section
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 200, after: 100 },
            children: [new TextRun({ text: "Executive Summary", bold: true, color: BRAND_GREEN, size: 26 })],
          }),
          new Paragraph({
            spacing: { after: 200 },
            shading: { fill: BRAND_LIGHT_BG, type: ShadingType.CLEAR },
            children: [
              new TextRun({
                text: snapshot.executiveSummary || "Summary of verified findings.",
                size: 21,
                italics: true,
              }),
            ],
          }),

          // Key Findings Section (5-Question Structure)
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 240, after: 100 },
            children: [new TextRun({ text: "Key Verified Findings", bold: true, color: BRAND_GREEN, size: 26 })],
          }),
          ...keyFindingParagraphs,

          new Paragraph({ spacing: { after: 200 } }),

          // Performance / Data Table Section
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 240, after: 120 },
            children: [new TextRun({ text: "Statistical Observations & Metrics", bold: true, color: BRAND_GREEN, size: 26 })],
          }),
          obsTable,

          // Visual Analytics Summary (if chart exists)
          ...(snapshot.chartSpec
            ? [
                new Paragraph({
                  heading: HeadingLevel.HEADING_2,
                  spacing: { before: 240, after: 80 },
                  children: [new TextRun({ text: `Visual Evidence: ${snapshot.chartSpec.title}`, bold: true, size: 23 })],
                }),
                new Paragraph({
                  spacing: { after: 160 },
                  children: [new TextRun({ text: snapshot.chartSpec.explanation, size: 21 })],
                }),
              ]
            : []),

          new Paragraph({ spacing: { after: 200 } }),

          // Data Limitations & Scientific Integrity
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 240, after: 100 },
            children: [new TextRun({ text: "Data Quality & Analytical Limitations", bold: true, color: BRAND_GREEN, size: 26 })],
          }),
          ...limitationParagraphs,

          new Paragraph({ spacing: { after: 200 } }),

          // Recommendations
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 240, after: 100 },
            children: [new TextRun({ text: "Actionable Verification & Next Steps", bold: true, color: BRAND_GREEN, size: 26 })],
          }),
          ...recommendationParagraphs,

          new Paragraph({ spacing: { after: 200 } }),

          // Methodology & Provenance
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 240, after: 100 },
            children: [new TextRun({ text: "Sources & Calculation Methodology", bold: true, color: BRAND_GREEN, size: 26 })],
          }),
          new Paragraph({
            spacing: { after: 80 },
            children: [
              new TextRun({ text: "Authoritative Source: ", bold: true, size: 20 }),
              new TextRun({ text: `${snapshot.primaryDataset?.name || "Official SAS"} — ${publisher}.`, size: 20 }),
            ],
          }),
          new Paragraph({
            spacing: { after: 80 },
            children: [
              new TextRun({ text: "Mathematical Rules: ", bold: true, size: 20 }),
              new TextRun({
                text: snapshot.methodology?.formula || "Standard statistical difference formulas. Null observations are preserved and never coerced to zero.",
                size: 20,
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 80 },
            children: [
              new TextRun({ text: "Yield Formulation: ", bold: true, size: 20 }),
              new TextRun({
                text: snapshot.methodology?.yieldFormula || "Yield = Total Production (t) / Harvested Area (ha) strictly when Area > 0.",
                size: 20,
              }),
            ],
          }),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}
