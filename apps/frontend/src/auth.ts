import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { stmtFindByUserName } from "@/lib/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        const user = stmtFindByUserName().get(credentials.username as string);
        if (!user) return null;

        const valid = await Bun.password.verify(credentials.password as string, user.password_hash);
        if (!valid) return null;

        return { id: String(user.id), name: user.username, email: null };
      },
    }),
  ],
  pages: {
    signIn: "/signin",
  },
});
