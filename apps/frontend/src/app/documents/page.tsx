import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { emptyState, newItemButton, pageHeader, pageTitle } from "@/lib/styles";

export default async function DocumentsPage() {
  const session = await auth();
  if (!session) redirect("/signin");

  return (
    <div>
      <div style={pageHeader}>
        <h2 style={pageTitle}>Blue Documents</h2>
        <a href="/documents/new" style={newItemButton}>
          + New Document
        </a>
      </div>

      <p style={emptyState}>
        No documents yet. Create one to start a Document Session.
      </p>
    </div>
  );
}
