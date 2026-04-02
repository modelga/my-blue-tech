import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blue Technologies",
  description: "MyOS-like Document Session Dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0, padding: "2rem" }}>
        <header style={{ borderBottom: "1px solid #eee", paddingBottom: "1rem", marginBottom: "2rem" }}>
          <h1 style={{ margin: 0, fontSize: "1.25rem" }}>Blue Technologies</h1>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
