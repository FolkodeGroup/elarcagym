import React, { createContext, useContext, useState, ReactNode } from 'react';

interface NavigationContextType {
  canNavigate: boolean;
  setCanNavigate: (canNavigate: boolean) => void;
  pendingPage: string | null;
  setPendingPage: (page: string | null) => void;
  confirmNavigation: (allow: boolean) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const NavigationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [canNavigate, setCanNavigate] = useState(true);
  const [pendingPage, setPendingPage] = useState<string | null>(null);

  const confirmNavigation = (allow: boolean) => {
    if (allow && pendingPage) {
      setCanNavigate(true);
      setPendingPage(null);
    } else {
      setPendingPage(null);
    }
  };

  return (
    <NavigationContext.Provider value={{ canNavigate, setCanNavigate, pendingPage, setPendingPage, confirmNavigation }}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation debe ser usado dentro de NavigationProvider');
  }
  return context;
};
