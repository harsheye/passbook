import React from 'react';
import { View, KeyboardAvoidingView, Platform, ScrollView, TouchableWithoutFeedback, Keyboard, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ScreenWrapperProps {
  children: React.ReactNode;
  scroll?: boolean;
  contentContainerStyle?: any;
  style?: any;
}

export const ScreenWrapper: React.FC<ScreenWrapperProps> = ({ children, scroll = false, contentContainerStyle, style }) => {
  const insets = useSafeAreaInsets();

  // Slightly reduce top inset so custom header sits a bit higher, and keep bottom inset minimal for consistent footer placement
  const topInset = Math.max(0, (insets.top || 0) - 12);
  const bottomInset = 0;

  const WrapperContent = (
    <View style={[styles.inner, style]}>
      {children}
    </View>
  );

  if (scroll) {
    return (
      <View style={[styles.container, { paddingTop: topInset, paddingBottom: bottomInset }]}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <ScrollView contentContainerStyle={[styles.scrollContent, contentContainerStyle]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {WrapperContent}
            </ScrollView>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: topInset, paddingBottom: bottomInset }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          {WrapperContent}
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  inner: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
});

