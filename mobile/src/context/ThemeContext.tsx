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
  background: '#070514', // Deep space cosmic indigo
  card: '#0f0d2c',       // Rich indigo-purple container
  border: '#201c56',     // Vibrant indigo border
  text: '#ffffff',
  subText: '#9a95e2',    // Soft lavender subtext
  tabBar: '#0d0a27',     // Midnight indigo tab bar
  tabActive: '#818cf8',  // Bright indigo active icon
  tabInactive: '#4e4a7d',// Muted purple-grey inactive
  inputBackground: '#05030f', // Rich deep dark input fields
  divider: '#201c56',
};

export const lightColors: ThemeColors = {
  background: '#f3f4ff', // Soft lavender-blue tint background
  card: '#ffffff',       // Pure white cards
  border: '#d2d6f7',     // Soft lavender-purple border
  text: '#0f172a',       // Slate dark text
  subText: '#5e6194',    // Lavender slate subtext
  tabBar: '#ffffff',
  tabActive: '#6366f1',  // Vibrant indigo active icon
  tabInactive: '#9ca0d2',// Soft gray-purple inactive icon
  inputBackground: '#eaecff', // Soft tinted lavender inputs
  divider: '#e0e3ff',
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
