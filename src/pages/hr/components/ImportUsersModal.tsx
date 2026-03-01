// src/pages/hr/users/components/ImportUsersModal.tsx
import React, { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { S } from "../styles/users.styles";
import { importUsersExcel, type ImportUsersResult } from "../../../services/users.service";

type Props = {
  open: boolean;
  onClose: () => void;
  onImported?: () => void;
};

type PreviewRow = {
  __row: number; // excel row number (1-based)
  name?: string;
  email?: string;
  matricule?: string;
  telephone?: string;
  date_embauche?: string;
  role?: "EMPLOYEE" | "MANAGER" | "HR" | string;
};

type FilterMode = "ALL" | "VALID" | "INVALID";

const P = {
  // (visual) make content feel wider
  modalBody: { width: "min(1100px, 94vw)" },

  topRow: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    flexWrap: "wrap" as const,
    padding: "12px 14px",
    border: "1px solid rgba(148,163,184,0.22)",
    borderRadius: 12,
    background: "rgba(248,250,252,0.85)",
  },

  fileBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 12px",
    borderRadius: 10,
    border: "1px solid rgba(148,163,184,0.25)",
    background: "#fff",
    color: "#0f172a",
    fontWeight: 900,
    cursor: "pointer",
    userSelect: "none" as const,
  },
  fileBtnDisabled: { opacity: 0.6, cursor: "not-allowed" as const },
  fileHint: { fontSize: 12, color: "#64748b" },

  fileBadge: {
    fontWeight: 800,
    color: "#0f172a",
    background: "#fff",
    border: "1px solid rgba(148,163,184,0.22)",
    borderRadius: 999,
    padding: "6px 10px",
  },

  select: {
    height: 36,
    padding: "0 10px",
    borderRadius: 10,
    border: "1px solid rgba(148,163,184,0.25)",
    background: "#fff",
    color: "#0f172a",
    fontWeight: 800,
    outline: "none",
  },

  meta: {
    fontSize: 13,
    color: "#475569",
    display: "flex",
    gap: 10,
    alignItems: "center",
    flexWrap: "wrap" as const,
  },

  kpi: (ok: boolean) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    padding: "5px 10px",
    fontSize: 12,
    fontWeight: 900,
    background: ok ? "rgba(22,163,74,0.10)" : "rgba(239,68,68,0.10)",
    border: ok ? "1px solid rgba(22,163,74,0.25)" : "1px solid rgba(239,68,68,0.25)",
    color: ok ? "#166534" : "#b91c1c",
  }),

  filterRow: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    flexWrap: "wrap" as const,
  },
  filterBtn: (active: boolean) => ({
    padding: "7px 10px",
    borderRadius: 999,
    border: active ? "1px solid rgba(15,23,42,0.25)" : "1px solid rgba(148,163,184,0.20)",
    background: active ? "rgba(15,23,42,0.06)" : "#fff",
    color: "#0f172a",
    fontWeight: 900,
    fontSize: 12,
    cursor: "pointer",
    userSelect: "none" as const,
  }),

  tableShell: {
    border: "1px solid rgba(148,163,184,0.22)",
    borderRadius: 14,
    overflow: "hidden",
    background: "#fff",
  },
  tableWrap: { maxHeight: 420, overflow: "auto" as const },

  th: {
    position: "sticky" as const,
    top: 0,
    zIndex: 2,
    textAlign: "left" as const,
    padding: "10px 12px",
    fontSize: 12,
    color: "#475569",
    background: "rgba(248,250,252,0.98)",
    borderBottom: "1px solid rgba(148,163,184,0.18)",
    whiteSpace: "nowrap" as const,
  },

  td: {
    padding: "10px 12px",
    fontSize: 13,
    borderTop: "1px solid rgba(148,163,184,0.14)",
    verticalAlign: "top" as const,
    whiteSpace: "nowrap" as const,
  },

  nameCell: { fontWeight: 900, color: "#0f172a", whiteSpace: "normal" as const },
  emailCell: { color: "#64748b", fontSize: 13 },

  errorsOk: { color: "#16a34a", fontWeight: 900, fontSize: 12 },
  errorsBad: { color: "#b91c1c", fontWeight: 900, fontSize: 12, whiteSpace: "normal" as const, minWidth: 320 },

  footerNote: {
    padding: "10px 12px",
    fontSize: 12,
    color: "#64748b",
    background: "rgba(248,250,252,0.9)",
    borderTop: "1px solid rgba(148,163,184,0.16)",
  },

  smallBtn: {
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid rgba(148,163,184,0.25)",
    background: "#fff",
    color: "#0f172a",
    fontWeight: 900,
    cursor: "pointer",
  },

  // ✅ inline edit styles
  cellInput: {
    width: "100%",
    height: 34,
    borderRadius: 10,
    border: "1px solid rgba(148,163,184,0.25)",
    padding: "0 10px",
    outline: "none",
    fontSize: 13,
    background: "#fff",
  },
  cellInputBad: {
    border: "1px solid rgba(239,68,68,0.45)",
    background: "rgba(254,226,226,0.35)",
  },
  cellSelect: {
    width: "100%",
    height: 34,
    borderRadius: 10,
    border: "1px solid rgba(148,163,184,0.25)",
    padding: "0 10px",
    outline: "none",
    fontSize: 13,
    background: "#fff",
  },
};

