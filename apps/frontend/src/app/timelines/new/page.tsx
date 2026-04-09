"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  cancelButton,
  errorBanner,
  formActions,
  formBack,
  formCard,
  formInput,
  formLabel,
  formPageHeader,
  formTextarea,
  pageTitle,
  submitButton,
} from "@/lib/styles";

export default function NewTimelinePage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const fd = new FormData(e.currentTarget);
    const name = (fd.get("name") as string).trim();
    const description = (fd.get("description") as string).trim();

    const res = await fetch("/api/timelines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description: description || undefined }),
    });

    if (res.ok) {
      router.push("/timelines");
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to create timeline.");
      setPending(false);
    }
  }

  return (
    <div>
      <div style={formPageHeader}>
        <a href="/timelines" style={formBack}>
          ← Timelines
        </a>
        <h2 style={pageTitle}>New Timeline</h2>
      </div>

      <form onSubmit={handleSubmit} style={formCard}>
        {error && <p style={errorBanner}>{error}</p>}

        <label style={formLabel}>
          Name
          <input name="name" type="text" placeholder="e.g. Product Launch Events" required style={formInput} />
        </label>

        <label style={formLabel}>
          Description
          <textarea name="description" placeholder="Optional description…" rows={4} style={formTextarea} />
        </label>

        <div style={formActions}>
          <a href="/timelines" style={cancelButton}>
            Cancel
          </a>
          <button type="submit" disabled={pending} style={{ ...submitButton, opacity: pending ? 0.7 : 1 }}>
            {pending ? "Creating…" : "Create Timeline"}
          </button>
        </div>
      </form>
    </div>
  );
}
