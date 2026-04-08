const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, LevelFormat, BorderStyle,
  WidthType, ShadingType, VerticalAlign, PageNumber, PageBreak,
  TabStopType
} = require('docx');
const fs = require('fs');

const data = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const outPath = process.argv[3];

const DARK_BLUE   = "1B3A5C";
const MID_BLUE    = "2E75B6";
const LIGHT_BLUE  = "D6E4F0";
const ACCENT_RED  = "C0392B";
const ACCENT_AMBER= "D68910";
const LIGHT_GRAY  = "F2F2F2";
const MED_GRAY    = "CCCCCC";
const WHITE       = "FFFFFF";

const b1 = (c) => ({ style: BorderStyle.SINGLE, size: 1, color: c || MED_GRAY });
const cb = (c) => ({ top: b1(c), bottom: b1(c), left: b1(c), right: b1(c) });

function safe(v) {
  if (v == null) return "N/A";
  return String(v).replace(/[\x00-\x1F\x7F]/g, " ").slice(0, 300);
}

function spacer(pts) {
  return new Paragraph({ spacing: { before: 0, after: (pts || 6) * 20 }, children: [] });
}

function hr(color) {
  return new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: color || MID_BLUE, space: 4 } },
    spacing: { before: 0, after: 160 }, children: []
  });
}

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    children: [new TextRun({ text, font: "Arial", size: 32, bold: true })]
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    children: [new TextRun({ text, font: "Arial", size: 26, bold: true })]
  });
}

function body(text, opts) {
  opts = opts || {};
  return new Paragraph({
    spacing: { before: 80, after: 120 },
    children: [new TextRun({
      text: safe(text), font: "Arial", size: opts.size || 22,
      bold: opts.bold || false, color: opts.color || "000000", italics: opts.italics || false
    })]
  });
}

function bullet(text) {
  return new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    spacing: { before: 60, after: 60 },
    children: [new TextRun({ text: safe(text), font: "Arial", size: 20 })]
  });
}

function hRow(labels, widths) {
  return new TableRow({
    tableHeader: true,
    children: labels.map((l, i) => new TableCell({
      borders: cb(MID_BLUE), width: { size: widths[i], type: WidthType.DXA },
      shading: { fill: DARK_BLUE, type: ShadingType.CLEAR },
      margins: { top: 100, bottom: 100, left: 120, right: 120 },
      children: [new Paragraph({ children: [new TextRun({ text: l, font: "Arial", size: 20, bold: true, color: WHITE })] })]
    }))
  });
}

function dRow(cells, widths, shaded) {
  const fill = shaded ? LIGHT_BLUE : WHITE;
  return new TableRow({
    children: cells.map((c, i) => new TableCell({
      borders: cb(MED_GRAY), width: { size: widths[i], type: WidthType.DXA },
      shading: { fill, type: ShadingType.CLEAR },
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [new Paragraph({ children: [new TextRun({ text: safe(c), font: "Arial", size: 18 })] })]
    }))
  });
}

function kvRow(label, value, shaded) {
  const fill = shaded ? LIGHT_GRAY : WHITE;
  return new TableRow({ children: [
    new TableCell({ borders: cb(MED_GRAY), width: { size: 2800, type: WidthType.DXA },
      shading: { fill, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [new Paragraph({ children: [new TextRun({ text: safe(label), font: "Arial", size: 20, bold: true })] })] }),
    new TableCell({ borders: cb(MED_GRAY), width: { size: 6560, type: WidthType.DXA },
      shading: { fill, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [new Paragraph({ children: [new TextRun({ text: safe(value), font: "Arial", size: 20 })] })] })
  ]});
}

// ── Cover ──────────────────────────────────────────────────────────────────
const meta = data.meta;
const summary = data.summary;
const ts = new Date(meta.scan_timestamp);

const riskLevel = summary.wallet_files_found > 5 || summary.pattern_hits > 50 ? "HIGH"
                : summary.wallet_files_found > 0 || summary.pattern_hits > 10 ? "MEDIUM"
                : summary.pattern_hits > 0 ? "LOW" : "NONE";
const riskColor = riskLevel === "HIGH" ? ACCENT_RED : riskLevel === "MEDIUM" ? ACCENT_AMBER : MID_BLUE;
const riskFill  = riskLevel === "HIGH" ? "FADBD8" : riskLevel === "MEDIUM" ? "FEF9E7" : LIGHT_BLUE;

const children = [];

// Cover page
children.push(spacer(30));
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 80 },
  children: [new TextRun({ text: "WalletRecon", font: "Arial", size: 72, bold: true, color: DARK_BLUE })] }));
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 40 },
  children: [new TextRun({ text: "FORENSIC EXAMINATION REPORT", font: "Arial", size: 36, bold: true, color: MID_BLUE })] }));
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 320 },
  children: [new TextRun({ text: "Cryptocurrency & Virtual Wallet Artifacts", font: "Arial", size: 26, color: "555555" })] }));
