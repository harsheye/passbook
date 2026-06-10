import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { HomeIcon, ListIcon, SparklesIcon, UserIcon, CalendarIcon } from './SvgIcons';
import { useTheme } from '../context/ThemeContext';
import { useTab } from '../context/TabContext';

interface BottomTabBarProps {
  activeTab?: 'Home' | 'Transactions' | 'Chat' | 'Schedules' | 'Profile';
}

export const BottomTabBar: React.FC<BottomTabBarProps> = () => {
  const { activeTab, setActiveTab } = useTab();
  const { colors, isDark } = useTheme();

  const getTabColor = (tabName: string, activeColor: string) => {
    if (activeTab === tabName) return activeColor;
    return colors.tabInactive;
  };

  return (
    <View style={[styles.bottomTabBar, { backgroundColor: colors.tabBar, borderTopColor: colors.border }]}>
      {/* Home Tab */}
      <TouchableOpacity
        onPress={() => setActiveTab('Home')}
        style={styles.tabBtn}
      >
        <HomeIcon color={getTabColor('Home', '#6366f1')} size={18} />
        <Text style={[styles.tabText, { color: getTabColor('Home', '#6366f1') }]}>Home</Text>
      </TouchableOpacity>

      {/* Transactions Tab */}
      <TouchableOpacity
        onPress={() => setActiveTab('Transactions')}
        style={styles.tabBtn}
      >
        <ListIcon color={getTabColor('Transactions', '#f43f5e')} size={18} />
        <Text style={[styles.tabText, { color: getTabColor('Transactions', '#f43f5e') }]}>History</Text>
      </TouchableOpacity>

      {/* AI Chat Tab (Highlight) */}
      <View style={styles.centerTabWrapper}>
        <TouchableOpacity
          onPress={() => setActiveTab('Chat')}
          style={[
            styles.centerTabBtn,
            { borderColor: colors.border },
            activeTab === 'Chat' && { backgroundColor: '#10b981' }
          ]}
        >
          <SparklesIcon color={activeTab === 'Chat' ? '#ffffff' : '#10b981'} size={20} />
        </TouchableOpacity>
      </View>

      {/* Schedules Tab */}
      <TouchableOpacity
        onPress={() => setActiveTab('Schedules')}
        style={styles.tabBtn}
      >
        <CalendarIcon color={getTabColor('Schedules', '#d97706')} size={18} />
        <Text style={[styles.tabText, { color: getTabColor('Schedules', '#d97706') }]}>Schedules</Text>
      </TouchableOpacity>

      {/* Profile Tab */}
      <TouchableOpacity
        onPress={() => setActiveTab('Profile')}
        style={styles.tabBtn}
      >
        <UserIcon color={getTabColor('Profile', '#7c3aed')} size={18} />
        <Text style={[styles.tabText, { color: getTabColor('Profile', '#7c3aed') }]}>Profile</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  bottomTabBar: {
    height: 56,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 10,
  },
  tabBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    height: '100%',
  },
  tabText: {
    fontSize: 8,
    fontWeight: '800',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  centerTabWrapper: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  centerTabBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#000000',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
});
