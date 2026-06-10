import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { AppNavigator } from './src/navigation/AppNavigator';
import { autodetectBaseUrl } from './src/api/api';
import { ThemeProvider } from './src/context/ThemeContext';
import { TabProvider } from './src/context/TabContext';

function App(): React.JSX.Element {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      await autodetectBaseUrl();
      setReady(true);
    };
    init();
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: '#09090b', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  return (
    <ThemeProvider>
      <TabProvider>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </TabProvider>
    </ThemeProvider>
  );
}

export default App;
