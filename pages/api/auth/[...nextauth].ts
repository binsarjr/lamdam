import GoogleProvider from "next-auth/providers/google";
import NuSidProvider from "@/lib/NuSid";
import clientPromise from "@/lib/clientPromise";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import NextAuth, { type NextAuthOptions } from "next-auth";
import { OAuthConfig } from "next-auth/providers";

if (!process.env.NUID_CLIENT_ID) {
    throw new Error("NUID_CLIENT_ID is not defined");
}

if (!process.env.NUID_CLIENT_SECRET) {
    throw new Error("NUID_CLIENT_SECRET is not defined");
}

let providers: OAuthConfig<any>[] = [
    NuSidProvider({
        clientId: process.env.NUID_CLIENT_ID,
        clientSecret: process.env.NUID_CLIENT_SECRET,
    }),
]

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    providers.push(
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        })
    )
}

export const authOptions: NextAuthOptions = {
    session: {
        strategy: "jwt",
        maxAge: 60 * 60 * 24,
    },
    secret: process.env.NEXTAUTH_SECRET,
    adapter: MongoDBAdapter(clientPromise),
    callbacks: {
        async session({ session, user, token }) {
            if (session.user) {
                session.user.id = user?.id ?? token.sub
            }
            return session;
        },
    },
    providers,
    pages: {
        signIn: "/login",
    },
}

export default NextAuth(authOptions)