children.push(hr(DARK_BLUE));
children.push(spacer(10));
children.push(new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: [2800, 6560], rows: [
  kvRow("Scanner", "WalletRecon v1.0.0", false),
  kvRow("Scan Target", meta.scan_path, true),
  kvRow("Scan Date", ts.toLocaleDateString("en-US", { year:"numeric", month:"long", day:"numeric" }), false),
  kvRow("Scan Time", ts.toLocaleTimeString("en-US"), true),
  kvRow("Hostname", meta.hostname, false),
  kvRow("Operating System", meta.os, true),
  kvRow("Report Generated", new Date().toLocaleString("en-US"), false),
]}));
children.push(spacer(20));
children.push(new Paragraph({ children: [new PageBreak()] }));

// Executive Summary
children.push(h1("1. Executive Summary"));
children.push(hr());
children.push(body("This report summarises the findings of an automated cryptocurrency and virtual wallet artifact scan performed on the target storage location. The scanner examined file names, directory structures, and file contents for indicators of cryptocurrency activity including wallet files, private keys, seed phrases, wallet addresses, exchange references, and transaction hashes."));
children.push(spacer(6));

// Risk banner
children.push(new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: [9360], rows: [
  new TableRow({ children: [new TableCell({
    borders: cb(riskColor), width: { size: 9360, type: WidthType.DXA },
    shading: { fill: riskFill, type: ShadingType.CLEAR }, margins: { top: 160, bottom: 160, left: 240, right: 240 },
    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [
      new TextRun({ text: "OVERALL RISK ASSESSMENT: " + riskLevel, font: "Arial", size: 28, bold: true, color: riskColor })
    ]})]
  })]})
]}));
children.push(spacer(12));

// Stat boxes
const statBox = (label, value, color, fill) => new TableCell({
  borders: cb(color), width: { size: 2340, type: WidthType.DXA },
  shading: { fill: fill || LIGHT_BLUE, type: ShadingType.CLEAR },
  margins: { top: 120, bottom: 120, left: 160, right: 160 },
  verticalAlign: VerticalAlign.CENTER,
  children: [
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(value), font: "Arial", size: 52, bold: true, color })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: label, font: "Arial", size: 18, color: "444444" })] }),
  ]
});
children.push(new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: [2340,2340,2340,2340], rows: [
  new TableRow({ children: [
    statBox("Files Scanned", summary.total_files_scanned.toLocaleString(), MID_BLUE, LIGHT_BLUE),
    statBox("Wallet Files", summary.wallet_files_found, summary.wallet_files_found > 0 ? ACCENT_RED : MID_BLUE, summary.wallet_files_found > 0 ? "FADBD8" : LIGHT_BLUE),
    statBox("Pattern Hits", summary.pattern_hits, summary.pattern_hits > 0 ? ACCENT_AMBER : MID_BLUE, summary.pattern_hits > 0 ? "FEF9E7" : LIGHT_BLUE),
    statBox("Known Paths", summary.known_path_hits, summary.known_path_hits > 0 ? ACCENT_RED : MID_BLUE, summary.known_path_hits > 0 ? "FADBD8" : LIGHT_BLUE),
  ]})
]}));
children.push(spacer(12));
children.push(h2("Key Findings"));
children.push(body("The scan examined " + summary.total_files_scanned.toLocaleString() + " files and identified the following cryptocurrency-related artifacts:"));
children.push(bullet(summary.wallet_files_found + " wallet file(s) identified by name or extension"));
children.push(bullet(summary.pattern_hits + " total pattern match(es) across cryptocurrency addresses, keys, seeds, and references"));
children.push(bullet(summary.known_path_hits + " known cryptocurrency application path(s) detected on the system"));
children.push(bullet(summary.total_errors + " access errors encountered during scanning"));
children.push(spacer(6));
children.push(new Paragraph({ children: [new PageBreak()] }));

