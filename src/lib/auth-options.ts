import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from './prisma'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Phone Login',
      credentials: {
        phone: { label: 'Phone', type: 'text' },
        otp: { label: 'OTP', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.phone || !credentials?.otp) return null

        const otpRecord = await prisma.otpVerification.findFirst({
          where: {
            phone: credentials.phone,
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
          where: { phone: credentials.phone },
        })

        if (!user) {
          user = await prisma.user.create({
            data: { phone: credentials.phone },
          })
        }

        return { id: user.id, phone: user.phone, name: user.name, role: user.role }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.phone = user.phone
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id
        session.user.role = token.role
        session.user.phone = token.phone
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
