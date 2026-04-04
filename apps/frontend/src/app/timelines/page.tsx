import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getTimelines } from "@/lib/api";
import { newItemButton, pageHeader, pageTitle } from "@/lib/styles";
import { TimelineList } from "./Timelines";

export default async function TimelinesPage() {
  const session = await auth();
  if (!session) redirect("/signin");

  const timelines = await getTimelines();

  return (
    <div>
      <div style={pageHeader}>
        <h2 style={pageTitle}>Timelines</h2>
        <a href="/timelines/new" style={newItemButton}>
          + New Timeline
        </a>
      </div>

      <TimelineList timelines={timelines} />
    </div>
  );
}