// Section 2: Wallet Files
children.push(h1("2. Wallet File Artifacts"));
children.push(hr());
if (!data.wallet_files || data.wallet_files.length === 0) {
  children.push(body("No wallet files were identified during this scan.", { color: "666666", italics: true }));
} else {
  children.push(body(data.wallet_files.length + " wallet file(s) were identified. Each entry includes the full path, wallet type, file size, timestamps, and MD5 hash for integrity verification."));
  children.push(spacer(8));
  const w2 = [3000, 2300, 900, 1480, 1680];
  const r2 = [hRow(["File Path","Wallet Type","Size (B)","Modified","MD5 (partial)"], w2)];
  data.wallet_files.forEach((wf, i) => r2.push(dRow([
    wf.path || "N/A", wf.wallet_type || "N/A",
    wf.size_bytes != null ? wf.size_bytes.toLocaleString() : "N/A",
    wf.modified ? wf.modified.split("T")[0] : "N/A",
    (wf.md5 || "N/A").slice(0, 16) + "…"
  ], w2, i % 2 === 1)));
  children.push(new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: w2, rows: r2 }));
}
children.push(spacer(6));
children.push(new Paragraph({ children: [new PageBreak()] }));

// Section 3: Pattern Matches
children.push(h1("3. Cryptocurrency Pattern Matches"));
children.push(hr());
if (!data.pattern_matches || data.pattern_matches.length === 0) {
  children.push(body("No cryptocurrency patterns were matched in file contents.", { color: "666666", italics: true }));
} else {
  children.push(body(data.pattern_matches.length + " pattern match record(s) were found across scanned files."));
  children.push(spacer(8));
  // Summary by type
  const byType = {};
  data.pattern_matches.forEach(m => { byType[m.pattern] = (byType[m.pattern] || 0) + m.match_count; });
  const typeEntries = Object.entries(byType).sort((a, b) => b[1] - a[1]);
  children.push(h2("3.1 Pattern Type Summary"));
  const w3a = [5800, 1780, 1780];
  const r3a = [hRow(["Pattern Type","Occurrences","Files Affected"], w3a)];
  typeEntries.forEach(([pat, count], i) => {
    const fc = data.pattern_matches.filter(m => m.pattern === pat).length;
    r3a.push(dRow([pat, count.toLocaleString(), fc.toString()], w3a, i % 2 === 1));
  });
  children.push(new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: w3a, rows: r3a }));
  children.push(spacer(12));
  children.push(h2("3.2 Detailed Match Records"));
  const w3b = [3000, 2200, 700, 1560, 1900];
  const r3b = [hRow(["File Path","Pattern","Hits","Modified","Sample Value"], w3b)];
  data.pattern_matches.forEach((m, i) => {
    const samp = m.unique_samples && m.unique_samples.length > 0
      ? m.unique_samples[0].slice(0, 32) + (m.unique_samples[0].length > 32 ? "…" : "") : "N/A";
    r3b.push(dRow([m.path || "N/A", m.pattern || "N/A", m.match_count.toString(),
      m.modified ? m.modified.split("T")[0] : "N/A", samp], w3b, i % 2 === 1));
  });
  children.push(new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: w3b, rows: r3b }));
}
children.push(spacer(6));
children.push(new Paragraph({ children: [new PageBreak()] }));

// Section 4: Known paths
children.push(h1("4. Known Cryptocurrency Application Paths"));
children.push(hr());
if (!data.known_path_findings || data.known_path_findings.length === 0) {
  children.push(body("No known cryptocurrency application directories were found.", { color: "666666", italics: true }));
} else {
  children.push(body(data.known_path_findings.length + " known cryptocurrency application path(s) were detected."));
  children.push(spacer(8));
  const w4 = [3200, 3360, 800, 2000];
  const r4 = [hRow(["Expected Path","Resolved Path","Type","Modified"], w4)];
  data.known_path_findings.forEach((f, i) => r4.push(dRow([
    f.expected_path || "N/A", f.resolved_path || "N/A",
    f.is_dir ? "Directory" : "File",
    f.modified ? f.modified.split("T")[0] : "N/A"
  ], w4, i % 2 === 1)));
  children.push(new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: w4, rows: r4 }));
}
children.push(spacer(6));
children.push(new Paragraph({ children: [new PageBreak()] }));

