import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { api } from '../api/api';
import { useTheme } from '../context/ThemeContext';
import { ShieldIcon, LockIcon, SaltLogo } from '../components/SvgIcons';

export const LoginScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const { isDark, colors } = useTheme();

  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'USER' | 'ADMIN'>('USER');

  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    if (!email.trim() || !password.trim() || (tab === 'register' && !name.trim())) {
      Alert.alert('Validation Error', 'Please fill in all required fields.');
      return;
    }

    setLoading(true);
    try {
      let res;
      if (tab === 'login') {
        res = await api.post('/api/auth/login', {
          email: email.trim().toLowerCase(),
          password
        });
      } else {
        res = await api.post('/api/auth/register', {
          email: email.trim().toLowerCase(),
          password,
          name: name.trim(),
          role
        });
      }

      await AsyncStorage.setItem('passbook_token', res.data.token);
      await AsyncStorage.setItem('passbook_user', JSON.stringify(res.data.user));

      navigation.reset({
        index: 0,
        routes: [{ name: 'Chat' }],
      });
    } catch (err: any) {
      console.error(err);
      const errMsg = err.response?.data?.error || 'Authentication failed. Please verify credentials.';
      Alert.alert('Authentication Failed', errMsg);
    } finally {
      setLoading(false);
    }
  };

  const triggerDemo = async (demoRole: 'USER' | 'ADMIN') => {
    setLoading(true);
    try {
      const demoEmail = demoRole === 'ADMIN' ? 'admin@tracker.com' : 'user@tracker.com';
      const demoPassword = demoRole === 'ADMIN' ? 'admin123' : 'user123';

      let res;
      try {
        res = await api.post('/api/auth/login', {
          email: demoEmail,
          password: demoPassword
        });
      } catch (loginErr) {
        // Fallback: register the demo user if not seeded
        const seedName = demoRole === 'ADMIN' ? 'Alpha Admin' : 'Standard Tracker';
        res = await api.post('/api/auth/register', {
          email: demoEmail,
          password: demoPassword,
          name: seedName,
          role: demoRole
        });
      }

      await AsyncStorage.setItem('passbook_token', res.data.token);
      await AsyncStorage.setItem('passbook_user', JSON.stringify(res.data.user));

      navigation.reset({
        index: 0,
        routes: [{ name: 'Chat' }],
      });
    } catch (err: any) {
      console.error(err);
      Alert.alert('Demo Error', 'Could not start demo access. Please check connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          <View style={styles.container}>
            
            {/* LOGO */}
            <View style={styles.logoSection}>
              <View style={[styles.logoBox, { backgroundColor: 'transparent' }]}>
                <SaltLogo color={colors.text} size={48} />
              </View>
              <Text style={[styles.logoText, { color: colors.text }]}>SALT</Text>
              <Text style={[styles.logoSub, { color: colors.subText }]}>Mobile native premium companion</Text>
            </View>

            {/* FORM CARD */}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              
              {/* TAB SELECTOR */}
              <View style={[styles.tabContainer, { backgroundColor: colors.inputBackground }]}>
                <TouchableOpacity
                  onPress={() => setTab('login')}
                  style={[styles.tabBtn, tab === 'login' && { backgroundColor: colors.background }]}
                >
                  <Text style={[styles.tabBtnText, { color: tab === 'login' ? colors.text : colors.subText }]}>
                    SIGN IN
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  onPress={() => setTab('register')}
                  style={[styles.tabBtn, tab === 'register' && { backgroundColor: colors.background }]}
                >
                  <Text style={[styles.tabBtnText, { color: tab === 'register' ? colors.text : colors.subText }]}>
                    REGISTER
                  </Text>
                </TouchableOpacity>
              </View>

              {/* INPUT FIELDS */}
              <View style={styles.form}>
                {tab === 'register' && (
                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.subText }]}>Full Name</Text>
                    <TextInput
                      style={[styles.inputField, { color: colors.text, borderBottomColor: colors.border }]}
                      placeholder="John Doe"
                      placeholderTextColor={colors.subText}
                      value={name}
                      onChangeText={setName}
                    />
                  </View>
                )}

                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: colors.subText }]}>Email Address</Text>
                  <TextInput
                    style={[styles.inputField, { color: colors.text, borderBottomColor: colors.border }]}
                    placeholder="you@example.com"
                    placeholderTextColor={colors.subText}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: colors.subText }]}>Password</Text>
                  <TextInput
                    style={[styles.inputField, { color: colors.text, borderBottomColor: colors.border }]}
                    placeholder="••••••••"
                    placeholderTextColor={colors.subText}
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                  />
                </View>

                {tab === 'register' && (
                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.subText }]}>Access Role</Text>
                    <View style={styles.roleRow}>
                      <TouchableOpacity
                        onPress={() => setRole('USER')}
                        style={[
                          styles.roleBtn,
                          { borderColor: colors.border },
                          role === 'USER' && { backgroundColor: colors.inputBackground, borderColor: colors.text }
                        ]}
                      >
                        <Text style={[styles.roleText, { color: role === 'USER' ? colors.text : colors.subText }]}>
                          👤 User
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => setRole('ADMIN')}
                        style={[
                          styles.roleBtn,
                          { borderColor: colors.border },
                          role === 'ADMIN' && { backgroundColor: colors.inputBackground, borderColor: colors.text }
                        ]}
                      >
                        <Text style={[styles.roleText, { color: role === 'ADMIN' ? colors.text : colors.subText }]}>
                          👑 Admin
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                <TouchableOpacity
                  onPress={handleAuth}
                  style={[styles.submitBtn, { backgroundColor: colors.text }]}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color={colors.background} />
                  ) : (
                    <Text style={[styles.submitBtnText, { color: colors.background }]}>
                      {tab === 'login' ? 'SIGN IN' : 'REGISTER'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>

            </View>

            {/* DEMO BYPASS BOX */}
            <View style={[styles.demoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.demoHeader}>
                <LockIcon color="#a78bfa" size={14} />
                <Text style={styles.demoTitle}>QUICK DEMO ACCESS</Text>
              </View>
              <Text style={[styles.demoDesc, { color: colors.subText }]}>
                Bypass registration to evaluate standard user vs admin betting ledgers.
              </Text>

              <View style={styles.demoButtons}>
                <TouchableOpacity
                  onPress={() => triggerDemo('USER')}
                  style={[styles.demoBtn, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
                  disabled={loading}
                >
                  <Text style={[styles.demoBtnText, { color: colors.text }]}>👤 Standard User</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => triggerDemo('ADMIN')}
                  style={[styles.demoBtn, { backgroundColor: colors.text }]}
                  disabled={loading}
                >
                  <Text style={[styles.demoBtnText, { color: colors.background }]}>👑 Admin Portal</Text>
                </TouchableOpacity>
              </View>
            </View>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContainer: {
    paddingBottom: 40,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 36,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoBox: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  logoText: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1,
    fontFamily: Platform.OS === 'ios' ? 'HelveticaNeue-Bold' : 'sans-serif-condensed',
  },
  logoSub: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 2,
  },
  card: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
    marginBottom: 20,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  tabBtnText: {
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    gap: 4,
  },
  label: {
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  inputField: {
    fontSize: 12,
    fontWeight: '700',
    borderBottomWidth: 1.5,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  roleRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  roleBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  roleText: {
    fontSize: 11,
    fontWeight: '800',
  },
  submitBtn: {
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  submitBtnText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  demoCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 20,
  },
  demoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  demoTitle: {
    fontSize: 8.5,
    fontWeight: '900',
    color: '#a78bfa',
    letterSpacing: 0.8,
  },
  demoDesc: {
    fontSize: 9.5,
    fontWeight: '700',
    lineHeight: 14,
    marginBottom: 16,
  },
  demoButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  demoBtn: {
    flex: 1,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  demoBtnText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
});
