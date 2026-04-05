"use client";

import { load as parseYaml } from "js-yaml";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { type Format, PayloadEditor } from "@/components/PayloadEditor";
import { cancelButton, errorBanner, formActions, formBack, formCard, formInput, formLabel, formPageHeader, pageTitle, submitButton } from "@/lib/styles";

const EXAMLE_DOCUMENT = `
  name: Counter
  counter: 0
  contracts:
    ownerChannel:
      type: MyOS/MyOS Timeline Channel
      timelineId: '{{ timelineId }}'
    increment:
      description: Increment the counter by the given number
      type: Conversation/Operation
      channel: ownerChannel
      request:
        description: Represents a value by which counter will be incremented
        type: Integer
    incrementImpl:
      type: Conversation/Sequential Workflow Operation
      operation: increment
      steps:
        - type: Conversation/Update Document
          changeset:
            - op: replace
              path: /counter
              val: \${event.message.request + document('/counter')}
    decrement:
      description: Decrement the counter by the given number
      type: Conversation/Operation
      channel: ownerChannel
      request:
        description: Value to subtract
        type: Integer
    decrementImpl:
      type: Conversation/Sequential Workflow Operation
      operation: decrement
      steps:
        - type: Conversation/Update Document
          changeset:
            - op: replace
              path: /counter
              val: \${document('/counter') - event.message.request}
`;

const EXAMPLES: Record<Format, string> = {
  json: JSON.stringify(parseYaml(EXAMLE_DOCUMENT), null, 2),
  yaml: EXAMLE_DOCUMENT,
};

export default function NewDocumentPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [parsed, setParsed] = useState<unknown | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (parseError || !parsed) {
      setError("Fix the payload errors before submitting.");
      return;
    }

    setError(null);
    setPending(true);

    const res = await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), document: parsed }),
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
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. My First Document" required style={formInput} />
        </label>

        <PayloadEditor
          label="Document payload"
          defaultFormat="json"
          defaultValue={EXAMPLES.json}
          examples={EXAMPLES}
          rows={16}
          onChange={(_raw, p, err) => {
            setParsed(p);
            setParseError(err);
          }}
        />

        <div style={formActions}>
          <a href="/documents" style={cancelButton}>
            Cancel
          </a>
          <button
            type="submit"
            disabled={pending || !!parseError}
            style={{
              ...submitButton,
              opacity: pending || !!parseError ? 0.6 : 1,
            }}
          >
            {pending ? "Creating…" : "Create Document"}
          </button>
        </div>
      </form>
    </div>
  );
}
