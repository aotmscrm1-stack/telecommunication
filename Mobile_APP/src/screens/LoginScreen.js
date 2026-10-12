import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen({ onNavigate }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async () => {
    setErrorMsg('');
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter both email and password');
      return;
    }

    try {
      setLoading(true);
      await login(email.trim().toLowerCase(), password);
      // Auth state update will automatically redirect via AppNavigator
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Login failed. Please check your credentials.';
      setErrorMsg(msg);
      Alert.alert('Authentication Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Back Button */}
        <TouchableOpacity style={styles.backBtn} onPress={() => onNavigate('landing')} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
          <Text style={styles.backBtnText}>Back</Text>
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in with your CRM credentials to access live leads and tools.</Text>
        </View>

        {/* Error Banner */}
        {errorMsg ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={18} color={colors.danger} />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : null}

        {/* Inputs */}
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>EMAIL ADDRESS</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="name@company.com"
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>PASSWORD</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter password"
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeBtn}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Text style={styles.loginBtnText}>Sign In</Text>
                <Ionicons name="log-in-outline" size={20} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Switch to Signup */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account yet? </Text>
          <TouchableOpacity onPress={() => onNavigate('signup')} activeOpacity={0.7}>
            <Text style={styles.linkText}>Register here</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingTop: 45,
    paddingBottom: 30,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 24,
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  backBtnText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  header: {
    marginBottom: 28,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 8,
    lineHeight: 20,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    marginBottom: 20,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    flex: 1,
  },
  form: {
    gap: 18,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: colors.text,
    paddingVertical: 14,
    fontSize: 15,
  },
  eyeBtn: {
    padding: 6,
  },
  loginBtn: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  loginBtnDisabled: {
    opacity: 0.7,
  },
  loginBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 36,
  },
  footerText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  linkText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
});
