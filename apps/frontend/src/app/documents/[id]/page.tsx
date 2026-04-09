import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getDocument, getDocumentHistory } from "@/lib/api";
import { formBack, formPageHeader, pageTitle } from "@/lib/styles";
import { DocumentDetail } from "./DocumentDetail";

export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) redirect("/signin");

  const { id } = await params;
  const [document, history] = await Promise.all([getDocument(id), getDocumentHistory(id)]);

  return (
    <div>
      <div style={formPageHeader}>
        <a href="/documents" style={formBack}>
          ← Documents
        </a>
        <h2 style={pageTitle}>{document.name}</h2>
      </div>
      <DocumentDetail document={document} history={history} />
    </div>
  );
}