function normalizeHeader(h: any) {
  return String(h || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function toStr(v: any) {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeRole(r: string) {
  const x = toStr(r).toUpperCase();
  if (x === "EMPLOYEE" || x === "MANAGER" || x === "HR") return x;
  return x;
}

function isIsoDate(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export function ImportUsersModal({ open, onClose, onImported }: Props) {
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [result, setResult] = useState<ImportUsersResult | null>(null);

  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [rowErrors, setRowErrors] = useState<Record<number, string[]>>({});

  // ✅ sheet picker
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [sheetSelected, setSheetSelected] = useState<string>("");

  // ✅ filter
  const [filter, setFilter] = useState<FilterMode>("ALL");

  const fileLabel = useMemo(() => {
    if (!file) return "Aucun fichier sélectionné";
    return `${file.name} (${Math.round(file.size / 1024)} KB)`;
  }, [file]);

  function validateRows(all: PreviewRow[]) {
    const errors: Record<number, string[]> = {};
    const seenEmail = new Map<string, number>();
    const seenMat = new Map<string, number>();

    for (const r of all) {
      const e: string[] = [];
      const name = toStr(r.name);
      const email = toStr(r.email);
      const mat = toStr(r.matricule);
      const tel = toStr(r.telephone);
      const role = normalizeRole(toStr(r.role));
      const dateEmb = toStr(r.date_embauche);

      if (!name) e.push("name is required");

      if (!email) e.push("email is required");
      else if (!isValidEmail(email)) e.push("email format is invalid");

      if (!mat) e.push("matricule is required");
      if (!tel) e.push("telephone is required");

      if (!dateEmb) e.push("date_embauche is required");
      else if (!isIsoDate(dateEmb)) e.push("date_embauche must be YYYY-MM-DD");

      if (role && !["EMPLOYEE", "MANAGER", "HR"].includes(role)) e.push("role must be EMPLOYEE/MANAGER/HR");

      if (email) {
        const key = email.toLowerCase();
        if (seenEmail.has(key)) e.push(`duplicate email (also row ${seenEmail.get(key)})`);
        else seenEmail.set(key, r.__row);
      }

      if (mat) {
        const key = mat.toLowerCase();
        if (seenMat.has(key)) e.push(`duplicate matricule (also row ${seenMat.get(key)})`);
        else seenMat.set(key, r.__row);
      }

      if (e.length) errors[r.__row] = e;
    }

    setRowErrors(errors);
  }

  function updateCell(rowNum: number, key: keyof PreviewRow, value: string) {
    setRows((prev) => {
      const next = prev.map((r) => (r.__row === rowNum ? { ...r, [key]: value } : r));
      validateRows(next);
      return next;
    });
  }

  const validCount = useMemo(() => {
    return rows.filter((r) => (rowErrors[r.__row]?.length || 0) === 0).length;
  }, [rows, rowErrors]);

  const invalidCount = useMemo(() => rows.length - validCount, [rows.length, validCount]);

  const displayRows = useMemo(() => {
    if (filter === "ALL") return rows;

    return rows.filter((r) => {
      const ok = (rowErrors[r.__row]?.length || 0) === 0;
      return filter === "VALID" ? ok : !ok;
    });
  }, [rows, rowErrors, filter]);

  function buildPreviewFromSheet(wb: XLSX.WorkBook, sheetName: string) {
    const ws = wb.Sheets[sheetName];
    if (!ws) throw new Error(`Sheet not found: ${sheetName}`);

    const raw = XLSX.utils.sheet_to_json(ws, { defval: "", raw: false }) as any[];

    const mapped: PreviewRow[] = raw.slice(0, 200).map((obj, idx) => {
      const out: any = { __row: idx + 2 };
      for (const k of Object.keys(obj)) {
        const nk = normalizeHeader(k);
        out[nk] = obj[k];
      }
      out.role = normalizeRole(toStr(out.role || "EMPLOYEE"));
      out.date_embauche = toStr(out.date_embauche);
      return out as PreviewRow;
    });

    setRows(mapped);
    validateRows(mapped);
  }

  async function onPickFile(f: File | null) {
    setErr("");
    setResult(null);
    setRows([]);
    setRowErrors({});
    setSheetNames([]);
    setSheetSelected("");
    setFilter("ALL");
    setFile(f);

    if (!f) return;

    try {
      const buf = await f.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });

      const names = wb.SheetNames || [];
      setSheetNames(names);

      const first = names[0] || "";
      setSheetSelected(first);

      if (!first) throw new Error("No sheets found in the Excel file");
      buildPreviewFromSheet(wb, first);
    } catch (e: any) {
      setErr(e?.message || "Could not read the Excel file");
    }
  }

  async function onChangeSheet(name: string) {
    if (!file) return;
    setSheetSelected(name);
    setErr("");
    setResult(null);
    setRows([]);
    setRowErrors({});
    setFilter("ALL");

    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      buildPreviewFromSheet(wb, name);
    } catch (e: any) {
      setErr(e?.message || "Could not read the selected sheet");
    }
  }

  function downloadTemplate() {
    try {
      const headers = ["name", "email", "matricule", "telephone", "date_embauche", "role"];
      const example = ["John Doe", "john.doe@company.com", "EMP1001", "55100001", "2024-01-15", "EMPLOYEE"];

      const aoa = [headers, example];
      const ws = XLSX.utils.aoa_to_sheet(aoa);

      (ws as any)["!cols"] = [
        { wch: 20 },
        { wch: 28 },
        { wch: 14 },
        { wch: 14 },
        { wch: 14 },
        { wch: 12 },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "users");
      XLSX.writeFile(wb, "users_import_template.xlsx");
    } catch (e: any) {
      setErr(e?.message || "Could not generate template");
    }
  }

  async function onImport() {
    if (!file) return;

    if (validCount === 0) {
      setErr("No valid rows to import. Fix the errors in the file first.");
      return;
    }

    setBusy(true);
    setErr("");
    setResult(null);

    try {
      // NOTE: still sends original file to backend.
      // Inline edits are for UX/validation now.
      // Later: we can export corrected XLSX and upload that instead.
      const data = await importUsersExcel(file);
      setResult(data);
      onImported?.();
    } catch (e: any) {
      setErr(e?.message || "Import failed");
    } finally {
      setBusy(false);
    }
  }

  function closeAll() {
    if (busy) return;
    setFile(null);
    setErr("");
    setResult(null);
    setRows([]);
    setRowErrors({});
    setSheetNames([]);
    setSheetSelected("");
    setFilter("ALL");
    onClose();
  }

  function hasErr(rowNum: number, contains: string) {
    return (rowErrors[rowNum] || []).some((x) => x.toLowerCase().includes(contains.toLowerCase()));
  }

  return (
    <div style={P.modalBody}>
      <Modal
        open={open}
        title="Importer des utilisateurs"
        subtitle="Uploader un fichier Excel (.xlsx) pour créer les comptes."
        onClose={closeAll}
        right={
          <Button variant="primary" onClick={onImport} disabled={busy || !file || validCount === 0}>
            {busy ? "Import..." : validCount === 0 ? "Fix errors" : `Importer (${validCount})`}
          </Button>
        }
      >
        {err && (
          <div style={S.errorBox}>
            <span style={{ color: "#ef4444", fontWeight: 800 }}>{err}</span>
          </div>
        )}

        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ color: "#64748b", fontSize: 13 }}>
            Colonnes recommandées: <b>name</b>, <b>email</b>, <b>matricule</b>, <b>telephone</b>, <b>date_embauche</b>, <b>role</b>
          </div>

          <div style={P.topRow}>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => onPickFile(e.target.files?.[0] || null)}
              disabled={busy}
              style={{ display: "none" }}
            />

            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              style={{ ...P.fileBtn, ...(busy ? P.fileBtnDisabled : {}) }}
            >
              📄 Choisir un fichier
            </button>

            <span style={P.fileHint}>.xlsx / .xls</span>

            <button type="button" onClick={downloadTemplate} style={P.smallBtn} disabled={busy}>
              ⬇️ Télécharger modèle
            </button>

            <span
              style={{ ...P.fileBadge, cursor: busy ? "default" : "pointer" }}
              onClick={() => !busy && fileRef.current?.click()}
              title={busy ? "" : "Changer le fichier"}
            >
              {fileLabel}
            </span>

            {file && sheetNames.length > 0 && (
              <select
                style={P.select}
                value={sheetSelected}
                onChange={(e) => onChangeSheet(e.target.value)}
                disabled={busy}
                title="Choisir la feuille Excel"
              >
                {sheetNames.map((sn) => (
                  <option key={sn} value={sn}>
                    Feuille: {sn}
                  </option>
                ))}
              </select>
            )}

            {rows.length > 0 && (
              <div style={P.meta}>
                <span>
                  Total: <b>{rows.length}</b>
                </span>
                <span style={P.kpi(true)}>✅ Valid: {validCount}</span>
                <span style={P.kpi(false)}>❌ Invalid: {invalidCount}</span>
              </div>
            )}
          </div>

          {rows.length > 0 && (
            <div style={P.filterRow}>
              <span style={{ fontSize: 12, color: "#64748b", fontWeight: 900 }}>Afficher:</span>
              <button type="button" style={P.filterBtn(filter === "ALL")} onClick={() => setFilter("ALL")}>
                Tous ({rows.length})
              </button>
              <button type="button" style={P.filterBtn(filter === "VALID")} onClick={() => setFilter("VALID")}>
                Valides ({validCount})
              </button>
              <button type="button" style={P.filterBtn(filter === "INVALID")} onClick={() => setFilter("INVALID")}>
                Invalides ({invalidCount})
              </button>
              <span style={{ fontSize: 12, color: "#64748b" }}>
                (Les lignes invalides sont éditables)
              </span>
            </div>
          )}

          {rows.length > 0 && (
            <div style={P.tableShell}>
              <div style={P.tableWrap}>
                <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
                  <thead>
                    <tr>
                      <th style={{ ...P.th, width: 70 }}>Row</th>
                      <th style={P.th}>Name</th>
                      <th style={P.th}>Email</th>
                      <th style={P.th}>Matricule</th>
                      <th style={P.th}>Téléphone</th>
                      <th style={P.th}>Embauche</th>
                      <th style={P.th}>Role</th>
                      <th style={{ ...P.th, minWidth: 320 }}>Errors</th>
                    </tr>
                  </thead>

                  <tbody>
                    {displayRows.map((r, idx) => {
                      const errs = rowErrors[r.__row] || [];
                      const ok = errs.length === 0;

                      return (
                        <tr
                          key={`${r.__row}-${idx}`}
                          id={`preview-row-${r.__row}`}
                          style={{ background: ok ? "#fff" : "rgba(254,226,226,0.45)" }}
                        >
                          <td style={{ ...P.td, fontWeight: 900 }}>
                            {r.__row} {ok ? "✅" : "❌"}
                          </td>

                          {/* Name */}
                          <td style={{ ...P.td, whiteSpace: "normal" }}>
                            {ok ? (
                              <span style={P.nameCell}>{toStr(r.name) || "—"}</span>
                            ) : (
                              <input
                                style={{ ...P.cellInput, ...(hasErr(r.__row, "name") ? P.cellInputBad : {}) }}
                                value={toStr(r.name)}
                                onChange={(e) => updateCell(r.__row, "name", e.target.value)}
                                placeholder="name"
                              />
                            )}
                          </td>

                          {/* Email */}
                          <td style={P.td}>
                            {ok ? (
                              <span style={P.emailCell}>{toStr(r.email) || "—"}</span>
                            ) : (
                              <input
                                style={{ ...P.cellInput, ...(hasErr(r.__row, "email") ? P.cellInputBad : {}) }}
                                value={toStr(r.email)}
                                onChange={(e) => updateCell(r.__row, "email", e.target.value)}
                                placeholder="email"
                              />
                            )}
                          </td>

                          {/* Matricule */}
                          <td style={P.td}>
                            {ok ? (
                              toStr(r.matricule) || "—"
                            ) : (
                              <input
                                style={{ ...P.cellInput, ...(hasErr(r.__row, "matricule") ? P.cellInputBad : {}) }}
                                value={toStr(r.matricule)}
                                onChange={(e) => updateCell(r.__row, "matricule", e.target.value)}
                                placeholder="matricule"
                              />
                            )}
                          </td>

                          {/* Telephone */}
                          <td style={P.td}>
                            {ok ? (
                              toStr(r.telephone) || "—"
                            ) : (
                              <input
                                style={{ ...P.cellInput, ...(hasErr(r.__row, "telephone") ? P.cellInputBad : {}) }}
                                value={toStr(r.telephone)}
                                onChange={(e) => updateCell(r.__row, "telephone", e.target.value)}
                                placeholder="telephone"
                              />
                            )}
                          </td>

                          {/* Date embauche */}
                          <td style={P.td}>
                            {ok ? (
                              toStr(r.date_embauche) || "—"
                            ) : (
                              <input
                                style={{ ...P.cellInput, ...(hasErr(r.__row, "date_embauche") ? P.cellInputBad : {}) }}
                                value={toStr(r.date_embauche)}
                                onChange={(e) => updateCell(r.__row, "date_embauche", e.target.value)}
                                placeholder="YYYY-MM-DD"
                              />
                            )}
                          </td>

                          {/* Role */}
                          <td style={P.td}>
                            {ok ? (
                              normalizeRole(toStr(r.role || "")) || "—"
                            ) : (
                              <select
                                style={{ ...P.cellSelect, ...(hasErr(r.__row, "role") ? P.cellInputBad : {}) }}
                                value={normalizeRole(toStr(r.role || "EMPLOYEE"))}
                                onChange={(e) => updateCell(r.__row, "role", e.target.value)}
                              >
                                <option value="EMPLOYEE">EMPLOYEE</option>
                                <option value="MANAGER">MANAGER</option>
                                <option value="HR">HR</option>
                              </select>
                            )}
                          </td>

                          {/* Errors */}
                          <td style={{ ...P.td, ...(ok ? P.errorsOk : P.errorsBad) }}>
                            {ok ? "OK" : errs.join(" • ")}
                          </td>
                        </tr>
                      );
                    })}

                    {!busy && displayRows.length === 0 && (
                      <tr>
                        <td colSpan={8} style={{ ...P.td, color: "#64748b" }}>
                          Aucun résultat pour ce filtre.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div style={P.footerNote}>Preview shows first 200 rows.</div>
            </div>
          )}

          {result && (
            <div style={{ border: "1px solid rgba(148,163,184,0.22)", borderRadius: 12, padding: 12 }}>
              <div style={{ fontWeight: 900, color: "#0f172a", marginBottom: 6 }}>Résultat</div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", color: "#334155" }}>
                <span>
                  <b>Créés:</b> {result.created ?? 0}
                </span>
                {"skipped" in result && (
                  <span>
                    <b>Ignorés:</b> {(result as any).skipped ?? 0}
                  </span>
                )}
                {"failed" in result && (
                  <span>
                    <b>Échoués:</b> {(result as any).failed ?? 0}
                  </span>
                )}
              </div>

              {result.errors?.length ? (
                <div style={{ marginTop: 10, fontSize: 13, color: "#b91c1c" }}>
                  {result.errors.slice(0, 10).map((x, i) => (
                    <div key={i}>
                      Ligne {x.row}: {x.field ? `[${x.field}] ` : ""}
                      {x.message}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}