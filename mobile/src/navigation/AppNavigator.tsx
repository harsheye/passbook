import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { DashboardScreen } from '../screens/DashboardScreen';
import { AddTransactionScreen } from '../screens/AddTransactionScreen';
import { HubScreen } from '../screens/HubScreen';

const Stack = createStackNavigator();

export const AppNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="Dashboard"
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#09090b' },
      }}
    >
      <Stack.Screen name="Dashboard" component={DashboardScreen} />
      <Stack.Screen name="AddTransaction" component={AddTransactionScreen} />
      <Stack.Screen name="Hub" component={HubScreen} />
    </Stack.Navigator>
  );
};
