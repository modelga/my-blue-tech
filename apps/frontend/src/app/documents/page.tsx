import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getDocuments } from "@/lib/api";
import {
  cardActionButton,
  cardIdText,
  cardMeta,
  dashCard,
  dashCardTitle,
  docChangesBadge,
  emptyState,
  newItemButton,
  pageHeader,
  pageTitle,
} from "@/lib/styles";

export default async function DocumentsPage() {
  const session = await auth();
  if (!session) redirect("/signin");

  const documents = await getDocuments();

  return (
    <div>
      <div style={pageHeader}>
        <h2 style={pageTitle}>Blue Documents</h2>
        <a href="/documents/new" style={newItemButton}>
          + New Document
        </a>
      </div>

      {documents.length === 0 ? (
        <p style={emptyState}>No documents yet. Create one to start a Document Session.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {documents.map((doc) => (
            <div key={doc.id} style={{ ...dashCard, display: "flex", alignItems: "center", gap: "1.5rem" }}>
              <p style={{ ...dashCardTitle, flex: "1 1 0", minWidth: 0, margin: 0 }}>{doc.name}</p>
              <p style={{ ...cardIdText, flex: "2 1 0", minWidth: 0, margin: 0 }}>{doc.id}</p>
              <p style={{ ...cardMeta, flex: "0 0 auto", margin: 0 }}>{new Date(doc.created_at).toLocaleString()}</p>
              <p style={{ ...cardMeta, flex: "0 0 auto", margin: 0 }}>
                <span style={docChangesBadge}>{doc.changes_count}</span>
                {" changes"}
              </p>
              <a href={`/documents/${doc.id}`} style={{ ...cardActionButton, marginTop: 0 }}>
                Show
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