// Section 5: Errors
children.push(h1("5. Scan Errors & Access Denials"));
children.push(hr());
children.push(body(data.errors.length + " error(s) were recorded during the scan, typically due to permission restrictions or locked files."));
children.push(spacer(6));
data.errors.slice(0, 100).forEach(e => children.push(bullet(e)));
if (data.errors.length > 100) children.push(body("... and " + (data.errors.length - 100) + " more errors (truncated).", { italics: true, color: "666666" }));
children.push(spacer(6));
children.push(new Paragraph({ children: [new PageBreak()] }));

// Section 6: Methodology
children.push(h1("6. Methodology & Disclaimer"));
children.push(hr());
children.push(h2("6.1 Scanning Methodology"));
children.push(body("The scan was conducted using WalletRecon, an automated Python-based forensic scanner. The methodology comprised three phases:"));
children.push(bullet("Phase 1 – Known Path Detection: The scanner checked the file system for well-known cryptocurrency application directories associated with Bitcoin Core, Ethereum, Electrum, Exodus, MetaMask, Monero, Zcash, Dogecoin, and other major wallets."));
children.push(bullet("Phase 2 – Wallet File Detection: Every file was tested against a database of wallet file name signatures (e.g., wallet.dat, UTC--, .wallet) and extensions (.dat, .key, .keystore, .seed). MD5 hashes are computed for forensic integrity."));
children.push(bullet("Phase 3 – Content Pattern Matching: Text-readable files up to 10 MB were scanned using regular expressions to identify cryptocurrency wallet addresses (BTC, ETH, LTC, XMR, XRP, DOGE, ZEC), private keys (WIF, hex), BIP39 mnemonic seed phrases, extended public/private keys, transaction hashes, exchange references, and Web3 code patterns."));
children.push(spacer(6));
children.push(h2("6.2 Limitations"));
children.push(bullet("Encrypted files: The scanner cannot read the contents of encrypted or password-protected files."));
children.push(bullet("Binary files: Files with extensions commonly associated with binary/media content are skipped to improve performance and reduce false positives."));
children.push(bullet("Access restrictions: System files and directories requiring elevated privileges may not have been scanned. Errors are listed in Section 5."));
children.push(bullet("Regular expression accuracy: Pattern matching uses heuristic regular expressions. Some false positives are possible, particularly for 64-character hex strings which may match non-crypto data."));
children.push(bullet("File size limit: Text files larger than 10 MB are excluded from content scanning."));
children.push(spacer(6));
children.push(h2("6.3 Disclaimer"));
children.push(body("This report is provided for lawful forensic investigation purposes only. The findings represent potential indicators of cryptocurrency activity and should be validated by a qualified forensic examiner. This tool does not constitute legal advice. Ensure all scanning activities comply with applicable laws and are conducted under proper legal authority."));

// ── Build document ─────────────────────────────────────────────────────────
const doc = new Document({
  numbering: { config: [{ reference: "bullets", levels: [{
    level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT,
    style: { paragraph: { indent: { left: 720, hanging: 360 } } }
  }] }] },
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, font: "Arial", color: DARK_BLUE },
        paragraph: { spacing: { before: 400, after: 160 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, font: "Arial", color: MID_BLUE },
        paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 } },
    ]
  },
  sections: [{
    headers: { default: new Header({ children: [
      new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: MID_BLUE, space: 4 } }, children: [
        new TextRun({ text: "CONFIDENTIAL  \u2013  WalletRecon Forensic Report", font: "Arial", size: 16, bold: true, color: DARK_BLUE }),
        new TextRun({ text: "   |   " + new Date().toLocaleDateString("en-US"), font: "Arial", size: 16, color: "666666" }),
      ]})
    ]})},
    footers: { default: new Footer({ children: [
      new Paragraph({ border: { top: { style: BorderStyle.SINGLE, size: 4, color: MID_BLUE, space: 4 } },
        tabStops: [{ type: TabStopType.RIGHT, position: 9360 }], children: [
        new TextRun({ text: "WalletRecon v1.0  \u2013  For authorized use only", font: "Arial", size: 16, color: "666666" }),
        new TextRun({ text: "\tPage ", font: "Arial", size: 16, color: "666666" }),
        new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 16, color: "666666" }),
        new TextRun({ text: " of ", font: "Arial", size: 16, color: "666666" }),
        new TextRun({ children: [PageNumber.TOTAL_PAGES], font: "Arial", size: 16, color: "666666" }),
      ]})
    ]})},
    properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1260, right: 1260, bottom: 1260, left: 1260 } } },
    children,
  }]
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(outPath, buf);
  console.log("Report written: " + outPath);
}).catch(err => { console.error(err.message); process.exit(1); });
