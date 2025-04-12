"use client";

import React, { createContext, useState, useContext } from 'react';

type AppContextType = {
  theme: string;
  isOpen: boolean;
  toggleSidebar: () => void;
  toggleTheme: (theme: string) => void;
};

const AppContext = createContext<AppContextType>({
  theme: 'light',
  isOpen: false,
  toggleSidebar: () => {},
  toggleTheme: () => {}
});

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setTheme] = useState('light');
  const [isOpen, setIsOpen] = useState(false);

  return (
    <AppContext.Provider value={{
      theme,
      isOpen,
      toggleSidebar: () => setIsOpen(!isOpen),
      toggleTheme: (newTheme) => setTheme(newTheme)
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);