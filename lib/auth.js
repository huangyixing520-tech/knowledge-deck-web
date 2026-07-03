import GoogleProvider from "next-auth/providers/google";
import { isAdminEmail } from "@/lib/admin";
import { trackEvent, upsertUser } from "@/lib/activityStore";

export const authOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || ""
    })
  ],
  session: {
    strategy: "jwt"
  },
  pages: {
    signIn: "/"
  },
  callbacks: {
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub;
        session.user.isAdmin = isAdminEmail(session.user.email);
      }
      return session;
    },
    async signIn({ user }) {
      try {
        await upsertUser(user, { countSignIn: true });
        await trackEvent({ user, type: "sign_in", metadata: { provider: "google" } });
      } catch (error) {
        console.error("Failed to record sign-in", error);
      }
      return true;
    }
  }
};
