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

// `merges` are sheet ranges (0-indexed, header row = r 0) to merge, e.g.
// grouping the same parent code across the rows beneath it.
export async function exportToExcel(
  filename: string,
  headers: string[],
  rows: ExportCell[][],
  merges?: XLSX.Range[]
) {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  if (merges?.length) ws["!merges"] = merges;
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

// Renders arbitrary HTML to an actual PDF FILE and hands it to the share
// sheet — unlike Print.printAsync (below), this never opens a live print
// dialog against whatever's currently on screen, so it works the same way
// on web/iOS/Android and is what "download this as a PDF" should use.
export async function exportHtmlToPdf(title: string, html: string) {
  const { uri } = await Print.printToFileAsync({ html });
  await shareFile(uri, "application/pdf", title, "com.adobe.pdf");
}

export async function exportToPDF(title: string, headers: string[], rows: ExportCell[][]) {
  await exportHtmlToPdf(title, buildHtmlTable(title, headers, rows));
}

// 35 label images (5 cols x 7 rows) per A4 page, paginating past that.
// Works fine on native — printToFileAsync's HTML rendering is only broken
// on web (see export.web.ts's version of this function).
export async function exportQrLabelSheet(labelImagesBase64: string[], title = "QR Label Sheet") {
  const labelHtml = labelImagesBase64
    .map((png) => `<div class="label"><img src="data:image/png;base64,${png}" /></div>`)
    .join("");

  const html = `
    <html>
      <head>
        <style>
          @page { size: A4; margin: 10mm; }
          body { margin: 0; font-family: -apple-system, Helvetica, Arial, sans-serif; }
          .sheet { display: grid; grid-template-columns: repeat(5, 1fr); gap: 4mm; }
          .label { border: 1px solid #ccc; border-radius: 4px; padding: 2mm; text-align: center; page-break-inside: avoid; }
          .label img { width: 100%; }
        </style>
      </head>
      <body>
        <div class="sheet">${labelHtml}</div>
      </body>
    </html>`;

  await exportHtmlToPdf(title, html);
}

// Opens the native print dialog directly (as opposed to exportToPDF, which
// generates a file and hands it to the share sheet).
export async function printTable(title: string, headers: string[], rows: ExportCell[][]) {
  await Print.printAsync({ html: buildHtmlTable(title, headers, rows) });
}

// Saves a base64-encoded binary file (e.g. a ZIP the backend built) and
// hands it to the share sheet — same mechanism as exportToExcel, just for
// arbitrary binary content instead of an XLSX built client-side. `filename`
// is expected to already include its extension (e.g. "labels.zip") — only
// the part before the last "." is sanitized, so the extension survives.
export async function exportBinaryFile(filename: string, base64: string, mimeType: string, UTI: string) {
  const dot = filename.lastIndexOf(".");
  const stem = dot > 0 ? filename.slice(0, dot) : filename;
  const ext = dot > 0 ? filename.slice(dot) : "";
  const safeName = `${sanitizeFilename(stem)}${ext}`;

  const file = new File(Paths.cache, safeName);
  if (file.exists) file.delete();
  file.create();
  file.write(base64, { encoding: "base64" });

  await shareFile(file.uri, mimeType, filename, UTI);
}
