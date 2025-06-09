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
    if (authLoading) return; // Wait until auth is initialized

    const isProtected = protectedRoutes.some(route => 
      pathname?.startsWith(route)
    );
    const isAuthRoute = authRoutes.some(route => 
      pathname?.startsWith(route)
    );

    if (isAuthenticated && isAuthRoute) {
      router.push('/projects');
    } else if (!isAuthenticated && isProtected) {
      sessionStorage.setItem('redirectUrl', pathname || '');
      router.push('/signin');
    }
  }, [isAuthenticated, authLoading, pathname, router]);

  if (authLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white z-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-700 text-lg font-medium">Loading, please wait...</p>
        </div>
      </div>
    );
  }

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