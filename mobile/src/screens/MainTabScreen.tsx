import React from 'react';
import { View } from 'react-native';
import { useTab } from '../context/TabContext';
import { DashboardScreen } from './DashboardScreen';
import { TransactionsScreen } from './TransactionsScreen';
import { ChatScreen } from './ChatScreen';
import { SchedulesScreen } from './SchedulesScreen';
import { ProfileScreen } from './ProfileScreen';

export const MainTabScreen: React.FC = () => {
  const { activeTab } = useTab();

  return (
    <View style={{ flex: 1, backgroundColor: '#09090b' }}>
      <View style={{ flex: 1, display: activeTab === 'Home' ? 'flex' : 'none' }}>
        <DashboardScreen />
      </View>
      <View style={{ flex: 1, display: activeTab === 'Transactions' ? 'flex' : 'none' }}>
        <TransactionsScreen />
      </View>
      <View style={{ flex: 1, display: activeTab === 'Chat' ? 'flex' : 'none' }}>
        <ChatScreen />
      </View>
      <View style={{ flex: 1, display: activeTab === 'Schedules' ? 'flex' : 'none' }}>
        <SchedulesScreen />
      </View>
      <View style={{ flex: 1, display: activeTab === 'Profile' ? 'flex' : 'none' }}>
        <ProfileScreen />
      </View>
    </View>
  );
};
