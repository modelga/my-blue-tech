import { RedirectType, redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import {
  authCard,
  authDividerText,
  authInput,
  authLink,
  authPrimaryButton,
  authSubtitle,
  authTitle,
  authWrapper,
  errorBanner,
} from "@/lib/styles";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const session = await auth();
  if (session) redirect("/");

  const { callbackUrl, error } = await searchParams;

  return (
    <div style={authWrapper}>
      <div style={authCard}>
        <h1 style={authTitle}>Sign in</h1>
        <p style={authSubtitle}>Blue Technologies Dashboard</p>

        {error && (
          <p style={errorBanner}>
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
              redirect("/signin?error=CredentialsSignin", RedirectType.replace);
            }
          }}
        >
          <input
            name="username"
            type="text"
            placeholder="Username"
            required
            style={authInput}
          />
          <input
            name="password"
            type="password"
            placeholder="Password"
            required
            style={authInput}
          />
          <button type="submit" style={authPrimaryButton}>
            Sign in
          </button>
        </form>

        <p style={authDividerText}>
          Don&apos;t have an account?{" "}
          <a href="/register" style={authLink}>
            Register
          </a>
        </p>
      </div>
    </div>
  );
}
