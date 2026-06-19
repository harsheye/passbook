import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Keyboard } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { HomeIcon, ListIcon, SparklesIcon, UserIcon, CalendarIcon } from './SvgIcons';
import { useTheme } from '../context/ThemeContext';
import { useTab } from '../context/TabContext';

interface BottomTabBarProps {
  activeTab?: 'Home' | 'Transactions' | 'Chat' | 'Schedules' | 'Profile';
  inline?: boolean; // when true, render as a normal block (no absolute positioning)
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({ inline = true }) => {
  const { activeTab, setActiveTab } = useTab();
  const { colors, isDark } = useTheme();

  const [keyboardVisible, setKeyboardVisible] = useState(false);
  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  if (keyboardVisible) return null;

  const getTabColor = (tabName: string, activeColor: string) => {
    if (activeTab === tabName) return activeColor;
    return colors.tabInactive;
  };

  return (
    <View style={[
      styles.bottomTabBar,
      { backgroundColor: colors.tabBar },
      inline ? styles.bottomTabBarInline : null
    ]}>
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
            { backgroundColor: isDark ? '#161435' : '#eaecff' },
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
    // Absolute by default but with minimal offset so it doesn't consume excessive space
    position: 'absolute',
    bottom: 16,
    left: 12,
    right: 12,
    height: 56,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 10,
    paddingVertical: 6,
    // Explicitly remove shadows and borders for clean flat look
    borderWidth: 0,
    borderColor: 'transparent',
    elevation: 0,
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 0,
  },
  bottomTabBarInline: {
    position: 'relative',
    bottom: 0,
    left: 0,
    right: 0,
    marginHorizontal: 0,
    borderRadius: 0,
    height: 56,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 4,
  },
  tabBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    height: '100%',
  },
  tabText: {
    fontSize: 10,
    fontWeight: '800',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  centerTabWrapper: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 0,
  },
  centerTabBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
