import { auth } from "@/auth";

export default async function DashboardPage() {
  const session = await auth();

  if (!session) {
    return (
      <div style={styles.hero}>
        <h2 style={styles.heroTitle}>MyOS-like Document Session Dashboard</h2>
        <p style={styles.heroSubtitle}>
          Process Blue Documents deterministically via Timelines and Document
          Sessions.
        </p>
        <div style={styles.heroActions}>
          <a href="/signin" style={styles.primaryButton}>
            Sign in
          </a>
          <a href="/register" style={styles.secondaryButton}>
            Create an account
          </a>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 style={styles.pageTitle}>
        Welcome, {session.user?.name ?? session.user?.email}
      </h2>

      <div style={styles.grid}>
        <a href="/timelines" style={styles.card}>
          <h3 style={styles.cardTitle}>Timelines</h3>
          <p style={styles.cardBody}>
            Create and manage event timelines. Add entries to drive Document
            Sessions.
          </p>
        </a>

        <a href="/documents" style={styles.card}>
          <h3 style={styles.cardTitle}>Manage Documents</h3>
          <p style={styles.cardBody}>
            View and manage your Documents. See how timelines have affected
            them.
          </p>
        </a>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  hero: {
    textAlign: "center",
    paddingTop: "4rem",
  },
  heroTitle: {
    fontSize: "2rem",
    fontWeight: 700,
    margin: "0 0 1rem",
  },
  heroSubtitle: {
    color: "#6b7280",
    maxWidth: 520,
    margin: "0 auto 2rem",
    lineHeight: 1.6,
  },
  heroActions: {
    display: "flex",
    gap: "1rem",
    justifyContent: "center",
  },
  primaryButton: {
    padding: "0.75rem 1.75rem",
    background: "#2563eb",
    color: "#fff",
    borderRadius: 8,
    textDecoration: "none",
    fontWeight: 600,
    fontSize: "1rem",
  },
  secondaryButton: {
    padding: "0.75rem 1.75rem",
    background: "#fff",
    color: "#374151",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    textDecoration: "none",
    fontWeight: 600,
    fontSize: "1rem",
  },
  pageTitle: {
    margin: "0 0 2rem",
    fontSize: "1.5rem",
    fontWeight: 700,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: "1.25rem",
  },
  card: {
    display: "block",
    padding: "1.5rem",
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    textDecoration: "none",
    color: "inherit",
    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
  },
  cardTitle: {
    margin: "0 0 0.5rem",
    fontSize: "1.125rem",
    fontWeight: 600,
    color: "#111",
  },
  cardBody: {
    margin: 0,
    color: "#6b7280",
    lineHeight: 1.6,
    fontSize: "0.9rem",
  },
};
