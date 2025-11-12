import NextAuth, { type NextAuthOptions } from 'next-auth';
import CognitoProvider from 'next-auth/providers/cognito';

export const authOptions: NextAuthOptions = {
  providers: [
    CognitoProvider({
      clientId: process.env.COGNITO_CLIENT_ID || '',
      clientSecret: process.env.COGNITO_CLIENT_SECRET || '',
      issuer: process.env.COGNITO_ISSUER || `https://cognito-idp.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}`,
    }),
  ],

  callbacks: {
    async jwt({ token, account, user }) {
      // Persist additional user data to the token
      if (account && user) {
        token.accessToken = account.access_token;
        token.idToken = account.id_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
      }
      return token;
    },

    async session({ session, token }) {
      // Send properties to the client
      session.user.id = token.sub!;
      session.user.accessToken = token.accessToken as string;
      session.user.role = token['cognito:groups']?.includes('admin') ? 'admin' : 'buyer';
      return session;
    },
  },

  pages: {
    signIn: '/admin/login',
    error: '/admin/auth/error',
  },

  session: {
    strategy: 'jwt',
    maxAge: 60 * 60, // 1 hour
  },

  jwt: {
    secret: process.env.NEXTAUTH_SECRET,
  },

  events: {
    async signIn(message) {
      console.log('User signed in:', message.user?.email);
    },
    async signOut(message) {
      console.log('User signed out:', message.session?.user?.email);
    },
  },

  debug: process.env.NODE_ENV === 'development',
};

export default NextAuth(authOptions);