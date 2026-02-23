import React, { useMemo, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker?url";

// ✅ set worker
(pdfjsLib as any).GlobalWorkerOptions.workerSrc = pdfjsWorker;

type Extracted = {
  name?: string;
  email?: string;
  phone?: string;
  github?: string;
  linkedin?: string;
  rawText?: string;
};

function isPdf(file: File) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

function pickFirst(regex: RegExp, text: string) {
  const m = text.match(regex);
  return m?.[1]?.trim();
}

function getLink(value?: string) {
  if (!value) return null;
  const v = value.trim();
  if (!/^https?:\/\//i.test(v)) return v;
  return (
    <a href={v} target="_blank" rel="noreferrer" className="link">
      {v}
    </a>
  );
}

async function extractPdfText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await (pdfjsLib as any).getDocument({ data: arrayBuffer }).promise;

  let fullText = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map((it: any) => it.str);
    fullText += strings.join(" ") + "\n";
  }

  return fullText.replace(/\s+\n/g, "\n").trim();
}

export default function CvUploadClientOnly() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [result, setResult] = useState<Extracted | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  const extracted = useMemo(() => result, [result]);

  async function onExtract(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setResult(null);
    setShowRaw(false);

    if (!file) return setErr("Please choose a PDF file.");
    if (!isPdf(file)) return setErr("Only PDF files are allowed.");

    setLoading(true);
    try {
      const rawText = await extractPdfText(file);

      if (!rawText) {
        setErr("PDF has no readable text (maybe scanned). Client-side OCR is not included.");
        return;
      }

      const email = pickFirst(/([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i, rawText);
      const phone = pickFirst(/(\+?\d[\d\s-]{7,}\d)/, rawText);

      const firstLine = rawText.split("\n").find((l) => l.trim().length > 2) || "";
      const name = firstLine.length <= 40 ? firstLine.trim() : undefined;

      const github = pickFirst(/(https?:\/\/(www\.)?github\.com\/[A-Za-z0-9_-]+)/i, rawText);
      const linkedin = pickFirst(/(https?:\/\/(www\.)?linkedin\.com\/[A-Za-z0-9_\/-]+)/i, rawText);

      setResult({ name, email, phone, github, linkedin, rawText });
    } catch (e: any) {
      setErr(e?.message || "Extraction failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ fontSize: 18, fontWeight: 900 }}>CV PDF Extractor (Client Only)</div>
      <div className="muted" style={{ marginTop: 6 }}>
        This does NOT call the backend. It extracts text in your browser.
      </div>

      {err && (
        <div style={{ marginTop: 12, padding: 10, border: "1px solid #ef4444", borderRadius: 10 }}>
          <span style={{ color: "#ef4444", fontWeight: 800 }}>{err}</span>
        </div>
      )}

      <form onSubmit={onExtract} style={{ marginTop: 14, display: "grid", gap: 12 }}>
        <input
          className="input"
          type="file"
          accept="application/pdf,.pdf"
          onChange={(e) => {
            const f = e.target.files?.[0] || null;
            if (f && !isPdf(f)) {
              setErr("Only PDF files are allowed.");
              setFile(null);
              return;
            }
            setErr("");
            setFile(f);
          }}
        />

        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? "Extracting..." : "Extract"}
        </button>
      </form>

      {extracted && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontWeight: 900, marginBottom: 10 }}>Extracted Data</div>

          <div
            style={{
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: 14,
              background: "rgba(15,23,42,0.02)",
              display: "grid",
              gap: 10,
            }}
          >
            <Row label="Name" value={extracted.name || "—"} />
            <Row label="Email" value={extracted.email || "—"} />
            <Row label="Phone" value={extracted.phone || "—"} />
            <Row label="GitHub" value={getLink(extracted.github) || "—"} />
            <Row label="LinkedIn" value={getLink(extracted.linkedin) || "—"} />
          </div>

          {extracted.rawText && (
            <div style={{ marginTop: 12 }}>
              <button
                type="button"
                className="btn"
                onClick={() => setShowRaw((s) => !s)}
                style={{ width: "fit-content" }}
              >
                {showRaw ? "Hide Raw Text" : "Show Raw Text"}
              </button>

              {showRaw && (
                <pre
                  style={{
                    marginTop: 10,
                    background: "rgba(15,23,42,0.04)",
                    border: "1px solid var(--border)",
                    padding: 12,
                    borderRadius: 12,
                    overflowX: "auto",
                    fontSize: 13,
                    whiteSpace: "pre-wrap",
                    lineHeight: 1.5,
                  }}
                >
                  {extracted.rawText}
                </pre>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "130px 1fr", gap: 10, alignItems: "center" }}>
      <div className="muted" style={{ fontWeight: 800 }}>
        {label}
      </div>
      <div style={{ fontWeight: 800 }}>{value}</div>
    </div>
  );
}