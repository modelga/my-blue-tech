import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getTimeline, getTimelineEntries } from "@/lib/api";
import {
  formBack,
  formPageHeader,
  pageTitle,
} from "@/lib/styles";
import { TimelineDetail } from "./TimelineDetail";

export default async function TimelinePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) redirect("/signin");

  const { id } = await params;
  const [timeline, entries] = await Promise.all([
    getTimeline(id),
    getTimelineEntries(id),
  ]);

  return (
    <div>
      <div style={formPageHeader}>
        <a href="/timelines" style={formBack}>← Timelines</a>
        <h2 style={pageTitle}>{timeline.name}</h2>
        {timeline.description && (
          <p style={{ margin: "0.25rem 0 0", color: "#6b7280", fontSize: "0.95rem" }}>
            {timeline.description}
          </p>
        )}
      </div>

      <TimelineDetail timeline={timeline} entries={entries} />
    </div>
  );
}
