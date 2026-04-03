import type { CSSProperties } from "react";

// ── Design tokens ─────────────────────────────────────────────────────────────

export const colors = {
  blue: "#2563eb",
  white: "#fff",
  pageBg: "#f9fafb",
  text: "#111",
  textMuted: "#6b7280",
  textBody: "#374151",
  border: "#e5e7eb",
  errorBg: "#fef2f2",
  errorBorder: "#fecaca",
  errorText: "#dc2626",
} as const;

export const radius = {
  sm: 6,
  md: 8,
  lg: 10,
  xl: 12,
} as const;

// ── Shared style objects ──────────────────────────────────────────────────────

/** Full-height centred wrapper used on auth pages (sign-in, register). */
export const authWrapper: CSSProperties = {
  minHeight: "80vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

/** Narrow card centred on auth pages. */
export const authCard: CSSProperties = {
  width: "100%",
  maxWidth: 400,
  padding: "2.5rem",
  border: `1px solid ${colors.border}`,
  borderRadius: radius.xl,
  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
  background: colors.white,
  textAlign: "center",
};

export const authTitle: CSSProperties = {
  margin: "0 0 0.25rem",
  fontSize: "1.5rem",
  fontWeight: 700,
  color: colors.text,
};

export const authSubtitle: CSSProperties = {
  margin: "0 0 2rem",
  color: colors.textMuted,
  fontSize: "0.95rem",
};

/** Full-width stacked input for auth forms. */
export const authInput: CSSProperties = {
  display: "block",
  width: "100%",
  padding: "0.625rem 0.75rem",
  marginBottom: "0.75rem",
  border: `1px solid ${colors.border}`,
  borderRadius: radius.sm,
  fontSize: "0.95rem",
  boxSizing: "border-box",
};

/** Full-width primary submit button for auth forms. */
export const authPrimaryButton: CSSProperties = {
  width: "100%",
  padding: "0.75rem 1.5rem",
  background: colors.blue,
  color: colors.white,
  border: "none",
  borderRadius: radius.md,
  fontSize: "1rem",
  fontWeight: 600,
  cursor: "pointer",
  marginBottom: "1.5rem",
};

export const authDividerText: CSSProperties = {
  margin: 0,
  color: colors.textMuted,
  fontSize: "0.875rem",
};

export const authLink: CSSProperties = {
  color: colors.blue,
  textDecoration: "none",
  fontWeight: 500,
};

// ── Page-level layout ─────────────────────────────────────────────────────────

/** Flex row used at the top of list pages (title left, action button right). */
export const pageHeader: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: "2rem",
};

export const pageTitle: CSSProperties = {
  margin: 0,
  fontSize: "1.5rem",
  fontWeight: 700,
};

/** "New …" anchor-button in list page headers. */
export const newItemButton: CSSProperties = {
  padding: "0.5rem 1.25rem",
  background: colors.blue,
  color: colors.white,
  borderRadius: radius.md,
  textDecoration: "none",
  fontWeight: 600,
  fontSize: "0.9rem",
};

/** Dashed placeholder shown when a list is empty. */
export const emptyState: CSSProperties = {
  color: colors.textMuted,
  textAlign: "center",
  padding: "3rem 0",
  border: `1px dashed ${colors.border}`,
  borderRadius: radius.lg,
  background: colors.white,
};

// ── Forms ─────────────────────────────────────────────────────────────────────

/** Small back-link at the top of create/edit pages. */
export const formBack: CSSProperties = {
  fontSize: "0.875rem",
  color: colors.textMuted,
  textDecoration: "none",
  display: "inline-block",
  marginBottom: "0.5rem",
};

/** Header area above the form card on create/edit pages. */
export const formPageHeader: CSSProperties = {
  marginBottom: "1.75rem",
};

/** White card that wraps a form. */
export const formCard: CSSProperties = {
  background: colors.white,
  border: `1px solid ${colors.border}`,
  borderRadius: radius.lg,
  padding: "2rem",
  display: "flex",
  flexDirection: "column",
  gap: "1.25rem",
};

