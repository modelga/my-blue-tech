"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const fd = new FormData(e.currentTarget);
    const username = fd.get("username") as string;
    const password = fd.get("password") as string;
    const confirm = fd.get("confirm") as string;

    if (password !== confirm) {
      setError("Passwords do not match.");
      setPending(false);
      return;
    }

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (res.ok) {
      router.push("/signin");
    } else {
      const body = await res.json();
      setError(body.error ?? "Registration failed.");
      setPending(false);
    }
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <h1 style={styles.title}>Create an account</h1>
        <p style={styles.subtitle}>Blue Technologies Dashboard</p>

        {error && <p style={styles.error}>{error}</p>}

        <form onSubmit={handleSubmit}>
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
            minLength={8}
            style={styles.input}
          />
          <input
            name="confirm"
            type="password"
            placeholder="Confirm password"
            required
            style={styles.input}
          />
          <button type="submit" disabled={pending} style={styles.primaryButton}>
            {pending ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p style={styles.dividerText}>
          Already have an account?{" "}
          <a href="/signin" style={styles.link}>
            Sign in
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
};
