import { auth } from "@/auth";
import {
  dashCard,
  dashCardBody,
  dashCardTitle,
  dashGrid,
  heroActions,
  heroPrimaryButton,
  heroSecondaryButton,
  heroSection,
  heroSubtitle,
  heroTitle,
  pageTitle,
} from "@/lib/styles";

export default async function DashboardPage() {
  const session = await auth();

  if (!session) {
    return (
      <div style={heroSection}>
        <h2 style={heroTitle}>MyOS-like Document Session Dashboard</h2>
        <p style={heroSubtitle}>
          Process Blue Documents deterministically via Timelines and Document
          Sessions.
        </p>
        <div style={heroActions}>
          <a href="/signin" style={heroPrimaryButton}>
            Sign in
          </a>
          <a href="/register" style={heroSecondaryButton}>
            Create an account
          </a>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 style={pageTitle}>
        Welcome, {session.user?.name ?? session.user?.email}
      </h2>

      <div style={dashGrid}>
        <a href="/timelines" style={dashCard}>
          <h3 style={dashCardTitle}>Timelines</h3>
          <p style={dashCardBody}>
            Create and manage event timelines. Add entries to drive Document
            Sessions.
          </p>
        </a>

        <a href="/documents" style={dashCard}>
          <h3 style={dashCardTitle}>Manage Documents</h3>
          <p style={dashCardBody}>
            View and manage your Documents. See how timelines have affected
            them.
          </p>
        </a>
      </div>
    </div>
  );
}
