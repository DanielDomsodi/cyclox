import { PrismaAdapter } from '@auth/prisma-adapter';
import NextAuth from 'next-auth';
import { prisma } from '@lib/db/prisma';
import Google from 'next-auth/providers/google';
import type { Provider } from 'next-auth/providers';
import Resend from 'next-auth/providers/resend';

const adapter = PrismaAdapter(prisma);

const providers: Provider[] = [
  Google({
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  }),
  Resend({
    apiKey: process.env.RESEND_API_KEY,
    from: 'noreply@resend.dev',
  }),
];

export const providerMap = providers
  .map((provider) => {
    if (typeof provider === 'function') {
      const providerData = provider();
      return { id: providerData.id, name: providerData.name };
    } else {
      return { id: provider.id, name: provider.name };
    }
  })
  .filter(
    (provider) => provider.id !== 'credentials' && provider.id !== 'resend'
  );

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter,
  providers,
  callbacks: {
    async session({ session, token }) {
      const userId = token.sub;

      if (userId) {
        session.user.id = userId;
      }

      return session;
    },
  },
  session: { strategy: 'jwt' },
  debug: process.env.NODE_ENV === 'development',
  secret: process.env.AUTH_SECRET,
  pages: {
    signIn: '/auth/signin',
  },
});
