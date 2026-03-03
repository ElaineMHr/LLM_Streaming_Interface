import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { AuthOptions } from "next-auth";
import { compare } from "bcryptjs";

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
        if (!credentials) return null;

        const ADMIN_EMAIL = process.env.ADMIN_EMAIL!;
        const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH!;
        console.log(ADMIN_EMAIL, ADMIN_PASSWORD_HASH);
        if (credentials.email !== ADMIN_EMAIL) return null;
        const passwordMatch = await compare(
          credentials.password,
          ADMIN_PASSWORD_HASH,
        );

        console.log(passwordMatch);
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
    signIn: "/login",
    error: "/login",
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
