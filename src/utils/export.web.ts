import * as XLSX from "xlsx";

export type ExportCell = string | number | null | undefined;

const sanitizeFilename = (name: string) => name.replace(/[^a-z0-9_-]/gi, "_");

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function exportToExcel(filename: string, headers: string[], rows: ExportCell[][]) {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");

  const arrayBuffer = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
  const blob = new Blob([arrayBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  downloadBlob(blob, `${sanitizeFilename(filename)}.xlsx`);
}

// expo-print has no real web implementation (printToFileAsync just calls
// window.print() on the whole current page), so build an actual PDF
// client-side. jsPDF is loaded here only — this file is never bundled into
// the native app (Metro picks .web.ts over .ts for web builds), which
// matters because jsPDF's bundled Node build contains an AMD-style
// require() Metro's native bundler can't parse.
export async function exportToPDF(title: string, headers: string[], rows: ExportCell[][]) {
  // Import the browser (ES module) build by its explicit dist path, not the
  // bare "jspdf" specifier — jsPDF's package.json "main" field points at
  // dist/jspdf.node.min.js (the Node build, which contains a bundling-
  // incompatible AMD require() for html2canvas), and Metro doesn't reliably
  // prefer the "browser"/"exports" alternate over "main".
  // @ts-ignore — no .d.ts alongside this deep-path JS build
  const { jsPDF } = await import("jspdf/dist/jspdf.es.min.js");
  const { default: autoTable } = await import("jspdf-autotable");
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text(title, 14, 15);
  autoTable(doc, {
    head: [headers],
    body: rows.map((row) => row.map((cell) => String(cell ?? ""))),
    startY: 20,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [139, 92, 246] },
  });
  doc.save(`${sanitizeFilename(title)}.pdf`);
}

export async function printTable(title: string, headers: string[], rows: ExportCell[][]) {
  return exportToPDF(title, headers, rows);
}
