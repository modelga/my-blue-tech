import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { emptyState, newItemButton, pageHeader, pageTitle } from "@/lib/styles";

export default async function TimelinesPage() {
  const session = await auth();
  if (!session) redirect("/signin");

  return (
    <div>
      <div style={pageHeader}>
        <h2 style={pageTitle}>Timelines</h2>
        <a href="/timelines/new" style={newItemButton}>
          + New Timeline
        </a>
      </div>

      <p style={emptyState}>
        No timelines yet. Create one to start adding entries.
      </p>
    </div>
  );
}
