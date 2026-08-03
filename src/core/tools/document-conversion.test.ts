import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import {
  convertPdfToText,
  convertDocxToText,
  convertMarkdownToHtml,
  convertHtmlToMarkdown,
} from "./document-conversion";
import { callTool } from "./test-helpers";

/**
 * Builds a real, minimal, spec-valid single-page PDF by hand (uncompressed content
 * stream, accurate xref byte offsets) — no PDF-authoring library, so this genuinely
 * exercises convertPdfToText against real PDF bytes rather than a mock.
 */
function buildMinimalPdf(pageText: string): Buffer {
  const escapedText = pageText.replace(/([()\\])/g, "\\$1");
  const contentStream = `BT /F1 24 Tf 72 712 Td (${escapedText}) Tj ET`;

  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n",
    "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
    `5 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}\nendstream\nendobj\n`,
  ];

  let body = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(body.length);
    body += obj;
  }

  const xrefStart = body.length;
  let xref = `xref\n0 ${offsets.length}\n0000000000 65535 f \n`;
  for (let i = 1; i < offsets.length; i++) {
    xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  const trailer = `trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return Buffer.from(body + xref + trailer, "latin1");
}

/** Builds a real, minimal .docx (an actual zip archive with OOXML parts) via jszip — no docx-authoring library. */
async function buildMinimalDocx(paragraphText: string): Promise<Buffer> {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`,
  );
  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,
  );
  zip.file(
    "word/_rels/document.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>`,
  );
  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>${paragraphText}</w:t></w:r></w:p>
  </w:body>
</w:document>`,
  );
  return zip.generateAsync({ type: "nodebuffer" });
}

describe("convertPdfToText", () => {
  it("extracts text from a real single-page PDF", async () => {
    const pdf = buildMinimalPdf("Hello, Roster!");
    const result = await callTool(convertPdfToText, { base64Content: pdf.toString("base64") });
    expect(result.text).toContain("Hello, Roster!");
    expect(result.pageCount).toBe(1);
  });

  it("never imports pdf-parse at module load time, only inside execute()", () => {
    // Regression: a static top-level `import { PDFParse } from "pdf-parse"`
    // pulled in pdfjs-dist + the native @napi-rs/canvas binary as a side
    // effect of merely loading this module — which core/tools/registry.ts
    // does for every chat turn regardless of which tools an agent actually
    // uses. In Vercel's serverless runtime that crashed with `ReferenceError:
    // DOMMatrix is not defined` on requests that never touched a PDF at all
    // (e.g. /chat rendering the composer). The import must stay inside
    // execute(), so it only runs for a request that actually converts a PDF.
    const source = readFileSync(fileURLToPath(new URL("./document-conversion.ts", import.meta.url)), "utf8");
    expect(source).not.toMatch(/^import .*from ["']pdf-parse["'];?$/m);
    expect(source).toContain('await import("pdf-parse")');
  });
});

describe("convertDocxToText", () => {
  it("extracts text from a real .docx file", async () => {
    const docx = await buildMinimalDocx("Hello from a real docx.");
    const result = await callTool(convertDocxToText, { base64Content: docx.toString("base64") });
    expect(result.text.trim()).toBe("Hello from a real docx.");
  });
});

describe("convertMarkdownToHtml", () => {
  it("converts markdown to html", async () => {
    const result = await callTool(convertMarkdownToHtml, {
      markdown: "# Title\n\nSome **bold** text.",
    });
    expect(result.html).toContain("<h1>Title</h1>");
    expect(result.html).toContain("<strong>bold</strong>");
  });
});

describe("convertHtmlToMarkdown", () => {
  it("converts html to markdown", async () => {
    const result = await callTool(convertHtmlToMarkdown, {
      html: "<h1>Title</h1><p>Some <strong>bold</strong> text.</p>",
    });
    expect(result.markdown).toContain("# Title");
    expect(result.markdown).toContain("**bold**");
  });
});
