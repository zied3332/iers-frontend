// src/pages/Profile.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getCurrentUser, type CurrentUser, type Role } from "../../services/auth.service";
import { getAllDepartments, type Department } from "../../services/departments.service";
import { patchMe } from "./profile.api";
import { getMyEmployeeRecord, patchMyEmployeeRecord } from "../../services/employee.service";
import { getAllSkills } from "../../services/skills.service";
import { getAllDomains, type Domain } from "../../services/domains.service";
import type { ExperienceSegmentInput } from "../../utils/experienceSegments";
import {
  ExperienceSegmentsEditor,
  mapApiSegmentsToInput,
  mapApiSkillsToOptions,
  validateExperienceSegmentsForSave,
  type SkillOption,
} from "../../components/ExperienceSegmentsEditor";
import { PILL_TONES, S, type Tone } from "./profile.styles";

import ProfileHero from "./components/ProfileHero";
import ProfileTabs, { type ProfileTabKey } from "./components/ProfileTabs";
import OverviewTab from "./components/OverviewTab";
import FeedbackTab from "./components/FeedbackTab";
import HistoryTab from "./components/HistoryTab";

const AVATAR_STORAGE_KEY = "intellihr_avatar";

type PageStatus = "loading" | "ready" | "error";
type TabKey = "overview" | "feedback" | "history";

function getStoredAvatarUrl(userId: string): string | null {
  try {
    return localStorage.getItem(`${AVATAR_STORAGE_KEY}_${userId}`);
  } catch {
    return null;
  }
}

function setStoredAvatarUrl(userId: string, url: string) {
  try {
    if (url) localStorage.setItem(`${AVATAR_STORAGE_KEY}_${userId}`, url);
    else localStorage.removeItem(`${AVATAR_STORAGE_KEY}_${userId}`);
  } catch {
    // ignore
  }
}

function safeUpper(v?: string) {
  return (v ?? "").toString().trim().toUpperCase();
}

function isObjectIdLike(v?: string): boolean {
  return /^[a-f\d]{24}$/i.test(String(v || "").trim());
}

function getDepartmentName(user: any, departmentNameById?: Map<string, string>): string {
  if (user?.department && typeof user.department === "string") {
    const dep = user.department.trim();
    if (departmentNameById && isObjectIdLike(dep)) {
      return departmentNameById.get(dep) || dep;
    }
    return dep;
  }

  if (user?.departement_id && typeof user.departement_id === "object" && user.departement_id.name) {
    return user.departement_id.name;
  }

  if (typeof user?.departement_id === "string") {
    const dep = user.departement_id.trim();
    if (departmentNameById && isObjectIdLike(dep)) {
      return departmentNameById.get(dep) || dep;
    }
    return dep;
  }

  return "";
}

function roleLabel(role?: Role) {
  const r = safeUpper(role as any);
  if (r === "HR") return "HR";
  if (r === "SUPER_MANAGER" || r === "SUPER MANGER") return "SUPER MANAGER";
  if (r === "MANAGER") return "Manager";
  return "Employee";
}

function Pill({ text, tone = "neutral" }: { text: string; tone?: Tone }) {
  const map = PILL_TONES[tone];
  return (
    <span style={{ ...S.pill, background: map.bg, border: `1px solid ${map.bd}`, color: map.fg }}>
      {text}
    </span>
  );
}

const IconCamera = ({ size = 20, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
);

const IconTrash = ({ size = 20, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </svg>
);

function resizeImageToDataUrl(file: File, maxSize = 400, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      const w = img.naturalWidth;
      const h = img.naturalHeight;

      let width = w;
      let height = h;

      if (w > maxSize || h > maxSize) {
        if (w >= h) {
          width = maxSize;
          height = Math.round((h * maxSize) / w);
        } else {
          height = maxSize;
          width = Math.round((w * maxSize) / h);
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas not supported"));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Invalid image"));
    };

    img.src = url;
  });
}

