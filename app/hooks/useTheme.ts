'use client';

import { useAppContext } from '../context/AppContext';

export function useTheme() {
  const { theme, isOpen } = useAppContext();
  
  return {
    themeClass: theme === 'dark' ? 'text-white bg-black' : 'text-black bg-white',
    themeClass2: theme === 'dark' ? 'text-black bg-white' : 'text-white bg-black',
    bgImage: theme === 'dark' ? 'bg-black' : 'bg-white',
    bgClass: `url(${theme === 'dark' ? 'bg-black' : 'bg-white'})`,
    marginLeft: isOpen ? 'md:ml-60' : 'md:ml-10'
  };
}