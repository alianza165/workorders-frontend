"use client";

import './globals.css';
import Head from 'next/head';
import Footer from './components/footer';
import Header from './components/header';
import React from 'react';
import { AppProvider } from './context/AppContext';
import { MessageProvider } from './context/MessageContext';
import { usePathname, useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from './context/AuthContext';
import ThemeWrapper from './components/ThemeWrapper';
import ProtectedRoute from './components/ProtectedRoute';
import { useEffect } from 'react';

const protectedRoutes = ['/dashboard', '/workorders', '/profile'];
const authRoutes = ['/signin', '/signin/register', '/signin/register/verify'];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <Head>
        <meta name="viewport" content="initial-scale=1, width=device-width" />
      </Head>
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <AuthRedirectHandler>
            <AppProvider>
              <MessageProvider>
                <Header />
                <ThemeWrapper>
                  <main className="flex-1">
                    {children}
                  </main>
                </ThemeWrapper>
                <ConditionalFooter />
              </MessageProvider>
            </AppProvider>
          </AuthRedirectHandler>
        </AuthProvider>
      </body>
    </html>
  );
}

function AuthRedirectHandler({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, authLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading) {
      // If user is authenticated and tries to access auth routes, redirect to dashboard
      if (isAuthenticated && authRoutes.some(route => pathname?.startsWith(route))) {
        router.push('/dashboard');
      }
      // If user is not authenticated and tries to access protected routes, redirect to signin
      else if (!isAuthenticated && protectedRoutes.some(route => pathname?.startsWith(route))) {
        router.push('/signin');
      }
    }
  }, [isAuthenticated, authLoading, pathname, router]);

  return <>{children}</>;
}

function ConditionalFooter() {
  const pathname = usePathname();
  const noFooterRoutes = ['/signin', '/signin/register', '/signin/register/verify', '/dashboard'];

  if (noFooterRoutes.some(route => pathname?.startsWith(route))) {
    return null;
  }
  return <Footer />;
}