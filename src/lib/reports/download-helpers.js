import { generateExcelReport } from "./excel-builder.js";
import { generateWordReport } from "./word-builder.js";
import { generatePdfReport } from "./pdf-builder.js";
import { generateCsvReport } from "./csv-builder.js";

/**
 * Downloads a binary or text file in the browser safely with cleanup.
 */
export function triggerFileDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Unified report export dispatcher.
 * Handles PDF, Excel (.xlsx with native charts), Word (.docx), and CSV.
 */
export async function exportReportFile(snapshot, format = "pdf") {
  const baseName = `agriwiser-${snapshot.reportType || "report"}-${(snapshot.geographicScope || "national").toLowerCase().replace(/[^a-z0-9]/g, "_")}`;

  switch (format) {
    case "excel": {
      const uint8 = await generateExcelReport(snapshot);
      const blob = new Blob([uint8], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      triggerFileDownload(blob, `${baseName}.xlsx`);
      return { success: true, format: "Excel (.xlsx)", filename: `${baseName}.xlsx` };
    }

    case "word": {
      const buffer = await generateWordReport(snapshot);
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });
      triggerFileDownload(blob, `${baseName}.docx`);
      return { success: true, format: "Word (.docx)", filename: `${baseName}.docx` };
    }

    case "pdf": {
      const arrayBuffer = await generatePdfReport(snapshot);
      const blob = new Blob([arrayBuffer], { type: "application/pdf" });
      triggerFileDownload(blob, `${baseName}.pdf`);
      return { success: true, format: "PDF", filename: `${baseName}.pdf` };
    }

    case "csv":
    default: {
      const csvText = generateCsvReport(snapshot);
      const blob = new Blob([csvText], { type: "text/csv;charset=utf-8;" });
      triggerFileDownload(blob, `${baseName}.csv`);
      return { success: true, format: "CSV", filename: `${baseName}.csv` };
    }
  }
}
