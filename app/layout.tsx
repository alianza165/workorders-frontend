"use client";

import './globals.css';
import Head from 'next/head';
import Footer from './components/footer';
import Header from './components/header';
import React from 'react';
import { AppProvider } from './context/AppContext';
import { MessageProvider } from './context/MessageContext';
import { usePathname } from 'next/navigation';
import { AuthProvider } from './context/AuthContext';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const noFooterRoutes = ['/signin', '/signin/register', '/signin/register/verify', '/dashboard'];

  return (
    <html lang="en" className="h-full">
      <Head>
        <meta name="viewport" content="initial-scale=1, width=device-width" />
      </Head>
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <AppProvider>
            <MessageProvider>
              <Header />
              <main className="flex-1">
                {children}
              </main>
              {!noFooterRoutes.includes(pathname) && <Footer />}
            </MessageProvider>
          </AppProvider>
        </AuthProvider>
      </body>
    </html>
  );
}