/** Column-flex label with gap for the input below. */
export const formLabel: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.375rem",
  fontSize: "0.9rem",
  fontWeight: 500,
  color: colors.textBody,
};

export const formInput: CSSProperties = {
  padding: "0.625rem 0.75rem",
  border: `1px solid ${colors.border}`,
  borderRadius: radius.sm,
  fontSize: "0.95rem",
  fontFamily: "inherit",
};

export const formTextarea: CSSProperties = {
  padding: "0.625rem 0.75rem",
  border: `1px solid ${colors.border}`,
  borderRadius: radius.sm,
  fontSize: "0.95rem",
  fontFamily: "inherit",
  resize: "vertical",
  lineHeight: 1.5,
};

export const monoTextarea: CSSProperties = {
  ...formTextarea,
  fontSize: "0.85rem",
  fontFamily: "ui-monospace, SFMono-Regular, monospace",
  padding: "0.75rem",
};

/** Right-aligned row of Cancel + Submit buttons. */
export const formActions: CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: "0.75rem",
  paddingTop: "0.5rem",
};

export const cancelButton: CSSProperties = {
  padding: "0.625rem 1.25rem",
  background: colors.white,
  color: colors.textBody,
  border: `1px solid ${colors.border}`,
  borderRadius: radius.md,
  textDecoration: "none",
  fontWeight: 500,
  fontSize: "0.9rem",
  cursor: "pointer",
};

export const submitButton: CSSProperties = {
  padding: "0.625rem 1.5rem",
  background: colors.blue,
  color: colors.white,
  border: "none",
  borderRadius: radius.md,
  fontWeight: 600,
  fontSize: "0.9rem",
  cursor: "pointer",
};

// ── Feedback ──────────────────────────────────────────────────────────────────

/** Red banner shown at the top of a form on API errors. */
export const errorBanner: CSSProperties = {
  background: colors.errorBg,
  border: `1px solid ${colors.errorBorder}`,
  color: colors.errorText,
  borderRadius: radius.sm,
  padding: "0.75rem 1rem",
  margin: 0,
  fontSize: "0.875rem",
};

/** Inline field-level validation message. */
export const fieldError: CSSProperties = {
  fontSize: "0.8rem",
  color: colors.errorText,
};

// ── Dashboard ─────────────────────────────────────────────────────────────────

export const dashGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
  gap: "1.25rem",
};

export const dashCard: CSSProperties = {
  display: "block",
  padding: "1.5rem",
  background: colors.white,
  border: `1px solid ${colors.border}`,
  borderRadius: radius.lg,
  textDecoration: "none",
  color: "inherit",
  boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
};

export const dashCardTitle: CSSProperties = {
  margin: "0 0 0.5rem",
  fontSize: "1.125rem",
  fontWeight: 600,
  color: colors.text,
};

export const dashCardBody: CSSProperties = {
  margin: 0,
  color: colors.textMuted,
  lineHeight: 1.6,
  fontSize: "0.9rem",
};

export const heroSection: CSSProperties = {
  textAlign: "center",
  paddingTop: "4rem",
};

export const heroTitle: CSSProperties = {
  fontSize: "2rem",
  fontWeight: 700,
  margin: "0 0 1rem",
};

export const heroSubtitle: CSSProperties = {
  color: colors.textMuted,
  maxWidth: 520,
  margin: "0 auto 2rem",
  lineHeight: 1.6,
};

export const heroActions: CSSProperties = {
  display: "flex",
  gap: "1rem",
  justifyContent: "center",
};

export const heroPrimaryButton: CSSProperties = {
  padding: "0.75rem 1.75rem",
  background: colors.blue,
  color: colors.white,
  borderRadius: radius.md,
  textDecoration: "none",
  fontWeight: 600,
  fontSize: "1rem",
};

export const heroSecondaryButton: CSSProperties = {
  padding: "0.75rem 1.75rem",
  background: colors.white,
  color: colors.textBody,
  border: `1px solid ${colors.border}`,
  borderRadius: radius.md,
  textDecoration: "none",
  fontWeight: 600,
  fontSize: "1rem",
};
