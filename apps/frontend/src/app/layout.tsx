import type { Metadata } from "next";
import { auth, signOut } from "@/auth";

export const metadata: Metadata = {
  title: "Blue Technologies",
  description: "MyOS-like Document Session Dashboard",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <html lang="en">
      <body style={styles.body}>
        <header style={styles.header}>
          <a href="/" style={styles.brand}>
            Blue Technologies
          </a>
          <nav style={styles.nav}>
            {session ? (
              <>
                <span style={styles.userLabel}>
                  {session.user?.name ?? session.user?.email}
                </span>
                <form
                  action={async () => {
                    "use server";
                    await signOut({ redirectTo: "/signin" });
                  }}
                >
                  <button type="submit" style={styles.signOutButton}>
                    Sign out
                  </button>
                </form>
              </>
            ) : (
              <>
                <a href="/signin" style={styles.navLink}>
                  Sign in
                </a>
                <a href="/register" style={styles.navLinkPrimary}>
                  Register
                </a>
              </>
            )}
          </nav>
        </header>
        <main style={styles.main}>{children}</main>
      </body>
    </html>
  );
}

const styles: Record<string, React.CSSProperties> = {
  body: {
    fontFamily: "system-ui, -apple-system, sans-serif",
    margin: 0,
    padding: 0,
    background: "#f9fafb",
    color: "#111",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 2rem",
    height: 56,
    background: "#fff",
    borderBottom: "1px solid #e5e7eb",
  },
  brand: {
    fontWeight: 700,
    fontSize: "1rem",
    color: "#111",
    textDecoration: "none",
  },
  nav: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
  },
  userLabel: {
    fontSize: "0.875rem",
    color: "#6b7280",
  },
  navLink: {
    fontSize: "0.875rem",
    color: "#374151",
    textDecoration: "none",
    fontWeight: 500,
  },
  navLinkPrimary: {
    fontSize: "0.875rem",
    color: "#fff",
    background: "#2563eb",
    padding: "0.375rem 0.875rem",
    borderRadius: 6,
    textDecoration: "none",
    fontWeight: 500,
  },
  signOutButton: {
    fontSize: "0.875rem",
    color: "#374151",
    background: "none",
    border: "1px solid #e5e7eb",
    padding: "0.375rem 0.875rem",
    borderRadius: 6,
    cursor: "pointer",
    fontWeight: 500,
  },
  main: {
    maxWidth: 900,
    margin: "0 auto",
    padding: "2rem",
  },
};
