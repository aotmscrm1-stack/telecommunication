import React, { useState, useEffect } from 'react';
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
  Dimensions,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Outfit_400Regular,
  Outfit_800ExtraBold,
  Outfit_900Black,
} from '@expo-google-fonts/outfit';
import { useAuth } from '../context/AuthContext';

const { width, height } = Dimensions.get('window');

// Ensure splash screen hides promptly
SplashScreen.hideAsync().catch(() => {});

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Load the Outfit Google Fonts gracefully
  const [fontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_800ExtraBold,
    Outfit_900Black,
  });

  const handleLogin = async () => {
    setErrorMsg('');
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter both email and password');
      return;
    }
    try {
      setLoading(true);
      await login(email.trim().toLowerCase(), password);
    } catch (err) {
      let msg = err.response?.data?.message || err.message || 'Login failed. Please verify your credentials.';
      if (err.message?.toLowerCase().includes('network error') || !err.response) {
        msg = 'Connection Notice: Cloud server is initializing. Please wait a few seconds and try again.';
      }
      setErrorMsg(msg);
      Alert.alert('Sign In Notice', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#12305A" />
      
      {/* ── BACKGROUND: CORPORATE BLUE TO NAVY SVG CURVE ── */}
      <View style={StyleSheet.absoluteFill}>
        <Svg width={width} height={height * 0.65}>
          <Defs>
            <LinearGradient id="corpGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#174EA6" />
              <Stop offset="1" stopColor="#12305A" />
            </LinearGradient>
          </Defs>
          
          <Path
            d={`
              M 0 0 
              L ${width} 0 
              L ${width} ${height * 0.20} 
              C ${width * 0.85} ${height * 0.42}, ${width * 0.40} ${height * 0.18}, 0 ${height * 0.38} 
              Z
            `}
            fill="rgba(0,0,0,0.06)"
            transform="translate(0, 8)" 
          />

          <Path
            d={`
              M 0 0 
              L ${width} 0 
              L ${width} ${height * 0.20} 
              C ${width * 0.85} ${height * 0.42}, ${width * 0.40} ${height * 0.18}, 0 ${height * 0.38} 
              Z
            `}
            fill="url(#corpGrad)"
          />
        </Svg>
      </View>


      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── HEADER TEXT ── */}
          <View style={styles.headerArea}>
            <Text style={styles.headerTitle}>WELCOME BACK</Text>
          </View>

          {/* ── FORM CONTENT ── */}
          <View style={styles.contentContainer}>
            
            {errorMsg ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={18} color="#EF4444" />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            ) : null}

            {/* Email Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>EMAIL</Text>
              <TextInput
                style={styles.input}
                placeholder="someone@email.com"
                placeholderTextColor="#888888"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>PASSWORD</Text>
              <View style={styles.passwordWrapper}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="••••••••"
                  placeholderTextColor="#888888"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#666666"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Main Sign In Button */}
            <TouchableOpacity
              style={[styles.loginBtn, loading && { opacity: 0.7 }]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={styles.loginBtnText}>Sign In</Text>
              )}
            </TouchableOpacity>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  scrollContent: {
    flexGrow: 1,
  },

  /* ── HEADER ── */
  headerArea: {
    height: height * 0.25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 2.5,
    fontFamily: 'Outfit_900Black',
  },

  /* ── CONTENT FORM ── */
  contentContainer: {
    flex: 1,
    paddingHorizontal: 36,
    justifyContent: 'center',
    paddingBottom: height * 0.06,
  },
  
  /* Error */
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 20,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
    fontFamily: 'Outfit_800ExtraBold',
  },

  /* Inputs */
  inputGroup: {
    marginBottom: 22,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#444444',
    letterSpacing: 1.5,
    marginBottom: 8,
    marginLeft: 15,
    fontFamily: 'Outfit_900Black',
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#B0B0B0',
    borderRadius: 25,
    height: 52,
    paddingHorizontal: 20,
    fontSize: 16,
    color: '#000000',
    fontWeight: '600',
    backgroundColor: 'transparent',
    fontFamily: 'Outfit_400Regular',
  },
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#B0B0B0',
    borderRadius: 25,
    height: 52,
    paddingLeft: 20,
    paddingRight: 10,
    backgroundColor: 'transparent',
  },
  passwordInput: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
    fontWeight: '600',
    fontFamily: 'Outfit_400Regular',
  },
  eyeBtn: {
    padding: 10,
  },

  /* Login Button */
  loginBtn: {
    backgroundColor: '#174EA6',
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    width: '70%',
    shadowColor: '#174EA6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    marginTop: 26,
    marginBottom: 40,
  },

  loginBtnText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    fontFamily: 'Outfit_800ExtraBold',
  },
});