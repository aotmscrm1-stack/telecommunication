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

export default function SignupScreen({ onNavigate }) {
  const { signup } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('caller');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const roles = [
    { id: 'caller', label: 'Caller' },
    { id: 'employee', label: 'Staff' },
    { id: 'manager', label: 'Manager' },
    { id: 'admin', label: 'Admin' },
  ];

  const handleSignup = async () => {
    setErrorMsg('');
    if (!name.trim() || !email.trim() || !password.trim()) {
      setErrorMsg('Name, email, and password are required.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    try {
      setLoading(true);
      await signup({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        role: role,
        password: password,
      });
      // Auth state update will automatically redirect via AppNavigator
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Registration failed.';
      setErrorMsg(msg);
      Alert.alert('Registration Error', msg);
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
        <TouchableOpacity style={styles.backBtn} onPress={() => onNavigate('login')} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
          <Text style={styles.backBtnText}>Back to Login</Text>
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Register your profile in AOTMS Telecommunication CRM system.</Text>
        </View>

        {/* Error Banner */}
        {errorMsg ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={18} color={colors.danger} />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : null}

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>FULL NAME</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="person-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="John Doe"
                placeholderTextColor={colors.textMuted}
                value={name}
                onChangeText={setName}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>EMAIL ADDRESS</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="john@aotms.com"
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>PHONE NUMBER</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="call-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="+91 9876543210"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />
            </View>
          </View>

          {/* Role Selection */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>SELECT ROLE</Text>
            <View style={styles.roleGrid}>
              {roles.map((r) => {
                const isSelected = role === r.id;
                return (
                  <TouchableOpacity
                    key={r.id}
                    style={[styles.roleChip, isSelected && styles.roleChipSelected]}
                    onPress={() => setRole(r.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.roleText, isSelected && styles.roleTextSelected]}>
                      {r.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>PASSWORD</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="At least 6 characters"
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

          <View style={styles.inputGroup}>
            <Text style={styles.label}>CONFIRM PASSWORD</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="shield-checkmark-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Re-enter password"
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!showPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.signupBtn, loading && styles.signupBtnDisabled]}
            onPress={handleSignup}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Text style={styles.signupBtnText}>Create Account</Text>
                <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Switch to Login */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => onNavigate('login')} activeOpacity={0.7}>
            <Text style={styles.linkText}>Sign In</Text>
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
    paddingBottom: 40,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
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
    marginBottom: 24,
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
    marginTop: 6,
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
    marginBottom: 18,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    flex: 1,
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    gap: 7,
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
    paddingVertical: 13,
    fontSize: 15,
  },
  eyeBtn: {
    padding: 6,
  },
  roleGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  roleChip: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleChipSelected: {
    backgroundColor: 'rgba(14, 165, 233, 0.15)',
    borderColor: colors.primary,
  },
  roleText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  roleTextSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  signupBtn: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 12,
    gap: 8,
    marginTop: 10,
  },
  signupBtnDisabled: {
    opacity: 0.7,
  },
  signupBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 30,
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
