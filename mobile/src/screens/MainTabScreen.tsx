import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTab } from '../context/TabContext';
import { DashboardScreen } from './DashboardScreen';
import { TransactionsScreen } from './TransactionsScreen';
import { ChatScreen } from './ChatScreen';
import { SchedulesScreen } from './SchedulesScreen';
import { ProfileScreen } from './ProfileScreen';
import { useTheme } from '../context/ThemeContext';
import { PlusIcon } from '../components/SvgIcons';

export const MainTabScreen: React.FC = () => {
  const { activeTab, setTriggerOpenSchedule } = useTab();
  const { colors } = useTheme();
  const navigation = useNavigation<StackNavigationProp<any>>();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
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

      {/* Global Floating Action Button Overlay */}
      {(activeTab === 'Transactions' || activeTab === 'Schedules') && (
        <TouchableOpacity
          onPress={() => {
            if (activeTab === 'Schedules') {
              setTriggerOpenSchedule(prev => prev + 1);
            } else {
              navigation.navigate('AddTransaction');
            }
          }}
          style={[
            styles.globalFab,
            {
              backgroundColor: colors.text,
              shadowColor: '#000',
            }
          ]}
          activeOpacity={0.8}
        >
          <PlusIcon color={colors.background} size={20} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  globalFab: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 3 },
    zIndex: 999,
  }
});
