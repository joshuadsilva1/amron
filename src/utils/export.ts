import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as Print from "expo-print";
import * as XLSX from "xlsx";

export type ExportCell = string | number | null | undefined;

const sanitizeFilename = (name: string) => name.replace(/[^a-z0-9_-]/gi, "_");

const escapeHtml = (value: ExportCell) =>
  String(value ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c] as string));

async function shareFile(uri: string, mimeType: string, dialogTitle: string, UTI: string) {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("Sharing isn't available on this device.");
  }
  await Sharing.shareAsync(uri, { mimeType, dialogTitle, UTI });
}

function buildHtmlTable(title: string, headers: string[], rows: ExportCell[][]) {
  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: -apple-system, Helvetica, Arial, sans-serif; padding: 24px; }
          h1 { font-size: 20px; margin-bottom: 16px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ddd; padding: 8px; font-size: 12px; text-align: left; }
          th { background-color: #f3f4f6; font-weight: 700; }
          tr:nth-child(even) { background-color: #fafafa; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(title)}</h1>
        <table>
          <thead><tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr></thead>
          <tbody>
            ${rows
              .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`)
              .join("")}
          </tbody>
        </table>
      </body>
    </html>
  `;
}

export async function exportToExcel(filename: string, headers: string[], rows: ExportCell[][]) {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");

  const base64 = XLSX.write(wb, { type: "base64", bookType: "xlsx" }) as string;
  const file = new File(Paths.cache, `${sanitizeFilename(filename)}.xlsx`);
  if (file.exists) file.delete();
  file.create();
  file.write(base64, { encoding: "base64" });

  await shareFile(
    file.uri,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    filename,
    "com.microsoft.excel.xlsx"
  );
}

export async function exportToPDF(title: string, headers: string[], rows: ExportCell[][]) {
  const { uri } = await Print.printToFileAsync({ html: buildHtmlTable(title, headers, rows) });
  await shareFile(uri, "application/pdf", title, "com.adobe.pdf");
}

// Opens the native print dialog directly (as opposed to exportToPDF, which
// generates a file and hands it to the share sheet).
export async function printTable(title: string, headers: string[], rows: ExportCell[][]) {
  await Print.printAsync({ html: buildHtmlTable(title, headers, rows) });
}
