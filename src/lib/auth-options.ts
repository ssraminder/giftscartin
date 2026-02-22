import { NextAuthOptions, User } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from './prisma'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Email Login',
      credentials: {
        email: { label: 'Email', type: 'email' },
        otp: { label: 'OTP', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.otp) return null

        const otpRecord = await prisma.otpVerification.findFirst({
          where: {
            email: credentials.email,
            otp: credentials.otp,
            verified: false,
            expiresAt: { gt: new Date() },
          },
        })

        if (!otpRecord) return null

        await prisma.otpVerification.update({
          where: { id: otpRecord.id },
          data: { verified: true },
        })

        let user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })

        if (!user) {
          user = await prisma.user.create({
            data: { email: credentials.email, phone: '' },
          })
        }

        return {
          id: user.id,
          email: user.email ?? '',
          name: user.name ?? '',
          phone: user.phone ?? '',
          role: user.role,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as User
        token.id = u.id
        token.role = u.role
        token.email = u.email ?? ''
        token.name = u.name ?? ''
        token.phone = u.phone ?? ''
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id
        session.user.role = token.role
        session.user.email = token.email ?? ''
        session.user.name = token.name ?? ''
        session.user.phone = token.phone ?? ''
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
}
