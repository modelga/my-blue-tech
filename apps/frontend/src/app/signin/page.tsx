import { RedirectType, redirect } from "next/navigation";
import { auth, signIn } from "@/auth";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const session = await auth();
  if (session) redirect("/");

  const { callbackUrl, error } = await searchParams;

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <h1 style={styles.title}>Sign in</h1>
        <p style={styles.subtitle}>Blue Technologies Dashboard</p>

        {error && (
          <p style={styles.error}>
            {error === "CredentialsSignin"
              ? "Invalid username or password."
              : `Error: ${error}`}
          </p>
        )}

        <form
          action={async (formData: FormData) => {
            "use server";
            try {
              await signIn("credentials", {
                username: formData.get("username"),
                password: formData.get("password"),
                redirectTo: callbackUrl ?? "/",
              });
            } catch (e) {
              redirect("?error=CredentialsSignin", RedirectType.replace);
            }
          }}
        >
          <input
            name="username"
            type="text"
            placeholder="Username"
            required
            style={styles.input}
          />
          <input
            name="password"
            type="password"
            placeholder="Password"
            required
            style={styles.input}
          />
          <button type="submit" style={styles.primaryButton}>
            Sign in
          </button>
        </form>

        <p style={styles.dividerText}>
          Don&apos;t have an account?{" "}
          <a href="/register" style={styles.link}>
            Register
          </a>
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    minHeight: "80vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    width: "100%",
    maxWidth: 400,
    padding: "2.5rem",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
    background: "#fff",
    textAlign: "center",
  },
  title: {
    margin: "0 0 0.25rem",
    fontSize: "1.5rem",
    fontWeight: 700,
    color: "#111",
  },
  subtitle: {
    margin: "0 0 2rem",
    color: "#6b7280",
    fontSize: "0.95rem",
  },
  input: {
    display: "block",
    width: "100%",
    padding: "0.625rem 0.75rem",
    marginBottom: "0.75rem",
    border: "1px solid #e5e7eb",
    borderRadius: 6,
    fontSize: "0.95rem",
    boxSizing: "border-box",
  },
  primaryButton: {
    width: "100%",
    padding: "0.75rem 1.5rem",
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    fontSize: "1rem",
    fontWeight: 600,
    cursor: "pointer",
    marginBottom: "1.5rem",
  },
  dividerText: {
    margin: 0,
    color: "#6b7280",
    fontSize: "0.875rem",
  },
  link: {
    color: "#2563eb",
    textDecoration: "none",
    fontWeight: 500,
  },
  error: {
    background: "#fef2f2",
    border: "1px solid #fecaca",
    color: "#dc2626",
    borderRadius: 6,
    padding: "0.75rem 1rem",
    marginBottom: "1.25rem",
    fontSize: "0.875rem",
  },
};
