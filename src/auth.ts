import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";

const MAIN_DOMAIN = process.env.NEXT_PUBLIC_MAIN_DOMAIN || "72.62.227.33.sslip.io";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET || "";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const res = await fetch(`${API_URL}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          });

          if (!res.ok) return null;

          const data = await res.json();
          return {
            id: data.user.id,
            name: data.user.name,
            email: data.user.email,
            image: data.user.avatarUrl,
          };
        } catch {
          return null;
        }
      },
    }),
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // For OAuth providers, find or create user via Fastify
      if (account?.provider === "google" || account?.provider === "github") {
        try {
          const res = await fetch(`${API_URL}/auth/oauth`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-internal-secret": INTERNAL_API_SECRET,
            },
            body: JSON.stringify({
              email: user.email,
              name: user.name,
              avatarUrl: user.image,
              provider: account.provider,
            }),
          });

          if (!res.ok) return false;

          const data = await res.json();
          // Update user object with the DB user id so JWT gets the right id
          user.id = data.user.id;
          return true;
        } catch {
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  cookies: {
    sessionToken: {
      name: `session-token`,
      options: {
        httpOnly: true,
        sameSite: "none",
        path: "/",
        secure: true,
        domain: process.env.COOKIE_DOMAIN || (process.env.NODE_ENV === "production" ? `.${MAIN_DOMAIN}` : undefined),
      },
    },
  },
});
