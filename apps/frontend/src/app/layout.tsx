import type { Metadata } from "next";
import { auth, signOut } from "@/auth";
import { colors, radius } from "@/lib/styles";
import type { CSSProperties } from "react";

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

const styles: Record<string, CSSProperties> = {
  body: {
    fontFamily: "system-ui, -apple-system, sans-serif",
    margin: 0,
    padding: 0,
    background: colors.pageBg,
    color: colors.text,
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 2rem",
    height: 56,
    background: colors.white,
    borderBottom: `1px solid ${colors.border}`,
  },
  brand: {
    fontWeight: 700,
    fontSize: "1rem",
    color: colors.text,
    textDecoration: "none",
  },
  nav: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
  },
  userLabel: {
    fontSize: "0.875rem",
    color: colors.textMuted,
  },
  navLink: {
    fontSize: "0.875rem",
    color: colors.textBody,
    textDecoration: "none",
    fontWeight: 500,
  },
  navLinkPrimary: {
    fontSize: "0.875rem",
    color: colors.white,
    background: colors.blue,
    padding: "0.375rem 0.875rem",
    borderRadius: radius.sm,
    textDecoration: "none",
    fontWeight: 500,
  },
  signOutButton: {
    fontSize: "0.875rem",
    color: colors.textBody,
    background: "none",
    border: `1px solid ${colors.border}`,
    padding: "0.375rem 0.875rem",
    borderRadius: radius.sm,
    cursor: "pointer",
    fontWeight: 500,
  },
  main: {
    maxWidth: 900,
    margin: "0 auto",
    padding: "2rem",
  },
};
