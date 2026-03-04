import "server-only";
import Credentials from "next-auth/providers/credentials";
import { AuthOptions } from "next-auth";
import { compare } from "bcryptjs";

if (!process.env.NEXTAUTH_SECRET) {
  throw new Error("NEXTAUTH_SECRET is required");
}

export const authOptions: AuthOptions = {
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: {
          label: "Email",
          type: "email",
          placeholder: "example@email.com",
        },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // Only a single admin user can be authenticated.
        // Credentials are stored in environment variables (ADMIN_EMAIL and
        // ADMIN_PASSWORD_HASH). No user database.
        if (!credentials) return null;

        const ADMIN_EMAIL = process.env.ADMIN_EMAIL!;
        const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH!;
        if (!ADMIN_EMAIL || !ADMIN_PASSWORD_HASH) {
          throw new Error("Auth env vars are not configured");
        }

        if (credentials.email !== ADMIN_EMAIL) return null;
        const passwordMatch = await compare(
          credentials.password,
          ADMIN_PASSWORD_HASH,
        );
        if (!passwordMatch) return null;

        return {
          id: "1",
          firstName: "John",
          lastName: "Doe",
          email: ADMIN_EMAIL,
          role: "admin",
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/",
    error: "/",
  },
};
