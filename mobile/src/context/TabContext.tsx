import React, { createContext, useContext, useState } from 'react';

export type TabName = 'Home' | 'Transactions' | 'Chat' | 'Schedules' | 'Profile';

interface TabContextType {
  activeTab: TabName;
  setActiveTab: (tab: TabName) => void;
  triggerOpenSchedule: number;
  setTriggerOpenSchedule: React.Dispatch<React.SetStateAction<number>>;
  transactionTick: number;
  bumpTransactionTick: () => void;
}

const TabContext = createContext<TabContextType | undefined>(undefined);

export const TabProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<TabName>('Chat');
  const [triggerOpenSchedule, setTriggerOpenSchedule] = useState<number>(0);
  const [transactionTick, setTransactionTick] = useState<number>(0);

  const bumpTransactionTick = () => setTransactionTick(prev => prev + 1);

  return (
    <TabContext.Provider value={{ activeTab, setActiveTab, triggerOpenSchedule, setTriggerOpenSchedule, transactionTick, bumpTransactionTick }}>
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
