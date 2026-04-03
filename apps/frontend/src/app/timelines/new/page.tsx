import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function NewTimelinePage() {
  const session = await auth();
  if (!session) redirect("/signin");

  async function createTimeline(formData: FormData) {
    "use server";

    const name = (formData.get("name") as string | null)?.trim();
    const description = (formData.get("description") as string | null)?.trim();

    if (!name) return;

    const id = crypto.randomUUID();

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/timelines`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, name, description: description || undefined }),
    });

    if (!res.ok) {
      // TODO: surface error to user once error handling is added
      console.error("[timelines] create failed", await res.text());
      return;
    }

    redirect("/timelines");
  }

  return (
    <div>
      <div style={styles.header}>
        <a href="/timelines" style={styles.back}>← Timelines</a>
        <h2 style={styles.title}>New Timeline</h2>
      </div>

      <form action={createTimeline} style={styles.form}>
        <label style={styles.label}>
          Name
          <input
            name="name"
            type="text"
            placeholder="e.g. Product Launch Events"
            required
            style={styles.input}
          />
        </label>

        <label style={styles.label}>
          Description
          <textarea
            name="description"
            placeholder="Optional description…"
            rows={4}
            style={styles.textarea}
          />
        </label>

        <div style={styles.actions}>
          <a href="/timelines" style={styles.cancelButton}>Cancel</a>
          <button type="submit" style={styles.submitButton}>
            Create Timeline
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
  textarea: {
    padding: "0.625rem 0.75rem",
    border: "1px solid #e5e7eb",
    borderRadius: 6,
    fontSize: "0.95rem",
    fontFamily: "inherit",
    resize: "vertical",
    lineHeight: 1.5,
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
