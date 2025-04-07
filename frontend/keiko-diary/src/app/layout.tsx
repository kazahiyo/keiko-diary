'use client';

// import { AppProviders } from './providers';
import { SessionProvider } from 'next-auth/react';
import Header from '../components/Header';
import Footer from '../components/Footer';

export const metadata = {
  title: 'MyApp',
  description: 'Next.js + NextAuth + Chakra',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        {/* <AppProviders> */}
        <SessionProvider>
          <Header />
          <main>{children}</main>
          <Footer />

        </SessionProvider>
        {/* </AppProviders> */}
      </body>
    </html>
  );
}