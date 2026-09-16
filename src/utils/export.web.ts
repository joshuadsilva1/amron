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

// Same "download a base64 blob the backend built" contract as export.ts's
// version — UTI is an iOS-only concept (expo-sharing), ignored here.
export async function exportBinaryFile(filename: string, base64: string, mimeType: string, _UTI?: string) {
  const dot = filename.lastIndexOf(".");
  const stem = dot > 0 ? filename.slice(0, dot) : filename;
  const ext = dot > 0 ? filename.slice(dot) : "";

  const byteChars = atob(base64);
  const byteNumbers = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
  const blob = new Blob([new Uint8Array(byteNumbers)], { type: mimeType });
  downloadBlob(blob, `${sanitizeFilename(stem)}${ext}`);
}

// Same grid layout as export.ts's HTML version (5 cols x 7 rows per A4
// page), built directly with jsPDF instead — printToFileAsync/html2canvas
// aren't viable on web here (see exportToPDF's comment above), but jsPDF
// can place images directly without needing to render arbitrary HTML.
export async function exportQrLabelSheet(labelImagesBase64: string[], title = "QR Label Sheet") {
  // @ts-ignore — no .d.ts alongside this deep-path JS build (see exportToPDF)
  const { jsPDF } = await import("jspdf/dist/jspdf.es.min.js");
  const doc = new jsPDF();

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 10;
  const gap = 4;
  const cols = 5;
  const rows = 7;
  const cellW = (pageWidth - margin * 2 - gap * (cols - 1)) / cols;
  const cellH = (pageHeight - margin * 2 - gap * (rows - 1)) / rows;
  const perPage = cols * rows;

  labelImagesBase64.forEach((png, idx) => {
    const posInPage = idx % perPage;
    if (idx > 0 && posInPage === 0) doc.addPage();
    const col = posInPage % cols;
    const row = Math.floor(posInPage / cols);
    const x = margin + col * (cellW + gap);
    const y = margin + row * (cellH + gap);
    doc.addImage(`data:image/png;base64,${png}`, "PNG", x, y, cellW, cellH);
  });

  doc.save(`${sanitizeFilename(title)}.pdf`);
}
