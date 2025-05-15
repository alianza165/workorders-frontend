"use client";

import { useAppContext } from '../context/AppContext';

export default function ThemeWrapper({ children }: { children: React.ReactNode }) {
  const { theme, isOpen } = useAppContext();

  return (
    <div 
      className={`
        min-h-screen
        ${theme === 'dark' ? 'bg-gray-900 text-gray-100' : 'bg-white text-gray-900'}
        transition-all duration-300 ease-in-out
      `}
      style={{
        marginLeft: isOpen ? '14rem' : '0rem' // Exact rem values
      }}
    >
      {children}
    </div>
  );
}