"use client";

import { dump as dumpYaml, load as parseYaml } from "js-yaml";
import { useRouter } from "next/navigation";
import type { CSSProperties } from "react";
import { useState } from "react";
import {
  cancelButton,
  colors,
  errorBanner,
  fieldError,
  formActions,
  formBack,
  formCard,
  formInput,
  formLabel,
  formPageHeader,
  monoTextarea,
  pageTitle,
  radius,
  submitButton,
} from "@/lib/styles";

type Format = "json" | "yaml";

const EXAMPLES: Record<Format, string> = {
  json: JSON.stringify(
    { channels: [{ name: "main", timelineId: "" }] },
    null,
    2,
  ),
  yaml: `channels:\n  - name: main\n    timelineId: ""\n`,
};

function parsePayload(
  value: string,
  format: Format,
): { ok: true; data: unknown } | { ok: false; error: string } {
  try {
    const data = format === "json" ? JSON.parse(value) : parseYaml(value);
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export default function NewDocumentPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [format, setFormat] = useState<Format>("json");
  const [payload, setPayload] = useState(EXAMPLES.json);
  const [payloadError, setPayloadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function handleFormatChange(next: Format) {
    if (next === format) return;
    // Try to convert current content; fall back to example if it can't be parsed.
    const parsed = parsePayload(payload, format);
    if (parsed.ok) {
      const converted =
        next === "json"
          ? JSON.stringify(parsed.data, null, 2)
          : dumpYaml(parsed.data as object, { indent: 2 });
      setPayload(converted);
      setPayloadError(null);
    } else {
      setPayload(EXAMPLES[next]);
      setPayloadError(null);
    }
    setFormat(next);
  }

  function handlePayloadChange(value: string) {
    setPayload(value);
    const result = parsePayload(value, format);
    setPayloadError(result.ok ? null : result.error);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = parsePayload(payload, format);
    if (!result.ok) {
      setPayloadError(result.error);
      return;
    }

    setError(null);
    setPending(true);

    const res = await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), document: result.data }),
    });

    if (res.ok) {
      router.push("/documents");
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to create document.");
      setPending(false);
    }
  }

  return (
    <div>
      <div style={formPageHeader}>
        <a href="/documents" style={formBack}>
          ← Documents
        </a>
        <h2 style={pageTitle}>New Blue Document</h2>
      </div>

      <form onSubmit={handleSubmit} style={formCard}>
        {error && <p style={errorBanner}>{error}</p>}

        <label style={formLabel}>
          Name
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. My First Document"
            required
            style={formInput}
          />
        </label>

        <div style={formLabel}>
          <div style={styles.payloadHeader}>
            <span>Document payload</span>
            <div style={styles.formatToggle}>
              {(["json", "yaml"] as Format[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => handleFormatChange(f)}
                  style={{
                    ...styles.formatButton,
                    ...(format === f ? styles.formatButtonActive : {}),
                  }}
                >
                  {f.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <textarea
            value={payload}
            onChange={(e) => handlePayloadChange(e.target.value)}
            rows={16}
            spellCheck={false}
            style={{
              ...monoTextarea,
              borderColor: payloadError ? "#fca5a5" : colors.border,
            }}
          />
          {payloadError && <span style={fieldError}>{payloadError}</span>}
        </div>

        <div style={formActions}>
          <a href="/documents" style={cancelButton}>
            Cancel
          </a>
          <button
            type="submit"
            disabled={pending || !!payloadError}
            style={{
              ...submitButton,
              opacity: pending || !!payloadError ? 0.6 : 1,
            }}
          >
            {pending ? "Creating…" : "Create Document"}
          </button>
        </div>
      </form>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  payloadHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  formatToggle: {
    display: "flex",
    border: `1px solid ${colors.border}`,
    borderRadius: radius.sm,
    overflow: "hidden",
  },
  formatButton: {
    padding: "0.2rem 0.75rem",
    background: colors.white,
    color: colors.textMuted,
    border: "none",
    borderRight: `1px solid ${colors.border}`,
    fontSize: "0.75rem",
    fontWeight: 600,
    cursor: "pointer",
    letterSpacing: "0.05em",
  },
  formatButtonActive: {
    background: colors.blue,
    color: colors.white,
  },
};
