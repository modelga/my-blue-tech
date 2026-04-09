"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authCard, authDividerText, authInput, authLink, authPrimaryButton, authSubtitle, authTitle, authWrapper, errorBanner } from "@/lib/styles";

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
    <div style={authWrapper}>
      <div style={authCard}>
        <h1 style={authTitle}>Create an account</h1>
        <p style={authSubtitle}>Blue Technologies Dashboard</p>

        {error && <p style={errorBanner}>{error}</p>}

        <form onSubmit={handleSubmit}>
          <input name="username" type="text" placeholder="Username" required style={authInput} />
          <input name="password" type="password" placeholder="Password" required minLength={8} style={authInput} />
          <input name="confirm" type="password" placeholder="Confirm password" required style={authInput} />
          <button type="submit" disabled={pending} style={{ ...authPrimaryButton, opacity: pending ? 0.7 : 1 }}>
            {pending ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p style={authDividerText}>
          Already have an account?{" "}
          <a href="/signin" style={authLink}>
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}
