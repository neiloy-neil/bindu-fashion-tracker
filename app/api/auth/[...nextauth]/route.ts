import NextAuth, { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import * as bcrypt from "bcryptjs"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text", placeholder: "admin" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          throw new Error('Invalid credentials');
        }
        const isEmail = credentials.username.includes('@');

        const user = await prisma.user.findFirst({
          where: isEmail 
            ? { email: credentials.username }
            : { username: credentials.username },
          include: { managedBranches: { select: { id: true } } }
        });

        if (!user) {
          throw new Error('Invalid credentials');
        }

        if (!user.isActive) {
          throw new Error('User account is deactivated');
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.passwordHash);

        if (!isPasswordValid) {
          throw new Error('Invalid credentials');
        }

        return {
          id: String(user.id),
          username: user.username,
          role: user.role,
          branchId: user.branchId,
          managedBranchIds: user.managedBranches?.map(b => b.id) || [],
          employeeId: user.employeeId,
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = (user as any).username;
        token.role = (user as any).role;
        token.branchId = (user as any).branchId;
        token.managedBranchIds = (user as any).managedBranchIds;
        token.employeeId = (user as any).employeeId;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        (session as any).user = {
          ...session.user,
          id: token.id,
          username: token.username,
          role: token.role,
          branchId: token.branchId,
          managedBranchIds: token.managedBranchIds,
          employeeId: token.employeeId,
        };
      }
      return session;
    }
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