export default function Profile() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [status, setStatus] = useState<PageStatus>("loading");
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const [tab, setTab] = useState<TabKey>("overview");

  const [avatarUrl, setAvatarUrl] = useState("");
  const [telephone, setTelephone] = useState("");
  const [departments, setDepartments] = useState<Department[]>([]);

  const [isEditingBasics, setIsEditingBasics] = useState(false);
  const [savingBasics, setSavingBasics] = useState(false);

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showRemovePhotoConfirm, setShowRemovePhotoConfirm] = useState(false);
  const [removingAvatar, setRemovingAvatar] = useState(false);
  const [showPhotoLightbox, setShowPhotoLightbox] = useState(false);

  const [employeeRecordId, setEmployeeRecordId] = useState("");
  const [editJobTitle, setEditJobTitle] = useState("");
  const [editExperienceYears, setEditExperienceYears] = useState(0);
  const [editSeniorityLevel, setEditSeniorityLevel] = useState<"JUNIOR" | "MID" | "SENIOR">("JUNIOR");
  const [experienceSegments, setExperienceSegments] = useState<ExperienceSegmentInput[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [skillOptions, setSkillOptions] = useState<SkillOption[]>([]);

  const [viewportWidth, setViewportWidth] = useState<number>(() =>
    typeof window !== "undefined" ? window.innerWidth : 1400
  );

  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [me, depts] = await Promise.all([
          getCurrentUser(),
          getAllDepartments().catch(() => []),
        ]);

        if (cancelled) return;

        const uAny = me as any;
        setDepartments(Array.isArray(depts) ? depts : []);

        const storedAvatar = getStoredAvatarUrl(me._id);
        const effectiveAvatar = uAny.avatarUrl ?? storedAvatar ?? "";

        if (effectiveAvatar) {
          uAny.avatarUrl = effectiveAvatar;
          setStoredAvatarUrl(me._id, effectiveAvatar);
        }

        setUser(me);
        setStatus("ready");

        setAvatarUrl(effectiveAvatar);
        setTelephone(me.telephone ?? "");

        if (safeUpper(me.role as any) === "EMPLOYEE") {
          try {
            const [employeeRecord, skillsList, domainList] = await Promise.all([
              getMyEmployeeRecord(),
              getAllSkills().catch(() => []),
              getAllDomains().catch(() => []),
            ]);
            if (!cancelled && employeeRecord) {
              setEmployeeRecordId(employeeRecord._id);
              setEditJobTitle(String(employeeRecord.jobTitle || ""));
              setEditExperienceYears(Number(employeeRecord.experienceYears || 0));
              setEditSeniorityLevel(
                (employeeRecord.seniorityLevel || "JUNIOR") as "JUNIOR" | "MID" | "SENIOR"
              );
              setSkillOptions(mapApiSkillsToOptions(skillsList));
              setDomains(Array.isArray(domainList) ? domainList : []);
              setExperienceSegments(mapApiSegmentsToInput(employeeRecord.experienceSegments));
            }
          } catch {
            // keep page usable
          }
        }
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message ?? "Failed to load profile.");
        setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 1800);
    return () => clearTimeout(t);
  }, [toast]);

  const departmentNameById = useMemo(() => {
    const map = new Map<string, string>();
    (departments || []).forEach((d) => {
      const id = String(d?._id || "").trim();
      const name = String(d?.name || "").trim();
      if (id && name) map.set(id, name);
    });
    return map;
  }, [departments]);

  const isEmployee = safeUpper(user?.role as any) === "EMPLOYEE";
  const onlineLabel = user?.en_ligne ? "Online" : "Offline";
  const isNarrow = viewportWidth < 1100;
  const isMobile = viewportWidth < 760;

  const pageWrapStyle: React.CSSProperties = {
    width: "100%",
    maxWidth: 1520,
    margin: "0 auto",
    padding: isMobile ? "12px 12px 28px" : "18px 18px 36px",
    boxSizing: "border-box",
  };

  const editCardStyle: React.CSSProperties = {
    marginTop: 18,
    background: "var(--surface)",
    border: "1px solid color-mix(in srgb, var(--border) 78%, transparent)",
    borderRadius: 24,
    padding: isMobile ? 18 : 24,
    boxShadow: "0 18px 50px rgba(15,23,42,0.06)",
  };

  const editGridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(260px, 1fr))",
    gap: 16,
  };

  const fieldWrapStyle: React.CSSProperties = { display: "grid", gap: 8 };

  const inputStyle: React.CSSProperties = {
    padding: "12px 14px",
    borderRadius: 14,
    border: "1px solid color-mix(in srgb, var(--border) 72%, transparent)",
    background: "var(--surface)",
    color: "var(--text)",
    fontWeight: 700,
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
    minWidth: 0,
  };

  const actionRowStyle: React.CSSProperties = {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
    marginTop: 18,
  };

  const accountStatusLabel = useMemo(() => {
    const uAny = user as any;
    if (!user) return "—";
    return uAny.isActive === false ? "Inactive" : "Active";
  }, [user]);

  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setToast("Copied!");
    } catch {
      setToast("Copy failed");
    }
  }, []);

  const onSaveBasics = useCallback(async () => {
    if (!user) return;

    setSavingBasics(true);
    setError("");

    try {
      if (isEmployee && editExperienceYears < 0) {
        throw new Error("Experience years must be 0 or greater.");
      }

      await patchMe({
        telephone: telephone.trim() || undefined,
        avatarUrl: avatarUrl.trim() || undefined,
      });

      if (isEmployee && employeeRecordId) {
        const years = Math.max(0, Number(editExperienceYears || 0));
        const segErr = validateExperienceSegmentsForSave(years, experienceSegments);
        if (segErr) {
          throw new Error(segErr);
        }
        await patchMyEmployeeRecord({
          jobTitle: editJobTitle.trim() || "Not Assigned",
          experienceYears: years,
          seniorityLevel: editSeniorityLevel,
          experienceSegments: years > 0 ? experienceSegments : [],
        });
      }

      const next = { ...user, telephone: telephone.trim() || undefined } as any;
      const newAvatar = avatarUrl.trim() || undefined;
      next.avatarUrl = newAvatar;

      setUser(next);
      localStorage.setItem("user", JSON.stringify(next));

      if (newAvatar) setStoredAvatarUrl(user._id, newAvatar);
      else setStoredAvatarUrl(user._id, "");

      window.dispatchEvent(new CustomEvent("avatar-updated"));
      setToast("Saved!");
      setIsEditingBasics(false);
    } catch (e: any) {
      setError(e?.message ?? "Failed to save.");
      setToast("Save failed");
    } finally {
      setSavingBasics(false);
    }
  }, [
    user,
    telephone,
    avatarUrl,
    isEmployee,
    employeeRecordId,
    editJobTitle,
    editExperienceYears,
    editSeniorityLevel,
    experienceSegments,
  ]);

  const onAvatarFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";

      if (!file || !file.type.startsWith("image/")) return;
      if (!user) return;

      setUploadingAvatar(true);
      setError("");

      try {
        const dataUrl = await resizeImageToDataUrl(file, 400, 0.85);
        setAvatarUrl(dataUrl);

        await patchMe({
          telephone: telephone.trim() || undefined,
          avatarUrl: dataUrl,
        });

        const next = { ...user } as any;
        next.avatarUrl = dataUrl;

        setUser(next);
        setStoredAvatarUrl(user._id, dataUrl);
        window.dispatchEvent(new CustomEvent("avatar-updated"));
        setToast("Photo saved!");
      } catch (err: any) {
        setError(err?.message ?? "Upload failed.");
        setToast("Upload failed");
      } finally {
        setUploadingAvatar(false);
      }
    },
    [user, telephone]
  );

  const onRemoveAvatar = useCallback(async () => {
    if (!user) return;

    setShowRemovePhotoConfirm(false);
    setRemovingAvatar(true);
    setError("");

    try {
      await patchMe({
        telephone: telephone.trim() || undefined,
        avatarUrl: "",
      });

      setAvatarUrl("");

      const next = { ...user } as any;
      next.avatarUrl = undefined;
      setUser(next);

      setStoredAvatarUrl(user._id, "");
      window.dispatchEvent(new CustomEvent("avatar-updated"));
      setToast("Photo deleted");
    } catch (err: any) {
      setError(err?.message ?? "Failed to remove photo.");
      setToast("Failed");
    } finally {
      setRemovingAvatar(false);
    }
  }, [user, telephone]);

  return (
    <div style={{ ...S.page, padding: 0, maxWidth: "none" }}>
      <div style={pageWrapStyle}>
        {status === "loading" && (
          <div style={S.card}>
            <div style={S.cardTitle}>Loading</div>
            <div style={{ ...S.cardSubtitle, marginTop: 6 }}>Fetching your profile...</div>
          </div>
        )}

        {status === "error" && (
          <div style={S.card}>
            <div style={S.cardTitle}>Error</div>
            <div style={{ ...S.errorText, marginTop: 10 }}>{error}</div>
          </div>
        )}

        {status === "ready" && user && (
          <>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={onAvatarFileSelect}
            />

            <ProfileHero
              user={{
                name: user.name,
                email: user.email,
                matricule: user.matricule,
              }}
              avatarUrl={(user as any)?.avatarUrl ?? avatarUrl}
              departmentName={getDepartmentName(user, departmentNameById)}
              roleLabel={roleLabel(user.role)}
              accountStatusLabel={accountStatusLabel}
              onlineLabel={onlineLabel}
              onCopyEmail={() => copy(user.email)}
              onCopyMatricule={() => {
                if (user.matricule) copy(user.matricule);
              }}
              onEditProfile={() => {
                setTab("overview");
                setIsEditingBasics((v) => !v);
              }}
            />

            <ProfileTabs
              activeTab={tab as ProfileTabKey}
              onChange={(next) => setTab(next)}
              feedbackCount={3}
            />

            {isEditingBasics && tab === "overview" && (
              <div style={editCardStyle}>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 900,
                    color: "var(--text)",
                    marginBottom: 18,
                  }}
                >
                  Edit profile
                </div>

                <div style={editGridStyle}>
                  <div style={fieldWrapStyle}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "var(--muted)" }}>Phone number</div>
                    <input
                      value={telephone}
                      onChange={(e) => setTelephone(e.target.value)}
                      placeholder="+216 ..."
                      style={inputStyle}
                    />
                  </div>

                  <div style={fieldWrapStyle}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "var(--muted)" }}>Avatar URL</div>
                    <input
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      placeholder="Optional image URL"
                      style={inputStyle}
                    />
                  </div>

                  {isEmployee && (
                    <>
                      <div style={fieldWrapStyle}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: "var(--muted)" }}>Job title</div>
                        <input
                          value={editJobTitle}
                          onChange={(e) => setEditJobTitle(e.target.value)}
                          placeholder="Software Engineer"
                          style={inputStyle}
                        />
                      </div>

                      <div style={fieldWrapStyle}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: "var(--muted)" }}>Experience years</div>
                        <input
                          type="number"
                          min={0}
                          value={editExperienceYears}
                          onChange={(e) => setEditExperienceYears(Number(e.target.value || 0))}
                          style={inputStyle}
                        />
                      </div>

                      <div style={fieldWrapStyle}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: "var(--muted)" }}>Seniority level</div>
                        <select
                          value={editSeniorityLevel}
                          onChange={(e) => setEditSeniorityLevel(e.target.value as "JUNIOR" | "MID" | "SENIOR")}
                          style={inputStyle}
                        >
                          <option value="JUNIOR">JUNIOR</option>
                          <option value="MID">MID</option>
                          <option value="SENIOR">SENIOR</option>
                        </select>
                      </div>

                      <div style={{ ...fieldWrapStyle, gridColumn: isMobile ? "1 / -1" : "1 / -1" }}>
                        <ExperienceSegmentsEditor
                          experienceYears={Math.max(0, Number(editExperienceYears || 0))}
                          segments={experienceSegments}
                          onChange={setExperienceSegments}
                          domains={domains}
                          skills={skillOptions}
                          disabled={savingBasics}
                        />
                      </div>
                    </>
                  )}
                </div>

                <div style={actionRowStyle}>
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    style={{
                      padding: "12px 18px",
                      borderRadius: 14,
                      border: "1px solid rgba(16,185,129,0.30)",
                      background: "rgba(16,185,129,0.10)",
                      color: "#065f46",
                      fontWeight: 800,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <IconCamera size={18} />
                    {uploadingAvatar ? "Uploading..." : "Choose photo"}
                  </button>

                  {((user as any)?.avatarUrl ?? avatarUrl) && (
                    <button
                      type="button"
                      onClick={() => setShowRemovePhotoConfirm(true)}
                      disabled={removingAvatar}
                      style={{
                        padding: "12px 18px",
                        borderRadius: 14,
                        border: "1px solid rgba(239,68,68,0.25)",
                        background: "rgba(239,68,68,0.08)",
                        color: "#991b1b",
                        fontWeight: 800,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <IconTrash size={18} />
                      {removingAvatar ? "Removing..." : "Remove photo"}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={onSaveBasics}
                    disabled={savingBasics}
                    style={{
                      padding: "12px 18px",
                      borderRadius: 14,
                      border: "1px solid rgba(15,23,42,0.08)",
                      background: "#0b0b0f",
                      color: "#fff",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    {savingBasics ? "Saving..." : "Save changes"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const uAny = user as any;
                      setAvatarUrl(uAny.avatarUrl ?? "");
                      setTelephone(user.telephone ?? "");
                      setIsEditingBasics(false);
                    }}
                    style={{
                      padding: "12px 18px",
                      borderRadius: 14,
                      border: "1px solid color-mix(in srgb, var(--border) 72%, transparent)",
                      background: "var(--surface)",
                      color: "var(--text)",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                </div>

                {error ? <div style={{ ...S.errorText, marginTop: 14 }}>{error}</div> : null}
              </div>
            )}

            <div style={{ height: 18 }} />

            {tab === "overview" && (
              <OverviewTab
                user={user}
                departmentName={getDepartmentName(user, departmentNameById)}
                roleLabel={roleLabel(user.role)}
              />
            )}

            {tab === "feedback" && <FeedbackTab />}

            {tab === "history" && (
              <HistoryTab
                jobTitle={editJobTitle}
                segments={experienceSegments}
                skills={skillOptions}
              />
            )}

            {showPhotoLightbox && ((user as any)?.avatarUrl ?? avatarUrl) && (
              <div
                role="dialog"
                aria-modal="true"
                aria-label="Profile photo enlarged"
                style={{
                  position: "fixed",
                  inset: 0,
                  zIndex: 10000,
                  background: "rgba(0,0,0,0.92)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 24,
                }}
                onClick={() => setShowPhotoLightbox(false)}
              >
                <button
                  type="button"
                  onClick={() => setShowPhotoLightbox(false)}
                  aria-label="Close"
                  style={{
                    position: "absolute",
                    top: 20,
                    right: 20,
                    width: 44,
                    height: 44,
                    borderRadius: 999,
                    border: "none",
                    background: "rgba(255,255,255,0.15)",
                    color: "#fff",
                    fontSize: 22,
                    cursor: "pointer",
                    display: "grid",
                    placeItems: "center",
                    fontWeight: 300,
                  }}
                >
                  ×
                </button>

                <img
                  src={(user as any)?.avatarUrl ?? avatarUrl}
                  alt={user.name}
                  style={{
                    maxWidth: "min(90vw, 560px)",
                    maxHeight: "85vh",
                    objectFit: "contain",
                    borderRadius: 12,
                    boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}

            {showRemovePhotoConfirm && (
              <div
                style={{
                  position: "fixed",
                  inset: 0,
                  zIndex: 9999,
                  background: "rgba(0,0,0,0.5)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 20,
                }}
                onClick={() => setShowRemovePhotoConfirm(false)}
              >
                <div
                  style={{
                    background: "#fff",
                    borderRadius: 20,
                    padding: "28px 24px",
                    maxWidth: 340,
                    width: "100%",
                    boxShadow: "0 24px 64px rgba(0,0,0,0.28)",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div style={{ textAlign: "center", marginBottom: 24 }}>
                    <div
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 999,
                        background: "rgba(239,68,68,0.12)",
                        display: "grid",
                        placeItems: "center",
                        margin: "0 auto 14px",
                      }}
                    >
                      <IconTrash size={28} color="#dc2626" />
                    </div>

                    <div style={{ fontWeight: 900, fontSize: 18, color: "#0f172a" }}>
                      Remove photo?
                    </div>

                    <div style={{ fontSize: 14, color: "#64748b", marginTop: 8, lineHeight: 1.5 }}>
                      Your profile photo will be removed. You can add another one anytime.
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                    <button
                      type="button"
                      onClick={() => setShowRemovePhotoConfirm(false)}
                      style={{
                        padding: "12px 22px",
                        borderRadius: 12,
                        border: "1px solid #e2e8f0",
                        background: "#f8fafc",
                        fontWeight: 800,
                        fontSize: 14,
                        cursor: "pointer",
                        color: "#475569",
                      }}
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={() => onRemoveAvatar()}
                      disabled={removingAvatar}
                      style={{
                        padding: "12px 22px",
                        borderRadius: 12,
                        border: "none",
                        background: "#dc2626",
                        color: "#fff",
                        fontWeight: 800,
                        fontSize: 14,
                        cursor: removingAvatar ? "wait" : "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        boxShadow: "0 2px 8px rgba(220,38,38,0.35)",
                      }}
                    >
                      <IconTrash size={18} color="#fff" />
                      {removingAvatar ? "Removing..." : "Remove"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}