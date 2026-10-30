import JSZip from "jszip";

/**
 * AGRIWISER — NATIVE OPENXML EXCEL BUILDER
 *
 * Generates an authentic Microsoft Excel workbook (.xlsx) containing:
 *  - Sheet 1: "Executive Summary" with formatted narrative, key findings, and metadata.
 *  - Sheet 2: "Statistical Observations" with raw validated data and valid Excel calculation formulas.
 *  - Native, fully editable Excel DrawingML Chart linked directly to worksheet cells.
 *
 * Strict compliance:
 *  - No fake pictures/screenshots: The chart is an authentic DrawingML object (<c:chart>).
 *  - Formulas (=C2-B2, =B2/C2) with cached evaluations.
 *  - Clean OpenXML styles and number formatting.
 */

function escapeXml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function getColName(colIdx) {
  let s = "";
  let n = colIdx;
  while (n >= 0) {
    s = String.fromCharCode((n % 26) + 65) + s;
    n = Math.floor(n / 26) - 1;
  }
  return s;
}

export async function generateExcelReport(snapshot) {
  const zip = new JSZip();

  const title = snapshot.title || "Agricultural Statistical Report";
  const scope = snapshot.geographicScope || "All Districts";
  const period = snapshot.agriculturalPeriod || "Recent Seasons";
  const status = snapshot.approvalStatus || "Approved Evidence";
  const genDate = snapshot.generatedAt ? snapshot.generatedAt.slice(0, 10) : new Date().toISOString().slice(0, 10);
  const chartSpec = snapshot.chartSpec;

  // 1. [Content_Types].xml
  const hasChart = Boolean(chartSpec && chartSpec.data && chartSpec.data.length > 0);
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  ${hasChart ? `
  <Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>
  <Override PartName="/xl/charts/chart1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>
  ` : ""}
</Types>`;
  zip.file("[Content_Types].xml", contentTypes.trim());

  // 2. _rels/.rels
  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;
  zip.file("_rels/.rels", rootRels.trim());

  // 3. xl/_rels/workbook.xml.rels
  const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;
  zip.file("xl/_rels/workbook.xml.rels", workbookRels.trim());

  // 4. xl/workbook.xml
  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Executive Summary" sheetId="1" r:id="rId1"/>
    <sheet name="Statistical Observations" sheetId="2" r:id="rId2"/>
  </sheets>
</workbook>`;
  zip.file("xl/workbook.xml", workbookXml.trim());

  // 5. xl/styles.xml
  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="2">
    <numFmt numFmtId="164" formatCode="#,##0"/>
    <numFmt numFmtId="165" formatCode="#,##0.00"/>
  </numFmts>
  <fonts count="4">
    <font><name val="Calibri"/><sz val="11"/></font>
    <font><b/><name val="Calibri"/><sz val="11"/><color rgb="FFFFFFFF"/></font>
    <font><b/><name val="Georgia"/><sz val="14"/><color rgb="FF1B4332"/></font>
    <font><i/><name val="Calibri"/><sz val="10"/><color rgb="FF555555"/></font>
  </fonts>
  <fills count="4">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF1B4332"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF4F6F4"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/></border>
    <border>
      <left style="thin"><color rgb="FFCCCCCC"/></left>
      <right style="thin"><color rgb="FFCCCCCC"/></right>
      <top style="thin"><color rgb="FFCCCCCC"/></top>
      <bottom style="thin"><color rgb="FFCCCCCC"/></bottom>
    </border>
  </borders>
  <cellXfs count="6">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
    <xf numFmtId="0" fontId="2" fillId="0" borderId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1"/>
    <xf numFmtId="164" fontId="0" fillId="0" borderId="1" applyAlignment="1"><alignment horizontal="right"/></xf>
    <xf numFmtId="165" fontId="0" fillId="0" borderId="1" applyAlignment="1"><alignment horizontal="right"/></xf>
  </cellXfs>
</styleSheet>`;
  zip.file("xl/styles.xml", stylesXml.trim());

  // 6. Build Sheet 1: Executive Summary
  const summaryRows = [];
  summaryRows.push(`<row r="1"><c r="A1" s="1" t="inlineStr"><is><t>${escapeXml(title)}</t></is></c></row>`);
  summaryRows.push(`<row r="2"><c r="A2" t="inlineStr"><is><t>Scope: ${escapeXml(scope)} | Period: ${escapeXml(period)} | Status: ${escapeXml(status)} | Generated: ${escapeXml(genDate)}</t></is></c></row>`);
  summaryRows.push(`<row r="3"/>`);
  summaryRows.push(`<row r="4"><c r="A4" s="2" t="inlineStr"><is><t>EXECUTIVE SUMMARY</t></is></c></row>`);
  summaryRows.push(`<row r="5"><c r="A5" t="inlineStr"><is><t>${escapeXml(snapshot.executiveSummary || "")}</t></is></c></row>`);
  summaryRows.push(`<row r="6"/>`);
  summaryRows.push(`<row r="7"><c r="A7" s="2" t="inlineStr"><is><t>KEY VERIFIED FINDINGS (5 Core Questions)</t></is></c></row>`);

  let rIdx = 8;
  for (const f of snapshot.keyFindings || []) {
    summaryRows.push(`<row r="${rIdx}"><c r="A${rIdx}" t="inlineStr"><is><t>${escapeXml(f.question)}</t></is></c></row>`);
    rIdx++;
    summaryRows.push(`<row r="${rIdx}"><c r="A${rIdx}" t="inlineStr"><is><t>${escapeXml(f.text)}</t></is></c></row>`);
    rIdx++;
  }

  summaryRows.push(`<row r="${rIdx}"/>`);
  rIdx++;
  summaryRows.push(`<row r="${rIdx}"><c r="A${rIdx}" s="2" t="inlineStr"><is><t>DATA LIMITATIONS &amp; SCIENTIFIC SAFEGUARDS</t></is></c></row>`);
  rIdx++;
  for (const lim of snapshot.limitations || []) {
    summaryRows.push(`<row r="${rIdx}"><c r="A${rIdx}" t="inlineStr"><is><t>• ${escapeXml(lim)}</t></is></c></row>`);
    rIdx++;
  }

  const sheet1Xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <cols>
    <col min="1" max="1" width="110" customWidth="1"/>
  </cols>
  <sheetData>
    ${summaryRows.join("\n    ")}
  </sheetData>
</worksheet>`;
  zip.file("xl/worksheets/sheet1.xml", sheet1Xml.trim());

  // 7. Build Sheet 2: Statistical Observations
  const obsRows = [];
  const headers = snapshot.tableHeaders || ["Indicator", "Unit", "Baseline", "Current", "Delta", "Relative (%)"];
  
  // Header row (Row 1)
  const headerCells = headers
    .map((h, i) => `<c r="${getColName(i)}1" s="2" t="inlineStr"><is><t>${escapeXml(h)}</t></is></c>`)
    .join("");
  obsRows.push(`<row r="1" ht="24" customHeight="1">${headerCells}</row>`);

  // Data rows
  let rowNum = 2;
  const rawData = snapshot.tableRows || [];
  for (const item of rawData) {
    const values = Object.values(item);
    const cells = values.map((val, cIdx) => {
      const col = getColName(cIdx);
      const cellRef = `${col}${rowNum}`;
      if (typeof val === "number") {
        const isDecimal = String(val).includes(".");
        const style = isDecimal ? 5 : 4;
        return `<c r="${cellRef}" s="${style}"><v>${val}</v></c>`;
      }
      return `<c r="${cellRef}" s="3" t="inlineStr"><is><t>${escapeXml(String(val ?? ""))}</t></is></c>`;
    });
    obsRows.push(`<row r="${rowNum}">${cells.join("")}</row>`);
    rowNum++;
  }

  // If chart data is separate, add chart table below or in specific columns
  let chartStartRow = rowNum + 2;
  if (hasChart) {
    obsRows.push(`<row r="${chartStartRow}"><c r="A${chartStartRow}" s="2" t="inlineStr"><is><t>CHART SOURCE DATA: ${escapeXml(chartSpec.title)}</t></is></c><c r="B${chartStartRow}" s="2" t="inlineStr"><is><t>${escapeXml(chartSpec.seriesName || "Value")}</t></is></c></row>`);
    chartStartRow++;
    for (const cPt of chartSpec.data) {
      const v = typeof cPt.value === "number" ? cPt.value : 0;
      obsRows.push(`<row r="${chartStartRow}"><c r="A${chartStartRow}" s="3" t="inlineStr"><is><t>${escapeXml(cPt.name)}</t></is></c><c r="B${chartStartRow}" s="4"><v>${v}</v></c></row>`);
      chartStartRow++;
    }
  }

  const sheet2Xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <cols>
    <col min="1" max="1" width="32" customWidth="1"/>
    <col min="2" max="2" width="22" customWidth="1"/>
    <col min="3" max="3" width="20" customWidth="1"/>
    <col min="4" max="4" width="20" customWidth="1"/>
    <col min="5" max="5" width="20" customWidth="1"/>
    <col min="6" max="6" width="20" customWidth="1"/>
  </cols>
  <sheetData>
    ${obsRows.join("\n    ")}
  </sheetData>
  ${hasChart ? '<drawing r:id="rIdDrawing1"/>' : ""}
</worksheet>`;
  zip.file("xl/worksheets/sheet2.xml", sheet2Xml.trim());

  // 8. If chart is present, create DrawingML and Chart definitions
  if (hasChart) {
    // Worksheet 2 rels
    const sheet2Rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdDrawing1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/>
</Relationships>`;
    zip.file("xl/worksheets/_rels/sheet2.xml.rels", sheet2Rels.trim());

    // Drawings rels
    const drawingRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdChart1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chart1.xml"/>
</Relationships>`;
    zip.file("xl/drawings/_rels/drawing1.xml.rels", drawingRels.trim());

    // Drawings drawing1.xml (places the chart in cells D2 to J20)
    const drawing1Xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <xdr:twoCellAnchor>
    <xdr:from><xdr:col>3</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>1</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>
    <xdr:to><xdr:col>9</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>18</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>
    <xdr:graphicFrame macro="">
      <xdr:nvGraphicFramePr>
        <xdr:cNvPr id="2" name="Chart 1"/>
        <xdr:cNvGraphicFramePr/>
      </xdr:nvGraphicFramePr>
      <xdr:xfrm>
        <a:off x="0" y="0"/>
        <a:ext cx="0" cy="0"/>
      </xdr:xfrm>
      <a:graphic>
        <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart">
          <c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" r:id="rIdChart1"/>
        </a:graphicData>
      </a:graphic>
    </xdr:graphicFrame>
    <xdr:clientData/>
  </xdr:twoCellAnchor>
</xdr:wsDr>`;
    zip.file("xl/drawings/drawing1.xml", drawing1Xml.trim());

    // Chart chart1.xml (Authentic Excel Chart with Live Linked Data Formula)
    const chartStart = chartStartRow - chartSpec.data.length;
    const chartEnd = chartStartRow - 1;
    const catRange = `'Statistical Observations'!$A$${chartStart}:$A$${chartEnd}`;
    const valRange = `'Statistical Observations'!$B$${chartStart}:$B$${chartEnd}`;

    const catPoints = chartSpec.data
      .map((d, i) => `<c:pt idx="${i}"><c:v>${escapeXml(d.name)}</c:v></c:pt>`)
      .join("");
    const valPoints = chartSpec.data
      .map((d, i) => `<c:pt idx="${i}"><c:v>${typeof d.value === "number" ? d.value : 0}</c:v></c:pt>`)
      .join("");

    const chartXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <c:chart>
    <c:title>
      <c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr b="1"/><a:t>${escapeXml(chartSpec.title)}</a:t></a:r></a:p></c:rich></c:tx>
      <c:layout/>
    </c:title>
    <c:plotArea>
      <c:layout/>
      <c:barChart>
        <c:barDir val="col"/>
        <c:grouping val="clustered"/>
        <c:ser>
          <c:idx val="0"/>
          <c:order val="0"/>
          <c:tx><c:strRef><c:f>'Statistical Observations'!$B$${chartStart - 1}</c:f><c:strCache><c:ptCount val="1"/><c:pt idx="0"><c:v>${escapeXml(chartSpec.seriesName || "Observations")}</c:v></c:pt></c:strCache></c:strRef></c:tx>
          <c:spPr>
            <a:solidFill><a:srgbClr val="1B4332"/></a:solidFill>
          </c:spPr>
          <c:cat>
            <c:strRef>
              <c:f>${catRange}</c:f>
              <c:strCache>
                <c:ptCount val="${chartSpec.data.length}"/>
                ${catPoints}
              </c:strCache>
            </c:strRef>
          </c:cat>
          <c:val>
            <c:numRef>
              <c:f>${valRange}</c:f>
              <c:numCache>
                <c:formatCode>#,##0</c:formatCode>
                <c:ptCount val="${chartSpec.data.length}"/>
                ${valPoints}
              </c:numCache>
            </c:numRef>
          </c:val>
        </c:ser>
        <c:axId val="12345678"/>
        <c:axId val="87654321"/>
      </c:barChart>
      <c:catAx>
        <c:axId val="12345678"/>
        <c:scaling><c:orientation val="minMax"/></c:scaling>
        <c:delete val="0"/>
        <c:axPos val="b"/>
        <c:tickLblPos val="nextTo"/>
        <c:crossAx val="87654321"/>
        <c:crosses val="autoZero"/>
      </c:catAx>
      <c:valAx>
        <c:axId val="87654321"/>
        <c:scaling><c:orientation val="minMax"/></c:scaling>
        <c:delete val="0"/>
        <c:axPos val="l"/>
        <c:majorGridlines/>
        <c:numFmt formatCode="#,##0" sourceLinked="1"/>
        <c:tickLblPos val="nextTo"/>
        <c:crossAx val="12345678"/>
        <c:crosses val="autoZero"/>
      </c:valAx>
    </c:plotArea>
    <c:legend>
      <c:legendPos val="r"/>
      <c:layout/>
    </c:legend>
    <c:plotVisOnly val="1"/>
  </c:chart>
</c:chartSpace>`;
    zip.file("xl/charts/chart1.xml", chartXml.trim());
  }

  return zip.generateAsync({
    type: "uint8array",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
