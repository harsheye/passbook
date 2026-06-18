import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChatScreen } from '../screens/ChatScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { AddTransactionScreen } from '../screens/AddTransactionScreen';
import { HubScreen } from '../screens/HubScreen';
import { TransactionsScreen } from '../screens/TransactionsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { SchedulesScreen } from '../screens/SchedulesScreen';
import { MainTabScreen } from '../screens/MainTabScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { GstScreen } from '../screens/GstScreen';
import { TaxScreen } from '../screens/TaxScreen';
import { useTheme } from '../context/ThemeContext';

const Stack = createStackNavigator();

export const AppNavigator: React.FC = () => {
  const { colors } = useTheme();
  const [initialRoute, setInitialRoute] = useState<string | null>(null);

  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const completed = await AsyncStorage.getItem('passbook_onboarding_completed');
        setInitialRoute(completed === 'true' ? 'MainTab' : 'Onboarding');
      } catch (err) {
        setInitialRoute('Onboarding');
      }
    };
    checkOnboarding();
  }, []);

  if (!initialRoute) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <Stack.Navigator
      initialRouteName={initialRoute}
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="MainTab" component={MainTabScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="Dashboard" component={DashboardScreen} />
      <Stack.Screen name="AddTransaction" component={AddTransactionScreen} />
      <Stack.Screen name="Hub" component={HubScreen} />
      <Stack.Screen name="Transactions" component={TransactionsScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Schedules" component={SchedulesScreen} />
      <Stack.Screen name="Gst" component={GstScreen} />
      <Stack.Screen name="Tax" component={TaxScreen} />
    </Stack.Navigator>
  );
};
