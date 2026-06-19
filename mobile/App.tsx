import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './src/navigation/AppNavigator';
import { autodetectBaseUrl } from './src/api/api';
import { ThemeProvider } from './src/context/ThemeContext';
import { TabProvider } from './src/context/TabContext';
import * as ImagePicker from 'expo-image-picker';

function App(): React.JSX.Element {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      await autodetectBaseUrl();
      setReady(true);
    };
    init();
  }, []);

  // Request permissions safely after app has navigated away from splash screen
  useEffect(() => {
    if (ready) {
      const requestLaunchPermissions = async () => {
        try {
          await new Promise<void>(resolve => setTimeout(() => resolve(), 800));
          await ImagePicker.requestCameraPermissionsAsync();
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        } catch (err) {
          console.warn('Failed to request permissions contextually:', err);
        }
      };
      requestLaunchPermissions();
    }
  }, [ready]);

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: '#09090b', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <TabProvider>
            <NavigationContainer>
              <AppNavigator />
            </NavigationContainer>
          </TabProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}


export default App;
