export default function DashboardPage() {
  return (
    <div>
      <h2>Dashboard</h2>
      <p style={{ color: "#666" }}>
        Stub — authentication, timelines, and document sessions coming soon.
      </p>
      <nav style={{ display: "flex", gap: "1rem", marginTop: "1.5rem" }}>
        <a href="/timelines">Timelines</a>
        <a href="/sessions">Document Sessions</a>
      </nav>
    </div>
  );
}
