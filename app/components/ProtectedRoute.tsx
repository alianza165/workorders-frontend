// components/ProtectedRoute.tsx
"use client";

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from './LoadingSpinner'; // Create this component or use a div

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/signin');
    }
  }, [isAuthenticated, authLoading, router]);

  if (authLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated || !user) {
    return null; // Redirect will happen from useEffect
  }

  return <>{children}</>;
}