// components/ThemeWrapper.tsx
"use client";

import { useAppContext } from '../context/AppContext';

export default function ThemeWrapper({ children }: { children: React.ReactNode }) {
  const { theme, isOpen } = useAppContext();

  const themeClass = theme === 'dark' ? 'text-white bg-black' : 'text-black bg-white';
  const themeClass2 = theme === 'dark' ? 'text-black bg-white' : 'text-white bg-black';
  const bgImage = theme === 'dark' ? 'bg-black' : 'bg-white';
  const marginLeft = isOpen ? 'md:ml-60' : 'md:ml-10';

  return (
    <div className={`min-h-screen ${themeClass} ${marginLeft}`}>
      {children}
    </div>
  );
}