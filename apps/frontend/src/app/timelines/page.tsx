import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function TimelinesPage() {
  const session = await auth();
  if (!session) redirect("/signin");

  return (
    <div>
      <div style={styles.header}>
        <h2 style={styles.title}>Timelines</h2>
        <a href="/timelines/new" style={styles.newButton}>
          + New Timeline
        </a>
      </div>

      <p style={styles.empty}>
        No timelines yet. Create one to start adding entries.
      </p>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "2rem",
  },
  title: {
    margin: 0,
    fontSize: "1.5rem",
    fontWeight: 700,
  },
  newButton: {
    padding: "0.5rem 1.25rem",
    background: "#2563eb",
    color: "#fff",
    borderRadius: 8,
    textDecoration: "none",
    fontWeight: 600,
    fontSize: "0.9rem",
  },
  empty: {
    color: "#6b7280",
    textAlign: "center",
    padding: "3rem 0",
    border: "1px dashed #e5e7eb",
    borderRadius: 10,
    background: "#fff",
  },
};
