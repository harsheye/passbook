import React from 'react';
import { View, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ScreenWrapperProps {
  children: React.ReactNode;
  scroll?: boolean;
  contentContainerStyle?: any;
  style?: any;
}

export const ScreenWrapper: React.FC<ScreenWrapperProps> = ({ children, scroll = false, contentContainerStyle, style }) => {
  const insets = useSafeAreaInsets();

  const WrapperContent = (
    <View style={[{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom, paddingLeft: 0, paddingRight: 0 }, style]}>
      {children}
    </View>
  );

  if (scroll) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
          <ScrollView contentContainerStyle={[{ flexGrow: 1 }, contentContainerStyle]}>{WrapperContent}</ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
        {WrapperContent}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
