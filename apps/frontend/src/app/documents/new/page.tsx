"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { load as parseYaml, dump as dumpYaml } from "js-yaml";

type Format = "json" | "yaml";

const EXAMPLES: Record<Format, string> = {
  json: JSON.stringify(
    { channels: [{ name: "main", timelineId: "" }] },
    null,
    2,
  ),
  yaml: `channels:\n  - name: main\n    timelineId: ""\n`,
};

function parsePayload(value: string, format: Format): { ok: true; data: unknown } | { ok: false; error: string } {
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
      <div style={styles.header}>
        <a href="/documents" style={styles.back}>← Documents</a>
        <h2 style={styles.title}>New Blue Document</h2>
      </div>

      <form onSubmit={handleSubmit} style={styles.form}>
        {error && <p style={styles.errorBanner}>{error}</p>}

        <label style={styles.label}>
          Name
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. My First Document"
            required
            style={styles.input}
          />
        </label>

        <div style={styles.label}>
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
              ...styles.textarea,
              borderColor: payloadError ? "#fca5a5" : "#e5e7eb",
            }}
          />
          {payloadError && <span style={styles.fieldError}>{payloadError}</span>}
        </div>

        <div style={styles.actions}>
          <a href="/documents" style={styles.cancelButton}>Cancel</a>
          <button
            type="submit"
            disabled={pending || !!payloadError}
            style={{
              ...styles.submitButton,
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

const styles: Record<string, React.CSSProperties> = {
  header: {
    marginBottom: "1.75rem",
  },
  back: {
    fontSize: "0.875rem",
    color: "#6b7280",
    textDecoration: "none",
    display: "inline-block",
    marginBottom: "0.5rem",
  },
  title: {
    margin: 0,
    fontSize: "1.5rem",
    fontWeight: 700,
  },
  form: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    padding: "2rem",
    display: "flex",
    flexDirection: "column",
    gap: "1.25rem",
  },
  errorBanner: {
    background: "#fef2f2",
    border: "1px solid #fecaca",
    color: "#dc2626",
    borderRadius: 6,
    padding: "0.75rem 1rem",
    margin: 0,
    fontSize: "0.875rem",
  },
  label: {
    display: "flex",
    flexDirection: "column",
    gap: "0.375rem",
    fontSize: "0.9rem",
    fontWeight: 500,
    color: "#374151",
  },
  input: {
    padding: "0.625rem 0.75rem",
    border: "1px solid #e5e7eb",
    borderRadius: 6,
    fontSize: "0.95rem",
    fontFamily: "inherit",
  },
  payloadHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  formatToggle: {
    display: "flex",
    border: "1px solid #e5e7eb",
    borderRadius: 6,
    overflow: "hidden",
  },
  formatButton: {
    padding: "0.2rem 0.75rem",
    background: "#fff",
    color: "#6b7280",
    border: "none",
    borderRight: "1px solid #e5e7eb",
    fontSize: "0.75rem",
    fontWeight: 600,
    cursor: "pointer",
    letterSpacing: "0.05em",
  },
  formatButtonActive: {
    background: "#2563eb",
    color: "#fff",
  },
  textarea: {
    padding: "0.75rem",
    border: "1px solid #e5e7eb",
    borderRadius: 6,
    fontSize: "0.85rem",
    fontFamily: "ui-monospace, SFMono-Regular, monospace",
    resize: "vertical",
    lineHeight: 1.5,
  },
  fieldError: {
    fontSize: "0.8rem",
    color: "#dc2626",
  },
  actions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "0.75rem",
    paddingTop: "0.5rem",
  },
  cancelButton: {
    padding: "0.625rem 1.25rem",
    background: "#fff",
    color: "#374151",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    textDecoration: "none",
    fontWeight: 500,
    fontSize: "0.9rem",
    cursor: "pointer",
  },
  submitButton: {
    padding: "0.625rem 1.5rem",
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    fontWeight: 600,
    fontSize: "0.9rem",
    cursor: "pointer",
  },
};
