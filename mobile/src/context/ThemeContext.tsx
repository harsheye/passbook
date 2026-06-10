import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ThemeColors {
  background: string;
  card: string;
  border: string;
  text: string;
  subText: string;
  tabBar: string;
  tabActive: string;
  tabInactive: string;
  inputBackground: string;
  divider: string;
}

export const darkColors: ThemeColors = {
  background: '#09090b',
  card: '#18181b',
  border: '#27272a',
  text: '#ffffff',
  subText: '#a1a1aa',
  tabBar: '#09090b',
  tabActive: '#ffffff',
  tabInactive: '#71717a',
  inputBackground: '#09090b',
  divider: '#27272a',
};

export const lightColors: ThemeColors = {
  background: '#f8fafc',
  card: '#ffffff',
  border: '#e2e8f0',
  text: '#0f172a',
  subText: '#475569',
  tabBar: '#ffffff',
  tabActive: '#4f46e5', // indigo-600
  tabInactive: '#94a3b8',
  inputBackground: '#f1f5f9',
  divider: '#e2e8f0',
};

interface ThemeContextType {
  isDark: boolean;
  colors: ThemeColors;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('passbook_theme');
        if (savedTheme !== null) {
          setIsDark(savedTheme === 'dark');
        }
      } catch (e) {
        console.error('Failed to load theme:', e);
      }
    };
    loadTheme();
  }, []);

  const toggleTheme = async () => {
    try {
      const nextVal = !isDark;
      setIsDark(nextVal);
      await AsyncStorage.setItem('passbook_theme', nextVal ? 'dark' : 'light');
    } catch (e) {
      console.error('Failed to save theme:', e);
    }
  };

  const colors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ isDark, colors, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};
