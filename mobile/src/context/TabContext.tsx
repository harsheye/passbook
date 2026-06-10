import React, { createContext, useContext, useState } from 'react';

export type TabName = 'Home' | 'Transactions' | 'Chat' | 'Schedules' | 'Profile';

interface TabContextType {
  activeTab: TabName;
  setActiveTab: (tab: TabName) => void;
}

const TabContext = createContext<TabContextType | undefined>(undefined);

export const TabProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<TabName>('Home');

  return (
    <TabContext.Provider value={{ activeTab, setActiveTab }}>
      {children}
    </TabContext.Provider>
  );
};

export const useTab = () => {
  const context = useContext(TabContext);
  if (!context) {
    throw new Error('useTab must be used within a TabProvider');
  }
  return context;
};
